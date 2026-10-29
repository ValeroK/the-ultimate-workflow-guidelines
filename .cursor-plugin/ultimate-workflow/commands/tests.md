---
description: "Draft a test plan, add the cases the selected domain experts need, then attack it from four angles: could an implementation pass all of this and still be wrong? Writes nothing."
argument-hint: "<plan file>"
---

# Phase: tests

## Before the workflow

The plan file is the one the user named. Otherwise, if exactly one `PLAN-*.md` exists at the repository root, use it. If several exist and none was named, ask which; never pick by modification time.

Find the experts, in code:

1. `mkdir -p .ultimate-workflow/run`, then `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" list > .ultimate-workflow/run/available.json` writes the available experts as JSON.
2. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" read --plan <plan file>` prints the experts the plan selected. Pass its `experts` as `experts`. If the plan has none recorded (`present` is false), pass an empty list and tell the user that planning did not record a decision.
3. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" skills --stage tests --plan <plan file> > .ultimate-workflow/run/skills.json` writes, for each expert that joins the tests stage, the skill texts chosen from the plan. Show the user anything it prints on stderr.

An expert marked `always: [tests]` (the quality expert) joins this stage whether or not the plan selected it, because every test plan is about tests. The workflow adds it and reports it in `expertLane.added`.

## Run the phase

1. With the Write tool, write `.ultimate-workflow/run/tests.args.json`: `{ "plan": "<plan file>", "experts": <the plan's experts, from step 2> }`, plus `"angles"` if the user gave some.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" script --phase tests --args-file .ultimate-workflow/run/tests.args.json --file available=.ultimate-workflow/run/available.json --file skills=.ultimate-workflow/run/skills.json`. It writes `.ultimate-workflow/run/tests.js` with those arguments and `expertsDir` built in, and prints its `scriptPath`.
3. Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass the arguments yourself and do not copy or edit the script: the tool will not load a script from the plugin's own folder, and arguments a model retypes are no longer the text the code chose.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.
One exception: if the run failed before any agent started (0 agents, and an input or argument error), fix the input, rebuild the script, call the Workflow tool once more and say so, and note it in the ledger's workarounds. Any other failure stops here and goes to the user.

## When it returns

Present the returned Tests section and **stop**. Negotiating "how would we know this works" is cheaper on paper than on code that already exists. `tests_confirmed` is set only after the user actually confirms.

The section ends with "Expert test cases", one subsection per expert that took part. Say which experts joined because they always do (`expertLane.added`) and which skills each was given (`expertLane.skillsLoaded`). If `expertLane.failed` is not empty, say which expert's cases are missing. If `expertLane.skipped` is set, say that no expert was consulted, and why.

Once the user has confirmed and the Tests section is in the plan file, record the evidence: build a JSON object with `"ok": true` and the `expertLane` exactly as returned, and run
`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage tests --plan <plan file>` with it on standard input. `--plan` writes any expert that joined because it always does (quality) into the plan's `experts:` line, so the review and the commit check expect it too. Skip this if `expertLane.skipped` was set.


## Record the run in the ledger

Last, after the steps above: save the workflow's result, exactly as returned, to `.ultimate-workflow/run/tests.result.json` (copy it from the tool's output; never retype or edit it), and write `.ultimate-workflow/run/tests.row.json` with the Write tool: `{ "runId": "<the run id>", "agents": <number>, "tokens": <subagent tokens>, "durationMs": <milliseconds>, "plan": "<plan file, if any>", "workarounds": ["<anything you had to do that this command did not say, one line each>"] }`, the numbers from the Workflow tool's result. Leave out a number the result does not show; never estimate one. Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger add --phase tests --row .ultimate-workflow/run/tests.row.json --result .ultimate-workflow/run/tests.result.json`. `/ultimate-workflow:value` reports from it.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
