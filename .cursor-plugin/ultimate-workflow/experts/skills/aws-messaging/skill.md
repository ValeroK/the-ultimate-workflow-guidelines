---
name: aws-messaging
description: Use when a change adds or changes an SQS queue, an SNS topic, an EventBridge bus, rule or subscriber, a Kinesis stream, or code that sends to one - delivery, ordering, deduplication, size limits, retries and loss.
verified: 2026-10-20
requires: EventBridge Classic rules or the new Custom Event Bus (different defaults; each row says which); SQS, SNS and EventBridge size limits as of 2026
---

# AWS messaging: SQS, SNS, EventBridge, Kinesis

## Goal

- **Lets the expert catch:** a message that is silently dropped (a filter scope that no longer matches, a target with no dead-letter queue, a DLQ that expires first), delivered twice or out of order where the consumer assumes otherwise, or rejected at a size limit the code assumes wrongly.
- **Applies to:** `AWS::SQS::*`, `AWS::SNS::*`, `AWS::Events::*`, `AWS::EventsV2::*`, `AWS::Kinesis::*`, their Terraform and CDK forms, redrive and filter policies, and `SendMessage`, `Publish`, `PutEvents` and `PutRecords` calls.
- **Not for:** Lambda as a consumer (`lambda-event-sources`); event schema compatibility (softarch, `event-schema-evolution`); queue and topic policies' source conditions and IAM (security); what an IaC change replaces (devops); a consumer that acknowledges before the work is durable (the architect's review reference holds it).

Sources: **[D]** the SQS, SNS, EventBridge and Kinesis Data Streams developer guides as published in the awsdocs repositories (2022 to 2023 snapshots); **[R]** the maintainer's live check of docs.aws.amazon.com and redis.io (2026-10-20); **[T]** AWS or community agent skills (2026), not checked; **[O]** our own reasoning. A [D] value may be out of date where an [R] row gives a newer one; a [T] or [O] item is a prompt to check the current page, not a finding on its own.

## First, establish the target

- **Queue type:** SQS standard or FIFO, and whether FIFO high-throughput mode is on.
- **Which EventBridge:** Classic rules and targets (`AWS::Events::Rule`), or the new Custom Event Bus with subscribers (`AWS::EventsV2::`, `eventsv2`). Their retry defaults and dead-letter records differ.
- **Every consumer of the queue, topic or bus,** including ones in other stacks you cannot see; say so when you cannot.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## SQS

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A standard queue delivers at least once in no promised order; a FIFO queue orders strictly within a message group [D] | A consumer assuming order on a standard queue; a FIFO producer giving every message its own group id and expecting global order | Order-independent consumers |
| FIFO deduplication needs content-based deduplication or a deduplication id, and lasts 5 minutes [D]; a constant deduplication id drops everything after the first message [T] | A FIFO queue with neither; a constant id; content-based deduplication where two real messages can share a body | Standard queues |
| High-throughput FIFO limits are per partition: 3,000 messages a second batched, 300 unbatched [R] | A plan sizing a FIFO queue from those figures as if they were per queue | |
| `MessageGroupId` on a standard queue turns on fair queues, so one tenant's backlog does not raise others' dwell time [R] | A multi-tenant standard queue whose producers send no `MessageGroupId` | A queue with one tenant, or per-tenant order needed (FIFO) |
| Retention defaults to 4 days, 60 seconds to 14 days [D], and counts from the original enqueue time, not the move to the DLQ, so the DLQ's retention must be longer than the source's [R] | A DLQ whose `MessageRetentionPeriod` is equal to or shorter than its source queue's | |
| The visibility timeout defaults to 30 seconds, at most 12 hours [D] | A consumer whose work can outlast it (for Lambda, the six-times rule in `lambda-event-sources`) | |
| The receive limit decides how soon a failing message dead-letters [D]; 1 dead-letters any transient failure, a very high value retries a poison message for days [O] | `maxReceiveCount: 1`, or a value in the hundreds | Consumers that handle their own retries |
| Moving messages back from a DLQ needs a redrive allow policy and a redrive task [D]; a redriven message gets a new `messageId` and enqueue time, and its retention restarts [R] | A recovery plan that says "redrive" with neither, or a consumer that deduplicates on `messageId` | No recovery step claimed |
| Short polling is used unless the queue or the call sets a wait; long polling waits at most 20 seconds [R] | A new consumer loop with no `WaitTimeSeconds` and a queue with `ReceiveMessageWaitTimeSeconds` 0 | A loop that must return at once across several queues |
| The maximum message size is 1 MiB; larger payloads go to S3 with a reference in the message [R] | Code that rejects or splits SQS messages at 256 KB, or sends payloads that can pass 1 MiB | The Extended Client Library is used |

## SNS

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A filter policy applies to message attributes by default, or to the body with `FilterPolicyScope: MessageBody` [D] | A publisher moving a field between attributes and body while the subscription's scope stays the same: messages silently stop arriving | Subscriptions with no filter |
| Numeric filter operators match Number attributes, string rules match String ones [R] | A filter of `["100"]` while the publisher sends `DataType: Number`, or the reverse | |
| The dead-letter queue belongs to the subscription, not the topic [D] | A DLQ set on a topic, or a new subscription without one | |
| SNS stores nothing: server-side errors are retried (for SQS and Lambda endpoints up to 100,015 times over 23 days), while client-side errors such as a deleted endpoint or a missing permission are not, and the message is discarded unless the subscription has a DLQ [D] | A new subscription with no redrive policy, or a permission removed from a target | |
| A FIFO topic delivers only to SQS FIFO queues [D] | A FIFO topic wired straight to Lambda | Standard topics |
| A message, attributes included, is limited by the topic's `MaximumMessageSize`, 262,144 bytes by default [R] | A publisher sending payloads that can pass 256 KB with no Extended Client | |

## EventBridge

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Classic rules: a target is retried for 24 hours and up to 185 times by default, then the event is dropped unless the target has a DLQ; permission and missing-resource errors go to the DLQ without retry [D] | A Classic target with no `DeadLetterConfig`, or a lowered retry count or age with no DLQ | Events that may be lost |
| Classic rules: at most five targets per rule [D] | A sixth target | |
| New Custom Event Bus: a subscriber's retry defaults to 5 attempts (0 to 185) and 300 seconds (60 to 86,400), far shorter than Classic's [R] | A subscriber that relies on Classic's 24-hour retries with no `RetryPolicy` and no DLQ | Classic rules |
| New Custom Event Bus: a FIFO subscriber's DLQ is a FIFO queue, and the DLQ holds metadata records (event ids and times), not the events; recovery replays from the bus [R] | A standard queue as a FIFO subscriber's DLQ, or DLQ consumer code that parses the business event from the record | Classic rules, whose DLQ receives the event |
| New Custom Event Bus: a subscriber gets an event only if it matches every filter across scopes (ANDed), a duplicate publish returns `DEDUPLICATED`, and a replayed event carries `aws:DeliveryType` `REPLAY` [R] | Filters expected to OR across scopes; `DEDUPLICATED` handled as an error to retry; a non-idempotent target that ignores `REPLAY` | A subscriber with no filter |
| New Custom Event Bus FIFO: a failing event blocks the later events in its group for as long as it is retried [R] | A long retry window with coarse event-group ids on a path that cannot wait | Non-FIFO subscribers |
| A `PutEvents` entry can be up to 1 MB; larger payloads go to S3 [R]. A target can have a lower limit [T] | Producer code splitting or rejecting entries at 256 KB, or sending more than 1 MB | |
| Archive and replay re-deliver events to today's consumers, not necessarily in the original order [D] | An archive added "for recovery" in front of consumers that send, charge or publish with no idempotency key, or that rely on order | Idempotent, order-free consumers |

## Kinesis Data Streams

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Retention defaults to 24 hours, up to 365 days [D] | A consumer outage longer than the retention, with no replay source | |
| A record's payload is at most 1 MB before encoding [D] | Records that can grow past it | |
| Each shard takes 1 MB/s or 1,000 records/s of writes, and gives 2 MB/s of reads shared by all standard consumers; enhanced fan-out gives each consumer its own 2 MB/s per shard [D] | A new consumer on a stream read at capacity; a hot partition key sending most writes to one shard | Low-volume streams |
| Records are ordered within a shard, per partition key [D] | A consumer assuming order across partition keys | |

## Redis as a message bus

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Redis Pub/Sub delivers at most once: a subscriber that is disconnected misses the message for good; Streams persist messages and support at-least-once consumer groups [R] | `PUBLISH`/`SUBSCRIBE` used for work that must not be lost | Ephemeral notifications such as presence or cache-invalidation hints |

## Not a finding

- A standard queue with no `MessageGroupId` that serves one tenant.
- A Classic rule target relying on the default 24-hour retry with a DLQ set.
- A DLQ with the maximum 14-day retention behind a source with less.
- Short polling in a loop that must return immediately across several queues.
- A message under 256 KB sent without the Extended Client.
