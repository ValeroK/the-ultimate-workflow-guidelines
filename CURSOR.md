# Using this repo with Cursor

This project ships as a **Cursor plugin** (plus committed project rules) so the Karpathy-inspired behavioral guidelines and the project-bootstrap flow apply automatically in Cursor.

## Install via Cursor Marketplace (recommended)

The fastest path for any project:

```
/add-plugin the-ultimate-workflow-guidelines
```

Or install directly from the GitHub repo:

```
/add-plugin ValeroK/the-ultimate-workflow-guidelines
```

Cursor auto-discovers:

- `skills/the-ultimate-workflow-guidelines/SKILL.md` and `skills/project-bootstrap-guidelines/SKILL.md` — the two skills.
- `rules/the-ultimate-workflow-guidelines.mdc` (`alwaysApply: true`) and `rules/project-bootstrap-guidelines.mdc` (`alwaysApply: false`) — the project rules.

Manifest: [`.cursor-plugin/plugin.json`](.cursor-plugin/plugin.json). Spec: [cursor.com/docs/plugins/building](https://cursor.com/docs/plugins/building).

Browse the listing at [cursor.com/marketplace](https://cursor.com/marketplace) once published.

## In this repository

If you open this repo directly in Cursor (without installing the plugin), the same two rules still load because they are committed under [`rules/`](rules/):

- [`rules/the-ultimate-workflow-guidelines.mdc`](rules/the-ultimate-workflow-guidelines.mdc) — `alwaysApply: true`. Loaded on every turn for feature work.
- [`rules/project-bootstrap-guidelines.mdc`](rules/project-bootstrap-guidelines.mdc) — `alwaysApply: false`. Greenfield-only; loaded on demand when starting a new project.

Confirm both rules under **Settings → Rules** (or the project rules UI).

## Use the same guidelines in another project (without the plugin)

**Cursor:** Copy the `.mdc` files you want from [`rules/`](rules/) into that project's `.cursor/rules/` directory (create the folders if needed). Adjust or merge with existing rules as you like.

**Other tools:** If a stack only supports a root instruction file, copy [`CLAUDE.md`](CLAUDE.md) into that project instead (or merge its contents into your existing instructions).

## Optional: personal Agent Skills

If you want the same content as reusable skills under `~/.cursor/skills`, use:

- [`skills/the-ultimate-workflow-guidelines/SKILL.md`](skills/the-ultimate-workflow-guidelines/SKILL.md)
- [`skills/project-bootstrap-guidelines/SKILL.md`](skills/project-bootstrap-guidelines/SKILL.md)

Copy or symlink into your personal skills directory; use whatever layout you use for other skills.

## Claude Code vs Cursor

- **Claude Code:** Install via the plugin marketplace (see [`README.md`](README.md)); the plugin exposes both skills from this repo. Per-project use can also rely on `CLAUDE.md`.
- **Cursor:** Install via the Cursor Marketplace (see above), or open the repo directly to pick up the committed `rules/*.mdc` files. Cursor does not read `.claude-plugin/` or `CLAUDE.md` by default.

## For contributors

When you change the principles or workflow, keep these files in sync:

- [`CLAUDE.md`](CLAUDE.md)
- [`rules/the-ultimate-workflow-guidelines.mdc`](rules/the-ultimate-workflow-guidelines.mdc)
- [`skills/the-ultimate-workflow-guidelines/SKILL.md`](skills/the-ultimate-workflow-guidelines/SKILL.md)

When you change the project-bootstrap flow, keep these in sync:

- [`rules/project-bootstrap-guidelines.mdc`](rules/project-bootstrap-guidelines.mdc)
- [`skills/project-bootstrap-guidelines/SKILL.md`](skills/project-bootstrap-guidelines/SKILL.md)
