# Rust craft

Use this when a change touches `.rs` files. It holds only what is specific to Rust. Checks true in every language stay in the expert's checklist, `engineering-principles` and `failure-handling`. The compiler proves the absence of data races in safe code; it proves nothing about panics, `unsafe` blocks, lock ordering or what happens across an `await`.

## First, find out what the tooling already covers

Read `Cargo.toml` (lint tables under `[lints]`), `clippy.toml`, `rustfmt.toml` and the CI config. A problem an enabled lint catches is not a review finding; an `#[allow(...)]` added by the change without a reason is.

| Problem | Lint that catches it, when enabled |
|---|---|
| Result or `#[must_use]` value discarded | rustc `unused_must_use` (on by default) |
| `unwrap` and `expect` in non-test code | clippy `unwrap_used`, `expect_used` (restriction group, off by default) |
| Panicking index or arithmetic | clippy `indexing_slicing`, `arithmetic_side_effects` (restriction, off by default) |
| Truncating `as` casts | clippy `cast_possible_truncation` (pedantic, off by default) |
| Unused code | rustc `dead_code`, `unused_*` |

## Traps a linter often misses

### Panics where a failure was expected
- `.unwrap()`, `.expect()`, `panic!`, `todo!`, `unreachable!`, slice indexing `v[i]` and integer division on a request path or in a long-running service. One bad input takes the task or the process down. Return a `Result` and propagate with `?`.
- **Mutex poisoning.** `.lock().unwrap()` turns one panicking thread into a panic in every later caller. That may be the intended policy; it should be a decision, not a default.
- **A panic in `Drop`** while already unwinding aborts the process. **A panic across an `extern "C"` boundary** is undefined behaviour; catch it at the boundary.

### Errors
- **`let _ = fallible();`** discards the error explicitly and silences the warning.
- **Context lost.** `map_err(|_| MyError::Failed)` drops the cause; keep it as a source (`thiserror` `#[source]`, or `anyhow` `.context()`).
- **`Box<dyn Error>` or `anyhow::Error` in a library's public API**, so callers cannot match on the failure. Applications may use them; libraries should expose typed errors.

### Integers
- **Overflow panics in debug builds and wraps silently in release.** Sizes, counts and money need `checked_*` (or `saturating_*` where clamping is right) so the behaviour does not change between builds.
- **`as` between integer types truncates or wraps silently** (`u64 as u32`, `i64 as usize`). Use `try_from`.

### Async
- **A `std::sync::Mutex` guard held across `.await`** blocks the executor thread and can deadlock. Release it before awaiting, or use the async runtime's mutex when the lock must span an await.
- **Blocking calls in async code:** `std::thread::sleep`, `std::fs`, synchronous network clients, heavy CPU work. Use the runtime's async versions or `spawn_blocking`.
- **Unbounded concurrency:** spawning a task per item with no limit, or an unbounded channel on a path an external client controls. Bound it with a semaphore or a bounded channel.
- **A spawned task's `JoinHandle` dropped**, so its error or panic is never observed.

### `unsafe` and memory
- **`unsafe` without a `// SAFETY:` comment** stating the invariant that makes it sound. Check that the invariant actually holds at every call.
- **`unsafe impl Send` or `Sync`** for a type holding raw pointers or `Rc`: a data race the compiler can no longer catch.
- **`mem::forget`** on a lock guard or resource leaks it, and can deadlock.
- **`RefCell` borrowed mutably twice** across function calls panics at run time.

### Types and matching
- **A wildcard `_ =>` arm on the crate's own enum** hides new variants; the compiler can no longer point at the places to update.
- **A function taking `String` or `Vec<T>`** where it only reads, forcing callers to allocate or clone. Take `&str` or `&[T]`.
- **`.clone()` added to get past the borrow checker** in a hot path or on large values. Elsewhere it is usually fine.

### Security-relevant traps (raise them, name the domain as security)
- `std::process::Command` built from user input passed through a shell.
- Deserialising untrusted data with no size or depth limit.
- Paths from user input with no canonicalisation and root check.

## Not a finding

- Formatting (`rustfmt`), derive order, explicit lifetimes where elision would do.
- Iterator chains versus loops, `match` versus `if let`: preferences.
- `unwrap` in tests, examples, build scripts, or on a value a stated invariant guarantees (a literal pattern compiled once, with `expect` saying why).
- A `.clone()` of a small value off the hot path.
