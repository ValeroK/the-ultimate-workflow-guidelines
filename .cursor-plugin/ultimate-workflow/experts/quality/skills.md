# Skills: quality

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

## plan

- eval-integrity
- test-gates

## tests

- test-craft (always)
- eval-integrity (added: [Jj]udge|JUDGE|pass@|pass\^k|eval_set|evals?/|rubric|few-shot|held.out)

## build

- test-craft (always)

## review

- test-craft (files: *.test.*, *.spec.*, *_test.go, *_test.py, test_*.py, conftest.py, *Test.java, *Tests.java, *IT.java, **/tests/**/*, **/test/**/*, **/__tests__/**/*, **/evals/**/*)
- test-gates (files: .github/workflows/*.yml, .github/workflows/*.yaml, pytest.ini, conftest.py, jest.config.*, vitest.config.*, vitest.workspace.*, .mocharc.*, playwright.config.*; added: passWithNoTests|forbidOnly|allowOnly|forbid-only|forbid-pending|fail-zero|pass-on-failing|retryTimes|--reruns|reruns=|xfail|failOnFlakyTests|retries:|continue-on-error|--test-only|testMatch|testRegex|python_files|testpaths)
- eval-integrity (added: [Jj]udge|JUDGE|pass@|pass\^k|eval_set|rubric|few-shot|held.out)
