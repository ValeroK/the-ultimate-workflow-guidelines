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
- Each module exports one function as `module.exports`.

## Cards

- add: add two integers
  paths: src/add.js, test/add.test.js
  committed: fb846c38d824
- sub: subtract two integers
  paths: src/sub.js, test/sub.test.js
  committed: 6816b1aff0d2
- parse: evaluate "a+b" and "a-b" with add and sub
  paths: src/parse.js, test/parse.test.js
  depends: add, sub
  committed: 6a2a517ca3b6
- format: format a result as "= n"
  paths: src/format.js, test/format.test.js
  depends: parse
  committed: 9f8b3ead30dd
- findings: non-blocking expert findings no card fixed
  paths: test/add.test.js, test/format.test.js
  carried: quality at test/add.test.js:11: Only the guard is tested, the guard in src/add.js line 3 has no test.; quality at test/format.test.js:8: The TypeError guard in src/format.js (the plan's integers-only decision) has no test.
  committed: e6d7dc17df03
- fixup: confirmed blocking review findings
  paths: test/sub.test.js
  carried: test-coverage at test/sub.test.js:11: sub's integer guard for argument `a` (src/sub.js line 2) has no test, only `b` is exercised.
  committed: 1a0217fbd884

## Tests

### add: add two integers

- `add(1, 2)` is `3`; `add(-1, 1)` is `0`.
- `add(1.5, 1)` throws `TypeError` whose message names `a`.

### sub: subtract two integers

- `sub(5, 3)` is `2`; `sub(0, 4)` is `-4`.
- `sub(1, 0.5)` throws `TypeError` whose message names `b`.

### parse: evaluate "a+b" and "a-b" with add and sub

- `parse("1+2")` is `3`; `parse("10-4")` is `6`; spaces are allowed: `parse(" 2 + 2 ")` is `4`.
- `parse("1*2")` throws `SyntaxError`.

### format: format a result as "= n"

- `format(3)` is `"= 3"`; `format(-4)` is `"= -4"`.
- `format(parse("1+2"))` is `"= 3"`.
