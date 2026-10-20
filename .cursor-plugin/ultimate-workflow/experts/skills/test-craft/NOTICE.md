# Notice

This skill is written in our own words. No text is copied.

Upstream sources compared on 2026-10-20, ideas only; every row they informed is marked [T].

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| docs.pytest.org reference; hypothesis.readthedocs.io settings; fast-check.dev configuration; MDN `String.length`; RFC 2606; docs.localstack.cloud IAM enforcement; AWS DynamoDB local usage notes | Checked live by the maintainer, 2026-10-20 (the quality fact-check, round 2) | Tool documentation and RFC | Every fact marked [R] |
| addyosmani/agent-skills, `test-engineer` agent and `test-driven-development` skill | Read 2026-10-20 | MIT | State over interaction, the order real, fake, stub, mock, readable tests over shared helpers, names that read as a specification, unreviewed snapshots, testing the framework instead of the code. Its coverage split was not taken |
| obra/superpowers, `test-driven-development` skill | Read 2026-10-20 | MIT | Watching the test fail for the right reason, a first-run pass as a warning, one behaviour per test, fixing the code rather than the test, a large setup or mocking everything as a design signal |
| Jeffallan/claude-skills, `tdd-iron-laws` and `testing-anti-patterns` references (adapted from obra/superpowers) | Read 2026-10-20 | MIT | Asserting what a mock was told to return, test-only methods in production code, replacing a dependency without knowing its side effects, doubles that lack the real response's shape |
| mattpocock/skills, `tdd` skill | Read 2026-10-20 | MIT | Checking the outcome through the public interface, a test that breaks under a behaviour-preserving refactor, an expected value computed the way the code computes it. Its advice to confirm seams with the user before writing a test was not taken: the confirmed test plan decides that |
| anthropics/claude-plugins-official, `code-modernization` `test-engineer` and `pr-review-toolkit` `pr-test-analyzer` agents | Read 2026-10-20 | Apache-2.0 | Literal expected values, breaking the code once to see a test go red, a check that cannot run failing instead of skipping, fake values of the same shape in fixtures |
| garrytan/gstack, `test-audit` skill (from line 350; the earlier part is harness) | Read 2026-10-20 | MIT | Naming the regression a test would catch, the three runs for a bug fix, adding a row to an existing table, low-value tests (source greps, repeated helper tests), call counts that are behaviour at a boundary |
| github/awesome-copilot, `tdd-red` and `tdd-green` agents, `test-gap-audit` skill | Read 2026-10-20 | MIT | A red that is an error rather than an assertion, not changing the test to pass. The issue-tracker workflow was not taken |
| affaan-m/ECC, `tdd-guide` and `pr-test-analyzer` agents, `tdd-workflow` skill | Read 2026-10-20 | MIT | Assertions beyond "does not throw", tests that depend on each other. Its 80 percent coverage rule and its examples (a fixed wait) were not taken |
| trailofbits/skills, `property-based-testing` and `mutation-testing` skills | Read 2026-10-20 | CC BY-SA 4.0 | A tautological oracle, running the same input twice as a determinism check, a surviving change meaning the assertions do not observe the effect (ideas only; no text, so the share-alike terms do not apply) |
| wshobson/agents, `javascript-testing-patterns` skill and `test-automator` agent | Read 2026-10-20 | MIT | Arrange, act, assert and test isolation. Its examples were not used: they spy on internal collaborators and use unseeded fake data |

Where the sources disagreed, these were chosen: one behaviour per test rather than one assertion per test; a real implementation or a fake before a mock, with a mock reserved for effects that cannot be allowed; call counts allowed when the call is the behaviour at a boundary; snapshots only when exact output is the contract; the test plan fixes the cases and the writer still takes them one at a time.

Waiting on a condition instead of a duration, seeding generated data and printing the seed, unordered results, and no live network in a unit test come from our own experience; the sources were thin there.
