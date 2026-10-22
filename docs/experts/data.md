# Data and database expert: sources, borders and status

The data and database expert owns what a statement or query does inside the database: the lock and rewrite each schema change causes, backfills, indexes and query shape, transactions under concurrency, the constraints the database enforces, DynamoDB key and index design, connection pooling, vector storage, and Redis used as a queue, lock or bus. It joins at plan, tests and review.

## Status

- **Built:** agent file (Goal, ten-area Responsibilities, How to judge), plan and review references, selection examples, `NOTICE.md`. Tools: read, search and the web (maintainer decision, 2026-10-21).
- **Skill (2026-10-22):** `erasure-and-retention` at plan and review, from fact-check block J (the privacy split, maintainer decision 2026-10-21).
- **Waiting:** block F (the data fact-check; three replies so far, all snippet only), which supersedes research prompt 6 and fact-check prompt 10 (`docs/research/fact-check-round-2-prompts.md`), sent 2026-10-20. Locks and rewrites change by engine version, and one upstream claim was already wrong against the PostgreSQL manual, so the references name no version-specific rule and no migration-tool flag until the reply. Skills drafted in the ledger: `postgres-schema-changes`, `queries-and-transactions`, `dynamodb-design`, `vector-storage`, possibly `orm-and-migration-tools` and `redis-as-a-store`; `mysql-schema-changes` only if a served repository uses MySQL.
- **Tests stage** added by the maintainer on 2026-10-21: database-specific cases (concurrent writers, retries, constraints, migrations on realistic data, resumable backfills, query bounds, the real engine); quality keeps the oracle.
- **Not measured.**

## Boundaries

| Concern | Owner |
|---|---|
| Statement locks and rewrites, backfills, queries and indexes, transactions, constraints and types, DynamoDB design, pools, vector storage, Redis as a store | data |
| Where state lives, old and new code sharing a schema during a rollout, tenant isolation, caching as a pattern, backups and recovery objectives | architect (its "Moving existing data" row now names data for statement locks) |
| Migration order in the pipeline, IaC that deletes a database | devops (its release row now names data for statement locks) |
| Two modules writing one table | softarch |
| The embedding model | genai |
| Injection, roles and grants | security |

Statement-level locking had no owner before this expert; it was the gap between the architect's compatibility rule and DevOps' migration order.

## Sources

Seventeen sources (49 files in 11 repositories); every item is in `docs/experts/ledgers/data.md` (160 items: 104 taken, 26 routed, 27 rejected, 3 missing). Eight files addressed instructions to an agent; they were noted and not followed.
