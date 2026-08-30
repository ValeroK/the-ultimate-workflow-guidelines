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
