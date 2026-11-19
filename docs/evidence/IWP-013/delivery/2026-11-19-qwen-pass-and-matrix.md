# IWP-013 Delivery review and validation matrix

- Architecture contract baseline: `7c2d3f29e0ca334531ae80373c6ad6728f8ca2a9` (IWP-012/013 committed-orphan readback amendment).
- Qwen first effective full-diff review: `d1c97ee1-9280-476c-a08c-154e5573765e`, zero ordinary tools, FAIL with two P1 findings. The Delivery fixes and Architecture ruling are reflected in the final diff.
- Qwen second and final effective full-diff review: `a0fd2d8a-5e8e-47ff-8496-c71f550df53f`, zero ordinary tools, PASS. No implementation code changed afterward.

| Contract area | Local evidence |
| --- | --- |
| Source and filesystem boundary | Complete source validation before sandbox writes; empty existing temporary base; caller cannot choose target/current/release; rejection tests assert stable codes and exact tree. |
| Owner and records | Synced candidate/intent/origin temp publication; target-volume hard-link identity proof; concurrent starts and actual child exits at record publication points. |
| Journal and recovery | Legal from/to and sequence validation; actual child exits at UNPUBLISHED, NEW, PREPARED, SWITCH_INTENT, SWITCHED, VERIFIED, and RECOVERING; repeated terminal recovery. |
| Narrow orphan exception | Foreground loser killed after synced candidate and before owner link; live loser BLOCKED; dead loser repeated COMMITTED with byte-identical tree. Malformed, mismatched, multiple, non-COMMITTED, identity failure, and release tamper cases BLOCKED with identical tree. |
| Repository gates | `npm test`, `npm run governance`, `node scripts/validate-governance.mjs --ci`, `npm run converge` (gaps=0), `npm run verify` (all_pass=true), `npm run build`, `npm run lint`, and `git diff --check` passed after the final code change. |

File symlink creation returned EPERM for this Windows account; the junction rejection test passed. These tests do not claim power-loss durability. Remote fixed-SHA checks and merge remain separate gates.
