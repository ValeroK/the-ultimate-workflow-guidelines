# The Ultimate Workflow Guidelines

A two-skill plugin for **Claude Code**, **Cursor**, and **Claude Desktop** that makes LLM coding assistants plan first, test first, respect existing design, and accumulate per-repo knowledge across sessions. Behavioral principles derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls; the workflow and bootstrap procedures are layered on top.

📖 Visual walkthrough: **https://valerok.github.io/the-ultimate-workflow-guidelines/** *(live after Pages is enabled — see [Install](#install))*

## What this gives you

LLMs are fast but forgetful. They assume when they should ask, write 200 lines when 50 would do, touch unrelated code "while they're in there," and re-derive the same project quirks every session. This plugin is a working set of guardrails:

- **Plan-first, test-first workflow** for every non-trivial change. `PLAN-<feature>.md` on disk, tests before code, confirmation gates between stages.
- **Greenfield bootstrap flow.** PRD → architecture → living docs (`CLAUDE.md`, `ROADMAP.md`, `progress.md`, `memory.md`).
- **Behavioral principles** under the workflow: Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution.
- **Per-repo memory that compounds across sessions** — `## Gotchas` in `CLAUDE.md` for defensive warnings (always loaded), `memory/` for explanatory knowledge (lazy-loaded).

## Repository structure

| Path | Purpose | Loaded by | When |
|---|---|---|---|
| `README.md` | Repo entry point. | Humans | On GitHub |
| `LICENSE` | MIT with Attribution. | — | — |
| `CLAUDE.md` | Always-on guidance for Claude Code in this repo. Mirrors skill 1's body. | Claude Code | Every turn |
| `CURSOR.md` | Cursor-specific install/setup notes. | Humans | On read |
| `memory.md` | Slim index of topical knowledge for this repo (lazy-loaded topicals under `memory/`). | Claude Code, Cursor | Read by the workflow skill at the start of any non-trivial task |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest. | Claude Code | On `/plugin install` |
| `.claude-plugin/marketplace.json` | Claude Code marketplace metadata. | Claude Code | On `/plugin marketplace add` |
| `.cursor-plugin/plugin.json` | Cursor plugin manifest. | Cursor | On `/add-plugin` |
| `.github/workflows/release-skills.yml` | Builds three release ZIPs and attaches them to the GitHub release. | GitHub Actions | On `v*` tag push (or manual dispatch) |
| `docs/index.html` | Visual walkthrough served via GitHub Pages. | Humans | On read |
| `rules/the-ultimate-workflow-guidelines.mdc` | Cursor rule, `alwaysApply: true`. Mirrors skill 1's body. | Cursor | Every turn |
| `rules/project-bootstrap-guidelines.mdc` | Cursor rule, `alwaysApply: false`. Mirrors skill 2's body. | Cursor | When the rule's description matches (greenfield phrasings) |
| `skills/the-ultimate-workflow-guidelines/SKILL.md` | Skill 1 body — workflow + principles + memory protocol. | Claude Code, Cursor | When the skill's description matches |
| `skills/the-ultimate-workflow-guidelines/references/plan-template.md` | `PLAN-<feature>.md` skeleton. | Claude Code, Cursor | Linked from SKILL.md, read on demand |
| `skills/the-ultimate-workflow-guidelines/references/memory-template.md` | `memory.md` index + topical-file templates. | Claude Code, Cursor | Linked from SKILL.md, read on demand |
| `skills/project-bootstrap-guidelines/SKILL.md` | Skill 2 body — greenfield bootstrap (PRD → design → living docs). | Claude Code, Cursor | When the skill's description matches |
| `skills/project-bootstrap-guidelines/references/prd-template.md` | `PRD.md` skeleton. | Claude Code, Cursor | Linked from SKILL.md |
| `skills/project-bootstrap-guidelines/references/prd-questions.md` | Question bank for PRD review. | Claude Code, Cursor | Linked from SKILL.md |
| `skills/project-bootstrap-guidelines/references/roadmap-template.md` | `ROADMAP.md` skeleton. | Claude Code, Cursor | Linked from SKILL.md |
| `skills/project-bootstrap-guidelines/references/progress-template.md` | `progress.md` skeleton. | Claude Code, Cursor | Linked from SKILL.md |
| `skills/project-bootstrap-guidelines/references/claude-md-template.md` | Project `CLAUDE.md` skeleton (with `## Key files` + `## Gotchas`). | Claude Code, Cursor | Linked from SKILL.md |
| `skills/project-bootstrap-guidelines/references/memory-template.md` | `memory.md` index + topical-file templates. | Claude Code, Cursor | Linked from SKILL.md |

**Mirror discipline.** The bodies of skill 1 (`SKILL.md` ↔ `CLAUDE.md` ↔ `rules/the-ultimate-workflow-guidelines.mdc`) and skill 2 (`SKILL.md` ↔ `rules/project-bootstrap-guidelines.mdc`) are kept in sync by hand. Changes land in all copies in the same commit.

## The two skills

**`the-ultimate-workflow-guidelines`** — daily feature work in an **existing** codebase. Any non-trivial change gets a `PLAN-<feature>.md` on disk, then tests, then a minimal implementation. Confirmation gates between each stage. Blockers surface 2–3 options with tradeoffs instead of silent picks. After landing, the skill updates `progress.md`, `## Gotchas`, and `memory/<topic>.md` as needed.

**`project-bootstrap-guidelines`** — greenfield only. From a blank slate, produces `PRD.md` (with Mermaid flow + confirmed framework choices and alternatives), `CLAUDE.md`, `ROADMAP.md`, `progress.md`, and an empty `memory.md`. Once these exist, the workflow skill takes over.

The two skills hand off cleanly: skill 1 reads what skill 2 produced (especially `PRD.md`, `CLAUDE.md`, and `memory.md`) before planning any feature.

## The behavioral layer (Principles)

Both skills apply four principles before any procedural step:

- **Think Before Coding** — surface assumptions; ask when unclear; name tradeoffs.
- **Simplicity First** — minimum code that solves the problem; nothing speculative.
- **Surgical Changes** — touch only what the request requires.
- **Goal-Driven Execution** — define verifiable success criteria; loop until green.

The workflow is *how* to work; the principles are *how to think*.

## Per-repo storage: `## Gotchas` vs `memory/`

Two stores, distinct purposes:

| | `## Gotchas` (in `CLAUDE.md`) | `memory/<topic>.md` |
|---|---|---|
| **Purpose** | Defensive warning | Explanatory knowledge |
| **Voice** | "Beware…" / "Don't…" / "Note that…" | "Here's how…" / "Here's why…" |
| **Posture** | Reactive — alerts to a footgun | Proactive — builds understanding |
| **Always loaded?** | Yes — short, lives in `CLAUDE.md` | No — lazy-loaded via Read tool when the topic is relevant |
| **Example** | "Tests need a live Postgres — run `docker compose up -d db` first." | A 2-page `memory/auth.md` covering token lifecycle + role checks + library decisions |

**Decision test:**
- Phrasable as *"Beware:"* or *"Don't…"*? → Gotcha.
- Phrasable as *"Here's how X works"* or *"Here's why we picked Y"*? → Memory.

`memory.md` at the repo root is a slim index of one-line pointers to `memory/<topic>.md` files, each with a "Read when..." cue (keywords / file globs). The workflow skill's read protocol: read `memory.md`, then for every entry whose cue matches the current task, Read the topical file before drafting the plan.

## Install

### Claude Code (plugin)

```
/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines
/plugin install the-ultimate-workflow-guidelines
```

Both skills become available across all your projects. Replace `ValeroK` with your own GitHub handle if you forked the repo.

### Cursor (Marketplace)

```
/add-plugin ValeroK/the-ultimate-workflow-guidelines
```

Or browse [Cursor Marketplace](https://cursor.com/marketplace) once the listing is live. Cursor auto-discovers `skills/` and `rules/` — both skills and their `alwaysApply` flags activate immediately.

For an offline install, download `the-ultimate-workflow-guidelines-plugin.zip` from the [latest release](https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/latest) — the same ZIP serves Claude Desktop and Cursor.

See **[CURSOR.md](CURSOR.md)** for using individual `.mdc` rules outside the plugin system.

### Claude Desktop (claude.ai)

Requires Pro, Max, Team, or Enterprise plan with code execution enabled.

**Plugin upload — installs both skills at once (recommended):**

1. Download `the-ultimate-workflow-guidelines-plugin.zip` from the [latest release](https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/latest).
2. In claude.ai, open the plugin upload UI and select the ZIP. The same ZIP also works as a manual install for Cursor.

**Skills upload — one skill at a time:**

If your install surface accepts single-skill ZIPs only:

1. Download `the-ultimate-workflow-guidelines.zip` and/or `project-bootstrap-guidelines.zip` from the [latest release](https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/latest).
2. In claude.ai, go to **Settings → Features → Skills → Upload Skill** and select the ZIP.

Install is per-user; each teammate uploads separately. Skills in claude.ai don't share state with Claude Code installs — this is a parallel surface.

### Per-project `CLAUDE.md` (no plugin)

Drop the principles + workflow into one project's `CLAUDE.md` without installing anything:

```bash
# new project
curl -o CLAUDE.md https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/CLAUDE.md

# append to existing
echo "" >> CLAUDE.md
curl https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/CLAUDE.md >> CLAUDE.md
```

This path **doesn't include** the references/ templates or skill 2 (bootstrap). For everything, use the plugin paths above.

## License

MIT with Attribution — see [LICENSE](LICENSE). Redistributions, modifications, and derivative works must visibly credit `ValeroK` and link back to https://github.com/ValeroK/the-ultimate-workflow-guidelines on a user-facing surface (README, docs, About screen). Source-comment or LICENSE-only credit does not satisfy the requirement.
