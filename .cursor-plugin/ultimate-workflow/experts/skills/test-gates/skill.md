---
name: test-gates
description: Use when a change touches test-runner configuration, test scripts or the CI steps that run tests - discovery patterns, zero-tests behaviour, .only and skips, retries and flaky handling, and GitHub Actions settings that let a failing test step pass.
verified: 2026-10-20
requires: pytest, Jest, Vitest, Mocha, Playwright, node:test, go test; GitHub Actions
---

# Test gates: a run that cannot fail

## Goal

- **Lets the expert catch:** a test run or CI job that stays green when tests fail or never run: zero tests collected, a file the runner never finds, an exclusive `.only` committed, retries that turn a failure into "flaky", a step or job allowed to fail, a pipe that hides the exit code.
- **Applies to:** `pytest.ini`, `pyproject.toml` `[tool.pytest.ini_options]`, `conftest.py`, `jest.config.*`, `vitest.config.*`, `.mocharc.*`, `playwright.config.*`, `package.json` test scripts, and test steps in `.github/workflows/*`.
- **Not for:** what a single test asserts (`test-craft`); deploy jobs, promotion and concurrency (devops); workflow triggers, permissions and secrets (security).

Sources: **[R]** the maintainer's live check of the runner and GitHub documentation (docs.pytest.org, jestjs.io, vitest.dev, mochajs.org, playwright.dev, nodejs.org, pkg.go.dev, the pytest-rerunfailures repository, docs.github.com; 2026-10-20); **[O]** our own reasoning. An [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The runner and its version,** from the lock file: Mocha 12 changes `--forbid-only` in CI, Playwright 1.52 adds `failOnFlakyTests`, Mocha 10.7 adds `--pass-on-failing-test-suite`.
- **The exact command CI runs,** and the job that is required to merge. A local script that differs from CI is not the gate.
- **Whether `CI` is set** in that job; several defaults below depend on it.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Discovery: tests that never run

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| pytest collects `test_*.py` and `*_test.py`, `test` functions, and `Test` classes with no `__init__` [R] | A new test file or class outside those names, or a `Test` class that defines `__init__` | `unittest.TestCase` subclasses, found regardless of name [R] |
| Jest's default `testMatch` is `**/__tests__/**/*.[jt]s?(x)` and `**/?(*.)+(spec\|test).[jt]s?(x)` [R] | A narrowed `testMatch` or `testRegex` that excludes the new files, or a helper inside `__tests__` that runs as a test | |
| `node --test` with no path runs `**/*.test.*`, `**/*-test.*`, `**/*_test.*`, `**/test-*.*` for `.js`, `.cjs`, `.mjs` [R] | `.ts` tests run by `node --test` with no explicit glob, or a test file outside those names | Explicit paths or globs on the command line |
| `go test` ignores files whose names begin with `_` or `.`, and a package with no `_test.go` prints `[no test files]` and exits 0 [R] | A file named `_test.go` or `_foo_test.go` | Fixtures under `testdata/` |

## Zero tests, `.only` and skips

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| pytest exits 5 when nothing is collected; Jest fails unless `--passWithNoTests`; Vitest `passWithNoTests` defaults to false; Mocha fails on zero only with `--fail-zero` [R] | `--passWithNoTests`, `passWithNoTests: true`, a wrapper that treats exit 5 as success, or a Mocha command without `--fail-zero` on the required job | A sharded or filtered run where an empty shard is expected |
| Playwright `forbidOnly` fails on `test.only` (the docs set it from `CI`); Vitest `allowOnly` defaults to `!process.env.CI`; Mocha `--forbid-only` fails on `.only` and defaults to on in CI from Mocha 12 [R] | `.only` committed, `forbidOnly` removed, `allowOnly: true`, `--allowOnly`, or `--no-forbid-only` in CI | |
| In `node:test`, `only` takes effect with `--test-only` or isolation off, and then skips the rest of the suite [R] | `--test-only` or `--test-isolation=none` in a CI script | |
| pytest `xfail` that passes (XPASS) does not fail the run unless strict (`strict=True`, or the strict-xfail ini option) [R] | A new `@pytest.mark.xfail` with no `strict=True` and no strict option | |
| Mocha `--forbid-pending` fails on skipped tests [R] | `--forbid-pending` removed, or new `it.skip` where the repository uses it | |

## Retries and exit codes

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Playwright marks a test that passes on retry "flaky" and exits 0 unless `failOnFlakyTests` (1.52+) [R] | `retries` raised with no `failOnFlakyTests` where the repository forbids silent flakes | End-to-end suites whose flake rate is tracked elsewhere |
| `jest.retryTimes()` (jest-circus only) and pytest-rerunfailures `--reruns` make a test that passes once green; a marker's `reruns` overrides `--reruns` unless `--reruns-mode=append` [R] | Retries added to unit tests, or a high per-test `reruns` above the suite's cap | A documented stopgap with an owner and an expiry |
| Mocha `--pass-on-failing-test-suite` (10.7+) exits 0 despite failures [R] | That flag or `passOnFailingTestSuite: true` | |

## GitHub Actions

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A `run` step with no `shell` on Linux and macOS is `bash -e {0}`, with no `pipefail`; `shell: bash` adds `-o pipefail` [R] | `pytest \| tee log.txt` (or any pipe from the test command) with no `shell: bash` or `set -o pipefail` | The pipe's last command checks the status itself |
| `continue-on-error: true` on a step lets the job pass; on a job, the workflow [R] | It added to a test step or a required test job | An informational nightly or canary job no merge depends on |
| A failing `continue-on-error` step has `outcome: failure` and `conclusion: success`, so `if: steps.x.conclusion == 'failure'` never fires [R] | A later step gated on `.conclusion` of a `continue-on-error` step | |

## Not a finding

- A retry in CI documented as a stopgap with an owner and an expiry.
- `--passWithNoTests` on a pre-commit `--findRelatedTests` run that is not the merge gate.
- `.only` or `--test-only` used locally and never committed.
- A skipped test with a reason and a tracked owner, where the repository allows that.
