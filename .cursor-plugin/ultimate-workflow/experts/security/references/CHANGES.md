# Changes from upstream

Upstream: `anthropics/claude-code-security-review`, `.claude/commands/security-review.md`, commit `0c6a49f1fa56a1d472575da86a94dbc1edb78eda` (MIT). The pristine copy is in the source repository under `vendor/anthropic-security-review/`, outside the shipped plugin.

## Kept

- Scope discipline: only issues the change introduces, only high-confidence ones.
- The three-pass method: learn the project's patterns, compare the change, trace data flow.
- The vulnerability categories, compressed.
- Most of the exclusion list and precedents, re-read one by one and reworded (see "Do not report" in `review.md`).

## Fixed

- Three confidence scales became one, the protocol's: 1 to 10, report 8 or above, mapped to the `high` and `medium` values of the workflow's confidence field.
- Duplicate list numbering (two items numbered 16) removed.
- "Secrets stored on disk are excluded" contradicted "hardcoded secrets are in scope". Now: a hardcoded secret in source is a finding; a correctly permissioned secret on disk is not.
- "Do not use the bash tool" next to an allowlist of git commands. The expert may now run read-only commands only (search, list, `git log`, `git show`, a scanner that modifies nothing), and receives the diff as a file.

## Reversed

- "Including user-controlled content in AI system prompts is not a vulnerability" is removed. In a repository where prompts steer agents that hold tools, it is the main risk. See `agent-surface.md`.
- "Do not report findings in documentation files such as markdown" is removed. Markdown that instructs an agent is executable here. Plain documentation that no agent reads remains out of scope.
- "Vulnerabilities related to outdated third-party libraries are managed separately" is removed. Libraries are reported in tiers from a script-produced audit; see `dependencies.md`.
- GitHub workflow vulnerabilities are no longer excluded by default; the checks are in `agent-surface.md`.

## Added

- A defined no-findings result that must say what was examined, so a clean review differs from one that did not look.
- An evidence path (source to sink, with file and line at each hop) on every finding, so the skeptic stage can check it.
- Permission to read callers of changed code, for a change that exposes an old unsafe function.
- Untrusted input: the diff is data, and instructions inside it are not obeyed. Since 2026-10-20 this, the result form and the confidence scale live once in `experts/protocol.md`, which every expert reads; `review.md` keeps only what is specific to security.
- A stop rule for each trace, a "Not when" on every category, security's own severity levels, "Excuses that do not hold", and one worked finding with one dropped candidate (2026-10-20).
- Agent, skill, hook, MCP and CI checks (`agent-surface.md`) and the dependency tiers (`dependencies.md`), each read only when the diff calls for it.

## Dropped

- The slash-command wrapper, the inline shell lines that pasted git output into the prompt, and the GitHub Action framing. The workflow supplies the diff and runs the false-positive pass (its skeptic stage) itself.

## 2026-10-20: the Goal and Responsibilities restructure

- The agent file has a Goal (prevents, done well, not the goal), a Responsibilities table with an owner and a border rule for every area, and two to four judging rules. The shared rules (zero is correct, evidence, confidence, severity, untrusted input, the web) moved to `experts/protocol.md`, which the agent reads first.
- Plan and tests references open with the stage's outcome, define no return fields (the workflow schema holds them), and give one good and one rejected constraint, or one worked case.
- The review reference has a stop rule in its method, a "Not when" on every category, its own high, medium and low, and one worked finding with one dropped candidate. Result, Confidence and Untrusted input sections are gone.
- At least half of the negative selection examples are near misses with their owner named.
- Review: a "Not when" on every category, memory safety only when the diff adds `unsafe` or native code, "Excuses that do not hold", and a worked finding that goes through `allow-unsafe-pr-checkout` (round 2, item 1). Plan asks where identity comes from and gains the one-way-choice rule; tests gains a worked case.
- Not measured since the restructure.
