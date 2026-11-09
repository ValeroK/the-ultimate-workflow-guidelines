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
confirmed_hash: 11d09e640b044808
---

# PLAN: svc

## Goal

A tiny service helper in plain Node (CommonJS, no dependencies). Tests use `node:test` and `node:assert`.

## Decisions

- Each module exports one function as `module.exports`.

## Cards

- server: the listening number
  paths: src/server.js, test/server.test.js
  status: parked uw/parked/svc/server; not green: Verification failed 3 times. Stopping. What is wrong: The failure is in the plan, not the code or the test. PLAN-svc.md section "Tests > server: the listening number" says that when the deployment configures a different number "t
  decision: needs a decision the plan does not state: - env: reads the environment variable PORT in src/server.js - declared: Used the PORT environment variable as the name for the configured number. The plan only says 'through the environment', and th
  parked: uw/parked/svc/server; not green: Verification failed 3 times. Stopping. What is wrong: The failure is in the plan, not the code or the test. PLAN-svc.md section "Tests > server: the listening number" says that when the deployment configures a different number "t
- greet: a greeting
  paths: src/greet.js, test/greet.test.js
  status: committed 11c47e1208b2
  committed: 11c47e1208b2
- banner: a start-up line using the listening number
  paths: src/banner.js, test/banner.test.js
  depends: server
  status: blocked by server
- fixup: confirmed review findings
  paths: test/greet.test.js
  carried: test-coverage at C:/Users/kobiv/Projects/uw-scn-decision/test/greet.test.js:5: The only assertion uses a single input, so an implementation that ignores the argument and returns the literal 'Hello, Ada' would pass.
  status: committed bd33c45147ad
  committed: bd33c45147ad

## Tests

### server: the listening number

- `listenOn()` is `8080` when nothing is configured.
- When the deployment configures a different number for it through the environment, `listenOn()` returns that number.

### greet: a greeting

- `greet('Ada')` is `'Hello, Ada'`.

### banner: a start-up line using the listening number

- `banner()` is `'listening on 8080'` when nothing is configured.

## Run status

- Date: 2026-11-09
- Run branch: uw/run/svc
- Cards: 1 parked, 2 committed, 1 blocked
- Harvest: uw/harvest/svc
- Report: .ultimate-workflow/run/svc/report.md
