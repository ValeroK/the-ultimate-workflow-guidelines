# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.8.0] - 2026-11-11

Memory reaches the cards that need it, and cannot silently drift. Taken from the review of RinDig/icm-architect (MIT): generated index files, links that must resolve, a size budget for a step's context. Nothing is copied; the new code is Node only, in `lib/`.

### Added

- **A header on every topical.** `memory/<topic>.md` starts with front matter: `description`, `read_when.paths` (globs relative to the folder that holds `memory.md`), `read_when.keywords`, `updated`. A fixed subset, no YAML library.
- **The list in `memory.md` is generated** from those headers, between `<!-- uw:memory-index:start ... -->` and `<!-- uw:memory-index:end -->`: `node experts/experts.js memory index`. Text outside the markers is never touched. `memory check` verifies the index and every relative link in `AGENTS.md`, `CLAUDE.md`, `memory.md` and `memory/**/*.md` (`links` checks the links alone); `memory migrate` writes the headers and markers for an existing project.
- **Cards pick topicals from the headers** (path globs and whole-word keywords), not from the sentence in `memory.md`; a topical with no header still matches through its old line.
- **Harvest writes the header of a new topical and regenerates the index in the same commit**, so a new topical cannot be orphaned. A proposal may add or remove cue paths and keywords. A project that is not migrated gets one commit of its own on its first harvest branch, "harvest: migrate memory to headers"; dropping the branch leaves the project as it was.
- **A commit that newly leaves the index stale or breaks a link is refused**, with the command that fixes it; problems already at `HEAD` are only warnings. The autopilot regenerates a stale index itself. A commit from your own terminal is not seen by the hooks.
- **A context pack states its size and stays within a budget** (`pack_budget:` in the plan, default 15,000 tokens; only topicals are dropped), lists a plan-cited document as a pointer unless the card's section, tests or paths name it, and ends with a do-not-load list. `phases/run.md` tells plan authors to name a card's documents in its own section.

### Changed

- `mirrors.test.js` runs `memory check --root .cursor-plugin/ultimate-workflow` in place of its two memory tests; this repo's own memory is migrated.
- Merging two harvest branches can conflict in the generated block of `memory.md`: take either side, run `memory index`, commit.
- A harvest refuses a new topical under a folder that has no tracked `memory.md` when the project keeps one elsewhere, naming the reason; a project with no `memory.md` at all still gets a plain file, as before.
- A header with an empty list item (`-` alone) is invalid, so an empty cue cannot stand in for the required path or keyword.
- With `memory_root:`, a link from a memory file to a file outside that folder is checked against `HEAD` like any other, so a commit that breaks it is refused.

### Fixed (the unattended run)

The first unattended run of a real plan met faults in the plugin itself. These are fixed here; the plan is `internal/plans/PLAN-run-fixes.md`.

- **The commit check judges the card being committed.** When two cards share a file and name different experts, `card-commit --card A` asks for A's experts, not for those of every card that lists the file. A commit by hand still asks for all of them, and a card the run adds itself is held to the experts of the plan cards that cover its files.
- **An expert that returns nothing is asked once more.** If it fails again, the card is parked with the expert's name and is never committed. The refute and recheck agents get the same single retry.
- **A card the run adds goes inside the card list**, so the plan's confirmed hash holds when the plan has `### Card` subsections under `## Cards`. A refused `card-add` prints its reason as one JSON line.
- **There can be more than one fix-up card**: one per plan card the confirmed review findings fall under, at most four per run, each with a free name (`fixup`, `fixup-2`, ...). One that parks does not stop the others. Text an agent wrote (a finding's file, a title, the carried items, a stop reason) reaches the commands through files, never on a command line.
- **A second harvest gets its own branch**: `uw/harvest/<feature>-2`, `-3` and so on. A later harvest is told the open branches and to drop what they already hold.
- **The review, the fix-up cards, the findings card and the harvest wait until no card is parked**, held for a decision or blocked. They run once, on the resume that settles the last one, and the review and the harvest are recorded apart, so only the half that failed is run again.
- **A park reason is whole in the report.** The plan's `status:` and `parked:` lines are cut at a word end and name `parked.md`, which holds the whole text. `unpark` on a conflict names the files in conflict.
- **One desktop notification per run**, at the end, naming every card parked, held or blocked. Every notice is still written to `notifications.md`. This replaces a notice per blocker as it happens: a card that needs a decision early in a long run is seen at the end.
- **`phases/run.md` says what the code does**: a card can be parked after one round when the diagnosis says the test or the plan is wrong, and after two when the same failure comes back; the `.gitignore` line is committed only when the line was missing.
- **The gates follow a plan in a subfolder.** The active-plan pointer may hold a relative path under the project root (`internal/plans/PLAN-x.md`); a path that leaves the root is ignored. There is no folder search.
- **`experts.js claims` measures a plan's size claims before the tests are confirmed**: each card's context pack against the budget, and each `- measure: bytes <glob> <= <number>` line with the size now, the room left and the cards that write under it. A line it cannot read is reported as not understood, never as passing, and the tests command stops to ask.
- **The run report shows what each card cost**: the columns Pack (est.), Tokens and Cache read. A card with no number shows "unknown", never 0. The host gives one number per agent today, so Cache read is "unknown" until it reports the split.

## [4.7.1] - 2026-11-11

Four faults the first unattended run on a real plan met (the memory-index plan, kept in `internal/plans/`). Each has a test that fails without its fix.

### Fixed

- **Bare `--resume` ran no parked card.** `phases/run.js` kept a resume only when it named a card, so `{ all: true }` was dropped and a parked card stayed parked, with every card behind it blocked again. `phases/run.md` already said that every card not committed runs again from its tests; now it does.
- **A plan kept in a subfolder had every card's commit refused by Gate G6.** The change fingerprint left out `PLAN-*.md` at the repository root only. With the plan in `internal/plans/`, `record --stage review` wrote the plan's `experts:` line after the evidence was taken, the fingerprint moved, and `card-commit` refused. The plan is now left out wherever it is kept.
- **A refused commit could lose its reason.** When the agent's report of `card-commit` held no line that parsed as JSON, the card was parked with "card-commit printed nothing". The step now asks for the JSON line of each command, and when none parses, the park reason carries what the command did print.
- **One notice for the cards blocked behind a parked card.** Six cards behind one parked card were six desktop notifications that said the same thing, on every run. There is now one, naming the cards and the command for the card they wait on. Each card still gets its `blocked by` status line in the plan.

### Known limits

- The hooks and `volatile_paths` still read the active plan from the repository root only (`hooks/lib/state.js`). A run with its plan in a subfolder works, because the run's commands are given `--plan`, but `volatile_paths` in such a plan is not read.

## [4.7.0] - 2026-11-09

### Release steps

Before tagging, besides the full suite, check that every commit of the release loads on its own, so a bisect never lands on a commit that does not parse (one did on `feat/autopilot` before it was folded):

```bash
for c in $(git rev-list --reverse origin/main..HEAD); do for f in $(git diff-tree --no-commit-id --name-only --diff-filter=AM -r "$c" -- '*.js'); do git show "$c:$f" > /tmp/uw-check.js && node --check /tmp/uw-check.js || echo "FAIL $c $f"; done; done
```

It prints nothing when every changed `.js` file parses at its own commit.

### Added

- **The Full tier of `/ultimate-workflow:feature` runs the whole plan unattended, after two confirmations.** There is no separate `/run` command: `feature.md` follows `phases/run.md` (also for `--plan <confirmed plan>` and `--resume [<card>]`). The user confirms the plan and the test plan (one Tests subsection per card) once; the run then makes one Workflow call and presents one report. The run builds every card in plan order once its `depends` are committed: a context pack written by code (`experts.js pack`: the plan's shared sections, the card and its tests, the documents the plan cites, `AGENTS.md`, the memory topicals whose cue matches the card, the handoffs of its dependencies, the run journal), tests proven red, up to three implementation rounds with a fresh diagnosis after each failure, scope from git, the experts on the card's own diff, and a commit through `experts.js card-commit`, which runs the commit gates' own checks (G7 and G6) in code before anything is staged. Everything is committed to `uw/run/<feature>`, never to the user's branch, and nothing is pushed. Hosts without the Workflow tool keep one card per session.
- **Decisions the plan does not state are the user's.** Before a card is committed, `experts.js decisions` compares its diff and the implementer's own list of choices (a new `decisions` field in the build result) with the plan. A major one (a dependency in any manifest or lockfile, a schema or migration, an external host or environment variable, a removed or renamed exported name, security or permission configuration, a file deleted or renamed outside the card's paths) that the plan does not name holds the card as `needs-decision`: its work on the parked branch, the decision in the card's `decision:` line, the user notified, the independent cards go on. `--resume <card> --accept` writes the decision into the plan's Decisions and continues the card; `--resume <card>` runs it again told to stay within the plan. Minor choices go into the handoff and the report.
- **`--resume <card>` without `--accept` is safe and says what it did.** The held decision stays in the plan until the card commits (`card-commit` clears it) or is held again, so a second `run-start` without `--accept` takes the same path and never brings the unaccepted work back. A card that cannot be done within the plan goes back to `needs-decision` with the decision and why, instead of a plain park that hides it. A card that commits within the plan says in the report that its held work on the parked branch is superseded (the branch is kept for reference). `run-start` fires a `resumed` notice. The run's own files named in the plan (the report in `## Run status`) are no longer read as cited documents, and a resume pack rebuilds `parked.md` from the parked commit when the run folder is gone.
- **Blockers are notified when they happen.** A parked card, a card held for a decision, a card blocked by one, a stopped run, and the end of the run (with counts) each produce a notice naming the card, the reason and the command to run: appended to `.ultimate-workflow/run/<feature>/notifications.md` and fired as a desktop notification on the session's machine (Windows toast, `osascript`, `notify-send`; `ULTIMATE_WORKFLOW_NOTIFY=off` skips it). After `run-finish` the main session sends one PushNotification, which reaches a phone over Remote Control; nothing inside a running workflow can.
- **The run starts only from the plan the user confirmed.** Confirming the test plan (`present --confirm tests_confirmed`) records `confirmed_hash` in the plan's front matter: a hash of the plan as the user saw it, leaving out the run's own state (card status lines, the findings and fix-up cards, `## Run status`). `run-start` refuses, before it creates a branch, when `plan_confirmed` or `tests_confirmed` is not true, when there is no hash (flags set by hand), or when the plan changed since; each refusal says which.
- **Confirmed review findings are fixed, not only reported.** The fix-up card after the review takes every confirmed high and medium finding in a file some card of the run could change (its paths or a test file it wrote), as Decision 2 already did for the experts' non-blocking findings. Low findings, and findings outside the run's files, stay in the report (`review.leftInReport` counts them). A real run had ended with two confirmed medium findings in its own files, reported and left.
- **The plan shows every card's status as it happens.** Each card in `## Cards` gets a `status:` line written by code on every transition: `pending`, `running` (before any work, so a run that dies inside a card leaves it there and `run-start --resume` names it), `committed <sha>`, `fixed-in-round <sha>`, `parked <branch>; <reason>`, `blocked by <card>`, `resumed`; the findings and fix-up cards too (`experts.js card-status`, checked against that list). The plan goes into the card's own commit, a park adds a plan-only commit on the run branch, and `run-finish` writes a `## Run status` block (date, run branch, cards per status, harvest branch, report) and commits the plan, so the plan on `uw/run/<feature>` always matches git.
- **A fix round in the card before it parks.** When the experts check on a card's diff finds a blocking finding in the card's own files (under its paths, or a test file its build wrote), the implementer gets one more round in the card to write the missing test or the fix (proved red where it is new behaviour, full suite green), and a fresh experts check runs on the new diff. The card parks only if a finding is still blocking after that, the round is not green, or a blocking finding is in a file the card may not touch. The round, its findings and its outcome are in the report under "Fix rounds" and in the ledger's run row. Three of four real runs of a small plan had parked a card on a missing test that one more round would have written.
- **Parked cards.** A card that cannot be finished (red after three rounds, tests that pass before the code, a blocking expert finding, a refused commit, a missing input) is committed with its failing tests and diagnosis to `uw/parked/<feature>/<card>` (`experts.js park`, built from a temporary index, no checkout), the tree goes back to the last good commit, the plan's card entry records `parked:`, and the run goes on with the cards that do not depend on it. Two parks in a row for the same reason stop the run. `--resume <card>` brings the work back (`experts.js unpark`) and continues at the implementation with the tests already written.
- **The run journal.** After every card a fresh agent writes at most 15 lines of lessons from the diff and the failures (`experts.js journal add`); every later card's context pack lists it. Past 200 lines the oldest entries are summarised, never dropped. It is never promoted to project memory on its own.
- **Non-blocking expert findings are fixed, not left.** A finding whose file is under a later card's paths is carried to that card (`card-field --carried`) and its expert checks whether that card fixed it; every other one, and every one not fixed, goes to one findings card that runs before the review. A confirmed blocking review finding over the whole run gets one fix-up card through the same loop.
- **Harvest to a branch.** The run's harvest commits its proposals to `uw/harvest/<feature>`, one commit per destination file (`experts.js harvest-branch`), instead of stopping for acceptance; `harvest.js` takes `mode: 'branch'` for the same. The interactive `/ultimate-workflow:harvest` is unchanged.
- **The main conversation does the same few steps whatever the plan's size.** `experts.js run-start` is everything before the one Workflow call: the run branch, the `.ultimate-workflow/` ignore line committed on it by code, the baseline (a red suite stops there for the user's decision), the context packs and the script. It also resumes: `--resume-card` checks the run branch out and brings the parked work back. `experts.js run-finish` is everything after: it keeps the output file, writes the report from it, and adds the ledger row with the agents, tokens and duration the file holds. Recorded end-to-end (`evals/autopilot/`): a four-card run's main conversation was 552,136 tokens against 541,776 for one card (1.02x), ten turns each, every card committed.
- **A run-added card for a missing test is finished by its test.** When every item carried to the findings card or the fix-up card is about a missing test, and its new tests pass against code that is already right, the card goes on to the full run with those tests (`testsOnly` in the report) instead of being parked as "tests did not fail first". A card for a real defect whose tests pass first is still parked.
- `experts.js handoff` (what a card left, from git, with any claimed test file the diff does not have), `run-branch`, `run-report` (the final report, written from the Workflow output file), `ensure-ignored`; `cards.js` reads `depends`, `parked` and `committed`; `card-add --depends`.
- A recorded payload of a workflow agent's own `git commit` (`fixtures/claude-code/workflow/PreToolUse.subagent-git-commit.json`, Claude Code 2.1.318), held by G7 in a test.

### Changed

- `phases/build.js`: the test-write, implement and diagnose loop is one marked block that `phases/run.js` carries; a test holds the two copies equal. A failed build's result now also names its test files.
- The long-conversation reminder defaults to 80k tokens of context (was 150k). `ULTIMATE_WORKFLOW_CONTEXT_REMINDER` still sets it.
- The tests phase no longer enters plan mode to show the plan with its Tests section, and no longer prints either into the conversation: it gives the user the file to open.
- **G3: a write under `.ultimate-workflow/run/` no longer marks the tree dirty.** It is the plugin's own scratch folder (already exempt from G2); the run writes its journal lines and harvest file there after the last card, and that made G3 ask for a test run of a tree the run had just verified. `card-commit` and `park` also clear `dirty`, since the tree they leave is a commit whose full run passed.
- Not every commit is seen by the PreToolUse hook any more: `card-commit` runs the G7 and G6 checks itself, and `park`, `harvest-branch` and the ignore-line commit skip them on purpose (failing tests on a parked branch, proposals on a side branch, the plugin's own housekeeping). See `memory/hooks-and-gates.md`.

### Fixed

- **Review and experts-check findings reach the value ledger.** They were recorded as a count on the run row and never as catches, so `/ultimate-workflow:value` showed no review at all (8 catches, 7 open, on the report that found it). Every finding that survived the skeptic is now a catch, by lens or expert, at the review stage, open until settled; a repeat is not added twice. A `run` row carries its cards and every card's findings.
- **`usage` finds sessions started in a parent folder.** A session opened in `~/Projects` that worked in `~/Projects/app` is stored under the parent's folder; it is now counted, with or without `--match`, when the `cwd` it records is inside the project (`fromParentFolders` says how many).
- **Readers are counted as readers.** Claude Code now opens every workflow agent's prompt with a "computed task" frame, so the prompt patterns anchored at the start never matched and plan and harvest readers were counted as other agents. The frame is taken off first, and the agent type the host records beside each transcript decides when the prompt does not.
- **A `bash -c '...'` test command works on Windows.** `verify.js` ran it through cmd.exe, which does not know single quotes, so it failed on quoting every time. A command that is exactly `bash -c '<script>'` (or `sh -c`) now runs through that shell with the script as one argument, and `test_shell: bash` in the plan runs any command through bash.
- **An abandoned or re-run plan run is recorded** in the ledger with `abandoned: true`, so its tokens are not missing; the report counts them apart.
- Later cards are held to an expert that an earlier card's recheck added. `record --plan` writes it into the plan's experts line, so the commit gate asks for it from then on; the cards after it started from the list fixed when the script was built, and G6 refused them. A card that names its own experts keeps them. Found in the four-card end-to-end run.
- A test file a build reported by its absolute path is no longer listed as "claimed but not in the diff".
- The harvest lands when the harvester names a file by its absolute path. `harvest-branch` refused every such proposal, so a real run's lessons never reached `uw/harvest/<feature>`; a path inside the project is now taken as relative to it, and one outside it is still refused.
- The fix-up card runs when the review names its file by absolute path. `card-add` refused the path, and the run then tried to park a card the plan never had and stopped. `card-add` now takes an absolute path inside the project as relative, and a findings or fix-up card that cannot be added is recorded as not started, without a park and without stopping the run.
- A card parked on a blocking finding says which finding, in the report and in the plan's `parked:` and `status:` lines (park kept only the reason's first line, a heading ending in a colon).
- The run report lists the findings card once. It is in the result's cards and again as `findingsCard`, and "Out of scope and claims" and "Fix rounds" read both.
- With a confirmed plan the run starts without a third stop. A real headless session read the code, predicted the experts' finding and stopped to ask, and also stopped because it could not see its own permission mode; `phases/run.md` now says the confirmed plan goes straight to `run-start`, and the mode is judged by whether this session's commands ran without a prompt.
- `.ultimate-workflow/` is added to the project's `.gitignore` on the first run, so git-based secret scanners skip the run's own files (the scanner that flagged them is the project's, not this plugin's).

## [4.6.2] - 2026-11-07

### Changed

- **Experts get every skill that matches the change.** At review each expert was limited to its first two matching skills, in `skills.md` order rather than by relevance, and at every stage an expert's skills were limited to 40 KB in total (56 KB for frontend and the developer). Both limits are removed: the selectors alone decide what loads. A change that matches many skills now costs more tokens per expert call. Each skill file is still held to 16 KB, and the build brief to its own size limit.

## [4.6.1] - 2026-11-07

### Changed

- **Diagrams can be written before the plan is confirmed.** G1, G2, G6 and the bootstrap gates allowed only `.md` and `.txt`, so an architecture diagram for a plan under review was refused. They now also allow diagram sources (`.mmd`, `.mermaid`, `.puml`, `.plantuml`, `.drawio`, `.excalidraw`, `.d2`) anywhere, and `.html`, `.htm`, `.svg` and `.png` under a `docs` folder; editing one does not make G3 ask for a test run. The plan command says to put a diagram in the plan file as a `mermaid` block while Claude Code's plan mode is on, since that mode allows only its plan file.

## [4.6.0] - 2026-11-06

### Fixed

- **A large phase result no longer turns into a summary.** The Workflow tool's completion notice is cut off when the result is large (a real plan result was 61,970 bytes and about 38 KB of it never reached the session), so the model presented part of the plan. The commands now work from the Workflow output file, which always holds the whole result: `experts.js present` writes the plan (or the Tests section) from it, decoded and whole, or fails; `plan` and `tests` show it in the host's plan view (`ExitPlanMode`) and print it in full where there is none; `review` and `harvest` read the file to the end; `record --result` reads the experts' lane from the file instead of a retyped copy. Accepting the plan in the plan view is the confirmation and sets `plan_confirmed`.
- The plan result no longer returns the experts' input a second time (`expertInput` is removed; the same text is in `planMarkdown` under "Expert input"). Sizes of the Workflow output file: 61,970 bytes before (four experts) and 27,404 bytes after on a smaller two-expert run, so the two are not like for like. The notice is still cut off (7,603 characters on that run); the plan now reaches the user through the file, not the notice.
- **Gate G2 no longer blocks the plugin's own run files.** With the plan accepted and the tests not yet confirmed, G2 refused the Write of `.ultimate-workflow/run/plan.row.json` and `tests.args.json`, which the commands write themselves, so the tests phase could not start without a workaround. `.ultimate-workflow/run/` is now exempt, in every stage; the evidence folders under `.ultimate-workflow/` (experts, snapshots) stay gated, and a path with `.` or `..` segments does not qualify. Found in a real run.
- **A suite that was already red no longer stops every build.** A build counted as green only when the whole suite exited 0, so a repo with failing tests could never finish, and the commit check had the same rule. The build command now takes a baseline before it writes anything (`verify.js --baseline`: the full suite once, on the untouched tree), shows the failing tests to the user, and counts them only after the user accepts (`--accept-baseline`, recorded in the plan under "Known failures"). A full run then passes when only those tests fail, and fails naming any other. It never passes a failure it cannot recognise, an unaccepted baseline, a different test command, or a baseline from another commit. Tests are recognised from node:test, TAP, pytest, go, cargo and jest output. Every pass that relies on the accepted list prints the tests and the time they were accepted again, and the record carries that time, so an accept nobody meant to give shows up in the build report. The hints the baseline prints name the real script path.
- **Tests no longer assume LF line endings, a case-sensitive filesystem or one path separator.** On a Windows checkout 13 tests failed on a clean main: temp git repos built under `core.autocrlf=true` and then read with git's system config off, LF-only patterns applied to CRLF files, a `SKILL.md` written beside `skill.md` (the same file on Windows and, by default, on macOS), and a `\` against `/` comparison. The tests now pin `core.autocrlf` in their own repos, accept `\r?\n`, use a nested folder for the case test and compare paths with one separator. The product code was not affected.

- **Harvest now sees the uncommitted work.** It runs before the commit, so its default range (`origin/main..HEAD`) was empty and it proposed nothing from work that had not been committed yet. The history reader now also reads `git status` and `git diff HEAD`, including new files, whatever the range.

### Changed

- The tests stop shows the plan and the Tests section together in the plan view, and confirms them as one document.
- Open questions at the plan and tests stops (the plan's and the experts') are raised one at a time, each with the issue, what each answer changes, and the pros and cons.

## [4.5.0] - 2026-11-05

### Added

- **Experts per card.** A card may carry `experts: [..]` (`card-add --experts`), a subset of the plan's own line. The commit is held to that set when every changed file (leaving out the plan, the tool folder and tests) is covered by cards that name their experts, and to the plan's line otherwise, so an edit outside the card restores the full panel. `read --plan` prints `effective`, `status.js` shows the narrowing, and the G6 message names the card.
- **Concerns.** The experts' protocol no longer says to leave out anything rated below 8; at review such a worry goes in `concerns` (at most three, each with the reason it is not a finding) instead of only in the lensVerdict. Items without a text or a reason are dropped and counted. The evidence, the ledger and the review and experts commands carry them; they never block a commit.

Tests: `evals/experts/card-experts.test.js`, `evals/experts/concerns.test.js`.

## [4.4.0] - 2026-11-04

Released together with 4.5.0: there is no v4.4.0 tag.

From the re-wash trace: the same suite ran again and again on unchanged code.

### Added

- **`verify.js --full --if-stale`** runs the full suite only when no passing full run of the plan's `test_command` covers the current changes; otherwise it says so and writes nothing. `/ultimate-workflow:experts` uses it.

- **Cards in a plan, written by a command.** `experts.js card-add` writes a card (`name`, `title`, `paths`, `carried`) into the plan's `## Cards` section, `brief --card` reads it (names are matched whole; a `Card N` heading still works), and `scope` lists the changed files that no card path covers, from git and not from the agent's report. Before, the card heading and the carried items were typed into the plan by hand before every build, and a file belonging to the next card could be edited without anyone seeing.

### Changed

- **The build command says to end the turn after launching the workflow and not to poll.** The host sends a task notification when the run finishes, and G3 waits for a running workflow since 4.3.0, so there is nothing to watch. In the re-wash, 5-minute progress checks over a 9-hour build were about a hundred turns, each re-sending a 150k-token conversation.
- **The experts command says `record`, `check` and `git commit` are separate commands.** The commit gate judges the whole command before any part runs, so a `record` chained before the commit was refused.

### Fixed

- **`verify.js` works at the project root.** Started in a subfolder it read the plan and wrote its record there, where G7 never looks; `--plan` paths are relative to the root.
- **A build whose arguments name no plan gets its verify command from the active plan.** Before, `experts.js script` left it empty, so the build's closing full run never happened.

Tests: `evals/experts/verify-fresh.test.js`, `evals/experts/cards.test.js`, `evals/experts/guidance.test.js`.

## [4.3.0] - 2026-11-04

From the re-wash trace (cards 8a to 11, `.ultimate-workflow/session-trace.md`) and `internal/plans/PLAN-run-records.md`: fewer hand steps, and gates that act on facts the host reports.

### Fixed

- **The gates find the project root first.** A hook fires in whatever folder the host's shell is in, and the plan was read from exactly that folder, so from a subfolder every gate saw no plan and allowed, and the heartbeat was written into the subfolder, where a test guarding that tree failed on it in every worktree. `gate.js` and `status.js` use the nearest ancestor holding a plan or a `.git` entry; a stray `.ultimate-workflow` folder is deliberately not a marker.
- **`ledger add` takes the Workflow wrapper and refuses what is not a phase result.** The commands say to save the result as returned, but it was read as the phase result itself, so a successful build became a row with `ok:false`, `green:false` and `rounds:null`. The wrapper's `result` is used now, and a file with no boolean `ok` is refused with nothing appended.

### Added

- **G3 defers while a workflow is running.** The Stop payload's `background_tasks` lists running background work; while it holds a workflow, G3 steps aside for that Stop, so it no longer forces a verify of half-built code. It applies again at the first Stop after the workflow ends. A recorded gate violation still blocks, and a missing or malformed list defers nothing. The deferral is recorded in the heartbeat and shown by `status.js` (`deferral` in `--json`). Payloads recorded from Claude Code 2.1.316 are in `fixtures/claude-code/workflow/`.
- **The build's model is a setting.** `implementerModel` and `diagnoserModel` in `build.args.json` (`inherit`, `sonnet`, `opus`, `haiku` or a `claude-*` id), and `ULTIMATE_WORKFLOW_BUILD_MODEL` for the implementer; a bad value is refused before any agent starts.

### Changed

- **The build's test writer and implementer run on Sonnet by default** (the diagnosis stays on the session model). Set `implementerModel: "inherit"` to keep the session model.

Tests: `hooks/lib/workflow-defer.test.js`, `hooks/lib/root.test.js`, `evals/experts/run-records.test.js`.

## [4.2.1] - 2026-11-03

From card 7 of the re-wash: a merge of origin/main (36 files, all reviewed on main) was refused by G6, and the experts had to be run again or the user had to commit by hand.

### Fixed

- **A merge reviews only what is new in it.** While a merge is being committed, the changes the gates look at are its combined diff (what is in neither parent): empty for a clean merge, only the resolution for a conflict. Unresolved conflicts or unstaged edits fall back to the whole diff. A changed-only recheck is refused during a merge. `experts.mergeInfo`.
- **G7 judges a merge by its tree.** A full run is recorded against the tree that will be committed, so a clean merge's empty diff cannot make one merge's test run cover another. A merge whose tree equals HEAD's, or differs only in documents, is not held.

### Added

- **A test run names the files it rewrote.** After a run, `verify.js` lists tracked or new files the run changed that the plan does not list, with the `volatile_paths:` line to add; the G6 and G7 refusals for a fingerprint that moved point at `volatile_paths` too. In the re-wash `test_times.json` forced a recheck of 815k tokens with nothing to find, after `volatile_paths` had been added to the plugin.

Tests: `evals/experts/merge.test.js`, each safeguard mutation-checked.

## [4.2.0] - 2026-11-02

Spend fewer tokens where they are really spent. On the-ceo since 2026-10-28 (15.35B tokens, from the transcripts): main conversations 73%,
hand-started helper agents 18%, build agents 5%, experts checks 4%; 97% of all of it was context re-sent on every turn. The ledger had shown the experts
at 85%, because it counted workflow agents only and not the re-sent context.

### Added

- **A reminder when a conversation grows long.** Past 150k tokens of context, and again every further 150k, the prompt hook adds one line suggesting `/handoff` and a new session. Never blocks. `ULTIMATE_WORKFLOW_CONTEXT_REMINDER` (tokens, `0` off). `hooks/lib/context.js`.
- **`experts.js usage`, and `/ultimate-workflow:value` uses it:** reads Claude Code's transcripts and reports main conversations and agents apart, by role, with new input, cache write, cache read and output, grouped into `phases` (main conversations, experts check, build, readers, other agents) with each one's share of the total, and which model ran each phase and role (tokens per model). The value report takes its cost from these only: it never reports the ledger's tokens as a share (they cover workflow agents only and leave out the re-sent context, which had shown the experts check at 86% when the transcripts showed about 5%), and it computes the cost per confirmed unique catch from the transcripts. `experts/usage.js`.

### Changed

- **The agents that only search and read run on Haiku:** the plan's area readers and harvest's three gatherers (`model: haiku`, `effort: low`); one that returns nothing is retried on the session model. Nothing that decides, writes, reviews or judges changed model. `ULTIMATE_WORKFLOW_READER_MODEL` (`inherit` to turn it off).
- **Test runs print a summary, the failure lines and the tail;** the whole output goes to `.ultimate-workflow/verify.log`. `ULTIMATE_WORKFLOW_VERIFY_FULL_OUTPUT=1` streams it as before.
- **The workflow says to run long test-and-fix loops and wide searches in a helper agent**, and bring back only the result (skill, Cursor rule, `/feature`).

Tests: `evals/experts/tokens.test.js`.

## [4.1.2] - 2026-11-01

Fixes from the re-wash value report (36 runs; the experts checks were 85% of the tokens).

### Fixed

- **A file that tools rewrite no longer makes the checks stale.** The plan's `volatile_paths` (comma-separated globs) is left out of the changes everywhere they are read: the G6 and G7 fingerprints, the experts' diff, the related-test selection. In the re-wash, `test_times.json` was rewritten by every green test run and the live database by the workforce, so the experts' evidence kept going stale (wf_0a32826c, wf_d1344de4). With 4.1.1's G7, a full test run after the experts check would have staled it on every commit. `/ultimate-workflow:experts` now runs `verify.js --full` first.
- **At review, skills load from keywords in code, not in documents.** A document's added lines no longer count for `added:` selectors. Nine skills (multi-tenancy, AWS messaging, RAG, agent loops and others) loaded on every review of the UI rework and were never cited. Plan, tests and build selection, which read the plan's text, are unchanged.
- **A finished plan stops steering the gates.** A plan with `phase: done` is ignored; the newest plan not done is the active one. The newest plan by time was a closed one, which demanded the frontend expert on a change with no UI (wf_4b7e2093). `/feature` marks a plan done after its commit lands, never before.
- **The gates follow the plan the commands work on.** A hook gets no arguments, so the gates guessed the plan by modification time. Now `experts.js` records the plan in `.ultimate-workflow/active-plan` whenever it is given `--plan`, and so does every phase script; the gates read that first, and fall back to the newest unfinished plan. A pointer to a missing or finished plan is ignored.
- **The build never commits.** Its agents are told never to stage or commit; one tried to commit part of a card and was refused by G6 (wf_bee713be).
- **One test run at a time.** `verify.js` waits while another run holds `.ultimate-workflow/verify.lock` and takes over a lock left by a dead run; two overlapping runs had failed timing-sensitive tests (wf_4f7aeb20). Runs that bypass `verify.js` are not covered.

Tests: `evals/experts/rewash.test.js`, every safeguard mutation-checked.

## [4.1.1] - 2026-10-31

### Changed

- **The tests the change needs, not the whole suite after every edit.** Since 4.1.0 turned the gates on, G3 asked for the full `test_command` at the end of every turn, and each build round ran it too, so a one-line change waited for every test. `node hooks/verify.js` now decides from the uncommitted changes: only the related tests (`test_related_command` in the plan, with `{files}` or `{tests}`) while working; the full suite when there is no related command, no git or no related test, when a manifest, lockfile, compiler or runner config, test setup, CI file or a `full_suite_paths` path changed, or more than 20 files did. G3 accepts a passing related run. The build's rounds run it, and a round is green only after one full run passes (`verify.js --full`). The plan proposes `test_related_command`; a plan without it behaves as before. `hooks/lib/selection.js`, `hooks/verify.js`.
- **`npm test -- one.test.ts` no longer counts as the full suite.** The verify command was matched by substring; now only `verify.js --full`, or `test_command` as the whole last command, is a full run (`dispatch.verifyKind`).

### Added

- **G7: no commit until a passing full test run covers the current changes.** The full suite runs once here instead of at every turn end. A full run is recorded with the fingerprint of the changes in `.ultimate-workflow/verify.json`; an edit after it makes it stale. Docs-only and empty commits are exempt (a `requirements.txt` change is not docs); no `test_command`, no check. `status.js` shows `fullVerify` (never, fresh, stale, failed). Tests: `hooks/lib/selection.test.js`, `hooks/verify.test.js`, `dispatch.test.js`, `status.test.js`, `evals/experts/stage-script.test.js`, each safeguard mutation-checked.

## [4.1.0] - 2026-10-30

### Changed

- **The gates are on by default again.** `ULTIMATE_WORKFLOW_GATES` unset now means on; `off`, `0`, `false` or `no` turns every gate off (it used to need `on`). They are still inert in a repo with no `PRD.md` and no `PLAN-*.md`, still fail open, and `hooks/status.js` shows whether they are live. Why they were off in 3.x and why that changed: `docs/gates.md`.
- **Three tiers instead of "when to skip".** Skip (typo, one-line fix, doc edit, rename), light (plan without experts, tests, build, experts check) and full (plan with experts, tests, build per card, review, experts check, harvest). A PRD or new project is full, runs the bootstrap first and then the full tier once per roadmap milestone. In the workflow skill, the Cursor rule, `AGENTS.md` and the README.
- **The running-system harness comes first.** When a plan splits the work into cards and a check needs the running system (a browser capture, an integration or end-to-end harness), the plan and test-plan prompts make that harness the first card, so later cards are verified against it. On the CEO dashboard run it was card 3 and found four defects card 2 had already committed.
- **A recheck cannot drop the experts still on this work.** `prepare` prints `keep` with the last experts check's experts when its snapshot and the current diff share at least one file (decided 2026-10-29), and `review.js` keeps them selected; the recheck can still add. After a commit and an unrelated new change nothing carries over. The changed-only recheck uses the same path.
- **`prepare` warns when untracked files make up most of a large diff** (`untrackedHeavy`, over 200 KB and half the bytes), naming the biggest, and the review command asks the user whether to ignore them first. On a real install 1.8 MB of capture output was about to be reviewed.
- **Plan and tests markdown that comes back HTML-escaped is decoded before it is shown or written**, `&amp;` last. Seen on a real install.
- **Copying a workflow result from the tool's output file with a one-liner is the expected way**, said so in the ledger step, so it is no longer logged as a workaround.
- **The tests and build commands record their own catches:** each critic gap or expert case that changed the test plan, and each defect the build found. On the first real card all 16 catches were at tests or build, where nothing had asked for them.
- **One retry for a run that started no agent.** The five phase commands keep "call it once", with one exception: a run that failed before any agent started (an input or argument error) is fixed and run once more, said so and noted in the ledger's workarounds.

### Added

- **`/ultimate-workflow:feature`, the whole workflow in one command.** Give it a request or a PRD; it picks the tier, says which, runs the phase commands in order by following their own files, and stops only for the two confirmations, an open high-confidence finding, a build that escalates after three rounds, a gate refusal it cannot satisfy, or a failure after the one retry. It ends with the value report for the feature. `commands/feature.md`. A finished roadmap milestone is marked done in `ROADMAP.md` and `progress.md`, so the next session starts at the next one. `HOW-TO-USE.md` is the one-page guide: what to type for a new project and for a feature.

- **A value ledger and `/ultimate-workflow:value`.** Every phase command now ends by appending one line to `.ultimate-workflow/ledger.jsonl` (local, like the evidence): the session's numbers from the Workflow result (run id, agents, tokens, duration, workarounds) and, from the phase's own saved result, the experts, skills, review findings by basis and uncited skills, whether the review was a delta, the cases each expert added at tests (a new `casesAdded` in the tests lane), and the build's rounds and briefs. Catches are recorded and later confirmed or refuted with `experts.js ledger catch|confirm|refute` (the plan command records each expert correction to the draft; the review command each confirmed finding; the build confirms one when its test goes red). `/ultimate-workflow:value` reports totals per phase, catches by stage and origin, the experts' unique precision (confirmed over judged), skill citation rates and skills never cited, and the workarounds. Code records and adds up; whether a catch was unique or real stays the user's or the session's call. `experts/ledger.js`, `evals/experts/ledger.test.js`. On the CEO dashboard run all of this was kept by hand.

- **A changed-only experts recheck before a commit.** `/ultimate-workflow:experts` now runs `prepare --delta`: when the last experts check covers the earlier changes, each of its experts reviews only the files that changed since, plus the files in the diff that import a changed file or use one of its exported names or the custom properties it touched; its findings on every other file carry forward with their ids, waivers and blocking. The commit gate is unchanged: the record is still for the current fingerprint. A full review runs instead after 3 changed-only reviews in a row, when the changed and dependent files exceed 40% of the diff's files, when there is no snapshot of the base, or when an expert's review does not cover it; an expert the recheck adds, and the recheck itself, always read the full diff. On a changed-only recheck the last check's experts stay selected even when the recheck answers nobody (it can still add), so the expert that reviewed the earlier changes always sees the fix. On the CEO dashboard run every fix-and-recheck loop cost about 490k tokens. Known limit: an effect on a file that neither changed nor visibly uses a changed one is not re-read. `evals/experts/delta.test.js`, with mutation checks for the carry-forward, the base check and the dependents.

## [4.0.2] - 2026-10-29

### Fixed

- **The phase commands can start their workflow on a real install.** The Workflow tool refuses a `scriptPath` in the plugin's install folder ("scriptPath must be a script path this tool returned, or a file you can already read"), so every command's `${CLAUDE_PLUGIN_ROOT}/phases/<x>.js` failed, and sessions copied the script by hand with the arguments retyped, up to 294 KB of skill text. `experts.js script --phase <x>` now writes `.ultimate-workflow/run/<x>.js`, the phase script with its arguments built in from the files the command already produced (`--file key=path`, `--merge path`, `--args-file path` for the small ones), and prints its path; the commands call the tool with that path and no `args`. `harvest` now gets an object (`scope`, `range`) instead of the raw argument string. `plan` accepts `areas` as a list as well as a comma-separated string; a list crashed the run before any agent started. Tested in `evals/experts/stage-script.test.js`; `mirrors.test.js` refuses a command that points the tool at the plugin folder.

### Changed

- **At review each expert gets at most two skills,** its first two matches in `skills.md` order; the rest are named in `skillProblems` (decision 2026-10-29). On the CEO dashboard run 15 of 16 loaded review skills went uncited on two cards, and a planted-defect ablation (core lenses, experts without skills, experts with skills, two runs each) found no difference from the skills. Plan, tests and build are unchanged.
- **`/ultimate-workflow:review --no-experts`** runs the four core lenses only, at about a third of the cost, and says the experts were left out by request.
- **`rtl-and-direction` at review needs a direction signal** (`dir=`, `rtl`, `direction:`, `:dir(`, `<bdi`, `unicode-bidi`), not physical sides alone (decision 2026-10-29). On an app with no RTL support, `ml-4` or `left-2` loaded it on nearly every diff. An RTL app's change that only adds physical sides no longer loads it.
- **A stopped build can resume at the implementation, on record.** `build` takes `resumeAt: "implement"` with `resumeReason` (the user's decision), `testFiles` and `command`; it skips the test step and the result says `resumedAt`. Before, two cards needed a hand-edited copy of `build.js`.
- **`experts.js brief --section "<card heading>"`** chooses the briefs and skills from one card of a plan split into cards. Before, the devops brief loaded on cards 1 and 2 because card 3 adds a CI job.
- **Experts report a defect they can show now, not later.** In a real review the frontend expert saw that focus might not reach the opened phone drawer and left it for a later browser test; a core lens reported it instead. `experts/protocol.md` now says to report it and name the stage that will measure it.
- **`commands/plan.md` no longer says `plan_confirmed` "is not yours to set".** It contradicted the skill, which says to set it once the user has confirmed and never to clear a block; the command now says the same.

## [4.0.1] - 2026-10-28

Fixes three faults that only appeared on a real plugin install; local runs and every test passed. On 4.0.0 the phase commands could not run as designed.

### Fixed

- **Agents are called by their plugin name.** Claude Code registers a plugin's agents as `ultimate-workflow:uw-*` and has no bare names, but the phase scripts asked for `uw-explorer`, `uw-reviewer` and the expert names as listed, so every phase failed with "agent type not found". Each script now carries one identical block (`AGENT_NAMESPACE`, default `ultimate-workflow:`, and `agentName()`) and every `agentType` goes through it; `args.agentNamespace: ""` keeps local runs, which use the `.claude/agents/` copies, working. The shared test harness refuses a bare name, and `evals/experts/agent-names.test.js` checks that the blocks are identical, that the namespace equals `plugin.json`'s name, that no `agentType` bypasses `agentName()`, and that every named agent exists.
- **The phase scripts moved from `workflows/` to `phases/`.** Claude Code registers every script in a plugin's `workflows/` folder as a named workflow under the same names as the commands, so `/ultimate-workflow:plan` ran `plan.js` directly: the user's text arrived as a plain string and the command's expert setup (`experts.js list`, `experts.js skills`) never ran, which skipped the experts. In `phases/` the scripts are reached only through the commands. The commands, tests, memory topicals, rules, AGENTS.md, README and `docs/adding-an-expert.md` follow; `mirrors.test.js` now refuses a `workflows/` folder in the payload. Historical records keep the old path.
- **A run without skills is no longer silent.** Before, a missing `args.skills` consulted the experts with no skills and nothing said so, which made attribution meaningless. `plan` and `tests` now skip the experts and say why; `review` refuses to run.

### Changed

- `memory/workflows-authoring.md` records the two install-only gotchas (bare agent names, `workflows/` auto-registration).

## [4.0.0] - 2026-10-22

**Breaking, with the gates on:** a `git commit` is refused until the domain experts have reviewed the current changes (Gate G6, below), and a source edit until the plan records which experts apply. With the gates off, nothing that worked in 3.1 changes.

### Added

- **Domain experts that take part from the plan onward.** An expert is `agents/uw-expert-<name>.md` plus one reference per stage it joins; the plugin finds it by scanning the agents folder, so adding one edits no registry, router, workflow or command. A model is asked which experts apply at plan time and again on the real diff before a commit; code merges the answer so it can only add. Selected experts add constraints to the plan, cases to the tests, and review the diff against both. The first expert is security (`plan.md`, `tests.md`, `review.md`, plus a dependency audit script).
- **`/ultimate-workflow:experts`**, the quick check before a commit: re-ask, run the experts, record the evidence.
- **Gate G6** (opt-in, with the other gates): no source edit before the plan records which experts apply (`experts: []` counts), and no `git commit` until the experts have re-checked and reviewed the current changes. Evidence is tied to a fingerprint of the uncommitted changes, so any later edit makes it stale. A high-confidence expert finding keeps the commit refused until it is fixed or the user dismisses it with their reason (`experts.js resolve`). `status.js` reports the experts state.
- **A build stage for experts: a standing brief loaded on every build.** An expert that declares `build` ships `references/build.md` (at most 4 KB, not counting its Skills section, checked by the contract). `experts.js brief --plan` prints them with their skills, `commands/build.md` passes them to `build.js`, and the implementer gets them in the test-writing and implementing prompts whether or not the expert was selected at plan time. The brief says how to write and never what to build, and the plan wins on any disagreement. No expert runs as an agent at build, and nothing is recorded or gated for it.
- **Nine experts.** `architect` (plan, review: how services, queues, data stores and AWS resources fit together), `softarch` (plan, review: module boundaries and dependency direction), `developer` (plan, build, review: craft in new or rewritten production code; a finding names a concrete cost), `quality` (plan, tests, build, review: whether tests, evals and gates can fail; it always joins the tests stage, see below), `security` (plan, tests, review), `devops` (plan, build, review: see below), `frontend` (plan, tests, review: accessibility, real data, the web on phones, tablets and desktops, motion), `genai` (plan, tests, review: model calls, agent loops and tools, retrieval, Bedrock and AgentCore) and `data` (plan, tests, review: schema changes, queries, stores; its first skill is erasure and retention).
- **The developer expert combined with 22 upstream developer agents**: three new categories (change outside the task, a list that must be edited in step, a test that cannot fail) and five method rules. Remeasured on the held-out split of the general review corpus with its skills: saturated (17 of 18, 18 of 18, 18 of 18 runs for plain, upstream skill and expert), so no gain shown and no loss.
- **Expert evals** (`evals/experts/eval/`, `evals/experts/corpus/`): six frozen blind corpora (architect, softarch, developer, quality, a general `review` corpus and a generation corpus for the build brief) with hash pins, a runner that builds blind reviewer and judge tasks, a scorer with thresholds fixed before any run, gold sets for judge calibration, and recorded results. Deterministic parts are tested and mutation-checked; no model is called in CI.
- **Fifty shared expert skills, chosen in code and pasted into the prompt** (`experts/skills/<name>/skill.md` with a `NOTICE.md`). The architect uses eight (`lambda-event-sources`, `aws-messaging`, `step-functions`, `api-gateway`, `multi-tenancy`, `caching-and-latency`, `alarms-and-slos`, `aws-well-architected`); the developer thirteen (`engineering-principles`, `failure-handling`, `simplification`, `surgical-change`, `dependency-discipline`, `python-`, `typescript-`, `go-`, `rust-`, `java-` and `react-craft`, `telemetry-in-code`, `web-performance`); quality three (`test-craft`, `test-gates`, `eval-integrity`); security two (`ci-workflow-security`, `personal-data-exposure`); DevOps six; the software architect four; frontend nine; genai four; data one. The full table is `docs/expert-catalogue.md`. In two smoke runs an expert told to open the skill whose cue matched opened none, so a stage reference gives each skill a selector (`files:`, `added:` or `always`) and code chooses: from the diff at review (`experts.js prepare`), from the plan at build and tests (`experts.js brief --plan`, `experts.js skills --stage tests --plan`). At plan, where no code sees the draft, the call that chooses the experts must also name the skills it needs from an offered list. The lanes report `skillsLoaded`; at most 40 KB per expert per stage (56 KB for frontend and the developer, by decision), and what does not fit is reported. Each skill was built by comparing upstream agents and skills (ECC, anthropics, addyosmani, obra/superpowers, mattpocock, wshobson, trailofbits, vercel, agency-agents and others) and restating the parts that add a specific check. Details: `docs/adding-an-expert.md#shared-skills`. Measured only at review, on a saturated corpus.
- **`aws-well-architected`, the architect's skill**, built from a research pass on the AWS pages (2026-10-20): the Well-Architected best practices a change can show, each with its ID, what it looks like in Terraform, CloudFormation, SAM or CDK, and when it does not apply; plus verified facts with their source and date (NAT data processing, free gateway endpoints for S3 and DynamoDB, cross-zone charges, the DR tiers' RPO and RTO bands, SQS `MaximumConcurrency`, the Lambda 900-second limit, the dead-letter alarm). Selected by infrastructure file names or AWS code in the added lines (a selector may now join `files:` and `added:` with `; `), and offered at plan. The process and organisation practices, the Security pillar (the security expert's) and vendor headline figures are left out. The Generative AI Lens part of the research is kept in `docs/research/` for the Generative AI expert, which merges the catalogue's agent-system and AI/LLM entries. Not measured: the architect corpus is saturated, so infrastructure cases are needed.
- **The architect combined with 19 upstream architect agents, and two more skills.** Seven new review categories (a call cycle between services, a remote call per item, timeouts and pools that cannot fit, a write to two places with no way back, two versions during a rolling deploy, moving existing data without a check, replay with side effects), plan questions for the load numbers, blast radius, consistency and how existing data moves, and two skills: `lambda-event-sources` and `step-functions`, with each fact tagged by its source (AWS's developer guides as published on GitHub, the maintainer's live check, or AWS's 2026 toolkit marked unverified). Messaging semantics and multi-tenancy are deferred with research prompts. Details: `docs/experts/architect.md`. Not measured.
- **The architect's second research pass: four more skills.** After sweeping the whole catalogue, `aws-messaging` (SQS, SNS, EventBridge and Kinesis semantics), `api-gateway` (timeouts by API type, payload limits, the shared throttle, what HTTP APIs lack), `multi-tenancy` (the architect owns tenancy: isolation model, tenant context, enforcement where data is read, shared resources, noisy neighbours, lifecycle) and `caching-and-latency`, plus additions to `lambda-event-sources` and `step-functions` and three plan lines against over-building. Every AWS number checked against AWS's own developer guides as last published on GitHub; where a 2026 source differs, both are given. Not measured.
- **The DevOps engineer** (`devops`, plan, build, review): what an infrastructure change replaces or destroys (Terraform, CloudFormation, SAM, CDK), state, builds and deploys that cannot be repeated, promotion and deploy concurrency, migration order in the pipeline, rollbacks a change breaks, container signals and health, Kubernetes rollouts. Six skills: `terraform-change-safety`, `cloudformation-and-cdk`, `kubernetes-manifests`, `pipelines-and-deploys`, `release-safety`, `containers`; every number checked against the vendor's documentation as published on GitHub (GitHub, Docker, Kubernetes, HashiCorp, AWS CDK in 2026; CloudFormation as of 2023). Its build brief joins a build only when the plan names infrastructure, pipeline, container or manifest files or describes such a change: a build brief with no `always` skill is now conditional. CI workflow security stays with security, gates with quality, and the architect's Operability check was narrowed to rollback as a design question. Skill selectors now accept paths (`.github/workflows/*.yml`, `**/` across directories). Details: `docs/experts/devops.md`. Not measured.
- **The software architect combined with 20 upstream sources, and three skills** (`protobuf-compat`, `schema-evolution`, `module-boundaries`): which side a changed field is on, removal without deprecation, a published package without its version bump, two copies of a contract out of step, and a boundary rule loosened in the same change that crosses it. Every fact checked live by the maintainer before the skills were written (the playbook's new step 6b). Details: `docs/experts/softarch.md`. Not measured.
- **Byte budgets:** `experts/` without skills is now 60 KB of code plus 40 KB per expert; the skills library has no total budget (the 16 KB per-skill cap stays; the per-expert, per-stage cap was raised from 32 KB to 40 KB the same day, by decision).
- **`always: [tests]`** in an agent file: the expert joins the tests stage whether or not the plan selected it. The quality expert has it, because every test plan is about tests; `record --stage tests --plan` then writes it into the plan's `experts:` line, so the review and the commit check expect it too. The quality expert also gained a build brief for the agent that writes the tests.
- **The frontend and accessibility expert's skills** (2026-10-22): `semantics-and-aria`, `visual-accessibility`, `ui-on-real-data`, `responsive-and-devices`, `rtl-and-direction` and `motion` at review; `worst-case-data` at tests; and Emil Kowalski's design guidance as `motion-craft` and `interface-design`, offered at plan only and never a finding. The expert now owns the web on every device. Built from the maintainer's live checks of WCAG 2.2, MDN, the HTML and CSS specifications and the libraries' own pages (blocks G and K).
- **The generative AI expert's skills** (2026-10-22): `model-calls`, `agent-loops-and-tools`, `rag-retrieval`, `bedrock-and-agentcore`. Model-specific rows name the models the vendor page named on the day they were checked (block D).
- **Observability, web performance and privacy as skills under existing experts**, not new experts (maintainer decisions 2026-10-21): `alarms-and-slos` (architect), `telemetry-in-code` and `web-performance` (developer), `personal-data-exposure` (security), `erasure-and-retention` (data). Legal questions (lawful basis, consent, retention periods, transfers) are plan questions for a person, never findings.
- **The DevOps skills' second round** from the live check of block B: two shipped rows corrected (Helm's default hook delete policy; express-mode rollback), the confirmed missing items added, and the rows the value test cut removed.
- **docs/adding-an-expert.md** (the tested recipe, with the goal, the decision record of what was measured and what was only reasoned) and **docs/what-a-good-expert-looks-like.md** (how to judge and vet an expert).

- **Where a finding came from.** Every expert finding at review names its basis (`skill:<name>` with the row it rests on, `reference:<category>`, or `general`); `record` checks a skill basis against the skills loaded in that run and the skill's text, and `/ultimate-workflow:expert-attribution` (`experts.js attribution`) reports per expert the skills loaded at each stage, findings by basis, and skills loaded but never cited. Self-reported, so it shows what a finding claims; the A0, A2, A3 ablation shows what the skills add.

### Removed

- The path-keyword router (`experts/route.js`) and the hardcoded expert registry in `workflows/review.js`. Selection is a model's judgement with the list in front of it; the path router selected the security expert for 7 of 12 seeded cases, and the model for 12 of 12 (one expert, one run each, diff only).

### Measured, and what it shows

Against a plain reviewer, same model, blind judge (`evals/experts/results/README.md`):

- **Written corpora are saturated.** The developer found 6 of 6 seeded defects against 4 of 6 on its first held-out split; every later written set, the "hard" sets included, was found in full by the plain reviewer, even with Haiku as the reviewer. They cannot tell the arms apart.
- **Real defects, mined from fix commits** (`developer-real`, 8 cases): the expert found the same 4 as the plain reviewer and raised 3 false positives in 18 benign runs against 0. On real code its rules have so far added noise, not catches.
- Selection: a model picked the security expert for 12 of 12 seeded diffs and 5 of 6 harmless look-alikes.
- Not measured: devops, frontend, genai, data, and every skill written on 2026-10-22.

### Known gaps

- Selection by a model has been measured once, on one expert. The gate has not been exercised in a real Claude Code session: hook firing on `Bash`, and whether the model follows the command text, are untested there. Overlap between experts and the core reviewers, and between the architect and softarch experts and the explorer and critic agents, is undecided. Skills at build, tests and plan, and expert input at plan and tests, are unmeasured. There is no total cap on what all build briefs and their skills add to a build (about 28 KB today).
- Gate G6 has been tested by its unit and contract tests only; its first real Claude Code session is still to come.
- Facts still being checked: block F (the data expert's other skills wait on it) and prompt L (rows in shipped skills that rest on a community source or our own reasoning). Rows not yet checked are tagged [T] or [O] in each skill and are prompts to check, not findings on their own.

## [3.1.0] - 2026-10-06

### Added

- **Five architecture skills**: `system-architect-engineering-guidelines`, `greenfield-architecture-guidelines`, `modularity-and-evolution-guidelines`, `distributed-systems-resilience-guidelines` and `operability-guidelines`. Language-agnostic design guidance loaded by description, with an ADR template, a smell-to-pattern reference and quality-attribute scenarios.
- **Cross-references:** the workflow skill's plan step and the bootstrap skill's Phase 2 now point to the matching architecture skills, so they are reachable from the process skills and not only by description match. The README and the walkthrough page list them, and a test fails if the page misses a skill.
- **Eval suites** for them as one 42-case suite under `architecture-evals/` (tags `quality`, `trigger`, `hard`; excluded from the release ZIP, which stays at about 160 KB), with recorded results at `evals/results/architecture-skills/`. Fire rate on held-out prompts rose from 53% to 100% after rewriting the descriptions; answer quality over a no-skill baseline is small (+0.09 on the quality suite, -0.03 on the hard probes). A pre-registered rule said to fold three of the skills; the maintainer kept them and the decision is recorded.

### Known gaps

- The architecture claims in the skills were written from recall and cross-read against a Gemini fact-check that rests partly on secondary sources; see `research/architecture-claims-check.md`. No Cursor `.mdc` twin exists for the new skills.

## [3.0.2] - 2026-08-30

### Fixed

- **Three references inside the shipped payload were dead for installed users.** All of them resolved from the repo root, so nobody working in the repo could see them — the only reader affected was the one who could not report it. `memory.md` linked a research summary that is deliberately not shipped (the entry already said so in prose, and now stops contradicting itself with a hyperlink); `memory/context-boundary.md` pointed at a `memory-protocol.md` path the v3.0.1 restructure invalidated; and `memory-protocol.md` named `references/memory-template.md` while sitting inside `references/` itself.
- **Three root-doc paths left behind by the restructure**, two of them in the always-on `AGENTS.md` and one in `docs/gates.md`, which told a reader to run `hooks/dev/record.js` at a path that no longer exists.

### Added

- **`mirrors.test.js` guard: no shipped file may reference a path that does not resolve inside the payload.** This is the class the v3.0.1 restructure created, and nothing caught it.

  The first version of the guard only flagged paths that still resolved at the repo root, on the theory that those were the move's leftovers. Reintroducing a real defect left it green — two of the three findings pointed at paths resolving under no root at all. A guard that passes against the bug it was written for is worse than none, because it certifies what it cannot see. Broadened, then mutation-tested against each finding.

  It carries three filters, each with its reasoning recorded: placeholders (`memory/<topic>.md`), template examples a skill tells the *user* to create (`memory/auth.md`), and leading-dot directories. That last one matters — `.ultimate-workflow/heartbeat.json` resolved here only because this repo has a heartbeat file from dogfooding, the kind of coincidence that turns a check into a liar.

## [3.0.1] - 2026-08-29

### Fixed

- **Cursor `/add-plugin` delivered an empty plugin.** Marketplace clones use a sparse-checkout that only keeps `/.cursor-plugin/` and `/.claude-plugin/`, so root-level `rules/`, `agents/`, `skills/`, and `commands/` never landed on disk. The shippable tree now lives at `.cursor-plugin/ultimate-workflow/`; both marketplaces use a relative `source` pointing there; the release ZIP is built from that directory. Documented in `memory/cursor-install.md`. **Reinstall** the plugin on both Claude Code and Cursor after pulling this change.
- **`commands/tests.md` frontmatter** — unquoted `:` in the description broke Claude's YAML parser (`claude plugin validate`), so the command loaded with empty metadata.

### Changed

- Verify command and CI globs: `".cursor-plugin/ultimate-workflow/hooks/**/*.test.js"`.
- `mirrors.test.js` asserts Cursor sparse-cone inclusion and simulated ZIP membership for the nested payload.

## [3.0.0] - 2026-08-28

The gates in this release were built to answer "the model ignores the workflow"
with enforcement: five lifecycle hooks that block a bad edit. They were never
published on their own -- measuring them changed the answer before they shipped,
so they arrive here already demoted to a backstop.

Seven of the nine defects found in that work were in the vendor wire surface, not
the logic -- a UTF-8 BOM that makes payload parsing throw, absolute paths defeating
test-file detection, `workspace_roots` where `cwd` was expected -- and each failed
*open and silently*. Three separate routes led to "installed, enforcing nothing,
looking identical to working". A mechanism with that failure mode should not be on
by default.

The alternative turned out to be structural rather than defensive. **If each phase
is its own invocation with its own fresh context and its own tools, ordering is not
policed -- a phase you have not started cannot be skipped.** That is what this
release is.

### BREAKING

- **Gates are opt-in.** Set `ULTIMATE_WORKFLOW_GATES=on` to enable them. Absent or any other value means off. Anyone relying on gates firing by
  default must set this, or they will silently get nothing -- which is exactly the
  failure mode being fixed, so it is called out here rather than buried.


- **`CLAUDE.md` is a thin index**, 240 lines to 49. 1220 of its 2769 words were
  byte-identical to `SKILL.md`. If you copied it into your own project, the
  standalone artifact is now `skills/the-ultimate-workflow-guidelines/SKILL.md` --
  the `curl` line in the README points there.

- **The plugin is renamed from `the-ultimate-workflow-guidelines` to `ultimate-workflow`.** The plugin name namespaces every component it ships, so commands and skills are now `ultimate-workflow:<name>` instead of `the-ultimate-workflow-guidelines:<name>`. Reinstall once:

  ```
  /plugin uninstall the-ultimate-workflow-guidelines
  /plugin install ultimate-workflow
  ```

  The repository, the marketplace entry, and the GitHub URL are unchanged, so `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` still works. Done now because the old name already produced `the-ultimate-workflow-guidelines:the-ultimate-workflow-guidelines` in the skill list, and the workflows planned for v3.0.0 would have made it worse.

- **Workflow gates are on by default.** Five lifecycle hooks now enforce the workflow rather than describing it: no source edit before a confirmed plan, no implementation before confirmed tests, no turn completion while code is unverified, a hard cap of three failing verify rounds, and a per-prompt stage pointer. They are inert in any repository without a `PRD.md` or `PLAN-*.md`, and `ULTIMATE_WORKFLOW_GATES=off` disables them entirely. They fail open: any internal error exits 0 and blocks nothing.

### Added

- **Five phase commands** -- `/ultimate-workflow:plan`, `:tests`, `:build`,
  `:review`, `:harvest`. Each runs in a fresh context, does one job, and stops.
  **Only `build` can write**; the other four return proposals you apply, which is
  deliberate -- a proposal you have to accept is a proposal you actually read.
- **Five scoped agent definitions** under `agents/`. Tool restriction is subtraction,
  and it is a hard refusal that also covers the deferred tool registry -- verified,
  not assumed. Four carry Cursor's `readonly: true` as well; `uw-implementer` carries
  neither and is the only writer. `mirrors.test.js` asserts that invariant.
- **`evals/`** -- a trajectory scorer plus eight context-boundary fixtures. The gap
  named by Google's Day 1 paper: tests cover deterministic behaviour, nothing covered
  trajectory or tool choice, and without both the practice is vibe coding regardless
  of how good the prompts read. `evals/results/README.md` records what the recorded
  runs do and do not support -- at length, because the headline number flatters this
  change more than the evidence does.
- **`memory/`** -- four topicals loaded on cue: `context-boundary`, `hooks-and-gates`,
  `workflows-authoring`, `mirrors`.
- **`mirrors.test.js`** -- heading parity, line caps, and command-surface coverage
  across the hand-copied files. A documented divergence list with no check is a
  comment, not a control, which is how the drift it now catches happened.
- **`research/`** -- Google's May 2026 paper on agentic engineering, with a summary.

### Removed

- **The two no-emoji hooks are gone**, along with their registrations. `hooks/hooks.json` now registers `gate.js` and nothing else, and `ALLOW_EMOJIS=1` no longer does anything. Nothing blocks a write containing emoji any more.

  The rule survives as a standing instruction, once per host, in `CLAUDE.md` and the Cursor always-on rule — and narrowed from "no emojis anywhere" to **"no emojis in code"**. Code is where the breakage is: a terminal rendering a source file, a pipeline parsing output. Prose was never the problem, and the blanket version had the project enforcing against its own public page, which carries four principle icons by design.

  If you relied on the hook to keep emoji out of files, it is no longer there.

### Changed

- **Context is split by cue, not by length.** The rule: *keep what has no cue, move
  what has a cue.* Retrieval fails when the trigger is an absence, so a hard
  constraint nothing prompts you to look up stays always-on. Cursor's
  `alwaysApply: false` rules are the direct analogue of `memory/` and got the same
  treatment.
- **Cursor gets the workflow as prompts, and the rule file says what that costs.**
  Cursor has subagents but no scriptable orchestrator, so the phases are invocations
  you sequence, the round cap is a number you honour rather than a counter, and
  ordering is advisory. It keeps fresh context per phase, one narrow job per agent,
  and the artifact on disk. Stated per layer instead of implying parity.
- **`hooks/status.js`** distinguishes never-ran / live / stale / disabled. Every gate
  writes a heartbeat, because a hook that never loaded, a hook that crashed, and a
  hook that correctly allowed everything are otherwise indistinguishable.

### Fixed

- `coerce()` now unescapes what `format()` escaped. A double-quoted value had its
  backslashes doubled on every write, corrupting a Windows `test_command` a little
  more each time the gates touched the file -- and they touched it on every edit.
- Tool paths are relativised against `cwd` before classification. Matching the raw
  absolute path silently disabled the tests-first gate for any project under a
  directory named `test`, and judged scratchpad edits elsewhere on disk against this
  repository's plan. Invisible to a green 52-test suite, because those tests used
  relative paths.
- The Stop gate fails open when no verify command is configured. The shipped template
  carried `test_command: ""`, which made that gate permanently unsatisfiable.
- `hookEventName` is echoed from the payload rather than hardcoded, so the escalation
  is not silently discarded by the host.
- `looksLikeShellWrite` is deleted. It matched heredocs, arrow functions, and
  `2>/dev/null` -- so every `git commit -F -` looked like a source write.
- `progress-template.md` shipped a date regex with its backslashes eaten, and a
  literal `YYYY-MM-DD` placeholder that left a bootstrapped project permanently
  un-handed-off.

### Known limitations

- **Fan-out costs real money.** Measured on this repository: `/harvest` 158k tokens,
  `/review` 460k, `/plan` 481k. Roughly a million tokens for a feature before
  implementation starts. Weigh that against what they find -- `/review` located four
  real defects in code with 136 green tests -- and treat them as once-per-feature.
- **The eval baseline is one run per cell across eight fixtures.** It supports "no
  detected regression" and nothing stronger. Three of the four pre-restructure
  failures are files that did not exist yet, and most pass conditions were authored
  after one arm's output was visible. Written down in `evals/results/README.md`
  rather than left for a reader to discover.
- **Gates remain Claude Code only.** On Cursor 3.17.19 a pre-edit `deny` is honoured
  for reads and ignored for writes: the file is created and the next event reports
  success, so the model is never told it was blocked. The Codex and Gemini contracts
  are documented and look nearly identical to Claude Code's, but neither has been
  exercised against a real payload. Every defect on the hosts that *were* exercised
  was invisible in documentation. Until someone records payloads with
  `hooks/dev/record.js`, those hosts get prose.

## [2.6.0] - 2026-08-15

### Added
- **`/handoff` command** (`commands/handoff.md`) — writes a session handoff document so a fresh agent can pick up in-flight work. Produces `HANDOFF-<topic>.md` covering purpose/background, tools and how to run them, policies and schemas, a **suggested skills** section, current state, open issues, and candidate next steps. It references existing artifacts (`PLAN-<feature>.md`, `PRD.md`, `progress.md`, commits, PRs) by path rather than restating them, briefs the next agent without ordering it to start work, redacts secrets and PII, and takes an optional argument scoping the doc to the next session's focus. `disable-model-invocation: true` keeps it user-triggered only.
  - `commands/` lives at the plugin root, which both [Claude Code](https://code.claude.com/docs/en/plugins-reference) and Cursor auto-discover — one file serves both hosts. Included in the full-plugin ZIP; not in the per-skill ZIPs, since a command is a plugin-level component.
  - Wired into both skills (and their `rules/*.mdc` + root `AGENTS.md` mirrors): the workflow skill gains **step 7, "Hand off at end of session"**, and the bootstrap skill's **Phase 4** covers sessions that end before bootstrap completes. Both note the by-hand fallback for single-skill installs.
  - Affected files: new `commands/handoff.md`; `skills/the-ultimate-workflow-guidelines/SKILL.md`, `skills/project-bootstrap-guidelines/SKILL.md`, `rules/the-ultimate-workflow-guidelines.mdc`, `rules/project-bootstrap-guidelines.mdc`, `AGENTS.md`, `README.md`.

### Changed
- **Cross-tool root files: `AGENTS.md` (content) + thin `CLAUDE.md` import stub.** The bootstrap skill now produces `AGENTS.md` at the project root, plus a two-line `CLAUDE.md` containing just `@AGENTS.md`. Cursor reads `AGENTS.md` natively (per [Cursor docs](https://cursor.com/docs/rules)); Claude Code reads `CLAUDE.md` only and pulls the same content in via its `@`-import syntax (per [Claude Code memory docs](https://code.claude.com/docs/en/memory)). One source of truth, no drift. Affected files: bootstrap `SKILL.md`, both `rules/*.mdc`, workflow `SKILL.md`, root `AGENTS.md` (renamed from the old `CLAUDE.md`), new minimal root `CLAUDE.md`, template renamed to `references/agents-md-template.md`, memory/progress templates, root `memory.md`, `README.md`, and the now-removed `CURSOR.md` (folded into README). **Migration for existing users:** projects bootstrapped before this release have a `CLAUDE.md` with full content at root. Rename it to `AGENTS.md` (`git mv CLAUDE.md AGENTS.md`), then create a new two-line `CLAUDE.md` containing only `@AGENTS.md`. Cursor will pick up `AGENTS.md` immediately; Claude Code will import it via the stub.
- **Principles & Workflow — partner-mindset and anti-fake-success additions**, mirrored across `SKILL.md`, `AGENTS.md`, and `rules/the-ultimate-workflow-guidelines.mdc`:
  - **Think Before Coding** now includes "truth over agreement" — don't reflexively affirm the user's framing; name gaps in their reasoning.
  - **Goal-Driven Execution** gains a "Don't fake success" paragraph — no silent fallbacks, swallowed errors, or skipped assertions when the task can't actually be accomplished; stop and surface via the host's ask-user tool.
  - **How to stop and ask** gains two counter-balances: don't bog down on trivial reversible decisions (decide, flag, move on), and treat user rejection/skip of a tool call as a signal to ask why before retrying.
  - **Workflow step 2** explicitly favors concision over polish in `PLAN-<feature>.md` ("sacrifice grammar for density if it helps").
  - **Workflow step 5 (blocker protocol)** adds "reconsider applicable guidance" — re-scan `memory.md` and project rules/`AGENTS.md` for entries that match the new direction before resuming.

## [2.3.2] - 2026-04-29

### Fixed
- `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` followed by install would not register the plugin. Two root causes:
  - `marketplace.json` plugin entry used `source: "./"` (the marketplace's own root), which is not a supported source shape per the [Claude Code marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces#plugin-sources). Switched to the `github` source shape (`{"source":"github","repo":"ValeroK/the-ultimate-workflow-guidelines"}`).
  - `plugin.json` had a `skills` array pointing at individual skill directories. Per the [plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), `skills` must point at a parent directory. Removed the field — the default auto-discovery from `skills/<name>/SKILL.md` already finds both skills.

### Removed
- Unused `id` top-level field from `marketplace.json` (not in the documented schema).

## [2.3.1] - 2026-04-29

### Added
- `CHANGELOG.md` (this file).
- `.github/workflows/validate.yml` — PR-time JSON-syntax check on all three manifests and a version-consistency assertion across the four version slots.

### Fixed
- Reconciled drift between `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, and `.claude-plugin/marketplace.json`: identical `description` and `keywords` everywhere, and `homepage` + `repository` now present in the Claude manifest (previously only in the Cursor one).

### Changed
- `memory.md` placeholder comment collapsed from a six-line example block to a one-line pointer to the entry-shape template.

## [2.3.0] - 2026-04-29

### Added
- `memory.md` slim-index + lazy topical-file pattern, with template under `skills/the-ultimate-workflow-guidelines/references/memory-template.md`. Topical knowledge ("how X works", "why we picked Y") lives in `memory/<topic>.md` and is read on demand when the task touches the topic. Defensive one-liners ("beware X") still go to `CLAUDE.md` `## Gotchas`.
- Dual Claude + Cursor plugin ZIP as a release asset (`the-ultimate-workflow-guidelines-plugin.zip`) — same archive installs into both ecosystems.

### Changed
- `README.md` and the project-explainer copy rewritten to cover the slim-index + lazy-load memory pattern and clarify the Gotchas vs Memory distinction.

## [2.2.0] - 2026-04-24

### Added
- `LICENSE` file (MIT-with-Attribution) and `.gitignore`.
- Claude Desktop install path via release ZIPs.

### Changed
- Switched license declaration to MIT-with-Attribution (`LicenseRef-MIT-Attribution`) across `plugin.json` and SKILL.md frontmatter.

### Removed
- Unreferenced `EXAMPLES.md`.

## [2.1.1] - earlier

### Removed
- Multica promo and X link from README header.

## [2.1.0] - earlier

### Added
- Initial dual-ecosystem layout (Cursor rules under `rules/`, Agent Skills under `skills/`).
- README and `CURSOR.md` install instructions for both ecosystems.

### Changed
- Rebranded to `the-ultimate-workflow-guidelines`.
- Added the explicit Workflow section (plan-first, test-first, blocker protocol) and the sibling `project-bootstrap-guidelines` skill.

## Earlier history

For commits prior to `v2.1.0`, see `git log`. Highlights include the original Cursor-plugin migration, the marketplace manifest, and the first round of plugin-structure fixes.

[3.0.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v3.0.1
[3.0.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v3.0.0
[2.6.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.6.0
[2.3.2]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.2
[2.3.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.1
[2.3.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.0
[2.2.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.2.0
[2.1.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.1
[2.1.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.0
