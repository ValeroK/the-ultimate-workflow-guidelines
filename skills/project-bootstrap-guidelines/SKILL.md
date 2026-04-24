---
name: project-bootstrap-guidelines
description: Bootstrap a new project from scratch. Use this skill whenever the user is starting a new project, creating a new repo, or building something from a blank slate — even if they don't explicitly mention PRD, architecture, or documentation. Triggers include "start a new project", "build me an X", "I want to create a Y", "scaffold", "greenfield", "from scratch", "spin up a repo". Produces a PRD (reviewed with the user), a system design (flow diagram + architecture + framework choices), and three bootstrap docs (CLAUDE.md, ROADMAP.md, progress.md). Run before any feature work; hand off to the-ultimate-workflow-guidelines once bootstrap docs exist.
license: LicenseRef-MIT-Attribution
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

Create `PRD.md` (template: [`references/prd-template.md`](references/prd-template.md); use [`references/prd-questions.md`](references/prd-questions.md) to drive the review conversation). It must capture:
- **Problem statement** — what are we solving, for whom.
- **Users / personas.**
- **Goals and non-goals.**
- **Functional requirements** — what the system must do.
- **Constraints** — technical, regulatory, performance, budget, timeline.
- **Success metrics** — how we'll know it worked.

Review the draft with the user. Raise every question and concern. Iterate until the user explicitly confirms the PRD.

**Why:** the product questions (users, non-goals, success metrics) are cheaper to name up front than to re-litigate mid-build. `PRD.md` is also the single source of truth the feature workflow reads before planning any later feature.

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

**Why:** framework choices have gravity; documenting the alternatives now saves a "why not X?" question in month three. Folding decisions back into `PRD.md` keeps *what* + *why* in one file — the feature workflow reads it next.

## Phase 3 — Bootstrap docs

Once the PRD is complete and holds all decisions, create three living docs:

1. **`CLAUDE.md`** (template: [`references/claude-md-template.md`](references/claude-md-template.md)) — written from the PRD. Contains:
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

   - **An empty `## Gotchas` section** — empirical, discovered-the-hard-way lessons land here as the project matures. The feature workflow appends entries using the threshold + format defined in `the-ultimate-workflow-guidelines`. Keep it alive, not a graveyard.

   This becomes the always-on guidance for every future turn.

2. **`ROADMAP.md`** (template: [`references/roadmap-template.md`](references/roadmap-template.md)) — the execution roadmap (project-scoped, distinct from per-feature `PLAN-<feature>.md` files produced by `the-ultimate-workflow-guidelines`):
   - Project broken into milestones.
   - Each milestone broken into discrete tasks.
   - Dependencies between milestones/tasks if any.

3. **`progress.md`** (template: [`references/progress-template.md`](references/progress-template.md)) — the living log. Updated every working session with:
   - Latest progress (what's done, what's in-flight).
   - Decisions made during execution (and why).
   - Issues and bugs discovered.
   - Open questions / blockers.
   - Cross-reference: when a new `PLAN-<feature>.md` is produced, link it here.

**Why:** docs loaded every turn compound context over time. `CLAUDE.md` holds intentional project design; `## Gotchas` captures empirical lessons so they don't re-appear each session; `ROADMAP.md` carries the milestone view; `progress.md` is the time-ordered log. Together they give `the-ultimate-workflow-guidelines` everything it needs to plan features without re-investigating the codebase.

## Phase 4 — Hand-off

Bootstrap is **done** when all three conditions hold:

1. `PRD.md`, `ROADMAP.md`, `CLAUDE.md`, and `progress.md` all exist.
2. The user has explicitly confirmed them.
3. The first feature is scoped and ready to start.

For that feature and every one after it, switch to `the-ultimate-workflow-guidelines`. Each feature still gets its own `PLAN-<feature>.md` per that skill's workflow; `ROADMAP.md` stays as the project-level milestone view; `progress.md` tracks cumulative state across features; `CLAUDE.md`'s `## Gotchas` section grows as empirical issues surface.

**Why:** a clean hand-off prevents this skill from leaking into routine feature work — two distinct modes, two distinct skills, no ambiguity about which one is running.

## When to skip this workflow

This skill is for **new projects only**. For work inside an existing project, use `the-ultimate-workflow-guidelines` instead.
