# Scope and surgical change

Use this when a diff touches files the request or plan does not mention, mixes a refactor with a behaviour change, or looks large for the task it states. The question is whether every changed line is needed by the task.

## The line-by-line test

For each hunk, ask: does the request or the plan require this exact change? Classify it:

| Kind | Example | Verdict |
|---|---|---|
| Required | The fix, the feature, its test, its migration | Keep |
| Made necessary by the change | An import the change now needs; removing an import or helper the change itself made unused | Keep |
| Drive-by edit | Reformatting, renaming, rewording comments or docstrings, reordering imports in code the change does not otherwise touch | Change outside the task |
| Opportunistic refactor | Restructuring nearby code "while here" | Change outside the task |
| Speculative addition | A flag, option, hook, parameter or configuration no requirement asks for | Change outside the task (and speculative generality) |
| Defensive code for an impossible case | A check the types or the callers already rule out | Usually noise; report only with a cost |
| Pre-existing dead code removed | Deleting code the change did not make unused | Change outside the task, unless asked |

A drive-by edit is a finding because it costs something concrete: a harder review, a revert that cannot take the fix without the noise, and an unreviewed change shipped under the cover of a reviewed one. Cite the request or plan line it goes beyond.

## Narrowest responsible layer

A fix belongs in the layer that owns the wrong behaviour. A symptom patched one layer up (deduplicating in the UI what a query duplicates, catching in a caller what a function should not raise) leaves the cause in place and spreads knowledge of it. Report it when the diff shows both the symptom fix and where the cause lives.

## Signals of scope creep

- More files changed than the task names, with no plan line explaining them.
- A rename or move in the same change as a behaviour fix.
- Formatting churn in files touched for one line.
- A new configuration value, environment variable or feature flag that the request did not mention.
- Tests rewritten beyond the behaviour that changed.

## Not a finding

- Changes the plan lists, even when they look broad.
- Formatting applied by the repository's formatter to the lines the change touched.
- Removing what the change itself made unused.
- Updating the docs or the changelog that describe the changed behaviour.
- A typo fix in a line the change already edits.
