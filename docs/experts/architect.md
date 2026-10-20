# System architect expert: sources, what was combined, and its skills

The architect owns how services, queues, data stores and AWS resources fit together: failure at boundaries, state, cost, recovery and the AWS fit of a design. It joins at plan and review. Import cycles, module contracts and data owners inside one codebase are the software architect's (`softarch`).

## 1. The upstream agents compared

Nineteen sources were read on 2026-10-20 (licences and credits in `.cursor-plugin/ultimate-workflow/experts/architect/NOTICE.md`). Only two of them review anything (awslabs aidlc's architecture reviewer and Anthropic's architecture critic), and both review designs, not diffs. None reviews a diff at the system level with file-and-line evidence, so most of what they add is at the plan stage.

| Source | What it was good for | Why not more |
|---|---|---|
| anthropics `architecture-critic` | The simplest alternative, tracing one failure end to end, how existing data moves, a comment is not evidence, masking secrets in evidence | A design critic, not a diff reviewer |
| awslabs aidlc `architect-agent`, `architecture-reviewer-agent` | One owner per fact, resolve every named resource, whether the topology can meet its target, blast radius | Tied to its own workflow and validators |
| agency-agents `backend-architect`, `sre`, `finops-engineer` | Timeout and retry rules per API, reconciliation, burn-rate alerting, the reliability cost of a cost cut | Personas; much is about organisation |
| wshobson `backend-architect`, `event-sourcing-architect`, `cloud-architect` | Deadline propagation, schema evolution, connection pools, rebuildable projections | Capability lists; multi-region by default |
| awesome-copilot `aws-principal-architect`, `aws-serverless-architect`, `se-system-architecture-reviewer` | Ask for the service level, recovery targets, budget and team first | Personas with edit and execute tools; serverless-first |
| ECC `architect` | A non-functional requirements checklist | No review method |
| Jeffallan `cloud-architect`, `microservices-architect` | Validation checkpoints | Mandates high availability and microservice rules everywhere; a saga sample that swallows compensation failures |
| alirezarezvani `aws-solution-architect`, `slo-architect`, `migration-architect` | A requirements table, reconciliation and per-phase rollback | Script-driven; wrong burn-rate arithmetic; recommends dual writes |
| buildwithclaude `architect-review` | (code-structure concerns only) | Thirty lines, mostly softarch's ground |

Not taken anywhere: high availability or multi-region by default, microservice rules applied to every service, a decision record for every choice, fixed latency or uptime numbers, diagrams as deliverables, dual writes as a migration pattern, running tools or deploying. Where sources disagreed, the expert keeps its own rules: calibrate to the stated criticality, follow the system's conventions, record a decision only when a rejected alternative has a cost, and never promise exactly-once.

## 2. What changed in the expert

- **Review, seven categories:** a synchronous call cycle between services; a remote call per item; a budget the parts cannot fit (a timeout behind a shorter deadline, pool size times instances above the database limit); a write to two places with no way back, including a compensation failure that is only logged; two versions reading the same messages or records during a rolling deploy; moving existing data without a check; replay with side effects.
- **Review, method:** a claim is not evidence; resolve every named resource in the infrastructure files; mask any secret quoted as evidence.
- **Plan:** the numbers the design depends on (ask once, then state the assumption); the simplest design and why more is needed; blast radius; one owner per fact; consistency per read; how existing data moves; one-way doors; the reliability cost of a cost cut and the cost of a new data path; budget and team readiness as questions for the user.
- **Not measured.** The architect corpus is saturated: the plain reviewer finds every planted defect, so it cannot show a gain. Infrastructure cases built on the skills' facts are needed.

## 3. The skills this expert needs

Two research passes: the first read 40 files from 10 repositories by keyword; the second, after a sweep of the whole catalogue (328 architecture-related skill names in 30 repositories), read about 45 more. Every AWS number was then checked against AWS's own developer guides as last published on GitHub (2022 to 2023).

| Skill | What it holds | Review selector | Plan |
|---|---|---|---|
| `lambda-event-sources` | SQS, Kinesis and DynamoDB Streams triggers, partial batch failure, poison records, asynchronous retries and payload limits, S3 notifications, concurrency and scaling, Lambda in a VPC | added lines naming an event source mapping, its scaling, batch-failure, visibility or concurrency settings | offered |
| `aws-messaging` | SQS, SNS, EventBridge and Kinesis semantics: ordering, deduplication, retention, redrive, filter scope, subscription dead-letter queues, delivery retries, target limits, archive and replay, shard capacity | added lines naming SQS, SNS, EventBridge or Kinesis resources or send calls | offered |
| `step-functions` | Standard versus Express, limits that end an execution, error and retry rules, Parallel and Map failures, start rates, saga compensation, durable execution (Temporal) | `*.asl.json` and similar files, or added lines naming a state machine, `States.` errors or compensation | offered |
| `api-gateway` | Integration timeouts by API type, payload limits, the shared account throttle, what HTTP APIs lack, usage plans, authorizer and cache TTLs | added lines naming API Gateway resources or their timeout and throttle settings | offered |
| `multi-tenancy` | Isolation model per service, tenant context, enforcement where data is read, shared resources, noisy neighbours, per-tenant cost, tenant lifecycle | added lines with tenant ids, row-level security or `PrincipalTag` | offered |
| `caching-and-latency` | Invalidation, the delete-after-commit race, keys, the cache as optional, TTL, stampedes, the miss path, eviction policy, ElastiCache and CloudFront rules | added lines naming Redis, ElastiCache, CloudFront or cache headers | offered |
| `aws-well-architected` | The Well-Architected practices a change can show, with IDs, and verified AWS costs and limits | infrastructure files, or added lines with AWS resources or SDK calls | offered |

Order is priority: the most specific skill first. Together they are about 43 KB, so a change touching every area at once gets the first six and is told that `aws-well-architected` was left out at the 32 KB cap. A typical change selects two or three.

Each fact says where it comes from: **[G]** AWS's developer guides as published on GitHub until 2022 and 2023 (docs.aws.amazon.com was not reachable from the build session), **[R]** the maintainer's check of live pages, **[T]** a 2026 AWS or community skill not yet checked against the current guide, **[O]** our own reasoning. Where a 2023 guide and a 2026 source differ (message sizes, the REST API timeout, Lambda's burst rate), both are given: the guide may be out of date, the newer source is unconfirmed.

Multi-tenancy is the architect's, not the data expert's (decided 2026-10-20), including tenant isolation where data is read; the data expert only knows each store's mechanics (row-level security performance, partition keys).

**Still open** (`docs/expert-research-prompts.md`, prompts 1b and 1c): the [T] facts need the live AWS pages; the SaaS Lens text could not be fetched (no public source repository); messaging gaps no source held (delay queues, FIFO high-throughput limits, cross-account EventBridge routing); CloudFront cache keys and invalidation, ElastiCache failover timing; resilience testing (only fault-injection template checks were found, and there is no FIS guide in AWS's archive).

## Routed to other experts

| Expert | Items found during the architect's research |
|---|---|
| DevOps engineer (decided in `docs/experts/devops.md`) | Choosing an IaC tool, CI/CD and staging guidance, REST API redeploy after configuration changes, canary deployments and SnapStart, package and layer limits, CloudFront deploy steps, Route 53 aliases, cache client pool settings, NAT build procedures, fault-injection logging and reports |
| Security | Confused-deputy trust conditions, `iam:PassRole`, encryption keys on queues, buses and logs, task tokens as secrets, mutual TLS, JWT key caching, cache keys without the client's identity, the fault-injection role, CloudFront origin access and WAF, ElastiCache TLS and default user, a tenant id taken from the request body as an authorisation bug |
| Data and database | Row-level security performance and security-definer functions, `SET LOCAL` against `SET` for session context, DynamoDB and Aurora skills |
| Observability | SLO definitions, error budgets and burn-rate alerts, latency percentiles and freshness metrics |
| Generative AI engineer | Qdrant scaling and tenant sharding, ElastiCache vector search and semantic caching, agent memory |

Rejected as separate skills: cost and FinOps (the sources were discount headlines; the cost checks are in `aws-well-architected`), sagas on their own (folded into `step-functions`), capacity planning (the source sized support teams), and decision records (the plan reference already says when one is needed).

Considered and not done: pasting the plugin's own host-loaded guideline skills (`distributed-systems-resilience-guidelines`, `operability-guidelines`) into the architect's prompt. They are written for the main session doing design work, not for a reviewer, and a selector that fires on every HTTP or queue call would make them effectively always on. The specific checks the architect lacked were copied into its references instead.
