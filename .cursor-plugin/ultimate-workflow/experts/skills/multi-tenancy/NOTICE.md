# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| cloudflare/security-audit-skill, `DATA-ISOLATION-AND-LIFECYCLE.md` (fetched 2026-10-20) | MIT | The failure classes: a tenant field without enforcement, keys and namespaces without the tenant, policy and query disagreeing, bypass clients and background jobs, derived copies, migration defaults, deletion that reaches only some copies. Its audit procedure and its authorisation-bug classes were left to the security expert |
| supabase/agent-skills, `security-rls-basics.md` and `security-rls-performance.md` | MIT | Row-level security enabled and forced. Its performance rules (wrapping `auth.uid()`, indexing policy columns, security-definer functions) belong to the data expert and were left out, as were its speed figures, which contradict each other |
| aws/agent-toolkit-for-aws, CloudFront `multi-tenant-distributions` reference and the Aurora DSQL tenant query script (2026) | Apache-2.0 | A shared configuration as a shared blast radius, per-tenant rate limits and log fields, a valid tenant id not proving membership |
| AWS SaaS Lens, principle and isolation-model names only (lens dated April 4, 2023; recorded in the maintainer's research of 2026-10-20). Its text could not be fetched and no public source repository exists | AWS documentation | The silo, pool and bridge models, binding user to tenant identity, one onboarding process, per-tenant cost and metrics. The definitions are ours |

Rows marked [O] are our own reasoning: session context on pooled connections, and IAM-based isolation. Check the IAM part against the AWS IAM documentation before relying on it.
