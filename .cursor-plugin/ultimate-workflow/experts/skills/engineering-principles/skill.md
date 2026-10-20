---
name: engineering-principles
description: Use when a change adds structure (a type hierarchy, an interface, a pattern, a shared helper), to check whether it has the need the structure exists for.
---

# Engineering principles

Use this when a plan question or a review finding rests on a design principle or a design pattern. It gives each principle's original meaning, the way it is usually misread, what it looks like in a diff, and when it should not be applied.

A principle is never the finding. The finding is the cost: the specific change that becomes harder, or the input that goes wrong. Name the principle only to explain why the cost follows. If you cannot state a cost, you have a preference, and it stays out.

## How to use it

1. Find the principle below that the candidate rests on.
2. Check that you are not using its common misreading.
3. Check its "do not apply" cases against this repository.
4. State the cost in the terms of this change, with file and line.

## The principles

### Single responsibility
- **Meaning.** A module answers to one source of change: one group of people, one kind of requirement. Robert C. Martin's later wording is "responsible to one actor".
- **Misreading.** "A function or class does one thing." That leads to splitting by size instead of by reason to change.
- **In a diff.** List every change that would force an edit to this unit. If the list holds items from different domains (storage and message layout, validation and transport), they are separate responsibilities.
- **Do not apply** to a small unit that one team owns and that changes for one reason, however long it is.

### Open/closed
- **Meaning.** Bertrand Meyer: a module is closed when other code depends on its stable interface, and open when it can still be extended. Martin later recast this as adding behaviour through polymorphism instead of editing existing code.
- **Misreading.** "Never edit an existing file."
- **In a diff.** A new variant added by editing a chain of branches on a kind or type, in more than one place, where the repository already dispatches polymorphically.
- **Do not apply** to a bug fix, or to the first or second variant, before a real axis of change exists. Adding an extension point early is speculative generality.

### Liskov substitution
- **Meaning.** Barbara Liskov and Jeannette Wing: a subtype keeps the supertype's behaviour. It accepts at least what the parent accepts, promises at least what the parent promises, and keeps its invariants.
- **Misreading.** "The signatures match, so it substitutes," or "a square is a rectangle."
- **In a diff.** An override that throws not-implemented, does nothing where the parent has an effect, rejects inputs the parent accepts, or returns less than the parent promises.
- **Do not apply** to test fakes that deliberately throw on methods the test never calls.

### Interface segregation
- **Meaning.** No client should depend on methods it does not use.
- **Misreading.** "One method per interface," producing an interface for every class.
- **In a diff.** Implementers that stub methods they cannot honour, or a function that takes a wide interface and calls one method of it.
- **Do not apply** to a cohesive protocol whose methods belong together, or one where the language supplies defaults.

### Dependency inversion
- **Meaning.** Policy code and detail code both depend on an abstraction that the policy side owns.
- **Misreading.** "Use a dependency-injection container," or "create an interface beside every class."
- **In a diff.** Business logic that imports a database, HTTP or cloud SDK directly, or constructs its own client, where the repository passes such clients in elsewhere.
- **Do not apply** to stable standard-library types, or to the adapter whose only job is to talk to the vendor SDK.

### Keep it simple
- **Meaning.** The simplest design that meets the requirement known now. Google's review guide puts it as solving the problem the author knows needs solving, not the one they speculate about.
- **Misreading.** "Fewest lines." A nested ternary is shorter and not simpler.
- **In a diff.** Generic parameters, factories, strategy hierarchies or configuration that only one concrete case exercises.

### You aren't gonna need it
- **Meaning.** Build a capability when it is needed, not when it is foreseen (Ron Jeffries; Martin Fowler).
- **In a diff.** Options, hooks, parameters, plugin registries or base classes that nothing in the change or the repository uses.
- **Do not apply** to published APIs, wire formats and storage schemas that cannot be changed later without breaking consumers. Leaving room there is cheap insurance.

### Don't repeat yourself, and its limit
- **Meaning.** One authoritative place for each piece of knowledge.
- **The limit.** Sandi Metz: duplication is far cheaper than the wrong abstraction. A shared helper that gains a flag or a caller-specific branch for each new caller is the wrong abstraction growing.
- **Rule of three.** Wait for the third copy before extracting, unless the copies have already diverged in a way that causes bugs.
- **In a diff.** A copy of an existing helper with a small difference that looks accidental, or a shared helper gaining a branch for one caller.
- **Do not apply** to copies that change for different reasons, or to test setup that reads better written out.
- **Do apply early** to a canonical rule such as tax, money rounding or signature checks, where two versions are a correctness or compliance bug.

### Composition over inheritance
- **Meaning.** Build behaviour by combining objects, not by extending classes, unless the child can truly stand in for the parent.
- **In a diff.** A subclass created to reuse a method, or one that overrides to switch behaviour off.

### Command-query separation, and least astonishment
- **Meaning.** Meyer: a function either answers a question or changes state, not both. More generally, a name must not promise something the code does not do.
- **In a diff.** A `get` or `validate` that writes or mutates, or a boolean return that callers will forget to check.

### Fail fast
- **Meaning.** Surface a failure where it happens, with its cause, rather than continue in a wrong state. Load the failure-handling skill for the detail.

### Law of Demeter, and tell, don't ask
- **Meaning.** A unit talks to its direct collaborators, not to their collaborators. Ask an object to do the work instead of pulling its data out and deciding for it.
- **In a diff.** Chains such as `order.customer.account.limits.daily` used to make a decision that belongs to the account.
- **Do not apply** to fluent builders, query builders, or plain data structures and records.

### High cohesion, low coupling
- **Meaning.** What changes together lives together, and units connect through small, explicit surfaces.
- **In a diff.** A change that has to touch many unrelated files for one behaviour, or a module whose imports now span unrelated areas. Module-level boundaries belong to the software architect.

## Design patterns

Each pattern has a stated intent. It is misused when applied without that need, and some languages make it unnecessary.

| Pattern | Its intent | Overused when | Unnecessary when |
|---|---|---|---|
| Singleton | One instance, globally reachable | It is really global mutable state | Module-level instances or dependency injection already manage lifetime |
| Factory method | Let a subclass decide which class to create | A factory class whose method only calls one constructor | A constructor function or a callable does it (`NewThing()`, `() => Thing`) |
| Strategy | Interchangeable algorithms behind one interface | Single-method stateless classes | The language has first-class functions; pass the function |
| Visitor | Add operations to a stable set of types without editing them | `accept`/`visit` boilerplate across a hierarchy | The language has exhaustive matching over a closed set (TypeScript unions, Rust enums, Python `match`) |
| Observer | One-to-many notification on state change | Hand-written attach/detach lists, or attach without detach | The platform has events, signals or channels |

A pattern name in a review is a finding only when the change pays for the pattern without its need: name the need that is missing.
