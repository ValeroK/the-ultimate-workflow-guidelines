---
name: go-craft
description: Use when a change touches Go files - the language's traps that look correct (errors, defer, goroutines, contexts, errgroup, slices and buffers, JSON), which of them go vet and golangci-lint already catch, and the exported API of a module others import.
verified: 2026-10-20
requires: the go version in go.mod (1.22 changes loop variables; 1.25 adds the waitgroup and hostport analyzers)
---

# Go craft

## Goal

- **Lets the expert catch:** Go code that drops or mis-wraps an error, leaks a goroutine or a context, reads memory another caller will overwrite, or breaks importers of a published module, in the cases an enabled analyzer does not already flag.
- **Applies to:** `*.go` files and `go.mod`.
- **Not for:** `internal/` boundaries, `/vN` paths and `linkname` (`module-boundaries`); `InsecureSkipVerify`, shell execution, path traversal and `unsafe` (security); error-handling patterns true in every language (`failure-handling`); tests (quality).

Sources: **[R]** the maintainer's live check (pkg.go.dev, go.dev release notes and Effective Go, the Go module-compatibility blog post and apidiff; 2026-10-20); **[D]** the `go vet` documentation and golangci-lint's reference configuration in their repositories (read 2026-10-20); **[T]** an upstream community skill, not checked (see `NOTICE.md`); **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The `go` version in `go.mod`:** below 1.22 a loop variable is shared across iterations; 1.25 adds the `waitgroup` and `hostport` vet analyzers and `WaitGroup.Go` [R].
- **The analyzers that run:** `.golangci.yml` or `.golangci.toml`, the `Makefile` and the CI config. A problem an enabled analyzer catches is not a finding; ask whether CI runs `go test -race`.
- **Whether the module is imported by others** (a public module path, release tags). Only then does "Exported API of a published module" apply.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## What an enabled analyzer already catches

| Problem | Analyzer [D] |
|---|---|
| Unchecked error return | golangci-lint `errcheck` |
| `err == ErrX` on wrapped errors; `%v` instead of `%w` | golangci-lint `errorlint` |
| Shadowed variable, `err` included | `govet` with the `shadow` analyzer (not plain `go vet`) |
| Lock copied by value; cancel function never called; printf verbs | `go vet` `copylocks`, `lostcancel`, `printf` |
| Loop variable captured, before go 1.22 | `go vet` `loopclosure` |
| HTTP response used before checking the error; body not closed | `go vet` `httpresponse`; golangci-lint `bodyclose` |
| `sql.Rows` not closed, `rows.Err()` unchecked | golangci-lint `sqlclosecheck`, `rowserrcheck` |
| Non-inherited context; HTTP request without a context | golangci-lint `contextcheck`, `noctx` |
| `wg.Add` misplaced (go 1.25) | `go vet` `waitgroup` [R] |
| `fmt.Sprintf("%s:%d", host, port)` as an address (go 1.25) | `go vet` `hostport`, which suggests `net.JoinHostPort` (IPv6) [R] |
| Unused code, dead assignments | staticcheck, `unused`, `ineffassign` |

## Errors and defer

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A typed nil returned as `error` is a non-nil interface, so `err != nil` is always true [T] | `var err *MyError; ...; return err` | |
| `return err` with no context where the caller cannot tell what failed; wrap with `%w` [T] | A bare `return err` across a package boundary | A thin wrapper whose caller adds the context |
| `defer f.Close()` on a written file drops the error the write may only report at close [T] | Deferred `Close` with the error ignored on a write path | Read-only files |
| A deferred call's function value and arguments, the receiver included, are evaluated when `defer` runs, not at return [R] | `defer log(time.Since(start))`, or `defer f(err)` with `err` reassigned later | `defer func() { f(err) }()`, which reads at exit [R] |
| `defer` inside a loop keeps every resource until the function returns [T] | `for ... { f, _ := os.Open(...); defer f.Close() }` | A loop body moved into its own function |
| `panic` for an expected failure (a missing record, bad input) [T] | `panic` on a lookup miss or a validation error | Programming errors and impossible states |

## Goroutines and contexts

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A goroutine that sends on an unbuffered channel nobody reads after a timeout, or has no exit, leaks [T] | A send with no `select` on `ctx.Done()` after the reader may have gone | A buffered channel sized to the senders |
| `context.Background()` or `TODO()` inside a request path cuts off the caller's deadline and cancellation [T] | A new `context.Background()` in a handler's call chain | `main`, and detached background work that must outlive the request |
| A context is passed as the first parameter, not stored in a struct [T] | A `ctx` field on a long-lived struct | |
| Concurrent map access without a lock or `sync.Map` is a data race that can crash the process [T] | A map written from several goroutines | |
| `Unlock` not deferred leaves the mutex locked on an early return or panic [T] | `mu.Lock()` with `mu.Unlock()` only at the end | A critical section with no return or call that can panic |
| A channel is closed only by its sender, once; a receiver closing it, or a second close, panics [T] | `close(ch)` in the receiving goroutine | |
| The context from `errgroup.WithContext` is cancelled at the first error or when `Wait` returns [R] | That context used for work after `g.Wait()` | Work inside the group's functions before `Wait` returns |
| `errgroup` `SetLimit` must not change while goroutines in the group are active [R] | `g.SetLimit` after `g.Go` and before `Wait` | Right after creating the group, or after `Wait` |

## Values

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `bytes.Buffer.Bytes()` aliases the buffer and is valid only until the next modification, so a slice returned after a `Reset` or a `sync.Pool` `Put` is overwritten by the next user [R] | `defer pool.Put(buf)` or `buf.Reset()` with `return buf.Bytes()` | `bytes.Clone(buf.Bytes())` before the buffer is reused |
| Slices share a backing array: appending to a sub-slice may overwrite the original [T] | `b := a[:2]; b = append(b, x)` while `a` is still used | A full slice expression `a[:2:2]`, or a copy |
| Integer overflow wraps silently, including in size and money calculations [T] | A count multiplied by a size with no bound check | |
| JSON decoding ignores unknown fields, matches names case-insensitively and keeps the last duplicate key [T] | Decoding a request body where a typo should fail, with no `DisallowUnknownFields` | Lenient decoding chosen on purpose |
| `time.Time` compared with `==` also compares location and the monotonic reading; use `Equal` [T] | `t1 == t2` | |
| Map iteration order is random [T] | Output or a key built by ranging over a map | Sorted keys |
| `http.Client{}` and `http.DefaultClient` have no timeout [O] | An external call through a client with no `Timeout` or context deadline | |
| An interface belongs where it is used; accept interfaces, return concrete types [T] | An interface declared beside its only implementation, before any consumer | |

## Exported API of a published module

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A method added to an exported interface breaks implementations outside the module [R] | A new method on an exported interface | The interface already has an unexported method, so no one outside can implement it [R] |
| A parameter added to an exported function breaks callers; even `func(int)` to `func(...int)` breaks a typed function variable. Add a new function, options or a variadic from the start [R] | A changed exported function signature | |
| A new struct field breaks unkeyed literals, and a non-comparable field breaks comparability [R] | A field added to an exported struct users build, or a slice or map field added to a comparable one | |
| Changing an exported constant's value is incompatible, and inserting into an `iota` block shifts the later values [R] | A constant's value changed, or a new name inserted in the middle of an `iota` block | |
| A type that stops implementing an exported interface breaks the package's users [R] | A method removed or its signature changed on a type used as that interface | |

## Not a finding

- Formatting, import grouping and naming where `gofmt` or a linter enforces them.
- Table-driven tests versus separate tests, naked returns in short functions, value versus pointer receivers when the type is consistent.
- `strings.Builder` or slice pre-allocation advice with no hot path.
- Loop variable capture in a module on go 1.22 or later.
- Writing to a nil map: it panics on the first run.
