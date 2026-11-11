# PLAN: run-fixes (draft)

> Draft, not confirmed. Written 2026-11-11 from the unattended run of `PLAN-memory-index.md`
> (six Workflow runs, plugin 4.7.0 then 4.7.1). It lists what the run itself got wrong, as input for
> `/ultimate-workflow:plan`. It has no front matter on purpose: it is not a plan a run can start.
>
> Each item says what happened, where, and what was done by hand to get past it. Line numbers are
> those of the installed copy named in the item.

## Fixed in 4.7.1 (listed so the tests are not forgotten)

1. **Bare `--resume` skipped parked cards.** `phases/run.js` (4.7.0, about line 326) kept `RESUME`
   only when `args.resume.card` was a string, so `{all: true}` became null and every parked card
   stayed parked. A whole run built nothing (31,250 tokens).
2. **A plan in a subfolder was part of the change fingerprint.** `experts.js` (4.7.0, line 682):
   `':(exclude)PLAN-*.md'` matches the repo root only. `record --stage review` writes the plan after
   the experts' evidence is taken, so gate G6 refused every commit. `mirrors.test.js` forbids a
   plan outside `internal/`, so this repo could not run 4.7.0 with the plan in either place.
3. **The park reason said "card-commit printed nothing"** when card-commit had printed
   `{"ok":false,"gate":"G6","reason":...}`.

## Open

4. **Gate G6 asks for the experts of every card that shares a changed file.** `experts.js`
   (4.7.1, about lines 643-669, `commitEvidence` at 1232) takes all cards whose paths cover the
   changed files and requires the union of their experts. The run's expert lane for a card runs
   only that card's own `experts:` line. A card that touches a file another card also lists, with
   different experts, can never be committed by the run. Worked around by giving all cards the
   same `experts:` line.
5. **A failed expert agent is not retried, and the card still goes to card-commit.** One agent
   ended without its structured result (`completed without calling StructuredOutput`); the lane
   recorded `failed: ["genai"]`, the run went on, and G6 refused ("no review from genai covers
   these changes"). A transient agent failure cost the whole card (resume 4, card match).
6. **A card the run adds is written after the `### Card` subsections.** `card-add` appends the
   `- fixup:` and `- findings:` entries at the end of `## Cards`, after the per-card subsections,
   where the confirmed-hash code no longer drops run-written lines. The next `run-start` refuses:
   "the plan changed after the user confirmed it". Moved into the card list by hand, twice
   (`d1342c6`, `8580400`); the hash came back both times.
7. **`unpark` shows git's first stderr line as its reason.** "card match's parked work does not
   apply on the current tip: Applied patch to ... autopilot.js cleanly." The real cause was a
   conflict in another file (a fix-up card had changed `lib/memory.js` after the card was parked).
8. **A second fix-up card cannot be added.** "the fixup card could not be added to the plan:
   card-add printed nothing", because a card named `fixup` already exists from an earlier run of
   the same feature. Seven confirmed review findings were left unfixed; they became a hand-written
   card (`fixes`) in the plan. The reason is also lost again ("printed nothing").
9. **A second harvest in one feature has nowhere to go.** "uw/harvest/memory-index already exists:
   merge or delete it before harvesting this feature again". Four proposals were dropped. The
   branch was renamed by hand to `uw/harvest/memory-index-1`.
10. **Review, fix-up and harvest run while cards are parked or blocked.** They then run again
    after the resume: the cost is paid twice, and items 8 and 9 follow from it.
11. **The park reason is cut at about 300 characters** in `report.md` and in the card's `status:`
    and `parked:` lines, mid-sentence and before the numbers. The full text is only in
    `notifications.md`.
12. **One notification per card and per blocked card.** The toasts come from the run's own
    `notify` steps; only `ULTIMATE_WORKFLOW_NOTIFY=off` in the app's environment silences them.
    Wanted: at most one when a run ends or stops.
13. **A card can be parked after one round.** "Verification failed 1 times. Stopping." The
    diagnoser judged it an owner decision, which was right both times, but `run.md` describes
    three rounds.
14. **`volatile_paths` does not reach a plan in a subfolder.** `state.js` `isPlanName` and
    `readState` accept a bare `PLAN-*.md` in the project root only, so the active-plan pointer is
    never written for `internal/plans/PLAN-x.md`.
15. **`run-start` made no `.gitignore` commit** though `run.md` says it commits that line
    (`.ultimate-workflow/` was already ignored here). The guide or the code should say which.
16. **The plan's test lines were never measured against the plan's own cards.** Two parks were
    contradictions inside the confirmed plan: the `experts/` byte budget (not mentioned in the
    plan) and "every pack under 15,000" (the docs card's required documents alone are 15,646).
    A dry run of the measurable claims at the tests stage would have caught both before the run.

## Cost, for scale

Six Workflow runs: 229,076 + 31,250 + 826,500 + 961,108 + 3,535,826 + 1,940,185 tokens, about 2.5
hours, for three of seven cards. Items 1, 2, 4, 5 and 6 each cost at least one whole run.
