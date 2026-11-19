# IWP-013 committed orphan readback

- Architecture baseline `7c2d3f29e0ca334531ae80373c6ad6728f8ca2a9` authorizes only a read-only COMMITTED exception for one dead, unlinked generation-1 candidate from another run.
- Target Windows temporary-volume tests now assert bigint `dev`+`ino`: a hard-linked candidate and owner have equal identity; an independent file differs. Runtime checks each owner has exactly one candidate with equal identity and bytes, and validates exact metadata schemas.
- A controlled foreground loser publishes a complete synced candidate and waits before `fs.link`; a separately validated winner commits and exits. While the loser is alive, recovery returns `BLOCKED` without changing a recursive path-and-byte-hash snapshot. After killing the loser, two recovery calls return `COMMITTED` with the same snapshot.
- Negative cases with the same committed fixture: malformed, mismatched SHA, and two orphan candidates; a valid non-COMMITTED journal; owner/candidate equal bytes but different file identity; injected unavailable identity; and tampered release bytes. Each returns `BLOCKED` with the exact recursive snapshot unchanged. The fixture is restored between cases.
- No orphan case grants recovery writes or candidate cleanup. No second Qwen review, commit, push, PR or W-007 completion is claimed here.
