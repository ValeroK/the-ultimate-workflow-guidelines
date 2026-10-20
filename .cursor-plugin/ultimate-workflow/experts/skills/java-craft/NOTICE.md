# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| spotbugs/spotbugs `messages.xml` and google/error-prone `docs/bugpattern` files, as published in their repositories; the Java Language Specification | Read 2026-10-20 | LGPL, Apache-2.0; specification | Detector names marked [D] |
| spotbugs.readthedocs.io bug descriptions; errorprone.info (`Finally`, `InterruptedExceptionSwallowed`); docs.spring.io (Framework transaction annotations, `EnableAsync`, Boot task execution); JLS 21 chapter 13; the japicmp site | Checked live by the maintainer, 2026-10-20 (developer round 2 and prompt 3b) | Project documentation and specification | Every fact marked [R] |
| affaan-m/ECC, `java-reviewer` agent and `java-coding-standards` skill | Read 2026-10-20 | MIT | `Optional.get()`, entities in responses, field injection, mutable singleton beans, blocking on reactive threads |
| trailofbits/skills, `sharp-edges` Java reference | Read 2026-10-20 | CC BY-SA 4.0 | Unboxing nulls, `HashMap` across threads, `BigDecimal` scale (ideas only; no text, so the share-alike terms do not apply) |

Our own review experience: `CompletableFuture` on the common pool, marked [O].

Left out, and why: checked exceptions wrapped without a cause and `catch (Exception)` returning a default (`failure-handling` holds them); removing from a collection while iterating and a mutating `@Query` without `@Modifying` (both fail on the first run); raw types (the compiler's lint); `java.util.Date` in new code (a preference); eager fetching, N+1 and unpaged lists (data, performance and softarch); deserialisation, XXE, command and SQL injection (security).
