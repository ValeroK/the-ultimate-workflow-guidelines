---
name: greenfield-architecture-guidelines
description: Architecture reasoning for a brand-new system, service, or major subsystem that has no existing structure to follow. Use this skill whenever the user is designing something from a blank slate and needs to decide its shape — "design the architecture for X", "how should I structure a new Y", "what stack and layout for a greenfield Z", "should this be a monolith or microservices", "set up the skeleton" — even if they never say "architecture". Produces quality-attribute scenarios, a modular-monolith-first structure with explicit boundaries, a walking skeleton, and decision records for the one-way doors. Use it inside project-bootstrap-guidelines Phase 2 (system design). Not for changing an existing codebase (use system-architect-engineering-guidelines) and not for a one-file script.
license: LicenseRef-MIT-Attribution
---

# Greenfield Architecture Guidelines

A blank slate invites two opposite failures: designing everything up front for a scale that never arrives, and building with no structure so the first rewrite is inevitable. The aim is the **smallest structure that keeps the expensive decisions reversible**.

If `project-bootstrap-guidelines` is running, this is the reasoning behind its Phase 2; fold the outcome into `PRD.md` and confirm it with the user as that skill directs. Principles from `the-ultimate-workflow-guidelines` (surface assumptions, no speculation) apply throughout.

## 1. Pin the quality attributes before any structure

Structure follows the attributes that must hold, so name them first. Ask the user for the **two or three that matter most** and a **measure** for each. Vague words ("fast", "scalable", "secure") are not requirements.

Write each as a scenario: *who or what triggers it, what happens, in what conditions, and the response you need, with a number.* See [`references/quality-attribute-scenarios.md`](references/quality-attribute-scenarios.md). If the user cannot give a number, say so and record a stated assumption instead of inventing one.

State which attribute wins when two conflict (for example consistency versus availability, latency versus cost). That choice is the architecture's real spine.

## 2. Start as a modular monolith

Default to **one deployable unit with strict internal module boundaries**. A single process removes a whole class of failures (partial failure, network latency, distributed data) and keeps change cheap while the domain is still being learned.

Split a module into a separately deployed service only when a **concrete forcing reason** exists and can be stated: independent scaling profile, genuinely separate team that must release independently, a fault-isolation or compliance boundary, or a different runtime requirement. "It might scale" and "it is more modern" are not reasons. Treat the choice as a hypothesis, not a law; if the reasons hold, split.

What makes the monolith *modular* rather than a tangle:

- Modules own their data. No module reads or writes another's storage directly; they talk through a narrow, explicit interface.
- Dependencies point one way, toward the stable core, with no cycles.
- Each boundary is drawn where change and ownership diverge, not along technical layers alone.

Details and the tests that keep it honest: `modularity-and-evolution-guidelines`.

## 3. Walking skeleton first

Before filling in features, build the **thinnest end-to-end slice** that exercises every architecturally significant piece: request in, through the main modules, to storage, out, plus build, test, deploy, and one health check. It proves the structure runs and the pipeline works while changes are still cheap. Then grow features onto it.

## 4. Decide late, but record the doors

- **Last responsible moment:** defer each decision until delaying further would cost more than deciding, and no later. Do not decide a datastore's sharding strategy before there is data.
- **One-way doors** (persisted schema, public API shape, auth model, primary datastore, cloud or vendor lock, wire format) get a short decision record with options, the choice, and the trigger that would reopen it. Use the ADR template in `system-architect-engineering-guidelines` if installed, else a short options / choice / consequences / revisit-trigger note.
- **Two-way doors** (internal naming, a helper library, a module layout that tests pin): decide and move on.

## 5. Keep it boring on purpose

Prefer technology the team already operates, with mature tooling and a community, over the novel option. Each novel component spends an "innovation budget" and adds operational load. Spend it only where it buys a quality attribute you named in step 1.

## 6. A minimal architecture vision (what to hand off)

One page, not a binder:

1. The quality-attribute scenarios and which one wins conflicts.
2. A context sketch: the system, its users, the external systems it touches.
3. The module list with one-line responsibilities, and who owns what data.
4. The walking-skeleton scope.
5. The one-way-door decisions made (with records) and the ones deliberately deferred (with their trigger).
6. Known risks and the cheapest way to test each.

## Do not

- Pick microservices, an event bus, or a service mesh for a system with no measured need and a team that does not yet know its domain.
- Design for a scale or variability nobody stated.
- Add an abstraction layer "so we can swap the database later" without a present reason.
- Skip the walking skeleton because "we will integrate at the end".

## When to skip

A one-off script, a prototype explicitly marked throwaway, or a change inside an existing system (use `system-architect-engineering-guidelines`).
