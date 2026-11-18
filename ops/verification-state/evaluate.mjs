#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_FINDINGS = 20;
const MAX_FINDING_LENGTH = 1000;
const VERDICTS = new Set(['PASS', 'FAIL', 'ESCALATE']);
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /(?:api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|password|token|secret)\s*[:=]\s*\S+/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
  /\b(?:gh[opurs]_[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/,
  /\bAuthorization\s*:\s*Bearer\s+\S+/i
];

function exactFields(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${name} fields do not match the contract`);
  }
}

function validateIdentity(handoffId, fixedSha) {
  if (!/^HOF-\d{3,}$/.test(handoffId)) throw new Error('invalid handoff_id');
  if (!/^[0-9a-f]{40}$/.test(fixedSha)) throw new Error('fixed_sha must be a full lowercase SHA');
}

function validateRound(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 2) throw new Error(`${name} must be an integer from 0 to 2`);
}

function validateFindings(findings) {
  if (!Array.isArray(findings) || findings.length > MAX_FINDINGS) throw new Error(`findings must contain 0-${MAX_FINDINGS} items`);
  for (const finding of findings) {
    if (typeof finding !== 'string' || !finding || finding.length > MAX_FINDING_LENGTH) throw new Error('findings contains an invalid string');
    if (SECRET_PATTERNS.some((pattern) => pattern.test(finding))) throw new Error('findings contains a possible secret');
  }
}

export function evaluateVerification(input) {
  exactFields(input, ['schema_version', 'state', 'review'], 'input');
  if (input.schema_version !== 1) throw new Error('schema_version must be 1');
  exactFields(input.state, ['fixed_sha', 'handoff_id', 'repair_round', 'status'], 'state');
  exactFields(input.review, ['command_ids', 'findings', 'fixed_sha', 'handoff_id', 'repair_round', 'verdict', 'write_paths'], 'review');

  const state = input.state;
  const review = input.review;
  validateIdentity(state.handoff_id, state.fixed_sha);
  validateIdentity(review.handoff_id, review.fixed_sha);
  validateRound(state.repair_round, 'state.repair_round');
  validateRound(review.repair_round, 'review.repair_round');
  if (state.status !== 'AWAITING_VERIFICATION') throw new Error('state is not awaiting verification');
  if (review.handoff_id !== state.handoff_id) throw new Error('review handoff_id does not match bound state');
  if (review.fixed_sha !== state.fixed_sha) throw new Error('review fixed_sha does not match bound state');
  if (review.repair_round !== state.repair_round) throw new Error('review repair_round does not match bound state');
  if (!VERDICTS.has(review.verdict)) throw new Error('unknown verifier verdict');
  if (!Array.isArray(review.write_paths) || review.write_paths.length !== 0) throw new Error('Verification cannot receive write_paths');
  if (!Array.isArray(review.command_ids) || review.command_ids.length !== 0) throw new Error('Verification cannot receive command_ids');
  validateFindings(review.findings);

  let status;
  let nextRole;
  let repairRound = state.repair_round;
  let verdict = review.verdict;
  if (verdict === 'PASS') {
    status = 'AWAITING_HUMAN';
    nextRole = 'Human';
  } else if (verdict === 'ESCALATE' || state.repair_round === 2) {
    verdict = 'ESCALATE';
    status = 'HUMAN_ACTION_REQUIRED';
    nextRole = 'Human';
  } else {
    repairRound += 1;
    status = 'AWAITING_DELIVERY';
    nextRole = 'Delivery';
  }

  return {
    ok: true,
    decision: verdict,
    next_role: nextRole,
    next_state: {
      handoff_id: state.handoff_id,
      fixed_sha: state.fixed_sha,
      repair_round: repairRound,
      status
    },
    findings: [...review.findings],
    findings_count: review.findings.length
  };
}

function fail(message, code = 1) {
  console.error(`verification-state: ${message}`);
  process.exit(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, file] = process.argv.slice(2);
  if (command !== 'evaluate' || !file) fail('usage: evaluate <input.json>', 2);
  let raw;
  try { raw = readFileSync(file); } catch { fail('input file is unavailable', 2); }
  if (raw.length > MAX_INPUT_BYTES) fail(`input exceeds ${MAX_INPUT_BYTES} bytes`, 2);
  let input;
  try { input = JSON.parse(raw.toString('utf8')); } catch { fail('input is not valid JSON', 2); }
  try { process.stdout.write(`${JSON.stringify(evaluateVerification(input))}\n`); }
  catch (error) { fail(error.message); }
}
