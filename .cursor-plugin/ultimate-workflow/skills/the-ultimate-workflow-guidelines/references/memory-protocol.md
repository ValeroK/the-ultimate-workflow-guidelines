# Memory protocol

> How this project decides what to write down and where. Read at step 6 of the
> workflow, when a feature has landed and its durable lessons need a home.
>
> Extracted from always-on context deliberately: this is consumed at most once
> per feature, so it is dynamic context, not static. See
> `memory/context-boundary.md` for the reasoning.

### `## Gotchas` in `CLAUDE.md` — capturing repeating issues

`CLAUDE.md` is auto-loaded every turn. Its `## Gotchas` section is where empirical, discovered-the-hard-way project knowledge lives — the cousin of the "best practices" section, but for things nobody planned.

**Write an entry when at least one is true:**
- You hit the same issue twice (same or across sessions).
- The user corrected you on the same thing more than once.
- Debugging took >10 minutes and the fix is non-obvious from reading the code.

One-off typos or things the next reader would catch instantly: **don't log.** Noise has a cost.

**Format:** one or two sentences per entry. Lead with the actionable rule, then the *why*. An optional `(Discovered YYYY-MM-DD, hit Nx)` trailer helps future readers know when to retire the entry.

**Prune:** if a gotcha stops being true (after a refactor, framework change, or convention shift), delete it. This section should be alive, not a graveyard.

### Memory: slim index + lazy topical files

`CLAUDE.md`'s `## Gotchas` catches **defensive warnings** ("beware X", "don't do Y"). Memory catches **explanatory knowledge** ("here's how X works", "here's why we picked Y"). Different purposes — see *Gotchas vs Memory* below for the full distinction.

Topicals live at the repo root as a slim **`memory.md`** index plus per-topic files under **`memory/`**. Template: [`memory-template.md`](memory-template.md), beside this file.

**`memory.md` shape:** one-line pointer per topical, each with a **Read when** cue (concrete keywords + file globs). Example entry:

> `- [memory/auth.md](memory/auth.md) — Auth flow + token lifecycle. **Read when** login, sessions, JWT, OAuth, or /auth/* files.`

The cue is what the model uses to decide whether to fetch the topical. Concrete keywords beat vague phrases.

**The header and the generated index.** Each `memory/<topic>.md` starts with a small header (front matter, a fixed subset: flat keys, lists inline `[a, b]` or as `- item` lines):

```
---
description: <one line, required>
read_when:
  paths: [hooks/**]
  keywords: [gate.js, "a gate is not firing"]
updated: YYYY-MM-DD
---
```

`paths` are globs relative to the folder that holds `memory.md`. The header takes no comments. At least one of `paths` or `keywords` is required. Cards pick their topicals from the headers (a path glob that meets one of the card's paths, or a keyword found as a whole word in the card's text), not from the sentence in `memory.md`.

The list in `memory.md` is generated from the headers, between `<!-- uw:memory-index:start ... -->` and `<!-- uw:memory-index:end -->`. **Never edit between the markers**: change the header and run `node experts/experts.js memory index`. Text outside the markers is yours and is never touched. `node experts/experts.js memory check` verifies the index and every relative link in `AGENTS.md`, `CLAUDE.md`, `memory.md` and `memory/*.md`; the agent's commits are refused when they newly leave the index stale or break a link (a commit from your own terminal is not seen by the hooks, so run `memory check` yourself).

**Migration happens at the first harvest.** A project whose topicals have no header and whose `memory.md` has no markers is not failing, only "not migrated" (`memory check` warns and exits 0). Its first harvest after the upgrade to 4.8.0 makes one commit of its own on the harvest branch, "harvest: migrate memory to headers" (what `memory migrate` writes), with the lessons on top. Review it like any lesson; dropping the branch leaves the project as it was.

**A conflict in the generated block.** Two harvest branches both regenerate the same block, so merging the second can conflict in `memory.md`. Take either side, run `node experts/experts.js memory index`, and commit.

**Read protocol** at the start of any non-trivial task:

1. Read `memory.md` if it exists (cheap — it's slim by design).
2. For each entry whose **Read when** cue matches the current task, read `memory/<topic>.md` *before drafting the plan*.
3. Topical content feeds the plan's existing-design review and deviation justification — often the rationale lives there.

**Write protocol — Gotcha or Memory?** Use the decision test in *Gotchas vs Memory* below. Threshold for a new `memory/<topic>.md` (all three required):

1. The lesson is **explanatory** (passes the "Here's how / Here's why" test).
2. It will affect **future feature work** in this area, not a one-time observation.
3. The understanding **isn't obvious from reading the code** — there's rationale, history, or system shape the source doesn't reveal.

A small explanatory lesson belongs in an existing topical's *Key decisions* section. A short defensive footgun belongs in `## Gotchas`.

**Soft caps:** `memory.md` ≤50 entries (~80 lines); `memory/<topic>.md` ≤2 pages (~150 lines). Past either, split.

**Prune:** delete topicals invalidated by refactors / framework changes / convention shifts. `memory/` is alive, not a graveyard.

**Graceful degradation for Gotchas:** if `## Gotchas` ever outgrows its slot (~30 entries / 50 lines), migrate it to `memory/gotchas.md` and add a `gotchas` pointer to `memory.md`.

### Gotchas vs Memory — the real distinction

Length is a *consequence*, not the criterion. The two stores serve different **purposes** and have different **shapes**:

| | **`## Gotchas` (in CLAUDE.md)** | **`memory/<topic>.md`** |
|---|---|---|
| **Purpose** | Defensive warning | Explanatory knowledge |
| **Voice** | "Beware…" / "Don't…" / "Note that…" | "Here's how…" / "Here's why…" |
| **Posture** | Reactive — alerts to a footgun | Proactive — builds understanding |
| **Always loaded?** | Yes — short, in `CLAUDE.md` | No — Read on demand when topic relevant |

**Decision test:**
- Phrasable as *"Beware:"* / *"Don't…"* / *"Watch out for…"*? → **Gotcha** (`CLAUDE.md` `## Gotchas`).
- Phrasable as *"Here's how X works"* / *"Here's why we picked Y"* / *"To do Z, follow these steps"*? → **Memory** (`memory/<topic>.md`).

**Examples:**

| Lesson | Goes where |
|---|---|
| "Tests need a live Postgres — run `docker compose up -d db` first." | `## Gotchas` (defensive, one-line) |
| "Imports use `@/` aliases, not relative paths." | `## Gotchas` (defensive footgun) |
| "Auth flow: short-lived JWT + refresh in HTTPOnly cookie + library X for validation, picked over Z for latency reason W." | `memory/auth.md` (explanatory, multi-paragraph) |
| "Schema decisions: UUID v7 for PKs because…; migrations forward-only because…" | `memory/db.md` (explanatory, multi-decision) |

Length follows naturally from purpose: warnings are short ("don't do X"); explanations need room to breathe.
