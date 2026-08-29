---
description: Explore the codebase in parallel, then draft a plan anchored in what already exists. Writes nothing.
argument-hint: "<what you want built>"
---

# Phase: plan

Run this phase by calling the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/plan.js`
- `args`: `$ARGUMENTS`

The feature to plan, verbatim from the user.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present the returned plan and **stop**. Do not write it to disk and do not start work until the user confirms. Two things depend on that stop: the confirmation is the product, and `plan_confirmed` is not yours to set.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
