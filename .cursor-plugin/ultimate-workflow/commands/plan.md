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

Once the user has confirmed and the plan file is on disk, record which domain experts the plan will need, in code and not by judgement. List the paths the plan expects to change, one per line, and run:
`node "${CLAUDE_PLUGIN_ROOT}/experts/route.js" --write-plan <plan file>` with that list on standard input.
It writes an `experts:` line into the plan's frontmatter, or an explicit empty list when none apply, and never overwrites a value a person already wrote (it reports `differs` instead). The review phase re-checks against the real diff.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
