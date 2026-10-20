---
description: Write the confirmed tests, prove they fail, implement minimally, loop to green or escalate. The only phase that writes.
argument-hint: "<plan file, or leave empty for the newest>"
---

# Phase: build

## Before the workflow: load the standing briefs

The workflow script cannot read the filesystem, so the briefs are found here, in code. Run:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" brief`

It prints a JSON array of `{ "name", "text" }`, one per expert that declares the `build` stage. Keep it exactly as printed. An empty array is fine and means no expert has a brief. If the script prints a problem on stderr, show it to the user: a brief that is missing or too large is left out.

## Run the phase

Call the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/build.js`
- `args`: a JSON object, not a string: `{ "plan": "<the plan file; omit it to use the most recently modified PLAN-*.md>", "briefs": <the array, unchanged> }`, plus `command` if the user gave a verification command.

Domain experts do not write code. If the plan has an "Expert input" section, the workflow tells the implementer that its constraints are requirements. A standing brief is different: it applies to every build, whether or not the expert was selected at plan time, and it says how to write, never what to build. The experts check the result at review, against what they required.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Report what landed and whether verification is green. Say which briefs were loaded (`briefsLoaded`), so it is visible when none were. If the run escalated, present the blocker with options and **stop** -- do not pick one. Never report green without having seen the verification output.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
