# CLAUDE.md

> Canonical skeleton for the project `CLAUDE.md` produced in Phase 3 of `project-bootstrap-guidelines`.
> This file is auto-injected into every Claude Code turn for this project. Keep it tight — everything here pays ongoing context cost. Move anything transient into `progress.md`; move per-feature detail into `PLAN-<feature>.md`.

## Project summary

One paragraph: what this project is, who it's for, and the single most important thing to know about it. Pulled from `PRD.md`'s problem statement.

## Frameworks & libraries

- **Language:** …
- **Framework:** …
- **Database:** …
- **Auth:** …
- **Testing:** …
- **CI / deployment:** …

Fuller rationale lives in `PRD.md`'s "Framework / library / tooling choices" table. Only update here when a choice actually changes.

## Architecture (summary)

Short textual map of the components and how they connect. Two or three sentences. For the real diagram, see `PRD.md`.

## Best practices & conventions

- **Coding standards:** …
- **Testing strategy:** …
- **Branching model:** …
- **Review process:** …
- **Commit style:** …

Keep this section to intentional, up-front project decisions. Empirical discoveries go under `## Gotchas`.

## Key files

Points at every other living doc so future turns know where to look for what.

- **`PRD.md`** — Product requirements and confirmed design decisions. Source of truth for *what* and *why*.
- **`ROADMAP.md`** — Milestones and tasks. Source of truth for *what's next*.
- **`progress.md`** — Living log of progress, decisions, bugs, blockers. Source of truth for *current state*.
- **`memory.md`** — Slim index of topical knowledge. Topical files live under `memory/` and are read on demand. Source of truth for *how this works and why we did it that way*. Distinct from `## Gotchas` below: `memory/` carries explanatory knowledge ("here's how X works"), `## Gotchas` carries defensive warnings ("don't do Y").
- **`PLAN-<feature>.md`** (per feature, transient) — Per-feature plan produced by `the-ultimate-workflow-guidelines`.

## Gotchas

> **Defensive warnings** — short rules that protect future sessions from footguns ("Beware:…", "Don't…", "Note that…"). Each entry is one or two sentences: lead with the actionable rule, then the *why*. Add an entry when you hit the same issue twice, the user corrected you on the same thing more than once, or a bug took >10 min to pin down and the fix is non-obvious from reading the code. Delete entries that are no longer true (after a refactor, framework change, or convention shift) — this section should be alive, not a graveyard.
>
> Longer-form **explanatory** knowledge ("here's how auth works", "here's why we picked Postgres") belongs in `memory/<topic>.md`, not here. See `memory.md`.

<!-- Example entries — delete once you have real ones:

- **Imports are path-aliased via `@/`, not relative.** Write `@/utils/foo`, not `../utils/foo`. TS config + bundler both require the alias; relative paths silently break production builds. *(Discovered YYYY-MM-DD, hit twice.)*
- **Tests need a live Postgres.** Run `docker compose up -d db` before `pnpm test`. No in-memory fallback.

-->
