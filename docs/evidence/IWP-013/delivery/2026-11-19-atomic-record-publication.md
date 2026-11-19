# IWP-013 atomic metadata publication correction

- Qwen first effective review `d1c97ee1-9280-476c-a08c-154e5573765e` identified partial final candidate/intent/origin records as a P1 risk.
- Candidate owner records, `intent.json`, and `origin.json` now use a same-directory unique temporary file, complete write and file sync, then atomic rename to the final name. A publication error returns `BLOCKED` and leaves the temporary file for inspection.
- Foreground child tests exit immediately after each synced temporary record (`CANDIDATE_TEMP`, `INTENT_TEMP`, `ORIGIN_TEMP`). New recovery calls return `BLOCKED` without changing the exact recursive file tree. A separate foreground child creates a truncated final candidate placeholder and exits; recovery also returns `BLOCKED` without changes.
- This change does not resolve the independent foreign-candidate policy finding. The frozen IWP-012/013 contract still requires an Architecture ruling for that case. No second Qwen review, commit, push or PR is claimed.
