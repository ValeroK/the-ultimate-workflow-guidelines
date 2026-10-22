# Senior developer review of a diff

## Purpose

Find the code in this change that hides a failure or makes a named future change harder, before it merges. It restates ideas from three open-source review guides (see `NOTICE.md`); no text is copied.

## Scope

Report craft problems this change introduces. This is not a style review and not an audit of the whole codebase.

- New or substantially rewritten production code is in scope. Config, generated code, docs, tests and unchanged code are not.
- Read the project's written rules first: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING`, and the lint and format configuration. A diff that breaks a written rule is a finding; cite the rule and its file.
- A problem that was already there and is untouched is out of scope.
- Read the callers of the changed code, and the code it calls: that is how you find the repository's convention and the second user of anything new.
- If the plan has an "Expert input" section, check the diff against what you required there, and report any requirement the diff does not honour.
- Style a linter or formatter would catch is out of scope. If the repository has no linter config and the same style problem is everywhere, say so once in the verdict.

## Method

1. Learn how this repository already does it: existing helpers, base types, error handling, how dependencies are passed in. Before calling something unnecessary, find out why it is there: its callers, its tests, the comment above it.
2. Compare the change against that. A deviation from the repository's own way is a candidate; a textbook the repository does not follow is not.
3. For each candidate, find the concrete cost: a change that becomes harder, or an input that goes wrong.

Stop working a candidate after three searches that turn up nothing new: report it with what you have, or drop it. If you cannot name the cost, it is a preference, and it stays out. Stop the review when every added or rewritten unit has been through step 3.

Every finding states the cost in one or two sentences; a principle name is not a cost. The fix must be no larger than the code it replaces. Report a repeated problem once, with every location, and say which evidence steps you read and which you inferred.

## Categories

Check what the change adds and skip the rest.

- **Unearned abstraction.** A new interface, base class, factory, registry or wrapper with exactly one implementation and one caller, in the diff or the repository; report it with the inlined alternative. Not when it wraps a third-party client at a boundary, or a second implementation exists anywhere.
- **Complexity moved, not removed.** A new layer or pass-through function that leaves the same number of concepts; deleting it is the fix. Not when the layer is the repository's convention at that boundary.
- **Two reasons to change.** One function or class that visibly does two unrelated jobs, such as persistence and message formatting; cite the two reasons from the diff. Not when it is only long: a long, linear function that does one thing is fine.
- **A growing type switch.** A chain of branches on a kind or type, where the repository already dispatches polymorphically and the diff adds a variant. Not when it is a closed, exhaustive switch over an enum.
- **Substitutability.** A subclass or implementation that strengthens what it requires, throws not-implemented, returns something narrower, or turns off its parent's behaviour. Not when no caller uses it through the base type.
- **Interface too wide.** A new interface that forces implementers to stub methods they cannot honour. Not when the stubs are in test doubles only.
- **Hard-wired dependency.** Logic that constructs its own database or HTTP client where the repository's other code receives it as a parameter. Not when the repository constructs clients this way elsewhere.
- **Duplicate that already diverged.** Code copied from an existing helper (cite its path), or two copies in the diff whose branches differ in a way that looks accidental. Not when the copies are two or three similar lines, or change for different reasons.
- **Swallowed failure.** An empty catch, a catch that continues, a default returned on error, optional chaining that hides a failing call, a stub fallback outside tests, a broad catch that would also hide unrelated errors (name two), an error rethrown without its cause, a retry loop that gives up silently, a log line followed by carrying on as if the call worked. Not when it is a broad catch at a worker loop or request boundary that logs the full error and keeps the process alive.
- **Wrong or hidden meaning.** A name that says one thing while the code does another (a `validate` that mutates, a `get` that writes); a bare number or string whose unit cannot be derived and has gone wrong or will (cents and dollars); a zero, empty or negative value (`-1` meaning "never") that silently disables a check. Not when the type or a named constant already carries the unit.
- **Flag that switches behaviour.** A new boolean or mode parameter that selects between two behaviours in one function, when every call site passes a literal. Not when it is a true toggle or a value passed straight through from outside.
- **Speculative generality.** A parameter, hook, option or extension point no caller in the diff or repository uses. Not when the plan names the second caller in this change.
- **Shared mutable state.** A function returning or storing an internal mutable object, or a mutable default argument, a caller can alter. Not when the object is documented as handed over and never read again.
- **Invariant bypassed.** A new setter, builder step or mutating method that skips a check the constructor or factory enforces; cite both. Not when the type states no invariant.
- **Feature logic in shared code.** A caller-specific branch, flag or import added to a shared or general module; cite the module's other callers. Not when the module exists for that feature.
- **New dependency.** One the standard library or an existing dependency covers, or one whose name you cannot confirm is a real, canonical package (a model may have invented it; a misspelt name can be a malicious look-alike). Not when it has an advisory or an install script: that is security's (owner: security).
- **Resource not released.** A file, connection, lock or stream opened without the language's scoped cleanup (`with`, `defer`, `using`, try-with-resources, `finally`), where an error or early return leaks it; a `defer` inside a loop leaks until the function ends. Not when the function hands the resource to its caller to close.
- **Dead code introduced.** Unreachable branches, unused functions, or agent residue: a renamed `_unused` variable, a `// removed` comment, a compatibility shim for code nothing calls. Not when it is a public export a published package keeps for consumers outside the repository.
- **Change outside the task.** Reformatting, renames or comment edits in code the change does not otherwise touch, a refactor mixed into a fix, an option no requirement asks for; cite the request or plan line it goes beyond. Not when the plan lists the change.
- **A list that must be edited in step.** A property of a thing kept in a separate list, map or set keyed by its name, away from where the thing is defined (an approval list of tool names, a routing table of handler names); show both places. Not when a test or the type system fails if the two disagree.
- **Work that grows faster than its input.** A `.find`, `.filter`, `includes`, `indexOf` or sort inside a loop over a collection whose size a caller or upstream controls, on a request path, so the work grows with the square of the input. Not when the size is fixed and small by construction, or the inner lookup is a map or set. A database or remote call per item is data's or the architect's.
- **A published library's API break.** A change to an exported function, type, field or variant of a package others install that breaks them under the language's rules (see the language skill), with no matching version bump. Not when the only consumers are in this repository (owner: softarch).

## Severity here

- **high**: the change returns a wrong value or hides a failure on a path the repository calls. State why the types, validation or framework defaults do not already prevent it.
- **medium**: a named future change becomes harder, or the wrong outcome needs a specific input.
- **low**: concrete, and the fix is one line.

## Do not report

These produce noise. Skip them unless the change makes one concretely harmful and you can state the cost.

- A SOLID, DRY or pattern-name violation with no concrete cost; a missing pattern or layer the repository does not use; suggestions to abstract single-use code.
- Function or file length by itself: an exhaustive switch, a table, configuration and a long linear sequence are fine.
- Naming or formatting where a linter or formatter exists or should.
- Error handling that happens upstream (trace a caller first), or validation missing in an internal function whose callers validate.
- A possible null dereference when a guard or type narrowing is in scope.
- A constant defined and used once with an explanation, or an obvious constant.
- A pattern the language makes unnecessary (a single-method Strategy class where a function does), except as an unearned abstraction with its cost.
- An `unwrap` or equivalent in test code, or on a value a stated invariant guarantees.
- A fire-and-forget call that is intentionally detached.
- Mutating syntax inside an Immer or Redux Toolkit reducer.

## One finding, and one candidate dropped

- Reported: `shipping/address.go:41` `ValidateAddress(a *Address)` upper-cases and trims `a.Postcode` in place, and `checkout/submit.go:18` calls it before comparing the postcode with the one stored on the customer at line 22. Every lower-case postcode now reads as changed and triggers a re-verification email. Category: wrong or hidden meaning (a `Validate` that mutates); severity medium. Fix: return a normalised copy, or rename it `NormalizeAddress` and call it where normalising is intended.
- Dropped: `payments/gateway.py:1` adds a `PaymentGateway` class with one implementation and one caller. It looked like an unearned abstraction, but it wraps the payment provider's SDK at the boundary, which the category counts as earned.
