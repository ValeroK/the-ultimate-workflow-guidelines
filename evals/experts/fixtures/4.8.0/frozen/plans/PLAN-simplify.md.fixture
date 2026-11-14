---
phase: plan
plan_confirmed: true
tests_confirmed: true
test_command: node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
test_related_command: node --test {tests} mirrors.test.js
full_suite_paths: .cursor-plugin/ultimate-workflow/hooks/lib/**, .cursor-plugin/ultimate-workflow/hooks/hooks.json, .cursor-plugin/ultimate-workflow/experts/*.js, .cursor-plugin/ultimate-workflow/lib/**, .cursor-plugin/ultimate-workflow/phases/**, .cursor-plugin/ultimate-workflow/commands/**
volatile_paths:
verify_rounds: 0
last_verify: unrun
dirty: false
escalated: false
experts: [developer, softarch, quality, security, genai, devops]
confirmed_hash: 8b4eafc5026b2ff6
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

## Tests

### Verify command

```
node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
```

Source: `.github/workflows/validate.yml` line 24 (the only test step in CI, `ubuntu-latest`, Node 22), the "Hard constraints" section of `AGENTS.md`, and `test_command` in this plan's front matter. All three agree. There is no `package.json`, lint or type check, so this command is the whole of "done".

Rules that follow from it:

- Globs stay quoted. `mirrors.test.js` is named on its own because neither glob reaches it.
- Every new test file sits under `.cursor-plugin/ultimate-workflow/hooks/**` or `evals/**`. A test next to `lib/`, `experts/`, `phases/` or `internal/tools/` never runs.
- Tests use `node:test` and `node:assert` only. Anything that asserts on stderr uses `spawnSync`, never `execFileSync`.
- Every child process that reaches a gate gets `ULTIMATE_WORKFLOW_GATES=on` in its own env, and is spawned with `cwd` set to the temp project. This repository has gates off; without the override every refusal case passes for the wrong reason.
- Each test builds its project in a fresh temp directory with its own `git init` and `core.autocrlf false`. No test reads this repository's `.ultimate-workflow/`, and none depends on another test having run.
- No test may be skipped to get green, on any platform. This is a test, not a count someone reads: see `skips: ...` below.
- Fixture files are read from a hard-coded table of paths, never from a directory listing. A loop over `readdirSync` passes on zero files.

### What "done" means

1. The verify command is green after every card, on the card's last commit (criterion 10).
2. Every test named below exists under its exact title and passes.
3. Every test title that existed at card `baseline` still exists, unless it is listed in Part 4. This is checked by `titles: ...` below, not by a count.
4. A test that is neither in Part 2 nor in Part 4 is frozen by default with "refusal text only": its asserted allow/deny outcome, exit code and named item may not change. A card that needs to change one adds it to Part 4 first, with the reason.
5. Card `release`: `validate.yml` is green on Linux on the exact commit before any tag.

### Part 1. Running-system harness (card `baseline`, written first, runs in every later card)

File: `evals/experts/commit-contract.test.js`. Every case spawns the real `hooks/gate.js` with a `git commit` payload (hand path) or runs the real `card-commit` command (run path), against a temp git project. Nothing is called in-process. Each refuse/allow pair differs in exactly one fact, and that fact is stated in the test body as a comment.

A refuse case asserts three things: the deny payload (hook) or `ok:false` with the `gate` field (run); that the named guarantee is the one in the reason; and that `git rev-parse HEAD` did not move on the run path.

An allow case asserts the allow payload or `ok:true`, and, on the run path, that HEAD moved by one commit holding only the card's files and plan status. On the hook path an allow is empty stdout and exit 0, which is byte-identical to gates off, no plan, a thrown evidence read and the top-level fail-open. So every hook-path allow case also asserts a positive sign that the commit was judged:

- In card `baseline` (4.8.0 prints nothing on the hook path): `experts.js check` on the same tree exits 0 with `ok` and carries no skip reason.
- From card `commit-check` on: `commit-check.json` holds outcome `checked` with zero missing items. This one assertion is added to the allow helper in that card's second commit; it is the only edit allowed to Part 1 cases.

Guarantee cases, written against 4.8.0 behaviour:

| Title | Path | One fact that differs |
|---|---|---|
| `contract G7 hand: a commit with no full run on these changes is refused, and the reason names the verify command` | hook | no `verify.json` |
| `contract G7 hand: the same commit after a passing full run is allowed` | hook | `verify.json` matches the fingerprint |
| `contract G7 hand: one edit after the passing full run and the commit is refused again` | hook | one byte changed in a source file |
| `contract G7 hand: a failed full run does not allow the commit` | hook | record says failed |
| `contract G7 run: card-commit without a passing full run is refused with gate G7 and commits nothing` | run | no `verify.json` |
| `contract G7 run: card-commit after a passing full run commits the card` | run | record present |
| `contract G6 hand: a commit the experts did not review is refused, and the reason names the experts command` | hook | no expert record |
| `contract G6 hand: the same commit with every selected expert recorded on this fingerprint is allowed` | hook | records present |
| `contract G6 hand: an open high-confidence finding refuses the commit and the reason holds its id, file and line` | hook | one open high finding |
| `contract G6 hand: the same finding at medium confidence does not refuse` | hook | confidence field |
| `contract G6 hand: expert records made before a later edit do not allow the commit` | hook | fingerprint moved |
| `contract G6 run: card-commit with one of the card's experts missing is refused with gate G6 and names the card` | run | one record missing |
| `contract G6 run: card-commit with exactly the card's experts recorded commits the card` | run | record present |
| `contract memory hand: a commit that adds a broken memory link is refused, with the link in the reason` | hook | the link |
| `contract memory hand: a link already broken at HEAD does not refuse the commit` | hook | broken before, not by this commit |
| `contract memory run: card-commit that makes a memory header invalid is refused with gate memory and commits nothing` | run | the header |
| `contract memory run: card-commit with the header valid commits the card` | run | the header |

Migration cases (criterion 9). These are the only cases whose evidence is NOT written by the code under test; every other allow case round-trips through new code, so writer and reader could change together unseen.

- `contract migration: 4.8.0 verify.json, expert records and waivers.json on their matching tree allow the commit` -- three sub-cases, each copying one fixture into a temp project built to the fixture's recorded tree. The waiver sub-case has an open high finding that only the 4.8.0 `waivers.json` dismisses.
- `contract migration: a verify.json without a field the reader wants is refused with the tests item and the full-run fix` -- asserts refused, not could-not-check.

Exemption cases. Each asserts the commit goes through. In card `baseline` the case asserts what 4.8.0 does: the allow, plus the reason text wherever 4.8.0 prints one (`experts.js check`, `card-commit` JSON). No `todo` and no skip. The stricter wording twin is `contract outcome: exempt reasons ...` under card `commit-check`.

| Title | Path |
|---|---|
| `contract exempt: gates off lets the commit through on the hook path` | hook, env `ULTIMATE_WORKFLOW_GATES=off` in the child |
| `contract exempt: gates off lets card-commit through` | run |
| `contract exempt: a project with no plan lets the commit through` | hook |
| `contract exempt: a source commit in bootstrap (PRD.md, no plan) is let through on the hook path` | hook |
| `contract exempt: a documentation-only commit needs no full run and no expert` | hook and run, one case each |
| `contract exempt: an empty commit is allowed` | hook |
| `contract exempt: a hook payload that cannot be parsed fails open` | hook |
| `contract exempt: the run's stale memory index exception regenerates and commits the index, and the hook path refuses the same tree` | both; pins that this exception exists on one path only |

Guard against a harness that proves nothing:

- `contract harness: gate.js and card-commit are spawned only through the helper, and the helper refuses to build an env without gates on` -- replaces the earlier "every child ran with gates on" case, which inspected a list filled by other tests and passed on an empty list. Two assertions that need no other test to have run: a source scan of the file finds `spawnSync` only inside the helper; calling the helper for a guarantee case with `ULTIMATE_WORKFLOW_GATES` absent or `off` throws.
- `contract harness: an ordinary source commit is judged on evidence, not on a skip` -- for the plain source commit used in the allow cases: in card `baseline`, `experts.js check` exits 0 with no skip reason; from card `commit-check`, the stamp says `checked`. Asserted positively, not as the absence of a skip string.
- `contract harness: each guarantee has a refuse case and an allow case on both paths` -- reads its own file's titles and fails if a guarantee id (confirmation after card `commit-check`, G7, G6, memory) lacks one of the four.

Hook-event harness, file `evals/experts/hook-events.test.js`. One payload builder used by this card and by card `reminders`. It takes a recorded payload from `fixtures/claude-code/` where one exists and rewrites `cwd`, `tool_input.file_path` and `transcript_path` into the temp project. The recordings carry the recorder's own `cwd`; unrewritten, the gate resolves stage `none` and every event allows and writes nothing, whatever the code does. There is no `PostToolUseFailure` recording and no `fixtures/cursor/` folder: those payloads are synthesized and the test says so in a comment. The event list is an explicit array, and the test asserts the number of sub-cases run (7 per vendor, 14 in all):

PreToolUse edit; PreToolUse Bash with a non-commit command (`git status`, `git log --grep=commit`, `git commit-tree`); PostToolUse edit; PostToolUse shell whose command equals `test_command`; PostToolUseFailure; UserPromptSubmit; Stop.

The temp project has a plan with `test_command` set, `plan_confirmed: false`, `dirty: true`, `gate_violation` set, and one changed source file.

- `hook events 4.8.0: every event payload reaches the temp project, and the old gate blocks or writes on it` -- for each of the 14, asserts the 4.8.0 deny, stop block, plan rewrite or heartbeat write. This is the recorded "before". Without it, "no deny, no write" after card `reminders` is not evidence. Rewritten on purpose in card `reminders` (Part 4); the builder's diff in that card is empty and the reviewer checks it.

Migration fixtures, made in card `baseline` by the 4.8.0 code before any writer changes, committed under `evals/experts/fixtures/4.8.0/`:

- a plan with the old keys and a `confirmed_hash`; a plan with both flags true and no hash; a plan with a `## Known failures` section; `verify.json`; expert records; `waivers.json`; `heartbeat.json`; a parked run's `run.json` (one with `harvestBranch` `uw/harvest/<feature>-2`);
- frozen copies of the inputs the "recorded 4.8.0 value" tests read: every plan under `internal/plans`, every shipped memory file, the 9 agent files, plus the recorded outputs (`confirmHash` table, `experts list` JSON, `parseHeader` JSON) and a copy of the 4.8.0 `parseFrontMatter`.

Storage rules, because `.gitignore` ignores `PLAN-*.md` and `.ultimate-workflow/` at any depth and a plain `git add` drops them silently: fixture plans are stored as `plan-<name>.md.fixture` and state files under `state/`, and are copied to `PLAN-*.md` and `.ultimate-workflow/` inside the temp project. Card `baseline` adds `evals/experts/fixtures/** -text` to `.gitattributes`; today only `vendor/**` and `evals/experts/corpus/**` have it, so a checkout on Windows would rewrite line endings and break the checksums.

- `fixtures 4.8.0: each fixture file is tracked, byte-identical to the recorded checksum, and the table has N rows` -- drives from a hard-coded table of relative paths; asserts the table length; asserts each path is in `git ls-files evals/experts/fixtures/4.8.0`; asserts `.gitattributes` holds the `-text` line. The checksum table is frozen: change allowed "none".

Guards for the rules in "What done means":

- `titles: every test title recorded in card baseline still exists, except those in the deleted list` (`mirrors.test.js`) -- card `baseline` commits the list of (file, title) pairs for every test the verify command reaches; Part 4 is a second committed list. A title gone from the source and absent from the deleted list fails by name. Replaces the hand-run count.
- `skips: the set of skip and todo sites in the test files equals the committed allowlist` (`mirrors.test.js`) -- scans every `*.test.js` the verify command reaches for `skip:`, `t.skip(`, `.skip(` and `todo`, and compares (file, title) pairs with an allowlist holding today's conditional skips (symlinks, bash missing, the Cursor recordings). A new skip fails on every platform, including one that would fire only on Linux.

Measure script (not shipped, tested from `evals/`):

- `measure: the script lists blocking checks and state files from the code and skips .claude/worktrees` -- on a small fixture tree with a known answer, assert the exact lists and that a file under `.claude/worktrees/` is not counted.
- `measure: on the 4.8.0 payload the script names every known blocking check and state file` -- run in card `baseline` on the real payload against a hand-written list: G1, G2, B-G1, B-G2, G3, G4, G6 edit, G6, G7, memory, the detect-only stop; and the state files including `heartbeat.json`. The fixture-tree test only proves the script finds shapes its author thought of; this one has an independent answer.

### Part 2. Frozen tests

These exist today. They stay, with assertions unchanged unless noted.

| File | Title | Change allowed |
|---|---|---|
| `evals/experts/experts.test.js` | `the commit is blocked until the experts were re-checked, and the message names the command to run` | refusal text only |
| same | `re-checked and reviewed by every selected expert: the commit is allowed` | none |
| same | `a commit with nothing to review is allowed: no changes, documentation only, no experts installed` | none |
| same | `cli check exits 0 with ok when a commit would be allowed and 1 with the reason when it would not` | adds `missing`; exit codes fixed |
| same | `an open high-confidence finding blocks the commit, and the reason lists it with its id, file and line` | refusal text only |
| same | `dismissing a finding needs the user's reason, and then the commit is allowed` | none |
| `evals/experts/harness.test.js` | `the flow end to end: a source edit waits for the experts decision, a commit waits for the experts, and any later change waits again` | card `reminders` only: the "source edit waits" half becomes "is reminded"; the commit halves are untouched |
| same | `a commit that touches only documentation needs no expert`; `a failed expert review leaves the commit blocked`; `an open high finding blocks the commit through the real gate, a fix resolves it, and the gate says why until then`; `a medium finding is reported but does not block the commit`; `the real gate refuses a commit that leaves the memory index stale, and allows it once the index is regenerated`; `the recheck can add an expert at commit time, and the commit then waits for that expert too` | refusal text only |
| `evals/experts/merge.test.js` | `T1 a clean merge adds nothing for the experts to review; the same files edited plainly still do`; `T4 committing a clean merge needs a passing full test run on the merged tree, and no experts`; `T4b a full run on one merge does not cover a different merge whose combined diff is also empty`; `T5 a merge that changes nothing in the tree, or only documents, is not held by G7`; `T7 volatile_paths still excludes a file from a merge` | refusal text only. A merge is the one state where today's two checks disagree by design (experts skip, G7 still asks); folding them into one evidence pass must not turn T4 or T4b into an allow |
| `evals/experts/autopilot.test.js` | `card-commit refuses off the run branch and without a passing full run, then commits the card and its plan status, nothing else` | none |
| same | `card-commit refuses a card that adds a broken link, with the link in the reason, and commits nothing`; `card-commit refuses a card that makes a header invalid, naming the problem`; `card-commit does not refuse for a link already broken at HEAD` | none |
| `evals/experts/autopilot-fixes.test.js` | `gate-card 9` through `gate-card 18`, `gate-card 17b`, `plan-subfolder 8: card-commit judges G7 by its own --plan when the pointer names another plan` | refusal text only |
| `evals/experts/card-experts.test.js` | `commitEvidence holds the commit to the card's experts, and says which card`; `G6 names the card when a re-check dropped one of its experts`; `G6 allows a commit that has exactly the card's experts reviewed` | none |
| `hooks/verify.test.js` | `end to end: related runs do not allow a commit; a full run does; an edit after it does not`; `a commit that changes only requirements.txt is not docs-only: it needs the full run` | none |
| same | `end to end: the configured command typed directly is recorded as a full run; a narrowed one is not` | none. Kept by the owner's decision of 2026-11-13, see "What these tests do not prove" |
| `hooks/lib/dispatch.test.js` | the Cursor commit cases ("Cursor gets a note, not a deny"; titles not read here) | refusal text only |
| `hooks/baseline.test.js` | all 29 cases | none |
| `hooks/registration.test.js` | the case asserting PreToolUse with the Bash matcher points at `gate.js` | none |
| `mirrors.test.js` | every phase/command pair, wording, one-writing-agent, ZIP contents and site case | version regex only, in card `release` |

"Refusal text only" means: the asserted allow/deny outcome, exit code and named item stay; a string match on the old single-reason wording may be rewritten to match the new list. Any other edit to a frozen test fails review of that card.

### Part 3. Source-level tests, per card

**Card `frontmatter`** (criterion 5, 9). File: `hooks/lib/state.test.js` unless said otherwise.

- `frontmatter: a plan written by setConfirmed is read as confirmed by checkConfirmed, for every fence shape` -- one table, real writer then real reader, over: LF; CRLF; BOM; BOM and CRLF together (what Windows Notepad saves); opening and closing fence with trailing spaces or tabs (4.8.0's writer accepted these); closing fence at end of file with no newline. Today the BOM row reads as unconfirmed; it must fail before the change.
- `frontmatter: setFrontLine keeps the BOM, the line endings and every other byte, on replace and on insert` -- byte compare outside the changed line for the same table, once with the key present (replace) and once with it absent (insert), where the inserted line must use the file's own line ending.
- `frontmatter: setFrontLine on a file with no front matter throws, and writeKnownFailures handles it without corrupting the plan` (`hooks/verify.test.js`).
- `frontmatter: confirmHash of every frozen 4.8.0 plan copy equals the recorded hash` (`evals/experts/`) -- reads the frozen copies in the fixture folder, not the live `internal/plans` files, which are edited throughout this work. A live-file table gets regenerated by new code at the first legitimate edit, which is comparing new code to itself.
- `frontmatter: experts list over the frozen 4.8.0 agent files returns the recorded output for all 9 experts` -- deep-equal against the recorded JSON, including value types (`true`, digits, quoted strings).
- `frontmatter: memory parseHeader returns the recorded 4.8.0 value for every frozen memory file copy, line-numbered errors included`.
- `frontmatter: unknown and old keys survive a write untouched` -- a plan with `dirty`, `verify_rounds`, `last_verify`, `escalated`, `gate_violation`; after `setConfirmed` those lines are byte-identical.
- `one copy: setFrontLine and the front-matter finder are declared in exactly one shipped file` (`mirrors.test.js`) -- `function setFrontLine` appears once (in `hooks/lib/state.js`); `experts/experts.js` and `hooks/verify.js` declare none; `hooks/status.test.js` declares no `frontMatter` helper. The behavioural tests above pass just as well when each of the old copies is patched separately; criterion 5 asks that the copies be gone.

**Card `cards-reader`** (criterion 5; concerns 9, 10). File: `evals/experts/cards.test.js`.

- `cards: the first heading named Cards is the section, for confirmHash, parseCards and acceptedFiles alike` -- a plan with two Cards headings. Asserts the range equals the first section's hand-computed line numbers for all three readers; `parseCards` returns only the first section's card names; a card added under the second heading moves `confirmHash` (it is ordinary plan text) and does not appear in `parseCards`. Agreement between the three alone would pass a reader that picks the last heading.
- `cards: accepted is a known field and does not land in carried`.
- `cards: run-rules does not require experts.js` -- source assertion on its `require` calls.
- `one copy: no Cards-heading regex outside cardsRange` (`mirrors.test.js`) -- `experts.js`, `verify.js` and `run-rules.js` hold no heading match for a Cards section; the test states its pattern.
- Frozen: `gate-card 17` and `gate-card 17b` (the accepted line does not move the hash).

**Card `commit-check`** (criteria 1, 2, 9). New cases in `evals/experts/commit-contract.test.js` (both paths) and predicate cases in `hooks/lib/gates.test.js`.

First commit of the card: the Part 1 file passes with zero edits. `git diff` on that file for that commit is empty; the reviewer checks this. Second commit adds the stamp assertion to the allow helper and the cases below.

Confirmation:

- `contract confirmation: each unconfirmed state is refused with the fix for that state` -- table on both paths: `tests_confirmed false`; `plan_confirmed false` with `tests_confirmed true`; no `confirmed_hash` with either flag false. Each row's allow twin differs only in that flag. The fix names the confirm command for the flag that is false. A check that reads only `tests_confirmed` fails the second row.
- `contract confirmation: a plan whose text changed after confirmation is refused and the reason says which confirmation to redo` (both paths).
- `contract confirmation: a card added to the plan after confirmation refuses the commit` (concern 1).
- `contract confirmation: a run-added card (findings, fixup) does not move the hash`.
- `contract confirmation: both flags true and no confirmed_hash counts as confirmed` -- uses the 4.8.0 fixture.
- `contract confirmation: a Known failures section does not move the hash, and text after it does` -- the 4.8.0 fixture (section last) allows; a plan with the section in the middle: editing a list item inside it does not move the hash, editing a line in the next `## ` section refuses the commit, and a `### ` subheading directly under it is still inside the excluded section. A hash that stops at the heading and drops the rest of the file passes the fixture alone.
- `contract confirmation: a changed setting does not refuse and is named, an unchanged one is not` -- for each of `test_command`, `volatile_paths`, `known_failures`, `full_suite_paths`: unchanged, the output names none of the four; after changing only that key, the output names that key and none of the other three. Plus the 4.8.0 confirmed-with-hash fixture, which has no record of the settings at confirmation: judged normally, no notice, outcome `checked`.

The list:

- `contract list: with all four missing the hook's refusal text and the missing array hold four items in the order confirmation, tests, experts, memory` -- asserts `missing.length === 4` and the `kind` sequence from `status.js --json` and `card-commit`, AND that the hook's `permissionDecisionReason` holds all four fix commands in that order. A `commitGate` that returns the full array while the hook still prints the first reason fails here.
- `contract list: each fix is the command for its kind` -- confirmation holds the present `--confirm` command; tests holds the verify script with `--full` (not the bare `test_command`); experts holds `/ultimate-workflow:experts`; memory holds `memory index` for an index problem.
- `contract list: with one item missing the refusal holds exactly that item` -- four sub-cases, one per kind.

The three outcomes. Fault mechanisms are fixed here so they behave the same on Windows and Linux; no `chmod`, no deleting `.git` (it is a root marker, so the case would land in the no-plan exemption), no platform skip.

- `contract outcome: evidence that cannot be read as a record is a missing item with a fix, and the commit is refused` -- table, both paths: the pointed plan path is a directory; the plan has invalid front matter; `test_command` is empty; `verify.json` is not valid JSON (a run killed mid-write); an expert record is not valid JSON. Each asserts REFUSED, the right `kind`, and stamp outcome `refused`. This is what a fail-open or a bare `JSON.parse` under a catch-all gets wrong.
- `contract outcome: a git error by hand lets the commit through and prints could not check with the reason` -- mechanism: garbage written over `.git/index`, `.git` intact. Asserts stamp outcome `could-not-check`, not `exempt` and not `checked`.
- `contract outcome: a git error in the run parks the card and commits nothing` -- same mechanism.
- `contract outcome: a failure reading any one guarantee leaves the other three listed` -- four sub-cases, one injected failure each: confirmation (plan path is a directory), tests (`verify.json` is a directory), experts (`_recheck.json` is a directory), memory (the memory root is a file). Each asserts the other three kinds are still in `missing`, and that the failed one is reported in words. Today the experts and tree reads share one catch-all and the memory read swallows its error into an allow.
- `contract outcome: exempt reasons are printed by the hook, by status.js and in card-commit's JSON line, and each says what it is` -- for documentation only, empty commit, gates off, no plan, bootstrap: the same reason in all three outputs; each reason contains its own words (documentation, nothing to commit, gates off, no plan, bootstrap); the reasons are pairwise different; the unparseable-payload and could-not-check texts differ from all of them. Equality across outputs alone passes the one string "exempt".
- `contract exempt: a documentation-only or empty commit is exempt from confirmation, tests and experts together, and still refused for a memory link it breaks` -- hook and run. The plan has `tests_confirmed false`, changed text and an empty `test_command`. The commit that saves an unconfirmed `PLAN-x.md` must go through.

The stamp:

- `contract stamp: commit-check.json is written when the check runs on a commit, holds the outcome, and is not written by any other event` -- send every non-commit event from the hook-event builder, including the Bash PreToolUse with `git status`, `git log --grep=commit` and `git commit-tree`; assert the file is absent. Send a commit; assert outcome and time; `status.js` shows it.
- `contract stamp: when the stamp cannot be written a refusal is still a refusal` -- `.ultimate-workflow/commit-check.json` is a directory; a commit with no `verify.json` still gets the deny payload with the tests item; the allow twin still allows with no stack trace on stderr. `gate.js` ends in a catch that exits 0, so a bare write before the response turns a refusal into an allow.

One decision:

- `contract volatile: the evidence uses the volatile_paths of the plan it was given` -- two plans with different `volatile_paths`, pointer on the other one; fingerprint follows the given plan.
- `gates: commitGate keeps allow, reason and warnings and adds missing` and `gates.js requires only ./state.js` (source assertion).
- `status and hook agree: for each contract state, status.js --json lists the same missing kinds the hook refuses with` -- loops over the contract states, including bootstrap; the hook's kinds are recovered from its printed text, not from an in-process call.
- `one decision: commitGate is called from exactly dispatch.js, autopilot.js, status.js and experts.js, and fullSuiteGate and expertsGate are called from nowhere outside gates.js` (`mirrors.test.js`). Also asserts `autopilot.js` holds no assignment to `ev.memory`.

**Card `active-plan`** (5.5; criterion 9).

- `active plan: exactly one plan not done is active without a pointer`.
- `active plan: several plans and no pointer picks none, whatever their mtimes` -- sets mtimes both ways with `fs.utimesSync` and asserts the same answer. No sleep, no reliance on write order.
- `active plan: experts.js use --plan sets the pointer and the next read returns that plan`.
- `contract exempt: several plans and no active plan chosen lets the commit through, prints that reason, and the stamp records it` (both paths).
- `active plan: the reminder names the use command`.
- `active plan: resolveStage and activePlanFiles agree for zero, one and several plans`.

**Card `reminders`** (criteria 3, 4; fault 18). Files: `evals/experts/hook-events.test.js`, `hooks/lib/gates.test.js`, `hooks/lib/dispatch.test.js`, `hooks/registration.test.js`, `mirrors.test.js`.

- `no hook refuses: every event sent to the real gate.js with an unconfirmed plan and a changed source file exits 0 with no deny and no stop block` -- the 14 sub-cases of the Part 1 builder, unchanged, with the same plan state (`test_command` set, `dirty: true`, `gate_violation` set). Asserts on parsed stdout, not on exit code alone, and asserts 14 sub-cases ran. Each of these was shown to block or write under 4.8.0 in card `baseline`.
- `no hook writes: across those same events the plan file bytes and the recursive listing of .ultimate-workflow, with sizes and hashes, are identical before and after` -- same 14. One stated exception: on the PostToolUse shell sub-case whose command equals `test_command`, `verify.json` may change and nothing else may (see the frozen `verify.test.js` case). The listing is taken with hashes; names alone would miss a rewrite in place.
- `no hook writes: PRD.md is untouched at bootstrap` (B-G1, B-G2 state).
- `reminders: plan not confirmed gives one line naming the confirm command`; `reminders: tests not confirmed gives one line naming the confirm command`; `reminders: code changed since the last full run gives one line, computed from the fingerprint with no dirty key present`; `reminders: a clean confirmed tree gives no lines`. Each asserts the exact number of lines.
- `reminders: a documentation or diagram change after a passing full run gives no code-changed line, and a requirements.txt change gives one` -- the replacement for the three deleted "does not mark the tree dirty" cases. The fingerprint covers working changes, not the doc filter the old flag used, so a bare fingerprint comparison nags on every README edit.
- `reminders: with no test_command the code-changed line is not sent` -- the old stop gate stepped aside here; a reminder to run a command that does not exist must not replace it.
- `reminders: a write into the plugin's run folder does not raise the code-changed line, and a source write does` (rewritten from `workflow-defer.test.js`).
- `reminders: sent on UserPromptSubmit and Stop, and not on an edit` -- through real `gate.js`.
- `reminders: status.js prints the same lines the hook sends` -- string equality between the two outputs for three states.
- `reminders: bootstrap with PRD or design unconfirmed reminds and does not deny`.
- `fault 18: another session's edits in the same checkout do not block this session's turn end`.
- `removed names: dirty, verify_rounds, last_verify, escalated, gate_violation, heartbeat, markClean, roundCap, stopGate deny and patchState appear in no shipped source file` (`mirrors.test.js`) -- scans `.cursor-plugin/ultimate-workflow/**` except `*.test.js` and CHANGELOG text, and includes `phases/plan.js`, `commands/build.md`, both templates under `skills/`, `docs/gates.md` and `fixtures/`. The scan matches the key as a front-matter key or identifier, not the bare English word "dirty" in prose; the test states its pattern.
- `registration: PreToolUse keeps the Bash matcher on gate.js` (frozen) and `registration: no event is registered that gate.js no longer acts on`.
- `status: gates off still reports disabled`; `status: a leftover heartbeat.json is reported as deletable and not read`.
- `build loop: ROUND_CAP 3, the same-signature stop and escalationText still stop the loop in phases/build.js` -- stubbed agent; pins that removing `roundCap` from the hook did not remove the loop's own stop.

**Card `shared-blocks`** (criterion 6, part). Files under `evals/experts/`.

- `staged script: each phase staged by stageScript holds the shared block exactly once and its bytes equal lib/phase-shared.js in the plugin`.
- `staged script: every staged phase compiles and runs to its first agent call with a stubbed agent, with no module in scope` -- executes the output of `stageScript`, for all phases.
- `staged script: the test loader and stageScript produce the same script text`.
- `staged script: a phase-shared.js placed in the project is ignored` and `staged script: restaging overwrites an edited staged copy`.
- `shared block: lib/phase-shared.js loads under require from experts.js`.
- `shared block: addOnly, buildLoop, covers, inCard, claimsOf, expertsCheck are declared in no phases/*.js file` (`mirrors.test.js`).
- `text to file: a reason holding $(...) and backticks reaches the command as a file path, and q() is applied to no agent or plan text in phases/run.js`.
- The existing equal-copies tests are deleted in this card and listed in Part 4 before deletion.

**Card `selection`** (5.6).

- `selection: the selection question is asked once per feature, in plan` -- stubbed agent across plan, tests, review; count the calls carrying the selection prompt; must be 1.
- `selection: tests, review auto-add, the Recheck and the run's recheck can only add` -- each of the four add points is given an answer that drops an expert; the set after still holds it.
- `selection: the Recheck reports touched areas and code adds the experts`.

**Card `one-review`** (criterion 6; fault 20; concerns 5, 11, 12). Move commit first with tests unchanged, then one test per fix.

- `review bounds: an empty answer is retried once and not twice`.
- `review bounds: one fix round per card`.
- `review bounds: at most 4 fix-up cards`.
- `review bounds: a finding with no verdict after the retry is open, starts no fix round, and parks the card in the run`.
- `review cost: agent calls per card in the run are recheck + the card's experts + one refuter, and the four lenses run once per feature` -- asserts the exact call count for a 3-card stubbed run.
- `review cost: agent calls for the by-hand review equal the count recorded in card baseline`.
- `review model: the run passes its model setting (default sonnet) and the by-hand review passes none`.
- `review labels: a stubbed multi-card run executed twice gives the same label sequence with no duplicate`.
- `fault 20: prepare --range lists files from the saved diff, not the working tree` -- a file in the tree but not in the diff is absent; one in the diff but deleted from the tree is present.
- `concern 5: a recheck that fails twice is listed in failed`; `concern 11: an unverified high finding is named unverified`; `concern 12: findings of fix-up groups that never ran are in run.json before the review is marked done`.
- `one review, one harvest: phases/run.js holds no expertsCheck, no lens list and no harvest prompt of its own` (`mirrors.test.js`) -- the harvest half is checked in card `one-harvest`, which names the function or prompt marker that moved into `lib/phase-shared.js`. Until then the harvest assertion is absent, not skipped.
- `saved diff: one location is written and read`.

**Card `one-harvest`** (criterion 7; concerns 3, 8, 13).

- `harvest once: a second harvest-branch call returns the recorded branch and makes no new ref` -- compares `git for-each-ref` before and after.
- `harvest once: when making the branch fails the name is already in run.json, and the next call ends with exactly one uw/harvest/<feature> and no -2` -- the failure is real: a branch named `uw/harvest` exists, which blocks `uw/harvest/<feature>` as a ref. Assert the call fails and `run.json` holds the name; delete the blocking branch, call again, assert one harvest ref. This replaces both the earlier ordering case (order cannot be seen from the state after a successful call) and the crash case built from a hand-typed `run.json` (which tests the author's idea of the half-written state, not the code's).
- `harvest safety: a recorded branch that is not the computed name is an error and no ref moves` -- table over recorded values `main`, `master`, `-x`, `uw/run/<feature>`, `uw/harvest/<other>`, `''`: for each, `git for-each-ref` is identical before and after and the result is the stated error. A deny-list of `main` and a leading dash passes two of six rows.
- `harvest: a recorded uw/harvest/<feature>-2 from a 4.8.0 run is recognised as open, used, and no new -N is made` -- uses the 4.8.0 `run.json` fixture. This is the one recorded value other than the computed name that is accepted, and only when that ref exists.
- `harvest: a git error in the free-name test counts as taken`.
- `harvest: the last output line keeps ok, branch, commits, reason`.
- `harvest cost: the run's harvest uses one agent`.
- `run.json has one writer: a harvest write keeps reviewedHead and pendingFindings`.
- The harvest half of `one review, one harvest: ...` is switched on here, and `staged script: the run and the harvest phase hold the same harvest block bytes` is added.
- Frozen: `harvest-branch commits each destination file once on uw/harvest/<feature>, without touching the working tree`.

**Card `one-resume`** (criterion 8, 9).

- `resume: the resume object is built by one pure function from run.json and the card fields` -- table test asserting the exact resume object for: committed, parked and pending cards; plan says `committed: <sha>` and `run.json` lacks the card (a crash between `card-commit` and the `run.json` write); `run.json` says done and the plan field is missing; `run.json` absent; `run.json` not valid JSON. In every row a card whose sha is reachable from HEAD is never rebuilt, and a card marked committed whose sha is not reachable is not skipped.
- `resume: a resumed stubbed run makes exactly the calls for the parked card's remaining steps and the later cards` -- run to a park, resume; assert the exact list of agent calls against a hand-written expectation, that the count equals the first-run total minus the calls recorded done, and that no prompt names a committed card. A comparison of label sets passes a resume that repeats every step under a new label suffix.
- `resume: a run stopped after the review was recorded and before harvest makes no lens or expert call on resume` -- starts from a `run.json` whose `reviewedHead` equals HEAD; zero review calls; harvest still runs. A park happens before the end-of-feature steps, so the test above never sees the review as done.
- `resume: --resume-card and --resume-reason only write the card fields`.
- `resume: a parked 4.8.0 run resumes from its fixture run.json with the old flags accepted`.
- `resume: deleting parked.md changes nothing the resume decides`.

**Card `run-inputs`** (faults 17, 19, 22).

- `fault 17: a backticked name with no slash that does not exist is a pack warning, not a park`.
- `fault 19: run-start refuses when the plugin root is another checkout of the same repository`.
- `fault 22: the pack holds its budget by dropping optional entries only, lists each dropped path, and never drops a file the card names`.
- `fault 22: when the card's own files exceed the budget the run goes on with a warning, and plan shows the same warning`.
- `size limits: an over-long journal or expert answer warns and does not stop the run`.

**Card `measure-experts`** (goal: each expert measured, nothing cut).

- `value: the report shows catches and cost for each of the 9 experts from a fixture ledger` -- exact figures from a hand-written ledger.
- `nothing cut: 9 expert agents and 50 skills ship` -- counts files; fails on 8 or 49.

**Card `release`** (criteria 10, 11).

- `mirrors.test.js` version case at 5.0.0 in the five places.
- `commands: feature, plan, tests, build, review, harvest, experts, value, expert-attribution and handoff each have a command file` (`mirrors.test.js`) -- an explicit list of ten.
- `measure: the after list for the by-hand flow is the commit check alone, and names 8 or fewer state file kinds` -- runs the measure script on the real payload and asserts the names, not only the two counts.
- `measure: payload bytes are under the 2 MB ZIP ceiling`.
- `rollback: the recorded 4.8.0 parser reads a plan made without the old keys` -- uses the copy of the 4.8.0 `parseFrontMatter` recorded in card `baseline`. The harvest-branch half of the rollback row cannot be tested without 4.8.0's `freeName`; if no fixture of it was recorded in `baseline`, the CHANGELOG entry is the outcome and the plan must say so.

### Part 4. Tests deleted or rewritten on purpose (each title goes in the commit message and in the committed deleted list read by `titles: ...`)

Card `reminders` unless noted. Titles read from the files today.

- `hooks/lib/gates.test.js`: `G3 blocks turn completion while the tree is dirty`; `G3 allows turn completion once verification is green`; `G3 does not block when nothing has been edited`; `G3 stays out of the way once the run has escalated`; `G4 counts failing rounds and escalates on the third`; `G4 does not re-escalate on a fourth failing round`; `G4 resets the counter and clears dirty on a green run`; `G4 records red without clearing dirty`; `G5 surfaces an escalation instead of the ordinary next action`. The other three G5 cases (`names the stage and the next required action`, `reports workflow availability`, `says nothing at stage none`) are about `phasePointer`, which the plan does not remove: they stay unless card `reminders` finds otherwise and adds them here.
- `hooks/lib/dispatch.test.js`: `a landed source edit marks the tree dirty`; `a documentation edit does not mark the tree dirty`; `a diagram edit does not mark the tree dirty, an application html edit does`; `an edit outside the project does not mark the tree dirty`; `Cursor afterFileEdit marks dirty just like postTool`; `a passing verify clears dirty and resets the counter`; `the third failure escalates and hands the user the blocker protocol`; `stop blocks while the tree is dirty`; `a green verify clears gate_violation`; `a red verify leaves gate_violation alone`; `gate.js records a heartbeat even at stage none, where no gate acts`; `gate.js still decides correctly when the heartbeat cannot be written`; `gate.js echoes the real event name on a G4 escalation, end to end`; `T16 a passing related verify.js run clears dirty; a failing one counts a G4 round`; `G3 names the verify script when the hook knows it`.
- `hooks/lib/workflow-defer.test.js`: all 17 cases; the file goes. `a write into the plugin's run folder does not mark the tree dirty; a source write still does` is rewritten as the run-folder reminder case in Part 3.
- `hooks/lib/heartbeat.test.js`: all 13 cases; the file goes.
- `hooks/lib/review-findings.test.js`: `the G4 escalation would be accepted by the host, not rejected as a mismatch`. The two round-trip cases stay only if `serializeFrontMatter` stays.
- `hooks/status.test.js`: `with no heartbeat it says the gates have never run, and names the restart`; `with a recent heartbeat it reports live, with a count`; `with an old heartbeat it reports stale rather than live`; `a corrupt heartbeat file exits 0 and still reports`; the three `--json reports ... liveness` cases; `--json reports whether G3 is active, for test_command and build_command alike`. `--json still parses, and still reports the truth, for a malformed plan and a corrupt heartbeat` is rewritten for a corrupt `commit-check.json`. The local `frontMatter(lines)` helper goes (criterion 5; checked by `one copy: ...`).
- `hooks/lib/root.test.js`: `gate.js fired from a subfolder writes its heartbeat at the root and nothing in the subfolder` is rewritten: fired from a subfolder on a commit, the stamp lands at the root.
- `hooks/registration.test.js`: `the verify-command events match Bash, or G4 never sees a test run`.
- `evals/experts/hook-events.test.js`: `hook events 4.8.0: every event payload reaches the temp project, and the old gate blocks or writes on it` becomes the two `no hook ...` cases; the payload builder is unchanged.
- `evals/experts/commit-contract.test.js`, card `one-harvest`: none. Card `shared-blocks`: the equal-copies tests (titles not read here; that card lists them here before deleting).

Replacements for the deleted block cases, same state in, a reminder line out, no deny, no write: the dirty/stop cases map to `reminders: code changed since the last full run ...`; the three "does not mark the tree dirty" cases map to `reminders: a documentation or diagram change ...`; `gate.js still decides correctly when the heartbeat cannot be written` maps to `contract stamp: when the stamp cannot be written a refusal is still a refusal`.

### Part 5. Criterion to test

| Criterion | Proved by |
|---|---|
| 1 one deciding function | `one decision: ...`; `status and hook agree: ...` |
| 2 four conditions, full list with fixes | Part 1 guarantee pairs; `contract confirmation ...`; `contract list ...` (three cases, hook text included) |
| 3 no hook refuses | `hook events 4.8.0: ...` as the before; `no hook refuses: ...` |
| 4 no hook writes, keys gone | `no hook writes: ...`; `removed names: ...`; `contract stamp: ...` (both) |
| 5 one parser, writer, merge, Cards reader | `frontmatter: ...`; `cards: ...`; `one copy: ...` (both); `shared block: ... declared in no phases file` |
| 6 run has no review, harvest, build loop of its own | `one review, one harvest: ...`; `staged script: the run and the harvest phase hold the same harvest block bytes`; `shared block: ...`; `staged script: ... compiles and runs` |
| 7 harvest once | `harvest once: ...` (two cases); `harvest safety: ...` |
| 8 resume repeats nothing | `resume: a resumed stubbed run makes exactly the calls ...`; `resume: a run stopped after the review ...`; the crash rows of the resume table |
| 9 old projects work | `fixtures 4.8.0: ...`; `contract migration: ...` (two cases); `contract confirmation: both flags true ...`; `... Known failures ...`; the 4.8.0 row of `... a changed setting ...`; `frontmatter: unknown and old keys survive ...`; `resume: a parked 4.8.0 run ...`; `harvest: a recorded ...-2 ...` |
| 10 verify green, commands exist | the verify command per card; `commands: ...`; `titles: ...`; `skips: ...` |
| 11 measured table, after is smaller | `measure: on the 4.8.0 payload ...`; `measure: the after list ...`; `measure: the script lists ...` |

### What these tests do not prove

- **Decided by the owner, 2026-11-13: the hook still records a full run when the configured test command is typed directly.** The `verify.test.js` case is frozen and `no hook writes` carries one named exception for `verify.json`. This is the only write a hook makes outside the commit-time stamp.
- **Decided by the owner, 2026-11-13: a recheck that fails twice does not refuse the commit;** it is named as failed, by hand and in the run. By hand this is a change from 4.8.0 (which refused). If an existing test pins the old by-hand refusal, card `selection` lists its title in Part 4 before changing it.
- **Decided by the owner, 2026-11-13: an `experts:` line made shorter after confirmation does not refuse the commit;** the check names `experts` as changed since confirmation.
- **Assumed, not stated by the plan:** a documentation-only or empty commit is exempt from the confirmation item as well as from tests and experts. `contract exempt: a documentation-only or empty commit is exempt from confirmation ...` pins that. If the plan means otherwise, that case changes and the plan must say how an unconfirmed plan file gets committed.
- **The run tests that execute the staged script** are `staged script: every staged phase compiles and runs ...`, the `review ...`, `harvest ...` and `resume ...` stubbed-agent cases, and `evals/experts/run-phase.test.js`. `evals/autopilot/e2e.test.js` reads recordings; its body was not opened here. If it never executes `phases/run.js`, it must not be counted as proof for cards `shared-blocks` to `one-resume`.
- **A commit hidden in `bash -c "..."`** is not seen by `isCommitCommand`. No test claims otherwise; the docs say so.
- **Who ran an accept step** (confirm, baseline accept, resolve) cannot be tested. They are honour rules.
- **That a frozen test's assertions are unchanged.** `titles: ...` proves the title is still there; the body is checked by the reviewer of each card against the "change allowed" column.
- **Cost and question-count targets** are advisory for this release. They are measured and shown; no test blocks on them.
- **Linux** first runs at the release pull request. Fault mechanisms, fixture storage and line endings above are chosen to behave the same on both systems, but only `validate.yml` proves it.
- **Not opened while writing this section:** the bodies of the frozen tests, the Cursor commit titles in `dispatch.test.js`, whether `mirrors.test.js` already shells out to `git ls-files`, and the equal-copies test titles. Each card that touches one reads it first and corrects this section before the build if something here is wrong.


### Expert test cases

#### quality

The draft covers my four plan constraints in outline; what it still lets through is (a) evidence records and recorded oracles that a later card or a hand-built fixture can make agree with wrong code, (b) source-scan and loop tests that pass on an empty match, and (c) "frozen", "no fifth skip" and "test must be under the verify globs" rules that are stated as rules for a reviewer and not as tests that fail. Examined: experts/quality/references/tests.md, plan sections 8, 9 and my Expert input (internal/plans/PLAN-simplify.md 277-322, 445-462), and the list of test files and skip-word sites; I did not open test bodies and ran nothing.

- **contract round trip: the evidence the gate reads is the evidence the real writers produce (evals/experts/commit-contract.test.js, card baseline)**: In a temp git project with test_command set to a command that exits 0, run the real hooks/verify.js full run and the real experts.js record command(s) as child processes (gates on), with no test code writing verify.json or any expert record by hand; then send the git commit payload to the spawned hooks/gate.js and assert the allow payload with no skip/exempt reason, and run card-commit and assert ok:true with HEAD moved by one. Twin: same steps with test_command exiting 1 -> deny naming the verify command. The Part 1 allow cases must state in a comment whether their records come from these writers; any case that hand-builds a record JSON must also have this round-trip twin. (catches: If the Part 1 allow cases hand-write verify.json and expert records in the shape the reader expects, a card that renames or drops a field on the writer side (verify.js, experts.js) stays green in every contract case while real users are refused forever, or, with the could-not-check path, allowed unchecked. Both sides of the record must be checked against one artifact.)
- **contract outcome: a corrupt or truncated verify.json, expert record or waivers.json refuses the commit as a missing item, on both paths (card commit-check)**: Four sub-cases per path, starting from the allow state and changing one file: verify.json holding '{' (truncated JSON); verify.json that is valid JSON but lacks the fingerprint field; one expert record truncated; waivers.json holding 'not json' with one open high finding otherwise waived. Hook path: deny payload whose missing list holds exactly kind 'tests' (first two) or 'experts' (last two) with a non-empty fix command; run path: ok:false with that gate, and git rev-parse HEAD unchanged. In no sub-case does the output contain the could-not-check wording. (catches: The draft pins 'unreadable plan' and 'empty test_command' as refusals but not unreadable evidence. An implementation that wraps evidence reading in one try/catch and maps any throw to could-not-check (today's gate.js:119-129 behaviour) passes every draft case and lets a commit through whenever a state file is half-written. Plan section 9 promises 'a record without a field the new reader wants is read as stale'; nothing tests it.)
- **migration 4.8.0: the recorded verify.json, expert records and waivers.json are accepted by the new reader against their fixture tree (card baseline records, card commit-check asserts)**: Card baseline commits, next to the fixtures, the small source tree they were recorded on and the fingerprint string 4.8.0 computed for it. Test copies tree plus fixtures into a temp git project and asserts: (1) the new code's fingerprint for that tree equals the recorded 4.8.0 string literally; (2) the spawned gate.js allows the commit with the 4.8.0 verify.json and expert records in place, with no skip reason; (3) with one open high finding added to a record and the 4.8.0 waivers.json entry for it (expert, file, first 120 characters), the commit is still allowed; with the waiver entry removed it is denied naming the finding id. Each fixture listed in Part 1 is read by at least one test; a fixture no test reads fails a listing test. (catches: The draft creates verify.json, expert-record and waivers.json fixtures and checksums them, but no named test reads them: only the plan and run.json fixtures are used. A changed fingerprint recipe, a renamed lane field or a changed waiver key would invalidate every existing project's evidence on upgrade and all tests stay green, because every other case writes its evidence with the new code.)
- **recorded oracles are frozen: the 4.8.0 answer tables are in the checksum table and are computed over frozen inputs (evals/experts, card baseline)**: The checksum test covers, besides the fixture files, every recorded answer used as an oracle: the confirmHash table, the experts-list JSON for the 9 experts, the memory parseHeader record, the recorded 4.8.0 parseFrontMatter copy and the by-hand review agent-call count. The confirmHash characterisation runs over plan copies frozen under evals/experts/fixtures/4.8.0/plans/ (including one with a BOM, one with CRLF, one with two Cards headings, one with a Known failures section), not over the live internal/plans directory, and asserts the number of plans hashed equals the number of rows in the table and is at least 4. (catches: A recorded table outside the checksum can be regenerated by the new code in the card that breaks the parser, turning the test into new-code-equals-new-code. And hashing live internal/plans has two failures: this plan's own file changes during the build (card status, accepted lines), so the test either goes red for a legitimate edit and gets its table regenerated, or loops over nothing if the directory read is wrong and passes vacuously.)
- **source scans cannot pass on nothing: each scan test proves its pattern and its file set (mirrors.test.js, with each scan's card)**: For 'removed names', 'one decision', 'shared block ... declared in no phases file', 'one review: phases/run.js holds no expertsCheck' and 'gates.js requires only ./state.js': (1) the scan function is first applied to an in-test string that holds a positive (for example a front-matter line 'dirty: true', a call 'markClean(', a 'function addOnly(' declaration, a 'commitGate(' call in a fifth file) and must report it, and to a negative (the prose sentence 'the tree is dirty') and must not; (2) the test asserts the scanned file list is non-empty and contains named sentinel paths (hooks/lib/dispatch.js, experts/autopilot.js, phases/run.js, commands/build.md); (3) 'one decision' asserts the set of files calling commitGate deep-equals the four names, not only that no other file calls it. (catches: A scan whose glob resolves to zero files (wrong root, a path separator on Windows vs Linux) or whose regex never matches reports 'nothing found' and passes. That is the same result as a clean tree, so criteria 1, 3, 4, 5 and 6 would be proved by a test that cannot fail. A subset check on commitGate callers also passes when autopilot.js stops calling it and keeps its own decision.)
- **one parser and one writer: front-matter parsing and setFrontLine are declared in exactly one shipped file (mirrors.test.js, card frontmatter)**: Scan of .cursor-plugin/ultimate-workflow/**/*.js except *.test.js: the declaration of parseFrontMatter appears in exactly 1 file and setFrontLine in exactly 1 file (hooks/lib/state.js or the file the card names); experts/experts.js declares no function named frontmatter or parseAgentFile; hooks/status.test.js declares no local frontMatter helper. Counts are asserted as literals (1, 1, 0, 0). (catches: My plan constraint named these identifiers; the draft's 'removed names' list holds only the state keys and hook names, and Part 5 maps criterion 5 to behaviour tests. A card that makes the shared parser correct but leaves the second copy in experts.js (still used by one caller) passes every 'frontmatter:' behaviour case, and the two copies drift again on the next BOM or CRLF fix.)
- **gate integrity: every test file is reached by the verify command, no new skip, no only (mirrors.test.js, card baseline)**: (1) List every *.test.js in the repository excluding .claude/worktrees, .git and node_modules; each path is either mirrors.test.js at the root or lies under .cursor-plugin/ultimate-workflow/hooks/ or evals/; a file elsewhere (experts/, phases/, lib/, internal/tools/) fails by name. (2) Count skip sites ({ skip: ...}, test.skip, it.skip, t.skip(), describe.skip, todo) over those files with a stated pattern and assert the count equals the literal recorded in card baseline (the draft says 4; the card confirms the figure by reading the sites and writes them as a named list of file and title); assert zero occurrences of test.only / { only: true }. (3) The scan self-checks against an in-test string holding 't.skip(' so the pattern is shown to match. (catches: The draft states 'a test next to lib/ never runs' and 'a fifth skip fails the card' as rules, with nothing that fails. A new test placed beside internal/tools/measure.js or experts/ is green locally by never running, and a contract case that cannot be made to pass can be skipped with the suite still exiting 0. The per-card test count from measure.js catches a drop but not a skip (a skipped test is still counted) and not a file outside the globs (never counted before or after).)
- **frozen titles exist: every title in Part 2 and every Part 1 contract title is present in its named file (evals/experts/commit-contract.test.js or mirrors.test.js, card baseline; list edited only by the cards Part 4 names)**: A literal table of file -> titles copied from Part 2 and Part 1; for each row the file's source contains the title as a test name string; the table has the exact row count written as a literal. For commit-contract.test.js the test also asserts that the number of test titles starting with 'contract G7', 'contract G6' and 'contract memory' equals 6, 7 and 4 respectively, as in Part 1. Requirement on the first commit of card commit-check (the one that must leave the Part 1 file untouched): the card records the blob hash of commit-contract.test.js from card baseline in its commit message, and I need the reviewer's git diff output for that commit to be shown, since no test can compare against a previous commit. (catches: 'Frozen' is otherwise enforced only by a reviewer and by the test count. Deleting one frozen refusal case and adding any new test in the same card keeps the count equal and the suite green; so does renaming 'G6 hand: an open high-confidence finding refuses' to an allow case. This is the oracle my plan risk asked for: the contract file and the code change in the same card, so the cases that must not change have to be pinned by something that goes red.)

#### security

The commit check is now the only refusal, so the tests must prove it cannot be switched to "could not check" or "exempt" by files an agent in the working tree can write (state files, the pointer, plan front matter), and that plan/agent text and run.json values never reach a shell or git as code. The draft already covers the unreadable plan, the confirmation throw, the q() source scan, harvestBranch "main"/dash, and project-side phase-shared.js; the cases below are the gaps. The several-plans-no-pointer exemption is the owner's decision (plan 5.5) and is not contested here.

- **contract outcome: a corrupt verify.json, expert record or waivers.json is a missing item and refuses, never could-not-check**: File evals/experts/commit-contract.test.js, card commit-check, hook path and card-commit path, gates on, confirmed plan, one source change. Three sub-cases, each starting from the state of the matching Part 1 allow case and then overwriting one file with the bytes `{not json`: (a) .ultimate-workflow/verify.json -> refused, missing holds exactly one item of kind tests; (b) .ultimate-workflow/experts/review/security.json -> refused, missing holds exactly one item of kind experts; (c) starting from the 'open high finding' refuse case plus a valid waiver that allows it, corrupt waivers.json -> refused again with the finding id in the reason. In all three the outcome is 'checked', the string 'could not check' is absent from the output, and on the run path HEAD did not move. (catches: By hand, 'could not check' lets the commit through (plan 5.1). readJson at experts/experts.js:988 returns null on a parse error and commitEvidence has a catch-all skip at 1283; if a corrupt state file is routed to the internal-error outcome, an agent that hits a refusal can write one garbage byte into a file in the working tree and commit unchecked.)
- **active plan: a pointer the containment check rejects does not switch the commit check off when one plan is open**: File evals/experts/commit-contract.test.js, card active-plan, hook and run paths. Project with exactly one PLAN file not done, confirmed, a source change, no verify.json. Sub-cases for the content of .ultimate-workflow/active-plan: `../outside/PLAN-x.md`, an absolute path to a PLAN file outside the project, `PLAN-missing.md`, the name of a second plan whose phase is done, and an empty file. In every sub-case the commit is refused with a missing item of kind tests whose fix names the one open plan's verify command; the outcome is 'checked', not 'exempt'. (catches: pointerName (hooks/lib/state.js:117) returns null for these values. After card active-plan removes the mtime guess, a null pointer must fall back to the single open plan; an implementation that treats 'pointer present but invalid' as 'no active plan chosen' gives the exempt outcome, so one write to the pointer file disables the only blocking check in a single-plan project.)
- **active plan: experts.js use --plan refuses a path outside the project or not a plan, and leaves the pointer as it was**: File evals/experts/ (card active-plan). Spawn the real `experts.js use --plan <value>` with spawnSync in a temp project whose pointer already names PLAN-a.md. Values: `../PLAN-b.md`, `sub/../../PLAN-b.md`, an absolute path outside the project, `C:/x/PLAN-b.md`, `notes.md`, `PLAN-nope.md` (missing), and, where the platform allows making one, a link inside the project named PLAN-l.md whose target is outside it. Each exits non-zero with the value named in stderr, and the bytes of .ultimate-workflow/active-plan equal the bytes before. A valid `plans/PLAN-b.md` exits 0 and the pointer holds exactly that name. (catches: `use` is a new entry point that writes the file every hook reads to choose its plan. setActivePlan returns false silently today (state.js:145); a subcommand that prints success on a rejected value, or writes before validating, lets the pointer name a file outside the root whose front matter (empty test_command, broad volatile_paths) then governs the commit check.)
- **contract exempt: the only plan flipped to phase done after confirmation is a printed and stamped exemption, not a silent allow**: File evals/experts/commit-contract.test.js, card commit-check stricter twins, hook path and status.js. Start from the G7 refuse state (confirmed plan, source change, no verify.json), then change only the front-matter line `phase:` to `done`. Assert the commit is allowed AND stdout carries an exempt reason that says no plan is open (the same string status.js --json reports), AND commit-check.json records outcome exempt with that reason. A second sub-case leaves phase alone and asserts the refusal, so the pair differs in that one line. (catches: activePlanFiles (state.js:102) drops a done plan and front matter is outside confirmed_hash (experts.js:495), so one line an agent can write turns a refusal into 'no plan'. The plan accepts settings changing without a block only because the change is shown; the draft's exempt-wording case builds its 'no plan' state from an empty project and would not catch this route printing nothing.)
- **contract experts: an experts line emptied by hand, or a Cards section that cannot be read for experts, does not reduce the required experts to none**: File evals/experts/commit-contract.test.js, card commit-check, hook path. Confirmed plan with `experts: [developer, security]`, a passing full run on the fingerprint, no expert records, one source change. Sub-case (a): rewrite the front-matter line to `experts: []`; sub-case (b): make effectiveExperts throw for the plan (the fixture is the one the card finds that triggers the inner catch at experts.js:1279). Assert in both that the commit is not allowed with outcome 'checked' and an empty missing list: either it is refused with an item of kind experts, or the output names `experts` as changed since confirmation. Decided by the owner, 2026-11-13: for (a) the commit is allowed and the output names `experts` as changed since confirmation (the same rule as the other plan settings; `experts` joins the visible-settings list of plan 5.1), and the test asserts exactly that. For (b) the experts guarantee is reported as failed to read, as in `contract outcome: a failure reading any one guarantee leaves the other three listed`; it is never a silent allow. (catches: commitEvidence swallows a throw from effectiveExperts and continues with planExperts = [] (experts.js:1273-1279), which is a fail-open for the experts guarantee inside the code path the plan calls 'each guarantee is read on its own'. `experts:` is add-only through mergeAdd but a direct edit of the plan file bypasses that, and the plan's visible-settings list (5.1) omits this key. Needs an owner line in the plan if (a) is to be 'shown' rather than refused.)
- **text to file: a backticked name in the plan holding a command substitution reaches the journal as text and runs nothing**: File evals/experts/ (card run-inputs, after fault 17), stubbed-agent run of the staged run script with the real autopilot commands executed through a real shell. The plan's card cites a missing name written as `` `$(node -e "require('fs').writeFileSync('PWNED','1')")` `` and a second card cites `` `x`; node -e "require('fs').writeFileSync('PWNED2','1')" #` ``. After the run step that records pack warnings: neither PWNED nor PWNED2 exists anywhere under the temp project or its parent; the recorded warning text contains the payload byte for byte; and every command line the script issued (captured by the stub) contains neither `$(` nor a backtick. Repeat with the payload arriving as an agent's park reason and as an `--action` value. (catches: q() at phases/run.js:395 only swaps double quotes. Card run-inputs turns a missing cited name into a pack warning, so plan text reaches the `--reason` at run.js:708; the draft's case covers one reason and a source scan of run.js, which passes if the helper is applied at 708 but the action values at 614, 912, 917 and 1135, or a new call added by a later card, still go through a shell string. Only executing the commands with a sentinel proves no substitution happened.)
- **harvest safety: a recorded branch that is well-formed but not this feature's is an error and no ref moves**: File evals/experts/ (card one-harvest). For feature `alpha`, with branches uw/harvest/beta and main existing, write run.json harvestBranch in turn to: `uw/harvest/beta`, `uw/harvest/alpha/../../main`, `refs/heads/main`, `uw/harvest/alpha-2x`, `uw/harvest/alpha -f`, `uw/harvest/alphabet`, and a non-string (`["main"]`). Each call of harvest-branch ends with ok:false and a reason naming the recorded value; `git for-each-ref --format='%(refname) %(objectname)'` is byte-identical before and after; the working tree is untouched. Then `uw/harvest/alpha-2` with that branch existing is accepted as open and still no new ref is made. Also: a feature name of `a.b` does not accept recorded `uw/harvest/aXb`. (catches: run.json sits in the working tree where any agent in the run can write it (plan Expert input, security). The draft tests only `main` and a leading dash; a check written as 'starts with uw/harvest/' or built from an unescaped feature name (openHarvestBranches escapes only the dot, autopilot.js:813) would pass both and still let the run commit memory files onto another feature's harvest branch or a path-traversing ref.)
- **staged script: argument values holding script-breaking text arrive as equal data and add no code**: File evals/experts/ (card shared-blocks). Call the one assemble function through stageScript for every phase with an args file whose values include: `"; require('fs').writeFileSync('PWNED','1'); //`, a string with a backtick and `${process.exit(7)}`, `*/ throw 1 /*`, `</script>`, a line holding only `})(`, U+2028 and U+2029, and a key named `__proto__`. Assert: the staged file parses; run to the first stubbed agent call, the args the body sees deep-equal the input values; no PWNED file exists; the process did not exit 7; and the shared block still appears exactly once (the payload repeating a marker line of the block as a string does not count as, or displace, the block). (catches: stageScript writes an executable file into the project with args spliced in as `const EMBEDDED_ARGS = ${JSON.stringify(args)}` (experts.js:1379). Card shared-blocks rewrites this assembly; if the block or the args are inserted by string replacement on a marker, or the args move into a template literal, plan and skill text (30-300 KB of it, some agent-written) becomes source. The draft checks block bytes and compile for normal args only.)

#### genai

The draft already pins most of the genai constraints (retry, fix-round and fix-up bounds, call counts, model, labels, pack budget). Missing are cases for what happens after a bound is hit or an agent answer is empty or malformed: the commit check must not treat it as reviewed, and the merged blocks must not bring the uncapped by-hand settings into the run. I read the plan (sections 5.6, 6, 7, 8 and my Expert input) and the draft; I did not open phases/*.js or the existing run-phase tests, so a case below may already exist under another title and the card should check before adding it.

- **review bounds: an expert that answers nothing twice is recorded as failed, not as reviewed, and the commit check lists experts as missing (by hand and in the run)**: Stubbed agent returns null for one selected expert on the first call and on the retry. Assert: exactly 2 calls carry that expert's label; `failed` names the expert; no expert record for it exists on the fingerprint; `experts.js check` exits 1 with a `missing` item of kind experts naming that expert; in the run the card is parked and HEAD did not move. Same case once with the recheck agent returning null twice: the commit is allowed with the experts the plan already chose, and the output names the recheck as failed, by hand and in the run alike (decided by the owner, 2026-11-13); this is asserted exactly. (catches: The retry bound is tested, but not what follows it. A shared block that records the lane after the last retry lets a commit pass with a review that never produced an answer (my plan risk on recheck: false).)
- **review bounds: a malformed recheck answer is a failed recheck, and only installed expert ids are added**: Card `selection`. Stubbed Recheck returns in turn: text that is not the expected structure; an answer cut off mid-list; a list holding one installed id plus `not-an-expert`. Assert for the first two: no expert is added, the recheck is listed in `failed` after one retry, and it is not reported as 'no areas touched'. For the third: the installed id is added through mergeAdd, the unknown id is not written to the plan's experts line and is named in the output. (catches: The Recheck changes from a selection question to 'report touched areas, code adds'. That is a new parse of model output; a parser that reads garbage as an empty list silently drops the add-at-commit-time guarantee.)
- **review bounds: by hand, a high finding with no verdict after the retry refuses the commit until the user resolves it, and no fix agent is called**: Stubbed by-hand review: one expert returns one high-confidence finding; the refuter returns null twice. Assert: the finding is stored as unverified; zero agent calls with a fix or implementer label were made; the real gate.js denies a `git commit` with the finding's id, file and line in the reason; after `dismiss` with a reason the same commit is allowed. (catches: The draft pins the run half (parks the card) and the name 'unverified'. The by-hand half of plan 5.6 ('counts as open, the user resolves it') has no test, so an implementation that only reports it would pass.)
- **review bounds: the run's review never uses rigor high, and by hand the verifier calls are one per finding**: Stubbed run with a card whose experts return 6 findings and run settings that carry rigor 'high' if such a setting can reach the run: assert zero calls with a `verify:` label and exactly one refuter call for the card. By hand with rigor 'high' and 6 findings: exactly 6 verifier calls, no more on a second pass over the same findings. (catches: The shared block brings the by-hand 'one verifier per finding, uncapped' path into the script the unattended run executes. The draft's call-count case uses a 3-card run with no rigor setting and would not see it.)
- **review cost: a card whose check finds an open high finding pays one fix round and one re-check, then parks if it is still open**: Stubbed run, one card, the expert returns the same confirmed high finding before and after the fix. Assert the exact call sequence by label: recheck, the card's experts, one refuter, one fix (implementer), then recheck + experts + refuter once more, then no further agent call; the card is parked with the finding id in the reason; the four lens labels appear zero times for this card. (catches: 'One fix round per card' is pinned as a bound, but not what the round costs. A merged block that runs the full review (lenses included) again after the fix doubles the per-card cost only on the failing path, which the 3-card happy-path count misses.)
- **build loop in the run: a card whose verify never passes stops at the cap of the shared buildLoop and parks**: Card `shared-blocks`. Stubbed run with a card whose verify step fails every round with a different failure signature each time. Assert the implementer label for that card is called exactly the capped number of times (the number the 4.8.0 run uses, recorded in card `baseline`), the card is parked with the last failure in the reason, nothing is committed, and the next card's calls still follow. (catches: The draft pins ROUND_CAP only in phases/build.js. The run's own build loop moves into the same shared buildLoop; if the run copy had a different cap or stop rule, the move changes how many paid rounds an unattended card can take.)
- **harvest: an empty or malformed answer from the harvest agent makes no branch and is reported as failed, not as nothing to keep**: Stubbed run reaches harvest; the single harvest agent returns null, then (second sub-case) text that does not parse as proposals. Assert: at most one retry; `git for-each-ref` is unchanged; the last output line has ok false with a reason naming the empty answer; run.json does not mark harvest as done, so a resume calls the harvest label again exactly once. (catches: Harvest-once records the branch name before the branch exists. Combined with an empty agent answer, an implementation can record harvest as finished with zero proposals, and the resume then skips it for good.)
- **stubbed-agent tests: the stub throws on a label it was not given and on more calls of a label than expected**: In the shared stub used by the `review ...`, `harvest ...`, `resume ...` and run-phase cases: calling it with an unlisted label throws (as run-phase.test.js line 64 does today), and each case ends by asserting that every expected label was consumed exactly the stated number of times. One meta case runs the stub with an extra call and expects the throw. (catches: Labels change in cards shared-blocks, one-review and one-harvest, so these stubs are rewritten with the code. A stub that answers any label, or a prefix match, keeps every bound and cost test green after a bound is lost.)
