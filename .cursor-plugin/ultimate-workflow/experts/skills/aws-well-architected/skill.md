---
name: aws-well-architected
description: Use when a change adds or changes AWS infrastructure or a call to an AWS service - the Well-Architected practices a diff can show that no narrower skill holds (recovery strategy, fault isolation, health checks, backups, long work in Lambda, data-path and capacity costs), with their best-practice IDs.
verified: 2026-10-21
requires: AWS Well-Architected Framework pillars of November 2024 (Cost Optimization June 2024); Lambda Managed Instances and durable functions as of 2026
---

# AWS Well-Architected, as it shows in a diff

## Goal

- **Lets the expert catch:** infrastructure that looks finished but cannot meet the recovery strategy the plan claims, keeps a failing instance in service, has no backup for data that cannot be rebuilt, puts work longer than Lambda allows into one invocation, or pays per GB for traffic that could be free.
- **Applies to:** Terraform, CloudFormation, SAM, CDK and Serverless Framework resources for VPC routing and endpoints, Auto Scaling groups, databases and stores, log groups and buckets, EC2 instance types, Lambda timeouts and invocations; plan wording about availability, recovery or failover.
- **Not for:** event source mappings and concurrency caps (`lambda-event-sources`); queue, topic and bus settings (`aws-messaging`); workflow choice, Standard against Express (`step-functions`); throttling, REST against HTTP APIs (`api-gateway`); cache invalidation (`caching-and-latency`); per-tenant bulkheads (`multi-tenancy`); queries and indexes (data); deploy strategy, rollback alarms, feature flags, immutable deploys (devops, `release-safety`, `pipelines-and-deploys`); in-process retries (developer, `failure-handling`); IAM, encryption, network exposure (security); the Generative AI lens (genai).

Sources: **[R]** the maintainer's live check of docs.aws.amazon.com and aws.amazon.com pricing (Well-Architected research 2026-10-20; architect fact-check items 1 and 47, 2026-10-20 and 2026-10-21); **[D]** the EC2 and EC2 Auto Scaling user guides as published in the awsdocs repositories (2023 snapshots); **[T]** an AWS agent skill (2026), not checked; **[O]** our own reasoning. Best-practice IDs and titles are from the Well-Architected appendix as fetched in the maintainer's research; they are citations, and a row's tag covers its rule. Prices are US East and change: when a decision turns on the exact figure, check the current pricing page with your web tool and say what you found. A [T] or [O] row is a prompt to check, not a finding on its own. Cite the ID in a finding or constraint (for example `REL13-BP02`).

## First, establish the target

- **The availability and recovery target** the plan states, and the recovery strategy it implies. At plan, ask for it if missing; at review, do not invent one.
- **The workload's criticality and environment:** production, staging, sandbox. A rule calibrated to a target does not apply without one.
- **The IaC policy checks the repository runs** (a Checkov, cfn-lint, cfn-guard or tflint configuration, or a CI step), so you do not repeat what they already report.
- **Where the settings live:** a stack or module in the repository, or a shared network or account baseline it cannot show; say what you could not see.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Recovery and fault isolation

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `REL13-BP02` The infrastructure matches the recovery strategy claimed: backup and restore (RPO hours, RTO up to 24 hours), pilot light (RPO minutes, RTO tens of minutes), warm standby (RPO seconds, RTO minutes), multi-site active-active (RPO near zero, RTO potentially zero) [R] | A plan claiming warm standby whose secondary Region has no running capacity; active-active over a single-Region database | No recovery target stated |
| `REL10-BP01` A store or service the target needs in several places is deployed in several [O] | `multi_az = false`, one subnet or one zone for a production database or service whose stated target needs more | Development, sandbox, or a target that allows one zone |
| `REL10-BP03` Unrelated work does not share one queue, connection pool or concurrency pool [O] | A new kind of work added to an existing queue or pool, so a flood of one starves the other | Low volume where the two never compete; tenants (`multi-tenancy`) |
| `REL11-BP04` Failover switches what is already provisioned, through the data plane [O] | Failover code that calls create, update or scale APIs during the outage | No automated failover in scope |
| `REL11-BP05` Failover does not depend on scaling up from zero at the moment of failure [O] | A standby zone or Region at zero capacity with a target that cannot absorb the scale-up time | A target that allows the scale-up time |
| `REL09-BP01` Data that cannot be recreated is backed up [O] | A new stateful store with `backup_retention_period = 0` or point-in-time recovery off | Caches and data rebuilt from another source |
| `REL07-BP02` An Auto Scaling group behind a load balancer replaces instances the load balancer sees failing: by default the group uses only EC2 status checks [D] | A new or changed group with a target group and no `health_check_type = "ELB"` (`HealthCheckType: ELB`): an instance failing every request stays in service | A group with no load balancer |

## Boundaries and long work

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `REL01-BP03` Work that can outlast one invocation leaves it: an on-demand Lambda invocation runs at most 900 seconds; Lambda Managed Instances run asynchronous and event source mapping invocations up to 90 minutes [R]; a durable function runs up to a year, each invocation still at most 15 minutes [R] | A handler looping over an unbounded batch or waiting on slow work with no bound below the limit that applies to how it is invoked | Work bounded well below the limit, with the bound stated |
| `REL05-BP05` A function's timeout is set for its slowest dependency; Lambda's default is 3 seconds [T] | A new function calling a database or third-party API with no timeout set | A function with only fast, local work |
| `REL04-BP02` Functions are not chained by synchronous invokes; orchestrate with a state machine or decouple with events (Serverless Lens) [R]. The waiting function is billed and holds concurrency for the whole call [O] | `InvocationType: RequestResponse` (or a plain `invoke`) from one function to another on a request path | One call whose answer the caller cannot respond without, and short |
| `REL05-BP01` A non-critical dependency degrades the response instead of failing it [O] | A recommendations, analytics or enrichment call whose error fails the whole request | A dependency the response cannot be formed without |
| `OPS08-BP04` A production dead-letter queue has an alarm on `ApproximateNumberOfMessagesVisible` with an action [R] | A `RedrivePolicy` added with no alarm on the dead-letter queue, or an alarm with no `AlarmActions` | Alarms defined in another repository the change cannot see (say so) |

## Data paths and capacity cost

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `COST08-BP03` S3 and DynamoDB traffic from private subnets uses a gateway endpoint: a NAT gateway charges about $0.045 per GB processed on top of its hourly charge, gateway endpoints exist only for S3 and DynamoDB and cost nothing, interface endpoints charge per ENI hour and per GB [R] | Private route tables reaching S3 or DynamoDB through a NAT with no gateway endpoint; an interface endpoint for S3 where a gateway endpoint fits | Access from on premises, a peered VPC in another Region or through Transit Gateway, which gateway endpoints do not serve [R] |
| `COST08-BP02` High-volume pairs do not cross zones for no reason: cross-zone data in one Region costs about $0.01 per GB in each direction [R] | A chatty service pair, or an instance and its database, pinned to different zones | Replication and load balancing the availability target requires |
| `COST04-BP05` Logs and temporary objects state how long they are kept; a log group with no retention never expires [R] (CloudWatch Logs guide, checked 2026-10-22) | A new log group with no `retention_in_days` (`RetentionInDays`); a bucket of temporary objects with no lifecycle rule | Data the business must keep; record expiry in a table (data) |
| `COST06-BP02` A burstable instance fits spiky, mostly idle load: T4g, T3a and T3 launch in unlimited mode by default, so sustained load is billed for surplus credits [D] | A new T-family instance for steady high load, with no `credit_specification` | Spiky, mostly idle load |

## Not a finding

- Not on Graviton, no dashboard, no tags, or a single Region on its own: name the failure or the cost at the stated target, or drop it.
- A vendor headline figure ("up to 40 percent better price performance"): a maximum for chosen workloads, not a property of the change.
- A practice the framework lists that is process or organisation (reviews, game days, KPIs): no diff shows it.
- A NAT gateway carrying traffic to third-party internet APIs that have no endpoint option.
