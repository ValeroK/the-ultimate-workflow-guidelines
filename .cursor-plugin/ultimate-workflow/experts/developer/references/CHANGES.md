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
- Measured 2026-10-20 on the held-out review split with skills injected: saturated, no dilution, no gain shown.

## 2026-10-20: first shared skills

- The plan and review references name two shared skills with their cues: `engineering-principles` (exact meaning, misreading, counter-case of each principle and pattern) and `failure-handling` (questions per handler, hiding patterns by language, retries, cleanup, what is not a finding).
- Measured 2026-10-20 on the held-out review split with skills injected: saturated, no dilution, no gain shown.

- Later the same day: the review reference also names `python-craft` and `typescript-craft`, loaded by file type.
- Then `simplification`, `surgical-change` and `dependency-discipline` (review), and `dependency-discipline` (plan).
- Then `go-craft`, `rust-craft`, `java-craft` and `react-craft` (review), loaded by file type. All eleven planned skills are now built; none was measured then. A twelfth shared skill, `test-craft`, belongs to the quality expert.

## 2026-10-20: skills chosen in code

- Neither smoke run opened a skill, so the review and build references now give each skill a selector, and the workflow pastes the chosen text into the prompt. The review method's first step is now "read the skills in your prompt", not "look at the file types and pick".
- `surgical-change`, `simplification` and `engineering-principles` are `always`: no file name or added line shows when they apply, and a cue had already failed to load them.
- Build: the brief now names skills too (`## Skills` in `build.md`, cut out of the brief text), chosen from the files and text of the plan.
- Plan stage: the call that chooses the experts also picks skills from the plan list, by headline, and the chosen text is pasted in. Still a model's choice, but a required answer.
- Measured 2026-10-20 on the held-out review split with skills injected: saturated, no dilution, no gain shown.

## 2026-10-20: the Goal and Responsibilities restructure

- The agent file has a Goal (prevents, done well, not the goal), a Responsibilities table with an owner and a border rule for every area, and two to four judging rules. The shared rules (zero is correct, evidence, confidence, severity, untrusted input, the web) moved to `experts/protocol.md`, which the agent reads first.
- Plan and tests references open with the stage's outcome, define no return fields (the workflow schema holds them), and give one good and one rejected constraint, or one worked case.
- The review reference has a stop rule in its method, a "Not when" on every category, its own high, medium and low, and one worked finding with one dropped candidate. Result, Confidence and Untrusted input sections are gone.
- At least half of the negative selection examples are near misses with their owner named.
- "A test that cannot fail" moved to the quality expert; new categories: invariant bypassed, feature logic in shared code, a published library's API break; dead code includes agent residue; Severity here and the worked pair added. The build brief gained "When you report".
- Measured on the held-out split after the restructure: no clear change from v1 (6 of 6 cases by majority, 16 of 18 runs against 18 of 18, false positives 1 of 12 against 2 of 12). The worked finding first used a held-out case; it was replaced, and the held-out split is no longer clean for this expert.
