---
phase: implement
plan_confirmed: true
tests_confirmed: true
test_command: node --test "hooks/**/*.test.js"
verify_rounds: 0
last_verify: green
dirty: false
escalated: false
gate_violation: 
---

# PLAN: graph-native

> Rebuild of the enforcement approach, for Claude Code. Supersedes the
> gates-first sequencing in [PRD-graph-orchestration.md](PRD-graph-orchestration.md)
> section 10.1 (Q2). The PRD's *design* still stands; its *priority order* was wrong.

## The change in one line

**Stop intercepting a free-running agent. Start running each phase as its own invocation, with its own fresh context and its own tools.**

## Why

Seven of nine defects found building the gates were in the vendor hook surface, not the workflow logic. Interception requires perfect coverage across four hosts forever, and it fails *silently* — we found three separate routes to "installed but enforcing nothing" in a single session.

The research points the other way. A survey of 110+ agent systems finds harness design swings performance by up to **6x** on a fixed model. Vercel found **removing 80% of tools beat any model upgrade**. CAAF argues determinism belongs in the harness, explicitly not in prompts or model conditioning. And spec-driven development converged independently on our exact phase sequence with human checkpoints.

The insight we missed: **the enforcement problem is an artifact of running one long agent.** If each phase is a separate invocation, ordering is structural. You cannot skip phase 3 when phase 3 has not been started. There is nothing to prevent.

## The design

### Five commands, one per phase

Each reads `PLAN-<feature>.md`, does one phase, updates it, and **stops**. The user drives the sequence; the artifact carries the state.

| Command | Shape | Fan-out? |
|---|---|---|
| `/ultimate-workflow:plan` | Readers over subsystems, bootstrap docs, matching `memory/` topicals; synthesize existing-design review and deviations; write the plan | **Yes** — breadth |
| `/ultimate-workflow:tests` | Draft the Tests section, then diverse critics attack it (coverage, edge cases, oracle quality, runnability); merge | **Yes** — diverse lenses |
| `/ultimate-workflow:build` | Pipeline over plan tasks: tests first, minimal change, deterministic verify, isolated-context reflect on red, round cap 3, escalate | Only when tasks are independent |
| `/ultimate-workflow:review` | Four lenses (correctness, simplicity, **surgical scope**, coverage), then adversarially verify each finding | **Yes** — orthogonal lenses |
| `/ultimate-workflow:harvest` | Read plan + diff + progress; classify each learning by the Gotcha-vs-Memory test; propose concrete file edits | **Yes** — fresh context |

`review`'s surgical-scope lens is the first real enforcer the Surgical Changes principle has ever had: one agent whose only job is to ask, per changed line, whether it traces to the request.

**Optional extra lenses.** The four core lenses always run. `/review` also accepts opt-in ones so cost scales with need:

```
/ultimate-workflow:review --lenses security,performance,accessibility
```

Lens definitions can be mined from [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), which catalogues 230+ role-separated specialists. Useful as **source material, not as a dependency**: those files carry no `tools:` restrictions (so they cannot provide the write-isolation this design rests on), use display names rather than slugs, and are emoji-laden.

One pattern in that repo to deliberately **not** copy: several reviewers are told to "default to finding 3-5 issues". An agent given a quota meets the quota, real or not. The correct adversarial stance is the inverse — a skeptic whose job is to *refute* a finding and who defaults to refuted when uncertain. That kills false findings rather than manufacturing them.

`harvest` is the highest-leverage of the five. Step 6 is the workflow's weakest link today precisely because doc-updating happens at the end of a long, tired session. Fresh agents reading the plan and the diff fix exactly that.

### Five subagents, and only one can write

Tool restriction is a hard refusal: Claude Code rejects the call and the subagent cannot proceed. Shipped in `agents/`, invoked from workflows via `agentType`.

| Agent | `tools` | Can write? |
|---|---|---|
| `uw-explorer` | Read, Grep, Glob | **No** |
| `uw-critic` | Read, Grep, Glob | **No** |
| `uw-reviewer` | Read, Grep, Glob, Bash | **No** |
| `uw-harvester` | Read, Grep, Glob, Bash | **No** |
| `uw-implementer` | Read, Write, Edit, Bash | Yes |

Note the framing: this is **subtraction, not restriction**. A smaller tool space produces better exploration (Vercel's finding), and the safety property is a free consequence. That matters, because a mechanism justified by quality survives a host changing its permission model; one justified only by enforcement does not.

Path-scoped restriction — "write tests but not source" — is **not expressible** by tool name. That is what the existing `gate.js` is for, and a subagent definition can carry its own scoped `hooks:` block. So the gate moves from a session-wide registration into the implementer agent, where it is narrow and cannot be silently missing.

### The artifact stays as it is

`PLAN-<feature>.md` with front matter. It already proved itself this session: it survived compaction, carried the blocker log, forced the deviation justification, and stayed writable while source was blocked.

**One addition:** the Tests section names the expected test names, not just the command. That turns "is this done" from a judgment into a computation any phase can run — the answer to spec-drift, and it needs no hooks.

### Gates: demoted to opt-in

Keep the code. Change the claim.

- **Opt-in** via `ULTIMATE_WORKFLOW_GATES=on`, not on by default.
- **Claude Code only.** Cursor marked experimental and detect-only; Codex and Gemini adapters not shipped until someone records fixtures.
- Sold as a backstop for **ad-hoc work outside the phases**, which is most work — not as the enforcement story.

This reverses the earlier decision to ship gates on by default across four hosts. That decision was made on a reach argument that the measurements did not support: full enforcement on one host, partial on one, unverified on two.

### Cursor stays on the pre-gates workflow

Decided 2026-08-26. Cursor gets the plugin exactly as it was before this work began — the two skills and the `alwaysApply` rule, no gates, no hooks. Concretely:

- `.cursor/hooks.json` removed.
- The Gates section removed from `rules/*.mdc`, which is Cursor-only. Documenting gates there would describe something that never runs.
- The plugin **rename to `ultimate-workflow` is kept**, since that is orthogonal to enforcement.
- A deliberate mirror-discipline exception is now recorded in the README: the Gates section lives in `SKILL.md` and `CLAUDE.md` but not in `rules/*.mdc`. Without that note a later session would "fix" the drift and reintroduce the problem.

The Cursor adapter code stays in `adapters.js` with its measurements intact — it is tested, it costs nothing to keep, and it is the record of what was actually observed. It simply is not registered anywhere.

## Sequencing

**Step 0 — CONFIRMED 2026-08-26.** `agentType` inside a workflow does honour the definition's tool restrictions.

Two agents, run in parallel, each asked to create a file using only a file-writing tool. The restricted one used the built-in `Explore` type, so the probe needed no new files and no restart.

| | Restricted (`Explore`) | Unrestricted (default) |
|---|---|---|
| Has a write tool | **No** | Yes |
| File created | **No** | Yes |

Two findings beyond the yes/no:

- **The restriction covers the deferred tool registry too.** The restricted agent ran `ToolSearch` for `Write, Edit, NotebookEdit, MultiEdit, create_file` and got back "No matching deferred tools found". So a restricted agent cannot smuggle a write tool in through tool search.
- **`Bash` remains a write vector.** `Explore` has Bash and PowerShell, and a shell can obviously create files. The probe only proved the *file-writing tools* are gone.

That second point sets the honest frame for this whole design: **tool scoping is a strong guardrail against drift, not a security boundary.** Our threat model is a model that wanders, not one that is hostile. Removing Write and Edit removes both the obvious path and the intended path, which is what drift actually takes. A read-only agent that needs Bash — the reviewer, to run tests; the harvester, to run `git diff` — keeps a theoretical write route, and that is accepted rather than papered over. If it ever matters, a Bash-matched `PreToolUse` hook inside those agent definitions closes it.

**Step 1 — `/harvest` alone.** Highest value, lowest risk, touches no enforcement. Ship it, use it, learn the workflow-authoring ergonomics on something that cannot break a build.

**Step 2 — `/review`.** Second-highest value, still read-only. Together these two prove the graph earns its cost before anything writes.

**Step 3 — `/plan` and `/tests`.** The human-checkpoint phases.

**Step 4 — `/build`.** Last, because it is the only one that writes and the only one with a verify loop.

**Step 5 — demote gates**, update README and CHANGELOG, ship as v3.0.0.

Deliberately: **read-only phases first.** Every writing phase is a phase that can go wrong.

## Cost control

15x token cost is Anthropic's own measurement and it is real.

- Default `workflowSizeGuideline: small` (under 5 agents) for ordinary features; scale with an explicit `args.scale`.
- Fan out only over an enumerated, finite work list — never "keep looking until satisfied".
- Route mechanical stages to `effort: 'low'`.
- Every phase reports what it covered and what it skipped. No silent truncation.

## What we keep from `feat/hook-gates`

Nothing is thrown away:

- `hooks/lib/gates.js`, `state.js` — zero correctness bugs across the session. Become the implementer agent's scoped hook.
- `hooks/lib/heartbeat.js`, `hooks/status.js` — valuable regardless of which layer the gates live in.
- `hooks/dev/record.js` and the recorded fixtures — the only way anyone verifies a new host.
- The two `## Gotchas` entries and the measured Cursor findings — hard-won and true.
- `adapters.js`, `dispatch.js` — kept, but only the `claude` path ships until fixtures exist for the others.

## Open questions

1. **Shrink the always-on `CLAUDE.md` body?** Frontier models reliably follow roughly 150–200 standing instructions before compliance degrades; we ship 13KB, always loaded, competing with the user's actual task. If phases are commands, the phase prompt loads on demand and is the only instruction in play — so shrinking the always-on layer may *improve* compliance. High leverage, disruptive, and genuinely untested. Recommend running it as a separate experiment after step 2, not bundled in.
2. **Do the phase commands feel like control or like friction?** Five commands instead of one. Answerable only by using it, which is why `/harvest` ships first.
3. **Keep the four-host claim anywhere?** The prose layer genuinely does port. The graph does not. Proposal: say so plainly per layer rather than per product.

---

## Tests

Workflow scripts are orchestration, not logic, so most of them cannot be usefully unit-tested. Verification is therefore three things: a mechanism proof, a real run reviewed by hand, and no regression in what is already covered.

### Per phase, before it ships

1. **Mechanism proof.** Whatever new capability the phase depends on gets a throwaway probe first, the way step 0 did. Do not build on an assumption.
2. **Real run against this repo**, output reviewed by hand against the criteria below.
3. **`node --test "hooks/**/*.test.js"` still green** — 136 tests, none of which should be touched by workflow work.

### Step 1 acceptance: `/ultimate-workflow:harvest`

Run it against the work already on this branch, which is a good test case because the durable lessons are known in advance.

| # | Criterion | Why it matters |
|---|---|---|
| H1 | Writes nothing. Returns proposals only | The harvester has no write tool; this asserts the design, not just the config |
| H2 | Finds the BOM defect and routes it to `## Gotchas` | A one-line defensive footgun. The clearest Gotcha on the branch |
| H3 | Finds the "three routes to silent non-enforcement" reasoning and routes it to `memory/<topic>.md` | Explanatory, multi-paragraph, affects future work. The clearest Memory case |
| H4 | Does **not** propose a `progress.md` entry per commit | Noise. One dated entry per feature, not per commit |
| H5 | Returns **zero** proposals when run against a trivial docs-only change | The anti-quota check. A harvester that always finds something is worthless |
| H6 | Every proposal cites the specific commit, file, or plan section it came from | Unsourced proposals cannot be reviewed |
| H7 | Stays within the size guideline: under 5 agents for this repo | Cost discipline |

H5 is the one to watch. It is the failure mode of the reviewers in `agency-agents`, and the easiest for us to reproduce by accident.

### Done definition for step 1

- All seven criteria met on a real run.
- 136 existing tests still green.
- The agent definition and workflow script are the only new files.

## Implementation notes

**Step 1 complete, 2026-08-26 — `/harvest` shipped and validated on real work.**

Landed: `agents/uw-harvester.md` (Read, Grep, Glob, Bash — no write tool) and `workflows/harvest.js` (three readers in parallel, then one router; the barrier is justified because the router cannot dedupe against the existing stores until it has them).

Acceptance criteria, measured over two runs against `main..HEAD`:

| # | Result |
|---|---|
| H1 writes nothing | Pass |
| H2 BOM defect to Gotchas | **Criterion was wrong.** It was already recorded; the harvester correctly deduped rather than re-proposing |
| H3 silent-enforcement reasoning to memory | Deferred by the harvester as premature, with sound reasoning. Accepted |
| H4 no per-commit progress entry | Pass, twice, with a different reason each time |
| H5 no manufactured lessons | **Pass.** Run 2 re-surfaced all four Gotcha candidates and discarded every one as already recorded, citing line numbers |
| H6 every proposal sourced | Pass — commits, plan sections, line numbers |
| H7 under 5 agents | Pass — 4 |

Three proposals from run 1 were applied to `CLAUDE.md`. One of them was a **replacement**, not an addition: the harvester noticed the day-old hook-startup Gotcha had been invalidated by commit `a3200d7` removing `.cursor/hooks.json`. Nothing asked it to audit existing entries; it did so while deduping. That behaviour is now specified in the agent definition rather than left to luck.

**Cost: 158k subagent tokens and roughly 5.5 minutes per run.** Real money. `/harvest` is a once-per-feature command, not a casual one.

**Two runs on near-identical input produced different output.** The orchestration is deterministic; the agents inside it are not. Worth saying plainly rather than claiming repeatability more broadly than is true.

### Deferred: `memory/enforcement.md`

Run 2 proposed an enforcement topical plus its `memory.md` index pointer. **Held until graph-native lands**, on run 1's reasoning: the plan file is the live artifact carrying that knowledge, so there is nothing to rescue from deletion yet, and half the design it would describe is still unbuilt.

The generated draft was deliberately **not** saved. A stale topical is worse than a missing one, and regenerating it from the then-current state is exactly what harvest is for. At step 6 it should cover: the fail-open mental model, the measured routes to silent non-enforcement, the per-host scope decision with its rationale, why the unregistered adapters stay, and the tool-scoping properties from step 0.

## Blockers hit

**2026-08-26 — agent definitions are loaded at host startup, like hook config.**

The first `/harvest` run failed with `agent type 'uw-harvester' not found`, listing the built-ins as the only available types. The definition existed at `.claude/agents/uw-harvester.md`; the session had not loaded it.

- **Why it matters, and why it is good news:** this is the same restart constraint that cost twenty silent minutes with the gates. The difference is decisive. The gates failed *silently* -- nothing blocked, nothing logged, work proceeded. The workflow failed *loudly*, naming the missing agent type and listing what was available, within two seconds and for zero tokens. Same underlying constraint, opposite failure mode. That is the property the graph-native design was chosen for, and it showed up on the first run.
- **A defect it exposed in our own script.** `parallel()` turns a failed agent into `null`, so three dead readers produced an empty candidate list, and the script reported `"No candidates surfaced"` -- indistinguishable from a legitimately empty harvest. Acceptance criterion H5 and total failure had identical output. The same silent-failure pattern, reproduced in new code, written while explicitly designing against it.
- **Fixed:** the script now separates "readers did not run" from "readers found nothing", returns `ok: false` when every reader fails, and warns on partial coverage. Every phase written from here needs the same check; a null from `parallel()` is never evidence of absence.
- **Durable?** Yes, both halves. The restart requirement belongs in `## Gotchas`; the `parallel()`-null lesson belongs with the workflow authoring notes.
