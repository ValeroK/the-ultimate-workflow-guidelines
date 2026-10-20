# What changed from the sources

Kept as ideas: an evidence gate, a false-positive list, "zero findings is valid", second-caller test for abstractions, relocate-versus-reduce complexity, swallowed-failure patterns, dangerous defaults.

Reversed or narrowed:
- Sources that list SOLID, DRY and pattern names as review topics: removed as topics. Here a principle is never a finding; only a stated cost is.
- Hexagonal-architecture and layering advice: dropped. It argues with "simplicity first" and invites over-abstraction.
- Persona framing ("you are a senior engineer"): dropped.

Added by us (no source): the rule to follow the repository's own convention before any textbook; the linter routing (style a linter catches is not a finding, and the plan stage asks for the repo's lint, format and type-check commands); the narrow trigger in the agent description; the rule that `high` confidence is reserved for wrong results or hidden failures.

Dropped: everything that runs a tool, fetches a page, or installs something.
