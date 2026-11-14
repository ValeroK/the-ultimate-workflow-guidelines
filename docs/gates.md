# The commit check

The five phase commands make ordering structural: you cannot skip a step that has not been started. The commit check covers the other case — **ad-hoc work in a repo that has a plan**, where nobody ran a phase at all.

Since 5.0.0 there is **one blocking check, at `git commit`**. Everything before the commit reminds and never refuses: no edit is blocked, no turn is stopped from ending, and no hook writes your plan file. The check is **on by default**. Set `ULTIMATE_WORKFLOW_GATES=off` (or `0`, `false`, `no`) to turn it off; unset or anything else means on. Run `node hooks/status.js` to see what it would say about a commit now and when it last ran.

## What it checks

A commit is refused unless all four hold, and the refusal lists **every** missing one with one fix command each, in this order:

| Item | Rule |
|---|---|
| Confirmation | The plan and the test plan are confirmed (`plan_confirmed`, `tests_confirmed`) and the plan text is unchanged since (`confirmed_hash`). A plan confirmed before the hash existed counts as confirmed; a card added after the confirmation does not |
| G7 | No `git commit` until a passing FULL test run covers these changes (`node hooks/verify.js --full`, or `test_command` typed whole). An edit after the run makes it stale; feature work only (a `PLAN-*.md`); no `test_command`, no check |
| G6 | The domain experts re-checked and reviewed exactly these changes, and no high-confidence finding is open (fixed, or dismissed by the user). The plan records which experts apply (`experts: []` counts) |
| Memory | The commit does not leave the project's memory newly broken (a stale index, a broken link, an invalid header). Judged even for a documentation-only commit |

Documentation-only and empty commits are exempt from the first three. Each commit ends in one of three outcomes, printed by the hook, by `status.js` and by `card-commit`: **checked**; **exempt**, with the reason (documentation only, nothing to commit, no plan is open, several plans and none chosen); or **could not check** (a git error). By hand the last two let the commit through and say so; in the unattended run could-not-check parks the card. The check is a strong backstop, not a proof: it does not see a commit hidden in `bash -c "..."`, and the accept steps (confirm, baseline accept, dismiss a finding) are honour rules in the command text.

Plan settings the confirmation hash leaves out (`test_command`, `volatile_paths`, `known_failures`, `full_suite_paths`, and a shortened `experts` line) are recorded at confirmation, and the check names one that changed since. It is shown, never a refusal.

## Reminders

Short lines, computed from the plan and the PRD each time, sent at the start of a turn and at its end (never on an edit): the plan is not confirmed yet, the test plan is not confirmed yet, code changed since the last full test run, several plans are open and none is chosen. One line per prompt also names the current stage, so it survives a trimmed history. At the end of a turn the line is shown on Claude Code only.

## Which plan

The plan the check reads is chosen, not guessed. One open plan is the plan. With several open plans and no pointer none is chosen: a commit goes through unchecked and says so, until you pick one with `node experts/experts.js use --plan <file>` (any `experts.js` command given `--plan` picks it too). A plan marked `phase: done` is closed.

Documentation (`.md`, `.txt`) never counts as code. Neither do diagrams, because a plan often needs one before it is confirmed: diagram sources (`.mmd`, `.mermaid`, `.puml`, `.plantuml`, `.drawio`, `.excalidraw`, `.d2`) anywhere, and rendered diagrams (`.html`, `.htm`, `.svg`, `.png`) only under a folder named `docs`. A diagram still counts as a change for the related tests, G6 and G7.

### Cards in a plan

A plan split into cards lists them in a `## Cards` section, one bullet per card, written by `experts.js card-add` and not by hand:

```
- 8a: Command Deck routes
  paths: dashboard/src/app/skills/**, README.md
  carried: an item left over from the card before; another
```

`brief --card 8a` chooses the briefs and skills from that entry (a plan with only a `Card 8a` heading still works; names are matched whole, so `8` is not `8a`). After the build, `scope --plan P --card 8a --result .ultimate-workflow/run/build.result.json` prints the files git says changed that no `paths` glob covers (`**` and a trailing `/**` cover folders below). The agent's own list of changed files is not used. The plan, `.ultimate-workflow/` and the tests the build wrote are left out. It reports; it blocks nothing.

### Concerns

The experts' protocol used to say to leave out anything rated below 8, so a worry that was real but not provable went into the one-sentence `lensVerdict` and nowhere the gate or the user would see it (the quality expert's "one real hole" on card 9 of the re-wash). At review an expert now lists such a worry in `concerns`, at most three, each with the reason it is not a finding. `review.js` keeps the items that have both a text and a reason, counts the rest in `expertLane.concernsDropped`, and ignores a core lens's. `record` stores them in the expert's evidence and prints them, the ledger's review row counts them, and the review and experts commands list them for the user. A concern never blocks a commit; judging the open catches in the ledger is not part of this.

### Experts per card

A card may carry its own experts: `experts: [frontend, quality]` under its entry, written with `card-add --experts frontend,quality` (or `--experts none` for the empty list). The plan's `experts:` line stays the default and the ceiling: a card's names must be installed experts that are also in that line, and `card-add` refuses anything else. Which set applies is worked out from the changed files at the moment of use, not from a pointer: leave out the plan, `.ultimate-workflow/` and test files, and if every remaining file is covered by the paths of cards that all carry the field, the commit is held to the union of those cards' experts. A file no card covers, a card with no field, a field that is not a subset, or no Cards section gives the plan's line, unchanged, so an edit outside the card brings the full panel back by itself. `experts.js read --plan P` prints both (`experts`, `effective` with its `source`, `cards` and `reason`), `status.js` shows the narrowing, and the G6 message names the card. The limit: the field is written by the session, so a card with a wide `paths` glob and a narrow field can still under-review; the subset rule and the visibility are the guard, not proof. The recheck can still add experts, and the experts kept from the last check are added to the set, never taken from it.

### One full run, not three

A passing `verify.js --full` is recorded with the fingerprint of the changes it covered, and G7 accepts it for exactly those changes. `verify.js --full --if-stale` asks for a full run only when none covers the current changes: the record must be a passing full run of the plan's own `test_command` on exactly the current changes, otherwise the suite runs as usual. A skipped run says so and writes nothing, and to G3 it still reads as a full verification. `/ultimate-workflow:experts` uses it, so the build's last full run, the experts check and the commit do not each run the suite. `verify.js` also works at the project root now, so a run started in a subfolder leaves its record where G7 looks. A build whose arguments name no plan takes its verify command from the active plan; before, it got none and its closing full run never happened.

### Merges (4.2.1)

Committing a merge used to ask the experts to review everything the other branch brought in, which was reviewed where it was made: 36 files and about a million tokens on one card, or a stop for the user. Now, while a merge is being committed (`MERGE_HEAD` exists, no unresolved conflicts, tracked files in the working tree equal to the index), the changes the gates look at are the merge's **combined diff**: what is in neither parent. A clean merge has none, so G6 has nothing to review; a hand-resolved conflict shows only the resolution. If anything is unclear (an unresolved conflict, an edit not yet staged), the whole diff against HEAD is used, so doubt means reviewing more. A changed-only recheck is refused during a merge.

G7 still applies, on the **tree** that will be committed: a merge's combined diff can be empty while its tree has never been tested. A merge whose tree equals HEAD's, or differs only in documents, is not held.

To see what is new in a merge before committing, in PowerShell with the merge staged:

```
$c = git commit-tree (git write-tree) -p HEAD -p MERGE_HEAD -m tmp
git show --cc --format= $c
```

`git merge` that commits by itself is not seen by the hooks, which only see `git commit`.

**Files a test run rewrites.** After a run, `verify.js` names any file the run rewrote that the plan does not list, with the exact `volatile_paths:` line to add. A refusal from G6 (stale evidence) or G7 (moved fingerprint) points at `volatile_paths` too, since a fingerprint that moved with no code edit is usually such a file.

### The long-conversation reminder (4.2.0)

Not a gate: on each prompt the hook reads the last turn's context size from the end of the transcript, and past 80k tokens (and again every further 80k; 150k before 4.7.0) adds one line suggesting `/handoff` and a new session. It never blocks, runs in any repository while the gates are on, and keeps its state in the system temp folder. `ULTIMATE_WORKFLOW_CONTEXT_REMINDER` sets the size in tokens; `0` turns it off.

### Which tests run when (4.1.1)

Until 4.1.1, every check asked for the whole suite, so a one-line change waited for every test. Now `node hooks/verify.js` decides from the uncommitted changes:

| Situation | What runs |
|---|---|
| While working (each build round) | Only the tests related to the change: `test_related_command` from the plan, with `{files}` (the changed files) or `{tests}` (the changed test files and the tests that import or use a changed file) |
| No `test_related_command`, a template with neither placeholder, no git, or no related test found | The full suite (as before 4.1.1) |
| A manifest or lockfile, compiler or test-runner config, test setup, CI file, a path in `full_suite_paths`, or more than 20 files changed | The full suite |
| The end of a build | The full suite, once (`verify.js --full`); the build's round is green only if it passed |
| Before a commit (G7) | A passing full run must exist at the current fingerprint of the changes |
| Only documentation changed | Nothing |

Files that tools rewrite on every run (a test-timing file, a live database) go in the plan's `volatile_paths` (comma-separated globs, 4.1.2). They are left out of the changes everywhere, so a test run that rewrites them makes neither G6's experts review nor G7's full run stale. Run the full tests before the experts check (`/ultimate-workflow:experts` does), so nothing the tests write lands after the review.

The gates read the plan the commands last worked on: `experts.js` records it in `.ultimate-workflow/active-plan` whenever it is given `--plan`, and so does every phase script (4.1.2). With one open plan that plan is read with no pointer; with several and none recorded, none is chosen (see "Which plan").

Only a real full run counts for G7: `verify.js --full`, or `test_command` as the whole last command (after `cd x &&`). `npm test -- one.test.ts` or `npm test | tail` narrow or mask the run, so they never satisfy G7. The model never passes a file list: the changed files come from git. Examples of `test_related_command`: `npx vitest related --run {files}`, `npx jest --findRelatedTests {files}`, `pytest {tests}`, `node --test {tests}`.

They are **completely inert** in a repo with no `PRD.md` and no `PLAN-*.md`, so trivial work in an unmanaged project is never blocked. They fail open: an internal error blocks nothing.

Set `plan_confirmed` and `tests_confirmed` to `true` only after the user has actually confirmed that stage. They are not the model's to set, and setting one to clear a block defeats the only thing the gate does.

## Why it is on by default

In 3.x the gates were opt-in, because a default-on mechanism that fails open invisibly is worse than an opt-in one somebody chose: a hook that never loaded, a hook that crashed, and a hook that correctly allowed everything all look identical from outside. 4.1.0 turned them back on once a silent no-op could be made visible, and real runs showed agents drifting off the workflow when nothing held them to it. 5.0.0 kept that and removed everything that blocked during work: thirteen checks became one, because blocks during work stopped sessions for things they did not do or could not fix.

The sign that the hook is really loaded is the **commit-time stamp**, `.ultimate-workflow/commit-check.json`, written only when the check runs on a commit. If you commit and `status.js` still says "Last commit check: none yet", the hook is not registered. **Hook config is read at host startup**: restart after installing or updating. A `.ultimate-workflow/heartbeat.json` left by 4.x is ignored and can be deleted.

## Check it is actually running

```bash
node hooks/status.js
```

Reports the stage, the reminders a turn would get now, whether a commit would pass and what is missing, the last full test run, and when the check last ran.

### For scripts and CI

```bash
node hooks/status.js --json
```

Exit is always 0, so it stays usable under `set -e`.

```jsonc
{
  "gates":    "enabled|disabled",
  "stage":    "none|bootstrap|feature",
  "file":     "/abs/path/PLAN-feature.md",   // null at stage none, or when several plans are open and none is chosen
  "state":    { "plan_confirmed": false },   // the plan's front matter, present keys only
  "reminders": ["The plan is not confirmed yet. ..."],
  "fullVerify": "never|fresh|stale|failed|n/a", // the last full test run, for G7
  "lastCheck": { "outcome": "checked|refused|exempt|could-not-check", "missing": [], "at": "..." }, // null before the first commit
  "leftoverHeartbeat": false,                // a 4.x heartbeat.json that can be deleted
  "experts":  {                              // null outside a feature
    "decided": true, "selected": ["security"], "available": ["architect", "developer", "quality", "security", "softarch"],
    "openFindings": 0,                       // high-confidence findings still open
    "commit": { "allowed": false, "reason": "Gate G6: ...", "missing": ["experts"] }
  }
}
```

Treat the key names as a contract. The human report and this object are rendered from one computed value, so they cannot disagree with each other.

## Claude Code only, and why

**Cursor, Codex CLI, Gemini CLI, and claude.ai get the workflow as prose.** The checkpoints are observed, not enforced.

That scope is measured, not assumed. On Cursor 3.17.19 a pre-edit hook returning `deny` is honoured for reads and **ignored for writes**: the file is created, and the following event reports success, so the model is never even told it was blocked. Shipping gates there would look like enforcement while providing none. The unattended run's `card-commit` and `experts.js check` ask the same commit check on every host.

The Codex and Gemini hook contracts are documented and look nearly identical to Claude Code's, but neither has been exercised against a real payload. Every defect found on the hosts that *were* exercised — a UTF-8 byte-order mark that makes payload parsing throw, absolute paths defeating test-file detection, `workspace_roots` in place of `cwd` — was invisible in the documentation and failed open.

Until someone records real payloads with `.cursor-plugin/ultimate-workflow/hooks/dev/record.js`, those hosts get prose. Prose that works is better than enforcement that silently doesn't.
