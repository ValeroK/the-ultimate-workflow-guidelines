---
description: Review the diff through four parallel lenses, then adversarially try to refute each finding. Writes nothing.
argument-hint: "[--lenses security,performance]"
---

# Phase: review

Run this phase by calling the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/review.js`
- `args`: `$ARGUMENTS`

Optional extra lenses beyond the four defaults.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present confirmed, refuted, and unverified findings **separately**. List the refuted ones rather than dropping them: a verifier that silently filters cannot be audited.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
