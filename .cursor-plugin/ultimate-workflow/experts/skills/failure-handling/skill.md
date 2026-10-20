---
name: failure-handling
description: Use when a change adds error paths, fallbacks, retries or multi-step writes.
---

# Failure handling

Use this when a change adds or changes a catch or except block, an error return, a fallback or default value on error, a retry, a Result or Option handler, or work that must be undone when it fails. The question is whether a failure still reaches someone who can act on it.

## Questions for every place that handles a failure

1. **What can arrive here?** List the errors the guarded code can raise. If the catch is broad, name two unrelated errors it would also swallow (a typo's `NameError`, a null dereference, an out-of-memory).
2. **What does the caller see?** Can the caller tell failure from success? A default value, an empty list or `None` that also means "nothing found" hides the failure.
3. **Is the cause kept?** A rethrow or wrap must carry the original error, its type and its stack.
4. **Is a fallback asked for, and visible?** A fallback the requirement does not ask for, or one that nobody is told about (no log, metric or return flag), hides a broken dependency.
5. **Is this the right level?** Handle a failure where something useful can be done with it. Elsewhere, let it travel. Logging and rethrowing at every level produces the same error many times.
6. **Is cleanup guaranteed?** A resource opened before the failure is released on every path.

## Patterns that hide a failure

| Pattern | What it looks like |
|---|---|
| Empty handler | `catch {}`, `except: pass`, `if err != nil {}` |
| Log and carry on | The error is logged, then the code continues as if the call worked |
| Default on error | `.catch(() => [])`, `except Exception: return None`, `getOrElse(empty)` where empty is also a valid answer |
| Optional chaining past a required step | `client?.send(msg)` where the message must be sent |
| Broad catch | `except Exception`, `catch (e)` around more than the one call that can fail, Java `catch (Throwable)` |
| Lost cause | Python `raise NewError(...)` without `from e`; JavaScript `throw new Error(msg)` without `{ cause: e }`; Go `fmt.Errorf` without `%w`; C# `throw ex;` instead of `throw;`; Java `new Exception(msg)` without the cause |
| Ignored error value | Go `_ = f()` or a discarded `err`; a boolean success result nobody checks; Rust `let _ = fallible();` |
| Crash where a failure was expected | Rust `.unwrap()` or `.expect()` on a request path; an unchecked `JSON.parse` on external input |
| Floating async work | A promise neither awaited nor given a `.catch`; `array.forEach(async ...)`, which awaits nothing |
| Retry that gives up quietly | The loop ends after the last attempt and returns normally, or returns a default |
| Partial failure reported as success | A batch handler that collects failed items and then returns success, or raises and makes the whole batch retry (an SQS handler without `batchItemFailures`) |
| Fallback to a fake | A stub, mock or canned answer used outside tests when the real dependency fails |
| Half-done work | Several writes with no transaction, rollback or compensation when a later step fails |

## Retries

- Retry only failures that can succeed on a second try: timeouts, throttling, 5xx. Never retry validation errors or other 4xx responses.
- Bound the attempts, and back off with jitter between them.
- A retried call with a side effect (a charge, a message, a write) needs an idempotency key, or each retry repeats the effect.
- When the attempts run out, the failure must reach the caller.

## Cleanup

Release resources with the language's scoped form: `with` (Python), `try`/`finally` or `using` (JavaScript, C#), try-with-resources (Java), `defer` (Go), RAII (Rust). In Go, `defer` runs when the function returns, not at the end of a loop iteration, so `defer` inside a loop holds every resource until the function ends.

## Not a finding

- A top-level boundary (a request handler, a worker loop, a job runner) that catches everything, logs the full error with its stack, and returns a generic failure. That is its job.
- Fire-and-forget work that is marked as intentional (`void`, a comment, a named helper) and is not on the result path, such as metrics or telemetry.
- An error that a caller one frame up handles. Trace the caller before reporting.
- A fallback the requirement asks for, and that is logged or counted when it triggers.
- A missing check for a state that the types or the callers already rule out.

## Expected failures and exceptions

Failures that are part of normal operation (not found, validation, a declined payment) are often clearer as return values (`Result`, an error union, a tagged response) than as exceptions. Programming errors (a broken invariant, a null where none is possible) should fail loudly. Follow the repository's existing convention before either.
