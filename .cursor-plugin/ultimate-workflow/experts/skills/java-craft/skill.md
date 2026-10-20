# Java craft

Use this when a change touches `.java` files. It holds only what is specific to Java and its common frameworks (Spring, JPA). Checks true in every language stay in the expert's checklist, `engineering-principles` and `failure-handling`.

## First, find out what the tooling already covers

Read `pom.xml` or `build.gradle(.kts)` for Checkstyle, SpotBugs, Error Prone or PMD, and the CI config. A problem an enabled check catches is not a review finding.

| Problem | Check that catches it, when enabled |
|---|---|
| Strings compared with `==` | SpotBugs `ES_COMPARING_STRINGS_WITH_EQ` |
| An exception that might be ignored | SpotBugs `DE_MIGHT_IGNORE` |
| A returned `Future` ignored | Error Prone `FutureReturnValueIgnored` |
| `catch` that only prints the stack trace | Error Prone `CatchAndPrintStackTrace` |
| Unused variables and parameters | Error Prone `UnusedVariable` |

## Traps a linter often misses

### Equality and nulls
- **`==` on objects and boxed numbers.** `Integer` values compare equal with `==` only inside the cached range (-128 to 127), so a test with small ids passes and production fails. Use `equals` or `Objects.equals`.
- **`equals` overridden without `hashCode`**, so the object misbehaves in hash sets and map keys.
- **Unboxing a `null`** (`int n = map.get(k)`) throws.
- **`Optional.get()`** without a presence check; use `orElseThrow` with a meaningful exception.

### Exceptions
- **`InterruptedException` caught and swallowed.** Restore the flag with `Thread.currentThread().interrupt()` or rethrow, or the thread can no longer be shut down.
- **A checked exception wrapped without its cause** (`new RuntimeException("failed")`).
- **`catch (Exception e)` returning a default**, which also swallows unrelated bugs.
- **`close()` in a `finally`** that throws and masks the original exception. Use try-with-resources.

### Money and time
- **`double` for money**, and `new BigDecimal(0.1)` (which captures the binary error). Use `BigDecimal` from a string or integer minor units.
- **`BigDecimal.equals`** compares scale (`2.0` is not equal to `2.00`); use `compareTo` for value equality.
- **`SimpleDateFormat` in a shared or static field** is not thread-safe; use `DateTimeFormatter`.
- **`java.util.Date` and the system default time zone** in new code instead of `java.time` with an explicit zone.

### Concurrency
- **Mutable fields in a singleton bean** (a Spring `@Service` or `@Component` is a singleton by default) are shared by every request.
- **`HashMap` written from several threads**; use `ConcurrentHashMap`.
- **`CompletableFuture.supplyAsync` without an executor** runs on the shared common pool, where blocking I/O starves every other user of it.
- **Removing from a collection while iterating it** outside the iterator throws `ConcurrentModificationException`.
- **Parallel streams with side effects** on shared state.

### Spring and JPA
- **`@Transactional` called from inside the same class** bypasses the proxy, so no transaction starts. The same applies to `@Async`, `@Cacheable` and other proxy-based annotations, and to annotated `private` methods.
- **An entity returned from a controller** exposes every field, can trigger lazy loading outside the transaction, and ties the API to the schema. Return a DTO or record.
- **`FetchType.EAGER` on a collection**, or a lazy collection walked in a loop: one query per row.
- **A list endpoint with no paging.**
- **A mutating `@Query`** without `@Modifying` and a transaction.
- **Field injection** (`@Autowired` on a field) where the repository uses constructor injection elsewhere: the class cannot be constructed in a test without the container.

### Other traps
- **`String.split(".")`** takes a regular expression; `.` matches everything. Use `Pattern.quote`.
- **Raw generic types** (`List` instead of `List<T>`).

### Security-relevant traps (raise them, name the domain as security)
- `ObjectInputStream.readObject` on untrusted data.
- XML parsers with default settings on untrusted input (external entities).
- `Runtime.exec` or `ProcessBuilder` with interpolated input.
- String-built SQL in `@Query(nativeQuery = true)`, `JdbcTemplate` or `EntityManager.createNativeQuery`.

## Not a finding

- Formatting, import order, naming style where Checkstyle or a formatter runs.
- `var`, Lombok, streams versus loops, records versus classes: preferences, unless the repository's convention says otherwise.
- `@SpringBootTest` versus slice tests: the quality expert's concern.
- String concatenation in a loop that runs a handful of times.
