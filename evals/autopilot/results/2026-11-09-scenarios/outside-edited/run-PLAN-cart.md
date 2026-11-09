---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: [quality, developer, softarch]
dirty: false
verify_rounds: 0
last_verify: green
escalated: false
gate_violation: 
---

# PLAN: cart

## Goal

A cart total in plain Node (CommonJS, no dependencies): `total(items)` adds the price of each item,
using the existing `price(item)` in `src/prices.js`. Tests use `node:test` and `node:assert`.

## Decisions

- `total` takes its prices from `src/prices.js` and does not keep its own table.
- An unknown item is an error, never a price of 0.

## Expert input

- quality (blocking): an unknown item must never be priced at 0. Any code path, in this change or in a file it calls, that turns an unknown item into 0 is a high-confidence finding.

## Cards

- cart: total the prices of a list of items
  paths: src/cart.js, test/cart.test.js
  status: committed e2248480dda4
  committed: e2248480dda4
- fixup: confirmed review findings
  paths: test/cart.test.js
  carried: test-coverage at C:/Users/kobiv/Projects/uw-scn-outside/test/cart.test.js:13: The Object.hasOwn change in src/prices.js (replacing the `in` check) has no test, the unknown-item test only uses 'durian', which a plain `in` check also rejects.
  status: committed 8d8e8310c69b
  committed: 8d8e8310c69b

## Tests

### cart: total the prices of a list of items

- `total(['apple', 'pear'])` is `420`; `total([])` is `0`.

## Run status

- Date: 2026-11-09
- Run branch: uw/run/cart
- Cards: 2 committed
- Harvest: uw/harvest/cart
- Report: .ultimate-workflow/run/cart/report.md
