# PLAN: <feature>

> Canonical skeleton for the per-feature plan file produced by `the-ultimate-workflow-guidelines`.
> Copy this file to `PLAN-<feature>.md` at the repo root (or wherever the project keeps plans) and fill in every section. Delete sections only if they genuinely don't apply — don't silently skip.

## Feature description

One or two sentences. What is being built, for whom, and the user-visible outcome.

## Goal / success criteria

What "done" looks like in verifiable terms. If this is a bug fix, the success criterion is usually a failing test that now passes. If it's a feature, list the behaviors that must be true.

## Files explored

| File | Why it matters |
|---|---|
| `path/to/file.ts` | What this file does and how the feature touches it. |
| `path/to/other.ts` | … |

## Existing-design review

The patterns, utilities, frameworks, and conventions already in use that this feature touches. Prefer reusing them.

- **Convention X** — where it lives, how the feature will reuse it.
- **Utility Y** — at `path/to/y.ts`, does Z; the feature will call it instead of writing a new one.
- **Framework Z config** — relevant bits the feature must respect.

## Deviation justification (if any)

Only fill in if you're proposing a different design pattern, library, or approach than what the project currently uses.

- **Current pattern:** <what the project does today>
- **Proposed alternative:** <what you want to do>
- **Pros / cons:**
  - Current: …
  - Proposed: …
- **Recommendation:** <your take, but let the user decide>

If there is no deviation, write: *None — reuses existing patterns.*

## Open questions

- …
- …

---

## Tests

> Fill this section in during step 3 of the workflow, **before** implementation. Confirm with the user before coding.

### What to test

- Scenario 1 — inputs, expected outcome.
- Scenario 2 — …
- Edge cases — boundary values, error paths, empty inputs.

### How to test

- Framework: <the project's test framework>.
- Location: `path/to/test/file.test.ts`.
- Fixtures / setup: …

### Done definition

- All listed tests pass.
- No new test failures in unrelated suites.
- <any additional acceptance criteria>

---

## Implementation notes (filled in as you go)

Keep this section current. When facts change, update it. When a blocker fires, record the decision here along with the updates made to the tests and any already-written code.

## Blockers hit

Record each blocker: what surfaced, the options presented, the user's pick, and the artifacts updated as a result (plan section, tests, existing code).
