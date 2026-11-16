#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'PROJECT.json', 'GOVERNANCE.md', 'ROADMAP.md', 'DECISIONS.md', 'WORKLOG.md',
  'docs/architecture.md', 'docs/implementation-plan.md', 'docs/github-control.md',
  'docs/work-packages/IWP-001.md', 'ops/autoloop/rules.example.json'
];
const failures = required.filter((path) => !existsSync(path)).map((path) => `missing ${path}`);

for (const path of ['PROJECT.json', 'package.json', 'ops/autoloop/rules.example.json']) {
  try { JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { failures.push(`${path} is not valid JSON: ${error.message}`); }
}

const manifest = JSON.parse(readFileSync('PROJECT.json', 'utf8'));
const iwp = manifest.effective?.work_packages?.find((item) => item.id === 'IWP-001');
if (!iwp || iwp.roadmap_id !== 'W-001') failures.push('IWP-001 is not bound to W-001');
const w001Active = manifest.state?.active_work_items?.includes('W-001') && ['PLANNED', 'ACTIVE'].includes(iwp?.status);
const w001Closed = !manifest.state?.active_work_items?.includes('W-001') && iwp?.status === 'CLOSED' && Boolean(iwp?.approval);
if (!w001Active && !w001Closed) failures.push('W-001 must be active or closed with approval');
if (manifest.environments?.find((item) => item.id === 'ENV-PILOT')?.status !== 'not-authorized') {
  failures.push('ENV-PILOT must remain not-authorized');
}

const governance = readFileSync('GOVERNANCE.md', 'utf8');
for (const phrase of ['生产', '人工', '授权']) {
  if (!governance.includes(phrase)) failures.push(`GOVERNANCE.md lacks boundary phrase: ${phrase}`);
}

const tracked = readFileSync('.gitignore', 'utf8');
for (const pattern of ['.env', '*.pem']) {
  if (!tracked.includes(pattern)) failures.push(`.gitignore lacks ${pattern}`);
}

if (failures.length) {
  console.error(`J1 failed (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`J1 passed: ${required.length} control-plane artifacts and authorization boundaries verified.`);
