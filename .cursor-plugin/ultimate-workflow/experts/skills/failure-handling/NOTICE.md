# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| Python tutorial "Errors and Exceptions" (`python/cpython` `Doc/tutorial/errors.rst`); Effective Go (`golang/website`); the Rust book, chapter 9 (`rust-lang/book`); Microsoft .NET "Best practices for exceptions" (`dotnet/docs`) | Read in their repositories, 2026-10-20 | Various | Every fact marked [D]: scoped cleanup forms, cause chaining per language, `throw;` versus `throw ex;` |
| PEP 765; ESLint `no-unsafe-finally`; Error Prone `Finally`; the AWS SDKs and Tools reference, retry behaviour | Checked live by the maintainer, 2026-10-20 (developer fact-check, round 2) | Various | Every fact marked [R]: control flow leaving `finally`, SDK retries multiplying an application retry |
| anthropics/claude-plugins-official, `pr-review-toolkit` `silent-failure-hunter` | Read 2026-10-20 | Apache-2.0 | Naming two unrelated errors a catch hides, what the caller sees, whether the fallback was asked for, the right level |
| affaan-m/ECC, `silent-failure-hunter` and `error-handling` | Read 2026-10-20 | MIT | Lost cause, log and carry on, retrying only retriable errors |
| wshobson/agents, `error-handling-patterns` and `python-error-handling` | Read 2026-10-20 | MIT | Logging and rethrowing at every level, partial failures in batches |

Left out, and why: the empty handler (every linter catches it); ignored error values, crashes where failure was expected, floating async work and Go `defer` in a loop (they live in the language skills); "expected failures as values" (advice, not a check); retry budgets and DLQs across services (the architect). The partial-batch row and "a timeout is an unknown outcome" come from defects in this plugin's own evaluation corpora.
