# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| rust-lang/rust-clippy lint sources and rustc lint sources, as published in their repositories | Read 2026-10-20 | MIT or Apache-2.0 | Lint names and default groups, marked [D] |
| blog.rust-lang.org (Rust 1.81.0); docs.rs tokio `select!`; rust-lang.github.io clippy (master); the Rust reference, destructors; the Cargo SemVer reference | Checked live by the maintainer, 2026-10-20 (developer round 2 and prompt 3b) | Project documentation | Every fact marked [R] |
| affaan-m/ECC, `rust-reviewer` agent and `rust-patterns` skill | Read 2026-10-20 | MIT | Panics on production paths, lost error context, `Box<dyn Error>` in libraries, blocking in async, unbounded channels, poisoning, wildcard arms, `SAFETY` comments |
| trailofbits/skills, `sharp-edges` Rust reference and `rust-review` | Read 2026-10-20 | CC BY-SA 4.0 | Overflow between debug and release, `mem::forget`, panics in `Drop`, `RefCell` double borrows, incorrect `Send` and `Sync`, atomic check-then-act, what the compiler does not prove (ideas only; no text, so the share-alike terms do not apply) |
| wshobson/agents, `rust-async-patterns` | Read 2026-10-20 | MIT | No lock across an await, bounded spawning |

Our own review experience: dropped `JoinHandle`s, `as` truncation, lock-order deadlocks, marked [O].

Left out, and why: `String` or `Vec` parameters where a slice would do and `.clone()` to pass the borrow checker (performance opinion, not checkable as a defect; `needless_pass_by_value` covers the first when enabled); command, deserialisation and path traps (security owns them); `rustfmt` and lifetime style (the formatter and the review reference).
