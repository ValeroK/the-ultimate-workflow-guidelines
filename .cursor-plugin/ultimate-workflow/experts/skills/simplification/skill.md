---
name: simplification
description: Use when a change restructures existing code (extracts, inlines, moves, renames, rewrites) or says it simplifies something - whether it removes concepts and keeps behaviour. Always included, for the same reason as surgical-change.
verified: 2026-10-20
---

# Simplification and refactoring

## Goal

- **Lets the expert catch:** a "simplification" that moves complexity instead of removing it, or that changes behaviour (edge inputs, evaluation order, mutation, exceptions) while claiming not to.
- **Applies to:** every build and review; it is always included.
- **Not for:** the review categories for unearned abstractions, pass-through layers, type switches and flags (the developer's review reference holds them); scope (`surgical-change`).

Sources: **[T]** upstream community skills and agents, not checked (see `NOTICE.md`); **[O]** our own reasoning. A row is a prompt to check, not a finding on its own.

## First, establish the target

- **What the old code did,** read before the new: its callers, including dynamic ones, its tests, and the comment or commit that added it.
- **The repository's style** for loops, comprehensions and helpers, so a rewrite into another style is not called simpler.

## Simpler means fewer concepts

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Count what a reader must hold in mind (names, branches, layers, modes); a change that leaves the count the same is not simpler, whatever its line count [T] | Logic pushed into a new helper, layer or configuration so the caller looks short | |
| One well-named predicate for a condition tested in several places [T] | The same three-part condition copied into each branch | |
| Removing a helper that named a concept makes every call site explain it again [T] | A named function inlined into several callers | A helper with one call site and no meaning of its own |
| Merging unrelated logic to save lines [T] | Two jobs folded into one function | |
| Removing an abstraction that has a second real user or a test seam [T] | An interface deleted while a test double implements it | |
| Splitting a long linear function into tiny functions called once, in order, to meet a complexity number, scatters one idea [T] | Five new private helpers each called once from the old body | |
| Weakening error handling because it "clutters" the code [T] | A catch, check or cause chain removed in a refactor | |

## Behaviour must not change

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Edge inputs change in rewrites from loops to comprehensions or `map`/`filter`: empty, `null` or `None`, zero, missing keys [O] | A loop rewritten where the old code special-cased an empty input | |
| Reordering a condition for readability can call what used to be skipped [O] | `a && b` rewritten as `b && a` where `b` has a side effect or can throw | |
| A copy where the old code mutated in place, or the reverse, changes what callers see [O] | `sort()` replaced with `sorted()` or `toSorted()` where callers relied on the mutation | |
| A new helper that catches, wraps or logs what the old code let through [O] | A try block added inside an extracted function | |
| Tests that had to change mean behaviour changed: ask whether that was intended [T] | Existing expectations edited in a "refactor" | |
| Before calling code unnecessary, find why it is there; "I don't see why it exists" is not a finding [T] | A removal with no search for dynamic callers, reflection or string lookups | |

## Not a finding

- A long function that does one linear thing, an exhaustive switch, a table or configuration.
- A simplification the repository's style would not use.
- A rename that matches the repository's naming convention.
- Code the change did not touch.
