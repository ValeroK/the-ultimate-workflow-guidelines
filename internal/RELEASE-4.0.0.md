# Release 4.0.0: what is done and what is left

Prepared 2026-10-22 on branch `ccr-65eb9df4-gqc0c9` (PR #17).

## Done

- Version 4.0.0 in all five version fields: both `plugin.json` files and both marketplace catalogs.
- Descriptions in those files name the nine experts and fifty skills.
- `CHANGELOG.md`: the section above 3.1.0 says why this is a major version (Gate G6 with the gates on), lists the nine experts, the fifty skills, what was measured and what it shows (no gain on real defects yet), and the known gaps.
- `README.md` and `docs/index.html`: nine experts, fifty skills, the honest measurement summary, `/ultimate-workflow:expert-attribution`.

## Left, in order

1. **Apply prompt L and block F** when their replies come back: record them in `docs/research/fact-check-replies-2026-10-22.md` (or a new dated file), retag or correct the rows they cover, and write the data expert's other skills if F is read from full pages. Add one changelog line for each.
2. **Exercise Gate G6 once in a real Claude Code session**, with the gates on: a plan with `experts:`, an edit, `git commit` refused, `/ultimate-workflow:experts`, the commit allowed. Remove that item from the changelog's Known gaps if it works; record what broke if not.
3. **Rename the changelog heading** from `## [Unreleased]` to `## [4.0.0] - <date>`, and add the compare links at the bottom if the file has them. The docs test accepts either heading.
4. **Run the full check**: `node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js`.
5. **Merge PR #17 into `main`** (it is a draft; mark it ready first).
6. **Tag and release:** `git tag v4.0.0 && git push origin v4.0.0`. `release-skills.yml` builds the plugin ZIP and the two skill ZIPs and publishes the release. Or run the workflow by hand with `tag: v4.0.0`, `target: main`.
7. **Install from the marketplace** in a clean project and check that `/ultimate-workflow:plan` and `/ultimate-workflow:expert-attribution` exist.
