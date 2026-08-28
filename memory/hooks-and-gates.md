# Hooks and gates

> How enforcement works here, why "installed" is never evidence of "enforcing",
> and what was measured on each host.
> Last updated 2026-08-28.

## Mental model: fail-open means nothing looks like everything

Gates enforce by **interception**. `hooks/gate.js` watches a free-running agent and denies illegal transitions; the predicates live in `hooks/lib/gates.js` and the wire translation in `hooks/lib/adapters.js`. Every gate **fails open** — an internal error blocks nothing. That is the right safety choice, because a crashed hook must never wedge a session. It has one cost, and that cost shaped the entire effort:

**A gate that is not enforcing is indistinguishable from a gate that is enforcing and correctly allowing.** Both are silence. So is a hook the host never loaded, a hook that threw while parsing its payload, and a predicate accidentally switched off by a path bug. Work simply proceeds.

Four routes to that state were measured, not reasoned:

1. **Cursor prefixes hook payloads with a UTF-8 BOM.** `JSON.parse` throws, the catch swallows it, exit 0. A hook that parses before deciding is installed, silent, and enforcing nothing.
2. **Cursor honours a `preToolUse` deny for reads and ignores it for writes** (3.17.19). The file is created and the next event reports `success: true`, so the model is never told.
3. **Hook config is not reliably loaded immediately.** Registered, correct, and inert — twenty minutes of editing source under gates that were doing nothing.
4. **Absolute payload paths defeated test-file detection.** Any project under a directory named `test` classified every file as test code, silently disabling G2.

Seven of the nine defects found while building the gates were in the vendor wire surface, not the workflow logic, and every one failed open.

## Key decisions

- **Liveness is evidenced, never inferred.** Every gate invocation writes `.ultimate-workflow/heartbeat.json` — `last_seen`, a running count, and the last 20 decisions — in its own try/catch *after* the decision, so diagnostics can never change an outcome. `liveness()` separates **never** / **stale** / **live** / **disabled**, four conditions that previously all looked like silence. Rejected alternatives: state in the plan front matter (churns a committed file on every tool call, and gives nothing at stage `none`, which is exactly when "is this running?" matters most) and a home config dir keyed by project path (undiscoverable, needs path hashing).
- **`hooks/status.js` asks the real gate predicates what would block**, rather than reimplementing them, so the report cannot drift from actual behaviour. It never writes.
- **A host gets gates only after its payloads have been recorded.** Every host defect so far was invisible in the vendor documentation and failed open, so an adapter written from docs looks tested and enforces nothing. Gates are therefore Claude Code only; Cursor runs the prose workflow; the Codex and Gemini adapters exist with tests but are registered nowhere.
- **The Cursor adapter stays in `adapters.js`, unregistered, on purpose.** It is the record of what was measured on that host. Without this note it reads as an oversight and someone wires it back up.
- **An unsatisfiable gate fails open.** The shipped plan template defaults `test_command` to empty, which meant nothing could ever clear `dirty`, so G3 blocked every turn end until the host's consecutive-block override fired. A gate that cannot be satisfied is worse than no gate.
- **Guessing intent from a command string does not work.** A `looksLikeShellWrite` heuristic scored three false positives (a heredoc, an arrow function, `2>/dev/null`) and zero true positives before being deleted. Shell writes are addressed structurally by tool scoping instead.

## Common operations

- **Check the gates are live:** `node hooks/status.js`, as its own shell command. Run in the same command as the test suite it shows stale state, because the verify gate's `PostToolUse` fires only after the whole command completes.
- **Qualify a new host:** register `hooks/dev/record.js`, run a real session that reads, writes, and fails a command, then write the adapter against the captured fixtures. Use `hooks/dev/deny-probe.js` to check whether a pre-tool deny is actually honoured for writes before claiming preventive gates.

## Gotchas (topic-specific)

- **Never score a verification run from the event name alone.** No host puts an exit code in the post-tool payload, and the distinct tool-failure event is not dependable: `fixtures/claude-code/PostToolUse.18.json` is a non-zero-exit command that Claude Code recorded as a plain `PostToolUse`, and no failure fixture exists among the recorded payloads. Trusting the name inverted G4 -- a red run was written as `last_verify: green`, which cleared `dirty` and reset the round counter, so failing the tests became the way to satisfy the gate that exists to make you pass them. `dispatch.js` now reads every signal and lets any one of them meaning failure mean failure: the failure event, `opts.failed`, and the `ok` that `normalize()` derives from `tool_response.success` (already being derived, and read by nothing). Gemini supplies no failure signal at all and still cannot detect a red verification. (Corrected 2026-08-28; the earlier entry here stated the false half as measured fact.)
- **A compensating control must not sit behind the control it compensates for.** On a host that cannot block a write, a denied pre-edit is downgraded to *allow, record the violation, correct it at stop*. That promise was empty: the recorded `gate_violation` was read only after `stopGate` returned a blocking verdict, and `stopGate` steps aside whenever no verification command is configured -- which the shipped plan template guarantees, since it ships `test_command: ""`. So on Cursor, the one host the whole compensation exists for, G1 and G2 were bypassed, the violation was written to the plan front matter, and nobody was ever told. The violation branch now fires ahead of `stopGate`'s verdict, because *revert that edit* is satisfiable with no verification command configured; `status.js` lists it too. Any future fallback for a host without a preventive deny has to be checked on a path that cannot itself be inert.
- **With more than one `PLAN-*.md` at a root, the gates read whichever was modified most recently.** `newestPlanFile` in `state.js` sorts by mtime and takes the first. An unrelated plan happening to be newest once locked a bug fix out of every source edit, with the block message quoting confirmation flags from a file the work had nothing to do with. There is still no key naming the active plan. Keep one plan per root, or run `node hooks/status.js`, which prints the file it actually read.
- `hookSpecificOutput.hookEventName` must name the event that actually fired. The host validates it and discards the whole result on a mismatch, which silently dropped the round-cap escalation for a while.
