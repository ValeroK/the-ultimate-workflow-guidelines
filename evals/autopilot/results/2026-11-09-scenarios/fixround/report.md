# Run report: calc

Branch `uw/run/calc` from 68f35853371f. 5 committed, 0 parked, 0 blocked. Review: 0 confirmed. Harvest: 1 proposals on uw/harvest/calc.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| add | add two integers | committed | bdf477b8daad | 1 round(s) and a fix round (fixed) |
| sub | subtract two integers | committed | 650ea5b9b0d4 | 1 round(s) |
| parse | evaluate "a+b" and "a-b" with add and sub | committed | be9a8ded9226 | 1 round(s) |
| format | format a result as "= n" | committed | 4cdf9bcf3f86 | 1 round(s) |
| findings | non-blocking expert findings no card fixed | committed | 23ff62b8b484 | 1 round(s) |

## Fix rounds

- add: round 2, fixed (Added a test for the second-argument guard: add(1, 1.5) must throw a TypeError whose message names b. The code in src/add.js already did this, so the test passed on its first run (a missing-coverage fix, not a behaviour fix). I did not mutate the guard to watch it fail. The verify run and the --full run both passed, 3 of 3 tests. Nothing ran against fakes. No lint, format or type-check command was found or run.)
  - quality: test/add.test.js:12 Only the first-argument rejection is tested, so the second-argument guard in src/add.js is not covered, although the plan Decisions require every non-integer argument to throw a TypeError naming it.

## Out of scope and claims

- none

## Review

0 confirmed, 0 refuted, 0 unverified (68f35853371f3742a76108277b2e7a7f12c332b5..HEAD).

## Harvest

1 proposal(s) on `uw/harvest/calc`, one commit per file: progress.md (472970835207). Merge it to keep them, or delete it.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
