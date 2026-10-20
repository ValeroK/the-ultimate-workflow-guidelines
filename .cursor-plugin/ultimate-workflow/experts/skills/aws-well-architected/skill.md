---
name: aws-well-architected
description: Use when a change adds or changes AWS infrastructure or a call to an AWS service, for the recovery tiers, the practices a plan should turn into constraints, and verified AWS costs and limits.
---

# AWS Well-Architected, as it shows in code

Use this when a change touches AWS infrastructure (Terraform, CloudFormation, SAM, CDK, Serverless Framework) or code that calls AWS services. It holds the Well-Architected best practices that a plan or a diff can actually show, what each looks like in infrastructure code, and when it does not apply. Cite the best-practice ID in a finding or a constraint (for example `REL05-BP05`) so anyone can look it up.

This is not a checklist to complete. Most of the framework is about process and organisation, which no diff shows; those practices are left out. A practice is a finding only when the change breaks it and you can name the failure or the cost, at the workload's stated criticality. "Not on Graviton", "no dashboard", "no tags" or "single region" is never a finding by itself.

Out of scope here: the Security pillar (the security expert owns IAM, encryption, network exposure and secrets) and the Generative AI lens (a separate expert).

## Facts you may rely on

Checked against AWS pages on 2026-10-20. Prices are for US East and vary by Region and over time: when a decision turns on the exact number, fetch the pricing page again and say what you found.

| Fact | Source | What it changes |
|---|---|---|
| A NAT gateway charges about $0.045 per GB processed, on top of its hourly charge | VPC pricing page | Traffic from private subnets to AWS services through a NAT is paid per GB |
| Gateway VPC endpoints exist only for S3 and DynamoDB and cost nothing; interface endpoints (PrivateLink) charge per hour per ENI and per GB | VPC user guide, PrivateLink pricing | S3 or DynamoDB traffic through a NAT with no gateway endpoint pays for nothing |
| Data that crosses Availability Zones in one Region is charged about $0.01 per GB in each direction | VPC pricing page | A chatty pair of services split across zones has a running cost |
| A Lambda function can run for at most 900 seconds per invocation | Lambda quotas (confirmed through secondary sources) | Work that can exceed it does not belong in one invocation |
| An SQS event source mapping accepts `ScalingConfig.MaximumConcurrency`, with a minimum of 2 | Lambda API reference | The setting that caps how many function instances one queue can drive |
| The documented way to watch a dead-letter queue is a CloudWatch alarm on `ApproximateNumberOfMessagesVisible` | SQS developer guide | A dead-letter queue without it fills silently |
| Disaster recovery strategies and their bands: backup and restore (RPO hours, RTO up to 24 hours), pilot light (RPO minutes, RTO tens of minutes), warm standby (RPO seconds, RTO minutes), multi-site active-active (RPO near zero, RTO potentially zero) | Reliability pillar, REL13-BP02 | Turns "what is the availability target?" into a choice the infrastructure can be checked against |

Not relied on: vendor headline figures such as "up to 40 percent better price performance". They are maxima for chosen workloads, not a property of the change in front of you.

## Failure at each boundary

| Practice | What it looks like in the change | When it does not apply |
|---|---|---|
| `REL05-BP05` Set client timeouts | An HTTP, database or AWS SDK client built without connect and read timeouts; a Lambda `timeout` left at the 3-second default for slow I/O, or set above what the caller waits | A client whose library default is documented and short enough |
| `REL05-BP03` Control and limit retries | A retry loop with no maximum, retries with no backoff and jitter, retries stacked at several layers so one failure becomes many calls, SDK retry mode overridden to unbounded | One bounded retry inside a call that is already idempotent and cheap |
| `REL04-BP04` Make mutating operations idempotent | A queue consumer or POST handler with a side effect and no idempotency key or conditional write (`ConditionExpression`, a unique constraint) | A naturally idempotent write (a put of the same full record) |
| `REL05-BP04` Fail fast and limit queues | An unbounded in-memory queue, no connection-pool limit, a `maxReceiveCount` or retention so high a poison message retries for days | A queue whose backlog is the intended buffer, with an alarm on its age |
| `REL05-BP01` Graceful degradation | A hard dependency on a non-critical call (recommendations, analytics) that fails the whole request | A dependency the response cannot be formed without |
| `REL05-BP02` Throttle requests | A public endpoint with no API Gateway throttling, usage plan or WAF rate rule, in front of a dependency that cannot scale | Internal endpoints already limited by their only caller |
| `REL05-BP07` Emergency levers | A risky new path with no feature flag or kill switch to turn it off without a deploy | A change small enough to roll back in minutes |
| `REL04-BP02` Loosely coupled dependencies | A Lambda that invokes another Lambda synchronously and waits, or a chain of synchronous calls where one slow service stalls all callers. Orchestrate with Step Functions, or decouple with SQS, SNS or EventBridge (Serverless lens) | A single synchronous call the caller genuinely needs the answer to |

## Queues and asynchronous work

| Practice | What it looks like | When it does not apply |
|---|---|---|
| Dead-letter queue with an alarm (`OPS08-BP04`, `REL06-BP03`) | A queue with a `RedrivePolicy` but no alarm on the dead-letter queue's `ApproximateNumberOfMessagesVisible`; an alarm with no `AlarmActions` | None for a production dead-letter queue |
| Bound the consumer (`REL05-BP02`, `COST09-BP02`) | An SQS event source mapping with no `MaximumConcurrency` (or `maxConcurrency` in CDK) feeding a downstream that has a connection or rate limit (a relational database, a third-party API) | A fully elastic downstream (DynamoDB on demand, S3) |
| Long work outside one invocation (`REL01-BP03`) | A handler that loops over an unbounded batch or waits on slow work and can exceed 900 seconds; use Step Functions, AWS Batch or ECS | Work bounded well below the limit, with the bound stated |

## Fault isolation and recovery

| Practice | What it looks like | When it does not apply |
|---|---|---|
| `REL10-BP01` Multiple locations | A production database or service pinned to one Availability Zone (`multi_az = false`, one subnet) when the plan states an availability target that needs more | Development, sandbox and workloads whose stated target allows it |
| `REL10-BP03` Bulkheads | Unrelated work sharing one queue, one connection pool or one concurrency pool, so a flood of one starves the other | Low volume where the two never compete |
| `REL07-BP02` Replace what the load balancer sees failing | An Auto Scaling group behind a load balancer with no `health_check_type = "ELB"`: by default the group checks only EC2 status and scheduled events and ignores the load balancer's health checks (Auto Scaling guide, 2023), so an instance failing every request stays in service | Groups with no load balancer |
| `REL11-BP04` Recover through the data plane | Failover logic that calls control-plane APIs (create, update, scale) during an outage instead of switching what is already provisioned | No automated failover in scope |
| `REL11-BP05` Static stability | Failover that depends on scaling up from zero in the surviving zone or Region at the moment of failure | Workloads whose recovery target allows the scale-up time |
| `REL13-BP02` Match the stated recovery tier | The plan claims warm standby, but the secondary Region has no running capacity; or it claims active-active with a single-Region database | No recovery target stated: ask for one at plan, do not invent one at review |
| `REL09-BP01` Back up what cannot be recreated | A new stateful store with backups or point-in-time recovery off (`backup_retention_period = 0`, `point_in_time_recovery` off) | Caches and data rebuilt from another source |

## Change and deployment

| Practice | What it looks like | When it does not apply |
|---|---|---|
| `OPS06-BP03` Safe deployment strategies | A production Lambda alias, ECS service or CodeDeploy group deploying all at once, where canary, linear or blue/green is available | Systems with no live traffic, or where the repository has chosen otherwise on purpose |
| `OPS06-BP04` Automate rollback | A gradual deployment with no alarm wired to roll it back | Deployments a person watches by the documented process |
| `OPS05-BP03` Configuration outside code | An account id, endpoint, ARN or stage name hard-coded where the repository uses parameters, SSM or environment variables | Constants that never differ between environments |
| `REL08-BP04` Immutable infrastructure | A deployment that patches running instances in place by script | None for new work |

## Cost

| Practice | What it looks like | When it does not apply |
|---|---|---|
| `COST08-BP03` Gateway endpoints | Private subnets reaching S3 or DynamoDB through a NAT gateway with no gateway endpoint on their route tables | Access from on premises, a peered VPC in another Region or through Transit Gateway, which gateway endpoints do not support |
| `COST08-BP02` Avoid needless cross-zone traffic | A high-volume service pair, or a single instance and its database, placed in different zones for no availability reason | Multi-AZ replication and load balancing that the availability target requires |
| `COST04-BP05` Retention | A new log group with no `retention_in_days`, a bucket of temporary objects with no lifecycle rule, a table of expiring records with no TTL | Data the business must keep |
| `COST05-BP05` Fit the component to the load | A REST API where an HTTP API covers the features used; a Standard Step Functions workflow for high-volume, short, idempotent steps where Express fits | When a feature of the heavier option is used (REST API keys and usage plans; Standard's exactly-once and long runs) |
| `COST06-BP02` Size from data | T4g, T3a and T3 instances launch in unlimited credit mode by default (EC2 guide, 2023), so a busy burstable instance is billed for surplus credits; a new burstable instance for steady high load is a cost finding | Spiky, mostly idle load, which is what burstable instances are for |
| `COST09-BP03` Supply to demand | Always-on capacity sized for the peak in front of spiky load, with no scaling policy | Steady load, or capacity reserved on purpose |

## Performance and data access

| Practice | What it looks like | When it does not apply |
|---|---|---|
| `PERF03-BP04` Query performance | A DynamoDB `Scan` on a request path, a filter applied after reading a whole partition, a relational query on a new path with no index | Small, bounded tables and offline jobs |
| `PERF03-BP05` Caching | A cache added with no owner for invalidation, or a hot read path the plan says is latency-critical with none | Data read rarely or changed on every read |

## How to use it at each stage

- **Plan.** Ask for the availability target and pick the recovery tier with the user. Turn the practices the plan touches into constraints that name the resource and setting, such as "the order queue's dead-letter queue has an alarm on `ApproximateNumberOfMessagesVisible` > 0 with an SNS action". At most the few that matter.
- **Review.** Report a broken practice with its ID, the file and line, and the failure or cost it causes. If the answer depends on configuration outside the repository, say what you would need to see.
