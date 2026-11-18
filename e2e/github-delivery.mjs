#!/usr/bin/env node
import { validateDelivery, REQUIRED_CHECKS } from '../ops/github-delivery/validate.mjs';

const headSha = '1'.repeat(40);
const baseSha = '2'.repeat(40);
const manifest = {
  effective: {
    work_packages: [
      {
        id: 'IWP-008', status: 'ACTIVE', approval: 'User explicitly approved this bounded work package.',
        file_ownership: [{ owner: 'Delivery AI', paths: ['ops/github-delivery', 'e2e/github-delivery.mjs'] }]
      },
      {
        id: 'IWP-009', status: 'ACTIVE', approval: 'User explicitly approved this governance work package.',
        file_ownership: [{ owner: 'Architecture AI', paths: ['PROJECT.json', 'ROADMAP.md', 'docs/work-packages/IWP-009.md'] }]
      }
    ]
  }
};
const body = [
  'IWP: IWP-008',
  'Role: Delivery AI',
  `Fixed head SHA: ${headSha}`,
  'Verification verdict: PASS',
  `Verification fixed SHA: ${headSha}`,
  'Verification session: 11111111-1111-4111-8111-111111111111',
  `Expected checks: ${REQUIRED_CHECKS.join(', ')}`,
  'Human merge required: YES'
].join('\n');
const valid = { body, headSha, baseSha, changedPaths: ['ops/github-delivery/validate.mjs'], manifest };
const failures = [];

function accept(name, edit, check) {
  const packet = structuredClone(valid); edit(packet);
  try { if (!check(validateDelivery(packet))) failures.push(name); } catch { failures.push(name); }
}
function reject(name, edit) {
  const packet = structuredClone(valid); edit(packet);
  try { validateDelivery(packet); failures.push(name); } catch { /* expected */ }
}

accept('valid contract', () => {}, (r) => r.ok && r.iwp === 'IWP-008' && r.human_merge_required);
accept('architecture not applicable', (p) => {
  p.body = '<!-- gov:role=Architecture -->\n<!-- gov:iwp=IWP-009 -->';
  p.changedPaths = ['PROJECT.json', 'docs/work-packages/IWP-009.md'];
}, (r) => r.ok && r.applicable === false && r.reason === 'architecture-governance-only'
  && r.iwp === 'IWP-009' && r.changed_paths === 2 && r.human_merge_required);
const invalid = [
  ['head drift', (p) => { p.headSha = '3'.repeat(40); }],
  ['verification drift', (p) => { p.body = p.body.replace(`Verification fixed SHA: ${headSha}`, `Verification fixed SHA: ${'3'.repeat(40)}`); }],
  ['failed review', (p) => { p.body = p.body.replace('Verification verdict: PASS', 'Verification verdict: FAIL'); }],
  ['missing review', (p) => { p.body = p.body.replace(/^Verification session:.*$/m, ''); }],
  ['duplicate IWP', (p) => { p.body += '\nIWP: IWP-008'; }],
  ['wrong role', (p) => { p.body = p.body.replace('Role: Delivery AI', 'Role: Architecture AI'); }],
  ['inactive IWP', (p) => { p.manifest.effective.work_packages[0].status = 'CLOSED'; }],
  ['outside ownership', (p) => { p.changedPaths = ['PROJECT.json']; }],
  ['case variant outside ownership', (p) => { p.changedPaths = ['OPS/github-delivery/validate.mjs']; }],
  ['parent traversal', (p) => { p.changedPaths = ['ops/github-delivery/../secret']; }],
  ['wrong checks', (p) => { p.body = p.body.replace(', ci / independent-verify', ''); }],
  ['no human gate', (p) => { p.body = p.body.replace('Human merge required: YES', 'Human merge required: NO'); }],
  ['secret', (p) => { p.body += '\nAuthorization: Bearer example-secret-value'; }],
  ['empty diff', (p) => { p.changedPaths = []; }]
];
for (const [name, edit] of invalid) reject(name, edit);
reject('architecture mixed path', (p) => {
  p.body = '<!-- gov:role=architecture -->\n<!-- gov:iwp=IWP-009 -->';
  p.changedPaths = ['PROJECT.json', 'ops/github-delivery/validate.mjs'];
});
reject('architecture inactive IWP', (p) => {
  p.body = '<!-- gov:role=architecture -->\n<!-- gov:iwp=IWP-009 -->';
  p.changedPaths = ['PROJECT.json'];
  p.manifest.effective.work_packages[1].status = 'CLOSED';
});
reject('architecture missing IWP', (p) => {
  p.body = '<!-- gov:role=architecture -->';
  p.changedPaths = ['PROJECT.json'];
});
reject('architecture missing ownership', (p) => {
  p.body = '<!-- gov:role=architecture -->\n<!-- gov:iwp=IWP-009 -->';
  p.changedPaths = ['PROJECT.json'];
  p.manifest.effective.work_packages[1].file_ownership = [];
});
reject('architecture unsafe path', (p) => {
  p.body = '<!-- gov:role=architecture -->\n<!-- gov:iwp=IWP-009 -->';
  p.changedPaths = ['docs/work-packages/../PROJECT.json'];
});
reject('architecture lookalike role', (p) => {
  p.body = '<!-- gov:role=not-architecture -->\n<!-- gov:iwp=IWP-009 -->';
  p.changedPaths = ['PROJECT.json'];
});

if (failures.length) {
  console.error(`github-delivery tests failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('github-delivery tests passed: SHA binding, active IWP, ownership, checks, review ledger, human gate, and secret rejection verified.');
