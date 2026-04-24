---
name: project-bootstrap-guidelines
description: Bootstrap a new project from scratch. Produces a PRD (reviewed with the user), a system design (flow diagram + architecture + framework choices), and three bootstrap docs (CLAUDE.md, ROADMAP.md, progress.md). Use at project birth, before any feature work.
license: MIT
---

# Project Bootstrap Guidelines

A confirmed-at-each-step flow for starting a new project. The goal: before any code is written, the project has a PRD, a reviewed design, documented framework choices, and three living docs that guide all future work.

## Templates

Canonical skeletons for every doc this skill produces — copy each into the project root and fill in, don't re-invent the shape each session:

- [`references/prd-template.md`](references/prd-template.md) — `PRD.md` (Phase 1 content + Phase 2 design decisions).
- [`references/prd-questions.md`](references/prd-questions.md) — question bank for Phase 1 review.
- [`references/roadmap-template.md`](references/roadmap-template.md) — `ROADMAP.md` (Phase 3 milestone view).
- [`references/progress-template.md`](references/progress-template.md) — `progress.md` (Phase 3 living log).
- [`references/claude-md-template.md`](references/claude-md-template.md) — project `CLAUDE.md` (Phase 3), including `## Key files` and an empty `## Gotchas` section.

## Phase 1 — PRD

Create `PRD.md`. It must capture:
- **Problem statement** — what are we solving, for whom.
- **Users / personas.**
- **Goals and non-goals.**
- **Functional requirements** — what the system must do.
- **Constraints** — technical, regulatory, performance, budget, timeline.
- **Success metrics** — how we'll know it worked.

Review the draft with the user. Raise every question and concern. Iterate until the user explicitly confirms the PRD.

## Phase 2 — System design

With the PRD confirmed, design the system:

1. **Flow diagram** — how users and data move through the system. Use Mermaid embedded in `PRD.md` (promote to a separate `DESIGN.md` only if it outgrows the PRD).
2. **Architecture** — components, responsibilities, boundaries, interfaces between them.
3. **Framework / library / tooling choices** — for each major choice (language, framework, DB, queue, auth, deployment target, testing stack, CI), document:
   - What we picked.
   - Alternatives considered.
   - Why we picked this one (pros and cons).
4. **Best practices** — coding standards, testing strategy, branching model, review process.

Present all of the above to the user. Raise concerns about any choice you're uncertain about. Iterate until confirmed. Fold every confirmed decision back into `PRD.md` so the PRD is a single source of truth.

## Phase 3 — Bootstrap docs

Once the PRD is complete and holds all decisions, create three living docs:

1. **`CLAUDE.md`** — written from the PRD. Contains:
   - Frameworks and libraries in use.
   - Architecture summary.
   - Project best practices and conventions.
   - **A "Key files" section** pointing at every other living doc, with each entry stating the file's path, its purpose, and what information it holds (so future turns know where to look for what). Example:

     ```markdown
     ## Key files
     - **`PRD.md`** — Product requirements and confirmed design decisions. Source of truth for *what* and *why*.
     - **`ROADMAP.md`** — Milestones and tasks. Source of truth for *what's next*.
     - **`progress.md`** — Living log of progress, decisions, bugs, blockers. Source of truth for *current state*.
     - **`PLAN-<feature>.md`** (per feature, transient) — Per-feature plan produced by `the-ultimate-workflow-guidelines`.
     ```

   This becomes the always-on guidance for every future turn.

2. **`ROADMAP.md`** — the execution roadmap (project-scoped, distinct from per-feature `PLAN-<feature>.md` files produced by `the-ultimate-workflow-guidelines`):
   - Project broken into milestones.
   - Each milestone broken into discrete tasks.
   - Dependencies between milestones/tasks if any.

3. **`progress.md`** — the living log. Updated every working session with:
   - Latest progress (what's done, what's in-flight).
   - Decisions made during execution (and why).
   - Issues and bugs discovered.
   - Open questions / blockers.
   - Cross-reference: when a new `PLAN-<feature>.md` is produced, link it here.

## Phase 4 — Hand-off

Once the three docs are in place, switch to `the-ultimate-workflow-guidelines` for every subsequent feature. Each feature gets its own `PLAN-<feature>.md` per that skill's workflow; `ROADMAP.md` stays as the project-level milestone view; `progress.md` tracks cumulative state across features.

## When to skip this workflow

This skill is for **new projects only**. For work inside an existing project, use `the-ultimate-workflow-guidelines` instead.
