---
name: test-craft
description: Use when a test is written, specified or reviewed, in any language - what makes it able to fail, its expected value, its doubles, its determinism, generated inputs and fixtures.
verified: 2026-10-20
---

# Test craft

## Goal

- **Lets the expert catch:** a test that passes whatever the code does: an oracle copied from the implementation or from a double, a double that hides the side effect, nondeterminism that turns red and green into chance, a property test that tests nothing, a fixture that only works by accident.
- **Applies to:** every test written at build, every case specified at tests, and every test file changed at review.
- **Not for:** whether a gate or CI job can fail (`test-gates`); LLM judges and eval sets (`eval-integrity`); which cases exist (the confirmed test plan); framework style and layout (not a finding).

Sources: **[R]** the maintainer's live check of the tool documentation (docs.pytest.org, hypothesis.readthedocs.io, fast-check.dev, MDN, RFC 2606, docs.localstack.cloud, the AWS DynamoDB guide; 2026-10-20); **[T]** an upstream community skill, not checked (see `NOTICE.md`); **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **How the repository tests:** its runner, helpers, fixture factories and property-testing library, if any. Follow them.
- **The change the test is for,** so you can name the wrong implementation it must reject.
- **What runs against a fake or an emulator,** and what that emulator cannot show (below).
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## A test that can fail

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Name the break first: the change to the production code that would turn the test red [T] | A test whose only reachable failure is a crash | |
| It must have failed on its own assertion, not an import error or a missing fixture; a first-run pass means it tests existing behaviour or nothing [T] | A new test reported green with no red run | A characterisation test of old behaviour, by design |
| A bug-fix test fails on the broken code for the bug itself, passes after the fix [T] | A fix whose test uses an easier input than the reported one | |
| Break the code once (a boundary, a rounding, a sign) and some test must go red [T] | | |
| A check that finds no input must fail, not pass: an assertion behind `if rows:` the fixture never enters, or a loop over an empty list [T] | `if (items.length) expect(...)`, `for x in []: assert ...` | |
| `pytest.raises(Exception)` matches every subclass, so it passes on almost any error [R] | `with pytest.raises(Exception):` or `BaseException` with no `match=` | A worker loop whose contract is to catch and wrap any exception |

## The expected value

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Do not compute the expected value the way the code does [T] | `expect(add(a, b)).toBe(a + b)`, or an expected value built with the helper under test | |
| Assert the outcome, not the absence of a crash: "does not throw", "not null", "200", "three keys" pass for most wrong answers [T] | The only assertion is one of those | The absence of an error is the contract |
| Never assert what you told a double to return [T] | The stub returns 42 and the test checks 42 | |
| Look through the front door: the result where a caller sees it [T] | Reading private fields, or the database behind the API under test | |
| Interaction is the outcome only at a boundary: "charged exactly once", "email not sent twice", "audit written before the reply" [T] | Call counts or call order asserted on the repository's own collaborators | The call is to a boundary (payment, mail, queue) |
| Exact output is right when exact output is the contract (a wire or file format, a generated prompt), and the golden file is reviewed like code [T] | A snapshot of a whole component updated in the same diff with no requirement | |

## Doubles

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Prefer the real thing, then a fake, a stub, a mock, and replace only the edge (network, clock, randomness, third parties); never the unit under test [T] | A mock of the repository's own module the test is meant to exercise | The real thing has an effect that cannot be allowed (money, mail) |
| Know what you replace: a stub that drops a side effect the code relies on (a write, a cache, a retry) lets a broken caller pass [T] | A stubbed dependency whose real version writes or raises | |
| A double has the real shape: every field, the real types [T] | A hand-built stub response missing fields the real one has | |
| Nothing in production exists only for tests [T] | `resetForTesting`, a test flag, an export only a test imports | |
| Needing to mock most collaborators is a design signal to report, not to paper over [T] | A test with more mocks than assertions | |

## Determinism

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Control the clock; never assert one current-date read against another [O] | `new Date()` or `datetime.now()` in both the code path and the expected value | The clock is injected |
| Seed every generator, fake-data libraries included, and print the seed on failure [O] | An unseeded `faker`, `Math.random` or `random` in a test | |
| Wait on a condition, never a duration [O] | `sleep(2)` before an assertion | |
| Each test builds its own world; passes alone and fails in the suite means shared state [T] | Module-level state mutated by tests, or tests that rely on order | |
| No live network in a unit test [O] | A real URL in a unit test | An integration test labelled as needing the network |
| Order that is not promised is not asserted [O] | A list compared exactly from a set, a map, a concurrent job or a query without `ORDER BY` | |

## Generated inputs and property tests

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A property that restates the implementation proves nothing [T] | The property computes the expected value with the same algorithm | |
| Too many rejected inputs means the property barely runs: Hypothesis raises `HealthCheck.filter_too_much`, fast-check fails after too many `fc.pre()` skips [R] | `suppress_health_check=[HealthCheck.filter_too_much]`, a raised `maxSkipsPerRun`, or `assume()` over a wide input space | A rare boundary filter with acceptable speed |
| A function-scoped pytest fixture under `@given` resets once per test, not per input; Hypothesis raises `HealthCheck.function_scoped_fixture` [R] | That health check suppressed on a test that mutates the fixture | A stateless, read-only fixture |
| fast-check `configureGlobal()` replaces every global setting unless the previous ones are spread in [R] | `fc.configureGlobal({...})` without `...fc.readConfigureGlobal()` in a test file | The single setup file that sets them first |

## Fixtures and edge values

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Use reserved names: `.test`, `.example`, `.invalid`, `.localhost` and `example.com/.net/.org` (RFC 2606) [R] | A fixture email or webhook at a real-looking domain | Parsing tests for real public suffixes, with no network |
| JavaScript `length`, `charAt` and `slice` count UTF-16 code units, so `"😄".length === 2` [R] | Truncation or length tests with no character outside the Basic Multilingual Plane | A protocol defined in UTF-16 code units |
| LocalStack enforces IAM only with `ENFORCE_IAM=1`, a paid feature [R] | A test claiming to verify IAM permissions against LocalStack without it | Tests that use LocalStack only as storage |
| DynamoDB local ignores provisioned throughput and never throttles, and most reads look strongly consistent [R] | A throttling or eventual-consistency test run against DynamoDB local | Item and key-condition tests |
| Do not test the framework, repeat a shared helper's tests in every caller, or grep source text unless that text is the contract [T] | | |

## Not a finding

- Several assertions in one test that describe one behaviour.
- Test names, file layout, arrange-act-assert form, or the choice of assertion library.
- Repetition between tests that keeps each one readable on its own.
- A test fixture with hard-coded values.
- A call-count assertion on a boundary (payment, mail, queue).
