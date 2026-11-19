# IWP-013 local Delivery validation (pre-review)

- Fixed baseline: `005ecff9880487955205f2be152769445d6dd098`; branch `delivery/iwp-013-crash-recovery` in a clean separate worktree. No IWP-011 implementation was copied.
- Target Windows temp-volume hard-link test: 100 independent two-contender races against one owner name; each produced exactly one successful `fs.link` and one `EEXIST`, and the winner's bytes remained intact. The tracked e2e repeats 20 races.
- `node e2e/transactional-deploy.mjs`: PASS. Includes normal COMMITTED readback, write-before-reject cases, foreground child process exit at UNPUBLISHED/NEW/PREPARED/SWITCH_INTENT/SWITCHED/VERIFIED, interrupted RECOVERING, repeated FAILED recovery, malformed journal and extra sandbox fail-closed checks, live-owner LOCKED, and dead-owner race.
- `npm test`: PASS; `npm run governance`: PASS; `node scripts/validate-governance.mjs --ci`: PASS; `npm run converge`: CONVERGED gaps=0; `npm run verify`: all_pass=true; `npm run build`: PASS; `npm run lint`: PASS; `git diff --check`: PASS.
- File symlink creation returned EPERM on this Windows account, so that specific negative case is unverified. Windows junction creation succeeded; the junction base rejection test passes. Power-loss durability is outside this work package's claim.
- Out-of-ownership generated reports (`specs/gaps.md`, `verify-report.json`) were restored after validation. Independent Qwen review, commit, PR and remote CI remain pending.
