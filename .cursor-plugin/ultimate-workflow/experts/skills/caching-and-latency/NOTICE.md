# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| Amazon CloudFront developer guide, as published in the awsdocs GitHub repository | 2022 to 2023 snapshot, re-read 2026-10-20 | AWS documentation | The fact marked [D]: a minimum TTL above zero overriding the origin's cache headers |
| docs.aws.amazon.com: ElastiCache parameter groups, cluster mode, Serverless usage limits, Global Datastore, replication, restricted commands; RDS events; CloudFront cache key and origin request policies, cache behaviours, CloudFront Functions | Checked live by the maintainer, 2026-10-21 (architect fact-check, block A, items 62 to 72) | AWS documentation | Every fact marked [R] |
| aws/agent-toolkit-for-aws, `amazon-elasticache` skill and its `rds-acceleration`, `production-readiness` and `data-modeling` references | 2026, read 2026-10-20 | Apache-2.0 | Missed invalidations, stampede guards, keys that hold every input, the cache as optional; marked [T] |
| aws/agent-toolkit-for-aws, `cloudfront` skill and its `when-to-use-cloudfront` reference | 2026, read 2026-10-20 | Apache-2.0 | Uncached requests reaching the origin; marked [T] |
| affaan-m/ECC, `redis-patterns`, `latency-critical-systems`, `content-hash-cache-pattern` | Read 2026-10-20 | MIT | No-TTL keys, stampedes, the hop budget behind the miss path, keys that hold every input; marked [T] |

Left out, and why:

- Wrong as given: the toolkit's stampede helper (its waiters fall through to the database after a fixed wait, and its lock release is not atomic), ECC's lock with no fencing token, the claim that write-through gives strong consistency, the toolkit's "Multi-AZ and replicas required" defaults, and vendor benchmark figures.
- Not confirmed by the live check: that ElastiCache Serverless cannot change its eviction policy (item 62); the minimum-TTL and `stale-if-error=0` detail of serving stale objects (68); invalidation pricing and in-progress limits (69, not reached); that cache-policy values are also forwarded (70); that CloudFront Functions have no network access (71); that TTLs live only in the cache policy (72); Global Accelerator against CloudFront (74, not reached).
- Another owner: Redis as a queue, lock or session store, blocking commands such as `KEYS` and lock TTLs (data); Redis Pub/Sub (`aws-messaging`); the tenant in a key and CloudFront connection groups (`multi-tenancy`); API Gateway's cache and its billing (`api-gateway`); a public Serverless endpoint and encryption (security).
- Fails the value test: `KEYS` blocking the server (a strong reviewer knows it), Serverless snapshots, client timeout figures, tagging.
