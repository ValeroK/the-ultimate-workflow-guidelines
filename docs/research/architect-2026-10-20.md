# Architect fact-check, 2026-10-20 (part 1 of the reply)

The maintainer's live check of round-2 prompt 2 (`docs/research/fact-check-round-2-prompts.md`), with open web access. Item numbers are the architect ledger's (`docs/experts/ledgers/architect.md`, section 4). The pasted reply stopped inside item 35, so items 35 onward are still waiting. Facts are restated in the skills, not copied.

## Results

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Lambda timeout 900 s; Managed Instances up to 90 min when invoked asynchronously or by an event source mapping | confirmed | Lambda quotas |
| 2 | SQS mapping: a JSON body filter drops a plain-string message from the queue | confirmed; a filter on metadata only is the exception | Lambda SQS filtering |
| 3 | SQS mapping default scaling: starts at 5, adds up to 300 per minute, caps at 1,250 | confirmed; not checkable in a diff | Lambda SQS scaling |
| 4 | `ScalingConfig.MaximumConcurrency` range 2 to 1,000 | confirmed | Lambda API |
| 5 | `MaximumConcurrency` and provisioned mode are mutually exclusive | confirmed | Lambda SQS scaling |
| 6 | SQS provisioned mode: 1 MB/s or 10 concurrent invokes per poller, 3x faster scaling, 16x higher ceiling | confirmed as worded; the SQS-specific poller defaults were not shown (the API maximum of 10,000 pollers covers all mapping types) | Lambda SQS scaling |
| 7 | FIFO with `ReportBatchItemFailures`: stop at the first failure and return it and every later message | confirmed | Lambda SQS error handling |
| 8 | Up to two Lambda readers per DynamoDB Streams shard, single-Region tables only | confirmed | Lambda DynamoDB |
| 9 | Asynchronous invocation payload is 1 MB | confirmed (no longer 256 KB); synchronous stays 6 MB | Lambda quotas |
| 10 | Reserved concurrency 0 stops the function | confirmed | Lambda concurrency |
| 11 | SnapStart does not support provisioned concurrency | confirmed | Lambda SnapStart |
| 12 | Each function scales by 1,000 environments every 10 seconds | confirmed; not checkable in a diff | Lambda concurrency |
| 13 | Account-wide requests per second = 10 x account concurrency | confirmed; not checkable in a diff | same |
| 14 | `MaximumRecordAgeInSeconds`: -1, or 60 to 604,800 | confirmed | Lambda API |
| 15 | Kinesis mapping on-failure destination: SQS, SNS, S3 or Kafka | confirmed; asynchronous-invoke destinations differ (EventBridge, no Kafka) | Lambda Kinesis |
| 16 | `BisectBatchOnFunctionError` splits a failed batch | confirmed, and it cannot be enabled when `MaximumRetryAttempts` is -1 (the default). Whether a split counts against retries: not found | Lambda troubleshooting |
| 17 | At most 5 filters per mapping by default (10 on request), ORed; DynamoDB filtering has no numeric operators | confirmed | Lambda event filtering |
| 18 | One Hyperplane ENI per subnet and security-group pair, shared across functions | confirmed; subnet exhaustion: not in what was read | Lambda VPC |
| 19 | Egress-only internet gateway for IPv6 from a VPC function | **not found** | Lambda VPC |
| 20 | Asynchronous invoke returns success once queued | confirmed | Lambda async |
| 21 | A message redriven out of a DLQ gets a new `messageId` and enqueue time, and its retention restarts | confirmed | SQS redrive |
| 21a | Reserved concurrency below the sum of the function's SQS `MaximumConcurrency` values throttles | confirmed | Lambda SQS scaling |
| 21b | Provisioned concurrency warms environments; SQS polling capacity is the mapping's provisioned mode | confirmed as restated | Lambda SQS |
| 21c | Concurrency = requests per second x duration in seconds | confirmed; not checkable in a diff | Lambda concurrency |
| 21d | `LATEST` on a stream mapping can miss records written during creation; `TRIM_HORIZON` does not | confirmed | Lambda DynamoDB |
| 21e | `ParallelizationFactor` 1 to 10 | confirmed | Lambda API |
| 21f | FIFO mapping batch size at most 10; above 10 (standard queues) needs a batch window of at least 1 s | confirmed | Lambda SQS configure |
| 22 | Retention counts from the original enqueue time, so a DLQ's retention must exceed the source queue's | confirmed | SQS DLQ |
| 23 | SQS maximum message size is 1 MiB | confirmed (no longer 256 KiB) | SQS quotas |
| 24 | SNS message, attributes included, defaults to 256 KB | confirmed; the page calls it the topic's configured `MaximumMessageSize`, so it may be settable | SNS attributes |
| 25 | EventBridge `PutEvents` entry up to 1 MB | confirmed (no longer 256 KB); a target can be lower, such as Step Functions at 256 KB | EventBridge PutEvents |
| 26 | Short polling unless the queue or the call sets a wait; long polling maximum 20 s | confirmed | SQS polling |
| 27 | High-throughput FIFO: per partition, 3,000 messages/s batched or 300 unbatched | **different in scope**: the figures are per partition; the per-queue figure was not shown | SQS high-throughput FIFO |
| 28 | `MessageGroupId` on a standard queue turns on fair queues | confirmed | SQS fair queues |
| 29 | SNS numeric filters match Number attributes; string rules match String | confirmed | SNS filtering |
| 30 | New Custom Event Bus subscriber retry: attempts 0 to 185 (default 5), age 60 to 86,400 s (default 300) | confirmed; shorter than Classic's 24 h and 185 attempts | EventBridge custom bus |
| 31 | New Custom Event Bus: a FIFO subscriber's DLQ is a FIFO queue, and it holds metadata records, not the events | confirmed; redrive replays from the bus | same |
| 32 | New Custom Event Bus: filters across scopes are ANDed; a duplicate returns `DEDUPLICATED`; a replayed event has `aws:DeliveryType` `REPLAY` | confirmed | same |
| 32a | New Custom Event Bus FIFO: a failing event blocks later events in its group while it retries | confirmed; the `ClientToken` part was not found | same |
| 32b | Redis Pub/Sub is at most once; Streams persist and support at least once | confirmed | redis.io |
| 33 | Distributed Map is Standard-only and runs 10,000 children by default | confirmed; children may be Express | Step Functions |
| 34 | Retriers support `JitterStrategy` `FULL` | confirmed; the default (`NONE`) was not shown | Step Functions |
| 35 to 74 | The rest of the reply, 2026-10-21 | see `architect-items-35-on-2026-10-21.md` | |

## Our assessment of the reply

- **Several answers rest on search snippets, not the pages.** The prompt asked for the page, not a search result. Items 6, 16, 18, 19, 27, 32a and 34 say a part was "not in the snippet". Their confirmed halves can be used; the missing halves stay out.
- **Size limits moved in 2025-2026.** Asynchronous Lambda payloads, SQS messages and EventBridge entries are now 1 MB. Code that splits or rejects at 256 KB is now a finding only where the target is still 256 KB, such as SNS by default or Step Functions.
- **The "new Custom Event Bus" (items 30 to 32a) is a different product from Classic rules**, and its defaults differ. The skills must name which bus a row is about. Our `aws-messaging` selector already matches `eventsv2`.
- **Some exceptions are not exceptions**, for example item 8 repeats the claim and item 10 restates the purpose. They are not carried into the skills.
- Item 1's exception mentions Lambda durable functions with a one-year lifetime. That is the reply's own text, not a quoted fact, so `plan.md` still names only "a workflow engine such as Step Functions, or a container".

## Changes this drives

- `references/review.md`: the queue category again names a consumer that keys on the transport's `messageId`, which a DLQ redrive changes (item 21).
- `lambda-event-sources`, `aws-messaging`, `step-functions`: Phase 3 rows from items 1 to 34, with the 1 MB limits, the new-bus defaults, and DLQ retention longer than the source's.
