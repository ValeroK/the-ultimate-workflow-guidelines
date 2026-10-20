# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| anthropics/claude-plugins-official, `pr-review-toolkit` `silent-failure-hunter` | Apache-2.0 | The questions for each handler: which unrelated errors a catch could hide, what the caller sees, whether the fallback was asked for, the right level to handle |
| affaan-m/ECC, `silent-failure-hunter` and `error-handling` | MIT | Lost cause, log-and-forget, retries only for retriable errors, user and developer messages kept apart |
| wshobson/agents, `error-handling-patterns` and `python-error-handling` | MIT | Logging and rethrowing at every level as a pitfall, chaining with `raise ... from e`, partial failures in batches, expected failures as values |
| trailofbits/skills, `sharp-edges` | CC BY-SA 4.0 | A boolean or empty return for a security failure that callers forget to check (idea only; no text, so the share-alike terms do not apply) |
| Language documentation (checked in the research pass): the Python tutorial on errors, Effective Go, Microsoft's .NET exception guidance, the Rust book | Various | Scoped cleanup forms, Go `defer` scope, `throw;` versus `throw ex;`, `unwrap` panics |

The partial-batch and idempotent-retry rows come from defects in this plugin's own evaluation corpora.
