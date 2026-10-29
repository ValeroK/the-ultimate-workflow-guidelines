---
description: Read the plan, the diff, and what is already recorded; propose what is worth keeping. Writes nothing.
argument-hint: "[feature name]"
---

# Phase: harvest

Optional feature name. If empty, harvest the current branch against its merge base.

1. With the Write tool, write `.ultimate-workflow/run/harvest.args.json`: `{ "scope": "<the feature name, or the current branch>" }`, plus `"range"` if the branch's merge base is not `origin/main` (for example `<merge base>..HEAD`).
2. Run `mkdir -p .ultimate-workflow/run` if needed, then `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" script --phase harvest --args-file .ultimate-workflow/run/harvest.args.json`. It writes `.ultimate-workflow/run/harvest.js` with those arguments built in, and prints its `scriptPath`.
3. Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass the arguments yourself and do not copy or edit the script: the tool will not load a script from the plugin's own folder, and arguments a model retypes are no longer the text the code chose.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present the proposals grouped by destination and **stop**. Apply nothing without the user accepting it -- a proposal you have to accept is a proposal you actually read.


## Record the run in the ledger

Last, after the steps above: save the workflow's result, exactly as returned, to `.ultimate-workflow/run/harvest.result.json` (copy it from the tool's output; never retype or edit it), and write `.ultimate-workflow/run/harvest.row.json` with the Write tool: `{ "runId": "<the run id>", "agents": <number>, "tokens": <subagent tokens>, "durationMs": <milliseconds>, "plan": "<plan file, if any>", "workarounds": ["<anything you had to do that this command did not say, one line each>"] }`, the numbers from the Workflow tool's result. Leave out a number the result does not show; never estimate one. Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger add --phase harvest --row .ultimate-workflow/run/harvest.row.json --result .ultimate-workflow/run/harvest.result.json`. `/ultimate-workflow:value` reports from it.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
