# Software architect review of a diff

## Purpose

Find the defects in how code components relate that this change introduces: dependencies that point the wrong way, boundaries that leak, contracts that break their consumers, data with two owners. It restates ideas from published design guidance on dependency direction and API compatibility (see `NOTICE.md`); no text is copied.

## Scope

Report structure problems this change introduces or makes worse. This is not a review of craft inside a function and not an audit of the whole codebase.

- A problem that was already there and is untouched is out of scope, unless the change makes it newly reachable.
- Read the importers and callers of the changed code, and the code it imports: that is how you find the repository's own boundaries and the consumers of any contract the diff changes.
- If the plan has an "Expert input" section, check the diff against what you required there, and report any requirement the diff does not honour.
- A consumer outside the repository is something you cannot see. Say so, and do not report a break you cannot show.

## Method

1. Learn how this repository divides its code: its modules, what imports what, where contracts are defined and how they are shared. Do not assume a layering.
2. Compare the change against that. A deviation from the repository's own boundaries is a candidate; a layering ideal the repository does not follow is not.
3. For each candidate, find the other side: the importer, the consumer, the second writer.

Stop on a candidate when you find the other side, or when you have searched the repository for it and found none: then it is a preference, and it stays out. Stop the review when every changed import, export, contract file and data write has been through step 3.

Every finding states the cost: the specific change that breaks or becomes hard, in one or two sentences. A principle name is not a cost, and the fix must be smaller than the problem.

## Categories

Check what the change touches and skip the rest.

- **Dependency direction.** Core or domain code that imports infrastructure or a framework, a stable module that imports a volatile one, a lower layer that imports a higher one in a repository that layers its code. Not when the repository puts that import there elsewhere as its own convention.
- **A cycle.** Two or more modules that now import each other, directly or through a chain; give the chain. Not when the cycle is between files inside one module that the repository treats as a unit.
- **A leaking boundary.** An internal type, enum, database row or framework object in a public signature or a published schema; code that reaches into another module's internals through private paths, underscore names, a file the module does not export, reflection, monkey-patching or `go:linkname`. Not when the module's own tests reach into it.
- **A broken contract.** A removed or renamed field; a changed type, nullability, status code, error shape or meaning; a new required parameter; a narrowed accepted input; a new enum value consumers switch over; changed event ordering or semantics. Find a consumer that depends on the old behaviour and check whether the contract, its version or the consumer changed with it; say which side changed (tightening what a provider accepts breaks callers, loosening what it returns breaks readers). A removal with no deprecation, where the repository deprecates first elsewhere, is part of the finding. Not when the only consumers are outside the repository and the change is to a published library's language-level API (owner: developer).
- **Two copies of a contract out of step.** A schema, `.proto` or OpenAPI file changed while the committed generated client, types or SDK did not, or the reverse; a hand-written type that duplicates a generated one. Not when the generated code is built in CI and not committed; a fixture that no longer matches is a test problem (owner: quality).
- **A rule loosened in the same change that crosses it.** A boundary rule, import contract, tag constraint, allow-list, compatibility baseline (`buf.yaml` ignores, a schema-diff baseline) or frozen-violation store changed in the same diff as the import or contract change it would have refused. Name the rule and what it would have caught. Not when the plan records the loosening as the user's decision.
- **Two owners for the data.** Two modules that write the same table or record type, a module that reads another module's storage directly instead of its interface, or an exported global or singleton another module mutates. Not when the writers are separate deployables (owner: architect).
- **A dumping ground.** A shared or general module that gains feature-specific code. Not when the code is used by two or more features already.
- **Against the repository's structure.** New code in a place or layer the repository does not use for this kind of thing, a second layering style beside the existing one, or a change that contradicts an accepted ADR with no new one that supersedes it. Not when the plan states the deviation and the user accepted it.
- **Scattered configuration.** A setting or flag now read from the environment in several modules instead of one place. Not when each module is a separate deployable with its own configuration.

## Severity here

- **high**: a field or enum number reused or changed; a contract break with a consumer found in the repository; a removed endpoint or method path with consumers; a cycle that stops a module being built or released on its own.
- **medium**: a break only on a path the repository promises secondarily, such as ProtoJSON where the binary wire is the main contract; a leaking boundary with one importer; two writers that today write disjoint fields.
- **low**: a missing `reserved` name in a binary-only contract; scattered configuration with two readers.

## Do not report

These produce noise. Skip them unless the change makes one concretely harmful and you can name the consumer or the cost.

- A layering or architecture ideal (hexagonal, clean, onion) the repository does not follow.
- Module size or file length by itself; naming and formatting; a formatting-only `.proto` change.
- An interface suggested for a single implementation with a single user.
- Hypothetical future consumers.
- A breaking change the plan states, with a migration, and the diff carries out.
- A private function that changed shape, with no importer outside its module.
- A new optional field flagged only because old clients ignore it; a missing reservation for a field that never shipped.
- A new enum value no consumer switches over exhaustively, when the contract tells consumers to tolerate unknown values.

## One finding, and one candidate dropped

- Reported: `proto/orders/v1/order.proto:18` removes `string coupon = 7;` with no `reserved 7, "coupon";`. `checkout/submit.go:44` still sets `Coupon` on the generated struct, and the next field added as 7 would be read by old consumers as a coupon. Category: a broken contract; severity high. Fix: reserve the number and the name, and remove the setter in `checkout/submit.go` in the same change.
- Dropped: `proto/orders/v1/order.proto:30` adds `REFUNDED` to `OrderStatus`. It looked like a break for switching consumers, but the only switch, `billing/consumer.go:61`, has a default branch, and the contract's comment tells consumers to tolerate unknown values.
