---
description: Before a commit - re-ask which domain experts apply to the real changes (it can only add), run them, and record the evidence the commit gate checks. Writes nothing to the code.
argument-hint: "[--plan <plan file>]"
---

# Phase: experts (the check before a commit)

This is the review command with only the domain experts running, which is fast enough to do before every commit. When the commit gate refuses a `git commit` with "Gate G6", this is the command it means; run it without asking the user, then commit again.

**First, when the plan has a `test_command`, run the full tests:** `node "${CLAUDE_PLUGIN_ROOT}/hooks/verify.js" --full --if-stale`, and fix them until they pass. It does nothing, and says so, when a passing full run (the build's last one, for example) already covers these exact changes. A commit needs both a passing full run (G7) and this check (G6) on the same changes; a test run that rewrites files after the experts have reviewed would make their review stale and cost a whole recheck. Files a test run always rewrites belong in the plan's `volatile_paths`.

Then read `${CLAUDE_PLUGIN_ROOT}/commands/review.md` and follow it exactly, with these differences:

- the range is always `working` (the uncommitted changes);
- step 3's prepare is `prepare --range working --delta > .ultimate-workflow/run/prepare.json` (the `--delta` is required here). When the last experts check covers the earlier changes, it narrows each of those experts to the files that changed since and the files in the diff that use them, and their findings on other files carry forward. Tell the user which: `delta` (the files, and the chain count) or `deltaRefused` (the reason it reviews everything this time). Nothing else changes: the record is still for the current changes;
- pass `"expertsOnly": true`, so the four core lenses do not run;
- the plan file is the one in `$ARGUMENTS`, or the single `PLAN-*.md` at the root not marked `phase: done`, or none.
- the ledger step uses `--phase experts`, and records no catches.

If `record` printed open findings, do not run `check` yet and do not commit: follow "High-confidence findings are raised and resolved" in the review command. Raise each finding to the user and wait for their decision. You may not skip this because the commit was the goal.

When the evidence is recorded and nothing is open, confirm it with `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" check [--plan <plan file>]`. It prints `{"ok":true}` and exits 0 when the commit gate would allow a commit now, and prints the reason and exits 1 when it would not. Report that result. If it is blocked, the reason names what is missing; do not commit, and do not edit evidence files by hand.

Any change to the code after this runs makes the evidence stale: the gate will ask for this again, which is intended.
