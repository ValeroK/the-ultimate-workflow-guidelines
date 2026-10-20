# What changed from the sources

Kept as ideas: an evidence gate, a false-positive list, "zero findings is valid", second-caller test for abstractions, relocate-versus-reduce complexity, swallowed-failure patterns, dangerous defaults.

Reversed or narrowed:
- Sources that list SOLID, DRY and pattern names as review topics: removed as topics. Here a principle is never a finding; only a stated cost is.
- Hexagonal-architecture and layering advice: dropped. It argues with "simplicity first" and invites over-abstraction.
- Persona framing ("you are a senior engineer"): dropped.

Added by us (no source): the rule to follow the repository's own convention before any textbook; the linter routing (style a linter catches is not a finding, and the plan stage asks for the repo's lint, format and type-check commands); the narrow trigger in the agent description; the rule that `high` confidence is reserved for wrong results or hidden failures.

Dropped: everything that runs a tool, fetches a page, or installs something.

## 2026-10-20: web access and a first source pass

- The agent can search the web and fetch pages (plan and review only); its review text no longer says it has no network.
- New category, resource not released (scoped cleanup; supported by the Python, Go and .NET documentation).
- New dependency now includes "cannot confirm the package is real".
- Do-not-report list: patterns the language makes unnecessary, a top-level catch that logs and keeps the process alive, a stated-invariant unwrap, the flag exceptions Fowler names.
- Not remeasured. The recorded eval results describe the text before this change. These additions are not exercised by the frozen corpus, so a rerun could only show whether they add false positives.

## 2026-10-20: combined with the upstream developer agents

- Tests the diff adds or changes are now in scope for one question: would the test fail if the change it covers were reverted? (A new category, a test that cannot fail. The expert missed such a test in every run on the general review corpus.)
- New category: a list that must be edited in step with the thing it describes. (No reviewer found this on the general review corpus.)
- New category: change outside the task.
- Swallowed failure now also covers a lost cause, a retry that gives up silently, and log-and-continue.
- Method: read the project's written rules first; Chesterton's fence before calling something unnecessary; stop after three empty searches; one finding per repeated problem; mark read versus inferred evidence.
- Build brief: every changed line traces to the task; keep a property next to the thing; find out why something exists before removing it.
- Not taken: personas, capability lists, length and nesting thresholds, praise sections, language-specific rules (they go to skills), anything that runs tools or edits code.
- Not remeasured yet. The held-out split of the general review corpus is reserved for this change.

## 2026-10-20: first shared skills

- The plan and review references name two shared skills with their cues: `engineering-principles` (exact meaning, misreading, counter-case of each principle and pattern) and `failure-handling` (questions per handler, hiding patterns by language, retries, cleanup, what is not a finding).
- Not measured yet. The held-out split of the general review corpus is still reserved.

- Later the same day: the review reference also names `python-craft` and `typescript-craft`, loaded by file type.
- Then `simplification`, `surgical-change` and `dependency-discipline` (review), and `dependency-discipline` (plan).
