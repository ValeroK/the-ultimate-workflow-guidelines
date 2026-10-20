# Simplification and refactoring

Use this when a change restructures existing code (extracts, inlines, moves, renames or rewrites it) or says it simplifies something. The question is whether the result is easier to understand and change, and whether behaviour stayed the same.

## Simpler means fewer concepts, not fewer lines

Count what a reader must hold in mind to follow the code: names, branches, layers, modes, indirections. A change that leaves that count the same is not simpler, whatever its line count. A one-line nested ternary is shorter and harder.

## What a real simplification looks like

| Signal in the old code | A simplification that removes something |
|---|---|
| Deep nesting | Guard clauses that return early |
| A chain of branches on the same kind or type | A lookup table, or dispatch where the repository already dispatches that way |
| The same condition tested in several places | One well-named predicate |
| A boolean parameter that switches behaviour | Two functions |
| A wrapper or pass-through that adds no meaning | Call the underlying function |
| A factory or strategy with one product | The direct code |
| A near-duplicate of an existing helper | Call the helper |
| Comments that say what the next line does | Delete them; keep comments that say why |
| Dead branches, unused parameters, commented-out code | Delete them, after checking no dynamic caller uses them |

## What makes a "simplification" worse

- **Complexity moved, not removed.** Logic pushed into a new helper, layer or configuration so the caller looks short while the total grows.
- **Inlining a name.** Removing a helper that named a concept makes every call site explain it again.
- **Merging unrelated logic** into one function to save lines.
- **Removing an abstraction that has a second real user**, or that a test seam depends on.
- **Extracting helpers to meet a complexity number.** Splitting a long linear function into many tiny functions that are only called once, in order, scatters one idea. A complexity metric is a hint, not a target.
- **Weakening error handling** because it "clutters" the code.

## Behaviour must not change

A refactor keeps the same outputs for the same inputs, the same errors and error types, the same side effects and their order, and the same public interface. Check especially:

- **Edge inputs:** empty collections, `null` or `None`, zero, missing keys. Rewrites from loops to comprehensions or `filter`/`map` often change these.
- **Short-circuit and evaluation order:** a condition reordered for readability may now call something it used to skip.
- **Mutation:** a copy where the old code mutated in place, or the reverse, changes what callers see.
- **Exceptions:** a new helper that catches, wraps or logs what the old code let through.
- **Tests that had to change.** If existing tests needed new expectations, the behaviour changed. Ask whether that was intended.

## Refactoring and behaviour change together

A change that both restructures and changes behaviour hides the behaviour change inside the restructuring. When the request was a fix or a feature, the restructuring is out of scope unless the plan asks for it. Report it as a change outside the task.

## Chesterton's fence

Before calling code unnecessary, find out why it is there: its callers (including dynamic ones, reflection and string-based lookups), its tests, the comment or commit that added it, a platform or performance constraint. "I don't see why it exists" is not a finding.

## Not a finding

- A long function that does one linear thing, an exhaustive switch, a table or configuration.
- A simplification the repository's style would not use (for example comprehensions in a codebase that writes loops).
- A rename that matches the repository's naming convention.
- Code the change did not touch.
