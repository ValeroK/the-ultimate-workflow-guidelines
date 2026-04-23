---
name: the-ultimate-workflow-guidelines
description: Plan-first, test-first workflow plus behavioral guidelines (think before coding, simplicity, surgical changes, goal-driven execution) for working inside an existing codebase. Plans must respect existing design; deviations require pros/cons for the user. Use when writing, reviewing, or refactoring non-trivial code.
license: MIT
---

# The Ultimate Workflow Guidelines

Behavioral guidelines plus a confirmed-at-each-step workflow, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Principles

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
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
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Workflow

**Plan first. Anchor in existing design. Confirm. Test-first. Confirm. Implement. Consult on blockers.**

For any non-trivial task, follow this loop:

1. **Understand.** Restate the request in your own words. Name the goal.

2. **Plan document.** Create a file on disk (e.g. `PLAN-<feature>.md`). It must include:
   - Feature description.
   - Files you explored and why they matter.
   - **Existing-design review** — the patterns, utilities, frameworks, and conventions already in use that this feature touches. Prefer reusing them.
   - **Deviation justification (if any)** — if you propose a different design pattern, library, or approach than what the project currently uses, name the current pattern, name the proposed alternative, and list pros/cons for both. Do **not** silently introduce a new pattern — let the user decide.
   - Open questions.

   **Stop and ask for confirmation before moving on.**

3. **Test plan.** Extend the same plan file with a "Tests" section — what to test, how, what counts as "done". Raise any remaining questions. **Stop and ask for confirmation.**

4. **Implement.** Add the tests first. Make the minimal change. Run tests until green. Keep the plan file current as facts change.

5. **Blocker protocol.** If something doesn't add up mid-implementation — missing info, conflicting requirements, an unexpected constraint — **stop**. Surface the problem, present 2–3 options with tradeoffs, wait for the user to decide. Do not silently pick.

   Once the user picks a direction, before resuming implementation:
   - **Update the plan file** to reflect the new direction and the decision made.
   - **Update the test plan** — tests written against the old direction may now be wrong; revise them.
   - **Check already-written implementation** — code written before the blocker may now be obsolete or need revision.
   - **Decide whether deeper investigation of existing code is needed** before continuing (e.g. the blocker revealed the codebase works differently than assumed). If so, pause and investigate before resuming.

### When to skip this workflow

Use judgment. Skip for:
- Typo or formatting fixes
- Single-line bug fixes with an obvious cause
- Pure-doc edits (README tweaks, comment rewording)
- Trivial renames or moves with no behavioral change

When in doubt, err toward the workflow.
