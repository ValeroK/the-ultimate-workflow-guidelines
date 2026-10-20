---
name: caching-and-latency
description: Use when a change adds a cache, a CDN or a latency target.
---

# Caching and latency

Use this when a change adds or changes a cache (Redis, Valkey, ElastiCache, an in-process cache), a CDN (CloudFront) or cache headers, or a latency target. A cache is a second copy of data with its own failure modes; most of them show up as wrong answers, not errors.

Each fact carries its source: **[G]** an AWS developer guide as AWS last published it on GitHub (2022 or 2023); **[T]** an AWS or community skill (2026), not yet checked against the current guide; **[O]** our own reasoning, stated as such. When a decision turns on a [T] fact, fetch the current page and say what you found.

## Correctness first

| Rule | What breaks it in a change | When it does not apply |
|---|---|---|
| Every write path invalidates or updates what it changes | A new write path (an admin endpoint, a batch job, a migration, a second service) changes cached data and neither deletes nor updates the key [T] | Data cached by TTL only, where the plan accepts the TTL as the stale window |
| Delete-after-commit can still leave stale data | A reader misses, loads the old row, the writer commits and deletes the key, then the reader writes the old value back; it stays until the TTL [O] | A short TTL the plan accepts, or keys written only by the writer |
| Write-through is not strong consistency | A plan that relies on the cache matching the database right after a write: the database write and the cache write are two operations, so a failure or a concurrent write between them leaves them disagreeing [O] | A cache treated as advisory |
| The key holds every input that changes the result | A key without the tenant, the user, the locale, a parameter or a config version, so one caller's result is served to another [T] | Results that genuinely do not vary |
| A cache is optional | A cache error that fails the request; a cache client with no connect or command timeout; a client built per request [T] | A store that holds the only copy, which is not a cache |

## Expiry and load

| Rule | What breaks it | When it does not apply |
|---|---|---|
| TTL is a freshness decision | A key written with no TTL; a TTL longer than the staleness the plan allows [T]; many keys written together with one TTL, so they all expire at once [O] | Reference data with explicit invalidation |
| One recompute per hot key | A hot or expensive key with a fixed TTL and no single-flight guard; a lock whose waiters give up after a fixed wait and query the database anyway, which brings the herd back; a lock held inside one process while several instances run [T] | Cheap reads, or a database that can take the full miss rate |
| The miss path fits the deadline | A plan that budgets only the cache hit, when a cold miss (cache, database, write-back) must also fit the caller's timeout [T] | Callers with no deadline |
| No blocking scans on a request path | `KEYS`, or `SMEMBERS` on a large set; use `SCAN` or `SSCAN` [T] | Offline tooling |

## Redis and ElastiCache

| Rule | What breaks it | When it does not apply |
|---|---|---|
| The eviction policy matches what is stored | Queues, locks or sessions on an instance with `allkeys-lru`, so they are evicted; a pure cache on `noeviction`, which fails writes when memory is full [T] | A dedicated cache instance |
| ElastiCache Serverless evicts only keys that have a TTL [T] | Keys without a TTL on Serverless, which fill it until writes fail | Node-based clusters on `allkeys-lru` |
| Multi-key operations in cluster mode need hash tags, and hash tags put a whole key group on one shard [T] | An `MGET` or transaction across keys with no hash tag (a CROSSSLOT error); one large tenant's keys hash-tagged onto a single shard | Single-key access, or cluster mode off |

## CloudFront

| Rule | What breaks it | When it does not apply |
|---|---|---|
| A minimum TTL above zero overrides the origin's `no-cache`, `no-store` and `private` [G] | A cache behaviour with a minimum TTL above zero in front of per-user responses | Purely static origins |
| Cache rules live in a cache policy, and API paths have their own behaviour | TTLs or the cache key set outside a cache policy; an `/api/*` path that falls into the long-TTL default behaviour [T] | |
| A CDN does not protect an origin from requests it never caches | A plan that counts on CloudFront to absorb load on an uncached API with no throttling at the origin [T] | |

Not covered yet, for lack of a checked source: CloudFront invalidation cost and limits, which headers, cookies or `Authorization` enter the cache key, and ElastiCache failover timing.
