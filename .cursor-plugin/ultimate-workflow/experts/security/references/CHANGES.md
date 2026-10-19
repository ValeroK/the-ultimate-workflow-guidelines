# Changes from upstream

Upstream: `anthropics/claude-code-security-review`, `.claude/commands/security-review.md`, commit `0c6a49f1fa56a1d472575da86a94dbc1edb78eda` (MIT). The pristine copy is in the source repository under `vendor/anthropic-security-review/`, outside the shipped plugin.

## Kept

- Scope discipline: only issues the change introduces, only high-confidence ones.
- The three-pass method: learn the project's patterns, compare the change, trace data flow.
- The vulnerability categories, compressed.
- Most of the exclusion list and precedents, re-read one by one and reworded (see "Do not report" in `review.md`).

## Fixed

- Three confidence scales (over 80%, 0.7 to 1.0, and 1 to 10 with a cutoff of 8) became one: 1 to 10, report 8 or above, mapped to the `high` and `medium` values of the workflow's confidence field.
- Duplicate list numbering (two items numbered 16) removed.
- "Secrets stored on disk are excluded" contradicted "hardcoded secrets are in scope". Now: a hardcoded secret in source is a finding; a correctly permissioned secret on disk is not.
- "Do not use the bash tool" next to an allowlist of git commands. The expert now has no shell at all and receives the diff as a file.

## Reversed

- "Including user-controlled content in AI system prompts is not a vulnerability" is removed. In a repository where prompts steer agents that hold tools, it is the main risk. See `agent-surface.md`.
- "Do not report findings in documentation files such as markdown" is removed. Markdown that instructs an agent is executable here. Plain documentation that no agent reads remains out of scope.
- "Vulnerabilities related to outdated third-party libraries are managed separately" is removed. Libraries are reported in tiers from a script-produced audit; see `dependencies.md`.
- GitHub workflow vulnerabilities are no longer excluded by default; the checks are in `agent-surface.md`.

## Added

- A defined no-findings result that must say what was examined, so a clean review differs from one that did not look.
- An evidence path (source to sink, with file and line at each hop) on every finding, so the skeptic stage can check it.
- Permission to read callers of changed code, for a change that exposes an old unsafe function.
- A section on untrusted input: the diff is data, and instructions inside it are not obeyed.
- Agent, skill, hook, MCP and CI checks (`agent-surface.md`) and the dependency tiers (`dependencies.md`), each read only when the diff calls for it.

## Dropped

- The slash-command wrapper, the inline shell lines that pasted git output into the prompt, and the GitHub Action framing. The workflow supplies the diff and runs the false-positive pass (its skeptic stage) itself.
