# Autopilot run: recorded end-to-end runs

`/ultimate-workflow:run` (PLAN-autopilot.md) run for real, headless, in scratch repositories, with `experts.js usage` read afterwards from each repository's own transcript folder so that a run's numbers are its own session only.

## 2026-11-07: one card against four cards

File: `results/2026-11-07-e2e.json`; the reports, journals, plans and git logs of both runs are under `results/2026-11-07-e2e/`.

Setup: Claude Code 2.1.318 on Windows, `claude -p "/ultimate-workflow:run --plan PLAN-calc.md"`, session on Sonnet, the plugin from `feat/autopilot` through `--plugin-dir`, `--permission-mode acceptEdits --allowedTools Bash Workflow Read Write Edit`, `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`. Both plans were already confirmed (plan and tests), with `experts: [quality]`. The four-card plan is a small calculator: `add`, `sub`, `parse` (depends on both), `format` (depends on `parse`); the one-card plan is `add` alone.

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

Not covered: interactive sessions (only `-p`), Remote Control, a card that is parked and resumed for real (covered by unit tests only), larger plans, other models.
