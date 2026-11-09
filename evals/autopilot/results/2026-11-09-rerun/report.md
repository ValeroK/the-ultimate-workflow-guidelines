# Run report: calc

Branch `uw/run/calc` from ba6c020140ed. 5 committed, 0 parked, 0 blocked. Review: 2 confirmed. Harvest: 1 proposals on uw/harvest/calc.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| add | add two integers | committed | 31eb72a50cb8 | 1 round(s) |
| sub | subtract two integers | committed | 2e4bf45140c5 | 1 round(s) |
| parse | evaluate "a+b" and "a-b" with add and sub | committed | c6567e1ac6ef | 1 round(s) |
| format | format a result as "= n" | committed | 0e18b52776e0 | 1 round(s) |
| findings | non-blocking expert findings no card fixed | committed | 9469b44a4943 | 1 round(s) |

## Out of scope and claims

- none

## Review

2 confirmed, 0 refuted, 0 unverified (ba6c020140ed18dd7b782982478f8a1d15db37e3..HEAD).
- [medium] correctness: C:/Users/kobiv/Projects/uw-autopilot-test/src/parse.js:7 parse converts digit strings with Number() and add/sub validate only with Number.isInteger, which accepts unsafe integers beyond 2^53, so results are silently rounded.
- [medium] test-coverage: C:/Users/kobiv/Projects/uw-autopilot-test/test/sub.test.js:10 The non-integer check on the `a` argument in src/sub.js (line 2) has no test; only the `b` branch is exercised.

## Harvest

1 proposal(s) on `uw/harvest/calc`, one commit per file: progress.md (936d8af4d166). Merge it to keep them, or delete it.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
