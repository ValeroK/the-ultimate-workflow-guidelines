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

The fix round was not exercised live: run 4's experts check found nothing blocking in any card, so it had nothing to fix. It is covered by the stub tests in `evals/experts/run-phase.test.js` (fixed and committed, still blocking, not green, outside the card's paths). Which card a model flags as blocking changes from run to run (`sub` in run 1, `add` in run 3, none in run 4), so a live fix round needs a run where one is flagged.

Not covered: Remote Control, the in-card fix round live (stub tests only), larger plans, other models.
