# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-08-25

### BREAKING

- **The plugin is renamed from `the-ultimate-workflow-guidelines` to `ultimate-workflow`.** The plugin name namespaces every component it ships, so commands and skills are now `ultimate-workflow:<name>` instead of `the-ultimate-workflow-guidelines:<name>`. Reinstall once:

  ```
  /plugin uninstall the-ultimate-workflow-guidelines
  /plugin install ultimate-workflow
  ```

  The repository, the marketplace entry, and the GitHub URL are unchanged, so `/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines` still works. Done now because the old name already produced `the-ultimate-workflow-guidelines:the-ultimate-workflow-guidelines` in the skill list, and the workflows planned for v3.0.0 would have made it worse.

- **Workflow gates are on by default.** Five lifecycle hooks now enforce the workflow rather than describing it: no source edit before a confirmed plan, no implementation before confirmed tests, no turn completion while code is unverified, a hard cap of three failing verify rounds, and a per-prompt stage pointer. They are inert in any repository without a `PRD.md` or `PLAN-*.md`, and `ULTIMATE_WORKFLOW_GATES=off` disables them entirely. They fail open: any internal error exits 0 and blocks nothing.

### Added

- `hooks/gate.js` plus `hooks/lib/` — the shared gate core, four vendor adapters (Claude Code, Codex CLI, Gemini CLI, Cursor), and the dispatcher. 104 tests via `node:test`, no dependency and no `package.json`.
- `hooks/dev/record.js` — a payload recorder, so anyone on a host we have not verified can produce the fixtures the contract tests need.
- State front matter in `references/plan-template.md` and `references/prd-template.md`, read by the gates.
- `node --test` job in `.github/workflows/validate.yml`, plus a manifest name-consistency assertion alongside the existing version check.
- README section documenting the gates and a per-host support matrix.

### Known limitations

- **On Cursor, gates G1 and G2 cannot prevent anything; they detect and correct after the fact.** Measured on Cursor 3.17.19: a `preToolUse` hook returning `deny` plus exit 2 is honoured for `Read` and ignored for `Write`, and the following `postToolUse` reports `success: true`, so the model is never told it was blocked. The plugin therefore does not emit a deny for writes on Cursor, because a silently dropped deny looks like enforcement while providing none.
- The Codex CLI and Gemini CLI adapters are written to documented contracts that nobody has exercised. Every defect found while building the two verified adapters — a UTF-8 BOM that makes payload parsing throw, absolute paths defeating test-file detection, `workspace_roots` in place of `cwd` — was invisible to documentation and failed open.
- Gemini has no distinct tool-failure event, so a red verification cannot be detected there the way it is elsewhere.

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
