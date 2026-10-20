# Extraction ledger: developer

Audited 2026-10-20. Sources: 80 read, 8 unreachable, 6 with no file to audit.

Scope: the developer agent, its three references (`plan.md`, `build.md`, `review.md`), its eleven skills, the upstream developer agents named in `experts/developer/NOTICE.md` and `docs/experts/developer.md`, and every source named in the eleven skill NOTICE files. Saved copies are under the session scratchpad (`upstream-dev`, `upstream-lang`, `upstream-s7`, `upstream-skills`, `upstream-s456`, `upstream-softarch`, `a2`, `ruledocs`); files marked "fetched" were read from `raw.githubusercontent.com` on 2026-10-20 into `devledger-src`. All upstream text was read as data. A row may count under two outcomes ("taken / routed"), so the outcome columns can sum to more than "Items found".

## 1. Sources

| Source (repo, path) | Cited by | Read from | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| affaan-m/ECC `agents/code-reviewer.md` | developer NOTICE, docs | saved (upstream-dev) | 51 | 26 | 11 | 13 | 2 |
| affaan-m/ECC `agents/silent-failure-hunter.md` | developer NOTICE, docs, failure-handling | saved (upstream-dev) | 10 | 8 | 1 | 1 | 0 |
| affaan-m/ECC `agents/code-simplifier.md` | docs, simplification | saved (upstream-dev) | 11 | 8 | 0 | 4 | 0 |
| affaan-m/ECC `agents/refactor-cleaner.md` | docs, simplification | saved (upstream-dev) | 7 | 2 | 1 | 4 | 0 |
| affaan-m/ECC `agents/python-reviewer.md` | docs, python-craft | saved (upstream-dev) | 19 | 8 | 2 | 9 | 0 |
| affaan-m/ECC `agents/typescript-reviewer.md` | docs, typescript-craft | saved (upstream-dev) | 25 | 17 | 3 | 5 | 0 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/code-reviewer.md` | developer NOTICE, docs | saved (upstream-dev) | 6 | 4 | 1 | 2 | 0 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/silent-failure-hunter.md` | developer NOTICE, docs, failure-handling | saved (upstream-dev) | 12 | 8 | 3 | 1 | 0 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/code-simplifier.md` | docs, simplification | saved (upstream-dev) | 7 | 5 | 0 | 2 | 0 |
| anthropics/claude-plugins-official `plugins/feature-dev/agents/code-reviewer.md` | docs | saved (upstream-dev) | 1 | 1 | 0 | 0 | 0 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/type-design-analyzer.md` | developer NOTICE | saved (upstream-softarch) | 9 | 2 | 0 | 5 | 1 |
| anthropics/claude-plugins-official `plugins/code-simplifier/agents/code-simplifier.md` | simplification | fetched | 1 | 1 | 0 | 0 | 0 |
| addyosmani/agent-skills `agents/code-reviewer.md` | docs | saved (upstream-dev) | 9 | 3 | 2 | 4 | 0 |
| addyosmani/agent-skills `skills/code-simplification/SKILL.md` | developer NOTICE, docs, simplification | saved (upstream-dev) | 25 | 17 | 0 | 8 | 0 |
| addyosmani/agent-skills `skills/code-review-and-quality/SKILL.md` | developer NOTICE, dependency-discipline | saved (a2) | 30 | 13 | 6 | 9 | 3 |
| addyosmani/agent-skills `skills/api-and-interface-design/SKILL.md` | developer NOTICE | saved (upstream-softarch) | 14 | 2 | 7 | 2 | 3 |
| github/awesome-copilot `agents/gem-reviewer.agent.md` | developer NOTICE, docs | saved (upstream-dev) | 7 | 5 | 0 | 2 | 0 |
| github/awesome-copilot `agents/principal-software-engineer.agent.md` | docs | saved (upstream-dev) | 4 | 1 | 0 | 3 | 0 |
| github/awesome-copilot `agents/janitor.agent.md` | docs | saved (upstream-dev) | 6 | 2 | 2 | 2 | 0 |
| github/awesome-copilot `agents/gem-code-simplifier.agent.md` | docs | saved (upstream-dev) | 5 | 2 | 1 | 2 | 0 |
| msitarzewski/agency-agents `engineering/engineering-minimal-change-engineer.md` | developer NOTICE, docs, surgical-change | saved (upstream-dev) | 14 | 10 | 1 | 2 | 1 |
| msitarzewski/agency-agents `engineering/engineering-senior-developer.md` | docs | saved (upstream-dev) | 3 | 1 | 1 | 1 | 0 |
| msitarzewski/agency-agents `engineering/engineering-code-reviewer.md` | docs | saved (upstream-dev) | 6 | 4 | 1 | 1 | 0 |
| alirezarezvani/claude-skills `engineering/karpathy-coder/agents/karpathy-reviewer.md` | developer NOTICE, docs, surgical-change | saved (upstream-dev) | 7 | 4 | 2 | 1 | 0 |
| wshobson/agents `plugins/comprehensive-review/agents/code-reviewer.md` | docs | saved (upstream-dev) | 3 | 0 | 2 | 1 | 0 |
| trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/SKILL.md` | developer NOTICE, docs, failure-handling | saved (upstream-dev) | 11 | 2 | 5 | 3 | 1 |
| affaan-m/ECC `skills/error-handling/SKILL.md` | failure-handling | saved (upstream-skills) | 16 | 7 | 5 | 3 | 1 |
| wshobson/agents `error-handling-patterns/SKILL.md` | failure-handling | saved (upstream-skills; SKILL.md only) | 8 | 7 | 1 | 0 | 0 |
| wshobson/agents `python-error-handling/SKILL.md` | failure-handling | saved (upstream-skills) | 7 | 2 | 0 | 5 | 0 |
| python/cpython `Doc/tutorial/errors.rst` | failure-handling, developer NOTICE | fetched | 5 | 4 | 0 | 0 | 1 |
| golang/website `_content/doc/effective_go.html` | failure-handling, developer NOTICE | fetched | 5 | 3 | 0 | 1 | 1 |
| rust-lang/book `src/ch09-02-...`, `src/ch09-03-...` | failure-handling, developer NOTICE | fetched | 3 | 3 | 0 | 0 | 0 |
| dotnet/docs `docs/standard/exceptions/best-practices-for-exceptions.md` | failure-handling, developer NOTICE | fetched | 6 | 3 | 0 | 2 | 1 |
| affaan-m/ECC `skills/python-patterns/SKILL.md` | python-craft | saved (upstream-lang) | 12 | 5 | 1 | 6 | 2 |
| wshobson/agents `python-anti-patterns/SKILL.md` | python-craft | saved (upstream-lang) | 13 | 6 | 2 | 3 | 3 |
| wshobson/agents `python-resource-management/SKILL.md` | python-craft | saved (upstream-lang; SKILL.md only) | 6 | 2 | 1 | 1 | 2 |
| wshobson/agents `python-type-safety/SKILL.md` | python-craft | saved (upstream-lang; SKILL.md only) | 5 | 3 | 0 | 2 | 0 |
| wshobson/agents `async-python-patterns/SKILL.md` | python-craft | saved (upstream-lang) | 7 | 6 | 0 | 1 | 0 |
| trailofbits/skills `sharp-edges/references/lang-python.md` | python-craft | saved (upstream-lang) | 14 | 8 | 2 | 3 | 1 |
| trailofbits/skills `modern-python/SKILL.md` | python-craft | saved (upstream-lang) | 4 | 0 | 1 | 1 | 2 |
| astral-sh/ruff `crates/ruff_linter/src/codes.rs` | python-craft, developer NOTICE | saved (ruledocs) | 10 | 1 | 0 | 0 | 9 |
| trailofbits/skills `sharp-edges/references/lang-javascript.md` | typescript-craft | saved (upstream-lang) | 14 | 12 | 0 | 1 | 2 |
| wshobson/agents `typescript-advanced-types`, `modern-javascript-patterns`, `nodejs-backend-patterns` | typescript-craft | saved (upstream-lang; SKILL.md only) | 8 | 3 | 2 | 3 | 0 |
| typescript-eslint `packages/eslint-plugin/docs/rules/*.mdx` (14 files); eslint `docs/src/rules/*.md` (4 files) | typescript-craft, developer NOTICE | fetched | 7 | 1 | 0 | 0 | 6 |
| microsoft/TypeScript-Website `packages/tsconfig-reference/copy/en/options/*.md` (6 files) | typescript-craft | fetched | 2 | 1 | 0 | 0 | 1 |
| affaan-m/ECC `agents/react-reviewer.md` | react-craft | saved (upstream-s7) | 14 | 7 | 4 | 2 | 1 |
| affaan-m/ECC `skills/react-patterns/SKILL.md` | react-craft | saved (upstream-s7) | 9 | 5 | 2 | 1 | 1 |
| vercel-labs/agent-skills `skills/react-best-practices/SKILL.md` | react-craft | saved (upstream-s7; index only) | 10 | 8 | 1 | 1 | 0 |
| tech-leads-club/agent-skills `react-composition-patterns/SKILL.md` | react-craft | saved (upstream-s7; index only) | 4 | 1 | 0 | 3 | 0 |
| wshobson/agents `react-state-management/SKILL.md` | react-craft | saved (upstream-s7; SKILL.md only) | 5 | 3 | 0 | 1 | 1 |
| facebook/react `eslint-plugin-react-hooks`; jsx-eslint/eslint-plugin-react `docs/rules/*.md` | react-craft | saved (ruledocs) and fetched | 3 | 1 | 0 | 0 | 2 |
| affaan-m/ECC `agents/go-reviewer.md` | go-craft | saved (upstream-s7) | 17 | 13 | 3 | 3 | 0 |
| affaan-m/ECC `skills/golang-patterns/SKILL.md` | go-craft | saved (upstream-s7) | 13 | 8 | 2 | 3 | 1 |
| trailofbits/skills `sharp-edges/references/lang-go.md` | go-craft | saved (upstream-s7) | 10 | 8 | 1 | 1 | 0 |
| wshobson/agents `go-concurrency-patterns/SKILL.md` | go-craft | saved (upstream-s7; SKILL.md only) | 5 | 2 | 1 | 1 | 1 |
| `go vet` documentation; golangci-lint reference configuration | go-craft, developer NOTICE | saved (ruledocs) | 8 | 1 | 0 | 0 | 7 |
| affaan-m/ECC `agents/rust-reviewer.md` | rust-craft | saved (upstream-s7) | 19 | 13 | 2 | 5 | 1 |
| affaan-m/ECC `skills/rust-patterns/SKILL.md` | rust-craft | saved (upstream-s7) | 10 | 5 | 2 | 3 | 0 |
| trailofbits/skills `sharp-edges/references/lang-rust.md` | rust-craft | saved (upstream-s7) | 11 | 7 | 0 | 3 | 1 |
| trailofbits/skills `rust-review/SKILL.md` | rust-craft | saved (upstream-s7) | 5 | 2 | 0 | 2 | 1 |
| wshobson/agents `rust-async-patterns/SKILL.md` | rust-craft | saved (upstream-s7; SKILL.md only) | 6 | 4 | 0 | 1 | 1 |
| rust-lang/rust-clippy lint sources and changelog; rustc lint sources | rust-craft | saved (ruledocs) | 6 | 1 | 0 | 0 | 5 |
| affaan-m/ECC `agents/java-reviewer.md` | java-craft | saved (upstream-s7) | 21 | 9 | 7 | 4 | 2 |
| affaan-m/ECC `skills/java-coding-standards/SKILL.md` | java-craft | saved (upstream-s7) | 6 | 3 | 1 | 2 | 0 |
| trailofbits/skills `sharp-edges/references/lang-java.md` | java-craft | saved (upstream-s7) | 13 | 9 | 1 | 2 | 1 |
| spotbugs/spotbugs `messages.xml` | java-craft | saved (ruledocs) | 8 | 1 | 0 | 0 | 7 |
| google/error-prone `docs/bugpattern/*.md` (7 files) | java-craft | fetched | 4 | 1 | 0 | 0 | 3 |
| alirezarezvani/claude-skills `dependency-auditor/SKILL.md` | dependency-discipline | saved (upstream-s456) | 4 | 3 | 1 | 1 | 1 |
| wshobson/agents `dependency-upgrade/SKILL.md` | dependency-discipline | saved (upstream-s456) | 6 | 2 | 2 | 2 | 1 |
| alirezarezvani/claude-skills `karpathy-coder/SKILL.md` | surgical-change | saved (upstream-s456) | 9 | 5 | 2 | 2 | 0 |
| multica-ai/andrej-karpathy-skills `karpathy-guidelines/SKILL.md` | surgical-change, engineering-principles | saved (upstream-skills) | 2 | 2 | 0 | 0 | 0 |
| JuliusBrussee/caveman `surgical-patch` | surgical-change | saved (upstream-s456) | 4 | 3 | 1 | 0 | 0 |
| JuliusBrussee/caveman `safe-refactor` | simplification | saved (upstream-s456) | 5 | 3 | 0 | 2 | 0 |
| github/awesome-copilot `skills/refactor-method-complexity-reduce/SKILL.md` | simplification | saved (upstream-s456) | 3 | 1 | 1 | 1 | 0 |
| wshobson/agents `python-design-patterns/SKILL.md` | engineering-principles | saved (upstream-skills; SKILL.md only) | 8 | 4 | 1 | 3 | 0 |
| affaan-m/ECC `skills/coding-standards/SKILL.md` | engineering-principles | saved (upstream-skills) | 5 | 1 | 1 | 4 | 0 |
| tech-leads-club/agent-skills `modular-design-principles/SKILL.md` | engineering-principles | saved (upstream-skills) | 4 | 0 | 4 | 0 | 0 |
| google/eng-practices `review/reviewer/looking-for.md`, `standard.md`, `comments.md` | developer NOTICE, engineering-principles | fetched | 13 | 8 | 0 | 5 | 0 |
| microsoft/code-with-engineering-playbook `docs/code-reviews/README.md`, `process-guidance/reviewer-guidance.md` | developer NOTICE | fetched | 6 | 3 | 2 | 1 | 0 |
| addyosmani/agent-skills `skills/debugging-and-error-recovery/SKILL.md` | docs (candidate only) | saved (upstream-skills) | 5 | 2 | 1 | 2 | 0 |
| Sandi Metz, "The Wrong Abstraction" | developer NOTICE, engineering-principles | unreachable (403) | - | - | - | - | - |
| Martin Fowler, "Flag Argument" | developer NOTICE | unreachable (403) | - | - | - | - | - |
| Martin Fowler, "Yagni" and "Speculative Generality" | engineering-principles | unreachable (403) | - | - | - | - | - |
| Robert C. Martin, "The Open-Closed Principle" (objectmentor.com PDF) | developer NOTICE, engineering-principles | unreachable (connection failed) | - | - | - | - | - |
| Liskov and Wing, "A Behavioral Notion of Subtyping" (1994) | engineering-principles | unreachable (403) | - | - | - | - | - |
| Perry et al., CCS 2023 | developer NOTICE | unreachable (403, arXiv) | - | - | - | - | - |
| Pearce et al., IEEE S&P 2022 | developer NOTICE | unreachable (403, arXiv) | - | - | - | - | - |
| Spracklen et al., USENIX Security 2025 | developer NOTICE, dependency-discipline | unreachable (403, arXiv and usenix.org) | - | - | - | - | - |
| Robert C. Martin, Clean Architecture ("one actor") | engineering-principles | no file to audit (book) | - | - | - | - | - |
| Bertrand Meyer, open/closed and command-query separation | engineering-principles | no file to audit (book) | - | - | - | - | - |
| Gamma, Helm, Johnson, Vlissides, Design Patterns | engineering-principles | no file to audit (book) | - | - | - | - | - |
| Ron Jeffries on YAGNI | engineering-principles | no file to audit (no page cited) | - | - | - | - | - |
| GitClear 2025 report | developer NOTICE | no file to audit (no URL cited) | - | - | - | - | - |
| mypy strict; Checkstyle | developer NOTICE | no file to audit (tool families, no page or rule cited) | - | - | - | - | - |

"docs" in the Cited-by column is `docs/experts/developer.md`. Totals over the 80 read sources: 736 item rows; taken 382, routed 110, rejected 180, missing 81 (rows with two outcomes count under both; two rows record an attribution check and carry no outcome).
## 2. Items, per source

Outcome words: **taken** (it is in a developer file today), **routed** (another expert or skill owns it), **rejected** (with the reason), **missing** (worth taking, not taken). "3b" means the pending prompt 3b (library API compatibility), which will add a public-API section to the five language skills; those items are routed there and not repeated in section 4.

### A. Upstream developer agents (developer `NOTICE.md`, `docs/experts/developer.md`)

### affaan-m/ECC `agents/code-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Read callers, imports and tests before reporting | taken | `review.md` Method pass 1, Scope "you may read callers" | pass |
| Report only above about 80 percent confidence | taken | `review.md` Confidence (8 of 10); protocol | pass |
| Skip style unless it breaks a project convention | taken | `review.md` Scope (linter style out), Do not report | pass |
| Skip unchanged code, except a critical security issue | taken / routed | `review.md` Scope; the exception is security's | pass |
| Consolidate a repeated problem into one finding | taken | `review.md` Result "Report a repeated problem once" | pass |
| Gate: cite the exact line | taken | protocol Evidence; `review.md` Result | pass |
| Gate: name input, state and bad outcome | taken | `review.md` Result "the cost" | pass |
| Gate: check whether a caller or a type already handles it | taken | `review.md` Do not report "error handling upstream" | pass |
| High severity needs snippet, scenario and why existing guards do not catch it | missing | the "why guards miss it" part; proposed home `review.md` "Severity here" | pass |
| Zero findings is valid; manufactured findings are the main failure | taken | protocol "Zero is a correct answer" | pass |
| FP: error handling done by caller or framework (error middleware, error boundary) | taken | `review.md` Do not report; `failure-handling` Not a finding | pass |
| FP: missing validation in an internal function | taken | `review.md` Do not report | pass |
| FP: well-known constants as magic numbers | taken | `review.md` Do not report "obvious constant" | pass |
| FP: length of switch, config, tables, generated code | taken | `review.md` Do not report | pass |
| FP: missing JSDoc on self-describing helpers | taken | `python-craft` Not a finding (docstrings) | pass |
| FP: prefer const over let when reassigned | rejected | a linter enforces it (`prefer-const`) | fails 4 |
| FP: possible null dereference when a guard or narrowing is in scope | missing | proposed home `review.md` Do not report | pass |
| FP: N+1 on fixed-cardinality loops | routed | performance and data experts (planned) | n/a |
| FP: missing await on intentionally detached call | taken | `failure-handling` Not a finding; `typescript-craft` Not a finding | pass |
| FP: "should use TypeScript" in a JS file | taken | `review.md` Do not report "a missing pattern the repository does not use" | pass |
| FP: hardcoded values in fixtures | taken | `review.md` Do not report | pass |
| FP: security theatre (Math.random for jitter) | routed | security | n/a |
| Security checklist (secrets, injection, XSS, path traversal, CSRF, auth, vulnerable deps, secrets in logs) | routed | security | n/a |
| Functions over 50 lines, files over 800, nesting over 4 | rejected | thresholds; length is not a cost (`review.md` Do not report) | fails 1 |
| Unhandled rejections, empty catch | taken | `failure-handling`; `typescript-craft` table | pass |
| Prefer immutable operations | rejected | opinion; only shared mutable state is a finding (taken) | fails 2 |
| console.log left in | rejected | a linter enforces it (`no-console`, Ruff T20) | fails 4 |
| Missing tests for new paths | routed | quality | n/a |
| Dead code, commented-out code, unused imports | taken | `review.md` "Dead code introduced"; linters for imports | pass |
| React: incomplete dependency arrays | taken | `react-craft` table (`exhaustive-deps`) | pass |
| React: setState during render loops | rejected | fails at first render in development | fails 1 |
| React: index keys on reorderable lists | taken | `react-craft` | pass |
| React: prop drilling over 3 levels | rejected | threshold; `react-craft` Not a finding (one or two levels) | fails 1 |
| React: unnecessary re-renders, memoisation | routed | frontend expert (planned) | n/a |
| React: hooks in Server Components | rejected | the framework refuses it at build | fails 4 |
| React: missing loading and error states | routed | frontend expert (planned) | n/a |
| React: stale closures | taken | `react-craft` Effects | pass |
| Backend: unvalidated input, rate limiting, CORS, error leakage | routed | security | n/a |
| Backend: unbounded queries, N+1 | routed | data and performance experts (planned) | n/a |
| Backend: external calls without timeouts | taken | `typescript-craft`, `go-craft` (Python is missing, see wshobson python-anti-patterns) | pass |
| Performance section (algorithms, bundles, caching, images, sync I/O) | routed | performance and frontend experts (planned) | n/a |
| TODO without ticket | rejected | opinion | fails 1 |
| JSDoc on public APIs | rejected | opinion | fails 1 |
| Poor naming | taken | `review.md` "Wrong or hidden meaning" (only when the name misleads) | pass |
| Magic numbers | taken | `review.md` "Wrong or hidden meaning" (unit or meaning lost) | pass |
| Inconsistent formatting | rejected | a formatter enforces it | fails 4 |
| Output format, summary table, approval verdict | rejected | the findings schema owns format | n/a |
| Check the project's written rules (CLAUDE.md) | taken | `review.md` Scope "Read the project's written rules first" | pass |
| AI addendum: behavioural regressions | rejected | generic; the plain reviewer covers correctness | fails 1 |
| AI addendum: hidden coupling, architecture drift | routed | softarch | n/a |
| AI addendum: model-cost complexity | rejected | out of domain | fails 4 |

### affaan-m/ECC `agents/silent-failure-hunter.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Empty catch, ignored exception | taken | `failure-handling` table "Empty handler" | fails 1 (see section 3) |
| Error converted to null or empty list with no context | taken | `failure-handling` "Default on error" | pass |
| Logs without context, wrong severity | routed | observability expert (planned) | n/a |
| Log and forget | taken | `failure-handling` "Log and carry on" | pass |
| Default value that hides failure, `.catch(() => [])` | taken | `failure-handling` | pass |
| Lost stack trace, generic rethrow | taken | `failure-handling` "Lost cause" | pass |
| Missing async handling | taken | `failure-handling` "Floating async work" | pass |
| No timeout around network, file or database calls | taken | `typescript-craft`, `go-craft`; missing for Python (`requests` has no default timeout) | pass |
| No rollback around transactional work | taken | `failure-handling` "Half-done work" | pass |
| "Zero tolerance" framing | rejected | persona | n/a |

### affaan-m/ECC `agents/code-simplifier.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Preserve behaviour exactly | taken | `simplification` "Behaviour must not change" | pass |
| Consistency with repository style | taken | `simplification` Not a finding; agent rules | pass |
| Early returns for complex conditionals | taken | `simplification` table (guard clauses) | fails 1 (see section 3) |
| async/await over callback chains | rejected | opinion | fails 1 |
| Remove dead code and unused imports | taken | `simplification` table; linters | pass |
| Avoid nested ternaries | taken | `simplification` "fewer concepts, not fewer lines" | pass |
| Intermediate variables, destructuring | rejected | opinion | fails 1 |
| Remove stray console.log, commented-out code | taken / rejected | commented-out code taken (`simplification`); console.log a linter enforces | pass / fails 4 |
| Consolidate duplicated logic | taken | `review.md` "Duplicate that already diverged" | pass |
| Unwind over-abstracted single-use helpers | taken | `review.md` "Unearned abstraction" | pass |
| Edits code | rejected | we are read-only | n/a |

### affaan-m/ECC `agents/refactor-cleaner.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Run knip, depcheck, ts-prune | rejected | runs tools | n/a |
| Treat dynamic imports and string references as live before removing | taken | `simplification` Chesterton's fence; `dependency-discipline` Removing | pass |
| Check whether a symbol is public API before removing it | routed | 3b (removing a public symbol) and softarch | n/a |
| Read git history for context | taken | `simplification` Chesterton's fence ("the commit that added it") | pass |
| Remove in batches, tests after each, commit per batch | rejected | process for an editing agent | n/a |
| Choose the best of several duplicates | rejected | editing agent | n/a |
| Never remove during feature work or before a deploy | rejected | opinion | fails 2 |

### affaan-m/ECC `agents/python-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SQL, command, path injection; eval; unsafe deserialisation; weak crypto; YAML load | routed | security (Ruff S-codes kept in `python-craft` table) | n/a |
| Bare except, swallowed exceptions | taken | `python-craft` table (E722, BLE001) | pass |
| Missing context managers | taken | `python-craft` Resources | pass |
| Public functions without annotations | rejected | opinion unless the repository types | fails 1 |
| `Any` where a type is possible | taken | `python-craft` Types | pass |
| Missing Optional | rejected | the type checker enforces it | fails 4 |
| Comprehensions over loops | rejected | preference (`python-craft` Not a finding) | fails 1 |
| `isinstance` over `type() ==` | rejected | a linter enforces it (Ruff E721) | fails 4 |
| Enum over magic numbers | rejected | opinion | fails 1 |
| `join` over concatenation in loops | rejected | performance, no measured cost | fails 2 |
| Mutable default arguments | taken | `python-craft` table (B006) | pass |
| Over 50 lines, over 5 parameters, nesting over 4 | rejected | thresholds | fails 1 |
| Shared state without locks | taken | `python-craft` "Module-level mutable state" | pass |
| Mixing sync and async | taken | `python-craft` Async | pass |
| N+1 in loops; Django select_related | routed | data and performance experts (planned) | n/a |
| Django `atomic()` for multi-step writes | taken | `failure-handling` "Half-done work" | pass |
| FastAPI: no blocking in async | taken | `python-craft` Async | pass |
| PEP 8, docstrings, print vs logging, `import *`, `== None`, shadowed builtins | rejected | linters enforce them (Ruff E, D, T20, F403, E711, A001) | fails 4 |
| Run mypy, ruff, black, bandit | rejected | runs tools | n/a |

### affaan-m/ECC `agents/typescript-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Wait for green CI, check merge state | rejected | runs tools; not craft | n/a |
| Run the project's own typecheck command, pick the tsconfig that owns the file | taken | `typescript-craft` "First, find out" (reads the tsconfig the files belong to) | pass |
| eval, XSS, injection, path traversal, secrets, prototype pollution, child_process | routed | security | n/a |
| `any` without reason; `unknown` and narrow | taken | `typescript-craft` table | pass |
| Non-null assertion without guard | taken | `typescript-craft` table | pass |
| `as` casts that bypass checks | taken | `typescript-craft` "Types that lie" | pass |
| tsconfig change that weakens strictness | taken | `typescript-craft` "First, find out" | pass |
| Unhandled rejections, floating promises | taken | `typescript-craft` table | pass |
| Sequential awaits for independent work | rejected | performance; correct code | fails 2 |
| `forEach(async)` | taken | `typescript-craft` | pass |
| Empty catch | taken | `failure-handling` | pass |
| `JSON.parse` without try | taken | `typescript-craft` Errors | pass |
| Throwing non-Error | taken | `typescript-craft` table (`only-throw-error`) | pass |
| Missing React error boundaries | routed | frontend expert (planned); see ECC react-patterns for the fact we miss | n/a |
| Module-level mutable state | taken | `typescript-craft` Node and serverless | pass |
| `var`, explicit return types, callback style | rejected | linters or opinion | fails 4 |
| `==` | taken | `typescript-craft` table (`eqeqeq`) | pass |
| Sync fs in handlers | taken | `typescript-craft` | pass |
| No schema validation at boundaries | taken | `typescript-craft` "`as` casts on external data" | pass |
| Unvalidated `process.env` | taken | `typescript-craft` | pass |
| `require` in ESM | taken | `typescript-craft` "Mixing require and import" | fails 1 (see section 3) |
| React fallback section (deps, mutation, index keys, derived state, server imports) | taken | `react-craft` | pass |
| Inline objects as props, lodash imports, memo | routed | frontend and performance experts (planned) | n/a |
| console.log, magic strings, naming case | rejected | linters or opinion | fails 4 |
| Deep optional chaining without fallback: add `?? fallback` | rejected | wrong as a rule: a fallback hides a required value (`failure-handling` "Optional chaining past a required step") | fails 1 |

### anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/code-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Check the diff against the project's written rules | taken | `review.md` Scope | pass |
| Bug detection (logic, null, races, leaks, security, performance) | rejected | generic; plain reviewer and other experts | fails 1 |
| Duplication, critical error handling, test coverage, accessibility | taken / routed | duplication and error handling taken; tests to quality; accessibility to frontend | pass / n/a |
| Confidence 0 to 100, report 80 and above | taken | protocol (8 of 10) | pass |
| Pre-existing issues score 0 | taken | protocol / `review.md` Scope | pass |
| Group by Critical and Important | rejected | schema owns format | n/a |

### anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/silent-failure-hunter.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Locate every handler, callback, fallback, logged-and-continued path, optional chaining | taken | `failure-handling` "Questions for every place" | pass |
| Log quality: severity, context, error ID | routed | observability expert (planned) | n/a |
| User-facing message quality | routed | frontend expert (planned) | n/a |
| Catch only expected types; list every unexpected error a catch could hide | taken | `failure-handling` Q1 | pass |
| Was the fallback asked for in the spec? | taken | `failure-handling` Q4 | pass |
| Fallback to mock or stub outside tests | taken | `failure-handling` "Fallback to a fake" | pass |
| Should the error propagate instead? | taken | `failure-handling` Q5 | pass |
| Does catching here prevent cleanup? | taken | `failure-handling` Q6 | pass |
| Retry that exhausts attempts without telling anyone | taken | `failure-handling` "Retry that gives up quietly" | pass |
| Fallback chains trying several approaches without saying why | taken | `failure-handling` Q4 ("nobody is told") | pass |
| Project-specific logging functions and error IDs | rejected | tied to one project | n/a |
| Tests should not be fixed by disabling them | routed | quality | n/a |

### anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/code-simplifier.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Preserve functionality exactly | taken | `simplification` | pass |
| One project's standards (function keyword, return types, import sorting) | rejected | tied to one project | n/a |
| Avoid nested ternaries; clarity over brevity | taken | `simplification` "fewer concepts, not fewer lines" | pass |
| Remove comments that describe obvious code | taken | `simplification` table | fails 1 (see section 3) |
| Balance: do not combine concerns, do not remove helpful abstractions | taken | `simplification` "What makes a simplification worse" | pass |
| Scope to recently modified code | taken | `surgical-change` | pass |
| Edits code autonomously | rejected | read-only | n/a |

### anthropics/claude-plugins-official `plugins/feature-dev/agents/code-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Same content as the pr-review-toolkit reviewer (project rules, confidence 80, bug and quality axes) | taken | as above; nothing new | n/a |

### anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/type-design-analyzer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A type that exposes mutable internals | taken | `review.md` "Shared mutable state" | pass |
| A type with too many responsibilities | taken | `review.md` "Two reasons to change" | pass |
| A new mutation method that skips the check the constructor enforces | missing | proposed home `review.md`, new category "Invariant bypassed" | pass |
| Invariant enforced only by documentation | rejected | not checkable without a stated invariant | fails 2 |
| Missing validation at construction | rejected | generic ("validate input") | fails 1 |
| Make illegal states unrepresentable; prefer compile-time checks | rejected | design opinion; heavier by default | fails 2 |
| Anemic domain model | rejected | opinion | fails 1 |
| Four 1-to-10 ratings | rejected | format | n/a |
| (NOTICE says this agent informed "swallowed failures and fallbacks") | n/a | wrong attribution: the file has nothing on failures | n/a |

### anthropics/claude-plugins-official `plugins/code-simplifier/agents/code-simplifier.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Same body as the pr-review-toolkit simplifier (fetched and compared) | taken | as above; nothing new | n/a |

### addyosmani/agent-skills `agents/code-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Five axes (correctness, readability, architecture, security, performance) | rejected | generic; split across experts | fails 1 |
| Do the tests verify the behaviour? | taken | `review.md` "A test that cannot fail" (border with quality) | pass |
| Module boundaries, circular dependencies, dependency direction | routed | softarch | n/a |
| Missing pagination, N+1, unbounded fetches | routed | data and performance experts (planned) | n/a |
| Review the tests first | rejected | ordering advice; the test question is taken | fails 2 |
| Read the spec or task first | taken | `review.md` Scope (plan's Expert input); `surgical-change` | pass |
| Severity labels Critical, Required, Optional, Nit | rejected | schema owns format | n/a |
| Praise section ("what's done well") | rejected | not a finding | n/a |
| Say when uncertain instead of guessing | taken | protocol "Say what you could not check" | pass |

### addyosmani/agent-skills `skills/code-simplification/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Same outputs, errors, side effects and ordering | taken | `simplification` "Behaviour must not change" | pass |
| Existing tests needing new expectations means behaviour changed | taken | `simplification` "Tests that had to change" | pass |
| Follow project conventions; churn is not simplification | taken | `simplification` Not a finding | pass |
| Inlining too aggressively loses a name | taken | `simplification` "Inlining a name" | pass |
| Combining unrelated logic | taken | `simplification` "Merging unrelated logic" | pass |
| Removing an abstraction that exists for testability | taken | `simplification` "Removing an abstraction that has a second real user, or that a test seam depends on" | pass |
| Fewer lines is not the goal | taken | `simplification` first section | pass |
| Scope to what changed | taken | `surgical-change` | pass |
| Chesterton's fence, git blame | taken | `simplification` | pass |
| Deep nesting over 3, functions over 50 lines | rejected | thresholds | fails 1 |
| Boolean flag parameters | taken | `review.md` "Flag that switches behaviour" | pass |
| Repeated conditionals into one predicate | taken | `simplification` table | pass |
| Generic and abbreviated names | rejected | opinion | fails 1 |
| Misleading names (`get` that mutates) | taken | `review.md` "Wrong or hidden meaning" | pass |
| Comments that say what, not why | taken | `simplification` table | fails 1 (see section 3) |
| Duplicated 5+ lines | taken | `review.md` "Duplicate that already diverged" | pass |
| Wrapper that adds no value; strategy with one strategy | taken | `review.md` "Complexity moved", "Unearned abstraction" | pass |
| Redundant type assertions | rejected | a linter enforces it (`no-unnecessary-type-assertion`) | fails 4 |
| Separate refactoring from feature work | taken | `simplification` "Refactoring and behaviour change together"; `plan.md` Q7 | pass |
| Rule of 500: automate large refactors | rejected | process | n/a |
| Removing `return await` as a simplification | rejected | wrong inside `try`: the catch stops seeing the rejection (typescript-eslint `return-await`); see missing row in section B | fails 1 |
| A logical-or default as a simplification | rejected | wrong where `''` or `0` is valid (`typescript-craft` logical-or default row) | fails 1 |
| Comprehension over loop (Python) | rejected | preference | fails 1 |
| Prop drilling: flag, do not refactor | rejected | judgment call; `react-craft` Not a finding | fails 2 |
| Red flag: removing error handling because it is cleaner | taken | `simplification` "Weakening error handling" | pass |

### addyosmani/agent-skills `skills/code-review-and-quality/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Approve when it improves code health, even if imperfect | rejected | approval policy; not a finding | n/a |
| Could this be fewer lines? | rejected | contradicts "fewer concepts, not fewer lines" | fails 1 |
| Abstractions earn complexity; wait for the third use | taken | `engineering-principles` rule of three; `review.md` "Unearned abstraction" | pass |
| Dead-code artefacts: `_unused` renames, back-compat shims, `// removed` comments | missing | proposed home `review.md` "Dead code introduced" (agent-written residue) | pass |
| A new conditional bolted onto an unrelated flow | missing | proposed home `review.md`, new category "Feature logic in shared code" (see next row) | pass |
| Feature-specific logic in a shared or general module | missing | in `plan.md` "Where the logic lives" only; no review category (NOTICE credits it) | pass |
| Repeated conditionals on the same shape signal a missing dispatcher | taken | `review.md` "A growing type switch"; `simplification` table | pass |
| Refactor that relocates complexity; count concepts | taken | `review.md` "Complexity moved, not removed"; `simplification` | pass |
| Reuse the canonical helper, not a near-duplicate | taken | `review.md` "Duplicate that already diverged"; `plan.md` Reuse | pass |
| Gratuitous any, optional, casts, silent fallbacks at a type boundary | taken | `typescript-craft` "Types that lie"; `failure-handling` | pass |
| Module boundaries, dependency direction | routed | softarch | n/a |
| Change sizing (100, 300, 1000 lines); files past 1000 lines | rejected | thresholds | fails 1 |
| Separate refactoring from feature work | taken | `simplification`; `surgical-change`; `plan.md` Q7 | pass |
| Change descriptions (first line, body) | rejected | not code craft; no owner | fails 2 |
| Review the tests; invert a condition and run the suite | taken / rejected | the question is taken ("A test that cannot fail"); running a mutation is a tool (quality) | pass / n/a |
| Severity labels; lead with what matters | rejected | schema owns format and order | n/a |
| Verify the author's verification story | routed | quality | n/a |
| Multi-model review | rejected | process | n/a |
| Dead code hygiene: list it, ask before deleting | taken | `build.md` "List what you noticed but did not change as follow-ups" | pass |
| Review speed, disagreements, "clean up later" | rejected | process and opinion | n/a |
| Quantify problems | rejected | generic | fails 1 |
| Dependencies: existing stack first | taken | `dependency-discipline` Q1 | pass |
| Dependencies: bundle size impact | routed | frontend and performance experts (planned) | n/a |
| Dependencies: maintained, licence | taken | `dependency-discipline` Q3, Q5 | pass |
| Dependencies: known vulnerabilities | routed | security (`deps-audit.js`) | n/a |
| Upgrades: read changelog; semver is a promise | taken | `dependency-discipline` An upgrade | pass |
| Upgrades: one package per change | taken | `dependency-discipline` | pass |
| Upgrades: thin coverage around the dependency is the finding | routed | quality | n/a |
| Upgrades: review the lockfile diff; never hand-edit | taken | `dependency-discipline` | pass |
| Security and performance axes | routed | security; performance expert (planned) | n/a |

### addyosmani/agent-skills `skills/api-and-interface-design/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Hyrum's law: every observable behaviour becomes a contract | routed | 3b and softarch | n/a |
| One-version rule, diamond dependencies | routed | softarch | n/a |
| Contract first | rejected | process | n/a |
| One error strategy everywhere (do not mix throw, null and `{ error }`) | missing | proposed home `plan.md` "Failure behaviour" (match sibling functions); partly in `failure-handling` "Expected failures" | pass |
| Validate at boundaries, trust internal callers | taken | `review.md` Do not report (internal validation) | pass |
| Third-party responses are untrusted | taken | `typescript-craft` "`as` casts on external data" | pass |
| Prefer addition over modification of interfaces | routed | 3b and softarch | n/a |
| Naming conventions for REST and fields | routed | softarch | n/a |
| Idempotency key derived from the attempt (a UUID made inside the retry) defeats it | missing | proposed home `failure-handling` Retries | pass |
| Check-then-insert on an idempotency key is a race; let a unique constraint decide | routed | architect / data expert (planned) | n/a |
| A timeout has a third outcome, unknown; record intent before the call | missing | proposed home `failure-handling` Retries (merge with the idempotency row) | pass |
| Key retention shorter than the longest redelivery path | routed | architect | n/a |
| Pagination, PATCH, branded ids, discriminated unions | routed / rejected | pagination to softarch; the rest opinion | n/a |
| (NOTICE says this skill informed developer checks) | n/a | nothing in the developer files traces to it except the internal-validation rule, which ECC also states | n/a |

### github/awesome-copilot `agents/gem-reviewer.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Distinguish facts, inferences and assumptions | taken | `review.md` Result "say which steps you read and which you inferred" | pass |
| Stop after 3 searches with nothing new | taken | `review.md` Method | pass |
| Over-engineering pass: unrequested abstractions, avoidable deps, boilerplate | taken | `review.md` categories | pass |
| Leaner alternative only when materially simpler | taken | `review.md` Result "fix smaller than or equal to the code it replaces" | pass |
| Review the artefact, not your preferred implementation | taken | agent "Follow the repository's own conventions" | pass |
| Validate the implementer's regression-risk estimate | rejected | tied to its orchestrator | n/a |
| Review modes, JSON handoff | rejected | format | n/a |

### github/awesome-copilot `agents/principal-software-engineer.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Persona "as if you were Martin Fowler" | rejected | persona | n/a |
| GoF, SOLID, DRY, YAGNI, KISS applied pragmatically | taken | `engineering-principles` (as meaning and counter-case, never as findings) | pass |
| Anticipate future needs | rejected | contradicts YAGNI and Google's over-engineering rule | fails 1 |
| Create GitHub issues for debt | rejected | runs tools | n/a |

### github/awesome-copilot `agents/janitor.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Delete unused code and dependencies | taken | `review.md` "Dead code introduced"; `dependency-discipline` Removing | pass |
| Inline single-use functions and variables | rejected | heavier by default; `simplification` "Inlining a name" says the opposite | fails 1 |
| Use built-in language features over custom implementations | taken | `review.md` "New dependency" (standard library); `engineering-principles` patterns table | pass |
| Delete flaky or meaningless tests | routed | quality | n/a |
| IaC clean-up | routed | devops | n/a |
| "Every deletion makes the codebase stronger" | rejected | opinion; Chesterton's fence | fails 1 |

### github/awesome-copilot `agents/gem-code-simplifier.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Smells: long parameter lists, feature envy, primitive obsession, god classes | rejected | named smells without a cost; magic numbers taken elsewhere | fails 1 |
| Do not refactor critical code without tests | routed | quality | n/a |
| Extract only when the smell is evidenced and the public contract does not grow | taken | `simplification`; 3b for the contract part | pass |
| Replace conditional with polymorphism | taken | `review.md` "A growing type switch" (only where the repository already dispatches) | pass |
| Run tests after every edit | rejected | runs tools | n/a |

### msitarzewski/agency-agents `engineering/engineering-minimal-change-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Every changed line justified by the task | taken | `surgical-change` line-by-line test; `build.md` | pass |
| Do not refactor code you did not have to touch | taken | `surgical-change` "Opportunistic refactor" | pass |
| No error handling for cases that cannot happen | taken | `surgical-change` "Defensive code for an impossible case" | pass |
| No config flags for hypothetical needs | taken | `surgical-change` "Speculative addition" | pass |
| No annotations, docstrings or comments added to unchanged code | taken | `surgical-change` "Drive-by edit" | pass |
| Note follow-ups instead of sneak edits | taken | `build.md` | pass |
| Ask before assuming the larger interpretation | routed | the workflow's own principles (plan stage) | n/a |
| Three similar lines beat a helper; extract at the fourth | taken | `engineering-principles` rule of three (we say third copy; the source says fourth) | pass |
| Validate only at system boundaries | taken | `review.md` Do not report | pass |
| Bug fix contains only the fix; refactors get their own change | taken | `surgical-change`; `simplification` | pass |
| No back-compat shims, `// removed` comments or `_oldName` renames for dead code | missing | proposed home `review.md` "Dead code introduced" (same row as addyosmani) | pass |
| Traps: while-I'm-here, future flexibility, defensive, modernisation, consistency, cleanup | taken | `surgical-change` table | pass |
| Delete and see what breaks | rejected | runs tools | n/a |
| Success metrics (median diff under 30 lines, 2 files) | rejected | thresholds | fails 1 |

### msitarzewski/agency-agents `engineering/engineering-senior-developer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Laravel, Livewire, FluxUI, Three.js "premium" craft | rejected | one stack, design taste, off target | fails 1 |
| Do not add features not requested | taken | `surgical-change` | pass |
| WCAG 2.1 AA, 60 fps, load under 1.5 s | routed | frontend and performance experts (planned) | n/a |

### msitarzewski/agency-agents `engineering/engineering-code-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Be specific, explain why | taken | protocol Evidence; `review.md` Result | pass |
| Blockers: security, data loss, races, broken API contracts | routed | security; softarch (contracts); plain reviewer | n/a |
| Missing error handling on critical paths | taken | `failure-handling` | pass |
| Unclear naming, duplication to extract | taken | `review.md` | pass |
| Nits only if no linter handles them | taken | `review.md` Scope | pass |
| Praise, emoji markers, encouragement | rejected | format and tone | n/a |

### alirezarezvani/claude-skills `engineering/karpathy-coder/agents/karpathy-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Abstractions serving one caller; classes that could be functions | taken | `review.md` "Unearned abstraction"; `engineering-principles` patterns | pass |
| Error handling for impossible scenarios | taken | `surgical-change` | pass |
| Comment changes, style drift, drive-by edits in adjacent code | taken | `surgical-change` "Drive-by edit" | pass |
| Was the work verified? | routed | quality | n/a |
| Hidden assumptions in an ambiguous requirement | routed | the workflow's plan stage | n/a |
| Run `complexity_checker.py` and `diff_surgeon.py` | rejected | runs tools | n/a |
| Be proportional to the change | taken | protocol (severity, zero is correct) | pass |

### wshobson/agents `plugins/comprehensive-review/agents/code-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A capability list of tools and topics (SonarQube, OWASP, Kubernetes, SOC2, metrics) | rejected | no checkable item; tools; spread across all experts | fails 2 |
| Database connection pool and timeout configuration | routed | architect | n/a |
| Contract testing and API compatibility | routed | quality; softarch | n/a |

### trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A zero or empty value that disables a check (timeout 0, `key=""`) | taken | `review.md` "Wrong or hidden meaning" | pass |
| A negative value with undefined meaning (`-1` means never) | missing | proposed home `review.md` "Wrong or hidden meaning" (one word: zero, empty or negative) | pass |
| A boolean return on a security failure that callers forget to check | taken | `engineering-principles` command-query; `failure-handling` NOTICE | pass |
| Algorithm or mode chosen by untrusted input (JWT `alg`) | routed | security | n/a |
| Primitive APIs where parameters of one type can be swapped | rejected | heavier by default (branded types); security's for crypto | fails 2 |
| Constant-time comparison | routed | security | n/a |
| Configuration cliffs: typo accepted as truthy, dangerous combinations | routed | security; devops | n/a |
| Constructor defaults not validated | routed | security | n/a |
| Stringly-typed permissions | routed | security | n/a |
| Rationalisations ("it's documented") | rejected | security's framing | n/a |
| Three adversaries, phases | rejected | process | n/a |

### B. Sources of the shared skills

#### `failure-handling`

### affaan-m/ECC `skills/error-handling/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Fail fast at the boundary where it occurs | taken | `engineering-principles` Fail fast | pass |
| Typed errors over strings; base `AppError` with a code | rejected | opinion | fails 1 |
| User messages kept apart from developer messages | routed | security (leakage); frontend (planned) | n/a |
| Every catch handles, rethrows or logs | taken | `failure-handling` | pass |
| Error codes are part of the API contract | routed | softarch | n/a |
| Custom `Error` subclass sets its prototype (`Object.setPrototypeOf(this, new.target.prototype)`) | missing | the fact behind it: with a TypeScript target of ES5, `instanceof` on a subclass of `Error` fails; proposed home `typescript-craft` Errors | pass |
| Result pattern for expected failures | taken | `failure-handling` "Expected failures" | fails 1 (see section 3) |
| Its Result example returns a DB error without the cause | rejected | its own example loses the cause | n/a |
| API error handler maps known errors, logs the rest, returns 500 | taken | `failure-handling` Not a finding (top-level boundary) | pass |
| React error boundary for rendering errors | routed | frontend (planned); the limit of boundaries is missing (ECC react-patterns) | n/a |
| Go sentinel errors with `%w` and `errors.Is` | taken | `go-craft` Errors | pass |
| Retry with exponential backoff and jitter, bounded | taken | `failure-handling` Retries | pass |
| Retry only retriable errors, not 4xx | taken | `failure-handling` Retries | pass |
| Its default `retryIf = () => true` retries everything | rejected | wrong default | n/a |
| Circuit breakers | routed | architect | n/a |
| User-facing message map | routed | frontend (planned) | n/a |

### wshobson/agents `plugins/.../skills/error-handling-patterns/SKILL.md` (SKILL.md only; details file not saved)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Exceptions for unexpected errors, Result for expected, panic for bugs | taken | `failure-handling` "Expected failures" | fails 1 (see section 3) |
| Preserve context: stack, metadata | taken | `failure-handling` Q3 | pass |
| Log and rethrow creates duplicate log entries | taken | `failure-handling` Q5 | pass |
| Handle at the right level | taken | `failure-handling` Q5 | pass |
| Clean up resources (finally, context managers, defer) | taken | `failure-handling` Cleanup | pass |
| Expected failures should not spam logs | routed | observability (planned) | n/a |
| Catching too broadly; empty catch | taken | `failure-handling` | pass |
| Ignoring async errors | taken | `failure-handling` "Floating async work" | pass |

### wshobson/agents `plugins/python-development/skills/python-error-handling/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Validate early at boundaries | rejected | generic | fails 1 |
| Convert strings to domain types at the boundary | rejected | design opinion | fails 2 |
| Pydantic for complex validation | rejected | tutorial | n/a |
| Use specific built-in exception types | rejected | generic | fails 1 |
| Chain with `raise ... from e` | taken | `failure-handling` "Lost cause"; `python-craft` B904 | pass |
| Partial failures in batches: track successes and failures | taken | `failure-handling` "Partial failure reported as success" | pass |
| Its `parse_output_format` raises inside `except` without `from` | rejected | its own example trips Ruff B904 | n/a |

### Python tutorial, "Errors and Exceptions" (`python/cpython` `Doc/tutorial/errors.rst`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `raise ... from exc` chains; `from None` disables chaining | taken | `failure-handling` "Lost cause" | pass |
| `BaseException` is the base; `Exception` excludes `KeyboardInterrupt`, `SystemExit` | taken | `python-craft` "Cancellation swallowed" | pass |
| `finally` runs on every path | taken | `failure-handling` Cleanup | pass |
| `break`, `continue` or `return` in `finally` stops the exception from being re-raised; a `return` in `finally` wins over the `try` | missing | proposed home `failure-handling` patterns table "Exit from finally" (Python, JavaScript, Java, C#) | pass |
| `with` closes the file even on error | taken | `python-craft` Resources | pass |

### Effective Go (`golang/website` `_content/doc/effective_go.html`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A deferred call runs when the function returns | taken | `failure-handling` Cleanup; `go-craft` "`defer` inside a loop" | pass |
| Arguments of a deferred call are evaluated when `defer` runs, not when the function returns | missing | proposed home `go-craft` Errors or Resources (`defer log(time.Since(start))`, `defer f(x)` with `x` changed later) | pass |
| Deferred calls run in LIFO order | rejected | tutorial; rarely a defect | fails 1 |
| Errors are values; return them | taken | `go-craft` Errors | pass |
| Panic for unrecoverable errors only | taken | `go-craft` "`panic` for an expected failure" | pass |

### The Rust book, chapter 9 (`rust-lang/book` `src/ch09-02-...`, `src/ch09-03-...`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `?` propagates errors | taken | `rust-craft` Panics | pass |
| `unwrap` and `expect` panic; `expect` should say why | taken | `rust-craft` Not a finding | pass |
| Panic when continuing would be insecure or a contract is broken; `Result` when failure is expected | taken | `rust-craft` Panics | pass |

### Microsoft .NET, "Best practices for exceptions" (`dotnet/docs` `docs/standard/exceptions/best-practices-for-exceptions.md`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `throw;` keeps the stack; `throw ex;` resets it | taken | `failure-handling` "Lost cause" | pass |
| `using` for `IDisposable`, `finally` otherwise | taken | `failure-handling` Cleanup | pass |
| Do not throw from `finally` (CA2219) | missing | same row as the Python tutorial: proposed home `failure-handling` "Exit from finally" | pass |
| Avoid exceptions for common conditions (check state first) | taken | `failure-handling` "Expected failures" | fails 1 (see section 3) |
| `ExceptionDispatchInfo` to rethrow outside the handler | rejected | rare; C# has no developer skill | fails 1 |
| `Equals`, `GetHashCode`, `ToString` should not throw (CA1065) | rejected | linter rule; no C# skill | fails 4 |

#### `python-craft`

### affaan-m/ECC `skills/python-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| EAFP over LBYL | rejected | preference (`python-craft` Not a finding) | fails 1 |
| Specific exception, chain with `from` | taken | `python-craft` table (B904) | pass |
| Context managers for resources | taken | `python-craft` Resources | pass |
| Its `@contextmanager` timer has no `try`/`finally` around `yield`, so the timing line is skipped on error | missing | the fact: code after `yield` in a `@contextmanager` runs on error only inside `finally`; proposed home `python-craft` Resources | pass |
| `__exit__` returns `False` so exceptions propagate | taken / missing | the inverse (an `__exit__` that returns true swallows) is missing; proposed home `python-craft` Resources | pass |
| Its `ThreadPoolExecutor` example turns errors into strings | rejected | wrong; the NOTICE already says so | n/a |
| `dataclass` with `default_factory` | taken | `python-craft` "Mutable class attribute" | pass |
| Its `created_at: datetime = field(default_factory=datetime.now)` | rejected | naive datetime; contradicts `python-craft` | n/a |
| `__slots__`, generators, `join` | rejected | performance (`python-craft` Not a finding) | fails 2 |
| `__all__` for package exports | routed | 3b (Python public API) | n/a |
| Mutable defaults, `type() ==`, `== None`, `import *`, bare except | taken / rejected | mutable default and bare except taken (B006, E722); the rest linters | pass / fails 4 |
| Tooling commands, pyproject sample | rejected | tutorial; runs tools | n/a |

### wshobson/agents `plugins/python-development/skills/python-anti-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Timeout and retry logic duplicated in every caller | rejected | opinion (centralise); not a defect | fails 2 |
| Double retry: an application retry around a client that already retries | missing | proposed home `failure-handling` Retries (attempts multiply; AWS SDKs retry by default) | pass |
| Hard-coded configuration and secrets | routed | security; devops | n/a |
| ORM model returned from an API handler | taken / missing | taken in `java-craft` Spring; missing for Python (FastAPI, Django); proposed home: one cross-language line in `review.md` or softarch (it is a contract leak) | pass |
| SQL inside business logic | taken | `review.md` "Hard-wired dependency" (only where the repository injects) | pass |
| Bare `except Exception: pass` | taken | `python-craft` table | pass |
| Batch that aborts on the first item | taken | `failure-handling` partial failure | pass |
| Missing input validation | rejected | generic | fails 1 |
| Unclosed resources | taken | `python-craft` Resources | pass |
| Blocking in async (`time.sleep`, `requests`) | taken | `python-craft` Async | pass |
| `requests.get` with no timeout (its examples pass one) | missing | `requests` has no default timeout; Ruff S113 catches it; proposed home `python-craft` table and a trap row | pass |
| Type hints on all public functions; typed collections | rejected | opinion unless the repository types | fails 1 |
| Only happy-path tests; over-mocking | routed | quality | n/a |

### wshobson/agents `plugins/python-development/skills/python-resource-management/SKILL.md` (SKILL.md only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `with` releases on exception | taken | `python-craft` Resources | pass |
| `__exit__` returning `True` suppresses the exception | missing | proposed home `python-craft` Resources (a custom context manager that swallows) | pass |
| Its `asynccontextmanager` transaction rolls back under `except Exception`, which misses `CancelledError` (a `BaseException` since 3.8) | missing | proposed home `python-craft` Async (cleanup in `except Exception` does not run on cancellation; use `finally`) | pass |
| `ExitStack` for a variable number of resources | taken | `python-craft` Resources | pass |
| Best-effort cleanup that ignores `OSError` | rejected | acceptable in cleanup | n/a |
| Streaming: accumulate with list and join; time to first byte | routed | performance (planned) | n/a |

### wshobson/agents `plugins/python-development/skills/python-type-safety/SKILL.md` (SKILL.md only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| An optional (`X` or `None`) return forces the caller to check | taken | `python-craft` Types | pass |
| Minimise `Any`; acceptable for untyped third-party code | taken | `python-craft` Types | pass |
| `# type: ignore[code]` with a code | taken | `python-craft` Types | pass |
| Strict mode in CI | rejected | runs tools | n/a |
| Generics, protocols, aliases | rejected | tutorial | n/a |

### wshobson/agents `plugins/python-development/skills/async-python-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Stay fully sync or fully async in one call path | taken | `python-craft` "Mixing sync and async" | pass |
| `gather(..., return_exceptions=True)` then inspect | taken | `python-craft` "gather errors" | pass |
| Forgetting `await` | taken | `python-craft` "Coroutine never awaited" | pass |
| Blocking the event loop | taken | `python-craft` | pass |
| Re-raise `CancelledError` | taken | `python-craft` "Cancellation swallowed" | pass |
| `asyncio.wait_for` for timeouts | rejected | tutorial | n/a |
| CPU-bound work to processes or `to_thread` | taken | `python-craft` Async | pass |

### trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/references/lang-python.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Mutable default arguments | taken | `python-craft` table (B006) | pass |
| eval, exec, compile, dynamic import, pickle, yaml.load, shell=True | routed | security (Ruff S-codes kept in the table) | n/a |
| Late-binding closures in loops | taken | `python-craft` table (B023) | pass |
| `is` with literals; small-int cache | taken | `python-craft` table (F632) | pass |
| A local file named like a stdlib module (`random.py`) shadows it | missing | Ruff A005 catches it; proposed home `python-craft` linter table | pass |
| Bare except catches `KeyboardInterrupt`, `SystemExit` | taken | `python-craft` | pass |
| Exception raised in the except block loses the original | rejected | wrong for Python 3: the original is kept as `__context__` | fails 1 |
| Loop variable still bound after the loop | rejected | rarely a defect | fails 1 |
| Mutable class attribute shared by instances | taken | `python-craft` Shared state | pass |
| Format-string injection with a user template | taken | `python-craft` Security | pass |
| Float comparison; large int to float | taken | `python-craft` Values (money, large ids) | pass |
| Unpacking user-controlled data as DoS | routed | security | n/a |
| Python 2 `input()`, integer division | rejected | obsolete | n/a |
| Attribute access on None in a chain | taken | `python-craft` Types (optional result used unchecked) | pass |

### trailofbits/skills `plugins/modern-python/skills/modern-python/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| uv, ruff, ty, prek tooling choices | rejected | project tooling, not review | n/a |
| `ty` is a type checker with its own config (`[tool.ty]`) | missing | proposed home `python-craft` "First, find out" (read `[tool.ty]` as well as mypy and pyright) | pass |
| `[dependency-groups]` (PEP 735) for development tools | missing | proposed home `dependency-discipline` Not a finding ("a development-only tool in the development dependency group" should name `[dependency-groups]`) | pass |
| Security tools (shellcheck, detect-secrets, zizmor, pip-audit) | routed | security; devops | n/a |

### Ruff rule registry (`astral-sh/ruff` `crates/ruff_linter/src/codes.rs`, saved copy)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| F401, F841, B006, B008, E722, BLE001, B904, B023, F632, RUF006, ASYNC251, ASYNC230, S307, S301, S506, S602 exist with the meanings the table gives | taken | `python-craft` table (all 16 confirmed in the saved registry) | pass |
| ASYNC210, ASYNC212 (blocking HTTP call in async) | missing | proposed home `python-craft` table next to ASYNC251 | pass |
| S113 (request without timeout) | missing | proposed home `python-craft` table | pass |
| DTZ003, DTZ005 (utcnow, now without tz) | missing | `python-craft` lists naive datetimes as a trap a linter misses; move to the table | pass |
| S101 (assert) | missing | `python-craft` "`assert` for run-time checks" is a trap the table should name | pass |
| RUF012 (mutable class default), RUF008, RUF009 (dataclass defaults) | missing | `python-craft` "Mutable class attribute" should name them | pass |
| B012 (return, break or continue in `finally`) | missing | proposed home `python-craft` table, with the `failure-handling` row | pass |
| A005 (stdlib module shadowing) | missing | proposed home `python-craft` table | pass |
| ANN401 (`Any`), PGH003 (blanket `type: ignore`) | missing | `python-craft` Types rows should name them | pass |
| S110 (`try`-`except`-`pass`) | missing | proposed home `python-craft` table next to E722 | pass |

#### `typescript-craft`

### affaan-m/ECC `agents/typescript-reviewer.md`

Listed in part A.

### trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/references/lang-javascript.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `==` coercion | taken | `typescript-craft` | pass |
| Prototype pollution through merge or `obj[key]` | taken | `typescript-craft` Security (owner security) | pass |
| ReDoS with nested quantifiers | taken | `typescript-craft` Security | pass |
| `parseInt` without radix | taken | `typescript-craft` table | pass |
| `this` lost in a callback | taken | `typescript-craft` Values | pass |
| Mutating array methods; numeric sort | taken | `typescript-craft` | pass |
| `+` concatenates when one side is a string (`"5" + 3`) | missing | typescript-eslint `restrict-plus-operands` catches it; proposed home `typescript-craft` table (query-string numbers) | pass |
| String comparison of numeric strings (`"10" > "9"` is false) | missing | proposed home `typescript-craft` Values, low | pass |
| eval, Function, setTimeout with a string | taken | `typescript-craft` Security | pass |
| `in` sees the prototype chain; `Object.hasOwn` | taken | `typescript-craft` | pass |
| Unhandled rejection, missing await, sequential awaits | taken / rejected | the first two taken; sequential is performance | pass / fails 2 |
| `JSON.parse` keeps `__proto__` as a key; pollution happens on merge | taken | `typescript-craft` prototype pollution row | pass |
| Large numbers lose precision in `JSON.parse` | taken | `typescript-craft` | pass |
| `as`, `any`, `!`, lying type guards | taken | `typescript-craft` | pass |

### wshobson/agents `typescript-advanced-types`, `modern-javascript-patterns`, `nodejs-backend-patterns` (SKILL.md files)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Generics, conditional, mapped and template-literal types | rejected | tutorial | n/a |
| Prefer `unknown` to `any`; guards over assertions | taken | `typescript-craft` | pass |
| "Use optional chaining to prevent property errors" | rejected | hides a required value; NOTICE already says so | n/a |
| Nullish coalescing for defaults | taken | `typescript-craft` logical-or default row | pass |
| Async/await over chains; pure functions; small functions | rejected | opinion | fails 1 |
| Node: validate input, env vars, structured logging, rate limiting, CORS, HTTPS | routed | security; observability (planned) | n/a |
| Node: dependency injection for testability | taken | `review.md` "Hard-wired dependency" (only where the repository injects) | pass |
| Node: graceful shutdown, connection pooling, health checks | routed | architect; devops | n/a |

### typescript-eslint and ESLint rule documentation (`typescript-eslint/typescript-eslint` `packages/eslint-plugin/docs/rules/*.mdx`; `eslint/eslint` `docs/src/rules/*.md`; fetched)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `no-floating-promises`, `no-misused-promises`, `no-explicit-any`, `no-non-null-assertion`, `only-throw-error`, `prefer-nullish-coalescing`, `no-unused-vars`, `switch-exhaustiveness-check`, `ban-ts-comment`, ESLint `eqeqeq`, `radix` exist as the table says | taken | `typescript-craft` table (all confirmed) | pass |
| `return-await` (default `in-try-catch`): a promise returned unawaited inside `try` escapes the `catch` | missing | proposed home `typescript-craft` table and Errors | pass |
| `restrict-plus-operands` | missing | proposed home `typescript-craft` table | pass |
| `require-array-sort-compare` | missing | `typescript-craft` "`array.sort()` without a comparator" should name it | pass |
| `unbound-method` | missing | `typescript-craft` "`this` lost in a callback" should name it | pass |
| ESLint `preserve-caught-error` (rethrow without `cause`) | missing | `typescript-craft` "Wrapping without a cause" should name it | pass |
| ESLint `no-unsafe-finally` (return or throw in `finally`) | missing | proposed home `typescript-craft` table, with the `failure-handling` row | pass |

### TypeScript tsconfig reference (`microsoft/TypeScript-Website` `packages/tsconfig-reference/copy/en/options/*.md`; fetched)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals` as the skill names them | taken | `typescript-craft` "First, find out" and table | pass |
| `useUnknownInCatchVariables` types the catch variable as `unknown` | missing | `typescript-craft` "`catch (e)` used as an `Error`" is caught by the compiler when this option (part of `strict`) is on; name it | pass |

#### `react-craft`

### affaan-m/ECC `agents/react-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `dangerouslySetInnerHTML`, unsafe URL schemes, server actions without validation, client-exposed secrets, tokens in localStorage | taken | `react-craft` Security (owner security) | pass |
| Hooks conditional or outside components | taken | `react-craft` table | pass |
| Direct state mutation | taken | `react-craft` State | pass |
| Missing deps; an `exhaustive-deps` disable without a reason | taken | `react-craft` "First, find out" | pass |
| Derived state in effects; effect chains; missing cleanup; stale closures | taken | `react-craft` Effects | pass |
| A custom hook not named `use...` is invisible to the hooks lint rules | missing | proposed home `react-craft` table note | pass |
| Server-only import in a client component; `"use client"` spreading; full record in props; server action without authorisation | taken | `react-craft` Server and client boundaries | pass |
| Accessibility rules (keyboard, labels, alt, ARIA, headings, colour) | routed | frontend (planned) | n/a |
| `target="_blank"` without `rel` | routed | security; frontend | n/a |
| Index keys, duplicated state, state initialised from a prop | taken | `react-craft` State | pass |
| Performance (memo, inline props, Suspense placement, virtualisation, context frequency) | routed | frontend and performance (planned) | n/a |
| Forms (`<form>`, `preventDefault`, `name`, form libraries) | routed | frontend (planned) | n/a |
| Prop drilling over 3, components over 200 lines, class components in new code | rejected | thresholds and opinion | fails 1 |
| Install `eslint-plugin-react-hooks` during review | rejected | runs tools | n/a |

### affaan-m/ECC `skills/react-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Render is a pure function; derived state during render | taken | `react-craft` Effects | pass |
| Functional updater when new state depends on old | taken | `react-craft` stale closure | pass |
| Do not memoise by default | taken | `react-craft` Not a finding | pass |
| Error boundaries do not catch errors in event handlers or async code | missing | proposed home `react-craft` new "Errors" section (a boundary wrapped around a fetch error, or `try` around returned JSX, catches nothing) | pass |
| Never import a Server Component from a Client Component file; compose through `children` | taken | `react-craft` "A server-only module imported into a client component" | pass |
| `useEffect` plus `fetch` for app data: races, no cache | taken | `react-craft` "Out-of-order responses" | pass |
| `useSyncExternalStore` for external stores | routed | frontend (planned) | n/a |
| State-location decision tree; library choices | rejected | opinion (`react-craft` Not a finding) | fails 1 |
| Accessibility, routing, React Native | routed | frontend (planned) | n/a |

### vercel-labs/agent-skills `skills/react-best-practices/SKILL.md` (index only; rule files not saved)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `server-no-shared-module-state` | taken | `typescript-craft` module state; `react-craft` NOTICE | pass |
| `server-auth-actions` | taken | `react-craft` Security | pass |
| `server-serialization` (minimise data to client components) | taken | `react-craft` "A full record passed as props" | pass |
| `rerender-derived-state-no-effect`, `rerender-move-effect-to-event` | taken | `react-craft` Effects | pass |
| `rerender-no-inline-components` | taken | `react-craft` Rendering | pass |
| `rendering-conditional-render` (ternary, not `&&`) | taken | `react-craft` "`{count && <Badge />}`" | pass |
| `rerender-functional-setstate` | taken | `react-craft` stale closure | pass |
| `advanced-effect-event-deps` (a `useEffectEvent` result in deps) | rejected | new API, rare; frontend | fails 1 |
| Waterfalls, bundles, caching, re-render tuning, rendering and JS performance (about 55 rules) | routed | frontend and performance (planned) | n/a |
| `js-tosorted-immutable` | taken | `typescript-craft` mutating `sort` (`toSorted` is the fix) | pass |

### tech-leads-club/agent-skills `(architecture)/react-composition-patterns/SKILL.md` (index only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Boolean props to customise behaviour; explicit variants | taken | `react-craft` "Boolean props piling up" | pass |
| Compound components, context interface, lift state | rejected | design opinion | fails 2 |
| Children over render props | rejected | opinion | fails 1 |
| React 19: no `forwardRef`; `use()` over `useContext()` | rejected | version idiom, not a defect | fails 1 |

### wshobson/agents `plugins/frontend-mobile-development/skills/react-state-management/SKILL.md` (SKILL.md only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Colocate state; do not over-globalise | taken | `react-craft` State | pass |
| Do not duplicate server state in client stores | taken | `react-craft` "The same data in two places" | pass |
| Do not store derived data | taken | `react-craft` | pass |
| Immer makes "mutation" safe inside Redux Toolkit reducers | missing | proposed home `react-craft` Not a finding (mutation syntax inside `createSlice` or `produce` is not a state mutation) | pass |
| Library selection criteria | rejected | opinion | fails 1 |

### eslint-plugin-react-hooks and eslint-plugin-react rule docs (saved: `reacthooks.html`, `jsxkey.html`, `arrayindex.html`; fetched: `no-unstable-nested-components.md`, `jsx-no-leaked-render.md`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react/jsx-key`, `react/no-array-index-key` | taken | `react-craft` table | pass |
| `react/no-unstable-nested-components` | missing | `react-craft` "A component defined inside another" should name it | pass |
| `react/jsx-no-leaked-render` | missing | `react-craft` "`{count && <Badge />}`" should name it | pass |

#### `go-craft`

### affaan-m/ECC `agents/go-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SQL and command injection, path traversal, `unsafe`, secrets, `InsecureSkipVerify` | taken / routed | security; `go-craft` Security lists some | n/a |
| Ignored errors with `_` | taken | `go-craft` table (errcheck) | pass |
| `return err` without wrapping | taken | `go-craft` Errors | pass |
| Panic for recoverable errors | taken | `go-craft` | pass |
| `errors.Is` and `errors.As` | taken | `go-craft` | pass |
| Goroutine leaks; unbuffered channel deadlock | taken | `go-craft` Concurrency | pass |
| Missing WaitGroup | taken | `go-craft` "`wg.Add` called inside the goroutine" | pass |
| Not deferring `Unlock` | taken | `go-craft` | pass |
| Over 50 lines, nesting over 4 | rejected | thresholds | fails 1 |
| Package-level mutable state | taken | `review.md` "Shared mutable state" | pass |
| Interface pollution | taken | `go-craft` Interfaces | pass |
| `strings.Builder`, slice pre-allocation | rejected | performance (`go-craft` Not a finding) | fails 2 |
| Context first parameter | taken | `go-craft` "Context stored in a struct" | pass |
| Table-driven tests | routed | quality | n/a |
| Error strings lowercase; package naming | rejected | linters (staticcheck ST1005, revive) | fails 4 |
| Defer in loop | taken | `go-craft` | pass |
| `go test -race`, `govulncheck` | taken / routed | race noted in table; govulncheck to security | pass / n/a |

### affaan-m/ECC `skills/golang-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Make the zero value useful | rejected | design opinion | fails 2 |
| Accept interfaces, return structs | taken | `go-craft` Interfaces | pass |
| Wrap errors with context; custom error types; `errors.Is` and `As` | taken | `go-craft` Errors | pass |
| Never ignore errors | taken | `go-craft` | pass |
| Worker pool, errgroup, graceful shutdown | rejected / routed | tutorial; shutdown to architect | n/a |
| Goroutine leak when context is cancelled | taken | `go-craft` | pass |
| Small interfaces defined where used | taken | `go-craft` Interfaces | pass |
| Avoid package-level state | taken | `review.md` "Shared mutable state" | pass |
| Functional options | routed | 3b (Go API evolution) | n/a |
| Its `sync.Pool` example returns `buf.Bytes()` after a deferred `Reset` and `Put` | missing | the defect itself: the returned slice aliases a buffer the next caller overwrites; proposed home `go-craft` Values | pass |
| Naked returns in long functions; mixing receivers | rejected | `go-craft` Not a finding | fails 1 |
| Panic for control flow; context in a struct | taken | `go-craft` | pass |
| Linter configuration sample | taken | `go-craft` "First, find out" | pass |

### trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/references/lang-go.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Silent integer overflow in size calculations | taken | `go-craft` Values | pass |
| Slice aliasing through append | taken | `go-craft` Values | pass |
| Typed nil in an interface | taken | `go-craft` Errors | pass |
| JSON: case-insensitive names, last duplicate wins, unknown fields ignored | taken | `go-craft` Values | pass |
| Defer in loops; closure fix | taken | `go-craft` | pass |
| Goroutine leak on an unbuffered channel after a timeout | taken | `go-craft` | pass |
| Loop variable capture "fixed in 1.22 with GOEXPERIMENT, default in 1.23" | rejected | wrong: Go 1.22 made per-iteration variables the default for modules declaring go 1.22 (`go-craft` has it right) | fails 1 |
| `unsafe` string to bytes conversion | routed | security | n/a |
| Concurrent map access | taken | `go-craft` | pass |
| Ignored errors; shadowed `err`; ignored deferred `Close` error | taken | `go-craft` Errors | pass |

### wshobson/agents `plugins/systems-programming/skills/go-concurrency-patterns/SKILL.md` (SKILL.md only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Close channels from the sender only | taken | `go-craft` "Closing a channel from the receiver" | pass |
| Use errgroup for concurrent operations with errors | missing | `go-craft` has no errgroup row, although its NOTICE claims it. The fact worth taking: errgroup's derived context is cancelled when `Wait` returns or the first error occurs; proposed home `go-craft` Concurrency | pass |
| Never use `time.Sleep` to synchronise | routed | quality (flaky tests); NOTICE credits it but `go-craft` has no such row | n/a |
| Always have a goroutine exit path; check `ctx.Done()` | taken | `go-craft` | pass |
| Prefer channels over mutexes | rejected | opinion | fails 1 |

### `go vet` documentation (`govet.html`) and golangci-lint reference configuration (`golangci-ref.yml`), saved copies

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `copylocks`, `lostcancel`, `printf`, errcheck, `unused`, `ineffassign`, staticcheck; `shadow` not in plain `go vet` | taken | `go-craft` table (confirmed) | pass |
| `bodyclose` | missing | `go-craft` "HTTP response body not closed" should name it | pass |
| `rowserrcheck`, `sqlclosecheck` | missing | `go-craft` "`sql.Rows` not closed" should name them | pass |
| `errorlint` (comparison with `==`, `%v` instead of `%w`) | missing | `go-craft` Errors rows should name it | pass |
| `contextcheck` (non-inherited context) | missing | `go-craft` "`context.Background()` inside a request path" should name it | pass |
| `noctx` (HTTP request without context) | missing | proposed home `go-craft` table | pass |
| `loopclosure` (vet) | missing | `go-craft` loop variable row should name it for go below 1.22 | pass |
| `httpresponse` (vet: using the response before checking the error) | missing | proposed home `go-craft` table | pass |

#### `rust-craft`

### affaan-m/ECC `agents/rust-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `unwrap` and `expect` on production paths | taken | `rust-craft` Panics | pass |
| `unsafe` without a `SAFETY` comment | taken | `rust-craft` | pass |
| Injection, path traversal, secrets, deserialisation limits, raw-pointer use-after-free | routed | security (`rust-craft` Security lists three) | n/a |
| `let _ =` on `must_use` values | taken | `rust-craft` Errors | pass |
| Missing error context | taken | `rust-craft` "Context lost" | pass |
| `panic!`, `todo!`, `unreachable!` in production | taken | `rust-craft` | pass |
| `Box<dyn Error>` in libraries | taken | `rust-craft` (overlaps 3b) | pass |
| Unnecessary clone; `String` and `Vec` where slices do; `Cow`; lifetimes | taken / rejected | String and clone taken (see section 3); Cow and lifetimes performance or style | pass / fails 2 |
| Blocking in async | taken | `rust-craft` Async | pass |
| Unbounded channels | taken | `rust-craft` "Unbounded concurrency" | pass |
| Mutex poisoning ignored | taken | `rust-craft` | pass |
| Missing `Send` and `Sync` bounds | taken | `rust-craft` `unsafe impl Send` | pass |
| Nested lock acquisition in inconsistent order (deadlock) | missing | `rust-craft` intro mentions lock ordering but holds no row; proposed home `rust-craft` Async or a shared concurrency line in `review.md` | pass |
| Over 50 lines, nesting over 4 | rejected | thresholds | fails 1 |
| Wildcard match on business enums | taken | `rust-craft` | pass |
| `with_capacity`, allocations in loops, N+1 | rejected / routed | performance | n/a |
| `#[allow]` without justification | taken | `rust-craft` "First, find out" | pass |
| Missing `#[must_use]`, derive order, docs on `pub`, `format!` | rejected | opinion or linters | fails 1 |
| Run cargo check, clippy, fmt, test, audit, deny | rejected | runs tools | n/a |

### affaan-m/ECC `skills/rust-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Borrow instead of owning; clone to dodge the borrow checker | taken | `rust-craft` Types and matching | pass |
| `?` and context; never `unwrap` in production | taken | `rust-craft` | pass |
| thiserror for libraries, anyhow for applications | taken | `rust-craft` Errors | pass |
| Option combinators over nested matching | rejected | preference | fails 1 |
| Model states as enums; exhaustive matching | taken | `rust-craft` wildcard row | pass |
| Newtypes against swapped arguments | rejected | design opinion | fails 2 |
| Builder pattern | routed | 3b (API shape) | n/a |
| `Arc<Mutex<T>>`, channels, Tokio | rejected | tutorial | n/a |
| When `unsafe` is and is not acceptable | taken | `rust-craft` `unsafe` | pass |
| Expose minimally; `pub(crate)`; re-export from lib.rs | routed | 3b; softarch | n/a |

### trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/references/lang-rust.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Overflow panics in debug, wraps in release | taken | `rust-craft` Integers | pass |
| `unsafe` needs a SAFETY comment | taken | `rust-craft` | pass |
| `mem::forget` skips destructors | taken | `rust-craft` | pass |
| Panic across `extern "C"` is undefined behaviour | taken | `rust-craft` (both say UB; since Rust 1.81 an unwinding panic out of `extern "C"` aborts instead: section 4) | pass |
| Panic in `Drop` while unwinding aborts | taken | `rust-craft` | pass |
| `RefCell` double borrow panics | taken | `rust-craft` | pass |
| Incorrect `unsafe impl Send` and `Sync` | taken | `rust-craft` | pass |
| Lifetime elision ties the output to `self` | rejected | over-constrains; the compiler reports misuse | fails 4 |
| Deref coercion picks the wrapper's method | rejected | rare; opinion | fails 1 |
| Struct fields drop in declaration order | missing | proposed home `rust-craft` `unsafe` and memory, low (a field that needs another must be declared before it) | pass |
| Macro hygiene: `let x = $e` captures the caller's `x` | rejected | wrong: `macro_rules!` hygiene keeps the macro's `x` separate from the caller's | fails 1 |

### trailofbits/skills `plugins/rust-review/skills/rust-review/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| The compiler proves no data races in safe code, nothing about `unsafe`, panic reachability, ABBA deadlocks, atomic sequencing, FFI ABI | taken | `rust-craft` intro | pass |
| Atomic load then store as a check-then-act race | missing | proposed home `rust-craft` Async or `review.md` "Shared mutable state" (also Go `atomic`, Java `AtomicInteger.get` then `set`) | pass |
| `SAFETY:` documents `unsafe`, not infallibility; an `unwrap` with a documented invariant is still low risk | rejected | we exempt stated-invariant unwraps (`review.md`, `rust-craft`); the risk is low | n/a |
| Pure safe crates still have panic DoS and drop panics | taken | `rust-craft` Panics | pass |
| Multi-agent pipeline, scripts, SARIF | rejected | runs tools | n/a |

### wshobson/agents `plugins/systems-programming/skills/rust-async-patterns/SKILL.md` (SKILL.md only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Never block in async | taken | `rust-craft` Async | pass |
| Do not hold locks across awaits | taken | `rust-craft` Async | pass |
| Do not spawn unboundedly; semaphores | taken | `rust-craft` Async | pass |
| `Send` bounds on spawned futures | taken | `rust-craft` NOTICE | pass |
| Use `tokio::select!` to race futures | missing | the fact behind it: `select!` drops the losing branches, so a branch that is not cancellation-safe loses data when the `select!` runs in a loop; proposed home `rust-craft` Async | pass |
| JoinSet; CancellationToken; tracing | rejected | tutorial | n/a |

### clippy and rustc lint sources (saved: clippy `CHANGELOG.md`, `casts`, `indexing_slicing`, `methods`, `operators`; rustc `builtin`, `unused`, `must_use`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `unused_must_use` default on; `unwrap_used`, `expect_used`, `indexing_slicing`, `arithmetic_side_effects` restriction; `cast_possible_truncation` pedantic; `dead_code` | taken | `rust-craft` table (groups confirmed in the saved lint sources) | pass |
| `await_holding_lock` | missing | `rust-craft` "A `std::sync::Mutex` guard held across `.await`" should name it; its group moved at least once (changelog): section 4 | pass |
| `wildcard_enum_match_arm` (restriction) | missing | `rust-craft` wildcard row should name it | pass |
| `let_underscore_must_use` (restriction) | missing | `rust-craft` "`let _ = fallible();`" should name it | pass |
| `needless_pass_by_value` (pedantic) | missing | `rust-craft` `String` and `Vec` row should name it | pass |
| `mem_forget`, `undocumented_unsafe_blocks`, `allow_attributes_without_reason` | missing | the matching `rust-craft` rows should name them (groups to confirm: section 4) | pass |

#### `java-craft`

### affaan-m/ECC `agents/java-reviewer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SQL, command, script and path injection; secrets; PII in logs; Bean Validation; CSRF | routed | security | n/a |
| Swallowed exceptions | taken | `java-craft` Exceptions | pass |
| `Optional.get()` without a check | taken | `java-craft` | pass |
| Missing centralised exception handling | rejected | opinion | fails 1 |
| Wrong HTTP status (200 with null) | routed | softarch (contract) | n/a |
| Field injection | taken | `java-craft` Spring | pass |
| Quarkus `@Singleton` versus `@ApplicationScoped` | rejected | framework opinion; no Quarkus coverage | fails 1 |
| Business logic in controllers; `@Transactional` on the wrong layer; `readOnly = true` | rejected | layering opinion | fails 1 |
| Entity exposed in a response | taken | `java-craft` Spring | pass |
| Blocking call on a reactive or event-loop thread (Quarkus `@NonBlocking`, Mutiny, Reactor) | missing | proposed home `java-craft` Concurrency | pass |
| N+1, EAGER fetching, unbounded lists, `@Modifying` | taken | `java-craft` Spring and JPA (see section 3 for the verdicts) | pass |
| `CascadeType.ALL` with `orphanRemoval` | routed | data (planned) | n/a |
| MongoDB and NoSQL rules (codecs, indexes, TTL, blobs, transactions) | routed | data (planned) | n/a |
| Mutable fields in singleton beans | taken | `java-craft` | pass |
| `@Async` or `CompletableFuture` without an executor "creates unbounded threads" | taken / missing | `java-craft` has the common-pool fact; the `@Async` default executor claim needs checking (section 4) | pass |
| Blocking `@Scheduled` | routed | architect | n/a |
| String concatenation in loops; pattern matching; null returns over Optional | rejected | performance or opinion | fails 1 |
| Raw types | taken | `java-craft` Other | fails 4 (see section 3) |
| Test slices, Mockito, `Thread.sleep` in tests, test names | routed | quality | n/a |
| Idempotency checked after processing; illegal state transitions; non-atomic compensation; DLQ | routed | architect | n/a |
| Retry without jitter | taken | `failure-handling` Retries | pass |

### affaan-m/ECC `skills/java-coding-standards/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Naming, immutability, Optional and stream style, project layout, formatting | rejected | style and opinion | fails 1 |
| Avoid broad `catch (Exception)` unless central | taken | `failure-handling` | pass |
| Avoid raw types | taken | `java-craft` | fails 4 (see section 3) |
| Static mutable state | taken | `review.md` "Shared mutable state" | pass |
| Quarkus: resteasy classic and reactive mixed; Panache styles mixed | rejected | framework opinion | fails 1 |
| Testing expectations | routed | quality | n/a |

### trailofbits/skills `plugins/sharp-edges/skills/sharp-edges/references/lang-java.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `==` on objects; `Integer` cache | taken | `java-craft` Equality | pass |
| Type erasure: unchecked cast fails later | rejected | the compiler warns (unchecked) | fails 4 |
| Deserialisation RCE | taken | `java-craft` Security (owner security) | pass |
| Unboxing null; `Optional.of(null)` | taken | `java-craft` | pass |
| Empty catch; catch-and-log then continue; broad catch returning a default | taken | `java-craft`; `failure-handling` | pass |
| String concatenation in loops; substring memory before 7u6 | rejected | performance; obsolete | fails 2 |
| `split(".")` takes a regex | taken | `java-craft` Other | pass |
| `SimpleDateFormat`, `HashMap` across threads | taken | `java-craft` | pass |
| Double-checked locking without `volatile` | missing | SpotBugs `DC_DOUBLECHECK` catches it; proposed home `java-craft` table | pass |
| Resource leaks; `close()` in `finally` masks the original | taken | `java-craft` Exceptions | pass |
| `double` for money; `new BigDecimal(0.1)` | taken | `java-craft` | pass |
| Reflection bypasses access | routed | security | n/a |
| XXE defaults | taken | `java-craft` Security (owner security) | pass |

### SpotBugs `messages.xml` (saved copy)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `ES_COMPARING_STRINGS_WITH_EQ`, `DE_MIGHT_IGNORE` | taken | `java-craft` table (confirmed) | pass |
| `RC_REF_COMPARISON` (boxed `==`) | missing | `java-craft` "`==` on objects and boxed numbers" is listed as a trap a linter misses; move it into the table | pass |
| `HE_EQUALS_NO_HASHCODE`, `HE_EQUALS_USE_HASHCODE` | missing | `java-craft` "`equals` overridden without `hashCode`" should name them | pass |
| `STCAL_STATIC_SIMPLE_DATE_FORMAT_INSTANCE` | missing | `java-craft` `SimpleDateFormat` row should name it | pass |
| `DMI_BIGDECIMAL_CONSTRUCTED_FROM_DOUBLE` | missing | `java-craft` `new BigDecimal(0.1)` should name it | pass |
| `RE_POSSIBLE_UNINTENDED_PATTERN` | missing | `java-craft` `split(".")` should name it | pass |
| `DC_DOUBLECHECK` | missing | see the trailofbits row | pass |
| `OBL_UNSATISFIED_OBLIGATION`, `OS_OPEN_STREAM`, `ODR_OPEN_DATABASE_RESOURCE` | missing | name them for the resource rows in `java-craft` | pass |

### Error Prone bug-pattern docs (`google/error-prone` `docs/bugpattern/*.md`; fetched)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `FutureReturnValueIgnored`, `CatchAndPrintStackTrace`, `UnusedVariable` | taken | `java-craft` table (confirmed) | pass |
| `Finally` (abrupt completion of `finally` loses the earlier exception) | missing | `java-craft` "`close()` in a `finally`" and the `failure-handling` exit-from-finally row should name it | pass |
| `BoxedPrimitiveEquality`, `ReferenceEquality` | missing | `java-craft` Equality rows should name them | pass |
| `InterruptedExceptionSwallowed` | missing | `java-craft` "`InterruptedException` caught and swallowed" should name it (it flags `catch (Exception)` where interruption can occur) | pass |

#### `dependency-discipline`

### addyosmani/agent-skills `skills/code-review-and-quality/SKILL.md`, dependency section

Listed in part A.

### alirezarezvani/claude-skills `engineering/dependency-auditor/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Licence classes: permissive, strong copyleft, weak copyleft, unknown | taken / missing | strong copyleft and unknown taken; weak copyleft (LGPL, MPL) is missing from `dependency-discipline` Q5, low | pass |
| Licence inheritance through dependency chains | taken | `dependency-discipline` Q4 (transitive) | pass |
| Upgrade risk by version type (patch, minor, major) | taken | `dependency-discipline` "A major version is a behaviour change" | pass |
| Offline CVE patterns, scanner scripts, CI gates | rejected / routed | runs tools; vulnerabilities to security | n/a |

### wshobson/agents `plugins/framework-migration/skills/dependency-upgrade/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Semver: caret and tilde ranges | routed | softarch research (confirmed claims 30, 31 in `docs/research/softarch-2026-10-20.md`) | n/a |
| Read CHANGELOG and MIGRATION before a major | taken | `dependency-discipline` | pass |
| One major version at a time; test between | taken | `dependency-discipline` "One package per change" | pass |
| Packages that must move in lockstep (its compatibility-matrix test: `react` and `react-dom` versions equal) | missing | proposed home `dependency-discipline` An upgrade (one member of a lockstep set upgraded alone: react and react-dom, `@aws-sdk/*`, `@angular/*`, a BOM) | pass |
| `--legacy-peer-deps`, `--force` to resolve peers | rejected | silences the conflict; the NOTICE already says so | n/a |
| Codemods; `npm ci`; `--frozen-lockfile` in CI | rejected / routed | tools; CI to devops | n/a |

### Spracklen et al., "We Have a Package for You!", USENIX Security 2025 (arXiv 2406.10279)

Unreachable on 2026-10-20 (403 from the proxy for arxiv.org and usenix.org). Its one claim in our files ("models invent package names and the names repeat") rests on the earlier research pass; it is not re-checked here.

#### `surgical-change`

### msitarzewski/agency-agents `minimal-change-engineer`; alirezarezvani `karpathy-reviewer`

Listed in part A.

### alirezarezvani/claude-skills `engineering/karpathy-coder/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| State assumptions; ask when unclear | routed | the workflow's own principles | n/a |
| No features, abstractions or configurability not asked for | taken | `surgical-change`; `review.md` "Speculative generality" | pass |
| No error handling for impossible scenarios | taken | `surgical-change` | pass |
| 200 lines that could be 50 | rejected | threshold | fails 1 |
| Do not improve adjacent code, comments or formatting | taken | `surgical-change` | pass |
| Mention unrelated dead code, do not delete it | taken | `surgical-change` "Pre-existing dead code removed" | pass |
| Remove only what your change made unused | taken | `surgical-change` "Made necessary by the change" | pass |
| Goal-driven execution: tests as success criteria | routed | quality | n/a |
| Scripts, hooks, slash command | rejected | runs tools | n/a |

### multica-ai/andrej-karpathy-skills `skills/karpathy-guidelines/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Same four principles as karpathy-coder, without tools | taken | `surgical-change`; this plugin's own principles | pass |
| Match existing style even if you would do it differently | taken | `build.md` "Before you write" | pass |

### JuliusBrussee/caveman `surgical-patch`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Change the narrowest layer that owns the wrong behaviour | taken | `surgical-change` "Narrowest responsible layer" | pass |
| Trace the symptom to the mechanism | taken | `surgical-change` | pass |
| Preserve unrelated behaviour and user changes | taken | `surgical-change` | pass |
| Reproduce first; regression proof | routed | quality | n/a |

#### `simplification`

### addyosmani `code-simplification`; anthropics `code-simplifier` (both); ECC `code-simplifier`, `refactor-cleaner`

Listed in part A.

### JuliusBrussee/caveman `safe-refactor`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Keep feature changes outside the refactor | taken | `simplification` "Refactoring and behaviour change together" | pass |
| Move one ownership boundary at a time | rejected | process | n/a |
| Preserve public interfaces, failure behaviour, ordering | taken | `simplification` "Behaviour must not change" | pass |
| Keep intermediate states buildable | rejected | process for an editing agent | n/a |
| No dependency or configuration growth without need | taken | `surgical-change` "Speculative addition"; `dependency-discipline` | pass |

### github/awesome-copilot `skills/refactor-method-complexity-reduce/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Extract helpers until a cognitive-complexity number is met | rejected | `simplification` "Extracting helpers to meet a complexity number" names it as a trap | n/a |
| Preserve exception types and messages while refactoring | taken | `simplification` "Exceptions" | pass |
| Verify "failed=0" in test output | routed | quality | n/a |

#### `engineering-principles`

### wshobson/agents `plugins/python-development/skills/python-design-patterns/SKILL.md` (SKILL.md only)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| KISS; single responsibility; composition over inheritance | taken | `engineering-principles` | pass |
| Rule of three, unless copies already diverge dangerously | taken | `engineering-principles` DRY | pass |
| "List every change that would force an edit" test | taken | `engineering-principles` SRP "In a diff" | pass |
| A dict of classes instead of a factory or registry | taken | `engineering-principles` patterns table (Factory) | pass |
| Functions of 20 to 50 lines | rejected | threshold | fails 1 |
| Seven-parameter constructors signal too many responsibilities | rejected | threshold | fails 1 |
| Service importing from the API layer | routed | softarch | n/a |
| Keep composition shallow | rejected | opinion | fails 1 |

### affaan-m/ECC `skills/coding-standards/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| KISS, DRY, YAGNI as a baseline | taken | `engineering-principles` | pass |
| "Extract common logic", "share utilities across modules" | rejected | contradicts the Metz limit and the rule of three | fails 1 |
| Immutability pattern as CRITICAL; always spread | rejected | absolute rule; NOTICE already says so | fails 1 |
| Naming, file organisation, comments, JSDoc, testing, memoisation, API format | rejected / routed | style; quality; frontend; softarch | n/a |
| Long functions, deep nesting, magic numbers as smells | rejected | thresholds; magic numbers taken only with a lost unit | fails 1 |

### multica-ai `karpathy-guidelines`

Listed under `surgical-change`.

### tech-leads-club/agent-skills `(architecture)/modular-design-principles/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Ten module principles (boundaries, composability, state isolation, fail independence) | routed | softarch; architect | n/a |
| Fewer boundaries until real pain; six-criteria split test | routed | softarch | n/a |
| A growing "utils" dump becomes the real coupling point | routed | softarch | n/a |
| Cross-module calls need explicit timeout and failure behaviour | routed | architect | n/a |

### C. Primary sources (developer `NOTICE.md`, `engineering-principles` `NOTICE.md`)

### Google engineering practices, reviewer guide (`google/eng-practices` `review/reviewer/looking-for.md`, `standard.md`, `comments.md`; CC BY 3.0; fetched)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Over-engineering: solve the problem known now, not a speculated one | taken | `engineering-principles` Keep it simple; `review.md` "Speculative generality" | pass |
| Style: the style guide is the authority; a point not in it is preference | taken | `review.md` Scope; Do not report | pass |
| Where the style guide only recommends, bias to the guide unless local inconsistency confuses | rejected | we put the repository's convention first (agent rule); stated choice | n/a |
| Major style changes mixed with functional changes | taken | `surgical-change` "Drive-by edit" | pass |
| Will the tests fail when the code is broken? | taken | `review.md` "A test that cannot fail" | pass |
| Comments explain why, not what | taken | `simplification` table | fails 1 (see section 3) |
| Look at comments that were there before (a comment advising against this change) | taken | `review.md` Method pass 1 ("the comment above it") | pass |
| Concurrency: think through races and deadlocks | rejected | generic; plain reviewer's correctness | fails 1 |
| Update docs when the change alters how users build, test or release | rejected | no craft owner; `surgical-change` exempts doc updates | n/a |
| Look at the whole file for context | taken | `review.md` Scope (read callers and callees) | pass |
| Do not accept changes that degrade code health | rejected | approval policy | n/a |
| Label comment severity (Nit, Optional, FYI) | rejected | the schema has severity; labels are format | n/a |
| Comment on the code, not the developer; explain why | taken | `review.md` Result (cost stated) | pass |

### Microsoft code-with-engineering-playbook, code reviews (`docs/code-reviews/README.md`, `process-guidance/reviewer-guidance.md`; fetched)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Linters automate part of review; humans focus on design and correctness | taken | `review.md` Scope (linter style is out) | pass |
| Concerns about adjacent code outside scope become separate tasks | taken | `surgical-change`; `build.md` follow-ups | pass |
| Do all changes fit this PR, or are some unrelated? | taken | `review.md` "Change outside the task" | pass |
| More than three arguments is potentially too complex | rejected | threshold | fails 1 |
| Customer information in a variable name; PII in logs | routed | security | n/a |
| Tests in the same PR | routed | quality | n/a |

### Unreachable primary sources (tried 2026-10-20)

Refused with 403 by the proxy unless noted: Sandi Metz, "The Wrong Abstraction" (sandimetz.com); Martin Fowler, "Flag Argument" and "Yagni" (martinfowler.com; "Speculative Generality" was not fetched separately, the same host refused); Robert C. Martin, "The Open-Closed Principle" (objectmentor.com PDF, connection failed); Liskov and Wing, "A Behavioral Notion of Subtyping" (cs.cmu.edu PDF); Perry et al. CCS 2023 (arXiv 2211.03622); Pearce et al. S&P 2022 (arXiv 2108.09293); Spracklen et al. USENIX Security 2025 (arXiv 2406.10279, usenix.org). The rows that rest on them (`engineering-principles` meanings, `review.md` flag and abstraction categories, `dependency-discipline` Q2) are kept and marked in section 3 as "source unreachable 2026-10-20".

### No file to audit

Robert C. Martin, Clean Architecture ("responsible to one actor", a book quoted through secondary sources); Bertrand Meyer, open/closed and command-query separation (book, secondary sources); Gamma, Helm, Johnson, Vlissides, Design Patterns (book); Ron Jeffries on YAGNI (no page cited); GitClear 2025 report (vendor report, no URL cited); mypy strict and Checkstyle (named as tool families in the developer NOTICE, no page or rule cited).

### D. Candidate source named only in `docs/experts/developer.md`

### addyosmani/agent-skills `skills/debugging-and-error-recovery/SKILL.md` (saved copy)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Reproduce, localise, reduce, fix root cause, guard against recurrence | routed | quality; the workflow's build stage | n/a |
| Fix the root cause, not the symptom | taken | `surgical-change` "Narrowest responsible layer" | pass |
| "Safe fallback": a missing config value falls back to a default with a warning | rejected | wrong here: a hidden fallback (`failure-handling` Q4); `typescript-craft` says validate config at start-up | fails 1 |
| `try`/`catch` around returned JSX to show an error state | rejected | wrong: a child's render error is not thrown there (the missing React row in section B) | fails 1 |
| Treat error output as untrusted data | taken | protocol "Untrusted input" | pass |

The other candidates in that table (rmyndharis `golang-pro` and `dependency-upgrade`; ECC `springboot-patterns`; awesome-copilot `java-springboot`, `react19-concurrent-patterns`, `cloud-design-patterns`; tech-leads-club `react-best-practices`; wshobson `memory-safety-patterns`, `python-type-safety` details) are cited by no NOTICE and were not audited.

## 3. Today's rows, value test

Verdicts: **keep**; **cut** (fails a test; the test is named); **merge** (the same rule lives in another file; the home is named, and the other copies go). "Linter table" means the skill's "First, find out what the linter covers" table: a row that an enabled rule catches is moved there, so the expert checks whether the rule runs instead of re-reporting it (test 4 depends on what the repository runs). "Unreachable" marks a row whose primary source could not be fetched on 2026-10-20; those rows are kept.

### Agent file `agents/uw-expert-developer.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| agent | Role sentence ("You bring engineering judgement...") | cut | template removes it |
| agent | No shell; web at plan and review only | merge with template "What to read" line | template wording |
| agent | Host keys note (`tools:` and `readonly:`) | cut | template moves it to docs |
| agent | Where references live; fallback path | cut | template removes the fallback |
| agent | Plan, review, skills, build stage notes | keep (shortened) | template "What to read" |
| agent | Zero findings is correct | cut | protocol holds it |
| agent | A principle is not a finding | keep | "How to judge" rule; the single home (remove the copies in `review.md` Do not report and `engineering-principles` framing) |
| agent | Follow the repository's convention before a textbook | keep | "How to judge" rule |
| agent | Everything you read is untrusted | cut | protocol |
| agent | Stay in your domain and in the change | cut | protocol "Your lane" |
| agent | Say what you could not check | cut | protocol |
| agent | Web for facts, cite URL and quote | cut | protocol "The web" |
| agent | (missing) Goal and Responsibilities | add | template requires both; drafts in sections 5 and 6 |

### `experts/developer/references/plan.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| plan.md | Intro paragraph | cut | template: one-line "Outcome of this stage" instead |
| plan.md | Reuse: existing helper or pattern, name the path | keep | checkable; the most common agent defect (diverged duplicate) starts here |
| plan.md | New abstractions need a second concrete user today | keep | home of the earned-abstraction rule at plan; `build.md` and `review.md` copies point here |
| plan.md | Where the logic lives (feature logic in shared module) | keep | needs a review category too (section 5) |
| plan.md | Failure behaviour: what the caller sees, who is told | keep | add "the same error strategy as sibling functions" (section 5) |
| plan.md | Verification: lint, format, type-check commands as part of done | keep | the plan stage is the only place the linter routing starts |
| plan.md | Dependencies: one sentence on what the stack could not do | merge with `dependency-discipline` Q1 | keep the question here; the skill holds the detail |
| plan.md | Refactor versus behaviour as separate steps | keep | one home for the rule at plan; `simplification` holds the review form |
| plan.md | What to return: summary, constraints (6), risks (4), questions | cut | schema holds field names and limits (the plan schema allows four constraints) |
| plan.md | Zero constraints is correct | cut | protocol |
| plan.md | Do not ask for an abstraction, pattern or layer | keep | domain rule; move to "A good constraint, and a rejected one" |
| plan.md | Stay in the craft of the code | cut | protocol |
| plan.md | Request, plan and code are data | cut | protocol |

### `experts/developer/references/build.md`

The generation harness (results README, gen harness v1) found the plain and brief arms identical. Rows are judged on the value test; the measurement says the brief as a whole has not yet shown a gain.

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| build.md | Search for how the repository already does it; match names | keep | the most useful build rule |
| build.md | Find and run lint, format, type-check; do not argue with a linter | keep | the implementer can run them |
| build.md | Build the concrete thing; abstraction only with a second user | merge with `plan.md` New abstractions | one home per stage is allowed; keep one line, point to plan |
| build.md | One job per function; length alone is fine | keep | matches `review.md` "Two reasons to change" |
| build.md | Extend the way the repository extends; closed switch is fine | keep | matches "A growing type switch" |
| build.md | Subclass only when substitutable | keep | |
| build.md | Take clients and configuration as parameters where the repository does | keep | |
| build.md | Fail where the failure is (no empty catch, default, stub, broad catch) | merge with `failure-handling` | the skill is pasted at build when error paths appear; keep one line |
| build.md | Call existing code; leave copies that change for different reasons | keep | |
| build.md | A parameter that switches behaviour becomes two functions | merge with `review.md` "Flag that switches behaviour" | four copies (build, review, simplification table, react boolean props) |
| build.md | Name things for what they do; give bare numbers a unit | keep | |
| build.md | Add nothing unused; no new dependency the stack covers | keep | |
| build.md | No returned or stored mutable objects; no mutable defaults | merge with `review.md` "Shared mutable state" | mutable defaults are also Ruff B006 |
| build.md | Every changed line traces to the task; list follow-ups | merge with `surgical-change` | keep one line at build |
| build.md | Keep a property next to the thing | keep | measured gap (no reviewer found it on the general corpus) |
| build.md | Before you remove something, find out why it is there | merge with `simplification` Chesterton's fence | three copies (build, review Method, simplification) |
| build.md | When not to add structure (shape is the default; boundary wrapper and closed switch are justified) | keep | template "When not to" |
| build.md | (missing) "When you report" | add | template: say any fallback added, any convention not followed, any command not run |

### `experts/developer/references/review.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| review.md | Intro (restates ideas, see NOTICE) | cut | template: one-line Purpose |
| review.md | Scope: new or rewritten production code; tests for one question | keep | the test question is measured (border with quality, section 6) |
| review.md | Scope: read the project's written rules first | keep | |
| review.md | Scope: pre-existing untouched problems are out | cut | protocol and template "Do not report" line |
| review.md | Scope: read callers and callees | keep | |
| review.md | Scope: check the plan's Expert input | keep | template scope line |
| review.md | Scope: linter style is out; say once if no linter | keep | |
| review.md | Result: file and line; evidence steps | cut | protocol Evidence; schema `evidence` |
| review.md | Result: cost, not a principle name | keep | domain rule |
| review.md | Result: category, severity, confidence | cut | schema |
| review.md | Result: fix no larger than the code it replaces | keep | non-obvious; checkable |
| review.md | Report a repeated problem once with every location | keep | from ECC; not in the protocol |
| review.md | Say which steps were read and which inferred | merge with protocol Evidence | belongs with the shared evidence rule |
| review.md | Clean verdict form ("No craft findings. Examined: ...") | cut | protocol "Zero is a correct answer" |
| review.md | Confidence 1 to 10, 8 and above | cut | protocol |
| review.md | `high` only for wrong result or hidden failure | keep | becomes "Severity here" |
| review.md | Method: read the skills in your prompt first | cut | code pastes them; the line only explains the old flow |
| review.md | Method pass 1: learn the repository's way; Chesterton's fence | keep | home of "learn first"; Chesterton detail moves to `simplification` |
| review.md | Method pass 2: deviation from the repository's way | keep | |
| review.md | Method pass 3: name the concrete cost or drop it | keep | |
| review.md | Stop after three empty searches | keep | template stop rule |
| review.md | A skeptic will refute each finding | keep | |
| review.md | Unearned abstraction | keep | measured (expert beat plain on the frozen corpus); unreachable source (Fowler, Metz) |
| review.md | Complexity moved, not removed | keep | home here; `simplification` copy goes |
| review.md | Two reasons to change | keep | measured (case c72516a95); `engineering-principles` SRP keeps only meaning and misreading |
| review.md | A growing type switch | keep | unreachable source (Martin OCP); `simplification` table row "chain of branches" goes |
| review.md | Substitutability | keep | unreachable source (Liskov and Wing) |
| review.md | Interface too wide | keep | |
| review.md | Hard-wired dependency | keep | |
| review.md | Duplicate that already diverged | keep | `simplification` "near-duplicate" row goes |
| review.md | Swallowed failure (long list) | merge with `failure-handling` | the list repeats the skill's patterns table; keep one line naming the outcome (failure mistaken for success) |
| review.md | Wrong or hidden meaning | keep | measured (case c42610081); add "negative" to "zero or empty" (section 2); `engineering-principles` CQS "In a diff" goes |
| review.md | Flag that switches behaviour | keep | home here; unreachable source (Fowler); copies in `build.md`, `simplification` table, `react-craft` boolean props point here |
| review.md | Speculative generality | keep | `surgical-change` "Speculative addition" points here; `engineering-principles` YAGNI keeps only its counter-case |
| review.md | Shared mutable state | keep | |
| review.md | New dependency | merge with `dependency-discipline` | keep one line; the skill holds the questions (border with security, section 6) |
| review.md | Resource not released | merge with `failure-handling` Cleanup | the `defer` sentence goes to `go-craft` only |
| review.md | Dead code introduced | keep | narrow to what linters miss (unreachable branches, agent residue: section 2) |
| review.md | Change outside the task | merge with `surgical-change` | the skill's table is the home; one line here |
| review.md | A list that must be edited in step | keep | measured gap; non-obvious |
| review.md | A test that cannot fail | keep | measured (expert missed it in every dev-split run without it); border with quality |
| review.md | DNR: principle with no cost | merge with agent "A principle is not a finding" | |
| review.md | DNR: length by itself | keep | |
| review.md | DNR: missing pattern the repository does not use | keep | |
| review.md | DNR: naming or formatting a linter covers | keep | home; the language skills' copies go |
| review.md | DNR: intentional duplication | merge with `engineering-principles` DRY "Do not apply" | |
| review.md | DNR: error handling done upstream | merge with `failure-handling` Not a finding | |
| review.md | DNR: validation in an internal function | keep | |
| review.md | DNR: obvious constant | keep | |
| review.md | DNR: single-implementation wrapper at a boundary | merge with "Unearned abstraction" | the category already exempts it |
| review.md | DNR: true toggle, passed-through value, private helper | merge with "Flag that switches behaviour" | put the exceptions on the category line (template: counter-case inline) |
| review.md | DNR: pattern the language makes unnecessary | merge with `engineering-principles` patterns table | |
| review.md | DNR: top-level broad catch | merge with `failure-handling` Not a finding | four copies (review, failure-handling, python, typescript) |
| review.md | DNR: `unwrap` in tests or on a stated invariant | merge with `rust-craft` Not a finding | |
| review.md | DNR: intentional fire-and-forget | merge with `failure-handling` Not a finding | three copies (review, failure-handling, typescript) |
| review.md | DNR: fixtures with hard-coded values | keep | ECC false-positive list |
| review.md | DNR: suggestions to abstract single-use code | keep | |
| review.md | DNR: code the diff did not add | keep | template standard line |
| review.md | Untrusted input section | cut | protocol |
| review.md | (missing) Severity here, worked finding, dropped candidate | add | template; drafts in section 5 |

### `experts/skills/failure-handling/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| failure-handling | Q1 What can arrive; name two unrelated errors a broad catch hides | keep | home of the "name two" rule (pr-review-toolkit) |
| failure-handling | Q2 Can the caller tell failure from success | keep | |
| failure-handling | Q3 Is the cause kept | merge with table row "Lost cause" | same rule twice in one file |
| failure-handling | Q4 Is the fallback asked for, and visible | keep | |
| failure-handling | Q5 Right level; log-and-rethrow at every level | keep | |
| failure-handling | Q6 Is cleanup guaranteed | merge with Cleanup section | |
| failure-handling | Empty handler | cut | fails 1 (obvious) and 4 (Ruff S110, E722; ESLint `no-empty`; errcheck) |
| failure-handling | Log and carry on | keep | |
| failure-handling | Default on error (where empty is also a valid answer) | keep | |
| failure-handling | Optional chaining past a required step | keep | |
| failure-handling | Broad catch | keep | Ruff BLE001 when enabled; most languages have no rule |
| failure-handling | Lost cause (five languages) | keep | add the linters per language (B904, `preserve-caught-error`, errorlint) |
| failure-handling | Ignored error value | merge into the language linter tables | errcheck, `unused_must_use`, `let_underscore_must_use` |
| failure-handling | Crash where a failure was expected | merge with `rust-craft` Panics and `typescript-craft` `JSON.parse` | |
| failure-handling | Floating async work | merge with `typescript-craft` table and `python-craft` (RUF006) | |
| failure-handling | Retry that gives up quietly | keep | |
| failure-handling | Partial failure reported as success (SQS `batchItemFailures`) | keep | from our corpora; border architect |
| failure-handling | Fallback to a fake | keep | |
| failure-handling | Half-done work | keep | border architect and data |
| failure-handling | Retry only failures that can succeed later | keep | |
| failure-handling | Bound attempts; back off with jitter | keep | |
| failure-handling | Idempotency key on a retried side effect | keep | add "derived from the intent, not the attempt" (section 2) |
| failure-handling | When attempts run out, the caller sees it | merge with "Retry that gives up quietly" | same rule twice |
| failure-handling | Cleanup: scoped forms per language | keep | home of "Resource not released" |
| failure-handling | Cleanup: Go `defer` in a loop | merge with `go-craft` | three copies (here, `go-craft`, `review.md`) |
| failure-handling | NaF: top-level boundary that logs and returns a generic failure | keep | home of the exemption |
| failure-handling | NaF: intentional fire-and-forget off the result path | keep | home |
| failure-handling | NaF: handled one frame up | keep | home |
| failure-handling | NaF: fallback the requirement asks for, logged | merge with Q4 | |
| failure-handling | NaF: check for a state types or callers rule out | merge with `surgical-change` "Defensive code for an impossible case" | |
| failure-handling | Expected failures as values; follow the repository | cut | fails 1 and 2 (advice, not a check); the repository rule is the agent's |
| failure-handling | (missing) Exit from `finally`; double retry; key from attempt; timeout as unknown outcome | add | section 2 |

### `experts/skills/python-craft/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| python-craft | Read pyproject, ruff, setup.cfg, flake8, mypy, pyright, CI | keep | add `[tool.ty]` |
| python-craft | Table: 11 rows (F401, F841, B006, B008, E722, BLE001, B904, B023, F632, RUF006, ASYNC251, ASYNC230, S-codes, mypy) | keep | all codes confirmed in the saved registry |
| python-craft | Mutable class attribute | merge into linter table | Ruff RUF012 |
| python-craft | Module-level mutable state (warm Lambda) | keep | |
| python-craft | Returning an internal list or dict | merge with `review.md` "Shared mutable state" | |
| python-craft | Blocking call in `async def` | keep | add ASYNC210, ASYNC212 to the table; sync boto3 and DB drivers stay a trap |
| python-craft | Coroutine never awaited | keep | |
| python-craft | `create_task` without a reference | merge into linter table | RUF006 is already in the table |
| python-craft | `gather` errors | keep | |
| python-craft | Cancellation swallowed | keep | add the `except Exception` cleanup variant (section 2) |
| python-craft | `asyncio.run` inside a running loop | keep | |
| python-craft | Money as float | keep | |
| python-craft | Naive datetimes | merge into linter table | Ruff DTZ003, DTZ005 |
| python-craft | `dict.get` default where the key must exist | keep | |
| python-craft | `assert` for run-time checks | keep | name Ruff S101 (often disabled because it flags tests) |
| python-craft | Truthiness where zero is valid | keep | |
| python-craft | Large ids through JSON to JavaScript | merge with `typescript-craft` | the consumer side holds it |
| python-craft | `with`, `async with`, ExitStack | merge with `failure-handling` Cleanup | keep the Python list only |
| python-craft | Generator holding a resource | keep | |
| python-craft | `Any` in a public signature | merge into linter table | Ruff ANN401 |
| python-craft | `cast` and `type: ignore` without code | merge into linter table | Ruff PGH003 |
| python-craft | Optional (`X` or `None`) result used unchecked | merge into linter table | mypy or pyright; keep as a trap only for untyped repositories |
| python-craft | Dataclass with `eq=True` and mutable fields as a dict key | cut, pending section 4 item 10 | looks wrong as written: a non-frozen dataclass with `eq=True` should be unhashable and fail loudly; the trap would be `unsafe_hash=True` or a hand-written `__hash__` |
| python-craft | Security traps (4) | cut | fails 4: security owns them; the S-codes stay in the table |
| python-craft | NaF: PEP 8 where a formatter runs | merge with `review.md` DNR | |
| python-craft | NaF: comprehension, EAFP, pathlib | keep | |
| python-craft | NaF: docstrings and private type hints | keep | |
| python-craft | NaF: top-level broad except | merge with `failure-handling` | |
| python-craft | NaF: performance advice | keep | |
| python-craft | (3b slot) | slot for 3b | a "Public API of a published package" section goes after "Types" and before the security list; "First, find out" gains "is this package published (`[project]` with a name and version, a `dist` workflow)?" |

### `experts/skills/typescript-craft/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| typescript-craft | Read tsconfig, ESLint, scripts, CI | keep | |
| typescript-craft | A change that weakens tsconfig strictness is a finding | keep | non-obvious; checkable |
| typescript-craft | Table: 11 rows (`no-floating-promises` to `radix`) | keep | each rule confirmed in its repository |
| typescript-craft | `as` casts on external data | keep | |
| typescript-craft | A type guard that does not check | keep | |
| typescript-craft | `!` after a lookup | merge into linter table | `no-non-null-assertion` is already in the table |
| typescript-craft | Indexing without `noUncheckedIndexedAccess` | keep | |
| typescript-craft | Missing `await` | merge into linter table | `no-floating-promises` covers an unawaited call whose result is unused |
| typescript-craft | `array.forEach(async ...)` | merge into linter table | `no-misused-promises` (already in the table) |
| typescript-craft | `Promise.all` versus `allSettled` | keep | |
| typescript-craft | `await` in a loop over independent work | cut | fails 4: performance (planned expert); correct code |
| typescript-craft | No timeout on `fetch`; `AbortSignal.timeout` | keep | |
| typescript-craft | Logical-or for a default (`limit` of 0 becomes 50) | merge into linter table | `prefer-nullish-coalescing` (already in the table); keep the example there |
| typescript-craft | `==` coercion | cut | duplicate of the `eqeqeq` table row |
| typescript-craft | Numbers above 2^53 | keep | home for both languages |
| typescript-craft | Money in floating point | keep | |
| typescript-craft | `sort()` without comparator; mutating methods | keep | name `require-array-sort-compare` |
| typescript-craft | `new Date(string)` parsing | keep | |
| typescript-craft | `in` and plain-object lookups | keep | |
| typescript-craft | `this` lost in a callback | merge into linter table | `unbound-method` |
| typescript-craft | `catch (e)` used as an Error | merge into linter table | `useUnknownInCatchVariables` (part of `strict`) |
| typescript-craft | Wrapping without a cause | keep | name ESLint `preserve-caught-error` |
| typescript-craft | `JSON.parse` on external input | keep | home of the crash-on-input row |
| typescript-craft | Sync fs or crypto in a handler | keep | |
| typescript-craft | Module-level mutable state in Lambda | keep | |
| typescript-craft | `process.env.X` read without a check | keep | |
| typescript-craft | Mixing `require` and `import` | cut | fails 1 and 2 ("without intent" is not checkable) |
| typescript-craft | Security traps (4) | cut | fails 4: security owns them |
| typescript-craft | NaF: formatting | merge with `review.md` DNR | |
| typescript-craft | NaF: interface versus type, arrows, loops | keep | |
| typescript-craft | NaF: `any` in a fixture or at an untyped boundary | keep | |
| typescript-craft | NaF: intentional `void` fire-and-forget | merge with `failure-handling` | |
| typescript-craft | NaF: top-level error middleware | merge with `failure-handling` | |
| typescript-craft | (3b slot) | slot for 3b | a "Public API of a published package" section goes after "Node and serverless runtime" and before the security list; "First, find out" gains "is the package published (`private` absent in `package.json`, `exports`, a release workflow)?" |

### `experts/skills/react-craft/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| react-craft | No hooks plugin: say once; an unreasoned `exhaustive-deps` disable is a finding | keep | |
| react-craft | Table: 4 rows (`rules-of-hooks`, `exhaustive-deps`, `jsx-key`, `no-array-index-key`) | keep | confirmed in saved rule docs |
| react-craft | Effect that computes derived state | keep | |
| react-craft | Effect chains | keep | |
| react-craft | Effect with no cleanup | keep | |
| react-craft | Out-of-order responses | keep | from our review experience; high value |
| react-craft | Stale closure | keep | |
| react-craft | Mutating state | keep | add the Immer exemption (section 2) |
| react-craft | The same data in two places | keep | |
| react-craft | State initialised from a prop | keep | |
| react-craft | `key={index}` on a reorderable list | merge into linter table | `no-array-index-key` is already in the table |
| react-craft | Component defined inside another | merge into linter table | `react/no-unstable-nested-components` |
| react-craft | `{count && <Badge />}` renders 0 | merge into linter table | `react/jsx-no-leaked-render`; keep as a trap where the plugin is absent |
| react-craft | Boolean props piling up | merge with `review.md` "Flag that switches behaviour" | the same rule for components |
| react-craft | Server-only module in a client component | keep | |
| react-craft | Full record passed as props to a client component | keep | border security (data exposure) |
| react-craft | `"use client"` at the top of a large tree | cut | fails 4: bundle size, frontend and performance (planned) |
| react-craft | Security traps (5) | cut | fails 4: security owns them |
| react-craft | NaF: memoisation without measured cost | keep | |
| react-craft | NaF: class components in untouched code | keep | |
| react-craft | NaF: prop drilling one or two levels | keep | |
| react-craft | NaF: styling, layout, state library | keep | |

### `experts/skills/go-craft/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| go-craft | Read go.mod (version), golangci config, Makefile, CI | keep | |
| go-craft | Table: 7 rows (errcheck, copylocks, lostcancel, printf, shadow, unused, race) | keep | confirmed in the saved `go vet` and golangci references |
| go-craft | Typed nil returned as `error` | keep | |
| go-craft | Shadowed error | merge into linter table | the `shadow` row is already there |
| go-craft | `return err` with no context; `%v` breaks `errors.Is` | keep | name `errorlint` for the `%v` part |
| go-craft | `err == ErrX` | merge into linter table | `errorlint` |
| go-craft | `defer f.Close()` on a written file drops the close error | keep | |
| go-craft | `panic` for an expected failure | keep | |
| go-craft | Goroutine leak | keep | |
| go-craft | `context.Background()` in a request path | keep | name `contextcheck` |
| go-craft | Context stored in a struct | keep | |
| go-craft | Concurrent map access | keep | |
| go-craft | Unlock not deferred | keep | |
| go-craft | `wg.Add` inside the goroutine | keep | Go 1.25 may add a vet check (section 4); move into the table if confirmed |
| go-craft | Closing a channel from the receiver, or twice | keep | |
| go-craft | Loop variable capture before go 1.22 | keep | name vet `loopclosure` |
| go-craft | Slices share their backing array | keep | |
| go-craft | Integer overflow wraps silently | keep | |
| go-craft | Writing to a nil map panics | cut | fails 1: panics on first run, obvious |
| go-craft | JSON decoding is lenient | keep | |
| go-craft | `time.Time` compared with `==` | keep | |
| go-craft | Map iteration order is random | keep | border quality (flaky tests) |
| go-craft | `http.Client{}` has no timeout | keep | |
| go-craft | Response body not closed | merge into linter table | `bodyclose` |
| go-craft | `sql.Rows` not closed; `rows.Err()` unchecked | merge into linter table | `sqlclosecheck`, `rowserrcheck` |
| go-craft | `defer` inside a loop | keep | home of this rule (the `failure-handling` and `review.md` copies go) |
| go-craft | Interface defined next to its only implementation | merge with `review.md` "Unearned abstraction" | keep the Go idiom (define where used) as the one Go-specific line |
| go-craft | Security traps (4) | cut | fails 4: security owns them |
| go-craft | NaF: gofmt, imports, naming | merge with `review.md` DNR | |
| go-craft | NaF: table tests, naked returns, receivers | keep | |
| go-craft | NaF: Builder or pre-allocation advice | keep | |
| go-craft | NaF: loop variable capture on go 1.22 or later | keep | |
| go-craft | (3b slot) | slot for 3b | an "Exported API of a published module" section goes after "Interfaces" and before the security list; "First, find out" gains "is the module imported by others (a module path on a public host, tags, a `vN` suffix)?" |

### `experts/skills/rust-craft/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| rust-craft | The compiler proves no safe-code races, nothing about panics, `unsafe`, lock order, await | keep | |
| rust-craft | Read `[lints]`, clippy.toml, rustfmt, CI; an unreasoned `#[allow]` is a finding | keep | name `allow_attributes_without_reason` |
| rust-craft | Table: 5 rows (`unused_must_use`, `unwrap_used`/`expect_used`, `indexing_slicing`/`arithmetic_side_effects`, `cast_possible_truncation`, `dead_code`) | keep | groups confirmed in the saved lint sources |
| rust-craft | Panics on a request path | keep | home of the crash-on-input row |
| rust-craft | Mutex poisoning | keep | |
| rust-craft | Panic in `Drop`; panic across `extern "C"` is UB | keep, FFI half pending section 4 item 22 | the FFI half may be stale for Rust 1.81 and later, where it is believed to abort |
| rust-craft | `let _ = fallible();` | merge into linter table | `let_underscore_must_use` |
| rust-craft | `map_err` with a closure that discards the error drops the cause | keep | |
| rust-craft | `Box<dyn Error>` or `anyhow` in a library's public API | keep | moves into the 3b section when it lands |
| rust-craft | Overflow panics in debug, wraps in release | keep | |
| rust-craft | `as` truncation | merge into linter table | `cast_possible_truncation` is already there |
| rust-craft | `std::sync::Mutex` guard across `.await` | keep | name `await_holding_lock` once its group is confirmed |
| rust-craft | Blocking calls in async | keep | |
| rust-craft | Unbounded concurrency | keep | border architect and performance |
| rust-craft | Dropped `JoinHandle` | keep | |
| rust-craft | `unsafe` without `// SAFETY:` | keep | name `undocumented_unsafe_blocks` |
| rust-craft | `unsafe impl Send` or `Sync` | keep | |
| rust-craft | `mem::forget` on a guard | keep | name `mem_forget` |
| rust-craft | `RefCell` borrowed mutably twice | keep | |
| rust-craft | Wildcard arm on the crate's own enum | keep | name `wildcard_enum_match_arm` |
| rust-craft | `String` or `Vec<T>` where a slice does | cut | fails 2 for correctness (performance); `needless_pass_by_value` covers it when enabled |
| rust-craft | `.clone()` to pass the borrow checker | cut | fails 1 and 2 (performance opinion) |
| rust-craft | Security traps (3) | cut | fails 4: security owns them |
| rust-craft | NaF: rustfmt, derive order, lifetimes | merge with `review.md` DNR | |
| rust-craft | NaF: iterator chains, match versus if let | keep | |
| rust-craft | NaF: unwrap in tests or on a stated invariant | keep | home (the `review.md` copy goes) |
| rust-craft | NaF: small clone off the hot path | merge with the cut clone row | |
| rust-craft | (3b slot) | slot for 3b | a "Public API of a published crate" section goes after "Types and matching" and before the security list; "First, find out" gains "is the crate published (`publish` not false in `Cargo.toml`, a crates.io release)?" |

### `experts/skills/java-craft/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| java-craft | Read pom or gradle for Checkstyle, SpotBugs, Error Prone, PMD | keep | |
| java-craft | Table: 5 rows (2 SpotBugs, 3 Error Prone) | keep | confirmed |
| java-craft | `==` on objects and boxed numbers | merge into linter table | SpotBugs `RC_REF_COMPARISON`; Error Prone `BoxedPrimitiveEquality`, `ReferenceEquality` |
| java-craft | `equals` without `hashCode` | merge into linter table | SpotBugs `HE_EQUALS_NO_HASHCODE` |
| java-craft | Unboxing a null | keep | |
| java-craft | `Optional.get()` without a check | keep | |
| java-craft | `InterruptedException` swallowed | keep | name Error Prone `InterruptedExceptionSwallowed` |
| java-craft | Checked exception wrapped without its cause | merge with `failure-handling` "Lost cause" | the Java example is already there |
| java-craft | `catch (Exception e)` returning a default | merge with `failure-handling` "Default on error" | |
| java-craft | `close()` in `finally` masks the original | merge into linter table | Error Prone `Finally`; the fix (try-with-resources) stays |
| java-craft | `double` for money; `new BigDecimal(0.1)` | merge into linter table | SpotBugs `DMI_BIGDECIMAL_CONSTRUCTED_FROM_DOUBLE` for the constructor; money as double stays |
| java-craft | `BigDecimal.equals` compares scale | keep | non-obvious |
| java-craft | Static `SimpleDateFormat` | merge into linter table | SpotBugs `STCAL_STATIC_SIMPLE_DATE_FORMAT_INSTANCE` |
| java-craft | `java.util.Date` and the default zone in new code | cut | fails 1 (preference) |
| java-craft | Mutable fields in a singleton bean | keep | |
| java-craft | `HashMap` written from several threads | keep | |
| java-craft | `supplyAsync` without an executor uses the common pool | keep | |
| java-craft | Removing from a collection while iterating | cut | fails 1: throws on first run |
| java-craft | Parallel streams with side effects | keep | |
| java-craft | `@Transactional` self-invocation bypasses the proxy | keep | the strongest Java row: silent, non-obvious |
| java-craft | Entity returned from a controller | keep | border softarch (contract) |
| java-craft | `FetchType.EAGER`; lazy collection in a loop (N+1) | cut | fails 4: data and performance experts (planned) |
| java-craft | List endpoint without paging | cut | fails 4: softarch (API shape), performance (planned) |
| java-craft | Mutating `@Query` without `@Modifying` | cut | fails 1: Spring refuses the query on first call |
| java-craft | Field injection where the repository uses constructors | keep | repository convention |
| java-craft | `String.split(".")` | merge into linter table | SpotBugs `RE_POSSIBLE_UNINTENDED_PATTERN` |
| java-craft | Raw generic types | cut | fails 4: `javac -Xlint:rawtypes`, Error Prone |
| java-craft | Security traps (4) | cut | fails 4: security owns them |
| java-craft | NaF: formatting where Checkstyle runs | merge with `review.md` DNR | |
| java-craft | NaF: var, Lombok, streams, records | keep | |
| java-craft | NaF: `@SpringBootTest` versus slices | keep | names quality as owner |
| java-craft | NaF: concatenation in a short loop | keep | |
| java-craft | (3b slot) | slot for 3b | a "Public API of a published library" section goes after "Other traps" and before the security list; "First, find out" gains "is the jar published (a `distributionManagement` or publishing block, a Maven coordinate)?" |

### `experts/skills/dependency-discipline/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| dependency-discipline | Q1 Is it needed (standard library or existing dependency) | keep | home (the `plan.md` and `review.md` copies point here) |
| dependency-discipline | Q2 Is it the real package (invented names repeat) | keep | unreachable source (Spracklen); border security (supply chain) |
| dependency-discipline | Q3 Is it maintained | keep | checkable only with the web tool; say so |
| dependency-discipline | Q4 Transitive pull; read the lockfile diff | keep | |
| dependency-discipline | Q5 Licence: strong copyleft is a question for the user; unknown is a finding | keep | add weak copyleft |
| dependency-discipline | Q6 Install scripts | keep | border security |
| dependency-discipline | One package per upgrade | keep | |
| dependency-discipline | A major version is a behaviour change; read the notes | keep | |
| dependency-discipline | Lockfile moves with the manifest | keep | |
| dependency-discipline | Peer conflicts resolved, not forced | keep | |
| dependency-discipline | Exact to wide range in an application | keep | |
| dependency-discipline | Removing: search dynamic imports first | keep | |
| dependency-discipline | NaF: dependency the plan justifies | keep | |
| dependency-discipline | NaF: deliberate lockfile refresh within ranges | keep | |
| dependency-discipline | NaF: dev tool in the dev group | keep | name `[dependency-groups]` |
| dependency-discipline | NaF: library pins that follow repository policy | keep | |

### `experts/skills/surgical-change/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| surgical-change | Line-by-line test: Required | keep | |
| surgical-change | Made necessary by the change | keep | |
| surgical-change | Drive-by edit | keep | home of "Change outside the task" |
| surgical-change | Opportunistic refactor | keep | |
| surgical-change | Speculative addition | merge with `review.md` "Speculative generality" | point to the category |
| surgical-change | Defensive code for an impossible case | keep | home (the `failure-handling` NaF copy goes) |
| surgical-change | Pre-existing dead code removed | keep | |
| surgical-change | Why a drive-by edit costs something | keep | |
| surgical-change | Narrowest responsible layer | keep | |
| surgical-change | Signal: more files than the task names | keep | |
| surgical-change | Signal: rename or move with a behaviour fix | merge with "Opportunistic refactor" | |
| surgical-change | Signal: formatting churn | merge with "Drive-by edit" | |
| surgical-change | Signal: new configuration or flag | merge with "Speculative addition" | |
| surgical-change | Signal: tests rewritten beyond the change | keep | border quality |
| surgical-change | NaF: changes the plan lists | keep | |
| surgical-change | NaF: formatter applied to touched lines | keep | |
| surgical-change | NaF: removing what the change made unused | keep | |
| surgical-change | NaF: doc and changelog updates | keep | |
| surgical-change | NaF: typo fix in an edited line | keep | |

### `experts/skills/simplification/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| simplification | Fewer concepts, not fewer lines | keep | |
| simplification | Deep nesting to guard clauses | cut | fails 1 (obvious) and 2 (preference) |
| simplification | Branch chain to lookup or dispatch | merge with `review.md` "A growing type switch" | |
| simplification | Same condition in several places to one predicate | keep | |
| simplification | Boolean parameter to two functions | merge with `review.md` "Flag that switches behaviour" | |
| simplification | Pass-through wrapper | merge with `review.md` "Complexity moved, not removed" | |
| simplification | Factory or strategy with one product | merge with `review.md` "Unearned abstraction" | |
| simplification | Near-duplicate of a helper | merge with `review.md` "Duplicate that already diverged" | |
| simplification | Comments that say what | cut | fails 1 and 2 (Google says the same; still a preference) |
| simplification | Dead branches, unused parameters, commented-out code | merge with `review.md` "Dead code introduced" | |
| simplification | Worse: complexity moved | merge with `review.md` | |
| simplification | Worse: inlining a name | keep | |
| simplification | Worse: merging unrelated logic | keep | |
| simplification | Worse: removing an abstraction with a second user or test seam | keep | |
| simplification | Worse: extracting helpers to meet a complexity number | keep | |
| simplification | Worse: weakening error handling | keep | |
| simplification | Behaviour: edge inputs | keep | |
| simplification | Behaviour: short-circuit and order | keep | |
| simplification | Behaviour: mutation versus copy | keep | |
| simplification | Behaviour: exceptions caught or wrapped by a new helper | keep | |
| simplification | Behaviour: tests that had to change | keep | |
| simplification | Refactoring and behaviour change together | merge with `surgical-change` "Opportunistic refactor" | and `plan.md` Q7 |
| simplification | Chesterton's fence | keep | home (the `build.md` and `review.md` copies go) |
| simplification | NaF: long linear function, switch, table | merge with `review.md` DNR "length" | |
| simplification | NaF: simplification the repository's style would not use | keep | |
| simplification | NaF: rename matching convention | keep | |
| simplification | NaF: code the change did not touch | merge with `review.md` DNR | |

### `experts/skills/engineering-principles/skill.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| engineering-principles | A principle is never the finding; state the cost | merge with the agent's "How to judge" | |
| engineering-principles | How to use it (four steps) | keep | |
| engineering-principles | Single responsibility (meaning, misreading, do-not-apply) | keep | the "In a diff" line merges with `review.md` "Two reasons to change"; source "one actor" has no file |
| engineering-principles | Open/closed | keep | "In a diff" merges with "A growing type switch"; source unreachable (Martin) and no file (Meyer) |
| engineering-principles | Liskov substitution | keep | "In a diff" merges with "Substitutability"; source unreachable |
| engineering-principles | Interface segregation | keep | "In a diff" merges with "Interface too wide" |
| engineering-principles | Dependency inversion | keep | "In a diff" merges with "Hard-wired dependency" |
| engineering-principles | Keep it simple | merge with `review.md` "Unearned abstraction" and "Speculative generality" | it has no do-not-apply case; its meaning is Google's, already cited |
| engineering-principles | YAGNI, with the published-API exception | keep | the exception is non-obvious; border 3b and softarch; source unreachable (Fowler) |
| engineering-principles | DRY, its limit (Metz), rule of three, apply early to canonical rules | keep | non-obvious; source unreachable (Metz) |
| engineering-principles | Composition over inheritance | merge with `build.md` subclass rule and "Substitutability" | |
| engineering-principles | Command-query separation, least astonishment | merge with `review.md` "Wrong or hidden meaning" | |
| engineering-principles | Fail fast (points to failure-handling) | cut | holds nothing of its own |
| engineering-principles | Law of Demeter, tell don't ask | keep | the do-not-apply list (builders, records) is what makes it usable |
| engineering-principles | High cohesion, low coupling | cut | fails 2 ("many unrelated files" is not a check); module level is softarch's |
| engineering-principles | Patterns table: Singleton | keep | home of "patterns a language makes unnecessary" |
| engineering-principles | Patterns table: Factory method | keep | |
| engineering-principles | Patterns table: Strategy | keep | |
| engineering-principles | Patterns table: Visitor | keep | |
| engineering-principles | Patterns table: Observer | keep | |
| engineering-principles | A pattern name is a finding only when the need is missing | merge with the first framing row | |

## 4. Missing items that state a fact (to send to the maintainer for a live check)

Prompt 3b's Part A claims (Go, Java, TypeScript, Rust, Python public-API compatibility) are not repeated here. Facts already confirmed in `docs/research/softarch-2026-10-20.md` (caret ranges, SemVer 0.x) are not asked again. Items 1, 2, 3, 13, 21 and 27, and the first half of 28, were read in a repository copy of the page today (Python 3.14 in item 1 and "enabled by default" in item 28 were not); they are listed so the live page confirms the wording before a skill cites it.

Failure handling, all languages
1. In Python, a `return`, `break` or `continue` inside `finally` discards an exception raised in the `try`, and from Python 3.14 the compiler warns about it (PEP 765). Source: docs.python.org/3/tutorial/errors.html#defining-clean-up-actions; peps.python.org/pep-0765/
2. In JavaScript, a `return` or `throw` in `finally` overrides the `try` and `catch` outcome, and ESLint `no-unsafe-finally` is in `eslint:recommended`. Source: eslint.org/docs/latest/rules/no-unsafe-finally
3. In Java, a `finally` block that completes abruptly discards an earlier exception; Error Prone reports it as `Finally`. Source: errorprone.info/bugpattern/Finally
4. AWS SDKs retry throttling and transient errors by default (standard mode, 3 attempts in total), so an application retry around one SDK call multiplies the attempts. Source: docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
5. Python `requests` applies no timeout unless one is passed, and its documentation says nearly all production code should pass one. Source: requests.readthedocs.io/en/latest/user/advanced/#timeouts
6. `httpx` applies a 5-second default timeout, unlike `requests`. Source: www.python-httpx.org/advanced/timeouts/

Python
7. Since Python 3.8 `asyncio.CancelledError` derives from `BaseException`, so `except Exception` does not catch it. Source: docs.python.org/3/library/asyncio-exceptions.html#asyncio.CancelledError
8. A context manager whose `__exit__` returns a true value suppresses the exception raised in the `with` body. Source: docs.python.org/3/reference/datamodel.html#object.__exit__
9. In a `@contextmanager` generator, code after `yield` runs when the body raises only if the `yield` is inside `try`/`finally`; the exception is re-raised at the `yield`. Source: docs.python.org/3/library/contextlib.html#contextlib.contextmanager
10. A dataclass with `eq=True` and `frozen=False` (the defaults) sets `__hash__` to `None`, so its instances are unhashable unless `unsafe_hash=True` is given. Source: docs.python.org/3/library/dataclasses.html (the `unsafe_hash` parameter)

TypeScript and JavaScript
11. When TypeScript compiles a subclass of `Error`, `Array` or `Map` to an ES5 target, `instanceof` on the subclass fails unless the constructor calls `Object.setPrototypeOf(this, new.target.prototype)`. Source: github.com/microsoft/TypeScript/wiki/Breaking-Changes (TypeScript 2.1, "Extending built-ins like Error, Array, and Map may no longer work")
12. `useUnknownInCatchVariables` is enabled by `strict` from TypeScript 4.4. Source: www.typescriptlang.org/tsconfig#useUnknownInCatchVariables
13. typescript-eslint `return-await` defaults to `in-try-catch`, which requires `await` on a promise returned inside `try`, so a rejection reaches the `catch`. Source: typescript-eslint.io/rules/return-await
14. Which typescript-eslint preset (`recommended-type-checked` or `strict-type-checked`) includes `no-floating-promises`, `no-misused-promises`, `restrict-plus-operands`, `require-array-sort-compare` and `unbound-method`. Source: typescript-eslint.io/users/configs

React
15. Error boundaries do not catch errors thrown in event handlers, in asynchronous code, during server rendering, or in the boundary itself. Source: react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
16. A function is treated as a hook, and checked by `eslint-plugin-react-hooks`, only when its name starts with `use` followed by a capital letter. Source: react.dev/reference/rules/rules-of-hooks; react.dev/learn/reusing-logic-with-custom-hooks
17. Reducers written with Redux Toolkit's `createSlice` (Immer) may use mutating syntax safely. Source: redux-toolkit.js.org/usage/immer-reducers

Go
18. `bytes.Buffer.Bytes` returns a slice that aliases the buffer and is valid only until the next modification, so a slice returned after the buffer is `Reset` and put back in a `sync.Pool` is corrupted by the next user. Source: pkg.go.dev/bytes#Buffer.Bytes
19. The context returned by `errgroup.WithContext` is cancelled the first time a function passed to `Go` returns a non-nil error or when `Wait` returns, whichever happens first. Source: pkg.go.dev/golang.org/x/sync/errgroup#WithContext
20. Go 1.25 adds a `go vet` analyzer, `waitgroup`, that reports a misplaced call to `sync.WaitGroup.Add`. Source: go.dev/doc/go1.25 (Vet section)
21. The arguments of a deferred call are evaluated when the `defer` statement executes, not when the function returns. Source: go.dev/doc/effective_go#defer; go.dev/ref/spec#Defer_statements

Rust
22. Since Rust 1.81, a panic that unwinds out of an `extern "C"` function aborts the process instead of being undefined behaviour. Source: blog.rust-lang.org/2024/09/05/Rust-1.81.0.html
23. Inside `tokio::select!`, the branches that do not complete are dropped, and a future that is not cancellation-safe loses its progress when that happens; the Tokio documentation lists which methods are cancellation-safe. Source: docs.rs/tokio/latest/tokio/macro.select.html#cancellation-safety
24. The current lint group of clippy `await_holding_lock` (the saved changelog records a move to `pedantic`; it may since have moved back to `suspicious`). Source: rust-lang.github.io/rust-clippy/master/index.html#await_holding_lock
25. The lint groups of clippy `wildcard_enum_match_arm`, `let_underscore_must_use`, `mem_forget`, `undocumented_unsafe_blocks` and `allow_attributes_without_reason` (expected: all restriction). Source: rust-lang.github.io/rust-clippy/master/index.html
26. Struct fields are dropped in declaration order, after the struct's own `Drop`. Source: doc.rust-lang.org/reference/destructors.html

Java and Spring
27. SpotBugs reports double-checked locking as `DC_DOUBLECHECK`, boxed reference comparison as `RC_REF_COMPARISON`, and `split` with `"."` as `RE_POSSIBLE_UNINTENDED_PATTERN` (read in `messages.xml`; confirm on the bug descriptions page). Source: spotbugs.readthedocs.io/en/latest/bugDescriptions.html
28. Error Prone `InterruptedExceptionSwallowed` reports a `catch (Exception)` or `catch (Throwable)` that can catch an `InterruptedException` without restoring interruption, and is enabled by default. Source: errorprone.info/bugpattern/InterruptedExceptionSwallowed
29. Spring Boot auto-configures a bounded `ThreadPoolTaskExecutor` (or virtual threads when enabled) for `@Async`; plain Spring without Boot falls back to `SimpleAsyncTaskExecutor`, which starts a new thread per task. Source: docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html; docs.spring.io/spring-framework/reference/integration/scheduling.html
30. Calling a `@Transactional`, `@Async` or `@Cacheable` method from another method of the same bean bypasses the proxy, so the annotation has no effect (kept today without a primary citation). Source: docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html

## 5. Missing items for the references (categories, plan questions, Goal or Responsibilities)

### Agent: Goal (draft)

- **Prevents:** code that ships a failure disguised as success, or a structure that makes the next ordinary change harder, in the lines this change adds.
- **Done well:** every finding names the specific future change it makes harder, or the input and the wrong outcome, with the file and line where it starts and the repository path that shows the convention.
- **Not the goal:** textbook principles the repository does not follow; style a linter or formatter owns; performance, security or module boundaries (their owners).

### Agent: How to judge (draft, two to four rules)

- A principle is not a finding; the cost is (today in the agent, `review.md` and `engineering-principles`; keep it here only).
- The repository's convention beats any textbook; a deviation from the repository's way is the candidate.
- A rule an enabled linter enforces is not a finding; a change that turns that rule off is.

### `plan.md`

- **Outcome of this stage (new):** the plan names the existing helper, error convention and lint commands the build must use, so the review can hold the diff to them.
- **Failure behaviour (extend):** the new code fails the same way its sibling functions do (throws, returns null, or returns a result type); a mix is a constraint to fix in the plan (addyosmani `api-and-interface-design`).
- **Failure behaviour (extend):** a retry the plan adds does not sit on top of a client that already retries (wshobson `python-anti-patterns`; section 4 item 4).
- **Where the fix lives (new):** a bug fix names the layer that owns the wrong behaviour, not the layer where the symptom shows (caveman `surgical-patch`; today only in `surgical-change`).
- **Good constraint (example):** "Reuse `src/billing/retry.ts` `withRetry`; no second retry helper." **Rejected:** "Use the strategy pattern for exporters" (heavier than one exporter needs).
- **Questions for the user here:** accepting a new dependency the standard library could replace; a refactor bundled with a fix.

### `review.md`

- **Purpose (new, one line):** finds code in this change that hides a failure or makes a named future change harder, before it merges.
- **New category, feature logic in shared code:** a caller-specific branch, flag or import added to a shared or general module; cite the module's other callers. Not when the module exists for that feature (addyosmani `code-review-and-quality`; credited in the developer NOTICE but absent from the checklist).
- **New category, invariant bypassed:** a new setter, builder step or mutating method that skips a check the constructor or factory enforces; cite both. Not when the type has no stated invariant (pr-review-toolkit `type-design-analyzer`).
- **Extend "Wrong or hidden meaning":** zero, empty or negative (`-1` meaning "never") silently changing a check (trailofbits `sharp-edges`).
- **Extend "Dead code introduced":** agent residue: a renamed `_unused` variable, a `// removed` comment, a compatibility shim for code nothing calls (addyosmani, agency `minimal-change-engineer`).
- **Do not report (add):** a possible null dereference when a guard or type narrowing is in scope (ECC `code-reviewer`).
- **Do not report (add, React):** mutating syntax inside an Immer or Redux Toolkit reducer (via `react-craft`).
- **Severity here (draft):** high: the change returns a wrong value or hides a failure on a path the repository calls; medium: a named future change becomes harder, or the wrong outcome needs a specific input; low: concrete and the fix is one line. A high finding states why the types, validation or framework defaults do not already prevent it (ECC).
- **One finding (draft, from corpus case c72516a95):** `NotificationService.send` validates the ticket, writes it to SQL, lays out the HTML email and sends it; evidence: the four steps at their lines, and the path of the module where the repository already keeps email layout; cost: a template change forces an edit and a retest of the persistence path; severity medium; fix: move layout to the existing template module.
- **One dropped (draft):** a single-implementation `S3Client` wrapper at the storage boundary looks like an unearned abstraction; dropped because a boundary wrapper over a third-party client is earned (category counter-case).
- **Cut from the reference:** Result, Confidence, the clean-verdict form, Untrusted input, the skills-first Method line (protocol, schema or code hold them; section 3).

### `build.md`

- **When you report (new):** say every fallback added and where it is visible, every place the repository's convention was not followed and why, and every lint or type command not run.

### Skills (not facts; placement only)

- `failure-handling`: a new pattern row "Exit from `finally`"; Retries gains "double retry", "key from the attempt" and "a timeout is an unknown outcome".
- `python-craft`: the context-manager rows (`__exit__` returning true; `yield` outside `try`/`finally`); the cancellation-cleanup row; `requests` without timeout; linter-table additions (ASYNC210, ASYNC212, S101, S110, S113, DTZ003, DTZ005, RUF012, B012, A005, ANN401, PGH003).
- `typescript-craft`: ES5 `Error` subclass; linter-table additions (`return-await`, `restrict-plus-operands`, `require-array-sort-compare`, `unbound-method`, `preserve-caught-error`, `no-unsafe-finally`, `useUnknownInCatchVariables`).
- `react-craft`: a new "Errors" section (error boundary limits); hook naming; Immer in Not a finding; linter-table additions (`no-unstable-nested-components`, `jsx-no-leaked-render`).
- `go-craft`: deferred-argument evaluation; `sync.Pool` aliasing; errgroup context; linter-table additions (`bodyclose`, `rowserrcheck`, `sqlclosecheck`, `errorlint`, `contextcheck`, `noctx`, vet `loopclosure`, `httpresponse`).
- `rust-craft`: `select!` cancellation safety; check-then-act on atomics; lock order; drop order (low); linter-table additions (section 2); fix the FFI row.
- `java-craft`: blocking on a reactive thread; linter-table additions (SpotBugs and Error Prone names in section 2).
- `dependency-discipline`: lockstep packages; weak copyleft; `[dependency-groups]`.
- Each language skill: the 3b section in the slot named in section 3, and a "First, find out" line asking whether the package is published. Code that nobody outside the repository imports skips that section.

## 6. Responsibilities: draft rubric rows for this expert

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Structure inside a module | Is each new abstraction, layer, wrapper, switch or subclass earned by a need in this change? | How modules and packages depend on each other (softarch) | Inside one module or package: developer. An import across a module boundary, or which module owns the code: softarch |
| Failure handling in code | Does a failure in the new code still reach someone who can act on it (catch, fallback, retry, cleanup)? | Retries, timeouts and failure handling across a service boundary; idempotency stores; DLQs (architect) | The retry loop or catch block in the diff: developer. How many attempts a downstream service tolerates, or what happens to a message after the last attempt: architect |
| Naming and meaning | Does a name, unit or zero/empty value say what the code does? | Style a linter or formatter enforces (no one: the linter) | A misleading name or a lost unit is a finding; a casing or order rule is not |
| Language idioms and traps | The language-specific traps in the five language skills and React | Rendering performance, accessibility, bundle size (frontend, planned); hot paths (performance, planned) | Correctness of a component's state and effects: developer. How fast or accessible it is: frontend |
| Public API of a published package (3b) | The language fact: whether a changed signature, field or variant breaks callers at compile or link time | Whether anything outside consumes the surface, and the compatibility policy (softarch) | Developer reports "this change to an exported item is source- or binary-incompatible in this language"; softarch decides whether that surface is a contract others depend on and whether the break is accepted. Without that rule both experts own "a public function signature" (softarch's description says so today) |
| Dependencies | Is the new dependency needed, real, maintained and taken with its lockfile? | Known vulnerabilities, supply-chain attacks, install-script risk (security, `deps-audit.js`) | An unneeded or invented package: developer. A real package with a CVE or a malicious install script: security. Security's description also names "a new or changed dependency"; split by these questions |
| Scope of the change | Does every changed line trace to the request or plan? | Whether the request itself is right (the user, at the plan stage) | Lines beyond the plan: developer. A plan that asks for too much: a question for the user |
| Tests in the diff | One question: would this test still pass if the change it covers were reverted? | Everything else about tests, fixtures, evals and gates (quality) | The agent description says "Not for tests" while `review.md` scopes this one question in; quality's description owns "whether a test can fail". Keep the question (it was measured) and state it in both rubrics, or hand it to quality and drop the category |
| Data and queries | None beyond the half-done-writes row | N+1, fetch strategy, schema, transactions across stores (data, planned; architect) | Several writes in one function with no rollback: developer. Which store or transaction boundary: architect or data |
| Security-relevant traps | Report only a real defect, with security named (protocol) | Injection, deserialisation, secrets, auth (security) | The language skills' "Security-relevant traps" sections are cut (section 3); a reviewer meeting one reports it under security's name |
| Infrastructure and delivery | None | IaC, Dockerfiles, pipelines, flags, rollouts (devops) | Application code that reads a flag: developer for the code path; the flag's rollout: devops |
| Observability | None | Log content, levels, metrics, traces (observability, planned) | A fallback with no log, metric or return flag at all is a hidden failure: developer. Whether the log line has the right fields: observability |
