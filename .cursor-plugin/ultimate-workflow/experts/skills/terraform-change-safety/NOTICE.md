# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| HashiCorp Terraform documentation, as published in hashicorp/web-unified-docs (v1.16 docs at cbb6294, 2026-10-20; v1.5, v1.10 and v1.11 folders for version floors): `language/meta-arguments/lifecycle.mdx`, `language/modules/develop/refactoring.mdx`, `language/state/refactor.mdx`, `language/meta-arguments/for_each.mdx`, `language/files/dependency-lock.mdx`, `language/expressions/version-constraints.mdx`, `language/backend/s3.mdx`, `language/manage-sensitive-data/index.mdx`, `cli/commands/plan.mdx`, `cli/commands/apply.mdx` | BUSL-1.1 (repository licence); facts restated, no text copied | Every fact marked [D] |
| antonbabenko/terraform-skill, `SKILL.md` and its references | Apache-2.0 | The checklist shape: address moves, `count` index identity, keys known at plan time, removing a provider, `check` being advisory. Its version numbers were not used; where it disagreed with itself the documentation decided |
| github/awesome-copilot `terraform-iac-reviewer`; hashicorp/agent-skills `terraform-style-guide` | MIT; MPL-2.0 | Sorting changes by create, update, replace and destroy; committing the lock file |

Left out: style and naming, test syntax (the quality expert), secrets in state and IAM (the security expert), and the stale-plan rejection claim, which the documentation read does not state.
