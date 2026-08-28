---
phase: implement
plan_confirmed: true
tests_confirmed: true
test_command: node --test "hooks/**/*.test.js"
verify_rounds: 0
last_verify: green
dirty: false
escalated: false
gate_violation: 
---

# PLAN: gate-usability

> Dogfood cycle, running **under the gates**, to answer open question O3 in
> [PRD-graph-orchestration.md](PRD-graph-orchestration.md).
>
> **Revised twice.** See *Blockers hit* and *Decisions*.

## Feature description

Three changes, one goal: **make it impossible to believe the gates are enforcing when they are not.**

1. **Heartbeat.** Every gate invocation records that it ran, with what it decided. Proof of liveness, not inference.
2. **`hooks/status.js`** — reads the heartbeat and the state, and answers "are the gates live, and what blocks me next?"
3. **Clear `gate_violation` when it stops being true**, so a resolved violation stops appearing in later stop messages.
4. **Document the restart requirement** in `README.md` and `CLAUDE.md ## Gotchas`.

## Goal / success criteria

1. Every `gate.js` invocation appends a heartbeat entry, at every stage including `none`.
2. `node hooks/status.js` reports when the gates last ran, how many times, and the recent decisions.
3. It distinguishes **never ran** (likely not loaded — restart) from **ran recently** (live) from **disabled** (`ULTIMATE_WORKFLOW_GATES=off`).
4. It prints stage, state fields, and the next blocking gate.
5. It never writes anything, and exits 0 even on a malformed plan or heartbeat file.
6. A green verification clears `gate_violation`; a later legitimate edit is never accused of an old one.
7. A newly-allowed pre-edit clears a violation that was only about the plan being unconfirmed.
8. The heartbeat is bounded in size and never grows without limit.
9. The restart requirement is documented where someone will hit it.
10. All 104 existing tests still pass.

## Files explored

| File | Why it matters |
|---|---|
| `hooks/gate.js` | The single entry point. The heartbeat write belongs here, in the same place the state patch is applied, so every gate gets it for free. |
| `hooks/lib/dispatch.js` | Sets `gate_violation` at line 44, reads it into the stop message at line 88. Both halves of change 3. |
| `hooks/lib/gates.js` | `roundCap`'s green branch clears `dirty`, `verify_rounds`, `escalated` — and should clear `gate_violation` too. |
| `hooks/lib/state.js` | `readState` / `resolveStage` give `status.js` its state half. No new state logic. |
| `hooks/dev/record.js` | Precedent for a bounded, fail-silent, standalone diagnostic writer. |
| `.gitignore` | The heartbeat is per-machine runtime output and must be ignored, like `fixtures/`. |

## Existing-design review

- **Gates return patches; the entry point does I/O.** The heartbeat is I/O, so it lives in `gate.js`, not in a predicate.
- **Fail open, always.** A heartbeat write failure must never affect a decision. It goes in its own `try`/`catch`, after the decision is made.
- **Pure predicates, testable separately.** Heartbeat formatting and trimming go in a small module so they can be unit-tested without spawning processes.
- **Zero dependencies, CommonJS, `node:test`, no `package.json`.**
- **`status.js` holds no gate logic** — it reads and renders.

## Decisions

**Heartbeat location: `.ultimate-workflow/heartbeat.json` in the repo root, gitignored.**

Alternatives weighed:

- *In the plan file's front matter.* Rejected: churns a file people commit, on every tool call, and gives nothing at stage `none` — which is exactly when "is this even running?" matters most.
- *In the user's home config dir, keyed by project path.* Rejected for now: no repo clutter, but undiscoverable, and needs a path-hashing scheme for something that should be trivial.
- *Repo-local hidden directory.* **Picked.** One hidden dir, gitignored, sitting next to the thing it describes. The "inert in unmanaged repos" promise is about not blocking work, not about zero filesystem presence — and a heartbeat is precisely what proves inert-but-alive.

**Shape: one JSON file, rewritten each time.** Holds `last_seen`, `count`, and the most recent 20 decisions. Bounded by construction, one write per event, trivially readable. Concurrent writes can lose an entry — Codex launches matching hooks concurrently — which is acceptable for diagnostics and is written down rather than pretended away.

**What each entry records:** timestamp, canonical event, vendor, resolved stage, and the decision (`allow` / `deny` / `stopBlock` / `context`). Enough to answer "did the gate see my edit, and what did it do?"

## Deviation justification

*None — reuses existing patterns.*

One scope note: four changes in one plan. Separate features by the letter of the workflow, bundled because they answer the same question and total perhaps 120 lines. Splitting would quadruple the ceremony.

## Open questions

- Ship `status.js` in the plugin, or keep it a dev tool like `record.js`? Leaning **shipped** — "is this working?" is a user question.
- `--json` output for scripting? Leaning **no**, speculative until asked.

---

## Tests

### What to test

**Heartbeat (`hooks/lib/heartbeat.js`)**

- Records an entry with timestamp, event, vendor, stage, decision.
- Caps retained entries at 20; the 21st evicts the oldest.
- `count` keeps incrementing past the cap — it is a total, not a length.
- A corrupt or truncated heartbeat file is replaced rather than throwing.
- An unwritable directory fails silently and returns without error.

**`gate.js` integration**

- A heartbeat entry is written at stage `none`, where no gate acts.
- A heartbeat entry is written for a denied edit, recording `deny`.
- A heartbeat write failure does not change the gate's exit code or stdout.

**`status.js`**

- No heartbeat file: reports gates have never run, and names the restart as the likely cause.
- Recent heartbeat: reports live, with last-seen and count.
- `ULTIMATE_WORKFLOW_GATES=off`: reports disabled, and does not claim to be enforcing.
- Stage `none`, `bootstrap`, `feature`: correct stage, state fields, next blocking gate.
- Malformed plan file: exits 0, readable message, no stack trace.
- Writes nothing: plan file and heartbeat mtime and contents unchanged after running.

**`gate_violation`**

- Green verify clears it; red verify does not.
- A newly-allowed pre-edit clears it; a denied pre-edit still records one.
- The existing test asserting it appears in the stop message still passes.

### How to test

- `node:test`, colocated. New: `hooks/lib/heartbeat.test.js`, `hooks/status.test.js`. Extended: `hooks/lib/dispatch.test.js`.
- Process-level cases driven by `execFileSync` against temp directories, matching the existing `gate.js` end-to-end tests.
- Timestamps injected rather than read from the clock, so assertions are deterministic.

### Done definition

- `node --test "hooks/**/*.test.js"` green — new cases plus all 104 existing.
- No new files outside `hooks/`, except the `.gitignore` entry.
- README and `## Gotchas` updated in the same commit as the code.

---

## Implementation notes (filled in as you go)

**2026-08-25 — complete. 104 to 136 tests, all green.**

- `hooks/lib/heartbeat.js` — record, read, and `liveness()`, which is the piece that matters: it separates *never ran*, *stale*, *live*, and *disabled*, four conditions that previously all looked like silence. Capped at 20 recent entries; `count` is an unbounded total.
- `hooks/status.js` — reads heartbeat plus state and reports both. Asks the real gate predicates what would block rather than reimplementing their logic, so it can never drift from actual behaviour.
- `hooks/gate.js` — records a heartbeat after every decision, in its own try/catch, after the state patch.
- `hooks/lib/gates.js` — green verify now clears `gate_violation`.
- `hooks/lib/dispatch.js` — a newly-allowed pre-edit clears `gate_violation` immediately, rather than waiting for the next green run.
- `.gitignore`, `README.md`, `CLAUDE.md ## Gotchas` updated.

Both open questions resolved by building it: `status.js` ships (it answers a user question, not a maintainer one), and `--json` was not added (still speculative).

## Blockers hit

**2026-08-25 — hook registration does not take effect until the host restarts.**

Registered the gates in `.claude/settings.local.json`, wrote this plan with `plan_confirmed: false`, then deliberately attempted a source edit. **The edit went through**, and `dirty` stayed `false`, so `PostToolUse` had not fired either. The hooks were not running at all.

The gate code was fine: fed the same payload directly it denied correctly with exit 2, including from a foreign working directory. After restarting Claude Code the identical edit was blocked and the `UserPromptSubmit` pointer began appearing.

- **Why it matters:** a hook that is not loaded and a hook that crashes are indistinguishable from outside. Nothing blocks, nothing is logged, work proceeds. Third independent route to silent non-enforcement, after Cursor's BOM defect and Cursor's ignored write-deny.
- **Options:** (a) document it; (b) reframe `status.js` around liveness; (c) heartbeat written by every gate.
- **Picked:** initially (b) with (a) folded in. The user then chose **(c) as well** — see *Decisions*. Inference was what failed here, so the fix is evidence.
- **Artifacts updated:** feature description, goals, files explored, decisions, and tests all revised for the heartbeat.
- **Durable?** Yes. `## Gotchas` and README at step 6.

## Dogfood observations (O3)

- **The block message reads well.** Names the gate, the file, and the remedy. No hunting.
- **The phase pointer is unobtrusive.** One line per prompt stating the next required action. The piece most likely to feel like noise, and it does not.
- **Docs stayed writable while source was blocked**, which is what let this plan be revised mid-block, twice. The "documentation is always writable" rule earns its place.
- **The friction that mattered was not the gates.** It was the twenty minutes where they silently did nothing. Absent enforcement is a far worse experience than strict enforcement.
**Stop-gate rhythm — the question this cycle existed to answer.**

It never once got in the way. The sequence in practice: edit source, `dirty` flips true, run the test command, the verify gate flips it back to green, turn ends clean. Running the tests is something you do anyway before finishing, so the gate mostly agreed with what I was already going to do.

The one time it *would* have blocked me was a turn where I had edited source and not yet run tests — which is precisely the case it exists to catch. That is a guardrail, not nagging.

**Revised judgement on O3:** the Stop gate is not the risk. Silent non-enforcement is. I spent twenty minutes this session editing source under gates that were registered, correct, and not loaded, with no indication whatsoever. The gate being strict was never uncomfortable; the gate being absent was invisible, and that is far worse.

**One small friction worth recording:** running `status.js` in the same shell command as the test suite shows stale state, because the verify gate's `PostToolUse` fires only after the whole command completes. Not a bug, but a surprising read the first time. Run status as its own command.
