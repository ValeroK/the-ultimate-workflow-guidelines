# Data and database input to a plan

**Outcome of this stage:** the plan says which engine and version it runs on, what lock each schema change takes on a table that takes writes, how existing rows are backfilled, which key or index serves each access pattern, and how two writers on one row are kept apart, so the build is held to it and the review can check it.

## Questions

Read the draft, then the migrations, models and queries it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **Engine and version,** and the migration tool, with whether it wraps each file in a transaction.
- **Locks.** For each schema change on a table that takes writes: the lock it takes, whether it rewrites the table, and the lock timeout it runs under.
- **Backfill.** How existing rows get the new value: batch size, pause between batches, what is watched (replication lag), and how a partial run resumes.
- **Access patterns** (DynamoDB). Each read the feature needs, the key or index that serves it, and why the partition key spreads writes.
- **Consistency per read.** Which reads must see their own write, and which may lag.
- **Concurrency.** Two writers on the same row: the isolation level, the lock or version check, and the retry on a serialization failure or deadlock.
- **Erasure and retention.** For new personal data: where it is deleted (the job, registry or data map that will list it), every copy the delete path must reach (replicas, caches, indexes, archives, topics, backups), and the retention period, which is the user's to set. With no deletion path in the repository, this is a question for the user.
- **Constraints the database enforces,** against those left to code, and why.
- **Vector storage** (with the Generative AI engineer): the column type and dimension, the operator class, and how filtered queries return enough rows.

## When the plan makes a one-way choice

For a partition key, a primary key type on a large table, or a secondary index that cannot be changed later, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "`gate_entries` (about 60 million rows, written on every scan) gets its new index built concurrently in its own non-transactional migration, under a 2-second lock timeout, and the deploy checks that the index is valid." It names the table, its size, the statement form, the timeout and the check.
- Rejected: "Use a better index strategy," or "consider partitioning," with no size or plan behind it.

## In this domain

- **constraints** name the table, statement, index, key or setting they bind.
- **questions** are the user's decisions: a maintenance window, a lock the plan cannot avoid, a one-way key design.
- Do not ask for normalisation, a new store, or tuning with no measured problem.
