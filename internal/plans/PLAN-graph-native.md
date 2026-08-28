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

## Sequencing (replanned 2026-08-28)

The original five-step order held up. What changed is the definition of done: the Day 1 paper named a gap that this plan did not have a word for, and living under the gates found four more.

### What is actually proven

| Phase | State | Evidence |
|---|---|---|
| Step 0, tool scoping | **Proven** | Restricted agent had no write tool, could not smuggle one via ToolSearch, created nothing |
| `/harvest` | **Proven** | Two runs. Found a Gotcha that had gone stale in a day. Manufactured nothing on the idempotency run |
| `/review` | **Proven** | Found four real defects in code with 136 green tests. Refuted 5 of 13 findings, one by live experiment |
| `/plan` | **Proven** | Four genuine deviations, ten open questions, one of which was a correct critique of this plan's own invariant |
| `/tests` | Written, never run | |
| `/build` | Written, never run | |

Two read-only phases paid for themselves. That was the thing worth learning before building the writer.

### The gap the paper named

> "Tests verify the deterministic parts of the system. Evals verify the parts that are not deterministic: did the agent take the right trajectory of steps, choose the right tools, and produce a final response that meets the quality bar. **Without both, the practice is always vibe coding, regardless of how sophisticated the prompts are.**"

We have 147 tests. Every one covers a pure predicate. **We have zero evals.** Nothing checks whether `/review` picks the right lenses, whether `/harvest` classifies Gotcha-versus-Memory correctly, or whether the verifier's refusals are sound.

The two runs that convinced us those phases work were **demos, not evals** — the exact distinction the paper draws for engineering leaders: "a working demo proves an agent can succeed once; a passing eval suite proves it succeeds reliably."

So by this plugin's own standard, the phases are vibe-coded. Shipping them as agentic engineering would be selling the discipline while not practising it.

That is the single largest change to this plan: **an eval harness is a precondition for v3.0.0, not a follow-up.**

### Three smaller gaps from the same source

**No model routing.** Every agent runs on the session model. `/review` cost 460k tokens, `/plan` 481k. The paper's advice is explicit: frontier models for architecture and initial implementation, cheaper ones for test generation, review, and CI monitoring. `agent()` already takes `model` and `effort`; we have used neither.

**The static/dynamic boundary was never reviewed.** `CLAUDE.md` is roughly 18KB and about 80 always-loaded instructions; `memory/` was empty until this commit. The paper says that boundary should be "reviewed and versioned like any other configuration". Ours grew in one direction by default.

**Observability stops at liveness.** The heartbeat answers "did a gate run". It does not answer "is this getting better or quietly drifting", which is what the paper means by observability. Cost per phase is knowable and unrecorded.

### What living under the gates taught, beyond the review

- `looksLikeShellWrite` scored three false positives and no true ones. **Guessing intent from a command string does not work**; the removal note is in `dispatch.js`.
- Backslash escaping through a `node -e` heredoc corrupted content **four separate times**, twice silently. Now a Gotcha, and the reason the fixture recordings for Cursor are gone.
- Multiple `PLAN-*.md` at a root is genuinely ambiguous. `readState` picks by mtime, which locked out a bug fix because an unrelated generated plan happened to be newest.
- Agent definitions load with **latency, not a restart** — the earlier conclusion was wrong and the Gotcha has been corrected once already.

### Revised order

**A. Eval harness.** A small labelled set per phase: inputs with known-right outputs. For `/harvest`, cases where the correct answer is a Gotcha, a topical, and nothing at all. For `/review`, a diff with a planted defect and a diff with none. Score trajectory as well as output: did it use the right lenses, did it refute what should be refuted. This is the precondition.

**B. Model routing and cost recording.** Route the mechanical stages down a tier, record per-phase cost in the run output, and re-run the evals to confirm quality held. Without A, this is unmeasurable.

**C. Run `/tests` and `/build` for real**, against the evals rather than a demo.

**D. Fix the plan-file ambiguity.** Either require one active plan or add an explicit key. It is a latent bug that has already bitten once.

**E. Review the static/dynamic boundary.** Move what is rarely relevant out of `CLAUDE.md` and into `memory/`, and measure whether compliance improves. The paper predicts it will.

**F. Then ship v3.0.0** — demote gates to opt-in, update README and CHANGELOG.

### What this reverses

The previous order shipped the five phases and treated evaluation as something the user does by reading output. That was the position the paper calls vibe coding, and it took an outside description to see it. Steps A and B now come before shipping anything.


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

### Step 2 acceptance: `/ultimate-workflow:review`

Run against the diff on this branch.

| # | Criterion | Why it matters |
|---|---|---|
| R1 | Writes nothing | The reviewer has no write tool |
| R2 | Every finding carries a file, a line, and a concrete failure scenario | A finding you cannot check is noise |
| R3 | The surgical-scope lens either names something that does not trace to the plan, or says plainly that everything does | This is the principle that has never had an enforcer |
| R4 | Refuted findings are listed separately, not silently dropped | The verifier must itself be auditable. Silent filtering is how a review starts lying |
| R5 | Zero findings is a clearly stated outcome, not an empty section | Same anti-quota rule as harvest |
| R6 | Under 8 agents at default rigor | `/harvest` cost 158k with 4. This must not become the expensive one by accident |
| R7 | `--rigor high` measurably changes the verification, and says so in the output | An option that does nothing visible is worse than no option |

R4 and R6 are the ones that will be tempting to compromise. Verifying every finding with three skeptics is more rigorous and roughly triples the cost; the default is one batch skeptic, with per-finding escalation behind `--rigor high`.

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
