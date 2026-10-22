# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| AWS developer guides for SQS, SNS, EventBridge and Kinesis Data Streams, as published in the awsdocs GitHub repositories | 2022 to 2023 snapshots, read 2026-10-20 | AWS documentation | Facts marked [D]: ordering and deduplication, retention and visibility ranges, redrive allow policies, SNS filter scope, subscription DLQs, delivery retries, FIFO topic endpoints, Classic target retries and the five-target limit, archive replay, Kinesis retention, record size, shard throughput and order |
| docs.aws.amazon.com: SQS DLQs, redrive, quotas, polling, high-throughput FIFO and fair queues; SNS message attributes and numeric filtering; EventBridge `PutEvents` and the new Custom Event Bus retry, subscriber and replay pages; redis.io Pub/Sub | Checked live by the maintainer, 2026-10-20 (architect fact-check, round 2, items 21 to 32b) | AWS documentation; Redis documentation | Every fact marked [R] |
| awslabs/agent-plugins, `aws-lambda` skill and its `event-driven-architecture` reference | 2026, read 2026-10-20 | Apache-2.0 | Large payloads through S3; marked [T] where not confirmed |
| itsmostafa/aws-agent-skills, `sqs`, `sns`, `eventbridge` | Read 2026-10-20 | MIT | The constant deduplication id, the receive-limit extremes. Its claim that SNS cannot filter on the body was wrong and was not taken |
| aws/agent-toolkit-for-aws, `amazon-eventbridge-event-bus` skill | 2026, read 2026-10-20 | Apache-2.0 | That the new buses have different defaults, now confirmed live |

Left out, and why: deleting a message only after the work is durable (the architect's review reference holds it); event schema changes and `detail-type` versioning (softarch, `event-schema-evolution`); the 256 KB SQS and EventBridge limits (superseded by the live check); the per-queue high-throughput FIFO figure and the `ClientToken` part of the new bus (not found in the live check).
