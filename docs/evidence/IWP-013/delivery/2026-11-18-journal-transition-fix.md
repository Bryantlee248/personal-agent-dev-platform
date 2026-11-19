# IWP-013 journal transition correction

- Independent pre-review found that checksum-valid journal records could encode impossible sequence/state combinations because predecessor and successor were absent.
- Journal records now include `from`, `to`, `state` and `seq` with a SHA-256 checksum. `readJournal` validates the full legal forward path, recovery transition and replay, and FAILED terminal transition before recovery writes.
- The negative test changes a PREPARED record's predecessor to SWITCHED, recalculates the checksum, then asserts `BLOCKED`, unchanged base listing and unchanged journal bytes.
- This is local pre-Qwen evidence. No commit, push, PR, remote CI or final W-007 acceptance is claimed.
