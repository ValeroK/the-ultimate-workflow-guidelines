# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| docs.python.org (asyncio exceptions, data model, contextlib, dataclasses, the language reference on imports); PEP 765, PEP 8, PEP 387; requests and httpx documentation | Checked live by the maintainer, 2026-10-20 (developer round 2 and prompt 3b) | Python Software Foundation and project documentation | Every fact marked [R] |
| Ruff's rule registry, `crates/ruff_linter/src/codes.rs` in astral-sh/ruff | Saved copy read 2026-10-20 | MIT | Every rule code in the linter table [D] |
| affaan-m/ECC, `python-reviewer` agent and `python-patterns` skill | Read 2026-10-20 | MIT | Swallowed exceptions, context managers, blocking in async. Its thread-pool example, which turns errors into strings, was not taken |
| wshobson/agents, `python-anti-patterns`, `python-resource-management`, `python-type-safety`, `async-python-patterns` | Read 2026-10-20 | MIT | Blocking in async, `gather` with `return_exceptions`, unawaited coroutines, generators holding resources, optional results |
| trailofbits/skills, `sharp-edges` Python reference and `modern-python` | Read 2026-10-20 | CC BY-SA 4.0 | Late-binding closures, shared class attributes, the `[tool.ty]` config (ideas only; no text, so the share-alike terms do not apply) |

Rows marked [O] (module state in warm containers, money as float, `dict.get` defaults, `assert` for validation, truthiness on zero) come from our own review experience and the evaluation corpora.

Left out, and why: injection, deserialisation and shell traps (security owns them; the S-codes stay in the linter table only); `with` and `ExitStack` as general cleanup (`failure-handling`); large integer ids through JSON (the consumer side, `typescript-craft`); returning an internal list (the review reference's shared-state category); rows a type checker or linter enforces, moved into the table; griffe as a tool to run (nothing here runs tools).
