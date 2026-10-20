# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| alirezarezvani/claude-skills `feature-flags-architect` and its `flag_lifecycle.md` and `rollout_strategies.md` references | MIT | Flag removal order |
| wshobson/agents `deployment-pipeline-design`; affaan-m/ECC `deployment-patterns`; itsmostafa/aws-agent-skills `ecs` | MIT | Stalled canary analysis, rollback against applied migrations, keeping the previous artifact, the ECS circuit breaker's rollback flag |
| github/awesome-copilot `se-gitops-ci-specialist`; awslabs/aidlc-workflows `aidlc-pipeline-deploy-agent` | MIT; MIT-0 | A rollback blocked by a migration, forward-only migrations |

The maintainer's check of the live AWS pages on 2026-10-20 (Amazon ECS API reference, CodeDeploy and Lambda guides, an AWS blog on AppConfig) confirmed the items marked [R]. Every other item is [T] or our own reasoning, and none states a number. Left out: abort thresholds, ring percentages and flag lifetimes (arbitrary), whether a canary or kill switch is needed (the architect), migration SQL (the data expert).
