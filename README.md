# Karpathy-Inspired: The Ultimate Workflow Guidelines

> Check out my new project [Multica](https://github.com/multica-ai/multica) — an open-source platform for running and managing coding agents with reusable skills.
>
> Follow me on X: [https://x.com/jiayuan_jy](https://x.com/jiayuan_jy)

Two complementary skills plus a drop-in `CLAUDE.md` to improve Claude Code and Cursor behavior. The behavioral principles are derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls; the workflow and bootstrap procedures are layered on top.

## Why these rules

LLM coding assistants are fast but forgetful. They assume when they should ask, write 200 lines when 50 would do, touch unrelated code "while they're in there", and re-derive the same project quirks every session. These two skills are a working set of guardrails against those failure modes — derived from Andrej Karpathy's observations on LLM coding pitfalls, hardened through daily use.

From Andrej's post:

> "The models make wrong assumptions on your behalf and just run along with them without checking. They don't manage their confusion, don't seek clarifications, don't surface inconsistencies, don't present tradeoffs, don't push back when they should."
>
> "They really like to overcomplicate code and APIs, bloat abstractions, don't clean up dead code... implement a bloated construction over 1000 lines when 100 would do."
>
> "They still sometimes change/remove comments and code they don't sufficiently understand as side effects, even if orthogonal to the task."

### What's in the repo

| Skill | When to use | What it produces |
|---|---|---|
| **[`the-ultimate-workflow-guidelines`](skills/the-ultimate-workflow-guidelines/SKILL.md)** | Daily feature work inside an **existing** codebase. Any non-trivial change — new feature, non-trivial bug fix, refactor. | A `PLAN-<feature>.md` file on disk, then tests, then minimal implementation. Confirmation gates between each stage. Blockers surface options with tradeoffs instead of silent picks. |
| **[`project-bootstrap-guidelines`](skills/project-bootstrap-guidelines/SKILL.md)** | Starting a **new** project from a blank slate. | `PRD.md` (with Mermaid flow diagram), confirmed framework choices with alternatives documented, plus three living docs: `CLAUDE.md` (always-on guidance), `ROADMAP.md` (milestones), `progress.md` (living log). |

Each skill ships as:

- A `SKILL.md` (loaded by Claude Code).
- A `.mdc` rule under [`rules/`](rules/) (loaded by Cursor).
- Template skeletons under `skills/*/references/` so the model doesn't re-invent document shapes each session.

The two skills hand off cleanly: once bootstrap docs exist, the workflow skill reads them (especially `CLAUDE.md` and `PRD.md`) before planning any feature, and writes back to `progress.md` / `ROADMAP.md` / `## Gotchas` after landing one.

### Why adopt these on a *new* project

1. **A real PRD before code.** Forces the product questions (users, goals, non-goals, success metrics) to be named and confirmed, not assumed. The PRD becomes the single source of truth for *what* and *why*.
2. **Framework choices documented with alternatives.** Three months later when someone asks "why Postgres not DynamoDB?" the answer is in `PRD.md`, not lost in a Slack scroll.
3. **Three living docs from day one.** `CLAUDE.md` keeps the model aligned every turn; `ROADMAP.md` holds the milestone view; `progress.md` captures decisions as they happen. The model reads them without being told.
4. **Gotchas accumulate.** The project's `CLAUDE.md` has a `## Gotchas` section — a place to persist hard-won empirical lessons (path aliases, hidden test setup, surprising utility contracts) so the next session doesn't re-discover them.

### Why adopt these on an *existing* project

1. **Plans are written to disk, not to chat.** A `PLAN-<feature>.md` survives context compaction; a chat thread doesn't. When a session resumes, the plan is still there.
2. **Existing design is respected by default.** The workflow forces the model to enumerate the patterns, utilities, and conventions the feature touches, and to reuse them. Deviations from current design must be presented as pros/cons for the user to decide — no silent new-pattern introductions.
3. **Tests come before code.** "Fix the bug" becomes "write the test that reproduces it, then make it pass." Success criteria are verifiable from the start.
4. **Blockers don't silently escape.** When mid-implementation reality doesn't match the plan, the model stops, surfaces 2–3 options with tradeoffs, waits, then retro-updates the plan, tests, and already-written code before resuming.
5. **Surgical changes.** Every changed line must trace to the user's request. No "while I was there" refactors, no formatting drift, no speculative abstractions.
6. **Compounding memory.** Each repeating issue lands in `## Gotchas`, so the failure mode stops recurring.

### The behavioral layer under all of it

Before the workflow steps, both skills apply four principles:

- **Think Before Coding** — surface assumptions, ask when unclear, name tradeoffs.
- **Simplicity First** — minimum code that solves the problem; nothing speculative.
- **Surgical Changes** — touch only what the request requires.
- **Goal-Driven Execution** — define verifiable success criteria; loop until they pass.

The workflow is *how* to work; the principles are *how to think*. Both are always in context.

`project-bootstrap-guidelines` runs at project birth; once bootstrap docs exist, subsequent feature work uses `the-ultimate-workflow-guidelines`.

## Install

### Claude Code (plugin)

From within Claude Code, add the marketplace and install:

```
/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines
/plugin install the-ultimate-workflow-guidelines
```

Both skills become available across all your projects. If you forked this repo, replace `ValeroK` with your own GitHub handle.

### Cursor (plugin via Marketplace)

From within Cursor, install via the [Cursor Marketplace](https://cursor.com/marketplace):

```
/add-plugin the-ultimate-workflow-guidelines
```

Or install directly from GitHub:

```
/add-plugin ValeroK/the-ultimate-workflow-guidelines
```

Cursor auto-discovers the `skills/` and `rules/` directories — both skills and their `alwaysApply` rules activate immediately.

See **[CURSOR.md](CURSOR.md)** for details on the Cursor setup, including how to use individual `.mdc` rules outside the plugin system.

### Per-project CLAUDE.md (no plugin)

If you'd rather not install a plugin, drop just the principles + workflow into one project's `CLAUDE.md`:

New project:
```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/CLAUDE.md
```

Existing project (append):
```bash
echo "" >> CLAUDE.md
curl https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/CLAUDE.md >> CLAUDE.md
```

## Key Insight

From Andrej:

> "LLMs are exceptionally good at looping until they meet specific goals... Don't tell it what to do, give it success criteria and watch it go."

The "Goal-Driven Execution" principle captures this: transform imperative instructions into declarative goals with verification loops. The **Workflow** section builds on top of it: convert every non-trivial task into a plan document with confirmed success criteria before a single line of code is written.

## How to Know It's Working

These guidelines are working if you see:

- **Fewer unnecessary changes in diffs** — Only requested changes appear
- **Fewer rewrites due to overcomplication** — Code is simple the first time
- **Clarifying questions come before implementation** — Not after mistakes
- **Clean, minimal PRs** — No drive-by refactoring or "improvements"
- **Plan files committed alongside features** — One `PLAN-<feature>.md` per non-trivial change

## Customization

These guidelines are designed to be merged with project-specific instructions. Add them to your existing `CLAUDE.md` or create a new one.

For project-specific rules, add sections like:

```markdown
## Project-Specific Guidelines

- Use TypeScript strict mode
- All API endpoints must have tests
- Follow the existing error handling patterns in `src/utils/errors.ts`
```

## Tradeoff Note

These guidelines bias toward **caution over speed**. For trivial tasks (simple typo fixes, obvious one-liners), use judgment — not every change needs the full rigor.

The goal is reducing costly mistakes on non-trivial work, not slowing down simple tasks.

## License

MIT
