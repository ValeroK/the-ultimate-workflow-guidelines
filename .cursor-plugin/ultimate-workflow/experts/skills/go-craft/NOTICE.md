# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `go-reviewer` agent and `golang-patterns` skill | MIT | Ignored errors, wrapping with `%w`, `errors.Is` and `errors.As`, panics for recoverable errors, goroutine leaks, context as the first parameter, defer in loops, interface pollution, its golangci-lint set |
| trailofbits/skills, `sharp-edges` Go reference | CC BY-SA 4.0 | Typed nil interfaces, slice aliasing, silent integer overflow, lenient JSON decoding, goroutine leak on an unbuffered channel, loop variable capture before 1.22, concurrent maps, error shadowing, ignored deferred close (ideas only; no text, so the share-alike terms do not apply) |
| wshobson/agents, `go-concurrency-patterns` | MIT | Close channels from the sender only, use `errgroup`, never use `time.Sleep` to synchronise |
| The `go vet` command documentation and golangci-lint's reference configuration, verified on 2026-10-20 against each tool's own source repository on GitHub (the documentation sites were not reachable from the build session) | BSD and GPL-3.0 | The analyzer and linter names in the table |

`http.Client` without a timeout, `context.Background()` in request paths, `wg.Add` placement, `time.Time` equality and `sql.Rows` handling come from our own review experience.
