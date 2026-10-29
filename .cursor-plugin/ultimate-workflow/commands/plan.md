---
description: Explore the codebase in parallel, draft a plan anchored in what already exists, and collect input from the domain experts that apply. Writes nothing.
argument-hint: "<what you want built>"
---

# Phase: plan

## Before the workflow: find out which experts exist

The workflow script cannot read the filesystem, so the list of domain experts is found here, in code, and written to a file the script is built from. Run `mkdir -p .ultimate-workflow/run`, then:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" list > .ultimate-workflow/run/available.json`

It writes a JSON array, one entry per `agents/uw-expert-*.md`. An empty array is fine and means no expert is installed. If the script prints a problem on stderr, show it to the user: an expert whose file is malformed is left out of the list.

Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" skills --stage plan > .ultimate-workflow/run/skills.json`. It writes a JSON object: for each expert that plans, the skills it may be given, each with a one-line headline and its text. The workflow asks which of them the draft needs, in the same call that chooses the experts, and can only pick from this list.

## Run the phase

1. With the Write tool, write `.ultimate-workflow/run/plan.args.json`: `{ "feature": "<the feature to plan, verbatim from the user>" }`, plus `"areas"` (a list of strings) if the user named some.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" script --phase plan --args-file .ultimate-workflow/run/plan.args.json --file available=.ultimate-workflow/run/available.json --file skills=.ultimate-workflow/run/skills.json`. It writes `.ultimate-workflow/run/plan.js`, which is `phases/plan.js` with those arguments and `expertsDir` built in, and prints its `scriptPath` and the skill names each expert may be offered.
3. Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass the arguments yourself and do not copy or edit the script: the tool will not load a script from the plugin's own folder, and arguments a model retypes are no longer the text the code chose.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.
One exception: if the run failed before any agent started (0 agents, and an input or argument error), fix the input, rebuild the script, call the Workflow tool once more and say so, and note it in the ledger's workarounds. Any other failure stops here and goes to the user.

## When it returns

Present the returned plan and **stop**. Do not write it to disk and do not start work until the user confirms. Two things depend on that stop: the confirmation is the product, and `plan_confirmed` is set to `true` only after the user has confirmed, never to clear a block.

Show the user what the experts did, from `expertLane`: which experts were selected and why (`reasons`), whose input is in the plan (`ran`), any consult that failed (`failed`), and which skills each expert was given and why (`skillsLoaded`, `skillReasons`). The input itself is in the plan under "Expert input" and is part of what the user is confirming. If `expertLane.skipped` is set, say so plainly: no expert was consulted, and why.

Once the user has confirmed and the plan file is on disk, record what happened, in code and not from memory. Build a JSON object with `"ok": true` and the `expertLane` exactly as the workflow returned it (do not edit it), and run:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage plan --plan <plan file>`

with that object on standard input. It writes the `experts:` line into the plan's frontmatter, only ever adding to what is there, and leaves an evidence file for each expert that gave input. If `expertLane.skipped` was set there is nothing to record: tell the user, and do not invent an `experts:` line; source edits stay blocked by the experts gate until the user decides. If the user says no expert applies, record that with `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" select --plan <plan file> --add ""`.


## Record the run in the ledger

Last, after the steps above: save the workflow's result, exactly as returned, to `.ultimate-workflow/run/plan.result.json` (copy it from the tool's output; never retype or edit it), and write `.ultimate-workflow/run/plan.row.json` with the Write tool: `{ "runId": "<the run id>", "agents": <number>, "tokens": <subagent tokens>, "durationMs": <milliseconds>, "plan": "<plan file, if any>", "workarounds": ["<anything you had to do that this command did not say, one line each>"] }`, the numbers from the Workflow tool's result. Leave out a number the result does not show; never estimate one. Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger add --phase plan --row .ultimate-workflow/run/plan.row.json --result .ultimate-workflow/run/plan.result.json`. `/ultimate-workflow:value` reports from it.

Then, for each item in the "Expert input" that corrected the draft (a defect in it, not general advice), record a catch: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger catch --what "<the defect, one line>" --by expert:<name> --stage plan`. It stays unconfirmed until a test or a measurement shows it: when one does, `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger confirm --id <id> --text "<the test that went red, or the measurement>"`, and `refute` with the reason when it is not borne out.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
