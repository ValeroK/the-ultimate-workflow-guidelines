# Authoring workflow phases

> How the five phase scripts are built, what the runtime forbids, and what
> each one costs.
> Last updated 2026-08-28.

## Mental model: the script holds the sequence, the agent holds the judgement

A workflow is a JavaScript program the runtime executes **out of the conversation's context**. Only its return value reaches the session. Loops, branches, and fan-out are ordinary code; each `agent()` call is one model invocation in a fresh context.

The rule that keeps this from becoming a pile of dispersed decisions: **agents produce findings; code and humans make decisions.** Every branch is a JS conditional or a human gate. No subagent chooses what runs next.

Phases are separate invocations rather than one script because the runtime cannot take mid-run user input — the documentation says plainly that for sign-off between stages, each stage should be its own workflow. The confirmation points are the product, so the decomposition is forced, and it is also correct: each phase is independently rerunnable and independently costable.

## Key decisions

- **The agent definition is the single source for a role.** It loads automatically when the agent spawns, on both hosts. The workflow prompt carries only the per-invocation task. An earlier plan proposed `phases/<name>.md` as a shared source; that cannot work, because a workflow script has no filesystem access and can never read one.
- **One definition serves both hosts.** `tools:` is the Claude Code allowlist; `readonly: true` is the Cursor equivalent. Each host ignores the other's key. Verified: all five types resolve on Claude Code with `readonly` present, and only `uw-implementer` can write.
- **Only one agent writes.** Four of five phases return proposals for a human to apply. Doc edits in particular accumulate silent noise when an agent can write them unattended, and a proposal you must accept is a proposal you actually read.
- **Refuted findings are returned, not dropped.** A verifier that silently filters cannot itself be audited, and a review that quietly discards has started lying by omission.
- **The verifier defaults to refuted when uncertain.** A false finding costs more than a missed one, because it burns trust in every true finding beside it. This is the deliberate inverse of the "default to finding 3-5 issues" pattern seen in some public agent collections — an agent given a quota meets the quota, real or not.
- **Barriers are justified only by cross-item need.** `/plan` and `/harvest` use one because synthesis and dedup genuinely need every reader's output at once. Elsewhere, pipeline.

## Common operations

- **Run a phase locally**, before it is installed as a plugin: invoke the Workflow tool with `scriptPath` pointing at `workflows/<name>.js`.
- **Add an agent type**: write `agents/uw-<role>.md`, copy it to `.claude/agents/` for local runs, and expect a delay before it resolves — a missing type fails loudly with the available list, which is the good failure mode.
- **Reconcile the local mirror**: `diff -r agents/ .claude/agents/`. The `.claude/` copy is gitignored, so CI cannot see it, and it has already drifted once — the local copy lagged the shipped one, so a behaviour recorded as validated had never actually been exercised.

## Runtime constraints

No filesystem or shell access from the script; no `import()`; `Date.now()`, `Math.random()`, and argless `new Date()` throw, because they would break resume. Up to 16 concurrent agents, 1000 per run. Subagents run in `acceptEdits` and inherit the session tool allowlist regardless of the session's permission mode.

## Gotchas (topic-specific)

- **A `null` from `parallel()` means that branch failed, not that it found nothing.** Merging nulls into a result list turns total failure into an empty result, byte-identical to a correct empty answer. Every script must return an explicit failure when all branches are null, and warn on partial coverage. This was reproduced in new code written while explicitly designing against it.
- **Resume replays in order.** Cached results stop at the first agent that did not finish, and every agent that *started* after it re-runs even if it completed. Prefer many small agents to few long ones.

## Measured cost

Per run, against this repository:

| Phase | Agents | Subagent tokens | Wall clock |
|---|---|---|---|
| `/harvest` | 4 | 158k | ~5.5 min |
| `/review` | 5 | 460k | ~18.6 min |
| `/plan` | 6 | 481k | ~8.5 min |

Roughly a million tokens for a feature before implementation starts. That is the number to weigh against the defects these phases actually find — `/review` found four real ones in code with 136 green tests. Treat them as once-per-feature commands, not casual ones.
