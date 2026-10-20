# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| aws/agent-toolkit-for-aws, `aws-serverless` skill and its `event-sources`, `concurrency` and `production` references (2026) | Apache-2.0 | The selection of what matters: filters that delete, partial batch failure edge cases, poison records in streams, how concurrency settings interact, idempotency keys by source. Facts that come only from here are marked [T] in the skill |
| aws/agent-toolkit-for-aws, `aws-messaging-and-streaming` skill | Apache-2.0 | Dead-letter queues for EventBridge and SNS needing a queue policy |
| AWS Lambda developer guide, as published in the awsdocs/aws-lambda-developer-guide repository (snapshot of late 2022, before AWS removed the sources from GitHub): `with-sqs.md`, `invocation-eventfiltering.md`, `with-kinesis.md`, `with-ddb.md`, `invocation-async.md`, `configuration-concurrency.md`, `provisioned-concurrency.md`, `API_CreateEventSourceMapping.md` | AWS documentation | Every fact marked [G] about Lambda: the six-times visibility timeout, batch limits, filter deletion, FIFO scaling, batch failure rules, stream retry and age defaults, asynchronous retries, reservation limits |
| Amazon DynamoDB, SNS and EventBridge developer guides in the same awsdocs form (2022 to 2023 snapshots) | AWS documentation | 24-hour stream retention, two readers per shard, dead-letter queue policies |
| awslabs/agent-plugins, `aws-lambda` skill and its references (2026) | Apache-2.0 | Concurrency sizing, the newer burst rate, subnet address exhaustion; marked [T] |
| Amazon S3 user guide and Kinesis Data Streams developer guide in the same awsdocs form (2023 snapshots) | AWS documentation | S3 notification delivery, order and key encoding; shard read capacity and enhanced fan-out |
| AWS SDK for Go, Lambda API reference, checked 2026-10-20 | AWS documentation | `MaximumConcurrency` with a minimum of 2 [R] |

Checked on 2026-10-20 by fetching the files above; docs.aws.amazon.com was not reachable from the build session. Where the 2022 guide and the 2026 toolkit differ (the scaling rate), the skill gives both. Not found in the 2022 guide, so marked [T]: the upper bound of `MaximumConcurrency`, the newer scaling rate, SnapStart with provisioned concurrency.
