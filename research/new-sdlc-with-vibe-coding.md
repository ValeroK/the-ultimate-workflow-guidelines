# The New SDLC With Vibe Coding

**Summary of:** Osmani, A., Saboo, S., Kartakis, S. — *The New SDLC With Vibe Coding: From ad-hoc prompting to Agentic Engineering*. Google, May 2026. Day 1 of a five-part series.

Full paper: [`new-sdlc-with-vibe-coding.pdf`](new-sdlc-with-vibe-coding.pdf) (98 pages).

> Read when: designing agent orchestration, deciding what belongs in always-on
> context, arguing about whether a change belongs to the model or the harness,
> or justifying the cost of upfront structure.

---

## The thesis

Programming has always been translation: understand the problem, design a solution, render it in syntax. The last step is collapsing. The developer supplies **intent, architecture, and judgement**; the machine supplies implementation.

Context as of early 2026, per the paper: 85% of professional developers use AI coding agents, 51% daily, roughly 41% of new code is AI-generated.

## The spectrum

The paper's most useful move is refusing to treat "vibe coding" as one thing.

| | Vibe coding | Structured AI-assisted | Agentic engineering |
|---|---|---|---|
| Intent | Casual prompts | Detailed prompts with constraints | Formal specs, architecture docs, memory files |
| Verification | "Does it seem to work?" | Manual testing, spot checks | Automated suites, CI gates, LM judges |
| Errors | Paste the message back | Developer diagnoses, AI fixes | Agents self-diagnose within bounds |
| Scope | Prototypes, hackathons | Features in known codebases | Production, team scale |

The differentiator is **not whether you use AI**. It is how much structure, verification, and human judgement surround the output. The same agent can be used either way.

The hard boundary: **tests verify the deterministic parts, evals verify the non-deterministic parts.** Without both, the practice is vibe coding regardless of how sophisticated the prompts are.

## The central idea: the harness

> **Agent = Model + Harness**

A raw model is not an agent. It becomes one when a harness gives it state, tool execution, feedback loops, and enforceable constraints. Six components:

- **Instructions and rule files** — `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, skills, sub-agent prompts
- **Tools** — functions, MCP servers, APIs, *plus the prose telling the model when to call them*
- **Sandboxes** — where code runs, what it can and cannot reach
- **Orchestration logic** — sub-agent spawning, model routing, handoffs
- **Guardrails and hooks** — deterministic code at lifecycle points; "the place for things the agent should never forget but often does"
- **Observability** — logs, traces, evals, cost and latency metering; without it "there is no way to tell whether the agent is doing well or quietly drifting"

Two measurements make the effect concrete:

- On Terminal Bench 2.0, a team moved from **outside the Top 30 to the Top 5 by changing only the harness**, with no model change.
- LangChain raised a score on the same benchmark by **13.7 points** by changing only the system prompt, tools, and middleware around a fixed model.

The conclusion the paper draws from this:

> **"Most agent failures, examined honestly, are configuration failures."**

When an agent misbehaves the instinct is to blame the model. More often it traces to a missing tool, a vague rule, an absent guardrail, or a context window stuffed with noise.

## Context engineering

Six types of context: instructions, knowledge, memory, examples, tools, guardrails. The decision that matters is **static versus dynamic**.

- **Static** is always loaded — rule files, personas, global memory. Expensive: every token is present in every interaction regardless of relevance.
- **Dynamic** is loaded on demand — skills triggered by task match, retrieved documents, tool results. You pay the token cost only when the information is needed.

> "Too much static context wastes tokens and dilutes signals. Too little means the agent forgets critical rules. The best systems treat this boundary as a first-class architectural decision, reviewed and versioned like any other configuration."

**Agent Skills** are the named pattern for the dynamic half: the agent stays a lightweight generalist and flexes into specialist roles through progressive disclosure — metadata at startup, full instructions on task match, deep reference only when explicitly needed.

The reframing worth keeping: the question is not *"how do I trick the AI into writing good code?"* It is *"what would a new team member need to know, and how do I encode it in a form the AI can use?"*

## Two more models

**The factory model.** The developer's primary output is not code — it is the system that produces code: specifications, agents, quality gates, feedback loops, guardrails. A factory manager does not assemble every widget; they design the line and ensure quality control.

**Conductor vs orchestrator.** Two modes a developer moves between. *Conductor* is hands-on and real-time, preserving understanding and control, but capping throughput because the developer directs every keystroke. *Orchestrator* is async delegation to background agents, and demands different skills: specification, decomposition, evaluation, system design.

## Where the paper resists its own hype

**The 80% problem.** Agents produce roughly 80% of a feature quickly; the remaining 20% — edge cases, error handling, integration points — needs contextual knowledge models lack. AI errors have shifted from syntax mistakes to conceptual ones: wrong business-logic assumptions, missed edge cases, architecture that creates long-term maintenance burden. These are **harder to detect precisely because the code looks right and may pass basic tests**.

**A study that cuts against the narrative.** Surveys report 25 to 39% productivity gains, but METR found experienced developers took **19% longer** on certain tasks, from time spent verifying and correcting output. AI does not eliminate implementation work so much as transform it from writing into reviewing.

## The economics

Framed as CapEx versus OpEx, which is the clearest part of the paper.

**Vibe coding: low CapEx, high OpEx.** Near-zero to start, but a compounding burden — token burn from dumping unstructured files and repeatedly asking the model to fix its own unverified mistakes; a maintenance tax when engineers later reverse-engineer unstructured generated code; security remediation without an eval harness.

**Agentic engineering: high CapEx, low OpEx.** Upfront investment in schemas, deterministic test suites, and context structure. The marginal cost of shipping and maintaining each feature drops sharply.

So **context engineering is a financial lever**, not only a technical skill. A dense high-signal payload raises first-pass success rates and avoids the trial-and-error loop. Add intelligent model routing: frontier models for architecture and initial implementation, smaller cheaper models for test generation, code review, and CI monitoring.

## Three durable principles

1. **Structure scales, vibes don't.** Vibe coding is valid for exploration. For software organisations depend on, the discipline is not optional — the gap between "it seems to work" and "it works correctly under all conditions" is where outages and vulnerabilities live.
2. **AI amplifies your engineering culture.** It multiplies both strengths and weaknesses.
3. **The human role is evolving, not diminishing.** The shift is from implementation to judgement.

> "Generation is solved. Verification, judgement, and direction are the new craft."

---

## What this means for this repository

The paper describes, from the outside, most of what this plugin is. That makes it useful for three things: naming what we already do, settling an open argument, and identifying one gap.

**It names the design.** "Agent = Model + Harness" and "most agent failures are configuration failures" is the argument for this plugin existing. The Terminal Bench result is independent confirmation of the same finding that motivated the graph-native rebuild.

**It settles the always-on context argument.** Our `CLAUDE.md` is roughly 18KB and about 80 discrete instructions, all static, all loaded every turn. The paper is explicit that the static/dynamic boundary should be "reviewed and versioned like any other configuration" — which we have never done. `memory/` is our dynamic half and it is currently empty; `## Gotchas` is our static half and it only grows. That asymmetry is a real finding, not a stylistic preference.

**It names something we arrived at sideways.** Guardrails and hooks are "the place for things the agent should never forget but often does." That is `## Gotchas`, described from outside.

**Where we know more than the paper.** It treats hooks as reliably deterministic. We measured three distinct routes to a hook being installed and silently enforcing nothing: a UTF-8 BOM that makes payload parsing throw, a host that ignores a deny for writes while reporting success, and config that is not loaded until restart. The paper's harness component list has no entry for *verifying the harness is actually running* — and on the evidence of this repo, it should. That is what `hooks/status.js` and the heartbeat exist for.
