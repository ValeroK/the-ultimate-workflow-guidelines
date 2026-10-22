# Data and database cases for a test plan

**Outcome of this stage:** every lock, backfill, constraint and concurrency rule the plan required has a test that fails if it is not met, run against the engine and version the repository uses, not a substitute that behaves differently.

## Where to start

Your own constraints in the plan's "Expert input" section, then the draft tests, the migrations and the queries they run against. You name the case and what it asserts; the oracle and determinism of each case are the quality engineer's.

## Families of cases

Only for what the change touches.

- **Concurrent writers.** Two transactions on the same row at once; assert one fails safely or both results are correct, never a silent lost update.
- **Retry on serialization failure or deadlock.** Force the conflict; assert the whole transaction is retried and the result is applied once.
- **Constraints that must hold.** A duplicate, a null in a column meant to be unique, an upsert on the intended conflict target; assert the database refuses or merges as planned.
- **Migration on realistic data.** The migration run against a table seeded at the size or shape the plan states, and its rollback; assert it completes, under the planned lock timeout, and leaves valid indexes.
- **Backfill that resumes.** A backfill stopped partway and started again; assert no row is skipped or written twice.
- **Query bounds.** A list endpoint with more rows than its page size; assert the limit, and the query count does not grow with the rows (no N+1).
- **Store-specific behaviour.** For DynamoDB, a batch write with unprocessed items and a conditional write that must fail; for vector search, a filtered query that must still return enough rows.
- **The real engine.** Tests that depend on locks, isolation or constraint behaviour run against the engine and version in use, not an in-memory substitute.

## One worked case

- name: two check-ins do not double the count
- asserts: two transactions increment `events.checked_in` for the same event at the same time; the final value is the starting value plus 2.
- why: a read-then-write without a lock or an atomic update passes every single-request test and loses one increment here.

## Redundant here

A case the draft already has; a constraint the schema already declares and the ORM's own tests cover; a migration test for a table created in the same migration.
