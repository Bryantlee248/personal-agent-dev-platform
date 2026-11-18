#!/usr/bin/env node
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const MAX_PACKET_BYTES = 128 * 1024;
const POLICY_PATH = 'contracts/handoff-policy.json';
const MANIFEST_PATH = 'PROJECT.json';
const ROLES = new Set(['Architecture', 'Delivery', 'Verification', 'Human']);
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /["']?(?:api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|password|token|secret)["']?\s*[:=]\s*["']?\S+/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
  /\b(?:gh[opurs]_[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/,
  /\b(?:xox[a-z]-[A-Za-z0-9-]{10,}|AIza[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/,
  /\bAuthorization\s*:\s*Bearer\s+\S+/i,
  /\b(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/i
];
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function fail(message, code = 1) {
  console.error(`handoff-runtime: ${message}`);
  process.exit(code);
}

function git(root, args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true
  });
}

function readJsonAt(root, sha, path) {
  const result = git(root, ['show', `${sha}:${path}`]);
  if (result.status !== 0) throw new Error(`${path} is unavailable at fixed_sha`);
  try { return JSON.parse(result.stdout); }
  catch { throw new Error(`${path} is invalid JSON at fixed_sha`); }
}

function normalizeRepoPath(value) {
  if (typeof value !== 'string' || !value || value.length > 260 || value.includes('\0')) return null;
  const text = value.normalize('NFC').replace(/\\/g, '/');
  if (isAbsolute(text) || /^[A-Za-z]:/.test(text) || text.startsWith('//') || text.startsWith('/')) return null;
  const parts = text.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || /[\x00-\x1f:]/.test(part) || /[. ]$/.test(part) || WINDOWS_RESERVED.test(part))) return null;
  return parts.map((part) => part.toLowerCase()).join('/');
}

function exactStringArray(value, name, { min = 0, max = 50 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${name} must contain ${min}-${max} items`);
  if (value.some((item) => typeof item !== 'string' || !item || item.length > 500)) throw new Error(`${name} contains an invalid string`);
  if (new Set(value).size !== value.length) throw new Error(`${name} contains duplicates`);
  return value;
}

function normalizedPaths(value, name, options) {
  return exactStringArray(value, name, options).map((path) => {
    const normalized = normalizeRepoPath(path);
    if (!normalized) throw new Error(`${name} contains an unsafe path: ${path}`);
    return normalized;
  });
}

function stringValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => [key, ...stringValues(child)]);
  return [];
}

function validate(packet, root) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new Error('packet must be an object');
  const expected = ['command_ids', 'fixed_sha', 'from_role', 'handoff_id', 'read_paths', 'schema_version', 'status', 'stop_conditions', 'to_role', 'work_item', 'workspace', 'write_paths'].sort();
  if (JSON.stringify(Object.keys(packet).sort()) !== JSON.stringify(expected)) throw new Error('packet fields do not match the contract');
  if (packet.schema_version !== 1) throw new Error('schema_version must be 1');
  if (!/^HOF-\d{3,}$/.test(packet.handoff_id)) throw new Error('invalid handoff_id');
  if (!/^W-\d{3}$/.test(packet.work_item)) throw new Error('invalid work_item');
  if (!/^[0-9a-f]{40}$/.test(packet.fixed_sha)) throw new Error('fixed_sha must be a full lowercase SHA');
  if (git(root, ['cat-file', '-e', `${packet.fixed_sha}^{commit}`]).status !== 0) throw new Error('fixed_sha is not a commit in this repository');
  if (git(root, ['merge-base', '--is-ancestor', packet.fixed_sha, 'HEAD']).status !== 0) throw new Error('fixed_sha must be reachable from current HEAD');
  if (!ROLES.has(packet.from_role) || !ROLES.has(packet.to_role)) throw new Error('unknown role');
  if (packet.status !== 'READY') throw new Error('status must be READY');

  const manifest = readJsonAt(root, packet.fixed_sha, MANIFEST_PATH);
  const policy = readJsonAt(root, packet.fixed_sha, POLICY_PATH);
  if (policy.schema_version !== 1 || policy.policy_id !== 'personal-agent-handoff-v1') throw new Error('unsupported fixed policy');
  if (!policy.transitions?.includes(`${packet.from_role}>${packet.to_role}`)) throw new Error('transition is not allowed by fixed policy');
  const itemPolicy = policy.work_items?.[packet.work_item];
  if (!itemPolicy) throw new Error('work item is absent from fixed policy');
  const workPackage = manifest.effective?.work_packages?.find((item) => item.id === itemPolicy.work_package);
  if (!workPackage || workPackage.roadmap_id !== packet.work_item || !workPackage.approval) throw new Error('fixed manifest does not authorize this work item');
  const iwpPath = `docs/work-packages/${itemPolicy.work_package}.md`;
  const fixedIwp = git(root, ['show', `${packet.fixed_sha}:${iwpPath}`]);
  if (fixedIwp.status !== 0 || !fixedIwp.stdout.includes(`- Roadmap：${packet.work_item}`) || !fixedIwp.stdout.includes('- 状态：ACTIVE')) {
    throw new Error('fixed work-package document is missing or inconsistent');
  }

  const fixedOwned = (workPackage.file_ownership ?? [])
    .filter((entry) => entry.owner === 'Delivery AI')
    .flatMap((entry) => entry.paths ?? [])
    .map(normalizeRepoPath);
  const policyWrites = normalizedPaths(itemPolicy.delivery_write_paths, 'fixed policy write paths', { min: 1 });
  if (policyWrites.some((path) => !fixedOwned.includes(path))) throw new Error('fixed policy exceeds fixed manifest ownership');

  const reads = normalizedPaths(packet.read_paths, 'read_paths', { min: 1 });
  const writes = normalizedPaths(packet.write_paths, 'write_paths');
  if (packet.to_role === 'Delivery') {
    if (!writes.length) throw new Error('Delivery requires write_paths');
    if (writes.some((path) => !policyWrites.includes(path))) throw new Error('write_paths must exactly match fixed policy entries');
  } else if (writes.length) {
    throw new Error(`${packet.to_role} cannot receive write_paths`);
  }

  if (!packet.workspace || typeof packet.workspace !== 'object' || Array.isArray(packet.workspace)) throw new Error('workspace must be an object');
  if (JSON.stringify(Object.keys(packet.workspace).sort()) !== JSON.stringify(['isolation', 'path'])) throw new Error('workspace fields do not match the contract');
  const workspace = normalizeRepoPath(packet.workspace.path);
  if (packet.workspace.isolation !== 'git-worktree' || !workspace || !/^\.worktrees\/[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(workspace)) throw new Error('workspace must be .worktrees/<lowercase-slug>');

  const commandIds = exactStringArray(packet.command_ids, 'command_ids', { min: 1, max: 20 });
  if (commandIds.some((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id) || !itemPolicy.command_ids?.includes(id) || !Array.isArray(policy.commands?.[id]))) throw new Error('command_ids contains an unknown fixed command');
  const stopConditions = exactStringArray(packet.stop_conditions, 'stop_conditions', { min: 1, max: 20 });
  if (stringValues(packet).some((value) => SECRET_PATTERNS.some((pattern) => pattern.test(value)))) throw new Error('packet contains a possible secret');

  return {
    ok: true,
    handoff_id: packet.handoff_id,
    transition: `${packet.from_role}>${packet.to_role}`,
    fixed_sha: packet.fixed_sha,
    normalized: { read_paths: reads, write_paths: writes, workspace },
    commands: commandIds.map((id) => ({ id, argv: policy.commands[id] })),
    stop_conditions: stopConditions.length
  };
}

const [command, packetArg] = process.argv.slice(2);
if (command === '--help' || command === '-h') {
  console.log('Usage: node ops/handoff-runtime/validate.mjs validate <repository-relative-packet.json>');
  process.exit(0);
}
if (command !== 'validate' || !packetArg) fail('usage: validate <repository-relative-packet.json>', 2);
const root = realpathSync(process.cwd());
const requested = resolve(root, packetArg);
const rel = relative(root, requested);
if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail('packet must be inside the repository', 2);
let packetPath;
try { packetPath = realpathSync(requested); }
catch { fail('packet does not exist', 2); }
const realRel = relative(root, packetPath);
if (!realRel || realRel === '..' || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) fail('packet resolves outside the repository', 2);
const stat = statSync(packetPath);
if (!stat.isFile()) fail('packet must be a regular file', 2);
if (stat.size > MAX_PACKET_BYTES) fail(`packet exceeds ${MAX_PACKET_BYTES} bytes`, 2);
let packet;
try { packet = JSON.parse(readFileSync(packetPath, 'utf8')); }
catch { fail('packet is not valid JSON', 2); }
try { process.stdout.write(`${JSON.stringify(validate(packet, root))}\n`); }
catch (error) { fail(error.message); }
