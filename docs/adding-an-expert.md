# Adding a domain expert

> A recipe for adding a domain expert (security, architecture, UI/UX, DevOps and so on) to the `ultimate-workflow` plugin, and for finding out whether it earns its place.
> Written 2026-10-19 from adding the first one, the security expert, and rewritten the same day after the design was simplified. The recipe is tested: `evals/experts/cookbook.test.js` follows it mechanically, and `evals/experts/lib/contract.js` fails when an expert is added half-way and says what is missing.


This file is the reference for the mechanics. The order of work for building an expert and its skills, from sources to measurement, is `docs/expert-playbook.md`.

## Goal, and what is not the goal

**Goal.** Adding a domain expert should cost one agent file, one reference file per stage it joins, and one examples file. Nothing else is edited. No registry, no router, no workflow, no command, no gate. The expert is then offered to the model at the right moments, runs at the stages it declared, and leaves evidence that a commit gate can check.

**Not the goal.**

- To prove that an expert beats a plain reviewer. We measured that once, on textbook cases, and could not tell them apart (see the decision record). The recipe makes experts cheap to add and to measure; it does not promise they are better.
- To make selection deterministic. Which experts apply is a model's judgement, asked twice. Code makes the asking certain and the answer add-only; it cannot make the answer right.
- To give experts the ability to write code. They advise at plan and test time and review at the end. The implementer writes. A build-stage brief is guidance passed to the implementer, not an expert writing.
- To enforce on every host. The gates run on Claude Code. Elsewhere the same flow runs as written instructions and depends on the model following them.

## What an expert is here

An expert is **not a persona**. "You are a senior security engineer" adds almost nothing for a model that already knows the domain. It is four things a generic reviewer lacks:

1. **A vetted reference per stage**, loaded only at that stage, that calibrates what to ask for, what to test and what to report.
2. **A fixed output contract** per stage: plan input with checkable constraints (at most six), test cases with a stated outcome (at most eight), review findings with an evidence path and a defined "no findings" result.
3. **Declared tools**: read, grep and glob by default. Anything beyond that is a decision recorded in `DECLARED_TOOLS` in `evals/experts/lib/contract.js`, where a reviewer sees it.
4. **A description that says when it applies.** The model reads it, next to the other experts' descriptions, to decide whether to bring the expert in.

## How the flow uses an expert

```
 /plan      draft the plan
            ask (model): "which of these experts apply, and which of their offered
            skills does this draft need?"           <- both lists are found in code
            each selected expert with a plan stage gets its chosen skills pasted in and
            adds constraints, risks, questions
            the input is written into the plan under "Expert input"; you confirm the plan
 /tests     the plan's experts with a tests stage, plus any marked always: [tests]
            (quality), add cases; each gets the skills code chose from the plan
            you confirm the tests
 /build     the implementer is told the Expert input is binding. Experts do not write code.
            every expert that declares a build stage gives the implementer a short standing
            brief, on every build, selected or not, plus the skills code chose from the plan.
            A brief whose build.md lists no `always` skill (devops) joins only when the plan
            selects one of its skills. It says how to write, never what to build.
 commit     with the gates on (the default, G6): no source edit until the plan records which
            experts apply (experts: [] counts), and no commit until
            /ultimate-workflow:experts (or /review) has run:
            ask again (model) against the real diff; the answer can only ADD experts
            every selected expert with a review stage, plus quality whenever a test file
            changed (review-when-skills), gets the skills code chose from the
            diff and reviews it, also against what it required at planning time
            evidence is recorded against a fingerprint of the changes; any later change
            makes it stale
            a high-confidence finding stays OPEN until it is resolved: fixed (the next
            review no longer reports it) or dismissed by the user, with their reason.
            The commit gate refuses while one is open.
```

**Raised, then resolved.** A finding is high-confidence when the expert rates it so, and it counts as open when the skeptic confirmed it or never ruled on it. The agent must tell the user about each open finding and wait for a decision. It cannot dismiss one itself: the gate's message says so, and the dismissal (`experts.js resolve --id ... --reason ...`) keeps the reason it was given. That the agent obeys is a rule in the command, not something the gate can check; the gate can only check that a dismissal exists. Findings below high confidence are reported and do not block.

Everything that decides is code: what experts exist (the agents folder is scanned), that the answer only adds, that unknown names are dropped, that an expert ran (an evidence file exists), that the evidence matches the current changes. Everything that judges is a model.

An expert added at the commit check was never consulted at planning. It reviews, and its output says it was not consulted at the plan stage. That is the cost of a late catch, and the reason the first question is asked at plan time.

## Shared skills

A skill is knowledge an expert needs only when the change calls for it: a principles reference, a failure-handling checklist, a language's idioms, how to write a test. It is not an expert and is never selected on its own. It is also not the same thing as the payload's `skills/` folder: those are `SKILL.md` guideline skills the host loads by itself; these are `skill.md` files that code pastes into an expert's prompt.

**Where.** `.cursor-plugin/ultimate-workflow/experts/skills/<name>/skill.md`, with a `NOTICE.md` beside it. The file is `skill.md`, not `SKILL.md`, so no host loads it on every turn. At most 16 KB. It opens with frontmatter that code reads and never pastes:

```
---
name: go-craft
description: What the skill holds and when it applies. It is the plan-stage headline a model chooses by.
---
```

**How an expert names a skill.** In one file, `experts/<name>/skills.md`, which only code reads: a `## <stage>` section per stage (`plan`, `tests`, `build`, `review`), one skill per line, in priority order:

```
## review

- go-craft (files: *.go, go.mod)
- failure-handling (added: \bcatch\b|except)
- surgical-change (always)
```

No reference lists skills; the contract refuses one that does, so a selector has one home.

The part in parentheses is the selector: `files:` globs, `added:` a regular expression, or `always`. A glob without a `/` matches the file's base name at any depth (`*.tf`); one with a `/` matches the whole path from the repository root, with `*` inside one directory and `**/` across any number (`.github/workflows/*.yml`, `**/templates/*.yaml`). Join a `files:` and an `added:` part with `; ` to match when either does, as the architect does for AWS infrastructure: `(files: *.tf, template.yaml; added: AWS::|boto3)`. At plan a line is the skill's name alone: the model chooses by the skill's `description`.

**Who chooses: code, not the expert.** In two smoke runs an expert told to "read the skill whose cue matches" opened none. So the choice is made before the agent runs and the text is pasted into its prompt:

| Stage | Chosen by | Matched against | Lane fields |
|---|---|---|---|
| review | `experts.js prepare` | the saved diff: changed file names and added lines (read with fixed `a/` `b/` prefixes, so any range and any git config work) | `skillsLoaded`, `skillsDropped` (kept in the evidence) |
| build | `experts.js brief --plan <plan>` | file names the plan mentions (in backticks, or with a slash) and the plan's text | `skillsLoaded` |
| tests | `experts.js skills --stage tests --plan <plan>` | the same as build | `skillsLoaded` |
| plan | a model: the call that chooses the experts must also name the skills the draft needs, from the list `experts.js skills --stage plan` prints | the draft, by the model | `skillsLoaded`, `skillReasons`, `ignoredSkills` |

Plan is the one stage without a code floor: the draft exists only inside the workflow script. A model can still miss a skill there; what it cannot do is pick one that is not on offer.

**Cost.** At most 40 KB of skills per expert per stage (raised from 32 KB on 2026-10-20), and 56 KB for frontend, whose six review skills reach about 53 KB together, held under the cap by a test, and for the developer, whose React-with-a-catch worst case reached about 45 KB once `web-performance` and `telemetry-in-code` were added (decision 2026-10-22) (`SKILLS_BYTES_BY_EXPERT`, decision 2026-10-22); what does not fit is named, never silently dropped. At review each expert keeps at most its first two matching skills, in `skills.md` order (`REVIEW_SKILLS_MAX`, decision 2026-10-29: on the CEO dashboard run 15 of 16 review skills went uncited on two cards, and a planted-defect ablation showed no difference with or without skills); the rest are named in `skillProblems`. There is no total across experts (a decision, revisit when a third expert declares `build`). An `always` skill is paid on every run of that stage: today every build carries the developer's three `always` skills, `test-craft` and both briefs, about 28 KB before any file-matched skill.

**Adding a skill.** Write `skill.md` (a `# ` title, nothing that tells a reader to fetch, install or visit) and `NOTICE.md` (where the ideas came from, with licences). Name it in at least one stage reference with a selector. Prefer `files:` or `added:`; use `always` only for a skill no file name or line can signal, because it is paid every time.

**What the contract checks.** Every named skill exists; every mention has a cue ("when") on its line; in `review.md`, `build.md` and `tests.md` every skill line has a selector that parses; every skill is named by at least one expert, has a `NOTICE.md`, is at most 16 KB, opens with a `# ` title and fetches nothing. Byte budgets: 60 KB per expert, and for `experts/` without skills 60 KB of code plus 40 KB per expert. The skills library has no total budget; the per-skill and per-stage caps bound it.

**What it holds.** What the expert cannot say in one line of its checklist: exact meanings, counter-cases, language forms, how to write the thing well. A skill never adds a category of its own; the expert's checklist decides what is reported.

**In the eval harness.** The expert arm uses the same selection per case. A batch reviews several cases in one prompt, so it carries the union of their skills: about 35 KB on the `review` held-out split, more than any single case there (25 KB).

**Which expert uses which skill** is listed in `docs/expert-catalogue.md`.

## Before you start: do you need an expert at all?

**An expert is the default, a plain lens is the cheap baseline.** `review` still accepts `--lenses <domain>`, which runs a generic reviewer through that one lens. In our only measurement (6 cases, one run each) a plain "find any defects" prompt, the generic security lens, Anthropic's own security-review prompt and the security expert all found every planted vulnerability. The cases were textbook, so the test could not separate them. What an expert adds that a lens cannot is **participation before the code exists**: constraints in the plan, cases in the tests, and a review that holds the code to them. If your domain only ever matters at review time on textbook problems, a lens is enough.

An expert earns its place where you can name something a lens cannot give:

- a requirement that must shape the plan (an accessibility rule, an architecture boundary);
- cases the tests would otherwise miss (abuse cases, visual states);
- noise a checklist's "do not report" list would cut;
- a decision that needs input a model cannot give (versions, advisories, anything from the network), supplied by a script.

**Does it need more than Read, Grep and Glob?** A browser for screenshots (UI/UX), a shell, the network. **Stop.** (The five shipped experts have web search and fetch at plan and review, and security has read-only shell commands, each by a recorded maintainer decision in `DECLARED_TOOLS`.) That is a different decision: widening an expert's tools changes what an untrusted diff can make it do. It needs a threat discussion first. Only then add an entry for it to `DECLARED_TOOLS` in `evals/experts/lib/contract.js`; it is a reviewed edit, never a quiet change to the agent file. Anything that must be *exactly right* and needs the network (like the dependency audit) belongs in a script that the command runs, whose output the expert receives.

**Where does the knowledge come from?** Write it yourself, or vendor third-party content. If you vendor, read "Vendoring third-party content" below before copying anything.

## The recipe

Paths under `agents/`, `experts/` and `phases/` are relative to `.cursor-plugin/ultimate-workflow/`.

| # | File | What you do |
|---|---|---|
| 1 | `agents/uw-expert-<name>.md` | Create from the `agent` template. `<name>` is one lowercase word. Write the `description` so that a model can tell when the expert applies, and set `stages` to the stages it joins. Add `always: [tests]` only if the expert should join the tests stage whether or not it was selected (today only `quality`, because every test plan is about tests). Add `review-when-skills: [<skill>, ...]` only if the expert should join review whenever the diff selects one of those review skills, selected or not (today only `quality`, with `test-craft`: a changed test). Name only skills in the review section of its `skills.md`; `list` reports anything else as a problem. |
| 2 | `experts/<name>/references/<stage>.md` | One file per stage you declared, from the `plan-reference`, `tests-reference` and `review-reference` templates. Replace every `FILL-IN:` note. Add further files for material only some work needs, and name each in the agent file with an "only if" condition. |
| 2b | `experts/<name>/references/build.md` | Optional. Only if the domain should shape the code as it is written, on every build, not only when the expert is chosen at plan time. If the brief is for some changes only (the DevOps brief is for infrastructure, pipelines and containers), list no `always` skill for it under `## build` in `experts/<name>/skills.md`: the brief then joins a build only when the plan selects one of its skills. A short brief from the `build-reference` template, at most 4 KB, written as "when this, do that" rules including when not to add structure. Add `build` to `stages`. Nothing else is edited. |
| 3 | `evals/experts/examples/<name>.json` | From the `examples` template: at least three situations where the expert applies and three where it does not. |
| 4 | `experts/<name>/NOTICE.md` | Only if any content is adapted from a third party: the licence text and a pointer to `references/CHANGES.md`. |

Then run the one command that checks everything:

```
node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
```

Quote it exactly. Without the quotes the shell expands the globs and skips files; without `mirrors.test.js` the mirror checks are skipped and CI fails where your laptop passed. `evals/experts/contract.test.js` runs the contract over every expert it discovers and prints, per expert, what is missing. **Read its messages; they are the instructions for the rest.**

Nothing else needs editing. The plan, tests and review phases, the expert check before a commit and the gate all read the same discovered list from `experts/experts.js`, so the new expert is offered, consulted and checked at once. To see what the plugin discovers: `node .cursor-plugin/ultimate-workflow/experts/experts.js list`.

The one exception is an expert that needs a script run before the model, as security does with the dependency audit. That script and one line in `commands/review.md` that runs it are part of that expert's work. Do not build a generic mechanism for it until a second expert needs one.

## Templates

These blocks are machine-checked: the tests instantiate them. Placeholders are `{{name}}` (one lowercase word), `{{domain}}` (one word or hyphenated word) and `{{Domain}}` (the same, capitalised).

```text template:agent
---
name: uw-expert-{{name}}
description: {{Domain}} expert. Applies when FILL-IN: three to six concrete kinds of change or plan, named the way they appear in a diff or a request. Not for: FILL-IN (owner), FILL-IN (owner).
stages: [plan, tests, review]
tools: Read, Grep, Glob
readonly: true
---

# {{Domain}} expert

## Goal

- **Prevents:** FILL-IN: the failure this expert exists to stop, as an outcome (lost data, a broken caller, a release that cannot be undone), not a topic.
- **Done well:** FILL-IN: one sentence someone else could check, such as "every finding names what the change will do when it runs, and where it starts".
- **Not the goal:** FILL-IN: two or three things it must not chase (practices the repository does not use, style, theoretical scale).

## Responsibilities

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| FILL-IN | FILL-IN, the question it answers | FILL-IN (architect) | FILL-IN, how to tell which side an item falls on |
| FILL-IN | FILL-IN | FILL-IN (security) | FILL-IN |

## How to judge

- FILL-IN: a rule that holds at every stage in this domain, such as "calibrate to the stated criticality, and state what you assumed".
- FILL-IN: a second, such as "follow how this repository already does it before any reference design".

## What to read

1. `experts/protocol.md`, the rules every expert follows, if it is not already in your prompt.
2. Your stage's reference:
   - At the **plan** stage: `experts/{{name}}/references/plan.md`.
   - At the **tests** stage: `experts/{{name}}/references/tests.md`.
   - At the **build** stage you are not run: `experts/{{name}}/references/build.md` is a brief the implementer gets while it writes.
   - At the **review** stage: `experts/{{name}}/references/review.md`.
3. The skills the workflow pasted into your prompt. Do not open other skill files.

You can read and search the repository. You have no shell: you cannot run anything, and you change nothing.
```

```text template:plan-reference
# {{Domain}} input to a plan

**Outcome of this stage:** FILL-IN: one sentence, such as "the plan states what the change will do to existing data, so the build is held to it".

## Questions

Read the draft, then the code it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **FILL-IN short name.** FILL-IN: what the plan must state, and what in the repository tells you the answer.
- **FILL-IN short name.** FILL-IN.

## When the plan makes a one-way choice

For a choice that is costly to reverse (a new store, a wire format, a contract others depend on), the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: FILL-IN: one that names the file, resource or setting, and that someone else can check in the diff.
- Rejected: FILL-IN, and why, such as "use best practices" (not checkable) or "add a cache layer" (heavier than the workload needs).

## In this domain

- **constraints** FILL-IN: what makes one here (it names the module, resource, job or contract).
- **questions** FILL-IN: the decisions that are the user's here.
```

```text template:tests-reference
# {{Domain}} cases for a test plan

**Outcome of this stage:** every constraint this expert required at plan has a test that fails if the constraint is not met.

## Where to start

Your own constraints in the plan's "Expert input" section, then the draft tests and the code they run against.

## Families of cases

Only for what the change touches.

- **FILL-IN.** FILL-IN: what kind of case, and the failure it catches.
- **FILL-IN.** FILL-IN.

## One worked case

- name: FILL-IN
- asserts: FILL-IN: the input and the exact outcome.
- why: FILL-IN: the wrong implementation it catches.

## Redundant here

FILL-IN: what makes a case not worth adding in this domain (the draft has it, a type or a linter guarantees it).
```

```text template:build-reference
# {{Domain}} brief

It adds no work: if the plan does not ask for something, do not build it. Where this brief and the plan disagree, the plan wins.

This applies FILL-IN: to every line you write, or when the change writes a given kind of file.

## Before you write

- FILL-IN: what to find in the repository first.

## While you write

- FILL-IN: a rule written as "when this, do that", checkable in the code produced.

## When not to

- FILL-IN: where this domain's usual advice is wrong, so the brief cannot push the implementer into over-doing it.

## When you report

- FILL-IN: what the implementer's summary must say (a deviation, a fallback added, a command not run).
```

```text template:review-reference
# {{Domain}} review of a diff

## Purpose

FILL-IN: one line, the defects this finds and what they cost. If any of it is adapted from a third party, name the source and the licence here, ship a NOTICE.md beside the references, and list what you changed in references/CHANGES.md.

## Scope

Report {{domain}} problems this change introduces or makes worse. This is not a general code review and not an audit of the whole codebase.

- A problem that was already there and is untouched is out of scope, unless the change makes it reachable.
- Read the callers of the changed code, and the code it calls.
- If the plan has an "Expert input" section, check the diff against what you required there.
- FILL-IN: what you cannot see in this domain (cloud configuration, the running system), and what to do about it.

## Method

1. Learn how this repository already does it. FILL-IN: where to look in this domain.
2. Compare the change against that. FILL-IN: what a deviation looks like here.
3. Trace each risky path to its outcome, with file and line at every step.

Stop a trace when the path cannot be completed from what you can read: then it is a suspicion, and it stays out.

## Categories

Check what the change touches and skip the rest.

- **FILL-IN short name.** FILL-IN, what in the diff shows it. Not when FILL-IN.
- **FILL-IN short name.** FILL-IN. Not when FILL-IN.

## Severity here

- **high**: FILL-IN for this domain.
- **medium**: FILL-IN.
- **low**: FILL-IN.

## Do not report

- FILL-IN: the noise this domain attracts, and why it is noise.
- Anything the plan states and the diff honours; a pattern the repository already uses consistently.

## One finding, and one candidate dropped

- Reported: FILL-IN: a short worked example, with the evidence steps, severity and fix.
- Dropped: FILL-IN: a plausible candidate and the reason it stays out (a suspicion, another owner, already there).
```

```json template:examples
{
  "applies": [
    "REPLACE: a change that clearly needs this expert, named the way a request or diff says it",
    "REPLACE: a second such change",
    "REPLACE: a third such change"
  ],
  "does_not_apply": [
    "REPLACE: a near miss that a sibling owns (owner: architect)",
    "REPLACE: a near miss that a sibling owns (owner: security)",
    "REPLACE: a near miss that a sibling owns (owner: quality)"
  ]
}
```

## What the contract checks, and why

Each rule exists because the first expert showed it can be forgotten or broken silently.

| Rule | Why |
|---|---|
| The plugin can discover it (`experts/experts.js list` includes it) | An expert that cannot be discovered can never be offered to the model. Name must match the file, description and stages must be present and valid. |
| The description is at least 40 characters | It is the only thing a model reads when deciding whether the expert applies. A vague one means the expert is never chosen, or always. |
| Tools exactly `Read, Grep, Glob` (or declared) and `readonly: true` | It reads untrusted material. Each host reads only its own key. |
| Body names `experts/protocol.md`, says it cannot run anything (or runs read-only commands, when it has `Bash`), and has a Goal (Prevents, Done well, Not the goal), a Responsibilities table (Area, This expert judges, Not this expert's (owner), At the border; two rows at least) and How to judge; it does not restate the protocol | The shared rules (zero is correct, evidence, confidence, untrusted input, the web) have one home that every expert reads; a copy in an agent drifts. The Goal and the rubric are what tell the expert where it stops. |
| No two experts claim the same Responsibilities area, and every `(owner: x)` in an example is a sibling | Two rubrics with one area is two experts judging the same item. |
| One reference per declared stage, each named by the agent, every named file exists, no orphans | The workflow tells the expert to read `<stage>.md` first. An unnamed reference is never loaded; a dangling name sends the agent looking for nothing. |
| A build brief exists, is at most 4 KB, says it adds no work and that the plan decides the scope, and never tells the implementer to fetch or install anything | It is loaded into the implementer's prompt on every build (or every build whose plan selects one of its skills, when it lists no `always` skill), so it costs tokens every time and must not enlarge the task. |
| The review reference passes the checklist lint | Scope, Method with a stop rule, Categories each with an inline "Not when", Severity here (high, medium, low), Do not report, and one worked finding with one dropped candidate; no Result, Confidence or Untrusted input section, no restated threshold, no second confidence scale, no demand for a finding. |
| The plan and tests references open with "**Outcome of this stage:**" and define no return fields; plan has Questions and a good and a rejected constraint, tests has Families of cases, One worked case and Redundant here; no reference lists skills | The fields and their limits are the workflow schema's; the empty answer and untrusted input are the protocol's. A worked example shows the bar better than a rule. Skills live in `skills.md`, which only code reads. |
| No `SKILL.md`, no tests or fixtures under the expert | A registered skill puts a description in the main context on every turn. Tests and fixtures belong in repo-root `evals/`, which the plugin ZIP never contains. |
| Size budget: 60 KB per expert; 60 KB of code plus 40 KB per expert for `experts/` without skills (in `evals/security-expert/provenance.test.js`); no total for `experts/skills/`, which the 16 KB per-skill and 40 KB per-stage caps bound | What an expert reads costs tokens on every consult, and the payload stays small. |
| Selection examples: three that apply, three that do not, and at least half of those that do not are near misses written "(owner: x)" | Forces you to state when it should be chosen and where it stops, and seeds the recall check (below). A typo fix teaches nothing about the border. |
| No unfilled `FILL-IN:` or `REPLACE` note | A template note shipped as content is a defect. |
| Every workflow parses, and the expert lane helpers are identical in `plan.js`, `tests.js` and `review.js` | Scripts cannot import, so the helpers are copied. A copy that drifts is a lane that behaves differently from its siblings. |

## Tools and the network

Decided 2026-10-19 by the maintainer, for security: the expert may run read-only commands and use the web to confirm facts, accepting that a diff it reads can try to steer it. The mitigations are rules in `experts/protocol.md` (public names only in queries, fetched content is untrusted) and in the agent file (read-only commands), and the contract checks that the agent names the protocol and states its shell rule. **It cannot check that the model follows them.** The residual risk is data leaving through a query, or a prompt injected through a fetched page. Anything that must be exactly right and needs the network stays in a script outside the model.

Decided 2026-10-20 by the maintainer, for the role experts: developer, architect, softarch and quality all get `WebSearch` and `WebFetch` (the first recommendation was search-only for developer, to keep fetch-based exfiltration off the table; the maintainer asked for all experts to have the network). They are told to use the web at the plan and review stages only (the tool allowlist cannot restrict a stage, so this is a rule in the agent file, not an enforced one), to put public identifiers only in a query, to treat fetched content as untrusted, and to cite the URL and quote the line for any finding that rests on a web source. The recorded evals ran these experts without web access and measure the offline baseline.

Both hosts are covered by one agent file: `tools:` is the Claude Code allowlist, and a missing tool is a hard refusal; `readonly: true` is the Cursor equivalent. Each host ignores the other's key, so there is no second copy to keep in sync. This note lives here, not in the agent, because the model pays for every line of the agent on every consult.

Decided 2026-10-21 by the maintainer: the experts added on 2026-10-20 (genai, frontend, data) get the same web search and fetch, under the same protocol rules.

Claude Code takes bare tool names in `tools:`; it cannot restrict `WebFetch` to a domain there, and a sandbox's allowed domains do not limit `WebFetch`. Cursor behaviour is largely unverified. Any expert that widens its tools repeats this discussion.

## Decision record: what we tried, and what we only reasoned

**Tried and measured.**

- A four-way pilot on six seeded security cases from a private repository (generic prompt, the generic security lens, Anthropic's security-review prompt, the expert), one run each. All four found all six. The cases were textbook. Result: inconclusive, which is why the recipe does not claim an expert is better. A false-positive and a judging problem showed up too (below).
- A path-only router on 12 seeded cases: it selected the security expert for 7. A content-matching prototype raised it to 12, but it was written after reading the cases. Semantic cases (a prompt injection in a prompt file, a missing authorization check) have no keyword. This is why selection was moved to a model.
- Selection by a model, on the question the review asks at the commit check (the recheck prompt, built by the real `review.js`, with the one description in the list). The same 18 corpus diffs, one fresh agent each, shown the diff alone under opaque names, one run each: the security expert was named for **12 of 12** seeded diffs and for **5 of 6** benign look-alikes (the one it left out was React rendering untrusted text as text). The path router selected 7 of 12 on the same seeded cases. Read this carefully: it is one expert and one run per case, the agents saw the diff and not the repository, and the prompt tells the model to include an expert when unsure, so the 5 of 6 is the price of that instruction and not a defect (an unnecessary expert costs a review; a missed one costs a defect). The corpus author is the same session that wrote the description, so the description may be better fitted to these cases than to the next ones. It says the approach is viable; it does not say it is reliable.
- Lazy loading: in the pilot, the references an expert was told to read only conditionally were read when the diff called for them (the CI checklist only for CI and agent diffs). The dependency reference was not read in those runs; that gap is open.

**Reasoned, not yet tested.**

- That the model recalls well enough *with the real repository in front of it and with more than one expert to choose between*. The check below had only the diff, and a single expert.
- That experts taking part at plan and tests time improves the plan and the tests. Five experts exist and none of their plan or tests input has been measured; only review has (`evals/experts/results/README.md`).
- That skills pasted at build, tests and plan change what gets written. Unmeasured; at review, on a saturated corpus, they caused no loss and showed no gain.
- That a commit gate stops a forgotten check. The gate predicates are unit-tested; whether a host fires the hook reliably is measured only for Claude Code, and only for edits, not yet for `Bash`.
- That the plan-time expert input is read and honoured by the implementer. The workflow tells it to; nothing checks the result except the experts' own review.

## Measuring whether it is worth keeping

**Did the skills come into play? Two records answer it on every run, before any eval.**

- **What was loaded.** Each stage's record (`.ultimate-workflow/experts/<stage>/<expert>.json`) keeps `skills`: the skills pasted into that expert's prompt at plan, tests and review. A skill not listed did not contribute to that run. The build stage reports `skillsLoaded` in its result and keeps no record.
- **Where each finding came from.** At review every expert finding carries `basis`: `skill:<name>` with `basisQuote` (the skill row's words, copied), `reference:<category>`, or `general` for the model's own knowledge. `record` checks a skill basis: the skill exists, it was loaded for that expert in that run, and the quote is in its text (case, markdown and source tags ignored). A failed check is kept on the finding as `basisCheck` and listed in `basisProblems`; it does not block the commit.
- **The report.** `/ultimate-workflow:expert-attribution` (or `node experts/experts.js attribution`) gives, per expert: the skills loaded at each stage, the findings by basis, the findings each skill led to, the skills loaded and never cited, and every basis that failed its check.

A basis is the model's own account, so it shows where a finding claims to come from, not that the model would have missed it without the skill. That needs an ablation: the same change reviewed by the plain reviewer (A0), the expert without skills (A2) and with them (A3), through `evals/experts/eval/manual/run-eval.js`.

This is the part that is easy to get wrong. What we learned:

1. **Build the measurement before the content, and freeze the corpus first.** If you write the checklist and then the test cases, the cases will use the checklist's vocabulary and flatter it. We did this in the wrong order for security and had to mitigate.
2. **Author the corpus blind.** A separate agent that has never seen the checklist writes the cases, from a list of categories only. Include benign look-alikes that are demonstrably safe, because false positives are where a calibrated expert should win.
3. **Make the cases hard enough to separate.** Textbook vulnerabilities (command injection through `exec`, `pickle.loads` on uploads) are found by everything. Use subtle, multi-step cases that need this repository's conventions.
4. **Compare like with like.** Same repository context, same read-only instruction, same output contract, for each of: a generic prompt, the generic domain lens, any strong third-party prompt, and the expert. Blind the runs (opaque ids, opaque case names, detached worktrees) so a reviewer cannot tell which arm or which case it is in. The tooling is `evals/experts/eval/` (`lib/run.js`, `lib/corpus.js`, `lib/score.js`, `thresholds.json`, driven by `manual/run-eval.js`); the expert arm uses the same skill selection as the review command. The first security-only versions in `evals/security-expert/manual/` are kept as history.
5. **Score by content, not by line number.** Our pre-registered rule matched findings to the planted bug by file and a line tolerance. The expert and the upstream prompt cited the line where the harm happens; the corpus author recorded where the flaw is introduced. Both were right, and the rule counted them as misses. Use a judge that is blind to the arm, or define the target as a region.
6. **Count failed runs and false positives.** A crashed reviewer is a failed run, never a clean one. A higher hit rate with three times the false positives is not a win.
7. **Report raw counts and per-case flips.** With a dozen cases, a difference smaller than one case is "not distinguishable". Say that. The maintainer decides keep or drop.
8. **Measure selection separately.** For each expert, the selection examples are the seed: give the model the plan or the diff and the list of descriptions, and count how often the expert is named when it applies and when it does not. A weak description shows up here before it shows up as a missed defect.

## Vendoring third-party content

Treat it as untrusted code, because a skill is instructions your agent will follow. The gate, in order: provenance (known author, readable history); no bundled scripts or binaries unless every line is read and justified; an instruction audit (anything that fetches, sends data out, hides actions, or overrides your rules); a licence that allows redistribution inside a plugin; and fit, meaning cut it down to what changes behaviour. Then:

- Copy a **pinned commit**, not a branch, into repo-root `vendor/<source>/` (outside the shipped plugin) with a `PROVENANCE.md` giving source, 40-hex commit, licence, retrieval date and sha256 per file, and pin the same hashes in `vendor/EXPECTED-HASHES.json`. `.gitattributes` marks `vendor/**` as `-text` so Windows line-ending conversion cannot change a hash. `evals/security-expert/provenance.test.js` fails on a one-byte change or a coordinated edit.
- Ship an adapted copy under `experts/<name>/references/` with `NOTICE.md` (licence text) and `references/CHANGES.md` (what you kept, fixed, reversed, added and dropped). Third-party prompts are written for their own setting; expect to fix their contradictions and reverse exclusions that are wrong for yours.
- Never fetch at run time. Never ship their scripts.

## Pitfalls we hit

- **Deciding "is this lens an expert" by membership in a list.** The pre-existing optional `--lenses security` lens silently took the expert path because `security` was in the registry. Ask whether the lens is among the experts *selected for this run*. Found only because the evaluation tooling captures the real prompts and refused to match.
- **Paths in the agent file must be plugin-root-relative** (`experts/<name>/references/...`). A repo guard fails on a path that resolves nowhere.
- **Workflow scripts have no filesystem, no shell and no `import()`.** Anything that reads the diff, the plan or the network is a script the command runs; the workflow only receives its output as `args`, and what it produces is recorded from its return value by `experts/experts.js record`.
- **Never pick "the newest `PLAN-*.md`".** Pass the plan explicitly.
- **Evidence must not change the thing it is evidence about.** The fingerprint excludes `.ultimate-workflow/` and `PLAN-*.md`, because recording evidence writes both. Without that exclusion every record makes itself stale.
- **A gate that cannot be satisfied is worse than none.** The experts-decision gate accepts `experts: []`, and its message says how to write it.
- **A test that passes before the code exists is vacuous.** One of ours passed because an unknown flag also exits with code 2. Assert the reason.
- **Mutation-check your tests.** Break the code in the way the test is meant to catch and confirm it fails. Do it from a script file: backslash surgery through `node -e` or a heredoc silently changes the text (see the repo's Gotchas).
- **A hash test over the file and its recorded hash together proves nothing.** Pin the hash in a second place.
- **Blinding leaks through paths.** Case ids like `s01` and `b01` told reviewers which cases were seeded. Use opaque aliases.
- **Verify a design claim with the reads themselves**, not with the instructions that mention them. Searching a transcript for a file name finds the prompt, not the read.

## Open points

- **Overlap with the existing reviewers.** The core lenses (correctness, simplicity, scope, test coverage) and an expert can flag the same defect. Does an expert replace a core lens for its domain, or only add? Who de-duplicates? Is there a case for an expert-only run that skips the core lenses? (`expertsOnly` exists for the commit check, but nobody has decided it is right for anything else.)
- **Do `architect` and `softarch` overlap `uw-explorer` and `uw-critic`**, which already do discovery and plan critique? Both experts now exist; nobody has measured the overlap.
- **Whether an expert may block** a plan rather than only advise.
- **Selection recall**, as above.
