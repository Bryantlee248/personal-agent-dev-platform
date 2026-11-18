#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const REQUIRED_CHECKS = ['Governance / Validate governance control plane', 'ci / build-test', 'ci / converge', 'ci / independent-verify'];
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[opurs]_[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/,
  /\bAuthorization\s*:\s*Bearer\s+\S+/i
];

function git(args) {
  return spawnSync('git', args, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, windowsHide: true });
}

function field(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...body.matchAll(new RegExp(`^${escaped}:\\s*(.+?)\\s*$`, 'gmi'))];
  if (matches.length !== 1) throw new Error(`${label} must occur exactly once`);
  return matches[0][1].trim();
}

function normalizePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0')) return null;
  const text = value.normalize('NFC').replace(/\\/g, '/');
  if (text.startsWith('/') || /^[A-Za-z]:/.test(text) || text.startsWith('//')) return null;
  const parts = text.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return null;
  return parts.join('/');
}

function pathCovered(path, owned) {
  return owned.some((root) => path === root || path.startsWith(`${root}/`));
}

function ownedPaths(manifest, workPackageId, role) {
  const workPackage = manifest?.effective?.work_packages?.find((item) => item.id === workPackageId);
  if (!workPackage || workPackage.status !== 'ACTIVE' || typeof workPackage.approval !== 'string' || workPackage.approval.length < 20) {
    throw new Error('IWP is not active and authorized at trusted base SHA');
  }
  const owned = (workPackage.file_ownership ?? [])
    .filter((entry) => entry.owner === role)
    .flatMap((entry) => entry.paths ?? [])
    .map(normalizePath);
  if (!owned.length || owned.includes(null)) throw new Error(`IWP ${role} ownership is invalid`);
  return owned;
}

function normalizedChanges(changedPaths) {
  if (!Array.isArray(changedPaths) || !changedPaths.length) throw new Error('PR has no changed paths');
  const normalized = changedPaths.map(normalizePath);
  if (normalized.includes(null)) throw new Error('PR contains an unsafe changed path');
  return normalized;
}

export function validateDelivery({ body, headSha, baseSha, changedPaths, manifest }) {
  if (typeof body !== 'string' || body.length > 64 * 1024) throw new Error('PR body is missing or oversized');
  if (SECRET_PATTERNS.some((pattern) => pattern.test(body))) throw new Error('PR body contains a possible secret');
  if (!/^[0-9a-f]{40}$/.test(headSha) || !/^[0-9a-f]{40}$/.test(baseSha)) throw new Error('base/head SHA must be full lowercase commits');

  const governanceRole = body.match(/<!--\s*gov:role\s*=\s*(\S+)\s*-->/i)?.[1]?.toLowerCase();
  const governanceIwp = body.match(/<!--\s*gov:iwp\s*=\s*(\S+)\s*-->/i)?.[1];
  if (governanceRole === 'architecture') {
    if (!governanceIwp) throw new Error('Architecture PR must bind gov:iwp');
    const changed = normalizedChanges(changedPaths);
    const owned = ownedPaths(manifest, governanceIwp, 'Architecture AI');
    if (changed.some((path) => !pathCovered(path, owned))) throw new Error('Architecture PR mixes paths outside trusted IWP ownership');
    return {
      ok: true,
      applicable: false,
      reason: 'architecture-governance-only',
      iwp: governanceIwp,
      head_sha: headSha,
      changed_paths: changed.length,
      human_merge_required: true
    };
  }

  const workPackageId = field(body, 'IWP');
  const role = field(body, 'Role');
  const fixedHead = field(body, 'Fixed head SHA');
  const verdict = field(body, 'Verification verdict');
  const verificationSha = field(body, 'Verification fixed SHA');
  const session = field(body, 'Verification session');
  const checks = field(body, 'Expected checks').split(',').map((item) => item.trim()).filter(Boolean);
  const humanMerge = field(body, 'Human merge required');

  if (role !== 'Delivery AI') throw new Error('Role must be Delivery AI');
  if (fixedHead !== headSha || verificationSha !== headSha) throw new Error('PR and Verification SHA must equal the event head SHA');
  if (verdict !== 'PASS') throw new Error('Verification verdict must be PASS');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session)) {
    throw new Error('Verification session must be a standard UUID');
  }
  if (humanMerge !== 'YES') throw new Error('Human merge required must be YES');
  if (JSON.stringify(checks.sort()) !== JSON.stringify([...REQUIRED_CHECKS].sort())) throw new Error('Expected checks do not match the fixed delivery contract');

  const owned = ownedPaths(manifest, workPackageId, role);
  const normalized = normalizedChanges(changedPaths);
  if (normalized.some((path) => !pathCovered(path, owned))) throw new Error('PR changes a path outside IWP ownership');

  return {
    ok: true,
    applicable: true,
    iwp: workPackageId,
    head_sha: headSha,
    changed_paths: normalized.length,
    verification: { verdict, fixed_sha: verificationSha, session },
    human_merge_required: true,
    expected_checks: REQUIRED_CHECKS
  };
}

function fail(message, code = 1) {
  console.error(`github-delivery: ${message}`);
  process.exit(code);
}

if (process.argv[1]?.endsWith('validate.mjs')) {
  const body = process.env.GH_PR_BODY ?? '';
  const headSha = process.env.GH_HEAD_SHA ?? '';
  const baseSha = process.env.GH_BASE_SHA ?? '';
  if (!/^[0-9a-f]{40}$/.test(headSha) || !/^[0-9a-f]{40}$/.test(baseSha)) fail('base/head SHA must be full lowercase commits');
  if (git(['cat-file', '-e', `${headSha}^{commit}`]).status !== 0) fail('head SHA is unavailable');
  if (git(['cat-file', '-e', `${baseSha}^{commit}`]).status !== 0) fail('base SHA is unavailable');
  if (git(['merge-base', '--is-ancestor', baseSha, headSha]).status !== 0) fail('base SHA is not an ancestor of head SHA');
  const manifestResult = git(['show', `${baseSha}:PROJECT.json`]);
  if (manifestResult.status !== 0) fail('PROJECT.json is unavailable at trusted base SHA');
  const diff = git(['diff', '--no-renames', '--name-only', '-z', `${baseSha}...${headSha}`]);
  if (diff.status !== 0) fail('cannot read PR diff');
  try {
    const manifest = JSON.parse(manifestResult.stdout);
    const changedPaths = diff.stdout.split('\0').filter(Boolean);
    process.stdout.write(`${JSON.stringify(validateDelivery({ body, headSha, baseSha, changedPaths, manifest }))}\n`);
  } catch (error) { fail(error.message); }
}

export { REQUIRED_CHECKS };
