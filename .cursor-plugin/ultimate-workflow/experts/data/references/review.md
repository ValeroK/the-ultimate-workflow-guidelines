# Data and database review of a diff

## Purpose

Find the schema changes, queries, transactions and store usage in this change that block a busy table, grow with the data, break under concurrency or lose data. Written from database manuals and open-source skills compared on 2026-10-20 (see `NOTICE.md`); no text is copied.

## Scope

Report problems this change introduces or makes worse in migrations, models, queries, transactions, store configuration and the code that issues them. This is not a review of naming or normalisation.

- A problem that was already there and is untouched is out of scope, unless the change makes it reachable.
- Read the migration tool's config, the engine version, and the code that writes to the tables the change touches.
- If the plan has an "Expert input" section, check the diff against what you required there.
- Table sizes and live query plans are things you usually cannot see: say what evidence you used, or that there was none.

## Method

1. Find the engine and version, the migration tool and how it runs files, and how this repository already writes migrations and queries.
2. Compare the change against that: a statement form the repository avoids elsewhere, a query pattern that differs from its neighbours.
3. For each statement and query, trace what it does on the version the repository runs, to the table it touches and the code paths that write to that table.

Stop a trace when the table is small or new by the repository's own evidence, or when the outcome depends on a size or plan you cannot see: then it is a suspicion. Stop the review when every changed migration, query and transaction has been traced.

Every finding states the statement, the table, the evidence for its size or write rate, and the wrong outcome.

## Categories

Check what the change touches and skip the rest.

- **A schema change that locks or rewrites a busy table.** An index built without the concurrent form, a constraint added and validated in one step, a type change or default that rewrites on the version in use, several statements in one transaction holding the first lock to the end, no lock timeout. Not when the table is created in the same migration, is small by the repository's evidence, or the plan states a maintenance window.
- **A migration tool that cannot run what the file asks.** A concurrent index build in a file the tool wraps in a transaction, so it fails at deploy, or a failed concurrent build left invalid with nothing to drop or retry it. Not when the tool's config runs that file outside a transaction.
- **A migration file edited after it shipped.** An applied migration changed instead of a new one added. Not when the migration has never left the branch.
- **A backfill as one statement.** A single UPDATE or DELETE over a large table, or a data migration in the same transaction as the schema change. Not when the table is small, or the plan accepts the lock for a stated window.
- **An index the new query or constraint needs.** A new foreign key with no index on the referencing column, a new filter or row-level policy column with no index, a composite index the query does not lead with, a function applied to an indexed column. Not when the table is small or the query runs off the request path, and not for an index added "just in case".
- **A query that grows with the table.** N+1 in a loop or a lazy relation on a list path, offset pagination on a growing table, a list with no limit, a bulk update or delete with no filter. Not when the collection has a small fixed bound the code shows, or the ORM batches the relation.
- **A transaction that is wrong under concurrency.** Read then write with no lock, version check or conditional write (a lost update); locks taken in a different order on two paths; a serialization failure or deadlock with no whole-transaction retry. Not when a unique constraint or conditional write makes the second writer fail safely and the error is handled.
- **A transaction held open.** A network call, a model call or a user wait inside a transaction or a row lock. Not when the outside call is an insert into the same database, as in an outbox.
- **A constraint that does not hold.** A unique constraint on a nullable column meant to be unique, a check that passes on null, an upsert whose conflict target no unique index matches, DynamoDB uniqueness on a non-key attribute with no sentinel item. Not when the duplicate case is impossible by the code's own path.
- **A type that loses data.** A timestamp without time zone for instants, floating point for money, a 32-bit key on a table that will outgrow it. Not when the column holds a local wall-clock time or a bounded count.
- **DynamoDB writes that are not what they look like.** A batch call that ignores unprocessed items, a mutable index key on a hot item, a TTL attribute in the wrong unit or type, a hot partition key. Not when the write volume is low and the plan accepts it.
- **A vector query that silently returns fewer rows.** A filtered approximate search with no prefilter or iterative scan, a query operator that does not match the index's operator class, a query vector of another type or dimension than the column. Not when the filter matches most of the table, or the code checks the row count.
- **A store used for a guarantee it does not give.** Redis Pub/Sub for messages that must not be lost, a Redis lock released without comparing its token, a scan of every key on a production path, an eviction policy that can evict queue or lock keys. Not when the loss is acceptable and the plan says so.

## Severity here

- **high**: a change that blocks writes to a table on a user path for longer than the request timeout, loses or corrupts data, or lets two writers both succeed where one must fail.
- **medium**: the harm needs a condition, such as a large table, a burst, a long transaction already running, or a failover.
- **low**: extra reads or capacity with a small, stated bound.

## Do not report

- Naming, normalisation or schema style preferences.
- A missing index on a small table, or tuning with no evidence the path is hot.
- Where state should live, or a new store (owner: architect).
- The order a migration runs in the pipeline (owner: devops).
- Anything the plan states and the diff honours.

## One finding, and one candidate dropped

- Reported: `db/migrations/0042_gate_entries_badge_idx.sql:3` creates an index on `gate_entries (badge_id)` without the concurrent form. `db/seeds/README.md:12` puts `gate_entries` at about 60 million rows, and `services/gates/ingest.py:58` inserts into it on every badge scan. The build blocks those inserts for its full duration, so scans at the gates fail or time out during the deploy. Category: a schema change that locks a busy table; severity high. Fix: build it concurrently in a migration of its own, marked non-transactional for the repository's runner (`db/migrate.toml` wraps files in a transaction by default), under a lock timeout, and check the index is valid after.
- Dropped: `db/migrations/0044_badge_audit.sql:2` creates `badge_audit` and an index on it in the same file. The table is new and empty, so the index build blocks nothing.
