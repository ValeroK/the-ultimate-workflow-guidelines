# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| pkg.go.dev (`bytes`, `golang.org/x/sync/errgroup`, apidiff); go.dev Go 1.22 and 1.25 release notes; Effective Go; the Go blog on module compatibility | Checked live by the maintainer, 2026-10-20 (developer round 2 and prompt 3b) | BSD-3-Clause documentation | Every fact marked [R] |
| The `go vet` command documentation and golangci-lint's reference configuration, in their repositories | Saved copies read 2026-10-20 | BSD-3-Clause and GPL-3.0 | Every analyzer name in the table [D] |
| affaan-m/ECC, `go-reviewer` agent and `golang-patterns` skill | Read 2026-10-20 | MIT | Wrapping errors, panics for recoverable errors, goroutine leaks, context as the first parameter, interfaces where used; its `sync.Pool` example, whose aliasing defect became the `Buffer.Bytes` row |
| trailofbits/skills, `sharp-edges` Go reference | Read 2026-10-20 | CC BY-SA 4.0 | Typed nil interfaces, slice aliasing, silent overflow, lenient JSON, concurrent maps, ignored deferred close (ideas only; no text, so the share-alike terms do not apply). Its claim that per-iteration loop variables arrived by default in 1.23 was wrong (1.22) and not taken |
| wshobson/agents, `go-concurrency-patterns` | Read 2026-10-20 | MIT | Close from the sender only; errgroup |

Rows marked [O] (`http.Client` with no timeout) come from our own review experience.

Left out, and why: `InsecureSkipVerify`, shell execution, path traversal and `unsafe` (security owns them); `/vN` module paths and `internal/` (`module-boundaries`); a nil-map write (fails on the first run); `time.Sleep` to synchronise tests (quality); package-level mutable state (the review reference's shared-state category); functional options as a design (only the compatibility rule is kept).
