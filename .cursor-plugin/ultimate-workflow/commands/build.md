---
description: Write the confirmed tests, prove they fail, implement minimally, loop to green or escalate. The only phase that writes.
argument-hint: "<plan file; required if more than one PLAN-*.md exists>"
---

# Phase: build

## Before the workflow: the plan, then the standing briefs and their skills

1. **The plan file.** The one the user named. Otherwise, if exactly one `PLAN-*.md` exists at the repository root, use it. If several exist and none was named, ask which; never pick by modification time.
2. **The briefs.** The workflow script cannot read the filesystem, so the briefs, and the skills each one selects for this plan, are found here, in code. Run:

   `mkdir -p .ultimate-workflow/run`, then `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" brief --plan <plan file> > .ultimate-workflow/run/briefs.json`. When the plan is split into cards and this build is one of them, add `--section "<the card's heading>"`: the skills are then chosen from that card's section, so a brief another card needs (a CI job, a migration) does not load here.

   It writes a JSON array of `{ "name", "text", "skills" }`, one per expert that declares the `build` stage; `skills` holds the skill texts chosen from the files and text of the plan. An empty array is fine and means no expert has a brief. Show the user anything the script prints on stderr: a brief that is missing or too large is left out, a skill that did not fit is named, and a plan that names no file gets only the skills every build gets.

## Run the phase

1. With the Write tool, write `.ultimate-workflow/run/build.args.json`: `{ "plan": "<the plan file from step 1>" }`, plus `"command"` if the user gave a verification command.

   **Resuming after a stop at the test step.** If an earlier build stopped because some new tests passed before the implementation, and the user has decided those are acceptable (for example a guard shown rejecting a bad sample), add `"resumeAt": "implement"`, `"resumeReason": "<the user's decision, in their words>"`, `"testFiles": [<the test files already written>]` and `"command"`. The test step is skipped on record and the result says so. Never use it without the user's decision.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" script --phase build --args-file .ultimate-workflow/run/build.args.json --file briefs=.ultimate-workflow/run/briefs.json`. It writes `.ultimate-workflow/run/build.js` with those arguments built in, and prints its `scriptPath`.
3. Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass the arguments yourself and do not copy or edit the script: the tool will not load a script from the plugin's own folder, and arguments a model retypes are no longer the text the code chose.

Domain experts do not write code. If the plan has an "Expert input" section, the workflow tells the implementer that its constraints are requirements. A standing brief is different: it applies to every build, whether or not the expert was selected at plan time, and it says how to write, never what to build. The experts check the result at review, against what they required.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Report what landed and whether verification is green. Say which briefs and skills were loaded (`briefsLoaded`, `skillsLoaded`), so it is visible when none were. If the run escalated, present the blocker with options and **stop** -- do not pick one. Never report green without having seen the verification output.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
