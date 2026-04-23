# Karpathy-Inspired: The Ultimate Workflow Guidelines

> Check out my new project [Multica](https://github.com/multica-ai/multica) — an open-source platform for running and managing coding agents with reusable skills.
>
> Follow me on X: [https://x.com/jiayuan_jy](https://x.com/jiayuan_jy)

Two complementary skills plus a drop-in `CLAUDE.md` to improve Claude Code and Cursor behavior. The behavioral principles are derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls; the workflow and bootstrap procedures are layered on top.

## The Problems

From Andrej's post:

> "The models make wrong assumptions on your behalf and just run along with them without checking. They don't manage their confusion, don't seek clarifications, don't surface inconsistencies, don't present tradeoffs, don't push back when they should."

> "They really like to overcomplicate code and APIs, bloat abstractions, don't clean up dead code... implement a bloated construction over 1000 lines when 100 would do."

> "They still sometimes change/remove comments and code they don't sufficiently understand as side effects, even if orthogonal to the task."

## Two skills in this repo

- **[`the-ultimate-workflow-guidelines`](skills/the-ultimate-workflow-guidelines/SKILL.md)** — daily feature work inside an existing project. Four behavioral principles plus a confirmed-at-each-step workflow: plan → confirm → tests → confirm → implement → consult on blockers.
- **[`project-bootstrap-guidelines`](skills/project-bootstrap-guidelines/SKILL.md)** — starting a new project from scratch. PRD → design → framework choices → `CLAUDE.md` + `ROADMAP.md` + `progress.md`.

`project-bootstrap-guidelines` runs at project birth; once bootstrap docs exist, subsequent feature work uses `the-ultimate-workflow-guidelines`.

## Principles (used by skill 1)

| Principle | Addresses |
|-----------|-----------|
| **Think Before Coding** | Wrong assumptions, hidden confusion, missing tradeoffs |
| **Simplicity First** | Overcomplication, bloated abstractions |
| **Surgical Changes** | Orthogonal edits, touching code you shouldn't |
| **Goal-Driven Execution** | Leverage through tests-first, verifiable success criteria |

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

LLMs often pick an interpretation silently and run with it. This principle forces explicit reasoning:

- **State assumptions explicitly** — If uncertain, ask rather than guess
- **Present multiple interpretations** — Don't pick silently when ambiguity exists
- **Push back when warranted** — If a simpler approach exists, say so
- **Stop when confused** — Name what's unclear and ask for clarification

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

Combat the tendency toward overengineering:

- No features beyond what was asked
- No abstractions for single-use code
- No "flexibility" or "configurability" that wasn't requested
- No error handling for impossible scenarios
- If 200 lines could be 50, rewrite it

**The test:** Would a senior engineer say this is overcomplicated? If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting
- Don't refactor things that aren't broken
- Match existing style, even if you'd do it differently
- If you notice unrelated dead code, mention it — don't delete it

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked

**The test:** Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform imperative tasks into verifiable goals:

| Instead of... | Transform to... |
|--------------|-----------------|
| "Add validation" | "Write tests for invalid inputs, then make them pass" |
| "Fix the bug" | "Write a test that reproduces it, then make it pass" |
| "Refactor X" | "Ensure tests pass before and after" |

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let the LLM loop independently. Weak criteria ("make it work") require constant clarification.

## Workflow (used by skill 1)

**Plan first. Anchor in existing design. Confirm. Test-first. Confirm. Implement. Consult on blockers.**

For any non-trivial task:

1. **Understand** — Restate the request. Name the goal.
2. **Plan document on disk** (e.g. `PLAN-<feature>.md`) — include feature description, files explored, **existing-design review**, **deviation justification with pros/cons** if you propose anything different from current project patterns, and open questions. **Confirm with the user before moving on.**
3. **Test plan** — extend the plan file with a Tests section (what to test, how, what counts as done). **Confirm with the user.**
4. **Implement** — tests first, then minimal change, run until green.
5. **Blocker protocol** — if something doesn't add up mid-flight, **stop**. Surface the problem, present 2–3 options with tradeoffs, wait for the user to pick. Once they pick, update the plan file, update the tests, check whether already-written code needs revising, and decide if deeper investigation of existing code is needed before resuming.

**Skip for:** typo fixes, single-line bug fixes, pure-doc edits, trivial renames.

## Install

**Option A: Claude Code Plugin (recommended)**

From within Claude Code, first add the marketplace:
```
/plugin marketplace add <your-username>/the-ultimate-workflow-guidelines
```

Then install the plugin:
```
/plugin install the-ultimate-workflow-guidelines
```

This installs the guidelines as a Claude Code plugin, making both skills available across all your projects.

> Replace `<your-username>` with wherever you're publishing the marketplace. If you forked this repo, that's your own GitHub handle.

**Option B: CLAUDE.md (per-project)**

New project:
```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/<your-username>/the-ultimate-workflow-guidelines/main/CLAUDE.md
```

Existing project (append):
```bash
echo "" >> CLAUDE.md
curl https://raw.githubusercontent.com/<your-username>/the-ultimate-workflow-guidelines/main/CLAUDE.md >> CLAUDE.md
```

## Using with Cursor

This repository includes committed Cursor project rules so the same guidelines apply when you open the project in Cursor:

- [`.cursor/rules/the-ultimate-workflow-guidelines.mdc`](.cursor/rules/the-ultimate-workflow-guidelines.mdc) — `alwaysApply: true`.
- [`.cursor/rules/project-bootstrap-guidelines.mdc`](.cursor/rules/project-bootstrap-guidelines.mdc) — `alwaysApply: false` (greenfield-only, loaded on demand).

See **[CURSOR.md](CURSOR.md)** for setup, using the rules in other projects, and how this relates to Claude Code.

## Key Insight

From Andrej:

> "LLMs are exceptionally good at looping until they meet specific goals... Don't tell it what to do, give it success criteria and watch it go."

The "Goal-Driven Execution" principle captures this: transform imperative instructions into declarative goals with verification loops. The **Workflow** section builds on top of it: convert every non-trivial task into a plan document with confirmed success criteria before a single line of code is written.

## How to Know It's Working

These guidelines are working if you see:

- **Fewer unnecessary changes in diffs** — Only requested changes appear
- **Fewer rewrites due to overcomplication** — Code is simple the first time
- **Clarifying questions come before implementation** — Not after mistakes
- **Clean, minimal PRs** — No drive-by refactoring or "improvements"
- **Plan files committed alongside features** — One `PLAN-<feature>.md` per non-trivial change

## Customization

These guidelines are designed to be merged with project-specific instructions. Add them to your existing `CLAUDE.md` or create a new one.

For project-specific rules, add sections like:

```markdown
## Project-Specific Guidelines

- Use TypeScript strict mode
- All API endpoints must have tests
- Follow the existing error handling patterns in `src/utils/errors.ts`
```

## Tradeoff Note

These guidelines bias toward **caution over speed**. For trivial tasks (simple typo fixes, obvious one-liners), use judgment — not every change needs the full rigor.

The goal is reducing costly mistakes on non-trivial work, not slowing down simple tasks.

## License

MIT
