# Step Functions and sagas

Use this when a change adds or changes a Step Functions state machine, or a multi-step workflow that must undo its earlier steps when a later one fails (a saga). It holds the semantics that decide whether a workflow is correct under failure and duplicates.

Each fact carries its source: **[G]** AWS's Step Functions developer guide (AWS-written, in its 2022 form); **[T]** AWS's own agent toolkit (2026), not yet checked against the current guide; **[S]** saga practice from the sources in `NOTICE.md`. When a decision turns on a [T] fact, fetch the current page and say what you found.

## Standard or Express

| | Standard | Express |
|---|---|---|
| Longest run | 1 year [G] | 5 minutes [G] |
| Execution semantics | exactly once [G] | at least once when started asynchronously, at most once when synchronous [G] |
| Not available | | the `.sync` and `.waitForTaskToken` integrations and activities [G]; Distributed Map [T] |
| History | kept by the service; at most 25,000 events per execution [G] | only in CloudWatch Logs, when logging is turned on [T] |

What breaks it: a step with a side effect that cannot repeat (a charge, an email) in an asynchronous Express workflow without an idempotency key; an Express workflow with logging off, so a failure leaves no trace; a long or looping Standard workflow that can pass 25,000 history events (split it into child executions). Execution names are unique per account and Region [G].

## Limits that end an execution

- Input and output of a state are at most 256 KB (262,144 bytes) [G]. Passing a growing list or a document through states ends in `States.DataLimitExceeded`; pass a reference (an S3 key) instead.
- An inline `Map` is more likely to be throttled above about 40 items at once [G]; set `MaxConcurrency` for a downstream that has a limit. Distributed Map runs up to 10,000 child executions in parallel [T].

## Errors and retries

| Rule | What breaks it |
|---|---|
| `States.ALL` does not catch `States.DataLimitExceeded` or `States.Runtime`, and must be the last retrier or catcher in its array [G] | `States.ALL` placed before a specific error, or relied on to catch a payload overflow |
| A retrier defaults to `IntervalSeconds` 1, `MaxAttempts` 3, `BackoffRate` 2.0 [G]; newer versions add `JitterStrategy`, where `FULL` spreads retries [T] | Retries left at the defaults against a shared, throttling dependency |
| A `Catch` with no `ResultPath` replaces the state's input with the error [G] | A catch that hands the next state an error object where it expects the original input; use `"ResultPath": "$.error"` to keep both |
| Give every Task a `TimeoutSeconds`, and long ones a `HeartbeatSeconds` [T] | A Task waiting on a callback or a slow call with no timeout runs until the execution's own limit |
| A `Choice` with no `Default` fails when no rule matches [T] | A new `Choice` whose rules do not cover every value |
| Standard workflows are billed per state transition, retries included [T] | Aggressive retries on a high-volume Standard workflow |

## Sagas: undoing earlier steps

[S] A saga is a series of steps, each with a compensating step that undoes it.

- Compensate only the steps that completed, in reverse order. A step that never started has nothing to undo.
- A compensation that finds the thing already gone has succeeded, not failed.
- A compensation that fails is retried with backoff, then sent to a dead-letter queue with an alert for a person. A compensation failure that is only logged leaves the system half done and nobody told.
- Each step has its own timeout; one timeout for the whole saga cannot tell which step hung.
- Test a failure at every step, not only the last, and check what was undone.
- A saga stuck in "compensating" means a compensation never reported that it finished.

In Step Functions, a saga is a `Catch` on each step that routes to the compensations for the steps before it.

## Durable execution outside Step Functions (Temporal and similar)

[S] The same failure rules apply to Temporal-style workflows, plus these of their own:

- **Workflow code is deterministic.** The wall clock, random numbers, threads, or network and file access inside workflow code (rather than in an activity) break replay.
- **Changing workflow code while executions run** needs the SDK's versioning API or a new workflow type; otherwise executions in flight fail when they are replayed. This is the "two versions at once" problem of a rolling deploy.
- Give activities a maximum number of attempts and declare validation failures non-retryable.
