---
name: lambda-event-sources
description: Use when a change adds or changes a queue, stream or event that triggers Lambda (an SQS, Kinesis or DynamoDB Streams event source mapping, an asynchronous invocation, an S3 notification) or a function's concurrency settings - how these lose or repeat messages, and how they scale.
verified: 2026-10-20
requires: AWS Lambda event source mappings; the SQS provisioned mode and 1 MB asynchronous payload as of 2026
---

# Lambda event sources and concurrency

## Goal

- **Lets the expert catch:** a working-looking trigger configuration that loses messages (a filter that deletes, a stream with no failure destination, an asynchronous path with nowhere to put exhausted events), repeats them (a visibility timeout shorter than the work, an idempotency key that changes on redrive), or stalls (a poison record blocking a shard, caps that throttle each other).
- **Applies to:** `AWS::Lambda::EventSourceMapping`, `aws_lambda_event_source_mapping`, CDK event sources, `ScalingConfig`, `ReservedConcurrentExecutions`, provisioned concurrency, `ReportBatchItemFailures`, `FilterCriteria`, `DestinationConfig`, `VpcConfig`, and handler code that returns `batchItemFailures`.
- **Not for:** queue, topic and bus semantics on their own (`aws-messaging`); what an IaC change replaces or destroys (devops); queue policies' source conditions and IAM (security); the test that proves a duplicate is harmless (quality).

Sources: **[D]** the AWS Lambda, DynamoDB, S3, SNS and EventBridge developer guides as published in the awsdocs repositories (late-2022 to 2023 snapshots, before the sources were removed from GitHub); **[R]** the maintainer's live check of docs.aws.amazon.com (2026-10-20); **[T]** AWS or community agent skills (2026), not checked; **[O]** our own reasoning. A [D] value may be out of date where an [R] row gives a newer one; a [T] or [O] item is a prompt to check the current page, not a finding on its own.

## First, establish the target

- **The source type and queue type:** SQS standard or FIFO, Kinesis, DynamoDB Streams (single-Region or global table), asynchronous invocation, S3.
- **The function's timeout and concurrency settings,** and every mapping that feeds the same function.
- **Where the settings live:** a stack, a Terraform module, or a console setting the repository cannot show; say what you could not see.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## SQS triggers

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The queue's visibility timeout is at least six times the function timeout, plus the batching window when one is set [D] | A shorter visibility timeout: the message reappears while the first invocation runs, and is processed twice | |
| A FIFO mapping's batch size is at most 10; above 10 (standard queues) the batching window must be at least 1 second [R]; an invocation payload is at most 6 MB [D] | A larger batch on a `.fifo` queue, or large messages whose batch can pass 6 MB | |
| A message that does not match the mapping's filter is deleted from the queue [D]; a JSON body filter drops a plain-string body [R] | A new or changed `FilterCriteria` with no word on what happens to the messages it rejects, or a body filter on a queue that also receives plain text | A filter on message metadata only [R] |
| At most 5 filters per mapping by default (10 on request), ORed together; DynamoDB filtering has no numeric operators, even for numbers [R] | A sixth filter, or `{"numeric": ...}` on a DynamoDB stream mapping | Matching an exact number by its string form |
| A FIFO queue scales to the number of active message groups, one batch per group at a time [D] | A FIFO queue with one message group id expected to process in parallel | |
| Default scaling starts at 5 concurrent invocations, adds up to 300 a minute, and stops at 1,250 [R] | A plan that expects a sudden backlog to drain at once | Provisioned mode, which scales faster and higher [R] |
| `ScalingConfig.MaximumConcurrency` caps one source, 2 to 1,000 [R], and reserves nothing; reserved concurrency below the sum of the function's caps throttles the sources [R] | A source feeding a limited downstream with no cap; a function shared by an API and a queue with caps but no reservation; reserved concurrency smaller than the summed caps | A function with no reserved concurrency, drawing from the account pool |
| `MaximumConcurrency` and provisioned mode (`ProvisionedPollerConfig`) are mutually exclusive [R] | Both set on one mapping | Clearing one with an empty value while setting the other |
| Provisioned concurrency warms execution environments and does not drain a queue faster; SQS polling capacity is the mapping's provisioned mode, where each poller handles up to 1 MB/s or 10 concurrent invokes [R] | Provisioned concurrency added to fix a queue backlog | Provisioned concurrency added for cold-start latency |

## Partial batch failures

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| With `ReportBatchItemFailures` on SQS, the whole batch is retried when the function throws, returns invalid JSON, or returns an empty or null `itemIdentifier`, a wrong key name, or an id not in the batch; an empty `batchItemFailures` means every record succeeded [D] | A handler that returns ids under another key, or reports failures by throwing | |
| On a FIFO queue the function stops at the first failure and reports it and every later message [R] | A loop that records the failed `messageId` and continues | Messages from different message groups, where order is only per group [T] |
| On a stream, Lambda checkpoints at the lowest failed sequence number, so everything after it is retried [D] | A stream handler that reports a late record and expects earlier ones to stay done | |
| A handler that catches every per-record error and reports none has turned failures into successes (see `failure-handling`) [O] | | |

## Streams: Kinesis and DynamoDB Streams

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `MaximumRetryAttempts` and `MaximumRecordAgeInSeconds` default to -1, infinite; the age is -1 or 60 to 604,800 seconds [R]; DynamoDB Streams keep records 24 hours [D] | A new stream mapping with neither set: one bad record blocks its shard until it expires, a day on DynamoDB | |
| `BisectBatchOnFunctionError` cannot be enabled while `MaximumRetryAttempts` is -1, the default [R] | Bisect turned on with no finite retry count | A finite retry count is set |
| A stream mapping's on-failure destination can be SQS, SNS, S3 or Kafka [R]; without one, what Lambda gives up on is dropped [D] | A bounded stream mapping with no `DestinationConfig.OnFailure` | |
| `LATEST` as the starting position can miss records written while the mapping is created; `TRIM_HORIZON` does not [R] | `StartingPosition: LATEST` on a mapping whose consumer must see every record | Telemetry where earlier records do not matter |
| Up to two Lambda readers per DynamoDB Streams shard, stated for single-Region tables that are not global tables [R] | A third mapping on a table's stream, or a second on a global table's | |

## Asynchronous invocation

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An asynchronous call returns success as soon as the event is queued, not when the function has run [R] | Caller code that treats a 202 from `InvocationType: Event` as "done" | |
| Lambda retries throttles and system errors for up to 6 hours, and a function error twice more by default (0 to 2), up to a maximum event age of 6 hours; events that run out are dropped without an on-failure destination or a dead-letter queue [D] | A new asynchronous path with neither | Events that may be lost by design |
| With reserved concurrency of 0 the function processes nothing [R], and new asynchronous events go straight to the dead-letter queue or destination, with no retries [D] | A leftover `ReservedConcurrentExecutions: 0` | An intended kill switch, documented as one |
| The asynchronous payload limit is 1 MB; synchronous requests and responses are 6 MB [R] | Code that rejects or splits asynchronous payloads at 256 KB, or sends more than 1 MB | |

## Concurrency

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Reserved concurrency can be set up to the unreserved account concurrency minus 100 [D] | Reservations that starve every other function | |
| Provisioned concurrency cannot exceed reserved concurrency and cannot be set on `$LATEST` [D], and SnapStart does not support it [R] | Provisioned concurrency on an unpublished version, above the reservation, or beside SnapStart | |
| Concurrency needed is requests per second times average duration in seconds [R]; each function scales by 1,000 environments every 10 seconds, and the account allows 10 times its concurrency in requests per second [R] | A plan sized from requests per second alone, or expecting a sudden spike to be absorbed at once | |

## Other sources and networking

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| S3 event notifications arrive at least once, in no promised order, with the object key URL-encoded, and a function writing to the bucket that triggers it can loop [D] | A handler that writes under the triggering prefix, assumes order, or uses the key without decoding it | |
| A function attached to a VPC has no internet access, even in a public subnet, unless the route goes through a NAT gateway; AWS services need a NAT or VPC endpoints [D] | `VpcConfig` added to a function that calls an external API, with no NAT route | |
| Lambda creates one Hyperplane ENI per subnet and security-group pair and shares it [R]; many such pairs in a small subnet can run it out of addresses [T] | A distinct security group per function in the same subnets with no isolation reason | Functions that need network isolation from each other |
| An SQS queue used as the dead-letter queue of an EventBridge target or an SNS subscription needs a queue policy letting `events.amazonaws.com` or `sns.amazonaws.com` send to it; the console adds it, infrastructure code must [D] | A DLQ wired in IaC with no queue policy: it receives nothing, silently | The policy's source conditions are security's |

## Idempotency keys by source

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Key on the id the source keeps for the same delivery: EventBridge event `id`, DynamoDB Streams `eventID`, an `Idempotency-Key` header for an API [T]. A message redriven out of an SQS dead-letter queue gets a new `messageId` and enqueue time [R], so an SQS consumer that must survive a redrive keys on a business id in the body | Deduplication keyed on `messageId` for a queue whose DLQ is redriven | Queues that are never redriven |
| Keep the key at least as long as the source can redeliver: for SQS, the receive limit times the visibility timeout [T] | A key store whose time-to-live is shorter | |

## Not a finding

- A batch size above 10 on a standard queue with a batching window of at least 1 second.
- Provisioned concurrency set for cold-start latency on a synchronous path.
- A stream mapping with `TRIM_HORIZON` and bounded retries, age and an on-failure destination.
- A queue with no dead-letter queue whose messages are rebuildable, stated in the plan.
