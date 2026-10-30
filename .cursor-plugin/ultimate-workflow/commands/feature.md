---
description: Build a feature or a PRD end to end with the workflow, choosing how much of it the change needs (skip, light or full), running each phase in order and stopping only for the user's two confirmations, a blocking finding or a real failure. Use this for any feature request instead of calling the phases one by one.
argument-hint: "<what you want built, or a PRD to start from>"
---

# Feature: the whole workflow in one command

`$ARGUMENTS` is what the user wants. Run the workflow for it from start to finish, and stop only where this file says. Each phase is run by reading its command file under `${CLAUDE_PLUGIN_ROOT}/commands/` and following it exactly, as if the user had typed it. Nothing here replaces a phase's own steps, including its ledger step.

## 1. Choose the tier, and say which

Decide from the request and the code it touches, then tell the user the tier in one line with the reason. The user can overrule it in their reply; otherwise go on.

| Tier | When | Flow |
|---|---|---|
| **Skip** | A typo, formatting, a one-line fix with an obvious cause, a pure doc edit, a rename with no behaviour change | Make the change directly. No plan, no phases. Stop here. |
| **Light** | A small feature or fix: a few files, the scope is clear, no new module, contract, schema or external service | plan (no experts), tests, build, experts check |
| **Full** | A new feature with real scope, anything that changes a contract, schema, security or infrastructure, anything split into cards, a PRD or a new project | plan (with experts), tests, build per card, review, experts check, harvest |

When unsure between light and full, choose full.

**A PRD or a new project** is full, and is more than one plan. First follow the `project-bootstrap-guidelines` skill: it writes and reviews `PRD.md`, the design and `ROADMAP.md` with the user, and stops at each. Then run the full flow once per roadmap milestone, in order, each with its own `PLAN-<milestone>.md`; never one plan for the whole PRD. If `PRD.md` and `ROADMAP.md` already exist, skip the bootstrap and start at the next milestone that is not done.

## 2. Run the phases

**Light**
1. `plan.md`, with an empty expert list: pass `available` as `[]`, so no expert is consulted at plan. After the user confirms, record `experts: []` with `experts.js select --plan <plan file> --add ""`. **Stop for the user's confirmation of the plan.**
2. `tests.md`. The critics and the experts that join the tests stage (quality always does) still run: on real cards this stage caught most of the defects. **Stop for the user's confirmation of the Tests section.**
3. `build.md`.
4. `experts.md`, the check before a commit.

**Full**
1. `plan.md`. If the work splits into cards, the first card is the harness that needs the running system, when there is one. **Stop for the user's confirmation of the plan.**
2. `tests.md`. **Stop for the user's confirmation of the Tests section.**
3. `build.md`, once per card, in order, with `brief --section "<card heading>"`.
4. `review.md` on the whole change.
5. `experts.md`, the check before a commit.
6. `harvest.md`. Its proposals wait for the user, as that command says.

## 3. When to stop

Stop and hand over to the user, with what happened and what you need, only for:

- the two confirmations above, which are the user's and never yours;
- an open high-confidence finding (the experts command says how it is raised; never dismiss one yourself);
- a build that escalates after three failed rounds;
- a gate refusal you cannot satisfy by following the phase that it names;
- a run that fails after the one retry the phase commands allow.

Anything else (choosing the next phase, the ledger step, the experts check before a commit) is yours to do without asking.

## 4. At the end

For a roadmap milestone, mark it done in `ROADMAP.md` and add a dated entry to `progress.md` (what was built, what was decided, what is next), so the next session starts at the next milestone.

Run `${CLAUDE_PLUGIN_ROOT}/commands/value.md` for this feature's runs, and give the user:

- what was built and where;
- the experts check result;
- what it cost: the ledger's tokens and time;
- the catches it recorded;
- any workarounds you needed.

Commit only if the user asks. The experts check has already made the commit possible.
