# Quality engineer input to a plan

**Outcome of this stage:** the plan says how each success criterion will be checked and what blocks a merge, so the build is held to it and the review has something to hold the tests to.

## Questions

Read the draft, then search the repository's tests and CI files. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **The oracle.** Each success criterion is an observable outcome with a named way to check it: an exact value, a schema, a state change, or a rubric. A criterion that can only be judged by reading prose is a risk.
- **The level.** Each behaviour is checked at the lowest level that can show it. Anything above a unit test names the boundary it crosses. The plan says what runs against a real AWS service, what against an emulator and what against a fake, and what the emulator cannot show, such as permission evaluation, eventual consistency, throttling and quotas.
- **Contracts.** Every boundary with an independent consumer or provider has one machine-readable contract the plan names. The provider's real response is checked against it, including the error, empty and optional-field paths, not only compile-time types. The plan says who regenerates fixtures when it changes.
- **Non-deterministic behaviour.** For anything an LLM or agent decides, the plan states how it is judged. Deterministic checks come first: tool calls and their arguments, state changes, refusals. Then the repeat count and the pass rule: at least one pass in several tries for a capability, every try for something release-critical. The deterministic parts, such as routing, prompt assembly and parsing, are tested without a model.
- **Evals.** An eval set is sized and sourced: built from real traces or from enumerated dimensions, large enough for the claim, with a held-out part never used to tune a prompt. The model under test and the judging model are both pinned to a version. A judge is calibrated against labelled cases, reported as agreement on positives and negatives separately, and is not the model under test; an uncalibrated judge is advisory. Results are reported per dimension, with a floor for each, and with cost and latency beside the pass rate.
- **The gate.** The plan names which suites block a merge, what a skipped or missing test does to the build (it must not pass), and the policy for flaky tests: a quarantine has an owner and an expiry, and a blanket retry is not a fix.
- **Test data.** Fixtures and factories are committed, hold no production or personal data, and are checked against the current contract. Time and randomness are injected.
- **Bug fixes.** A fix commits to a test that fails first, for the real failure, not an easier similar input.

## When the plan makes a one-way choice

For a choice that is costly to reverse, such as the judge model, an eval set others will compare against, or a contract artifact several services will test against, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "The `orders` contract test validates the provider's serialised response against `openapi.yaml`, including the 404 body." It names the artifact, the side and the path, and someone else can check it in the diff.
- Rejected: "Increase test coverage." It is not checkable, and coverage does not show that a test can fail.

## In this domain

- **constraints** name the contract, suite, rule or count they bind.
- **questions** are the user's decisions: which model may act as judge, which suites may block a merge, whether a quarantined test may ship.
- Do not ask for coverage numbers, a new test framework, or end-to-end tests where a lower level shows the behaviour.
