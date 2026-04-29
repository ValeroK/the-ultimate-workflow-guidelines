# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Principles

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Workflow

**Plan first. Anchor in existing design. Confirm. Test-first. Confirm. Implement. Consult on blockers. Update project docs.**

The Workflow *operationalizes* the Principles — each step cites the principle it applies instead of restating it.

For any non-trivial task, follow this loop:

1. **Understand.** Restate the request in your own words. Name the goal.
   - *Applies Think Before Coding.*
   - **Why:** restating surfaces silent misinterpretations before they become code.

2. **Plan document on disk.** Create `PLAN-<feature>.md` (template: `skills/the-ultimate-workflow-guidelines/references/plan-template.md`). It must include:
   - Feature description and goal.
   - Files you explored and why they matter.
   - **Existing-design review** — the patterns, utilities, frameworks, and conventions already in use that this feature touches. Prefer reusing them.
   - **Deviation justification (if any)** — if you propose a different pattern, library, or approach than what the project currently uses, name the current pattern, the alternative, and list pros/cons for both. Let the user decide.
   - Open questions.

   **If the project has bootstrap docs** (`PRD.md`, `ROADMAP.md`, `CLAUDE.md`, `progress.md` produced by `project-bootstrap-guidelines`), read them as part of the existing-design review. `PRD.md` tells you *what* the project is meant to do; `CLAUDE.md` carries the project's frameworks, conventions, and `## Gotchas` (mistakes prior sessions learned not to repeat).

   **If the project has a `memory.md` index**, read it. For each topical pointer whose **Read when** cue plausibly matches the feature, read the corresponding `memory/<topic>.md` before drafting the plan. Topical memory often contains the rationale ("why this pattern?") that turns a deviation-justification question into a one-line answer. See *Memory* below.

   **Stop and ask for confirmation before moving on.**
   - *Applies Think Before Coding and Surgical Changes.*
   - **Why:** a plan on disk survives context compaction; chat threads don't. Confirming before code means rework happens on paper, not in the editor.

3. **Test plan.** Extend the plan file with a "Tests" section — what to test, how, what counts as "done". Raise any remaining questions. **Stop and ask for confirmation.**
   - *Applies Goal-Driven Execution.*
   - **Why:** "what would prove this is done" is cheaper to negotiate on paper than on code that already exists.

4. **Implement.** Add the tests first. Make the minimal change. Run tests until green. Keep the plan file current as facts change.
   - *Applies Simplicity First and Surgical Changes.*
   - **Why:** tests-first makes the loop verifiable; minimal + surgical keeps every diff line traceable to the user's request.

5. **Blocker protocol.** If something doesn't add up mid-implementation — missing info, conflicting requirements, an unexpected constraint — **stop**. Surface the problem, present 2–3 options with tradeoffs, wait for the user to decide. Do not silently pick.

   Once the user picks a direction, before resuming implementation:
   - **Update the plan file** to reflect the new direction and the decision made.
   - **Update the test plan** — tests written against the old direction may now be wrong; revise them.
   - **Check already-written implementation** — code written before the blocker may now be obsolete or need revision.
   - **Decide whether deeper investigation of existing code is needed** before continuing (e.g. the blocker revealed the codebase works differently than assumed). If so, pause and investigate before resuming.
   - If the blocker revealed a durable lesson (not a one-off), flag it for step 6.

   - *Applies Think Before Coding.*
   - **Why:** pre-blocker code rests on assumptions the blocker just invalidated; re-checking is cheaper than the bug it would ship.

6. **Update project docs (if they exist).** After landing the feature:
   - Append a dated entry to `progress.md` summarizing what changed and any decisions made.
   - If the feature closed a milestone in `ROADMAP.md`, mark it done.
   - If frameworks or conventions shifted, update `CLAUDE.md`'s architecture or best-practices sections.
   - If you hit a repeating issue during the feature (see `## Gotchas` threshold below), append a short entry to `CLAUDE.md`'s `## Gotchas` section.
   - If the feature surfaced **longer-form** explanatory learning (architectural mental model, key decision + rationale, runbook), create or update `memory/<topic>.md` and add a pointer to `memory.md` if it's a new topic. One-liners still go to `## Gotchas`. Before deleting the per-feature `PLAN-<feature>.md`, scan it for durable learnings worth migrating. See *Memory* and *Gotchas vs Memory* below.
   - **Why:** the durable learning from a session has to land somewhere durable, or the next session re-derives it.

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

Topicals live at the repo root as a slim **`memory.md`** index plus per-topic files under **`memory/`**. Template: `skills/the-ultimate-workflow-guidelines/references/memory-template.md`.

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

### When to skip this workflow

Use judgment. Skip for:
- Typo or formatting fixes.
- Single-line bug fixes with an obvious cause.
- Pure-doc edits (README tweaks, comment rewording).
- Trivial renames or moves with no behavioral change.

When in doubt, err toward the workflow.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Key files

- **`memory.md`** — Slim index of topical knowledge for this repo (lazy-loaded topicals under `memory/`). Source of truth for *how this works and why we did it that way*. Distinct from `## Gotchas` below: `memory/` carries explanatory knowledge, `## Gotchas` carries defensive warnings.
- **`README.md`** — Repo entry point, with the install paths for Claude Code / Cursor / Claude Desktop.
- **`CURSOR.md`** — Cursor-specific install/setup notes.
- **`PLAN-<feature>.md`** (per feature, transient) — Per-feature plan produced by the workflow above.

## Gotchas

> **Defensive warnings** ("Beware:…", "Don't…", "Note that…"). Threshold, format, and pruning rules are defined in the Workflow section above. Longer-form **explanatory** knowledge ("here's how X works", "here's why we picked Y") belongs in `memory/<topic>.md`, not here.

<!-- Add entries as repeating issues surface. Example shape:

- **Rule in one line.** Short explanation of why. *(Discovered YYYY-MM-DD, hit Nx.)*

-->

