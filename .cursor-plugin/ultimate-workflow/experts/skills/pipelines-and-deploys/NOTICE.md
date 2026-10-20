# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| GitHub documentation, as published in github/docs (commit 6664638, 2026-10-19): workflow syntax, usage limits, concurrency, deployments and environments, dependency caching, artifact retention, reusing workflows, scheduled events, skipped checks, events triggered by `GITHUB_TOKEN` | CC BY 4.0 | Every fact marked [D] |
| github/awesome-copilot `github-actions-expert`, `github-actions-efficiency`; wshobson/agents `deployment-engineer`, `deployment-pipeline-design`; awslabs/aidlc-workflows `aidlc-pipeline-deploy-agent` | MIT; MIT-0 | Deploy concurrency keyed on the target, build once and promote, promotion order, cache keys from the lock file, applying the reviewed plan |

Left out: workflow security (triggers, permissions, action pinning, OIDC, cache poisoning), which the security expert owns; checks that cannot fail, which quality owns; CI efficiency savings. GitLab is covered by no source read and is marked as unchecked in the skill.
