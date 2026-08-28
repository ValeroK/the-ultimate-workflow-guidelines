---
description: Read the plan, the diff, and what is already recorded; propose what is worth keeping. Writes nothing.
argument-hint: "[feature name]"
---

# Phase: harvest

Run this phase by calling the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/harvest.js`
- `args`: `$ARGUMENTS`

Optional feature name. If empty, harvest the current branch against its merge base.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present the proposals grouped by destination and **stop**. Apply nothing without the user accepting it -- a proposal you have to accept is a proposal you actually read.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
