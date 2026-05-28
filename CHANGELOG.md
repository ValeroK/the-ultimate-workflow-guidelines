# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[2.3.2]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.2
[2.3.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.1
[2.3.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.3.0
[2.2.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.2.0
[2.1.1]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.1
[2.1.0]: https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/tag/v2.1.0
