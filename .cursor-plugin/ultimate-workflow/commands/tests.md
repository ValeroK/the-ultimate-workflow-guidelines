---
description: "Draft a test plan, add the cases the selected domain experts need, then attack it from four angles: could an implementation pass all of this and still be wrong? Writes nothing."
argument-hint: "<plan file>"
---

# Phase: tests

## Before the workflow

The plan file is the one the user named. Otherwise, if exactly one `PLAN-*.md` at the repository root is not marked `phase: done`, use it. If several exist and none was named, ask which; never pick by modification time.

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

**Never present it from the Workflow tool's completion notice.** A large result is cut off in that notice, and a section read from the cut-off text is a partial one shown as whole. The notice names the Workflow tool's output file, which holds the complete result. Code writes the section from that file, so it never passes through you. If the notice names no output file, or a command below fails, say so and stop: never summarise the notice, and do not run the phase again.

1. **Write the plan and the Tests section together, whole and decoded, to where they will be shown.** The user confirms the tests against the plan they belong to, so the view holds both. First copy the plan: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" present --from <plan file> --out <where>`; then add the section: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" present --result <the output file> --field testsMarkdown --out <where> --append`. The second command decodes the five HTML entities when the whole text came back escaped, and leaves a section that merely mentions one alone (writing them undecoded once corrupted a plan) and exits non-zero rather than write a partial section. `<where>` is the plan file of plan mode when it is active (on Claude Code call `EnterPlanMode` first if it is not, which asks the user), otherwise `.ultimate-workflow/run/tests.draft.md`.
2. **Tell the user** which experts joined because they always do (`expertLane.added`) and which skills each was given (`expertLane.skillsLoaded`). The section ends with "Expert test cases", one subsection per expert that took part. If `expertLane.failed` is not empty, say which expert's cases are missing. If `expertLane.skipped` is set, say that no expert was consulted, and why. Do not copy the section into chat.
3. **Raise the open questions one at a time**, with the host's ask-user tool, one per turn, never as one list. For each: the issue, what each answer would change, the pros and cons of each option, your recommendation first. Fold each answer into the file before the next question.
4. **Show it and stop.** In plan mode, call `ExitPlanMode`; accepting there is the confirmation. Otherwise read the file step 1 wrote (the draft file, or the plan-mode file when `ExitPlanMode` was the part that failed) and print all of it, not a summary, and ask the user to confirm in chat.
5. **On acceptance, write the plan with the Tests section in it**, from the file that was shown, so any edit the user made in the view (to the plan or to the tests) is kept: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" present --from <the file shown> --out <plan file> --confirm tests_confirmed`. The file shown already holds the plan, so this replaces the plan file with the same plan plus the section; it does not append a second time.

Then record the evidence, with the experts' lane read from the output file and not retyped from the notice:
`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage tests --plan <plan file> --result <the output file>`. `--plan` writes any expert that joined because it always does (quality) into the plan's `experts:` line, so the review and the commit check expect it too. Skip this if `expertLane.skipped` was set.


## Record the run in the ledger

Last, after the steps above: save the workflow's result, exactly as returned (the Workflow tool's output file, wrapper and all: `ledger add` reads the phase result out of the wrapper, so do not unwrap it by hand), to `.ultimate-workflow/run/tests.result.json` (a one-liner that reads the tool's output file is the expected way, and is not a workaround; never retype or edit it), and write `.ultimate-workflow/run/tests.row.json` with the Write tool: `{ "runId": "<the run id>", "agents": <number>, "tokens": <subagent tokens>, "durationMs": <milliseconds>, "plan": "<plan file, if any>", "workarounds": ["<anything you had to do that this command did not say, one line each>"] }`, the numbers from the Workflow tool's result. Leave out a number the result does not show; never estimate one. Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger add --phase tests --row .ultimate-workflow/run/tests.row.json --result .ultimate-workflow/run/tests.result.json`. `/ultimate-workflow:value` reports from it.

Then record what the test plan caught before any code: for each critic gap or expert case that changed the test plan because a check could not fail or a behaviour was untested, `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger catch --what "<the gap, one line>" --by <critic or expert:<name>> --stage tests --unique <yes when only that critic or expert raised it, else unknown>`. It is confirmed later, when the test it added goes red on a real defect.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
