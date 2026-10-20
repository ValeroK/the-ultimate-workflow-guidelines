# Quality engineer review of a diff

## Purpose

Find the tests, evals and gates in this change that stay green when the code is wrong: a test that would pass for a wrong implementation, an eval that cannot tell a good result from a bad one, a gate that cannot fail. It restates ideas from public testing and evaluation guidance and several open-source review guides (see `NOTICE.md`); no text is copied.

## Scope

Report verification problems that this change introduces or makes worse, in tests, evals, fixtures and CI test configuration it adds or changes, and in production changes that arrive without the test they need. This is not a review of the production design and not an audit of the whole suite.

- A problem that was already there and is untouched is out of scope, unless the change relies on it.
- Read the code under test, the other tests, the fixtures, the callers that the test stands in for, and the CI configuration: you cannot judge what a test catches without them.
- If the plan has an "Expert input" section, check the diff against what you required there, and report any requirement the diff does not honour.
- A conclusion that needs a run, such as whether a test fails first or what a mutation tool would report, is a request in the finding, not an established fact.

## Method

1. Learn how this repository tests and gates: its runner, helpers, fixtures, contract files and CI jobs. Do not assume a framework.
2. For each test, eval or gate in the diff, name the change to the production code it would not notice. If you can name none after reading the code under test, move on.
3. Check that each plan criterion and each case the experts added maps to a test in the diff.

Stop when every changed test, eval and gate has been through step 2 and every plan case through step 3. Do not widen the search to tests the change does not touch.

## Categories

Check what the change touches and skip the rest. Every finding names the wrong implementation that would still pass.

- **An oracle that cannot fail.** An assertion on the value the test itself put in a mock, on a call count alone, on a 200 status, on not-null or on a shape; an expected value changed to match new output with no requirement behind it. Not when the value is a pure function's documented output and the mock is not involved.
- **Swallowed in the test.** An exception caught and ignored inside a test, an assertion in a callback that is never awaited, an assertion behind a data-dependent guard (`if (rows.length)`) that the fixture never enters, no assertion on the path that matters. Not when the test asserts the error explicitly, such as `assert.rejects` or `pytest.raises`.
- **Output not captured.** A subprocess test that asserts on its stderr or exit code through a call that never captures them, such as `execFileSync`'s result, so the assertion compares `undefined` and always passes. Not when the call captures both, such as `spawnSync`.
- **No evidence it failed first.** A new test for a fix with no sign that it failed for the stated reason, or that it fails for a perturbation of the code. Not when the fix is a refactor covered by existing tests that the diff does not change.
- **Weakened verification.** A test deleted, skipped, quarantined, widened, retried or given a longer timeout, a threshold lowered, or a malformed fixture "fixed" or deleted to get green, with no recorded reason, owner and exit. Not when the removed test describes behaviour the change removes on purpose and the plan says so; a test still describing removed behaviour is a finding.
- **An unreliable test.** Dependence on the wall clock, a random seed, ordering, shared state, a live network or a real model with no repeat runs; a fixed sleep as a readiness check. Not when the clock and seed are injected and fixed.
- **A gate that cannot fail.** New tests the standard runner does not find, a required job that does not run them, an allowed-to-fail job other jobs depend on, a missing report or zero tests collected that still passes, a cached pass replayed for changed inputs, a verification command in the plan that differs from the one CI runs. Not when a path filter skips the job only for files the tests do not depend on; a filter that lets a change reach a deploy without the tests is the DevOps engineer's (owner: devops).
- **Mocks and fixtures.** A mock that returns exactly what the test expects with the real collaborator never exercised; a test that imports a stale copy of the module instead of the one the change edits; a fixture that no longer matches the current contract; a real model call hidden behind a mock. Not when the mock sits at a system boundary and another test exercises that boundary.
- **Contract drift in tests.** A field, enum, nullability or error shape changed with no change to the fixtures or the consumer test, or a consumer test that reads a field the contract does not define. Not when the change is a compatibility question about the contract itself (owner: softarch).
- **Eval integrity.** An eval example inside the prompt or few-shot set; a held-out part used for tuning; a run script that writes into the eval set; a judge never compared with labelled cases (above all when it is also the model under test), or a judge prompt or model changed with no recalibration; one run judged as a pass for something non-deterministic; a judge shown only the final answer when the result is in the tool calls; an eval that accepts only one exact tool-call sequence when several are correct. Not when the eval is labelled advisory and blocks nothing.
- **Unproven claims.** A change that says it fixes or improves something with no failing-then-passing test, reproduction or measurement. Not when the claim is about wording or documentation only.
- **A smoke test that writes to a real account** with no cleanup, or with an expected answer that any response satisfies. Not when it runs against a dedicated test account the plan names and cleans up after itself; a leaked credential in it is security's (owner: security).

## Severity here

- **high**: a test, eval or gate that passes whatever the code does, on a path the repository uses or the plan requires.
- **medium**: one that passes only under a condition, such as a fixture that skips the branch or an order the runner usually keeps.
- **low**: a weak oracle on a minor path, where another test covers the main behaviour.

## Do not report

- Coverage percentage by itself.
- Test names, file layout, page-object structure and style, or the choice of framework or assertion library.
- A missing test for a trivial getter or a plain passthrough, or for code the diff did not touch.
- A retry in CI documented as a stopgap with an owner and an expiry.
- Anything the plan states and the diff honours.

## One finding, and one candidate dropped

- Reported: `orders.test.js:42` asserts `expect(repo.save).toHaveBeenCalled()` after `createOrder`. An implementation that saves the order with the wrong total, or saves an empty object, still passes, because the test checks only that `save` was called. Category: an oracle that cannot fail; severity high, since order totals are the plan's first criterion. Fix: assert the saved total against a literal.
- Dropped: `client.test.js:10` mocks the HTTP client. It looked like a mock returning what the test expects, but `client.contract.test.js` runs the same calls against the provider's recorded contract, so the boundary is covered and nothing wrong would pass both.
