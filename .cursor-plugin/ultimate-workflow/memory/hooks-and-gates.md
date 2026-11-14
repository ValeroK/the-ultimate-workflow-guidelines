---
description: How enforcement works, why a fail-open gate goes silently dead, and what was measured per host.
read_when:
  paths:
    - hooks/**
  keywords:
    - gate.js
    - status.js
    - adapters
    - heartbeat
    - the G6 experts/commit gate
    - adding a host
    - a gate is not firing
updated: 2026-11-13
---

# Hooks and gates

> How enforcement works here since 5.0.0, why "installed" is never evidence of "enforcing",
> and what was measured on each host.

## Mental model: one check, at commit; reminders everywhere else

Since 5.0.0 exactly one thing refuses: **`git commit`**, through one function, `commitGate` in `hooks/lib/gates.js`. Everything before the commit reminds and never refuses. No hook refuses an edit, no hook blocks a turn from ending, and no hook writes the plan file.

- **The commit check** asks four things and lists every missing one, each with one fix command, in this order: the plan and the test plan are confirmed and the plan text is unchanged since (`confirmed_hash`); a full test run passed on exactly these changes (`.ultimate-workflow/verify.json`, the fingerprint in `experts/experts.js`); the domain experts reviewed exactly these changes and no high-confidence finding is open; the memory files are not newly broken by this commit.
- **The same function is asked by** the hook (`dispatch.js`), `card-commit` in the unattended run (`experts/autopilot.js`), `status.js`, and `experts.js check`. Evidence for all of them is gathered once by `experts.commitEvidence`; each of the four is read on its own, so one unreadable file cannot switch the others off.
- **Three outcomes**, each printed: *checked* (allowed, or refused with the list); *exempt*, with the reason (documentation only, nothing to commit, no plan is open, several plans and none chosen); *could not check* (a git error). By hand, exempt and could-not-check let the commit through and say so; in the run, could-not-check parks the card.
- **Reminders** (`gates.reminders`) are short lines computed from the plan, the PRD and one fact (the changes differ from the last passing full run): plan not confirmed, test plan not confirmed, code changed since the last full run, several plans and none chosen. Sent at the start of a turn (context) and at its end (a notice line on Claude Code; nothing on hosts that have no field for one). They never refuse.
- **The plan offer** (5.0.1, `gates.PLAN_OFFER`): with no plan and no PRD open, a prompt that can be a new requirement (`gates.looksLikeRequirement`: not a slash command, a short reply or a question, and it has a request word or 400 characters) gets one line that tells the assistant to ask the user about a plan. A word filter, so it misses and over-matches; the line itself says "if this message is a new requirement", and the assistant decides.
- **State the hooks write:** `.ultimate-workflow/commit-check.json`, when the check last ran on a commit (written only at a commit), and `verify.json`, when the configured test command is typed directly. Nothing else.
- **`ULTIMATE_WORKFLOW_GATES=off`** turns the check off; off means off, in the hook and in the run.

A commit hidden in `bash -c "..."` is not seen by `isCommitCommand`: the check is a strong backstop, not a proof. The accept steps (confirm, baseline accept, resolve a finding) are honour rules in command text; the code cannot tell who ran them.

## Why a missing hook looks like a correct one

The hook **fails open**: an internal error blocks nothing. That is the right safety choice, because a crashed hook must never wedge a session. The cost is that **a check that is not running is indistinguishable from a check that is running and correctly allows**. Four routes to that state were measured, not reasoned:

1. **Cursor prefixes hook payloads with a UTF-8 BOM.** `JSON.parse` throws, the catch swallows it, exit 0. Installed, silent, enforcing nothing.
2. **Cursor honours a `preToolUse` deny for reads and ignores it for writes** (3.17.19). It is why no gate sits on an edit any more, and why Cursor gets the reminders and the check through `card-commit` and `experts.js check` only.
3. **Hook config is not reliably loaded immediately.** Registered, correct, and inert. Restart the host after the hooks change.
4. **Absolute payload paths defeated test-file detection.** Relativise against `cwd` first (`toProjectPath`).

The sign that the hook is really registered is `.ultimate-workflow/commit-check.json`: `node hooks/status.js` shows when the check last ran. If commits happen and it stays empty, the hook is not loaded. (Until 5.0.0 a heartbeat file was written on every event for this; that file is left over on old projects, ignored, and can be deleted.)

## Key decisions

- **Why one check at commit (5.0.0).** Thirteen checks blocked during work, sometimes for things the session did not do (a stop gate blocked on another session's edits) or could not fix. The owner decided: one blocking check, at commit; reminders elsewhere. Accepted cost: work can be done before confirmation and then cannot be committed.
- **No plan is guessed.** One open plan is the plan. Several open plans and no pointer (`.ultimate-workflow/active-plan`, set by `experts.js use --plan <file>` or by any command given `--plan`) means none: a commit goes through unchecked and says so. A second unfinished plan with no pointer switches the check off until one is picked (owner decision, 2026-11-13).
- **Plan settings the hash leaves out** (`test_command`, `volatile_paths`, `known_failures`, `full_suite_paths`, a shortened `experts` line) are recorded at confirmation in `confirmed_settings`, and the check names one that changed. It is shown, never a refusal. The `## Known failures` section a baseline accept writes is left out of the hash.
- **A plan confirmed before the hash existed counts as confirmed** at commit; the next confirmation stamps the hash. The run still insists on the hash at start.
- **Where the frozen tests and the plan disagreed, the tests won:** an empty `test_command` still steps the full-run check aside, and a memory that cannot be read at all lets the commit through with a warning (memory-gate.test.js). Bootstrap commits are still judged by the experts check only.
- **A host gets gates only after its payloads have been recorded.** Every host defect so far was invisible in the vendor documentation and failed open. Gates are Claude Code only; Cursor runs the prose workflow; the Codex and Gemini adapters exist with tests but are registered nowhere. The Cursor adapter stays in `adapters.js`, unregistered, on purpose: it is the record of what was measured.
- **Guessing intent from a command string does not work.** A `looksLikeShellWrite` heuristic scored three false positives and zero true positives before being deleted.
- **The experts check holds the domain-experts flow to account.** The changes must have been re-checked for experts and reviewed by every selected expert, against a fingerprint of the uncommitted changes, so any later edit makes the evidence stale. The final set may not drop an expert the plan named. It needs `Bash` in the PreToolUse matcher, which `registration.test.js` pins. It exempts documentation-only and empty commits, and it refuses while a high-confidence expert finding is open; a fix clears it through the next review, and `experts.js resolve` dismisses one with the user's reason. A review record can be a delta (`delta: {base, files, removed, chain}`); the check does not look at it.
- **Not every commit goes through PreToolUse (the autopilot run).** Workflow agents refused to type `git commit`, so the run commits through `experts.js` commands, whose git calls no hook sees. `card-commit` asks `commitGate` itself, before staging, because staging a new file moves the fingerprint. `park`, `harvest-branch` and `run-start`'s one-line `.gitignore` commit skip the check on purpose: a parked commit holds failing tests by design, a harvest commit is proposals on a side branch, and the ignore line is housekeeping. A new command that commits must call the check or say why it does not. `card-commit` leaves the experts part to the run's one review (outcome **deferred**, flag `expertsDeferred`, set only by `card-commit` on `uw/run/<feature>`): the hook and by-hand commits are judged as before. A review of a range (`prepare --range A..B`) is fingerprinted by the range and recorded under `.ultimate-workflow/experts/ranges/<hash>/`, never beside the working tree's evidence, so its findings are never open for a working-tree commit; `experts.js check --range A..B` answers whether a range was reviewed with no high finding open. A record under the empty-tree fingerprint reviews nothing and is never current.
- **`test_command` on Windows.** `shell: true` is cmd.exe, which does not read single quotes. `verify.js` runs a command that is exactly `bash -c '<script>'` or `sh -c "<script>"` through that shell; `test_shell: bash` in the plan runs every command through bash (`shellFor`).

## Common operations

- **The full run: related tests while working, the full suite at commit.** `verify.js` picks related or full (`hooks/lib/selection.js`, pure) and records a full run, passing or failing, in `.ultimate-workflow/verify.json` with the fingerprint of the uncommitted changes. `dispatch.verifyKind` decides what a shell command was: full only for `verify.js --full` or `test_command` as the whole last simple command. A full `test_command` typed directly is recorded by `gate.js` on PostToolUse. `requirements.txt` ends in a documentation extension: the config check runs before the docs filter.
- **A suite that was already red needs an accepted baseline.** `verify.js --baseline` runs the full suite once before any test or code is written and records the failing tests in `.ultimate-workflow/baseline.json`; `--accept-baseline` (only after the user said yes) marks them accepted and lists them in the plan under "Known failures". A later full run passes when every failing test is on that list (`judge`); it expires when the work is committed (`head`). It never passes a failed run whose failing tests cannot be recognised in the output. Accepting is a rule in the command text, not something the code can check; a wrong accept is made visible instead (the accept time in every record that relied on it).
- **Merges.** `experts.mergeInfo` builds a temporary commit with both parents and takes `git show --cc` of it: the merge's combined diff. The full-run check uses `testFingerprint` (`merge:<tree>`), because every clean merge has the same empty combined diff.
- **`volatile_paths`, `phase: done` and the pointer.** `experts.workingChanges(cwd, planFile)` reads `volatile_paths` from the plan it is given (else from the chosen plan) and adds `:(exclude,glob)` pathspecs to every git call. `state.activePlanFiles` drops plans with `phase: done`; `state.chosenPlan` is the one rule for which plan is meant.
- **Check the hook is live:** `node hooks/status.js`, as its own shell command, and read "Last commit check".
- **Qualify a new host:** register `hooks/dev/record.js`, run a real session that reads, writes, and fails a command, then write the adapter against the captured fixtures. Use `hooks/dev/deny-probe.js` to check whether a pre-tool deny is honoured before claiming a preventive check.

## Gotchas (topic-specific)

- **Never score a verification run from the event name alone.** No host puts an exit code in the post-tool payload, and the distinct tool-failure event is not dependable: `fixtures/claude-code/PostToolUse.18.json` is a non-zero-exit command that Claude Code recorded as a plain `PostToolUse`. `dispatch.js` reads every signal and lets any one that means failure mean failure: the failure event, `opts.failed`, and the `ok` that `normalize()` derives from `tool_response.success`. Gemini supplies no failure signal.
- `hookSpecificOutput.hookEventName` must name the event that actually fired. The host validates it and discards the whole result on a mismatch.
- **A restart is needed after `hooks.json` changes.** A host reads it only at start; 5.0.0 dropped the edit matcher and keeps the Bash one. `gate.js` still answers every event the 4.8.0 registration sent, with no block, for a host that was not restarted.
