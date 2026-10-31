# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.1] - 2026-10-31

### Changed

- **The tests the change needs, not the whole suite after every edit.** Since 4.1.0 turned the gates on, G3 asked for the full `test_command` at the end of every turn, and each build round ran it too, so a one-line change waited for every test. `node hooks/verify.js` now decides from the uncommitted changes: only the related tests (`test_related_command` in the plan, with `{files}` or `{tests}`) while working; the full suite when there is no related command, no git or no related test, when a manifest, lockfile, compiler or runner config, test setup, CI file or a `full_suite_paths` path changed, or more than 20 files did. G3 accepts a passing related run. The build's rounds run it, and a round is green only after one full run passes (`verify.js --full`). The plan proposes `test_related_command`; a plan without it behaves as before. `hooks/lib/selection.js`, `hooks/verify.js`.
- **`npm test -- one.test.ts` no longer counts as the full suite.** The verify command was matched by substring; now only `verify.js --full`, or `test_command` as the whole last command, is a full run (`dispatch.verifyKind`).

### Added

- **G7: no commit until a passing full test run covers the current changes.** The full suite runs once here instead of at every turn end. A full run is recorded with the fingerprint of the changes in `.ultimate-workflow/verify.json`; an edit after it makes it stale. Docs-only and empty commits are exempt (a `requirements.txt` change is not docs); no `test_command`, no check. `status.js` shows `fullVerify` (never, fresh, stale, failed). Tests: `hooks/lib/selection.test.js`, `hooks/verify.test.js`, `dispatch.test.js`, `status.test.js`, `evals/experts/stage-script.test.js`, each safeguard mutation-checked.

## [4.1.0] - 2026-10-30

### Changed

- **The gates are on by default again.** `ULTIMATE_WORKFLOW_GATES` unset now means on; `off`, `0`, `false` or `no` turns every gate off (it used to need `on`). They are still inert in a repo with no `PRD.md` and no `PLAN-*.md`, still fail open, and `hooks/status.js` shows whether they are live. Why they were off in 3.x and why that changed: `docs/gates.md`.
- **Three tiers instead of "when to skip".** Skip (typo, one-line fix, doc edit, rename), light (plan without experts, tests, build, experts check) and full (plan with experts, tests, build per card, review, experts check, harvest). A PRD or new project is full, runs the bootstrap first and then the full tier once per roadmap milestone. In the workflow skill, the Cursor rule, `AGENTS.md` and the README.
- **The running-system harness comes first.** When a plan splits the work into cards and a check needs the running system (a browser capture, an integration or end-to-end harness), the plan and test-plan prompts make that harness the first card, so later cards are verified against it. On the CEO dashboard run it was card 3 and found four defects card 2 had already committed.
- **A recheck cannot drop the experts still on this work.** `prepare` prints `keep` with the last experts check's experts when its snapshot and the current diff share at least one file (decided 2026-10-29), and `review.js` keeps them selected; the recheck can still add. After a commit and an unrelated new change nothing carries over. The changed-only recheck uses the same path.
- **`prepare` warns when untracked files make up most of a large diff** (`untrackedHeavy`, over 200 KB and half the bytes), naming the biggest, and the review command asks the user whether to ignore them first. On a real install 1.8 MB of capture output was about to be reviewed.
- **Plan and tests markdown that comes back HTML-escaped is decoded before it is shown or written**, `&amp;` last. Seen on a real install.
- **Copying a workflow result from the tool's output file with a one-liner is the expected way**, said so in the ledger step, so it is no longer logged as a workaround.
- **The tests and build commands record their own catches:** each critic gap or expert case that changed the test plan, and each defect the build found. On the first real card all 16 catches were at tests or build, where nothing had asked for them.
- **One retry for a run that started no agent.** The five phase commands keep "call it once", with one exception: a run that failed before any agent started (an input or argument error) is fixed and run once more, said so and noted in the ledger's workarounds.

### Added

- **`/ultimate-workflow:feature`, the whole workflow in one command.** Give it a request or a PRD; it picks the tier, says which, runs the phase commands in order by following their own files, and stops only for the two confirmations, an open high-confidence finding, a build that escalates after three rounds, a gate refusal it cannot satisfy, or a failure after the one retry. It ends with the value report for the feature. `commands/feature.md`. A finished roadmap milestone is marked done in `ROADMAP.md` and `progress.md`, so the next session starts at the next one. `HOW-TO-USE.md` is the one-page guide: what to type for a new project and for a feature.

- **A value ledger and `/ultimate-workflow:value`.** Every phase command now ends by appending one line to `.ultimate-workflow/ledger.jsonl` (local, like the evidence): the session's numbers from the Workflow result (run id, agents, tokens, duration, workarounds) and, from the phase's own saved result, the experts, skills, review findings by basis and uncited skills, whether the review was a delta, the cases each expert added at tests (a new `casesAdded` in the tests lane), and the build's rounds and briefs. Catches are recorded and later confirmed or refuted with `experts.js ledger catch|confirm|refute` (the plan command records each expert correction to the draft; the review command each confirmed finding; the build confirms one when its test goes red). `/ultimate-workflow:value` reports totals per phase, catches by stage and origin, the experts' unique precision (confirmed over judged), skill citation rates and skills never cited, and the workarounds. Code records and adds up; whether a catch was unique or real stays the user's or the session's call. `experts/ledger.js`, `evals/experts/ledger.test.js`. On the CEO dashboard run all of this was kept by hand.

- **A changed-only experts recheck before a commit.** `/ultimate-workflow:experts` now runs `prepare --delta`: when the last experts check covers the earlier changes, each of its experts reviews only the files that changed since, plus the files in the diff that import a changed file or use one of its exported names or the custom properties it touched; its findings on every other file carry forward with their ids, waivers and blocking. The commit gate is unchanged: the record is still for the current fingerprint. A full review runs instead after 3 changed-only reviews in a row, when the changed and dependent files exceed 40% of the diff's files, when there is no snapshot of the base, or when an expert's review does not cover it; an expert the recheck adds, and the recheck itself, always read the full diff. On a changed-only recheck the last check's experts stay selected even when the recheck answers nobody (it can still add), so the expert that reviewed the earlier changes always sees the fix. On the CEO dashboard run every fix-and-recheck loop cost about 490k tokens. Known limit: an effect on a file that neither changed nor visibly uses a changed one is not re-read. `evals/experts/delta.test.js`, with mutation checks for the carry-forward, the base check and the dependents.

## [4.0.2] - 2026-10-29

### Fixed

- **The phase commands can start their workflow on a real install.** The Workflow tool refuses a `scriptPath` in the plugin's install folder ("scriptPath must be a script path this tool returned, or a file you can already read"), so every command's `${CLAUDE_PLUGIN_ROOT}/phases/<x>.js` failed, and sessions copied the script by hand with the arguments retyped, up to 294 KB of skill text. `experts.js script --phase <x>` now writes `.ultimate-workflow/run/<x>.js`, the phase script with its arguments built in from the files the command already produced (`--file key=path`, `--merge path`, `--args-file path` for the small ones), and prints its path; the commands call the tool with that path and no `args`. `harvest` now gets an object (`scope`, `range`) instead of the raw argument string. `plan` accepts `areas` as a list as well as a comma-separated string; a list crashed the run before any agent started. Tested in `evals/experts/stage-script.test.js`; `mirrors.test.js` refuses a command that points the tool at the plugin folder.

### Changed

- **At review each expert gets at most two skills,** its first two matches in `skills.md` order; the rest are named in `skillProblems` (decision 2026-10-29). On the CEO dashboard run 15 of 16 loaded review skills went uncited on two cards, and a planted-defect ablation (core lenses, experts without skills, experts with skills, two runs each) found no difference from the skills. Plan, tests and build are unchanged.
- **`/ultimate-workflow:review --no-experts`** runs the four core lenses only, at about a third of the cost, and says the experts were left out by request.
- **`rtl-and-direction` at review needs a direction signal** (`dir=`, `rtl`, `direction:`, `:dir(`, `<bdi`, `unicode-bidi`), not physical sides alone (decision 2026-10-29). On an app with no RTL support, `ml-4` or `left-2` loaded it on nearly every diff. An RTL app's change that only adds physical sides no longer loads it.
- **A stopped build can resume at the implementation, on record.** `build` takes `resumeAt: "implement"` with `resumeReason` (the user's decision), `testFiles` and `command`; it skips the test step and the result says `resumedAt`. Before, two cards needed a hand-edited copy of `build.js`.
- **`experts.js brief --section "<card heading>"`** chooses the briefs and skills from one card of a plan split into cards. Before, the devops brief loaded on cards 1 and 2 because card 3 adds a CI job.
- **Experts report a defect they can show now, not later.** In a real review the frontend expert saw that focus might not reach the opened phone drawer and left it for a later browser test; a core lens reported it instead. `experts/protocol.md` now says to report it and name the stage that will measure it.
- **`commands/plan.md` no longer says `plan_confirmed` "is not yours to set".** It contradicted the skill, which says to set it once the user has confirmed and never to clear a block; the command now says the same.

## [4.0.1] - 2026-10-28

Fixes three faults that only appeared on a real plugin install; local runs and every test passed. On 4.0.0 the phase commands could not run as designed.

### Fixed

- **Agents are called by their plugin name.** Claude Code registers a plugin's agents as `ultimate-workflow:uw-*` and has no bare names, but the phase scripts asked for `uw-explorer`, `uw-reviewer` and the expert names as listed, so every phase failed with "agent type not found". Each script now carries one identical block (`AGENT_NAMESPACE`, default `ultimate-workflow:`, and `agentName()`) and every `agentType` goes through it; `args.agentNamespace: ""` keeps local runs, which use the `.claude/agents/` copies, working. The shared test harness refuses a bare name, and `evals/experts/agent-names.test.js` checks that the blocks are identical, that the namespace equals `plugin.json`'s name, that no `agentType` bypasses `agentName()`, and that every named agent exists.
- **The phase scripts moved from `workflows/` to `phases/`.** Claude Code registers every script in a plugin's `workflows/` folder as a named workflow under the same names as the commands, so `/ultimate-workflow:plan` ran `plan.js` directly: the user's text arrived as a plain string and the command's expert setup (`experts.js list`, `experts.js skills`) never ran, which skipped the experts. In `phases/` the scripts are reached only through the commands. The commands, tests, memory topicals, rules, AGENTS.md, README and `docs/adding-an-expert.md` follow; `mirrors.test.js` now refuses a `workflows/` folder in the payload. Historical records keep the old path.
- **A run without skills is no longer silent.** Before, a missing `args.skills` consulted the experts with no skills and nothing said so, which made attribution meaningless. `plan` and `tests` now skip the experts and say why; `review` refuses to run.

### Changed

- `memory/workflows-authoring.md` records the two install-only gotchas (bare agent names, `workflows/` auto-registration).

## [4.0.0] - 2026-10-22

**Breaking, with the gates on:** a `git commit` is refused until the domain experts have reviewed the current changes (Gate G6, below), and a source edit until the plan records which experts apply. With the gates off, nothing that worked in 3.1 changes.

### Added

- **Domain experts that take part from the plan onward.** An expert is `agents/uw-expert-<name>.md` plus one reference per stage it joins; the plugin finds it by scanning the agents folder, so adding one edits no registry, router, workflow or command. A model is asked which experts apply at plan time and again on the real diff before a commit; code merges the answer so it can only add. Selected experts add constraints to the plan, cases to the tests, and review the diff against both. The first expert is security (`plan.md`, `tests.md`, `review.md`, plus a dependency audit script).
- **`/ultimate-workflow:experts`**, the quick check before a commit: re-ask, run the experts, record the evidence.
- **Gate G6** (opt-in, with the other gates): no source edit before the plan records which experts apply (`experts: []` counts), and no `git commit` until the experts have re-checked and reviewed the current changes. Evidence is tied to a fingerprint of the uncommitted changes, so any later edit makes it stale. A high-confidence expert finding keeps the commit refused until it is fixed or the user dismisses it with their reason (`experts.js resolve`). `status.js` reports the experts state.
- **A build stage for experts: a standing brief loaded on every build.** An expert that declares `build` ships `references/build.md` (at most 4 KB, not counting its Skills section, checked by the contract). `experts.js brief --plan` prints them with their skills, `commands/build.md` passes them to `build.js`, and the implementer gets them in the test-writing and implementing prompts whether or not the expert was selected at plan time. The brief says how to write and never what to build, and the plan wins on any disagreement. No expert runs as an agent at build, and nothing is recorded or gated for it.
- **Nine experts.** `architect` (plan, review: how services, queues, data stores and AWS resources fit together), `softarch` (plan, review: module boundaries and dependency direction), `developer` (plan, build, review: craft in new or rewritten production code; a finding names a concrete cost), `quality` (plan, tests, build, review: whether tests, evals and gates can fail; it always joins the tests stage, see below), `security` (plan, tests, review), `devops` (plan, build, review: see below), `frontend` (plan, tests, review: accessibility, real data, the web on phones, tablets and desktops, motion), `genai` (plan, tests, review: model calls, agent loops and tools, retrieval, Bedrock and AgentCore) and `data` (plan, tests, review: schema changes, queries, stores; its first skill is erasure and retention).
- **The developer expert combined with 22 upstream developer agents**: three new categories (change outside the task, a list that must be edited in step, a test that cannot fail) and five method rules. Remeasured on the held-out split of the general review corpus with its skills: saturated (17 of 18, 18 of 18, 18 of 18 runs for plain, upstream skill and expert), so no gain shown and no loss.
- **Expert evals** (`evals/experts/eval/`, `evals/experts/corpus/`): six frozen blind corpora (architect, softarch, developer, quality, a general `review` corpus and a generation corpus for the build brief) with hash pins, a runner that builds blind reviewer and judge tasks, a scorer with thresholds fixed before any run, gold sets for judge calibration, and recorded results. Deterministic parts are tested and mutation-checked; no model is called in CI.
- **Fifty shared expert skills, chosen in code and pasted into the prompt** (`experts/skills/<name>/skill.md` with a `NOTICE.md`). The architect uses eight (`lambda-event-sources`, `aws-messaging`, `step-functions`, `api-gateway`, `multi-tenancy`, `caching-and-latency`, `alarms-and-slos`, `aws-well-architected`); the developer thirteen (`engineering-principles`, `failure-handling`, `simplification`, `surgical-change`, `dependency-discipline`, `python-`, `typescript-`, `go-`, `rust-`, `java-` and `react-craft`, `telemetry-in-code`, `web-performance`); quality three (`test-craft`, `test-gates`, `eval-integrity`); security two (`ci-workflow-security`, `personal-data-exposure`); DevOps six; the software architect four; frontend nine; genai four; data one. The full table is `docs/expert-catalogue.md`. In two smoke runs an expert told to open the skill whose cue matched opened none, so a stage reference gives each skill a selector (`files:`, `added:` or `always`) and code chooses: from the diff at review (`experts.js prepare`), from the plan at build and tests (`experts.js brief --plan`, `experts.js skills --stage tests --plan`). At plan, where no code sees the draft, the call that chooses the experts must also name the skills it needs from an offered list. The lanes report `skillsLoaded`; at most 40 KB per expert per stage (56 KB for frontend and the developer, by decision), and what does not fit is reported. Each skill was built by comparing upstream agents and skills (ECC, anthropics, addyosmani, obra/superpowers, mattpocock, wshobson, trailofbits, vercel, agency-agents and others) and restating the parts that add a specific check. Details: `docs/adding-an-expert.md#shared-skills`. Measured only at review, on a saturated corpus.
- **`aws-well-architected`, the architect's skill**, built from a research pass on the AWS pages (2026-10-20): the Well-Architected best practices a change can show, each with its ID, what it looks like in Terraform, CloudFormation, SAM or CDK, and when it does not apply; plus verified facts with their source and date (NAT data processing, free gateway endpoints for S3 and DynamoDB, cross-zone charges, the DR tiers' RPO and RTO bands, SQS `MaximumConcurrency`, the Lambda 900-second limit, the dead-letter alarm). Selected by infrastructure file names or AWS code in the added lines (a selector may now join `files:` and `added:` with `; `), and offered at plan. The process and organisation practices, the Security pillar (the security expert's) and vendor headline figures are left out. The Generative AI Lens part of the research is kept in `docs/research/` for the Generative AI expert, which merges the catalogue's agent-system and AI/LLM entries. Not measured: the architect corpus is saturated, so infrastructure cases are needed.
- **The architect combined with 19 upstream architect agents, and two more skills.** Seven new review categories (a call cycle between services, a remote call per item, timeouts and pools that cannot fit, a write to two places with no way back, two versions during a rolling deploy, moving existing data without a check, replay with side effects), plan questions for the load numbers, blast radius, consistency and how existing data moves, and two skills: `lambda-event-sources` and `step-functions`, with each fact tagged by its source (AWS's developer guides as published on GitHub, the maintainer's live check, or AWS's 2026 toolkit marked unverified). Messaging semantics and multi-tenancy are deferred with research prompts. Details: `docs/experts/architect.md`. Not measured.
- **The architect's second research pass: four more skills.** After sweeping the whole catalogue, `aws-messaging` (SQS, SNS, EventBridge and Kinesis semantics), `api-gateway` (timeouts by API type, payload limits, the shared throttle, what HTTP APIs lack), `multi-tenancy` (the architect owns tenancy: isolation model, tenant context, enforcement where data is read, shared resources, noisy neighbours, lifecycle) and `caching-and-latency`, plus additions to `lambda-event-sources` and `step-functions` and three plan lines against over-building. Every AWS number checked against AWS's own developer guides as last published on GitHub; where a 2026 source differs, both are given. Not measured.
- **The DevOps engineer** (`devops`, plan, build, review): what an infrastructure change replaces or destroys (Terraform, CloudFormation, SAM, CDK), state, builds and deploys that cannot be repeated, promotion and deploy concurrency, migration order in the pipeline, rollbacks a change breaks, container signals and health, Kubernetes rollouts. Six skills: `terraform-change-safety`, `cloudformation-and-cdk`, `kubernetes-manifests`, `pipelines-and-deploys`, `release-safety`, `containers`; every number checked against the vendor's documentation as published on GitHub (GitHub, Docker, Kubernetes, HashiCorp, AWS CDK in 2026; CloudFormation as of 2023). Its build brief joins a build only when the plan names infrastructure, pipeline, container or manifest files or describes such a change: a build brief with no `always` skill is now conditional. CI workflow security stays with security, gates with quality, and the architect's Operability check was narrowed to rollback as a design question. Skill selectors now accept paths (`.github/workflows/*.yml`, `**/` across directories). Details: `docs/experts/devops.md`. Not measured.
- **The software architect combined with 20 upstream sources, and three skills** (`protobuf-compat`, `schema-evolution`, `module-boundaries`): which side a changed field is on, removal without deprecation, a published package without its version bump, two copies of a contract out of step, and a boundary rule loosened in the same change that crosses it. Every fact checked live by the maintainer before the skills were written (the playbook's new step 6b). Details: `docs/experts/softarch.md`. Not measured.
- **Byte budgets:** `experts/` without skills is now 60 KB of code plus 40 KB per expert; the skills library has no total budget (the 16 KB per-skill cap stays; the per-expert, per-stage cap was raised from 32 KB to 40 KB the same day, by decision).
- **`always: [tests]`** in an agent file: the expert joins the tests stage whether or not the plan selected it. The quality expert has it, because every test plan is about tests; `record --stage tests --plan` then writes it into the plan's `experts:` line, so the review and the commit check expect it too. The quality expert also gained a build brief for the agent that writes the tests.
- **The frontend and accessibility expert's skills** (2026-10-22): `semantics-and-aria`, `visual-accessibility`, `ui-on-real-data`, `responsive-and-devices`, `rtl-and-direction` and `motion` at review; `worst-case-data` at tests; and Emil Kowalski's design guidance as `motion-craft` and `interface-design`, offered at plan only and never a finding. The expert now owns the web on every device. Built from the maintainer's live checks of WCAG 2.2, MDN, the HTML and CSS specifications and the libraries' own pages (blocks G and K).
- **The generative AI expert's skills** (2026-10-22): `model-calls`, `agent-loops-and-tools`, `rag-retrieval`, `bedrock-and-agentcore`. Model-specific rows name the models the vendor page named on the day they were checked (block D).
- **Observability, web performance and privacy as skills under existing experts**, not new experts (maintainer decisions 2026-10-21): `alarms-and-slos` (architect), `telemetry-in-code` and `web-performance` (developer), `personal-data-exposure` (security), `erasure-and-retention` (data). Legal questions (lawful basis, consent, retention periods, transfers) are plan questions for a person, never findings.
- **The DevOps skills' second round** from the live check of block B: two shipped rows corrected (Helm's default hook delete policy; express-mode rollback), the confirmed missing items added, and the rows the value test cut removed.
- **docs/adding-an-expert.md** (the tested recipe, with the goal, the decision record of what was measured and what was only reasoned) and **docs/what-a-good-expert-looks-like.md** (how to judge and vet an expert).

- **Where a finding came from.** Every expert finding at review names its basis (`skill:<name>` with the row it rests on, `reference:<category>`, or `general`); `record` checks a skill basis against the skills loaded in that run and the skill's text, and `/ultimate-workflow:expert-attribution` (`experts.js attribution`) reports per expert the skills loaded at each stage, findings by basis, and skills loaded but never cited. Self-reported, so it shows what a finding claims; the A0, A2, A3 ablation shows what the skills add.

### Removed

- The path-keyword router (`experts/route.js`) and the hardcoded expert registry in `workflows/review.js`. Selection is a model's judgement with the list in front of it; the path router selected the security expert for 7 of 12 seeded cases, and the model for 12 of 12 (one expert, one run each, diff only).

### Measured, and what it shows

Against a plain reviewer, same model, blind judge (`evals/experts/results/README.md`):

- **Written corpora are saturated.** The developer found 6 of 6 seeded defects against 4 of 6 on its first held-out split; every later written set, the "hard" sets included, was found in full by the plain reviewer, even with Haiku as the reviewer. They cannot tell the arms apart.
- **Real defects, mined from fix commits** (`developer-real`, 8 cases): the expert found the same 4 as the plain reviewer and raised 3 false positives in 18 benign runs against 0. On real code its rules have so far added noise, not catches.
- Selection: a model picked the security expert for 12 of 12 seeded diffs and 5 of 6 harmless look-alikes.
- Not measured: devops, frontend, genai, data, and every skill written on 2026-10-22.

### Known gaps

- Selection by a model has been measured once, on one expert. The gate has not been exercised in a real Claude Code session: hook firing on `Bash`, and whether the model follows the command text, are untested there. Overlap between experts and the core reviewers, and between the architect and softarch experts and the explorer and critic agents, is undecided. Skills at build, tests and plan, and expert input at plan and tests, are unmeasured. There is no total cap on what all build briefs and their skills add to a build (about 28 KB today).
- Gate G6 has been tested by its unit and contract tests only; its first real Claude Code session is still to come.
- Facts still being checked: block F (the data expert's other skills wait on it) and prompt L (rows in shipped skills that rest on a community source or our own reasoning). Rows not yet checked are tagged [T] or [O] in each skill and are prompts to check, not findings on their own.

## [3.1.0] - 2026-10-06

### Added

- **Five architecture skills**: `system-architect-engineering-guidelines`, `greenfield-architecture-guidelines`, `modularity-and-evolution-guidelines`, `distributed-systems-resilience-guidelines` and `operability-guidelines`. Language-agnostic design guidance loaded by description, with an ADR template, a smell-to-pattern reference and quality-attribute scenarios.
- **Cross-references:** the workflow skill's plan step and the bootstrap skill's Phase 2 now point to the matching architecture skills, so they are reachable from the process skills and not only by description match. The README and the walkthrough page list them, and a test fails if the page misses a skill.
- **Eval suites** for them as one 42-case suite under `architecture-evals/` (tags `quality`, `trigger`, `hard`; excluded from the release ZIP, which stays at about 160 KB), with recorded results at `evals/results/architecture-skills/`. Fire rate on held-out prompts rose from 53% to 100% after rewriting the descriptions; answer quality over a no-skill baseline is small (+0.09 on the quality suite, -0.03 on the hard probes). A pre-registered rule said to fold three of the skills; the maintainer kept them and the decision is recorded.

### Known gaps

- The architecture claims in the skills were written from recall and cross-read against a Gemini fact-check that rests partly on secondary sources; see `research/architecture-claims-check.md`. No Cursor `.mdc` twin exists for the new skills.

## [3.0.2] - 2026-08-30

### Fixed

- **Three references inside the shipped payload were dead for installed users.** All of them resolved from the repo root, so nobody working in the repo could see them — the only reader affected was the one who could not report it. `memory.md` linked a research summary that is deliberately not shipped (the entry already said so in prose, and now stops contradicting itself with a hyperlink); `memory/context-boundary.md` pointed at a `memory-protocol.md` path the v3.0.1 restructure invalidated; and `memory-protocol.md` named `references/memory-template.md` while sitting inside `references/` itself.
- **Three root-doc paths left behind by the restructure**, two of them in the always-on `AGENTS.md` and one in `docs/gates.md`, which told a reader to run `hooks/dev/record.js` at a path that no longer exists.

### Added

- **`mirrors.test.js` guard: no shipped file may reference a path that does not resolve inside the payload.** This is the class the v3.0.1 restructure created, and nothing caught it.

  The first version of the guard only flagged paths that still resolved at the repo root, on the theory that those were the move's leftovers. Reintroducing a real defect left it green — two of the three findings pointed at paths resolving under no root at all. A guard that passes against the bug it was written for is worse than none, because it certifies what it cannot see. Broadened, then mutation-tested against each finding.

  It carries three filters, each with its reasoning recorded: placeholders (`memory/<topic>.md`), template examples a skill tells the *user* to create (`memory/auth.md`), and leading-dot directories. That last one matters — `.ultimate-workflow/heartbeat.json` resolved here only because this repo has a heartbeat file from dogfooding, the kind of coincidence that turns a check into a liar.

## [3.0.1] - 2026-08-29

### Fixed

- **Cursor `/add-plugin` delivered an empty plugin.** Marketplace clones use a sparse-checkout that only keeps `/.cursor-plugin/` and `/.claude-plugin/`, so root-level `rules/`, `agents/`, `skills/`, and `commands/` never landed on disk. The shippable tree now lives at `.cursor-plugin/ultimate-workflow/`; both marketplaces use a relative `source` pointing there; the release ZIP is built from that directory. Documented in `memory/cursor-install.md`. **Reinstall** the plugin on both Claude Code and Cursor after pulling this change.
- **`commands/tests.md` frontmatter** — unquoted `:` in the description broke Claude's YAML parser (`claude plugin validate`), so the command loaded with empty metadata.

### Changed

- Verify command and CI globs: `".cursor-plugin/ultimate-workflow/hooks/**/*.test.js"`.
- `mirrors.test.js` asserts Cursor sparse-cone inclusion and simulated ZIP membership for the nested payload.

## [3.0.0] - 2026-08-28

The gates in this release were built to answer "the model ignores the workflow"
with enforcement: five lifecycle hooks that block a bad edit. They were never
published on their own -- measuring them changed the answer before they shipped,
so they arrive here already demoted to a backstop.

Seven of the nine defects found in that work were in the vendor wire surface, not
the logic -- a UTF-8 BOM that makes payload parsing throw, absolute paths defeating
test-file detection, `workspace_roots` where `cwd` was expected -- and each failed
*open and silently*. Three separate routes led to "installed, enforcing nothing,
looking identical to working". A mechanism with that failure mode should not be on
by default.

The alternative turned out to be structural rather than defensive. **If each phase
is its own invocation with its own fresh context and its own tools, ordering is not
policed -- a phase you have not started cannot be skipped.** That is what this
release is.

### BREAKING

- **Gates are opt-in.** Set `ULTIMATE_WORKFLOW_GATES=on` to enable them. Absent or any other value means off. Anyone relying on gates firing by
  default must set this, or they will silently get nothing -- which is exactly the
  failure mode being fixed, so it is called out here rather than buried.


- **`CLAUDE.md` is a thin index**, 240 lines to 49. 1220 of its 2769 words were
  byte-identical to `SKILL.md`. If you copied it into your own project, the
  standalone artifact is now `skills/the-ultimate-workflow-guidelines/SKILL.md` --
  the `curl` line in the README points there.

- **The plugin is renamed from `the-ultimate-workflow-guidelines` to `ultimate-workflow`.** The plugin name namespaces every component it ships, so commands and skills are now `ultimate-workflow:<name>` instead of `the-ultimate-workflow-guidelines:<name>`. Reinstall once:

  ```
  /plugin uninstall the-ultimate-workflow-guidelines
  /plugin install ultimate-workflow
  ```

  The repository, the marketplace entry, and the GitHub URL are unchanged, so `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` still works. Done now because the old name already produced `the-ultimate-workflow-guidelines:the-ultimate-workflow-guidelines` in the skill list, and the workflows planned for v3.0.0 would have made it worse.

- **Workflow gates are on by default.** Five lifecycle hooks now enforce the workflow rather than describing it: no source edit before a confirmed plan, no implementation before confirmed tests, no turn completion while code is unverified, a hard cap of three failing verify rounds, and a per-prompt stage pointer. They are inert in any repository without a `PRD.md` or `PLAN-*.md`, and `ULTIMATE_WORKFLOW_GATES=off` disables them entirely. They fail open: any internal error exits 0 and blocks nothing.

### Added

- **Five phase commands** -- `/ultimate-workflow:plan`, `:tests`, `:build`,
  `:review`, `:harvest`. Each runs in a fresh context, does one job, and stops.
  **Only `build` can write**; the other four return proposals you apply, which is
  deliberate -- a proposal you have to accept is a proposal you actually read.
- **Five scoped agent definitions** under `agents/`. Tool restriction is subtraction,
  and it is a hard refusal that also covers the deferred tool registry -- verified,
  not assumed. Four carry Cursor's `readonly: true` as well; `uw-implementer` carries
  neither and is the only writer. `mirrors.test.js` asserts that invariant.
- **`evals/`** -- a trajectory scorer plus eight context-boundary fixtures. The gap
  named by Google's Day 1 paper: tests cover deterministic behaviour, nothing covered
  trajectory or tool choice, and without both the practice is vibe coding regardless
  of how good the prompts read. `evals/results/README.md` records what the recorded
  runs do and do not support -- at length, because the headline number flatters this
  change more than the evidence does.
- **`memory/`** -- four topicals loaded on cue: `context-boundary`, `hooks-and-gates`,
  `workflows-authoring`, `mirrors`.
- **`mirrors.test.js`** -- heading parity, line caps, and command-surface coverage
  across the hand-copied files. A documented divergence list with no check is a
  comment, not a control, which is how the drift it now catches happened.
- **`research/`** -- Google's May 2026 paper on agentic engineering, with a summary.

### Removed

- **The two no-emoji hooks are gone**, along with their registrations. `hooks/hooks.json` now registers `gate.js` and nothing else, and `ALLOW_EMOJIS=1` no longer does anything. Nothing blocks a write containing emoji any more.

  The rule survives as a standing instruction, once per host, in `CLAUDE.md` and the Cursor always-on rule — and narrowed from "no emojis anywhere" to **"no emojis in code"**. Code is where the breakage is: a terminal rendering a source file, a pipeline parsing output. Prose was never the problem, and the blanket version had the project enforcing against its own public page, which carries four principle icons by design.

  If you relied on the hook to keep emoji out of files, it is no longer there.

### Changed

- **Context is split by cue, not by length.** The rule: *keep what has no cue, move
  what has a cue.* Retrieval fails when the trigger is an absence, so a hard
  constraint nothing prompts you to look up stays always-on. Cursor's
  `alwaysApply: false` rules are the direct analogue of `memory/` and got the same
  treatment.
- **Cursor gets the workflow as prompts, and the rule file says what that costs.**
  Cursor has subagents but no scriptable orchestrator, so the phases are invocations
  you sequence, the round cap is a number you honour rather than a counter, and
  ordering is advisory. It keeps fresh context per phase, one narrow job per agent,
  and the artifact on disk. Stated per layer instead of implying parity.
- **`hooks/status.js`** distinguishes never-ran / live / stale / disabled. Every gate
  writes a heartbeat, because a hook that never loaded, a hook that crashed, and a
  hook that correctly allowed everything are otherwise indistinguishable.

### Fixed

- `coerce()` now unescapes what `format()` escaped. A double-quoted value had its
  backslashes doubled on every write, corrupting a Windows `test_command` a little
  more each time the gates touched the file -- and they touched it on every edit.
- Tool paths are relativised against `cwd` before classification. Matching the raw
  absolute path silently disabled the tests-first gate for any project under a
  directory named `test`, and judged scratchpad edits elsewhere on disk against this
  repository's plan. Invisible to a green 52-test suite, because those tests used
  relative paths.
- The Stop gate fails open when no verify command is configured. The shipped template
  carried `test_command: ""`, which made that gate permanently unsatisfiable.
- `hookEventName` is echoed from the payload rather than hardcoded, so the escalation
  is not silently discarded by the host.
- `looksLikeShellWrite` is deleted. It matched heredocs, arrow functions, and
  `2>/dev/null` -- so every `git commit -F -` looked like a source write.
- `progress-template.md` shipped a date regex with its backslashes eaten, and a
  literal `YYYY-MM-DD` placeholder that left a bootstrapped project permanently
  un-handed-off.

### Known limitations

- **Fan-out costs real money.** Measured on this repository: `/harvest` 158k tokens,
  `/review` 460k, `/plan` 481k. Roughly a million tokens for a feature before
  implementation starts. Weigh that against what they find -- `/review` located four
  real defects in code with 136 green tests -- and treat them as once-per-feature.
- **The eval baseline is one run per cell across eight fixtures.** It supports "no
  detected regression" and nothing stronger. Three of the four pre-restructure
  failures are files that did not exist yet, and most pass conditions were authored
  after one arm's output was visible. Written down in `evals/results/README.md`
  rather than left for a reader to discover.
- **Gates remain Claude Code only.** On Cursor 3.17.19 a pre-edit `deny` is honoured
  for reads and ignored for writes: the file is created and the next event reports
  success, so the model is never told it was blocked. The Codex and Gemini contracts
  are documented and look nearly identical to Claude Code's, but neither has been
  exercised against a real payload. Every defect on the hosts that *were* exercised
  was invisible in documentation. Until someone records payloads with
  `hooks/dev/record.js`, those hosts get prose.

## [2.6.0] - 2026-08-15

### Added
- **`/handoff` command** (`commands/handoff.md`) — writes a session handoff document so a fresh agent can pick up in-flight work. Produces `HANDOFF-<topic>.md` covering purpose/background, tools and how to run them, policies and schemas, a **suggested skills** section, current state, open issues, and candidate next steps. It references existing artifacts (`PLAN-<feature>.md`, `PRD.md`, `progress.md`, commits, PRs) by path rather than restating them, briefs the next agent without ordering it to start work, redacts secrets and PII, and takes an optional argument scoping the doc to the next session's focus. `disable-model-invocation: true` keeps it user-triggered only.
  - `commands/` lives at the plugin root, which both [Claude Code](https://code.claude.com/docs/en/plugins-reference) and Cursor auto-discover — one file serves both hosts. Included in the full-plugin ZIP; not in the per-skill ZIPs, since a command is a plugin-level component.
  - Wired into both skills (and their `rules/*.mdc` + root `AGENTS.md` mirrors): the workflow skill gains **step 7, "Hand off at end of session"**, and the bootstrap skill's **Phase 4** covers sessions that end before bootstrap completes. Both note the by-hand fallback for single-skill installs.
  - Affected files: new `commands/handoff.md`; `skills/the-ultimate-workflow-guidelines/SKILL.md`, `skills/project-bootstrap-guidelines/SKILL.md`, `rules/the-ultimate-workflow-guidelines.mdc`, `rules/project-bootstrap-guidelines.mdc`, `AGENTS.md`, `README.md`.

### Changed
- **Cross-tool root files: `AGENTS.md` (content) + thin `CLAUDE.md` import stub.** The bootstrap skill now produces `AGENTS.md` at the project root, plus a two-line `CLAUDE.md` containing just `@AGENTS.md`. Cursor reads `AGENTS.md` natively (per [Cursor docs](https://cursor.com/docs/rules)); Claude Code reads `CLAUDE.md` only and pulls the same content in via its `@`-import syntax (per [Claude Code memory docs](https://code.claude.com/docs/en/memory)). One source of truth, no drift. Affected files: bootstrap `SKILL.md`, both `rules/*.mdc`, workflow `SKILL.md`, root `AGENTS.md` (renamed from the old `CLAUDE.md`), new minimal root `CLAUDE.md`, template renamed to `references/agents-md-template.md`, memory/progress templates, root `memory.md`, `README.md`, and the now-removed `CURSOR.md` (folded into README). **Migration for existing users:** projects bootstrapped before this release have a `CLAUDE.md` with full content at root. Rename it to `AGENTS.md` (`git mv CLAUDE.md AGENTS.md`), then create a new two-line `CLAUDE.md` containing only `@AGENTS.md`. Cursor will pick up `AGENTS.md` immediately; Claude Code will import it via the stub.
- **Principles & Workflow — partner-mindset and anti-fake-success additions**, mirrored across `SKILL.md`, `AGENTS.md`, and `rules/the-ultimate-workflow-guidelines.mdc`:
  - **Think Before Coding** now includes "truth over agreement" — don't reflexively affirm the user's framing; name gaps in their reasoning.
  - **Goal-Driven Execution** gains a "Don't fake success" paragraph — no silent fallbacks, swallowed errors, or skipped assertions when the task can't actually be accomplished; stop and surface via the host's ask-user tool.
  - **How to stop and ask** gains two counter-balances: don't bog down on trivial reversible decisions (decide, flag, move on), and treat user rejection/skip of a tool call as a signal to ask why before retrying.
  - **Workflow step 2** explicitly favors concision over polish in `PLAN-<feature>.md` ("sacrifice grammar for density if it helps").
  - **Workflow step 5 (blocker protocol)** adds "reconsider applicable guidance" — re-scan `memory.md` and project rules/`AGENTS.md` for entries that match the new direction before resuming.

## [2.3.2] - 2026-04-29

### Fixed
- `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` followed by install would not register the plugin. Two root causes:
  - `marketplace.json` plugin entry used `source: "./"` (the marketplace's own root), which is not a supported source shape per the [Claude Code marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces#plugin-sources). Switched to the `github` source shape (`{"source":"github","repo":"ValeroK/the-ultimate-workflow-guidelines"}`).
  - `plugin.json` had a `skills` array pointing at individual skill directories. Per the [plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), `skills` must point at a parent directory. Removed the field — the default auto-discovery from `skills/<name>/SKILL.md` already finds both skills.

### Removed
- Unused `id` top-level field from `marketplace.json` (not in the documented schema).

## [2.3.1] - 2026-04-29

### Added
- `CHANGELOG.md` (this file).
- `.github/workflows/validate.yml` — PR-time JSON-syntax check on all three manifests and a version-consistency assertion across the four version slots.

### Fixed
- Reconciled drift between `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, and `.claude-plugin/marketplace.json`: identical `description` and `keywords` everywhere, and `homepage` + `repository` now present in the Claude manifest (previously only in the Cursor one).

### Changed
- `memory.md` placeholder comment collapsed from a six-line example block to a one-line pointer to the entry-shape template.

## [2.3.0] - 2026-04-29

### Added
- `memory.md` slim-index + lazy topical-file pattern, with template under `skills/the-ultimate-workflow-guidelines/references/memory-template.md`. Topical knowledge ("how X works", "why we picked Y") lives in `memory/<topic>.md` and is read on demand when the task touches the topic. Defensive one-liners ("beware X") still go to `CLAUDE.md` `## Gotchas`.
- Dual Claude + Cursor plugin ZIP as a release asset (`the-ultimate-workflow-guidelines-plugin.zip`) — same archive installs into both ecosystems.

### Changed
- `README.md` and the project-explainer copy rewritten to cover the slim-index + lazy-load memory pattern and clarify the Gotchas vs Memory distinction.

## [2.2.0] - 2026-04-24

### Added
- `LICENSE` file (MIT-with-Attribution) and `.gitignore`.
- Claude Desktop install path via release ZIPs.

### Changed
- Switched license declaration to MIT-with-Attribution (`LicenseRef-MIT-Attribution`) across `plugin.json` and SKILL.md frontmatter.

### Removed
- Unreferenced `EXAMPLES.md`.

## [2.1.1] - earlier

### Removed
- Multica promo and X link from README header.

## [2.1.0] - earlier

### Added
- Initial dual-ecosystem layout (Cursor rules under `rules/`, Agent Skills under `skills/`).
- README and `CURSOR.md` install instructions for both ecosystems.

### Changed
- Rebranded to `the-ultimate-workflow-guidelines`.
- Added the explicit Workflow section (plan-first, test-first, blocker protocol) and the sibling `project-bootstrap-guidelines` skill.

## Earlier history

For commits prior to `v2.1.0`, see `git log`. Highlights include the original Cursor-plugin migration, the marketplace manifest, and the first round of plugin-structure fixes.

[3.0.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v3.0.1
[3.0.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v3.0.0
[2.6.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.6.0
[2.3.2]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.2
[2.3.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.1
[2.3.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.0
[2.2.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.2.0
[2.1.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.1
[2.1.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.0
