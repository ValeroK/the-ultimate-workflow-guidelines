# Notice

The data and database expert's references are written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| timescale/pg-aiguide (Postgres table design, migrations, hybrid search, pgvector) | Read 2026-10-20 | Apache-2.0 | Locks and rewrites per statement, backfills in batches, vector storage |
| planetscale/database-skills `postgres`, `mysql` | Read 2026-10-20 | MIT | Index and query rules, schema changes on busy tables |
| supabase/agent-skills `supabase-postgres-best-practices` | Read 2026-10-20 | MIT | Row-level policy cost, indexes on policy columns |
| aws/agent-toolkit-for-aws DynamoDB and Aurora DSQL skills | Read 2026-10-20 | Apache-2.0 | Access patterns, batch and conditional writes, TTL, DSQL limits |
| affaan-m/ECC database reviewer and Postgres, migration and MySQL skills; wshobson/agents; github/awesome-copilot; itsmostafa/aws-agent-skills; msitarzewski/agency-agents; Jeffallan/claude-skills; alirezarezvani/claude-skills | Read 2026-10-20 | MIT | N+1, pagination, lost updates, migration tooling, types that lose data |

Left out, and why: naming and normalisation preferences, tuning with no measured problem, data engineering platforms; every version-specific lock, rewrite and limit until the maintainer's live check returns (one source claim was already wrong against the PostgreSQL manual).
