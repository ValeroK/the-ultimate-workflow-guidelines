# What changed from the sources

Kept as ideas: see NOTICE.md in the folder above. Everything is restated.

## 2026-10-20: first version

Compared 18 upstream DevOps, Terraform, Kubernetes, CI and deployment agents (awesome-copilot, wshobson, buildwithclaude, agency-agents, alirezarezvani, awslabs aidlc). None reviews an infrastructure change for what it will replace or destroy with evidence from the diff; that core was written from the vendors' documentation.

- Review categories: a change that destroys or replaces data, protection removed, shared or unlocked state, a build that cannot be repeated, what runs is not what was reviewed, deploys that race or stop halfway, promotion skipped, migration order, a rollback that no longer works, containers that do not stop or start cleanly, Kubernetes rollout and health.
- Method: sort infrastructure changes by create, update, replace and destroy; a replacement or default claimed from memory is a suspicion; resolve every named target.
- Boundaries: system design, high availability and whether a rollback is designed at all stay the architect's; CI workflow security, secrets and IAM stay security's; whether a test or gate can fail stays quality's. A version left unpinned is this expert's only as "the build cannot be repeated".
- Not taken: personas, executors that apply or deploy, fixed thresholds (replica counts, watch times, latency targets), Kubernetes-first or GitOps-first defaults, "fetch the latest module version", checklists that ask for everything.
- Not measured.
