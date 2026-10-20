# Developer fact-check, 2026-10-20

The maintainer's live check of round-2 prompt 1 (`docs/research/fact-check-round-2-prompts.md`), with open web access. It is the record behind the failure-handling and language-craft rows of the developer's skills. Facts are restated in the skills, not copied.

## Results

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Python: `return`/`break`/`continue` in `finally` discards the in-flight exception; 3.14 warns (PEP 765) | confirmed; not when the statement sits in a nested function, or in a loop wholly inside the `finally` | PEP 765 |
| 2 | JavaScript: control flow in `finally` overrides `try`/`catch`; `no-unsafe-finally` is recommended | confirmed; nested functions and a `break` in a nested `switch` are exempt | eslint.org |
| 3 | Java: `return` or `throw` in `finally` discards the try-catch outcome; Error Prone `Finally` | confirmed | errorprone.info |
| 4 | AWS SDKs default to standard retry, 3 attempts in total; an outer retry multiplies them | confirmed; not when the client is set to `max_attempts=1` | AWS SDK reference |
| 5 | `requests` has no default timeout; its docs say nearly all production code should pass one | confirmed (quickstart page; the advanced page was not reachable); a Session wrapper that injects a default is the exception | requests docs |
| 6 | `httpx` default timeout is 5 seconds of inactivity | confirmed; the finding is `timeout=None`, acceptable on a stream or SSE connection | httpx docs |
| 7 | `asyncio.CancelledError` is a `BaseException` since 3.8 | confirmed; the risk is a bare `except:` or `except BaseException:` that does not re-raise | Python docs |
| 8 | `__exit__` returning a true value suppresses the exception | confirmed; `contextlib.suppress` is the intended case | Python data model |
| 9 | `@contextmanager`: the exception is re-raised at `yield`; cleanup runs only under `try`/`finally` | confirmed; a commit that should run only on success belongs after `yield`, outside `finally` | contextlib docs |
| 10 | dataclass with `eq=True`, `frozen=False` is unhashable | confirmed, but the quote returned does not state it; the rule is from the `unsafe_hash` text, not re-quoted | Python docs |
| 11 | TypeScript ES5 target: subclass of `Error`/`Array`/`Map` needs `Object.setPrototypeOf` | **different**: use the class's own prototype, `Object.setPrototypeOf(this, FooError.prototype)`; the wiki says `new.target` cannot be ensured in ES5. Not needed for ES2015 or later | TypeScript wiki, breaking changes 2.1 |
| 12 | `useUnknownInCatchVariables` under `strict` from 4.4 | confirmed | TypeScript 4.4 release notes |
| 13 | `return-await` defaults to `in-try-catch` | confirmed; inside `catch` it requires `await` only when a `finally` follows, and forbids it otherwise | typescript-eslint.io |
| 14 | Preset membership | **different in part**: `no-floating-promises`, `no-misused-promises`, `restrict-plus-operands`, `unbound-method` are in `recommended-type-checked` (and so `strict-type-checked`); `require-array-sort-compare` is in neither, only `all`, and ignores string arrays by default | typescript-eslint source |
| 15 | Error boundaries miss event handlers, async code, SSR, the boundary itself | confirmed | react.dev |
| 16 | Hook names start with `use` and a capital letter | confirmed | react.dev |
| 17 | `createSlice` reducers may mutate (Immer) | confirmed from the Chinese mirror of the RTK site; the English page was not reachable. Mutating the draft and also returning a value is an error | redux-toolkit (mirror) |
| 18 | `bytes.Buffer.Bytes` aliases the buffer until the next modification | confirmed; `bytes.Clone` before reuse is the fix | pkg.go.dev |
| 19 | `errgroup.WithContext` context is cancelled at the first error or when `Wait` returns | confirmed; the finding is using that context after `Wait` | pkg.go.dev |
| 20 | Go 1.25 vet `waitgroup` analyzer | confirmed; Go 1.25 also adds `WaitGroup.Go` | go.dev 1.25 notes |
| 21 | Deferred call arguments, receiver included, are evaluated at the `defer` | confirmed; a closure defers the evaluation | Effective Go |
| 22 | Rust 1.81: an unwind out of `extern "C"` aborts | confirmed; `extern "C-unwind"` is the exception. **`rust-craft` still says undefined behaviour: correct it** | Rust 1.81 blog |
| 23 | `tokio::select!` drops the losing branches; the docs list cancellation-safe methods | confirmed; a future pinned outside the loop and polled by `&mut` is not dropped | docs.rs tokio |
| 24 | clippy `await_holding_lock` group | `suspicious`, warn by default (the saved `pedantic` record is out of date); async-aware guards are exempt | clippy master |
| 25 | clippy `wildcard_enum_match_arm`, `let_underscore_must_use`, `mem_forget`, `undocumented_unsafe_blocks`, `allow_attributes_without_reason` | confirmed: all `restriction`, allow by default; a `#[non_exhaustive]` external enum needs a wildcard | clippy master |
| 26 | Drop order: the type's `Drop`, then fields in declaration order | confirmed; `ManuallyDrop` controls the order explicitly | Rust reference |
| 27 | SpotBugs `DC_DOUBLECHECK`, `RC_REF_COMPARISON`, `RE_POSSIBLE_UNINTENDED_PATTERN` | confirmed; double-checked locking on a `volatile` field is safe on Java 5+ | spotbugs docs |
| 28 | Error Prone `InterruptedExceptionSwallowed`, on by default | confirmed, severity WARNING | errorprone.info |
| 29 | Spring Boot `@Async` executor is bounded | **different**: Boot configures a `ThreadPoolTaskExecutor` with 8 core threads and an **unbounded** queue and max size (`Integer.MAX_VALUE`) unless `spring.task.execution.pool.*` is set; with virtual threads it is a `SimpleAsyncTaskExecutor`. Plain Spring falls back to `SimpleAsyncTaskExecutor`, one new thread per task | Spring Boot reference |
| 30 | Self-invocation bypasses `@Transactional`, `@Async`, `@Cacheable` | confirmed (now with a primary citation); AspectJ mode is the exception | Spring Framework reference |

Extra facts from the same pages (31 to 40):

- Spring `@Transactional` rolls back on unchecked exceptions only, not checked ones, unless `rollbackFor` is set.
- A `void` `@Async` method cannot pass an exception to its caller; by default it is only logged.
- errgroup `SetLimit` must not change while goroutines are active.
- Go 1.25 vet `hostport` flags `fmt.Sprintf("%s:%d", host, port)` for addresses; use `net.JoinHostPort` (IPv6).
- `return-await` in a `catch`: `await` required only when a `finally` follows. The page the checker cited is a copy in someone's `node_modules`, not the vendor site: treat it as secondary until read on typescript-eslint.io. Item 13's primary page covers the rule.
- `void promise` silences `no-floating-promises` but leaves the rejection unhandled.
- `no-misused-spread` (in `strict-type-checked`) flags spreading a Promise, an Array, a class instance or a string into an object.
- React: no hooks inside `try`/`catch`/`finally`, loops, conditions or after an early return; React 19's `use()` is the exception.
- React Strict Mode in development mounts, unmounts and mounts a class component again to expose missing cleanup.
- AWS SDK adaptive retry mode can delay the first request, not only retries, and is not available in Go, Rust, JavaScript, .NET, Kotlin or Swift.

## Our assessment of the reply

- Items 10, 17 and 35 rest on weak quotes or on a mirror. 10 and 17 match the vendor pages we already hold; 35 is used only where item 13 also supports it.
- Some exceptions in the reply are not real exceptions: item 12's "legacy code or test assertions" and item 39's "production builds" describe where the warning stays silent, not where the rule does not apply. They are not carried into the skills.
- Version axes the reviewer must check: Python 3.14 (PEP 765 warning); TypeScript target ES5 or ES2015+; Go 1.25 (`waitgroup`, `hostport`, `WaitGroup.Go`); Rust 1.81 (`extern "C"` aborts); Spring Boot with or without virtual threads; React 19 (`use()`).

## Changes this drives (Phase 3)

- `rust-craft`: the `extern "C"` row, now abort since 1.81 (not undefined behaviour); add `await_holding_lock` as `suspicious`.
- `java-craft`: `rollbackFor` on checked exceptions; `void @Async` swallows; Boot's default executor queue is unbounded; cite the Spring reference for self-invocation.
- `typescript-craft`: ES5 `setPrototypeOf` with the class's own prototype; `require-array-sort-compare` is not in any preset; `void` does not handle a rejection; `no-misused-spread`.
- `python-craft` and `failure-handling`: PEP 765; `requests` with no timeout, `httpx` `timeout=None`; `CancelledError` under a bare `except`; `__exit__` returning true; `@contextmanager` without `try`/`finally`; an outer retry around an AWS SDK call.
- `go-craft`: `Buffer.Bytes` after `Reset`/pool; errgroup context after `Wait`; `defer` argument evaluation; `hostport`.
- `react-craft`: error-boundary limits; hooks in `try`; Strict Mode double mount.
