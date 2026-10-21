# Architect fact-check, items 35 to 74 (block A), reply of 2026-10-21

The rest of the architect's round-2 check (`docs/research/fact-checks-to-run-2026-10-21.md`, block A); items 1 to 34 are in `architect-2026-10-20.md`. Facts are restated, not copied.

**How it was read.** No claim is marked "snippet only", and each one gives a page and a short quote, so by the shared rule this counts as the maintainer's live check [R]. One doubt: items 69 and 74 failed because the "search call limit" was reached. That suggests the session searched rather than browsed, and some quotes may come from snippets it did not mark. Where a quote carries only part of a claim, only that part is confirmed.

## Results

| # | Claim asked | Status | What holds |
|---|---|---|---|
| 35 | A Task state has no default timeout | **different** | `TimeoutSeconds` defaults to 99,999,999 s, longer than a Standard execution's year, so in practice there is no bound; an HTTP Task is capped at 60 s |
| 36 | `Choice` with no match and no `Default` fails with `States.NoChoiceMatched` | confirmed | states-language.net |
| 37 | Retries are state transitions and are billed | confirmed | Standard workflows; Express bills by count, duration and memory |
| 38 | Map tolerates failures only through `ToleratedFailurePercentage`/`Count`, then `States.ExceedToleratedFailureThreshold` | confirmed | Distributed Map only; an inline Map has neither field |
| 39 | A retrier's count resets when the execution moves to another state | **not confirmed** | only the redrive reset to 0 was found; dropped |
| 40 | `StartExecution` without `.sync` returns when the child starts | confirmed | Request Response proceeds at once |
| 41 | Start-rate quotas | **sources disagree** | the quotas table gives Standard 1,300 bucket / 300 per s (largest Regions), 800 / 150 elsewhere, Express 6,000 / 6,000; the welcome page says 2,000 and 100,000 per s. No skill number; not checkable in a diff |
| 42 | Standard history kept 90 days | confirmed | |
| 43 | Express history only in CloudWatch Logs with logging on | confirmed | |
| 44 | JSONata `Assign` and `Output` run in parallel; an `Assign` result is not visible in the same state's `Output` | confirmed | |
| 45 | A JSONata expression that is undefined fails with `States.QueryEvaluationError` | confirmed | |
| 45a | On a matched `Catch`, the state's own `Assign` is skipped and the output is the error object | **different** | only that `$states.errorOutput` is available in the `Catch`'s own `Assign` and `Output` was found |
| 45b | Retry `Lambda.ServiceException`, `Lambda.AWSLambdaException`, `Lambda.SdkClientException` | confirmed | the best-practice example uses 2 s, 6 attempts, backoff 2; the CDK `LambdaInvoke` adds a retry by default (`retryOnServiceExceptions`) |
| 46 | A Standard execution name cannot be reused for 90 days | confirmed | Express names can be reused at once; a running Standard execution with the same name and input returns 200 |
| 47 | Lambda durable functions run up to a year on Python 3.13, Node.js 22, Java 17, .NET 8 | **different** | the year is confirmed; the runtime list is wider (also Node.js 24, Python 3.14, Go, Rust, OCI images) and the version floor was not found; each invocation is still at most 15 min |
| 48 | Temporal: unlimited activity attempts by default; 2 MB payload | confirmed | Temporal docs; plus a 4 MB gRPC limit per request (extra 7) |
| 49 | REST integration timeout can be raised above 29 s, to 300, for Regional and private only | **different** | the raise for Regional and private REST APIs is confirmed (AWS Knowledge Center); 300 s was not found; the quotas table still says not raisable. Edge-optimized REST and HTTP APIs are not eligible |
| 50 | Lambda keeps running after API Gateway returns 504 | secondary only | AWS re:Post answer; stays [T] |
| 51 | Two plans for one key on one stage resolve non-deterministically | **different** | a key can be in only one usage plan per stage; the rest not found |
| 52 | Throttling is best-effort; opt-in Regions 2,500 RPS / 1,250 burst | confirmed | usage-plan throttles and quotas are not hard limits |
| 53 | A deployment flushes the cache; 1 MB max; GET only by default | **different** | 1 MB and GET only confirmed; the flush was not found |
| 54 | WebSocket: 128 KB message, 32 KB frames, 2 h connection, 10 min idle | confirmed | |
| 55 | HTTP APIs do not stream responses; REST APIs do | confirmed | |
| 56 | Edge-optimized endpoints route through CloudFront but do not cache | **different** | routing through the nearest CloudFront POP confirmed; "do not cache" not found |
| 57 | INFO logging: many events per request; 1,024-byte truncation | **different** | truncation at 1,024 bytes confirmed (data tracing allows 1 MB); the event count not found |
| 57a | Compressed payloads are decompressed before the integration | confirmed in part | decompression before the mapping template and the integration; the 6 MB Lambda point is not on that page |
| 57b | A cache hit is billed as a request | confirmed | API Gateway FAQ |
| 58 | Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY`; superusers and `BYPASSRLS` always | confirmed | |
| 59 | `SET` lasts for the session; `SET LOCAL` and `set_config(..., true)` for the transaction | confirmed | `SET LOCAL` outside a transaction only warns |
| 60 | Session tags and `aws:PrincipalTag` tie a session to a tenant's resources | confirmed | |
| 61 | SaaS Lens isolation models and their definitions | confirmed in part | the quote supports the bridge model only; not checkable in a diff |
| 62 | ElastiCache Serverless uses `volatile-lru` and cannot change it | **different** | `volatile-lru` as the ElastiCache default confirmed; "Serverless cannot change it" not found |
| 63 | Node-based parameter groups default to `volatile-lru` | confirmed | |
| 64 | Cluster mode: cross-slot multi-key commands fail with `CROSSSLOT`; hash tags fix it | confirmed | |
| 65 | Serverless `CacheUsageLimits` for storage and ECPU per second | confirmed | |
| 66 | Global Datastore cross-Region failover is a manual promotion | confirmed | Multi-AZ failover within a Region is automatic |
| 66a | Replica and Serverless read-port reads are eventually consistent | confirmed | |
| 66b | RDS and ElastiCache events are operational, not data changes | confirmed | |
| 66c | `KEYS` scans the whole keyspace in one call; use `SCAN` | confirmed | redis.io |
| 67 | ElastiCache refuses `CONFIG`, `SAVE`, `BGSAVE`, `DEBUG` and similar | confirmed | also `bgrewriteaof`, `migrate`, `replicaof`, `slaveof` |
| 68 | Stale objects served on origin error unless `stale-if-error=0` | **different** | `stale-if-error` support confirmed; the minimum-TTL and `=0` detail not found |
| 69 | Invalidation: 1,000 free paths a month; 3,000 files or 15 wildcards in progress | not reached | |
| 70 | Cache-policy headers are in the key and forwarded; others only via an origin request policy | confirmed in part | the split between the two policies confirmed; "also forwarded" not quoted |
| 71 | CloudFront Functions run only on viewer request and response | **different** | they also run during the TLS handshake (connection functions for viewer mTLS); no network access is stated in the reply's checks, not quoted |
| 72 | The cache policy holds TTLs and key; the default behaviour is matched last | confirmed in part | default behaviour last confirmed; the first half not quoted |
| 73 | Tenants split across connection groups contain a fault | confirmed in part | custom connection groups exist to isolate tenants; the fault claim not quoted |
| 74 | Global Accelerator against CloudFront | not reached | |

## Extra facts from the same pages

1. `States.ALL` cannot catch `States.DataLimitExceeded` or runtime errors; they must be named.
2. `States.TaskFailed` matches every known error except `States.Timeout`.
3. A Task cannot set both `TimeoutSeconds` and `TimeoutSecondsPath` (likewise heartbeat, and Distributed Map's `MaxConcurrency`).
4. Express workflows do not support `.sync`, `.waitForTaskToken`, Distributed Map or Activities.
5. Cross-account `.sync` polls `DescribeExecution` and uses the account's quota.
6. JSONata strings must start with `{%` and end with `%}` with no outer spaces; `$eval` is banned.
7. Temporal enforces a 4 MB gRPC limit per request across all payloads in a workflow task.
8. API Gateway reserves `/ping` and `/sping` at the root of custom domains.
9. A row-level security policy with a sub-SELECT can see a stale row under READ COMMITTED; `FOR SHARE` in the sub-SELECT is the documented fix.
10. ElastiCache Serverless for Valkey 9 or later can be created with `ConnectionType: public`, and that cannot be changed later.

## Our assessment

- **28 confirmed, 5 confirmed in part, 13 different, 1 secondary only, 1 not confirmed, 1 where the sources disagree, 2 not reached.**
- **Item 35 changes a rule's wording, not its effect:** a Task with no `TimeoutSeconds` still has no practical bound. The fact is now "99,999,999 s".
- **Item 49 is a real conflict between AWS pages.** The skill can say a timeout above 29 s needs a Regional or private REST API and a raised quota, and that it is refused on edge-optimized REST and HTTP APIs. It must not name 300 s.
- **Item 41 stays out.** It is not checkable in a diff, and AWS's own pages disagree.
- **Several "different" items only lost a clause** (51, 53, 56, 57, 62, 68). The confirmed half can be a row; the missing half stays out.

## Changes this drives

- `step-functions`, `api-gateway`, `caching-and-latency`, `multi-tenancy`, `aws-well-architected`: Phase 3 rows from the confirmed items and extras, each tagged [R]; anything confirmed only in part carries only that part.
