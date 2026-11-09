# Autopilot run: recorded end-to-end runs

The unattended run (PLAN-autopilot.md) run for real, headless, in scratch repositories, with `experts.js usage` read afterwards from each repository's own transcript folder so that a run's numbers are its own session only.

## 2026-11-07: one card against four cards

File: `results/2026-11-07-e2e.json`; the reports, journals, plans and git logs of both runs are under `results/2026-11-07-e2e/`.

Setup: Claude Code 2.1.318 on Windows, `claude -p "/ultimate-workflow:run --plan PLAN-calc.md"` (recorded when the run was its own command; it is now the Full tier of `/ultimate-workflow:feature`, and the same plan runs with `/ultimate-workflow:feature --plan PLAN-calc.md`), session on Sonnet, the plugin from `feat/autopilot` through `--plugin-dir`, `--permission-mode acceptEdits --allowedTools Bash Workflow Read Write Edit`, `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`. Both plans were already confirmed (plan and tests), with `experts: [quality]`. The four-card plan is a small calculator: `add`, `sub`, `parse` (depends on both), `format` (depends on `parse`); the one-card plan is `add` alone.

| | 1 card | 4 cards |
|---|---|---|
| Main conversation tokens | 541,776 | 552,136 |
| Main conversation turns | 10 | 10 |
| All tokens (main and agents) | 2,427,436 | 7,021,000 |
| Main conversation share | 22% | 8% |
| Cards committed | add, findings | add, sub, parse, format, findings, fixup |
| Parked | none | none |
| Session cost reported by `-p` | $1.11 | $3.06 |

**Criterion 1 is met:** the main conversation of the four-card run is 1.02 times that of the one-card run (the rule is at most 1.5). The main conversation does the same ten turns whatever the number of cards: read the plan, `run-start`, one Workflow call, `run-finish`, the report. Every card's work is in the workflow's agents.

What else the runs show:

- The findings card ran in both: the quality expert's non-blocking findings with no later card to take them were fixed before the review. In the four-card run the review confirmed one blocking finding (an untested guard) and the fix-up card added the test (`testsOnly`: the code was already right).
- The journal carried lessons forward: `sub` and `format` reused the error convention `add` recorded (see `quad-journal.md`).
- The harvest committed one proposal to `uw/harvest/calc`, from the run's tip; `main` was never touched; 13 tests pass on `uw/run/calc`.
- The ledger has the run row and three catches (two from the quality expert, one from the test-coverage lens).

Earlier attempts the same day, not recorded here, found and fixed: the main session committing the `.gitignore` line itself and running an experts check on it (now `run-start`), G3 asking for a test run after the run (run-folder writes no longer mark the tree dirty), a fix-up card for a missing test being parked, an absolute claimed path reported as missing, and later cards not held to an expert an earlier recheck added (G6 parked two cards, and the two-parks rule stopped the run, as designed).

## 2026-11-08 to 09: reruns of the unchanged four-card plan

The same `PLAN-calc.md` (plan and tests confirmed, `experts: [quality]`, Tests list one argument's integer guard for `add` and `sub`), in a scratch repository reset to its first commit before each run, with `/ultimate-workflow:feature --plan PLAN-calc.md`. Runs 1 to 3 interactive, the resume and run 4 headless. The plan was never edited between runs: every failure below was the run machinery, and each was fixed with a test before the next run.

| Run | Plugin at | Result | Workflow tokens, agents, time | Found and fixed |
|---|---|---|---|---|
| 1 | b6ec195 | add committed, sub parked on a blocking finding (its `a` guard untested), parse and format blocked | 579k, 31, 4.7 min | the harvest refused the harvester's absolute paths (0c96f54); a parked card's reason in the report kept only its heading line (0c96f54) |
| 2 | 0c96f54 | all four cards and the findings card committed; the review's high finding started a fix-up card whose setup failed, and the run stopped | 1,078k, 50, 7.4 min | `card-add` refused the review's absolute path and said so only on stderr; the run then tried to park a card the plan never had (0156d86) |
| 3 | 0156d86 | add parked on a blocking finding (its `b` guard untested), sub committed, parse and format blocked | 394k, 21, 2.6 min | a missing test in the card's own test file parked the card in three of four runs: the in-card fix round (327dddd) |
| resume | 327dddd, mid-edit | `--resume add` on run 3's branch: add's parked work came back and was committed, then parse and format; harvest committed | 536k | resume works for real; a card committed before statuses existed counted as "none" in the run status (78fe3c4) |
| 4 | 78fe3c4 | all four cards and the findings card committed, review 2 confirmed (both medium, so no fix-up), harvest on `uw/harvest/calc`, `main` untouched, tree clean | 1,093k, 52, 9.6 min | none |

Run 4's files are under `results/2026-11-09-rerun/`. `plan-status-per-commit.txt` shows the plan inside each card's commit: the card itself at `committed`, every earlier card at `committed <sha>`, the later ones at `pending`. The plan on the run branch tip has every card at `committed <sha>` and a `## Run status` block (5 committed).

Run 4 did not exercise the fix round: its experts check found nothing blocking in any card. The scenarios below show it live. It is covered by the stub tests in `evals/experts/run-phase.test.js` (fixed and committed, still blocking, not green, outside the card's paths). Which card a model flags as blocking changes from run to run (`sub` in run 1, `add` in run 3, none in run 4), so a live fix round needs a run where one is flagged.

## 2026-11-09: scenarios for the paths a card can take

Each in its own scratch repository, headless, plugin from `feat/autopilot`. Files under `results/2026-11-09-scenarios/` (the plan given, the plan on the run branch afterwards, the report, the git log).

| Scenario | What it was built to show | What happened | Tokens, agents, time |
|---|---|---|---|
| `fixround`: the calc plan with `add`'s `b` guard test left out of the Tests | the in-card fix round, live | the quality expert rated the missing test blocking; the fix round wrote `add(1, 1.5)` throws naming `b` (`add.test.js.txt`), the fresh check passed, `add` is `fixed-in-round bdf477b8daad` in the plan and has a "Fix rounds" entry in the report and `fixRound: {round: 2, outcome: fixed}` in the ledger; `parse` and `format` ran after it. Mutation check: with the `b` guard deleted from `src/add.js` at that commit, 1 of 3 tests fails | 1,026k, 53, 10.9 min |
| `outside-edited`: one card `cart` calling `src/prices.js` (outside its paths), which prices an unknown item at 0 against a blocking Expert input line | a blocking finding outside the card: park, no round | first attempt: the main session read the code, predicted the finding and stopped to ask, and also stopped because it could not see its own permission mode. Fixed in `phases/run.md` (a confirmed plan goes straight to the run; the mode is judged by whether commands ran without a prompt), with a wording test. Second attempt: the implementer fixed `src/prices.js` itself (reported as out of scope, by design not blocking), so nothing was left to flag. The review then confirmed a high test-coverage finding and the fix-up card added the test: the review fix-up, live | 658k, 30, 5.1 min |
| `outside-frozen`: the same, with the plan saying `src/prices.js` is frozen | as above | the card was parked: "blocking findings from the experts check, outside this card's paths so no fix round" (quality and developer, `src/prices.js:4`), status `parked uw/parked/cart/cart; ...` in the plan, a plan-only commit on the run branch, review and harvest skipped (nothing committed). The plan's status line kept only the reason's heading; fixed in `park` (the whole reason, on one line), with a test | 267k, 12, 2.5 min |

## 2026-11-09: final run, interactive, on the corrected fixture plan

`fixtures/calc-plan.md`: the calc plan with a test for every argument's integer guard and an explicit safe-integer rule (`RangeError` for an argument or result past `Number.MAX_SAFE_INTEGER`, nothing rounded). Run in an interactive `claude --plugin-dir` session in a terminal tab, `--permission-mode acceptEdits --allowedTools Bash Workflow Read Write Edit`. The session went straight from the confirmed plan to `run-start` and the Workflow call, with no question. Files under `results/2026-11-09-final/`.

- All four cards committed, `add` through a fix round (the quality expert found its range tests could not tell an argument failure from a result failure; the round anchored the assertions), then the findings card (three non-blocking findings: `parse` turning a 309-digit operand into `Infinity`, `format` skipping the safe-integer rule) and a fix-up card for the review's two confirmed medium findings (no test at the exact safe limits). The one low review finding stayed in the report.
- The plan on `uw/run/calc`: `add` at `fixed-in-round d8e59ca0c2ce`, the other five at `committed <sha>`, `## Run status` with "1 fixed-in-round, 5 committed"; `plan-status-per-commit.txt` shows the plan inside each commit.
- Harvest: two proposals on `uw/harvest/calc` (`memory/calc.md`, `progress.md`). `main` untouched, tree clean, 24 of 24 tests pass on the run branch.
- 1,694k workflow tokens, 72 agents, 10.1 minutes.
- Found: the report listed the findings card twice under "Out of scope and claims" (it is in the result's cards and again as `findingsCard`); fixed, with a test.

## 2026-11-09: approvals, decisions not in the plan, and notices

Scenario `svc` (`results/2026-11-09-decision/`): three cards, `server` (its Tests say the number comes "through the environment" and name no variable, so any implementation must choose one), `greet` (independent) and `banner` (depends on `server`). Plan confirmed through `present --confirm tests_confirmed`, so it carries a `confirmed_hash`. Headless.

| Step | What happened | Tokens, agents, time |
|---|---|---|
| approvals | On a copy with one Tests line edited after confirmation, `run-start` refused: "the plan changed after the user confirmed it (confirmed_hash 11d09e640b044808, now 225a61914a2bc599)", and created no branch | none |
| `held/`: first run | `server` read `PORT`, which the plan does not name (found in code, and declared by the implementer): held as `needs-decision`, its work on `uw/parked/svc/server`, the decision in the plan. `greet` committed, `banner` blocked by `server`, the review's fix-up card committed. Notices, as they happened: needs-decision, blocked, finished. Found: the report gave no command for a held card, and the `decision:` line repeated its heading (fixed in c3615a2) | 627k, 36, 4.1 min |
| `accept-1/`: `--resume server --accept` | the decision went into the plan's Decisions and the held work came back, but the resumed card declared the accepted decision again and was held a second time. Also the accepted line was the decision cut at 240 characters. Both fixed with tests (16641c9). Every notice recorded `desktop: sent` | 281k, 18, 3.4 min |
| `accept-2/`: `--resume server --accept` again | `server` committed, `banner` unblocked and committed through a fix round, plan: 3 committed, 1 fixed-in-round. The harvest was not committed because `uw/harvest/svc` from the first run still existed (by design: merge or delete it first) | 549k, 30, 3.7 min |

### `--resume <card>` without `--accept`

| Step | What happened | Tokens, agents, time |
|---|---|---|
| attempt 0, `svc` from the held state | stopped before its run, rightly: the Run status block names the run's report, which the pack read as a cited document (missing, so `banner` would have parked); and `run-start` had cleared the held decision, so a second call would have taken the accept path and brought the unaccepted `PORT` work back. Both fixed with tests (26a546c), and a resume pack now rebuilds `parked.md` from the parked commit | none |
| `rerun-1/`, `svc` | `server` ran again within the plan, could not go green (the plan's Tests need an environment variable, so it cannot be done without the decision), and was parked "not green" with its decision hidden. Fixed with a test (3778bdd): a held card that cannot be done within the plan goes back to `needs-decision` | 296k, 17, 3.7 min |
| `rerun-2-edge/`, `svc` | the edge case, live: told not to read `PORT`, the test writer could not write a test for "configured through the environment", and the card went back to `needs-decision` with the decision and why ("tests did not fail first"), notified, not committed, no loop; `banner` blocked again, `greet` untouched | 157k, 11, 1.5 min |
| `rerun-variant/`, a variant whose `server` can be done within the plan (`listenOn(3000)` is `3000`) | the held state was made by writing a change that reads `PORT` and running the real `decisions` detector and `park --needs-decision` on it; then `--resume server` live: `server` re-ran from its tests and committed with no environment read (`server.js.txt`: `listenOn(port = 8080)`), the plan has `committed 340f785adf5e`, no `decision:` line and nothing about `PORT` in Decisions, the report says the held work on `uw/parked/svc/server` is superseded and kept for reference (the branch is kept); `greet` and `banner` committed, 5 of 5 tests, `main` untouched | 805k, 45, 9.9 min |

The `resumed` notice (added after these runs) was fired live by `run-start --resume-card server` on a copy of the held `svc` repository: `desktop: sent`.

Notices reach the user at the desktop app or a terminal on the session's machine (a Windows toast here; `desktop: sent` is the toast call's exit status, not proof anyone saw it). Nothing inside a running workflow reaches a phone over Remote Control; the main session's PushNotification after `run-finish` does, and in these headless runs Remote Control was not connected, so it went nowhere.

Not covered: Remote Control, larger plans, other models.
