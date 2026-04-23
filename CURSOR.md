# Using this repo with Cursor

This project includes **two Cursor project rules** so the Karpathy-inspired behavioral guidelines and the project-bootstrap flow apply automatically when you work here.

## In this repository

1. Open the folder in Cursor.
2. Two rules are committed:
   - [`.cursor/rules/the-ultimate-workflow-guidelines.mdc`](.cursor/rules/the-ultimate-workflow-guidelines.mdc) — `alwaysApply: true`. Loaded on every turn for feature work.
   - [`.cursor/rules/project-bootstrap-guidelines.mdc`](.cursor/rules/project-bootstrap-guidelines.mdc) — `alwaysApply: false`. Greenfield-only; loaded on demand when starting a new project.
3. In Cursor, you can confirm both rules under **Settings → Rules** (or the project rules UI).

## Use the same guidelines in another project

**Cursor (recommended):** Copy the `.mdc` files you want into that project's `.cursor/rules/` directory (create the folders if needed). Adjust or merge with existing rules as you like.

**Other tools:** If a stack only supports a root instruction file, copy [`CLAUDE.md`](CLAUDE.md) into that project instead (or merge its contents into your existing instructions).

## Optional: personal Agent Skills

If you want the same content as reusable skills under `~/.cursor/skills`, use:

- [`skills/the-ultimate-workflow-guidelines/SKILL.md`](skills/the-ultimate-workflow-guidelines/SKILL.md)
- [`skills/project-bootstrap-guidelines/SKILL.md`](skills/project-bootstrap-guidelines/SKILL.md)

Copy or symlink into your personal skills directory; use whatever layout you use for other skills.

## Claude Code vs Cursor

- **Claude Code:** Install via the plugin marketplace and [`README.md`](README.md) instructions; the plugin exposes both skills from this repo. Per-project use can also rely on `CLAUDE.md`.
- **Cursor:** Use the committed `.cursor/rules/` files as described above. Cursor does not read `.claude-plugin/` or `CLAUDE.md` by default.

## For contributors

When you change the principles or workflow, keep these files in sync:

- [`CLAUDE.md`](CLAUDE.md)
- [`.cursor/rules/the-ultimate-workflow-guidelines.mdc`](.cursor/rules/the-ultimate-workflow-guidelines.mdc)
- [`skills/the-ultimate-workflow-guidelines/SKILL.md`](skills/the-ultimate-workflow-guidelines/SKILL.md)

When you change the project-bootstrap flow, keep these in sync:

- [`.cursor/rules/project-bootstrap-guidelines.mdc`](.cursor/rules/project-bootstrap-guidelines.mdc)
- [`skills/project-bootstrap-guidelines/SKILL.md`](skills/project-bootstrap-guidelines/SKILL.md)
