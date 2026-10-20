# Senior developer expert: sources, what was combined, and its skills

The first expert built from the catalogue (`docs/expert-catalogue.md`). The expert itself lives in `.cursor-plugin/ultimate-workflow/agents/uw-expert-developer.md` and `experts/developer/references/`.

## 1. The upstream agents compared

Twenty-two developer agents and skills from eleven repositories were fetched on 2026-10-20 and read in full, as data. Nothing was copied; the ideas kept are restated and credited in `experts/developer/NOTICE.md`.

| Source | Licence | Verdict | Kept | Left out, and why |
|---|---|---|---|---|
| affaan-m/ECC `code-reviewer` | MIT | Best general reviewer | The evidence gate before a finding, proof for high severity, the false-positive list (all already ours), one finding per repeated problem (new) | Length and nesting thresholds, security, React and performance sections (other experts), the cost-of-models addendum |
| affaan-m/ECC `silent-failure-hunter` | MIT | Thin but on target | Lost stack or cause, log-and-forget | "Zero tolerance" framing |
| affaan-m/ECC `code-simplifier`, `refactor-cleaner` | MIT | Editing agents | Already covered: unwind single-use helpers, dead code | Running knip, depcheck and ts-prune; editing code |
| affaan-m/ECC `python-reviewer`, `typescript-reviewer` | MIT | Language checklists | Go into the language skills below | Running linters and type checkers from the reviewer |
| anthropics `pr-review-toolkit` `code-reviewer` | Apache-2.0 | Precise and short | Check the diff against the project's written rules (new); a confidence threshold of 80 (ours is 8 of 10) | Its tie to one project's conventions |
| anthropics `pr-review-toolkit` `silent-failure-hunter` | Apache-2.0 | The deepest on failure handling | List the unrelated errors a broad catch would hide (ours), fallback to a mock outside tests (ours), retries that give up silently (new) | User-facing message review (UI), tie to one project's logging functions |
| anthropics `pr-review-toolkit` `code-simplifier`, `feature-dev` `code-reviewer` | Apache-2.0 | Duplicates of the above | Nothing new | |
| addyosmani `code-reviewer` agent | MIT | Generic five axes | Review the tests first; now partly ours (a test that cannot fail) | Praise section, the verdict template |
| addyosmani `code-simplification` skill | MIT | Strong, long | Chesterton's fence before calling something unnecessary (new) | Language before-and-after examples (they go to the language skills) |
| awesome-copilot `gem-reviewer` | MIT | Good procedure | Separate read from inferred evidence; stop after three empty searches (new) | Orchestrator handoff format |
| awesome-copilot `principal-software-engineer`, `janitor`, `gem-code-simplifier` | MIT | Personas or editing agents | Nothing | Persona ("as if you were Martin Fowler"), issue creation, aggressive deletion |
| agency-agents `minimal-change-engineer` | MIT | Excellent on scope | Every changed line traces to the task; changes outside the task as a finding (new) | Success metrics, persona |
| agency-agents `senior-developer`, `code-reviewer` | MIT | Off target | Nothing | One is about one frontend stack; the other is generic |
| alirezarezvani `karpathy-reviewer` | MIT | Overlaps our principles | Drive-by edits in untouched code | Running its Python checkers |
| wshobson `comprehensive-review` `code-reviewer` | MIT | Capability list | Nothing | No checklist, only a list of tools and topics |
| trailofbits `sharp-edges` | CC BY-SA 4.0 | Strong, but security | Zero or empty values that disable a check (already ours, ideas only) | The rest belongs to the security expert |

What our own measurements added, which no upstream agent has: a list that must be edited in step with the thing it describes (no reviewer found it on the general corpus), and narrowing tests from "out of scope" to one question (this expert missed a test that could not fail in every run).

## 2. What changed in the expert

- **Review checklist:** three new categories (change outside the task, a list that must be edited in step, a test that cannot fail), a wider swallowed-failure category, and five method rules (written project rules first, Chesterton's fence, stop after three empty searches, one finding per repeated problem, read versus inferred).
- **Build brief:** every changed line traces to the task; keep a property next to the thing; find out why something exists before removing it.
- **Plan reference:** unchanged.
- **Not remeasured yet.** The held-out split of the general review corpus (`evals/experts/corpus/review.json`, 11 cases) has not been used and is kept for this.

## 3. The skills this expert needs

A skill is loaded by the expert, by a cue, only when the change needs it. For each skill, the candidate sources from the 3,694 skill names in `docs/skills-catalog-2026-10-20.json`:

| # | Skill | Load when | Candidate sources |
|---|---|---|---|
| S0 | Engineering principles: SOLID, KISS, YAGNI, DRY and when not to apply it, composition over inheritance, command-query separation, least astonishment, fail fast, the Law of Demeter, and the design patterns most often misused | At plan, when the plan adds structure (a type hierarchy, an interface, a pattern, a shared helper); at review, when a finding rests on a principle and the expert must state the cost | Primary sources from the research pass: Martin's OCP paper, Liskov and Wing (via secondary sources), Sandi Metz "The Wrong Abstraction", Fowler on flag arguments and speculative generality, Google engineering practices on over-engineering, the GoF intents. Skills: ECC `coding-standards`, wshobson `python-design-patterns`, awesome-copilot `cloud-design-patterns`, tech-leads-club `modular-design-principles`, multica `karpathy-guidelines` |
| S1 | Failure handling | The diff adds or changes a catch, except, fallback, default-on-error, retry or Result handling | ECC `error-handling`; wshobson `error-handling-patterns`, `python-error-handling`; anthropics and ECC `silent-failure-hunter`; addyosmani `debugging-and-error-recovery` |
| S2 | Python craft | The diff touches `.py` files | ECC `python-patterns` and `python-reviewer`; wshobson `python-anti-patterns`, `python-type-safety`, `python-resource-management`, `async-python-patterns`; trailofbits `modern-python`; the Ruff and mypy rule families from the research pass |
| S3 | TypeScript and JavaScript craft | The diff touches `.ts`, `.tsx`, `.js` or `.mjs` files | ECC `typescript-reviewer`; wshobson `typescript-advanced-types`, `modern-javascript-patterns`, `nodejs-backend-patterns`; the typescript-eslint rule families from the research pass |
| S4 | Simplification and refactoring | At build on every change, and at review when the diff restructures existing code | addyosmani `code-simplification`; anthropics `code-simplifier`; awesome-copilot `refactor-method-complexity-reduce`; JuliusBrussee `safe-refactor` |
| S5 | Scope and surgical change | The diff touches many files, or mixes a refactor with a behaviour change | agency-agents `minimal-change-engineer`; JuliusBrussee `surgical-patch`; alirezarezvani `karpathy-coder`; multica `karpathy-guidelines` |
| S6 | Dependency discipline | A package manifest or lockfile changes | addyosmani dependency discipline (in `code-review-and-quality`); rmyndharis and wshobson `dependency-upgrade`; alirezarezvani `dependency-auditor`; the package-hallucination research. The audit itself stays a tool (`experts/deps-audit.js`, owned by security) |

| S7 | Go craft | The diff touches `.go` files | ECC `golang-patterns` and its `go-reviewer` agent; wshobson `go-concurrency-patterns`; rmyndharis `golang-pro`; trailofbits `sharp-edges` Go reference; `go vet` and staticcheck rule families |
| S8 | Rust craft | The diff touches `.rs` files | ECC `rust-patterns` and its `rust-reviewer` agent; trailofbits `rust-review`; wshobson `rust-async-patterns`, `memory-safety-patterns`; Clippy lint groups |
| S9 | Java craft | The diff touches `.java` files | ECC `java-coding-standards`, `springboot-patterns` and its `java-reviewer` agent; awesome-copilot `java-springboot`; trailofbits `sharp-edges` Java reference; Error Prone, SpotBugs and Checkstyle rule families |
| S10 | React craft (shared with the frontend expert) | The diff touches `.tsx` or `.jsx` components | vercel-labs and tech-leads-club `react-best-practices`; ECC `react-patterns` and its `react-reviewer` agent; tech-leads-club `react-composition-patterns`; wshobson `react-state-management`; awesome-copilot `react19-concurrent-patterns`. The developer loads it for component craft; the frontend expert owns rendering, state, accessibility and performance |

A language skill holds what is specific to the language: its idioms, its common mistakes and which of them its linter already catches. What is true in every language stays in the expert's checklist or in S0.

### How the principles reach the expert today, and what S0 adds

The principles are already in the checklist, but as checks with a cost rather than as names, because a principle name with no cost is not a finding:

| Principle | Where it is in the expert now |
|---|---|
| Single responsibility | "Two reasons to change" |
| Open/closed | "A growing type switch" |
| Liskov substitution | "Substitutability" |
| Interface segregation | "Interface too wide" |
| Dependency inversion | "Hard-wired dependency" |
| KISS, YAGNI | "Unearned abstraction", "Complexity moved, not removed", "Speculative generality" |
| DRY, and its limit | "Duplicate that already diverged"; intentional duplication is not reported |
| Command-query separation, least astonishment | "Wrong or hidden meaning" |
| Fail fast | "Swallowed failure" |
| Composition over inheritance | The build brief's subclassing rule |

S0 adds what the checklist cannot hold in one line each: the author's own definition of each principle, the common misreading of it, the counter-case where it should not be applied, which design patterns a language makes unnecessary, and the principles the checklist does not cover yet (the Law of Demeter, tell-don't-ask, high cohesion and low coupling, the rule of three). It is loaded when a plan adds structure or when a review finding rests on a principle, so the expert can name the principle and still has to show the cost.

**Built so far:** S0 `engineering-principles`, S1 `failure-handling`, S2 `python-craft`, S3 `typescript-craft`, S4 `simplification`, S5 `surgical-change`, S6 `dependency-discipline`, S7 `go-craft`, S8 `rust-craft`, S9 `java-craft` and S10 `react-craft`, all under `.cursor-plugin/ultimate-workflow/experts/skills/` and named in the developer's references with their cues.

Each skill is built the same way as the expert: fetch the candidates, read them, keep what adds a specific check, restate it, credit it, and measure it where the corpus can.
