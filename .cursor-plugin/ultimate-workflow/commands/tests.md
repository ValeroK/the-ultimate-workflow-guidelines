---
description: "Draft a test plan, add the cases the selected domain experts need, then attack it from four angles: could an implementation pass all of this and still be wrong? Writes nothing."
argument-hint: "<plan file>"
---

# Phase: tests

## Before the workflow

The plan file is the one the user named. Otherwise, if exactly one `PLAN-*.md` exists at the repository root, use it. If several exist and none was named, ask which; never pick by modification time.

Find the experts, in code:

1. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" list` prints the available experts as JSON. Keep it exactly as printed; it is passed as `available`.
2. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" read --plan <plan file>` prints the experts the plan selected. Pass its `experts` as `experts`. If the plan has none recorded (`present` is false), pass an empty list and tell the user that planning did not record a decision.

## Run the phase

Call the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/tests.js`
- `args`: a JSON object, not a string: `{ "plan": "<plan file>", "available": <the list>, "experts": <the plan's experts>, "expertsDir": "${CLAUDE_PLUGIN_ROOT}/experts" }`, plus `angles` if the user gave some.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present the returned Tests section and **stop**. Negotiating "how would we know this works" is cheaper on paper than on code that already exists. `tests_confirmed` is set only after the user actually confirms.

The section ends with "Expert test cases", one subsection per expert that took part. If `expertLane.failed` is not empty, say which expert's cases are missing. If `expertLane.skipped` is set, say that no expert was consulted, and why.

Once the user has confirmed and the Tests section is in the plan file, record the evidence: build a JSON object with `"ok": true` and the `expertLane` exactly as returned, and run
`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage tests` with it on standard input. Skip this if `expertLane.skipped` was set.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
