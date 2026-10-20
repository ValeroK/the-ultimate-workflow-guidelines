# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `python-reviewer` agent and `python-patterns` skill | MIT | Bare and swallowed exceptions, missing context managers, mutable defaults, `is` versus `==`, blocking in async. Its thread-pool example, which turns errors into strings, was not taken |
| wshobson/agents, `python-anti-patterns`, `python-resource-management`, `python-type-safety`, `async-python-patterns` | MIT | Blocking in async, unclosed resources, `ExitStack`, cancellation handling, `gather` with `return_exceptions`, `Any` in public signatures |
| trailofbits/skills, `sharp-edges` Python reference | CC BY-SA 4.0 | Late-binding closures, shared mutable class attributes, identity versus equality, format-string injection, deserialisation (ideas only; no text, so the share-alike terms do not apply) |
| trailofbits/skills, `modern-python` | CC BY-SA 4.0 | Read; it is about project tooling (uv, ruff, ty), not review, so only the "find what the linter covers" step reflects it |
| Ruff's rule registry (`crates/ruff_linter/src/codes.rs`), verified on 2026-10-20 against each tool's own source repository on GitHub (the documentation sites were not reachable from the build session) | MIT | Every Ruff code in the linter table, with its meaning |

Naive datetimes, money as float, `dict.get` defaults, `assert` for validation, truthiness on zero, warm-container module state and large ids through JSON come from our own review experience and the evaluation corpora.
