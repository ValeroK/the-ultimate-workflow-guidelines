# Lambda event sources and concurrency

Use this when a change adds or changes a queue or stream that triggers Lambda (an event source mapping for SQS, Kinesis or DynamoDB Streams), an asynchronous invocation path, or a function's concurrency settings. It holds how these behave when something goes wrong, which is where a working-looking configuration loses or repeats messages.

Each fact carries its source: **[G]** AWS's Lambda, SQS, SNS, EventBridge and DynamoDB developer guides (AWS-written, in their late-2022 form); **[R]** AWS pages checked by the maintainer on 2026-10-20; **[T]** AWS's own agent toolkit (2026), not yet checked against the current guide. A [T] number is a prompt to check, not a finding on its own: when a decision turns on it, fetch the current page and say what you found.

## SQS triggers

| Rule | What breaks it in a change |
|---|---|
| The queue's visibility timeout is at least six times the function timeout, plus the batching window when one is set [G] | A shorter visibility timeout: the message becomes visible again while the first invocation still runs, and is processed twice |
| Batch size is up to 10,000 for a standard queue and 10 for FIFO; the batching window is 0 to 300 seconds and must be at least 1 second when the batch size is above 10; an invocation payload is at most 6 MB [G] | A batch size or window outside these, or a batch of large messages that can pass 6 MB |
| A message that does not match the event source's filter is deleted from the queue [G]. A filter on a JSON field silently drops a plain-text body [T] | A new or changed `FilterCriteria`: say what happens to the messages it rejects |
| A FIFO queue scales to the number of active message groups, one batch per group at a time [G] | A FIFO queue with one message group id expecting parallel processing |
| Scaling out takes time: Lambda starts with five concurrent batches and adds more per minute (the 2022 guide: up to 60 more per minute and 1,000 at most; the 2026 toolkit: 300 more per minute and 1,250 by default) [G, T] | A plan that expects a sudden backlog to drain at once |
| `ScalingConfig.MaximumConcurrency` caps one source, minimum 2 [R], maximum 1,000 [T] | Missing on a source that feeds a limited downstream (see `aws-well-architected`) |
| `MaximumConcurrency` reserves nothing: other callers can still use up the function's concurrency, and reserved concurrency below the sum of the caps throttles the sources [T] | A function shared by an API and a queue, with caps but no reserved concurrency |

## Partial batch failures

With `ReportBatchItemFailures`, the function returns the ids of the records that failed.

- **SQS** [G]: the whole batch is retried when the function throws, returns invalid JSON, or returns an empty or null `itemIdentifier`, a wrong key name, or an id not in the batch. An empty `batchItemFailures` list means every record succeeded.
- **Streams** [G]: Lambda checkpoints at the lowest failed sequence number, so everything after it is retried.
- **FIFO**: stop at the first failure and report it and every record after it, or the order is broken [T].

A handler that catches every error per record and reports none has turned failures into successes (see `failure-handling`).

## Streams: Kinesis and DynamoDB Streams

| Rule | What breaks it |
|---|---|
| `MaximumRetryAttempts` and `MaximumRecordAgeInSeconds` default to -1, infinite; they go up to 10,000 retries and 604,800 seconds [G] | A new stream mapping with neither set: one bad record blocks its shard until the record expires |
| DynamoDB Streams keep records for 24 hours [G] | So a poison record on a DynamoDB stream can block a shard for a day |
| Bound it with `BisectBatchOnFunctionError`, a retry limit, a maximum age and an on-failure destination (an SQS queue or SNS topic) [G] | A stream mapping without an on-failure destination drops what it gives up on |
| No more than two processes read one DynamoDB stream shard at the same time [G]; one for global tables [T] | A third consumer added to the same table's stream |

## Asynchronous invocation

Lambda retries throttles and system errors for up to 6 hours, and retries a function error twice more by default (0 to 2), up to a maximum event age of 6 hours [G]. So the handler must be idempotent, and a new asynchronous path needs an on-failure destination or a dead-letter queue, or events that exhaust their retries are dropped.

## Concurrency

| Rule | What breaks it |
|---|---|
| Reserved concurrency can be set up to the unreserved account concurrency minus 100 [G]; reserved concurrency of 0 stops every invocation [T] | A leftover `0` from an incident, or reservations that starve every other function |
| Provisioned concurrency cannot exceed reserved concurrency and cannot be set on `$LATEST` [G]; it cannot be combined with SnapStart [T] | Provisioned concurrency on an unpublished version or above the reservation |
| Provisioned concurrency is paid while idle and does not drain a queue backlog faster; the poller settings do [T] | Provisioned concurrency added to fix a queue backlog |
| A synchronous caller that is throttled gets a 429 [T] | An API path with no handling for it |

## Idempotency keys by source

Use the id the source gives for the same delivery: SQS `messageId`, EventBridge event `id`, DynamoDB Streams `eventID`, an `Idempotency-Key` header for an API. Keep the key at least as long as the source can redeliver: for SQS, the receive limit times the visibility timeout [T].

## Dead-letter queues that need a policy

An SQS queue used as the dead-letter queue of an EventBridge target or an SNS subscription must have a queue policy that lets `events.amazonaws.com` or `sns.amazonaws.com` send to it. The console adds it for a queue in the same account; through the API or infrastructure code you add it yourself [G]. A dead-letter queue without it receives nothing, silently.
