# Go craft

Use this when a change touches `.go` files. It holds only what is specific to Go. Checks true in every language stay in the expert's checklist, `engineering-principles` and `failure-handling`.

## First, find out what the tooling already covers

Read `go.mod` (the `go` version matters below), `.golangci.yml` or `.golangci.toml`, the `Makefile`, and the CI config. A problem an enabled check catches is not a review finding.

| Problem | Check that catches it, when enabled |
|---|---|
| Unchecked error return | golangci-lint `errcheck` |
| Mutex or other lock copied by value | `go vet` `copylocks` |
| Context cancel function never called | `go vet` `lostcancel` |
| Printf verbs that do not match the arguments | `go vet` `printf` |
| Variable shadowing | golangci-lint `govet` with the `shadow` analyzer enabled (not part of plain `go vet`) |
| Unused code, dead assignments | staticcheck, golangci-lint `unused`, `ineffassign` |
| Data races | `go test -race` (a run-time check; ask whether CI runs it) |

## Traps a linter often misses

### Errors
- **Returning a typed nil as `error`.** `var err *MyError; return err` returns a non-nil interface; callers' `err != nil` is always true. Return a literal `nil`.
- **Shadowed error.** `err := ...` inside an inner block hides the outer `err`, so the outer check sees the old value.
- **`return err` with no context** on a path where the caller cannot tell what failed. Wrap with `fmt.Errorf("doing x: %w", err)`; `%v` breaks `errors.Is` and `errors.As`.
- **`err == ErrX`** on errors that are wrapped anywhere; use `errors.Is` and `errors.As`.
- **`defer f.Close()` on a file that was written.** The write may only fail at close; the error is dropped. Check it on write paths.
- **`panic` for an expected failure** (a missing record, bad input). Panics are for programming errors.

### Concurrency
- **Goroutine leak.** A goroutine sending on an unbuffered channel that nobody reads after a timeout, or one with no way to stop. Give it a `context.Context` and select on `ctx.Done()`, or buffer the channel.
- **`context.Background()` or `TODO()` inside a request path** cuts the request's deadline and cancellation off from everything below it. Pass the caller's context.
- **Context stored in a struct** instead of passed as the first parameter.
- **Concurrent map access** without a mutex or `sync.Map`: a data race that can crash the process.
- **Unlock not deferred**, so an early return or panic leaves the mutex locked.
- **`wg.Add` called inside the goroutine** instead of before starting it; `Wait` may return early.
- **Closing a channel from the receiver**, or closing it twice: both panic.
- **Loop variable captured by a goroutine or closure** in modules whose `go.mod` declares a version before 1.22, where the loop variable is shared across iterations.

### Values
- **Slices share their backing array.** `b := a[:2]; b = append(b, x)` may overwrite `a[2]`. Copy when the two must be independent.
- **Integer overflow wraps silently**, including in size and money calculations. Check before multiplying counts by sizes.
- **Writing to a nil map** panics.
- **JSON decoding is lenient:** unknown fields are ignored, field names match case-insensitively, and duplicate keys take the last value. Use `DisallowUnknownFields` where a typo should fail.
- **`time.Time` compared with `==`** compares location and monotonic clock too; use `Equal`.
- **Map iteration order is random**; output or tests that depend on it are flaky.

### Resources
- **`http.Client{}` and `http.DefaultClient` have no timeout.** An external call without one can hang the request forever.
- **HTTP response body not closed**, or closed before it is read to the end when connection reuse matters.
- **`sql.Rows` not closed**, and `rows.Err()` not checked after the loop.
- **`defer` inside a loop** keeps every resource open until the function returns.

### Interfaces
- An interface defined next to its only implementation, before any consumer needs it, is speculative. Go's convention is to define the interface where it is used, accept interfaces and return concrete types.

### Security-relevant traps (raise them, name the domain as security)
- `InsecureSkipVerify: true` outside tests.
- `os/exec` running a shell (`sh -c`) with interpolated input.
- `filepath.Join` with user input and no check that the result stays under the intended root.
- `unsafe` without a stated invariant.

## Not a finding

- Formatting (`gofmt`), import grouping, naming style where a linter enforces it.
- Table-driven tests versus separate tests, naked returns in short functions, value versus pointer receivers when the type is consistent.
- `strings.Builder` or slice pre-allocation advice with no hot path.
- Loop variable capture in a module on Go 1.22 or later.
