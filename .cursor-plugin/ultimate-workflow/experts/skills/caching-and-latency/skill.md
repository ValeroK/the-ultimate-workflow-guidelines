---
name: caching-and-latency
description: Use when a change adds or changes a cache (Redis, Valkey, ElastiCache, an in-process cache), a CDN (CloudFront) or its cache headers and policies, or a latency target - stale or wrong answers, expiry and stampedes, the miss path, and the managed services' defaults.
verified: 2026-10-21
requires: ElastiCache node-based clusters or Serverless; CloudFront cache policies and origin request policies as of 2026
---

# Caching and latency

## Goal

- **Lets the expert catch:** a cache that serves wrong answers without an error (a write path that never invalidates, a key missing an input, a read-your-write sent to a replica, a CDN key that ignores what the origin varies on), a cache that turns a miss into an outage (no timeout, a stampede, a miss path that overruns the deadline), and a managed-service default the change silently relies on.
- **Applies to:** Redis, Valkey and ElastiCache clients and resources (`AWS::ElastiCache::*`, `aws_elasticache_*`), in-process caches (`lru_cache`, `@cache`), `Cache-Control` and `s-maxage`, CloudFront distributions, behaviours, cache and origin request policies and functions, and plan lines that set a latency target or call a store "cached".
- **Not for:** Redis holding a queue, a lock or a session store, its blocking commands and lock release (data); Redis Pub/Sub against Streams (`aws-messaging`); the tenant in a cache key (`multi-tenancy`); API Gateway's own cache (`api-gateway`); encryption, auth and public endpoints on a cache or distribution (security); how the catch around a cache call is written (developer).

Sources: **[D]** the Amazon CloudFront developer guide as published in the awsdocs repository (2022 to 2023 snapshot); **[R]** the maintainer's live check of the AWS documentation (2026-10-21); **[T]** AWS or community agent skills (2026), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The cache and its mode:** in-process, self-run Redis or Valkey, ElastiCache node-based (cluster mode on or off) or Serverless; and which endpoint the code reads from (primary or reader).
- **Every writer of the cached data,** including jobs, admin paths and other services you cannot see; say so when you cannot.
- **The staleness the plan accepts** and the caller's deadline. With neither stated, a TTL or a hit-only latency budget cannot be judged; ask.
- **For CloudFront:** each behaviour's path pattern, its cache policy and origin request policy, and what the origin's responses vary on (a user, a cookie, a header).
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Correctness

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Every write path invalidates or updates what it changes [T] | A new write path (an admin endpoint, a batch job, a migration, a second service) changes cached data and neither deletes nor updates the key | Data cached by TTL only, where the plan accepts the TTL as the stale window |
| RDS and ElastiCache event notifications report operational events, not data changes [R] | Invalidation driven by an RDS or ElastiCache event subscription, expected to fire when rows change | |
| Delete-after-commit can still leave stale data [O] | A reader misses and loads the old row, the writer commits and deletes the key, then the reader writes the old value back; it stays until the TTL | A short TTL the plan accepts, or keys written only by the writer |
| Write-through is not strong consistency [O] | A plan that relies on the cache matching the database right after a write: the two writes are separate operations, so a failure or a concurrent write between them leaves them disagreeing | A cache treated as advisory |
| Reads from an ElastiCache replica or the Serverless reader endpoint are eventually consistent with the primary [R] | A path that writes and then reads its own update (a profile save, a counter, a status check) pointed at the reader endpoint | Reads that tolerate lag |
| The key holds every input that changes the result [T] | A key without the user, the locale, a parameter or a config version, so one caller's result is served to another | Results that genuinely do not vary |
| A cache is optional [T] | A cache error that fails the request; a cache client with no connect or command timeout; a client built per request | A store that holds the only copy, which is not a cache |

## Expiry and load

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| TTL is a freshness decision [T]; keys written together with one TTL expire together [O] | A key written with no TTL; a TTL longer than the staleness the plan allows; a bulk load that gives every key the same TTL | Reference data with explicit invalidation |
| One recompute per hot key [T] | A hot or expensive key with a fixed TTL and no single-flight guard; a lock whose waiters give up after a fixed wait and query the database anyway, which brings the herd back; a guard held in one process while several instances run | Cheap reads, or a database that can take the full miss rate |
| The miss path fits the deadline [T] | A plan that budgets only the cache hit, when a cold miss (cache, database, write-back) must also fit the caller's timeout | Callers with no deadline |

## ElastiCache

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| ElastiCache's default `maxmemory-policy` is `volatile-lru`, node-based parameter groups included; it evicts only keys that have a TTL [R] | Cache keys written with no TTL on the default policy: nothing is evictable once memory fills, and writes fail | A cache whose every key has a TTL, or a parameter group set to an `allkeys-` policy for a pure cache |
| ElastiCache refuses `CONFIG`, `SAVE`, `BGSAVE`, `BGREWRITEAOF`, `DEBUG`, `MIGRATE`, `REPLICAOF` and `SLAVEOF` [R] | Code or a startup script that calls `CONFIG SET` (for example to set the eviction policy) or `BGSAVE` against a managed endpoint | Self-run Redis or Valkey |
| In cluster mode a multi-key command across slots fails with `CROSSSLOT`; a hash tag puts the keys in one slot [R], so a whole hash-tagged group lands on one shard [O] | An `MGET` or a transaction across keys with no shared hash tag; one large tenant's keys hash-tagged onto a single shard | Single-key access, or cluster mode off |
| Serverless takes `CacheUsageLimits` for data storage and ECPU per second [R]; without them nothing bounds its size or cost [O] | A new `AWS::ElastiCache::ServerlessCache` or `aws_elasticache_serverless_cache` with no usage limits | A plan that accepts unbounded spend |
| Global Datastore failover to another Region is a manual promotion; Multi-AZ failover within a Region is automatic [R] | A plan or runbook that counts on a Global Datastore failing over to another Region by itself | Single-Region recovery |

## CloudFront

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A minimum TTL above zero overrides the origin's `no-cache`, `no-store` and `private` [D] | A behaviour with a minimum TTL above zero in front of per-user or must-be-fresh responses | Purely static origins |
| Only what the cache policy names is in the cache key; other headers, cookies and query strings reach the origin through an origin request policy [R] | A header or cookie the origin varies its response on (`Authorization`, a session or locale cookie) forwarded by the origin request policy but absent from the cache policy, so one viewer's response is cached for all [O] | Responses that do not vary on what is forwarded |
| The default behaviour is matched last [R] | A new API or per-user path with no behaviour of its own, so it falls into the default behaviour and its long TTL | A default behaviour that does not cache |
| CloudFront Functions run on viewer request, viewer response and, as connection functions, the TLS handshake [R]; not on origin events | A CloudFront Function associated with an `origin-request` or `origin-response` event | |
| A CDN does not protect an origin from requests it never caches [T] | A plan that counts on CloudFront to absorb load on an uncached API with no throttling at the origin | |

## Excuses that do not hold

- "The TTL is short." The race in delete-after-commit and a key missing an input both serve wrong data for every second of it, to every caller who hits it.
- "The tests pass." They run one instance against a warm or empty cache with no concurrent writer: none of stale write-back, stampede or replica lag can show.

## Not a finding

- A cache with no invalidation for data the plan says may be stale for up to the TTL.
- A reader endpoint used by a path that never reads its own writes.
- Keys without a TTL on a parameter group whose policy is an `allkeys-` one and that holds only cache data.
- A minimum TTL above zero on a behaviour that serves only static assets.
