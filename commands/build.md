---
description: Write the confirmed tests, prove they fail, implement minimally, loop to green or escalate. The only phase that writes.
argument-hint: "<plan file, or leave empty for the newest>"
---

# Phase: build

Run this phase by calling the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/build.js`
- `args`: `$ARGUMENTS`

The confirmed plan to implement. If empty, use the most recently modified `PLAN-*.md`.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Report what landed and whether verification is green. If the run escalated, present the blocker with options and **stop** -- do not pick one. Never report green without having seen the verification output.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
