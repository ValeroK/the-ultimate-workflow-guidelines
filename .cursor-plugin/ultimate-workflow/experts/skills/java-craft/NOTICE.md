# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `java-reviewer` agent and `java-coding-standards` skill | MIT | `Optional.get()`, swallowed exceptions, entities in responses, `@Transactional` placement, eager fetching and N+1, unpaged list endpoints, `@Modifying`, field injection, mutable singleton beans, unbounded async execution, raw types |
| trailofbits/skills, `sharp-edges` Java reference | CC BY-SA 4.0 | Reference equality and the `Integer` cache, unboxing nulls, `split` with a regular expression, `SimpleDateFormat` and `HashMap` thread safety, resource leaks and masking `finally`, `BigDecimal` from `double`, deserialisation and XXE (ideas only; no text, so the share-alike terms do not apply) |
| SpotBugs' `messages.xml` and Error Prone's bug-pattern documentation in their repositories, verified on 2026-10-20 against each tool's own source repository on GitHub (the documentation sites were not reachable from the build session) | LGPL and Apache-2.0 | Every check name in the table |

Swallowed `InterruptedException`, `BigDecimal.equals` and scale, self-invocation bypassing Spring proxies, `CompletableFuture` on the common pool and `equals` without `hashCode` come from our own review experience.
