# Ultimate Workflow

Your AI coding assistant is fast, confident, and forgets everything. This makes it slow down, show you a plan, write the tests first, and remember what it learned.

Works in **Claude Code**, **Cursor**, **Codex CLI**, **Gemini CLI**, and **Claude Desktop**.

Visual walkthrough: **https://valerok.github.io/the-ultimate-workflow-guidelines/**

---

## The problem

You ask for a small change. You get 200 lines. Half of them "improve" code you never mentioned.

You ask a question. It guesses instead of asking you back.

You explain a quirk of your project. Next session, it's gone, and you explain it again.

Telling it not to do these things doesn't work. Instructions like "always plan first" sit in a file the model reads once and then drifts away from twenty minutes into a long conversation.

## The idea

Stop asking one assistant to do everything in one long conversation.

Split the work into **five short jobs**. Each one starts fresh, knows only what it needs, does a single thing, hands you the result, and stops.

That's the whole concept. Three things follow from it:

**It can't skip a step.** Not because it's being watched, but because each step is a separate command you run. There's nothing to skip ahead to. The next step doesn't exist until you start it.

**It can't wander.** A job that only reads code is given tools that only read code. Four of the five jobs physically cannot write to your files. Only the build step can.

**It can't lose the thread.** Each job hands back a document, not a memory. The plan is a file on disk. When the conversation gets too long and the history is trimmed, the plan is still there.

The cost is honest: five commands instead of one, and you're the one who moves between them. That's the trade. You get a checkpoint you actually read, twice, before any code is written.

## What it feels like

Say you ask for rate limiting on your public API.

**1. It writes a plan and stops.**

A file lands on disk: which files it looked at and why they matter, the patterns already in your codebase it intends to follow, anywhere it wants to deviate and the tradeoffs both ways, and what it's still unsure about. No code yet.

**2. You say go. It writes a test plan and stops again.**

What to test, how, and what "done" means. Four independent critics then attack that plan with one question: *could someone write code that passes all of this and still be wrong?* Arguing about how you'd know it works is much cheaper on paper than on code that already exists.

**3. You say go. Now it writes the tests, runs them, and proves they fail.**

A test that passes before the feature exists is testing nothing, and once everything is green you can't tell the difference. So it checks. Then it writes the smallest implementation that makes them pass, and loops until green.

**4. When something doesn't add up, it stops and asks.**

A real example from building this repo: the hook payloads it recorded didn't match the vendor's documentation. Instead of guessing, it laid out the options and waited.

**5. When it lands, it writes down what it learned.**

Short warnings go somewhere always loaded. Longer explanations go in a topic file that's only opened when relevant, so your always-on instructions stay small.

## The five commands

| Command | What it does | Can it write? |
|---|---|---|
| `/ultimate-workflow:plan` | Several readers explore the code in parallel, then one writes the plan | No |
| `/ultimate-workflow:tests` | Drafts a test plan, then four critics try to break it | No |
| `/ultimate-workflow:build` | Writes the tests, proves they fail, implements, loops to green | **Yes** |
| `/ultimate-workflow:review` | Four reviewers, then a skeptic who tries to disprove each finding | No |
| `/ultimate-workflow:harvest` | Works out which lessons from this feature are worth keeping | No |

Four of the five hand you proposals instead of applying them. That's on purpose. A proposal you have to accept is a proposal you actually read.

You don't need all five every time. A typo doesn't need a plan.

Three more commands sit outside the loop. **`/ultimate-workflow:experts`** is the quick expert check before a commit: it asks again which experts apply to the real diff, runs them and records the evidence. **`/ultimate-workflow:expert-attribution`** reports, from that evidence, which skills each expert had at each stage and where its findings say they came from (a skill, its reference, or the model's own knowledge), with any citation that does not check out. **`/handoff`** writes a handoff document when a session ends with work still in flight, so the next agent inherits the state that hasn't landed in any committed file yet. You run it; it is never invoked on your behalf.

## Domain experts

Some changes need someone who knows a domain: security, architecture, accessibility, deployment. A generic reviewer can miss what such a person would ask about before any code exists, and by review time the code is already written.

A **domain expert** is an agent with a vetted checklist for one domain. Unlike a reviewer, it takes part from the plan onward, and it checks the finished code against what it asked for earlier. It reads and advises. It never writes your code.

```
 /plan     the plan is drafted
           a model is asked which of the available experts apply
           each expert chosen adds constraints, risks and questions to the plan
           YOU confirm the plan, expert input included
              |
 /tests    the same experts, plus quality (it always joins), add the test cases
           their domain needs
           YOU confirm the tests
              |
 /build    the implementer treats the expert input as requirements, and gets the
           developer and quality briefs on every build (how to write, never what to
           build), with the shared skills the plan's files call for
              |
 commit    with the gates on, refused until /ultimate-workflow:experts has run:
             the question is asked again against the real diff (it can only ADD experts)
             each expert reviews the diff, and checks it against what it required in the plan
             a high-confidence finding stays open until it is fixed, or YOU dismiss it
             any change after the review makes the evidence stale, so it runs again
```

What you see: ask for an order lookup route and the plan comes back with a security section that says, for example, "support staff are not let through, as the invoice route does, because an order carries a shipping address; the refusal body must be a fixed string". Ask for a button colour and no expert is involved. If the code later copies the invoice route's admin bypass, the review names it as a requirement the code does not honour, and the commit stays refused until you decide.

**What is code and what is a model.** Code decides which experts exist (it scans the agents folder), that the answer can only add, that an expert actually ran, that the evidence matches the code being committed, and whether the commit is allowed. A model decides which experts apply, what they advise, and what the review finds. The gate guarantees the question is asked and answered. It cannot guarantee the answer is right.

**Adding an expert** is one agent file, one reference file per stage it joins, and an examples file. Nothing else is edited: no registry, no router, no workflow. The step-by-step playbook is **[docs/expert-playbook.md](docs/expert-playbook.md)** and the recipe for the mechanics is **[docs/adding-an-expert.md](docs/adding-an-expert.md)**, and it is tested by following it mechanically. What a good expert looks like, and how to vet one before you trust it, is **[docs/what-a-good-expert-looks-like.md](docs/what-a-good-expert-looks-like.md)**. Nine experts ship: `architect` (how services, queues, data stores and AWS resources fit together, and the alarms on them), `softarch` (module boundaries and dependency direction), `developer` (craft in new production code, telemetry in code, and what a web page loads first), `devops` (infrastructure code, pipelines, containers and releases: what a change replaces or destroys, and whether it can be repeated and undone), `quality` (whether tests, evals and gates can fail), `security` (which also audits dependencies with a script that checks real advisories instead of guessing, and follows where personal data goes), `frontend` (accessibility, layout on real data, the web on phones, tablets and desktops, motion), `genai` (model calls, agent loops and tools, retrieval, Bedrock and AgentCore) and `data` (schema changes and stores; today, whether a deletion reaches every copy). The list of experts, and of the skills each one uses, is in [docs/expert-catalogue.md](docs/expert-catalogue.md).

**Shared skills.** Each expert lists the skills it may need: a language's pitfalls, failure handling, engineering principles, how to write a test, AWS services and Well-Architected practices, Terraform, CloudFormation, Kubernetes and pipelines, accessibility and devices, model calls and agents, alarms and telemetry, web performance, personal data and erasure. There are fifty, under `experts/skills/`, each with the date its facts were checked and a tag on every row saying where it comes from. Code picks the ones that apply from the diff (review) or the plan (build, tests) and pastes them into the expert's prompt; at plan a model picks from an offered list. They are not the design-guidance skills below, which the host loads by itself. How it works: [docs/adding-an-expert.md#shared-skills](docs/adding-an-expert.md#shared-skills).

**The honest limits.** The commit gate runs on Claude Code and is off unless you turn the gates on (see [docs/gates.md](docs/gates.md)); elsewhere the same flow is written instructions and works as far as the model follows them. Whether a model picks the right experts was measured once, on one expert: it chose security for 12 of 12 seeded security diffs and for 5 of 6 harmless look-alikes (it is told to include an expert when unsure). That is promising, not proven. Against a plain reviewer the results do not yet show a gain. On written test sets the developer expert found 6 of 6 seeded defects against 4 of 6 once, but every later written set, the deliberately hard ones included, was found in full by the plain reviewer, even with a smaller model doing the review. On real defects mined from fix commits (8 cases) the expert found the same 4 as the plain reviewer and raised 3 false alarms in 18 harmless commits against none ([evals/experts/results/README.md](evals/experts/results/README.md)). Devops, frontend, genai and data are not measured, and neither is any skill at build, tests or plan. `/ultimate-workflow:expert-attribution` shows, per run, which skills each expert had and where its findings say they came from; whether the skills made the difference needs the same change reviewed with and without them. Experts cost tokens: one call to choose, one per expert per stage, and about 28 KB of briefs and skills on every build.

## Starting a brand new project?

There's a separate mode for that: it interviews you, writes a PRD, designs the system with you, and sets up the living documents the workflow above then reads. Use it once, on an empty repo.

| Skill | When |
|---|---|
| `the-ultimate-workflow-guidelines` | Day-to-day work in an existing codebase |
| `project-bootstrap-guidelines` | Greenfield only, run once |

## Design guidance

Five more skills cover the design questions that come up inside the loop. They load by description when a question matches, and the workflow's plan step and the bootstrap's system-design phase point at them. They add a checklist, not new rules about process.

| Skill | When |
|---|---|
| `system-architect-engineering-guidelines` | A design question in an existing codebase: add a layer, cache, abstraction or dependency; review a design for over-engineering |
| `greenfield-architecture-guidelines` | Deciding the architecture of a new system: quality attributes, modular-monolith start, walking skeleton |
| `modularity-and-evolution-guidelines` | Module and service boundaries, coupling, migrations, API and schema changes |
| `distributed-systems-resilience-guidelines` | Anything crossing a network: timeouts, retries, idempotency, partial failure |
| `operability-guidelines` | Releases, rollback, monitoring, alerting, reliability targets, go-live |

The honest part: measured on this repo's own probes they fire reliably but add little over the base model on well-known topics. The clearest gains are premise pushback and quality-attribute questions on new designs. Their architecture claims were written from recall and are only partly cross-checked. Method, results and caveats: [`evals/results/architecture-skills/README.md`](evals/results/architecture-skills/README.md) and [`research/architecture-claims-check.md`](research/architecture-claims-check.md).

Under all of them sit four principles: **think before coding**, **simplicity first**, **surgical changes** (every changed line traces back to something you asked for), and **goal-driven execution** (define "done" in terms you can check, then loop until it's true).

## Memory that compounds

Two places, two jobs:

- **Always loaded** — short defensive warnings. *"Tests need a live Postgres, run `docker compose up -d db` first."*
- **Loaded on demand** — the longer explanations, in a topic file fetched only when the topic comes up. *"Auth uses short-lived JWTs because..."*

The test: if it starts with *"beware"*, it's a warning. If it starts with *"here's how"* or *"here's why"*, it's a topic file.

This matters more than it sounds. Everything in the always-loaded pile is paid for on every single message, whether it's relevant or not. Keeping it small is what keeps it read.

## Install

**Claude Code**

```
/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines
```

then

```
/plugin install ultimate-workflow
```

Upgrading from 2.x? The plugin was renamed, so an update won't find it — uninstall `the-ultimate-workflow-guidelines` first, then install the line above.

<details>
<summary>If the install fails with <code>git@github.com: Permission denied (publickey)</code></summary>

You clone over HTTPS and have no SSH key. Claude Code clones plugin sources over SSH, so the install fails before it reaches this repo. Nothing here can change that — a marketplace entry can only declare a GitHub repo, not the protocol used to fetch it.

One global git setting fixes it, for this plugin and every other SSH-shaped URL:

```bash
git config --global url."https://github.com/".insteadOf "git@github.com:"
```

To avoid changing anything permanently, scope it to the one command instead:

```bash
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0="url.https://github.com/.insteadOf" GIT_CONFIG_VALUE_0="git@github.com:" claude plugin install ultimate-workflow@the-ultimate-workflow-guidelines
```

</details>

**Cursor**

```
/add-plugin ValeroK/the-ultimate-workflow-guidelines
```

The shippable plugin lives under `.cursor-plugin/ultimate-workflow/` so Cursor's marketplace sparse-checkout actually keeps `rules/`, `agents/`, `skills/`, and `commands/` (a root-level layout looked installed and was empty). After adding the marketplace, install **ultimate-workflow** and confirm those folders exist under the plugin cache. For local dogfood of this repo, symlink `~/.cursor/plugins/local/ultimate-workflow` → `<repo>/.cursor-plugin/ultimate-workflow` and reload. Details: `memory/cursor-install.md` inside the plugin tree.

**Claude Desktop** — download `the-ultimate-workflow-guidelines-plugin.zip` from the [latest release](https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/latest) and upload it. Needs a paid plan with code execution. The same ZIP works for an offline Cursor install.

**Just one project, no plugin** — drop the whole workflow into a single repo as one file:

```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/SKILL.md
```

You get the workflow as prose. No templates, no bootstrap mode, no commands. Cursor users can drop individual `.mdc` files from `.cursor-plugin/ultimate-workflow/rules/` into `.cursor/rules/` instead.

## What you get on which host

Claude Code can run the five commands as real scripts, so the ordering is guaranteed. Nowhere else can.

| | Claude Code | Cursor | Codex / Gemini / Desktop |
|---|---|---|---|
| The five jobs, each with fresh context | Yes | Yes, you invoke them | As prose |
| Ordering guaranteed | Yes | You hold the sequence | You hold the sequence |
| Only the builder can write | Yes | Yes | — |
| Optional enforcement hooks | Yes | No | Not verified |
| Domain experts at plan, tests and review | Yes | You invoke `uw-expert-<name>` by hand; no selection, skill injection or evidence | No |
| Commit refused until the experts have reviewed | Yes, with the gates on | No | No |

Cursor keeps most of what matters: separate jobs, clean context each time, and only one of them able to write. What it loses is the guarantee, and its rule file says so plainly rather than implying otherwise.

There's an optional enforcement layer for Claude Code — hooks that block an edit before the plan is confirmed, a commit before the domain experts have reviewed it, and so on. It's **off by default**; details and the honest limits are in **[docs/gates.md](docs/gates.md)**.

## Layout

```
AGENTS.md                         repo dogfood always-on (not shipped in the plugin ZIP)
CLAUDE.md                         one line: @AGENTS.md
.claude-plugin/marketplace.json   Claude marketplace catalog
.cursor-plugin/marketplace.json   Cursor marketplace catalog
.cursor-plugin/ultimate-workflow/ shippable plugin (Claude + Cursor payload)
  skills/   rules/   agents/   commands/   workflows/   hooks/   memory/   experts/
  experts/<name>/references/       one reference per stage an expert joins
  experts/skills/                  shared skills that code pastes into an expert's prompt
docs/                             the expert recipe, catalogue, gates and design notes
evals/                            checks that the instructions still get followed: the expert contract, blind corpora and recorded results
research/                         background notes and claim checks (not shipped in the plugin ZIP)
```

The plugin sits under `.cursor-plugin/` because Cursor marketplace sparse-checkout only materializes that tree (and `.claude-plugin/`). See `.cursor-plugin/ultimate-workflow/memory/cursor-install.md`.

## Credits and license

Behavioural principles derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

The workflow tells the assistant to keep emoji out of code, because they break Windows terminals and corrupt pipelines. It is an instruction, not a blocked write -- prose and docs are unaffected.

MIT with Attribution — see [LICENSE](LICENSE). Redistributions, modifications, and derivative works must visibly credit `ValeroK` and link back to https://github.com/ValeroK/the-ultimate-workflow-guidelines somewhere a user can see it (README, docs, About screen). A source comment or the LICENSE file alone doesn't satisfy it.
