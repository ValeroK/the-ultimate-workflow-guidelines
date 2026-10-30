---
description: Report what the workflow cost and what the experts and skills contributed in this repository, from the value ledger - tokens and time per phase, catches by stage and origin, the experts' confirmed unique catches and their precision, review findings by basis, skills loaded and never cited, and the workarounds sessions needed. Reads the ledger only; changes nothing.
argument-hint: ""
---

# The value ledger report

Run, from the repository root:

```
node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger report
```

It prints JSON from `.ultimate-workflow/ledger.jsonl`, which every phase command appends to. If it says the ledger is empty, say so: no phase has recorded a run here yet. Do not run a phase yourself.

## Report

1. **Cost:** total tokens, time and runs, then per phase.
2. **Catches:** per stage (total, confirmed, refuted, open) and by origin. Then the experts' unique catches, those no draft check, critic or core lens caught: confirmed, refuted and `precision` (confirmed over confirmed plus refuted; `null` until one is judged). List the open ones with their ids, so the user can confirm or refute them.
3. **Review:** findings by basis and `skillShare`, the share that cites a skill; then `neverCited`, the skills loaded on every review run and cited on none.
4. **Workarounds:** each with its phase and run. These are plugin problems, not the user's.

Then, in at most three sentences: where the cost went, and whether the experts' catches and the skills' citations justify it. Two signals are worth naming: a high cost with few confirmed unique catches, and skills that load on every run and are never cited.

## Limits to state

The ledger holds what sessions recorded. A catch's origin, and whether it was unique to the experts, is the user's or the session's judgement, recorded as said. It cannot show what would have been caught without the plugin; that needs a comparison run. Say this once, at the end.
