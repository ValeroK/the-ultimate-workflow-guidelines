# Cursor install layout

> Why the shippable plugin lives under `.cursor-plugin/ultimate-workflow/`, and
> what breaks if it moves back to the repo root.
> Last updated 2026-08-29.

## Mental model

Cursor marketplace clones of this repository use a **cone sparse-checkout**:

```
/*
!/*/
/.claude-plugin/
/.cursor-plugin/
```

Root files stay. Every other top-level directory is dropped. Declaring
`rules` / `skills` paths in `plugin.json` does not expand that checkout — the
loader only searches for files that already exist on disk.

So a dual-host plugin whose `rules/`, `agents/`, `skills/`, and `commands/`
lived at the **repo root** looked installed on Cursor and was empty. Claude
Code was fine: it clones the full tree. The gap was Cursor packaging vs Cursor
sparse install.

## Key decisions

- **Plugin payload under `.cursor-plugin/ultimate-workflow/`.** That prefix is
  inside the sparse cone, so `/add-plugin` materializes the ADLC surface.
  Awkward nesting; deliberate.
- **Marketplace catalogs stay at the repo root.**
  `.claude-plugin/marketplace.json` and `.cursor-plugin/marketplace.json` both
  use a relative `source` pointing at that directory — not `github`-of-self
  (whole repo as plugin root), and not `"./"` (rejected in 2.3.2).
- **Release ZIP is built from the plugin directory**, so Desktop / offline
  Cursor get the same payload without the sparse issue.
- **Root `AGENTS.md` is repo dogfood**, excluded from the ZIP. Installed Cursor
  always-on is `rules/the-ultimate-workflow-guidelines.mdc` inside the plugin.

## Common operations

- **Change a skill / agent / rule:** edit under
  `.cursor-plugin/ultimate-workflow/…`. Run
  `node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js`.
- **Dogfood this repo in Cursor without marketplace:** symlink
  `~/.cursor/plugins/local/ultimate-workflow` →
  `<repo>/.cursor-plugin/ultimate-workflow`, then reload.
- **Add a required install file:** extend `REQUIRED_PLUGIN_FILES` in
  `mirrors.test.js` so the sparse/ZIP checks stay honest.

## Gotchas (topic-specific)

- **Do not move the plugin back to the repo root** to "clean up" the path. A
  green suite that only asserts source-tree existence will not catch an empty
  Cursor install — that is why the sparse-cone oracle exists.
- **Do not switch Claude marketplace `source` back to `{ github, repo }` for
  this repository.** That makes the clone root the plugin root and reintroduces
  the Cursor empty-install layout for anyone sharing the same tree shape.
