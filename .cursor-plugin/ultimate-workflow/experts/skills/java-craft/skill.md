---
name: java-craft
description: Use when a change touches Java files or Java build files - equality and nulls, exceptions and interruption, money and dates, concurrency, Spring proxies, transactions and async executors, and a published library's binary compatibility.
verified: 2026-10-20
requires: Java 8+ (java.time); Spring Framework and Spring Boot where used (Boot's executor defaults differ with virtual threads)
---

# Java craft

## Goal

- **Lets the expert catch:** Java and Spring behaviour that compiles, passes small tests and fails in production: boxed equality outside the cache, a swallowed interruption, `BigDecimal` scale, a shared formatter, a transaction or `@Async` that never applies, an unbounded executor queue, and a library change that breaks callers at link time.
- **Applies to:** `.java` files, `pom.xml`, `build.gradle`, `build.gradle.kts`.
- **Not for:** checks true in every language (`failure-handling`, `engineering-principles`, the review reference); deserialisation, XXE, command and SQL injection (security); N+1 queries, fetch strategy and paging (data and performance experts, planned; softarch for API shape); `@SpringBootTest` against slice tests (quality).

Sources: **[D]** SpotBugs `messages.xml` and Error Prone bug-pattern documentation as published in their repositories, and the Java Language Specification (2026-10-20); **[R]** the maintainer's live check (spotbugs.readthedocs.io, errorprone.info, docs.spring.io, JLS 21, the japicmp site; 2026-10-20); **[T]** an upstream community skill, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **What the tooling enforces.** Read `pom.xml` or `build.gradle(.kts)` for Checkstyle, SpotBugs, Error Prone or PMD, and CI. A problem an enabled check catches is not a finding. The checks below name the detector, so you can tell.
- **The versions:** Java (for `java.time`, virtual threads), Spring Framework and Spring Boot, and whether `spring.threads.virtual.enabled` is set.
- **Proxy or AspectJ mode** for Spring's `@EnableTransactionManagement`, `@EnableAsync`, `@EnableCaching` (default: proxy).
- **Whether the jar is published:** a `distributionManagement` or publishing block, a Maven coordinate other repositories use. The binary-compatibility section applies only then.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Equality, nulls and exceptions

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `==` on boxed numbers is true only inside the `Integer` cache (-128 to 127), so tests with small ids pass and production fails (SpotBugs `RC_REF_COMPARISON`; Error Prone `BoxedPrimitiveEquality`, `ReferenceEquality`) [R][D] | `==` or `!=` between `Integer`, `Long` or other boxed values | Those detectors are enabled |
| Strings compared with `==` (SpotBugs `ES_COMPARING_STRINGS_WITH_EQ`) [D] | `==` between `String` values | |
| `equals` overridden without `hashCode` breaks hash sets and map keys (SpotBugs `HE_EQUALS_NO_HASHCODE`) [D] | A class gaining `equals` only | A record |
| Unboxing a `null` throws (`int n = map.get(k)`) [T] | A boxed map value or nullable getter assigned to a primitive | |
| `Optional.get()` without a presence check [T] | `.get()` on an `Optional` with no `isPresent` | `orElseThrow` with a meaningful exception |
| A caught `InterruptedException` must restore the flag (`Thread.currentThread().interrupt()`) or rethrow; Error Prone `InterruptedExceptionSwallowed` (WARNING, on by default) flags `catch (Exception)` or `Throwable` around code that throws it [R] | A broad catch around `sleep`, `join`, `Future.get` or a blocking queue, with no `interrupt()` | Top of a thread's `run()` that is exiting anyway |
| A `return` or `throw` in `finally` discards the try or catch outcome (Error Prone `Finally`), and a throwing `close()` in `finally` masks the original exception; use try-with-resources [R] | Control flow or an unguarded `close()` inside `finally` | |
| An ignored returned `Future` (Error Prone `FutureReturnValueIgnored`) [D] | `executor.submit(...)` with the result discarded where failure matters | |

## Money, dates and strings

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `double` for money, and `new BigDecimal(0.1)` captures the binary error (SpotBugs `DMI_BIGDECIMAL_CONSTRUCTED_FROM_DOUBLE`) [D] | A money amount in `double`, or `BigDecimal` built from a `double` literal | `BigDecimal` from a string, or integer minor units |
| `BigDecimal.equals` compares scale (`2.0` is not equal to `2.00`); use `compareTo` [T] | `equals` between amounts that may have different scales | |
| A static or shared `SimpleDateFormat` is not thread-safe (SpotBugs `STCAL_STATIC_SIMPLE_DATE_FORMAT_INSTANCE`) [D] | A `static` `SimpleDateFormat` field | `DateTimeFormatter` |
| `String.split(".")` and `split("\|")` take a regular expression, so `.` matches every character (SpotBugs `RE_POSSIBLE_UNINTENDED_PATTERN`) [R] | `split(".")` or `split("\|")` | `Pattern.quote` |

## Concurrency

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A Spring `@Service` or `@Component` is a singleton by default, so a mutable field is shared by every request [T] | A non-final instance field written in a request path of a bean | A `@Scope("prototype")` or request-scoped bean |
| A `HashMap` written from several threads corrupts; use `ConcurrentHashMap` [T] | A shared `HashMap` written from an executor, a parallel stream or a bean method | |
| Double-checked locking needs a `volatile` field (SpotBugs `DC_DOUBLECHECK`) [R] | Lazy initialisation with two null checks on a non-`volatile` field | The field is `volatile` (Java 5+) [R] |
| `CompletableFuture.supplyAsync` without an executor runs on the shared common pool, where blocking I/O starves every other user [O] | `supplyAsync` or `runAsync` with no executor around a blocking call | CPU-only work |
| A blocking call on a reactive or event-loop thread (Reactor, Mutiny, Vert.x) stalls every request on it [T] | JDBC, `Thread.sleep` or a blocking client inside a reactive chain with no `publishOn` or worker offload | |
| Parallel streams with side effects on shared state race [T] | `.parallelStream().forEach(...)` writing a shared collection | |

## Spring proxies, transactions and async

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| In proxy mode (the default), only calls coming in through the proxy are intercepted, so a call from another method of the same bean bypasses `@Transactional`, `@Async` and `@Cacheable` [R] | `this.method()` or an unqualified call to an annotated method of the same class, or an annotated `private` method | AspectJ mode [R] |
| `@Transactional` rolls back on unchecked exceptions and `Error` only, not on checked exceptions, unless `rollbackFor` is set [R] | A `@Transactional` method that throws a checked exception it expects to roll back | A checked exception that is meant to commit |
| A `void` `@Async` method cannot pass an exception to its caller; by default it is only logged [R] | A caller wrapping a `void @Async` call in try/catch, expecting the error | An `AsyncUncaughtExceptionHandler` that reports it, or a `CompletableFuture` return |
| Spring Boot auto-configures a `ThreadPoolTaskExecutor` for `@Async`, or a `SimpleAsyncTaskExecutor` when virtual threads are enabled, and plain Spring falls back to a new thread per task [R]; its queue is unbounded unless `spring.task.execution.pool.queue-capacity` is set (from the checker's notes, not a quote) [T] | `@EnableAsync` on a path an external client drives, with no `queue-capacity` or `max-size`, or plain Spring with no `TaskExecutor` bean | Virtual threads enabled, where per-task threads are cheap [R] |
| An entity returned from a controller exposes every field, can lazy-load outside the transaction and ties the API to the schema [T] | A `@RestController` method returning an `@Entity` | |
| Field injection (`@Autowired` on a field) where the repository uses constructors elsewhere [T] | A new `@Autowired` field in a codebase that injects through constructors | A repository that uses field injection throughout |

## Binary compatibility of a published library

Only when the jar is published (see First, establish the target). japicmp and revapi report binary and source incompatibility against a baseline [R].

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A changed return type is binary-incompatible (`NoSuchMethodError` in callers compiled against the old one) [R] | A public method's return type changed | A covariant override, which gets a bridge method [R] |
| A changed parameter type is a removed method plus a new one [R] | A public method's parameter type changed | `T[]` to `T...`, or a bound change with the same erasure [R] |
| Removing or narrowing a public member is binary-incompatible [R] | A public method or field removed, or made less visible | A superclass still declares the same member [R] |
| An abstract method added to an interface breaks implementers' source (binary-compatible); a default method does not, but can still collide (`IncompatibleClassChangeError`) [R] | A method added to a published interface | |
| Compile-time constants are inlined into callers, so changing one does not reach them until they recompile [R] | A `public static final` primitive or `String` constant changed | A constant initialised by a non-constant expression [R] |
| Making a class `abstract` or `final`, or a field `static` or not, is binary-incompatible [R] | Those modifiers changed on a public type or field | |

## Not a finding

- Formatting, import order and naming where Checkstyle or a formatter runs.
- `var`, Lombok, streams against loops, records against classes, unless the repository's convention says otherwise.
- String concatenation in a loop that runs a handful of times.
- `java.util.Date` in code that already uses it consistently.
