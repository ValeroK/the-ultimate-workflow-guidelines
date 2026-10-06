---
name: modularity-and-evolution-guidelines
description: How to draw module boundaries, control coupling, and change a system's structure safely over time, in any language or stack. Use this skill whenever the task is about splitting or merging modules or services, untangling a dependency cycle, deciding where a piece of logic or data should live, enforcing architecture rules in CI, migrating off a legacy component, changing a schema or API without breaking callers, or when someone says "this is a big ball of mud", "distributed monolith", "strangle it", "extract a service", "shared database", "circular dependency", or "how do we migrate this incrementally". Not for the first design of a new system (greenfield-architecture-guidelines) and not for runtime failure handling (distributed-systems-resilience-guidelines).
license: LicenseRef-MIT-Attribution
---

# Modularity and Evolution Guidelines

Structure is judged by how cheaply it lets the next change happen. These rules are stated as **properties**, not language constructs, so they apply whether the unit is a package, namespace, crate, module, or service.

Before changing structure, **find the real one**: read the actual import or call graph and data-access paths, not the diagram. Docs describe intent; the code is the architecture. Conform to what exists unless the task is to change it.

## Boundary rules

1. **One owner per piece of data.** Exactly one module writes it. Others read through that module's interface, never by reaching into its storage. A shared database that several modules write is a hidden interface with no contract.
2. **Dependencies point toward stability and the domain.** Volatile, detail-heavy code (frameworks, vendor clients, UI, transport) depends on stable policy code, never the reverse.
3. **No cycles.** A cycle means two modules are really one, or a third concept is missing. Break it by extracting the shared concept or inverting one edge at a real seam.
4. **Cut along change and ownership**, not only technical layers. If every feature touches all layers of the same slice, the slice is the module.
5. **Narrow, intention-revealing interfaces.** A caller should need to know *what* it wants, not the order of internal steps. If callers coordinate three or more collaborators in a fixed sequence, that sequence belongs behind one interface.
6. **Shared code earns its place.** A shared module that many depend on and that changes often couples them all. Prefer duplicating a small, stable piece over a shared module that becomes a dumping ground.

## Service versus module

A module boundary inside one deployable unit is cheap to move. A network boundary is expensive to move. Extract a service only for a stated forcing reason (independent scaling, independent release by a genuinely separate team, fault or compliance isolation). Teams and structure influence each other: boundaries that cut across how people actually work will be fought; check whether the proposed split matches ownership.

**Distributed monolith warning signs:** services that must deploy together, share a database, or call each other synchronously in long chains. You have paid for distribution and kept the coupling. Fix by consolidating, or by giving each service its data and a stable contract.

## Enforce structure with executable checks

A rule in a document rots. Encode important structural rules as **fitness checks** that run in CI: forbidden dependency directions, no-cycle checks, a module that must not import another, a performance or size budget, a test that a public contract has not changed. Use whatever tool the repo already has or a small script; do not add a dependency for it without approval. When you fix a structural problem, add the check that would have caught it.

## Change structure incrementally

- **Strangler approach for replacing a component:** route a thin slice of traffic or calls to the new implementation behind a stable seam, grow the slice, retire the old one. Keep both runnable until the cutover is proven, and keep rollback one step away.
- **Expand then contract (parallel change) for any contract:** add the new shape alongside the old, migrate callers and data, then remove the old. Never rename or retype in place across a boundary you do not fully control.
- **Behaviour-preserving first:** do a refactor as a separate step with tests green before and after, never mixed with a behaviour change.
- **Feature flags** decouple deploy from release for risky changes; remove them when done, since a stale flag is debt.
- Persisted data and published interfaces are public contracts regardless of how internal the code feels.

## Anti-patterns to name when you see them

| Pattern | Signal |
|---|---|
| Big ball of mud | No discernible boundaries; everything depends on everything |
| Distributed monolith | Many deployables, one lockstep release, shared data |
| Shared-database integration | Several modules write the same tables |
| Speculative generality | Hooks, interfaces, or config for variation that never arrived |
| Golden hammer | One tool or pattern applied everywhere regardless of fit |
| Anemic model with logic scattered in services | Data holders with no behaviour, rules duplicated across callers |
| Resume-driven design | A technology chosen for novelty, not for a named attribute |

Report these; fix them only within the task's scope.

## Decision triggers

Public contract, persisted schema, or a new network boundary is a **one-way door**: lay out options, recommend, and get the user's decision via the host's ask-user tool before building. Record it per `system-architect-engineering-guidelines`.

## When to skip

Local refactors inside one module that touch no boundary, data ownership, or contract.
