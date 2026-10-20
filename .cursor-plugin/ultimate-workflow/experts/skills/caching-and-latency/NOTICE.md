# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| aws/agent-toolkit-for-aws, `amazon-elasticache` skill and its `rds-acceleration`, `production-readiness` and `data-modeling` references (2026) | Apache-2.0 | Missed invalidations, stampede guards, keys including the tenant, the cache as optional, ElastiCache Serverless eviction, hash tags and CROSSSLOT, `SCAN` over `KEYS` |
| aws/agent-toolkit-for-aws, `cloudfront` skill and its `when-to-use-cloudfront` reference (2026) | Apache-2.0 | The minimum TTL overriding origin cache headers, cache policies, API paths in the default behaviour, uncached requests reaching the origin |
| affaan-m/ECC, `redis-patterns`, `latency-critical-systems`, `content-hash-cache-pattern` | MIT | The eviction policy table, no-TTL keys, stampedes, `KEYS`, mapping each hop of the hot path, keys that hold every input |

Not taken, because they were wrong or would mislead: the toolkit's stampede helper (its waiters fall through to the database after a fixed wait, and its lock release is not atomic), ECC's lock with no fencing token and its claim that write-through gives strong consistency, the toolkit's "Multi-AZ and replicas required" defaults, and vendor benchmark figures. Rows marked [O] are our own reasoning and say so.

Facts marked [T] were not yet checked against AWS's developer guides when the skill was written.
