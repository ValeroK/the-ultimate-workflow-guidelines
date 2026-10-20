# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| AWS Step Functions developer guide, as published in the awsdocs/aws-step-functions-developer-guide repository (2022 snapshot): `concepts-standard-vs-express.md`, `limits-overview.md`, `concepts-error-handling.md`, `amazon-states-language-map-state.md`, `input-output-resultpath.md` | AWS documentation | Every fact marked [G]: Standard and Express semantics and durations, the integrations Express lacks, the 25,000-event history, the 256 KB payload, which errors `States.ALL` does not catch, retrier defaults, inline Map throttling, `Catch` without `ResultPath` |
| aws/agent-toolkit-for-aws, `aws-serverless` skill, `orchestration` reference (2026) | Apache-2.0 | Distributed Map, `JitterStrategy`, task timeouts and heartbeats, `Choice` defaults, billing of retries. Marked [T] |
| wshobson/agents, `workflow-orchestration-patterns` skill and its details reference | MIT | Deterministic workflow code, versioning changes to running workflows, bounded activity retries |
| wshobson/agents, `saga-orchestration` skill and its details reference | MIT | The compensation rules: completed steps only, reverse order, "already gone" counts as done, failed compensations to a dead-letter queue with an alert, a timeout per step, a test per failing step, the stuck-compensating symptom |

Checked on 2026-10-20 by fetching the files above; docs.aws.amazon.com was not reachable from the build session. Not found in the 2022 guide, so marked [T]: Distributed Map, `JitterStrategy`. The guide gives execution names as unique per account and Region; the toolkit's 90-day deduplication by name was not confirmed and is left out.
