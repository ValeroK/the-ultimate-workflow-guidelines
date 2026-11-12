---
phase: plan
plan_confirmed: true
tests_confirmed: true
test_command: node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
test_related_command: node --test {tests}
full_suite_paths: .cursor-plugin/ultimate-workflow/hooks/**, .cursor-plugin/ultimate-workflow/experts/*.js, .cursor-plugin/ultimate-workflow/phases/*.js, .cursor-plugin/ultimate-workflow/lib/*.js
volatile_paths:
verify_rounds: 0
last_verify: unrun
dirty: false
escalated: false
experts: [developer, quality, softarch, security, genai, architect, devops]
confirmed_hash: 7140b5c7a1e8aebf
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

## Tests

Verification command. It is the same as `.github/workflows/validate.yml` line 24 and the plan's `test_command`:

```
node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
```

The globs are in quotes so that Node expands them. A new test file must sit under one of these globs (`evals/experts/*.test.js`, `<P>/hooks/**/*.test.js`), or it does not run.

**No harness card.** All checks run on `node:test`. They use temporary git repos (as `autopilot.test.js` does), or they load `phases/run.js` through `evals/security-expert/lib/run-workflow.js` with a stub agent (as `run-phase.test.js` does). None needs a browser or a live Workflow. Every test that can reach `notify` sets `ULTIMATE_WORKFLOW_NOTIFY=off` and `ULTIMATE_WORKFLOW_GATES=''`, as `autopilot.test.js` line 41 does. Test 61b is the one exception, and it says why.

**Rules for every test below:**
- Count calls. Do not match label shapes. The existing `responder` in `run-phase.test.js` splits labels on `:` and keeps two parts, so `<card>:<expert>:retry` looks the same as the first call. Retry tests use a responder keyed by a per-label call counter, and they assert on `seen.filter(l => l === label).length`.
- Never assert on `execFileSync(...).stderr`. Use `spawnSync` (AGENTS.md gotcha).
- Each wrong-fix case named in "Changes from the expert input" is its own test. It is not folded into a happy-path test.
- Lists of experts are compared with deep-equal after sorting, never with "includes", unless a test says otherwise.
- Symlink cases on Windows use `fs.symlinkSync(target, link, 'junction')` for directories, so they run without admin rights. The test must not be skipped on win32.
- Tests that parse git output set `LC_ALL=C` and `LANG=C` in the child env.
- Any test that could loop forever (a synchronous search) runs in a child through `spawnSync(process.execPath, [...], { timeout: 5000 })` and asserts `signal === null`. The `node:test` timeout cannot interrupt a blocked event loop.
- Fixtures that test expert routing give each plan card a different `experts:` line. This plan's own cards have none, and a fixture copied from it would make the "equal to its card's line" checks vacuous.

---

### plan-subfolder (criterion 2): `<P>/hooks/lib/state.test.js`

1. `pointer to internal/plans/PLAN-x.md: readState returns that file and its volatile_paths when the root has no PLAN file`. The plan path equals the fixture path, and `volatile_paths` deep-equals the fixture's list.
2. `setActivePlan accepts a relative subfolder path and pointedPlanFile returns it`. `setActivePlan` returns `true`, and `.ultimate-workflow/active-plan` holds the forward-slash path.
3. `setActivePlan normalises backslashes in a subfolder path`. `internal\\plans\\PLAN-x.md` is stored and read back as `internal/plans/PLAN-x.md`.
4. `pointer refused: each unsafe form is ignored`, a table test. The rows are `../PLAN-x.md`, `internal/../../PLAN-x.md`, `/abs/PLAN-x.md`, `C:PLAN-x.md`, `C:\\x\\PLAN-x.md`, `//server/share/PLAN-x.md`, `internal\\..\\..\\PLAN-x.md`, `internal/plans/notes.md` (base name not `PLAN-*.md`) and `internal/plans/PLAN-missing.md` (no file). For each row, `setActivePlan` returns `false`. `readState`, with the pointer written by hand, returns a result deep-equal to the result with no pointer at all.
5. `pointer through a directory junction out of the root is refused`. The junction points to a dir outside the root that holds a real `PLAN-x.md`. Same oracle as 4: `setActivePlan` is `false`, and `readState` deep-equals the no-pointer result.
6. `pointer to a phase: done plan is ignored`. The root also holds an older `PLAN-old.md` that is not done. `readState` deep-equals the no-pointer result, and the test asserts that result by its plan path (it is `PLAN-old.md`, not the pointed plan).
7. `without a pointer the root-only guess is unchanged`. A `PLAN-*.md` exists only under `internal/plans/`, and no pointer is set. `readState` finds no plan, so there is no folder walk.
8. `evals/experts/autopilot-fixes.test.js`: `card-commit reads G7 from its --plan, not from the pointer`. The pointer names plan P1, and `--plan` names P2. P1 and P2 have opposite `test_command` states, and the result follows P2's.

### gate-card (criterion 3): `evals/experts/run-rules.test.js` (pure) and `evals/experts/autopilot-fixes.test.js` (temp repo, real `card-commit`)

Shared fixture: cards A (`experts: quality`), B (`experts: security`) and C (`experts: genai`), and a plan line of five experts. A and B share one file.

9. `card-commit --card A with all files under A needs only A's experts`. A's diff touches only A's paths, and only quality is on record. The result is `ok: true`, and a new commit exists.
10. `hand commit with no card named still needs the union`. `commitEvidence` with no card: the missing list deep-equals `['security']`.
11. `card named but the diff not wholly its own falls back to the union`, a table test:
    - (a) card A is named, and one changed file is outside A's paths (under C). The required list deep-equals the sorted union of the covering cards (`['genai','quality']`, plus security if the shared file is touched). It is not the plan's five-expert line.
    - (b) `--card nosuch` (not in the plan) on a diff touching A and B files. The commit is refused, or the required list deep-equals `['quality','security']`. It is never `[]`, and `ok` is never true with only quality on record.
12. `run-added fixup card with experts: [] touching a file also under a security card still needs security`. `card-commit --card fixup` is refused, and the reason names security.
13. `run-added card with an experts line is judged by its lane, not the plan's full line`. The fix-up card has `experts: quality` and touches only files of A. The required list deep-equals `['quality']`.
14. `run-added card never narrows below the covering confirmed cards, and never widens to the plan line`. The fix-up card has `experts: quality` and touches the A/B shared file. The required list deep-equals `['quality','security']`. That rules out both "only quality" and the fallback to all five.
15. `plan card with experts: none asks for nobody, never for an expert called none`. The required list deep-equals `[]`.
16. `experts the recheck added for the named card are also required`. A has a recheck-added `genai`. The required list deep-equals `['genai','quality']`.
17. `--resume A --accept writes accepted: on A; an accepted file outside every card is judged by A's experts; confirmHash is unchanged`. The plan line `accepted:` is present on A. The required list for the outside file deep-equals A's list, and `confirmHash` is equal before and after.
18. `commitEvidence and effectiveExperts with no card: pinned outputs`. A new test in `run-rules.test.js` builds a fixed fixture (the shared-file plan above, plus a plan with no `experts:` lines). It asserts the no-card output of `commitEvidence` and of `effectiveExperts` is deep-equal to literals recorded from the pre-change code. The test is written and recorded on the first card, before any change to these functions. The existing `card-experts.test.js`, `experts.test.js` and `memory-gate.test.js` must also stay green. Whether they were edited is a review check, not a test (see declined gaps).
19. `lib/run-rules.js and lib/claims.js have no top-level require of experts/`. This has two checks.
    - (a) The source scan flags any top-level `require(` whose argument contains `experts`, whether as a string literal or inside `path.join`/`path.resolve` with an `'experts'` segment.
    - (b) In a fresh child process, `require('lib/run-rules.js')` loads first and `experts/experts.js` loads after it. The child then runs `commitEvidence` with `--card A` on the gate fixture and prints the result. The required list deep-equals `['quality']`, the same as test 9. That proves `experts.js`'s binding to run-rules is the full module and not a partial cycle export.
20. `run-phase.test.js`: `adhocCard passes --experts only with names already in the plan's line`. An expert added by recheck whose `record` failed is in the queue but not in the line. The `card-add` command holds only plan-line names, and the card is not `not started`.
21. `run-phase.test.js`: `agent text never reaches a command line`, a table test. The table's text sources are:
    - a finding's `what: '$(touch PWNED)'`
    - a card title holding a backtick
    - a park reason holding `$HOME`
    - a `stoppedBecause` holding `$(touch PWNED)` (the stop step, run.js 898)
    - the settle-first "waiting for <cards>" text, where a card title holds `$(touch PWNED)`
    - the text of the finished notify step

    For each one, the string appears in no command string of any step prompt. It appears only in a `files` entry that a `--*-file` flag reads (`--reason-file` for the stop, wait and finished steps). The live part runs only when a bash is found that is not `%SystemRoot%\System32\bash.exe` (the WSL launcher). Otherwise it is skipped with the reason stated, and the string check always runs. The live part runs every generated command line in a temp dir. It includes a positive control: a sentinel command built by the same code path, whose text is `touch SENTINEL` placed where a command is expected. It asserts that SENTINEL exists and that each command exits with the expected status. "No PWNED file" counts only when SENTINEL exists.

### card-add and many-fixups (criteria 4, 4b): `run-rules.test.js`, `autopilot-fixes.test.js`, `run-phase.test.js`

22. `card-add into a ## Cards list followed by ### Card subsections keeps confirmHash`. The fixture has exactly this shape. After `card-add fixup`, the new bullet sits after the last list item and before the first `###`. The hash equals the hash before.
23. `parseCards on a plan with ### Card subsections returns only the list items`. The names deep-equal the list, both before and after the add. A `- Rounds: ...` detail bullet is not a card.
24. `card-add --free-name with fixup taken adds fixup-2, prints it, and the hash still holds`. The existing `fixup` has a different title from the new call.
25. `card-add --free-name with fixup and fixup-2 taken adds fixup-3`. This rules out "always append -2".
26. `card-add --free-name reuses a card only when it is uncommitted with the same title and the same carried text`, a table test. All rows use the title `confirmed review findings`, as adhocCard does.
    - (a) Same call twice on an uncommitted card: both calls print the same name, and the `parseCards` count rises by 1.
    - (b) Existing uncommitted `fixup` with different carried text: `fixup-2` is added, and the count rises by 1.
    - (c) Existing `fixup` marked committed, with identical carried text: `fixup-2` is added, and the count rises by 1.
27. `free-name helper is bounded`. It runs in a child via `spawnSync(..., { timeout: 5000 })`. With every name up to `-99` taken, the child exits with `status === 0` and `signal === null`, and stdout parses to `{ok:false, reason}`. A `taken()` that throws counts as taken (same child, second case).
28. `one exported pattern drives the free name and the confirmHash drop rule`. Inside `## Cards`, the hash drops `fixup`, `fixup-2` and `findings-12`. It does not drop `fixups`, `fixup-x`, `myfixup`, or a `fixup` bullet outside `## Cards`.
29. `refused card-add prints one JSON line with its own reason`, a table test. The rows are: a taken name (no free-name), no experts line, an unknown expert, and an expert outside the plan's line. `spawnSync` stdout has exactly one line, and it parses to `ok: false`. The `reason` matches that refusal's own message, using four different regexes.
30. `run-phase.test.js`: `a refused card-add's reason reaches the report, not "printed nothing"`. The report holds the stub's reason string verbatim.
31. `run-phase.test.js`: `every later step of a run-added card keys on the name card-add printed`. The stub `card-add` prints `fixup-2`. The `pack --card` argument, the agent labels (`fixup-2:*`), `status[]`, the report entry and `parkCard` all use `fixup-2`. No label starts with `fixup:` after setup.
32. `run-phase.test.js`: `findings in files of two plan cards make two fix-up cards, each with its own findings and its card's experts line`. Plan cards A (`quality`) and B (`security`) have no shared file. There are two `card-add` calls with distinct names. For each call, `--experts` equals its covering card's line. The `--paths`/`--carried` file read from `files` deep-equals that group's findings and files only, with nothing from the other group.
33. `run-phase.test.js`: `findings in a file no card covers, or with no file, make one more card with the plan's line`. The findings are one on an uncovered path, one with `file: ''` and one with no `file` key. Exactly one extra `card-add` is made with the plan's line. Each of the three findings appears in its carried text, or (for the two with no file) in the report's findings section. None is dropped: the test counts them in the union of the two.
34. `run-phase.test.js`: `a fix-up on a file covered by two cards gets past the gate`. A finding sits in the A/B shared file. The fix-up goes to A (first in plan order), and that grouping is asserted. The stub `card-commit` applies the real union rule by calling `run-rules`. The fix-up reaches status `committed`, which requires that the security lane ran on it (count >= 1 `<fixup>:security` label). The table has a second row that runs the same steps on a resume, where `ownExperts` is true, with the same assertions.
35. `run-phase.test.js`: `one fix-up card that parks does not stop the others`. Card 1 of 2 parks, and card 2 reaches `commit`.
36. `run-phase.test.js`: `at most four fix-up cards per run; the rest stay in the report`. Five groups give four `card-add` calls, and the fifth group's findings are in the report.
37. `run-phase.test.js`: `the report names the run each fix-up card came from`. Each fix-up row holds the run id from `run.json`.

### expert-retry (criterion 5): `run-phase.test.js`, with a responder keyed by call count

38. `an expert that returns null once is retried and the card commits`. The expert's first call returns null and the retry returns a valid result. The status is `committed`, the expert has 2 calls (1 first, 1 `:retry`), and there is 1 `:commit` call.
39. `experts that return null twice park the card with every failed name and card-commit is not called`. genai and security are both null on both calls. The reason holds both `genai` and `security` and names the first check. There are zero `:commit` calls and zero `record` calls.
40. `a valid empty result is a success and is not retried`. There is 1 call, and zero `:retry` labels.
41. `only the failed expert is retried`. Of two experts, one returns null. The other has 1 call, and the number of `:retry` labels equals the number of failed experts.
42. `the same retry and park rule applies after a fix round (-fix tag)`. This mirrors 38 and 39 on `<card>-fix:<expert>` and `<card>-fix:<expert>:retry`.
    - (a) Null once: the expert has 1 first call and 1 retry, and the card commits.
    - (b) Null twice: zero `:commit` and zero `record` calls after the fix round. The reason names the expert and says the failure was in the check after the fix round, so it is a different string from 39's reason.
43. `a refute agent null twice parks the card; no fix round is paid`. `seen.filter(l => l === '<card>:refute').length === 1`, and the `<card>:refute:retry` count is 1. There are zero `fix-round` calls.
44. `a recheck agent null is retried once`. The recheck label has 1 first call and 1 `:retry`.
45. `retry labels are in declared order and replay on resume`. With experts declared `[genai, quality, security]` and genai and security null, the retry labels deep-equal `['<card>:genai:retry','<card>:security:retry']`. The stub resolves the experts in reverse order (by `setTimeout` delays) and gives the same labels. Two runs with the same stub give a deep-equal `seen` sequence, and no label holds a digit run that is not in the card name.

### settle-first (criterion 6): `run-phase.test.js`, `autopilot-fixes.test.js`

46. `with one card parked: no review, no fixup, no findings card, no harvest`. There are zero labels matching `^review:`, `^harvest`, `^fixup` or `^findings`. `result` and the report name the waiting card and give `/ultimate-workflow:review` and `/ultimate-workflow:harvest`. `run.json` records no harvest branch.
47. The same check for a waiting card, as one table test. Rows: a plan card that is `blocked`, `needs-decision` or `not started`, and a row where all plan cards are committed and fix-up card 1 of 2 parks. In the fix-up row there is no `^harvest` label, the report names the fix-up as the card waited for, and `run.json` records no harvest branch.
48. `with all cards committed: each review lens and the harvest run exactly once`.
49. `the review range is the base from run.json, not runBranch's resume HEAD`. On the second resume the stubbed `runBranch` returns a base SHA that is different from `run.json`'s base. The review prompt contains `<run.json base>..HEAD` and does not contain the runBranch base.
50. `a later settling resume reviews only what is new since the recorded head`. This has two cases.
    - (a) No new commit since the first settle: zero review and zero harvest labels.
    - (b) A card is committed on a later resume. There is exactly one review per lens, whose prompt holds `<recorded head>..HEAD`, and exactly one harvest call. `run.json`'s recorded head moves to the new HEAD.

### harvest-name (criterion 7): `autopilot-fixes.test.js`, temp repo

51. `with uw/harvest/<f> taken, harvest makes <f>-2 and returns ok: true`. The branch exists in `git branch --list`.
52. `with <f> and <f>-2 taken, harvest makes <f>-3`.
53. `run-phase.test.js`: `a second harvest is told the open uw/harvest/<f>* branches`. The harvest prompt names each one.
54. `the memory.md merge-conflict note is still given`.

### reasons (criterion 8): `run-rules.test.js`, `autopilot-fixes.test.js`, `run-phase.test.js`

55. `a 5000-character park reason cut inside a word at 240 is byte-equal in report.md`. The reason has no newline. The test finds the exact whole reason as a substring of `report.md`, all on one line.
56. `a reason holding newlines is one line in report.md`. The newlines are joined, and nothing is dropped.
57. `the plan's status: and parked: lines are cut at the last word end and name parked.md`, a table test. In every row, `parked.md` holds the whole reason.
    - (a) A 5000-character reason whose 240th character is inside a word. The kept prefix equals `reason.slice(0, reason.lastIndexOf(' ', 240))` after trimming. The line is at most the cap and holds the `parked.md` path.
    - (b) A 600-character reason with no whitespace. Each line is at most the cap and still holds the `parked.md` path. The kept prefix is a hard cut of the reason at the room left, not `slice(0, -1)`.
    - (c) A 60-character reason with no `;`. The status: line holds the reason exactly, followed by the parked.md path, with nothing cut.
58. `the cuts at run.js 595, 825 and 898 keep the whole reason`. One case each. The whole reason reaches its destination through a `--*-file` entry (test 21 checks that it is not on the command line).
59. `unpark on a real 3-way conflict names the file in conflict`. Real temp repo with `LC_ALL=C`. The reason holds the conflicting file's path.
60. `the conflict reader returns the last lines, not the first, when it finds no file`. A pure test on a multi-line sample. The result deep-equals the sample's last N lines.

### one-notice (criterion 9): `autopilot-fixes.test.js`, `run-phase.test.js`

61. `notify: every kind in NOTIFY_KINDS except finished is file-only`. The test loops over the exported `NOTIFY_KINDS`. This has two parts.
    - (a) With `ULTIMATE_WORKFLOW_NOTIFY=off`: `desktop === 'file-only'` for each non-finished kind, and `desktop === 'off'` for `finished`. The kind filter must run before the off check.
    - (b) Counter: `ULTIMATE_WORKFLOW_NOTIFY` is unset, and a counting desktop function is passed in as an option argument of `notify`. It is not an export swap, because `notify` calls its local binding (autopilot.js 367). The counter has exactly one call across the whole loop, made for `finished`, and the counted function never shells out. This part is why the test does not set NOTIFY=off. Line 367 skips the notifier entirely when off, so a counter cannot be seen under off.
62. `notifications.md and .jsonl still hold every notice`. The line count equals the number of `notify` calls, and each kind is present.
63. `run-phase.test.js`: `a run with two parked cards, blocked cards and a stop sends one finished notice that names every blocker`. Exactly one step command holds `notify --kind finished`. Park steps do not send to the desktop. The finished step's text (from its `--reason-file`/`--action` file entry) names each parked card and each blocked card by name.
64. `docs.test.js`: `run.md tells the session to send notify --kind finished with stopped when the run ended without one`. This is the only check possible for the session-side rule, and the review must say so.

### dry-run (criterion 10): `evals/experts/claims.test.js` (pure, plus CLI on a temp repo)

65. `claims prints each card's pack size against pack_budget; a card whose required entries alone are over the budget is listed`. The numbers equal what `autopilot pack` gives for the same card.
66. `a measure: bytes line gives the size now, the room left and the cards under the glob`. The exact numbers come from fixture files of known size.
67. `measure counts bytes, not characters`. The fixture is non-ASCII, so `Buffer.byteLength` differs from `.length`. The size reported is the byte count.
68. `a measure: line it cannot read gives understood: false and is never passing`.
69. `a measure: glob with .., absolute or drive prefix gives understood: false and reads nothing outside the root`. A file outside the root, of known size, does not appear in the total.
70. `a claim is passing exactly when it is within its limit`, a table test over `measure: bytes <glob> <= N`. Each row has `understood: true` and `room === N - size`.
    - size < N: passing `true`
    - size === N: passing `true`
    - size === N + 1: passing `false`
71. `claims prints one JSON line with ok and is in COMMANDS`.
72. `docs.test.js` (or a `phases/tests.js` test): `the tests phase runs claims before the confirmation and stops to ask on a not-understood or failing line`. It asserts both the order of the steps in `phases/tests.js` and the stop. Text in `commands/tests.md` alone is not enough.

### report-cost (criterion 11): `autopilot-fixes.test.js`

73. `report.md has a Pack (est.) column with each card's pack tokens; the Note cell no longer holds the pack size`. In the test 74 fixture, each card's Pack (est.) cell equals the `tokens` that `lib/pack.js` `assemble` returns for that card. The value is not the budget.
74. `a card with token data shows a number and a card without shows unknown, in one fixture`. The fixture holds both cards, and no Tokens cell is `0`.
75. `Tokens counts <card>:, <card>-fix: and :retry labels`. The value equals the hand-summed fixture total.
76. `Tokens matches the card name exactly`. Cards `x` and `xy` both exist, and `xy:*` agents are not counted for `x`. If the build also supports a card named `x-fix`, add the case that its labels are counted for `x-fix` only. Otherwise the rule must refuse such a name.
77. `cache reads are shown apart from the token total`. Tokens equals the hand-summed input + cacheWrite + output. A separate cell equals the fixture's cacheRead, and cacheRead is not in Tokens.
78. `when every card is unknown the report gives the run's total from the Workflow result`. The total equals the fixture's Workflow total.

### run-md (criterion 12): `evals/experts/docs.test.js`

79. `run.md round rules match run.js`. The test reads `ROUND_CAP` from `run.js` source, not a copied literal, and asserts that run.md states it. It also greps `run.js` for the two early-stop conditions: the diagnosis test (around line 244) and the same-signature test (around line 257). It fails if either is missing. For each one, it asserts that run.md holds that rule's fixed phrase (pinned in the test, one per rule). It also asserts that the old "up to three rounds" sentence with no exceptions is absent.
80. `run.md says the .gitignore commit happens only when the line was missing`. The old "always committed" wording is absent.
81. `run.md says review, fix-up and harvest wait for parked cards and the harvest branch may be uw/harvest/<feature>-2`.
82. `run.md says one desktop notification, at the end`. The old "every blocker as it happens" wording is absent.
83. `mirrors.test.js` passes after the edit.

### release and limit (criteria 1, 13)

84. `evals/security-expert/provenance.test.js` `experts/ budget` passes with every card in place (criterion 1). It cannot be made to fail first, because it passes today. The build's prove-red step for this criterion is "not applicable". It is checked at the end, on the last card's commit.
85. `mirrors.test.js` 239-248 asserts 4.8.0 as a literal in the five fields and the `## [4.8.0]` heading.
86. `docs.test.js`: `CHANGELOG 4.8.0 names the unattended-run fixes`. It reads `CHANGELOG.md`. The `## [4.8.0]` entry holds `### Fixed (the unattended run)`, and that section names items 4 to 16, each by a fixed phrase pinned in the test.
87. The full verification command above is green on the release commit.

**Done means:** every test named above exists under the quoted globs. Each one fails before its card's change and passes after it. Tests 18, 84, 85 and 87 are the exceptions: 18 is recorded green on the first card, and 84, 85 and 87 pass throughout. The full command is green. Review check (not a test): `card-experts.test.js`, `experts.test.js`, `memory-gate.test.js` and the 4.8.0 block of `mirrors.test.js` are not weakened. The reviewer reads their diffs in the PR.

### Expert test cases

#### quality

The draft covers every constraint I set at plan: count-keyed retries, -3 harvest, a file outside the named card, a 5000-char reason, every NOTIFY_KINDS value, round rules read from source, a non-ASCII measure fixture, LC_ALL=C, and the ### Cards fixture. The release card staying at 4.8.0 was the owner's choice (plan line 20), so draft 85 is right. The cases below cover wrong fixes the draft still lets through: a retry whose result is thrown away, a hash rule that drops too much or moves the hash of existing plans, a dedupe that ignores committed cards, an unknown card name that narrows G6, a later resume that never harvests, a word cut on a reason with no space, and an arbitrary choice of which four fix-up cards are kept.

- **retried expert's findings are used, not dropped**: run-phase.test.js, responder keyed by per-label call count: the expert's first call returns null and its retry returns one finding {file:'a.js', what:'X'}. The refute agent's prompt for that card contains 'X' (or a fix-round label for the card appears), and the card is not reported as committed with zero findings. (catches: Draft 38 has the retry return a valid result and checks only that the card committed. An implementation that makes the retry call but then treats the card as a clean empty result commits too, and so passes 38 while silently dropping the retry's findings.)
- **confirmHash is unchanged for existing plans and still moves when a real card changes**: Two parts. (a) Characterisation: for an existing confirmed plan fixture with ### Card subsections and no fixup/findings cards (for example a copy of PLAN-memory-index.md), confirmHash after the change equals a literal hash recorded from the pre-change code. (b) In the draft-22 fixture, editing one character of a plan card's bullet, and separately one character inside a ### Card subsection, each gives a hash different from the original. (catches: Draft 22 and 28 prove only what is dropped. A shared end-of-list rule that stops hashing at the first ### keeps 22 equal and 28 green while hiding edits to card detail. A rule that moves the hash of existing plans un-confirms every plan in flight. Neither is caught today.)
- **card-add dedupe never returns a committed card**: Plan with card 'fixup' whose status is committed, title T, carried text C. `card-add --free-name` with the same T and C prints 'fixup-2', and the parseCards count goes up by exactly 1. (catches: Draft 26 tests the same call twice on a not-committed card. An implementation that matches on title and carried text alone, ignoring status, passes 26 and returns the already-committed card, so the new findings are never built.)
- **card-commit --card with a name that is not in the plan does not narrow G6**: autopilot-fixes.test.js temp repo: cards A (experts: quality) and B (experts: security) both cover file f. `card-commit --card nosuch` changing f with only quality on record prints ok:false with a reason naming security, and no commit is made (HEAD is unchanged). (catches: Every gate-card case names an existing card. An implementation that looks up the card, gets undefined, and reads its experts as [] (no experts needed) passes 9 to 17 and opens the very G6 bypass the security floor exists to close.)
- **a later settling resume does harvest when cards were committed after the recorded head**: run-phase.test.js: run 1 settles (the harvest label is seen once and run.json records head H). Run 2 resumes with one more card committed after H: the review prompt holds 'H..HEAD', and the harvest label is seen exactly once in run 2. (catches: Draft 50 covers only the case where nothing was committed, which an implementation that never harvests again after the first settle also passes. This is the positive half of the 'harvests only when cards were committed after it' rule.)
- **plan status line cut on a reason with no space and with a non-BMP character at the cap**: Two inputs: (a) 5000 characters of 'x' with no space; (b) 239 'a' followed by a U+1F600 and then more text. For each, the plan's status:/parked: line is non-empty, is at most the cap in length, names the parked.md path, and holds no lone surrogate (no unpaired code unit in U+D800 to U+DFFF). parked.md holds the full input byte-equal. (catches: Draft 57 assumes a space exists before the cap. A cut that backs up to the last space returns an empty or path-only line, or never ends, when there is none. A slice at 240 splits the surrogate pair, because JS slice counts UTF-16 units, and writes an invalid character into the plan.)
- **the four kept fix-up cards are the first four groups in plan order**: run-phase.test.js: findings fall under five plan cards C1..C5, and the findingsQueue is filled in the order C5, C3, C1, C4, C2. The four card-add calls carry the experts lines of C1, C2, C3 and C4, and the report lists C5's findings as not carried. (catches: Draft 36 checks only that there are four calls. An implementation that takes the first four in queue order, which depends on agent finish order, passes 36. It then keeps a different set on each run and breaks the resume replay that the retry labels rely on.)
- **agent text in a park reason and in the stopped notice never reaches a command line**: run-phase.test.js: a park reason and a stop reason each hold '$(touch PWNED)', a backtick and '$HOME'. None of the three strings appears in any command string of any step prompt for parkCard, the notify step or the stopped notice. Each appears only in a files entry read through a --*-file flag. (catches: Draft 21 plants the text only in a finding's what, a title and a park reason through adhocCard. The stopped notice at run.js 898, which the reasons card makes longer, and the notify --kind finished line can still q() agent text and pass 21.)

#### security

The security cases test each control from the attacker's side. A card the run adds, a card that does not exist, or an accepted change made under a fix-up card must never shrink the experts check. Every form of the plan pointer that can escape the root must be refused by all three readers. A `measure:` glob must not reach outside the root or run anything. Agent-written text in a finding's file field or in stop text must never reach a command line. A malformed expert result must fail closed. The draft already covers the fixup floor (12, 14), the main pointer forms (4, 5), adhocCard's `what`, title and reason text (21), and the `..`, absolute and drive globs (69). The cases below fill the gaps I found against my plan constraints at PLAN-run-fixes.md lines 342-345.

- **card-commit --card naming a card that is not in the plan falls back to the union**: A temp repo with cards A (experts: quality) and B (experts: security), where the diff touches a file under B. `card-commit --card ghost` (no such card) and `card-commit --card A` with A's experts or paths line deleted by hand after confirmation (hash now broken) are each refused, and the reason names security. Neither returns ok: true with an empty missing list. (catches: If the per-card lookup treats 'card not found' or 'no experts parsed' as an empty requirement, the check is open to anyone who passes a made-up card name. The draft only tests real cards.)
- **--resume fixup --accept on a run-added card still needs the covering cards' experts**: A run-added fixup card with experts: [] accepts a file that sits under a security plan card, and a second file outside every card. After `--resume fixup --accept`, card-commit is refused until security's evidence is on record, and the missing list includes security. It must not say 'judged by fixup's experts' and need nobody. (catches: Case 17 tests accept only on a plan card. Under the 'judged by A's experts' rule, accepting under an empty fix-up card would skip review of the accepted files, which is the floor I required at plan line 342.)
- **all three pointer readers refuse the same unsafe pointer**: For each unsafe pointer in case 4's table, written by hand into .ultimate-workflow/active-plan: pointedPlanFile returns null. A `card-commit` run in that repo judges G6 and G7 exactly as it does with no pointer (same ok, same missing list). Also: a junction at internal/ that points outside the root and holds a real PLAN-x.md is refused by pointedPlanFile and by readState. A dangling junction (target deleted) makes no reader throw, and each gives the no-pointer result. (catches: Case 4 checks only setActivePlan and readState. The plan requires one shared function (line 343). A reader that keeps its own weaker check, or crashes when realpath throws, sends a gate to a plan outside the project or kills the hook.)
- **measure: glob does not follow a junction out of the root**: Inside the fixture root, `data/` is a directory junction to a temp dir outside the root that holds a 7777-byte file. `claims` on `measure: bytes data/**` either gives understood: false or a total that leaves out the 7777 bytes. The outside file's path appears nowhere in claims' stdout. The test runs on win32. (catches: Case 69 tests only `..`, absolute and drive text. A JS walker that follows links reads and prints sizes outside the project through a path that passes every text check.)
- **measure: glob with shell or Windows escape syntax is inert**: A table: `$(touch PWNED)`, `*;touch PWNED`, a backtick payload, `..\\x\\*`, `\\\\server\\share\\*` and `C:x*`. Each gives understood: false or zero matched files, and never passing. After all of them, no PWNED file exists in the root or the cwd. (catches: The plan says no shell or spawn expands the glob (line 345). A version that hands the glob to a shell, or that runs the `..` check before turning backslashes into slashes, passes case 69.)
- **finding file field and stop text never reach a command line**: A stub run where a finding's `file` is `src/$(touch PWNED).js` and its `line` is the string '1`touch PWNED`'. The run ends stopped, with stop text and waiting-for text holding `$(touch PWNED)` and `$HOME`. These strings appear in no command string of any step prompt, including adhocCard's `--paths` and the `notify --kind finished` step. They appear only in `files` entries read through a `--*-file` flag. When bash is present, running the generated commands leaves no PWNED file. (catches: Case 21 covers only `what`, the title and the park reason. The plan names `--paths` and the stopped notice at run.js:898 as sinks (line 344), and the reasons card makes that text longer.)
- **a malformed expert result is treated as nothing, not as an empty success**: A stub expert returns, on its first and second calls, a non-null value of the wrong shape: a plain string, then an object with no findings array (or a findings value that is a string). The card parks with that expert's name in the reason, and there are zero card-commit and zero record calls. Separately, the shape `{findings: []}` commits after one call. (catches: Cases 38 to 40 tell only null from valid-empty. A check that treats any non-null result as success would let an expert that never reviewed the card count as having cleared it, and the gate would pass.)

#### genai

For the run's own agent calls, the tests must show three things. Each expert, refute and recheck call has a fixed upper bound per card. A null from any of them takes a stated failure path and is never read as "no findings" or "no experts added". The park reason names exactly which agent failed and in which check. I read the genai constraints (plan lines 360-367), the folded rule at line 257, and draft cases 38-45 and 73-78. The Tokens cases (74-78) already cover what report-cost needs, so the cases below are all for expert-retry.

- **an expert retried in both checks runs at most four times per card**: run-phase.test.js, responder keyed by per-label call count. Card has one expert. First check: its first call returns null and its retry returns a result with one high finding, which refute confirms. The fix round runs. Fix-round check (-fix tag): its first call returns null again and its retry returns a valid empty result. Assert the expert has exactly 4 agent calls across both checks. Exactly 2 of them carry the :retry label, one with tag '' and one with '-fix'. The card status is committed. (catches: A retry loop with no per-check cap, or a retry counter shared across the two checks, passes cases 38 and 42 one at a time. It still breaks the 4-calls-per-card bound the plan states at line 362.)
- **park reason names every expert that failed twice and the check it failed in**: Two cases. (a) First check with experts genai and security both null on the first call and on the retry. The park reason contains both 'genai' and 'security', and a phrase marking the first check. Zero :commit calls and zero record calls. (b) Same setup, but the failure happens only in the -fix check after a fix round. The park reason names the expert and a phrase marking the check after the fix round, and it does not match the wording of case (a). (catches: Case 39 has one expert and one check, so a reason built from only the first failed name, or with no check named, passes it. The plan (line 363) requires every failed expert and the check to be named, so the user does not pay to rerun the wrong step.)
- **a refute that returns null once and then refutes the high findings stops the fix round**: An expert returns one high finding. The refute agent's first call returns null, and its retry returns a verdict refuting that finding. Assert the refute label has exactly 2 calls, zero fix-round calls are made, and the card reaches :commit once. (catches: Case 43 covers only refute null twice. A build that retries refute but still treats the null first answer as 'unverified, still blocks' pays a fix round for findings the skeptic then refuted. That is the cost fault named in the plan at line 366.)
- **a recheck that returns null twice is not read as 'no experts added'**: The recheck agent returns null on its first call and on its retry. Assert the recheck label has exactly 2 calls. The card either parks with a reason naming recheck, or reaches card-commit only with an explicit recheck-failed marker that the report shows. The required expert list must never be silently cut back to the card's own experts as if recheck had returned false (run.js 482 today). (catches: Case 44 checks only that the retry happens. The planned outcome after a second null is not stated (line 257 sets refute to park, but says nothing for recheck). Today recheck = false quietly drops the experts that recheck would add, so the card commits with fewer expert reviews and shows no sign of it.)
- **retry counts only null, and a malformed result is handled as the plan states**: Pure check through expertsCheck with a stub agent. An expert that returns a valid result with findings: [] is not retried (1 call). An expert that returns an object without the findings field is either counted as failed and retried once, or rejected by the result schema before it reaches expertsCheck. In both cases its result is never merged as zero findings. Assert the call count, and that the card does not commit on that expert's empty merge. (catches: The plan defines failure as null (line 362). An object that is not null but malformed, read as 'no findings', lets a broken expert pass the gate without a retry and without a park.)
