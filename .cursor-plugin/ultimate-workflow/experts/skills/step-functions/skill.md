---
name: step-functions
description: Use when a change adds or changes a Step Functions state machine (an ASL definition, a CDK or Terraform state machine, a StartExecution call), a saga that must undo earlier steps when a later one fails, or a durable workflow (Temporal, Lambda durable functions) - Standard or Express, payload and history limits, errors, retries, timeouts and compensation.
verified: 2026-10-21
requires: Step Functions JSONPath and JSONata states and Distributed Map, Temporal and Lambda durable functions, as of 2026
---

# Step Functions, sagas and durable workflows

## Goal

- **Lets the expert catch:** a workflow that looks right but repeats a side effect (an asynchronous Express run, a name reused as a key), dies at a limit (a payload past 256 KB, a history past 25,000 events), never ends (a Task with no timeout), lets an error through the wrong catcher, or leaves earlier steps half done when a later one fails.
- **Applies to:** `*.asl.json` and `*.asl.yaml` files, `AWS::StepFunctions::StateMachine`, `aws_sfn_state_machine`, CDK `aws-stepfunctions` chains, `StartExecution` and `StartSyncExecution` calls, `Retry` and `Catch` blocks, compensation code, and Temporal or Lambda durable function workflows.
- **Not for:** Lambda as a queue or stream consumer (`lambda-event-sources`); queue and bus semantics (`aws-messaging`); how a catch is written inside one function (developer, `failure-handling`); the test that fails each saga step (quality); task tokens and secrets in execution history (security); what an IaC change replaces (devops).

Sources: **[D]** the Step Functions developer guide as published in the awsdocs repository (2022 snapshot); **[R]** the maintainer's live check of docs.aws.amazon.com, states-language.net and the Temporal docs (2026-10-20 and 2026-10-21); **[T]** AWS or community agent skills (2026), not checked; **[O]** our own reasoning. A [D] value may be out of date where an [R] row gives a newer one; a [T] or [O] item is a prompt to check the current page, not a finding on its own.

## First, establish the target

- **Workflow type:** Standard or Express (`Type`, `StateMachineType`, `stateMachineType`), and for Express whether it is started asynchronously (`StartExecution`) or synchronously (`StartSyncExecution`).
- **Query language:** JSONPath or JSONata (`QueryLanguage` at the top or on a state). `ResultPath` and `Assign` rows differ between them.
- **The engine:** Step Functions, Lambda durable functions, or a Temporal-style engine.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Standard or Express

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Standard runs at most 1 year, exactly once; Express runs at most 5 minutes, at least once when started asynchronously and at most once when synchronous [D] | A step with a side effect that cannot repeat (a charge, an email) in an asynchronously started Express workflow with no idempotency key; work that can pass 5 minutes in Express | Idempotent or read-only steps |
| Express does not support `.sync`, `.waitForTaskToken`, Distributed Map or activities [R] | Any of them in an Express definition, or a Standard workflow switched to Express that uses one | An Express workflow run as a Distributed Map's child, which is allowed [R] |
| Express history exists only in CloudWatch Logs, when logging is on [R] | A new Express state machine with no `LoggingConfiguration`, or logging turned off | |
| A Standard execution has at most 25,000 history events [D], and its history is kept 90 days [R] | A loop or long `Map` in one Standard execution that can pass 25,000 events (split into child executions); a design that uses execution history as a record kept longer than 90 days | |
| A Standard execution name cannot be reused for 90 days, and starting a running execution again with the same name and input returns success; Express names can be reused at once [R] | An Express start that relies on the name to stop duplicates; a Standard name built from a value that repeats within 90 days | Standard starts named by a request id, where this is the intended deduplication |
| Standard is billed per state transition, retries included; Express by count, duration and memory [R] | Aggressive retries or tight polling loops on a high-volume Standard workflow | Express workflows |

## Payloads, Map and Parallel

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A state's input or output is at most 256 KB [D] [R]; past it the execution fails with `States.DataLimitExceeded` [D] | A growing list, a document or a model response passed through states; pass an S3 key instead | Payloads with a fixed, small bound |
| An inline `Map` is more likely to be throttled above about 40 concurrent iterations [D]; a Distributed Map runs up to 10,000 child executions in parallel by default [R] | A `Map` over a downstream with a rate limit and no `MaxConcurrency` | A downstream with no limit that matters |
| Only a Distributed Map tolerates failed items, through `ToleratedFailurePercentage` or `ToleratedFailureCount`, then fails with `States.ExceedToleratedFailureThreshold`; an inline `Map` has neither field [R] | An inline `Map` expected to finish despite failed items | All-or-nothing processing, intended |
| A failed branch fails the whole `Parallel` state and stops the other branches; Lambda calls already running keep running [D] | A saga that assumes the branches that succeeded are kept, or that a stopped branch's Lambda had no effect | |
| `StartExecution` without `.sync` returns as soon as the child starts [R] | A parent that continues as if the child had finished or succeeded | A fire-and-forget child, stated as one |

## Errors, retries and timeouts

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `States.ALL` does not catch `States.DataLimitExceeded` or runtime errors, which must be named [R], and must be the last retrier or catcher in its array [D] | `States.ALL` relied on to catch a payload overflow | |
| `States.TaskFailed` matches every known error except `States.Timeout` [R] | A `Catch` on `States.TaskFailed` meant to handle a Task that timed out | `States.Timeout` named in the same or an earlier catcher |
| A retrier defaults to `IntervalSeconds` 1, `MaxAttempts` 3, `BackoffRate` 2.0 [D]; `JitterStrategy` `FULL` spreads retries [R] | Retries left at the defaults against a shared or throttling dependency, with no jitter | |
| Lambda tasks should retry `Lambda.ServiceException`, `Lambda.AWSLambdaException` and `Lambda.SdkClientException` [R] | A Lambda Task in ASL with no retrier for them | A CDK `LambdaInvoke`, which adds that retry by default (`retryOnServiceExceptions`) [R] |
| In JSONPath, a `Catch` with no `ResultPath` replaces the state's input with the error [D] | A catch that hands the next state an error object where it expects the original input; `"ResultPath": "$.error"` keeps both | JSONata states, which have no `ResultPath`: the error is `$states.errorOutput`, available in the `Catch`'s own `Assign` and `Output` [R] |
| A Task's `TimeoutSeconds` defaults to 99,999,999 seconds, longer than a Standard execution's year, so in practice a Task has no bound [R]; long Tasks also want `HeartbeatSeconds` [T] | A `.waitForTaskToken` Task, an activity or a slow call with no `TimeoutSeconds`: it waits until the execution's own limit | An HTTP Task, which is capped at 60 seconds [R] |
| A `Choice` with no matching rule and no `Default` fails with `States.NoChoiceMatched` [R] | A new or changed `Choice` whose rules do not cover every value | Rules that provably cover every value |

## JSONata states

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `Assign` and `Output` are evaluated in parallel, so a variable set in a state's `Assign` is not visible in that state's `Output` [R] | An `Output` that reads a variable the same state assigns | A variable assigned by an earlier state |
| An expression that evaluates to undefined fails with `States.QueryEvaluationError` [R] | An expression on an optional field (`$states.input.discount`) with no default and no catcher for that error | Fields the input always has |

## Sagas: undoing earlier steps

A saga is a series of steps, each with a compensating step that undoes it [T].

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Compensate every step that completed, and every step whose outcome is unknown because it timed out or failed partway, in reverse order; a step that never started has nothing to undo [T] | A compensation path that skips the step that timed out, or undoes in forward order | Steps whose effect is read-only |
| Record the compensation before running its step, so a crash between the two cannot lose it [T] | Compensations appended to the list only after the step's call returns | |
| A compensation must be safe to repeat, and one that finds the thing already gone has succeeded [T] | A compensation that fails on "not found" | |
| A compensation that fails is retried with backoff, then sent to a dead-letter queue with an alert for a person [T] | A compensation's error that is only logged, or a `Catch` on it that ends in `Succeed` or `Fail` with nobody told | |
| Each step has its own timeout; one timeout for the whole saga cannot tell which step hung [T] | A timeout only on the state machine or the saga as a whole | |
| In Step Functions, each step has a `Catch` that routes to the compensations of the steps before it [O] | One shared `Catch` that runs every compensation, including those for steps that never ran | |

## Durable workflows outside Step Functions

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Temporal-style workflow code must be deterministic: the wall clock, random numbers, threads, or network and file access belong in an activity, or replay breaks [T] | `time.now()`, `random`, an HTTP call or a file read inside a workflow function | |
| Changing workflow code while executions run needs the SDK's versioning API or a new workflow type, or executions in flight fail on replay [T] | Steps added, removed or reordered in a workflow with running executions and no version marker | A workflow with no executions in flight |
| Temporal retries an activity with no maximum attempts by default [R]; validation failures should be non-retryable [T] | Activity options with no maximum attempts, or a validation error left retryable | |
| A Temporal payload is at most 2 MB, and one request is at most 4 MB across all payloads in a workflow task [R] | Documents or large lists passed as activity arguments or results | |
| A Lambda durable function can run up to a year, but each invocation is still at most 15 minutes [R] | One step whose work can pass 15 minutes in a single invocation | |

## Not a finding

- `States.ALL` as the last catcher, after the specific errors.
- A Standard state machine with no `LoggingConfiguration`: its history is kept by the service.
- A CDK `LambdaInvoke` with no explicit retrier for Lambda service exceptions.
