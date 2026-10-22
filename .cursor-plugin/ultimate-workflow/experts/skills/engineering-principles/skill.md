---
name: engineering-principles
description: Use when a plan question or a review finding rests on a design principle or pattern (a type hierarchy, an interface, a shared helper, a pattern name) - each principle's real meaning, its common misreading, and when it does not apply.
verified: 2026-10-20
---

# Engineering principles

## Goal

- **Lets the expert catch:** a finding that misapplies a principle (splitting by size, an interface beside every class, an extension point before a second case) and the real cost a principle explains when it does apply.
- **Applies to:** every plan and review where structure is added or a principle is cited; it is always included, because no file name shows it.
- **Not for:** module and package boundaries (softarch); concrete review categories, which live in the developer's review reference (this skill says when they do not apply).

Sources: **[T]** published texts and upstream skills, read in summaries and not checked against the original (Martin, Meyer, Liskov and Wing, Metz, Fowler, Jeffries, Google's review guide); **[O]** our own reasoning. Every row here is a prompt to check against the repository, not a finding on its own.

## First, establish the target

- **Which principle the candidate rests on,** and whether you are using its misreading.
- **How the repository already structures this kind of code.** Its convention beats any principle.
- **The cost in this change:** the specific change that becomes harder, or the input that goes wrong. Without one, it is a preference and stays out.

## The principles

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Single responsibility means one source of change (one actor), not "does one thing" [T] | A unit whose list of reasons to change holds items from different domains, such as storage and message layout | A long unit one team owns that changes for one reason |
| Open/closed: extend through the dispatch the code already has, not by editing branches in several places [T] | A new variant added by editing a chain of type branches in more than one place, where the repository dispatches polymorphically | A bug fix, or the first or second variant before a real axis of change exists |
| Liskov substitution: a subtype accepts at least what the parent accepts and promises at least what it promises; matching signatures are not enough [T] | An override that throws not-implemented, does nothing where the parent acts, rejects the parent's inputs, or returns less | Test fakes that throw on methods the test never calls |
| Interface segregation: no client depends on methods it does not use; it does not mean one method per interface [T] | Implementers stubbing methods they cannot honour, or a function taking a wide interface to call one method | A cohesive protocol, or one where the language supplies defaults |
| Dependency inversion: policy and detail depend on an abstraction the policy side owns; it does not mean a container or an interface beside every class [T] | Business logic that imports a database, HTTP or cloud SDK, or builds its own client, where the repository passes clients in elsewhere | Stable standard-library types, or the adapter whose job is to talk to the vendor SDK |
| Build a capability when it is needed, not when foreseen [T] | Options, hooks, parameters, registries or base classes nothing uses | Published APIs, wire formats and storage schemas, where leaving room is cheap insurance [O] |
| Duplication is cheaper than the wrong abstraction: wait for the third copy, and a shared helper gaining a flag or branch per caller is the wrong abstraction growing [T] | A helper with a new caller-specific branch, or a copy with an accidental-looking difference | Copies that change for different reasons; but a canonical rule (tax, rounding, signature checks) is shared early, because two versions are a correctness bug [O] |
| Talk to direct collaborators, and tell an object to do the work rather than pulling its data out [T] | `order.customer.account.limits.daily` used to make a decision the account owns | Fluent and query builders, plain data structures and records |

## Patterns a language makes unnecessary

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Singleton is often global mutable state in disguise [T] | A singleton holding mutable state | Module-level instances or injection already manage lifetime |
| A factory class whose method calls one constructor adds a concept and nothing else [T] | `ThingFactory.create()` returning `new Thing()` | A real choice of class at run time |
| A single-method stateless Strategy class is a function [T] | An interface and classes with one `execute` method each | A language without first-class functions |
| Visitor boilerplate is unnecessary where the language matches exhaustively over a closed set (TypeScript unions, Rust enums, Python `match`) [T] | `accept`/`visit` added across a hierarchy in such a language | An open set of types |
| A hand-written observer list needs a detach, and is unnecessary where the platform has events or channels [T] | Attach with no detach, or a custom list beside a platform event system | |

## Not a finding

- A principle or pattern name with no cost in this change.
- A pattern the repository already uses consistently.
- A long linear function, an exhaustive switch or a table.
- A wrapper over a third-party client at a boundary.
- A single-implementation interface the repository's test seams depend on.
