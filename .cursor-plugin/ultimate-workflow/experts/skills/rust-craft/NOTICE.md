# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `rust-reviewer` agent and `rust-patterns` skill | MIT | `unwrap` on production paths, silenced `must_use` results, lost error context, `Box<dyn Error>` in libraries, blocking in async, unbounded channels, mutex poisoning, wildcard arms on business enums, `String` and `Vec` where slices suffice, `SAFETY` comments |
| trailofbits/skills, `sharp-edges` Rust reference | CC BY-SA 4.0 | Overflow that differs between debug and release, `mem::forget`, panics in `Drop` and across FFI, `RefCell` double borrows, incorrect `Send` and `Sync` (ideas only; no text, so the share-alike terms do not apply) |
| trailofbits/skills, `rust-review` | CC BY-SA 4.0 | Read; it is a multi-agent security audit pipeline with scripts. Only the point that the compiler proves nothing about `unsafe`, panics or lock ordering is reflected, as an idea |
| wshobson/agents, `rust-async-patterns` | MIT | Never hold a lock across an await, bound task spawning, `Send` bounds on spawned futures |

`as` truncation, panicking indexing and division and dropped `JoinHandle`s come from our own review experience. The clippy lint names and their groups (restriction, pedantic) and rustc's `unused_must_use` and `dead_code` were verified on 2026-10-20 against each tool's own source repository on GitHub (the documentation sites were not reachable from the build session).
