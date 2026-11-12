---
phase: plan
plan_confirmed: true
tests_confirmed: false
test_command: node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
test_related_command: node --test {tests}
full_suite_paths: .cursor-plugin/ultimate-workflow/hooks/**, .cursor-plugin/ultimate-workflow/experts/*.js, .cursor-plugin/ultimate-workflow/phases/*.js, .cursor-plugin/ultimate-workflow/lib/*.js
volatile_paths:
verify_rounds: 0
last_verify: unrun
dirty: false
escalated: false
experts: [developer, quality, softarch, security, genai, architect, devops]
---

# PLAN: run-fixes (part of 4.8.0)

Project root: `C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines`. Every path below is relative to it. Plugin payload: `.cursor-plugin/ultimate-workflow/` (written `<P>/` below).

**Read this first.** These fixes ship inside 4.8.0, not as a 4.9.0 (the owner's choice, 2026-11-12). 4.8.0 is not merged or tagged yet. This plan is built on branch `uw/run/memory-index`, after its last hand work is committed (the `docs` card, the `experts/` limit raise and the review fixes the run session is doing now; the uncommitted edits in the working copy are that work). The run starts from a clean, named commit. Check each line number again at build against that commit.

## Feature description and goal

The first unattended run (`PLAN-memory-index.md`, six Workflow runs, about 7.5 million tokens for three of seven cards) hit 16 faults in the plugin itself. Items 1 to 3 shipped in 4.7.1. This plan fixes items 4 to 16 and ships them inside 4.8.0.

Goal: a run with shared files, a parked card, a failed expert agent and a second resume ends without a fix by hand, and each step is paid for once.

The size limit of `experts/` is raised in 4.8.0 itself (code part from 60 KB to 100 KB, asked by the user), so it is not a card here.

The user also asked that the run can add more than one fix-up card when needed (2026-11-12): across runs, and within one run when the findings fall under different cards.

**This plan is run by 4.8.0, which still has these faults.** So the plan is written to avoid them:

- No card has its own `experts:` line. All cards use the plan's line (fault 4).
- `## Cards` holds the list only. Card details are in `## Card details`, outside it, so a card the run adds lands inside the list and the confirmed hash holds (fault 6).
- No card is named `fixup` or `findings` (fault 8).
- Cards that share a file are chained with `depends`, so a parked card does not meet a changed file on resume (fault 7).

## Goal / success criteria

Each line can be checked by a test or by reading one output.

1. **limit**: the `experts/` budget test passes with the new code of this plan in place (the limit itself is raised in 4.8.0).
2. **plan-subfolder**: with the only plan at `internal/plans/PLAN-x.md` and the pointer set, `readState(root)` returns that file and its `volatile_paths`. `setActivePlan(root, 'internal/plans/PLAN-x.md')` returns true. A pointer with `..` or an absolute path is ignored.
3. **gate-card**: two cards share a file and name different experts. `card-commit --card A` with only A's experts on record is allowed. A commit by hand (no card named) still asks for both. A card added by the run carries an `experts:` line, so G6 asks for what the run's lane ran and not the plan's full list. A file the owner accepted for card A with `--accept` (outside every card's paths) is judged by A's experts, not the plan's full line.
4. **card-add**: a plan with `### Card` subsections under `## Cards` keeps the same `confirmHash` after `card-add`. When `fixup` exists, the next one is `fixup-2`, and the hash still holds. A refused `card-add` gives its own reason to the report, not "printed nothing".
4b. **many-fixups**: confirmed findings in files of two plan cards make two fix-up cards in one run, each with a free name and the `experts:` line of its plan card. Findings in a file no card covers go to one more card with the plan's line. One fix-up card that parks does not stop the others.
5. **expert-retry**: an expert agent that returns nothing is run once more. If it fails again the card is parked with the expert's name, and `card-commit` is not called.
6. **settle-first**: with one card parked or blocked, the run does no review, no fix-up card and no harvest, and the report says which cards they wait for. With all cards committed they run once.
7. **harvest-name**: when `uw/harvest/<feature>` exists, the next harvest goes to the next free name and returns `ok: true`.
8. **reasons**: a 900-character park reason is whole in `report.md`. The plan's `status:` and `parked:` lines end at a word and name `parked.md`. `unpark` on a real conflict names the file in conflict.
9. **one-notice**: a run with two parked cards, blocked cards and a stop fires one desktop notification. `notifications.md` still holds every notice.
10. **dry-run**: before the tests are confirmed, a command prints each card's pack size against the budget and each `measure:` line with the real number. A line it cannot read is reported as "not understood", never as passing.
11. **report-cost**: `report.md` has a pack column and a tokens column per card. A card with no token data shows "unknown", not 0.
12. **run-md**: `run.md` says a card can be parked after one round and why, and says the `.gitignore` commit happens only when the line was missing. A test fails if the text drifts back.
13. **release**: the version stays 4.8.0 (the five fields and `mirrors.test.js` 239-248 already say it), the 4.8.0 entry of `CHANGELOG.md` gains a section for these fixes, and the full `test_command` is green.

## Files explored

| Path | Why it matters |
|---|---|
| `internal/plans/PLAN-run-fixes.md` | The draft with items 1 to 16. This plan replaces it at the same path. |
| `evals/security-expert/provenance.test.js` (137-151) | The `experts/` limit: `60 * 1024 + experts.length * 40 * 1024` bytes, without `skills/`. `PLAN-memory-index.md` line 216 gives it as 430,080. This is the limit the user wants raised. |
| `evals/experts/lib/contract.js` (46, 194) and `evals/experts/docs.test.js` (132) | A different limit: 60 KB per expert folder. Not touched. `docs.test.js` checks the literal text `BYTE_BUDGET = 60 * 1024`. |
| `<P>/experts/experts.js` | `confirmHash` (494-519, drop rule at 513: `/^(findings|fixup)$/i`). `effectiveExperts` (638-670: union over every covering card at 657-668, falls back to the plan's line at 664 when a card has no field). `commitEvidence` (1236). `card-add` CLI (1637-1665). |
| `<P>/experts/cards.js` | `addCard` (140-171): refuses a taken name at 148, inserts at the end of the whole `## Cards` section at 166-169. `cardsRange` (37) ends at the next heading of the same or higher level, so `###` subsections are inside it. |
| `<P>/experts/autopilot.js` | `git` helper (61). `notify` (357-374) and `desktopNotify` (376). `park` (602, cut at 240 on line 638). `unpark` (661, first stderr line on 675). `cardCommit` (735, calls `commitEvidence` at 751 and `readState(cwd)` at 747). `harvestBranch` (802, refuses at 840-842). `runReport` (878, row at 881 already adds the pack size to the Note cell). `runStart` commits `.gitignore` only when `ensureIgnored` added the line (978-985). `ensureIgnored` (1077). `COMMANDS` (1153). |
| `<P>/phases/run.js` | Build loop copy (from line 49, held equal to `build.js` by a test): stops at round 1 when the diagnosis says the test may be wrong (244), stops on the same signature twice (257). `expertsCheck` (about 480-545): `failed` at 512, no retry. `parkCard` cut at 300 (607). `runCard`: parks only when every expert failed (755), else goes on to `card-commit` (811-819). Notify steps at 602, 696, 698, 894, 898, 1042. `adhocCard` (903-922): no `--experts`, hard name. Findings card (925), review (935), `adhocCard('fixup', ...)` (980), harvest (1024). |
| `<P>/phases/run.md` (30, 38, 44) | Says the `.gitignore` line is always committed, "up to three rounds", harvest goes to `uw/harvest/<feature>`, and the user hears of every blocker as it happens. |
| `<P>/hooks/lib/state.js` | `listPlanFiles` (84) reads one folder. `isPlanName` (110) refuses a slash. `pointedPlanFile` (118), `setActivePlan` (126), `newestPlanFile` (134), `readState` (226). |
| `<P>/lib/pack.js` | `DEFAULT_BUDGET = 15000`, `budgetOf`, `assemble` returns `tokens`, `budget`, `overBudget`. Reused by the dry run. |
| `<P>/experts/usage.js`, `<P>/experts/ledger.js` | Token numbers. `usage.js` has `scan` and `summarize`. Grepped only, not read. |
| `evals/experts/*.test.js` | Where tests of `lib/` and `autopilot.js` live (`autopilot.test.js`, `autopilot-fixes.test.js`, `run-phase.test.js`, `pack-budget.test.js`, `memory.test.js`, `links.test.js`). A test outside the quoted globs is not run. |
| `<P>/memory/hooks-and-gates.md`, `<P>/memory/workflows-authoring.md` | Rules the readers reported: gates fail open, a command must print one JSON line with `ok`, a `null` from `parallel()` is a failure, a phase script has no file access and may not use `Date.now()` or `Math.random()`. |
| `.ultimate-workflow/run/memory-index/report.md` | An earlier report: `fixup` "not started ... card-add printed nothing", and seven confirmed findings listed under Review. |

Not read: `<P>/commands/tests.md`, `<P>/phases/tests.js` (grep found no budget or measure logic in it), `experts.js present`, the script generator (`script --phase run`), `ledger.js`, `<P>/memory/mirrors.md`, `mirrors.test.js`, the `fail` helper of the `experts.js` CLI.

## Existing-design review

What is there, and what each card reuses.

- **Commands print one JSON line with `ok`.** The script reads that line; an agent does not see exit codes. Reused by every new or changed command. `card-add` must follow it on refusal too: today the report says "card-add printed nothing" though `addCard` throws a clear reason (`cards.js` 148).
- **Git through one helper.** `autopilot.js` `git(cwd, args, {env, allowFail})` at line 61. Reused for the free harvest branch name. No new git wrapper.
- **One source of gate evidence.** `experts.commitEvidence` feeds `hooks/gate.js`, `hooks/status.js`, `card-commit` and the CLI. Card `gate-card` adds one optional argument to it and to `effectiveExperts`. It does not write a second G6.
- **Card text is edited only in `cards.js`.** `addCard`, `setField`, `parseCards`, `covers`. Card `card-add` changes where `addCard` inserts. It does not add a second writer.
- **The confirmed hash drops what the run writes.** `confirmHash` drops run fields and the cards named `findings` and `fixup`, but only while the current heading is `Cards`. The fix keeps this rule and adds `fixup-2`, `findings-2` and so on to the name test.
- **Pure logic in `<P>/lib/`.** `PLAN-memory-index.md` put new code there to stay under the `experts/` limit. This plan adds two files: `lib/run-rules.js` (free name, short reason at a word end, reading a failed `git apply`, the experts of one card) and `lib/claims.js` (reading and judging `measure:` lines). Callers in `experts/` stay thin.
- **Pack numbers.** `lib/pack.js` and `autopilot.pack` already give tokens and budget per card. The dry run and the report reuse them.
- **Notices.** `notify()` writes `notifications.md` and `.jsonl` and then calls `desktopNotify`. Card `one-notice` changes only which kinds reach `desktopNotify`.
- **Plan pointer.** `.ultimate-workflow/active-plan`, written by `setActivePlan`, read by `pointedPlanFile`. Card `plan-subfolder` lets the pointer hold a path. It adds no folder search, so the guess by file time stays root-only.
- **Doc tests.** `evals/experts/docs.test.js` already checks that a guide and the code say the same number. Card `run-md` uses the same kind of test.
- **Phase scripts stand alone.** A phase script cannot load a file from `lib/`. So the retry (card `expert-retry`) and the wait (card `settle-first`) are code inside `phases/run.js`. This is the one place where "new logic goes in `lib/`" cannot hold. If `expertsCheck` sits between the `// --- expert lane helpers` marks, every copy must get the same change; a test holds the copies equal.

## Cards

- plan-subfolder: state.js follows a plan in a subfolder
  paths: .cursor-plugin/ultimate-workflow/hooks/lib/state.js, .cursor-plugin/ultimate-workflow/hooks/lib/state.test.js
- gate-card: G6 judges the card being committed
  paths: .cursor-plugin/ultimate-workflow/lib/run-rules.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/phases/run.js, evals/experts/run-rules.test.js, evals/experts/autopilot-fixes.test.js
- card-add: a run-added card goes inside the list, gets a free name, and there can be more than one
  paths: .cursor-plugin/ultimate-workflow/lib/run-rules.js, .cursor-plugin/ultimate-workflow/experts/cards.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/phases/run.js, evals/experts/run-rules.test.js, evals/experts/autopilot-fixes.test.js
  depends: gate-card
- expert-retry: retry a failed expert once, never commit past one
  paths: .cursor-plugin/ultimate-workflow/phases/run.js, evals/experts/run-phase.test.js
  depends: card-add
- settle-first: review, fix-up and harvest wait for parked and blocked cards
  paths: .cursor-plugin/ultimate-workflow/phases/run.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, evals/experts/run-phase.test.js, evals/experts/autopilot-fixes.test.js
  depends: expert-retry
- harvest-name: a second harvest gets its own branch
  paths: .cursor-plugin/ultimate-workflow/lib/run-rules.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, evals/experts/autopilot-fixes.test.js
  depends: settle-first
- reasons: whole park reasons, and the real conflict from unpark
  paths: .cursor-plugin/ultimate-workflow/lib/run-rules.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/phases/run.js, evals/experts/run-rules.test.js, evals/experts/autopilot-fixes.test.js
  depends: harvest-name
- one-notice: one desktop notification per run
  paths: .cursor-plugin/ultimate-workflow/experts/autopilot.js, evals/experts/autopilot-fixes.test.js
  depends: reasons
- dry-run: measure the plan's claims before the tests are confirmed
  paths: .cursor-plugin/ultimate-workflow/lib/claims.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/commands/tests.md, .cursor-plugin/ultimate-workflow/phases/tests.js, evals/experts/claims.test.js
  depends: one-notice
- report-cost: pack size and token cost per card in the report
  paths: .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/phases/run.js, evals/experts/autopilot-fixes.test.js
  depends: dry-run
- run-md: run.md says what the code does
  paths: .cursor-plugin/ultimate-workflow/phases/run.md, evals/experts/docs.test.js
  depends: report-cost
- release: changelog for these fixes in 4.8.0
  paths: CHANGELOG.md, internal/plans/PLAN-run-fixes.md
  depends: plan-subfolder, run-md

## Card details

No check here needs the running system. Every card is checked with `node:test` on temporary git repos, as `evals/experts/autopilot.test.js` does. So there is no harness card.

### plan-subfolder (item 14)

- The pointer may hold a relative path with forward slashes. The base name must match `PLAN-*.md`. No `..`, not absolute, and the file must exist under the root.
- `setActivePlan` writes such a path. `pointedPlanFile` returns it when the plan is not `phase: done`.
- `readState` and `resolveStage` take a valid pointer as stage `feature`, also when the root has no `PLAN-*.md`.
- No folder walk. Without a pointer nothing changes.
- This changes which plan every gate reads once a pointer is set. In this repo the gates become live for `internal/plans/` plans. That is the aim, and the user should know it.

### gate-card (item 4)

- `effectiveExperts(cwd, planFile, pluginRoot, files, card)` and `commitEvidence(..., { card })`: when a card is named and every changed file is under that card's paths, the answer is that card's `experts` field only. Any other case behaves as today.
- Only `card-commit` passes the card (it already has `--card`). `hooks/gate.js` and `hooks/status.js` pass none and keep the union.
- The pure choice goes in `lib/run-rules.js`.
- `adhocCard` in `run.js` passes `--experts` to `card-add` (the names it gives the lane, or `none`), so line 664 no longer falls back to the plan's full list.
- Files accepted for a card: `--resume <card> --accept` writes the accepted files to a run field `accepted:` on that card (run fields are left out of the confirmed hash). For the named card, `covers` counts `paths` and `accepted`. This is the case that parked the 4.8.0 `docs` card: its four version files were in no card's paths, so G6 fell back to the plan's five experts (checked in `effectiveExperts`).

### card-add (items 6 and 8)

- `addCard` inserts after the last card item and before the first heading inside `## Cards`. With no heading inside, it inserts at the end as today.
- `card-add --free-name`: when the name is taken it takes `name-2`, `name-3`, and prints the name it used. `adhocCard` runs `card-add` first, reads the name, then runs `pack` with it. This costs one more step per run-added card.
- `confirmHash` line 513 becomes `/^(findings|fixup)(-\d+)?$/i`.
- A refused `card-add` prints `{"ok":false,"reason":...}`. Today the CLI's `fail` (`experts.js` 1455) writes to stderr and exits 2, so the step's report held no JSON line and the run said "printed nothing" (checked). `adhocCard` also uses the raw output when no JSON line came, as `run.js` line 825 does for `card-commit`.
- **More than one fix-up card (user request).** The fix-up step groups the confirmed findings by the plan card whose paths cover the finding's file (the first such card in plan order). Each group becomes its own card: a free name (`fixup`, `fixup-2`, ...), the `experts:` line of that plan card, no `depends`. Findings in a file no card covers make one more card with the plan's line. Each card is built and committed on its own, so one that parks does not stop the others. At most four fix-up cards per run; findings past that stay in the report.

### expert-retry (item 5)

- `expertsCheck` (`run.js` 460) is the run's own copy, outside the `// --- expert lane helpers` block that `plan.js`, `review.js` and `tests.js` share (checked), so only `run.js` changes.
- In `expertsCheck`, after the first `parallel`, run the failed experts once more with the label `<card><tag>:<expert>:retry`. Experts that returned are not run again. The order is fixed, so a resume replays the same calls.
- In `runCard`, any expert still failed parks the card ("the experts check is not complete: genai returned nothing twice") before `record` and `card-commit`. Today it parks only when every expert failed (line 755). The same rule applies after a fix round (line 778).

### settle-first (item 10)

- After the card loop: if any card is `parked`, `needs-decision`, `blocked` or `not started`, skip the review, the fix-up card and the harvest. The result and the report say: "waiting for <cards>; they run once, on the resume that settles them".
- The findings card waits too, for the same reason.
- On a resume `BASE` is the base of the whole feature (`run.js` 315 takes it from the args; the last report reviewed `9526a1a..HEAD`, the feature base), so the one review covers every card (checked).
- The report says what waits, and how to run it by hand if a parked card is dropped: `/ultimate-workflow:review` and `/ultimate-workflow:harvest`.

### harvest-name (item 9)

`harvestBranch` takes the first free of `uw/harvest/<feature>`, `-2`, `-3` and so on, with the same free-name function as `card-add`. It returns the name it used; `runReport` and `writeRunStatus` already print what it returns. The note on a `memory.md` merge conflict (lines 843-846) stays.

### reasons (items 7 and 11)

- `run.js` 607: the report entry keeps the whole reason on one line. The cuts at 595, 825 and 898 go the same way.
- `autopilot.js` 638: the plan lines stay short, but the cut is at a word end and is followed by the path of `parked.md`, which holds the whole text.
- `unpark` (675): a pure function reads the output of the failed `git apply --3way` and returns the files in conflict. When it finds none, it returns the last lines, not the first. The test takes git's real wording from a real conflict in a temporary repo.

### one-notice (item 12)

In `notify()`, only kind `finished` goes to `desktopNotify`. Every other kind is still written to `notifications.md` and `.jsonl`, with `desktop: "file-only"`. A stopped run still ends with the `finished` step (`run.js` 1042, which says "; stopped"), so the user gets one. `run.md` line 44 changes in card `run-md`.

### dry-run (item 16)

- New command `autopilot.js claims --plan P --feature F`, added to `COMMANDS`. It prints one JSON line.
- Always: for each card, the pack size against `pack_budget`, from `autopilot.pack` and `lib/pack.js`. A card whose required entries alone are over the budget is listed.
- For each `- measure: bytes <glob> <= <number>` line in the plan: the size now, the room left, and the cards whose paths fall under the glob. Code cannot know how many bytes a card will add. It shows the room so the user sees "4,700 bytes left and six cards write there" before confirming.
- A `measure:` line it cannot read gives `understood: false` and is shown. It never counts as passing.
- `commands/tests.md` runs it after the Tests section is written and before the confirmation, and shows the output. The tests phase is told to write a `measure:` line for each size or count it puts in a test.
- Reading and judging the lines is pure and goes in `lib/claims.js`.

### report-cost (item 17 of the task list, letter k)

The pack size is already in the Note cell (`autopilot.js` 881). Move it to its own column and add a Tokens column: the sum over the agents whose label starts with `<card>:`. `run.js` keeps no tokens per agent today (checked). At build, look for them in the Workflow journal (`journal.jsonl`, one result line per agent). If they are not there, the column says "unknown" and the report gives the run's total tokens from the Workflow result instead; never 0.

### run-md (items 13 and 15)

Words only, plus tests in `evals/experts/docs.test.js`:

- Rounds: up to three, but a card is parked after one round when the diagnosis says the test or the plan is wrong, and after two when the same failure comes back (`run.js` 244, 257).
- `.gitignore`: the line is committed only when it was missing (`autopilot.js` 980).
- Line 38: review, fix-up and harvest wait for parked cards; the harvest branch may be `uw/harvest/<feature>-2`.
- Line 44: one desktop notification, at the end.

`run.md` has no mirror copy; `mirrors.test.js` (199-250) checks that it names its script and some of its text, so run that test after the edit (checked).

### release

No version change: 4.8.0 is not released yet, so these fixes go into its CHANGELOG entry as a "### Fixed (the unattended run)" part. `mirrors.test.js` keeps asserting 4.8.0. One PR and one tag `v4.8.0` for the memory-index work and these fixes together, only when the owner asks. Set `phase: done` after the commit lands, never before.

## Deviation justification

1. **G6 is told the card by `card-commit`.**
   - Now: `effectiveExperts` works the cards out from the changed files "and never from a pointer that can go stale" (comment at `experts.js` 628-636) and takes the union.
   - Plan: `card-commit` passes its own `--card`; the hooks keep the union.
   - For: the run's lane runs only that card's experts, so today such a card can never be committed. An argument of the command is not a stale pointer. The named card is used only when all changed files are under its paths.
   - Against: G6 is weaker for run commits than for hand commits. An expert of the other card does not see this change to the shared file.
2. **One desktop notification per run.**
   - Now: a notice per blocker as it happens (decision of 2026-11-09, `run.md` line 44).
   - Plan: only `finished` reaches the desktop; the file keeps all.
   - For: the user asked for it; a run with many cards sent many toasts.
   - Against: a card that needs a decision early in a long run is not seen until the end.
3. **The `experts/` limit is raised (done in 4.8.0, not a card here).**
   - The code part goes from 60 KB to 100 KB, asked by the user. New pure code still goes to `lib/`.
   - Against: the limit stops pushing code out of `experts/`. The release ZIP limit of 2 MB still holds.
4. **The plan pointer may hold a path.**
   - Now: a bare `PLAN-*.md` name in the root only.
   - Plan: a relative path inside the root.
   - For: `mirrors.test.js` forbids a plan outside `internal/` in this repo, so the gates read no plan state here.
   - Against: every gate changes its plan source when a pointer is set. A wrong pointer points the gates at the wrong plan; the checks (inside the root, exists, not done) limit that.
5. **Review, fix-up and harvest can be skipped by a run.**
   - Now: they run in every run that committed a card.
   - Plan: they wait until no card is parked or blocked.
   - For: they ran twice and were paid twice; items 8 and 9 came from it.
   - Against: if the user drops a parked card and never resumes, they do not run. The report must say how to run them by hand.
6. **A second harvest branch is made.**
   - Now: refused with "merge or delete it".
   - Plan: the next free name.
   - For: four proposals were lost.
   - Against: two open harvest branches can hold the same lesson or conflict in `memory.md`.
7. **More than one fix-up card per run.**
   - Now: one card named `fixup`, refused when the name is taken.
   - Plan: one card per plan card the findings fall under, free names, at most four.
   - For: the user asked for it; each card gets the right experts, and one hard finding does not hold back the rest.
   - Against: more cards per run, each with its own build and experts check, so a run with many findings costs more.
8. **Retry and wait logic is in `phases/run.js`, not in `lib/`.**
   - The task asks for new logic in `lib/`. A phase script cannot load it. No other choice was found.

## Changes from the expert input (2026-11-12)

The experts' constraints below are part of the plan. Where they and a card section disagree, these win.

- **expert-retry** touches only `phases/run.js` and `evals/experts/run-phase.test.js` (developer, softarch). Retry only an expert whose result is null; a valid empty result is a success. At most one retry per expert per check. Labels are built from card, tag and expert only, so a resume replays them. The **refute** and **recheck** agents get the same single retry; if refute is still null, the card parks instead of paying a fix round for unverified findings (genai). Tests count calls, not label shapes (quality).
- **card-add**: a refusal prints one JSON line `{"ok":false,"reason":...}` with the try/out shape of `autopilot.js` `run()`, not `fail()`, for every refusal (developer). Free names come from one helper in `lib/run-rules.js`, bounded (up to `-99`), a git error counts as taken (architect). Every later use in `adhocCard` keys on the name `card-add` printed (developer). The same call twice adds one card: a not-committed card with the same title and carried text is returned, not duplicated (architect). One exported pattern gives both the free-name test and the `confirmHash` drop rule (softarch). One definition of where the card list ends, used by `addCard`, `parseCards` and `confirmHash`; the test uses a plan with `### Card` subsections and asserts `parseCards` returns only the list items (softarch, quality). `--experts` is passed only with names already in the plan's line (softarch, developer).
- **gate-card floor (security, developer, softarch)**: a named card narrows G6 only for a card in the confirmed hash. A run-added card (`fixup*`, `findings*`) is held to the union of the experts of the confirmed cards whose paths cover its files, and an empty list means fall back, never "no experts". Experts the run's re-check added for the named card are also required. With no card named, behaviour is as today. New arguments are optional and at the end; `hooks/gate.js`, `hooks/status.js` and existing tests are unchanged. `lib/run-rules.js` and `lib/claims.js` have no top-level require of `experts/` files (load cycle).
- **Test cases that rule out the wrong fix (quality)**: harvest-name with `<f>` and `<f>-2` both taken expects `-3`; gate-card with one file outside the named card's paths still asks for the union; reasons with a 5000-character reason cut inside a word, byte-equal in `report.md`; one-notice checks every kind in `NOTIFY_KINDS` through the `desktop` field, with `ULTIMATE_WORKFLOW_NOTIFY=off`; run-md reads the round rules from `run.js`, not a copied number; dry-run has a non-ASCII fixture; the unpark conflict test sets `LC_ALL=C`.
- **plan-subfolder (security, softarch)**: one containment check for the pointer: backslashes to slashes, refuse a drive prefix, a leading `/` or `//`, any `..`, a base name not `PLAN-*.md`, and a real path outside the root. `card-commit` reads G7 from its own `--plan`, so the two gates never judge different plans. `projectRoot` is unchanged. The new rule reaches the gates only once the installed plugin is updated, so the run that builds this plan is not judged by it.
- **Agent text never goes inside `q()` (security)**: titles, paths, carried text, reasons and stop text that agents wrote go in files written by `runSteps` and are read with `--*-file` flags, as `parkCard` does. Test: a finding whose text is `$(touch PWNED)` leaves no file.
- **dry-run**: a `measure:` glob is matched in JS under the root only; `..`, absolute or drive paths give `understood: false` (security). A "not understood" line or a failing claim **stops the tests phase and asks the user** before confirmation; it is never shown as passing (quality).
- **settle-first (architect)**: the base stays the one in `run.json` (`experts.js` 1397-1406), so the review covers the whole feature. `run.json` also records the HEAD the review covered and the harvest branch made; a later settling resume reviews only `<recorded head>..HEAD` and harvests only when cards were committed after it.
- **harvest-name (architect)**: a second harvest is given the names of the open `uw/harvest/<feature>*` branches and told to drop what they already hold.
- **one-notice (architect)**: when a run ends without its `finished` step (a script error, a null runner, a stop), `phases/run.md` has the session send one `notify --kind finished` with "stopped", so the user always gets exactly one.
- **report-cost (genai)**: Tokens counts labels `<card>:`, `<card>-fix:` and the retry labels, matched on the exact card name. The Pack column is labelled an estimate. Tokens is the usage total with cache reads shown apart, or "unknown".
- **many-fixups**: the split is by covering plan card (the user's request), at most four per run, and the report names which run each fix-up card came from (developer).

## Decisions taken without asking (2026-11-12)

- Built after 4.8.0 is merged; line numbers checked again at build.
- One desktop notification per run, at the end (the user asked for at most one). The end notice names every blocker.
- The gates become live for plans under `internal/plans/` once a pointer is set, after the updated plugin is installed. That is the aim of item 14.
- The findings card waits with review, fix-up and harvest.
- A dropped parked card: the report says how to run review and harvest by hand. No extra flag.
- No token ceiling for a run (owner, 2026-11-12): the report shows tokens per card after the run, nothing stops a run on cost.
- Two open harvest branches may hold the same lesson. Accepted; the report lists every open `uw/harvest/*` branch.
- The `measure:` line format is new plan text the tests phase writes. Where `commands/tests.md` calls the dry run is found at build.

## Open questions

- None. Seven experts read the plan on the second try (developer, quality, softarch, security, genai, architect, devops); their constraints are folded in above.

## Expert input

### developer

The plan reuses the right helpers (cards.addCard, commitEvidence, autopilot git and run(), lib/pack.js). It still needs four fixes from my lane: the expert-retry card lists phase files that do not hold expertsCheck; a refused card-add must print JSON the way autopilot's run() wrapper does; the new --experts and free-name paths must not open new ways to refuse or misname a card; and settle-first must review from the run's real start, not from runBranch's resume base.

**Constraints**
- expert-retry changes only .cursor-plugin/ultimate-workflow/phases/run.js (expertsCheck at line 460, runCard at 755 and 778) and evals/experts/run-phase.test.js. Remove phases/review.js, plan.js, tests.js and build.js from the card's paths. The '// --- expert lane helpers' marks are in plan.js 69-100, tests.js 43-74 and review.js 44-75, and they hold only addOnly, takingPart, SELECTION and describeExperts. No expert parallel() is in them, so no copy needs the retry. Delete the plan line 'If expertsCheck sits between the marks, every copy must get the same change'.
- A refused card-add in experts/experts.js (CLI at 1637-1665) prints one line {"ok":false,"reason":err.message}, using the same try/out shape as the run() wrapper in experts/autopilot.js 1106-1114. Do not use fail() (experts.js 1455), which writes only to stderr and exits 2. The card-add refusals at 1648-1653 (no experts line, unknown expert, expert outside the plan's line) follow the same rule.
- Free names come from one helper in lib/run-rules.js that takes a taken(name) check and a bounded loop, and both callers use it. card-add's check is cards.findCard, the same match addCard uses at cards.js 148. harvestBranch's check is git rev-parse --verify refs/heads/<name>, as at autopilot.js 840. In run.js adhocCard, every later use keys on the name card-add printed (added.card.name): status[], report entries, the pack --card argument, packs[], the runSteps labels and parkCard. Today all of these use the literal 'fixup' (run.js 903-922, 980).
- adhocCard passes --experts only when the plan records an experts line. Otherwise card-add refuses with 'the plan records no experts yet' (experts.js 1648), and a fix-up card that works today becomes 'not started'. effectiveExperts (experts.js 638) gets the named card through an options object, not a fifth positional argument after `files`. Its callers at experts.js 1257, experts.js 1597 and hooks/status.js 51 stay unchanged. The repository has no lint, format or type-check command (no package.json), so done means the test_command passes.
**Risks**
- settle-first: on a resume, runBranch returns base = current HEAD when uw/run/<feature> is already checked out (experts/autopilot.js 785). The review prompt diffs `${BASE}..HEAD` (run.js 940), so if BASE comes from runBranch, the review that runs once on the settling resume sees only that resume's commits. Cards committed in earlier runs are never reviewed, and the fix-up and harvest are built from the same narrow range. The plan only says 'check what BASE is'. It needs a fixed rule, such as the fork point recorded when the branch is created, with a test that resumes twice.
- With gate-card and `--experts none`, a fix-up card commits with no expert evidence even when it edits files that other cards share: commitEvidence uses only the named card's empty experts field. Today such a commit is refused (fault 4). After this change it passes silently. Say this in the deviation list, or keep the union for adhoc cards whose experts list is empty.
- expert-retry: if the retry label is made from anything other than the fixed `<card><tag>:<expert>:retry`, or the retry runs in an order that depends on which agent finished first, a resumed Workflow replays different calls and pays for the experts again. The test should run expertsCheck twice with the same stubbed nulls and check that the labels match.
- card-add with --free-name makes a new card on each run that reaches the fix-up step. Two runs that both reach it leave fixup and fixup-2 in the plan. confirmHash drops both, but parked fix-up cards pile up in `## Cards`. The report should name which fix-up card came from which run.
**Questions for you**
- When a fix-up card has no experts (adhocCard passes []), should its commit be held to no experts, or to the union of experts over the shared files it touches, as hand commits are today?

### quality

Most criteria name a real oracle, but several tests as drafted would still pass with a plausible wrong fix. The plan needs to say, card by card, which negative case or second fixture rules out the wrong version. The release card also misses the test that will go red when the versions change.

**Constraints**
- release card: add mirrors.test.js and CHANGELOG.md to its paths. Change the test at mirrors.test.js 239-248, which today asserts five fields equal '4.8.0' and a '## [4.8.0]' CHANGELOG heading, to 4.9.0. Without that, the full test_command in validate.yml line 24 goes red and the card cannot commit. Also fix 'Read this first': the version files on disk already say 4.8.0 (plugin.json line 4, marketplace.json lines 8 and 15).
- Each card's test must include the case that rules out the likely wrong fix. harvest-name: create both uw/harvest/<f> and uw/harvest/<f>-2 and expect -3; with only -2 tested, code that always appends -2 passes. gate-card: also test card A named but one changed file outside A's paths, which must still ask for the union, and a card with 'experts: none', which must ask for nobody and not for an expert called 'none'. reasons: build the reason so that char 240 falls inside a word. Assert the reason is byte-equal in report.md and use a length well over any cap (for example 5000), not 900, because a new 1000-char cap would pass a 900 test. report-cost: one fixture holds a card with token data, which must show a number, next to one without, which must show 'unknown'. A fixture with only the missing case lets 'always unknown' pass.
- expert-retry and settle-first are tested through run-phase.test.js with a responder keyed by call count. The first call for the expert returns null and the retry returns a valid result. Assert the card is committed and the expert label was called exactly twice. A second case fails both calls: assert a park with the expert's name and no ':commit' label in seen. settle-first asserts that no 'review:*', 'harvest' or fixup label appears while a card is parked, and that each appears exactly once when all cards are committed. Today the responder splits labels on ':' and keeps only two parts, so '<card>:<expert>:retry' looks identical to a first call. The test must count calls, not match labels.
- one-notice: test notify() for every value of NOTIFY_KINDS (autopilot.js 353), not only parked and finished. That way a filter that drops just 'parked' fails. The oracle is the 'desktop' field in notifications.jsonl: 'file-only' for every kind except 'finished'. Keep ULTIMATE_WORKFLOW_NOTIFY=off, as autopilot.test.js line 41 does, so the test never fires a real toast. run-md: the doc test reads ROUND_CAP and the stop rules from run.js, not from a copied literal. Otherwise a change in the code with no change in the doc stays green.
**Risks**
- limit card cannot meet 'every fix has a test that fails without it'. provenance.test.js passes today, with 97 bytes left, so no red test exists before the change. Criterion 1 ('the budget test passes with the new code in place') would also pass with any larger number. The real check comes only when the later cards land. The build phase's prove-red step will either stall or accept a fake red.
- dry-run: lib/pack.js gives tokens, but 'measure: bytes <glob>' counts bytes. If a test uses only ASCII fixtures, code that counts string length passes. Add one non-ASCII fixture. Also, the experts/ limit in provenance.test.js 137-151 leaves skills/ out, and a glob cannot say 'except'. So the measure line for the plan's own main claim may be measured wrong and show as understood.
- card-add hash test: the bug happens only when the run's card is appended after a '### ...' subsection inside '## Cards' (cardsRange in cards.js line 37 counts subsections as part of the section). A fixture with a flat '## Cards' list passes before the fix. The test must use that exact shape for both the 'fixup' case and the 'fixup-2' case, and must also run a refused card-add and check that the JSON reason is passed on.
- unpark conflict test: the plan takes git's real wording from a real conflict in a temporary repo, which is right. But that wording changes with git version and locale. Pin LC_ALL=C or LANG=C in the test env, or the parser test will be flaky on the user's Windows machine compared with ubuntu-latest CI.
**Questions for you**
- Should the claims dry-run block test confirmation when a card is over its pack budget or a measure line reads 'not understood', or only show the result? As written it reports and blocks nothing. A claim it cannot read can therefore still reach the user unchecked, unless the confirmation itself refuses.

### softarch

This plan changes three contracts that other modules depend on: the `experts` field of a card (read by G6 in `experts.js` and by the script generator at `experts.js` 1438, which sets `ownExperts`), where the `## Cards` list ends (`cards.js` `cardsRange`/`parseCards` and `experts.js` `confirmHash` each decide this their own way), and the signatures of `effectiveExperts`/`commitEvidence`, which `hooks/gate.js`, `hooks/status.js` and `autopilot.js` call. It needs to state one owner for each of these, and keep the two new `lib/` files out of a load-time import cycle with `experts/experts.js`.

**Constraints**
- The card list has one definition of where it ends, and `addCard`, `parseCards` and `confirmHash` all use it. Today `cardsRange` (`cards.js` 37-53) runs past `###` subsections, and `parseCards` takes any `- word:` bullet in that range as a card (ITEM, `cards.js` 25). Meanwhile `confirmHash` (`experts.js` 503-516) leaves the Cards section at every heading, whatever its level. If only the place `addCard` inserts is fixed, a detail bullet such as `- Rounds: ...` under a `### Card` subsection is still parsed as a card. The `card-add` test should also assert that `parseCards` on the fixture returns only the list items.
- `lib/run-rules.js` and `lib/claims.js` have no top-level `require` of `experts/experts.js` or `experts/autopilot.js`. `experts.js` will require `run-rules.js`, and `experts.js` is loaded by `hooks/gate.js` (line 120), so a top-level require back would be a load cycle that returns a partial exports object. If 'the experts of one card' needs `cards.covers` and `globToRegExp` (as `effectiveExperts` 657 does), it takes them as arguments, or requires them lazily inside the function the way `lib/memory.js` 280 does. `claims.js` gets pack numbers from its caller in `autopilot.js` and does not call `autopilot.pack` itself.
- The new parameters are optional and added at the end: `effectiveExperts(cwd, planFile, pluginRoot, files, card)` and `commitEvidence(cwd, planFile, pluginRoot, { card })`. With no card they return exactly what they return today, and `hooks/gate.js` 120, `hooks/status.js` 43/51 and the existing tests (`card-experts.test.js`, `experts.test.js`, `memory-gate.test.js`) keep passing unchanged. A card-scoped answer still applies the subset check at `experts.js` 665 and falls back to the union/plan rule on any failure. Only `cardCommit` (`autopilot.js` 748) passes the card. The 'run-rules name test' and the `confirmHash` drop rule (`experts.js` 513) come from one exported pattern, so the free-name generator and the hash cannot drift apart.
- Card `expert-retry` touches only `phases/run.js`. `expertsCheck` (run.js 460) sits outside both mirrored blocks: the build loop is 49-306, and the expert lane helpers exist only in `plan.js`/`tests.js`/`review.js`, held equal by `evals/experts/lib/contract.js` 247-255. Drop `review.js`, `plan.js`, `tests.js` and `build.js` from the card's paths and remove the 'if expertsCheck sits between the marks' sentence. If the lane helpers are changed after all, all three copies change together.
**Risks**
- Writing `experts:` on run-added cards changes how a resume behaves. On a resume, the generator turns any card with an `experts` field into `ownExperts: true` (`experts.js` 1438), and `expertsCheck` then drops `grownExperts` (run.js 465). So a `fixup` card added with `--experts none` runs with no experts on a resume, but with the grown experts in the run that created it. The plan should say which behaviour it wants, and a test should resume such a card.
- `card-add --experts` refuses any name that is not in the plan's `experts:` line (`experts.js` 1649-1650), and that line grows only when `record --plan` succeeds (run.js 815-823). Findings are pushed to `findingsQueue` at run.js 808, before `record`, so an expert added by recheck on a card whose record or commit then fails can be in the queue but not in the line. The findings card would then fail `card-add` and stay 'not started'. `adhocCard` should pass only names already in the plan's line, or the plan should say what happens to the others.
- With `plan-subfolder`, `cardCommit` reads G7 state from `readState(cwd)` (`autopilot.js` 744), which follows the pointer, and reads G6 from its own `--plan` (748). If the pointer and `--plan` name different plans, the two gates judge different plans. Either G7 in `card-commit` reads the `--plan` file, or the plan states that `--plan` always sets the pointer first. `projectRoot` (`state.js` 213-224) still treats any folder holding a `PLAN-*.md` as a root, so a hook fired from `internal/plans/` keeps its own `.ultimate-workflow/` there. The plan should say this is unchanged.
**Questions for you**
- When `card-commit` names a card, should G6 require only that card's `experts:` field? Or should it also require experts that the run's recheck added for that card, which `record --plan` writes into the plan's line? As planned, an added expert's evidence is no longer required for a run commit, while a hand commit of the same files still requires it.

### security

Two cards change security controls. gate-card makes G6, the commit gate's experts check, narrower for run commits, so it needs a floor: a card the run adds, which is outside the confirmed hash, must never reduce the experts check to nothing. plan-subfolder turns the plan pointer, which every gate reads, into a file path, so it needs an exact containment check. Separately, the run.js command lines this plan edits (adhocCard and the stopped notice) pass text that agents wrote through q() into Bash, and inside double quotes Bash runs $(...) and backticks. The plan must move that text into files, not make it longer.

**Constraints**
- gate-card: the named card can narrow G6 only to the union of the experts of the confirmed cards (those in the confirmed hash) whose paths cover the changed files. A run-added card (findings, fixup, fixup-2) has its experts line written by the run outside the confirmed hash, so it never narrows below that union, and an empty list (`--experts none`, which adhocCard passes for fixup at phases/run.js:980) means 'fall back', not 'no experts'. Test: a fixup card with `experts: []` that changes a file also under a card with security still needs security's evidence before `card-commit --card fixup` is allowed.
- plan-subfolder: the new pointer check in hooks/lib/state.js (it replaces isPlanName at line 111 for the pointer) turns backslashes into forward slashes first. It refuses a drive prefix (`C:x`, which path.win32.isAbsolute does not treat as absolute), a leading `/` or `//` (UNC), any `..` segment and a base name that does not match PLAN-*.md. It then requires that path.relative(root, realpath(file)) has no `..` and is not absolute, so a symlink out of the root is refused. setActivePlan (line 126) and pointedPlanFile (line 118) use the same function. Tests cover each refused form on win32 path rules.
- No command line that this plan adds or changes in phases/run.js puts agent-written text (finding file, line or what, park or stop reasons, titles, 'waiting for' text) inside q() (run.js:394, which only swaps `"` for `'`, so `$(...)`, backticks and `$VAR` still expand in the Bash command the runner agent runs). Such text goes in a file written by runSteps (`files`) and is read with a `--*-file` flag, as parkCard already does with `--reason-file` (run.js:597-603). This covers adhocCard's `--paths`, `--title` and `--carried` (run.js:907) and the stopped notice (run.js:898), which the reasons card would otherwise make longer. Test: a finding whose `what` is `$(touch PWNED)` leaves no PWNED file.
- dry-run (lib/claims.js): a `measure: bytes <glob>` line is matched in JS against files under the root only. A glob with `..`, an absolute path or a drive prefix gives `understood: false`, using the same refusal as cards.addCard (experts/cards.js:146). No shell or spawn expands the glob. expert-retry keeps failing closed: a card whose expert still returned nothing after the retry never reaches card-commit, and the test asserts that card-commit is not called.
**Risks**
- As written, gate-card plus adhocCard passing `--experts none` lets a review fix-up commit changes to any file in the run with no expert evidence. Today the fix-up falls back to the plan's full list (experts.js:664). The fix-up's files come from reviewer agent output (run.js:975-980), so an agent misled by text it read can steer which files skip review.
- The reasons card says the cut at run.js:898 'goes the same way', which keeps a longer, agent-written reason inside q(). That gives a prompt-injected diagnosis more room to run a shell command through the runner agent's Bash (`$(...)` and backticks are not escaped by q at run.js:394).
- Once a pointer can hold a path, every gate (G6, G7, volatile_paths) reads the plan it names. A pointer that escapes the root through a drive-relative path (`C:PLAN-x.md`) or a symlink would point the gates at a plan outside the project, possibly one with weaker experts or test_command settings. Gates fail open when they find no plan, so a refused pointer is safe; a pointer accepted wrongly is not.
- A `measure:` glob that is not confined to the root lets the new claims command read and print file sizes outside the project. The harm is low, but the fix is cheap.
**Questions for you**
- Deviation 1 accepts that 'an expert of the other card does not see this change to the shared file'. Do you accept that for plan cards only, with run-added fix-up and findings cards held to the union of the covering confirmed cards' experts? (Security recommends that floor.)
- With plan-subfolder, the gates become live for plans under internal/plans/ in this repo once a pointer is set. Do you accept that every commit is then held to that plan's experts and test_command until the plan is marked done?

### genai

This change calls no model API directly. What my domain covers is the cost and bounds of the run's agent calls. Two plan cards need tightening: expert-retry (state the bound on extra agent calls and what counts as failed) and report-cost (its label-prefix rule misses the fix-round agents, and it does not say which token figure it shows).

**Constraints**
- report-cost: the Tokens column must count every agent of the card. That means labels `<card>:`, `<card>-fix:` (the recheck, expert and refute agents of the fix round, run.js 480, 507, 535 with tag '-fix' from line 776) and the planned `<card><tag>:<expert>:retry`. Match on the card's name exactly, plus the optional `-fix` tag, so a card named `x` does not pick up a card named `x-fix`. Test: a card with a fix round reports the tokens of its `-fix` agents.
- report-cost: the Pack column is the estimate from lib/pack.js (`Math.ceil(chars / 4)`, pack.js line 16). The Tokens column is measured usage. Label them differently (for example 'pack (est.)'). The plan must also say whether Tokens is the usage.js total (input + cacheWrite + cacheRead + output, usage.js line 167) or splits out cache reads, because a sum that includes cache reads makes cost look higher than it is.
- expert-retry: the retry runs only for experts whose result is null. An expert that returns a valid result with zero findings is a success and is not run again. Each expert gets at most one retry per expertsCheck call, so with the fix-round check an expert runs at most 4 times per card. A test asserts the count of agent calls with the retry label equals the number of experts that failed.
- expert-retry: retry labels are built only from card name, tag and expert name, with no counter, time or random value, so a resume replays the same labels. The park reason names each expert that failed twice and the check it failed in (first check or after the fix round, run.js 753 and 776).
**Risks**
- As written, report-cost sums agents whose label 'starts with `<card>:`'. For any card that had a fix round, that undercounts tokens, because the recheck, the experts and the refute after the fix are labelled `<card>-fix:...` (run.js 776 to 507). Those are the most expensive cards, and the report would understate them without any sign of it.
- expert-retry covers only the review experts. If the refute agent (run.js 529) returns null, high findings stay as 'unverified' and still block (run.js 544, 562). A fix round is then paid for findings a skeptic never checked. The plan neither retries refute nor parks on it, so the cost fault the plan targets stays open on that path.
- The recheck agent returning null leaves `recheck = false` (run.js 482). The plan does not say whether that is retried or how card-commit treats it. If the gate refuses on it, the card parks after the expert work has been paid for. Not confirmed: I did not read the gate's recheck check.
**Questions for you**
- Should the refute agent (and the recheck agent) also get one retry in expert-retry? Or should a null refute park the card, instead of letting unverified high findings drive a paid fix round?

### architect

I treated this as a single-user local developer tool. There is no availability target, and the only cost is model tokens per run. What the plan needs from my domain is that every step a resume can repeat (card-add with a free name, review, fix-up, harvest) is harmless when it runs twice. It also needs a run that dies before its last step to still reach the user, because one-notice removes the per-blocker desktop notices.

What I checked:
- `run.js` 590-1050: `parkCard`, `runCard`, `adhocCard`, review, harvest, the finished notice.
- `cards.js` `addCard` 140-171.
- `experts.js` `effectiveExperts` 625-670, and the stored run base at 1397-1406.
- `autopilot.js` `runBranch` 781-792, `notify` 355-374, `harvestBranch` 800-850.

The review range on a resume is already safe. The script generator keeps `base` in `.ultimate-workflow/run/<feature>/run.json` (`experts.js` 1397-1406), so `BASE..HEAD` covers the whole feature. The plan's "check what BASE is" can be closed with that line.

**Constraints**
- card-add --free-name must give the same answer when the same request runs twice. Today the guard against a second add is the refusal of a taken name (`cards.js` 148), and --free-name removes that guard. If a card already in the plan is not committed and has the same title and the same carried text, card-add returns that card's name and adds no new card. This matters when a replayed or re-run `fixup:setup` step (`run.js` 259-262) runs after card-add already wrote `fixup`: it must not add `fixup-2` with the same findings. A test calls card-add --free-name twice with the same arguments and checks that the plan holds one card.
- settle-first must record that the review, the fix-up and the harvest ran, in `.ultimate-workflow/run/<feature>/run.json` next to `base`: the HEAD the review covered and the harvest branch it made. A later resume that settles a fix-up card reviews only `<recorded head>..HEAD`, not `BASE..HEAD` again. It harvests only when cards were committed after the recorded head. A test does two settling resumes and checks one review of the first range and no second harvest when nothing new was committed.
- one-notice: a run that ends without its `finished:notify` step must still produce one desktop notification. That covers a script error, the runner agent returning null (`run.js` 395 depends on an agent step), or a stop. The command that started the Workflow checks `notifications.jsonl` for a `finished` entry newer than the run's start, and sends `notify --kind finished` with `stopped` when there is none. A test proves a run that stops early leaves exactly one desktop-kind entry.
- The free-name search in lib/run-rules.js (card-add and harvest-name) tries a bounded number of names, for example up to -99. When none is free it returns `{ok:false, reason}` and never loops on a git error. A git error on `rev-parse --verify` counts as taken, not as free.
**Risks**
- harvest-name changes a refusal into a second branch, but the harvester reads the whole `RUN_DIR/journal.md` and `BASE..HEAD` (`run.js` 1026). So the second branch will propose the first branch's lessons again, and two branches will edit the same lines of `memory.md` and `AGENTS.md`. Unless the second harvest is given the first branch's name and told to drop what that branch already holds, the 'four proposals lost' fault turns into duplicate proposals and merge conflicts.
- expert-retry doubles the agent cost of a failure that happens every time. Examples are a schema the expert cannot fill, or a reference file it cannot read. Each card can run up to 2 checks x 2 attempts per expert, plus the refute agent. That is bounded, but the run report should name the retried expert so the same failure is not paid for on every card. The token column of report-cost only shows this when the retry label (`<card><tag>:<expert>:retry`) counts under the card's prefix.
- gate-card: when card A commits a shared file with only A's experts, card B's later `card-commit` judges only B's diff. So no expert from B's list ever sees A's change to that file. The only later check is the four-lens review, and settle-first can now hold that review back until every card is settled. A feature whose parked card is never resumed ships shared-file changes that no expert outside the committing card reviewed.
- One desktop notification at the end means a card that needs a decision early in a long run sits unseen. The cards behind it are blocked and spend nothing, but the user only learns at the end. If the run then dies before `finished`, the user learns nothing, unless the run's launcher sends the end-of-run notice when the script did not (third constraint above).
**Questions for you**
- You asked that a fix-up 'can create more than one card if needed'. Does that mean only a second fix-up card on a later resume gets a free name (fixup-2), which is what the plan does? Or should one review be able to split its confirmed findings into several fix-up cards, for example when they span files that no single card's pack can hold? The second needs a split rule and a limit on how many cards one review may add.
- Should a run have a token ceiling that parks the remaining cards when reached? The last run spent about 7.5 million tokens on three of seven cards. The plan only reports tokens after the fact (report-cost), so nothing stops a run that goes past what you expected.

### devops

I assumed this is a developer tool released from main. Users install it from the marketplace at a relative path in the repo, and a v* tag builds the ZIPs. My part of this plan is the release card and the base it is built on: the release card as written cannot pass the plan's own test_command, and the version history (4.8.0 is not tagged yet) needs a stated order.

**Constraints**
- The release card's paths must add mirrors.test.js and CHANGELOG.md. mirrors.test.js lines 239-248 hard-code '4.8.0' for all five manifest slots and require a CHANGELOG line matching /^## \[4\.8\.0\] - date$/. So bumping only the five JSON fields fails criterion 13 (the full test_command). The card changes that test to 4.9.0 and adds a '## [4.9.0] - <date>' section, and CI's validate.yml 'Manifest version consistency' step must also agree.
- The 'Read this first' note must be corrected before build. On disk today, branch uw/run/memory-index is a readable git repo, and all five version fields already say 4.8.0, not 4.7.1. Line numbers must be checked against that branch's HEAD (e201e91), not against the working copy.
- The working copy has uncommitted edits to experts/autopilot.js, lib/memory.js and evals/experts/harvest.test.js (git diff --stat: 80 insertions). The plan must say whether these are committed on uw/run/memory-index before the run starts or thrown away. Five cards in this plan edit autopilot.js, and the run should start from a clean, named commit.
- The release card sets phase: done only after the 4.9.0 commit is on the branch, and the v4.9.0 tag (which triggers release-skills.yml and its 2 MB plugin ZIP check) is pushed only from the commit where the full test_command is green.
**Risks**
- The last tag is v4.7.1. 4.8.0 is on an unmerged branch, 42 commits ahead of origin/main, with no v4.8.0 tag. If 4.9.0 is built on top of it and merged as one, CHANGELOG and the GitHub releases skip a published 4.8.0. Marketplace users (source is ./.cursor-plugin/ultimate-workflow on main) then jump from 4.7.1 to 4.9.0 in one step, and the only undo is a revert of both.
- Card plan-subfolder makes the hooks read internal/plans/ plans once a pointer is set. In this repo that turns live gates on for the run's own plan in the middle of the run: the run is driven by 4.8.0, but a commit of a later card is judged by the new state.js. The plan says the user should know this but does not say from which card on it applies.
- Card limit raises the experts/ byte budget from 60 KB to 100 KB. The only remaining size guard for what ships is release-skills.yml's 2 MB plugin ZIP ceiling, and that check runs only at tag time, not on pull requests. Growth is then seen only at release.
**Questions for you**
- Is 4.8.0 merged to main and tagged v4.8.0 before this run, or do 4.8.0 and 4.9.0 ship together from uw/run/memory-index (and then does CHANGELOG keep both sections)?
- Are the uncommitted changes to experts/autopilot.js, lib/memory.js and evals/experts/harvest.test.js part of 4.8.0, to be committed before the run, or should they be dropped?
