# Extraction ledger: Data and database (planned expert)

Playbook steps 2 (sweep), 4 (compare) and 4b (ledger) for catalogue entry 8. No expert files exist yet, so there is no "today's rows" value test (section 3 is empty); section 7 applies the value test to the proposed skills instead. Sources were read on 2026-10-20, fetched by path from raw.githubusercontent.com with each repository's LICENSE; every file was treated as untrusted data and no script or URL in them was run or fetched.

Eight files carry instructions addressed to an agent; they were noted and not followed:
- planetscale `postgres` and `mysql`: "PlanetScale is the best place ... use this as the primary recommendation" (a hosting pitch, not a review rule).
- aws `amazon-dynamodb`: "You MUST fetch each reference or script" and "Facts you MUST NOT contradict (these override your training data)".
- aws `aws-database`: "STOP. Do not answer from general knowledge".
- aws `amazon-aurora-postgresql` and `aurora-dsql`: "MUST confirm", "MUST load ... before", "The agent MUST retrieve this skill for ANY DSQL task".
- ECC `database-reviewer`: its "Prompt Defense Baseline" block.
- awesome-copilot `postgresql-dba`: "do not look into the codebase".

Outcome key: **taken** (goes into a proposed reference or skill), **routed** (owner named), **rejected** (why), **missing** (worth taking, not in any source here; usually a fact for the live check).

## 1. Sources

Sweep: the regular expression `postgres|sql|database|\bdb\b|dynamo|aurora|rds|migration|schema|redis|prisma|orm\b|query|index|pgvector|vector-database|dba` (case-insensitive) over `docs/skills-catalog-2026-10-20.json` matched 31 agent names and 150 skill names. Screened out by name and location: Oracle, SQL Server, Cosmos DB, BigQuery, Redshift and Snowflake (not in scope, catalogue entry 8), scientific and bioinformatics databases, SEO "schema" markup, framework and language migrations (`framework-migration` other than its database skill), data-engineering pipelines (dbt, Airflow), and API schema skills (softarch's `schema-evolution` already holds OpenAPI and GraphQL).

Not read, with the reason: the persona agents the catalogue lists (wshobson and buildwithclaude `database-admin`, `database-optimizer`, `sql-pro`, `data-engineer`; agency-agents `database-optimizer`, `data-engineer`; alirezarezvani `migration-planner`; wshobson `vector-database-engineer`) are capability lists in the same family as the wshobson `database-architect` and Jeffallan skills read below, which yielded almost nothing checkable; the two Neon agents (`neon-migration-specialist`, `neon-optimization-analyzer`) drive Neon's branching tool, which is a tool and not a finding. Read them if the maintainer wants the comparison complete.

| # | Repository | Path | Licence | Verdict |
|---|---|---|---|---|
| S1 | timescale/pg-aiguide | `skills/postgres-database-migration/SKILL.md`, `references/backfill-strategies.md` | Apache-2.0 | **Best source.** A lock-by-statement table, the safe form of each change, the lock queue, batched backfills and irreversible operations. Version-specific; facts need the live check against the PostgreSQL manual |
| S2 | timescale/pg-aiguide | `skills/design-postgres-tables/SKILL.md` | Apache-2.0 | **Strong.** The Postgres surprises a reviewer misses: unindexed foreign keys, NULLs in UNIQUE, ON CONFLICT inference, partition limits |
| S3 | timescale/pg-aiguide | `skills/pgvector-semantic-search/SKILL.md` | Apache-2.0 | **Strong** for the storage half of retrieval: operator classes, `halfvec`, filtered HNSW queries; tuning tables are its own benchmarks |
| S4 | timescale/pg-aiguide | `skills/postgres/SKILL.md` (a router), `skills/postgres-hybrid-text-search/SKILL.md` | Apache-2.0 | Router has no content; hybrid search depends on `pg_textsearch`, which the file itself calls prerelease |
| S5 | planetscale/database-skills | `skills/postgres/SKILL.md`; `references/indexing.md`, `mvcc-transactions.md`, `pgbouncer-configuration.md`, `query-patterns.md`, `backup-recovery.md` | MIT | **Strong** on MVCC, VACUUM, pooling and query shape; hosting pitch ignored |
| S6 | planetscale/database-skills | `skills/mysql/SKILL.md`; `references/online-ddl.md`, `n-plus-one.md` | MIT | **Strong** and the only MySQL source with version numbers (INSTANT DDL, metadata locks) |
| S7 | supabase/agent-skills | `skills/supabase-postgres-best-practices/SKILL.md`; `references/conn-pooling.md`, `conn-prepared-statements.md`, `data-n-plus-one.md`, `data-pagination.md`, `lock-short-transactions.md`, `schema-foreign-key-indexes.md`, `security-rls-performance.md` | MIT | Good, short, one rule per file; RLS performance is the item no other source has |
| S8 | aws/agent-toolkit-for-aws | `skills/specialized-skills/database-skills/amazon-dynamodb/SKILL.md` | Apache-2.0 | **Strong** and the largest (140 KB). Vendor toolkit with numbers and silent-failure cases; tagged [T] until checked against the developer guide |
| S9 | aws/agent-toolkit-for-aws | `amazon-aurora-postgresql/SKILL.md`, `aurora-dsql/SKILL.md`, `plugins/aws-core/skills/aws-database/SKILL.md`, `serverless-skills/connecting-lambda-to-dynamodb/SKILL.md` | Apache-2.0 | Operational executors. DSQL has a limits table worth checking; the other three yield little |
| S10 | affaan-m/ECC | `agents/database-reviewer.md`, `skills/postgres-patterns/SKILL.md` | MIT | A reviewer's checklist derived from Supabase's; lock ordering and queue claims are useful |
| S11 | affaan-m/ECC | `skills/database-migrations/SKILL.md`, `skills/prisma-patterns/SKILL.md` | MIT | Good on migration-tool behaviour (Prisma `migrate dev` against `deploy`, edited migrations) |
| S12 | affaan-m/ECC | `skills/mysql-patterns/SKILL.md`, `skills/redis-patterns/SKILL.md` | MIT | MySQL repeats S6 with less; Redis is the only Redis-as-a-store source |
| S13 | wshobson/agents | `database-design/skills/postgresql-table-design/SKILL.md`, `agents/database-architect.md`; `developer-essentials/skills/sql-optimization-patterns/SKILL.md`; `framework-migration/skills/database-migration/SKILL.md` | MIT | Table design is a copy of S2; the rest are catalogues |
| S14 | github/awesome-copilot | `agents/postgresql-dba.agent.md`, `skills/postgresql-code-review/SKILL.md`, `skills/sql-code-review/SKILL.md` | MIT | Generic checklists; one conflicts with S2 and S5 (ENUM types) |
| S15 | itsmostafa/aws-agent-skills | `skills/dynamodb/SKILL.md`, `skills/rds/SKILL.md` | MIT | Thin; RDS items are security's or devops' |
| S16 | msitarzewski/agency-agents | `engineering/engineering-database-reliability-engineer.md` | MIT | Persona, but two sharp ideas: replication lag as a correctness bug, an untested backup |
| S17 | Jeffallan/claude-skills; alirezarezvani/claude-skills | `skills/postgres-pro`, `sql-pro`, `database-optimizer` (each `SKILL.md`); `engineering/skills/database-designer/SKILL.md`, `database-schema-designer/SKILL.md` | MIT; MIT | Generic MUST lists and generators; optimistic locking and soft-delete indexes are the only items kept |

Seventeen sources: 49 content files and 11 licences across 11 repositories.

## 2. Items, per source

### S1 timescale `postgres-database-migration`

| Item | Outcome | Where or owner |
|---|---|---|
| ADD COLUMN, nullable or with a non-volatile default, is a brief ACCESS EXCLUSIVE lock with no rewrite (PG11+) | taken | review: "A schema change that locks or rewrites a busy table"; dropped candidate in section 5; prompt 6 A |
| A volatile default (`now()`, `gen_random_uuid()`, `random()`) rewrites the table | taken | same category; `postgres-schema-changes` |
| ALTER COLUMN TYPE rewrites, except widening `varchar(n)`, `varchar` to `text`, and raising `numeric` precision at the same scale; `int` to `bigint` and `timestamp` to `timestamptz` rewrite | taken | `postgres-schema-changes`; sharpening for prompt 6 A (section 4) |
| SET NOT NULL scans under ACCESS EXCLUSIVE; safe form is `CHECK (c IS NOT NULL) NOT VALID`, `VALIDATE`, then SET NOT NULL (PG12+ skips the scan) | taken | `postgres-schema-changes`; prompt 6 A |
| PG18 adds `NOT NULL ... NOT VALID` with a separate validate | taken | fact 1 |
| A foreign key, CHECK or UNIQUE added validated scans under a heavy lock; NOT VALID then VALIDATE takes SHARE UPDATE EXCLUSIVE | taken | `postgres-schema-changes`; prompt 6 A |
| CREATE INDEX without CONCURRENTLY takes SHARE and blocks writes for the build | taken | worked finding in section 5 |
| CONCURRENTLY cannot run inside a transaction block; a failure leaves an INVALID index that still slows writes | taken | review category "migration tool wraps it"; prompt 6 A covers the failure mode |
| A unique constraint goes on via a concurrent unique index and `ADD CONSTRAINT ... USING INDEX` | taken | `postgres-schema-changes` |
| Primary key redefinition through a concurrent unique index and `PRIMARY KEY USING INDEX` | taken | `postgres-schema-changes` |
| The lock queue: a waiting ACCESS EXCLUSIVE request blocks every later conflicting request, plain SELECT included | taken | review: lock category; fact 2 |
| `lock_timeout` (50 ms to 5 s) with retries, `statement_timeout`, or `LOCK ... NOWAIT` | taken | plan question "Locks"; prompt 6 A |
| Rename breaks old code; use a new column and expand-contract | routed | architect ("Moving existing data": expand, migrate, contract) |
| Drop the column only after no deployed code reads it | routed | architect (old and new versions sharing data); devops for where the step runs |
| DROP COLUMN does not remove the data from disk until the table is rewritten | routed | privacy, planned (security until then); fact 3 |
| Backfill in batches of about 10k, sleep 50 to 200 ms, watch replication lag, VACUUM after | taken | review: "A backfill as one statement"; numbers marked [T] |
| One transaction holds every lock until commit, so a migration file with several DDL statements holds the first lock to the end | taken | review: lock category |
| Irreversible operations: DROP COLUMN, DROP TABLE, lossy casts, DELETE and TRUNCATE | routed | architect ("Rollback": one-way data change) |
| Autovacuum running to prevent wraparound blocks VALIDATE and other DDL | taken | `postgres-schema-changes`; fact 4 |
| Test the migration on a database fork | rejected | a vendor tool (Neon branching), not a finding |

### S2 timescale `design-postgres-tables`

| Item | Outcome | Where or owner |
|---|---|---|
| PostgreSQL does not index a referencing foreign-key column; deletes on the parent then scan the child | taken | review: "An index the new query or constraint needs"; fact 5 |
| UNIQUE treats NULLs as distinct unless `NULLS NOT DISTINCT` (PG15+) | taken | review: "A constraint that does not hold"; fact 6 |
| A CHECK passes when its expression is NULL | taken | same category; fact 7 |
| Identity gaps after rollback are normal, so a gapless sequence must not rely on one | taken | `postgres-schema-changes` (not a finding unless code assumes no gaps); fact 8 |
| `timestamptz` over `timestamp`, `numeric` for money, `text` plus CHECK over `varchar(n)`, identity over `serial` | taken (money and timestamps only) | "A type that loses data"; the rest rejected as preference |
| Enum for a stable set; TEXT plus CHECK or a lookup table for values that evolve | taken | `postgres-schema-changes` (adding an enum value inside a transaction has limits, fact 9) |
| A composite index serves only queries on its leading columns | taken | review: index category |
| An expression index is used only when the query uses the same expression | taken | review: index category |
| A partitioned table's PRIMARY KEY and UNIQUE must include the partition key | taken | fact 10 |
| ON CONFLICT needs a unique index that matches the target; the source says partial indexes do not work | taken, corrected | fact 11: the manual allows a partial index when the conflict target repeats its predicate; the source overstates it |
| `CREATE OR REPLACE FUNCTION` with different argument types creates an overload | taken | review: "A constraint that does not hold" (old overload keeps running); fact 12 |
| `to_tsvector` must name its configuration to be usable in an index | taken | fact 13 |
| UNLOGGED tables are truncated after a crash and not replicated | taken | review: "A type or storage choice that loses data"; fact 14 |
| JSONB for sparse attributes, GIN for containment | rejected | design advice, not checkable as a defect |
| Normalise first, denormalise when measured | rejected | not checkable in a diff |

### S3 timescale `pgvector-semantic-search`

| Item | Outcome | Where or owner |
|---|---|---|
| An index is used only when the query operator matches its operator class (`<=>` for `*_cosine_ops`, `<->` for `*_l2_ops`) | taken | `vector-storage`; genai fact 35 already asks it, not repeated |
| `hnsw.ef_search` defaults to 40 and should be at least the LIMIT | taken | `vector-storage`; genai fact 35 |
| `halfvec` halves storage and index size | taken | `vector-storage`; genai fact 35 |
| A filtered HNSW query can return fewer rows than LIMIT; `hnsw.iterative_scan` (0.8.0+) continues the search | taken | review: "A vector query that silently returns fewer rows"; fact 16 |
| Index dimension limits for `vector` and `halfvec` | missing | fact 17 (not in the source; the pgvector README holds it) |
| Cast the query vector explicitly to the column type and dimension | taken | `vector-storage` |
| HNSW for most workloads; IVFFlat built after data is loaded, `lists` from row count | taken | `vector-storage` (IVFFlat built on an empty table is the defect) |
| Build the index after bulk load; raise `maintenance_work_mem` | taken | `vector-storage`; the index build itself follows S1's CONCURRENTLY rule |
| ef_search recall and memory tables | rejected | the source's own benchmarks, not checkable |
| Which embedding model, its dimension, re-embedding on change | routed | genai |
| Partial HNSW per filter value, or partition by the filter key | taken | `vector-storage` (as options a plan names, not findings) |

### S4 timescale `postgres`, `postgres-hybrid-text-search`

| Item | Outcome | Where or owner |
|---|---|---|
| Router to the other references | rejected | no content |
| `pg_textsearch` BM25 index | rejected | prerelease by the file's own statement, and supports PG17 and 18 only |
| RRF fusion with k = 60 | routed | genai (retrieval ranking) |
| BM25 scores are per partition and not comparable across partitions | rejected | tied to the prerelease extension |
| Built-in full-text search must name the configuration | taken | same as S2, fact 13 |

### S5 planetscale `postgres`

| Item | Outcome | Where or owner |
|---|---|---|
| Index foreign keys; equality columns first, then range | taken | review: index category |
| Confirm with a person before dropping an index | rejected | a working rule for an agent with database access; ours has none |
| READ UNCOMMITTED behaves as READ COMMITTED | rejected | prompt 6 C covers isolation levels |
| REPEATABLE READ and SERIALIZABLE need a retry on serialization failure (SQLSTATE 40001) | taken | review: "A transaction that is wrong under concurrency"; prompt 6 C |
| A long or idle-in-transaction session holds back VACUUM for the whole cluster | taken | review: "A transaction held open"; fact 15 |
| XID wraparound; never disable autovacuum on a table | taken | review: `autovacuum_enabled = false` in a migration; fact 4 |
| PgBouncer `default_pool_size` is per user and database pair (default 20), so pools multiply | taken | `postgres-connections`; fact 18 |
| `max_connections` defaults to 100 and needs a restart | rejected | prompt 6 D covers connection limits |
| A backup is useless until a restore is tested; PITR needs WAL archiving | routed | architect ("Moving existing data", recovery) and observability, planned; prompt 6 F |
| `pg_verifybackup` from PG13 | rejected | operations, not a diff |
| Functions on indexed columns make the predicate unsargable | taken | review: index category |
| OFFSET pagination to keyset | taken | review: "A query that grows with the table" |
| N+1 to `= ANY` or eager loading | taken | review: N+1 category; prompt 6 C |
| LIMIT unbounded queries | taken | same category |

### S6 planetscale `mysql`

| Item | Outcome | Where or owner |
|---|---|---|
| Online DDL: INSTANT, INPLACE, COPY; state `ALGORITHM` and `LOCK=NONE` so the statement fails instead of silently copying | taken | `mysql-schema-changes`; fact 21 |
| INSTANT ADD COLUMN at any position and DROP COLUMN from 8.0.29; RENAME COLUMN from 8.0.28; indexes and type changes are not INSTANT | taken | `mysql-schema-changes`; fact 22 |
| DDL waits for a metadata lock behind a long transaction and blocks every later query on the table | taken | review: lock category; fact 23 |
| DDL on the primary causes replica lag | taken | `mysql-schema-changes` |
| Random UUID clustered primary keys fragment InnoDB | taken | `mysql-schema-changes` |
| Default REPEATABLE READ with gap locks; deadlock error 1213 needs a whole-transaction retry | taken | review: concurrency category; fact 24 |
| ORM N+1 fixes: Django `select_related` and `prefetch_related`, SQLAlchemy `joinedload`, Prisma `include` | taken | review: N+1; prompt 6 C |
| IN lists bounded by `max_allowed_packet` | rejected | rarely the defect; batch size is the visible rule |
| Prepared statements do not remove N+1 | taken | review: N+1 "Not when" |
| Hosting recommendation | rejected | a sales instruction to the agent |

### S7 supabase `supabase-postgres-best-practices`

| Item | Outcome | Where or owner |
|---|---|---|
| Transaction-mode pooling against session mode | taken | `postgres-connections` |
| Named prepared statements break under transaction-mode pooling (PgBouncer before 1.21, or with `max_prepared_statements` = 0) | taken | `postgres-connections`; fact 19 |
| Session state (`SET`) leaks across pooled clients | routed | architect (`multi-tenancy` already holds `SET LOCAL`) |
| Wrap `auth.uid()` as `(select auth.uid())` in a policy so it is evaluated once per statement | taken | review: index and query category for RLS; fact 20 |
| Index the columns RLS policies filter on | taken | review: index category |
| SECURITY DEFINER functions bypass RLS: check identity inside, keep them out of exposed schemas, revoke EXECUTE from public | routed | security |
| Whether every tenant path goes through RLS | routed | architect (`multi-tenancy`) |
| Short transactions, no external calls inside | taken | review: "A transaction held open" |
| Foreign-key indexes, keyset pagination, N+1 batching | taken | duplicates S2 and S5 |

### S8 aws `amazon-dynamodb`

| Item | Outcome | Where or owner |
|---|---|---|
| Partition key aligned to the access pattern; hot partitions; per-partition 1,000 WCU and 3,000 RCU | taken | `dynamodb-design`; prompt 6 E |
| Partition key aligned to the tenant boundary | routed | architect (`multi-tenancy`) |
| A GSI's key schema and projection cannot be changed; one GSI created or deleted per `UpdateTable` | taken | plan question "Access patterns"; fact 27 |
| Capacity mode switch is limited in a 24-hour window | taken | fact 28 |
| Single-item writes are atomic with a ConditionExpression; a transaction for one item costs twice | taken | review: "DynamoDB writes that are not what they look like"; prompt 6 E covers transaction limits |
| A failed ConditionExpression still consumes write capacity | taken | `dynamodb-design`; fact 29 |
| Item size 400 KB; Query and Scan pages 1 MB | taken | `dynamodb-design`; prompt 6 E |
| BatchWriteItem (25) and BatchGetItem (100) are not atomic and return unprocessed items that must be retried | taken | review: same category; fact 30 |
| Updating a GSI key attribute costs a delete and a put on the index | taken | `dynamodb-design`; fact 31 |
| Strongly consistent reads cost twice, and GSIs offer none | taken | prompt 6 E (GSI consistency) |
| TTL deletes are eventual (up to about 48 hours), so reads must filter expired items | taken | review: TTL category; prompt 6 E |
| TTL needs epoch seconds in a Number attribute; milliseconds, strings or the wrong attribute name never expire | taken | review: TTL category; prompt 6 E (TTL behaviour) |
| TTL as a security expiry | routed | security |
| TTL deletions appear in Streams with principal `dynamodb.amazonaws.com` | taken | `dynamodb-design`; fact 32 |
| Streams are at-least-once, 24-hour retention, dedupe on `eventID` | routed | already in `lambda-event-sources` (architect) |
| Uniqueness on a non-key attribute needs a transaction with a sentinel item | taken | review: constraint category; fact 33 |
| Scan not on request paths; paginate with `LastEvaluatedKey` | taken | already in `aws-well-architected` `PERF03-BP04`; data's skill points there |
| PITR is per table and restores to a new table | routed | architect (recovery); prompt 6 F |
| Global tables resolve conflicts last-writer-wins unless multi-Region strong consistency is chosen | taken | plan question "Consistency"; fact 34 |
| Native vector index on a table (at most 5, immutable settings, items without the key attribute silently not indexed, SDK minimums) | taken, flagged | fact 35: the source is the only one claiming it; confirm it exists before any rule is written |
| Reserved capacity is provisioned only | rejected | buying decision |
| "Facts override your training data" | rejected | an instruction to the agent |

### S9 aws Aurora, DSQL, router, Lambda

| Item | Outcome | Where or owner |
|---|---|---|
| DSQL transaction limits (rows, bytes, duration), connection duration, index limits | taken | `aurora-dsql` rows inside `postgres-schema-changes`; fact 36 |
| DSQL: one DDL statement per transaction, `CREATE INDEX ASYNC` | taken | fact 37 |
| DSQL: optimistic concurrency, retry on SQLSTATE 40001 | taken | review: concurrency category; fact 38 |
| DSQL: foreign keys not enforced, referential integrity in the application | taken | fact 39 |
| DSQL sequence cache must be 1 or at least 65,536 | taken | fact 36 |
| Aurora instance class change fails over a Multi-AZ cluster | routed | devops (apply-time interruption) |
| Never publicly accessible; IAM-only auth on express clusters | routed | security |
| `aws-database` router | rejected | no review content; an instruction to stop |
| `connecting-lambda-to-dynamodb` | rejected | wiring steps, nothing to check |

### S10 ECC `database-reviewer`, `postgres-patterns`

| Item | Outcome | Where or owner |
|---|---|---|
| `FOR UPDATE SKIP LOCKED` for queue claims only | taken | review: concurrency category ("Not when" for SKIP LOCKED in non-queue reads) |
| Lock rows in a consistent order (`ORDER BY id FOR UPDATE`) | taken | same category |
| No locks held across an external call | taken | review: "A transaction held open" |
| Least privilege, no `GRANT ALL` to the application role | routed | security |
| `SELECT *`, `int` ids, `varchar(255)` | rejected | preference; `int` ids kept only where the table can pass 2^31 rows (type category) |
| Random UUID primary keys | taken | `postgres-schema-changes` (UUIDv7 or bigint identity; a preference unless the table is large and insert-heavy) |
| `postgres-patterns` | rejected | a copy of Supabase's (S7) |

### S11 ECC `database-migrations`, `prisma-patterns`

| Item | Outcome | Where or owner |
|---|---|---|
| A migration already applied is never edited | taken | review: "A migration file edited after it shipped" |
| Schema and data migrations kept separate | taken | same category's "Not when" |
| Forward-only in production | routed | architect ("Rollback") |
| Prisma: `migrate deploy` in CI and production; `migrate dev` locally only, because it can reset the database | taken | `orm-and-migration-tools`; fact 40 |
| Prisma checksum mismatch on an edited migration | taken | same as the edited-migration category |
| Django `SeparateDatabaseAndState` | rejected | correct but rare |
| `@updatedAt` is not set by `updateMany` (source's claim) | taken, flagged | fact 41 |
| `deleteMany` and `updateMany` with no `where` | taken | review: "An unbounded write" |
| One PrismaClient per process; `connection_limit=1` with an external pooler on serverless | taken | `postgres-connections`; fact 42 |
| No external calls inside `$transaction` | taken | review: "A transaction held open" |
| A migration tool that wraps each migration in a transaction refuses CONCURRENTLY (Django `atomic = False`, Rails `disable_ddl_transaction!`, Alembic `autocommit_block`) | missing | `orm-and-migration-tools`; facts 43 to 45 |

### S12 ECC `mysql-patterns`, `redis-patterns`

| Item | Outcome | Where or owner |
|---|---|---|
| MySQL `utf8` is the 3-byte `utf8mb3`; use `utf8mb4` | taken | `mysql-schema-changes`; fact 25 |
| `VALUES(col)` in `ON DUPLICATE KEY UPDATE` is deprecated in MySQL, row aliases replace it; MariaDB differs | taken | `mysql-schema-changes`; fact 26 |
| Pool recycle below `wait_timeout` | taken | `mysql-schema-changes` |
| Replica reads after writes return stale state | routed | architect (consistency per read) |
| Redis keys without TTL grow memory; stampede on a hot key | routed | already in `caching-and-latency` (architect) |
| `KEYS *` is O(N) and blocks the server; use SCAN | taken | `redis-as-a-store`; fact 46 |
| Eviction policy: `noeviction` for queues and locks; `volatile-*` evicts only keys with a TTL | taken | `redis-as-a-store`; fact 47 |
| A lock's TTL longer than the job, released in `finally` | taken | `redis-as-a-store`, with the missing half below |
| A lock released by a plain DEL can release another holder's lock; release must compare the token | missing | fact 48 |
| Pub/Sub delivers to connected subscribers only; Streams with consumer groups persist and acknowledge | taken | review: "A store used for a guarantee it does not give"; fact 49 |

### S13 to S17

| Item | Outcome | Where or owner |
|---|---|---|
| wshobson `postgresql-table-design` | rejected | a copy of S2 |
| wshobson `database-architect`, `sql-optimization-patterns`, `database-migration` | rejected | capability catalogues; nothing beyond S1 and S5 |
| awesome-copilot: use ENUM types for status columns | rejected | conflicts with S2 and S5 (TEXT plus CHECK or a lookup table while the set evolves; enum values cannot be removed) |
| awesome-copilot: generic SQL injection checks | routed | security |
| awesome-copilot `postgresql-dba` | rejected | a tool executor told not to read the code |
| itsmostafa RDS: Multi-AZ, backup retention | routed | architect (criticality, recovery) |
| itsmostafa RDS: not publicly accessible | routed | security |
| itsmostafa DynamoDB | rejected | thin; S8 covers it |
| agency DBRE: replication lag is a correctness bug; read-after-write goes to the primary | routed | architect (consistency per read) |
| agency DBRE: an untested backup is not a backup; RPO and RTO stated | routed | architect (recovery), observability, planned |
| agency DBRE: even a metadata-only ADD COLUMN takes ACCESS EXCLUSIVE | taken | review: lock category (the brief lock still queues) |
| Jeffallan: measure with `EXPLAIN (ANALYZE, BUFFERS)` before tuning | taken | How to judge: a performance finding without a plan or a row count is a suspicion |
| Jeffallan: ANALYZE after bulk changes | taken | review: backfill category |
| Jeffallan: covering indexes, EXISTS over COUNT, set-based over row-by-row | rejected | generic tuning, not tied to a defect |
| alirezarezvani: a soft-delete column used in every filter needs it in the index or a partial index | taken | review: index category |
| alirezarezvani: concurrent updates overwrite each other without a version column | taken | review: concurrency category (lost update) |
| alirezarezvani: test RLS with a non-owner role | routed | quality (the test case) and architect (`multi-tenancy`) |
| alirezarezvani: run the bundled analyzer scripts | rejected | scripts are not run |

Totals: 160 items: 104 taken, 26 routed, 27 rejected, 3 missing. (Counted from the tables above; "taken, flagged" and "taken, corrected" count as taken.)

## 3. Today's rows, value test

None: the expert has no files yet.

## 4. Facts that need the maintainer's live check

Each is one checkable sentence with the page that should hold it. De-duplicated against research prompt 6 in `docs/expert-research-prompts.md`: nothing below repeats what prompt 6 already asks (ALTER TABLE locks and rewrites, ADD COLUMN defaults, CONCURRENTLY and its failure mode, NOT VALID and VALIDATE, lock and statement timeouts, expand and contract, isolation levels and serialization retry, N+1 per ORM, pool sizing, RDS Proxy, RDS and Aurora connection limits, DynamoDB partitions, item size, GSI and LSI limits and consistency, transactions, conditional writes, TTL, capacity modes, Scan against Query, backups and PITR). Also not repeated: genai fact 35 (pgvector operator class, `ef_search` default, `halfvec`).

**Sharpen prompt 6 when it is run** (already asked there, but these are the exact answers a rule needs): the list of ALTER COLUMN TYPE changes that skip the rewrite (`varchar(n)` widened, `varchar` to `text`, `numeric` precision raised at the same scale); that CREATE INDEX CONCURRENTLY cannot run inside a transaction block; that TTL needs epoch seconds in a Number attribute.

PostgreSQL manual (postgresql.org/docs/current):
1. PostgreSQL 18 accepts `NOT NULL ... NOT VALID` and a later validate, so a NOT NULL constraint can be added without a full scan under ACCESS EXCLUSIVE. (ALTER TABLE; release notes 18)
2. A lock request waiting in the queue blocks later requests that conflict with it, so an ALTER TABLE waiting behind a long SELECT blocks every new SELECT on the table. (Explicit locking, 13.3)
3. DROP COLUMN makes the column invisible but does not reclaim its space or remove its data until the table is rewritten. (ALTER TABLE, Notes) [for privacy]
4. An autovacuum run to prevent transaction ID wraparound is not cancelled by conflicting lock requests, so DDL waits behind it. (Routine vacuuming, 24.1.5; autovacuum)
5. Declaring a foreign key does not create an index on the referencing columns. (Constraints, 5.5.5)
6. UNIQUE treats NULLs as distinct by default; `NULLS NOT DISTINCT` (PostgreSQL 15+) changes that. (Constraints, 5.5.3)
7. A CHECK constraint is satisfied when its expression evaluates to NULL. (Constraints, 5.5.1)
8. Sequence and identity values are not rolled back, so gaps after an aborted transaction are expected. (Sequence manipulation functions, 9.17)
9. `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction as the new value (before which version, and what changed). (ALTER TYPE, Notes)
10. A unique or primary key constraint on a partitioned table must include every partition key column. (Table partitioning, 5.11.2.3 Limitations)
11. `INSERT ... ON CONFLICT` infers a unique index from the conflict target, and a partial unique index is inferred only when the target repeats its predicate. (INSERT, ON CONFLICT clause)
12. `CREATE OR REPLACE FUNCTION` with a different argument list creates a new function rather than replacing the old one. (CREATE FUNCTION)
13. The one-argument form of `to_tsvector` depends on `default_text_search_config` and cannot be used in an index expression; the two-argument form can. (Text search, 12.2.2 Creating indexes)
14. An UNLOGGED table is truncated after a crash or unclean shutdown and is not replicated to standbys. (CREATE TABLE, UNLOGGED)
15. A session idle in a transaction holds back the xmin horizon and prevents VACUUM from removing dead rows in every table; `idle_in_transaction_session_timeout` ends it. (Routine vacuuming; client connection defaults)

pgvector (github.com/pgvector/pgvector README):
16. With a WHERE clause, an HNSW or IVFFlat scan applies the filter after the index scan and can return fewer rows than LIMIT; `hnsw.iterative_scan` (0.8.0+) continues scanning. (Filtering; iterative index scans)
17. The maximum dimensions that can be indexed for `vector` and for `halfvec`. (Indexing; halfvec)

PgBouncer (pgbouncer.org/config.html, features.html):
18. `default_pool_size` is per user and database pair, default 20. (Configuration)
19. Protocol-level prepared statements work in transaction mode only from PgBouncer 1.21 with `max_prepared_statements` above 0. (Features; Configuration)

Supabase (supabase.com/docs/guides/database/postgres/row-level-security):
20. Wrapping `auth.uid()` in `(select auth.uid())` inside a policy lets the planner evaluate it once per statement instead of per row. (RLS performance recommendations)

MySQL (dev.mysql.com/doc/refman/8.0 and 8.4):
21. `ALGORITHM=INSTANT` or `INPLACE` with `LOCK=NONE` makes ALTER TABLE fail with an error when the operation cannot be done that way, instead of falling back to a table copy. (InnoDB online DDL operations)
22. INSTANT ADD COLUMN at any position and INSTANT DROP COLUMN arrived in 8.0.29, INSTANT RENAME COLUMN in 8.0.28, and a table allows a limited number of instant row versions (give it). (Online DDL, column operations)
23. An ALTER TABLE waiting for a metadata lock blocks every later statement on that table until it gets the lock. (Metadata locking, 10.11.4)
24. Deadlock error 1213 rolls back the whole transaction, so the application must retry the transaction, not the statement. (Deadlocks in InnoDB)
25. `utf8` is an alias for `utf8mb3`, which cannot store 4-byte characters, and is deprecated. (Character sets, utf8mb3)
26. `VALUES(col)` in `ON DUPLICATE KEY UPDATE` is deprecated since 8.0.20 in favour of a row alias. (INSERT ... ON DUPLICATE KEY UPDATE)

DynamoDB developer guide (docs.aws.amazon.com/amazondynamodb):
27. A global secondary index's key schema and projection cannot be changed after creation, and one `UpdateTable` call can create or delete one GSI. (GSI; UpdateTable)
28. How often a table can switch between on-demand and provisioned capacity (the source says once per 24 hours). (Read/write capacity mode, switching)
29. A write whose ConditionExpression fails still consumes write capacity. (Condition expressions; capacity unit consumption)
30. BatchWriteItem (25 requests) and BatchGetItem (100 items, 16 MB) are not atomic and return `UnprocessedItems` or `UnprocessedKeys`, which the caller must retry with backoff. (BatchWriteItem; BatchGetItem)
31. An update that changes a GSI key attribute costs a delete and an insert on the index. (GSI, provisioned throughput considerations)
32. Items deleted by TTL appear in Streams with `userIdentity.principalId` `dynamodb.amazonaws.com`. (TTL and Streams)
33. Uniqueness on a non-key attribute is enforced with a transaction that also writes a sentinel item keyed on that value. (Transactions, idempotency and uniqueness examples; or the AWS database blog)
34. Global tables resolve concurrent writes last-writer-wins, and multi-Region strong consistency is a separate mode with its own limits. (Global tables, consistency modes)
35. Whether DynamoDB has a native vector index (the source says `VectorIndexes` and `SearchVectors`, at most 5 per table, settings immutable); if it does, which items it skips silently. (What's new; developer guide) [for genai too]

Aurora DSQL user guide (docs.aws.amazon.com/aurora-dsql):
36. Current limits: rows and bytes per write transaction, transaction duration, connection duration, indexes per table, and sequence cache values allowed (the source says 3,000 rows, 10 MiB, 5 minutes, 60 minutes, 24, and 1 or at least 65,536). (Quotas)
37. One DDL statement per transaction, and indexes on existing tables are built with `CREATE INDEX ASYNC`. (DDL; asynchronous indexes)
38. Concurrency control is optimistic and a conflicting commit fails with SQLSTATE 40001 to be retried. (Concurrency control)
39. Foreign key constraints are not supported. (Unsupported PostgreSQL features)

Prisma (prisma.io/docs/orm):
40. `prisma migrate dev` may prompt to reset the database when it detects drift or an edited migration; `migrate deploy` never resets. (Prisma Migrate: development and production)
41. Whether `updateMany` sets `@updatedAt` fields (the source says it does not). (Prisma schema reference, `@updatedAt`)
42. The default `connection_limit` (the source implies `num_cpus * 2 + 1`) and the advice to use 1 with an external pooler on serverless. (Connection management; serverless)

Migration tools:
43. Django runs each migration in a transaction on PostgreSQL, and `AddIndexConcurrently` requires `atomic = False` on the migration. (docs.djangoproject.com: Migrations; `django.contrib.postgres.operations`)
44. Rails requires `disable_ddl_transaction!` for `add_index ... algorithm: :concurrently`. (guides.rubyonrails.org: Active Record migrations; API docs)
45. Alembic runs migrations in a transaction on PostgreSQL and offers `autocommit_block()` for statements that cannot run in one. (alembic.sqlalchemy.org: operations, `autocommit_block`)

Redis (redis.io/docs):
46. `KEYS` is O(N) and blocks the server; `SCAN` iterates incrementally. (Commands: KEYS, SCAN)
47. Under `noeviction` writes fail when memory is full; the `volatile-*` policies evict only keys with an expiry. (Key eviction)
48. A lock taken with `SET key token NX PX ms` must be released by a script that deletes only when the value equals the token. (Distributed locks with Redis)
49. Pub/Sub has at-most-once delivery and drops messages for subscribers that are not connected; Streams with consumer groups keep entries until acknowledged. (Pub/Sub; Streams)

49 facts, all new against prompt 6 and genai fact 35.

## 5. Proposed reference content

**Agent file, Goal (draft).**
- **Prevents:** a schema change that locks or rewrites a busy table, a query or transaction that is wrong or slow under real data and concurrency, and a store used for a guarantee it does not give.
- **Done well:** every finding names the statement, the table and its size or write rate when the repository shows it, the lock or plan it produces, and the wrong outcome, with file and line.
- **Not the goal:** where state lives or whether the system needs another store (architect), the order a migration runs in the pipeline (devops), naming and normalisation preferences, or tuning with no measured problem.

**How to judge (draft).** Name the engine and version first (from the image tag, the IaC engine version, `docker-compose`, or the migration tool's config); a lock or rewrite rule that changed between versions is not a finding on the version the repository runs. A performance finding needs a reason the table is large or the path hot (a row count, a seed, a comment, a query on a request path); without it, it is a suspicion. The migration tool decides what a file means: read its config before judging whether statements share a transaction.

**`plan.md`, questions (draft).**
- **Engine and version,** and the migration tool, with whether it wraps each file in a transaction.
- **Locks.** For each schema change on a table that takes writes: the lock it takes, whether it rewrites, and the `lock_timeout` the migration runs under.
- **Backfill.** How existing rows get the new value: batch size, pause, what is watched (replication lag), and how a partial run resumes.
- **Access patterns** (DynamoDB). Each read the feature needs, the key or index that serves it, and why the partition key spreads writes; a GSI that cannot be changed later is a one-way choice and names the alternatives.
- **Consistency per read.** Which reads must see their own write (route to the primary, or strongly consistent), and which tolerate lag.
- **Concurrency.** Two writers on the same row: the isolation level, the lock or version check, and the retry on serialization failure or deadlock.
- **Constraints the database enforces** against those left to code, and why.
- **Vector storage** (with genai): the column type and dimension, the operator class, and how filtered queries return enough rows.
- **One-way choice:** a partition key, a primary key type on a large table, or a DynamoDB GSI design names the alternatives.
- Good constraint: "`gate_entries` (about 60 million rows, written on every scan) gets its new index with `CREATE INDEX CONCURRENTLY` in its own non-transactional migration, under `lock_timeout = '2s'`, and the deploy checks `pg_index.indisvalid`." Rejected: "Use a better index strategy" or "consider partitioning" with no size or plan.

**`review.md`, categories (draft, each with its "Not when").**
- **A schema change that locks or rewrites a busy table.** CREATE INDEX without CONCURRENTLY, a validated foreign key, CHECK or NOT NULL, a type change that rewrites, a volatile default, several DDL statements in one transaction holding the first lock to the end, no `lock_timeout`. Not when the table is created in the same migration, is small by the repository's own evidence, or the deploy runs in a maintenance window the plan states.
- **A migration tool that cannot run what the file asks.** CONCURRENTLY in a migration the tool wraps in a transaction (Django without `atomic = False`, Rails without `disable_ddl_transaction!`, Alembic outside `autocommit_block`), so it fails at deploy, or a failed concurrent build that leaves an INVALID index with nothing to drop or retry it. Not when the tool's config runs that migration outside a transaction.
- **A migration file edited after it shipped.** An applied migration changed instead of a new one added; `prisma migrate dev` in a deploy script. Not when the migration has never left the branch.
- **A backfill as one statement.** A single UPDATE or DELETE over a large table, or a data migration in the same transaction as the DDL. Not when the table is small, or the plan accepts the lock for a stated window.
- **An index the new query or constraint needs.** A new foreign key with no index on the referencing column, a new filter or RLS policy column with no index, a composite index the query does not lead with, a function on an indexed column, a soft-delete flag missing from the index every query filters on. Not when the table is small or the query runs off the request path, and not for an index added "just in case".
- **A query that grows with the table.** N+1 in a loop or a lazy relation on a list path, OFFSET pagination on a growing table, a list with no LIMIT, `updateMany` or `deleteMany` with no `where`. Not when the collection has a small fixed bound the code shows, or the ORM batches the relation (prepared statements alone do not).
- **A transaction that is wrong under concurrency.** Read, then write with no lock, version check or conditional write (lost update); locks taken in a different order on two paths; SERIALIZABLE, REPEATABLE READ, DSQL or MySQL deadlocks with no whole-transaction retry; SKIP LOCKED outside a queue claim. Not when a unique constraint or a conditional write makes the second writer fail safely and the error is handled.
- **A transaction held open.** A network call, a model call or a user wait inside a transaction or a row lock; a long-lived session idle in a transaction. Not when the external call is the outbox pattern's insert into the same database.
- **A constraint that does not hold.** UNIQUE on a nullable column meant to be unique, a CHECK that passes on NULL, ON CONFLICT on a target no unique index matches, DynamoDB uniqueness on a non-key attribute with no sentinel item, a replaced function whose old overload still runs. Not when the duplicate case is impossible by the code's own path.
- **A type or storage choice that loses data.** `timestamp` without time zone for instants, floating point for money, `int` keys on a table that will pass 2^31 rows, MySQL `utf8` for user text, an UNLOGGED table holding data that must survive a crash. Not when the column holds a local wall-clock time or a bounded count.
- **DynamoDB writes that are not what they look like.** A batch call that ignores unprocessed items, a mutable GSI key on a hot item, a TTL attribute in milliseconds or a string, reads that do not filter items past their TTL, a hot partition key. Not when the write volume is low and the plan accepts it.
- **A vector query that silently returns fewer rows.** A filtered HNSW query with no iterative scan or prefilter, a query operator that does not match the index operator class, a query vector of another type or dimension than the column. Not when the filter matches most of the table, or the code checks the row count.
- **A store used for a guarantee it does not give.** Redis Pub/Sub for messages that must not be lost, a Redis lock released without comparing its token, `KEYS` on a production path, an eviction policy that can evict queue or lock keys. Not when the loss is acceptable and the plan says so.

**Severity here (draft).** High: a change that blocks writes to a table on a user path for longer than the request timeout, loses or corrupts data, or lets two writers both succeed where one must fail. Medium: it needs a condition (a large table, a burst, a long transaction already running, a failover). Low: extra reads or capacity with a small, stated bound.

**Worked pair (draft; venue entry gates, a topic in no corpus).**
- Reported: `db/migrations/0042_gate_entries_badge_idx.sql:3` runs `CREATE INDEX gate_entries_badge_id_idx ON gate_entries (badge_id);`. `db/seeds/README.md:12` puts `gate_entries` at about 60 million rows, and `services/gates/ingest.py:58` inserts into it on every badge scan. Without CONCURRENTLY the build holds a SHARE lock and blocks every insert for its full duration, so scans at the gates fail or time out during the deploy. Category: a schema change that locks a busy table; severity high. Fix: `CREATE INDEX CONCURRENTLY` in a migration of its own, marked non-transactional for the repository's runner (`db/migrate.toml` wraps files in a transaction by default), under `lock_timeout`, with a check of `pg_index.indisvalid` after.
- Dropped: `db/migrations/0043_gate_entries_zone.sql:2` adds `zone text NOT NULL DEFAULT 'main'` to the same table. The default is a constant and `docker-compose.yml:7` pins `postgres:16`, so the column is added from the catalogue with no rewrite; the brief ACCESS EXCLUSIVE lock runs under the runner's `lock_timeout = '2s'` (`db/migrate.toml:4`), so there is no failure to report.

## 6. Responsibilities: draft rubric rows

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Schema changes | the lock each statement takes, rewrites, NOT VALID and VALIDATE, concurrent index builds, `lock_timeout`, what the migration tool wraps in a transaction | the order a migration runs in the pipeline and IaC that replaces or deletes a database (devops); whether old and new code both work with the schema during the rollout (architect) | "does this ALTER block writes" is data's; "does it run before or after the deploy" is the DevOps engineer's; "can the old version still read it" is the architect's |
| Backfills and data migrations | batch size, pacing, one statement against batches, ANALYZE and VACUUM after | expand, migrate, contract, and the reconciliation before traffic moves (architect) | how the batch runs is data's; whether there is a check before cutover is the architect's |
| Queries and indexes | N+1, unbounded queries, pagination, indexes a new query or constraint needs, RLS policy cost | latency targets and caching as a pattern (architect; performance, planned) | a missing index is data's; "add a cache in front" is the architect's |
| Transactions and concurrency | isolation level, locks and lock order, lost updates, retries on serialization failure and deadlock, work inside a transaction | idempotency and duplicates across a boundary (architect); how the catch is written (developer) | a retry of a failed transaction is data's; a retry of a message is the architect's |
| Constraints and types | what the database enforces: UNIQUE and NULLs, CHECK, ON CONFLICT, foreign keys, types that lose data | which module owns the table; two modules writing one table (softarch) | a constraint on the table is data's; who may write the table is the software architect's |
| DynamoDB and Aurora DSQL | key and index design for the stated access patterns, write and batch semantics, TTL, capacity, DSQL limits | which store owns the fact, tenant isolation where data is read, partition-per-tenant models (architect) | a hot partition key is data's; a partition key that must carry the tenant is the architect's (`multi-tenancy`) |
| Connections | pool mode, pool sizes multiplied across processes, prepared statements under transaction pooling | RDS Proxy as a component and Lambda concurrency feeding it (architect) | the pool settings are data's; the number of instances that open pools is the architect's |
| Vector storage | column type and dimension, index type and operator class, filtered vector queries | the embedding model, re-embedding, ranking and "found nothing" answers (genai) | how the vectors are stored and indexed is data's; the model that makes them is the Generative AI engineer's |
| Redis as a store | blocking commands, eviction policy, lock release, Pub/Sub against Streams | caching as a pattern: invalidation, TTL as freshness, stampedes (architect, `caching-and-latency`) | Redis holding a queue or lock is data's; Redis holding a cache is the architect's |
| Data lifecycle in the store | TTL behaviour, data left on disk by DROP COLUMN, deletion that cannot be undone in a migration | backups, PITR and recovery objectives (architect); deletion protection and `DeletionPolicy` (devops); retention and erasure (privacy, planned) | a TTL in milliseconds is data's; whether the table needs PITR is the architect's |
| Access to the data | (none) | roles, grants, SECURITY DEFINER, public endpoints, injection (security) | a query built from input is security's; the same query's plan is data's |

**Border conflicts found.**
- **The DevOps row says "whether the schema change is compatible is the architect's".** Compatibility across versions stays the architect's; the lock and rewrite mechanics of the statement itself have no owner today and come here. Both the architect's "Moving existing data" row and DevOps' "Release and rollback mechanics" row need "statement locks and rewrites (data)" added under "Not this expert's" when the expert is built.
- **`multi-tenancy` (architect) cites Supabase's RLS references.** RLS policy *cost* (`(select auth.uid())`, indexes on policy columns) is a query-performance item and comes here; whether RLS is enabled, forced and on every tenant table stays the architect's. The skill's "Not for" line already says "a store's own mechanics are the data expert's", so it agrees; the data skill must say the reverse.
- **`caching-and-latency` (architect) holds Redis TTLs and stampedes.** Redis as a cache stays there; Redis as a queue, lock or message bus comes here. Each skill's "Not for" names the other.
- **`aws-well-architected` `PERF03-BP04` already names a DynamoDB Scan and an unindexed relational query on a request path.** Keep the row; the data skills point to it rather than repeat it, and the architect's row gains "(data) for the index itself" once this expert exists.
- **`lambda-event-sources` holds DynamoDB Streams retention and `eventID` dedupe.** Not repeated here.
- **`java-craft` routes "N+1 queries, fetch strategy and paging" to "data and performance experts, planned".** With no performance expert, N+1 and paging are data's; when a performance expert is built, the split is "the query a code path issues" (data) against "latency budgets and load" (performance).

## 7. Proposed skills, with selectors and the value test

| Skill | Holds | Review selector | Value test |
|---|---|---|---|
| `postgres-schema-changes` | the lock and rewrite each ALTER form causes, by version; NOT VALID and VALIDATE; concurrent index and unique-constraint builds; the lock queue and `lock_timeout`; types that rewrite; enum changes; partition key limits; ON CONFLICT inference; DSQL's DDL rules | `files: *.sql, **/migrations/**, **/migrate/**, db/schema.rb, alembic/versions/**; added: CREATE INDEX\|ALTER TABLE\|ADD CONSTRAINT\|ADD COLUMN\|ALTER COLUMN\|SET NOT NULL\|CREATE UNIQUE\|ALTER TYPE\|op\.add_column\|op\.create_index\|add_index\|AddIndex\|AddField\|RunSQL` | passes: version-specific and wrong in most reviewers' memory (1), each shows as a statement in a migration (2), from the manual once checked (3), no linter here holds it; squawk does, and the skill says to prefer the repository's squawk output when present (4) |
| `queries-and-transactions` | N+1 and its ORM fixes, keyset pagination, unbounded writes, indexes for foreign keys and RLS policies, isolation and retries, lock order, SKIP LOCKED, lost updates, work inside a transaction | `added: \.findMany\|\.findAll\|\.filter\(\|select_related\|prefetch_related\|joinedload\|selectinload\|\.include\(\|OFFSET\|FOR UPDATE\|SKIP LOCKED\|ISOLATION LEVEL\|SERIALIZABLE\|\$transaction\|transaction\.atomic\|with_for_update\|BEGIN\|CREATE POLICY` | passes, but the N+1 rows overlap prompt 6 C; write them only from its answer |
| `dynamodb-design` | access-pattern and key rules, GSI immutability and write cost, batch and conditional write semantics, TTL attribute rules, capacity mode limits, global table conflicts, uniqueness with a sentinel item | `added: DynamoDB\|dynamodb\|DocumentClient\|PutItem\|UpdateItem\|BatchWriteItem\|BatchGetItem\|TransactWriteItems\|ConditionExpression\|GlobalSecondaryIndex\|AWS::DynamoDB::Table\|aws_dynamodb_table\|TableV2\|TimeToLiveSpecification` | passes; points to `aws-well-architected` (Scan) and `lambda-event-sources` (Streams) instead of repeating them |
| `orm-and-migration-tools` | what Prisma, Django, Rails, Alembic and Knex do with transactions, concurrent indexes, edited migrations and production commands; Prisma connection limits on serverless | `files: schema.prisma, **/migrations/*.py, db/migrate/*.rb, alembic.ini, knexfile.*; added: migrate dev\|migrate deploy\|atomic = False\|disable_ddl_transaction\|autocommit_block\|connection_limit` | passes once facts 40 to 45 are checked; could merge into `postgres-schema-changes` if it stays under 15 rows |
| `vector-storage` | pgvector types, operator classes, HNSW and IVFFlat build rules, filtered queries and iterative scan, dimension limits | `added: pgvector\|CREATE EXTENSION vector\|halfvec\|vector\(\|USING hnsw\|USING ivfflat\|vector_cosine_ops\|<=>\|<->\|iterative_scan\|ef_search` | passes; genai's `rag-retrieval` holds the model half and both name the other in "Not for" |
| `redis-as-a-store` | blocking commands, eviction policies for queues and locks, token-checked lock release, Pub/Sub against Streams | `added: redis\|Redis\|ioredis\|KEYS \|\.keys\(\|SET .* NX\|SETNX\|PUBLISH\|SUBSCRIBE\|XADD\|XREADGROUP\|maxmemory-policy` | borderline on 4: five rows. Keep only if the five survive the check; otherwise fold into `caching-and-latency` as a "Redis beyond caching" section with the architect's agreement |
| `mysql-schema-changes` | online DDL algorithms and versions, metadata locks, `utf8mb4`, gap locks and deadlock retry, `ON DUPLICATE KEY UPDATE` syntax | `files: same as postgres; added: ENGINE=InnoDB\|ALGORITHM=\|LOCK=NONE\|AUTO_INCREMENT\|ON DUPLICATE KEY\|utf8mb3\|CHARSET=utf8` | passes on 1 to 3; write it only if a repository the plugin serves uses MySQL (fails 4 by having no user otherwise) |

Rejected skills: a schema-design style skill (normalisation, naming, `SELECT *`: fails 2, not a defect), a query-tuning skill built from EXPLAIN advice (fails 2 without a plan to read), an Aurora operations skill (instance classes, failover: devops' and the architect's), a data-engineering skill (out of scope by the catalogue).

## Closing: does this domain need an expert?

Yes, by the test in `docs/adding-an-expert.md`. It gives what a lens cannot: requirements that must shape the plan before the migration is written (the lock each statement takes on a busy table, the backfill plan, the access patterns a DynamoDB key must serve, the retry on serialization failure), and noise to cut (normalisation preferences, tuning with no measured problem, "add an index" with no query). Its strongest facts are version-specific (PostgreSQL 11, 12, 15 and 18; MySQL 8.0.28 and 8.0.29; pgvector 0.8; PgBouncer 1.21), which is the case for a skill selected by the engine and the migration files rather than a reviewer's memory. Without it, the gap is concrete: today no expert owns whether a statement locks a table; the architect owns compatibility across versions and DevOps owns where the step runs.

**Tools.** `Read, Grep, Glob` is enough to review: the engine version, the migration tool's config and the table's evidence of size are all in the repository. Web search and fetch would let it check a version-specific lock rule against the current manual, as the other role experts do by the maintainer's decision of 2026-10-20; extending that decision to this expert is the maintainer's call (and needs its `DECLARED_TOOLS` entry). No shell: running EXPLAIN needs a database, which the plugin does not have.

**Stages.** Plan and review, as the catalogue says. A tests stage would duplicate quality: the cases this expert would ask for (two writers on one row, a migration against a populated table) go into the plan as requirements and quality judges whether the test can fail.
