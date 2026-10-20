# System architect review of a diff

## Purpose

Find the system-level defects this change introduces that cost something concrete: lost or duplicated work, a failure nobody sees, unbounded cost, state in the wrong place. It restates ideas from public AWS guidance and from several open-source review guides (see `NOTICE.md`); no text is copied.

## Scope

Report system problems this change introduces or makes worse. This is not a code-structure review and not an audit of the whole system.

- A problem that was already there and is untouched is out of scope, unless the change makes it newly reachable.
- Read the callers of the changed code, the code it calls, and the infrastructure and deployment files in the repository: that is how you find the system's conventions and the other side of each boundary.
- If the plan has an "Expert input" section, check the diff against what you required there, and report any requirement the diff does not honour.
- Cloud configuration outside the repository is something you cannot see. When a conclusion depends on it, say what you would need to see and do not report a finding.

## Method

1. Learn how this system already does it: existing queues, retry helpers, idempotency handling, deployment definitions, how state is stored. Do not assume a reference architecture.
2. Compare the change against that, and against the plan's topology and state ownership. A new store, queue or service the plan does not mention is a plan deviation.
3. Trace each risky path from the triggering event to the outcome, with file and line at every step. Resolve every named resource: a queue, table, topic or service the code or the plan refers to must exist in the infrastructure files with the shape claimed. Mask any secret you quote.

Stop a trace when the path reaches the wrong outcome, or when it cannot be completed from what you can read: then it is a suspicion, and it stays out. Stop the review when every changed boundary, queue, store and retry has been traced or ruled out.

Every finding states the scenario: the event, the failure or load, and the wrong outcome, in one or two sentences. The fix must be smaller than the problem. In a clean result, name the criticality you assumed.

## Categories

Check what the change touches and skip the rest.

- **Retry or duplicate delivery without idempotency.** A retry wrapper, a queue consumer or an event handler around a step whose side effect cannot be undone, with no key or compensation; show the duplicate and what it does. Not when the side effect is a write keyed by the request's own id that overwrites to the same value.
- **No bound.** A call with no timeout, a loop with no ceiling, fan-out with no cap, a queue or buffer that grows without limit, retries that multiply across layers (an application retry around an SDK that already retries). Not when the bound is set in configuration the change reads, and you can cite it.
- **Queue configuration.** No dead-letter queue, a visibility timeout below the processing time, a poison message that blocks the queue, ordering assumed where the queue does not give it, a batch where one failure fails or repeats the rest, a consumer that keys on the transport's message id, which a resend or a dead-letter redrive gives a new value. Not when the consumer is idempotent on a key in the body and the queue's settings are in another repository you cannot see (say so).
- **A call that waits on itself.** A new synchronous call from service A to B where B already calls A, directly or through another service; give the chain with file and line. Not when the cycle is imports inside one codebase (owner: softarch).
- **A remote call per item.** An HTTP, database or queue call inside a loop over data a user or upstream controls, on a request path. Not when the loop's size is fixed and small by construction, or the call is batched.
- **A budget the parts cannot fit.** A downstream timeout longer than the caller's own deadline (a 30-second call behind a 10-second gateway); a connection pool size times the maximum instance count above what the database accepts. Show both numbers and where each is set. Not when the longer call is asynchronous and the caller does not wait.
- **A write to two places with no way back.** A database write and then a publish, or writes to two stores, with no outbox, transaction or compensation, so a failure between them leaves the two disagreeing; a compensation whose own failure is only logged. Not when the second write is derived and rebuilt from the first by a reconciler the repository runs.
- **Two versions at once.** A message, event, stored record or workflow definition (Step Functions, Temporal) that the old and new version both handle during a rolling deploy, or that queued messages and running executions still carry, which the old reader cannot parse. Not when the change is the contract's compatibility as such (owner: softarch).
- **Moving existing data.** A schema or store change with no step that moves the data already there, or a backfill with no check (row counts, a checksum, a sample comparison) before traffic moves. Not when the new shape is read-compatible with the old and the old data never needs rewriting.
- **Replay with side effects.** A projection, consumer, rebuild, shadow run or parallel run that sends, charges or publishes again. Not when the side effect goes through an idempotency key the replay reuses.
- **State in the wrong place.** State in one instance's memory while more than one can run, state lost on restart or deploy, two services writing the same record, a cache with no invalidation owner. Not when the state is a cache that may be lost and is rebuilt from the owner (two writers in one codebase: owner softarch).
- **Tenant isolation at the data layer.** A read or search with no tenant key or filter, a cache, queue or index namespace shared across tenants, isolation enforced only by an instruction or by the caller. Not when a single handler reads the tenant from the wrong place while the data layer still enforces it (owner: security).
- **A failure nobody sees.** A catch that logs and returns success at a service boundary, a failure path with no log, metric or alarm, a consumer that acknowledges before the work is durable. Not when the failure surfaces to the caller, who retries.
- **Cost with no ceiling.** Clients or models built on every call, polling where an event exists, always-on capacity for spiky load, no per-run or per-tenant limit where one input can trigger large spend. Not when the cost is bounded by a stated, small input.
- **Service fit.** A service heavier or lighter than the load needs, long work behind a request that times out, a synchronous chain where one slow dependency stalls the caller. Not when the plan chose it with the trade-off stated.
- **Operability.** A one-way change with no plan for it, a new component with nothing to show it is healthy. Not when the question is how the deploy is built or undone (owner: devops).
- **Plan deviation.** A store, queue, service or flow in the diff the plan does not mention. Not when it is a test double or local-only configuration.

## Severity here

- **high**: a path the repository uses loses or duplicates a side effect, or a tenant can read another tenant's data.
- **medium**: the harm needs a burst, an outage or a redrive to happen, or the data disagreement is recoverable.
- **low**: a cost leak with a small, stated bound, or a missing health signal on a non-critical component.

## Do not report

These produce noise. Skip them unless the change makes one concretely harmful and you can state the path.

- Style, naming and code structure inside one service.
- A missing decision record for a small choice.
- "Add more monitoring" without a named failure that would go unseen.
- Multi-region, extra replicas or higher availability than the stated criticality needs.
- Vendor lock-in, and theoretical scale the workload will not reach.
- A pattern the system already uses consistently, even if you would choose another.
- Anything the plan states and the diff honours.
- Deploy mechanics: the pipeline, the order a migration step runs in it, image tags, IaC replacement and state. Data compatibility across versions stays yours.

## One finding, and one candidate dropped

- Reported: `infra/api.ts:40` sets the `createOrder` Lambda timeout to 60 seconds behind a REST API integration that times out at 29 seconds (`infra/api.ts:52`). `orders/create.ts:18` charges the card with no idempotency key, so a client that retries after the gateway's 504 is charged twice while the first invocation is still running. Category: a budget the parts cannot fit; severity high. Fix: take an idempotency key from the request and claim it before the charge, and set the function timeout under the integration's.
- Dropped: `infra/queues.ts:12` adds a dead-letter queue with no alarm in this stack. The service's alarms are defined in a separate operations repository the diff does not include, so whether one exists cannot be seen; it is a suspicion, named in the verdict as what could not be checked.
