---
name: python-craft
description: Use when a change touches Python files - the language's traps that look correct (async, cancellation, context managers, finally, shared state, values), which of them an enabled linter already catches, and the public API of a package others install.
verified: 2026-10-20
requires: Python 3.8+ (CancelledError), 3.14 for the finally warning; PyYAML 6+
---

# Python craft

## Goal

- **Lets the expert catch:** Python code that silently drops an exception, a cancellation or a timeout, shares state it looks to own, or breaks importers of a published package, in the cases an enabled linter does not already flag.
- **Applies to:** `*.py` and `*.pyi` files.
- **Not for:** injection, deserialisation and shell traps (security; the S-codes below are only so the expert knows what a linter covers); error-handling patterns true in every language (`failure-handling`); third-party dependencies and lock files (`dependency-discipline`); tests (quality).

Sources: **[R]** the maintainer's live check (docs.python.org, peps.python.org, requests and httpx documentation; 2026-10-20); **[D]** Ruff's rule registry in its repository (`codes.rs`, read 2026-10-20); **[T]** an upstream community skill, not checked (see `NOTICE.md`); **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The linter and type checker,** from `pyproject.toml` (`[tool.ruff]`, `[tool.mypy]`, `[tool.ty]`), `ruff.toml`, `setup.cfg`, `.flake8`, `mypy.ini`, `pyrightconfig.json`, and the CI and pre-commit config. A problem an enabled rule catches is not a finding; a change that disables the rule is. If the repository runs no linter, say so once.
- **The Python version** (`requires-python`, CI matrix): 3.14 adds the `finally` warning and the `tarfile` filter default.
- **Whether the package is published** (`[project]` with a name and version, a release workflow). Only then does "Public API of a published package" apply.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## What an enabled Ruff rule already catches

| Problem | Rule [D] |
|---|---|
| Unused import or variable | `F401`, `F841` |
| Mutable default argument; a call in a default | `B006`, `B008` |
| Mutable class attribute; dataclass mutable default | `RUF012`, `RUF008`, `RUF009` |
| Bare `except:`; `except Exception`; `try`-`except`-`pass` | `E722`, `BLE001`, `S110` |
| `raise` in `except` without `from` | `B904` |
| `return`, `break` or `continue` in `finally` | `B012` |
| Closure capturing a loop variable | `B023` |
| `is` with a literal | `F632` |
| `create_task` result not kept | `RUF006` |
| Blocking HTTP, `open` or `time.sleep` in `async def` | `ASYNC210`, `ASYNC212`, `ASYNC230`, `ASYNC251` |
| `requests` call without a timeout | `S113` |
| `datetime.utcnow()`, `datetime.now()` without a zone | `DTZ003`, `DTZ005` |
| `assert` outside tests (often disabled, because it flags tests) | `S101` |
| Module named like a standard-library module | `A005` |
| `Any` in a signature; blanket `type: ignore` | `ANN401`, `PGH003` |
| `eval`, `pickle`, `yaml.load`, `shell=True` | `S307`, `S301`, `S506`, `S602` |

## Exceptions and control flow

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `asyncio.CancelledError` is a `BaseException` since 3.8, so `except Exception` does not catch it, and cleanup written there does not run on cancellation [R] | A rollback or release in `except Exception:` of an async function, with no `finally` | |
| A bare `except:` or `except BaseException:` that does not re-raise swallows cancellation, so a cancelled task keeps running [R] | `except BaseException:` in async code with no `raise` | A top-level supervisor that records the cancellation and exits |
| A context manager whose `__exit__` returns a true value suppresses the exception from the `with` body [R] | `def __exit__(...): ... return True` | A manager meant to ignore named errors, like `contextlib.suppress` |
| In a `@contextmanager`, the body's exception is re-raised at `yield`, so cleanup after `yield` runs only inside `try`/`finally` [R] | Release code after `yield` with no enclosing `try`/`finally` | Work that must run only on success, such as a commit |

## Async

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A synchronous database driver, a synchronous boto3 client or CPU-heavy work inside `async def` stalls every other request on the loop [T] | A sync client called from `async def` | Wrapped in `asyncio.to_thread` or an executor |
| A coroutine called without `await` runs nothing [T] | `async_fn()` as a bare statement | |
| `gather(..., return_exceptions=True)` turns failures into values the code must inspect; without it the first failure propagates while the others keep running [T] | Results of `return_exceptions=True` used without checking for exceptions | |
| `asyncio.run` inside code that may already run in a loop fails at run time [T] | `asyncio.run` in a library function or handler | A script's entry point |

## Values, state and resources

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `requests` applies no timeout unless one is passed, and its docs say nearly all production code should [R] | `requests.get(...)` or a `Session` call with no `timeout=` | A wrapper that sets a default timeout in `request()` or `send()` |
| `httpx` times out after 5 seconds of inactivity by default; `timeout=None` removes it [R] | `httpx.Client(timeout=None)` or `timeout=None` on a call | Streaming or server-sent events where long silence is expected |
| Module-level mutable state is shared across requests in a server and across invocations in a warm Lambda container [O] | A module-level dict or list written per request or per user | A cache meant to be shared |
| Money as `float`: use `Decimal` or integer minor units [O] | Prices or totals in `float` arithmetic | |
| `dict.get(key, default)` where the key must exist turns a bug into a silent default [O] | `.get` with a default on a required field | |
| `assert` for validation disappears under `python -O` [O] | Input checks written as `assert` | Tests, and internal invariants |
| A truthiness test treats a valid zero or empty value as missing [O] | `if amount:` where 0 is valid | |
| A generator holding a resource closes it only when exhausted or closed [T] | A generator that opens a file or connection and may be abandoned | |
| A dataclass with `eq=True` and `frozen=False` (the defaults) is unhashable [R]; `unsafe_hash=True` or a hand-written `__hash__` on mutable fields makes hashes go stale [O] | `unsafe_hash=True`, or `__hash__` on a mutable dataclass used as a key | `frozen=True` |
| An optional (`X \| None`) result used unchecked, in a repository without a type checker [T] | `result.attr` on a possibly-`None` return | mypy or pyright in strict mode already checks it |

## Public API of a published package

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| PEP 8: documented interfaces are public, undocumented ones internal; `__all__` declares the public API, and internal names take a leading underscore [R] | A documented or `__all__` name removed or changed incompatibly | Names that were never documented nor in `__all__` |
| `from module import *` takes only `__all__`, or else names without a leading underscore [R] | A name dropped from `__all__`, or `__all__` added that omits names star-importers used | |
| CPython's policy (PEP 387) warns with `DeprecationWarning` for at least two minor versions, and two years, before removal [R] | A removal with no earlier deprecation, where the project follows that policy | Projects that state another policy |

## Not a finding

- Comprehension versus loop, EAFP versus look-before-you-leap, `pathlib` versus `os.path`, unless the repository's convention says otherwise.
- Missing docstrings, or missing type hints on private helpers in a repository that does not type them.
- A broad `except` at the top of a worker or request handler that logs with the traceback and returns a failure.
- `__slots__`, generators or `join` as performance advice with no measured or obvious cost.
- Layout, import order or quotes where a formatter is configured.
