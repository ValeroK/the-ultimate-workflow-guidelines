---
name: test-craft
description: Use when writing any test, for what makes one able to fail, its expected value, its doubles, its determinism and its shape.
---

# Test craft

Use this whenever a test is written or a test case is specified, in any language. It holds what makes a single test worth having. Framework details (pytest, Jest, JUnit, Playwright) are not here. The confirmed test plan decides which cases exist; this decides how each one is written.

## 1. A test that can fail

1. **Name the break first.** Before writing the test, say which change to the production code would make it fail: a flipped comparison, an off-by-one, a missing check, the old behaviour. If you cannot name one, the test proves nothing.
2. **Watch it fail, on its assertion.** Run it before the code exists, or against the old code. The failure must be the assertion you wrote, with the message you expect. An import error, a typo, a missing fixture or an unset environment variable is not red: fix the test and run it again.
3. **A test that passes on its first run is suspect.** It is testing behaviour that already exists, or nothing at all. Find out which before moving on.
4. **For a bug fix, three runs.** It fails on the broken code, it passes after the fix, and the failure on the broken code is the bug itself, not a setup problem.
5. **Once the code exists, break it once.** Make one small change that matters (a boundary, a rounding, a sign), check that some test goes red, and put the code back. If nothing goes red, a case is missing.
6. **A check that cannot run must fail, not skip.** A test that finds no input files, no rows or no cases passes while proving nothing. Assert that the thing being checked was there.
7. **Fix the code, not the test.** Changing an expected value, loosening an assertion or skipping a test to get green is not a fix. When the test itself is wrong, say so and say why.

## 2. The expected value

1. **Write it as a literal.** "Given 1250.00 at 18.5 percent, returns 231.25", not "calculates the tax". Work it out by hand, or take it from the spec or a known example.
2. **Do not compute it the way the code does.** `expect(add(a, b)).toBe(a + b)` repeats the implementation and passes whatever it does. The same goes for an expected value built by calling the helper under test.
3. **Assert the outcome, not the absence of a crash.** "Does not throw", "is not null", "returns 200" and "has three keys" pass for most wrong answers. Assert the value, or the field that matters.
4. **Never assert what you told a double to return.** If the stub returns 42 and the test checks for 42, the code under test was never needed.
5. **Look through the front door.** Check the result where a caller would see it, through the public interface. Reading private fields, or querying the database behind an API you are testing, ties the test to the inside.
6. **State over interaction.** Assert what changed, not which internal methods were called. A refactor that keeps the behaviour must keep the test green; if it would not, the test is checking the implementation.
7. **Interaction is the outcome only at a boundary.** "The charge was sent exactly once", "the retry did not send the email twice" and "the audit event was written before the reply" are behaviour. There a call count or call order is the right assertion. On your own collaborators it is not.
8. **Exact output is fine when exact output is the contract**: a wire format, a file format, a generated prompt. Then a golden file or snapshot is the right check, and a change to it is reviewed like code. A snapshot nobody reads is not a test.

## 3. Doubles

1. **Prefer the real thing.** In order: the real implementation, a fake (an in-memory store, a local server, an emulator), a stub, a mock. Move down the list only when the one above is slow, not deterministic, or has an effect you cannot allow (money, email, a third-party call).
2. **Replace only the edge.** The network, the clock, randomness, the file system and third-party services are boundaries. Your own modules are not. Never replace the unit under test, and never replace so much that the test checks only how the mocks are wired.
3. **Know what you are replacing.** Before stubbing a dependency, find out what it does besides returning a value (writes, caches, retries, raises). A stub that drops a side effect the code relies on lets a broken caller pass.
4. **A double has the real shape.** It returns every field the real response has, including the ones this test does not read, with types the real one uses. Build doubles from one factory with sensible defaults so a new field is added once.
5. **Nothing in production exists only for tests.** No `resetForTesting`, no test flag, no export used only by a test. Use a fresh instance per test, or pass the dependency in.
6. **"I have to mock everything" is a design signal.** When a unit cannot be tested without replacing most of its collaborators, say so in your summary. Do not paper over it with more mocks, and do not redesign the code beyond what the plan asks.

## 4. Determinism

1. **Control time.** Pass in or freeze the clock. No test reads the current date and asserts against another current-date read. Cover the edges the plan names: month ends, time zones, a daylight-saving change.
2. **Control randomness.** Seed every generator, including fake-data libraries, and print the seed when a test fails so the run can be repeated.
3. **Wait on a condition, never on a duration.** A fixed sleep is too short on a slow machine and wastes time on a fast one. Wait for the event, the state or the message, with a timeout that fails the test.
4. **Each test builds its own world.** No test relies on another test's leftovers or on the order tests run in. A test that passes alone and fails in the suite, or the other way round, has shared state. Prefer a fresh instance to a reset hook.
5. **No live network in a unit test.** A call to a real service makes the test slow and its result depend on someone else's uptime. Use the boundary double, or move the case to an integration test that says it needs the network.
6. **Order that is not promised is not asserted.** Results from a set, a hash map, a concurrent job or a database query without `ORDER BY` come back in any order. Sort them, or compare as a set.
7. **Same input, same output.** For code that serialises, hashes or builds keys, one cheap check is running it twice on the same input and comparing.

## 5. Shape

1. **One behaviour per test.** Several assertions are fine when they describe one behaviour. If the name needs "and", split it.
2. **The name states the behaviour.** "rejects a refund larger than the original charge", not "test refund 3" or "works".
3. **Arrange, act, assert.** Setup, then one action, then the checks. A second action usually means a second test.
4. **Readable on its own.** A reader understands the test without opening three helpers. Repetition between tests is acceptable; hiding the inputs that matter inside shared setup is not.
5. **Small setup.** Build only what this behaviour needs. A huge setup is a sign the unit does too much: report it, do not grow the fixture.
6. **The lowest level that shows it.** A unit test for logic, an integration test for a boundary, an end-to-end test only for a path no lower test can show.
7. **Extend the table.** When the suite already has a table of inputs and outputs for this function, add a row instead of a near-copy of a test.
8. **One case at a time.** The plan fixes which cases exist. Still take them red to green one by one, so each failure is seen on its own.

## 6. Do not

- Test the framework, the language or a third-party library instead of your code.
- Repeat a shared helper's tests in every caller.
- Grep the source code, an import list or a log string unless that text is the declared contract.
- Put real secrets, tokens or production records in fixtures. Use fake values of the same shape and length.
- Leave a test skipped, disabled or marked as expected to fail without a reason and a reference to who will restore it.
- Add a coverage target, or a test that exists only to raise one.
