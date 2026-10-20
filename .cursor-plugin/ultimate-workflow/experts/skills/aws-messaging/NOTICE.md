# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| AWS developer guides for SQS, SNS, EventBridge and Kinesis Data Streams, as AWS last published them in the awsdocs GitHub repositories (2022 to 2023 snapshots) | AWS documentation | Every fact marked [G]: ordering and deduplication, retention and visibility ranges, redrive, SNS filter scope, subscription dead-letter queues, delivery retries, FIFO topic endpoints, EventBridge target retries and the five-target limit, entry size, archive and replay order, Kinesis retention, record size, shard throughput and ordering |
| awslabs/agent-plugins, `aws-lambda` skill and its `event-sources` and `event-driven-architecture` references (2026) | Apache-2.0 | Dead-letter retention, schema versioning by `detail-type`, fan-out beyond five targets, the 1 MB sizes marked [T] |
| itsmostafa/aws-agent-skills, `sqs`, `sns`, `eventbridge` skills | MIT | Receive limit range, deleting only after durable work, SNS as push with nothing stored. Its claim that SNS cannot filter on the body was wrong and was not taken |
| aws/agent-toolkit-for-aws, `amazon-eventbridge-event-bus` skill (2026) | Apache-2.0 | That the newer EventBridge buses have different defaults; their details are not included |

Checked on 2026-10-20; docs.aws.amazon.com was not reachable from the build session. Where the 2023 guide and a 2026 source give different sizes, both are shown.
