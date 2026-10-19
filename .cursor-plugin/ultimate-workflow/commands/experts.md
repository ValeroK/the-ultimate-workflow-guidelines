---
description: Before a commit - re-ask which domain experts apply to the real changes (it can only add), run them, and record the evidence the commit gate checks. Writes nothing to the code.
argument-hint: "[--plan <plan file>]"
---

# Phase: experts (the check before a commit)

This is the review command with only the domain experts running, which is fast enough to do before every commit. When the commit gate refuses a `git commit` with "Gate G6", this is the command it means; run it without asking the user, then commit again.

Read `${CLAUDE_PLUGIN_ROOT}/commands/review.md` and follow it exactly, with these differences:

- the range is always `working` (the uncommitted changes);
- pass `"expertsOnly": true`, so the four core lenses do not run;
- the plan file is the one in `$ARGUMENTS`, or the single `PLAN-*.md` at the root, or none.

When the evidence is recorded, confirm it with `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" check [--plan <plan file>]`. It prints `{"ok":true}` and exits 0 when the commit gate would allow a commit now, and prints the reason and exits 1 when it would not. Report that result. If it is blocked, the reason names what is missing; do not commit, and do not edit evidence files by hand.

Any change to the code after this runs makes the evidence stale: the gate will ask for this again, which is intended.
