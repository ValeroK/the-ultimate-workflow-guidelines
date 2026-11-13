# Simplify the plugin: agreed direction (2026-11-13)

Agreed with the owner in chat on 2026-11-13. Input for `/ultimate-workflow:plan`; not a plan a run can start. The map of the plugin as it is (every step, check and state file, with diagrams) is the artifact https://claude.ai/artifact/4K2rR5quzGATXF9nAnQ9Zo. The faults and concerns found while building 4.8.0 are in `internal/plans/followups-after-4.8.0.md`.

## Value proposition

An AI coding assistant that plans before it codes, proves the work with tests, and gets a second opinion from domain experts, while the user decides at only two points: the plan and the tests.

For developers who use an AI coding assistant on real projects and want fewer wrong or oversized changes, without babysitting every step.

What makes it different:
- The user confirms intent (plan, test plan), not every step; after that it works on its own and comes back only for real blockers.
- Proof, not promises: a test is written first and seen failing, then the code makes it pass, and the full suite is green before a commit.
- Experts only where the change touches their area, with vetted checklists.
- Lessons from each feature are kept and come back when a later change touches the same area.
- Nothing to install: Node only, five host apps, three operating systems.

## Goals, each with a check

1. Two decisions for the user (plan, tests). Anything else that asks must be a real blocker or a decision the plan does not cover. Check: questions per feature; target 2, plus at most 1 for a real blocker.
2. Never stuck: no check blocks for something the session did not do or cannot fix; every stop names the next action. Check: zero stuck stops of the kinds hit in 4.8.0.
3. Predictable cost: each step is paid once, and the cost is shown before and after. Check: a typical feature at a stated budget; no step repeated on a resume.
4. Correct changes: every change traces to the plan; every behaviour has a test that would fail without it. Check: the review finds no out-of-plan change and no test that cannot fail.
5. Experts earn their place: catches and cost per expert are measured. Check: the value report per expert.
6. Simple to understand: one place for each decision (experts chosen once, one review, one commit check, one state file). Check: the map shrinks from 13 checks and 30+ state files to a handful of each.
7. Works everywhere: Node only, no install; on hosts that cannot block, it reminds.

Not goals: replacing CI or human review; enforcing on hosts that cannot block; unattended runs on the plugin's own code.

## Owner decisions

1. **One blocking check, at commit; everything else reminds.**
   - During work: reminders only (plan or tests not confirmed yet, code changed with no test run since). Nothing is refused, and a turn can always end.
   - At `git commit`, one check, one function, used by the hook and by the unattended run alike. It refuses unless: plan and tests confirmed; a full test run passed on exactly these changes; the experts reviewed these changes and no high-confidence finding is open; the memory files are not newly broken. The refusal lists what is missing and the one command that fixes each item.
   - Goes away: the edit-time blocks (G1, G2, G6 at edit), the turn-end block (G3), the round cap and escalation (G4/G5), the dirty, round, escalated and violation flags, and the heartbeat, unless one is still needed for the reminders.
   - Accepted cost: the assistant may edit before confirmation if it ignores the reminder; such work cannot be committed until both confirmations exist.
2. **Keep the unattended run**, built on the same review, harvest and commit check as the by-hand flow, with no separate copies (today the run has its own experts check, its own 4-lens review and its own harvest).
3. **Keep all 9 experts and the 50 skills.** Measure each; do not cut now.

## What the plan should cover

- What to keep, merge or remove, from the map's section 7 ("where it is complicated"): expert selection at one point plus add-only growth at review; one review and one harvest implementation; one commit check; one "tests passed" model (the fingerprint in `verify.json`); one resume form if possible; one front-matter parser and one add-only merge; one state file where possible.
- The order of the work, so the plugin stays usable after each step.
- How we check that nothing important is lost: the guarantees at commit stay tested, and the user-facing commands keep working.
- Migration for existing projects (old plan fields, old evidence files).
- Size and cost before and after.

## Current state when this was written

- Branch `uw/run/run-fixes` (on top of `uw/run/memory-index`): 4.8.0 complete and green (1434 tests, 1430 pass, 0 fail, 4 skipped), not pushed. The owner said not to push yet.
- The installed plugin reads from a frozen copy at `C:/Users/kobiv/Projects/uw-plugin-snapshot` (git worktree at 53d135f) through a local marketplace. To be switched back to the GitHub marketplace after the release.
- Gates are off for this repo: `ULTIMATE_WORKFLOW_GATES=off` in `.claude/settings.local.json`. To turn back on after the simplification.
- Do not run the unattended run on this repo's own code (owner decision); build the simplification by hand, test first.
