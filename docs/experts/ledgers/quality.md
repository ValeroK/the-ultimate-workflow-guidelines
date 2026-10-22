# Extraction ledger: quality

Audited 2026-10-20. Sources: 29 read, 0 unreachable, 0 with no file to audit.

Items: 338 (taken 167, routed 39, rejected 89, missing 43). Today's rows: keep 68, cut 16, merge 23. A `taken` item that fails the value test (for example test names) is one whose row is marked `cut` or `merge` in section 3.

Scope: the quality expert (`agents/uw-expert-quality.md`, `experts/quality/references/plan.md`, `tests.md`, `build.md`, `review.md`, `experts/quality/NOTICE.md`, `references/CHANGES.md`, `experts/quality/skills.md`) and its one skill, `test-craft` (`experts/skills/test-craft/skill.md` and `NOTICE.md`). There is no `docs/experts/quality.md` yet. Paths below are relative to `.cursor-plugin/ultimate-workflow/` unless they start with `docs/`.

## 1. Sources

The quality NOTICE names sources by repository and skill name only, with no path, commit or date. The paths below were recovered from an earlier survey run (session-local, not kept) and fetched at `HEAD` on 2026-10-20, so a file may have changed since the NOTICE was written. The test-craft sources were read from the saved copies in the scratchpad folder `upstream-test`. Every repository's LICENSE was read; the licences match both NOTICE files (Trail of Bits is CC BY-SA 4.0, anthropics Apache-2.0, the rest MIT).

| Source (repo, path) | Cited by | Read from (saved copy or fetched) | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| addyosmani/agent-skills `agents/test-engineer.md` | test-craft, quality | saved | 12 | 9 | 0 | 3 | 0 |
| addyosmani/agent-skills `skills/test-driven-development/SKILL.md` | test-craft, quality | saved | 24 | 16 | 2 | 6 | 0 |
| obra/superpowers `skills/test-driven-development/SKILL.md` | test-craft | saved | 17 | 10 | 1 | 5 | 1 |
| Jeffallan/claude-skills `skills/test-master/references/tdd-iron-laws.md` | test-craft | saved | 5 | 2 | 0 | 3 | 0 |
| Jeffallan/claude-skills `skills/test-master/references/testing-anti-patterns.md` | test-craft | saved | 6 | 5 | 0 | 1 | 0 |
| mattpocock/skills `skills/engineering/tdd/SKILL.md` | test-craft | saved | 7 | 4 | 1 | 2 | 0 |
| anthropics/claude-plugins-official `plugins/code-modernization/agents/test-engineer.md` | test-craft | saved | 11 | 5 | 1 | 3 | 2 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/pr-test-analyzer.md` | test-craft, quality | saved | 10 | 6 | 0 | 4 | 0 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/silent-failure-hunter.md` | quality ("swallowed failures in changed code") | fetched | 8 | 1 | 6 | 1 | 0 |
| garrytan/gstack `test-audit/SKILL.md` (from line 350) | test-craft | saved | 20 | 12 | 1 | 6 | 1 |
| github/awesome-copilot `agents/tdd-red.agent.md` | test-craft | saved | 9 | 4 | 0 | 5 | 0 |
| github/awesome-copilot `agents/tdd-green.agent.md` | test-craft | saved | 6 | 1 | 1 | 4 | 0 |
| github/awesome-copilot `skills/test-gap-audit/SKILL.md` | test-craft | saved | 19 | 10 | 4 | 2 | 3 |
| affaan-m/ECC `agents/tdd-guide.md` | test-craft | saved | 8 | 6 | 0 | 2 | 0 |
| affaan-m/ECC `agents/pr-test-analyzer.md` | test-craft | saved | 4 | 3 | 0 | 1 | 0 |
| affaan-m/ECC `.agents/skills/tdd-workflow/SKILL.md` | test-craft | saved | 12 | 3 | 3 | 6 | 0 |
| affaan-m/ECC `skills/eval-harness/SKILL.md` | quality | fetched | 14 | 7 | 1 | 3 | 3 |
| affaan-m/ECC `skills/contract-first/SKILL.md` | quality | fetched (identical to saved copy in `upstream-softarch`) | 16 | 7 | 6 | 1 | 2 |
| affaan-m/ECC `skills/test-collaboration/SKILL.md` | quality | fetched | 15 | 10 | 0 | 2 | 3 |
| affaan-m/ECC `skills/ai-regression-testing/SKILL.md` | quality | fetched | 11 | 5 | 1 | 5 | 0 |
| muratcankoylan/Agent-Skills-for-Context-Engineering `skills/evaluation/SKILL.md` | quality | fetched | 17 | 5 | 2 | 4 | 6 |
| muratcankoylan/Agent-Skills-for-Context-Engineering `skills/advanced-evaluation/SKILL.md` | quality | fetched | 14 | 5 | 0 | 5 | 4 |
| wshobson/agents `plugins/llm-finetuning/skills/eval-harness-first/SKILL.md` | quality | fetched | 13 | 6 | 1 | 2 | 4 |
| morluto/rea `.agents/skills/rea-ci-tests-audit/SKILL.md` | quality | fetched | 17 | 8 | 1 | 2 | 6 |
| emilkowalski/skills `skills/break-ui/CATALOG.md` | quality | fetched | 15 | 4 | 5 | 0 | 6 |
| trailofbits/skills `plugins/mutation-testing/skills/mutation-testing/SKILL.md` | test-craft, quality | saved | 6 | 2 | 0 | 4 | 0 |
| trailofbits/skills `plugins/property-based-testing/skills/property-based-testing/SKILL.md` | test-craft, quality | saved | 8 | 5 | 1 | 0 | 2 |
| wshobson/agents `plugins/backend-development/agents/test-automator.md` | test-craft | saved | 5 | 2 | 0 | 3 | 0 |
| wshobson/agents `plugins/javascript-typescript/skills/javascript-testing-patterns/SKILL.md` | test-craft | saved | 9 | 4 | 1 | 4 | 0 |

**Read beyond the NOTICE files** (not counted in N, and nothing below rests on them alone): Jeffallan `skills/test-master/references/unit-testing.md` (saved, uncited); awesome-copilot `skills/eval-driven-dev/SKILL.md` and ECC `skills/agent-eval/SKILL.md` (fetched to support the missing-skill proposals in section 7; neither NOTICE cites them). The brief allowed fetching only NOTICE-cited files: these two fetches went past it. `silent-failure-hunter` is within the quality NOTICE's pr-review-toolkit row ("swallowed failures in changed code"). obra's skill points to a `writing-good-tests.md` that was not saved or fetched; its four headline rules are quoted in the skill itself and audited from there.

## 2. Items, per source

Value test numbers: 1 non-obvious, 2 checkable, 3 sourced, 4 not covered elsewhere. `n/a` for routed. "core critic" means `agents/uw-critic.md` (coverage, edge-cases, oracle-quality, runnability angles at the tests stage).

### addyosmani/agent-skills `agents/test-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Read existing tests for conventions before writing | taken | `build.md` "Before you write a test"; `review.md` Method 1 | pass |
| Test at the lowest level that shows the behaviour | taken | test-craft 5.6; `plan.md` "The level"; `tests.md` Rules | pass |
| Prove-it for bugs: the test fails on current code first | taken | test-craft 1.4; `plan.md` "Bug fixes" | pass |
| Names read like a specification | taken | test-craft 5.2 | fails 1 |
| Scenario table: happy, empty, boundary, error, concurrency | rejected | generic; the core critic's edge-cases angle | fails 4 |
| Coverage report format with priority tiers | rejected | output format; protocol sets the result shape | fails 2 |
| Test behaviour, not implementation | taken | test-craft 2.6 | pass |
| One concept per test | taken | test-craft 5.1 | fails 1 |
| No shared mutable state between tests | taken | test-craft 4.4 | pass |
| Snapshots only when every change is reviewed | taken | test-craft 2.8 | pass |
| Mock at system boundaries, not between internal functions | taken | test-craft 3.2 | pass |
| Composition rules (which command invokes the persona) | rejected | harness, not a check | fails 2 |

### addyosmani/agent-skills `skills/test-driven-development/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Discover the repo's runner and commands; never assume `npm test` | taken | `build.md` "Before you write a test" | pass |
| The commands CI runs are the ones that gate merges | taken | `review.md` "A gate that cannot fail" (plan command differs from CI) | pass |
| Prefer checked-in wrappers (`./gradlew`) over global tools | rejected | generic; the developer's craft | fails 1 |
| Red, then green, then refactor | taken | test-craft 1.2 | pass |
| Write minimal code to pass | routed | developer (`simplification`) | n/a |
| A test that passes immediately proves nothing | taken | test-craft 1.3 | pass |
| Bug fix: reproduce, fail, fix, pass, full suite | taken | test-craft 1.4 | pass |
| Pyramid split 80/15/5 | rejected | opinion; NOTICE already says not taken | fails 3 |
| Beyonce rule | rejected | generic | fails 1 |
| Test sizes by resource (small, medium, large) | rejected | covered by test-craft 4.5 and 5.6 | fails 4 |
| State over interaction | taken | test-craft 2.6 | pass |
| DAMP over DRY in tests | taken | test-craft 5.4 | fails 1 |
| Real, fake, stub, mock in that order | taken | test-craft 3.1 | pass |
| Mock only when slow, non-deterministic or uncontrollable effect | taken | test-craft 3.1 | pass |
| Arrange, act, assert | taken | test-craft 5.3 | fails 1 |
| One assertion per concept | taken | test-craft 5.1 (one behaviour) | fails 1 |
| Testing framework code | taken | test-craft 6 | pass |
| Snapshot abuse | taken | test-craft 2.8 | pass |
| No test isolation | taken | test-craft 4.4 | pass |
| Mocking everything | taken | test-craft 3.6 | pass |
| Browser testing with DevTools, console clean | routed | frontend (planned) | n/a |
| A subagent writes the reproduction test without knowing the fix | rejected | harness; the workflow's tests stage already separates them | fails 2 |
| "All tests pass" but none ran | taken | test-craft 1.6; `review.md` gate category | pass |
| Coverage has not decreased | rejected | coverage is not a finding (`review.md` Do not report) | fails 1 |

### obra/superpowers `skills/test-driven-development/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Code written before the test is deleted | rejected | heavier by default; the confirmed test plan governs | fails 2 |
| The red must be a failure, not an error, with the expected message | taken | test-craft 1.2 | pass |
| A pass on the first run means testing existing behaviour | taken | test-craft 1.3 | pass |
| Minimal code, no YAGNI options | routed | developer (`simplification`) | n/a |
| Fix the code, not the test | taken | test-craft 1.7 | pass |
| Run the whole suite before done; report every red, even one you did not cause | missing | `build.md` "When you report" | pass |
| Output pristine: no warnings | rejected | opinion | fails 2 |
| "and" in the name: split | taken | test-craft 5.1 | fails 1 |
| Name the production change that would make it fail | taken | test-craft 1.1 | pass |
| Assert real behaviour, never mock behaviour | taken | test-craft 2.4 | pass |
| Test-only code stays out of production classes | taken | test-craft 3.5 | pass |
| Know a dependency's side effects before mocking it | taken | test-craft 3.3 | pass |
| Hard to test means unclear design | taken | test-craft 3.6 | pass |
| Huge setup: simplify the design | taken | test-craft 5.5 | pass |
| Existing code with no tests: add tests for it | rejected | against surgical change; out of scope | fails 4 |
| Rationalisations table ("too simple", "tested manually") | rejected | generic | fails 1 |
| Every new function has a test | rejected | coverage target by another name | fails 1 |

### Jeffallan/claude-skills `skills/test-master/references/tdd-iron-laws.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| No production code without a failing test first | rejected | heavier by default (obra restated) | fails 2 |
| Observe the failure; the message is meaningful | taken | test-craft 1.2 | pass |
| Its RED example fails with "sum is not defined" | rejected | wrong: an error, not an assertion failure (contradicts test-craft 1.2) | fails 3 |
| Refactor keeps tests green | taken | test-craft 2.6 | fails 1 |
| Rationalisations table | rejected | generic | fails 1 |

### Jeffallan/claude-skills `skills/test-master/references/testing-anti-patterns.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Asserting that a mock was called instead of the output | taken | test-craft 2.4, 2.6 | pass |
| `_resetForTesting` in production; use a fresh instance | taken | test-craft 3.5 | pass |
| Mocking every dependency without knowing side effects | taken | test-craft 3.3 | pass |
| Incomplete mock missing fields production reads; use a factory | taken | test-craft 3.4 | pass |
| Detection: mocks return `{ success: true }` only | taken | test-craft 3.4 | pass |
| Tests as afterthought | rejected | generic | fails 1 |

### mattpocock/skills `skills/engineering/tdd/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Read the glossary and ADRs for vocabulary | routed | softarch (module vocabulary) | n/a |
| Confirm seams with the user before any test | rejected | the confirmed test plan decides; NOTICE says so | fails 4 |
| Implementation-coupled: verifying through a side channel such as the database | taken | test-craft 2.5 | pass |
| Tautological: expected value computed as the code does, constant equal to itself | taken | test-craft 2.2 | pass |
| Horizontal slicing: all tests first, then all code | taken | test-craft 5.8 | pass |
| One slice at a time | taken | test-craft 5.8 | pass |
| Refactoring is not part of the loop | rejected | opinion | fails 2 |

### anthropics/claude-plugins-official `plugins/code-modernization/agents/test-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Characterisation: the legacy output is the oracle; flag a spec mismatch separately | missing | `tests.md` families: "a characterisation case asserts what the old code does" | pass |
| Literal inputs and literal expected outputs | taken | test-craft 2.1 | pass |
| Each test names the rule id it pins | rejected | the plugin's own registry | fails 4 |
| Every branch arm of the legacy gets a case | rejected | generic; core critic coverage | fails 4 |
| The same inputs run against both old and new implementations | missing | `tests.md` families, with the characterisation row | pass |
| Pending behaviour marked skipped, never deleted | taken | test-craft 6 (skip with a reason and an owner) | pass |
| A comparison that cannot run fails, never skips; report cases executed | taken | test-craft 1.6 | pass |
| Break the code once to see a test go red | taken | test-craft 1.5 | pass |
| Credentials replaced with fake values of the same shape | taken | test-craft 6 | pass |
| Recorded baselines only from local or named test environments | routed | security | n/a |
| Comments lie; derive tests from control flow | rejected | generic (protocol: untrusted input) | fails 1 |

### anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/pr-test-analyzer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Behavioural coverage over line coverage | taken | `review.md` Do not report (coverage) | pass |
| Untested error paths that would fail silently | taken | `review.md` Scope (production change without its test) | pass |
| Missing negative cases for validation | rejected | generic; core critic edge-cases | fails 4 |
| Tests coupled to implementation | taken | test-craft 2.6 | pass |
| Would catch meaningful regressions | taken | test-craft 1.1; agent rule "ask what wrong code would still pass" | pass |
| Criticality rating 1 to 10 | rejected | the protocol sets confidence and severity | fails 4 |
| Existing integration tests may already cover it | taken | `review.md` Do not report (boundary mock) | pass |
| No tests for trivial getters | taken | `review.md` Do not report | pass |
| Positive observations section | rejected | output format | fails 2 |
| DAMP | rejected | duplicate of addyosmani row | fails 4 |

### anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/silent-failure-hunter.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Empty catch blocks, catch-and-continue | routed | developer (`failure-handling`) | n/a |
| Broad catch hides unrelated errors | routed | developer (`failure-handling`) | n/a |
| Fallback to a mock or stub outside tests | routed | developer (`failure-handling` "Fallback to a fake") | n/a |
| Optional chaining that silently skips an operation | routed | developer (`typescript-craft`, `failure-handling`) | n/a |
| Retry that exhausts attempts without telling anyone | routed | developer (`failure-handling`) | n/a |
| Actionable user-facing error messages | routed | developer; frontend (planned) | n/a |
| Tests are not fixed by disabling them | taken | test-craft 1.7, 6 | pass |
| Project-specific logging ids (Sentry, errorIds.ts) | rejected | the source project's own conventions | fails 4 |

### garrytan/gstack `test-audit/SKILL.md` (from line 350)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A test names what it protects | taken | test-craft 1.1 | pass |
| It names the credible regression that makes it fail | taken | test-craft 1.1 | pass |
| Why existing coverage misses it; prefer a row in an existing table | taken | test-craft 5.7 | pass |
| Needs a production seam no production caller needs: test at the real boundary | taken | test-craft 3.5 | pass |
| Breaks under a behaviour-preserving refactor unless exact output is the contract | taken | test-craft 2.6, 2.8 | pass |
| `no_claim`: say what green does not prove and which doubles stand in for what | missing | `build.md` "When you report" | pass |
| Regression proof: fails at HEAD on its own assertion, an import or env failure is a test defect | taken | test-craft 1.2, 1.4 | pass |
| Regression proof: passes at the base commit as a control | rejected | covered in practice by test-craft 1.4's third clause; needs a run | fails 4 |
| Assertion-free coverage probes | taken | test-craft 2.3 | pass |
| Self-comparisons and identity copies | taken | test-craft 2.2 | pass |
| Copied fixtures, inventories or export lists | taken | test-craft 6 (grep of an import list) | pass |
| Source, import or string greps that are not a declared contract | taken | test-craft 6 | pass |
| Per-caller replays of a shared helper's tests | taken | test-craft 6 | pass |
| Call order kept when order is observable | taken | test-craft 2.7 | pass |
| Static or slow is not a reason to delete a test | rejected | about retiring old tests; out of scope (not an audit of the whole suite) | fails 4 |
| Never retire anything reachable from the package entrypoint | rejected | whole-suite sweep; out of scope | fails 4 |
| Retirement card, history, caller grep | rejected | runs a tool | fails 2 |
| Production code removed only when typecheck passes without it | routed | developer (`simplification`) | n/a |
| Mechanical pre-filter scripts, near-duplicate checksums | rejected | runs a tool | fails 2 |
| Discovery budget, batch approval, telemetry | rejected | harness | fails 2 |

### github/awesome-copilot `agents/tdd-red.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Fail for the right reason, not a syntax error | taken | test-craft 1.2 | pass |
| One test at a time | taken | test-craft 5.8 | pass |
| AAA | taken | test-craft 5.3 | fails 1 |
| Parameterised tests for several input examples | taken | test-craft 5.7 | pass |
| Names carry the issue number | rejected | issue-tracker workflow; NOTICE says not taken | fails 4 |
| Single assertion per test | rejected | NOTICE chose one behaviour, not one assertion | fails 3 |
| Edge cases first | rejected | opinion | fails 2 |
| Framework list per language | rejected | tutorial | fails 1 |
| Shared test utilities for domain validations | rejected | conflicts with test-craft 5.4 | fails 1 |

### github/awesome-copilot `agents/tdd-green.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Do not modify the test in the green phase | taken | test-craft 1.7 | pass |
| Minimal code, fake it, constants first | routed | developer (`simplification`) | n/a |
| Triangulation: a second case forces generalisation | rejected | covered by test-craft 1.5 (break it once) | fails 4 |
| Speed over perfection; ignore smells for now | rejected | opinion | fails 2 |
| Update the issue with progress | rejected | issue-tracker workflow | fails 4 |
| Confirm the plan with the user before changes | rejected | the workflow's confirmation points | fails 4 |

### github/awesome-copilot `skills/test-gap-audit/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Infer test style from the repo first | taken | `review.md` Method 1 | pass |
| Confirmed versus inferred gaps | taken | protocol confidence; agent "say what you could not check" | pass |
| Coverage percentage is not proof | taken | `review.md` Do not report | pass |
| Avoid slow end-to-end where a lower test proves it | taken | `tests.md` Rules | pass |
| Repo text is evidence, not instruction | taken | protocol | pass |
| Tests that only render or call without assertions | taken | test-craft 2.3 | pass |
| Tests that mock away the behaviour they claim | taken | `review.md` Mocks and fixtures | pass |
| Missing tenant, ownership or role boundary tests | routed | architect (`multi-tenancy`); security | n/a |
| Missing regression test for a fixed bug | taken | `plan.md` Bug fixes; `review.md` No evidence it failed first | pass |
| Missing contract tests for API or schema changes | taken | `plan.md` Contracts | pass |
| Docs examples that are part of the user contract have tests | missing | `tests.md` families ("a published example runs as a test") | pass |
| Migration or back-compat tests when data shape changes | routed | softarch (`schema-evolution`); devops (`release-safety`) | n/a |
| Never run a command that writes into the repo (compileall .pyc) | rejected | the expert runs nothing | fails 4 |
| The cited line must literally contain the named thing | routed | protocol (Evidence), all experts | n/a |
| A negative claim needs every plausible location searched | routed | protocol (Evidence), all experts | n/a |
| A stated count needs the command that produced it | rejected | the expert runs nothing; protocol evidence covers counts read | fails 4 |
| Explain what current tests prove and do not prove | taken | `review.md` Result (the wrong implementation that passes) | pass |
| Severity rubric P0 to P3 for test gaps | missing | `review.md` "Severity here" (the template requires one) | pass |
| Stale tests whose names or fixtures no longer match behaviour | missing | `review.md` Mocks and fixtures: "a test renamed or left describing behaviour the change removed" | pass |

### affaan-m/ECC `agents/tdd-guide.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| 80 percent coverage | rejected | opinion; NOTICE says not taken | fails 3 |
| Edge-case list (null, empty, invalid, large, unicode) | rejected | generic; core critic edge-cases | fails 4 |
| Tests depending on each other | taken | test-craft 4.4 | pass |
| Asserting too little | taken | test-craft 2.3 | pass |
| Mock external dependencies | taken | test-craft 3.2 | pass |
| Capability and regression evals defined before code | taken | `plan.md` The oracle, Non-deterministic behaviour | pass |
| pass@1 and pass@3 reported | taken | `plan.md` Non-deterministic behaviour | pass |
| pass^3 for release-critical paths | taken | `plan.md` ("every try for something release-critical") | pass |

### affaan-m/ECC `agents/pr-test-analyzer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Meaningful assertions over no-throw checks | taken | test-craft 2.3 | pass |
| Flag flaky patterns | taken | `review.md` An unreliable test | pass |
| Isolation and clarity of names | taken | test-craft 4.4 | pass |
| Gap tiers critical, important, nice-to-have | rejected | the protocol sets severity | fails 4 |

### affaan-m/ECC `.agents/skills/tdd-workflow/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Detect the runner; package manager is not the test runner | taken | `build.md` "Before you write a test" | pass |
| `bun test` is not `bun run test` | routed | developer (`typescript-craft`) | n/a |
| User journeys before test cases | rejected | heavier by default | fails 2 |
| 80 percent coverage thresholds | rejected | opinion | fails 3 |
| E2E example waits a fixed 600 ms | rejected | wrong (test-craft 4.3) | fails 3 |
| API example asserts status 200, `success` true, an array | rejected | wrong: the oracle test-craft 2.3 forbids | fails 3 |
| Error-path example with no assertion | rejected | wrong: `review.md` Swallowed in the test | fails 3 |
| Chain-mocking the Supabase client call by call | rejected | wrong: mocks internal call shape (test-craft 3.2, 3.4) | fails 3 |
| Semantic selectors over CSS classes | routed | frontend (planned) | n/a |
| Pre-commit hook runs tests and lint | routed | devops (`pipelines-and-deploys`) | n/a |
| Independent tests, each builds its own data | taken | test-craft 4.4 | pass |
| No skipped or disabled tests | taken | test-craft 6 | pass |

### affaan-m/ECC `skills/eval-harness/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Define evals before coding | taken | `plan.md` The oracle | pass |
| Capability evals versus regression evals, different pass rules | taken | `plan.md` Non-deterministic behaviour | pass |
| Code graders before model graders | taken | `plan.md` ("deterministic checks come first") | pass |
| pass@k and pass^k | taken | `plan.md`; `tests.md` Non-deterministic paths | pass |
| Thresholds pass@3 >= 0.90, pass^3 = 1.00 | rejected | opinion; numbers with no basis | fails 3 |
| Human review for security changes | routed | security | n/a |
| Overfitting prompts to known eval examples | taken | `review.md` Eval integrity | pass |
| Only happy-path outputs measured | rejected | generic; `tests.md` Agent and tool behaviour already lists the failure cases | fails 4 |
| Cost and latency drift ignored while chasing pass rate | missing | new skill `eval-integrity`; `plan.md` Evals | pass |
| Flaky graders in release gates | taken | `plan.md` ("an uncalibrated judge is advisory") | pass |
| Evals versioned with the code | taken | `plan.md` Test data (committed) | pass |
| Replay fixtures: a missing recording fails closed, never calls live | missing | new skill `eval-integrity`; test-craft 1.6 | pass |
| Grep as a code grader; generic 1 to 5 model-grader rubric | rejected | wrong: test-craft 6 forbids source greps; an unanchored rubric | fails 3 |
| A recorded model response pinned to the model and prompt it was recorded against | missing | new skill `eval-integrity` | pass |

### affaan-m/ECC `skills/contract-first/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| No contract machinery for a single-module boundary with no independent consumer | taken | `plan.md` Contracts ("independent consumer or provider") | pass |
| One authoritative, machine-readable artifact per boundary | taken | `plan.md` Contracts | pass |
| `$ref` only from allowlisted paths; generators without network or secrets | routed | security | n/a |
| The contract states names, required, nullability, enums, errors, versioning | routed | softarch (`schema-evolution`) | n/a |
| Keep storage details out of the contract; design from consumer jobs | routed | softarch | n/a |
| Semantic constraints (null except when cancelled) | routed | softarch (`schema-evolution`) | n/a |
| Generated consumer types over handwritten copies | routed | softarch | n/a |
| Driver rounds large ids before code can stringify them | routed | developer (`typescript-craft` holds the 2^53 rule) | n/a |
| Runtime schema validation at serialisation, not only static types | taken | `plan.md` Contracts | pass |
| Verify every path: sandbox, each error, empty, nullable, flagged or versioned | taken | `plan.md` Contracts; `tests.md` Response shape | pass |
| Consumer fixtures and provider responses both validate against the artifact | taken | `tests.md` Contracts | pass |
| At least one real end-to-end path across the boundary | taken | `tests.md` Contracts | pass |
| No consumer reads a field the contract does not document | missing | `review.md` Contract drift | pass |
| Feature-flagged or versioned response paths validated too | missing | `tests.md` Contracts | pass |
| A cast such as `as unknown as T` hides incompatible runtime data | taken | `plan.md` Contracts ("not only compile-time types") | pass |
| Contract first, implementation after; contract-after records history | rejected | process; softarch's call | fails 2 |

### affaan-m/ECC `skills/test-collaboration/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A test registry with TEST-IDs | rejected | heavier by default | fails 4 |
| Test count, file existence or green CI is not behavioural evidence | taken | test-craft 1.6; `review.md` gate category | pass |
| Delete, weaken or quarantine only with recorded risk and exit | taken | `review.md` Weakened verification | pass |
| "Not applicable" needs a reason; "hard to test" is not one | taken | `build.md` "When you report" (planned case not written, and why) | pass |
| Bug test reproduces the real failure shape, not an easier input | taken | `plan.md` Bug fixes | pass |
| When old code cannot run, record what remains unverified | taken | agent "say what you could not check"; `build.md` report | pass |
| Four evidence layers: contract lint, consumer, provider serialised output, one real crossing | taken | `plan.md` Contracts; `tests.md` Contracts | pass |
| Stale generated mocks cannot count as covered | taken | `review.md` Mocks and fixtures | pass |
| Separate green client and server tests do not prove compatibility | taken | `plan.md` Contracts | pass |
| The test is in the standard runner or a named group | taken | `review.md` A gate that cannot fail | pass |
| Do not impose one coverage number across layers | taken | `plan.md` Rules | pass |
| State which end-to-end parts are real and which are faked | missing | `build.md` "When you report" (merge with gstack `no_claim`) | pass |
| Assert invariants, not enum counts or version literals | missing | test-craft section 2 | pass |
| For parsers, config and file I/O prefer a real temp directory over a mocked file system | missing | test-craft 3.2 (it lists the file system as an edge to replace) | pass |
| Adopt the discipline, not another project's infrastructure | rejected | generic | fails 2 |

### affaan-m/ECC `skills/ai-regression-testing/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| The same model writing and reviewing shares blind spots | rejected | opinion; harness design | fails 2 |
| Sandbox and production paths return the same shape | taken | `tests.md` Response shape | pass |
| A field returned but not selected by the query | taken | `tests.md` Response shape | pass |
| Fix with `SELECT *` | rejected | wrong as a default; developer's call | fails 3 |
| Error state set but stale data not cleared | taken | `tests.md` Failure cleanup | pass |
| Optimistic update with no rollback | taken | `tests.md` Failure cleanup | pass |
| Type cast masking a missing field | taken | `plan.md` Contracts | pass |
| Its parity test loops only `if (data.length > 0)`, so it passes on empty | rejected | wrong as written; the defect is the missing item in morluto row "data-dependent guard" below | fails 3 |
| Write tests only where bugs were found | rejected | opinion; conflicts with the plan's criteria | fails 3 |
| Name tests after the bug id | rejected | style | fails 1 |
| Run tests as step 1 of a bug check | routed | the workflow's review phase (harness) | n/a |

### muratcankoylan/Agent-Skills-for-Context-Engineering `skills/evaluation/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Grade the outcome; the path is informational | taken | NOTICE row; `plan.md` Non-deterministic behaviour (state changes, refusals) | pass |
| An eval that asserts one exact tool-call sequence fails valid alternative paths | missing | new skill `eval-integrity`; `review.md` Eval integrity | pass |
| Multi-dimensional rubric; fail if any dimension is below its floor | missing | new skill `eval-integrity` | pass |
| Deterministic validation before model judgment, so an invalid artifact cannot be passed by a score | taken | `plan.md`; `tests.md` Judge-based checks | pass |
| Stratify by complexity and report per stratum | missing | new skill `eval-integrity`; `plan.md` Evals | pass |
| Realistic token budgets; compare upgrades against token increases | routed | Generative AI expert (planned); performance (planned) | n/a |
| Passing thresholds 0.7 and 0.9 | rejected | opinion | fails 3 |
| Judge from a different model family than the model under test | missing | `plan.md` Evals says only "not the model under test" | pass |
| Human review of sampled production traffic | routed | observability (planned) | n/a |
| End-state assertions for agents that mutate state | taken | `plan.md` ("state changes") | pass |
| 20 to 30 cases early, 50+ later, with confidence intervals | missing | new skill `eval-integrity` (report the interval, not a fixed count) | pass |
| Baseline before the change, on the same set | missing | new skill `eval-integrity`; `review.md` Unproven claims | pass |
| Contamination: eval examples in prompt templates or training data | taken | `review.md` Eval integrity | pass |
| Metric gaming: cross-check against human labels | taken | `plan.md` (judge calibrated against labelled cases) | pass |
| Production alert thresholds 0.85 and 0.70 | rejected | opinion | fails 3 |
| Context degradation tests at several context sizes | rejected | heavier by default; Generative AI expert if built | fails 4 |
| Every named quality dimension has its own evaluator | rejected | merged into the multi-dimensional row above | fails 4 |

### muratcankoylan/Agent-Skills-for-Context-Engineering `skills/advanced-evaluation/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Direct scoring when ground truth exists, pairwise for preference | missing | new skill `eval-integrity` | pass |
| Position bias: run twice with the order swapped, tie on disagreement | taken | `tests.md` Judge-based checks | pass |
| Length bias: validate with length-controlled pairs | missing | new skill `eval-integrity` | pass |
| Self-enhancement bias: different models for generation and judging | taken | `plan.md` Evals; `review.md` Eval integrity | pass |
| Evidence before the score | taken | `tests.md` Judge-based checks | pass |
| Binary judge: precision, recall, kappa | taken | `plan.md` (positives and negatives separately) | pass |
| Track systematic disagreement by criterion | rejected | heavier by default | fails 2 |
| 1 to 10 scales only with detailed level descriptions | rejected | opinion; disagrees with wshobson's binary rule (section 7) | fails 3 |
| Deterministic pre-checks before a pairwise judge | taken | `tests.md` ("at least one deterministic check per case") | pass |
| Panel of judges, hierarchical screening | rejected | heavier by default | fails 4 |
| One criterion measures one aspect | missing | new skill `eval-integrity` | pass |
| Rubric drift: periodic re-anchoring | rejected | an operating cadence, not visible in a diff | fails 2 |
| Judge prompts versioned; a judge-prompt change is re-tested before use | missing | new skill `eval-integrity`; `review.md` Eval integrity | pass |
| Confidence mapped to position consistency (0.5 on disagreement) | rejected | detail of one implementation | fails 1 |

### wshobson/agents `plugins/llm-finetuning/skills/eval-harness-first/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Error analysis: open coding of 100+ traces into 4 to 8 buckets | rejected | heavier by default for a code change | fails 2 |
| Synthetic goldens from a cross-product of named dimensions | taken | `plan.md` Evals ("enumerated dimensions") | pass |
| Goldens committed, diffed and tagged | taken | `plan.md` Test data | pass |
| One grader per failure bucket; a blended score hides which regressed | missing | new skill `eval-integrity` (merge with the per-dimension row) | pass |
| Deterministic grader first | taken | `plan.md` | pass |
| Binary pass/fail over Likert | missing | new skill `eval-integrity`, recorded as a disagreement with muratcankoylan | pass |
| Judge calibration: train, dev and sealed test split, reported once | taken | `plan.md` (held-out part never used to tune) | pass |
| TPR and TNR reported separately | taken | `plan.md` | pass |
| Judge pinned to a snapshot; recalibrate when the judge model changes | missing | `plan.md` has the pin; the recalibration on change is missing (`review.md` Eval integrity) | pass |
| Judge from a different model family | rejected | duplicate: counted as missing under muratcankoylan `evaluation` | fails 4 |
| An uncalibrated judge is advisory only | taken | `plan.md` | pass |
| A run or training script never writes into the eval set; eval ids excluded from training by id | missing | new skill `eval-integrity`; `review.md` Eval integrity | pass |
| Logprob scoring over generate-and-extract for multiple choice | routed | Generative AI expert (planned) | n/a |

### morluto/rea `.agents/skills/rea-ci-tests-audit/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Trace triggers, job dependencies and discovery to the commands that run | taken | `review.md` Method 1, gate category | pass |
| Required files are discovered once per intended configuration | rejected | a cost question; the gate half is taken above | fails 1 |
| A missing explicit test or missing report must not turn green | taken | `review.md` A gate that cannot fail | pass |
| Optional lanes may skip, with stated prerequisites | taken | `review.md` Do not report (documented stopgap) | pass |
| Fixture drift against current contracts, tool versions and version strings across the fixture family | taken | `review.md` Mocks and fixtures | pass |
| Intentionally malformed fixtures are kept, and their rejection tested | missing | `review.md` Weakened verification ("a malformed fixture fixed or deleted") | pass |
| Perturb the behaviour to see that the gate detects it | taken | test-craft 1.5 | pass |
| A test imports an abandoned copy of the code, not the shipped one | missing | test-craft section 6; `review.md` A gate that cannot fail | pass |
| A subprocess or checker failure hidden from the test (exit code or stderr not captured) | missing | test-craft section 2 (AGENTS.md records `execFileSync` stderr voiding a suite here) | pass |
| A faster run that skips a case or weakens an oracle is not an improvement | taken | `review.md` Weakened verification | pass |
| Separate fake-producer, boundary and real-engine evidence | missing | `build.md` "When you report" (merge with gstack `no_claim`) | pass |
| Retry only to test a named transient cause; a passing retry fixes nothing | taken | `plan.md` The gate ("a blanket retry is not a fix") | pass |
| A cached earlier pass cannot validate a live test | missing | new skill `test-gates` | pass |
| No blanket retries, raised timeouts or deleted assertions to get green | taken | `review.md` Weakened verification | pass |
| Measured performance with workload, not a percentage | routed | performance (planned) | n/a |
| Pin the baseline SHA, isolated worktree | rejected | runs a tool | fails 2 |
| Data-dependent assertion guard (`if (rows.length)`) that skips the check on empty input | missing | test-craft 1.6 (add as an example); `review.md` Swallowed in the test | pass |

### emilkowalski/skills `skills/break-ui/CATALOG.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Long, hyphenated and diacritic names; non-Latin and RTL names | taken | `tests.md` Edge values (non-Latin, right-to-left) | pass |
| Leading, trailing and repeated spaces | taken | `tests.md` Edge values (whitespace only) | pass |
| Emoji and ZWJ sequences: `.length` and `charAt(0)` split them | missing | `tests.md` Edge values | pass |
| Fixtures use reserved domains (`example.com`, `.test`) | missing | test-craft section 6 (fake values) | pass |
| Plus-addressing in email | missing | `tests.md` Edge values | pass |
| Long unbreakable strings overflow layout | routed | frontend (planned) | n/a |
| Markup in data rendered literally | routed | security; frontend (planned) | n/a |
| Newline inside a single-line field | missing | `tests.md` Edge values | pass |
| Zero, one (plurals), negative, float sums such as 0.1 + 0.2 | taken | `tests.md` Edge values (zero, one, negative, rounding) | pass |
| Locale number formatting | routed | frontend (planned) | n/a |
| Exactly page size, and page size plus one | missing | `tests.md` Edge values (collections) | pass |
| Items with identical names | taken | `tests.md` Edge values (duplicates) | pass |
| Epoch zero shown as a real date | missing | `tests.md` Edge values (time) | pass |
| A timestamp near midnight with an offset lands on another day | taken | `tests.md` Edge values (time zone changes) | pass |
| Images, media, viewport, zoom, dark mode, touch | routed | frontend (planned) | n/a |
| Loading, partial data, every status at once, the current user in the list | routed | frontend (planned) | n/a |

### trailofbits/skills `plugins/mutation-testing/skills/mutation-testing/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A surviving error replacement: tests tolerate the injected error | taken | test-craft 1.5; `review.md` No evidence it failed first | pass |
| A surviving statement deletion: assertions do not observe its effect | taken | test-craft 1.5 (NOTICE row) | pass |
| A timeout is inconclusive, not coverage | rejected | needs a mutation run; the expert asks for runs, it does not read them | fails 2 |
| Severity ranks the mutation, not the risk | rejected | about reading tool output | fails 2 |
| Equivalent mutants | rejected | runs a tool | fails 2 |
| Campaign commands and configuration | rejected | runs a tool | fails 2 |

### trailofbits/skills `plugins/property-based-testing/skills/property-based-testing/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Property catalogue: round trip, idempotence, invariant, oracle, commutativity | taken | `tests.md` Algebraic code | pass |
| Say so when the code has no algebraic shape | taken | `tests.md` Algebraic code | pass |
| "No crash" alone is the weakest property | taken | test-craft 2.3 | pass |
| Tautological property restates the implementation | taken | `tests.md` Algebraic code; test-craft 2.2 | pass |
| `f(x) == f(x)` is a real determinism check for impure-looking code | taken | test-craft 4.7 | pass |
| Vacuity: `assume()` or a filter discards nearly every input, or all | missing | test-craft section 1 (next to 1.6) | pass |
| Adding a PBT library is the user's dependency decision | missing | `tests.md` Algebraic code ("use the repo's library; if none, ask") | pass |
| Refactor to expose a buried property | routed | developer (`simplification`) | n/a |

### wshobson/agents `plugins/backend-development/agents/test-automator.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Detect framework and existing patterns | taken | `build.md` | pass |
| Time and environment mocking | taken | test-craft 4.1 | pass |
| Happy path, edge, error, boundary design | rejected | generic | fails 4 |
| Clear failure messages | rejected | generic | fails 1 |
| One test file per source file | rejected | layout; `review.md` Do not report | fails 1 |

### wshobson/agents `plugins/javascript-typescript/skills/javascript-testing-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| AAA, test isolation | taken | test-craft 5.3, 4.4 | pass |
| Dependency injection for testing | taken | test-craft 3.5 ("pass the dependency in") | pass |
| Factory with overrides | taken | test-craft 3.4 | pass |
| Truncate tables in `beforeEach`, tear down in `afterAll` | taken | test-craft 4.4 (each test builds its own world) | pass |
| Unseeded faker data | rejected | wrong (test-craft 4.2); NOTICE says so | fails 3 |
| Spying on the logger, an internal collaborator | rejected | wrong (test-craft 2.6) | fails 3 |
| 80 percent coverage | rejected | opinion | fails 3 |
| Jest and Vitest setup | rejected | tutorial | fails 1 |
| Prefer semantic queries to `data-testid` | routed | frontend (planned) | n/a |

## 3. Today's rows, value test

### `test-craft` skill

The skill has no source tags on any row; every row below needs one in Phase 3 ([T] for the upstream rows, [O] for the five NOTICE says came from experience).

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| test-craft | 1.1 Name the break first | keep | the expert's core test; obra, gstack |
| test-craft | 1.2 Watch it fail on its assertion | merge with `build.md` "While you write" | same rule in both; keep it here, cut from the brief |
| test-craft | 1.3 A first-run pass is suspect | keep | non-obvious; obra |
| test-craft | 1.4 Three runs for a bug fix | keep | non-obvious third clause; gstack |
| test-craft | 1.5 Break it once | keep | checkable in the report; anthropics |
| test-craft | 1.6 A check that cannot run fails, not skips | keep | strong; anthropics; add the vacuous-guard and `assume()` examples |
| test-craft | 1.7 Fix the code, not the test | merge with `build.md` "While you write" | duplicated in the brief |
| test-craft | 2.1 Expected value as a literal | merge with `build.md` "While you write" | duplicated in the brief |
| test-craft | 2.2 Do not compute it as the code does | keep | non-obvious; mattpocock, trailofbits |
| test-craft | 2.3 Outcome, not absence of a crash | keep | the core critic covers it only at the test-plan stage |
| test-craft | 2.4 Never assert what a double returns | keep | Jeffallan, obra |
| test-craft | 2.5 Look through the front door | keep | mattpocock (side channel) |
| test-craft | 2.6 State over interaction | merge with 2.7 | generic alone; its value is the boundary exception in 2.7 |
| test-craft | 2.7 Interaction only at a boundary | keep | the non-obvious half; gstack, obra disagree and the NOTICE chose |
| test-craft | 2.8 Exact output when it is the contract | keep | gstack, addyosmani |
| test-craft | 3.1 Prefer the real thing (order) | keep | addyosmani |
| test-craft | 3.2 Replace only the edge | merge with 3.1 | same rule; also fix the file-system clause (prefer a temp directory) |
| test-craft | 3.3 Know what you are replacing | keep | obra, Jeffallan |
| test-craft | 3.4 A double has the real shape | keep | Jeffallan |
| test-craft | 3.5 Nothing in production only for tests | keep | Jeffallan, gstack |
| test-craft | 3.6 "Mock everything" is a design signal | keep | changes what the writer reports |
| test-craft | 4.1 Control time | merge with `build.md` "While you write" | duplicated; keep the "two current-date reads" detail here |
| test-craft | 4.2 Control randomness, print the seed | keep | [O]; wshobson's unseeded faker shows the miss |
| test-craft | 4.3 Wait on a condition | merge with `build.md` "While you write" | duplicated in the brief |
| test-craft | 4.4 Each test builds its own world | keep | the "passes alone, fails in suite" tell is checkable |
| test-craft | 4.5 No live network in a unit test | merge with 3.2 | the network is already listed as an edge |
| test-craft | 4.6 Order that is not promised | keep | merge note: `go-craft` holds the Go map case; keep the general rule here |
| test-craft | 4.7 Same input, same output | keep | trailofbits |
| test-craft | 5.1 One behaviour per test | cut | fails 1 (generic); `review.md` does not report it |
| test-craft | 5.2 The name states the behaviour | cut | fails 1; `review.md` Do not report lists names |
| test-craft | 5.3 Arrange, act, assert | cut | fails 1 |
| test-craft | 5.4 Readable on its own | cut | fails 1; opinion |
| test-craft | 5.5 Small setup | merge with 3.6 | the same design signal |
| test-craft | 5.6 The lowest level that shows it | merge with `plan.md` "The level" | one home; `tests.md` Rules repeats it too |
| test-craft | 5.7 Extend the table | keep | gstack; checkable |
| test-craft | 5.8 One case at a time | merge with 1.2 | the same loop |
| test-craft | 6.1 Do not test the framework | keep | addyosmani; checkable |
| test-craft | 6.2 Do not repeat a helper's tests | keep | gstack |
| test-craft | 6.3 Do not grep source unless it is the contract | keep | gstack |
| test-craft | 6.4 No real secrets in fixtures | merge with `review.md` "Secrets and personal data" | security owns secrets; one quality row for fixtures |
| test-craft | 6.5 No skip without reason and owner | merge with `review.md` Weakened verification | same rule at two stages; keep both only if test-craft loads at review |
| test-craft | 6.6 No coverage target | merge with `plan.md` Rules | duplicated |

### `plan.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| plan.md | The oracle | keep | ECC eval-harness |
| plan.md | The level (incl. AWS real, emulator, fake) | keep | the emulator limits carry no source: on the fact list (section 4) |
| plan.md | Contracts | keep | border with softarch (section 6) |
| plan.md | Non-deterministic behaviour | keep | ECC, muratcankoylan |
| plan.md | Evals | keep | change "not the model under test" to "not the same model family" (section 4) |
| plan.md | The gate | keep | morluto; facts belong in a skill (section 7) |
| plan.md | Test data | merge with test-craft 4.1, 4.2 | the time and randomness half is duplicated; keep "committed, no production data, checked against the contract" |
| plan.md | Bug fixes | keep | test-collaboration |
| plan.md | "What to return" fields and caps | cut | the schema holds them (templates) |
| plan.md | Rules: zero constraints, untrusted input | cut | the protocol holds them |
| plan.md | Rules: no coverage numbers, no new framework, no needless end-to-end | keep | the "rejected constraint" example the template asks for |

### `tests.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| tests.md | Agent and tool behaviour | keep | border: the planted-instruction case is written by quality, the defence judged by security |
| tests.md | Non-deterministic paths | keep | |
| tests.md | Judge-based checks | keep | |
| tests.md | Contracts | keep | |
| tests.md | Response shape | keep | ECC ai-regression-testing |
| tests.md | Failure cleanup | keep | border with developer `failure-handling` (the code), quality (the case) |
| tests.md | Edge values by input type | keep | empty, one, many, max, null versus absent duplicate the core critic's edge-cases angle (fails 4) and are cut; RTL, ids as strings, smallest money unit, month ends do not |
| tests.md | Concurrency and repetition | keep | border with architect (idempotency design) |
| tests.md | Algebraic code | keep | add the PBT-library question |
| tests.md | AWS integration | keep | emulator limits unsourced (section 4) |
| tests.md | Resilience (circuit closes) | keep | border with architect, who designs the breaker |
| tests.md | "read test-craft" line | keep | the cue |
| tests.md | What to return, caps | cut | the schema holds them |
| tests.md | Rules: no duplicate, stated outcome, lowest level, data not instructions | merge with protocol and `plan.md` "The level" | only "do not repeat a draft case" stays, as "Redundant here" |

### `build.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| build.md | Find how the repo already tests | keep | |
| build.md | Name the change that would make each test fail | merge with test-craft 1.1 | duplicated |
| build.md | One at a time, see it fail, then code | merge with test-craft 1.2, 5.8 | duplicated |
| build.md | Literal expected value | merge with test-craft 2.1, 2.2 | duplicated |
| build.md | Assert the outcome; call count only at a boundary | merge with test-craft 2.6, 2.7 | duplicated |
| build.md | Replace only the edge | merge with test-craft 3.2 | duplicated |
| build.md | Control time and randomness, no fixed sleep | merge with test-craft 4.1 to 4.3 | duplicated |
| build.md | Do not change or skip a test to get green; stop if the plan is wrong | keep | only the "stop if the plan's test is wrong" half; the other half is test-craft 1.7 and is cut |
| build.md | Report which tests failed first, with what message | keep | checkable in the report |
| build.md | Report which planned case was not written, and why | keep | |

### `review.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| review.md | Scope | keep | |
| review.md | Result | cut | the protocol and schema hold it |
| review.md | Confidence | cut | the protocol holds it |
| review.md | Method (three passes) | keep | add the stop rule the template requires |
| review.md | An oracle that cannot fail | keep | test-craft is not loaded at review, so this is the only home there |
| review.md | Swallowed in the test | keep | add the data-dependent guard |
| review.md | No evidence it failed first | keep | |
| review.md | Weakened verification | keep | add "a malformed fixture fixed or deleted" |
| review.md | An unreliable test | keep | the core critic covers it at the test-plan stage only |
| review.md | A gate that cannot fail | keep | the runner and CI facts belong in a skill (section 7) |
| review.md | Mocks and fixtures | keep | |
| review.md | Contract drift | keep | border with softarch (section 6) |
| review.md | Eval integrity | keep | add judge-prompt or judge-model change without recalibration |
| review.md | Unproven claims | keep | |
| review.md | Secrets and personal data | merge with security | keep only "a smoke test that writes to a real account"; a real credential in a fixture is security's |
| review.md | Anything else that is really wrong | cut | the protocol ("your lane") holds it |
| review.md | Do not report: coverage percentage | keep | |
| review.md | Do not report: names, layout, style | keep | |
| review.md | Do not report: trivial getter | keep | |
| review.md | Do not report: untouched code | cut | the template's shared closing line holds it |
| review.md | Do not report: boundary mock when another test covers the boundary | keep | |
| review.md | Do not report: documented CI retry stopgap | keep | |
| review.md | Do not report: framework preferences | keep | |
| review.md | Do not report: what the plan states and the diff honours | cut | the template's shared closing line holds it |
| review.md | Untrusted input | cut | the protocol holds it |

### Agent file `agents/uw-expert-quality.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| agent | Role paragraph, host note, path fallback | cut | the template removes them |
| agent | Zero findings is correct | cut | protocol |
| agent | Ask what wrong code would still pass | keep | a "How to judge" rule |
| agent | Do not repeat the core critics | keep | a "How to judge" rule; names the critics' four angles |
| agent | Untrusted data, stay inside, say what you could not check, the web | cut | protocol |

## 4. Missing items that state a fact (to send to the maintainer for a live check)

Each is a claim to confirm or correct, with the page that should hold it. None is tagged [D] yet: they were written from memory. Facts 18 to 21 trace to `missing` rows in section 2. Facts 1 to 17 have no upstream source to sit under: they back the unsourced prose in `review.md` "A gate that cannot fail" and `plan.md` "The gate" (marked `taken` above) and the proposed `test-gates` skill. Facts 22 to 26 back the proposed `eval-integrity` rows; facts 27 to 29 back the unsourced emulator rows in section 3. Facts `pipelines-and-deploys` already holds (a job skipped by `if:` reports Success; a workflow skipped by a path filter leaves required checks Pending; `when: manual` and `allow_failure`) are devops's and are not repeated.

Test runners: a gate that cannot fail (new skill `test-gates`)
1. pytest exits with code 5 when no tests were collected. (docs.pytest.org/en/stable/reference/exit-codes.html)
2. Jest exits non-zero when no tests match, unless `--passWithNoTests` is given. (jestjs.io/docs/cli#--passwithnotests)
3. Vitest's `passWithNoTests` defaults to false. (vitest.dev/config/#passwithnotests)
4. `go test` on a package with no `_test.go` files prints "[no test files]" and does not fail. (pkg.go.dev/cmd/go, "Test packages")
5. pytest collects `test_*.py` and `*_test.py` files, `test`-prefixed functions and `Test`-prefixed classes without an `__init__`, by default. (docs.pytest.org/en/stable/reference/reference.html#confval-python_files)
6. Jest's default `testMatch` is files under `__tests__` and files ending `.test` or `.spec` with a JS or TS extension. (jestjs.io/docs/configuration#testmatch-arraystring)
7. `node --test` with no path argument searches a fixed set of patterns (`*.test.js`, `*-test.js`, `*_test.js`, `test-*.js`, `test.js`, files under `test/`); give the exact list for the current LTS. (nodejs.org/api/test.html#running-tests-from-the-command-line)
8. In pytest an `xfail` test that passes is reported XPASS and does not fail the run unless `strict=True` or the `xfail_strict` ini option is set. (docs.pytest.org/en/stable/how-to/skipping.html#strict-parameter)
9. Playwright reports a test that fails and then passes on retry as "flaky", and the run exits 0. (playwright.dev/docs/test-retries)
10. Playwright's `forbidOnly` fails the run when `test.only` is present; the docs suggest setting it from `process.env.CI`. (playwright.dev/docs/api/class-testconfig#test-config-forbid-only)
11. Vitest's `allowOnly` defaults to `!process.env.CI`. (vitest.dev/config/#allowonly)
12. Mocha's `--forbid-only` fails the run when `.only` is used. (mochajs.org/#--forbid-only)
13. `jest.retryTimes()` retries failing tests and works only with the jest-circus runner. (jestjs.io/docs/jest-object#jestretrytimesnumretries-options)
14. pytest-rerunfailures' `--reruns N` reruns failures, and a test that passes on a rerun leaves the run green. (github.com/pytest-dev/pytest-rerunfailures, README)

CI configuration (new skill `test-gates`; border with devops)
15. On GitHub Actions, a `run` step with no `shell` on Linux runs `bash -e {0}`, while `shell: bash` runs `bash --noprofile --norc -eo pipefail {0}`; only the explicit form fails a step when the test command is piped (`pytest | tee`). (docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax, `jobs.<job_id>.steps[*].shell`)
16. `continue-on-error: true` on a step lets the job succeed when that step fails; on a job it lets the workflow succeed. (same page, `continue-on-error`)
17. A step's `outcome` is the result before `continue-on-error` is applied and its `conclusion` after, so a later `if: steps.x.conclusion == 'failure'` never fires for such a step. (docs.github.com, contexts reference, `steps` context)

Property-based testing (test-craft)
18. Hypothesis raises a health-check failure (`filter_too_much`) when `assume()` or a filter rejects too many generated inputs. (hypothesis.readthedocs.io, API reference, `HealthCheck`)
19. fast-check fails a property when `fc.pre()` skips more than `maxSkipsPerRun` runs; give the default value. (fast-check.dev, runners documentation)

Fixtures and edge values (test-craft section 6, `tests.md`)
20. RFC 2606 reserves `example.com`, `example.net` and `example.org`, and the `.test`, `.example`, `.invalid` and `.localhost` top-level names. (rfc-editor.org/rfc/rfc2606)
21. In JavaScript `String.prototype.length` and `charAt` count UTF-16 code units, so an emoji outside the Basic Multilingual Plane has length 2 and `charAt(0)` returns a lone surrogate. (tc39.es/ecma262, String.prototype.charAt; developer.mozilla.org String.length)

LLM judges and evals (new skill `eval-integrity`)
22. Zheng et al. 2023 (MT-Bench, Chatbot Arena) report position bias, verbosity bias and self-enhancement bias in LLM judges, and evaluate swapping positions as a mitigation. (arxiv.org/abs/2306.05685)
23. Wang et al. 2023 show that swapping the order of two candidates can change an LLM judge's verdict, and propose balanced position calibration. (arxiv.org/abs/2305.17926)
24. pass@k is defined in Chen et al. 2021 with an unbiased estimator computed from n >= k samples, not by running exactly k attempts. (arxiv.org/abs/2107.03374)
25. pass^k (all k independent trials succeed) is defined in the tau-bench paper, Yao et al. 2024. (arxiv.org/abs/2406.12045)
26. Is the "different model family" rule for judges stated in a primary source, or only in third-party skills? If only third-party, it stays [T]. (the same three papers)

AWS emulators (`plan.md` "The level", `tests.md` AWS integration; today unsourced)
27. LocalStack does not enforce IAM policies unless IAM enforcement is turned on (`ENFORCE_IAM=1`); say whether that is a paid feature. (docs.localstack.cloud, IAM policy enforcement)
28. DynamoDB local ignores provisioned throughput settings, so it does not throttle. (docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html)
29. Give the other documented differences of DynamoDB local from the service that a test could depend on (for example consistency or transaction behaviour). (same page)

## 5. Missing items for the references (categories, plan questions, Goal or Responsibilities)

**Agent file (Goal, template section 2)**
- Prevents: a change that ships with tests, evals or gates that stay green when the code is wrong.
- Done well: every finding names the wrong implementation that would still pass, and where.
- Not the goal: coverage numbers, test style, a new framework, end-to-end tests where a unit test shows it.
- How to judge: keep "ask what wrong code would still pass" and "do not repeat the core critics"; add "follow how this repository already tests before any reference practice".

**`skills.md`**
- Load `test-craft` at review too, selected by test files changed (for example `files: *test*, *spec*, __tests__/*, test/*, tests/*`). Today `review.md` re-explains its rules because the skill is absent there.
- At plan, list `eval-integrity` and `test-gates` once they exist (section 7).

**`plan.md`**
- Outcome sentence: the plan says how each criterion will be checked and what blocks a merge, so the build is held to it.
- Evals: the model under test is pinned too, not only the judge; the eval reports cost and latency next to pass rate; results are reported per stratum and per dimension, with a floor per dimension.
- Evals: the judge is from another model family, not only another model (pending fact 26).
- The one-way-choice rule (template): a judge model, an eval set or a contract artifact others will depend on names the alternatives.
- A good constraint ("the `orders` contract test validates the provider's serialised response against `openapi.yaml`, including the 404 body") and a rejected one ("increase coverage", not checkable).

**`tests.md`**
- Families: characterisation (the old output is the oracle, the same inputs run against old and new); a published docs example runs as a test.
- Edge values: exactly page size and page size plus one; epoch zero; plus-addressing; emoji and ZWJ length; a newline in a single-line field; a feature-flagged contract path.
- Algebraic code: use the repository's property library; if it has none, that is a question for the user.
- One worked case and "Redundant here" (template section 4).

**`build.md`**
- When you report: the full-suite result, with every failure named even if this change did not cause it; what green does not prove (which parts are faked, which real).
- Cut the rows test-craft already holds (section 3).

**`review.md`**
- Severity here (template): high for a gate or eval that passes whatever the code does on a path the repo uses; medium for one that passes only under a condition (an empty list, a skipped lane); low for a weak oracle on a minor path.
- Categories to add:
  - Eval integrity: a judge prompt or judge model changed with no recalibration; an eval asserting one exact tool-call sequence; a run script writing into the eval set.
  - Swallowed in the test: an assertion behind a data-dependent guard (`if (rows.length)`); a subprocess's exit code or stderr not captured.
  - A gate that cannot fail: a test importing a stale copy of the module; a cached earlier pass replayed for a live test.
  - Weakened verification: a malformed fixture "fixed" or deleted.
  - Contract drift: a consumer reading a field the contract does not document.
  - Mocks and fixtures: a test left describing behaviour the change removed.
- Method: the stop rule; one worked finding and one dropped candidate.

## 6. Responsibilities: draft rubric rows for this expert

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Unit and integration tests | whether each test can fail for wrong code: oracle, doubles, determinism | how the production code is written (developer) | a design that forces mocking everything: quality reports it as a signal, developer judges the design |
| Test plans | the cases verification quality needs (oracle, eval, contract, gate) | generic coverage and edge cases (core critics) | a seeded, domain-specific edge value is quality's; "empty, one, many" is the critics' |
| LLM and agent evals | eval set, repeat rule, judge calibration, contamination | prompt and agent design, token budgets (Generative AI, planned) | an eval that cannot tell good from bad is quality's; a prompt that produces bad output is not |
| Contracts | that both sides are checked against one artifact, on every path | what the contract says and whether a change is compatible (softarch) | a changed field with no fixture or test change: quality; a breaking change itself: softarch |
| CI gates | whether a test job, step or report can fail: discovery, exit codes, retries, skips, quarantine | deploy wiring, promotion, concurrency (devops); workflow security (security) | a required job that never runs the tests: quality; a deploy that skips the test job: devops |
| AWS integration | what runs on an emulator against a real account, and what the emulator cannot show | which services and how they fail (architect) | a smoke test's exact expected answer: quality; the failure mode it probes: architect |
| Fixtures and test data | committed, fake, current with the contract | real credentials and personal data (security) | a smoke test writing to a real account: quality; a leaked secret: security |
| Production error paths | that the change's error path has a test that fails if the error is swallowed | how the error is handled (developer `failure-handling`) | a fallback with no test: quality; a fallback that hides the error: developer |
| Frontend tests | oracle and determinism of a UI test | selectors, rendering, accessibility, visual states (frontend, planned) | a UI test asserting only that a component renders: quality |

## 7. Skills the quality expert should have and does not

Quality has one skill (`test-craft`, at tests and build) and none at plan or review. Its facts about runners, CI and judges live in reference prose with no source tags. Three skills would carry them; each is built only if the ledger's rows survive the fact check and a measurement shows a gain.

**`test-gates` (a gate that can actually fail; flaky-test policy)**
- Stages: plan, review, build.
- Selector idea: files `pytest.ini`, `pyproject.toml`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `.mocharc*`, `conftest.py`, `.github/workflows/*`; added text `continue-on-error`, `passWithNoTests`, `retries`, `reruns`, `retryTimes`, `xfail`, `skip`, `.only`, `|| true`, `quarantine`.
- Rows: facts 1 to 17; a cached pass replayed for a live test (morluto); quarantine has an owner and an expiry; a blanket retry is not a fix (`plan.md`, moved here with its facts).
- Sources: morluto/rea `rea-ci-tests-audit` [T]; ECC `test-collaboration` [T]; the runners' own documentation (to be checked).
- Border: devops `pipelines-and-deploys` keeps deploy wiring and the skip-and-Pending facts; security keeps workflow security.

**`eval-integrity` (LLM and agent evals that can tell good from bad)**
- Stages: plan, tests, review.
- Selector idea: files under `evals/`, `*.eval.*`, `promptfooconfig.*`; added text `llm-as-judge`, `judge`, `rubric`, `golden`, `pass@`, `promptfoo`, `deepeval`, `ragas`, `inspect_ai`, `openevals`.
- Rows (all `missing` above): cost and latency with pass rate; replay fails closed; recordings pinned to model and prompt; outcome over one exact path; per-dimension floor and one grader per failure bucket; per-stratum reporting; interval over a fixed case count; baseline on the same set; direct versus pairwise; length-controlled pairs; one criterion, one aspect; judge prompt or model change re-tested; run scripts never write into the eval set; model under test pinned; judge from another family.
- Sources: muratcankoylan `evaluation` and `advanced-evaluation` [T]; wshobson `eval-harness-first` [T]; ECC `eval-harness` [T]; ECC `agent-eval` and awesome-copilot `eval-driven-dev` (read beyond the NOTICE, supporting only); primary: facts 22 to 26.
- Disagreement to record, not resolve: wshobson prefers binary pass/fail judges over Likert; muratcankoylan calls 1 to 5 the best balance. Both are [T].
- Border: the Generative AI expert (planned) owns prompt and agent design; this skill owns whether the measurement can be trusted.

**`aws-test-doubles` (what an emulator cannot show)**
- Stages: plan, tests.
- Selector idea: added text `localstack`, `moto`, `DynamoDBLocal`, `dynamodb-local`, `aws-sdk-client-mock`, `testcontainers`.
- Rows: facts 27 to 29, plus what `plan.md` and `tests.md` already claim (permission evaluation, eventual consistency, throttling, quotas), once sourced.
- Sources: AWS and LocalStack documentation only; no upstream skill held this (the r3 survey marked it a source gap).
- Border: architect owns which service and how it fails; this skill owns whether the test double can show it. Smaller than the other two; it could stay as rows in `plan.md` and `tests.md` if the facts are few.

Considered and not proposed: a separate `flaky-tests` skill (folded into `test-gates`); `contract-testing` with Pact (border with softarch `schema-evolution`; no cited source covers Pact, so nothing to audit yet); `property-and-mutation` (its two missing rows fit in test-craft); an edge-value catalogue skill (the missing rows fit in `tests.md`, and the UI half is the frontend expert's).
