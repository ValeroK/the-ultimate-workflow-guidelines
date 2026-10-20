---
name: python-craft
description: Use when a change touches Python files.
---

# Python craft

Use this when a change touches Python files. It holds only what is specific to Python: the language's traps, the mistakes that look correct, and which of them a linter already catches. Checks true in every language stay in the expert's checklist, `engineering-principles` and `failure-handling`.

## First, find out what the linter already covers

Read `pyproject.toml`, `ruff.toml`, `setup.cfg`, `.flake8`, `mypy.ini` or `pyrightconfig.json`, and the CI and pre-commit config. A problem that an enabled rule catches is not a review finding; say once if the repository has no linter at all.

| Problem | Rule that catches it, when enabled |
|---|---|
| Unused import or variable | Ruff `F401`, `F841` |
| Mutable default argument | Ruff `B006` (and `B008` for a call in a default) |
| Bare `except:` | Ruff `E722` |
| `except Exception` that swallows | Ruff `BLE001` |
| `raise` inside `except` without `from` | Ruff `B904` |
| Closure that captures a loop variable | Ruff `B023` |
| `is` compared with a literal | Ruff `F632` |
| `asyncio.create_task` result not kept | Ruff `RUF006` |
| `time.sleep` or blocking `open` inside `async def` | Ruff `ASYNC251`, `ASYNC230` |
| `eval`, `pickle.loads`, `yaml.load`, `subprocess(shell=True)` | Ruff `S307`, `S301`, `S506`, `S602` |
| Missing or wrong types | mypy or pyright, in strict mode where configured |

## Traps a linter often misses

### Shared state that looks private
- **Mutable class attribute.** `class User: permissions = []` is one list shared by every instance. Initialise per instance in `__init__`, or use `field(default_factory=list)` in a dataclass or Pydantic model.
- **Module-level mutable state.** A dict or list at module level is shared across requests in a server and across invocations in a warm Lambda container. Fine for a cache that is meant to be shared; a bug for anything per request or per user.
- **Returning an internal list or dict** that the caller can mutate. Return a copy or an immutable type when the object guards an invariant.

### Async
- **Blocking call in `async def`.** `requests`, a synchronous database driver, a synchronous boto3 client, `time.sleep`, a large file read or CPU-heavy work all stall every other request on the event loop. Use the async client, or `asyncio.to_thread`.
- **Coroutine never awaited.** Calling an `async` function without `await` creates a coroutine and runs nothing. The work silently does not happen.
- **Fire-and-forget task.** `asyncio.create_task(...)` without keeping a reference can be garbage-collected before it finishes, and its exception is never seen.
- **`gather` errors.** `asyncio.gather(*tasks, return_exceptions=True)` turns failures into values; the code must then look at them. Without it, the first failure propagates and the other tasks keep running unobserved.
- **Cancellation swallowed.** A bare `except:` or `except BaseException:` catches `CancelledError`, so a cancelled task keeps running. Re-raise it.
- **Mixing sync and async in one call path.** Calling `asyncio.run` inside code that may already run in an event loop fails at run time.

### Values and comparisons
- **Money as `float`.** Use `Decimal` or integer minor units; `0.1 + 0.2 != 0.3`.
- **Naive datetimes.** `datetime.now()` and `datetime.utcnow()` carry no time zone; comparing them with aware datetimes raises, and mixing them silently shifts times. Use `datetime.now(timezone.utc)`.
- **`dict.get(key, default)` where the key must exist.** A missing key becomes a silent default instead of an error.
- **`assert` for run-time checks.** Asserts are removed under `python -O`; validation written as `assert` disappears in production.
- **Truthiness tests on values where zero or empty is valid.** `if amount:` treats `0` as missing.
- **Large integer ids through JSON** consumed by JavaScript lose precision above 2^53; send them as strings.

### Resources
- Files, locks, sockets, database connections, HTTP clients and temporary files need `with` (or `async with`), or `contextlib.ExitStack` for a variable number of them. A manual `close()` on the happy path leaks on every exception.
- A generator holding a resource is closed only when the generator is exhausted or closed.

### Types
- `Any` in a public signature switches off checking for every caller.
- `typing.cast` and `# type: ignore` without an error code hide a real mismatch. Ask what the checker was complaining about.
- A function returning `X | None` whose callers use the result without checking for `None`.
- A dataclass or Pydantic model with `eq=True` and mutable fields used as a dict key or in a set.

### Security-relevant traps (raise them, name the domain as security)
- `eval`, `exec`, `compile` or dynamic import on input that a user can influence.
- `pickle.loads`, `yaml.load` without `SafeLoader`, `marshal` on untrusted data.
- `subprocess` with `shell=True` and any interpolated value; use a list of arguments.
- `str.format` or `%` where the format string itself comes from a user.

## Not a finding

- PEP 8 layout, import order or quote style where a formatter is configured.
- Comprehension versus loop, EAFP versus look-before-you-leap, `pathlib` versus `os.path`: preferences, unless the repository's convention says otherwise.
- Missing docstrings, or missing type hints on private helpers in a repository that does not type them.
- A broad `except` at the top of a worker or request handler that logs with the traceback (`logger.exception`) and returns a failure.
- `__slots__`, generators or `join` as performance advice with no measured or obvious cost.
