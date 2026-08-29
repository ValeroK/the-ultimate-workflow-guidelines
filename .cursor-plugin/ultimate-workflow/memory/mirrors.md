# The mirrors

> Which files are hand-copies of each other, which differences are deliberate,
> and what the check does and does not cover.
> Last updated 2026-08-28.

## Mental model

Two hosts read the same guidance through different mechanisms. Claude Code reads `skills/<name>/SKILL.md`; Cursor reads `rules/<name>.mdc` with `alwaysApply` frontmatter it cannot get from a `SKILL.md`. The pair is **irreducible** — neither can be generated from the other at read time, and generating one at release time would be a build step this repo deliberately does not have.

So the body is duplicated by hand. The check is thinner than it sounds: `mirrors.test.js` compares the two always-on files by heading set and hard-constraint phrases, asserts the byte-identical `memory-template.md`, and asserts the existence pairs. **It has never diffed a skill body.** Skill-body drift is caught by nothing.

## What is mirrored

| Pair | Relationship |
|---|---|
| `skills/the-ultimate-workflow-guidelines/SKILL.md` ↔ `rules/the-ultimate-workflow-guidelines.mdc` | **No longer a body mirror.** The `.mdc` is the Cursor twin of `CLAUDE.md` and shares its heading set; `SKILL.md` is the full text the index points at |
| `skills/project-bootstrap-guidelines/SKILL.md` ↔ `rules/project-bootstrap-guidelines.mdc` | Same body, different frontmatter. **The only genuine body mirror left, and nothing checks it** |
| `skills/project-bootstrap-guidelines/references/memory-template.md` ↔ `skills/the-ultimate-workflow-guidelines/references/memory-template.md` | Byte-identical |
| `AGENTS.md` ↔ `CLAUDE.md` | **Not a mirror, an import.** CLAUDE.md is the single line `@AGENTS.md`, because Claude Code reads only that filename while Cursor reads AGENTS.md natively. One source, two hosts. A test asserts the stub stays bare. **Repo dogfood only** — the shippable Cursor always-on is the `.mdc` inside `.cursor-plugin/ultimate-workflow/` |
| `agents/` ↔ `.claude/agents/` | Local dogfood copy, **gitignored, invisible to CI** |
| `commands/<phase>.md` ↔ `workflows/<phase>.js` | **Existence pair.** Neither contains the other's text; one without the other is an advertised command that does nothing, or a script nothing can reach |
| `rules/uw-<topic>.mdc` ↔ `memory/<topic>.md` | **Selector and content.** The rule fires and points; the topical holds the knowledge. Deliberately NOT a text mirror -- a test asserts each rule stays shorter than what it points at |
| Marketplace catalogs ↔ plugin payload | **Layout pair.** Root `.claude-plugin/marketplace.json` and `.cursor-plugin/marketplace.json` both `source` the nested tree `.cursor-plugin/ultimate-workflow/`. See `memory/cursor-install.md` |

## Key decisions

- **The `memory-template.md` duplication is correct.** `release-skills.yml` zips each skill directory independently, so a cross-skill relative path breaks anyone who installed only one skill. The distribution unit is the skill directory. What was missing was not deduplication — it was a check. Do not "tidy this up" by deleting one copy.
- **The Gates section is deliberately absent from `rules/*.mdc`.** That file is Cursor-only and Cursor has no gates; documenting them there would describe something that never runs.
- **A documented divergence list without a check is a comment, not a control.** The README carried exactly such a note, and an *undocumented* divergence still crept in — a closing line drifted out of `SKILL.md` unnoticed. That is why the exception array lives in the test rather than in prose.
- **Two of the pairs are existence mirrors, not text mirrors, and that is the harder kind.** A text mirror drifts visibly: run a diff and the difference is on screen. An existence mirror drifts by something simply not being there -- `/ultimate-workflow:plan` was advertised in four files for an entire release with no `commands/` directory at all, and the four `memory/` topicals were unreachable on Cursor from the day they were written. Neither shows up in a diff of anything, because there is nothing to diff against. Both are now asserted rather than assumed.
- **A Cursor rule's `description` is load-bearing, not documentation.** It is the retrieval trigger: Cursor selects the rule by matching against it. A vague description does not fire, and a rule that does not fire is indistinguishable from a rule that does not exist. The test enforces a minimum length for exactly that reason -- a crude proxy, but it catches the one-line placeholder.
- **The always-on file left the mirror set.** `AGENTS.md` is a thin index rather than a copy of the body, and `CLAUDE.md` is a bare `@AGENTS.md` import, which reduced three mirrors to a pair and made the check tractable.

## Common operations

- **Change a skill body:** edit `SKILL.md` and the matching `.mdc` in the same commit. **Nothing checks this.** `project-bootstrap-guidelines` is the only remaining body mirror and it drifts silently; a green suite is not evidence.
- **Add a deliberate divergence:** there is no exception array right now -- one existed holding zero exceptions and was deleted. Reintroduce it in `mirrors.test.js` *with a comment saying why*, since an entry without a reason is indistinguishable from drift someone silenced.
- **Reconcile the invisible mirror:** `diff -r agents/ .claude/agents/`.

## Gotchas (topic-specific)

- **`.claude/agents/` is gitignored, so CI cannot check it, and it has already drifted.** The local copy of `uw-harvester.md` lagged the shipped one by a paragraph — and the missing paragraph was the very behaviour a run had been recorded as validating. "It worked when I ran it" is not evidence about the shipped artifact. Diff it before any release that claims a phase is validated.
