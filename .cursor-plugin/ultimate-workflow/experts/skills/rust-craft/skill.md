---
name: rust-craft
description: Use when a change touches Rust files (.rs, Cargo.toml) - panics on input paths, error handling, integer overflow, async locks, blocking and cancellation, unsafe and drop order, and a published crate's public API.
verified: 2026-10-20
requires: Rust 1.81+ for the extern "C" abort rule; the crate's edition and rust-version (MSRV)
---

# Rust craft

## Goal

- **Lets the expert catch:** Rust failures the compiler does not prove away: a panic on input a caller controls, an error silently discarded, overflow that differs between debug and release, a lock or a lost future across an `.await`, `unsafe` without its invariant, and a public-API change that breaks dependants.
- **Applies to:** `.rs` files and `Cargo.toml`.
- **Not for:** checks true in every language (`failure-handling`, `engineering-principles`, the review reference); injection, deserialisation limits and path traversal (security); unbounded work across services (architect); a crate's dependencies and lock file (`dependency-discipline`).

Sources: **[D]** the rustc and clippy lint sources as published in their repositories (2026-10-20); **[R]** the maintainer's live check (blog.rust-lang.org, docs.rs tokio, rust-lang.github.io clippy, the Rust reference, the Cargo SemVer reference; 2026-10-20); **[T]** an upstream community skill, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

The compiler proves the absence of data races in safe code; it proves nothing about panics, `unsafe`, lock ordering or what happens across an `await` [T].

## First, establish the target

- **What the tooling enforces.** Read `Cargo.toml` `[lints]`, `clippy.toml`, `rustfmt.toml` and CI. A problem an enabled lint catches is not a finding; an `#[allow(...)]` the change adds without a reason is (`allow_attributes_without_reason`, restriction group, off by default [R]).
- **Lints, by default state:** `unused_must_use` is on [D]; `unwrap_used`, `expect_used`, `indexing_slicing`, `arithmetic_side_effects`, `wildcard_enum_match_arm`, `let_underscore_must_use`, `mem_forget` and `undocumented_unsafe_blocks` are `restriction`, off by default [D][R]; `cast_possible_truncation` is `pedantic`, off [D]; `await_holding_lock` is `suspicious`, warn by default [R].
- **The toolchain:** `rust-version` and the edition in `Cargo.toml` (the `extern "C"` rule below needs 1.81).
- **Whether the crate is published:** `publish` not `false` in `Cargo.toml`, or a crates.io release. The public-API section applies only then.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Panics and errors

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A panic on a request path takes the task or process down: `.unwrap()`, `.expect()`, `panic!`, `todo!`, `unreachable!`, slice indexing and integer division on input a caller controls; return a `Result` and propagate with `?` [T] | One of these on a handler, parser or long-running loop | Tests, examples, build scripts, or a value a stated invariant guarantees (with `expect` saying why) |
| `.lock().unwrap()` turns one panicking thread into a panic in every later caller (poisoning); it should be a decision, not a default [T] | `.lock().unwrap()` added in a service | A documented poison-means-abort policy |
| A panic in `Drop` while already unwinding aborts the process [T] | `unwrap` or indexing inside `impl Drop` | |
| Since Rust 1.81 an unwind out of an `extern "C"` function aborts the process (no longer undefined behaviour); catch it at the boundary if the host must not abort [R] | Panicking code (`unwrap`, indexing) reachable inside an `extern "C" fn` with no `catch_unwind` | `extern "C-unwind"` where both sides support unwinding [R] |
| `let _ = fallible();` discards the error and silences `unused_must_use` [T] | `let _ =` on a `Result` | `let_underscore_must_use` is enabled |
| `map_err(\|_\| MyError::Failed)` drops the cause; keep it as a source (`#[source]`, `.context()`) [T] | A `map_err` closure that ignores its argument | |
| A spawned task's `JoinHandle` dropped means its error or panic is never seen [O] | `tokio::spawn(...)` with the handle discarded on a path whose failure matters | Intentionally detached background work |

## Integers

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Overflow panics in debug and wraps silently in release, so sizes, counts and money need `checked_*` or `saturating_*` [T] | `+`, `*` or `-` on a size, count or amount from input | `arithmetic_side_effects` is enabled |
| `as` between integer types truncates or wraps silently (`u64 as u32`); use `try_from` [O] | A narrowing `as` on a value from input | `cast_possible_truncation` is enabled |

## Async and concurrency

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A `std::sync::Mutex` (or `RwLock`, `parking_lot`) guard held across `.await` blocks the executor thread and can deadlock (clippy `await_holding_lock`) [R] | A guard still in scope at an `.await` | An async-aware guard (`tokio::sync::Mutex`), or a guard scoped in a block that ends before the await [R] |
| In `tokio::select!`, the branches that do not finish are dropped, so a future that is not cancellation-safe (`read_exact`, `read_to_end`, a multi-step async block) loses its progress when `select!` runs in a loop [R] | A non-cancellation-safe call recreated inside `select!` on each iteration | The future pinned outside the loop and polled by `&mut` [R] |
| Blocking calls in async code (`std::thread::sleep`, `std::fs`, a synchronous client, heavy CPU) stall every task on that thread [T] | Such a call in an `async fn` with no `spawn_blocking` | |
| A task per item, or an unbounded channel, on a path an external client controls has no limit [T] | `spawn` in a loop over request data, or `unbounded_channel()` there | A bounded input by construction |
| Two locks taken in different orders on two paths can deadlock [O] | A new path that takes lock B then A where another takes A then B | |
| An atomic load followed by a store is a check-then-act race [T] | `if x.load(..) == v { x.store(..) }` | `compare_exchange` |

## `unsafe` and drop order

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `unsafe` needs a `// SAFETY:` comment stating the invariant, and the invariant must hold at every call [T] | An `unsafe` block with no comment, or a caller that breaks the stated invariant | `undocumented_unsafe_blocks` is enabled |
| `unsafe impl Send` or `Sync` for a type holding raw pointers or `Rc` is a data race the compiler can no longer catch [T] | Such an `impl` added | |
| `mem::forget` on a guard or resource leaks it and can deadlock [T] | `mem::forget` added | `mem_forget` is enabled |
| A `RefCell` borrowed mutably twice across calls panics at run time [T] | A `borrow_mut()` held while calling code that borrows the same cell | |
| A type's own `Drop` runs first, then its fields in declaration order, so a field another field needs during drop must be declared after it [R] | A struct where an earlier field is used by a later field's `Drop` (a pool before the handle that flushes to it) | Fields wrapped in `ManuallyDrop` and dropped explicitly [R] |
| A wildcard `_ =>` arm on the crate's own enum hides new variants from the compiler [T] | `_ =>` added on a crate-local enum | A `#[non_exhaustive]` enum from another crate, which needs a wildcard [R] |

## Public API of a published crate

Only when the crate is published (see First, establish the target).

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Adding a field to a struct whose fields are all public is a major change, whether the new field is public or private [R] | A field added to an all-public struct | A struct already `#[non_exhaustive]` |
| A new enum variant is major unless the enum is `#[non_exhaustive]`; adding `#[non_exhaustive]` to an existing type is major too [R] | A variant added, or the attribute added, on a released enum | |
| A new trait item without a default is major; with a default it may still break [R] | An item added to a public trait | A sealed trait [R] |
| Removing a Cargo feature, requiring `std`, or reordering a `repr(C)` type's fields is major [R] | Those edits in `Cargo.toml` or a `#[repr(C)]` type | |
| Cargo treats a change in `y` of `0.y.z` as major, and any change of `0.0.z` [R] | A breaking change released as `0.y.(z+1)` | |
| `Box<dyn Error>` or `anyhow::Error` in a library's public API stops callers matching on the failure [T] | A public function of a library returning them | Applications and binaries |

## Not a finding

- Formatting, derive order, and explicit lifetimes where elision would do.
- Iterator chains against loops, `match` against `if let`.
- `unwrap` in tests, examples, build scripts, or on a stated invariant.
- A `.clone()`, or a `String` parameter where `&str` would do, off a measured hot path.
