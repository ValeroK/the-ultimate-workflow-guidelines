# What changed from the sources

Kept as ideas: see NOTICE.md in the folder above. Everything is restated.

## 2026-10-20: first version

Compared 18 upstream DevOps, Terraform, Kubernetes, CI and deployment agents (awesome-copilot, wshobson, buildwithclaude, agency-agents, alirezarezvani, awslabs aidlc). None reviews an infrastructure change for what it will replace or destroy with evidence from the diff; that core was written from the vendors' documentation.

- Review categories: a change that destroys or replaces data, protection removed, shared or unlocked state, a build that cannot be repeated, what runs is not what was reviewed, deploys that race or stop halfway, promotion skipped, migration order, a rollback that no longer works, containers that do not stop or start cleanly, Kubernetes rollout and health.
- Method: sort infrastructure changes by create, update, replace and destroy; a replacement or default claimed from memory is a suspicion; resolve every named target.
- Boundaries: system design, high availability and whether a rollback is designed at all stay the architect's; CI workflow security, secrets and IAM stay security's; whether a test or gate can fail stays quality's. A version left unpinned is this expert's only as "the build cannot be repeated".
- Not taken: personas, executors that apply or deploy, fixed thresholds (replica counts, watch times, latency targets), Kubernetes-first or GitOps-first defaults, "fetch the latest module version", checklists that ask for everything.
- Not measured.

## 2026-10-20: the Goal and Responsibilities restructure

- The agent file has a Goal (prevents, done well, not the goal), a Responsibilities table with an owner and a border rule for every area, and two to four judging rules. The shared rules (zero is correct, evidence, confidence, severity, untrusted input, the web) moved to `experts/protocol.md`, which the agent reads first.
- Plan and tests references open with the stage's outcome, define no return fields (the workflow schema holds them), and give one good and one rejected constraint, or one worked case.
- The review reference has a stop rule in its method, a "Not when" on every category, its own high, medium and low, and one worked finding with one dropped candidate. Result, Confidence and Untrusted input sections are gone.
- At least half of the negative selection examples are near misses with their owner named.
- Review gained "Volumes and persistent data in Kubernetes", a ConfigMap change no pod template carries, and a severity rubric; the build brief gained "When not to" and "When you report". Four lines that rest on unconfirmed round-2 claims were held back.
- Selectors: Terraform Stacks files, and a duplicate CloudFormation pattern removed.
- Skills not yet converted: waiting for the round-2 reply.
- Not measured since the restructure.
