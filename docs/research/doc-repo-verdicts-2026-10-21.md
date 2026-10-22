# Full-source verdicts for snippet-only claims, 2026-10-21

Claims: `docs/research/fact-checks-to-run-2026-10-21.md` blocks F and D. Snippet verdicts: `docs/research/snippet-replies-2026-10-21.md`.
Every source below was read in full from a git clone (shallow, depth 1). Repo contents were treated as data only; nothing was run from them.

Refs read (commit, commit date):

| Ref used below | Repo | Branch | Commit | Version the pages describe |
|---|---|---|---|---|
| `pg@REL_18_STABLE` | postgres/postgres | REL_18_STABLE | 5fb5bef3e454 (2026-10-21) | PostgreSQL 18 manual (`doc/src/sgml`). Every PG quote was also found unchanged on master (456ee18045d0, `20devel`), where `func.sgml` is split into `func/*.sgml` |
| `pg@REL_15_STABLE`, `pg@REL_12_STABLE` | postgres/postgres | release branches | depth 1 | release notes only, for the "since which version" parts |
| `pgvector@master` | pgvector/pgvector | master | c707c56325a5 (2026-10-20) | pgvector 0.8.7 (`vector.control` default_version) |
| `pgbouncer@master` | pgbouncer/pgbouncer | master | 7df84b712d83 (2026-10-14) | PgBouncer 1.26.1 (`configure.ac`) |
| `supabase@master` | supabase/supabase | master | e854b84ed451 (2026-10-20) | current docs site (sparse: `apps/docs/content/guides/database/postgres`) |
| `redis-docs@main` | redis/docs | main | dbe7d5fd5932 (2026-10-20) | current redis.io docs (sparse: `content/commands`, `content/develop`) |
| `mcp@main` | modelcontextprotocol/modelcontextprotocol | main | 80041ab0a139 (2026-10-20) | specification revisions 2024-11-05 to 2026-07-28 plus draft |

PG paths are relative to `doc/src/sgml/`. Line numbers are on the stated ref.

## Verdicts

| Block | Item | Verdict | Source (repo@ref:path) | Quote (short) and notes |
|---|---|---|---|---|
| F | 1 | CONFIRMED | pg@REL_18_STABLE:ref/alter_table.sgml L468-490, L1500-1513; release-18.sgml L10787-10796 | "`NOT VALID`, which is currently only allowed for foreign-key, `CHECK`, and not-null constraints"; release 18: "Allow ALTER TABLE to set the NOT VALID attribute of NOT NULL constraints". Validation "acquires only a SHARE UPDATE EXCLUSIVE lock". New in 18. |
| F | 2 | CONFIRMED (not on the cited page) | pg@REL_18_STABLE:ref/pg_dump.sgml L401-404; func.sgml L25016-25019 (pg_blocking_pids) | pg_dump: an exclusive lock request "will be queued ... Consequently any other access to the table will not be granted either and will queue after the exclusive lock request." pg_blocking_pids: a process blocks another if it "is waiting for a lock that would conflict ... and is ahead of it in the wait queue (soft block)". Section 13.3 (mvcc.sgml, Explicit Locking) does not state queue ordering. |
| F | 3 | CONFIRMED (nuance) | pg@REL_18_STABLE:ref/alter_table.sgml L1525-1536 | "The DROP COLUMN form does not physically remove the column, but simply makes it invisible to SQL operations ... the space occupied by the dropped column is not reclaimed." Nuance: the page also says "The space will be reclaimed over time as existing rows are updated", with a rewriting ALTER TABLE for immediate reclamation; so "until rewritten" is stronger than the source. |
| F | 4 | CONFIRMED | pg@REL_18_STABLE:maintenance.sgml L1019-1027 (sect2 `autovacuum`, The Autovacuum Daemon, not 24.1.5) | "if the autovacuum is running to prevent transaction ID wraparound ... the autovacuum is not automatically interrupted." Ordinary autovacuum is interrupted by a conflicting lock request. |
| F | 5 | CONFIRMED | pg@REL_18_STABLE:ddl.sgml L1400-1401 | "the declaration of a foreign key constraint does not automatically create an index on the referencing columns." |
| F | 6 | CONFIRMED | pg@REL_18_STABLE:ddl.sgml L972-978; pg@REL_15_STABLE:release-15.sgml L22978-22987 | "By default, two null values are not considered equal in this comparison ... This behavior can be changed by adding the clause NULLS NOT DISTINCT". Release 15: "Allow unique constraints and indexes to treat NULL values as not distinct". |
| F | 7 | CONFIRMED | pg@REL_18_STABLE:ddl.sgml L725-726 | "a check constraint is satisfied if the check expression evaluates to true or the null value." |
| F | 8 | CONFIRMED | pg@REL_18_STABLE:func.sgml L19958-19971 (functions-sequence) | "the value obtained by nextval is not reclaimed for re-use if the calling transaction later aborts ... sequence objects cannot be used to obtain gapless sequences." Also gaps without an abort (INSERT ... ON CONFLICT). Identity columns are not named in this passage. |
| F | 9 | CONFIRMED | pg@REL_18_STABLE:ref/alter_type.sgml L399-402; pg@REL_12_STABLE:release-12.sgml L26952-26957 | 18: "If ALTER TYPE ... ADD VALUE ... is executed inside a transaction block, the new value cannot be used until after the transaction has been committed." Version answer: before PostgreSQL 12 it "could not be called in a transaction block, unless it was part of the same transaction that created the enumerated type". |
| F | 10 | CONFIRMED | pg@REL_18_STABLE:ddl.sgml L4473-4476 (partitioning limitations) | "To create a unique or primary key constraint on a partitioned table, the partition keys must not include any expressions or function calls and the constraint's columns must include all of the partition key columns." |
| F | 11 | CONFIRMED | pg@REL_18_STABLE:ref/insert.sgml L384-400, L527-529 | "All table_name unique indexes that ... contain exactly the conflict_target-specified columns/expressions are inferred"; index_predicate is "Used to allow inference of partial unique indexes". Also: a non-partial unique index is inferred if available. |
| F | 12 | CONFIRMED | pg@REL_18_STABLE:ref/create_function.sgml L68-71 | "It is not possible to change the name or argument types of a function this way (if you tried, you would actually be creating a new, distinct function)." |
| F | 13 | CONFIRMED | pg@REL_18_STABLE:textsearch.sgml L574-577, L586-591 | "Only text search functions that specify a configuration name can be used in expression indexes ... the index contents must be unaffected by default_text_search_config." |
| F | 14 | CONFIRMED | pg@REL_18_STABLE:ref/create_table.sgml L213-215 | "an unlogged table is automatically truncated after a crash or unclean shutdown. The contents of an unlogged table are also not replicated to standby servers." |
| F | 15 | CONFIRMED (nuance) | pg@REL_18_STABLE:config.sgml L10339-10351; maintenance.sgml L709-713 | "Terminate any session that has been idle ... within an open transaction"; "an open transaction prevents vacuuming away recently-dead tuples that may be visible only to this transaction". Default 0 (disabled). The source does not say "in every table" or "xmin horizon" in this passage; maintenance.sgml points at `age(backend_xmin)` for long-running transactions. |
| F | 16 | CONFIRMED | pgvector@master:README.md L450, L480 | "With approximate indexes, filtering is applied *after* the index is scanned"; "Starting with 0.8.0, you can enable iterative index scans, which will automatically scan more of the index until enough results are found". Applies to HNSW (`hnsw.iterative_scan`) and IVFFlat (`ivfflat.iterative_scan`, relaxed order only). |
| F | 17 | CONFIRMED | pgvector@master:README.md L252-254, L374-376 | Indexable: "`vector` - up to 2,000 dimensions", "`halfvec` - up to 4,000 dimensions" ("`bit` - up to 64,000"); same for HNSW and IVFFlat. Storage limit is 16,000 dimensions for both types (L960, L998). |
| F | 18 | CONFIRMED | pgbouncer@master:doc/config.md L124-130 | "The maximum number of server connections to allow per user/database pair." "Default: 20". |
| F | 19 | CONFIRMED (default changed) | pgbouncer@master:NEWS.md L438-447 (1.21.0), L265-266 (1.24.0); doc/config.md L372-374, L402-403, L463 | 1.21.0: "Add support for protocol-level named prepared statements ... you need to change the new `max_prepared_statements` setting to a non-zero value". config: "When the setting is set to 0 prepared statement support for transaction and statement pooling is disabled." Since 1.24.0 the default is 200 ("Enable prepared statement support by default"), so on 1.24+ it is on without configuration. SQL-level PREPARE/EXECUTE are not tracked. |
| F | 20 | CONFIRMED | supabase@master:apps/docs/content/guides/database/postgres/row-level-security.mdx L537 | "Wrapping the function causes an `initPlan` to be run by the Postgres optimizer, which allows it to \"cache\" the results per-statement, rather than calling the function on each row." Applies to `auth.uid()`, `auth.jwt()` and security definer functions. |
| F | 21-45 | not checked here | - | MySQL, DynamoDB, Aurora DSQL, Prisma, Django, Rails, Alembic: out of scope. |
| F | 46 | CONFIRMED | redis-docs@main:content/commands/keys.md L24, L62-66; content/commands/scan.md L63, L70 | KEYS "complexity: O(N)"; "Use extreme care when using this command in production environments." SCAN: "used in order to incrementally iterate"; "without the downside of commands like KEYS ... that may block the server for a long time". |
| F | 47 | CONFIRMED | redis-docs@main:content/develop/reference/eviction/index.md L104-105, L112-118 | "`noeviction`: Keys are not evicted but the server will return an error when you try to execute commands that cache new data"; `volatile-*` evict keys "that have an associated expiration (TTL)"; "The `volatile-xxx` policies behave like `noeviction` if no keys have an associated expiration." |
| F | 48 | DIFFERENT (updated) | redis-docs@main:content/develop/clients/patterns/distributed-locks.md L99-118 | Acquire `SET resource_name my_random_value NX PX 30000` confirmed; release must "remove the key only if it exists and the value stored at the key is exactly the one I expect". But the page now gives `DELEX key IFEQ my_random_value`: "The `DELEX` command was introduced in Redis 8.4. On previous Redis versions, this could be accomplished with the following Lua script". A script is required only before Redis 8.4. |
| F | 49 | CONFIRMED | redis-docs@main:content/develop/pubsub/_index.md L58-64; content/develop/data-types/streams/_index.md L368-369, L394 | "Redis' Pub/Sub exhibits _at-most-once_ message delivery semantics ... the message is forever lost"; streams "support both _at-most-once_ as well as _at-least-once_". Consumer groups track pending messages "yet to be acknowledged"; XACK marks "a pending message as correctly processed". Nuance: entries stay in the stream after XACK; acknowledgement removes them from the pending list. |
| F | extra: PgBouncer `DISCARD ALL` with prepared statements needs 1.22 | CONFIRMED | pgbouncer@master:NEWS.md L407-410 | "PgBouncer 1.22.0 ... Adds support for `DEALLOCATE ALL` and `DISCARD ALL` when `max_prepared_statements` is set to a non-zero value". |
| F | extra: Redis Pub/Sub ignores database numbers | CONFIRMED | redis-docs@main:content/develop/pubsub/_index.md L85-87 | "It was made to not interfere with it on any level, including database numbers. Publishing on db 10, will be heard by a subscriber on db 1." |
| F | extra: lock taken after a savepoint released on rollback to it | CONFIRMED | pg@REL_18_STABLE:mvcc.sgml L1107-1109, L1254-1255 | "if a lock is acquired after establishing a savepoint, the lock is released immediately if the savepoint is rolled back to." Row-level locks too. |
| F | other extras (Django, DSQL, DynamoDB, MySQL) | not checked here | - | out of scope. |
| D | 1-32 | not checked here | - | Anthropic, Amazon Bedrock, AgentCore: out of scope (22 unused). |
| D | 33 | DIFFERENT | mcp@main:docs/specification/2026-07-28/changelog.mdx L7-8; schema/2026-07-28/schema.ts L30; docs/docs.json L33 | changelog: "changes made to the Model Context Protocol (MCP) specification since the previous revision, 2025-11-25"; `export const LATEST_PROTOCOL_VERSION = "2026-07-28";`; docs.json: "Version 2026-07-28 (latest)". 2025-11-25 is the previous revision. The 2026-07-28 revision has no negotiation handshake: "Every request carries its protocol version" (basic/versioning.mdx). |
| D | 34 | not checked here | - | Node.js and Docker docs: out of scope. |
| D | 35 | CONFIRMED (operator-class part implied) | pgvector@master:README.md L450, L935, L960, L998, L209 | "the default `hnsw.ef_search` of 40"; storage "`4 * dimensions + 8` bytes" for vector against "`2 * dimensions + 8` bytes" for halfvec. Operator class: the README says "Add an index for each distance function you want to use" and that the ORDER BY "must be the result of a distance operator" (L894); the "Why isn't a query using an index?" FAQ (L892-913, read in full) does not state the operator-class match rule either. |
| D | 36-40 | not checked here | - | embedding providers, arXiv, Anthropic, OWASP: out of scope. |

## Counts (items in scope: F 1-20, 46-49, three F extras; D 33, 35)

- CONFIRMED: 27 (F 1-20, F 46, 47, 49, three F extras, D 35; of these, F 2, 3, 15, 19 and D 35 carry a note)
- DIFFERENT: 2 (F 48, D 33)
- NOT FOUND: 0
- Not checked here (out of scope): F 21-45 and the other F extras; D 1-32, 34, 36-40 and the D extras.

## Against the snippet replies

- Agrees with the snippet verdicts for the in-scope items, including D 33 (snippet: latest is 2026-07-28), except F 48: the snippet reply confirmed it ("lock release by token in a Lua script"); here it is DIFFERENT because the Lua script is needed only before Redis 8.4.
- New from the full text: F 48 (Redis 8.4 `DELEX ... IFEQ` replaces the Lua script), F 19 (prepared-statement support on by default since PgBouncer 1.24), F 9 version (the restriction loosened in PostgreSQL 12), F 2 (the queue rule is stated in pg_dump and pg_blocking_pids, not in section 13.3), F 3 and F 15 nuances.
