# The enforcement gates

The five phase commands make ordering structural: you cannot skip a step that has not been started. The gates cover the other case — **ad-hoc edits in a repo that has a plan**, where nobody ran a phase at all.

They are **on by default** since 4.1.0. Set `ULTIMATE_WORKFLOW_GATES=off` (or `0`, `false`, `no`) to turn them off; unset or anything else means on. Run `node hooks/status.js` to see whether they are actually live in your session (never ran, live, stale or disabled).

## What they do

Lifecycle hooks read a small YAML block at the top of `PRD.md` or `PLAN-<feature>.md`:

| Gate | Rule |
|---|---|
| G1 | No source edit before the plan is confirmed |
| G2 | No implementation before the tests are confirmed — test files exempt, that is the point |
| G3 | No finishing a turn with unverified changes. The related tests are enough (`node hooks/verify.js`); so is the full `test_command` |
| G4 | Three failed verification rounds escalates to you |
| G5 | One line per prompt naming the current stage, so it survives a trimmed history |
| G6 | No source edit until the plan records which domain experts apply (`experts: []` counts), and no `git commit` until the experts have re-checked and reviewed the current changes. A high-confidence expert finding blocks it until fixed or dismissed by the user |
| G7 | No `git commit` until a passing FULL test run covers the current changes (`node hooks/verify.js --full`, or `test_command` typed whole). An edit after the run makes it stale; docs-only and empty commits are exempt; feature work only (a `PLAN-*.md`); no `test_command`, no check |

Documentation (`.md`, `.txt`) is always writable. So are diagrams, because a plan often needs one before it is confirmed: diagram sources (`.mmd`, `.mermaid`, `.puml`, `.plantuml`, `.drawio`, `.excalidraw`, `.d2`) anywhere, and rendered diagrams (`.html`, `.htm`, `.svg`, `.png`) only under a folder named `docs`, since those formats elsewhere are usually application source. An edit to a diagram does not mark the tree dirty for G3. Unlike documentation, a diagram still counts as a change for the related tests, G6 and G7. Claude Code's own plan mode is separate and stricter: it allows only its plan file, so a diagram drawn there goes into the plan as a `mermaid` block.

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

### G3 and a running workflow

G3 used to fire at the end of the main session's turn while a build workflow was still editing, which forced a verify of half-built code (twice per card in the re-wash). Claude Code lists running background work in the Stop payload's `background_tasks`. While it holds a workflow with `status: "running"`, G3 steps aside for that Stop. The next Stop after the workflow ends carries an empty list, and G3 applies as it always did; G7 and G6 guard the commit throughout. A gate violation already recorded still blocks. A missing or malformed list defers nothing.

The deferral is never silent: the heartbeat entry carries `deferred`, and `status.js` prints "G3 deferred: ..." (and `deferral` in `--json`) until a later Stop is not deferred. There is no time limit, because the host is the authority on whether the run is alive and one agent command can run for hours without any hook event. If a run is stuck, stop it in the host; the status line shows which one G3 is waiting for. Recorded payloads (Claude Code 2.1.316): `fixtures/claude-code/workflow/`. `background_tasks` is documented in the hooks reference (Stop input, with `workflow` listed as a type); a workflow that failed or was stopped had left the list by the next Stop in the recordings, so G3 applied at once. Only `status: "running"` defers; the other status values are not documented.

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

Not a gate: on each prompt the hook reads the last turn's context size from the end of the transcript, and past 150k tokens (and again every further 150k) adds one line suggesting `/handoff` and a new session. It never blocks, runs in any repository while the gates are on, and keeps its state in the system temp folder. `ULTIMATE_WORKFLOW_CONTEXT_REMINDER` sets the size in tokens; `0` turns it off.

### Which tests run when (4.1.1)

Until 4.1.1, G3 asked for the whole suite at the end of every turn, so a one-line change waited for every test. Now `node hooks/verify.js` decides from the uncommitted changes:

| Situation | What runs |
|---|---|
| While working (G3, each build round) | Only the tests related to the change: `test_related_command` from the plan, with `{files}` (the changed files) or `{tests}` (the changed test files and the tests that import or use a changed file) |
| No `test_related_command`, a template with neither placeholder, no git, or no related test found | The full suite (as before 4.1.1) |
| A manifest or lockfile, compiler or test-runner config, test setup, CI file, a path in `full_suite_paths`, or more than 20 files changed | The full suite |
| The end of a build | The full suite, once (`verify.js --full`); the build's round is green only if it passed |
| Before a commit (G7) | A passing full run must exist at the current fingerprint of the changes |
| Only documentation changed | Nothing |

Files that tools rewrite on every run (a test-timing file, a live database) go in the plan's `volatile_paths` (comma-separated globs, 4.1.2). They are left out of the changes everywhere, so a test run that rewrites them makes neither G6's experts review nor G7's full run stale. Run the full tests before the experts check (`/ultimate-workflow:experts` does), so nothing the tests write lands after the review.

The gates read the plan the commands last worked on: `experts.js` records it in `.ultimate-workflow/active-plan` whenever it is given `--plan`, and so does every phase script (4.1.2). Without that record, they read the newest plan that is not done. A plan whose front matter says `phase: done` is ignored either way. Mark it done after its commit has landed, never before, or that commit skips G6 and G7.

Only a real full run counts for G7: `verify.js --full`, or `test_command` as the whole last command (after `cd x &&`). `npm test -- one.test.ts` or `npm test | tail` narrow or mask the run, so they clear G3 but never G7. The model never passes a file list: the changed files come from git. Examples of `test_related_command`: `npx vitest related --run {files}`, `npx jest --findRelatedTests {files}`, `pytest {tests}`, `node --test {tests}`.

They are **completely inert** in a repo with no `PRD.md` and no `PLAN-*.md`, so trivial work in an unmanaged project is never blocked. They fail open: an internal error blocks nothing.

Set `plan_confirmed` and `tests_confirmed` to `true` only after the user has actually confirmed that stage. They are not the model's to set, and setting one to clear a block defeats the only thing the gate does.

## Why they are on by default again

In 3.x they were opt-in, for the reasons below. 4.1.0 turned them back on: `status.js` now makes a silent no-op visible (never ran / live / stale / disabled), and real runs of the phases showed agents drifting off the workflow when nothing held them to it. The gates are still a backstop under `/ultimate-workflow:feature` and the phase commands, not the main story, and they still fail open.

### Why they were off in 3.x

They shipped **on** in 2.4.0, as the enforcement story. Measuring them changed the answer.

Full enforcement on one host, partial on one, unverified on two. Worse, there turned out to be three separate routes to *installed and silently enforcing nothing* — and a hook that never loaded, a hook that crashed, and a hook that correctly allowed everything all look identical from outside.

A default-on mechanism that fails open invisibly is worse than an opt-in one somebody chose. So they were demoted to an opt-in backstop and the phase commands became the story.

Two of the defects found in the v3.0.0 review are worth stating, because they show the failure mode:

- **G4 scored a failing test run as green.** Pass or fail was read from which event fired, on the belief that a failure arrives as a distinct failure event. Claude Code does not send one — a recorded fixture shows a non-zero-exit command arriving as an ordinary `PostToolUse`. So a red run cleared the dirty flag and reset the round counter. Failing the tests was the way to satisfy the gate that exists to make you pass them.
- **The Cursor fallback never fired.** On a host that cannot block a write, a denied edit is downgraded to *allow, record the violation, correct it at the end of the turn*. That check sat behind another one that steps aside whenever no verification command is configured — which the shipped plan template guaranteed. The violation was recorded and shown to nobody.

Both are fixed, both have regression tests confirmed to fail against the old code. Both were invisible to a green suite of two hundred tests, because the defect was in the wire format rather than the logic.

## Check they are actually running

```bash
node hooks/status.js
```

Reports whether the gates are live, what stage you are in, and what is blocking you right now.

Worth running once after installing, because **hook config is read at host startup**. A gate registered mid-session does nothing until you restart and gives no sign of it. Every gate now leaves a heartbeat, and this reads it, so *never ran*, *live*, *stale*, and *disabled* are four distinguishable states rather than four kinds of silence.

### For scripts and CI

```bash
node hooks/status.js --json
```

Exit is always 0, blocking or not, so it stays usable under `set -e`.

```jsonc
{
  "liveness": { "state": "live|stale|never|disabled", "ageSeconds": 12, "count": 41 },
  "stage":    "none|bootstrap|feature",
  "file":     "/abs/path/PLAN-feature.md",   // null at stage none
  "state":    { "plan_confirmed": false },   // the plan's front matter, present keys only
  "blocking": { "blocked": true, "reason": "Gate G1: ..." },
  "g3Active": true,
  "fullVerify": "never|fresh|stale|failed|n/a", // the last full test run, for G7
  "deferral": null,                          // or { "gate": "G3", "workflowId": "...", "workflowName": "...", "at": "..." }
  "experts":  {                              // null outside a feature
    "decided": true, "selected": ["security"], "available": ["architect", "developer", "quality", "security", "softarch"],
    "openFindings": 0,                       // high-confidence findings still open
    "commit": { "allowed": false, "reason": "Gate G6: ..." }
  }
}
```

Treat the key names as a contract. The human report and this object are rendered from one computed value, so they cannot disagree with each other.

## Claude Code only, and why

**Cursor, Codex CLI, Gemini CLI, and claude.ai get the workflow as prose.** The checkpoints are observed, not enforced.

That scope is measured, not assumed. On Cursor 3.17.19 a pre-edit hook returning `deny` is honoured for reads and **ignored for writes**: the file is created, and the following event reports success, so the model is never even told it was blocked. Shipping gates there would look like enforcement while providing none.

The Codex and Gemini hook contracts are documented and look nearly identical to Claude Code's, but neither has been exercised against a real payload. Every defect found on the hosts that *were* exercised — a UTF-8 byte-order mark that makes payload parsing throw, absolute paths defeating test-file detection, `workspace_roots` in place of `cwd` — was invisible in the documentation and failed open.

Until someone records real payloads with `.cursor-plugin/ultimate-workflow/hooks/dev/record.js`, those hosts get prose. Prose that works is better than enforcement that silently doesn't.
