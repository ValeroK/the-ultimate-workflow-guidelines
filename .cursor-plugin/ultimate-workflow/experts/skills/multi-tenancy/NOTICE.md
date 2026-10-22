# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| PostgreSQL manual: row security policies (`ddl-rowsecurity.html`), `SET` (`sql-set.html`), configuration functions (`functions-admin.html`); AWS IAM user guide, session tags (`id_session-tags.html`) | Checked live by the maintainer, 2026-10-21 (architect fact-check round 2, items 58 to 60 and extra fact 9) | PostgreSQL documentation; AWS documentation | Every fact marked [R]: owner, superuser and `BYPASSRLS` bypass and `FORCE`; `SET` against `SET LOCAL` and `set_config(..., true)`, and `SET LOCAL` outside a transaction; a policy sub-SELECT under READ COMMITTED and `FOR SHARE`; session tags with `aws:PrincipalTag` |
| cloudflare/security-audit-skill, `DATA-ISOLATION-AND-LIFECYCLE.md` | Fetched 2026-10-20 | MIT | Rows marked [T] on tenant identity, asynchronous hops, one predicate on every path, keys and uniqueness, derived copies and exports, logs as other readers, migration defaults, and deletion (soft deletes, restores, removed members, queued retries) |
| supabase/agent-skills, `security-rls-basics.md` and `security-rls-performance.md` | Read 2026-10-20 | MIT | That row-level security is enforced in the database and forced; the rule itself now rests on the PostgreSQL manual |
| aws/agent-toolkit-for-aws, CloudFront `multi-tenant-distributions` reference and the Aurora DSQL tenant query script | 2026, read 2026-10-20 | Apache-2.0 | A shared configuration changes every tenant; per-tenant rate limits in the calling layer; a well-formed tenant id not proving membership |

The isolation-model names (silo, pool, bridge) come from the AWS SaaS Lens as recorded in the maintainer's Well-Architected research of 2026-10-20; the lens text was not read by us, so the definitions and the rows on tiers, onboarding and per-tenant cost are our own reasoning [O]. The maintainer's check (item 61) confirmed only the bridge model, and it is not checkable in a diff.

Left out, and why: the silo, pool, tier-based and targeted definitions (not confirmed); CloudFront connection groups (item 73: confirmed only that they exist to isolate tenants, not that they contain a fault); row-level security performance, wrapping `auth.uid()`, indexing policy columns and the speed figures, which contradict each other (data); `SECURITY DEFINER` functions, signed URLs, existence oracles, import authorisation and slug validation (security); log fields written in code (developer); SQS fair queues (held in `aws-messaging`); two dummy tenants as a proof method (the expert runs nothing).
