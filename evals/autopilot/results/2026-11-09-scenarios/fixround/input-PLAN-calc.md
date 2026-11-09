---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: [quality]
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
- sub: subtract two integers
  paths: src/sub.js, test/sub.test.js
- parse: evaluate "a+b" and "a-b" with add and sub
  paths: src/parse.js, test/parse.test.js
  depends: add, sub
- format: format a result as "= n"
  paths: src/format.js, test/format.test.js
  depends: parse

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
