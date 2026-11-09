# Run report: calc

Branch `uw/run/calc` from 80b619db8981. 6 committed, 0 parked, 0 blocked. Review: 3 confirmed. Harvest: 2 proposals on uw/harvest/calc.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| add | add two integers | committed | d8e59ca0c2ce | 1 round(s) and a fix round (fixed) |
| sub | subtract two integers | committed | 96095c6fc10e | 1 round(s) |
| parse | evaluate "a+b" and "a-b" with add and sub | committed | c364a9b0163e | 1 round(s) |
| format | format a result as "= n" | committed | b6f56951bc6b | 1 round(s) |
| findings | non-blocking expert findings no card fixed | committed | 981d2e3c98b2 | 1 round(s) |
| fixup | confirmed review findings | committed | 0e42bf1c634c | 1 round(s) |

## Fix rounds

- add: round 2, fixed (In test/add.test.js I replaced the loose /\ba\b/ and /\bb\b/ regexes in the two 'unsafe' RangeError tests with the anchored exact messages /^a must be a safe integer$/ and /^b must be a safe integer$/. The result-range message 'result must be a safe integer' contains the standalone word 'a', so the old 'unsafe a' check could not tell an argument failure from a result failure. The anchored patterns reject it. The 'unsafe b' test was tightened the same way for consistency. This tightens the assertions, so nothing is weakened. Production code is unchanged. I did not run a break-the-code check to see the tightened test fail. Both the normal and --full verify runs passed, 6 of 6 tests.)
  - quality: test/add.test.js:19 The 'unsafe a' test matches the message with /\ba\b/, and the result-range message 'result must be a safe integer' contains the standalone word 'a', so the test cannot tell an argument-range failure from a result-range failure.

## Out of scope and claims

- findings: changed outside its paths: test/format.test.js, test/parse.test.js
- findings: changed outside its paths: test/format.test.js, test/parse.test.js

## Review

3 confirmed, 3 refuted, 0 unverified (80b619db8981fe2868960a66ee09d004d2ad9fe5..HEAD).
- [medium] test-coverage: C:/Users/kobiv/Projects/uw-autopilot-test/test/add.test.js:26 The result-range check in add is only tested at MAX_SAFE_INTEGER + 1 (add(MAX, 1)), never at the boundary where the result is exactly MAX_SAFE_INTEGER, so no test asserts that a valid result at the limit is returned.
- [medium] test-coverage: C:/Users/kobiv/Projects/uw-autopilot-test/test/sub.test.js:26 The lower result bound in sub is only exercised by sub(MIN_SAFE_INTEGER, 1), which yields MIN_SAFE - 1 and throws; there is no positive case where the result lands exactly on Number.MIN_SAFE_INTEGER.
- [low] test-coverage: C:/Users/kobiv/Projects/uw-autopilot-test/test/format.test.js:22 The 'formats the safe-integer limits' test asserts only Number.MAX_SAFE_INTEGER; the lower limit Number.MIN_SAFE_INTEGER is only checked as a rejected value (MIN - 1) and never as an accepted value.

## Harvest

2 proposal(s) on `uw/harvest/calc`, one commit per file: memory/calc.md (064f743b9803), progress.md (fe3bd25f0aeb). Merge it to keep them, or delete it.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
