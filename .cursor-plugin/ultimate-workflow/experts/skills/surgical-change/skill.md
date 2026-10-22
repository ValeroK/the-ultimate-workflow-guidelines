---
name: surgical-change
description: Use when a change touches files the request or plan does not mention, mixes a refactor with a behaviour change, or looks large for its task - whether every changed line is needed. Always included, because no file name shows it.
verified: 2026-10-20
---

# Scope and surgical change

## Goal

- **Lets the expert catch:** lines a change does not need (drive-by edits, refactors, speculative options) and a fix placed one layer above the cause.
- **Applies to:** every build and review; it is always included.
- **Not for:** whether the request itself is right (the user, at plan); tests rewritten beyond the change are reported with quality named as owner.

Sources: **[T]** upstream community skills and agents, not checked (see `NOTICE.md`); **[O]** our own reasoning. A row is a prompt to check against the plan, not a finding on its own.

## First, establish the target

- **The request and the plan lines** each hunk serves. A change the plan lists is in scope, however broad.
- **The repository's formatter,** so formatting it applied to touched lines is not counted.

## The line-by-line test

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A drive-by edit costs a harder review, a revert that cannot take the fix without the noise, and an unreviewed change shipped under a reviewed one; cite the plan line it goes beyond [T] | Reformatting, renames, reworded comments or reordered imports in code the change does not otherwise touch | The formatter applied to the lines the change edits |
| A refactor in the same change as a behaviour fix hides the behaviour change [T] | A rename, move or restructure beside a fix, with no plan line for it | The plan asks for both, as separate steps |
| A flag, option, environment variable or hook no requirement asks for is speculative [T] | A new configuration value the request does not mention | The plan names its second user |
| Defensive code for a case the types or callers rule out is noise; report only with a cost [O] | A null check on a value the type makes non-null | A boundary that receives external input |
| Deleting dead code the change did not make unused is outside the task [T] | Removed functions unrelated to the change | The plan asks for the cleanup |
| Fix the layer that owns the wrong behaviour; a symptom patched one layer up leaves the cause in place [T] | Deduplication in the UI of what a query duplicates; a caller catching what a function should not raise | The owning layer belongs to another team and the plan records why |
| More files than the task names, with no plan line, is the signal to run the test above [O] | A one-line fix touching six files | |

## Not a finding

- Changes the plan lists, even when they look broad.
- Removing what the change itself made unused.
- Updating the docs or the changelog that describe the changed behaviour.
- A typo fix in a line the change already edits.
- An import the change now needs.
