---
name: multi-tenancy
description: Use when a change serves more than one customer from shared data or resources, for the isolation model, tenant context, enforcement and tenant lifecycle.
verified: 2026-10-21
requires: PostgreSQL row-level security and session settings as in the current manual; AWS IAM session tags
---

# Multi-tenancy

## Goal

- **Lets the expert catch:** a design where one tenant can read, overwrite or starve another's data although each handler looks scoped: a path that skips the enforcement point, a tenant setting that leaks between pooled requests or never applies, a policy the application's role bypasses, a key, cache or derived copy without the tenant, or a deletion that misses a copy.
- **Applies to:** tenant ids in code, schemas and keys; `ROW LEVEL SECURITY`, `CREATE POLICY`, `SET` and `set_config` of a tenant setting; per-tenant IAM roles, session tags and `aws:PrincipalTag`; per-tenant prefixes, queues, indexes and limits; onboarding, offboarding and migrations of tenant data.
- **Not for:** an authorisation bug in one handler, signed URLs, existence oracles, injection and whether an IAM policy's conditions are correct (security); a policy's or index's query cost, constraint mechanics, pool settings (data); the canary or staged rollout of a shared change (devops); log fields written in code (developer); cache invalidation and key design in general (`caching-and-latency`); SQS fair queues (`aws-messaging`); erasing one person's data from every copy (data); personal data in logs and other sinks (security).

Sources: **[R]** the maintainer's live check of the PostgreSQL manual and the AWS IAM user guide (2026-10-21); **[T]** third-party agent skills (Cloudflare's data-isolation audit, Supabase's row-level security references, AWS's agent toolkit, 2026), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check the code path end to end, not a finding on its own.

## First, establish the target

- **The isolation model of each store the change touches:** silo (its own resources per tenant), pool (shared, the tenant on every row, item, key or object), or a mix by layer; where the design states it (plan, ADR, README).
- **Where the tenant is resolved** (a token claim, the session, middleware) and how it reaches each store: an ORM default scope, a database session setting with row-level security, IAM session tags, a key prefix.
- **For Postgres:** the role the application connects as (table owner, superuser, `BYPASSRLS`), and whether connections are pooled (a driver pool, a transaction-mode proxy).
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Isolation model

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Each new store or service states its model, silo, pool or bridge [O] | A plan adds a store with no stated model; a diff treats a shared table as isolated because "each tenant has its own rows" | Single-tenant products; internal tools with one organisation |
| A tier sold with dedicated resources reaches them on every path [O] | A routing table, resource lookup or new store that sends a dedicated-tier tenant to the pool; a tier change with no step that moves its data | One tier only |
| A configuration every tenant shares changes every tenant at once [T] | A per-tenant need met by editing the shared template, base policy or schema, so one tenant's change reaches all of them | Silo deployments with one configuration each |

## Tenant context

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The tenant comes from the authenticated identity, never from client input; a well-formed tenant id does not prove the caller belongs to it [T] | A shared resolver, middleware or base handler that takes the tenant from the body, path, query or a client-set header, so every path trusts it | One handler doing so (security's); admin tools authorised across tenants, with that check present |
| The tenant survives every asynchronous hop [T] | A job, message, event or scheduled task that drops the tenant, so the consumer runs unscoped or with a default | Work that is global by design and says so |
| A Postgres `SET` lasts for the session, so on a pooled connection the next client inherits it; `SET LOCAL` and `set_config(..., true)` end with the transaction [R] | `SET app.tenant_id` or `set_config('app.tenant_id', ..., false)` on a pooled connection | No pooling; the setting is reset on every checkout |
| `SET LOCAL` outside a transaction only warns, so the setting never applies [R] | `SET LOCAL` issued in autocommit, with no `BEGIN` or transaction block around the queries that rely on it | Code that always runs it inside a transaction |

## Enforcement where data is read

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A table's owner bypasses row-level security unless the table has `FORCE ROW LEVEL SECURITY`; superusers and `BYPASSRLS` roles always bypass it [R] | `ENABLE ROW LEVEL SECURITY` without `FORCE` while the application connects as the owner; an application role made superuser or given `BYPASSRLS`; a new pooled tenant table with row-level security not enabled | Silo databases; tables with no tenant data |
| A policy whose sub-SELECT reads another table can see a stale row under READ COMMITTED; `FOR SHARE` in the sub-SELECT is the documented fix [R] | A new or changed policy that checks a membership or permission table that can change concurrently, with no `FOR SHARE` in the sub-SELECT | A policy that compares only a column with the session setting |
| One predicate on every path [T] | A service-role, admin or "unscoped" client, a raw query, a view, a join or an aggregate that skips the default scope or the policy the other paths rely on | A documented bypass with its own tenant filter |
| Keys and uniqueness include the tenant [T] | A unique constraint, deduplication key, search document id or partition key without the tenant, so two tenants collide or overwrite each other | Ids unique by construction that are never looked up without the tenant |
| Where the design isolates with IAM, IAM session tags and an `aws:PrincipalTag` condition tie the session to one tenant's resources [R] | A per-tenant role session assumed with no tenant session tag, or a resource policy with no condition comparing the resource with the caller's tenant tag | Designs that do not use IAM for isolation |

## Shared resources

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Cache keys, object-storage prefixes, temporary files and search indexes carry the tenant [T] | `cache.get(userId)`, an upload path with no tenant segment, one search index filtered only when documents are written | Data identical for every tenant |
| Derived copies are filtered when they are read [T] | Search results, embeddings, previews or exports that trust the filter applied when they were written; an export or backup job whose selection can include other tenants | Copies rebuilt from the scoped source on every read |
| Tenant content stays out of sinks whose readers span tenants [T] | Request or response bodies sent to a shared log group, analytics stream or error tracker that tenant-facing staff or tenants read | Logs read only by operators under an intended policy |

## Noisy neighbours

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Shared capacity has a per-tenant throttle or quota, set in the calling layer (`REL05-BP02` in `aws-well-architected`; fair queues in `aws-messaging`) [T] | A public API or agent endpoint on a shared pool with only a global rate limit | Silo tenants; low, even load |
| Heavy tenants or job types do not share one queue or pool with everyone (the tenant case of `REL10-BP03`) [O] | One queue or concurrency pool for every tenant's bulk jobs, so one import starves the rest | Volume where tenants never compete |

## Cost and lifecycle

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A costly path records consumption per tenant when the plan bills or caps per tenant [O] | A metered call (model calls, egress, storage) with no tenant dimension, so the cap cannot be enforced | No per-tenant pricing or cap |
| Onboarding is one automated path that creates every per-tenant resource [O] | A new per-tenant prefix, key, queue or index created by hand or outside the onboarding code | Pool-only resources |
| Offboarding and deletion reach every store, including derived and queued copies [T] | A new store, cache, index or export with no step in the deletion path; queued retries that recreate deleted data; a new read path that ignores the soft-delete marker; a restore that brings back deleted data or removed members; a removed member still authorised by a cached membership or a queued job | No deletion promise; data kept by law |
| Migrations do not default the tenant [T] | A backfill that leaves old rows with a null or default tenant, or old and new readers that apply different defaults during a rollout | New tables with no existing data |

## Not a finding

- A product that is not multi-tenant, or a pool with no row-level security, by itself: a finding is a change that breaks the model the design states.
- One handler that trusts a tenant id from the request: report it to security, not here.
- `SET` of the tenant on a connection that is not pooled, or one reset on every checkout.
- A cache key or index with no tenant for data identical for every tenant, such as a public catalogue.
- A cross-tenant admin path with its own authorisation and a stated reason.
