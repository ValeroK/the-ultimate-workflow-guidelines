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

## Two skills

| Skill | When |
|---|---|
| `the-ultimate-workflow-guidelines` | Daily work in an existing codebase. Plan, tests, minimal change, harvest. |
| `project-bootstrap-guidelines` | Greenfield only. Produces `PRD.md`, a reviewed design, then `CLAUDE.md`, `ROADMAP.md`, `progress.md`, `memory.md`. |

They hand off: once the bootstrap docs exist, the workflow skill reads them before planning anything.

Under both sit four principles: **think before coding**, **simplicity first**, **surgical changes** (every changed line traces to your request), and **goal-driven execution**.

## Gates

The skills describe the workflow. The gates enforce it — five lifecycle hooks reading a small YAML block in `PRD.md` or `PLAN-<feature>.md`:

- No source edit before the plan is confirmed
- No implementation before the tests are confirmed (test files exempt, that's the point)
- No finishing a turn with unverified changes
- Three failed verification rounds escalates to you
- One line per prompt naming the current stage, so it survives compaction

They are **completely inert** in a repo with no `PRD.md` or `PLAN-*.md`, so trivial work is never blocked. `ULTIMATE_WORKFLOW_GATES=off` disables them. They fail open — an internal error blocks nothing.

### Check they are actually running

```bash
node hooks/status.js
```

Reports whether the gates are live, what stage you are in, and what is blocking you right now.

Worth running once after installing, because **hook config is read at host startup**: a gate registered mid-session does nothing until you restart, and gives no indication of it. A hook that was never loaded, a hook that crashed, and a hook that correctly allowed all look identical from the outside — so every gate now leaves a heartbeat, and this reads it.

### Host support is not equal

> **On Cursor, the first two gates cannot prevent anything.** They detect and correct after the fact.

Measured, not assumed. On Cursor 3.17.19 a pre-edit hook returning `deny` is honoured for reads and **ignored for writes** — the file is created and the model is told it succeeded. So the plugin doesn't emit a deny there at all: a silently dropped block looks like enforcement while providing none.

| Host | Blocks edits | Blocks turn end | Verified |
|---|---|---|---|
| Claude Code | Yes | Yes | Measured |
| Codex CLI | Yes | Yes | Docs only |
| Gemini CLI | Yes | Yes | Docs only |
| **Cursor** | **No, detect only** | Follow-up message | Measured |

"Docs only" is a real caveat. Every defect found while building the two verified adapters — a UTF-8 BOM that makes payload parsing throw, absolute paths defeating test-file detection, `workspace_roots` instead of `cwd` — was invisible in documentation and **failed open**. If you use Codex or Gemini, you can close that gap in five minutes: register `hooks/dev/record.js` on every hook event, run one session, and open a PR with the fixtures.

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
curl -o CLAUDE.md https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/CLAUDE.md
```

That path has no templates, no bootstrap skill, and no gates. See [CURSOR.md](CURSOR.md) for using individual `.mdc` rules standalone.

## Layout

```
skills/     the two skill bodies, plus templates under references/
rules/      Cursor mirrors of the same bodies
hooks/      gate.js (one entry point) + lib/ (state, gates, adapters, dispatch)
hooks/dev/  payload recorder, for verifying a new host
CLAUDE.md   always-on guidance for this repo; mirrors skill 1
```

Each skill body is mirrored by hand across `SKILL.md`, `CLAUDE.md`, and `rules/*.mdc`. Changes land in every copy in the same commit.

## No emojis

The plugin blocks emoji in any file an assistant writes — they break Windows terminals and corrupt pipelines. Set `ALLOW_EMOJIS=1` to override.

## License

MIT with Attribution — see [LICENSE](LICENSE). Redistributions, modifications, and derivative works must visibly credit `ValeroK` and link back to https://github.com/ValeroK/the-ultimate-workflow-guidelines on a user-facing surface (README, docs, About screen). Source-comment or LICENSE-only credit does not satisfy the requirement.
