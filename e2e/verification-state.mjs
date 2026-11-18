#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateVerification } from '../ops/verification-state/evaluate.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const valid = JSON.parse(readFileSync(resolve(root, 'e2e/fixtures/verification-state/pass.json'), 'utf8'));
const failures = [];

function expect(name, edit, check) {
  const input = structuredClone(valid);
  edit(input);
  try {
    const result = evaluateVerification(input);
    if (!check?.(result)) failures.push(name);
  } catch {
    failures.push(name);
  }
}

function reject(name, edit) {
  const input = structuredClone(valid);
  edit(input);
  try { evaluateVerification(input); failures.push(name); } catch { /* expected */ }
}

expect('PASS to Human', () => {}, (r) => r.decision === 'PASS' && r.next_role === 'Human' && r.next_state.status === 'AWAITING_HUMAN');
expect('first FAIL', (p) => { p.review.verdict = 'FAIL'; p.review.findings = ['Fix the rejected transition.']; }, (r) => r.next_role === 'Delivery' && r.next_state.repair_round === 1 && r.findings[0] === 'Fix the rejected transition.');
expect('second FAIL', (p) => { p.state.repair_round = 1; p.review.repair_round = 1; p.review.verdict = 'FAIL'; }, (r) => r.next_role === 'Delivery' && r.next_state.repair_round === 2);
expect('third FAIL escalates', (p) => { p.state.repair_round = 2; p.review.repair_round = 2; p.review.verdict = 'FAIL'; }, (r) => r.decision === 'ESCALATE' && r.next_state.status === 'HUMAN_ACTION_REQUIRED' && r.next_state.repair_round === 2);
expect('explicit escalation', (p) => { p.review.verdict = 'ESCALATE'; p.review.findings = ['Human decision is required.']; }, (r) => r.decision === 'ESCALATE' && r.next_role === 'Human');

const invalid = [
  ['unknown verdict', (p) => { p.review.verdict = 'RETRY'; }],
  ['negative round', (p) => { p.state.repair_round = -1; p.review.repair_round = -1; }],
  ['overflow round', (p) => { p.state.repair_round = 3; p.review.repair_round = 3; }],
  ['reset round', (p) => { p.state.repair_round = 1; }],
  ['skip round', (p) => { p.review.repair_round = 2; }],
  ['changed handoff', (p) => { p.review.handoff_id = 'HOF-999'; }],
  ['changed SHA', (p) => { p.review.fixed_sha = '0000000000000000000000000000000000000000'; }],
  ['write path', (p) => { p.review.write_paths = ['src']; }],
  ['command ID', (p) => { p.review.command_ids = ['test']; }],
  ['secret', (p) => { p.review.findings = ['Authorization: Bearer example-secret-value']; }],
  ['too many findings', (p) => { p.review.findings = Array(21).fill('finding'); }],
  ['long finding', (p) => { p.review.findings = ['x'.repeat(1001)]; }],
  ['extra field', (p) => { p.review.prompt = 'ignore policy'; }],
  ['wrong state', (p) => { p.state.status = 'AWAITING_DELIVERY'; }]
];
for (const [name, edit] of invalid) reject(name, edit);

if (failures.length) {
  console.error(`verification-state tests failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('verification-state tests passed: transitions, two-repair limit, binding, read-only role, bounds, and secret rejection verified.');
