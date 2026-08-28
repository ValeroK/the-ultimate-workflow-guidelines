# Ultimate Workflow

Makes AI coding assistants plan before they code, test before they implement, and remember what they learned. Works in **Claude Code**, **Cursor**, **Codex CLI**, **Gemini CLI**, and **Claude Desktop**.

Behavioral principles derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

Visual walkthrough: **https://valerok.github.io/the-ultimate-workflow-guidelines/**

## The problem

LLMs are fast and forgetful. They assume instead of asking, write 200 lines where 50 would do, "improve" code you didn't ask them to touch, and re-derive the same project quirks every session.

Telling them not to doesn't stick. This plugin turns the workflow into steps they move through, with checkpoints you control — and, where the host supports it, checkpoints they **cannot skip**.

## What it looks like

Say you ask for a real feature — the lifecycle gates in this repo, for instance.

**1. It writes a plan and stops.** `PLAN-hook-gates.md` lands on disk: files explored and why they matter, the existing patterns it intends to reuse, one flagged deviation (a shared `hooks/lib/` directory, with pros and cons for both options), and open questions. No code yet.

**2. You confirm. It writes a test plan and stops again.** What to test, how, and what counts as done. Negotiating "how would we know this works" on paper is cheaper than on code that already exists.

**3. You confirm. Now it writes the tests first,** then the minimal implementation, and loops until green.

**4. When something doesn't add up, it stops.** Real example from that feature: the recorded hook payloads didn't match the vendor documentation. Rather than guess, it surfaced the problem with options and tradeoffs and waited.

**5. When it lands, the durable lessons get written down.** One-line footguns go to `## Gotchas` in `CLAUDE.md`; explanations worth two pages go to `memory/<topic>.md`, loaded only when relevant.

Both "and stops" points are real gates, not politeness. The plan file also survives context compaction, which chat history does not.

## Five phases

Each runs in a fresh context with its own tools, does one job, and stops. Only one of them can write.

| Command | What it does | Writes |
|---|---|---|
| `/ultimate-workflow:plan` | Readers fan out over the code, your project docs, and matching memory topicals; a synthesiser writes the plan | No |
| `/ultimate-workflow:tests` | Drafts a test plan, then four critics attack it: *could an implementation pass all this and still be wrong?* | No |
| `/ultimate-workflow:build` | Writes the tests, **confirms they fail**, implements minimally, loops to green or escalates | **Yes** |
| `/ultimate-workflow:review` | Four lenses in parallel, then an adversarial pass that tries to refute each finding | No |
| `/ultimate-workflow:harvest` | Reads the plan, the diff, and what's already recorded; proposes what's worth keeping | No |

Four of five return proposals for you to apply. That's deliberate: a proposal you have to accept is a proposal you actually read.

**On Cursor**, which has subagents but no scriptable orchestrator, the same five run as agent invocations you sequence yourself — same prompts, same write isolation, without the enforced ordering. The rule file says so plainly rather than implying parity.

## Two skills

| Skill | When |
|---|---|
| `the-ultimate-workflow-guidelines` | Daily work in an existing codebase. Plan, tests, minimal change, harvest. |
| `project-bootstrap-guidelines` | Greenfield only. Produces `PRD.md`, a reviewed design, then `CLAUDE.md`, `ROADMAP.md`, `progress.md`, `memory.md`. |

They hand off: once the bootstrap docs exist, the workflow skill reads them before planning anything.

Under both sit four principles: **think before coding**, **simplicity first**, **surgical changes** (every changed line traces to your request), and **goal-driven execution**.

## Gates

The five phases make ordering structural. The gates cover what happens **outside** them — ad-hoc edits in a managed repo. They are **opt-in**: set `ULTIMATE_WORKFLOW_GATES=on`. Five lifecycle hooks reading a small YAML block in `PRD.md` or `PLAN-<feature>.md`:

- No source edit before the plan is confirmed
- No implementation before the tests are confirmed (test files exempt, that's the point)
- No finishing a turn with unverified changes
- Three failed verification rounds escalates to you
- One line per prompt naming the current stage, so it survives compaction

Even enabled, they are **completely inert** in a repo with no `PRD.md` or `PLAN-*.md`, so trivial work is never blocked. They fail open — an internal error blocks nothing.

They shipped on by default in 2.4.0 and were demoted in 3.0.0 on measurement, not taste: full enforcement on one host, partial on one, unverified on two, and three separate routes to "installed and silently enforcing nothing". A default-on mechanism that fails open invisibly is worse than an opt-in one you chose.

### Check they are actually running

```bash
node hooks/status.js
```

Reports whether the gates are live, what stage you are in, and what is blocking you right now.

Worth running once after installing, because **hook config is read at host startup**: a gate registered mid-session does nothing until you restart, and gives no indication of it. A hook that was never loaded, a hook that crashed, and a hook that correctly allowed all look identical from the outside — so every gate now leaves a heartbeat, and this reads it.

### Gates are Claude Code only

Everything above applies to Claude Code. **Cursor, Codex CLI, Gemini CLI, and claude.ai get the workflow as prose** — the checkpoints are observed, not enforced.

That scope is deliberate and measured. On Cursor 3.17.19 a pre-edit hook returning `deny` is honoured for reads and **ignored for writes**: the file is created, and the following event reports success, so the model is never told it was blocked. Shipping gates there would look like enforcement while providing none.

The Codex and Gemini hook contracts are documented and look nearly identical to Claude Code's, but neither has been exercised. Every defect found on the hosts we *did* exercise — a UTF-8 BOM that makes payload parsing throw, absolute paths defeating test-file detection, `workspace_roots` in place of `cwd` — was invisible in documentation and **failed open**. Until someone records real payloads with `hooks/dev/record.js`, those hosts get prose.

## Memory that compounds

Two stores, different jobs:

- **`## Gotchas`** in `CLAUDE.md` — defensive one-liners, always loaded. *"Tests need a live Postgres, run `docker compose up -d db` first."*
- **`memory/<topic>.md`** — explanatory knowledge, loaded on demand through a slim `memory.md` index. *"Auth uses short-lived JWTs because…"*

Test: phrasable as *"beware"*? Gotcha. Phrasable as *"here's how"* or *"here's why"*? Memory.

## Install

**Claude Code**

```
/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines
/plugin install ultimate-workflow
```

**Cursor**

```
/add-plugin ValeroK/the-ultimate-workflow-guidelines
```

**Claude Desktop** — download `the-ultimate-workflow-guidelines-plugin.zip` from the [latest release](https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/latest) and upload it. Requires a paid plan with code execution. The same ZIP serves an offline Cursor install.

**No plugin, one project** — drop the principles and workflow into a single repo:

```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/skills/the-ultimate-workflow-guidelines/SKILL.md
```

That fetches the full workflow as self-contained prose. It has no templates, no bootstrap skill, no phase commands, and no gates. See [CURSOR.md](CURSOR.md) for using individual `.mdc` rules standalone.

## Layout

```
skills/     the two skill bodies, plus templates under references/
rules/      Cursor's always-on index and rules
workflows/  the five phase scripts (Claude Code)
agents/     five scoped agent definitions; only the implementer can write
hooks/      gate.js + lib/ + status.js  (opt-in)
memory/     topical knowledge, loaded on demand via memory.md
evals/      trajectory scorer and the context-boundary fixtures
CLAUDE.md   thin always-on index for this repo
```

The skill bodies live once, in `skills/`, which both hosts read. `CLAUDE.md` and `rules/*.mdc` are thin always-on indexes, one per host, kept in step by `mirrors.test.js` rather than by discipline.


## No emojis

The plugin blocks emoji in any file an assistant writes — they break Windows terminals and corrupt pipelines. Set `ALLOW_EMOJIS=1` to override.

## License

MIT with Attribution — see [LICENSE](LICENSE). Redistributions, modifications, and derivative works must visibly credit `ValeroK` and link back to https://github.com/ValeroK/the-ultimate-workflow-guidelines on a user-facing surface (README, docs, About screen). Source-comment or LICENSE-only credit does not satisfy the requirement.
