---
name: distributed-systems-resilience-guidelines
description: Use whenever code or a design makes a call across a network or process boundary or handles messages: HTTP, API, database or queue calls; timeouts and hangs; retries and retry loops; duplicate, lost or out-of-order messages; idempotency; exactly-once; writes spanning several services or datastores; partial or cascading failure. Loads the failure checklist (timeout, error class, idempotency, backoff with jitter, retry budget, outbox, saga). Load before advising on or writing the call. Not for pure in-process logic.
license: LicenseRef-MIT-Attribution
---

# Distributed Systems Resilience Guidelines

The moment a call crosses a boundary, it can be slow, fail, fail after succeeding, run twice, or arrive out of order. Design for those outcomes explicitly. Rules are about **behaviour**, so they hold in any language or framework.

For every boundary-crossing call or message you add, answer the four questions in [the failure checklist](#failure-checklist) before calling it done, and state the answers in the change.

## Failure checklist

1. **What if it never answers?** There must be a **timeout** on every network or process call, chosen deliberately from the downstream's observed latency, never the default of "wait forever".
2. **What if it fails?** Classify the error: *transient* (retry may help), *permanent* (do not retry), *unknown outcome* (the request may have succeeded). Handle each deliberately.
3. **What if it runs twice?** Any operation that can be retried, redelivered, or replayed must be **idempotent**, or be made so with a de-duplication key stored with the effect.
4. **What if it succeeds slowly, or only in part?** Define behaviour under degraded latency and partial success, not just the happy and fully-failed paths.

## Retries

- Retry only **idempotent** operations or ones protected by an idempotency key.
- Use **capped exponential backoff with random jitter**, so many clients do not retry in lockstep.
- Bound them: a maximum attempt count and a **retry budget** (a ceiling on the fraction of traffic that may be retries, for example a local token bucket).
- Retry at **one layer** of the call stack by default, not every layer; stacked retries multiply load (with three attempts at each of five layers a leaf failure can see 3^5 = 243 times the load) and turn a brownout into an outage. This is documented practice for low-cost operations, not a law; pick the one layer that has the context to retry safely.
- Never retry a permanent error, and never retry unbounded.

## Protect yourself and your dependencies

- **Backpressure and load shedding:** when overloaded, reject early and cheaply rather than queue without bound. Bound every queue and every concurrency pool.
- **Bulkheads:** isolate resource pools per dependency so one slow dependency cannot exhaust threads, connections, or memory for everything else.
- **Circuit breaker:** after sustained failure, stop calling and fail fast for a cooling period, then probe. Pair with a fallback.
- **Graceful degradation:** decide in advance what reduced service looks like (stale cache, default value, feature off) and which dependencies are critical versus optional.
- Beware **cascading failure**: failure in one component raising load on others in a feedback loop. Timeouts, bounded queues, and shedding are the main defences.

## Data consistency across stores

- A write that must update two stores cannot rely on one local transaction. Pick a pattern deliberately:
  - **Transactional outbox:** write the state change and an outgoing event in one local transaction; a separate relay publishes the event. This yields **at-least-once** delivery, so consumers must be idempotent. It does not give exactly-once.
  - **Saga:** a sequence of local transactions with compensating actions that undo earlier steps on failure. Define the compensations and what happens if a compensation itself fails.
- **"Exactly-once delivery" is not something to promise.** Aim for at-least-once delivery plus idempotent processing, which gives exactly-once *effect*.
- **Choose consistency per use case.** During a network partition a system can preserve either linearizable consistency or availability for a given operation, not both; when not partitioned, there is still a latency-versus-consistency trade-off. State which each operation chooses and why. Do not label a whole product "CP" or "AP".
- Prefer designs where ordering requirements are explicit: per-key ordering, version numbers, or last-writer rules stated and tested.

## Messaging and queues

Consumers must tolerate duplicates, out-of-order delivery, and poison messages. Define a retry policy, a dead-letter destination, and an alarm on its depth. Make message schemas evolvable (add optional fields; never reuse or retype a field).

## Test the failure paths

A resilience property you have not exercised does not exist. Add tests or fault injection for: timeout, transient error then success, permanent error, duplicate delivery, and dependency down. Verify the retry bound and fallback actually trigger.

## Do not

- Add a timeout, retry, or breaker with a guessed number and no stated reasoning.
- Swallow a failure to keep the response green.
- Treat the network as reliable, latency as zero, or any dependency as always available.
- Introduce distribution (a new network hop) for a concern a function call would solve.

## When to skip

Pure in-process logic with no I/O. For rollout, monitoring, and alerting use `operability-guidelines`.
