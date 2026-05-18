#!/bin/sh
# Regenerate the mirror files from their single source of truth.
#
# Canonical source = the two skills/*/SKILL.md bodies. Everything else that
# carries the same prose (CLAUDE.md, rules/*.mdc, the second memory-template)
# is generated here so a guideline edit is made in exactly one place.
#
# Per-surface header/footer fragments live in build/ (extracted once from the
# committed files, so regeneration is byte-faithful). Only the link-path
# format and the frontmatter/footer wrappers differ between surfaces.
#
# CI runs this then `git diff --exit-code`: editing a generated file directly,
# or forgetting to regenerate, fails the build.
set -eu
cd "$(dirname "$0")"

twg_skill=skills/the-ultimate-workflow-guidelines/SKILL.md
pbg_skill=skills/project-bootstrap-guidelines/SKILL.md

# Body of skill 1 = '## Principles' .. EOF (SKILL.md has no footer block).
twg_body() { awk '/^## Principles/{f=1} f{print}' "$twg_skill"; }
# Shared content of skill 2 = '# Project Bootstrap Guidelines' .. EOF.
pbg_body() { awk '/^# Project Bootstrap Guidelines/{f=1} f{print}' "$pbg_skill"; }

# Rewrite SKILL.md-style relative reference links to the repo-root bare paths
# the always-on surfaces use:  [`references/x.md`](references/x.md)
#   -> `skills/<skill-dir>/references/x.md`
relink() {
  sed "s@\[\`references/\([A-Za-z0-9._-]*\)\`\](references/\1)@\`skills/$1/references/\1\`@g"
}

twg=the-ultimate-workflow-guidelines
pbg=project-bootstrap-guidelines

# --- CLAUDE.md (skill 1, Claude Code always-on) ---
{ cat build/twg.claude.head; twg_body | relink "$twg"; cat build/twg.claude.foot; } > CLAUDE.md

# --- rules/the-ultimate-workflow-guidelines.mdc (skill 1, Cursor always-on) ---
{ cat build/twg.mdc.head; twg_body | relink "$twg"; cat build/twg.mdc.foot; } \
  > rules/the-ultimate-workflow-guidelines.mdc

# --- rules/project-bootstrap-guidelines.mdc (skill 2, Cursor on-demand) ---
{ cat build/pbg.mdc.head; pbg_body | relink "$pbg"; } \
  > rules/project-bootstrap-guidelines.mdc

# --- memory-template.md: one canonical copy, mirrored into skill 2 ---
cp skills/$twg/references/memory-template.md \
   skills/$pbg/references/memory-template.md

echo "Generated: CLAUDE.md, rules/$twg.mdc, rules/$pbg.mdc, skills/$pbg/references/memory-template.md"
