---
name: aws-messaging
description: Use when a change adds a queue, topic, event bus or stream, for delivery, ordering, deduplication and loss.
---

# AWS messaging: SQS, SNS, EventBridge, Kinesis

Use this when a change adds or changes a queue, topic, event bus, rule or stream, or code that sends to one. It holds the delivery semantics that decide whether messages arrive once, in order, or at all. Lambda as a consumer is in `lambda-event-sources`.

Each fact carries its source: **[G]** AWS's developer guides as AWS last published them on GitHub (2022 to 2023); **[T]** AWS or community skills from 2026, not yet checked against the current guide. Where they differ, both are given: a [G] value can be out of date and a [T] value unconfirmed, so when a decision turns on it, fetch the current page.

## SQS

| Rule | What breaks it in a change | When it does not apply |
|---|---|---|
| A standard queue delivers at least once, in no promised order; a FIFO queue orders strictly within a message group [G] | A consumer that assumes order on a standard queue; a FIFO producer that gives every message its own group id and expects global order | Order-independent consumers |
| FIFO deduplication needs content-based deduplication or a deduplication id, and lasts 5 minutes [G] | A FIFO queue with neither; a constant deduplication id, which drops everything after the first message [T]; content-based deduplication where two real messages can share a body | Standard queues |
| Retention defaults to 4 days, from 60 seconds to 14 days [G]. Give a dead-letter queue the longest retention, so its evidence outlasts the investigation [T] | A dead-letter queue left at 4 days; a main queue whose backlog can outlast its retention during an outage | Queues holding only rebuildable data |
| The visibility timeout defaults to 30 seconds, at most 12 hours [G] | A consumer whose work can outlast its visibility timeout (for Lambda, see the six-times rule) | |
| The receive limit decides how soon a failing message dead-letters; 3 to 5 is the usual range [T] | 1, which dead-letters any transient failure; a very high value, which retries a poison message for days | Consumers that handle their own retries |
| Moving messages back from a dead-letter queue needs a redrive allow policy and a redrive task (standard queues) [G] | A recovery plan that says "redrive" with neither | No recovery step claimed |
| A consumer deletes a message only after the work is durable [T] | A delete before the write commits (loss); no delete (repeated work) | Event source mappings, where Lambda deletes |
| Message size: 256 KB in the guide [G]; 2026 sources say 1 MB [T]. Large payloads go to S3, with a reference in the message [T] | A message that can grow past the limit | Small, fixed-size messages |

## SNS

| Rule | What breaks it | When it does not apply |
|---|---|---|
| A filter policy applies to message attributes by default, or to the body with `FilterPolicyScope: MessageBody` [G] | A publisher that moves a field between attributes and body while the subscription's scope stays the same: messages are silently not delivered | Subscriptions with no filter |
| The dead-letter queue belongs to the subscription, not the topic [G] | A dead-letter queue set on a topic, or a new subscription without one | |
| Server-side errors are retried (for SQS and Lambda endpoints up to 100,015 times over 23 days); client-side errors, such as a deleted endpoint or a missing permission, are not retried and the message is discarded unless the subscription has a dead-letter queue [G] | A new Lambda or SQS subscription with no redrive policy, or a permission removed from a target | |
| A FIFO topic delivers only to SQS FIFO queues; a function must sit behind one [G] | A FIFO topic wired straight to Lambda | Standard topics |
| SNS stores nothing; put a queue in front of a consumer that may be down [T] | A consumer that can be unavailable, subscribed directly | Consumers that accept the retry policy as their only buffer |
| Message size 256 KB [G] | | |

## EventBridge (rules and buses)

| Rule | What breaks it | When it does not apply |
|---|---|---|
| A target is retried for 24 hours and up to 185 times by default, then the event is dropped unless the target has a dead-letter queue; permission and missing-resource errors go to the dead-letter queue without retry [G] | A target with no `DeadLetterConfig`; a lowered retry count or age with no dead-letter queue | Events that may be lost |
| A rule has at most five targets [G]; fan out further through SNS or SQS [T] | A sixth target | |
| An entry must be under 256 KB [G]; 2026 sources say 1 MB for `detail` [T] | A payload that can pass the limit | |
| Archive and replay re-deliver events to today's consumers, not necessarily in the original order [G] | An archive added "for recovery" in front of consumers that send, charge or publish with no idempotency key, or that rely on order | Idempotent, order-free consumers |
| Change an event's schema by adding fields; for a break, version the `detail-type` and publish both during the move [T] | A field renamed, removed or retyped in an event that has subscribers | No consumer outside the change |

The newer EventBridge buses (`AWS::EventsV2::`, `eventsv2`) have different defaults (5 retries and 300 seconds, per a single 2026 source) [T]; do not apply the classic numbers to them.

## Kinesis Data Streams

| Rule | What breaks it | When it does not apply |
|---|---|---|
| Retention defaults to 24 hours, up to 365 days [G] | A consumer outage longer than the retention, with no replay source | |
| A record's payload is at most 1 MB before encoding [G] | Records that can grow past it | |
| Each shard takes 1 MB/s or 1,000 records/s of writes, and gives 2 MB/s of reads shared by all standard consumers; enhanced fan-out gives each consumer its own 2 MB/s per shard [G] | A new consumer added to a stream whose shards are already read at capacity; a hot partition key that sends most writes to one shard | Low-volume streams |
| Records are ordered by sequence number within a shard, per partition key [G] | A consumer that assumes order across partition keys | |
