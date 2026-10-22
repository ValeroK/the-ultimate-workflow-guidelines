---
description: Explore the codebase in parallel, draft a plan anchored in what already exists, and collect input from the domain experts that apply. Writes nothing.
argument-hint: "<what you want built>"
---

# Phase: plan

## Before the workflow: find out which experts exist

The workflow script cannot read the filesystem, so the list of domain experts is found here, in code. Run:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" list`

It prints a JSON array, one entry per `agents/uw-expert-*.md`. Keep it exactly as printed; it is passed to the workflow as `available`. An empty array is fine and means no expert is installed. If the script prints a problem on stderr, show it to the user: an expert whose file is malformed is left out of the list.

Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" skills --stage plan`. It prints a JSON object: for each expert that plans, the skills it may be given, each with a one-line headline and its text. Keep it exactly as printed; it is passed as `skills`. The workflow asks which of them the draft needs, in the same call that chooses the experts, and can only pick from this list.

## Run the phase

Call the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/phases/plan.js`
- `args`: a JSON object, not a string: `{ "feature": "<the feature to plan, verbatim from the user>", "available": <the list, unchanged>, "skills": <the skills object, unchanged>, "expertsDir": "${CLAUDE_PLUGIN_ROOT}/experts" }`, plus `areas` if the user named some.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present the returned plan and **stop**. Do not write it to disk and do not start work until the user confirms. Two things depend on that stop: the confirmation is the product, and `plan_confirmed` is not yours to set.

Show the user what the experts did, from `expertLane`: which experts were selected and why (`reasons`), whose input is in the plan (`ran`), any consult that failed (`failed`), and which skills each expert was given and why (`skillsLoaded`, `skillReasons`). The input itself is in the plan under "Expert input" and is part of what the user is confirming. If `expertLane.skipped` is set, say so plainly: no expert was consulted, and why.

Once the user has confirmed and the plan file is on disk, record what happened, in code and not from memory. Build a JSON object with `"ok": true` and the `expertLane` exactly as the workflow returned it (do not edit it), and run:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage plan --plan <plan file>`

with that object on standard input. It writes the `experts:` line into the plan's frontmatter, only ever adding to what is there, and leaves an evidence file for each expert that gave input. If `expertLane.skipped` was set there is nothing to record: tell the user, and do not invent an `experts:` line; source edits stay blocked by the experts gate until the user decides. If the user says no expert applies, record that with `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" select --plan <plan file> --add ""`.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
