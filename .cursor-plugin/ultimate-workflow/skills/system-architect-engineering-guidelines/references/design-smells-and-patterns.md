# Design smells and when a pattern is justified

Read when a design question names a pattern, an abstraction, or a smell. A pattern is a **remedy for an observed smell**, never a starting point. If the smell is absent, the pattern is cost with no benefit.

Thresholds below are *triggers to consider*, calibrated to the rule of three: tolerate duplication or branching once or twice; act on the third occurrence, or sooner if the cost is already visible. The repo's conventions and language idioms override every row.

## Smell to remedy

| Smell (observed) | Consider | Do not |
|---|---|---|
| The same type or mode `switch`/`if` chain appears in three or more places, and new variants keep arriving | Strategy or polymorphic dispatch; one place to add a variant | Introduce a Strategy for two stable branches in one function |
| Domain code calls a vendor SDK, framework, or HTTP client directly, and vendor types or exceptions leak upward | Adapter owned by your domain, translating vendor errors and types at the edge | Wrap every library "just in case"; wrap only at a real seam |
| A constructor or function has many optional parameters and callers pass `null`/positional flags | Options object, named arguments, or Builder, whichever the language idiom is | Add a Builder in a language that already has keyword arguments |
| Object creation has branching logic repeated across callers | Factory function centralising the decision | Factories for plain data or a single concrete type |
| Callers coordinate three or more subsystems in the same order, repeatedly | Facade or application service with one intention-revealing method | Hide transaction boundaries the caller must control |
| Cross-cutting concern (retry, cache, metrics, auth) is pasted inside business functions | Decorator, middleware, or wrapper with the same interface | Inline concern mixed into domain logic |
| One action triggers unrelated side effects in other modules, in the same transaction | Domain event with decoupled handlers, *if* the side effects can tolerate eventual consistency | Events that hide a required, ordered workflow; make required steps explicit calls |
| A subclass overrides to throw `NotSupported`, or to do nothing | Composition; split the interface | Keep the inheritance and document the exception |
| A client depends on an interface where it uses one or two methods | Narrow, role-based interface at the consumer | Split an interface nobody else consumes |
| A primitive carries meaning and validation (`string` email, `number` money, raw id) passed widely | Immutable value type validating on construction | Wrap every primitive; do it where invariants are real and bugs recur |
| Caller chains `a.b().c().d()` and mutates deep state | Tell, don't ask: expose the operation on the immediate collaborator | Add pass-through methods that only forward |

## Abstraction budget

Before adding an interface, base class, or layer, answer all three:

1. What concrete second implementation, test double at a true I/O seam, or protected boundary exists today?
2. What would the code look like without it, and what specifically is worse?
3. What does it cost every future reader (indirection, navigation, naming)?

If 1 has no answer, do not add it. The principle that high-level code should depend on abstractions (dependency inversion) applies at **I/O boundaries and real variation points**, and does not license an interface per class. Inject infrastructure (clients, clocks, storage) so domain logic is testable; do not manufacture an interface for pure in-process logic.

## Where size and shape matter

Report, do not unilaterally fix, in code outside the task:

- Functions that mix levels of abstraction, or need a comment to explain each block, usually want extraction. Length alone is a weak signal.
- Nesting beyond two or three levels is usually fixable with guard clauses or extraction.
- A module with several unrelated reasons to change wants splitting along those reasons.
- A growing `utils`/`helpers`/`common` file is a missing concept.

## Error handling

- Match the repo's idiom. Do not mix exceptions and `Result` in one layer.
- Translate errors at boundaries so internal layers never see vendor exceptions.
- Distinguish expected failures (validation, not found: typed, handled) from bugs and infrastructure faults (let them surface to the boundary that logs and maps them).
- Retries need a bound, backoff, and idempotency. A timeout is mandatory on any network or process call.

## Data and migrations

- Schema or wire changes: make them expand-then-contract. Add the new shape, dual-read or dual-write, migrate, then remove the old. State the rollback.
- Never edit a shipped migration; add a new one.
- Anything persisted or published is a public contract regardless of how internal the code feels.
