---
name: failure-handling
description: Use when a change adds or changes error paths, fallbacks, retries, cleanup or multi-step writes - whether a failure still reaches someone who can act on it.
verified: 2026-10-20
---

# Failure handling

## Goal

- **Lets the expert catch:** code where a failure is turned into something that looks like success, or loses its cause, or repeats a side effect on retry, or leaves work half done.
- **Applies to:** an added or changed catch or except block, error return, fallback or default on error, retry, Result or Option handler, `finally` or scoped cleanup, or several writes that must succeed together.
- **Not for:** retry budgets, timeouts, dead-letter queues and idempotency stores across a service boundary (architect); whether a test catches the swallowed error (quality); language-specific error traps (the language skill).

Sources: **[D]** language documentation as published in its repository (the Python tutorial, Effective Go, the Rust book, .NET exception guidance; 2026-10-20); **[R]** the maintainer's live check (PEP 765, ESLint `no-unsafe-finally`, Error Prone `Finally`, the AWS SDK retry reference; 2026-10-20); **[T]** an upstream community skill, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The repository's convention** for failures: exceptions, error returns or result types, where errors are logged, and how fallbacks are reported. A deviation from it is the candidate.
- **What the linters already enforce:** an empty handler (Ruff `S110`, `E722`; ESLint `no-empty`; errcheck) and a lost cause (Ruff `B904`, ESLint `preserve-caught-error`, errorlint) are not findings where the rule is on.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Questions for every place that handles a failure

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A broad catch is judged by what else it would swallow: name two unrelated errors (a typo's `NameError`, a null dereference) [T] | `except Exception`, `catch (e)` or `catch (Throwable)` around more than the one call that can fail | A top-level boundary that logs the full error and returns a generic failure |
| The caller must be able to tell failure from success [T] | A default, an empty list or `None` returned on error, where the same value also means "nothing found" | The requirement defines that value as the failure result |
| A rethrow or wrap carries the cause: Python `raise ... from e`, JavaScript `{ cause: e }`, Go `%w`, C# `throw;`, Java the cause argument [D] | A new error built from the message only | The linter enforces it |
| A fallback is asked for and visible: a log, a metric or a return flag when it triggers [T] | A fallback the plan does not ask for, or one nobody is told about | |
| Handle where something useful can be done; logging and rethrowing at every level repeats one error many times [T] | A catch that logs and rethrows, in a function whose caller does the same | |

## Patterns that hide a failure

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Log and carry on [T] | The error is logged, then the code continues as if the call worked | |
| Optional chaining past a required step [T] | `client?.send(msg)` where the message must be sent | The step is optional by requirement |
| A `return`, `break` or `continue` (Python, JavaScript) or a `return` or `throw` (Java) inside `finally` discards the exception in flight; Python 3.14 warns (PEP 765), ESLint `no-unsafe-finally` is recommended, Error Prone reports `Finally` [R] | Control flow that leaves a `finally` block | A nested function, or a loop wholly inside the `finally` |
| A retry loop that ends after the last attempt and returns normally, or returns a default [T] | The loop's exit path does not raise or return an error | |
| A batch handler that collects failed items and returns success, or raises and makes the whole batch retry [O] | An SQS handler with no `batchItemFailures`, or one that throws on the first bad record | The source does not support partial batch responses |
| A stub, mock or canned answer used outside tests when the real dependency fails [T] | `return FAKE_RESPONSE` in a production catch | |
| Several writes with no transaction, rollback or compensation when a later one fails [T] | Two writes in one function where the second can fail after the first commits | The writes are idempotent and the caller retries the whole function |

## Retries

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Retry only what can succeed on a second try (timeouts, throttling, 5xx), never validation errors or other 4xx [T] | A retry around any error | |
| Bound the attempts and back off with jitter [T] | `while True` around a call, or a fixed delay | |
| A retried side effect (a charge, a message, a write) needs an idempotency key derived from the intent, not the attempt [T] | A key built from a timestamp or attempt counter, or none | The effect is naturally idempotent |
| A timeout is an unknown outcome, not a failure: the call may have succeeded [O] | A timed-out write retried with no key, or reported to the user as "not done" | |
| AWS SDKs already retry transient and throttling errors (standard mode, 3 attempts), so an application retry around one SDK call multiplies the attempts [R] | A retry loop or decorator around an SDK client call | The client is set to `max_attempts=1` |

## Cleanup

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Release a resource with the language's scoped form: `with`, `try`/`finally` or `using`, try-with-resources, `defer`, RAII [D] | A file, connection, lock or stream opened with no scoped release, where an error or early return between open and close leaks it | The function hands the resource to its caller to close |

## Not a finding

- A top-level boundary (a request handler, a worker loop, a job runner) that catches everything, logs the full error with its stack, and returns a generic failure.
- Fire-and-forget work marked as intentional (`void`, a comment, a named helper) that is not on the result path, such as metrics.
- An error a caller one frame up handles: trace the caller first.
- A fallback the requirement asks for, logged or counted when it triggers.
