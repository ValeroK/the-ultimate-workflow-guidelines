# PLAN: hook-gates (v2.4.0)

> Implements section 5, 5.1, and 9.1 of [PRD-graph-orchestration.md](PRD-graph-orchestration.md).
> Scope is the **gates release only**. The eight workflow scripts are v3.0.0 and out of scope here.

## Feature description

Five stage-aware lifecycle hooks that turn the plugin's advisory workflow into an enforced one: no source edit before a confirmed plan, no implementation before confirmed tests, no turn completion while code is unverified, a hard round cap with escalation, and a per-prompt phase pointer. Built on one shared Node core with four thin vendor adapters (Claude Code, Codex CLI, Gemini CLI, Cursor), plus the plugin rename to `ultimate-workflow`.

## Goal / success criteria

Done means all eight acceptance scenarios in *Tests / Tier 3* pass by hand, tiers 1 and 2 pass in CI, and the plugin still installs in one command with zero runtime dependencies.

1. Gates block the illegal transitions on Claude Code, and the block message names the missing gate.
2. Gates resolve the correct stage (`none` / `bootstrap` / `feature`) from the filesystem alone.
3. A hook that throws internally fails **open** — exits 0, blocks nothing.
4. `ULTIMATE_WORKFLOW_GATES=off` disables all five gates.
5. Codex and Gemini adapters pass the same contract tests against recorded payloads.
6. Cursor adapter passes whatever subset O2 proves possible.
7. The existing no-emoji hooks keep working unchanged.

## Files explored

| File | Why it matters |
|---|---|
| `hooks/hooks.json` | Existing Claude Code hooks manifest. Gains five entries. Establishes the `${CLAUDE_PLUGIN_ROOT}` command shape to copy. |
| `hooks/no-emoji-write.js` | The proven `PreToolUse` pattern in this repo: stdin JSON, `permissionDecision: "deny"`, `ALLOW_EMOJIS` escape hatch. The gates mirror its structure. |
| `hooks/no-emoji-prompt.js` | The proven `UserPromptSubmit` pattern. The phase-pointer gate extends the same event. |
| `.claude-plugin/plugin.json` | `name` field changes to `ultimate-workflow`; `version` to 2.4.0. |
| `.claude-plugin/marketplace.json` | Same rename in two places, plus `version`. |
| `.cursor-plugin/plugin.json` | Same rename, plus `version`. Gains a `hooks` pointer. |
| `.github/workflows/validate.yml` | Already asserts JSON syntax and version consistency across four slots. Gains `node --test`. |
| `skills/the-ultimate-workflow-guidelines/references/plan-template.md` | Gains the stage-2 state front-matter block. |
| `skills/project-bootstrap-guidelines/references/prd-template.md` | Gains the stage-1 state front-matter block and `scale`. |
| `README.md` | Gates section, escape hatch, permission-surprise note, rename migration. |
| `CHANGELOG.md` | Keep-a-Changelog format already established. Breaking-change entry for the rename. |

## Existing-design review

- **Hook style** — `hooks/no-emoji-*.js` are single-file, zero-dependency Node scripts reading stdin and writing JSON to stdout. The gates reuse this exactly. No build step, no bundler, no `package.json` runtime section.
- **Escape hatch convention** — `ALLOW_EMOJIS=1` bypasses the existing hooks. `ULTIMATE_WORKFLOW_GATES=off` follows the same shape and is checked in the same place.
- **Fail-open posture** — the existing hooks let the tool call through on any internal error. Non-negotiable and carried forward, now with a test.
- **Mirror discipline** — the README documents that skill bodies, `CLAUDE.md`, and `.mdc` rules are kept in sync by hand, in the same commit. Any user-facing text this feature adds lands in all mirrors together.
- **Version consistency** — `validate.yml` asserts one version across four slots. The rename touches three `name` fields; the assertion should be extended to cover name consistency too, not just version.
- **Templates over invention** — the repo keeps canonical skeletons under `references/`. The state front-matter block is added to the two existing templates rather than documented in prose somewhere new.
- **No emojis** — enforced by the repo's own hooks on every file this plan writes.

## Deviation justification

**One deviation, small: a `hooks/lib/` directory.**

- **Current pattern:** each hook is one self-contained file under `hooks/`, no shared code.
- **Proposed alternative:** five gates share `hooks/lib/state.js` (front-matter parsing, stage resolution, gate predicates) and four adapters under `hooks/lib/adapters/`.
- **Pros / cons:**
  - **Current (duplicate per hook):** stays maximally simple; each file readable in isolation. But the stage-resolution and front-matter logic would be copied five times across four vendors — twenty copies of the same parser. Guaranteed drift.
  - **Proposed (shared core):** one place for the logic that must be identical everywhere, and it is the only thing tier-1 tests need to cover. Costs one directory of indirection and means a hook file is no longer readable standalone.
- **Recommendation:** take the deviation. Twenty copies of a parser is not "simplicity first," and the vendor-adapter split in PRD 11.5 is the entire reason the gates port to four surfaces cheaply.

**A second: a test runner, and whether the repo grows an npm surface.**

First, a correction to the framing. "Zero dependencies" is **not a stated promise** anywhere in this repo — no README line, no manifest field. It is an accurate description of the current state, arrived at rather than declared:

- No `package.json` exists.
- `hooks/no-emoji-prompt.js` and `hooks/no-emoji-write.js` contain **zero `require()` and zero `import`** statements — 85 lines total.
- `release-skills.yml` runs `zip`. There is no build step.
- `validate.yml` uses `python -m json.tool` and `jq`, both provided by the GitHub runner, not by this project.

It is still worth defending, because it is the criterion that decided the architecture: it is the main reason the v0 Python plus LangGraph plus SQLite plus MCP design was rejected (PRD section 7). The install path is the product — one command, across Windows, macOS, and Linux, across Claude Code, Cursor, Codex, Gemini, and claude.ai upload. Every dependency multiplies the support surface by platforms times host apps, and Windows is where such install stories usually die.

- **Current pattern:** no `package.json`, no npm surface of any kind.
- **Proposed alternative:** add `package.json` with `private: true` and a `scripts.test` entry, for `npm test`.
- **Pros / cons:**
  - **Add it:** familiar `npm test` entry point. But a root `package.json` sets module resolution for every `.js` beneath it — `"type": "module"` makes them ESM, absent or `"commonjs"` keeps them CJS. The existing hooks import nothing so either works today, but `hooks/lib/` would inherit the choice. It also ships inside the plugin ZIP and makes the repo look installable via npm, inviting an expectation that can never be met.
  - **Skip it:** `node --test "hooks/**/*.test.js"` discovers `*.test.js` with no configuration. One line in `validate.yml`, plus `actions/setup-node` pinned to 20 or 22 for a predictable runner version. The repo keeps having no opinion about module semantics.
- **Recommendation:** **skip it.** The convenience of `npm test` over `node --test "hooks/**/*.test.js"` does not justify introducing npm semantics into a repo that currently has none. `node:test` and `node:assert` are standard library from Node 18, so the tests themselves add nothing either way.

## Open questions

- **O2 (from the PRD)** — whether Cursor's `preToolUse` can deny an edit tool. Resolved by the tier-2 recording experiment below, which is scheduled *before* the Cursor adapter is written. If it cannot deny, gates B-G1/G1 and B-G2/G2 degrade to detect-and-revert on Cursor only.
- **Codex hook races** — Codex launches multiple matching hooks for one event concurrently, and we will have two `PreToolUse` hooks (no-emoji plus gates). Each must be independently correct. Believed fine since both only ever deny, never mutate shared state — to be confirmed against a recorded payload.
- **Module format for `hooks/lib/`** — with no `package.json` (the recommendation), `.js` files are CommonJS. Use `require`/`module.exports` throughout, or name the shared files `.mjs` if ESM is preferred. Pick one before writing the core; mixing them in one directory is the kind of thing that wastes an afternoon.
- **Should the "no dependencies" property be written down?** It is currently emergent, not documented, which is how it nearly got traded away in this plan. A one-line constraint in `README.md` and a `## Gotchas` entry would make it a decision future sessions have to argue with rather than one they can drift past.
- **Rename blast radius** — does renaming `name` in `marketplace.json` require existing users to `marketplace remove` before re-adding, or does re-adding suffice? Affects the migration note only, not the code. Verify before writing the CHANGELOG.

---

## Tests

> Written **before** implementation, per the user's instruction to test first and per workflow step 3.

### Build order

Deliberately test-first, and the fixtures come before the tests:

1. **Record fixtures** (tier 2 prerequisite) — ship a throwaway `hooks/dev/record.js` that copies stdin to `fixtures/<vendor>/<event>.json` and exits 0. Register it for every relevant event in all four CLIs, run one ordinary session in each. This also resolves O2.
2. **Write tier-1 tests** against the not-yet-existing core API. They fail.
3. **Write tier-2 contract tests** against the recorded fixtures. They fail.
4. **Implement `hooks/lib/state.js` and the gates** until tier 1 is green.
5. **Implement the four adapters** until tier 2 is green.
6. **Run tier 3 by hand**, then dogfood.

### Tier 1 — unit tests on the core

- **Framework:** `node:test` + `node:assert`, standard library, no dependency.
- **Location:** `hooks/lib/*.test.js`, colocated with the source.
- **Fixtures:** temp directories built per test with `fs.mkdtempSync`, holding a synthetic `PRD.md` and/or `PLAN-x.md`.

Scenarios, table-driven, one row per gate-table row in PRD sections 5 and 5.1:

| Area | Cases |
|---|---|
| Front-matter parse | Valid block; missing block; malformed YAML; unknown keys; CRLF line endings (Windows) |
| Stage resolution | No files → `none`; `PRD.md` only → `bootstrap`; all six handoff conditions met → `feature`; each condition individually unmet → still `bootstrap` |
| G1 plan gate | `plan_confirmed: false` + source path → deny naming the gate; + `PLAN-*.md` path → allow; + docs path → allow |
| G2 tests gate | `tests_confirmed: false` + source → deny; + test-file path → allow |
| G3 verify gate | Source changed since `last_verify: green` → block; `last_verify: green` and no change → allow; `last_verify: unrun` → block |
| G4 round cap | Rounds 1 and 2 increment; round 3 sets `escalated: true`; round 4 does not re-escalate |
| G5 phase pointer | Emits stage and next action; emits workflow availability from settings and env |
| B-G1 / B-G2 | Same shape against `prd_confirmed` / `design_confirmed` in `PRD.md` |
| **Fail-open** | Inject a throw into the core → hook exits 0, no deny emitted |
| **Escape hatch** | `ULTIMATE_WORKFLOW_GATES=off` → every gate returns allow |
| **Stage `none`** | No plan and no PRD → every gate returns allow |

Test-file path classification is its own risk: getting "is this a test file" wrong makes G2 either useless or maddening. Cases must cover `*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `tests/`, and a source file with "test" in its name that is *not* a test.

### Tier 2 — contract tests against recorded payloads

- **Location:** `hooks/lib/adapters/*.test.js`.
- **Method:** spawn the hook as a subprocess, write the recorded fixture to stdin, assert exit code and parsed stdout.
- **Fixtures:** `fixtures/<vendor>/<event>.json`, recorded from real sessions, committed to the repo.

| Vendor | Assert |
|---|---|
| Claude Code | Deny emits `hookSpecificOutput.permissionDecision: "deny"` with a reason; `Stop` block emits `decision: "block"` |
| Codex CLI | Same field names; `permissionDecision` on `PreToolUse`; exit 2 path also verified |
| Gemini CLI | `decision: "deny"` with required `reason`; `hookSpecificOutput.additionalContext` for the pointer; **nothing on stdout but the final JSON** (Gemini's suppress-is-mandatory rule) |
| Cursor | `permission: "deny"`; whichever gates O2 proves possible; `stop` uses `followup_message` rather than blocking |

One shared assertion across all four: an allow decision must produce byte-identical *semantics* even where field names differ. The adapter table is the unit under test.

### Tier 3 — acceptance scenarios, run by hand

The eight scenarios in PRD section 9.1 (S1 through S8), kept as a checklist at `docs/acceptance-gates.md` and run before tagging.

### Done definition

- `node --test` green locally and in CI.
- All eight tier-3 scenarios pass on Claude Code.
- Tier-2 contract tests green for all four vendors, with any Cursor gaps documented rather than silently absent.
- Existing no-emoji hooks still fire (regression check — they share the `PreToolUse` event).
- `validate.yml` passes, including the extended name-consistency assertion.
- README, CHANGELOG, and the two templates updated in the same commit as the code.

---

## Implementation notes (filled in as you go)

**2026-08-25 — tier 1 complete, 52 tests green.**

Landed:

- `hooks/dev/record.js` — payload recorder for the tier-2 fixtures. Numbered suffixes so repeat observations of an event are all kept; silent and always exit 0 so it can never affect a session (Gemini forbids stray stdout).
- `hooks/lib/state.js` — front-matter parse/serialize/patch, `resolveStage`, `handoffComplete`, `readState`, `gatesDisabled`. Node builtins only.
- `hooks/lib/gates.js` — `isDocPath`, `isTestPath`, `preEditGate` (G1/G2/B-G1/B-G2), `stopGate` (G3), `roundCap` (G4), `phasePointer` (G5). Pure functions; no filesystem, no environment, no stdout.
- `.github/workflows/validate.yml` — new `test` job on Node 22.
- `CLAUDE.md ## Gotchas` — two entries (see below).

Decisions made during implementation:

- **CommonJS**, matching the existing hooks, since no `package.json` means `.js` is CJS.
- **`dirty` flag** rather than mtime comparison for G3. Set by a `PostToolUse` gate when an edit lands, cleared by `roundCap` on green. Simpler than timestamp arithmetic and works identically on all four vendors, all of which have a post-tool event.
- **`test_command` lives in the plan front matter**, so G3's block message can name the actual command. Not in the PRD's original state block — added.
- **Documentation is always writable at every stage.** Not a loophole: the plan file, the PRD, and the living docs are exactly what a blocked party is being told to go and write. Convenient side effect for this repo, whose product largely *is* markdown.
- **`roundCap` returns a patch instead of writing.** Keeps I/O with the caller and the predicate testable.
- **`escalated` short-circuits `stopGate`.** Once escalated the human is being asked to decide, not to run tests again.

## Blockers hit

**2026-08-25 — `node --test hooks/` does not work.** Node resolves a directory argument as a module path (`MODULE_NOT_FOUND`), not as a search root. This was written into the PRD and the plan as the CI command before being tried.

- **Options considered:** quoted glob (`node --test "hooks/**/*.test.js"`), bare `node --test` from the repo root, or explicit file list.
- **Picked:** the quoted glob. Node expands it rather than the shell, so the command is identical on Windows and in CI, and it stays scoped to `hooks/` as the repo grows.
- **Artifacts updated:** PRD section 9.1, this plan's Tests section and the second deviation, `validate.yml`, and a `## Gotchas` entry in `CLAUDE.md`.
- **Durable?** Yes — non-obvious, cost real time, and would recur. Logged as a gotcha.

## Next

Tier 2 needs recorded payloads, which needs sessions in each CLI. Blocked on that; everything before it is done.
