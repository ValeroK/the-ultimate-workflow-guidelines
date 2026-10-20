# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| AWS Lambda developer guide, as published in the awsdocs/aws-lambda-developer-guide repository: `with-sqs.md`, `invocation-eventfiltering.md`, `with-kinesis.md`, `with-ddb.md`, `invocation-async.md`, `configuration-concurrency.md`, `provisioned-concurrency.md`, `API_CreateEventSourceMapping.md` | Late-2022 snapshot, read 2026-10-20 | AWS documentation | Facts marked [D] about Lambda: the six-times visibility timeout, the 6 MB invocation payload, filter deletion, FIFO scaling by group, partial batch rules, stream checkpoints, asynchronous retries, reservation limits |
| Amazon DynamoDB, S3, SNS and EventBridge developer guides in the same awsdocs form | 2022 to 2023 snapshots, read 2026-10-20 | AWS documentation | 24-hour stream retention, S3 notification delivery and key encoding, DLQ queue policies for EventBridge and SNS, VPC networking |
| docs.aws.amazon.com: Lambda quotas, SQS filtering, scaling, error handling and configuration, DynamoDB Streams, VPC, async invocation, concurrency, SnapStart, the `ScalingConfig` and `CreateEventSourceMapping` API references, Kinesis on-failure destinations, troubleshooting; the SQS redrive page | Checked live by the maintainer, 2026-10-20 (architect fact-check, round 2, items 1 to 21f) | AWS documentation | Every fact marked [R] |
| aws/agent-toolkit-for-aws, `aws-serverless` skill and its `event-sources`, `concurrency` and `production` references | 2026, read 2026-10-20 | Apache-2.0 | What matters in this area; idempotency keys by source; marked [T] where not confirmed |
| awslabs/agent-plugins, `aws-lambda` skill | 2026, read 2026-10-20 | Apache-2.0 | Subnet address exhaustion, marked [T] |

Left out, and why: a throttled synchronous caller getting a 429 (obvious to a strong reviewer); Kinesis shard read capacity (its home is `aws-messaging`); the 2022 scaling figures and the 256 KB asynchronous payload (superseded by the live check); Lambda timeouts above 900 seconds and `ParallelizationFactor` ranges (the API refuses them); IPv6 egress from a VPC function (not found in the live check).
