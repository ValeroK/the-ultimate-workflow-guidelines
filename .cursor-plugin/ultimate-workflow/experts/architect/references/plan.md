# System architect input to a plan

**Outcome of this stage:** the plan says, for the criticality it states, how each boundary fails and recovers, where each fact lives, how duplicates are made harmless and what stops cost growing, so the build follows it and the review can hold the code to it.

## Questions

Read the draft, then search the code and infrastructure files it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **The numbers it depends on.** Requests per second and their burst, payload size, the latency the caller can wait, data volume and its growth, the availability target. If the plan gives none and a constraint depends on one, ask once and state the assumption you used.
- **A target the topology can meet.** The availability target against the single points the design keeps (one database, one zone, one Region). "99.99 percent on one database" is a risk.
- **The simplest design.** A new component needs a reason the existing ones cannot host the work. No network hop for work a function call in an existing service would do. No event bus while fewer than three services produce or react to the same events.
- **Sync or queue at each boundary.** A queue needs a named reason: work longer than the caller can wait, a spike to absorb, several consumers. No queue between a request and its own database "for decoupling".
- **Who operates it.** Prefer a managed service to a self-run one when nobody is there to run it: ask who is paged, not only what it costs.
- **Blast radius.** For each new component or dependency, which callers fail or slow down when it is down. Trace one failure end to end.
- **Failure at each boundary.** Every cross-service call has a timeout, a retry budget on transient errors only, and a degraded response. Every queue consumer has a dead-letter queue and a receive limit, a visibility timeout above the worst-case processing time, a stated stance on ordering, and someone alerted when a message dead-letters.
- **Duplicates and retries.** Delivery is at least once, so every step with a side effect that cannot be undone (a charge, a send, a publish, a write) is safe when run twice: a key derived from the logical request and claimed atomically, or a named compensation. The key outlasts the longest retry or redrive.
- **Long work and its home.** Work over 15 minutes, or waiting on a person, names where it runs (a workflow engine such as Step Functions, or a container) and how it resumes after a failure.
- **State and data.** Which store owns which fact (one owner each), and what survives a restart, a deploy, a duplicate delivery or a replaced task. State in one instance's memory while several run is a defect. For each read after a write: strongly consistent or allowed to lag, and what the user sees while it lags.
- **Change and existing data.** How the data already there moves to the new shape (expand, migrate, contract), and how the copy is checked before traffic moves. A plan that mirrors production writes to a second system says how sends, charges and publishes are suppressed on one side.
- **Tenancy.** Tenant identity is enforced where the data is read, as a key or filter in code, not as an instruction. Costs can be attributed per tenant if the plan needs it.
- **Cost and limits.** A ceiling on fan-out, concurrency, retries and per-run or per-tenant spend that stops the work when reached. A cost cut states what it does to reliability; a new data path (egress, a NAT, cross-zone traffic) states what it costs.
- **The objective and its alarms.** For a new user-facing flow: the indicator measured from the user's side (success, latency, freshness), the target and window, and what happens when the budget is spent; none given is a question for the user, not an invented 99.9. Which symptom pages a person, which only opens a ticket, and who receives each.
- **AWS fit.** The service matches the load: duration, burstiness, statefulness, latency. Long work does not sit behind a request that times out.

## When the plan makes a one-way choice

For a new data store, a wire format, or a contract other services depend on, the plan names the alternatives considered and why they lost, following the repository's convention for decision records. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "The `orders` queue's dead-letter queue has an alarm on `ApproximateNumberOfMessagesVisible` above 0 that notifies the on-call topic." It names the resource, the metric, the threshold and who hears it, and someone else can check it in the diff.
- Rejected: "Add a circuit breaker on every call" or "go multi-region", with no workload reason. Neither names the failure it prevents, and both cost more than the stated criticality needs.

## In this domain

- **constraints** name the resource, setting or behaviour they bind; the summary names the criticality you assumed.
- **questions** are the user's decisions: the availability target, a cost ceiling, whether the team is ready to run a technology the plan brings in.
- Do not ask for a heavier service, an extra region, a replica or a new layer without a reason from the workload.
