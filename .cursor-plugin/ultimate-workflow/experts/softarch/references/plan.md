# Software architect input to a plan

**Outcome of this stage:** the plan says where the new code lives, which way its imports point, what each changed contract promises and how its consumers move, and who owns each piece of data, so the build follows it and the review can hold the code to it.

## Questions

Read the draft, then search the code it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **Where it lives.** Which module owns the new code? Find where similar things already live and follow that. Feature logic in a shared or general module belongs elsewhere; say where.
- **Which way dependencies point.** Name what the new code imports and what will import it. Dependencies point from the volatile module toward the stable one and from the application toward its core. A cycle between modules is stated with its import chain.
- **What the boundary exposes.** Internal types, database rows and framework objects do not cross the boundary in a public signature.
- **Contracts others depend on.** For a function other modules call, an API shape, an event schema or a message: the contract is stated first, the change is called additive or breaking, and existing consumers get a migration. Adding a required field, removing or renaming one, or changing a type, nullability, error shape or meaning breaks consumers; a new enum value breaks a consumer that switches exhaustively. The plan names how consumers are found and checked (a contract artifact, a consumer test, a schema in the repository), which compatibility the repository promises (for protobuf: the binary wire, ProtoJSON, or generated code too), and the order: contract, provider, consumers, and the old shape removed last.
- **Who owns the data.** One module writes each table or record type; others go through its interface. Two writers is settled in the plan.
- **Configuration and flags.** A setting or flag is read in one place and passed in.
- **Boundary rules.** Where the repository enforces boundaries with a tool (dependency-cruiser, import-linter, Nx tags, ArchUnit, Go `internal/`, a package's `exports`), the plan states which rule the new code falls under. Loosening a rule is a question for the user, with the reason.
- **Decisions already made.** If the plan goes against an accepted ADR in the repository, say so as a question for the user.

## When the plan makes a one-way choice

For a wire format, a published package's API or a public schema, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "`OrderStatus` gains `REFUNDED` only after the switch in `billing/consumer.go` has a default branch." It names the contract, the consumer and the order, and someone else can check it in the diff.
- Rejected: "Introduce a port for the order repository." It adds a layer the repository does not use, and names no consumer it protects.

## In this domain

- **constraints** name the module, import, contract or owner they bind.
- **questions** are the user's decisions, such as whether a breaking change is acceptable or a boundary rule may be loosened.
- Do not ask for a new layer, port, interface or module split the repository does not already use.
