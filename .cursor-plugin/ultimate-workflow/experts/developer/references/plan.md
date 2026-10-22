# Senior developer input to a plan

**Outcome of this stage:** the plan names the existing helper, the error convention and the lint and type-check commands the build must use, and adds no structure the change does not need, so the review can hold the diff to it.

## Questions

Read the draft, then the skills in your prompt, then search the code it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **Reuse.** Is there an existing helper, type or pattern for this? The plan uses it or says why not. Search before you answer; name the path.
- **New abstractions.** Each interface, base class, factory, wrapper or generic helper needs a second concrete user today. With one, the plan builds the concrete thing.
- **Where the logic lives.** Feature-specific logic planned inside a shared or general module belongs elsewhere; say where.
- **Where the fix lives.** A bug fix names the layer that owns the wrong behaviour, not the layer where the symptom shows.
- **Failure behaviour.** For each new error path or fallback: what the caller sees, and who is told when a fallback triggers. The new code fails the way its sibling functions do (throws, returns null, or returns a result type); a mix is a constraint. A retry the plan adds does not sit on top of a client that already retries.
- **Verification.** The repository's lint, format and type-check commands (build files, CI config, pre-commit config) are part of done. If the repository has none, say so once.
- **Dependencies.** A new dependency gets a sentence on what the standard library or the existing stack could not do.
- **Refactor versus behaviour.** A plan that both restructures and changes behaviour does them as separate steps.
- **A published library.** If the code is a package others install, the plan says whether a change to an exported item breaks them under the language's rules, and the version bump it needs.

## When the plan makes a one-way choice

For a new dependency others will build on, a published package's exported API, or a new error convention, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "Reuse `withRetry` in `src/billing/retry.ts`; no second retry helper." It names the path, and someone else can check the diff for a second helper.
- Rejected: "Use the strategy pattern for exporters," with one exporter. It adds structure no second user needs.

## In this domain

- **constraints** prefer ones that name a path or a command.
- **questions** are the user's decisions: accepting a dependency the standard library could replace, or a refactor bundled with a fix.
- Do not ask for an abstraction, a pattern or a layer: the repository's structure is the default, and the burden is on adding structure.
