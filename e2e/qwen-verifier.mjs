#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const wrapper = join(root, 'ops/compatibility/qwen-verifier.mjs');
const fake = join(root, 'e2e/fixtures/fake-qwen.mjs');
const validInput = 'docs/evidence/IWP-004/2026-11-17-qwen-custom-provider-poc.md';

function run(input, mode = 'pass') {
  return spawnSync(process.execPath, [wrapper, '--input', input], {
    cwd: root,
    env: { ...process.env, QWEN_CLI_ENTRY: fake, FAKE_QWEN_MODE: mode },
    encoding: 'utf8'
  });
}

const failures = [];
const pass = run(validInput);
if (pass.status !== 0 || JSON.parse(pass.stdout).verdict !== 'PASS') failures.push('valid structured verdict');

for (const [name, input, mode] of [
  ['path escape', '../outside.md', 'pass'],
  ['missing input', 'missing.md', 'pass'],
  ['directory input', 'docs', 'pass'],
  ['child failure', validInput, 'exit'],
  ['malformed output', validInput, 'malformed'],
  ['contract violation', validInput, 'invalid']
]) {
  if (run(input, mode).status === 0) failures.push(name);
}

const temp = mkdtempSync(join(root, '.tmp-qwen-verifier-'));
const oversized = join(temp, 'large.txt');
try {
  writeFileSync(oversized, Buffer.alloc(256 * 1024 + 1, 65));
  if (run(relative(root, oversized)).status === 0) failures.push('oversized input');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`qwen verifier tests failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('qwen verifier tests passed: success and fail-closed paths verified.');
