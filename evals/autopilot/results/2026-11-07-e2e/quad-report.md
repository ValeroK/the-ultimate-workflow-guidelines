# Run report: calc

Branch `uw/run/calc` from 39ffa43dbee8. 6 committed, 0 parked, 0 blocked. Review: 1 confirmed. Harvest: 1 proposals on uw/harvest/calc.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| add | add two integers | committed | fb846c38d824 | 1 round(s) |
| sub | subtract two integers | committed | 6816b1aff0d2 | 1 round(s) |
| parse | evaluate "a+b" and "a-b" with add and sub | committed | 6a2a517ca3b6 | 1 round(s) |
| format | format a result as "= n" | committed | 9f8b3ead30dd | 1 round(s) |
| findings | non-blocking expert findings no card fixed | committed | e6d7dc17df03 | 1 round(s) |
| fixup | confirmed blocking review findings | committed | 1a0217fbd884 | 1 round(s) |

## Out of scope and claims

- none

## Review

1 confirmed, 0 refuted, 0 unverified (39ffa43dbee81b1c923a4edd1af1eeb3d3c14508..HEAD).
- [high] test-coverage: test/sub.test.js:11 sub's integer guard for argument `a` (src/sub.js line 2) has no test; only `b` is exercised.

## Harvest

1 proposal(s) on `uw/harvest/calc`, one commit per file: progress.md (86df5a2b5b26). Merge it to keep them, or delete it.

Parked cards resume with `/ultimate-workflow:run --resume <card>`. Nothing was pushed.
