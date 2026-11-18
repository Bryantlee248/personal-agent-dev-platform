# Verification state

`evaluate.mjs` is a deterministic, zero-dependency decision layer for IWP-007. It accepts a trusted prior state plus a read-only verifier review:

```powershell
node ops/verification-state/evaluate.mjs evaluate e2e/fixtures/verification-state/pass.json
```

The caller must persist the returned `next_state` and present it unchanged for the next review. The module binds each review to the prior `handoff_id`, `fixed_sha`, and `repair_round`; it has no database and does not start Agents, execute commands, write files, merge, release, deploy, or send messages.

Transitions:

- `PASS` -> `AWAITING_HUMAN`
- `FAIL` at round 0 or 1 -> `AWAITING_DELIVERY`, incrementing the round
- `FAIL` at round 2 -> `HUMAN_ACTION_REQUIRED` with decision `ESCALATE`
- `ESCALATE` -> `HUMAN_ACTION_REQUIRED`

After Delivery repairs an item, the orchestrator may change only the status of the persisted state from `AWAITING_DELIVERY` to `AWAITING_VERIFICATION`; the identity, SHA, and round must remain unchanged.
