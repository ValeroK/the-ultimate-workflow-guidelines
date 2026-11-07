---
description: Plan, confirm, test plan, confirm, then build every card of the plan unattended in one background run - each card tested, implemented, verified, expert-checked and committed to its own branch, or parked with its diagnosis - then review and harvest, and one final report. Nothing stops for the user after the second confirmation.
argument-hint: "<what you want built> | --resume [<card>] [--plan <plan file>]"
---

# Run: the whole plan, unattended

`$ARGUMENTS` is what the user wants built, or `--resume` to continue an earlier run. The user confirms the plan and the test plan once; after that this command makes **one** Workflow call and presents **one** result. Nothing in between stops for the user, and nothing about the cards is printed into this conversation while they run (progress is in `/workflows`): a long main conversation re-sends its whole context on every turn, which made it 89% of the tokens on a real project.

## 0. Before anything

- **The Workflow tool.** If this host has none (Cursor and the others), say so and follow "Hosts without the Workflow tool" at the end instead.
- **Permissions.** The run's agents edit files and run commands with nobody there to answer a prompt. This session must be in a mode where they run without one: auto mode, or accept-edits with Bash allowed (on `claude -p`: `--permission-mode acceptEdits --allowedTools Bash Workflow Read Write Edit`, as the S0 spike ran). If you cannot tell, or it is not, say so before the run and ask the user to switch; do not start a run that would stall on its first command.
- **Headless.** Under `claude -p` the host stops background work 10 minutes after the last turn unless `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` is set. Say so if you are headless and it is not set.

## 1. Plan and test plan (the two stops)

Unless resuming, follow `${CLAUDE_PLUGIN_ROOT}/commands/plan.md` exactly, with experts, and stop for the user's confirmation. The feature name is the plan file's name without `PLAN-` and `.md` (`PLAN-ledger-fixes.md` is `ledger-fixes`); it names the branches, so it is letters, digits, dot, dash and underscore.

Then split the plan into cards, in code: for each, `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" card-add --plan <plan file> --name <card> --title "<what it does>" --paths "<globs it may change>" [--depends <cards it needs first>]`. A card that needs the running system (a harness) goes first. Cards with no `depends` between them may run in any order; the run keeps plan order.

Then follow `${CLAUDE_PLUGIN_ROOT}/commands/tests.md` exactly, telling the tests phase to write **one subsection of the Tests section per card, headed with the card's name** (`### <card>: <title>`), so the user confirms every card's tests at once. A card with no such subsection is parked by the run as "missing input". Stop for the user's confirmation.

Raise any open question one at a time, each with the issue, what each answer changes, and the pros and cons, as those commands say.

## 2. Set up the run

1. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ensure-ignored`: `.ultimate-workflow/` goes into the project's `.gitignore`, so the run's own files are never committed and git-based scanners skip them.
2. **The baseline**, as `build.md` step 3 says (`verify.js --baseline --plan <plan file>`). If the suite already fails, that is the one question this command may still ask, and it is asked now, before the run.
3. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" run-branch --feature <feature>`: creates `uw/run/<feature>` from the current tip and checks it out. Every card is committed there and the user's own branch is never touched; parked and harvest branches start from it. It refuses when the branch already exists (an earlier run: use `--resume`).
4. With the Write tool, write `.ultimate-workflow/run/run.args.json`: `{ "plan": "<plan file>", "feature": "<feature>" }`, plus `"implementerModel"` / `"diagnoserModel"` if the user asked (as in `build.md`; `ULTIMATE_WORKFLOW_BUILD_MODEL` also applies). Every role of the run uses these.
5. `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" script --phase run --args-file .ultimate-workflow/run/run.args.json`. It reads the plan, writes each card's context pack (`.ultimate-workflow/run/<feature>/cards/<card>/context.md`) and runs its preflight, chooses each card's briefs and skills, and writes `.ultimate-workflow/run/run.js` with all of it built in. It prints `scriptPath`. Tell the user any card whose preflight failed (it will be parked with that reason) in one line each.

## 3. The one call

Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass arguments yourself and do not edit the script. Tell the user, in two lines, that the run is going and what it does with a card it cannot finish, then **end your turn**. Do not poll, do not read agent transcripts or `git log` while it runs, and do not report per card: the task notification wakes the session when it ends. G3 waits for a running workflow, so ending the turn does not force a test run on half-built code.

Per card the run builds a context pack, writes the tests and proves them red, implements in up to three rounds with a fresh diagnosis after each failure, checks scope from git, runs the experts on the card's diff, and commits through `experts.js card-commit` (the commit gates' own checks, in code). A card that cannot be finished is parked: its work, failing tests included, goes to `uw/parked/<feature>/<card>` with the diagnosis, the tree goes back to the last good commit, and the cards that do not depend on it go on. Two parks in a row for the same reason stop the run. After the last card: the findings card (non-blocking expert findings no card fixed), a review of the whole run, one fix-up card for a confirmed blocking review finding, and the harvest, committed to `uw/harvest/<feature>`.

Call it once. The exception: the run failed before any agent started (0 agents, an argument error); fix the input, rebuild the script, call once more and say so.

## 4. When it returns

**Never present the result from the completion notice**: it is cut off when the result is large. Save the Workflow tool's output file, as returned, to `.ultimate-workflow/run/run.result.json` (a one-liner that reads the output file), then write the report from it in code:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" run-report --result .ultimate-workflow/run/run.result.json`

It writes `.ultimate-workflow/run/<feature>/report.md` and prints the counts. If the output file is missing or either command fails, say so and stop. Show the user the report file (open it, or print it whole; never a summary of it) and add, in your own words, only what needs their decision: each parked card and its reason, any card blocked by one, files changed outside a card's paths, test files a build claimed that are not in its commit, the findings still open, and the harvest branch to merge or drop.

Then record the run in the ledger: write `.ultimate-workflow/run/run.row.json` with the Write tool, `{ "runId", "agents", "tokens", "durationMs", "plan", "workarounds" }` from the Workflow tool's result (leave out a number it does not show), and run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger add --phase run --row .ultimate-workflow/run/run.row.json --result .ultimate-workflow/run/run.result.json`. It records the run and, from the result, every expert finding of every card and every review finding as a catch, so `/ultimate-workflow:value` shows them.

Nothing is pushed or merged. The user merges `uw/run/<feature>` when they are satisfied; set `phase: done` in the plan only after that.

## Resume

- `--resume <card>`: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" unpark --plan <plan file> --card <card> --feature <feature>` brings the parked work back onto the run branch's tip (it refuses a dirty tree, or work that no longer applies, and says why). Write `run.args.json` with `"resume": { "card": "<card>", "testFiles": <unpark's testFiles>, "reason": "<the user's words>" }` and go on from step 2.3 (`run-branch` checks the run branch out again, or reuses it): the card continues at the implementation with the tests it already wrote and its diagnosis in the context pack; committed cards are skipped, and cards blocked by it run once it is committed.
- `--resume` alone: `"resume": { "all": true }`. Every card not committed runs again from its tests, on the current tip; parked branches stay for reference.

## Hosts without the Workflow tool

Say so. The run falls back to one card per session: run `${CLAUDE_PLUGIN_ROOT}/commands/build.md` for the first card that is not committed, then the experts check, then commit, then write what the next session needs: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" handoff --card <card> --feature <feature> --range <before>..HEAD` and the card's journal lines (`journal add`). Tell the user the next command, `/ultimate-workflow:build` for the next card, in a new session. See "Running the phases here" in `rules/the-ultimate-workflow-guidelines.mdc`.
