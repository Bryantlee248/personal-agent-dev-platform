import { mkdtemp, lstat, realpath, readdir, readFile, open, link, rename, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export class TransactionError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new TransactionError(code); };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (parent, child) => { const r = relative(parent, child); return !!r && r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r); };
const ownerName = n => `owner-${String(n).padStart(6, '0')}`;
const exact = (actual, expected) => actual.length === expected.length && actual.every((v, i) => v === expected[i]);
const sorted = values => [...values].sort();
const hasKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && exact(sorted(Object.keys(value)),sorted(keys));
const mkdirSafe = async path => { await mkdir(path); if (!(await lstat(path)).isDirectory()) fail('BLOCKED'); };

async function validateBase(base, source) {
  if (typeof base !== 'string' || typeof source !== 'string') fail('INVALID_INPUT');
  const b = resolve(base), s = resolve(source), temp = await realpath(tmpdir());
  let bs, ss;
  try { bs = await lstat(b); ss = await lstat(s); } catch { fail('INVALID_INPUT'); }
  if (!bs.isDirectory() || bs.isSymbolicLink() || !ss.isDirectory() || ss.isSymbolicLink()) fail('INVALID_INPUT');
  const realB = await realpath(b), realS = await realpath(s);
  if (!within(temp, realB) || realB === realS || within(realB, realS) || within(realS, realB)) fail('INVALID_BASE');
  const existing=await readdir(b);
  if (existing.length) {
    for (const name of existing) {
      if (!/^candidate-[0-9a-f-]{36}\.json$/.test(name) && !/^owner-\d{6}$/.test(name)) continue;
      try { const record=JSON.parse(await readFile(join(b,name),'utf8')); if (Number.isInteger(record.pid) && record.pid>0 && isAlive(record.pid)) fail('LOCKED'); }
      catch (error) { if (error.code === 'LOCKED') throw error; }
    }
    fail('INVALID_BASE');
  }
  return { base: b, source: s, identity: realB };
}

async function validateSource(source, sha) {
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) fail('INVALID_SHA');
  const names = sorted(await readdir(source));
  if (!exact(names, ['artifact.txt', 'manifest.json'])) fail('INVALID_SOURCE');
  const bytes = {};
  for (const name of names) {
    const path = join(source, name), st = await lstat(path);
    if (!st.isFile() || st.isSymbolicLink() || st.size > 1024 * 1024) fail('INVALID_SOURCE');
    bytes[name] = await readFile(path);
    if (bytes[name].length > 1024 * 1024) fail('INVALID_SOURCE');
  }
  let m;
  try { m = JSON.parse(bytes['manifest.json'].toString('utf8')); } catch { fail('INVALID_SOURCE'); }
  const artifact = bytes['artifact.txt'];
  const fileHash = digest(artifact);
  const totalHash = digest(Buffer.from(`artifact.txt:${artifact.length}:${fileHash}\n`));
  if (m.sha !== sha || m.health !== 'PASS' || m.files?.['artifact.txt']?.size !== artifact.length || m.files?.['artifact.txt']?.sha256 !== fileHash || m.overallSha256 !== totalHash || Object.keys(m.files ?? {}).length !== 1) fail('INVALID_SOURCE');
  return { bytes, fileHash, totalHash, size: artifact.length };
}

async function syncedWrite(path, bytes) {
  const fh = await open(path, 'wx');
  try { await fh.writeFile(bytes); await fh.sync(); } finally { await fh.close(); }
}
async function atomicCreate(dir, name, bytes, fault, point) {
  const temp=join(dir, `.${name}.${randomUUID()}.tmp`);
  await syncedWrite(temp, bytes);
  if (fault===point) process.exit(77);
  try { await rename(temp, join(dir,name)); } catch { fail('BLOCKED'); }
}
async function replaceJournal(base, value) {
  if (!validTransition(value)) fail('BLOCKED');
  const tmp = join(base, `journal-${randomUUID()}.tmp`);
  await syncedWrite(tmp, JSON.stringify({ ...value, checksum: digest(Buffer.from(JSON.stringify(value))) }) + '\n');
  await rename(tmp, join(base, 'journal.json'));
}
async function readJournal(base) {
  let j;
  try { j = JSON.parse(await readFile(join(base, 'journal.json'), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; fail('BLOCKED'); }
  const { checksum, ...core } = j ?? {};
  if (!hasKeys(j,['version','seq','from','to','state','run','sha','checksum']) || !validTransition(j) || checksum !== digest(Buffer.from(JSON.stringify(core)))) fail('BLOCKED');
  return j;
}
function validTransition(j) {
  if (j?.version!==1 || !Number.isSafeInteger(j.seq) || j.seq<0 || j.state!==j.to || !/^[0-9a-f-]{36}$/.test(j.run??'') || !/^[0-9a-f]{40}$/.test(j.sha??'')) return false;
  const fixed=[['NEW',null],['PREPARED','NEW'],['SWITCH_INTENT','PREPARED'],['SWITCHED','SWITCH_INTENT'],['VERIFIED','SWITCHED'],['COMMITTED','VERIFIED']];
  const fixedIndex=fixed.findIndex(([to])=>to===j.to);
  if (fixedIndex>=0) return j.from===fixed[fixedIndex][1] && j.seq===fixedIndex;
  if (j.to==='RECOVERING') {
    if (j.from===null) return j.seq===0;
    const prior=fixed.findIndex(([to])=>to===j.from);
    if (prior>=0 && prior<5) return j.seq===prior+1;
    return j.from==='RECOVERING' && j.seq>=1;
  }
  return j.to==='FAILED' && j.from==='RECOVERING' && j.seq>=1;
}
async function ownerFiles(base) { return sorted((await readdir(base)).filter(n => /^owner-\d{6}$/.test(n))); }
async function fileIdentity(path) {
  if (process.env.IWP013_TEST_IDENTITY_UNAVAILABLE==='1') fail('BLOCKED');
  let info; try { info=await stat(path,{bigint:true}); } catch { fail('BLOCKED'); }
  if (typeof info.dev!=='bigint' || typeof info.ino!=='bigint' || info.dev<=0n || info.ino<=0n) fail('BLOCKED');
  return `${info.dev}:${info.ino}`;
}
async function readOwner(base, name) {
  let o;
  try { o = JSON.parse(await readFile(join(base, name), 'utf8')); } catch { fail('BLOCKED'); }
  if (!hasKeys(o,['version','pid','run','sha','base','generation']) || o.version !== 1 || !Number.isInteger(o.pid) || o.pid <= 0 || !/^[0-9a-f-]{36}$/.test(o.run ?? '') || !/^[0-9a-f]{40}$/.test(o.sha ?? '') || o.base !== base || o.generation !== Number(name.slice(6))) fail('BLOCKED');
  return o;
}
function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; fail('BLOCKED'); }
}
async function publishOwner(base, generation, sha, run, fault) {
  const candidate = `candidate-${randomUUID()}.json`;
  const object = { version: 1, pid: process.pid, run, sha, base, generation };
  await atomicCreate(base, candidate, JSON.stringify(object) + '\n', fault, 'CANDIDATE_TEMP');
  if (fault === 'UNPUBLISHED') process.exit(77);
  if (process.env.IWP013_TEST_GATE_BEFORE_LINK === '1') await new Promise(r=>{process.stdin.once('data',()=>{process.stdin.pause();r();});process.stdin.resume();process.stdout.write('CANDIDATE_READY\n');});
  if (process.env.IWP013_TEST_PAUSE_BEFORE_LINK === '1') await new Promise(r => setTimeout(r, 200));
  try { await link(join(base, candidate), join(base, ownerName(generation))); }
  catch (e) { if (e.code === 'EEXIST') { try { await rm(join(base,candidate)); } catch { fail('BLOCKED'); } fail('LOCKED'); } fail('BLOCKED'); }
  return object;
}
async function stillOwner(base, owner) {
  const files = await ownerFiles(base);
  if (!files.length || files.at(-1) !== ownerName(owner.generation)) fail('LOCKED');
  const latest = await readOwner(base, files.at(-1));
  if (latest.run !== owner.run || latest.pid !== process.pid) fail('LOCKED');
}
async function claimRecovery(base, sha, files) {
  if (!files.length) fail('BLOCKED');
  const prior = await readOwner(base, files.at(-1));
  if (prior.sha !== sha) fail('INVALID_SHA');
  if (isAlive(prior.pid)) fail('LOCKED');
  return publishOwner(base, prior.generation + 1, sha, prior.run);
}
async function validateTree(base, box) {
  if (!box || dirname(box) !== base || !/^txn-[\w-]+$/.test(basename(box))) fail('BLOCKED');
  const st = await lstat(box); if (!st.isDirectory() || st.isSymbolicLink()) fail('BLOCKED');
  const allowed = new Set(['origin.json','.staging','release','current','current.tmp']);
  for (const name of await readdir(box)) {
    if (!allowed.has(name)) fail('BLOCKED');
    const item = await lstat(join(box, name)); if (item.isSymbolicLink()) fail('BLOCKED');
    if (name === '.staging' || name === 'release') {
      if (!item.isDirectory()) fail('BLOCKED');
      for (const child of await readdir(join(box,name))) if (!['artifact.txt','manifest.json'].includes(child) || !(await lstat(join(box,name,child))).isFile()) fail('BLOCKED');
    } else if (!item.isFile()) fail('BLOCKED');
  }
}

export async function start({ base, source, expectedSha, fault } = {}) {
  const b = await validateBase(base, source);
  const captured = await validateSource(b.source, expectedSha);
  if ((await realpath(b.base)) !== b.identity || (await readdir(b.base)).length) fail('INVALID_BASE');
  if (process.env.IWP013_TEST_GATE_AFTER_VALIDATION === '1') await new Promise(r=>{process.stdin.once('data',()=>{process.stdin.pause();r();});process.stdin.resume();process.stdout.write('VALIDATED\n');});
  if (process.env.IWP013_TEST_PAUSE_AFTER_VALIDATION === '1') await new Promise(r => setTimeout(r, 500));
  const run = randomUUID();
  const owner = await publishOwner(b.base, 1, expectedSha, run, fault);
  await atomicCreate(b.base,'intent.json',JSON.stringify({version:1,run,sha:expectedSha,base:b.base})+'\n',fault,'INTENT_TEMP');
  let seq=0, prior=null;
  const step = async state => { await stillOwner(b.base, owner); await replaceJournal(b.base, { version: 1, seq: seq++, from:prior, to:state, state, run, sha: expectedSha }); prior=state; if (fault === state) process.exit(77); if (process.env.IWP013_TEST_PAUSE === state) { process.stdout.write('PAUSED\n'); await new Promise(r => setTimeout(r, 5000)); } };
  await step('NEW');
  const box = await mkdtemp(join(b.base, 'txn-'));
  await atomicCreate(box,'origin.json',JSON.stringify({version:1,run,sha:expectedSha,base:b.base,box})+'\n',fault,'ORIGIN_TEMP');
  await mkdirSafe(join(box, '.staging'));
  for (const name of ['artifact.txt','manifest.json']) await syncedWrite(join(box,'.staging',name),captured.bytes[name]);
  if (digest(await readFile(join(box,'.staging','artifact.txt'))) !== captured.fileHash || !(await readFile(join(box,'.staging','manifest.json'))).equals(captured.bytes['manifest.json'])) fail('COPY_MISMATCH');
  await step('PREPARED'); await step('SWITCH_INTENT');
  await rename(join(box,'.staging'),join(box,'release'));
  await syncedWrite(join(box,'current.tmp'),'release\n'); await rename(join(box,'current.tmp'),join(box,'current'));
  await step('SWITCHED');
  await verify(box, expectedSha, captured); await step('VERIFIED'); await step('COMMITTED');
  return { state:'COMMITTED', box, sha:expectedSha, digest:captured.totalHash };
}
async function verify(box, sha, captured) {
  if ((await readFile(join(box,'current'),'utf8')) !== 'release\n') fail('VERIFY_FAILED');
  const manifest = JSON.parse(await readFile(join(box,'release','manifest.json'),'utf8'));
  const bytes = await readFile(join(box,'release','artifact.txt'));
  if (manifest.sha !== sha || manifest.health !== 'PASS' || digest(bytes) !== captured.fileHash || manifest.overallSha256 !== captured.totalHash) fail('VERIFY_FAILED');
}
export async function recover({ base, expectedSha } = {}) {
  if (typeof base !== 'string' || typeof expectedSha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedSha)) fail('INVALID_INPUT');
  base = resolve(base);
  if (!within(await realpath(tmpdir()), await realpath(base)) || (await lstat(base)).isSymbolicLink()) fail('BLOCKED');
  const names = sorted(await readdir(base));
  if (names.some(n => !/^owner-\d{6}$/.test(n) && !/^candidate-[0-9a-f-]{36}\.json$/.test(n) && !/^journal-[0-9a-f-]{36}\.tmp$/.test(n) && !['journal.json','intent.json'].includes(n) && !/^txn-[\w-]+$/.test(n))) fail('BLOCKED');
  for (const name of names) {
    const entry=await lstat(join(base,name));
    if (entry.isSymbolicLink() || (name.startsWith('txn-') ? !entry.isDirectory() : !entry.isFile())) fail('BLOCKED');
  }
  const owners = await ownerFiles(base);
  for (let i=0;i<owners.length;i++) if (owners[i] !== ownerName(i+1)) fail('BLOCKED');
  if (!owners.length) {
    const candidates = names.filter(n => n.startsWith('candidate-'));
    if (candidates.length !== 1 || names.length !== 1) fail('BLOCKED');
    let candidate;
    try { candidate = JSON.parse(await readFile(join(base,candidates[0]),'utf8')); } catch { fail('BLOCKED'); }
    if (!hasKeys(candidate,['version','pid','run','sha','base','generation']) || candidate.version !== 1 || candidate.generation !== 1 || candidate.base !== base || candidate.sha !== expectedSha || !Number.isInteger(candidate.pid) || !/^[0-9a-f-]{36}$/.test(candidate.run ?? '')) fail('BLOCKED');
    if (isAlive(candidate.pid)) fail('LOCKED');
    const owner = await publishOwner(base,1,expectedSha,candidate.run);
    await stillOwner(base,owner);
    await replaceJournal(base,{version:1,seq:0,from:null,to:'RECOVERING',state:'RECOVERING',run:owner.run,sha:expectedSha});
    await replaceJournal(base,{version:1,seq:1,from:'RECOVERING',to:'FAILED',state:'FAILED',run:owner.run,sha:expectedSha});
    return {state:'FAILED',box:null,sha:expectedSha};
  }
  const boxNames = names.filter(n => n.startsWith('txn-'));
  if (boxNames.length > 1) fail('BLOCKED');
  const box = boxNames.length ? join(base, boxNames[0]) : null;
  if (box) await validateTree(base, box);
  const j = await readJournal(base);
  const last = await readOwner(base, owners.at(-1));
  for (const name of owners.slice(0,-1)) {
    const prior=await readOwner(base,name);
    if (prior.run!==last.run || prior.sha!==last.sha) fail('BLOCKED');
  }
  const candidates=[];
  for (const name of names.filter(n => n.startsWith('candidate-'))) {
    let bytes,record;
    try { bytes=await readFile(join(base,name)); record=JSON.parse(bytes.toString('utf8')); } catch { fail('BLOCKED'); }
    if (!hasKeys(record,['version','pid','run','sha','base','generation']) || record.version!==1 || record.base!==base || record.sha!==expectedSha || !/^[0-9a-f-]{36}$/.test(record.run??'') || !Number.isInteger(record.pid) || record.pid<=0 || !Number.isInteger(record.generation) || record.generation<1) fail('BLOCKED');
    candidates.push({name,bytes,record,identity:await fileIdentity(join(base,name))});
  }
  const linked=new Set();
  for (const name of owners) {
    const ownerIdentity=await fileIdentity(join(base,name));
    const matching=candidates.filter(c=>c.identity===ownerIdentity);
    if (matching.length!==1 || !matching[0].bytes.equals(await readFile(join(base,name)))) fail('BLOCKED');
    const record=matching[0].record,owner=await readOwner(base,name);
    if (record.run!==owner.run || record.sha!==owner.sha || record.pid!==owner.pid || record.generation!==owner.generation) fail('BLOCKED');
    linked.add(matching[0].name);
  }
  const orphanCandidates=candidates.filter(c=>!linked.has(c.name));
  if (orphanCandidates.length>1) fail('BLOCKED');
  if (orphanCandidates.length===1) {
    const orphan=orphanCandidates[0].record;
    const unpublishedFailed=j?.state==='FAILED' && !names.includes('intent.json') && !box && owners.length===1 && orphan.run===last.run && orphan.generation===1;
    const committedForeign=j?.state==='COMMITTED' && orphan.run!==last.run && orphan.generation===1;
    if ((!unpublishedFailed && !committedForeign) || isAlive(orphan.pid) || (committedForeign && isAlive(last.pid))) fail('BLOCKED');
  }
  if (last.sha !== expectedSha || j && (j.sha !== expectedSha || j.run !== last.run)) fail('BLOCKED');
  let intent;
  try { intent=JSON.parse(await readFile(join(base,'intent.json'),'utf8')); } catch (e) { if (e.code !== 'ENOENT') fail('BLOCKED'); }
  if (intent && (!hasKeys(intent,['version','run','sha','base']) || intent.version !== 1 || intent.run !== last.run || intent.sha !== expectedSha || intent.base !== base)) fail('BLOCKED');
  if (!intent && (box || (j && j.state !== 'FAILED'))) fail('BLOCKED');
  if (!j && box) fail('BLOCKED');
  if (box) {
    const entries=await readdir(box);
    if (!entries.includes('origin.json')) { if (entries.length || !['NEW','FAILED'].includes(j?.state)) fail('BLOCKED'); }
    else {
      let origin; try { origin=JSON.parse(await readFile(join(box,'origin.json'),'utf8')); } catch { fail('BLOCKED'); }
      if (!hasKeys(origin,['version','run','sha','base','box']) || origin.version!==1 || origin.run!==last.run || origin.sha!==expectedSha || origin.base!==base || origin.box!==box) fail('BLOCKED');
    }
  }
  if (j?.state === 'COMMITTED') { if (!box) fail('BLOCKED'); await verifyCommitted(box,expectedSha); return {state:'COMMITTED',box,sha:expectedSha}; }
  if (j?.state === 'FAILED') { if (box && ![0,1].includes((await readdir(box)).length)) fail('BLOCKED'); return {state:'FAILED',box,sha:expectedSha}; }
  const owner = await claimRecovery(base, expectedSha, owners);
  await stillOwner(base, owner);
  const recoverySeq=j ? j.seq+1 : 0;
  await replaceJournal(base,{version:1,seq:recoverySeq,from:j?.to??null,to:'RECOVERING',state:'RECOVERING',run:owner.run,sha:expectedSha});
  if (process.env.IWP013_TEST_FAULT === 'RECOVERING') process.exit(77);
  if (box) {
    for (const name of ['current','current.tmp']) { await stillOwner(base,owner); await rm(join(box,name),{force:true}); }
    for (const name of ['release','.staging']) { await stillOwner(base,owner); await rm(join(box,name),{force:true,recursive:true}); }
  }
  await stillOwner(base,owner); await replaceJournal(base,{version:1,seq:recoverySeq+1,from:'RECOVERING',to:'FAILED',state:'FAILED',run:owner.run,sha:expectedSha});
  return {state:'FAILED',box,sha:expectedSha};
}
async function verifyCommitted(box,sha) {
  if (!exact(sorted(await readdir(box)),['current','origin.json','release'])) fail('BLOCKED');
  if ((await readFile(join(box,'current'),'utf8')) !== 'release\n') fail('BLOCKED');
  let m; try { m=JSON.parse(await readFile(join(box,'release','manifest.json'),'utf8')); } catch { fail('BLOCKED'); }
  const bytes=await readFile(join(box,'release','artifact.txt'));
  const d=digest(bytes), total=digest(Buffer.from(`artifact.txt:${bytes.length}:${d}\n`));
  if (m.sha!==sha || m.health!=='PASS' || m.files?.['artifact.txt']?.size!==bytes.length || m.files?.['artifact.txt']?.sha256!==d || m.overallSha256!==total) fail('BLOCKED');
}
