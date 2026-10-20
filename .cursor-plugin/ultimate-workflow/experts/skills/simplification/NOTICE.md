# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| addyosmani/agent-skills, `code-simplification` | MIT | Simplicity as comprehension rather than line count, the signal-and-simplification table, the traps of over-simplification, Chesterton's fence, tests that had to change as a sign of changed behaviour |
| anthropics/claude-plugins-official, `code-simplifier` (plugin and `pr-review-toolkit`) | Apache-2.0 | Preserve behaviour exactly; avoid nested ternaries; balance against over-simplification |
| affaan-m/ECC, `code-simplifier`, `refactor-cleaner` | MIT | Unwind single-use helpers; treat dynamic references as live before deleting |
| JuliusBrussee/caveman, `safe-refactor` | MIT | Keep feature changes outside the refactor; preserve interfaces, failure behaviour and ordering |
| github/awesome-copilot, `refactor-method-complexity-reduce` | MIT | Read; its instruction to extract helpers until a complexity number is met was rejected (see "Extracting helpers to meet a complexity number") |
