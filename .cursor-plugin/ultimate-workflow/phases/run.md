# Run: the whole plan, unattended

This is the Full tier of `/ultimate-workflow:feature` on Claude Code, not a command of its own: `feature.md` sends you here. Its arguments are what the user wants built, `--plan <plan file>` for a plan already confirmed, or `--resume [<card>]` to continue an earlier run. The user confirms the plan and the test plan once; after that this command makes **one** Workflow call and presents **one** result. Nothing in between stops for the user, and nothing about the cards is printed into this conversation while they run (progress is in `/workflows`): a long main conversation re-sends its whole context on every turn, which made it 89% of the tokens on a real project.

## 0. Before anything

- **The Workflow tool.** If this host has none (Cursor and the others), say so and follow "Hosts without the Workflow tool" at the end instead.
- **Permissions.** The run's agents edit files and run commands with nobody there to answer a prompt. This session must be in a mode where they run without one: auto mode, or accept-edits with Bash allowed (on `claude -p`: `--permission-mode acceptEdits --allowedTools Bash Workflow Read Write Edit`, as the S0 spike ran). You cannot read the mode itself, so go by evidence: when the Bash commands you have run in this session ran without a prompt, take it as set, say so in one line, and go on. Ask the user to switch only when a command was refused or waited on a prompt; do not start a run that would stall on its first command. Not being able to see the mode is no reason to stop: a headless run has nobody to answer.
- **Headless.** Under `claude -p` the host stops background work 10 minutes after the last turn unless `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` is set. Say so if you are headless and it is not set.

## 1. Plan and test plan (the two stops)

Both are the user's, and the run cannot start without them: `run-start` refuses, before it creates anything, unless the plan's front matter has `plan_confirmed: true` and `tests_confirmed: true` and its `confirmed_hash` (written by `present --confirm tests_confirmed` when the user confirms the test plan) still matches the plan. A plan changed after that, or confirmed by hand with no hash, is refused with the reason; show the user the plan and confirm again. The run's own writes (card status lines, the findings and fix-up cards, `## Run status`) do not count as a change.

**A plan that is already confirmed** (`--plan <file>` names it, its front matter has `plan_confirmed: true` and `tests_confirmed: true`, and it has a `## Cards` section and a Tests subsection per card): both stops already happened; say so in one line and go to section 2. Do not review the plan or the code yourself first, and do not stop for what you expect the run to find: the user confirmed this plan, and judging the code is the run's experts' job. A card that cannot be finished is parked with its diagnosis and the others go on, which is the answer the user gets, in the report. A question here is a third stop the user did not agree to.

Otherwise, unless resuming, follow `${CLAUDE_PLUGIN_ROOT}/commands/plan.md` exactly, with experts, and stop for the user's confirmation. The feature name is the plan file's name without `PLAN-` and `.md` (`PLAN-ledger-fixes.md` is `ledger-fixes`); it names the branches, so it is letters, digits, dot, dash and underscore.

Then split the plan into cards, in code: for each, `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" card-add --plan <plan file> --name <card> --title "<what it does>" --paths "<globs it may change>" [--depends <cards it needs first>]`. A card that needs the running system (a harness) goes first. Cards with no `depends` between them may run in any order; the run keeps plan order.

Then follow `${CLAUDE_PLUGIN_ROOT}/commands/tests.md` exactly, telling the tests phase to write **one subsection of the Tests section per card, headed with the card's name** (`### <card>: <title>`), so the user confirms every card's tests at once. A card with no such subsection is parked by the run as "missing input". Stop for the user's confirmation.

Raise any open question one at a time, each with the issue, what each answer changes, and the pros and cons, as those commands say.

## 2. Set up the run: one command

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" run-start --plan <plan file> --feature <feature>` (add `--implementer-model` / `--diagnoser-model` if the user asked, as in `build.md`; `ULTIMATE_WORKFLOW_BUILD_MODEL` also applies, and every role of the run uses them). Run it as one command and do nothing between it and the Workflow call. It:

- creates `uw/run/<feature>` from the current tip and checks it out (every card is committed there; the user's own branch is never touched; it refuses a branch that already exists: use `--resume`);
- adds `.ultimate-workflow/` to the project's `.gitignore` and commits that one line on the run branch itself, so the run's own files are never committed and git-based scanners skip them. Do not commit it yourself;
- takes the baseline (`verify.js --baseline`). When the suite already fails it prints `needs: "baseline"` with the failing tests: that is the one question this command may still ask. Ask it as `build.md` step 3 says, accept only on the user's yes, then run `run-start` again;
- writes each card's context pack and preflight, chooses its briefs and skills, and writes `.ultimate-workflow/run/run.js` (it runs `experts.js script --phase run` itself). It prints `scriptPath` and `preflightFailed`: tell the user each card that will be parked for missing input, in one line each.

## 3. The one call

Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass arguments yourself and do not edit the script. Tell the user, in two lines, that the run is going and what it does with a card it cannot finish, then **end your turn**. Do not poll, do not read agent transcripts or `git log` while it runs, and do not report per card: the task notification wakes the session when it ends. G3 waits for a running workflow, so ending the turn does not force a test run on half-built code.

Per card the run builds a context pack, writes the tests and proves them red, implements in up to three rounds with a fresh diagnosis after each failure, checks scope from git, runs the experts on the card's diff, and commits through `experts.js card-commit` (the commit gates' own checks, in code). A card that cannot be finished is parked: its work, failing tests included, goes to `uw/parked/<feature>/<card>` with the diagnosis, the tree goes back to the last good commit, and the cards that do not depend on it go on. Two parks in a row for the same reason stop the run. After the last card: the findings card (non-blocking expert findings no card fixed), a review of the whole run, one fix-up card for the confirmed high and medium review findings in the run's files (low ones stay in the report), and the harvest, committed to `uw/harvest/<feature>`.

The plan itself shows where every card is, as it happens: each card's `status:` line in `## Cards` (`pending`, `running`, `committed <sha>`, `fixed-in-round <sha>`, `parked <branch>; <reason>`, `blocked by <card>`, `resumed`) is written by the run's commands, never by an agent's edit, and goes into the card's own commit, or a plan-only commit on the run branch when a card is parked. A card left at `running` is one a run died inside; `run-start --resume` names it.

Call it once. The exception: the run failed before any agent started (0 agents, an argument error); fix the input, rebuild the script, call once more and say so.

## 4. When it returns: one command

**Never present the result from the completion notice**: it is cut off when the result is large. Run, as one command, with the output file the notice names and the run id the Workflow call returned:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" run-finish --output <the Workflow output file> --run-id <wf_...>`

It keeps the output file as `.ultimate-workflow/run/run.result.json`, writes `.ultimate-workflow/run/<feature>/report.md` from it in code, writes a `## Run status` block into the plan (date, run branch, cards per status, harvest branch, report) and commits the plan on the run branch, and adds the ledger row with the agents, tokens and duration the output file holds, and every expert and review finding as a catch, so `/ultimate-workflow:value` shows them. If the output file is missing or the command fails, say so and stop.

Then show the user the report file (a link to open, or the file printed whole; never a summary of it) and add, in a few lines of your own, only what needs their decision: each parked card and its reason, any card blocked by one, files changed outside a card's paths, test files a build claimed that are not in its commit, the findings still open, and the harvest branch to merge or drop. Do not run the tests again, read the diff or check the commits: the run did, and every extra turn re-sends this whole conversation.

Nothing is pushed or merged. The user merges `uw/run/<feature>` when they are satisfied; set `phase: done` in the plan only after that.

## Resume

- `--resume <card>`: `run-start --plan <plan file> --feature <feature> --resume-card <card> --resume-reason "<the user's words>"` checks the run branch out, brings the parked work back onto its tip (`unpark`: it refuses a dirty tree, or work that no longer applies, and says why) and builds the script. The card continues at the implementation with the tests it already wrote and its diagnosis in the context pack; committed cards are skipped, and cards blocked by it run once it is committed. Then sections 3 and 4.
- `--resume` alone: `run-start ... --resume`. Every card not committed runs again from its tests, on the current tip; parked branches stay for reference.

## Hosts without the Workflow tool

Say so. The run falls back to one card per session: run `${CLAUDE_PLUGIN_ROOT}/commands/build.md` for the first card that is not committed, then the experts check, then commit, then write what the next session needs: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" handoff --card <card> --feature <feature> --range <before>..HEAD` and the card's journal lines (`journal add`). Tell the user the next command, `/ultimate-workflow:build` for the next card, in a new session. See "Running the phases here" in `rules/the-ultimate-workflow-guidelines.mdc`.
