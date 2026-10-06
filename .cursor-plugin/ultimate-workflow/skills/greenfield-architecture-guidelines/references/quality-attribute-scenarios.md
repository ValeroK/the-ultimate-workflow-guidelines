# Quality-attribute scenarios

A scenario turns an adjective into something testable. Use six parts; drop a part only if it is genuinely irrelevant.

| Part | Question |
|---|---|
| Source | Who or what generates the stimulus? |
| Stimulus | What event arrives? |
| Artifact | Which part of the system is affected? |
| Environment | Under what conditions (normal, peak, degraded, during deploy)? |
| Response | What must the system do? |
| Response measure | How is success measured, with a number? |

## Examples (domain-neutral)

- **Performance:** A user (source) submits a search (stimulus) to the search module (artifact) at peak load of 500 requests per second (environment); results return (response) with p99 latency under 300 ms (measure).
- **Availability:** A dependency times out (stimulus) during business hours (environment); the system serves cached results and flags them stale (response); no more than 0.1% of requests fail over a month (measure).
- **Modifiability:** A developer (source) adds a new payment provider (stimulus) to the billing module (artifact); change is confined to one module plus one registration line (response); delivered within one day with no edits to existing providers (measure).
- **Security:** An unauthenticated caller (source) requests another tenant's record (stimulus); the request is denied and the attempt logged (response); zero cross-tenant reads in an authorization test suite (measure).
- **Recoverability:** A primary datastore is lost (stimulus); service is restored from backup (response) with at most 5 minutes of data lost and under 1 hour to recover (measure).

## Utility ranking

List the scenarios, then rank each on two axes: **business importance** and **difficulty to achieve**. High importance with high difficulty drives the architecture; low importance with low difficulty needs no design attention. Attributes that never reach the top of the list should not shape the structure.

## Checks

- Every scenario has a number, or an explicit stated assumption marked as unvalidated.
- At least one pair of scenarios is identified as being in tension, with the winner named.
- Each top scenario maps to an automated check where practical (a load test, a failure-injection test, a dependency rule), so it cannot rot silently. See `modularity-and-evolution-guidelines` for fitness functions.
