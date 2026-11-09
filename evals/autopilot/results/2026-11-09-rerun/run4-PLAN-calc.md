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
  status: committed 31eb72a50cb8
  committed: 31eb72a50cb8
- sub: subtract two integers
  paths: src/sub.js, test/sub.test.js
  status: committed 2e4bf45140c5
  committed: 2e4bf45140c5
- parse: evaluate "a+b" and "a-b" with add and sub
  paths: src/parse.js, test/parse.test.js
  depends: add, sub
  status: committed c6567e1ac6ef
  committed: c6567e1ac6ef
- format: format a result as "= n"
  paths: src/format.js, test/format.test.js
  depends: parse
  status: committed 0e18b52776e0
  committed: 0e18b52776e0
- findings: non-blocking expert findings no card fixed
  paths: test/add.test.js
  carried: quality at test/add.test.js:11: The `b` validation branch in src/add.js (line 3) has no test, and the `a` test's message regex `/\ba\b/` is loose.
  status: committed 9469b44a4943
  committed: 9469b44a4943

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

## Run status

- Date: 2026-11-09
- Run branch: uw/run/calc
- Cards: 5 committed
- Harvest: uw/harvest/calc
- Report: .ultimate-workflow/run/calc/report.md
