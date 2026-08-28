# CLAUDE.md

This repo *is* the `ultimate-workflow` plugin: skills, phase workflows, scoped agents, and opt-in gates. This file is an index, deliberately thin — see `memory/context-boundary.md` before adding to it.

## Principles

- **Think before coding.** State assumptions. Ask when unclear. Name tradeoffs rather than picking silently.
- **Simplicity first.** The minimum that solves the problem. Nothing speculative.
- **Surgical changes.** Every changed line traces directly to the request.
- **Goal-driven execution.** Define what "done" looks like in verifiable terms, then loop until it is.

Full text: `skills/the-ultimate-workflow-guidelines/SKILL.md`.

## Workflow

Understand → **plan** (confirm) → **test plan** (confirm) → **implement** → blocker protocol → **harvest**.

Phase commands: `/ultimate-workflow:plan`, `:tests`, `:build`, `:review`, `:harvest`. Each runs in a fresh context and stops; only `build` writes.

## When to skip

Typos and formatting. Single-line fixes with an obvious cause. Pure-doc edits. Trivial renames with no behavioural change. When in doubt, err toward the workflow.

## Where things live

| Read when | File |
|---|---|
| Deciding what belongs in always-on context; editing this file, `memory.md`, `SKILL.md`, or `rules/*.mdc` | `memory/context-boundary.md` |
| Touching `hooks/**`, adapters, the heartbeat, `status.js`; a gate is not firing; adding a host | `memory/hooks-and-gates.md` |
| Touching `workflows/*.js` or `agents/uw-*.md`; adding a phase; `parallel()` returned nothing | `memory/workflows-authoring.md` |
| Editing `SKILL.md`, `rules/*.mdc`, `references/`, or `agents/` | `memory/mirrors.md` |
| A feature has landed and its lessons need a home | `references/memory-protocol.md` |
| Designing agent orchestration; arguing model versus harness | `research/new-sdlc-with-vibe-coding.md` |
| What the project is and why the architecture is what it is | `PRD-graph-orchestration.md` |

`memory.md` is the full index. Read it at the start of any non-trivial task and open whatever its cues match.

## Hard constraints

- **No `package.json`, no build step, no dependency.** The one-command, no-install path across five host apps and three operating systems is the criterion that decided this architecture — it is why the Python plus LangGraph plus MCP design in `PRD-graph-orchestration.md` section 7 was rejected. Tests use `node:test` and `node:assert` from the standard library for exactly this reason.
- **No emojis in code.** They break Windows terminals and corrupt pipelines. Prose and docs are fine.
- **Verify with `node --test "hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js`.** Quoted, so Node expands the globs rather than the shell. `mirrors.test.js` sits at the repo root and neither glob reaches it, so the shorter form skips the mirror-drift check entirely and goes green locally while CI goes red.

## Gotchas

> Defensive one-liners only, and only those with no topical cue. Subsystem-specific warnings live in the `memory/` topicals above. Threshold and format: `references/memory-protocol.md`.

- **Don't do backslash string surgery through `node -e` or a heredoc.** The pipeline collapses a doubled backslash before Node sees it, so a replacement meant to emit `C:\\Users` emits `C:\Users` — invalid inside a JSON string. This corrupted a test file, a BOM-stripping regex, a directory of recorded fixtures, and an eval assertion, each time silently until something downstream failed to parse. Use the Write or Edit tools, or write the script to a file first. (Discovered 2026-08-26, hit 5x)
- **Don't assert on `stderr` from `execFileSync`.** It returns stdout alone and forwards the child's stderr to the parent's, so `result.stderr` is `undefined` and every stderr assertion passes vacuously against a green suite. This voided all of them in `hooks/status.test.js`, including the one claiming to prove no stack trace escapes. Use `spawnSync`, which captures both. (Discovered 2026-08-28)
- **Don't run `node --test <dir>`.** Node resolves a directory argument as a module path and dies with `MODULE_NOT_FOUND`, not as a search root. Use the quoted glob above. (Discovered 2026-08-25)
