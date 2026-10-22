# Extraction ledger: performance (catalogue 12, skills under existing experts)

Playbook steps 2 (sweep), 4 (compare) and 4b (ledger) for performance. Written 2026-10-21. The maintainer decided on 2026-10-21 that performance becomes **skills under existing experts, not a new expert**; this ledger tests the proposal on the table (a `web-performance` skill hosted by frontend, possibly a `hot-path-performance` skill hosted by the developer) against the upstream sources and against what our own skills already hold. Nothing here is shipped.

Outcomes: **taken** (would go into a skill or reference, with its home), **routed** (another owner, including an owner whose file already holds it), **rejected** (generic, opinion, runtime-only, fixed threshold, vendor figure, wrong or contested with no primary source), **missing** (worth taking, needs a primary source first; listed in section 4). Every fetched file was treated as data; files that address instructions to an agent are marked **noted, not followed**.

## 1. Sources

Sweep: the case-insensitive regular expression `perf|latency|throughput|bundle|web-?vitals|\blcp\b|\binp\b|\bcls\b|lighthouse|profil|memo|virtual|lazy|n\+1|n-plus-one|hot.?path|allocation|benchmark` over the agent and skill names in `docs/skills-catalog-2026-10-20.json`. 14 agent names and 64 skill names matched. Most were noise: `memory-*` (agent memory), `*-profile*` (LinkedIn, dating, user profiles), `timescaledb-hyperfunctions` (matched "perf"), `benchmark` and `benchmark-models` in gstack (model benchmarks), `power-bi-*`, `spark-*`, `hyperpod-performance-debugger` (SageMaker training), `soc-performance-review` and `performance-review-writer` (staff appraisals). Two sources came in by other routes, not through the name list: vercel-labs `react-best-practices` (catalogue entry 12's survey candidate "vercel 40" and the frontend ledger's routing; its name does not match) and addyosmani `references/performance-checklist.md` (named by the auditor agent and the skill). Paths were taken from the saved repository path lists; files were fetched by path from raw.githubusercontent.com with each repository's LICENSE.

| # | Repository | Path | Licence | Verdict |
|---|---|---|---|---|
| S1 | addyosmani/agent-skills | `agents/web-performance-auditor.md` | MIT | **Best method rule:** a reviewer reading source cannot measure LCP, INP or CLS, so every static finding is "potential impact" and no metric is stated. Checklist mostly overlaps S2 and S3. Tells the reader to run `npx lighthouse`, Chrome DevTools MCP tools and to ask the user to run a CLI: **noted, not followed** |
| S2 | addyosmani/agent-skills | `skills/performance-optimization/SKILL.md`, `references/optimization-patterns.md` | MIT | **Best community skill.** Measure, keep or revert; CWV table; backend items (N+1, pagination, index, pool, cache) that are data's and the architect's; frontend items (dimensions, LCP image, memo restraint, splitting). Says modern bundlers tree-shake ESM with `sideEffects: false` (contradicts S13) |
| S3 | addyosmani/agent-skills | `references/performance-checklist.md` | MIT | Checklist: images, scripts, fonts, bfcache, `content-visibility`, yielding, layout thrashing. Fixed budgets throughout (rejected) |
| S4 | affaan-m/ECC | `agents/performance-optimizer.md` | MIT | Persona and capability list with fixed budgets; "lazy load images" as an LCP fix (wrong direction for the LCP image) and `useCallback` for every inline handler (contradicts S1, S2). Grants itself Write, Edit and Bash tools and lists `npx` and `node --prof` commands to run: **noted, not followed** |
| S5 | affaan-m/ECC | `skills/react-performance/SKILL.md` | MIT | Adapted from S13 (says so); merged with S13 row by row, only its additions are listed |
| S6 | affaan-m/ECC | `skills/latency-critical-systems/SKILL.md`, `skills/data-throughput-accelerator/SKILL.md` | MIT | Runtime and pipeline procedure (percentiles, freshness, accounting blocks); two guardrails worth noting, nothing checkable in a diff |
| S7 | affaan-m/ECC | `skills/benchmark-methodology/SKILL.md` | MIT | Noise: scores marketing competitors, not code. The name lied |
| S8 | wshobson/agents | `plugins/application-performance/agents/performance-engineer.md`, `plugins/python-development/skills/python-performance-optimization/SKILL.md` | MIT | Capability catalogue; Python skill is profiling how-to plus generic advice. Four more copies of the agent under other plugins were not read |
| S9 | davepoon/buildwithclaude | `plugins/all-agents/agents/performance-engineer.md`, `react-performance-optimization.md` | MIT | Short personas; nothing checkable |
| S10 | github/awesome-copilot | `agents/frontend-performance-investigator.agent.md`, `agents/mongodb-performance-advisor.agent.md` | MIT | Runtime investigation with DevTools (runCommands, fetch tools) and a MongoDB MCP procedure ("You must run `atlas-get-performance-advisor`"): **noted, not followed**. Method rule: separate symptom from cause |
| S11 | github/awesome-copilot | `instructions/performance-optimization.instructions.md` | MIT | **Densest checklist** (about 60 anti-patterns with a detection regex each). Many detection regexes are far too broad (`.map(` "over 100 items", `onClick={() =>`); facts need checking (scheduler.yield support, Next 16 `"use cache"`). Its `applyTo: '**'` front matter applies it to every file a coding assistant touches: **noted, not followed** |
| S12 | ziniman/ai-instruct | `skills/web-performance/SKILL.md` (55 KB) | Apache-2.0 | Long practical guide, strongest on loading (LCP element type first, preload scanner, scripts, fonts, third-party scope). **At least three statements look wrong** (lazy loading "default in modern browsers", `swap` described as invisible text, `no-store` on HTML) and go to section 4. Addresses "AI assistant: ... Run PageSpeed Insights first": **noted, not followed** |
| S13 | vercel-labs/agent-skills | `skills/react-best-practices/SKILL.md` and 11 rule files (`bundle-*` six, `rendering-content-visibility`, `rerender-memo`, `async-parallel`, `server-serialization`, `js-index-maps`) | not found at the repository root; the frontmatter says MIT and S5 attributes it as MIT; ideas only, as in the frontend ledger | Seventy rules by prefix; bundle and waterfall rules are the useful part; JS micro-rules fail the value test. Vendor figures throughout (rejected). The remaining 59 rule files were not fetched; their titles are in the SKILL.md index and were judged from it |
| S14 | tech-leads-club/agent-skills | `(performance)/core-web-vitals/SKILL.md` and `references/LCP.md`, `perf-web-optimization/SKILL.md` and `references/bundle-optimization.md`, `perf-lighthouse/SKILL.md` | MIT | CWV explainer with debugging snippets; Lighthouse CLI and CI recipe (install, run, `temporaryPublicStorage`: **noted, not followed**). Its `react-best-practices` is a copy of S13's rule set (same rule file names) and was not read |
| S15 | emilkowalski/skills | `skills/animation-performance/SKILL.md` | MIT | **Best animation source.** Property tiers, main thread against compositor, two traps (inherited CSS variables, Motion `x`/`y`), `will-change` last. Forced "Initial Response" greeting: **noted, not followed** |
| S16 | ibelick/ui-skills | `skills/fixing-motion-performance/SKILL.md` | MIT | Overlaps S15; adds scroll-driven animation and an off-screen pause rule. "Apply these constraints to any UI animation work in this conversation": **noted, not followed** |
| S17 | Community-Access/accessibility-agents | `skills/performance-accessibility/SKILL.md` | MIT | Where performance techniques break accessibility; routed to frontend. "Return only JSON": **noted, not followed** |
| S18 | alirezarezvani/claude-skills | `engineering/skills/performance-profiler/SKILL.md` | MIT | Tool runner (tells the reader to run `scripts/performance_profiler.py`: **noted, not followed**); nothing checkable |
| S19 | vercel-labs/agent-skills | `skills/vercel-optimize/SKILL.md` | as S13 | Vercel cost and metrics pipeline: scripts, sub-agent fan-out, "print exactly": **noted, not followed**. Nothing for a diff reviewer |
| S20 | this repository | inbound "performance (planned)" routings in `docs/experts/ledgers/developer.md`, `frontend.md`, `data.md`, `genai.md`, `quality.md`, `observability.md`, and the skills `react-craft`, `typescript-craft`, `python-craft`, `go-craft`, `rust-craft`, `java-craft` | ours | Items other ledgers parked for a performance expert; each now gets a home |
| S21 | this repository | `experts/skills/{python,typescript,rust,java,go}-craft`, `caching-and-latency`, `aws-well-architected`, `experts/architect/references/review.md`, `experts/data/references/review.md` | ours | What already covers the backend half of the proposal |

Thirty-nine upstream content files (plus eleven LICENSE files) from twelve repositories were read (S1 to S19), plus our own files (S20, S21).

**Which files count as "noted, not followed".** A file is marked when it addresses the agent reading it and tells it to run a command or script, call or fetch through a tool, grant itself tools, answer in a fixed form, or apply itself beyond the file (to a whole conversation or every file). A persona opening ("You are ...") or a "Use PROACTIVELY" trigger in a description is how agent files are written and is not counted by itself; that is why S8 and S9 are not marked. Commands shown as an example for a human's CI (S2, S3) are not counted either. Not read: the antigravity copies (`performance-engineer`, `application-performance-performance-optimization`, `performance-testing-review-*`, `python-performance-optimization`; copies of wshobson), awesome-copilot `qdrant-*` (vector search; data's `vector-storage`), `spark-performance`, `power-bi-*`, `dataverse-python-performance-optimization` (out of scope), tech-leads `perf-astro` (one framework), Jeffallan's game, pandas and Shopify `performance-optimization` references (one domain each), ollygarden `otel-profiles` (observability signal), and S14's `references/core-web-vitals.md` and `image-optimization.md` (duplicates of what was read).

## 2. Items, per source

Owners when routed: architect, softarch, developer, quality, security, devops, genai, data, frontend. Homes when taken: **`web-performance`** (proposed frontend skill, section 7), **developer review** (one category in `experts/developer/references/review.md`, no skill), **frontend plan** (a question in `experts/frontend/references/plan.md`), **frontend tests** (a case family in `experts/frontend/references/tests.md`).

### S1 addyosmani `web-performance-auditor`

| Item | Outcome | Home or owner |
|---|---|---|
| Static reading cannot measure LCP, INP or CLS; every finding is "potential impact", no scorecard value without an artifact | taken | `web-performance` opening rule; frontend has no browser, so this is its only honest mode |
| Field and lab data are not interchangeable; label each value's source | rejected | no metric reaches a diff review |
| Identify the framework and rendering model before framework advice | taken | `web-performance` "First, establish the target" |
| LCP image not lazy-loaded | taken | `web-performance` (fact 8) |
| LCP image with `fetchpriority="high"` | rejected | tuning, not a defect (as S11 L4 and L7); fact 10 only words the remedy |
| Explicit `width` and `height` on images, `<source>`, iframes and embeds | taken | `web-performance` (fact 13) |
| Long tasks over 50 ms delay INP; heavy synchronous work in event handlers | taken | `web-performance` (fact 17) |
| `scheduler.yield()` inside long loops | missing | fact 18 (support varies) |
| Soft-navigation APIs, Long Animation Frames in production | rejected | runtime instrumentation, not a diff check (LoAF availability is fact 19 only as context) |
| TTFB under 800 ms, CDN coverage | routed | architect (`caching-and-latency`, server latency) |
| `preconnect` for critical origins, `dns-prefetch` for others | rejected | tuning with no failure a reviewer can name in a diff |
| Speculation Rules prerender or prefetch | rejected | opt-in enhancement, not a defect |
| Fonts self-hosted, preloaded, `font-display`, subsetted | taken | `web-performance` (font row, facts 14, 15) |
| Images in WebP or AVIF with `srcset` and `sizes` | rejected | asset pipeline choice; vendor percentages |
| Initial JavaScript under 200 KB gzipped | rejected | fixed threshold; bytes are not visible in a diff |
| Code splitting for routes and heavy features | taken | `web-performance` (heavy component imported statically; fact 34) |
| Blocking scripts in `<head>` without `defer` or `async` | taken | `web-performance` (fact 26) |
| Third-party scripts with `async`/`defer`, behind a facade when heavy | taken | `web-performance` (third-party in the root layout) |
| Unnecessary full-page re-renders, state lifted wrongly | routed | developer (`react-craft` state rows); cost without a profile is not a finding |
| Long lists virtualised | taken | `web-performance` (unbounded list) |
| Animations on `transform` and `opacity` | taken | `web-performance` (fact 22) |
| Layout thrashing in a loop | taken | `web-performance` (fact 20) |
| `content-visibility: auto` off-screen | rejected | enhancement, never a finding by itself; fact 24 only if a row is ever written |
| View Transitions to avoid perceived CLS | rejected | enhancement |
| bfcache: no `unload` handler, no `no-store` on HTML | missing | fact 28; `unload` to `web-performance`, the header to `caching-and-latency` |
| "AI patterns": memo everywhere is a cost | taken | merged with `react-craft` Not a finding (no memo rows in `web-performance`) |
| Vue watchers, Angular `OnPush`, Svelte `$:` | rejected | framework the served repositories do not show; add only when a repository uses it |
| Passive `scroll`/`resize` listeners, debounce | taken | `web-performance` (fact 21) |
| Static assets cached with `max-age` and content hashing | routed | architect (`caching-and-latency`) |
| HTTP/2, compression, redirects | routed | devops (hosting and CDN configuration) |
| API pagination, `SELECT *`, unbounded fetch | routed | data (already in data's review "A query that grows with the table") |
| Bulk operations instead of loops of calls | routed | architect (already "A remote call per item") |
| Sequential `await`s where `Promise.all` works | rejected | a strong reviewer sees it; `typescript-craft` keeps it as Not a finding for correctness |
| Over-fetching "just in case"; missing dedupe of parallel requests | routed | softarch (API shape) and developer |
| Severity by CWV threshold | rejected | needs a measurement the expert does not have |
| Do not recommend micro-optimisations without evidence | taken | `web-performance` Not a finding |

### S2 addyosmani `performance-optimization` and `optimization-patterns.md`

| Item | Outcome | Home or owner |
|---|---|---|
| Measure, identify, fix, verify, guard; "neutral is a revert" | routed | developer (`simplification`: an optimisation that adds complexity with no stated measurement) |
| Change one thing at a time; beat run-to-run variance | routed | quality (a benchmark's comparison and noise) |
| CWV good, needs-improvement and poor bands | missing | fact 1 (context for the skill, never a finding) |
| Symptom-to-cause tree (first load, interaction, navigation, backend) | rejected | runtime diagnosis |
| N+1 queries; fetch the relation in the same query | routed | data |
| Every list endpoint paginates with a limit and a stable order | routed | data (query) and softarch (API shape) |
| Index for the query's shape; `EXPLAIN ANALYZE` before and after | routed | data |
| Pool exhaustion: one pool per process, `instances x max` under the ceiling, a proxy for serverless | routed | data (pools) and architect ("A budget the parts cannot fit") |
| Caching: cache only what is expensive; key on every input; one invalidation strategy; stampede | routed | architect (`caching-and-latency` already holds each) |
| Never cache what must be fresh (balances, permissions) | routed | architect (`caching-and-latency` TTL row) |
| Image dimensions; LCP image priority; lazy below the fold | taken | `web-performance` (merged with S1) |
| Object or function created in render re-renders children; reserve memo for measured cost | routed | developer (`react-craft` Not a finding) |
| Modern bundlers tree-shake ESM named imports given `sideEffects: false`; gains come from splitting | missing | facts 29, 30, 31 (contradicts S13) |
| Route-level splitting and `lazy` behind `Suspense` | taken | `web-performance` (merged with S1) |
| Budgets (200 KB JS, 50 KB CSS, 100 KB fonts, 200 ms p95, TTI 3.5 s, Lighthouse 90) | rejected | fixed thresholds |
| Synthetic CI gate plus field monitoring; repeat runs, compare a median | routed | quality (`test-gates`: whether the budget gate can fail and is not flaky) |
| A "win" that changed, skipped or deleted a test | routed | quality (already a test-gates concern) |
| Keep an attempts ledger (`PERF.md`) | rejected | process |
| "Users notice 100 ms" | rejected | unsourced figure |

### S3 addyosmani `performance-checklist.md`

| Item | Outcome | Home or owner |
|---|---|---|
| CWV table and TTFB over 800 ms | missing | fact 1 (merged with S2) |
| Images and `<source>` have `width` and `height` for art direction | taken | `web-performance` (merged) |
| Tree shaking needs ESM and `sideEffects: false` | missing | fact 29 |
| Heavy computation to a Web Worker | taken | `web-performance` (input-handler row, as one remedy) |
| Long tasks broken up; `yieldToMain`; `scheduler.yield()`, `postTask`, `isInputPending` | missing | fact 18; the rule is taken, the APIs wait |
| `requestIdleCallback` for deferrable work | rejected | remedy, not a defect |
| Analytics and logging out of event handlers | taken | `web-performance` (input-handler row) |
| Critical CSS inlined; no render-blocking CSS for non-critical styles | rejected | build-tool decision; not visible as a defect in a diff |
| CSS-in-JS runtime cost | rejected | opinion with no threshold |
| Two to three font families and weights; WOFF2 only; system stack first | rejected | taste and fixed counts |
| LCP font preloaded with `crossorigin` | missing | fact 46 |
| Fallback metrics `size-adjust`, `ascent-override`, `descent-override` | missing | fact 16 |
| `fetchpriority` on non-image resources | rejected | tuning |
| Long lists virtualised (`react-window`) | taken | `web-performance` (merged with S1) |
| `content-visibility: auto` with `contain-intrinsic-size` | rejected | enhancement (merged with S1); fact 24 |
| No `unload` handlers; no `no-store` on HTML | missing | fact 28 (merged with S1) |
| Backend checklist: N+1, indexes, pagination, pooling, slow query log | routed | data (merged with S2) |
| Query-plan and index-strategy checklists | routed | data |
| API p95 under 200 ms; no synchronous heavy computation in handlers | routed | developer (language skills hold sync I/O in async; CPU work is the developer-review residue) |
| Response compression; CDN; servers close to users | routed | devops |
| Health check endpoint | routed | devops (probes) and architect |
| Cache-aside, read-through, write-through, write-behind | routed | architect (`caching-and-latency`) |
| Negative caching with a shorter TTL; never cache an origin error | routed | architect (`caching-and-latency`; not there yet, its owner decides) |
| Request coalescing (single flight) | routed | architect (already "One recompute per hot key") |
| Unbounded cache is a memory leak; eviction and ceiling | routed | architect (`caching-and-latency` eviction row) |
| INP field data first; mid-range Android; 4x to 6x throttling | rejected | runtime procedure |
| `web-vitals` attribution build | rejected | instrumentation, not a review finding |
| Memory leaks: clean up listeners, intervals, refs | routed | developer (`react-craft` effect cleanup) |

### S4 ECC `performance-optimizer`

| Item | Outcome | Home or owner |
|---|---|---|
| Targets table (FCP 1.8 s, LCP 2.5 s, TTI 3.8 s, CLS 0.1, TBT 200 ms, 200 KB) | rejected | fixed thresholds; LCP and CLS as fact 1 |
| "LCP over target: lazy load images" | rejected | wrong direction for the LCP element (fact 8) |
| Nested loops on the same data; repeated `.filter`/`.find` in a loop: build a `Map` | taken | developer review (super-linear work over input a caller controls) |
| Sorting inside a loop | taken | merged with the row above |
| String concatenation in a loop; deep cloning; recursion without memoisation | rejected | language skills already reject these as performance advice with no measured cost (`python-craft`, `go-craft`, `java-craft` Not a finding) |
| `useCallback` for every function passed to children; `useMemo` for an inline style | rejected | contradicts S1, S2 and `react-craft`; react.dev's guidance is fact 38 |
| `items.sort` in render mutates; copy then sort | routed | developer (`react-craft` "Mutating state") |
| `key={index}` | routed | developer (already in `react-craft`) |
| `React.memo`, virtualisation, `React.lazy`, route splitting checklist | taken | `web-performance` (virtualisation and splitting only; memo rejected) |
| Moment.js and full lodash imports; date-fns, lodash-es, per-method imports | taken | `web-performance` (whole-library import into an entry file); figures rejected |
| Unused exports with knip; duplicate packages | routed | developer (`dependency-discipline`) |
| `SELECT *`, N+1, indexes on frequently queried columns | routed | data |
| Parallel independent requests; batch requests; debounce search | rejected | debounce is taken under the input-handler row; the rest is obvious (S1) |
| Request cache with a TTL | routed | architect (`caching-and-latency`) |
| Effect listeners and timers without cleanup | routed | developer (already in `react-craft`) |
| Closure holding large data in a listener | routed | developer (`react-craft` cleanup row covers the leak) |
| Lighthouse commands, bundle analyzer commands, report template | rejected | tool runner |
| Bundle over 500 KB, LCP over 4 s, query over 1 s | rejected | fixed thresholds |
| "Optimise for the 90th percentile, not the average" | routed | architect (latency targets; observability ledger already takes percentiles for alarms) |

### S5 ECC `react-performance` (adapted from S13)

| Item | Outcome | Home or owner |
|---|---|---|
| The whole rule catalogue | rejected | merged with S13, row by row; S5's text adds nothing checkable except the two rows below |
| "When React Compiler is on, demote manual memoisation rules" | taken | `web-performance` "First, establish the target" (is the compiler enabled; fact 39) |
| CWV-to-category mapping table (LCP: waterfalls and bundles; INP: re-render, JS; CLS: Suspense placement, image dimensions) | rejected | summary, not a check |

### S6 ECC `latency-critical-systems`, `data-throughput-accelerator`

| Item | Outcome | Home or owner |
|---|---|---|
| Split metrics: p50, p95, p99, freshness, queue depth, hit rate | routed | architect (latency targets; plan question on the target) |
| Map the hot path segment by segment | rejected | runtime procedure |
| "Do not optimise latency by dropping required validation" | routed | developer (`simplification`/`engineering-principles`: a behaviour removed under a performance label) |
| "Do not hide stale data behind fast cache hits" | routed | architect (`caching-and-latency` TTL row) |
| Apply backpressure before queues grow unbounded | routed | architect (already "No bound", `REL05-BP04`) |
| Backfill accounting: counts and timestamps cohere; idempotent writes; skip completed partitions | routed | data (resumable backfills, in data's tests stage) |
| Do not skip failed files silently | routed | developer (`failure-handling`) |

### S7 ECC `benchmark-methodology`

| Item | Outcome | Home or owner |
|---|---|---|
| The whole file (competitor scoring for a design studio) | rejected | not about software performance |

### S8 wshobson `performance-engineer` and `python-performance-optimization`

| Item | Outcome | Home or owner |
|---|---|---|
| Capability catalogue (APM, load testing tools, chaos, multi-tier caching, mobile, cloud) | rejected | persona |
| Load test with realistic scenarios and production-like data | routed | quality (a load test's workload and oracle; observability S10 routed k6 here too) |
| Performance gates that block deploys | routed | quality (`test-gates`) and devops (pipeline wiring) |
| Lambda cold start and memory allocation | routed | architect (`lambda-event-sources` holds provisioned concurrency) |
| Python: profile first; dict and set for lookups; `lru_cache`; generators; NumPy | rejected | generic advice; `python-craft` Not a finding already rejects it without a measured cost |
| Python: connection pooling for databases | routed | data |
| Python: `time.time()` for timing, `timeit` | rejected | how-to |

### S9 buildwithclaude `performance-engineer`, `react-performance-optimization`

| Item | Outcome | Home or owner |
|---|---|---|
| Measure first; biggest bottleneck first; budgets; layered caching; load tests | rejected | generic; the checkable halves are routed under S2 and S8 |
| React: memo, `useMemo`, `useCallback`, `lazy`, tree shaking | rejected | persona list; merged with S1 and S13 where checkable |

### S10 awesome-copilot `frontend-performance-investigator`, `mongodb-performance-advisor`

| Item | Outcome | Home or owner |
|---|---|---|
| Reproduce on a concrete page or flow; separate symptom from cause | taken | `web-performance` opening rule (name the cause a finding addresses) |
| Collect Lighthouse, traces, network waterfall, console | rejected | needs a browser; frontend has none (what only a browser shows becomes a test case) |
| Initial-load causes: server, font, hero weight, render-blocking CSS, script cost, hydration, third parties | taken | merged with S1 and S12 rows |
| CLS causes: missing sizes, late fonts, injected banners, async content without placeholders | taken | `web-performance` (merged) |
| "Do not suggest broad rewrites"; "do not add dependencies for small problems" | routed | developer (`surgical-change`, `dependency-discipline`) |
| MongoDB: `explain` baseline, documents examined against returned, `IXSCAN` against `COLLSCAN` | routed | data |
| MongoDB: pipeline stage order; conservative index advice with trade-offs | routed | data |
| MongoDB MCP procedure and Atlas tool calls | rejected | tool runner (noted, not followed) |

### S11 awesome-copilot `performance-optimization.instructions.md`

| Item | Outcome | Home or owner |
|---|---|---|
| CWV bands ("< 2.5 s" where S2 says "<= 2.5 s") | missing | fact 1 |
| LCP sub-parts and their share targets (TTFB about 40 percent, load delay under 10) | missing | fact 7; the shares are rejected unless the page states them |
| INP phases: input delay, processing, presentation | missing | fact 4 |
| CLS: shifts within 500 ms of input are exempt | missing | fact 12 |
| L1 render-blocking CSS; `media="print" onload` is blocked under a strict CSP | routed | security (CSP), fact 27 for the check |
| L2 synchronous script in `<head>` | taken | `web-performance` (merged with S1) |
| L3 missing `preconnect` | rejected | merged with S1 |
| L4 LCP resource not preloaded | rejected | tuning; the lazy-loaded main image is the checkable half |
| L5 client-side fetch for main content in `useEffect` | taken | `web-performance` (LCP waits on hydration and a second round trip); the race is `react-craft`'s |
| L6 redirect chains ("each adds 200 to 300 ms", "maximum one") | routed | devops (hosting rules); the figure is rejected |
| L7 missing `fetchpriority`/`priority` on the hero | rejected | tuning (merged with L4 and S1's `fetchpriority` row) |
| L8 third-party script in `<head>` without `async`/`defer` | taken | merged with L2 |
| L9 initial HTML over 14 KB | rejected | fixed threshold |
| L10 missing compression ("Brotli 15 to 25 percent better") | routed | devops; figure rejected |
| R1 `"use client"` at the top-level layout or page | taken | `web-performance` (fact 35); the row `react-craft` cut and routed here |
| R2 Suspense boundaries for async data; R4 streaming | rejected | design choice per page; no defect a reviewer can name without timing |
| R3 hydration mismatch from `Date.now()`, `Math.random()`, `window` in SSR | routed | developer (`react-craft`: a correctness bug first) |
| R5 inline objects and arrow props cause re-renders (`style={{`, `onClick={() =>`) | rejected | the regex matches every React file; `react-craft` Not a finding |
| R6 `.map(` over more than 100 items without virtualisation | taken | `web-performance` (unbounded list), without the fixed 100 |
| R7 SSR of immediately hidden content | rejected | opinion |
| R8 missing `key` | routed | developer (already in `react-craft`) |
| J1 long synchronous task in an event handler; yield or Web Worker | taken | `web-performance` (input-handler row) |
| `scheduler.yield()` support (Chrome 129+, Firefox 129+, not Safari as of April 2026) | missing | fact 18 |
| J2 layout thrashing (`offsetHeight`, `getBoundingClientRect` in loops) | taken | merged with S1 |
| J3, J4, J8 timers, listeners and effects without cleanup | routed | developer (already in `react-craft`) |
| J5 detached DOM references | rejected | rarely visible in a diff |
| J6 synchronous XHR | rejected | obvious to a strong reviewer; fails the value test |
| J7 heavy computation in component code | taken | merged with J1 |
| C1 animating `top`, `left`, `width`, `height`, `margin`, `padding` | taken | `web-performance` (merged with S15) |
| C2 `content-visibility` | rejected | enhancement (merged with S1); fact 24 |
| C3 `will-change` applied permanently | taken | `web-performance` ([T], low; fact 23) |
| C4 more than 50 percent unused CSS | rejected | needs coverage tooling; fixed threshold |
| C5 universal selector; C6 `contain` | rejected | micro-optimisation with no evidence |
| C7 View Transitions | rejected | enhancement |
| I1 images without dimensions | taken | merged with S1 |
| I2 `loading="lazy"` on hero images | taken | merged with S1 |
| I3, I4 legacy formats, missing `srcset` | rejected | asset pipeline; vendor figures |
| I5 `@font-face` without `font-display` | taken | `web-performance` (fact 14) |
| I6 critical font not preloaded | missing | fact 46 |
| I7 font file over 50 KB; I8 SVG metadata | rejected | fixed threshold; tooling |
| B1 barrel imports (`from './components'`) | missing | fact 31 (contested) |
| B2 CommonJS `require` in frontend code prevents tree shaking | missing | fact 32 |
| B3 full `moment` or `lodash` import | taken | merged with S4 |
| B4 all routes imported statically | taken | `web-performance` (only where the router is not file-based) |
| B5 missing `sideEffects` in a library's package.json | missing | fact 29; applies only to a package others bundle |
| B6 duplicate dependency versions | routed | developer (`dependency-discipline`) |
| NX1 `<img>` instead of `next/image` | rejected | convention, not a defect; the dimension and lazy rows hold the harm |
| NX2, NX6 `"use cache"` and `cacheComponents` in Next 16 | routed | architect (`caching-and-latency`: a cache), fact 37 before any row |
| NX3 `"use client"` on a component with no hooks or browser APIs | taken | merged with R1 |
| NX4 data fetching in `useEffect` in App Router pages | taken | merged with L5 |
| NX5 Google Fonts by URL instead of `next/font` | taken | `web-performance` font row (third-party font CSS) |
| NG1 to NG6 Angular change detection, `NgOptimizedImage`, `@defer`, signals, zoneless | rejected | Angular not assessed; revisit if a served repository uses it |
| RX1 adopt React Compiler | rejected | adoption advice; the compiler's presence is taken as a target fact (S5) |
| RX2 `useTransition`, RX3 `useDeferredValue` for expensive updates | taken | `web-performance` (input-handler row remedies; fact 40) |
| RX4 `React.lazy` for routes | taken | merged with B4 |
| VU1 to VU4 Vue `shallowRef`, `v-memo`, async components, Vapor | rejected | as Angular |
| Resource hints table; image quality 75 to 85; WebP 25 to 34 percent | rejected | tuning and vendor figures |

### S12 ziniman `web-performance`

| Item | Outcome | Home or owner |
|---|---|---|
| Identify the LCP element type first; text LCP is about TTFB and CSS, not images | taken | `web-performance` "First, establish the target" (which element is the page's main content) |
| Section 0 defaults ("run PageSpeed Insights first") | rejected | addressed to an agent; noted, not followed |
| "Auth-gated pages matter less: CrUX only collects data from logged-in users on those routes" | rejected | garbled; no row rests on it |
| CWV bands with "<"; INP replaced FID in March 2024 | missing | facts 1, 5 |
| Inline critical CSS with `media="print" onload` | rejected | contradicted by S11 under CSP (routed to security under S11) |
| Inlined critical CSS silently blocked by a CSP `style-src` without nonce or hash | routed | security (CSP), with frontend tests for the unstyled-page case |
| Next 15 `experimental.inlineCss` and CSS chunking | rejected | experimental framework flag; version-bound |
| Server Components awaiting slow queries block the shell; stream behind Suspense | rejected | design choice (merged with S11 R2) |
| Preload only the LCP image; several preloads compete | rejected | tuning (merged with S11 L4) |
| `next/image` `priority` generates the preload and disables lazy | missing | fact 36 |
| `loading="eager"` against `fetchpriority="high"` | missing | fact 10, only to word the lazy-loading row's remedy |
| Preload scanner reads hints only in `<head>` | missing | fact 11 |
| An LCP image inside a `'use client'` component that renders after hydration | taken | `web-performance` (main image rendered by client code) |
| TTFB above 200 ms defeats preload | rejected | figure; server latency is the architect's |
| Always set image dimensions or `aspect-ratio` on the container | taken | merged with S1 |
| Content injected above existing content (auth avatar after hydration, toasts pushing content, ad banners) | taken | `web-performance` (fact 12) |
| `font-display: optional` for body text, `swap` for brand fonts | taken | `web-performance` font row (fact 14) |
| DOM size (1,500 nodes, depth 32, 60 children) | rejected | fixed thresholds from a lab audit |
| Long tasks over 50 ms; debounce or `useDeferredValue` on keystroke filtering | taken | merged with S11 J1 |
| Chunked processing with `scheduler.yield()` fallback | missing | fact 18 |
| Optimistic UI for server calls over 200 ms | rejected | product choice; figure |
| Image component or build-time conversion; `sizes` most often missed | rejected | asset pipeline; `sizes` is tuning |
| AVIF "90 to 95 percent" smaller; GIF 5 to 10 times larger | rejected | vendor figures |
| "Below-the-fold images: lazy loading (default in modern browsers)" | missing | fact 9 (the default looks wrong; checked before any row cites a default) |
| Self-host fonts; `next/font`; fontsource | taken | merged with the font row |
| `font-display` table: "`swap`: invisible text until font loads" | missing | fact 14 (the description looks wrong) |
| Never load fonts through CSS `@import`; adds 300 to 500 ms | taken | `web-performance` font row (fact 15); figure rejected |
| Measure bundles with the analyzer before optimising | rejected | tool step |
| Code-split heavy components; avoid whole-library imports | taken | merged with S1 and S4 |
| Unneeded `'use client'` in App Router | taken | merged with S11 R1 |
| `browserslist` absent ships legacy polyfills (10 to 20 KiB) | rejected | build configuration choice; figure. Revisit if a served repository ships a public site |
| Next's internal polyfill layer ignores `browserslist` | rejected | framework-internal, version-bound |
| Third-party scripts scoped to the routes that need them, not the root layout | taken | `web-performance` (third-party in the root layout) |
| Clerk v6 provider placement and dynamic rendering | rejected | one vendor's behaviour |
| Script strategies per type (GTM `defer`, chat on interaction, replay on idle) | rejected | tuning table; the blocking-script row holds the defect |
| `defer` keeps order after parsing; `async` runs on arrival | missing | fact 26 |
| Partytown; self-host third-party scripts | rejected | enhancement |
| DNS, TCP, TLS costs; `preconnect` within 2 s; `crossorigin` on font preconnects; over-hinting | missing | fact 46 for `crossorigin`; the timings and the 2-second rule are rejected |
| Dynamic class name assembly defeats CSS purging | routed | frontend (design system use): a class built from string parts in a Tailwind project is missing from the CSS, a correctness bug, not performance ([T]) |
| Tailwind v4 `@layer components` against `@utility`; `@apply` duplicates | rejected | framework-version detail; style |
| Redirect chains add TTFB; one redirect maximum | routed | devops (merged with S11 L6) |
| Cache headers per asset type, HTML `no-cache, no-store, must-revalidate` | routed | architect (`caching-and-latency`), with fact 28 (conflicts with S1 on bfcache) |
| Amplify and Vercel cache defaults; SSE unsupported in Amplify route handlers | rejected | vendor platform detail, version-bound |
| PageSpeed, WebPageTest, Search Console, `curl` checks | rejected | runtime tools |

### S13 vercel `react-best-practices` (index plus 11 rule files)

| Item | Outcome | Home or owner |
|---|---|---|
| `async-parallel`, `async-defer-await`, `async-cheap-condition-before-await`, `async-dependencies`, `async-api-routes` | rejected | obvious to a strong reviewer, or a micro-ordering with no evidence; "2 to 10 times" is a vendor figure |
| `server-parallel-fetching`, `server-parallel-nested-fetching` (sibling awaits in one Server Component run in sequence; split into children) | taken | `web-performance` ([T], low: a server component that awaits independent fetches one after another on a page's critical path) |
| `async-suspense-boundaries` | rejected | merged with S11 R2 |
| `bundle-barrel-imports` ("tree-shaking does not help"; 200 to 800 ms; `optimizePackageImports`) | missing | fact 31 (contradicts S2); figures rejected |
| `bundle-analyzable-paths` (template-literal `import()` widens the chunk set; `path.join(cwd, var)` widens Next file tracing) | missing | fact 33 |
| `bundle-dynamic-imports` (heavy editor in the main chunk) | taken | merged with S1 splitting row |
| `bundle-defer-third-party` (analytics after hydration) | taken | merged with S12 third-party row |
| `bundle-conditional` (load a module only when the feature is on) | taken | merged with the splitting row |
| `bundle-preload` (preload on hover or focus) | rejected | enhancement |
| `server-auth-actions` | routed | security (frontend ledger routed it already) |
| `server-cache-react` (`React.cache` per request), `server-cache-lru` | routed | architect (`caching-and-latency`), fact 42 |
| `server-dedup-props`, `server-serialization` (the client boundary serialises every field passed) | routed | developer (`react-craft` already has "A full record passed as props"; its harm there is exposure, here weight; one row is enough) |
| `server-hoist-static-io` (read static files at module scope) | rejected | micro |
| `server-no-shared-module-state` | routed | developer (frontend ledger routed it; shared mutable state) |
| `server-after-nonblocking` (`after()` for logging after the response) | rejected | framework-specific enhancement |
| `client-swr-dedup`, `client-event-listeners` (one shared global listener) | rejected | library choice; micro |
| `client-passive-event-listeners` | taken | merged with S1 passive row |
| `client-localstorage-schema` (version and keep small; synchronous API) | rejected | the version half is a correctness habit with no failure named; the size half has no threshold |
| `rerender-*` fifteen rules (defer reads, memo, default props, primitive deps, derived booleans, functional setState, lazy init, split hooks, transitions, deferred value, refs for transient values, no inline components) | rejected | memoisation and re-render tuning with no measured cost (`react-craft` Not a finding); `rerender-derived-state-no-effect` and `rerender-no-inline-components` already in `react-craft` as correctness; `rerender-transitions` and `rerender-use-deferred-value` merged with the input-handler row |
| `rerender-memo` note: with React Compiler, manual memo is unnecessary | taken | merged with S5 (target fact 39) |
| `rendering-content-visibility` ("10 times faster" for 1,000 rows) | rejected | enhancement (merged with S1); figure rejected; fact 24 |
| `rendering-animate-svg-wrapper`, `rendering-svg-precision`, `rendering-hoist-jsx` | rejected | micro |
| `rendering-hydration-no-flicker`, `rendering-hydration-suppress-warning` | routed | developer (`react-craft`: hydration correctness) |
| `rendering-activity` (`<Activity>` for show and hide) | rejected | enhancement; fact 41 if ever used |
| `rendering-conditional-render` (`&&` with a number) | routed | developer (already in `react-craft`) |
| `rendering-usetransition-loading`, `rendering-resource-hints` | rejected | enhancement |
| `rendering-script-defer-async` | taken | merged with S1 blocking-script row |
| `js-*` fourteen rules (index maps, `Set` lookups, combine iterations, hoist RegExp, min/max loop, cache property access, early exit, `toSorted`, `flatMap`, idle callback, batch DOM and CSS) | rejected | micro-optimisations, except `js-index-maps`, merged into the developer-review residue (a `.find` per element of a caller-sized list), and `js-batch-dom-css`, merged with layout thrashing |
| `advanced-*` four rules (`useEffectEvent` deps, handler refs, init once, `useLatest`) | rejected | patterns, not defects; `useEffectEvent` deps are the hooks linter's |

### S14 tech-leads-club `core-web-vitals`, `perf-web-optimization`, `perf-lighthouse`

| Item | Outcome | Home or owner |
|---|---|---|
| Measured at the 75th percentile of page visits | missing | fact 2 |
| INP "reports the worst interaction, at the 98th percentile for high-traffic pages" | missing | fact 3 |
| INP phase targets (input delay under 50, processing under 100, presentation under 50 ms) | rejected | fixed targets; the phases are fact 4 |
| LCP candidate elements (`img`, `image` in `svg`, video poster, `url()` background, text blocks); the SKILL.md also lists "`<svg>` element" | missing | fact 6 (the two files disagree) |
| LCP element must be in the initial HTML, not rendered by JavaScript | taken | merged with S12 client-rendered main image |
| Critical CSS under 14 KB | rejected | fixed threshold |
| Heavy click handler: visual feedback first, defer work with `requestAnimationFrame`, analytics on idle | taken | merged with the input-handler row |
| Third-party widget loaded on first interaction | rejected | enhancement (merged with S12) |
| `React.memo` an expensive sibling | rejected | `react-craft` Not a finding |
| CLS formula impact fraction times distance fraction | missing | fact 12 |
| Iframes, ads and embeds without reserved space (`min-height`, `aspect-ratio`) | taken | `web-performance` (merged with the dimensions row) |
| Notifications prepended above the viewport | taken | merged with S12 injected-content row |
| Fallback font metric overrides | missing | fact 16 (merged with S3) |
| Animations on height and width | taken | merged with S15 |
| `PerformanceObserver` snippets for LCP, INP, CLS | rejected | instrumentation |
| TTFB bands (800 ms, 1.8 s) | missing | fact 1 (whether TTFB is a Core Web Vital and whether web.dev publishes bands for it are part of that check) |
| Hero with `loading="eager"` and `decoding="async"` | rejected | `decoding` is tuning; eager is the default to check in fact 9 |
| Google Fonts stylesheet with `media="print" onload` | routed | security (inline handler under CSP, merged with S11 L1) |
| Third-party loader on first scroll, click or touch, or after 5 s | rejected | enhancement |
| Heavy package swaps (moment 67 KB, lodash 72 KB, axios 13 KB, uuid) | rejected | vendor figures; the whole-library row holds the harm |
| `manualChunks` vendor split | rejected | build tuning |
| Cache headers for static assets, HTML `no-cache`, API `private` | routed | architect (`caching-and-latency`) |
| webpack `mode: 'production'`, `usedExports`, `sideEffects`; named exports over a default-exported object | missing | fact 29 |
| Lighthouse CLI flags, Node API, compare-builds script | rejected | tool runner (noted, not followed) |
| Lighthouse `budget.json` and `--budget-path` | missing | fact 43 (whether budgets still exist in current Lighthouse); routed to quality if a repository uses one |
| Lighthouse CI assertions (`minScore`, `maxNumericValue`), `numberOfRuns: 3` and the median for inconsistent scores | routed | quality (`test-gates`: a gate that can fail and is not flaky) |
| `temporaryPublicStorage: true` uploads reports to public storage | routed | security and devops (fact 44) |

### S15 emilkowalski `animation-performance`

| Item | Outcome | Home or owner |
|---|---|---|
| Forced initial greeting; "do not provide other information" | rejected | instruction to an agent (noted, not followed) |
| `transform` and `opacity` by default; anything else needs a reason | taken | `web-performance` (fact 22) |
| Never `transition: all`; list the properties | taken | `web-performance` ([T]; `all` animates whatever changes next, layout included) |
| Name the cause before proposing a fix; say what is verified from code and what needs a device | taken | `web-performance` opening rule (merged with S1) |
| Frame budget 16.7 ms at 60 Hz, 8 ms at 120 Hz | rejected | arithmetic; no diff check |
| Property tiers: composite, paint, layout; `filter`, `clip-path`, `background-color` composite in current Chrome and Firefox | missing | fact 22 (the extra properties) |
| `box-shadow` animation repaints every frame; use `filter: drop-shadow()` | missing | fact 22 (paint cost); a [T] row only after the check |
| Animating `margin-left` on a sidebar re-lays out the content beside it | taken | merged with the layout-property row |
| A `requestAnimationFrame` animation runs on the main thread; CSS and WAAPI can run off it | missing | fact 22 |
| Motion `x`/`y` shorthands animate CSS variables and are not accelerated; use the `transform` string | missing | fact 25 (one library, one source) |
| A hand-rolled animation that sets React state every frame | taken | `web-performance` (state set per frame in `pointermove`, `scroll` or rAF handlers); border with `react-craft` |
| Animating an inherited CSS variable recalculates every descendant's style | taken | `web-performance` ([T], low; fact 25) |
| Animated `blur()` under 20 px | rejected | number from one source; S16 says 8 px (fact 45) |
| `will-change` only once a shift or dropped frames is seen; promoted layers cost GPU memory | taken | merged with S11 C3 |
| CSS for simple motion, a JS library for springs and gestures | rejected | opinion |
| Profile on a real mid-range phone | rejected | runtime |

### S16 ibelick `fixing-motion-performance`

| Item | Outcome | Home or owner |
|---|---|---|
| Do not interleave layout reads and writes in one frame; measure once, then FLIP | taken | merged with S1 layout thrashing |
| Do not drive animation from `scrollTop`, `scrollY` or scroll events; use scroll or view timelines, `IntersectionObserver` | taken | `web-performance` (scroll-driven animation in a scroll handler, merged with the passive row) |
| `requestAnimationFrame` loop with no stop condition | taken | `web-performance` ([T], low); a leak is also `react-craft`'s cleanup row |
| Pause or stop animations off-screen | rejected | enhancement |
| Do not animate CSS variables for transform, opacity or position; scope them locally | taken | merged with S15 |
| `will-change` temporary and surgical; avoid many large promoted layers | taken | merged with S11 C3 |
| Blur at most 8 px, never continuous, never on large surfaces | rejected | merged with S15 blur (fact 45) |
| View transitions only for navigation | rejected | opinion |
| Do not migrate animation libraries unless asked | routed | developer (`surgical-change`) |

### S17 Community-Access `performance-accessibility`

| Item | Outcome | Home or owner |
|---|---|---|
| Lazy images keep `alt`; size the placeholder | routed | frontend (accessibility rows); the size half is `web-performance`'s dimensions row |
| Infinite scroll with no "Load more" alternative is a keyboard trap | routed | frontend (keyboard path) |
| Skeletons `aria-hidden`, container `aria-busy`, announce completion | routed | frontend (state nobody hears) |
| Avoid pushing a focused element when content arrives | routed | frontend (focus lost); the shift is `web-performance`'s injected-content row |
| Code splitting: announce route transitions; error state for a failed chunk | routed | frontend (UI states, focus on route change) |
| `prefers-reduced-motion`; disable parallax | routed | frontend (visual accessibility) |
| "Return only JSON matching a schema" | rejected | instruction to an agent (noted, not followed) |

### S18 alirezarezvani `performance-profiler`

| Item | Outcome | Home or owner |
|---|---|---|
| Run the bundled profiler script; flamegraphs, py-spy, pprof, k6 | rejected | tool runner (noted, not followed) |
| Record p50, p95, p99, RPS, error rate before optimising | routed | quality (a benchmark's baseline) and architect (targets) |
| "Database queries taking over 100 ms" | rejected | fixed threshold |

### S19 vercel `vercel-optimize`

| Item | Outcome | Home or owner |
|---|---|---|
| Metrics first; read only files a gated candidate names | rejected | runtime pipeline on a vendor's metrics |
| Version-aware citations; do not recommend features the detected version lacks | taken | `web-performance` "First, establish the target" (framework version; merged with S1) |
| Never put tokens in shell commands | routed | security |
| Scripts, sub-agent fan-out, "print exactly" | rejected | instruction to an agent (noted, not followed) |

### S20 this repository: routings parked for "performance (planned)"

| Item (where parked) | Outcome | Home or owner |
|---|---|---|
| N+1 on fixed-cardinality loops is a false positive (developer ledger) | routed | data (data's review already has "Not when the loop's size is fixed") |
| Backend unbounded queries and N+1 (developer ledger, three rows) | routed | data |
| Performance section: algorithms, bundles, caching, images, sync I/O (developer ledger) | taken | algorithms: developer review; bundles and images: `web-performance`; caching: architect; sync I/O: the language skills |
| `join` over concatenation; `__slots__`, generators; `strings.Builder`, pre-allocation; `with_capacity`; Java string concatenation (developer ledger, five rows) | rejected | stays "Not a finding" in each language skill; no hot-path skill revives them |
| Sequential awaits for independent work (developer ledger; `typescript-craft` Not a finding) | rejected | obvious; correct code (S1) |
| Inline objects as props, lodash imports, memo (developer ledger) | taken | lodash: `web-performance` whole-library row; inline props and memo stay `react-craft` Not a finding |
| Bundle size impact of a new dependency (developer ledger) | taken | `web-performance` (only when imported into an entry file; `dependency-discipline` keeps the choice of dependency) |
| WCAG 2.1 AA, 60 fps, load under 1.5 s (developer ledger) | rejected | fixed thresholds |
| Streaming: accumulate with a list and join; time to first byte (developer ledger) | rejected | micro; TTFB is the architect's |
| Memo, inline props, Suspense placement, virtualisation, context frequency (developer ledger, two rows); waterfalls, bundles, re-render tuning (about 55 rules) | taken | virtualisation and bundles: `web-performance`; the rest rejected with S13 |
| `"use client"` at the top of a large tree (cut from `react-craft`) | taken | `web-performance` (merged with S11 R1) |
| Unbounded concurrency in Rust (kept in `rust-craft`, border architect and performance) | routed | developer (`rust-craft` keeps it) and architect ("No bound") |
| `FetchType.EAGER`, lazy collection in a loop; list endpoint without paging (`java-craft` cuts) | routed | data (fetch and N+1), softarch (API shape) |
| 1,000 unvirtualised rows (frontend ledger) | taken | `web-performance` |
| Animate only `transform` and `opacity` (frontend ledger) | taken | `web-performance` |
| A large client bundle from `"use client"` propagation (frontend ledger) | taken | `web-performance` |
| Render performance, memo, Suspense placement, virtualisation (frontend ledger) | taken | virtualisation taken; the rest rejected with S13 |
| `react-best-practices` waterfalls, barrels, dynamic imports (frontend ledger) | taken | this ledger, S13 |
| Defer heavy initialisation; package size budget (genai ledger) | routed | architect (cold start, `lambda-event-sources`) |
| Realistic token budgets (quality ledger) | routed | genai |
| Measured performance with a workload, not a percentage (quality ledger) | routed | quality (test-craft: a performance test names its workload and compares against variance) |
| Load testing with k6 (observability ledger S10) | routed | quality |
| Latency targets and caching as a pattern ("performance, planned" in the data ledger's table) | routed | architect |

### S21 this repository: what already covers the backend half

| Item (proposed `hot-path-performance` row) | Outcome | Home or owner |
|---|---|---|
| Sync I/O in async code, Python | routed | developer (`python-craft`: `ASYNC210`, `ASYNC212`, `ASYNC230`, `ASYNC251` and the sync-driver row) |
| Sync I/O in async code, TypeScript | routed | developer (`typescript-craft`: `readFileSync`, `pbkdf2Sync` in a handler) |
| Sync I/O in async code, Rust | routed | developer (`rust-craft`: blocking calls in async with no `spawn_blocking`; guard across `.await`) |
| Sync I/O in async code, Java | routed | developer (`java-craft`: `supplyAsync` on the common pool, blocking on a reactive thread) |
| Work that grows with input: a remote call per item | routed | architect (review "A remote call per item") |
| Work that grows with input: unbounded loops, fan-out, queues, retries | routed | architect (review "No bound"; `aws-well-architected` `REL05-BP04`, `REL01-BP03`) |
| Work that grows with input: a query that grows with the table, a scan on a request path | routed | data (review "A query that grows with the table"); architect (`aws-well-architected` `PERF03-BP04`) |
| Work that grows with input: in-memory work super-linear in a caller-controlled size (a `.find` or `.filter` per element, a sort inside a loop, a nested scan) | taken | developer review: one new category, no skill (no sourced fact needed) |
| Allocation in hot loops | rejected | already "Not a finding" in `go-craft` and `python-craft`; invisible without a profile |

**Count:** 358 items. Taken 96, routed 96, rejected 124, missing 42. Counted by script over the first word of the Outcome column; the same script checked that every missing row names a fact and every fact in section 4 is cited by at least one row. 44 of the taken rows are "merged with" an earlier row, so the distinct rules are far fewer (section 7 lists them); 15 of the routed rows go to an owner whose file already holds the item. Rows marked "taken" whose rule waits on a fact count as taken, and the facts they wait on are in section 4. Each of the 42 missing rows names its fact in section 4; several rows share one fact, and some facts serve routed or taken rows instead.

## 4. Facts that need the maintainer's live check

One checkable sentence each, with the page that should hold it. Each is "source says X; check it"; none is stated here as true.

Core Web Vitals (web.dev):
1. S2, S3 and S14 give "good" as LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1, with poor above 4 s, 500 ms and 0.25; S11, S12 and S14's second file write "<". Check the bands and whether the boundary value counts as good, and whether web.dev publishes TTFB bands (S14 says 800 ms and 1.8 s). (web.dev/articles/vitals, web.dev/articles/defining-core-web-vitals-thresholds, web.dev/articles/ttfb)
2. S14 says the assessment uses the 75th percentile of page visits. Check, and whether mobile and desktop are assessed separately. (web.dev/articles/vitals)
3. S14 says INP reports the worst interaction, or the 98th percentile on pages with many interactions; S11 says "reports the worst". Check how the value is chosen. (web.dev/articles/inp)
4. S3, S11 and S14 split an interaction's latency into input delay, processing duration and presentation delay. Check the names. (web.dev/articles/optimize-inp)
5. S12 says INP replaced FID as a Core Web Vital in March 2024. Check the date. (web.dev/blog, INP becomes a Core Web Vital)
6. S14's LCP reference lists the candidate elements as `img`, `image` inside `svg`, `video` with a poster, an element with a `url()` background and block-level text; its SKILL.md also lists "`<svg>` element". Check the list. (web.dev/articles/lcp)
7. S11 names LCP's sub-parts TTFB, resource load delay, resource load duration and element render delay, with target shares of about 40, under 10, about 40 and under 10 percent. Check the names, and whether any share is published. (web.dev/articles/optimize-lcp)
8. S1, S11 and S12 say `loading="lazy"` on the LCP image delays LCP. Check web.dev's guidance on lazy-loading above-the-fold images. (web.dev/articles/browser-level-image-lazy-loading, web.dev/articles/lcp-lazy-loading)
9. S12 says lazy loading is "the default in modern browsers" for below-the-fold images. Check the default value of the `loading` attribute. (HTML standard, MDN `HTMLImageElement.loading`)
10. S12 describes `fetchpriority="high"` on an `img` and on a `<link rel="preload">`, and says several preloads compete. Check what the attribute does and where web.dev recommends it. (web.dev/articles/fetch-priority, MDN `fetchpriority`)
11. S12 says the preload scanner only reads hints in `<head>`. Check. (web.dev/articles/preload-scanner)
12. S11 and S14 say a layout shift's score is impact fraction times distance fraction, and that shifts within 500 ms of user input are excluded (`hadRecentInput`); check that and how CLS groups shifts into session windows. (web.dev/articles/cls)
13. S2, S12 and S14 say `width` and `height` attributes on an image let the browser reserve its space before it loads. Check, including for `<source>` in `<picture>` and for `aspect-ratio` in CSS. (web.dev/articles/optimize-cls, MDN `img`)

Fonts (MDN, CSS Fonts):
14. S12 says `font-display: swap` shows invisible text until the font loads; S14 says swap shows the fallback immediately; S12 gives `optional` about 100 ms and `block` up to 3 s. Check each value's block and swap periods. (MDN `@font-face/font-display`, CSS Fonts Module Level 4)
15. S12 says a font loaded through CSS `@import` is discovered late. Check web.dev's guidance on `@import` and font loading. (web.dev/articles/font-best-practices)
16. S3 and S14 say `size-adjust`, `ascent-override` and `descent-override` on the fallback reduce the shift when the font swaps. Check the descriptors and their support. (MDN `@font-face`, web.dev/articles/css-size-adjust)

Main thread and rendering (web.dev, MDN):
17. S1, S3 and S12 call a task over 50 ms a long task. Check. (web.dev/articles/long-tasks-devtools, W3C Long Tasks API)
18. S11 says `scheduler.yield()` is in Chrome 129+ and Firefox 129+ and not in Safari as of April 2026. Check current support. (MDN `Scheduler.yield`, its compatibility table)
19. S11 says the Long Animation Frames API shipped in Chrome 123. Check (context only). (developer.chrome.com/docs/web-platform/long-animation-frames)
20. S1, S3, S11 and S16 say reading layout (`offsetHeight`, `getBoundingClientRect`) after a style write in the same frame forces a synchronous layout. Check. (web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
21. S5 says a passive listener cannot call `preventDefault()`. Check, and which events are passive by default on `window` and `document`. (MDN `EventTarget.addEventListener`, `passive`)
22. S1, S11 and S15 say `transform` and `opacity` animate without layout or paint; S15 adds `filter`, `clip-path` and `background-color` in current Chrome and Firefox, says `box-shadow` repaints every frame, and that CSS transitions and WAAPI can run off the main thread while rAF cannot. Check each. (web.dev/articles/animations-guide, web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
23. S11, S15 and S16 say `will-change` should not be applied permanently and each promoted layer costs memory. Check MDN's guidance. (MDN `will-change`)
24. S3, S11 and S13 say `content-visibility: auto` skips rendering of off-screen content and needs `contain-intrinsic-size` to avoid shifts. Check. (web.dev/articles/content-visibility, MDN `content-visibility`)
25. S15 says animating an inherited custom property recalculates style for every descendant, and that Motion's `x`/`y` shorthands animate CSS variables and are not hardware-accelerated. Check (MDN `@property` on `inherits`; motion.dev documentation on hardware acceleration).

Scripts and caching (HTML standard, MDN, web.dev):
26. S12 and S14 say a classic `<script src>` with no `async` or `defer` blocks parsing, `defer` runs in order after parsing, `async` runs on arrival, and `type="module"` is deferred by default. Check. (HTML standard scripting, MDN `<script>`)
27. S11 says an inline `onload` handler is blocked under a CSP without `'unsafe-inline'` or `script-src-attr 'unsafe-inline'`. Check (for security). (MDN CSP `script-src-attr`)
28. S1 and S3 say an `unload` handler or `Cache-Control: no-store` on the HTML makes a page ineligible for the back/forward cache; S12 recommends `no-cache, no-store, must-revalidate` for HTML. Check both conditions in current Chrome, Firefox and Safari. (web.dev/articles/bfcache)

Bundlers (webpack, Rollup, Vite, Next.js):
29. S2, S3, S11 and S14 say tree shaking needs ES module syntax, and `"sideEffects": false` (or a list) in a package's `package.json` lets the bundler drop unused re-exported modules; S14 adds `mode: 'production'` and `usedExports`. Check the conditions. (webpack.js.org/guides/tree-shaking)
30. Check how Rollup and Vite treat `sideEffects` and unused exports in a production build. (rollupjs.org configuration options `treeshake`, vite.dev/guide/features)
31. S13 says importing from a barrel file costs 200 to 800 ms because "tree-shaking does not help" for external or unbundled libraries, and that Next.js 13.5+ `optimizePackageImports` rewrites barrel imports; S2 says modern bundlers handle named imports given `sideEffects: false`. Check what each bundler does with `export *` barrels in production and in development, and which packages `optimizePackageImports` covers by default. (webpack sideEffects docs, nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)
32. S11 says `require()` in frontend code prevents tree shaking. Check. (webpack.js.org/guides/tree-shaking)
33. S5 and S13 say a dynamic `import()` with a template-literal or variable path makes the bundler include every module that could match. Check webpack's dynamic expressions and Vite's dynamic import rules. (webpack.js.org/api/module-methods dynamic expressions, vite.dev/guide/features dynamic import)
34. S13 and S14 say `next/dynamic` and `React.lazy` put a component in its own chunk. Check, and what `ssr: false` does in the App Router (where it is allowed). (nextjs.org/docs/app/guides/lazy-loading, react.dev/reference/react/lazy)
35. S11 and S12 say `"use client"` marks a boundary and every module it imports becomes client code sent to the browser. Check. (react.dev/reference/rsc/use-client)
36. S11, S12 and S14 say the Next.js `Image` `priority` prop preloads the image and turns off lazy loading. Check the prop's current name and behaviour in the Next.js version a repository runs. (nextjs.org/docs/app/api-reference/components/image)
37. S11 says Next.js 16 adds `"use cache"` with `cacheComponents: true`, replacing `unstable_cache` (for the architect). (nextjs.org/docs, `use cache` directive)

React (react.dev):
38. S1, S2 and `react-craft` say memoisation is an optimisation to use only for measured or obvious cost; S4 says wrap every function passed to children in `useCallback`. Check react.dev's guidance on when `useMemo`, `useCallback` and `memo` are worth it. (react.dev/reference/react/useMemo, /useCallback, /memo)
39. S5, S11 and S13 say React Compiler memoises automatically, so manual memoisation is unnecessary where it is on. Check its release status and what it covers. (react.dev/learn/react-compiler)
40. S5, S11 and S12 say `useDeferredValue` and `startTransition` keep input responsive during an expensive render. Check. (react.dev/reference/react/useDeferredValue, /useTransition)
41. S5 says `<Activity>` is available in React 19 to hide a tree without unmounting it. Check its status and version. (react.dev/reference/react/Activity)
42. S5 says `React.cache` deduplicates within one server request (for the architect). (react.dev/reference/react/cache)

Tools:
43. S14 says Lighthouse accepts `--budget-path` and a `budget.json`. Check whether performance budgets are still supported in the current Lighthouse release. (github.com/GoogleChrome/lighthouse, docs and changelog)
44. S14 says Lighthouse CI's `temporary-public-storage` target uploads reports to public storage (for security and devops). (github.com/GoogleChrome/lighthouse-ci, docs/configuration.md)
45. S15 keeps animated `blur()` under 20 px and S16 at most 8 px. Check whether any browser vendor publishes a limit; if none does, both stay rejected. (web.dev, WebKit blog)
46. S3 and S12 say a `preconnect` or `preload` for a font origin needs `crossorigin`, or the browser opens a second connection. Check. (web.dev/articles/preconnect-and-dns-prefetch, MDN `rel=preload`)

Not on the list on purpose: vendor and community figures (200 to 800 ms per barrel, 28 percent faster builds, AVIF 90 to 95 percent, 14 KB HTML, 200 KB bundles, 100 items, 50 ms handlers, DOM 1,500 nodes). They are rejected above, and no row rests on one.

## 5. Plan questions the frontend expert would gain

Not a new expert's reference; these are the lines `experts/frontend/references/plan.md` would add if `web-performance` is built.

- **The main content.** For a new page or route: what is its main content (an image, a heading, a block of text), and is it in the server-rendered HTML or does it wait for client code and a fetch?
- **Sizes that grow.** For a new list, table or feed: can the number of rows grow without bound, and if so is it paginated (owner of the query: data) or virtualised?
- **Heavy code and when it loads.** Which new libraries or large components does the feature add, and does every route load them or only the one that uses them?
- **Third parties.** Which external scripts does it add, on which routes, loaded how?
- **The repository's own budget.** If the repository has a bundle-size or Lighthouse gate, the change states its effect; if it has none, do not invent a number.
- Good constraint: "The chart library loads with `next/dynamic` on `/reports` only; the root layout imports nothing new." Rejected: "Make the page fast."

**Worked pair (draft, invented, from no corpus case).** Finding: `app/layout.tsx:3` adds `import { Editor } from '@acme/rich-editor'` for a modal opened only from `/posts/new`; the root layout is loaded by every route, so the editor ships to every page although one route uses it. Fix: import it with `next/dynamic` inside the modal. Potential impact, not measured. Dropped: `components/Avatar.tsx:12` renders `<img src={user.avatarUrl}>` with no `width` or `height`; it looked like a layout-shift source, but the wrapping `.avatar` class sets a fixed 32 px box with `overflow: hidden`, so the space is reserved.

## 6. Responsibilities: draft rows, and the text that would change

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Rendering and loading performance (frontend) | what a change makes the browser load on every route, a main image that loads late, layout that shifts, main-thread work on input, animation that forces layout | server latency, caches and HTTP cache headers (architect); queries, pagination and pools (data); whether a performance gate can fail (quality); state and effect correctness (developer) | a heavy import in the root layout is the frontend expert's; whether the API under the list is paginated is data's |
| Work that grows with input (developer, review category) | in-memory work super-linear in a size a caller controls | remote calls per item and unbounded fan-out (architect); queries that grow with the table (data) | a `.find` per element of a request-sized list is the developer's; a database call per element is data's or the architect's |

Text that would change if this is built (not edited here):
- `.cursor-plugin/ultimate-workflow/agents/uw-expert-frontend.md`: the Goal's "Not the goal: ... render performance and bundle size" goes, and the Responsibilities table gains the first row above.
- `.cursor-plugin/ultimate-workflow/agents/uw-expert-developer.md`: the "Language idioms and traps" row's "rendering performance and bundle size (not yet owned)" becomes "(frontend)".
- `experts/skills/react-craft/skill.md` "Not for": "rendering performance and bundle size (frontend, planned)" becomes "(frontend, `web-performance`)".
- `experts/skills/typescript-craft/skill.md` Not a finding: `await` in a loop stays, with "(a performance question, not a defect here)" kept; nothing moves.
- `experts/skills/rust-craft/skill.md` and `java-craft` routings to "performance (planned)": rewrite as architect and data.
- `docs/experts/ledgers/data.md` table: "latency targets and caching as a pattern (architect; performance, planned)" drops "performance, planned".
- `docs/experts/frontend.md` Boundaries: "Render performance and bundle size: not yet owned" becomes "frontend (`web-performance`)".
- `docs/expert-catalogue.md` entry 12: status "folded into skills (2026-10-21)", with the hosts.

## 7. Proposed skills, with selectors and the value test

| Skill | Rows (value test passed) | Host | Selector |
|---|---|---|---|
| `web-performance` | **Opening:** every finding is "potential impact", never a measured number, and names the cause it addresses; first establish the framework and rendering model and its version, whether React Compiler is on, which element is each changed page's main content, and the repository's own bundle or Lighthouse gate if any. **Loading:** a dependency or whole library imported into a file every route loads (root layout, `_app`, the client entry); `"use client"` added at a layout or page root; a large component shown only conditionally (modal, tab, editor, chart, map) imported statically where the repository already splits similar ones; a classic `<script src>` in `<head>` with no `defer`, `async` or `type="module"`; a third-party script mounted in the root layout for every route; a server component awaiting independent fetches one after another ([T], low); a dynamic `import()` with a variable path (after fact 33); barrel imports (only after fact 31). **Main content:** `loading="lazy"` on the page's main or first above-the-fold image; the main image or text rendered by client code after hydration, or fetched in `useEffect` where the framework renders on the server; `img`, `iframe`, `video` or an embed with no dimensions, `aspect-ratio` or reserved box; content inserted above existing content after load; fonts by CSS `@import` or a third-party stylesheet, `@font-face` with no `font-display`. **Input and animation:** synchronous work over a whole data set in an input or keystroke handler with no deferral; layout reads interleaved with style writes in a loop; React state set every frame in a `pointermove`, `scroll` or rAF handler; a `requestAnimationFrame` loop with no stop condition ([T], low); scroll-driven motion from scroll events, or a non-passive scroll listener; a list rendering a collection whose size the server does not bound, with no virtualisation; animating layout properties or `transition: all`; an animated inherited CSS variable ([T], low); permanent `will-change` ([T], low); an `unload` handler (after fact 28). **Not a finding:** missing memoisation (`react-craft`); JS micro-optimisations; fixed budgets or a Lighthouse score; image format or `srcset` tuning; any measured number the expert did not measure | frontend (review and plan) | `files: next.config.*, vite.config.*, webpack.config.*, rollup.config.*, index.html, **/app/layout.*, **/pages/_app.*, **/pages/_document.*, src/main.*`; `added: loading=\|<img\b\|<Image\b\|<iframe\|<video\|<script\|<link rel=\|@font-face\|font-display\|@import url\|transition:\|transition-property\|animation:\|will-change\|import\(\|React\.lazy\|\blazy\(\|dynamic\(\|["']use client["']\|getBoundingClientRect\|offsetHeight\|offsetWidth\|onScroll\|onPointerMove\|requestAnimationFrame\|addEventListener\(["'](scroll\|wheel\|touchmove\|pointermove\|unload)` |
| (no skill) "Work that grows faster than its input" | one review category: a `.find`, `.filter`, `includes` or sort inside a loop over a collection whose size a caller or upstream controls, on a request path; Not when the size is fixed and small by construction | developer (`experts/developer/references/review.md`) | none (a review category is always in the developer's prompt) |

Rejected: **`hot-path-performance`** under the developer. Of its three proposed items, sync I/O in async code is already a row in four language skills, work that grows with input is already the architect's "A remote call per item" and "No bound" and data's "A query that grows with the table", and allocation in hot loops is "Not a finding" in two language skills and cannot be seen without a profile. It fails the playbook's second question ("Is it new?"). The one residue needs no sourced fact, so it is a review category, not a skill.

Value test notes. Cut for "checkable in a diff": anything about bytes, timings or scores (no build, no browser), resource hints, Speculation Rules, critical CSS. Cut for "non-obvious": sequential awaits, missing `key`, effect cleanup (already `react-craft`). Cut for "not covered elsewhere": memoisation, hydration correctness, server-side caching. Cut for "calibrate to the workload": every fixed budget. The skill is roughly 9 to 11 KB as drafted; with frontend's four drafted skills (`semantics-and-aria`, `visual-accessibility`, `ui-on-real-data`, `rtl-and-direction`) the review stage's worst case must be checked against the 40 KB cap when written; `web-performance` should sit last in priority, since accessibility is the expert's core.

## Verdict

Build one skill, **`web-performance`, hosted by frontend at plan and review**, after the live check of section 4; add one review category, **"Work that grows faster than its input", to the developer's review reference**; do **not** build `hot-path-performance`.

Where the proposal is wrong or needs restating:
- **"Bytes added to entry chunks"** cannot be seen without a build. What a diff shows is the cause: a static import into a file every route loads, a whole-library import, `"use client"` at a layout root. The rows say that, and every finding is "potential impact", never a number (S1's rule; frontend has no browser).
- **Barrel imports** are contested between S2 and S13 and wait on facts 29 and 31; they are not a row until then.
- **Unvirtualised long lists** keep no item count (S11's "100" is a fixed threshold); the trigger is a size the server does not bound, and the query's bound stays data's.
- **Missing from the proposal and worth taking:** render-blocking scripts, a third-party script in the root layout, `transition: all` and layout-property animation, layout thrashing, fonts by `@import` and `font-display`, main content fetched on the client in a server-rendering framework, content injected above existing content.
- **The backend skill duplicates** four language skills, the architect and data (section 7).

Borders:
- **`react-craft` (developer)** keeps correctness: effects and their cleanup, races, keys, nested components, hydration mismatches, a full record crossing to the client. `web-performance` keeps cost: what loads when, main-thread work, shifts. Neither holds memoisation rows (react.dev check, fact 38).
- **`caching-and-latency` (architect)** keeps server caches, CDNs and every `Cache-Control` header, including `no-store` on HTML against the back/forward cache (fact 28), plus latency targets, TTFB and deadlines.
- **Data** keeps N+1, pagination and limits at the query, indexes, plans and pools.
- **Quality's `test-gates`** keeps whether a Lighthouse or bundle-size gate can fail and is not flaky (repeated runs, median), and `test-craft` keeps a benchmark's workload and comparison against variance. The frontend tests stage only names performance cases: a large list, a slow network, a late font.

Two host problems to settle first:
1. The frontend agent's Goal says render performance is "Not the goal", and its Responsibilities table has no row for it. Both change (section 6).
2. Frontend's description triggers on UI changes. A diff that touches only `next.config.*`, a root layout or a new import may never select the expert, so the skill's selector would never run. Check this against the `description` and selection examples in `.cursor-plugin/ultimate-workflow/agents/uw-expert-frontend.md`, and add a case to `evals/experts/skills-injection.test.js`, before wiring.

**Tools needed:** read, search and the web (frontend's existing grant). No browser, no shell, no bundler.

## Maintainer decision, 2026-10-21

- The `web-performance` skill is hosted by the **developer**, not frontend: the maintainer's answer to the host question. The developer's Responsibilities gain a Web performance row; frontend's Goal names the developer as the owner. Frontend selection on bundler-only diffs is no longer the issue; the developer's description now names changes to what a page loads first. The skill waits for fact-check block I.
