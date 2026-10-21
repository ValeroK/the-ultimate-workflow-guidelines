# Fact-check replies read from search snippets, 2026-10-21

Four blocks from `docs/research/fact-checks-to-run-2026-10-21.md` came back the same day from sessions that had **search snippets only, no page reader**. Each says so and marks every claim "snippet only". Under the shared rule ("read the page itself, not a search-result snippet") none of them is [R]. They are recorded here so that their findings are not lost; facts are restated, not copied.

| Block | Reply | Claims | Usable as |
|---|---|---|---|
| H. Observability | empty: the session had no web tool at all | 0 | nothing; to run again |
| E. Data research prompt 6 | snippet only | 27 claims, 5 ranked migration mistakes | leads for F |
| F. Data fact-check | snippet only | 49 items and 10 extras | see below |
| D. GenAI fact-check | snippet only | 40 items and 10 extras | see below |

## What a snippet can and cannot carry

- **It can carry a quote:** each claim gives a verbatim passage from the vendor's or the standard's own URL. Where the quote states the whole claim, the text exists on that page.
- **It cannot show the context:** which version the page is about, a caveat in the next sentence, or whether the snippet is from a cached older copy. Several replies note that part of a claim "did not appear in the snippet".
- **The decision for the maintainer:** whether a primary-source snippet whose quote carries the whole claim may be used in a skill under its own tag (proposed: **[S]**, weaker than [R], each row naming the page), or whether these blocks must be run again in a session that can open pages. Until that is decided, nothing below goes into a skill.

## F. Data fact-check: verdicts

Confirmed by quote (items): 1 (PostgreSQL 18 `NOT VALID` on `NOT NULL`), 2, 3 (`DROP COLUMN` leaves data on disk), 4 (anti-wraparound autovacuum is not interrupted), 5 (foreign keys need their own index on the referencing side), 6 (`NULLS NOT DISTINCT`), 7 (a `CHECK` passes on NULL), 8 (sequences have gaps), 9 (`ADD VALUE` unusable until commit), 10 (partitioned unique keys must include the partition key), 11 (`ON CONFLICT` needs the partial index predicate), 12 (`CREATE OR REPLACE FUNCTION` with new argument types overloads), 13 (two-argument `to_tsvector` for expression indexes), 14 (`UNLOGGED` truncated on crash, not replicated), 15 (`idle_in_transaction_session_timeout`), 16 (pgvector iterative scans from 0.8.0), 17 (vector 2,000 / halfvec 4,000 dimensions indexed), 18 (PgBouncer `default_pool_size` per user and database pair), 19 (prepared statements in transaction mode from PgBouncer 1.21 with `max_prepared_statements`), 20 (`(select auth.uid())` in RLS policies), 21 (an explicit `ALGORITHM`/`LOCK` fails rather than falls back), 22 (64 instant row versions, 255 from MySQL 9.1), 23 (MySQL metadata locks queue behind open transactions), 24 (InnoDB rolls back a deadlock victim; retry the whole transaction), 25 (`utf8` is `utf8mb3`), 26 (`VALUES()` in `ON DUPLICATE KEY UPDATE` deprecated), 27 (one GSI per `UpdateTable`), 29 (a failed conditional write still consumes capacity), 30 (batch calls return unprocessed items), 32 (TTL deletes in Streams carry `dynamodb.amazonaws.com`), 33 (unique non-key attributes through a transaction), 34 (global tables: last writer wins, or MRSC), 35 (DynamoDB vector indexes: an item without the index partition key is not indexed), 36 (Aurora DSQL: 10 MiB and 3,000 rows per transaction, 5-minute transactions, 60-minute connections), 37 (DSQL: one DDL per transaction, no DDL with DML, `CREATE INDEX ASYNC`), 38 (DSQL OCC: SQLSTATE 40001), 40 (`prisma migrate dev` can reset; `deploy` never does), 43 (Django concurrent index operations need `atomic = False`), 44 (Rails `disable_ddl_transaction!`), 45 (Alembic `autocommit_block()`), 46 (`KEYS` blocks), 47 (`volatile-*` behave like `noeviction` with no TTLs), 48 (lock release by token in a Lua script), 49 (Pub/Sub at most once; Streams with `XACK`).

**Different:** 28 (capacity-mode switches to on-demand: four times per 24 hours, not once), 39 (Aurora DSQL now supports foreign keys, `NO ACTION` only, added `NOT VALID` then validated asynchronously), 42 (Prisma on serverless: `connection_limit = 1` only without an external pooler; with one, start from the default).

**Not found:** 31 (the delete-plus-insert cost of changing a GSI key attribute), 41 (`updateMany` and `@updatedAt`).

**Extras:** Django `AddConstraintNotValid` and `ValidateConstraint` belong in separate migrations; DSQL `CHECK` and foreign keys added by `ALTER TABLE` need `NOT VALID`; DSQL indexes take at most 8 key columns; DynamoDB Local accepts and ignores `VectorIndexes`; `SearchVectors` `TopK` is 1 to 100 and filters only by equality; MRSC global tables do not enable Streams by default; PgBouncer `DISCARD ALL` with prepared statements needs 1.22; MySQL `ADD PRIMARY KEY` with `ALGORITHM=COPY` turns NULLs into defaults; Redis Pub/Sub ignores database numbers; a lock taken after a savepoint is released when the savepoint is rolled back.

## E. Data research: what it adds over F

PostgreSQL 18 lock levels per `ALTER TABLE` form, `lock_timeout` against `statement_timeout`, rewrites from volatile defaults and type changes, ORM batching (Django `FETCH_PEERS` in 6.1, SQLAlchemy loader options, Prisma `relationLoadStrategy`, Hibernate's eager defaults), RDS `max_connections` formula, RDS Proxy pinning, DynamoDB partition, item, index, transaction and query limits, PITR and backup retention. Three claims are secondary only (the HikariCP formula on SSDs, backfills in the migration transaction, TTL's 48-hour window); the 48-hour window was in an earlier draft and stays out.

## D. GenAI fact-check: verdicts

Confirmed by quote: 1 (assistant prefill returns 400 on Claude 4.6 and later and Mythos Preview), 3 (large `max_tokens` needs streaming in the SDKs; `stop_reason: "max_tokens"`), 5 (parse tool input as JSON; escaping differs by model), 6 (`output_format` moved to `output_config.format`), 7 (server web tools report errors inside a 200), 9 (deferring every tool returns 400), 10 (cache prefix order and per-model minimum lengths), 11 (parallel tool results in one user message), 12 (strict tools need `required` and `additionalProperties: false`), 13 (mid-conversation system messages on the 5.x models), 16 (Bedrock Agents Classic closed to new customers from 2026-07-30), 17 (retryable Bedrock exceptions), 18 (inference profile ID as `modelId` for cross-Region inference), 19 (geographic against global profiles), 20 (`PrepareAgent` after an edit), 21 (50 MB ingestion file limit), 23 (Converse against model-specific `InvokeModel` bodies), 26 (AgentCore idle 900 s, lifetime 8 h defaults), 28, 29 (AgentCore Memory and Gateway quotas), 30 (secrets not in agent environment variables), 31 (`InvokeAgentRuntimeCommand` runs with the execution role), 32 (the quickstart policy uses `Resource: "*"`), 34 (Node's default host and Docker's `-p` publish to all interfaces), 35 (pgvector `ef_search` 40, halfvec 4,000), 38 (workflows against agents), 39 (OWASP 2025 identifiers, primary page), 40 (agents about 4 times and multi-agent about 15 times the tokens of chat).

**Different:** 2 (forced `tool_choice` returns 400 on Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1), 4 (on Opus 5.5 and Sonnet 5.5 both `disabled` and manual-budget thinking return 400; `enabled` returns 400 on 4.7 and later), 8 (MCP connector beta `mcp-client-2026-09-15` supersedes `2025-11-20`), 15 (Guardrails masks PII in input and output; the logging claim not found), 24 (InvokeAgentRuntime: the quotas page says 25 TPS, the release notes 200 TPS per agent), 33 (MCP specification latest is 2026-07-28).

**Not found:** 14 (unset `maxTokens` reserving quota), 25, 27 (AgentCore session numbers), 36 (embedding model mismatch).

**Secondary only:** 37 (lost in the middle, from an abstract mirror).

**Extras:** temperature and `top_p` rejected on models after Opus 4.6 (other than 1.0 and ≥ 0.99), `defer_loading` with `cache_control` returns 400, strict-tool limits per request (20 tools, 24 optional, 16 union parameters), refusals arrive as 200 with `stop_reason: "refusal"`, editing a prefix invalidates later preserved thinking, top-level automatic caching refused on the legacy Bedrock integration (Opus 4.6 and earlier), `web_fetch` only fetches URLs already in the conversation, `disable_parallel_tool_use` sits inside `tool_choice`, Opus 5.5 needs `computer_toolset_20260801`, `InvokeAgentRuntimeCommand` limits.

## Our assessment

- **The quotes look specific and current** (model names, 2026 dates, recent features). Nothing in them contradicts a fact we hold from an [R] source; item 33 agrees with the security round.
- **The risk is concentrated in model-specific API rules** (D items 2, 4 and the extras). These change with each model release, and a snippet cannot show which models a page covers. If they are used at all, each row must name the models it applies to and the date.
- **H must be run again.** **D, E and F wait for the maintainer's decision** on snippet-only sources.

## Re-read from the documentation's own repositories (2026-10-21)

Where a source's text is kept in a public repository, it was read there in full, at the branch the claim is about (PostgreSQL `REL_18_STABLE`, pgvector, PgBouncer, Redis docs, the Supabase guide, the MCP specification). Those items are [R] now; the table with line references is `doc-repo-verdicts-2026-10-21.md`.

- **Confirmed, now [R]:** F 1 to 20, 46, 47, 49, three extras (PgBouncer `DISCARD ALL` needs 1.22, Pub/Sub ignores database numbers, savepoint rollback releases later locks), D 35.
- **Changed by the full text:**
  - F 3: `DROP COLUMN` space is reclaimed over time as rows are updated, or at once by a rewriting `ALTER TABLE`; "until rewritten" overstated it.
  - F 15: the passage gives `idle_in_transaction_session_timeout` (default 0, off) and that an open transaction blocks vacuum of recently dead rows; nothing about "every table".
  - F 19: PgBouncer prepared statements in transaction mode need `max_prepared_statements` from 1.21, and are **on by default (200) from 1.24**; SQL-level `PREPARE` is not tracked.
  - F 48: Redis 8.4 adds `DELEX key IFEQ value`; the Lua release script is needed only before 8.4.
  - D 33: agrees with the snippet's "different": the latest MCP specification is 2026-07-28, previous 2025-11-25.
- **Still snippet only:** F 21 to 45 and the other F extras (MySQL, DynamoDB, Aurora DSQL, Prisma, Django, Rails, Alembic) and D 1 to 32, 34, 36 to 40 (Anthropic API, Bedrock, AgentCore, Node, Docker, Anthropic posts, OWASP). Their pages are not in a public repository; they wait on the maintainer's choice (allowed domains, or [S]).
