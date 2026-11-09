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
- Safe integers only. An integer argument outside `Number.MIN_SAFE_INTEGER`..`Number.MAX_SAFE_INTEGER`, or a result outside that range, throws `RangeError` with a message naming the argument (or `result`). Nothing is silently rounded.
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
