---
description: Report whether the domain experts' skills came into play in the last recorded runs - for each expert, the skills loaded at plan, tests and review, the review findings by basis (a skill, the stage reference, or the model's own knowledge), the findings each skill led to, the skills loaded and never cited, and every cited skill or quote that failed its check. Reads the evidence only; changes nothing.
argument-hint: "[expert name]"
---

# Expert attribution

Run, from the repository root:

```
node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" attribution
```

It prints JSON from the evidence under `.ultimate-workflow/experts/`. If it lists no experts, no review has been recorded in this repository yet: say so, and that `/ultimate-workflow:review` or `/ultimate-workflow:experts` records one. Do not run a review yourself.

If `$ARGUMENTS` names an expert, report that expert only.

## Report

For each expert, in this order:

1. **When and what:** the time of the review record, and whether its fingerprint still matches the working tree (`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" fingerprint` prints the current one; a different hash means the code changed since).
2. **Skills loaded,** per stage (`loadedAt`). A skill not listed did not contribute to that run.
3. **Findings by basis:** skill, reference, general, missing. Give the counts and the share from skills.
4. **Findings per skill** (`bySkill`), and **skills loaded and never cited** (`uncited`).
5. **Failed checks** (`problems`): each finding id, file and line, its basis, and the check that failed. `unknown-skill` and `quote-not-found` mean the citation was not true; `not-loaded` means it named a skill that was not in its prompt; `missing` means it gave no basis.

Then, in at most three sentences: what the numbers say about whether the skills mattered in these runs. A high share of `general` findings, or skills that load and are never cited, are the two signals to name.

## Limits to state

A basis is the expert's own account of where a finding came from. It shows what a finding claims, not that the expert would have missed it without the skill; that needs the same change reviewed by a plain reviewer, by the expert without its skills and by the expert with them (the expert evals in this plugin's source repository). Say this once, at the end.
