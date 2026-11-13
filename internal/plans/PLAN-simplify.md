---
phase: plan
plan_confirmed: true
tests_confirmed: false
test_command: node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
test_related_command: node --test {tests} mirrors.test.js
full_suite_paths: .cursor-plugin/ultimate-workflow/hooks/lib/**, .cursor-plugin/ultimate-workflow/hooks/hooks.json, .cursor-plugin/ultimate-workflow/experts/*.js, .cursor-plugin/ultimate-workflow/lib/**, .cursor-plugin/ultimate-workflow/phases/**, .cursor-plugin/ultimate-workflow/commands/**
volatile_paths:
verify_rounds: 0
last_verify: unrun
dirty: false
escalated: false
experts: [developer, softarch, quality, security, genai, devops]
---

# PLAN-simplify: one commit check, reminders everywhere else, one copy of each thing

Input: `internal/plans/simplify-direction.md` (binding; the three owner decisions are not reopened here) and `internal/plans/followups-after-4.8.0.md` (faults 17-22, 15 review concerns, harvest lessons).

Note on this file's own front matter: `verify_rounds`, `last_verify`, `dirty` and `escalated` are there because the current plan shape asks for them. This plan removes them (card 5). Until then they are inert.

## 1. Feature description and goal

The plugin has grown to 13 checks and 30+ state files (the owner's map). Several things exist two to four times: front-matter parsers, the add-only expert merge, the Cards reader, the review, the harvest, the resume form, the "these exact changes" fingerprint. Checks block during work, sometimes for things the session did not do (fault 18) or cannot fix.

This plan makes the plugin smaller without losing what it promises at commit:

- One blocking check, at `git commit`. Everything before it reminds and never refuses.
- One implementation of review, harvest, expert selection, front-matter parsing and add-only merge, shared by the by-hand flow and the unattended run.
- State in a handful of files, none written by a hook on every edit.
- All 9 experts and 50 skills stay. Nothing is cut; each is measured.

It is built by hand, test first, never with the unattended run on this repository, and never by editing the frozen copy at `C:/Users/kobiv/Projects/uw-plugin-snapshot`.

## 2. Success criteria (each can be checked)

1. Exactly one function decides whether a commit is allowed. `hooks/lib/dispatch.js` (hook path), `experts/autopilot.js` cardCommit (run path), `hooks/status.js` (report) and the `experts.js check` command all call it. A grep finds no second caller-side decision.
2. That function refuses unless all four hold, and its refusal lists every missing item with one fix command each:
   - plan and tests confirmed, and the plan text still matches `confirmed_hash`;
   - a full test run passed on exactly these changes (the fingerprint in `.ultimate-workflow/verify.json`);
   - the experts reviewed exactly these changes and no high-confidence finding is open;
   - the memory files are not newly broken by this commit.
3. No hook refuses an edit and no hook blocks a turn from ending. `preEditGate`, `stopGate` and `roundCap` no longer return a deny or a stop block.
4. No hook writes the plan file. The keys `dirty`, `verify_rounds`, `last_verify`, `escalated`, `gate_violation` are written nowhere, and `.ultimate-workflow/heartbeat.json` is written nowhere.
5. One front-matter parser, one in-place front-matter writer, one add-only merge, one Cards-section reader. A grep for each old copy finds nothing (including the copy in `hooks/status.test.js`).
6. The run (`phases/run.js`) has no review, harvest or build-loop code of its own: it uses the same blocks as `phases/review.js`, `phases/harvest.js` and `phases/build.js`.
7. Harvest runs once per feature. A resume after a crash does not create `uw/harvest/<feature>-2`.
8. A resume repeats no step that is already recorded as done.
9. An old project keeps working: a plan with the old front-matter keys still reads as confirmed, an old `verify.json` is still accepted, and old leftover files are ignored.
10. The full verify command is green after every card. The user-facing commands (`feature`, `plan`, `tests`, `build`, `review`, `harvest`, `experts`, `value`, `expert-attribution`, `handoff`) still exist and still pass the wording checks in `mirrors.test.js`.
11. The before and after table in section 9 is filled with measured numbers, and "after" is smaller in blocking checks (1), state files (target 8 or fewer kinds) and duplicated code.

## 3. Files explored

Paths are under `.cursor-plugin/ultimate-workflow/` unless they start with `internal/`, `evals/` or are at the repo root.

| Path | Why it matters |
|---|---|
| `internal/plans/simplify-direction.md` | The binding direction and the three owner decisions. |
| `internal/plans/followups-after-4.8.0.md` | Faults 17-22, concerns 1-15, harvest lessons. Each is mapped to a card in section 6. |
| `hooks/gate.js` | Only hook entry point. Owns all I/O, gathers commit evidence only for a commit command, writes patches and the heartbeat, fails open. |
| `hooks/lib/gates.js` | Pure predicates: `preEditGate` (line 126), `stopGate` (188), `fullSuiteGate` (218, G7), `isCommitCommand` (238), `expertsGate` (266), `commitGate` (306, memory then G6), `roundCap` (323, G4/G5), `phasePointer` (366). Path helpers `isDocPath`, `isRunPath`, `isTestPath`, `toProjectPath`. |
| `hooks/lib/dispatch.js` | Routes events to the predicates. Sets `dirty` and `gate_violation`, calls `roundCap`, holds the Stop order and the detect-only path. |
| `hooks/lib/state.js` | `parseFrontMatter` (57), `patchState`, `serializeFrontMatter`, `activePlanFiles` (102), `pointedPlanFile` (135), `setActivePlan` (145), `newestPlanFile` (153, picks by mtime), `readState` (245), `projectRoot`, `gatesEnabled`, `handoffComplete`, `ROUND_CAP`. |
| `hooks/lib/adapters.js` | Host wire format. `respond(vendor, kind, opts)` already has the kinds `allow`, `deny`, `context` (additionalContext) and `stopBlock`. `canBlockWrite(vendor)` is false for Cursor. |
| `hooks/lib/heartbeat.js` | `record`, `read`, `liveness`. The only record of a deferred Stop. Candidate for removal. |
| `hooks/verify.js` | Runs tests, writes `.ultimate-workflow/verify.json` (`recordFull`, `readRecord`, `fullEvidence`), baseline (`judge`, `extractFailures`), lock, and its own `setFrontLine` (about line 175). Requires `experts/experts.js`. |
| `hooks/status.js` | Reports what the real predicates would block. Calls `preEditGate` and `stopGate` with a fake path, `commitGate` directly, and reads the heartbeat for liveness and deferral. |
| `hooks/hooks.json` | Registers `gate.js` for PreToolUse, PostToolUse, PostToolUseFailure, UserPromptSubmit and Stop. Hosts read it only at start. |
| `experts/experts.js` (1813 lines) | `list` (90), `selectSkills` (357), `mergeAdd` (430), `frontmatter` (440), `readExperts` (453), `setExperts` (464), `confirmHash` (495), `setFrontLine` (527), `checkConfirmed` (540), `setConfirmed` (552), `selectIntoPlan` (615), `effectiveExperts` (641), `workingChanges` (771), `testFingerprint` (808), `allFindings` (1022), `resolve` (1034), `prepare` (1058), `record` (1166), `memoryEvidence` (1236), `commitEvidence` (1252), `stageScript` (1295). |
| `experts/autopilot.js` (1261 lines) | The run's commands: `pack` (154), `commitPlan` (336), `markClean` (313, writes `dirty:false`), `notify` (361), `detectDecisions` (438), `park` (606), `unpark` (666), `journalAdd` (690), `cardCommit` (740), `harvestBranch` (848). |
| `experts/cards.js` (262 lines) | Pure Cards parser and editor: `cardsRange` (41), `parseCards` (58), `setField`, `covers`, `outOfScope`. |
| `lib/run-rules.js` (135 lines) | Pure run rules: `narrowedExperts` (24), `freeName` (47), `shortReason` (80), `RUN_ADDED`, `acceptedFiles` with a copied item regex. Must not require `experts.js`. |
| `lib/memory.js` | Memory header parser (about line 35, a fixed flat subset), `harvestMemory` (421), `commitProblems` (492). |
| `lib/pack.js`, `lib/claims.js` | Context pack budget (`budgetOf` warns only) and the measure-line parser that `phases/tests.js` copies. |
| `phases/plan.js`, `tests.js`, `review.js` | The copied expert-lane block (`asList`, `wellFormedAvailable`, `describeExperts`, `SELECTION`, `addOnly`, `takingPart`); four expert-add points between them. |
| `phases/build.js`, `phases/run.js` (1155 lines) | `buildLoop` copied in both and held equal by a test; `run.js` also has its own `expertsCheck` (461), `covers` (642), `inCard` (658), review and harvest steps. |
| `phases/harvest.js` | By-hand harvest; mode `branch` calls the `harvest-branch` command and reads the last output line as JSON. |
| `commands/*.md`, `rules/uw-hooks-and-gates.mdc`, `memory/hooks-and-gates.md`, `memory/workflows-authoring.md`, `memory/mirrors.md` | Text the suite greps, and the topical docs that describe the gates being removed. |
| `mirrors.test.js` (repo root) | Phase/command pairs, exact wording, version pin 4.8.0 in five places, one writing agent, release ZIP contents, site names every phase and skill. |
| `hooks/lib/gates.test.js`, `dispatch.test.js`, `workflow-defer.test.js`, `review-findings.test.js`, `heartbeat.test.js`, `state.test.js`, `hooks/status.test.js`, `verify.test.js`, `baseline.test.js`, `registration.test.js` | Pin the gates and flags that change. Read by title only. |
| `evals/experts/harness.test.js`, `experts.test.js`, `card-experts.test.js`, `autopilot-fixes.test.js`, `autopilot.test.js`, `harvest.test.js`, `run-phase.test.js`, `claims.test.js`, `evals/autopilot/e2e.test.js` | End-to-end proof through the real gate and command line; the run and hand commit evidence rules; the harvest. |

What no reader opened, so cards that touch it start by reading it: `phases/run.js` lines 797-1155 (fix-up, review, harvest, settle, resume), `experts/autopilot.js` lines 719-1261 in full, `experts/experts.js` lines 1378-1813, `lib/pack.js`, `lib/claims.js`, every test body, `commands/` other than `feature.md` and `harvest.md`, and the owner's map artifact.

## 4. Existing-design review: what is reused

The simplification mostly moves callers onto code that already exists.

- **Pure predicate plus thin I/O.** Decisions stay pure functions in `hooks/lib/gates.js`; evidence gathering stays in `experts/experts.js` `commitEvidence`; `hooks/gate.js` stays the only hook entry. The one commit check is `commitGate` grown to hold everything, not a new module.
- **The run already calls the hook's predicates.** `card-commit` calls `fullSuiteGate` and `commitGate` itself because PreToolUse never sees git calls made inside `experts.js`. So "one function for the hook and the run" is one merge away, not a rewrite.
- **Confirmation check.** `checkConfirmed`, `setConfirmed` and `confirmHash` in `experts/experts.js` are the "confirmed and unchanged" rule. The commit check calls them; no new hash.
- **Tests-passed model.** `verify.json` written by `recordFull`, identified by `testFingerprint` over `workingChanges` (honours `volatile_paths`, merge-aware). Kept at the same path with the same fingerprint. The baseline rule (`judge`, `baseline.json`, expiry at head) is kept as it is.
- **Reminders.** `adapters.respond(vendor, 'context', ...)` already delivers added context. Reminders use it; no new host wire code.
- **Add-only merge.** `mergeAdd` and `selectIntoPlan` in `experts/experts.js` are the one merge.
- **Plan choice.** `pointedPlanFile` and `setActivePlan` (the `.ultimate-workflow/active-plan` pointer) are the explicit choice; the mtime guess is what goes.
- **Cards.** `experts/cards.js` stays the pure reader; `cardsRange` becomes the only section finder.
- **Run commands.** `git()`, `stage()`, `commitPlan`, `park`, `unpark`, `notify`, `detectDecisions` and its regexes, `freeName`, `shortReason` are reused unchanged.
- **Phase script delivery.** `stageScript` already writes a copy of the phase script, with its arguments inside, into `.ultimate-workflow/run/`. Shared blocks are added at that same step (see deviation 1).
- **Failure parsing and test choice.** `extractFailures`, `judge`, `hooks/lib/selection.js` are untouched.
- **Conventions kept.** Fail open on internal error; commands print one JSON line with `ok`; phase scripts return `{ok:false, error}` and never throw for missing arguments; only `uw-implementer` writes; payload stays under `.cursor-plugin/`; tests are `node:test` next to the code, run with `spawnSync` when stderr matters; test titles keep the guarantee id.

## 5. Keep, merge, remove

### 5.1 Checks

| Today | After | How |
|---|---|---|
| G1, G2 (edit before plan or tests are confirmed; `preEditGate`) | Reminder | `preEditGate` no longer denies. The state it tested is reported by the reminder function (5.2). |
| G6 at edit (the edit-time part of the experts gate inside `preEditGate`; `gates.js` names `.ultimate-workflow/experts/` there; its exact rule was not read, card 5 reads it first) | Removed | Accepted cost under owner decision 1. The commit check still needs evidence that matches the current fingerprint. |
| G3 (`stopGate`, turn end while dirty) | Reminder | A turn can always end. Fixes fault 18. The deferral logic for a running workflow goes with it. |
| G4/G5 (`roundCap`, round count and escalation in the hook) | Removed | The build loop's own stop rules in `phases/build.js` (`ROUND_CAP` = 3, same-signature stop, `testMayBeWrong`, `escalationText`) stay: they stop a paid loop, they are not a hook. |
| G7 (`fullSuiteGate`, full run on these changes) | Kept, inside the one commit check | The direction does not name G7; it is the second commit guarantee and must not vanish. |
| G6 at commit (`expertsGate`) | Kept, inside the one commit check | |
| Memory check (`lib/memory.js` `commitProblems`, called from `commitGate`) | Kept, inside the one commit check | Scope stays "only what this commit adds". |
| Plan and tests confirmed | New at commit | Before, the edit gates implied it. Now the commit check tests it with `checkConfirmed`. |
| Detect-only path on Cursor (`gate_violation`, then a stop block) | Removed | Cursor cannot block; it gets the reminders, and the commit check through `card-commit` and `experts.js check`. Not a goal to enforce there. |

The one commit check, in plain words:

- `commitGate(ev)` in `hooks/lib/gates.js` is the only decision. `fullSuiteGate` and `expertsGate` become private steps of it, or are folded in.
- `commitEvidence(cwd, planFile, pluginRoot, options)` in `experts/experts.js` gathers everything it needs in one pass: confirmation state, the `verify.json` record and the current `testFingerprint`, the expert records and open findings, the memory problems. The reading of `verify.json` moves here (or to a small file under `hooks/lib/` that both sides require), because `hooks/verify.js` requires `experts.js` and the reverse require would make the cycle real. `verify.fullEvidence` and `status.js` `fullVerifyReport` become calls to the same code, so "fresh, stale, never, failed" is computed once.
- It returns every missing item, not just the first, each with one fix command. Order of the list: confirmation, tests, experts, memory.
- Exemptions are carried over unchanged: documentation-only commits, empty commits, and whatever else G6 and G7 exempt today (card 1 lists them from the code before anything moves).
- The result is one of three, and each is printed by the hook, by `status.js` and in `card-commit`'s JSON line: **checked** (all four held, or the list of what is missing); **exempt**, with the reason (documentation only, empty commit, gates off, no plan in the project); **could not check**, with the reason (git error, an internal error). By hand, "could not check" lets the commit through and says so: a check that cannot be satisfied is worse than none (`memory/hooks-and-gates.md`). In the unattended run it parks the card, because nobody is watching. An unreadable plan or an empty `test_command` is not "could not check": it is a missing item with its fix command.
- Each guarantee is read on its own. The confirmation read does not sit inside the catch-all of `commitEvidence`, so one error cannot switch all four off silently.
- `commitGate` keeps its `{allow, reason, warnings}` shape and adds `missing: [{kind, text, fix}]`. `hooks/lib/gates.js` keeps requiring only `./state.js`: confirmation and the `verify.json` record arrive as fields of the evidence. `card-commit` keeps its `gate` field; its stale-index exception becomes an option of the shared function, not an edit of the evidence by the caller.
- The evidence uses the `volatile_paths` of the plan it was given, not of whichever plan `readState` finds.
- A plan with `plan_confirmed: true` and `tests_confirmed: true` but no `confirmed_hash` (confirmed before the hash existed) counts as confirmed; the next confirmation stamps the hash. The `## Known failures` section that a baseline accept writes is left out of the hash, like `## Run status`.
- Plan settings the check reads (`test_command`, `volatile_paths`, `known_failures`, `full_suite_paths`) stay outside the hash, so changing one does not cost a confirmation. Instead the check and the reminder say when one of them changed since the last confirmation, so a weakened check is visible.
- A commit-time stamp (`.ultimate-workflow/commit-check.json`: when the check last ran and its outcome) is written only when the check runs on a commit. `status.js` shows it. It replaces the heartbeat as the sign that the hook is really registered.
- `isCommitCommand` misses a commit hidden in `bash -c "..."`. The check is a strong backstop, not a proof. The docs will say so.
- The "accept" steps (confirm, baseline accept, resolve a finding) stay honour rules in command text. The code cannot tell who ran them, and the plan does not claim otherwise.
- Experts needed for a commit: one function, `effectiveExperts`, with one input that differs. A commit that names a card (the run) needs that card's experts; a commit with no card (by hand) needs the union across the cards that cover the changed files, falling back to the plan's `experts:` line. This keeps both pinned behaviours (gate-card 9 and gate-card 10). Concern 1 is narrowed by the new confirmation step: a card added by an agent changes the plan text, so `confirmed_hash` no longer matches and the commit is refused. Cards named by `RUN_ADDED` (findings, fixup) are outside the hash and keep their own rule in `narrowedExperts`.

### 5.2 Reminders

One pure function, `reminders(state, evidence)` in `hooks/lib/gates.js`, returns zero or more short lines:

- plan not confirmed yet; tests not confirmed yet (each with the command that confirms);
- code changed with no full test run since (computed by comparing the current `testFingerprint` with `verify.json`, so no `dirty` flag is needed);
- no active plan chosen while several exist (5.5).

`hooks/lib/dispatch.js` sends them with the existing `context` kind. It only reads; it writes nothing. `hooks/status.js` prints the same lines plus the commit check's list, so the report and the hook cannot disagree. They are sent at the start of a user turn (UserPromptSubmit) and at turn end (Stop), not on every edit. The bootstrap gates B-G1 and B-G2 (PRD and design not confirmed) live in `preEditGate` too; they become reminders the same way, and the commit check asks nothing extra during bootstrap.

### 5.3 Flags and state files

Goes away (writers and readers, with their tests, in the same card):

- `dirty`: set in `dispatch.js` postTool, cleared in `roundCap`, cleared by `autopilot.js` `markClean` (313). `park` and `unpark` call `markClean`; that call is removed with the flag.
- `gate_violation`: set in `dispatch.js` preTool.
- `verify_rounds`, `last_verify`, `escalated`: written by `roundCap`.
- `.ultimate-workflow/heartbeat.json` and `hooks/lib/heartbeat.js`: no reminder needs it once G3 and the deferral are gone. `status.js` loses its liveness and deferral lines and shows the commit-time stamp instead (5.1); its `--json` key set changes and `status.test.js` changes with it.
- `state.patchState` and `serializeFrontMatter`, if card 5 finds no caller left.

State after, as far as the readers saw it (card 0 writes the full list; the map says 30+ today):

| File | Holds | Fate |
|---|---|---|
| `PLAN-<feature>.md` front matter | Decisions and settings: `phase`, `plan_confirmed`, `tests_confirmed`, `confirmed_hash`, `test_command`, `test_related_command`, `full_suite_paths`, `volatile_paths`, `experts`, `pack_budget`, `known_failures` | Kept. Written only by commands the user runs, never by a hook. |
| `.ultimate-workflow/active-plan` | Which plan is active | Kept. |
| `.ultimate-workflow/verify.json` | The one tests-passed record | Kept, same path, same fingerprint. |
| `.ultimate-workflow/baseline.json` | Accepted known failures, expires at head | Kept (folding it into `verify.json` is possible but not needed for the goals). |
| `.ultimate-workflow/experts/<stage>/<expert>.json`, `waivers.json` | Findings and dismissals | Kept; the value report needs them. |
| `.ultimate-workflow/experts/_recheck.json` | Recheck marker | Folded into the review record if card 8 finds it can be; else kept. |
| `.ultimate-workflow/ledger.jsonl` | Catches and cost per expert | Kept (goal 5). |
| `.ultimate-workflow/run/<feature>/...` (`run.json`, journal, `parked.md`, notifications, `harvest.json`, card folders) | The run's own state | Kept; `run.json` becomes the one resume source (5.6). |
| `.ultimate-workflow/review.diff`, `snapshots/<hash>.diff` | Saved diffs | One saved-diff location; card 8 picks it. |
| `.ultimate-workflow/verify.lock`, `verify.log` | Lock and log of a test run | Kept; not state. |
| `.ultimate-workflow/heartbeat.json` | Hook liveness, written on every event | Removed. |
| `.ultimate-workflow/commit-check.json` | When the commit check last ran, and its outcome | New, small, written only at a commit. |

### 5.4 One parser, one writer, one merge, one Cards reader

- **Front-matter parser:** one block finder (accepts a BOM and CRLF) sits under both the parser and the writer; today the parser in `state.js` refuses a BOM that the writer in `experts.js` accepts, so a plan can be written as confirmed and read as unconfirmed. `hooks/lib/state.js` `parseFrontMatter` is the one parser for plans. `experts.js` `frontmatter` (440) becomes that block finder. `parseAgentFile` (72) moves onto the shared parser only with a test that `list` gives the same output for all 9 experts before and after. The `frontMatter(lines)` copy in `hooks/status.test.js` (186) goes. The header reader in `lib/memory.js` (`parseHeader`) stays as it is: it reads a nested format with line-numbered errors, and the memory guarantee rests on those errors. It is a different format, not a copy.
- **In-place writer:** one `setFrontLine(text, key, value)` that keeps BOM and line endings, living in `hooks/lib/state.js`. Removed copies: `hooks/verify.js` (about 175) and `experts/experts.js` (527). `setExperts` and `setConfirmed` call it. `autopilot.js` (about 554) stops repeating the `setFrontLine` plus `confirmHash` pair by hand and calls `setConfirmed`.
- **Add-only merge:** `mergeAdd` in `experts/experts.js`. The three `addOnly` copies in `phases/plan.js` (92), `review.js` (67), `tests.js` (66) become one shared block (deviation 1).
- **Cards reader:** `cardsRange` in `experts/cards.js`. `confirmHash` and `run-rules.js` `acceptedFiles` use it (concern 9). Rule chosen: the first heading named Cards is the section. `parseCards` learns the `accepted` field so it stops landing in `carried` (concern 10). `run-rules.js` gets the range passed in, so it still does not require `experts.js`.
- **Cover rule:** `cards.covers` is the one rule; `phases/run.js` `covers` (642) and `inCard` (658) are replaced through the shared block.
- **Measure-line parser:** `lib/claims.js` is the one parser; `phases/tests.js` `claimsOf` uses the shared block (concern 6).

### 5.5 One explicit active plan

`newestPlanFile` stops guessing by mtime. With exactly one plan that is not `phase: done`, that plan is active. With several and no pointer, no plan is guessed and the reminder names the command that sets the pointer (a small new subcommand, `experts.js use --plan <file>`). A commit in that state goes through unchecked (owner decision, 2026-11-13): the outcome is "exempt: several plans and no active plan chosen", it is printed, and the commit-time stamp records it. Known cost, accepted: a second unfinished PLAN file with no pointer switches the check off until a plan is picked. `resolveStage` counts `activePlanFiles` too, so both change together.

### 5.6 Expert selection, review, harvest, resume

- **Selection at one point.** The question to the model is asked once, in `phases/plan.js`. Every later change to the set goes through `mergeAdd` by way of `record --plan` and can only add: the forced add of `always: [tests]` experts in `phases/tests.js`, the review-when-skills auto-add and the Recheck in `phases/review.js`, and the run's recheck agent (`run.js` 461-491). The Recheck no longer asks the selection question a second time; it reports experts whose area the diff touches, and code adds them.
- **One review.** `phases/review.js` is the review. `phases/run.js` loses `expertsCheck` and its 4-lens review and runs the same shared block, with the same `prepare` and `record` calls. `prepare --range` takes its file list from the saved diff with `parseDiff`, not from the working tree (fault 20). A recheck that fails twice is listed in `failed` (concern 5). A high-confidence finding left unverified by refute is named as such (concern 11). Findings of fix-up groups that never ran are written to `run.json` like `pendingFindings` before the review is marked done (concern 12).
  Bounds of the one review, each pinned by a test with a stubbed agent: one retry for an empty answer; one fix round per card; at most 4 fix-up cards; a finding with no verdict after the retry counts as open (by hand the user resolves it, the run parks the card) and never starts a paid fix round. In the run, the per-card check stays experts only (recheck, the card's experts, one refuter) and the four lenses run once, at the end; the run keeps its own model setting (default `sonnet`) and the by-hand review keeps the session model. So the merge does not add agent calls. The test plan pins the number of agent calls per card and per feature for both flows. Agent labels take a prefix (card, role) so a resumed run replays the same calls.
- **One harvest.** `phases/harvest.js` gathers proposals, `lib/memory.js` `harvestMemory` applies them, `autopilot.js` `harvestBranch` makes the branch. `phases/run.js` loses its own harvest step and runs the same shared block, with the run's lighter setting (one agent, as today) so the cost does not grow. A branch name read back from `run.json` is used only if it equals the name the code computes itself; `run.json` keeps one writer (`runState`). Harvest runs once per feature: the branch name is written to `run.json` before the branch is made, and a second call returns the recorded branch (concern 13). With no `-N` names, the shared namespace of concern 8 goes away. The free-name test follows `freeName`: a git error counts as taken (concern 3).
- **One resume form.** `run.json` plus the card fields in the plan (`status`, `parked`, `committed`) are the only source. One pure function in `lib/run-rules.js` builds the `args.resume` object from them. The flags `--resume-card` and `--resume-reason` only write those fields. `parked.md` stays as the long text of a park reason, not as state. If card 10 finds a field that cannot be derived, it stays a flag and the plan says so; the direction says "if possible".
- **Cost rule.** "Each step is paid once" means: no step repeats on a resume. The retry of an empty reader or expert answer (4.2.0, 4.8.0) stays; it is a failure retry and is counted in the cost shown.

## 6. Faults and concerns: where each goes

| Item | Treatment | Card |
|---|---|---|
| Fault 17: preflight reads every backticked name as a root path | A cited name counts as an input only if it has a slash or exists; a missing one is a warning in the pack, not a park | 11 |
| Fault 18: G3 blocks for another session's edits | G3 becomes a reminder; hooks stop writing shared state | 5 |
| Fault 19: an agent edited the plugin root in another checkout | The brief states the plugin root is read-only; `run-start` refuses when the plugin root is another checkout of the same repository (running on the plugin's own code is a non-goal). No second root path is added | 11 |
| Fault 20: `prepare --range` lists working-tree files | File list from the saved diff | 8 |
| Fault 21: gates too complicated | The whole plan | all |
| Fault 22: pack at 37,000 tokens against 15,000 | `lib/pack.js` holds the budget by dropping optional entries only, never a file the card names, and lists each dropped path in the pack. If the card's own files are over budget the run goes on with a warning, and the same warning is shown at plan time | 11 |
| Concern 1 | Closed by the confirmation step in the commit check | 3 |
| Concern 2 | No change; fails closed | - |
| Concerns 3, 8, 13 | Harvest once, recorded before branching, `freeName` rule | 9 |
| Concern 4 | Left; a report detail, not part of the simplification | - |
| Concerns 5, 11, 12 | In the one review | 8 |
| Concerns 6, 7 | One measure parser; the fix-up test uses the real `cards.covers` | 6 |
| Concerns 9, 10 | One Cards reader; `accepted` known | 2 |
| Concern 14 | Not relevant: the run is not used on this repository | - |
| Concern 15 | Card 0 measures the payload; card 13 compares against the 2 MB ZIP ceiling | 0, 13 |
| Lesson: byte budgets must not stop a run | Size limits (expert bytes, journal 15 and 200 lines) become plan-time checks or warnings | 11 |
| Lesson: text on a command line | One "write text to a file, pass the path" helper replaces `q()` for agent text in `phases/run.js` | 6 |

## 7. Order of the work (cards)

Each card is built by hand, test first, and ends with the full verify command green. The plugin works after every card.

## Cards

- baseline: Measure the plugin as it is and pin the commit guarantees end to end
  paths: internal/plans/simplify-baseline.md, internal/tools/measure.js, evals/experts/commit-contract.test.js
  The harness comes first. It drives the real hook (`hooks/gate.js`) and the real `card-commit` through the existing fixtures of `evals/experts/harness.test.js`, `experts.test.js` and `autopilot.test.js`, once per guarantee and once per exemption, on both paths. It is written against today's behaviour and must stay green through every later card, changing only where this plan says a behaviour changes (confirmation at commit, the refusal listing all items). The measure script (plain Node, not shipped) writes bytes and lines per area, test count, the list of blocking checks and the list of state files into `simplify-baseline.md`. It skips `.claude/worktrees/`. It also lists, from the code, every exemption of G6 and G7 and the exact rule of G6 at edit.
- frontmatter: One front-matter parser and one in-place writer
  paths: .cursor-plugin/ultimate-workflow/hooks/lib/state.js, .cursor-plugin/ultimate-workflow/hooks/verify.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/hooks/status.test.js
  depends: baseline
  No behaviour change. `confirmHash` of every plan under `internal/plans/` is the same before and after.
- cards-reader: One Cards-section reader; `accepted` is a known field
  paths: .cursor-plugin/ultimate-workflow/experts/cards.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/lib/run-rules.js
  depends: frontmatter
- commit-check: One commit check used by the hook, the run, the status report and the check command
  paths: .cursor-plugin/ultimate-workflow/hooks/lib/gates.js, .cursor-plugin/ultimate-workflow/hooks/lib/dispatch.js, .cursor-plugin/ultimate-workflow/hooks/gate.js, .cursor-plugin/ultimate-workflow/hooks/verify.js, .cursor-plugin/ultimate-workflow/hooks/status.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js
  depends: cards-reader
  Two commits. First: move the hook, `card-commit`, `status.js` and `experts.js check` onto the one function, with the contract test from card `baseline` unchanged. Second: add confirmation, the full list with fix commands, the three outcomes and the commit-time stamp. The edit and turn-end gates still exist after this card, so no guarantee is ever absent between cards.
- active-plan: No guessing of the plan by modification time
  paths: .cursor-plugin/ultimate-workflow/hooks/lib/state.js, .cursor-plugin/ultimate-workflow/experts/experts.js
  depends: commit-check
- reminders: Edit and turn-end gates become reminders; flags and heartbeat go
  paths: .cursor-plugin/ultimate-workflow/hooks/lib/gates.js, .cursor-plugin/ultimate-workflow/hooks/lib/dispatch.js, .cursor-plugin/ultimate-workflow/hooks/gate.js, .cursor-plugin/ultimate-workflow/hooks/status.js, .cursor-plugin/ultimate-workflow/hooks/lib/heartbeat.js, .cursor-plugin/ultimate-workflow/hooks/lib/state.js, .cursor-plugin/ultimate-workflow/hooks/hooks.json, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/memory/hooks-and-gates.md, .cursor-plugin/ultimate-workflow/rules/uw-hooks-and-gates.mdc
  depends: active-plan
  Also touches the other places that name the removed keys: `phases/plan.js`, `commands/build.md`, the plan and PRD templates under `skills/`, `docs/gates.md`, `fixtures/`. `gate.js` keeps answering every event the 4.8.0 `hooks.json` registers with exit 0 and no block, because a host that was not restarted still sends them.
  Removes G1, G2, G6 at edit, G3, G4/G5, the detect-only path, `dirty`, `gate_violation`, `verify_rounds`, `last_verify`, `escalated`, `markClean`, the heartbeat. The tests named in section 8 are deleted or rewritten as reminder tests in this same card. `hooks.json` keeps the Bash matcher on PreToolUse (the commit check needs it); events no longer used are dropped. The plan template stops shipping the four old keys. The topical doc and its rule file are rewritten here, with the rule file kept shorter than the topical.
- shared-blocks: Phase scripts get their shared code from one place
  paths: .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/lib/phase-shared.js, .cursor-plugin/ultimate-workflow/phases/plan.js, .cursor-plugin/ultimate-workflow/phases/tests.js, .cursor-plugin/ultimate-workflow/phases/review.js, .cursor-plugin/ultimate-workflow/phases/harvest.js, .cursor-plugin/ultimate-workflow/phases/build.js, .cursor-plugin/ultimate-workflow/phases/run.js, mirrors.test.js
  depends: reminders
  One assemble function builds the runnable script from `phases/<name>.js` plus `lib/phase-shared.js`; `stageScript` and the test loader (`evals/security-expert/lib/run-workflow.js`) both call it, so tests run what users run. The shared file is read from the plugin only, never from the project. Its tests live under `evals/`, because the verify command does not reach `lib/`.
  `stageScript` adds the shared block to the copy it already writes. Moved in: `agentName` and the model options, the expert-lane block with `addOnly`, `asReader`, `readFirst`, `buildLoop`, the cover rule, the measure-line parser, and the text-to-file helper. The equal-copies tests are replaced by a test that each staged script holds the block exactly once. No behaviour change.
- selection: Experts are chosen once, at plan; later steps only add
  paths: .cursor-plugin/ultimate-workflow/phases/plan.js, .cursor-plugin/ultimate-workflow/phases/tests.js, .cursor-plugin/ultimate-workflow/phases/review.js, .cursor-plugin/ultimate-workflow/phases/run.js, .cursor-plugin/ultimate-workflow/experts/experts.js
  depends: shared-blocks
- one-review: The run uses the by-hand review
  paths: .cursor-plugin/ultimate-workflow/phases/review.js, .cursor-plugin/ultimate-workflow/phases/run.js, .cursor-plugin/ultimate-workflow/lib/phase-shared.js, .cursor-plugin/ultimate-workflow/experts/experts.js
  depends: selection
  Starts by reading `phases/run.js` lines 797-1155, which no reader opened. Moving code and changing behaviour are separate commits here and in `one-harvest`: first the move with the tests unchanged, then each fix with its own test. Includes fault 20 and concerns 5, 11, 12, and the single saved-diff location.
- one-harvest: The run uses the by-hand harvest, once per feature
  paths: .cursor-plugin/ultimate-workflow/phases/harvest.js, .cursor-plugin/ultimate-workflow/phases/run.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/lib/memory.js
  depends: one-review
  Keeps the order around `settle:record` that fault 13 depends on. If the output of `harvest-branch` changes, the prompt text in `phases/harvest.js` changes in the same card.
- one-resume: One resume form
  paths: .cursor-plugin/ultimate-workflow/lib/run-rules.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/phases/run.js
  depends: one-harvest
- run-inputs: Preflight, pack budget and size limits stop parking working code
  paths: .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/lib/pack.js, .cursor-plugin/ultimate-workflow/phases/run.js
  depends: one-resume
  Faults 17, 19, 22 and the size-limit lesson.
- measure-experts: Catches and cost per expert are in the value report
  paths: .cursor-plugin/ultimate-workflow/experts/ledger.js, .cursor-plugin/ultimate-workflow/commands/value.md
  depends: run-inputs
  Starts by reading what the ledger and the value command record today (not read by any reader). Adds only what is missing for "catches and cost per expert", and the cost line shown before and after a feature. No expert or skill is removed.
- release: Docs, version, numbers after, gates back on
  paths: .cursor-plugin/ultimate-workflow/commands/, .cursor-plugin/ultimate-workflow/memory/, .cursor-plugin/ultimate-workflow/memory.md, .cursor-plugin/ultimate-workflow/skills/, docs/, README.md, CHANGELOG.md, .cursor-plugin/, .claude-plugin/, mirrors.test.js, internal/plans/simplify-baseline.md
  depends: measure-experts
  Version changed in the five places and the regex in `mirrors.test.js` together. The memory index is regenerated with `node experts/experts.js memory index`, not edited by hand. The measure script is run again and the after column filled in. One release, 5.0.0 (owner decision, 2026-11-13): 4.8.0 does not ship on its own and nothing is pushed before this card. Order, each step by the owner or on the owner's word: (1) the branch goes to `main` by a pull request, so `validate.yml` runs the tests on Linux on the exact commit; (2) only when that is green, the `v5.0.0` tag is pushed (the release workflow runs no tests); (3) the marketplace switch. The way back is the last tag before 4.8.0. Because Linux CI first runs here, on everything at once, this card plans time for path and line-ending faults. The ZIP size is checked locally by the measure script before any tag. Last, by the owner: remove `ULTIMATE_WORKFLOW_GATES=off` from `.claude/settings.local.json`, and switch the installed plugin back to the GitHub marketplace after the release.

## 8. How we check that nothing important is lost

The test plan is written and confirmed separately. This section says only what must be provable.

**The four commit guarantees.** The contract file from card `baseline` holds one end-to-end case per guarantee, per exemption, and per path (hand commit through `hooks/gate.js`; run commit through `card-commit`). Titles keep the ids (G6, G7) so each guarantee maps to a test. On top of it, these existing tests must stay green or change only as stated:

| Guarantee | Already pinned by | Change allowed |
|---|---|---|
| Plan and tests confirmed | Nothing at commit today | New cases in card `commit-check`, including concern 1 (a card added after confirmation is refused) |
| Full run on exactly these changes | `hooks/verify.test.js` ("related runs do not allow a commit; a full run does; an edit after it does not"; the `requirements.txt` case), `hooks/baseline.test.js` (a pass that rests on the baseline counts; the baseline expires at head), `evals/experts/autopilot.test.js` ("card-commit refuses ... without a passing full run") | None |
| Experts reviewed these changes, no open high-confidence finding | `evals/experts/experts.test.js` and `harness.test.js` (through the real gate and command line, exit codes 0 and 1), `card-experts.test.js` and `autopilot-fixes.test.js` (gate-card 9, 10, 13, 14) | Only the refusal text, which now lists all items |
| Memory not newly broken | The memory-check tests and `evals/experts/harvest.test.js` | None; scope stays "what this commit adds" |

Both layers are run every time: the in-process predicates (`hooks/lib/gates.test.js`) and the command-line layer (`evals/experts/`). Passing the first alone does not prove the hook refuses.

**Rules for the contract file.** Every case runs the real hook process and the real `card-commit`, with `ULTIMATE_WORKFLOW_GATES=on` set in the child's environment (this repository has it off, which would make every case pass for the wrong reason). Each guarantee has a refuse case and an allow case that differ in one fact. Each way the check lets a commit through without checking (gates off, no plan, documentation only, empty commit, could not check) has its own case, and the output must say the commit was not checked. The cases that may change, and the test titles that are deleted, are listed by title in the test plan before the build; a drop in the test count outside that list fails the card. The fixtures for old projects (a 4.8.0 plan, `verify.json`, expert records, waivers) are made by the 4.8.0 code in card `baseline`, before any writer changes.

**Greps become tests.** Success criteria 1, 3, 4, 5 and 6 are tests in the verify command: a source scan for the removed names and for the callers of `commitGate`; and a test that sends every hook event to the real `gate.js` with an unconfirmed plan and a changed file and sees no refusal, no block, and no change to the plan file or to `.ultimate-workflow/`.

**Tests that go, on purpose, in card `reminders`.** `dispatch.test.js` ("a landed source edit marks the tree dirty", "the third failure escalates", "stop blocks while the tree is dirty"); `gates.test.js` (G3, G4, G5 cases); `review-findings.test.js` (the G4 escalation case); `workflow-defer.test.js` (G3 deferral, `gate_violation`); `heartbeat.test.js`; the liveness, deferral and exact `--json` key cases in `status.test.js`; the "G4 never sees a test run" case in `registration.test.js`. Each is replaced by a reminder case where a reminder replaces the block: same state in, a reminder line out, no deny, no write. The card lists every deleted title in its commit message so the loss is visible.

**User-facing commands.** `mirrors.test.js` already checks that every phase has its command file and script, the exact confirmation wording in `feature.md` and `run.md`, the "output file" wording, the `present --result` fields, one writing agent, every doc pointer, the release ZIP contents and the site. It runs in every card because it is in the verify command. Card `release` adds nothing to remove from that list: no command is dropped or renamed. `status.js` keeps reporting "disabled" when `ULTIMATE_WORKFLOW_GATES` is off.

**The run.** `evals/autopilot/e2e.test.js` ("the recorded runs committed every planned card and parked none") and `evals/experts/run-phase.test.js` stay green through cards `shared-blocks` to `one-resume`, except where an agent label changes: then the test changes in the same commit and the test plan names the bound it must still prove. The test plan also names which tests execute the staged run script, not only read recordings. The run is not executed on this repository; these tests use recorded runs and fixtures.

**No silent drift.** After each card the measure script is run; a state file or blocking check that appears and is not in this plan fails the review of that card.

## 9. Migration for existing projects

Nothing has to be run by the user. Old files are read or ignored.

| Old thing | What happens |
|---|---|
| Plan front-matter keys `dirty`, `verify_rounds`, `last_verify`, `escalated`, `gate_violation` | Ignored. `parseFrontMatter` already keeps unknown keys, so nothing is rewritten. New plans do not get them. |
| `plan_confirmed`, `tests_confirmed`, `confirmed_hash` | Unchanged, and now tested at commit. The hash covers the plan body only, not the front matter, so dropping the old keys does not move it. A plan confirmed before the hash existed (both flags true, no hash) counts as confirmed. A plan that accepted a baseline stays confirmed, because `## Known failures` is left out of the hash. |
| A plan confirmed before this release, with edits already in the tree | The commit check passes as before if confirmation matches; if not, the refusal says which confirmation to redo. |
| `.ultimate-workflow/verify.json` | Same path, same fingerprint. A record without a field the new reader wants is read as "stale", and the fix is one test run. |
| `.ultimate-workflow/baseline.json` | Unchanged. |
| `.ultimate-workflow/experts/` records and `waivers.json` | Read as before. Waiver keys (expert, file, first 120 characters of the finding) are not changed. Lane field names (`stage`, `selected`, `added`, `ran`, `failed`, `recheck`, `findings`, `concerns`, `delta`, `skillsLoaded`) are not renamed. |
| `.ultimate-workflow/heartbeat.json` | No longer read or written. Left on disk; `status.js` says it can be deleted. |
| Several plans and no pointer | Before: the newest by mtime was used. After: none is guessed, the reminder names the command that picks one, and a commit goes through unchecked and says so (owner decision). This is a behaviour change and goes in the CHANGELOG. |
| Going back to 4.8.0 after using the new version | Card `release` tests that 4.8.0 still reads a plan made without the old keys and a harvest branch with no `-N`; if it does not, the CHANGELOG says what to do. |
| Open harvest branches named `uw/harvest/<feature>-N` | Still recognised as open harvests of that feature; no new `-N` branch is made. |
| A parked run from 4.8.0 | Resumes: its card fields and `run.json` are the resume source already; the old flags are still accepted. |
| Hosts | `hooks.json` changes; a host reads it only at start, so the CHANGELOG says to restart the host after updating. |
| This repository | Gates switched back on and the marketplace switched back, by the owner, after the release (card `release`). The frozen copy is never edited. |

## 10. Size and cost, before and after

No reader could run a shell, so bytes were not measured. Card `baseline` measures; card `release` fills the after column. Numbers below are what was observed, or a target marked as such.

| Measure | Before (4.8.0) | After (target) |
|---|---|---|
| Blocking checks | 13 on the owner's map | 1 (at commit) |
| Reminders | 0 as such | 3 to 4 lines, from one function |
| State files | 30+ on the owner's map; the kinds the readers saw are listed in 5.3 | 8 or fewer kinds for the by-hand flow, plus the run folder |
| Hook writes to the plan file | On nearly every edit, shell call and test run | 0 |
| Front-matter parsers | 4 in code, 1 in a test | 1 for plans and agents, plus the memory header reader (a different format) |
| In-place front-matter writers | 2 | 1 |
| Add-only merges | 1 in `experts.js`, 3 copies in phases | 1 |
| Cards-section readers | 3 | 1 |
| Review implementations | 2 (`phases/review.js`; the run's `expertsCheck` and 4-lens review) | 1 |
| Harvest paths | 3 named by the readers (run step, `harvestBranch`, `harvestMemory`) plus `phases/harvest.js` | 1 flow: gather, apply, branch |
| Resume forms | 4 | 1 source, 1 builder |
| `experts/experts.js` | 1813 lines | Smaller by the removed copies; measured |
| `experts/autopilot.js` | 1261 lines | Measured |
| `phases/run.js` | 1155 lines | Clearly smaller: loses its build loop copy, review, harvest, cover rule |
| `experts/cards.js`, `lib/run-rules.js` | 262 and 135 lines | About the same |
| `hooks/` | Not measured; about 306 test blocks in 13 test files | Fewer: G3, G4/G5, flag, heartbeat and deferral tests go |
| Bytes and lines per area (`hooks`, `experts` code, `lib`, `phases`, `commands`, `agents`, `skills`, `memory`) | Card `baseline` | Card `release` |
| Tests | 1434 (1430 pass, 0 fail, 4 skipped), from the direction note; not re-run by the readers | Fewer gate tests, more contract and reminder tests; expected a little lower, never lower in commit-guarantee cases |
| Release ZIP | Under the 2 MB ceiling, checked only at tag time | Smaller or equal; checked locally in card `release`, before the tag |
| Version | 4.8.0 (not released) | 5.0.0 |
| Tokens, context pack per card (run) | About 37,000 seen against a 15,000 budget (fault 22) | At or under the plan's `pack_budget` |
| Tokens, typical feature | Not measured by anyone | Card `baseline` records one typical by-hand feature from the ledger if the ledger holds it; the target is a stated budget shown before the work and the real figure after. The cost and question-count targets are advisory for this release: one run of a model does not prove a saving. They are measured and shown, not release-blocking. |
| Questions to the user per feature | Not measured | 2, plus at most 1 for a real blocker |

## 11. Deviation justification

1. **Shared phase code from one file, added when the script is staged.**
   - Current: phase scripts cannot import, so blocks are copied between `phases/*.js` and a test compares the source text.
   - Proposed: one file (`lib/phase-shared.js`) that `stageScript` adds to the copy it already writes into the project. `experts.js` can require the same file, so `mergeAdd` and the in-script `addOnly` are one source.
   - For: one place to fix; the run can share review, harvest and build loop, which owner decision 2 demands. Against: a phase file is no longer readable on its own; a new file in `lib/`; the staged copy and the source differ, so an error line number points into the staged copy. Keeping copies: no new mechanism, but owner decision 2 cannot be met without adding three more large copies to `run.js`.
2. **The commit check lists every missing item.**
   - Current: `fullSuiteGate` then `commitGate` (memory, then experts), each returning the first refusal.
   - Proposed: one result with all missing items and one fix command each.
   - For: the direction asks for it; fewer round trips. Against: refusal text and order change, so tests that assert the text change; a long list on a fresh project.
3. **Confirmation is tested at commit, not at edit.**
   - Current: `preEditGate` refuses edits before confirmation.
   - Proposed: reminder at work time, refusal at commit.
   - For: owner decision 1; no session is stuck. Against: the accepted cost in the direction (work can be done before confirmation and then cannot be committed).
4. **Hooks stop writing the plan file.**
   - Current: `patchState` on nearly every event.
   - Proposed: reminders are computed from the plan, `verify.json` and the working changes each time.
   - For: removes the lost-key risk of two sessions in one checkout (fault 18). Against: a git diff on each reminder event; no memory of "already reminded", so the event choice has to limit noise.
5. **No mtime guess for the active plan.**
   - Current: newest plan that is not done wins when there is no pointer.
   - Proposed: one plan means that plan; several mean none until the pointer is set.
   - For: the harvest lesson; a guess once blocked unrelated work. Against: a user with several plans and no pointer loses reminders and the commit check until the pointer is set; the followups note that an explicit key was once judged complicated.
6. **Heartbeat removed.**
   - Current: `heartbeat.json` feeds `status.js` liveness (never, stale, live, disabled) and the deferral report.
   - Proposed: remove it with G3.
   - For: one less state file written on every event; nothing left to defer. Against: `status.js` can no longer say "the hook never ran", which is how a missing registration is noticed today.
7. **Harvest branch has no `-N` suffix.**
   - Current: `uw/harvest/<feature>-N` by free name.
   - Proposed: one branch per feature, recorded before it is made, reused on resume.
   - For: closes concerns 8 and 13 in code, not in a prompt. Against: a second, deliberate harvest of the same feature needs the first branch merged or deleted first.

Everything else reuses existing patterns.

## 12. Open questions

The plan phase returned 28 questions. Two were the owner's and were answered on 2026-11-13: with several plans and no active one, a commit is allowed and only reminded (5.5); 4.8.0 and the simplification ship as one release, 5.0.0 (card `release`). The rest were settled in the text above, each on the side of the direction (never stuck, no extra confirmations, no added cost). The ones worth knowing:

- Could not check: by hand the commit goes through and says so; the run parks the card.
- Hand commits keep today's experts rule (the union across the covering cards); run commits keep the card's own experts.
- Reminders come at the start and end of a turn, not on every edit.
- The heartbeat goes; a small stamp written only at commit shows the check is alive.
- A plan confirmed before the hash existed counts as confirmed.
- Plan settings stay outside the hash; a change to them is shown, not blocked.
- The memory header keeps its own reader.
- Faults 17, 19 and 22 and the per-expert value report stay in this plan, as the last cards before release, because goals 2, 3 and 5 need them.
- The run keeps skipping the commit check when `ULTIMATE_WORKFLOW_GATES` is off; off means off.
- `baseline.json` is not folded into `verify.json`.
- Where the code and the owner's map disagree on a count, the code is the reference.

Where the expert input below differs from the sections above, the sections above are the plan.

## Expert input

### developer

The plan reuses the right code, but it calls four things "copies" that behave differently, adds a hash rule to hand commits that today only the run enforces (experts/experts.js:540, sole caller experts/autopilot.js:1031), and puts all four guarantees behind one catch that fails open without telling anyone. Read: hooks/lib/gates.js 110-378, hooks/lib/state.js 1-169, experts/experts.js 60-90, 425-560 and 1230-1394, experts/autopilot.js 735-849, the commit path of hooks/gate.js and hooks/lib/dispatch.js, hooks/verify.js 175-195 and 386-423, lib/memory.js 20-79, phases/plan.js 60-109; not read: any test body, phases/run.js 797-1155, the loadWorkflow helper's definition; the repository has no lint, format or type-check command, so the verify command is the whole of "done".

**Constraints**
- Commit check result and failure visibility (card commit-check, built as two commits: first move the hook, card-commit, status.js and `experts.js check` onto one function with the baseline contract test unchanged; then add confirmation and the full list). `commitGate` keeps the `{allow, reason}` shape of hooks/lib/gates.js:113-117 and adds `missing: [{kind, text, fix}]`; `cardCommit` drops the stale-index item by `kind` (today autopilot.js:760-761) and keeps its `gate` field (read at phases/run.js:837), with no per-caller flag on the shared function. The result tells three cases apart: all four held; exempt, with the named reason; could not check, with the named reason. The last two are printed by the hook (context), by status.js and in card-commit's JSON line. Tests: a throw inside evidence gathering shows up as "could not check" in the output, and the contract case for an ordinary source commit asserts the evidence is not a skip. The plan also states the result at stage `none` (allow, as dispatch.js:71) and at bootstrap.
- Confirmation at commit (experts/experts.js `checkConfirmed`, 540-549). The plan states and tests two cases it does not cover: (a) a plan with `plan_confirmed: true`, `tests_confirmed: true` and no `confirmed_hash` (line 545 refuses it today, and only the run ever asked); (b) a baseline accept: hooks/verify.js `writeKnownFailures` (185-195) writes a `## Known failures` section into the plan body, and `confirmHash` (495-524) leaves out only the front matter, `## Run status`, run-added cards and run fields, so the hash moves and the commit would be refused as "the plan changed". `confirmHash` leaves that section out the way it leaves out `## Run status`; no command re-stamps the hash on its own. Section 9 row 2 is settled by the code: front matter is outside the hash (experts.js:496-497), so removing the old keys cannot move it.
- Front matter (card frontmatter). One block finder sits under both the parser and the writer: today hooks/lib/state.js:16 (`/^---\r?\n/`) accepts no BOM and no space after `---`, while experts.js `frontmatter()` (440-449) accepts both, so a plan with a BOM can be written as confirmed and read as unconfirmed; test a BOM plan and a CRLF plan through `setConfirmed` then `checkConfirmed`. `frontmatter()` is the splitter the in-place writer needs, not a parser copy. lib/memory.js `parseHeader` (38-79) stays out of the merge: it reads a nested `read_when` map with lists and returns an error per line, which the flat, skip-malformed `parseFrontMatter` cannot do, and the memory guarantee rests on those errors. `parseAgentFile` (experts.js:72) moves only with a test that `list()` returns the same output for all 9 agents before and after (`coerce` turns `true`, digits and quoted values into other types). The one `setFrontLine` throws on a file with no front matter, as experts.js:529 does; verify.js:177 returns the text unchanged today, so `writeKnownFailures` gets a test for that case.
- Shared phase code (card shared-blocks). One exported assemble function builds the runnable script from `phases/<name>.js` plus `lib/phase-shared.js`; `stageScript` (experts.js:1370-1384) and the evals' `loadWorkflow` helper both call it, because at least a dozen test files run the raw phase source today (evals/experts/harness.test.js:94, 221, 236; lanes.test.js:11; delta.test.js:175; protocol.test.js:45; concerns.test.js:30; build-brief.test.js:11; agent-names.test.js:37; pack-budget.test.js:19). `lib/phase-shared.js` must load under `require` from experts.js and also run pasted inside the async wrapper, where `module` does not exist. The old declarations leave `phases/*.js` in the same commit (a second `const addOnly` is a syntax error). The card's paths add the loader file, evals/experts/contract.test.js (it mutates `const asList` and the end marker at lines 114-116) and lanes.test.js. `addOnly` (phases/plan.js:92, takes `{name}` objects) becomes a map to names at the call site and then `mergeAdd` (experts.js:430); `mergeAdd` gets no mode argument.
**Risks**
- All four guarantees end up inside the one try/catch of `commitEvidence` (experts.js:1253-1285), which returns a skip on any throw; hooks/gate.js:119-123 turns a throw into undefined and dispatch.js:82 then allows. A single TypeError in the merged code switches every guarantee off for the hook and the run together, and nothing prints. The inner `catch {}` at experts.js:1279 already turns a failed `effectiveExperts` into "no experts required"; the confirmation step must not copy that pattern.
- Existing by-hand projects get refused at commit, against success criterion 9: `checkConfirmed` has only ever been called by run-start (autopilot.js:1031), so a plan confirmed by hand may carry no `confirmed_hash`, and any plan that accepted a baseline has a `## Known failures` body section that moves the hash (verify.js:185-195).
- `preEditGate` also holds the bootstrap gates B-G1 and B-G2 (gates.js:141-153, `prd_confirmed` and `design_confirmed` in PRD.md). The plan never names them. "preEditGate no longer denies" removes them, and nothing at commit replaces them: `fullSuiteGate` is feature-only (gates.js:221) and gate.js:120 passes no plan file at bootstrap.
- Cards one-review, one-harvest and run-inputs each move code and change behaviour in the same step (fault 20 and concerns 5, 11, 12; harvest once with no `-N` name; faults 17, 19, 22), in the part of phases/run.js and autopilot.js that no reader opened (about 900 lines). When a recorded-run test goes red there, it cannot say whether the move or the fix broke it. Faults 17, 19, 22 and the value-report additions are also fixes and features rather than removals, which grows a change the direction calls a simplification.
**Questions for you**
- A plan confirmed by hand that has `plan_confirmed: true` and `tests_confirmed: true` but no `confirmed_hash`: should the commit check refuse it until the user confirms again, or accept it as confirmed and only remind?
- Bootstrap stage: do the PRD and design confirmations (B-G1, B-G2) also become reminders, and should the commit check require them before a commit during bootstrap?
- When the commit check cannot inspect the tree or the plan (git error, unreadable file), the hook allows the commit. Should the unattended run do the same, or park the card, since nobody is watching it?
- Should the fixes for faults 17, 19 and 22 and the value-report additions (cards run-inputs and measure-experts) ship inside this simplification, or as a follow-up once the merged code is in?

### softarch

The plan merges code across the hooks/experts/lib/phases boundaries but does not yet state the contracts of the merged functions (parser, confirmation check, commit check result, shared phase block) or which way the new imports point, and several of the "identical copies" it merges are not identical in the code. Examined: hooks/lib/state.js, hooks/lib/gates.js 196-325, hooks/gate.js 100-180, hooks/verify.js 386-429, experts/experts.js 56-115, 425-559, 719-811, 1236-1408, 1716-1752, experts/autopilot.js 736-875, lib/memory.js 20-88, phases/run.js 820-841, phases/harvest.js 250-278, evals/experts/run-phase.test.js and evals/security-expert/lib/run-workflow.js; not examined: test bodies, phases/run.js 842-1155, commands/*.md, and no boundary tool exists in the repository to check against.

**Constraints**
- Commit check, imports and result shape. C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\.cursor-plugin\ultimate-workflow\hooks\lib\gates.js must keep requiring only ./state.js: experts.js:51 requires gates.js and hooks/verify.js:25 requires experts.js, so checkConfirmed and the verify.json read cannot be called from commitGate; both arrive as fields of the evidence built by commitEvidence, and the verify.json reader moves to a file under hooks/lib that does not require experts.js (fingerprint passed in). The plan must also write down the new return shape of commitGate as additive (keep allow, reason, warnings; add the list) because four callers read it: dispatch.js:83, status.js:44, experts.js:1748 (check prints {ok, reason, open}) and autopilot.js:756-763, whose card-commit output {ok, card, gate: 'G7'|'memory'|'G6', reason} is read at phases/run.js:837. The stale-index filter at autopilot.js:760-761 is a caller-side decision today; to meet success criterion 2.1 it becomes an option of commitEvidence or commitGate, checkable by grep finding no ev.memory edit in autopilot.js.
- Confirmation contract at a hand commit. checkConfirmed (experts.js:540-549) returns not-ok with missing 'hash' for a plan that has plan_confirmed and tests_confirmed true but no confirmed_hash, and it reads the flags through state.parseFrontMatter, whose regex (state.js:16) does not accept a BOM or a fence with trailing spaces, while confirmHash reads through frontmatter() (experts.js:440-449), which accepts both. Section 9 says an old plan 'still reads as confirmed'; the plan must state which of these cases the commit check accepts, and card commit-check must hold one contract test per case (no hash, BOM plan, CRLF plan). Fact that settles the plan's open point: confirmHash hashes only fm.after (experts.js:496-497), so a front-matter key change does not move the hash; a plan with an unclosed front matter is hashed whole.
- One parser means one stated contract. The four things card frontmatter merges do not have the same contract: state.parseFrontMatter is scalars only and coerces true/false/integers (state.js:23-70); parseAgentFile returns raw strings and strips a BOM (experts.js:72-81) and list() compares fm.name and reads inline lists from those raw strings (experts.js:102-114); experts.js frontmatter() is a block locator (bom, open, block, after, eol) used by setExperts, setConfirmed, setFrontLine and confirmHash, not a parser; lib/memory.js parseHeader (38-88) reads a nested read_when map with '- item' lists and returns line-numbered errors, which a flat parser cannot produce (a nested 'paths:' line would become a top-level key and list lines are dropped). The plan must either keep parseHeader as its own format reader or say that parseFrontMatter grows nesting and line numbers, and the card must prove with a test that experts.list() over every shipped agents/uw-expert-*.md and memory parseHeader over every shipped memory/*.md return the same value before and after, as it already promises for confirmHash.
- Shared phase block, one loader. Phase scripts are loaded in two ways: stageScript (experts.js:1370-1384, requires the file to start with 'export const meta' and wraps the body in an async function) and the test loader loadWorkflow in C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\evals\security-expert\lib\run-workflow.js:27, which reads phases/<name>.js raw and is used by run-phase.test.js:70 and about 20 other eval files. The plan must say that one function inserts lib/phase-shared.js and that both stageScript and loadWorkflow call it, or every phase test runs a script without its shared code. It must also state the file's form: it is both required by experts.js (CommonJS) and pasted inside a function body, so it holds no require of its own and its module.exports line is guarded or stripped at insertion; checkable by a test that requires the file and a test that a staged script runs with no 'module' in scope.
**Risks**
- The fingerprint and the commit decision can read two different plans, and card active-plan moves the fingerprint. volatileExcludes (experts.js:719-729) takes volatile_paths from stateLib.readState(cwd), the pointer or newest plan, while commitEvidence and card-commit are given a plan explicitly (autopilot.js:752-758 comments on exactly this). When newestPlanFile stops guessing, a project with several plans and no pointer loses its volatile_paths, so testFingerprint changes and every verify.json and expert record reads stale; the same readState feeds stageScript's choice of plan for a build with no plan argument (experts.js:1356-1363). If the one evidence function does not pass its own plan's volatile_paths into workingChanges, 'a full run passed on exactly these changes' is judged against another plan's exclusions.
- If the commit check calls checkConfirmed as it is, every project with a plan confirmed by hand or before confirmed_hash existed (the hash rule is dated 2026-11-09 in experts.js:492) is refused at its next hand commit with 'confirmed by hand ... confirm it again' (experts.js:545), which is the opposite of migration row 2 in section 9. Today that function only guards run start (autopilot.js:1031).
- run.json gets a second writer. It is written only by runState in autopilot.js:817-841 today (reviewedHead, harvestedHead, harvestBranch, pendingFindings, each write spreading the saved object). 'The branch name is written to run.json before the branch is made' puts a write inside or before harvestBranch (autopilot.js:848), and concern 12 adds more findings to it; a writer that does not go through runState's read-merge-write drops the other's keys. Also, the interactive by-hand harvest (phases/harvest.js:280) makes no branch and has no run folder, so 'once per feature' binds only mode 'branch'; and the last-line JSON {ok, branch, commits, reason} of harvest-branch is a contract read at phases/harvest.js:271-277 and by the run, so a 'recorded branch returned' answer must keep those field names.
- Removed front-matter keys and the heartbeat still have readers and writers outside the paths of card reminders. A search outside tests finds dirty, verify_rounds, last_verify, escalated or gate_violation in phases/plan.js, phases/run.md, commands/build.md, skills/the-ultimate-workflow-guidelines/references/plan-template.md, skills/project-bootstrap-guidelines/references/prd-template.md, docs/gates.md and fixtures/claude-code/PostToolUse.16.json, none of which the card lists; fullSuiteGate (gates.js:219-221) notes that at bootstrap the gates write this state into PRD.md, so the PRD template is a second consumer of the same keys. ROUND_CAP is exported from state.js for roundCap in gates.js:10; when roundCap goes, the export has no importer in hooks and the build loop's own copy in phases/build.js becomes the only one, which the plan should say so the next reader does not restore it. I did not check whether any command text reads status.js --json keys.
**Questions for you**
- A plan with plan_confirmed: true and tests_confirmed: true but no confirmed_hash (confirmed by hand, or before the hash existed): should the commit check accept it as confirmed, or refuse and ask the user to confirm again once? The code today refuses (experts.js:545) and section 9 of the plan says it is accepted; only one can be true.
- With several unfinished plans and no active-plan pointer, the draft makes no plan active, so a commit there is checked for neither confirmation, tests nor experts. Is an unchecked commit acceptable in that state, or should the commit check itself refuse and name the command that sets the pointer (still one check, and the fix is one command)?

### quality

The plan removes every block except the commit check, so that check's tests are now the only proof of the four guarantees; the plan must name refusal cases that run through the real hook process and the real card-commit with gates forced on, and turn its "a grep finds nothing" criteria into tests in the verify command. I read plan.md, hooks/lib/gates.js 205-330, hooks/gate.js (catch sites), experts/autopilot.js 738-787, .github/workflows/validate.yml and the skip sites in the test files; I did not read test bodies, evals/autopilot/e2e.test.js or phases/*.js, and ran nothing.

**Constraints**
- evals/experts/commit-contract.test.js (card baseline) holds, for each of the four guarantees and on both paths (a spawned hooks/gate.js with a git commit payload; the real card-commit command), a refusal case and an allow case that differ in one fact only, asserting the deny payload or ok:false and the named item. Every child process gets ULTIMATE_WORKFLOW_GATES=on in its env, as hooks/status.test.js:46 does. Reason: experts/autopilot.js:755 skips both gates when the variable is off and this repo has it off, and hooks/gate.js:119-129 turns a throw in commitEvidence or fullEvidence into undefined evidence, which expertsGate and fullSuiteGate allow (gates.js:223, 267). A commit check whose evidence gathering always throws (for example from the verify.js/experts.js require cycle the plan itself names) passes every allow-only test and every in-process predicate test.
- The plan lists every path where the one check allows without evidence, and the contract file has one case per path asserting the exact outcome and that the output says the commit was not checked: gates off, stage not 'feature' (gates.js:221), empty test_command (gates.js:223), ev.skip for docs-only and empty commits, evidence gathering throws, several plans with no pointer (after card active-plan), and the run's stale-memory-index exception (autopilot.js:760-764, which the hook path does not have). Card commit-check adds: all four items missing gives exactly four items each with one fix command; one item missing gives exactly that item and no other.
- Success criteria 1, 3, 4, 5 and 6 are tests inside the verify command, not a grep done by a reader: (a) a source-scan test in mirrors.test.js naming the removed identifiers (experts.js frontmatter and parseAgentFile, both setFrontLine copies, the three addOnly copies, run.js expertsCheck/covers/inCard, heartbeat, patchState, the keys dirty/verify_rounds/last_verify/escalated/gate_violation) and asserting commitGate's callers are exactly dispatch.js, autopilot.js, status.js and experts.js check; (b) a test that sends every registered event from hooks.json to a spawned gate.js with an unconfirmed plan and a changed source file and asserts no deny and no stop block, and that the plan file bytes and the listing of .ultimate-workflow/ are identical before and after.
- The tests that may change are named before the build, by title: the contract cases that flip in card commit-check, and the titles deleted in card reminders, are listed in the test plan, and each card's test count from internal/tools/measure.js is recorded so a drop outside that list fails the card. The migration fixtures for criterion 9 (a 4.8.0 plan with the old keys and a confirmed_hash, a verify.json, expert records, waivers.json, heartbeat.json) are produced by the 4.8.0 writers and committed in card baseline, before card frontmatter touches any writer; fixtures written by the new code would only prove the new code reads itself.
**Risks**
- After card active-plan, a project with several plans and no pointer has no active plan, so state.stage is not 'feature', fullSuiteGate returns ALLOW (gates.js:221) and gate.js:120 passes an empty plan to commitEvidence. With the edit and turn-end gates gone, a commit there is checked by nothing, and no test in the plan states what should happen. Section 11 deviation 5 admits the loss but section 8 does not test it.
- "Written against today's behaviour, changing only where this plan says" has no oracle as written: the contract file and the code change in the same card (commit-check), so an implementation that weakens a guarantee can also edit its case and stay green. Section 8's table says 'Change allowed: none' for G7 and memory, but nothing enforces it unless the frozen titles and assertions are listed in the confirmed test plan.
- Cards shared-blocks to one-resume rewrite phases/run.js, but section 8 leans on evals/autopilot/e2e.test.js, whose title says it checks recorded runs. If it reads recordings and never executes the new run.js, it stays green whatever the rewrite does. I did not open the file; the test plan must say which tests execute the staged run script (the output of stageScript with the shared block), and the replacement for the equal-copies tests must compile and run each staged script, not only count that the block appears once.
- Goals 1, 3 and 5 (2 questions per feature, a token budget, catches per expert) are judged on an agent's behaviour, and section 10 plans one typical feature from the ledger before and one after. One run of a non-deterministic system shows neither a saving nor a regression. As written these numbers are advisory; the plan should say so, or state a run count and a pass rule.
**Questions for you**
- When several plans exist and no active-plan pointer is set, should git commit be refused with the one command that sets the pointer, or allowed unchecked with a reminder? The plan currently implies allowed unchecked.
- Should card-commit in the unattended run keep skipping the whole commit check when ULTIMATE_WORKFLOW_GATES is off (today's behaviour at autopilot.js:755), or should the run always check?
- Are the cost and question-count targets (2 questions per feature, the token budget) release-blocking or advisory? If blocking, how many features are measured before and after, and what is the pass rule?

### security

Once the edit and turn-end gates go, the commit check is the only thing that refuses, so the plan must say what it does when no plan resolves and which plan settings can still switch it off after confirmation. It must also keep agent and plan text off command lines and validate what it reads back from run.json before using it in git.

**Constraints**
- No resolvable plan must not mean no check. Deviation 5 says a project with several open plans and no pointer "loses the commit check"; today `hooks/gate.js:120` passes an empty plan and `hooks/lib/dispatch.js:82` allows when evidence is missing. Required: when at least one PLAN file is not `phase: done` and no single active plan resolves (several and no pointer, a pointer `pointerName` rejects, or a plan file that cannot be read or parsed), a commit of non-documentation changes is refused on both paths (hook and `card-commit`) and the refusal names the pointer command. Fail open stays only for a git or internal error, and the output says which. One test per case in `evals/experts/commit-contract.test.js`.
- No agent, model or plan-derived free text on a command line after card `shared-blocks`. `q()` at `phases/run.js:395` only swaps double quotes, so `$(...)` and backticks survive. Still passed through it today: `--reason q(w)` at run.js:708 (pack warnings), 710 and 912, and `--action q(...)` at 614, 912, 917, 1135. Card `run-inputs` makes this worse: a cited name that is missing becomes a pack warning, so a backticked string from the plan reaches line 708. Required: every reason, action, title and warning goes through the text-to-file helper, and a grep shows `q()` applied only to paths the script builds itself and to names that passed `checkFeature` or the card-name pattern.
- The harvest branch name read back from `run.json` is never used raw. Card `one-harvest` records the name before branching and returns the recorded one on a second call; `run.json` sits in the working tree where any agent in the run can write it. Required: `harvestBranch` in `experts/autopilot.js` recomputes `uw/harvest/<checkFeature(feature)>` and accepts a recorded value only if it equals that (or matches the `openHarvestBranches` pattern for an old `-N` branch); anything else is an error, and no ref is created or moved. A test feeds `run.json` with `harvestBranch: "main"` and with a value starting with `-`, and shows no ref changed.
- The shared block is trusted plugin code only. `stageScript` (`experts/experts.js:1295`) writes an executable script into `.ultimate-workflow/run/` in the project. Required: `lib/phase-shared.js` is read from `pluginRoot` and nowhere under the project; arguments keep entering the staged script as JSON data and never as spliced source; each staging overwrites the staged copy, so a resume does not run a copy edited in the project. The "block appears exactly once" test also asserts the block's bytes equal the plugin file.
**Risks**
- Settings outside `confirmed_hash` can switch off parts of the only blocking check after the user confirmed. `confirmHash` (`experts/experts.js:495`) skips the whole front matter. An empty `test_command` makes `fullSuiteGate` allow (`hooks/lib/gates.js:222`); a broad `volatile_paths` removes files from the fingerprint; `known_failures` excuses failing tests; `phase: done` drops the plan from `activePlanFiles`. The G7 refusal text (`VOLATILE_HINT`) itself tells the agent to add a file to `volatile_paths`. With the edit gates gone, an agent that hits a refusal has a one-line way out that the user never sees.
- Section 5.1 says concern 1 is "closed" by the confirmation step. That holds only for an honest agent. `setConfirmed` rewrites `confirmed_hash` for whoever calls it, and cards matching `RUN_ADDED` stay outside the hash. The plan admits the accept steps are honour rules; the word "closed" will be read as a guarantee at review. It should say "narrowed".
- After card `reminders`, a hook that is not registered, a host not restarted after `hooks.json` changed, or `ULTIMATE_WORKFLOW_GATES=off` left in place means nothing is enforced at all. Removing the heartbeat removes the only signal (`status.js` liveness "never") that shows it. Before, a missing hook showed up at the first edit; after, it shows up only if someone notices an unchecked commit.
- If the confirmation read is placed inside the existing `try` of `commitEvidence` (`experts/experts.js:1252`), any exception while reading the plan returns `skip: 'the working tree could not be inspected'` and the commit is allowed. That would turn the new first guarantee into the easiest one to lose. The read needs its own result, separate from the catch-all skip.
**Questions for you**
- Should `confirmed_hash` also cover the plan settings the commit check reads (`test_command`, `volatile_paths`, `known_failures`, `full_suite_paths`)? Yes means an agent cannot quietly weaken the check after you confirmed. The cost is one extra confirmation each time one of them changes, and one re-confirmation for every plan confirmed before this release. `experts:` would stay outside, because review may add to it.
- With several open plans and no active-plan pointer, should a commit be refused with the one command that sets the pointer (my constraint), or allowed unchecked as deviation 5 has it? Refusing can stop a commit in a repository that keeps old plans not marked done; allowing means a second PLAN file switches the only check off.

### genai

The plan merges two review loops, two harvests and two build loops that have different retry, fix-round and model settings today, and it does not say which bounds, call counts and agent labels the single copy keeps. It needs those stated as checkable numbers, because goal 3 (each step paid once, cost shown) rests on them.

**Constraints**
- Card one-review states the bounds of the single review block and a test with a stubbed agent() pins each. Today they differ: phases/run.js retries a null recheck, expert and refute once (lines 484, 515, 547) and parks the card on a second null refute (548, 767); phases/review.js has no retry at all (131, 290, 481). Kept bounds to name: one retry per null answer, one fix round per card (run.js 775-804), MAX_FIXUP_CARDS = 4 (run.js 921, 1047), and rigor 'high' (one verifier per finding, uncapped, review.js 451-464) is not used by the run or gets a stated cap. The same card says that a finding with no verdict ('unverified', run.js 556 and 574, review.js 515) never starts a paid fix round or fix-up card.
- The plan states the agent calls per card and per feature, before and after, for both flows, and a stubbed-agent test fails when the count grows. In the run, the per-card check stays experts-only (recheck + selected experts + one refute, as run.js 461-580 does now) and the four core lenses run once per settle (run.js 988-1008), not once per card. The same table names the model for each call: the run pins recheck, experts and refute to implementerModel, default 'sonnet' (run.js 39, 481, 509, 543), while phases/review.js passes no model and uses the session model.
- The shared review, harvest and build blocks take a label prefix, and every agent label in a run is deterministic and unique (card name, tag, role). phases/review.js uses bare labels ('recheck', the lens name, 'refute', 'verify:N'); run.js builds them from card and tag so that, in its own words at lines 513-514, a resumed run replays the same calls. A test runs a stubbed multi-card run twice and asserts no duplicate label and the same label sequence. I could not confirm from the repository how the host keys a replay; the comment is the only evidence.
- Card run-inputs says exactly what lib/pack.js may drop. Today assemble() drops only entries with role 'topical' (pack.js 61-63) and otherwise reports that the required entries alone are over budget (line 77). The plan's 'dropping the lowest-ranked entries' must not reach the files a card names in paths or inputs; every dropped entry is listed in the pack by path so the agent can open it; and when required entries alone exceed pack_budget the outcome is stated (warning in the pack and the report, no park) and tested.
**Risks**
- If the run simply calls phases/review.js per card, each card pays four extra lens agents (review.js 290) on top of its experts, twice when a fix round runs, and the end-of-run review still runs. The same holds for harvest: the run uses one agent (run.js 1105), phases/harvest.js uses three parallel readers, a router and a further agent (harvest.js 134, 224, 267). Cost per feature goes up while the plan promises it goes down.
- A recheck that returns nothing is handled two ways today: by hand it sets recheckFailed and logs that the commit gate will not be satisfied (review.js 142-144); in the run the card goes on with recheck: false. The plan lists the failure in 'failed' but does not say whether the one commit check refuses a lane with recheck false. I did not trace expertsGate for this, so a commit with no recheck may pass.
- evals/experts/run-phase.test.js answers agent calls by label and throws on an unknown one (line 64), with assertions on labels such as '3:quality' and '1:commit'. Any label change in cards shared-blocks, one-review or one-harvest forces these tests to be rewritten in the same card as the code, so section 8's claim that they 'stay green' through those cards cannot hold as written, and a rewritten stub can hide a lost bound.
- The pack was 37,000 tokens against 15,000 with nothing dropped (fault 22), which fits the required entries alone being over budget. Holding the budget by dropping them leaves the implementer without files the card cites, and it then builds from a partial picture with no error.
**Questions for you**
- After the merge, which model runs the experts and the refute step in the unattended run: the implementer model (default 'sonnet', as the run does today) or the session model (as the by-hand review does today)? One review means one default.
- A high-confidence finding that the refute step returned no verdict for: does it block the commit as an open finding, or is it only reported as unverified? The plan says it is 'named as such' but not which.
- When the files a card itself names are larger than pack_budget: go on with a warning, or refuse at plan time and ask for a bigger budget or a smaller card?

### devops

Assumed criticality: a developer tool shipped by git (the marketplace source is the relative path "./.cursor-plugin/ultimate-workflow" in .claude-plugin/marketplace.json line 13, plus a tag-built ZIP), with no servers or data stores. The plan needs to state the release order and the way back, and to keep a signal that the one remaining blocking check is actually registered.

**Constraints**
- Card `release` states the order and each step's check: (1) the branch stack reaches `main` by a pull request, so `.github/workflows/validate.yml` (tests on `pull_request` and push to `main` only) is green on the exact commit; (2) only then is the `v*` tag pushed, because `.github/workflows/release-skills.yml` runs no tests and zips whatever the tag points to; (3) marketplace switch and removal of `ULTIMATE_WORKFLOW_GATES=off` come last. It also names the way back: the tag or commit that users and `main` return to if the release is bad.
- No card before `release` lands on `main`: the marketplace source is a path in the repository, not a tag, so a push to `main` is what marketplace users receive. A half-simplified payload still labelled 4.8.0 (the version changes only in card `release`, pinned by `mirrors.test.js` line 247 and validate.yml 'Manifest version consistency') must not be reachable from `main`.
- Card `reminders` keeps `hooks/gate.js` exiting 0 with no deny and no stop block for every event the 4.8.0 `hooks/hooks.json` registers (PostToolUse, PostToolUseFailure, Stop, UserPromptSubmit), even after those events are dropped from `hooks.json`, because a host that was not restarted still sends them to the new `gate.js`. One test per dropped event, fed from the existing `fixtures/claude-code/*.json`, proves it.
- Every new test file sits under `.cursor-plugin/ultimate-workflow/hooks/**` or `evals/**`: the verify command and validate.yml line 24 reach only those globs plus `mirrors.test.js`, and `lib/`, `experts/` and `phases/` hold no test files today. A test for `lib/phase-shared.js` or `internal/tools/measure.js` placed next to its code never runs in CI. `hooks/registration.test.js` keeps asserting that PreToolUse with the Bash matcher points at `gate.js`.
**Risks**
- After card `reminders` the commit check is the only blocking check, it fails open, and the heartbeat that lets `hooks/status.js` say 'the hook never ran' is removed. The comment on `gatesEnabled` in `hooks/lib/state.js` (lines 261-270) gives exactly that heartbeat as the reason gates could be on by default after 'three routes to installed and silently enforcing nothing'. With no replacement, a broken registration (unset `CLAUDE_PLUGIN_ROOT`, a host that ignores `hooks.json`) removes all four commit guarantees with no visible sign. The plan lists this only as a cost of deviation 6; it needs a replacement signal, for example the commit check writing a last-ran stamp only when it actually runs on a commit, which is not a per-edit write.
- A rollback to 4.8.0 meets projects already touched by the new version: plans created without `dirty`, `verify_rounds`, `last_verify`, `escalated`; a harvest branch with no `-N` suffix; several plans with no pointer. Section 9 covers old files read by new code only. Whether 4.8.0's `stopGate`, `roundCap` and `freeName` behave on such files was not checked by any reader; I could not run it. If they misbehave, going back blocks users until they hand-edit plans.
- The 2 MB ZIP ceiling is checked only inside `release-skills.yml` after the tag is pushed (lines 87-100). Card `release` says 'checked in card release' but names no local command; `mirrors.test.js` simulates ZIP membership, not size. A new large file under the payload is found only when the tag build fails, after the tag exists. The measure script from card `baseline` can report the summed bytes of `git ls-files` under the plugin root minus the two excluded directories.
- The verify command is green on Windows for the developer, while CI runs `ubuntu-latest` on Node 22 only at pull request time. Thirteen cards built without pushing means path-separator or line-ending faults in the new shared-block staging (`stageScript` writing `lib/phase-shared.js` into the copy) surface all at once in the release pull request. What I could not see: whether the owner's 'do not push yet' also forbids a draft pull request that would run validate.yml per card.
**Questions for you**
- 4.8.0 is complete but was never pushed or tagged. Should 4.8.0 be tagged and released first, so there is a 4.8.0 ZIP and commit to go back to, or do 4.8.0 and the simplification ship as one release? If one release, the rollback target is the last tag before 4.8.0.
- Which version number does the simplification get? It removes the edit and turn-end blocks, changes `hooks.json` and the `status.js --json` keys, and stops guessing the active plan, which reads as a major version (5.0.0), not 4.9.0.
- May the branch be pushed as a draft pull request (not merged, not tagged) so validate.yml runs on Linux after each card, or does 'do not push yet' hold until card `release`?
