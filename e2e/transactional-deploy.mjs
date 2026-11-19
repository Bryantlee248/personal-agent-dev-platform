import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, link, open, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { start, recover } from '../ops/transactional-deploy/index.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const sha = 'a'.repeat(40);
const root = await mkdtemp(join(tmpdir(),'iwp013-test-'));
const source = join(root,'source');
const bytes = Buffer.from('fixture text is untrusted data, never execute me\n');
const fileHash = hash(bytes);
const manifest = {sha,health:'PASS',files:{'artifact.txt':{size:bytes.length,sha256:fileHash}},overallSha256:hash(Buffer.from(`artifact.txt:${bytes.length}:${fileHash}\n`))};
const base = async () => { const b=join(root,`base-${Math.random().toString(16).slice(2)}`); await mkdir(b); return b; };
const reject = async (call, code) => assert.rejects(call, e => e.code === code);
const tree = async (dir, prefix='') => {
  const result=[];
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const name=`${prefix}${entry.name}`;
    if(entry.isDirectory()) { result.push(`${name}/`); result.push(...await tree(join(dir,entry.name),`${name}/`)); }
    else result.push(`${name}:${hash(await readFile(join(dir,entry.name)))}`);
  }
  return result;
};
const waitText = (child, marker) => new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error(`timeout waiting for ${marker}`)),10000);
  child.stdout.on('data',function onData(data){ if(data.toString().includes(marker)){clearTimeout(timer);child.stdout.off('data',onData);resolve();} });
  child.once('error',reject);
});
const waitExit = child => child.exitCode!==null ? Promise.resolve(child.exitCode) : child.signalCode!==null ? Promise.resolve(child.signalCode) : new Promise(resolve=>child.once('exit',resolve));
try {
  await mkdir(source); await writeFile(join(source,'artifact.txt'),bytes); await writeFile(join(source,'manifest.json'),JSON.stringify(manifest));
  for(let i=0;i<20;i++) {
    const proof=await base(),a=join(proof,'a'),b=join(proof,'b'),target=join(proof,'owner-000001');
    for(const [path,text] of [[a,'A'],[b,'B']]) {const handle=await open(path,'wx'); await handle.writeFile(text); await handle.sync(); await handle.close();}
    const outcomes=await Promise.allSettled([link(a,target),link(b,target)]);
    assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason.code==='EEXIST').length,1);
    assert.ok(['A','B'].includes(await readFile(target,'utf8')));
    const winnerPath=(await readFile(target,'utf8'))==='A'?a:b;
    const otherPath=winnerPath===a?b:a;
    const [winnerStat,linkStat,otherStat]=await Promise.all([stat(winnerPath,{bigint:true}),stat(target,{bigint:true}),stat(otherPath,{bigint:true})]);
    assert.ok(winnerStat.dev>0n && winnerStat.ino>0n);
    assert.equal(`${winnerStat.dev}:${winnerStat.ino}`,`${linkStat.dev}:${linkStat.ino}`);
    assert.notEqual(`${otherStat.dev}:${otherStat.ino}`,`${linkStat.dev}:${linkStat.ino}`);
  }
  const invalid = await base();
  await reject(() => start({base:invalid,source,expectedSha:'b'.repeat(40)}),'INVALID_SOURCE');
  assert.deepEqual(await readdir(invalid),[]);
  const badHealth=await base();
  await writeFile(join(source,'manifest.json'),JSON.stringify({...manifest,health:'FAIL'}));
  await reject(() => start({base:badHealth,source,expectedSha:sha}),'INVALID_SOURCE');
  assert.deepEqual(await readdir(badHealth),[]);
  await writeFile(join(source,'manifest.json'),JSON.stringify(manifest));
  const badDigest=await base();
  await writeFile(join(source,'manifest.json'),JSON.stringify({...manifest,overallSha256:'0'.repeat(64)}));
  await reject(() => start({base:badDigest,source,expectedSha:sha}),'INVALID_SOURCE');
  assert.deepEqual(await readdir(badDigest),[]);
  await writeFile(join(source,'manifest.json'),JSON.stringify(manifest));
  const tooLarge=await base();
  await writeFile(join(source,'artifact.txt'),Buffer.alloc(1024*1024+1));
  await reject(() => start({base:tooLarge,source,expectedSha:sha}),'INVALID_SOURCE');
  assert.deepEqual(await readdir(tooLarge),[]);
  await writeFile(join(source,'artifact.txt'),bytes);
  const fileMismatch=await base(); await writeFile(join(source,'artifact.txt'),'tampered');
  await reject(() => start({base:fileMismatch,source,expectedSha:sha}),'INVALID_SOURCE');
  assert.deepEqual(await readdir(fileMismatch),[]); await writeFile(join(source,'artifact.txt'),bytes);
  const extra=await base(); await writeFile(join(source,'extra.txt'),'extra');
  await reject(() => start({base:extra,source,expectedSha:sha}),'INVALID_SOURCE');
  assert.deepEqual(await readdir(extra),[]); await rm(join(source,'extra.txt'));
  const linked=await base();
  const junction=join(root,'base-junction'); await symlink(linked,junction,'junction');
  await reject(() => start({base:junction,source,expectedSha:sha}),'INVALID_INPUT');
  assert.deepEqual(await readdir(linked),[]);
  const nonempty=await base(); await writeFile(join(nonempty,'keep.txt'),'keep');
  await reject(() => start({base:nonempty,source,expectedSha:sha}),'INVALID_BASE');
  assert.deepEqual(await readdir(nonempty),['keep.txt']);
  const normal = await base();
  const committed=await start({base:normal,source,expectedSha:sha});
  assert.equal(committed.state,'COMMITTED');
  assert.deepEqual((await readdir(committed.box)).sort(),['current','origin.json','release']);
  assert.equal(await readFile(join(committed.box,'current'),'utf8'),'release\n');
  assert.equal((await recover({base:normal,expectedSha:sha})).state,'COMMITTED');
  for (const fault of ['UNPUBLISHED','NEW','PREPARED','SWITCH_INTENT','SWITCHED','VERIFIED']) {
    const b=await base();
    const code=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:b,source,expectedSha:sha,fault})});`;
    const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(child.status,77,`${fault}: ${child.stderr}`);
    if (fault === 'SWITCHED') {
      const recoverCode=`import {recover} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await recover(${JSON.stringify({base:b,expectedSha:sha})});`;
      const interrupted=spawnSync(process.execPath,['--input-type=module','-e',recoverCode],{encoding:'utf8',timeout:10000,windowsHide:true,env:{...process.env,IWP013_TEST_FAULT:'RECOVERING'}});
      assert.equal(interrupted.status,77,interrupted.stderr);
    }
    const first=await recover({base:b,expectedSha:sha});
    assert.equal(first.state,'FAILED',fault);
    if (first.box) assert.deepEqual(await readdir(first.box),['origin.json']);
    const ownerEntries=(await readdir(b)).filter(n=>/^owner-\d{6}$/.test(n));
    assert.deepEqual(ownerEntries,fault==='UNPUBLISHED' ? ['owner-000001'] : fault==='SWITCHED' ? ['owner-000001','owner-000002','owner-000003'] : ['owner-000001','owner-000002']);
    const second=await recover({base:b,expectedSha:sha});
    assert.equal(second.state,'FAILED',fault);
    assert.equal(second.box,first.box);
  }
  for(const fault of ['CANDIDATE_TEMP','INTENT_TEMP','ORIGIN_TEMP']) {
    const b=await base();
    const code=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:b,source,expectedSha:sha,fault})});`;
    const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(child.status,77,`${fault}: ${child.stderr}`);
    const before=await tree(b);
    await reject(() => recover({base:b,expectedSha:sha}),'BLOCKED');
    assert.deepEqual(await tree(b),before,fault);
    assert.ok(before.some(x=>x.includes('.tmp:')),fault);
  }
  const placeholder=await base();
  const placeholderCode=`import {writeFile} from 'node:fs/promises'; import {join} from 'node:path'; await writeFile(join(${JSON.stringify(placeholder)},'candidate-00000000-0000-0000-0000-000000000000.json'),'{'); process.exit(77);`;
  assert.equal(spawnSync(process.execPath,['--input-type=module','-e',placeholderCode],{encoding:'utf8',timeout:10000,windowsHide:true}).status,77);
  const placeholderTree=await tree(placeholder);
  await reject(() => recover({base:placeholder,expectedSha:sha}),'BLOCKED');
  assert.deepEqual(await tree(placeholder),placeholderTree);
  const corrupt=await base();
  const corruptCode=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:corrupt,source,expectedSha:sha,fault:'PREPARED'})});`;
  assert.equal(spawnSync(process.execPath,['--input-type=module','-e',corruptCode],{encoding:'utf8',timeout:10000,windowsHide:true}).status,77);
  await writeFile(join(corrupt,'journal.json'),'broken');
  const before=await readdir(corrupt);
  await reject(() => recover({base:corrupt,expectedSha:sha}),'BLOCKED');
  assert.deepEqual(await readdir(corrupt),before);
  assert.equal(await readFile(join(corrupt,'journal.json'),'utf8'),'broken');
  const impossible=await base();
  const impossibleCode=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:impossible,source,expectedSha:sha,fault:'PREPARED'})});`;
  assert.equal(spawnSync(process.execPath,['--input-type=module','-e',impossibleCode],{encoding:'utf8',timeout:10000,windowsHide:true}).status,77);
  const recorded=JSON.parse(await readFile(join(impossible,'journal.json'),'utf8'));
  const {checksum:ignored,...core}=recorded;
  core.from='SWITCHED';
  const tampered=JSON.stringify({...core,checksum:hash(Buffer.from(JSON.stringify(core)))})+'\n';
  await writeFile(join(impossible,'journal.json'),tampered);
  const impossibleTree=await readdir(impossible);
  await reject(() => recover({base:impossible,expectedSha:sha}),'BLOCKED');
  assert.deepEqual(await readdir(impossible),impossibleTree);
  assert.equal(await readFile(join(impossible,'journal.json'),'utf8'),tampered);
  const duplicate=await base();
  const duplicateCode=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:duplicate,source,expectedSha:sha,fault:'PREPARED'})});`;
  assert.equal(spawnSync(process.execPath,['--input-type=module','-e',duplicateCode],{encoding:'utf8',timeout:10000,windowsHide:true}).status,77);
  await mkdir(join(duplicate,'txn-extra'));
  const duplicateBefore=await readdir(duplicate);
  await reject(() => recover({base:duplicate,expectedSha:sha}),'BLOCKED');
  assert.deepEqual(await readdir(duplicate),duplicateBefore);
  const unknown=await base(); await writeFile(join(unknown,'unknown'),'keep');
  await reject(() => recover({base:unknown,expectedSha:sha}),'BLOCKED');
  assert.deepEqual(await readdir(unknown),['unknown']);
  const live=await base();
  const liveCode=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:live,source,expectedSha:sha})});`;
  const child=spawn(process.execPath,['--input-type=module','-e',liveCode],{stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,IWP013_TEST_PAUSE:'PREPARED'}});
  let childError=''; child.stderr.on('data',d=>childError+=d);
  try {
    const ready=await Promise.race([new Promise(resolve=>child.stdout.once('data',d=>resolve(d.toString().includes('PAUSED')))),new Promise(resolve=>setTimeout(()=>resolve(false),10000))]);
    assert.equal(ready,true,`live owner reached PREPARED: ${childError}`);
    await reject(() => recover({base:live,expectedSha:sha}),'LOCKED');
  } finally { if(child.exitCode===null) { child.kill(); await new Promise(r=>child.once('exit',r)); } }
  const raced=await base();
  const raceStart=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; await start(${JSON.stringify({base:raced,source,expectedSha:sha,fault:'PREPARED'})});`;
  assert.equal(spawnSync(process.execPath,['--input-type=module','-e',raceStart],{encoding:'utf8',timeout:10000,windowsHide:true}).status,77);
  const raceRecover=`import {recover} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; try { const x=await recover(${JSON.stringify({base:raced,expectedSha:sha})}); console.log(x.state); } catch(e) { console.log(e.code); }`;
  const racers=[0,1].map(()=>spawn(process.execPath,['--input-type=module','-e',raceRecover],{windowsHide:true}));
  const raceOutput=await Promise.all(racers.map(c=>new Promise((resolve,reject)=>{ let out=''; c.stdout.on('data',d=>out+=d); c.on('error',reject); c.on('exit',()=>resolve(out.trim())); })));
  assert.ok(raceOutput.includes('FAILED'),JSON.stringify(raceOutput));
  assert.equal((await readdir(raced)).filter(n=>/^owner-\d{6}$/.test(n)).length,2);
  assert.equal((await recover({base:raced,expectedSha:sha})).state,'FAILED');
  const concurrent=await base();
  const concurrentCode=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; try { const x=await start(${JSON.stringify({base:concurrent,source,expectedSha:sha})}); console.log(x.state); } catch(e) { console.log(e.code); }`;
  const starters=[0,1].map(()=>spawn(process.execPath,['--input-type=module','-e',concurrentCode],{windowsHide:true,env:{...process.env,IWP013_TEST_PAUSE_AFTER_VALIDATION:'1',IWP013_TEST_PAUSE_BEFORE_LINK:'1'}}));
  const startOutput=await Promise.all(starters.map(c=>new Promise((resolve,reject)=>{let out='';c.stdout.on('data',d=>out+=d);c.on('error',reject);c.on('exit',()=>resolve(out.trim()));})));
  assert.deepEqual(startOutput.sort(),['COMMITTED','LOCKED']);
  assert.equal((await readdir(concurrent)).filter(n=>n.startsWith('candidate-')).length,1);
  assert.equal((await readdir(concurrent)).filter(n=>/^owner-\d{6}$/.test(n)).length,1);
  assert.equal((await recover({base:concurrent,expectedSha:sha})).state,'COMMITTED');
  const owner=JSON.parse(await readFile(join(concurrent,'owner-000001'),'utf8'));
  await writeFile(join(concurrent,`candidate-${randomUUID()}.json`),JSON.stringify({...owner,run:randomUUID()}));
  const foreignTree=await readdir(concurrent);
  const foreignJournal=await readFile(join(concurrent,'journal.json'));
  assert.equal((await recover({base:concurrent,expectedSha:sha})).state,'COMMITTED');
  assert.deepEqual(await readdir(concurrent),foreignTree);
  assert.deepEqual(await readFile(join(concurrent,'journal.json')),foreignJournal);
  const orphanBase=await base();
  const orphanCode=`import {start} from ${JSON.stringify(new URL('../ops/transactional-deploy/index.mjs',import.meta.url).href)}; const x=await start(${JSON.stringify({base:orphanBase,source,expectedSha:sha})}); console.log(x.state); process.exit(0);`;
  const winner=spawn(process.execPath,['--input-type=module','-e',orphanCode],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,IWP013_TEST_GATE_AFTER_VALIDATION:'1'}});
  let loser;
  try {
    await waitText(winner,'VALIDATED');
    loser=spawn(process.execPath,['--input-type=module','-e',orphanCode],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,IWP013_TEST_GATE_BEFORE_LINK:'1'}});
    await waitText(loser,'CANDIDATE_READY');
    winner.stdin.write('go\n');
    assert.equal(await waitExit(winner),0);
    const liveOrphanTree=await tree(orphanBase);
    await reject(() => recover({base:orphanBase,expectedSha:sha}),'BLOCKED');
    assert.deepEqual(await tree(orphanBase),liveOrphanTree);
    loser.kill(); await waitExit(loser);
    const deadOrphanTree=await tree(orphanBase);
    assert.equal((await recover({base:orphanBase,expectedSha:sha})).state,'COMMITTED');
    assert.equal((await recover({base:orphanBase,expectedSha:sha})).state,'COMMITTED');
    assert.deepEqual(await tree(orphanBase),deadOrphanTree);
    const expectBlockedUnchanged=async () => { const before=await tree(orphanBase); await reject(() => recover({base:orphanBase,expectedSha:sha}),'BLOCKED'); assert.deepEqual(await tree(orphanBase),before); };
    const ownerPath=join(orphanBase,'owner-000001');
    const ownerRecord=JSON.parse(await readFile(ownerPath,'utf8'));
    const candidateNames=(await readdir(orphanBase)).filter(n=>n.startsWith('candidate-'));
    const records=await Promise.all(candidateNames.map(async name=>({name,record:JSON.parse(await readFile(join(orphanBase,name),'utf8'))})));
    const orphanName=records.find(x=>x.record.run!==ownerRecord.run)?.name;
    const linkedName=records.find(x=>x.record.run===ownerRecord.run)?.name;
    assert.ok(orphanName && linkedName);
    const orphanPath=join(orphanBase,orphanName),linkedPath=join(orphanBase,linkedName);
    const orphanBytes=await readFile(orphanPath),linkedBytes=await readFile(linkedPath);
    await writeFile(orphanPath,'broken'); await expectBlockedUnchanged(); await writeFile(orphanPath,orphanBytes);
    await writeFile(orphanPath,JSON.stringify({...JSON.parse(orphanBytes.toString()),sha:'b'.repeat(40)})); await expectBlockedUnchanged(); await writeFile(orphanPath,orphanBytes);
    const secondOrphan=join(orphanBase,`candidate-${randomUUID()}.json`);
    await writeFile(secondOrphan,JSON.stringify({...JSON.parse(orphanBytes.toString()),run:randomUUID()})); await expectBlockedUnchanged(); await rm(secondOrphan);
    const journalPath=join(orphanBase,'journal.json'),journalBytes=await readFile(journalPath);
    const {checksum:oldChecksum,...changed}=JSON.parse(journalBytes.toString());
    Object.assign(changed,{seq:4,from:'SWITCHED',to:'VERIFIED',state:'VERIFIED'});
    await writeFile(journalPath,JSON.stringify({...changed,checksum:hash(Buffer.from(JSON.stringify(changed)))})+'\n'); await expectBlockedUnchanged(); await writeFile(journalPath,journalBytes);
    await rm(linkedPath); await writeFile(linkedPath,linkedBytes); await expectBlockedUnchanged(); await rm(linkedPath); await link(ownerPath,linkedPath);
    process.env.IWP013_TEST_IDENTITY_UNAVAILABLE='1'; try { await expectBlockedUnchanged(); } finally { delete process.env.IWP013_TEST_IDENTITY_UNAVAILABLE; }
    const orphanBox=(await readdir(orphanBase)).find(n=>n.startsWith('txn-'));
    const releasePath=join(orphanBase,orphanBox,'release','artifact.txt'),releaseBytes=await readFile(releasePath);
    await writeFile(releasePath,'tampered release'); await expectBlockedUnchanged(); await writeFile(releasePath,releaseBytes);
    assert.equal((await recover({base:orphanBase,expectedSha:sha})).state,'COMMITTED');
  } finally { if(winner.exitCode===null && winner.signalCode===null){winner.kill();await waitExit(winner);} if(loser && loser.exitCode===null && loser.signalCode===null){loser.kill();await waitExit(loser);} }
  assert.deepEqual(await readFile(join(source,'artifact.txt')),bytes);
  console.log('transactional-deploy smoke: PASS');
} finally { await rm(root,{recursive:true,force:true}); }
