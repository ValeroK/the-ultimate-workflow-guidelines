# AGENTS.md

This repo *is* the `ultimate-workflow` plugin: skills, phase commands, scoped agents, and opt-in gates.

The **shippable plugin** lives at `.cursor-plugin/ultimate-workflow/` (so Cursor marketplace sparse-checkout actually materializes it — see `memory/cursor-install.md` there). This file is the always-on root doc for working **in this git repo**. `CLAUDE.md` is a one-line stub that imports it; Cursor reads this file natively. It is an **index, deliberately thin** — always-loaded text is paid for on every turn whether it is relevant or not, so only what has **no retrieval cue** belongs here. See `.cursor-plugin/ultimate-workflow/memory/context-boundary.md` before adding to it.

## Principles

- **Think before coding.** State assumptions. Ask when unclear. Name tradeoffs rather than picking silently. Truth over agreement — do not reflexively affirm a framing you can see a gap in.
- **Simplicity first.** The minimum that solves the problem. Nothing speculative.
- **Surgical changes.** Every changed line traces directly to the request.
- **Goal-driven execution.** Define what "done" looks like in verifiable terms, then loop until it is. **Never fake success** — no silent fallback, swallowed error, or skipped assertion to make something look finished. If it cannot be done, stop and say so through the host's ask-user tool.

Full text, with the reasoning behind each: `.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/SKILL.md`.

## Workflow

Understand → **plan** (confirm) → **test plan** (confirm) → **implement** → blocker protocol → **harvest** → **hand off**.

Phase commands: `/ultimate-workflow:plan`, `:tests`, `:build`, `:review`, `:harvest`. Each runs in a fresh context and stops; only `build` writes. `/handoff` writes a session handoff document and is user-triggered only.

Both confirmation points are real stops. The plan lives on disk as `PLAN-<feature>.md`, which survives a trimmed conversation in a way chat history does not. Favour concision over polish in it.

## When to skip

Typos and formatting. Single-line fixes with an obvious cause. Pure-doc edits. Trivial renames with no behavioural change. When in doubt, err toward the workflow.

Equally, do not bog down on a trivial reversible decision: decide, flag it, move on.

## Where things live

| Read when | File |
|---|---|
| Deciding what belongs in always-on context; editing this file, `memory.md`, `SKILL.md`, or `rules/*.mdc` | `.cursor-plugin/ultimate-workflow/memory/context-boundary.md` |
| Touching `hooks/**`, adapters, the heartbeat, `status.js`; a gate is not firing; adding a host | `.cursor-plugin/ultimate-workflow/memory/hooks-and-gates.md` |
| Touching `workflows/*.js` or `agents/uw-*.md`; adding a phase; `parallel()` returned nothing | `.cursor-plugin/ultimate-workflow/memory/workflows-authoring.md` |
| Editing `SKILL.md`, `rules/*.mdc`, `references/`, or `agents/` | `.cursor-plugin/ultimate-workflow/memory/mirrors.md` |
| Marketplace sources, `/add-plugin`, release ZIP, empty Cursor install | `.cursor-plugin/ultimate-workflow/memory/cursor-install.md` |
| A feature has landed and its lessons need a home | `.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/references/memory-protocol.md` |
| Designing agent orchestration; arguing model versus harness | `research/new-sdlc-with-vibe-coding.md` |
| What the project is and why the architecture is what it is | `PRD-graph-orchestration.md` |

Plugin `memory.md` is the full index inside the payload. Read it at the start of any non-trivial task and open whatever its cues match.

## Hard constraints

- **No `package.json`, no build step, no dependency.** The one-command, no-install path across five host apps and three operating systems is the criterion that decided this architecture — it is why the Python plus LangGraph plus MCP design in `PRD-graph-orchestration.md` section 7 was rejected. Tests use `node:test` and `node:assert` from the standard library for exactly this reason.
- **No emojis in code.** They break Windows terminals and corrupt pipelines. Prose and docs are fine.
- **Verify with `node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js`.** Quoted, so Node expands the globs rather than the shell. `mirrors.test.js` sits at the repo root and neither glob reaches it, so the shorter form skips the mirror-drift check entirely and goes green locally while CI goes red.

## Gotchas

> Defensive one-liners only, and only those with no topical cue. Subsystem-specific warnings live in the `memory/` topicals above. Threshold and format: `references/memory-protocol.md`.

- **Don't do backslash string surgery through `node -e` or a heredoc.** The pipeline collapses a doubled backslash before Node sees it, so a replacement meant to emit `C:\\Users` emits `C:\Users` — invalid inside a JSON string. This corrupted a test file, a BOM-stripping regex, a directory of recorded fixtures, and an eval assertion, each time silently until something downstream failed to parse. Use the Write or Edit tools, or write the script to a file first. (Discovered 2026-08-26, hit 5x)
- **Don't assert on `stderr` from `execFileSync`.** It returns stdout alone and forwards the child's stderr to the parent's, so `result.stderr` is `undefined` and every stderr assertion passes vacuously against a green suite. This voided all of them in `hooks/status.test.js`, including the one claiming to prove no stack trace escapes. Use `spawnSync`, which captures both. (Discovered 2026-08-28)
- **Don't run `node --test <dir>`.** Node resolves a directory argument as a module path and dies with `MODULE_NOT_FOUND`, not as a search root. Use the quoted glob above. (Discovered 2026-08-25)
- **Don't move the plugin payload back to the repo root.** Cursor marketplace sparse-checkout only keeps `/.cursor-plugin/` and `/.claude-plugin/`; a root-level `rules/`/`agents/` install looks present and is empty. (Discovered 2026-08-29)

---

*These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions arriving before implementation rather than after a mistake.*
