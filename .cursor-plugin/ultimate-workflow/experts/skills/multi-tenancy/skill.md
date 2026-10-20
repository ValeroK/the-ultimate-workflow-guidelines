---
name: multi-tenancy
description: Use when a change serves more than one customer from shared data or resources, for the isolation model, tenant context, enforcement and tenant lifecycle.
---

# Multi-tenancy

Use this when a change or plan touches data or resources that more than one customer shares: tenant ids, row-level security, per-tenant keys, prefixes, queues or limits. Tenancy is the architect's: where isolation is enforced and whether every path goes through it. An authorisation bug in one handler is the security expert's; a store's own mechanics are the data expert's.

Sources: **[C]** Cloudflare's data-isolation audit guide, **[S]** Supabase's row-level security references, **[K]** AWS's agent toolkit, **[L]** the names of the AWS SaaS Lens principles and isolation models (the lens itself was not reachable), **[O]** our own reasoning, stated as such. A design that is not multi-tenant, or has no row-level security, is never a finding by itself: a finding is a change that breaks the model the design states.

## Isolation model, chosen per service

| Rule | What breaks it | When it does not apply |
|---|---|---|
| Each new store or service states its model: silo (its own resources per tenant), pool (shared, with the tenant on every row, item, key or object), or bridge (mixed by layer) [L] | A plan adds a store with no stated model; a diff treats a shared table as isolated because "each tenant has its own rows" | Single-tenant products and internal tools with one organisation |
| A shared configuration is a shared blast radius [K] | One shared template, base policy or schema migration changes every tenant at once, with no staged rollout | Silo deployments with one configuration each |

## Tenant context

| Rule | What breaks it | When it does not apply |
|---|---|---|
| The tenant comes from the authenticated identity (a token claim, the session), never from the request body, path or a header the client sets [C, L]. A well-formed tenant id is not proof the caller belongs to it [K] | A handler that scopes data by `tenantId` from the body or a query parameter | Admin tools authorised across tenants, with that check present |
| The tenant survives every asynchronous hop [C] | A job, message, event or scheduled task that drops the tenant, so the consumer runs unscoped or with a default | Work that is global by design and says so |
| Database session context is per transaction, not per pooled connection [O] | `SET app.tenant_id` or a session-level `set_config` on a pooled connection, so the next request inherits the last tenant | No pooling, or `SET LOCAL` inside the transaction |

## Enforcement where data is read

| Rule | What breaks it | When it does not apply |
|---|---|---|
| Postgres tables in a pool are protected by row-level security that is enabled and forced [S] | `ENABLE ROW LEVEL SECURITY` without `FORCE` while the application connects as the table owner; a new tenant table with no policy | Silo databases; tables with no tenant data |
| One predicate on every path [C] | A service-role, admin or "unscoped" client, a raw query, a view, a join or an aggregate that skips the default scope or the policy the other paths rely on | A documented bypass with its own tenant filter |
| Keys and uniqueness include the tenant [C] | A unique constraint, deduplication key, search document id or partition key without the tenant, so two tenants collide or overwrite each other | Ids unique by construction that are never looked up without the tenant |
| Where the design isolates with IAM, the policy ties the resource to the tenant [O] | A per-tenant role with no session tag, or a policy that does not compare the resource with the caller's tenant tag | Designs that do not use IAM for isolation |

## Shared resources

| Rule | What breaks it | When it does not apply |
|---|---|---|
| Cache keys, object-storage prefixes, temporary files and search indexes carry the tenant [C] | `cache.get(userId)`, an upload path with no tenant segment, one search index filtered only when documents are written | Data identical for every tenant |
| Derived copies are filtered when they are read [C] | Search results, embeddings, previews or exports that trust the filter applied when they were written | Copies rebuilt on every read |
| Logs and analytics carry the tenant id, and no tenant content where their readers span tenants [C, K, L] | Request bodies logged to a shared log group; analytics events with no tenant id | Logs read only by operators under an intended policy |

## Noisy neighbours

| Rule | What breaks it | When it does not apply |
|---|---|---|
| Shared capacity has a per-tenant throttle or quota (see `REL05-BP02` in `aws-well-architected`) [K] | A public API on a shared pool with only a global rate limit | Silo tenants; low, even load |
| Heavy tenants or job types do not share one queue or pool with everyone (bulkheads, `REL10-BP03`) [L] | One queue or concurrency pool for every tenant's bulk jobs, so one import starves the rest | Volume where tenants never compete |

## Cost and lifecycle

| Rule | What breaks it | When it does not apply |
|---|---|---|
| A costly path records consumption per tenant when the plan bills or caps per tenant [L] | A metered call (model calls, egress, storage) with no tenant dimension, so the cap cannot be enforced | No per-tenant pricing or cap |
| Onboarding is one automated path that creates every per-tenant resource [L] | A new per-tenant prefix, key, queue or index created by hand or outside the onboarding code | Pool-only resources |
| Offboarding and deletion reach every store, including derived and queued copies [C] | A new store, cache, index or export with no step in the deletion path; queued retries that recreate deleted data | No deletion promise; data kept by law |
| Migrations do not default the tenant [C] | A backfill that leaves old rows with a null or default tenant, or old and new readers that apply different defaults during a rollout | New tables with no existing data |
