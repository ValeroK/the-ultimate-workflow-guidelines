# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.1] - 2026-08-29

### Fixed

- **Cursor `/add-plugin` delivered an empty plugin.** Marketplace clones use a sparse-checkout that only keeps `/.cursor-plugin/` and `/.claude-plugin/`, so root-level `rules/`, `agents/`, `skills/`, and `commands/` never landed on disk. The shippable tree now lives at `.cursor-plugin/ultimate-workflow/`; both marketplaces use a relative `source` pointing there; the release ZIP is built from that directory. Documented in `memory/cursor-install.md`. **Reinstall** the plugin on both Claude Code and Cursor after pulling this change.
- **`commands/tests.md` frontmatter** — unquoted `:` in the description broke Claude's YAML parser (`claude plugin validate`), so the command loaded with empty metadata.

### Changed

- Verify command and CI globs: `".cursor-plugin/ultimate-workflow/hooks/**/*.test.js"`.
- `mirrors.test.js` asserts Cursor sparse-cone inclusion and simulated ZIP membership for the nested payload.

## [3.0.0] - 2026-08-28

The gates in this release were built to answer "the model ignores the workflow"
with enforcement: five lifecycle hooks that block a bad edit. They were never
published on their own -- measuring them changed the answer before they shipped,
so they arrive here already demoted to a backstop.

Seven of the nine defects found in that work were in the vendor wire surface, not
the logic -- a UTF-8 BOM that makes payload parsing throw, absolute paths defeating
test-file detection, `workspace_roots` where `cwd` was expected -- and each failed
*open and silently*. Three separate routes led to "installed, enforcing nothing,
looking identical to working". A mechanism with that failure mode should not be on
by default.

The alternative turned out to be structural rather than defensive. **If each phase
is its own invocation with its own fresh context and its own tools, ordering is not
policed -- a phase you have not started cannot be skipped.** That is what this
release is.

### BREAKING

- **Gates are opt-in.** Set `ULTIMATE_WORKFLOW_GATES=on` to enable them. Absent or any other value means off. Anyone relying on gates firing by
  default must set this, or they will silently get nothing -- which is exactly the
  failure mode being fixed, so it is called out here rather than buried.


- **`CLAUDE.md` is a thin index**, 240 lines to 49. 1220 of its 2769 words were
  byte-identical to `SKILL.md`. If you copied it into your own project, the
  standalone artifact is now `skills/the-ultimate-workflow-guidelines/SKILL.md` --
  the `curl` line in the README points there.

- **The plugin is renamed from `the-ultimate-workflow-guidelines` to `ultimate-workflow`.** The plugin name namespaces every component it ships, so commands and skills are now `ultimate-workflow:<name>` instead of `the-ultimate-workflow-guidelines:<name>`. Reinstall once:

  ```
  /plugin uninstall the-ultimate-workflow-guidelines
  /plugin install ultimate-workflow
  ```

  The repository, the marketplace entry, and the GitHub URL are unchanged, so `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` still works. Done now because the old name already produced `the-ultimate-workflow-guidelines:the-ultimate-workflow-guidelines` in the skill list, and the workflows planned for v3.0.0 would have made it worse.

- **Workflow gates are on by default.** Five lifecycle hooks now enforce the workflow rather than describing it: no source edit before a confirmed plan, no implementation before confirmed tests, no turn completion while code is unverified, a hard cap of three failing verify rounds, and a per-prompt stage pointer. They are inert in any repository without a `PRD.md` or `PLAN-*.md`, and `ULTIMATE_WORKFLOW_GATES=off` disables them entirely. They fail open: any internal error exits 0 and blocks nothing.

### Added

- **Five phase commands** -- `/ultimate-workflow:plan`, `:tests`, `:build`,
  `:review`, `:harvest`. Each runs in a fresh context, does one job, and stops.
  **Only `build` can write**; the other four return proposals you apply, which is
  deliberate -- a proposal you have to accept is a proposal you actually read.
- **Five scoped agent definitions** under `agents/`. Tool restriction is subtraction,
  and it is a hard refusal that also covers the deferred tool registry -- verified,
  not assumed. Four carry Cursor's `readonly: true` as well; `uw-implementer` carries
  neither and is the only writer. `mirrors.test.js` asserts that invariant.
- **`evals/`** -- a trajectory scorer plus eight context-boundary fixtures. The gap
  named by Google's Day 1 paper: tests cover deterministic behaviour, nothing covered
  trajectory or tool choice, and without both the practice is vibe coding regardless
  of how good the prompts read. `evals/results/README.md` records what the recorded
  runs do and do not support -- at length, because the headline number flatters this
  change more than the evidence does.
- **`memory/`** -- four topicals loaded on cue: `context-boundary`, `hooks-and-gates`,
  `workflows-authoring`, `mirrors`.
- **`mirrors.test.js`** -- heading parity, line caps, and command-surface coverage
  across the hand-copied files. A documented divergence list with no check is a
  comment, not a control, which is how the drift it now catches happened.
- **`research/`** -- Google's May 2026 paper on agentic engineering, with a summary.

### Removed

- **The two no-emoji hooks are gone**, along with their registrations. `hooks/hooks.json` now registers `gate.js` and nothing else, and `ALLOW_EMOJIS=1` no longer does anything. Nothing blocks a write containing emoji any more.

  The rule survives as a standing instruction, once per host, in `CLAUDE.md` and the Cursor always-on rule — and narrowed from "no emojis anywhere" to **"no emojis in code"**. Code is where the breakage is: a terminal rendering a source file, a pipeline parsing output. Prose was never the problem, and the blanket version had the project enforcing against its own public page, which carries four principle icons by design.

  If you relied on the hook to keep emoji out of files, it is no longer there.

### Changed

- **Context is split by cue, not by length.** The rule: *keep what has no cue, move
  what has a cue.* Retrieval fails when the trigger is an absence, so a hard
  constraint nothing prompts you to look up stays always-on. Cursor's
  `alwaysApply: false` rules are the direct analogue of `memory/` and got the same
  treatment.
- **Cursor gets the workflow as prompts, and the rule file says what that costs.**
  Cursor has subagents but no scriptable orchestrator, so the phases are invocations
  you sequence, the round cap is a number you honour rather than a counter, and
  ordering is advisory. It keeps fresh context per phase, one narrow job per agent,
  and the artifact on disk. Stated per layer instead of implying parity.
- **`hooks/status.js`** distinguishes never-ran / live / stale / disabled. Every gate
  writes a heartbeat, because a hook that never loaded, a hook that crashed, and a
  hook that correctly allowed everything are otherwise indistinguishable.

### Fixed

- `coerce()` now unescapes what `format()` escaped. A double-quoted value had its
  backslashes doubled on every write, corrupting a Windows `test_command` a little
  more each time the gates touched the file -- and they touched it on every edit.
- Tool paths are relativised against `cwd` before classification. Matching the raw
  absolute path silently disabled the tests-first gate for any project under a
  directory named `test`, and judged scratchpad edits elsewhere on disk against this
  repository's plan. Invisible to a green 52-test suite, because those tests used
  relative paths.
- The Stop gate fails open when no verify command is configured. The shipped template
  carried `test_command: ""`, which made that gate permanently unsatisfiable.
- `hookEventName` is echoed from the payload rather than hardcoded, so the escalation
  is not silently discarded by the host.
- `looksLikeShellWrite` is deleted. It matched heredocs, arrow functions, and
  `2>/dev/null` -- so every `git commit -F -` looked like a source write.
- `progress-template.md` shipped a date regex with its backslashes eaten, and a
  literal `YYYY-MM-DD` placeholder that left a bootstrapped project permanently
  un-handed-off.

### Known limitations

- **Fan-out costs real money.** Measured on this repository: `/harvest` 158k tokens,
  `/review` 460k, `/plan` 481k. Roughly a million tokens for a feature before
  implementation starts. Weigh that against what they find -- `/review` located four
  real defects in code with 136 green tests -- and treat them as once-per-feature.
- **The eval baseline is one run per cell across eight fixtures.** It supports "no
  detected regression" and nothing stronger. Three of the four pre-restructure
  failures are files that did not exist yet, and most pass conditions were authored
  after one arm's output was visible. Written down in `evals/results/README.md`
  rather than left for a reader to discover.
- **Gates remain Claude Code only.** On Cursor 3.17.19 a pre-edit `deny` is honoured
  for reads and ignored for writes: the file is created and the next event reports
  success, so the model is never told it was blocked. The Codex and Gemini contracts
  are documented and look nearly identical to Claude Code's, but neither has been
  exercised against a real payload. Every defect on the hosts that *were* exercised
  was invisible in documentation. Until someone records payloads with
  `hooks/dev/record.js`, those hosts get prose.

## [2.6.0] - 2026-08-15

### Added
- **`/handoff` command** (`commands/handoff.md`) — writes a session handoff document so a fresh agent can pick up in-flight work. Produces `HANDOFF-<topic>.md` covering purpose/background, tools and how to run them, policies and schemas, a **suggested skills** section, current state, open issues, and candidate next steps. It references existing artifacts (`PLAN-<feature>.md`, `PRD.md`, `progress.md`, commits, PRs) by path rather than restating them, briefs the next agent without ordering it to start work, redacts secrets and PII, and takes an optional argument scoping the doc to the next session's focus. `disable-model-invocation: true` keeps it user-triggered only.
  - `commands/` lives at the plugin root, which both [Claude Code](https://code.claude.com/docs/en/plugins-reference) and Cursor auto-discover — one file serves both hosts. Included in the full-plugin ZIP; not in the per-skill ZIPs, since a command is a plugin-level component.
  - Wired into both skills (and their `rules/*.mdc` + root `AGENTS.md` mirrors): the workflow skill gains **step 7, "Hand off at end of session"**, and the bootstrap skill's **Phase 4** covers sessions that end before bootstrap completes. Both note the by-hand fallback for single-skill installs.
  - Affected files: new `commands/handoff.md`; `skills/the-ultimate-workflow-guidelines/SKILL.md`, `skills/project-bootstrap-guidelines/SKILL.md`, `rules/the-ultimate-workflow-guidelines.mdc`, `rules/project-bootstrap-guidelines.mdc`, `AGENTS.md`, `README.md`.

### Changed
- **Cross-tool root files: `AGENTS.md` (content) + thin `CLAUDE.md` import stub.** The bootstrap skill now produces `AGENTS.md` at the project root, plus a two-line `CLAUDE.md` containing just `@AGENTS.md`. Cursor reads `AGENTS.md` natively (per [Cursor docs](https://cursor.com/docs/rules)); Claude Code reads `CLAUDE.md` only and pulls the same content in via its `@`-import syntax (per [Claude Code memory docs](https://code.claude.com/docs/en/memory)). One source of truth, no drift. Affected files: bootstrap `SKILL.md`, both `rules/*.mdc`, workflow `SKILL.md`, root `AGENTS.md` (renamed from the old `CLAUDE.md`), new minimal root `CLAUDE.md`, template renamed to `references/agents-md-template.md`, memory/progress templates, root `memory.md`, `README.md`, and the now-removed `CURSOR.md` (folded into README). **Migration for existing users:** projects bootstrapped before this release have a `CLAUDE.md` with full content at root. Rename it to `AGENTS.md` (`git mv CLAUDE.md AGENTS.md`), then create a new two-line `CLAUDE.md` containing only `@AGENTS.md`. Cursor will pick up `AGENTS.md` immediately; Claude Code will import it via the stub.
- **Principles & Workflow — partner-mindset and anti-fake-success additions**, mirrored across `SKILL.md`, `AGENTS.md`, and `rules/the-ultimate-workflow-guidelines.mdc`:
  - **Think Before Coding** now includes "truth over agreement" — don't reflexively affirm the user's framing; name gaps in their reasoning.
  - **Goal-Driven Execution** gains a "Don't fake success" paragraph — no silent fallbacks, swallowed errors, or skipped assertions when the task can't actually be accomplished; stop and surface via the host's ask-user tool.
  - **How to stop and ask** gains two counter-balances: don't bog down on trivial reversible decisions (decide, flag, move on), and treat user rejection/skip of a tool call as a signal to ask why before retrying.
  - **Workflow step 2** explicitly favors concision over polish in `PLAN-<feature>.md` ("sacrifice grammar for density if it helps").
  - **Workflow step 5 (blocker protocol)** adds "reconsider applicable guidance" — re-scan `memory.md` and project rules/`AGENTS.md` for entries that match the new direction before resuming.

## [2.3.2] - 2026-04-29

### Fixed
- `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` followed by install would not register the plugin. Two root causes:
  - `marketplace.json` plugin entry used `source: "./"` (the marketplace's own root), which is not a supported source shape per the [Claude Code marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces#plugin-sources). Switched to the `github` source shape (`{"source":"github","repo":"ValeroK/the-ultimate-workflow-guidelines"}`).
  - `plugin.json` had a `skills` array pointing at individual skill directories. Per the [plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), `skills` must point at a parent directory. Removed the field — the default auto-discovery from `skills/<name>/SKILL.md` already finds both skills.

### Removed
- Unused `id` top-level field from `marketplace.json` (not in the documented schema).

## [2.3.1] - 2026-04-29

### Added
- `CHANGELOG.md` (this file).
- `.github/workflows/validate.yml` — PR-time JSON-syntax check on all three manifests and a version-consistency assertion across the four version slots.

### Fixed
- Reconciled drift between `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, and `.claude-plugin/marketplace.json`: identical `description` and `keywords` everywhere, and `homepage` + `repository` now present in the Claude manifest (previously only in the Cursor one).

### Changed
- `memory.md` placeholder comment collapsed from a six-line example block to a one-line pointer to the entry-shape template.

## [2.3.0] - 2026-04-29

### Added
- `memory.md` slim-index + lazy topical-file pattern, with template under `skills/the-ultimate-workflow-guidelines/references/memory-template.md`. Topical knowledge ("how X works", "why we picked Y") lives in `memory/<topic>.md` and is read on demand when the task touches the topic. Defensive one-liners ("beware X") still go to `CLAUDE.md` `## Gotchas`.
- Dual Claude + Cursor plugin ZIP as a release asset (`the-ultimate-workflow-guidelines-plugin.zip`) — same archive installs into both ecosystems.

### Changed
- `README.md` and the project-explainer copy rewritten to cover the slim-index + lazy-load memory pattern and clarify the Gotchas vs Memory distinction.

## [2.2.0] - 2026-04-24

### Added
- `LICENSE` file (MIT-with-Attribution) and `.gitignore`.
- Claude Desktop install path via release ZIPs.

### Changed
- Switched license declaration to MIT-with-Attribution (`LicenseRef-MIT-Attribution`) across `plugin.json` and SKILL.md frontmatter.

### Removed
- Unreferenced `EXAMPLES.md`.

## [2.1.1] - earlier

### Removed
- Multica promo and X link from README header.

## [2.1.0] - earlier

### Added
- Initial dual-ecosystem layout (Cursor rules under `rules/`, Agent Skills under `skills/`).
- README and `CURSOR.md` install instructions for both ecosystems.

### Changed
- Rebranded to `the-ultimate-workflow-guidelines`.
- Added the explicit Workflow section (plan-first, test-first, blocker protocol) and the sibling `project-bootstrap-guidelines` skill.

## Earlier history

For commits prior to `v2.1.0`, see `git log`. Highlights include the original Cursor-plugin migration, the marketplace manifest, and the first round of plugin-structure fixes.

[2.6.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.6.0
[2.3.2]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.2
[2.3.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.1
[2.3.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.0
[2.2.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.2.0
[2.1.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.1
[2.1.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.0
