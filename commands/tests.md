---
description: Draft a test plan, then attack it from four angles: could an implementation pass all of this and still be wrong? Writes nothing.
argument-hint: "<plan file, or leave empty for the newest>"
---

# Phase: tests

Run this phase by calling the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/tests.js`
- `args`: `$ARGUMENTS`

The plan file to extend. If empty, use the most recently modified `PLAN-*.md`.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present the returned Tests section and **stop**. Negotiating "how would we know this works" is cheaper on paper than on code that already exists. `tests_confirmed` is set only after the user actually confirms.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
