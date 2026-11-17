#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const jsonFiles = [
  'PROJECT.json',
  'package.json',
  'ops/autoloop/rules.example.json',
  'ops/compatibility/qwen-verdict.schema.json'
];
for (const file of jsonFiles) JSON.parse(readFileSync(file, 'utf8'));

const workflowFiles = ['.github/workflows/ci.yml', '.github/workflows/governance.yml'];
const missing = workflowFiles.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`missing workflow files: ${missing.join(', ')}`);

console.log(`build passed: ${jsonFiles.length} JSON contracts and ${workflowFiles.length} CI workflows are present.`);
