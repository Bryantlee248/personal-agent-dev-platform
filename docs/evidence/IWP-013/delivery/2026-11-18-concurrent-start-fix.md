# IWP-013 concurrent start correction

- Independent review identified a P1: a losing `start()` could leave a foreign candidate that caused the winning COMMITTED transaction to fail later recovery.
- Ordinary `fs.link` `EEXIST` handling now removes only that caller's unlinked candidate before returning `LOCKED`; cleanup failure returns `BLOCKED`. An interrupted pre-publication attempt may still leave a candidate, and recovery treats a candidate from another run as ambiguous `BLOCKED` without mutation.
- A deterministic two-start test pauses both after validation and before publication. It asserts one `COMMITTED`, one `LOCKED`, one owner record, one winner candidate, and successful COMMITTED recovery. A separately injected, valid-shaped foreign candidate then yields `BLOCKED` and preserves the exact directory listing and journal bytes.
- The live-owner test now coordinates via child stdout after the PREPARED journal write. Polling `journal.json` previously caused an intermittent Windows sharing violation during rename; repeated targeted runs now avoid that test-induced file-handle race.
- After this correction: targeted test passed; full local gate rerun remains the final pre-review step. No Qwen PASS, commit, push or PR is claimed here.
