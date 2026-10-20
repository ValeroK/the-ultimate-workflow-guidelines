# Quality engineer expert: sources, borders and skills

The quality engineer owns whether a change's tests, evals and gates can fail when the code is wrong: the oracle of each test, its doubles and determinism, how LLM and agent behaviour is judged, that contracts are checked on both sides in tests, and that CI test jobs and runner settings can go red. It joins at plan, tests (always, whether or not the plan selected it) and review, and gives the implementer a test brief at build.

## Boundaries

The full rubric is the agent file's Responsibilities table. The borders that were argued:

| Concern | Owner |
|---|---|
| Whether a test, eval or gate can fail; fixtures; contract tests; emulator limits | quality |
| What a contract says and whether a change to it is compatible; generated code against the schema | softarch |
| How production code handles an error | developer (quality asks for the test that fails if it is swallowed) |
| Deploy jobs, promotion, a path filter that lets a change reach a deploy without the tests | devops |
| Workflow triggers, permissions, real credentials in fixtures | security |
| "A test that cannot fail" in a diff | quality (moved from the developer on 2026-10-20) |

## Sources

The upstream sources compared, with what was taken from each, are in `.cursor-plugin/ultimate-workflow/experts/quality/NOTICE.md` and each skill's `NOTICE.md`. The extraction audit of every source is `docs/experts/ledgers/quality.md`. Optional steps taken: the sweep and the compare (playbook steps 2 and 4).

## What the expert holds

- **Plan:** the oracle for each criterion, the lowest level that shows each behaviour and what an emulator cannot show, contracts checked on both sides, how non-deterministic behaviour is judged, eval sets and judges, the merge gate and flaky policy, test data, a failing-first test for a bug fix.
- **Tests:** families of cases (agent and tool failures, repeat runs, judge order, contracts, response shape, failure cleanup, edge values by type, concurrency, properties, characterisation, AWS integration, resilience) and one worked case.
- **Build brief:** find how the repository tests, name the break each test catches, see it fail on its assertion, and report what green does not prove.
- **Review:** eleven categories, each with a "Not when"; severity by whether a gate passes whatever the code does.

## Skills

| Skill | What it holds | Review selector | Other stages |
|---|---|---|---|
| `test-craft` | A test that can fail, expected values, doubles, determinism, property tests, fixtures and emulator limits | test files and test directories | always at tests and build |
| `test-gates` | Discovery patterns, zero tests, `.only` and skips, retries and flaky handling, `continue-on-error`, `pipefail` | runner configs, `conftest.py`, workflow files; zero-test, `.only`, retry settings in added lines | offered at plan |
| `eval-integrity` | Judge order and calibration, pass@k and pass^k, held-out data, tool-call sequences | judge, pass@k, eval-set or rubric wording | offered at plan; tests by plan wording |

Facts are tagged **[R]** (the maintainer's live check, 2026-10-20: `docs/research/quality-2026-10-20.md`), **[T]** (an upstream skill, unchecked) or **[O]** (ours). The round-2 check changed one rule: no primary source says a judge must come from a different model family, so the references require calibration instead of claiming the bias.

## Routed to other experts

- Secrets in fixtures and logs: security.
- The compatibility of a changed contract: softarch.
- Pipeline mechanics and deploy-time checks' wiring: devops.

## Not measured

The dev-split review was measured before the restructure and showed no gain (the plain reviewer clears that corpus). Nothing has been measured since: the restructure, `test-gates` and `eval-integrity` need cases the plain reviewer misses (playbook step 10).
