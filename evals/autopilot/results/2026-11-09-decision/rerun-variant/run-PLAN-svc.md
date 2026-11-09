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
  status: committed 340f785adf5e
  committed: 340f785adf5e
- greet: a greeting
  paths: src/greet.js, test/greet.test.js
  status: committed 16e1b12eac33
  committed: 16e1b12eac33
- banner: a start-up line using the listening number
  paths: src/banner.js, test/banner.test.js
  depends: server
  status: committed 0f427b957fec
  committed: 0f427b957fec
- fixup: confirmed review findings
  paths: test/banner.test.js
  carried: test-coverage at C:/Users/kobiv/Projects/uw-scn-rerun/test/banner.test.js:5: The only banner test checks the default-case string 'listening on 8080' and never checks that banner() takes its number from listenOn(), which is the dependency the card title ('a start-up line using the listening number') and the 'depends: server' line name.
  status: committed 57b9c7cad035
  committed: 57b9c7cad035

## Tests

### server: the listening number

- `listenOn()` is `8080` when nothing is configured.
- `listenOn(3000)` is `3000`: a caller can pass the number.

### greet: a greeting

- `greet('Ada')` is `'Hello, Ada'`.

### banner: a start-up line using the listening number

- `banner()` is `'listening on 8080'` when nothing is configured.

## Run status

- Date: 2026-11-09
- Run branch: uw/run/svc
- Cards: 4 committed
- Harvest: uw/harvest/svc
- Report: .ultimate-workflow/run/svc/report.md
