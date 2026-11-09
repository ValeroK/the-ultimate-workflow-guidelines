---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: [quality, developer]
dirty: false
verify_rounds: 0
last_verify: green
escalated: false
gate_violation: 
---

# PLAN: calc

## Goal

A tiny calculator library in plain Node (CommonJS, no dependencies): `add`, `sub`, an expression
parser over them, and a formatter. Tests use `node:test` and `node:assert`.

## Decisions

- Integers only. A non-integer argument throws `TypeError` with a message naming the argument.
- Safe integers only. An integer argument outside `Number.MIN_SAFE_INTEGER`..`Number.MAX_SAFE_INTEGER`, or a result outside that range, throws `RangeError` with a message naming the argument (or `result`). Nothing is silently rounded.
- Each module exports one function as `module.exports`.

## Cards

- add: add two integers
  paths: src/add.js, test/add.test.js
  status: fixed-in-round d8e59ca0c2ce
  committed: d8e59ca0c2ce
- sub: subtract two integers
  paths: src/sub.js, test/sub.test.js
  status: committed 96095c6fc10e
  committed: 96095c6fc10e
- parse: evaluate "a+b" and "a-b" with add and sub
  paths: src/parse.js, test/parse.test.js
  depends: add, sub
  status: committed c364a9b0163e
  committed: c364a9b0163e
- format: format a result as "= n"
  paths: src/format.js, test/format.test.js
  depends: parse
  status: committed b6f56951bc6b
  committed: b6f56951bc6b
- findings: non-blocking expert findings no card fixed
  paths: src/parse.js, src/format.js
  carried: developer at src/parse.js:13: An operand with more than about 309 digits converts to Infinity, so add or sub throws TypeError instead of the RangeError the plan requires for operands outside the safe range.; quality at src/format.js:2: format checks only Number.isInteger, so it breaks the plan's safe-integer decision, and no test covers it.; developer at src/format.js:2: format checks only Number.isInteger, so it skips the plan's safe-integer rule that add.js and sub.js enforce with a RangeError.
  status: committed 981d2e3c98b2
  committed: 981d2e3c98b2
- fixup: confirmed review findings
  paths: test/add.test.js, test/sub.test.js
  carried: test-coverage at C:/Users/kobiv/Projects/uw-autopilot-test/test/add.test.js:26: The result-range check in add is only tested at MAX_SAFE_INTEGER + 1 (add(MAX, 1)), never at the boundary where the result is exactly MAX_SAFE_INTEGER, so no test asserts that a valid result at the limit is returned.; test-coverage at C:/Users/kobiv/Projects/uw-autopilot-test/test/sub.test.js:26: The lower result bound in sub is only exercised by sub(MIN_SAFE_INTEGER, 1), which yields MIN_SAFE - 1 and throws, there is no positive case where the result lands exactly on Number.MIN_SAFE_INTEGER.
  status: committed 0e42bf1c634c
  committed: 0e42bf1c634c

## Tests

### add: add two integers

- `add(1, 2)` is `3`; `add(-1, 1)` is `0`.
- `add(1.5, 1)` throws `TypeError` whose message names `a`; `add(1, 1.5)` throws `TypeError` whose message names `b`.
- `add(2 ** 53, 0)` throws `RangeError` whose message names `a`; `add(0, 2 ** 53)` throws `RangeError` whose message names `b`.
- `add(Number.MAX_SAFE_INTEGER, 1)` throws `RangeError` whose message names `result`.

### sub: subtract two integers

- `sub(5, 3)` is `2`; `sub(0, 4)` is `-4`.
- `sub(0.5, 1)` throws `TypeError` whose message names `a`; `sub(1, 0.5)` throws `TypeError` whose message names `b`.
- `sub(-(2 ** 53), 0)` throws `RangeError` whose message names `a`; `sub(0, 2 ** 53)` throws `RangeError` whose message names `b`.
- `sub(Number.MIN_SAFE_INTEGER, 1)` throws `RangeError` whose message names `result`.

### parse: evaluate "a+b" and "a-b" with add and sub

- `parse("1+2")` is `3`; `parse("10-4")` is `6`; spaces are allowed: `parse(" 2 + 2 ")` is `4`.
- `parse("1*2")` throws `SyntaxError`.
- `parse("9007199254740993+0")` throws `RangeError` (the operand is past the safe range and is never rounded first).

### format: format a result as "= n"

- `format(3)` is `"= 3"`; `format(-4)` is `"= -4"`.
- `format(parse("1+2"))` is `"= 3"`.
- `format(1.5)` throws `TypeError` whose message names `n`.

## Run status

- Date: 2026-11-09
- Run branch: uw/run/calc
- Cards: 1 fixed-in-round, 5 committed
- Harvest: uw/harvest/calc
- Report: .ultimate-workflow/run/calc/report.md
