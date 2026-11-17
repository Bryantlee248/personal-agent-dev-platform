#!/usr/bin/env node
const mode = process.env.FAKE_QWEN_MODE || 'pass';
if (mode === 'exit') process.exit(7);
if (mode === 'malformed') {
  process.stdout.write('not-json');
  process.exit(0);
}
const verdict = mode === 'invalid'
  ? { verdict: 'MAYBE', findings: [], reason: 'invalid contract' }
  : { verdict: 'PASS', findings: [], reason: 'fixture accepted' };
process.stdout.write(JSON.stringify([{
  type: 'result',
  structured_result: verdict
}]));
