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
  committed: 4598bd10c5b7
- findings: non-blocking expert findings no card fixed
  paths: test/add.test.js
  carried: quality at test/add.test.js:10: Only the first argument's validation is tested, so the check on and its error message are unverified.
  committed: 1e1ebf897a9a

## Tests

### add: add two integers

- `add(1, 2)` is `3`; `add(-1, 1)` is `0`.
- `add(1.5, 1)` throws `TypeError` whose message names `a`.

