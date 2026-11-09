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
confirmed_hash: 179541302aff395c
---

# PLAN: svc

## Goal

A tiny service helper in plain Node (CommonJS, no dependencies). Tests use `node:test` and `node:assert`.

## Decisions

- Each module exports one function as `module.exports`.

## Cards

- server: the listening number
  paths: src/server.js, test/server.test.js
- greet: a greeting
  paths: src/greet.js, test/greet.test.js
- banner: a start-up line using the listening number
  paths: src/banner.js, test/banner.test.js
  depends: server

## Tests

### server: the listening number

- `listenOn()` is `8080` when nothing is configured.
- `listenOn(3000)` is `3000`: a caller can pass the number.

### greet: a greeting

- `greet('Ada')` is `'Hello, Ada'`.

### banner: a start-up line using the listening number

- `banner()` is `'listening on 8080'` when nothing is configured.
