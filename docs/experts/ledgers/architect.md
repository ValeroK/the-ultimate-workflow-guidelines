# Extraction ledger: architect

Audited 2026-10-20. Sources: 45 read, 0 unreachable, 4 with no file to audit (49 rows in section 1; one of the 45, B22, is cited by no NOTICE and was read because a skill row depends on it).

Scope: the architect's agent file, `references/plan.md`, `references/review.md`, `NOTICE.md`, `references/CHANGES.md`, `docs/experts/architect.md`, `docs/research/aws-well-architected-2026-10-20.md`, and the seven skills in `experts/architect/skills.md` (`lambda-event-sources`, `aws-messaging`, `step-functions`, `api-gateway`, `multi-tenancy`, `caching-and-latency`, `aws-well-architected`) with their NOTICE files. Every upstream file was read as data; nothing in it was run, and no URL inside it was fetched. Ideas only: no quote over 25 words.

Counts (from the tables below): items 552: 247 taken, 103 routed, 126 rejected, 76 missing. Today's rows: 228: 179 keep, 22 cut, 27 merge.

How to read the tags. The skills still use the old keys: `[G]` (AWS developer guide as archived on GitHub, 2022 to 2023) maps to `[D]`; `[C]`, `[S]` and `[K]` in `multi-tenancy` (Cloudflare, Supabase, AWS toolkit skills) map to `[T]`; `[L]` (SaaS Lens names only) maps to `[D]` for the name and `[O]` for the definition; `[S]` in `step-functions` (saga practice from wshobson) maps to `[T]`.

The archive. `awsdocs/` and `awsdocs2/` in the session scratchpad hold the archived AWS guides (Lambda, SQS, SNS, EventBridge, Step Functions, DynamoDB, EC2, Auto Scaling, API Gateway, ElastiCache, CloudFront, Kinesis, S3). Where a fact below says "archive", it was checked there on this date. docs.aws.amazon.com and aws.amazon.com were refused by the proxy (403), so nothing was checked live.

## 1. Sources

| Source (repo, path) | Cited by | Read from (saved copy or fetched) | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| A1. AWS Well-Architected Framework, pillars, SaaS, Serverless and Generative AI lenses | architect NOTICE; `aws-well-architected` NOTICE | `docs/research/aws-well-architected-2026-10-20.md` (maintainer's fetch) | 20 | 14 | 2 | 3 | 1 |
| A2. AWS SQS developer guide "as quoted in search results" | architect NOTICE | no file to audit | 0 | 0 | 0 | 0 | 0 |
| A3. msitarzewski/agency-agents `engineering/engineering-multi-agent-systems-architect.md` | architect NOTICE | fetched (sparse clone) | 13 | 3 | 8 | 2 | 0 |
| A4. affaan-m/ECC `skills/cost-aware-llm-pipeline/SKILL.md`, `skills/agent-architecture-audit/SKILL.md` | architect NOTICE | fetched (sparse clone) | 8 | 4 | 2 | 2 | 0 |
| A5. aws/agent-toolkit-for-aws `plugins/aws-agents/skills/agents-harden/SKILL.md`, `plugins/aws-core/skills/aws-well-architected-review/SKILL.md` | architect NOTICE | fetched (agents-harden); saved copy (review skill, SKILL.md only) | 9 | 6 | 2 | 1 | 0 |
| A6. addyosmani/agent-skills `skills/documentation-and-adrs/SKILL.md` | architect NOTICE | fetched (sparse clone) | 4 | 2 | 1 | 1 | 0 |
| anthropics/claude-plugins-official `plugins/code-modernization/agents/architecture-critic.md` | architect NOTICE | saved copy | 12 | 7 | 4 | 1 | 0 |
| awslabs/aidlc-workflows `core/agents/aidlc-architect-agent.md` | architect NOTICE | saved copy | 9 | 4 | 1 | 4 | 0 |
| awslabs/aidlc-workflows `core/agents/aidlc-architecture-reviewer-agent.md` | architect NOTICE | saved copy | 9 | 5 | 0 | 3 | 1 |
| davepoon/buildwithclaude `plugins/all-agents/agents/architect-review.md` | architect NOTICE | saved copy | 4 | 0 | 3 | 1 | 0 |
| affaan-m/ECC `agents/architect.md` | architect NOTICE | saved copy | 9 | 5 | 1 | 3 | 0 |
| github/awesome-copilot `agents/aws-principal-architect.agent.md` | architect NOTICE | saved copy | 6 | 2 | 2 | 2 | 0 |
| github/awesome-copilot `agents/aws-serverless-architect.agent.md` | architect NOTICE | saved copy | 10 | 6 | 2 | 2 | 0 |
| github/awesome-copilot `agents/se-system-architecture-reviewer.agent.md` | architect NOTICE | saved copy | 8 | 3 | 1 | 4 | 0 |
| wshobson/agents `plugins/cicd-automation/agents/cloud-architect.md` | architect NOTICE | saved copy | 8 | 1 | 3 | 4 | 0 |
| wshobson/agents `plugins/backend-development/agents/backend-architect.md` | architect NOTICE | saved copy | 24 | 13 | 8 | 3 | 0 |
| wshobson/agents `plugins/backend-development/agents/event-sourcing-architect.md` | architect NOTICE | saved copy | 6 | 2 | 2 | 2 | 0 |
| msitarzewski/agency-agents `engineering/engineering-backend-architect.md` | architect NOTICE | saved copy | 14 | 9 | 3 | 2 | 0 |
| msitarzewski/agency-agents `engineering/engineering-sre.md` | architect NOTICE | saved copy | 6 | 0 | 4 | 2 | 0 |
| msitarzewski/agency-agents `engineering/engineering-finops-engineer.md` | architect NOTICE | saved copy | 9 | 5 | 1 | 3 | 0 |
| Jeffallan/claude-skills `skills/cloud-architect/SKILL.md` | architect NOTICE | saved copy | 6 | 1 | 2 | 3 | 0 |
| Jeffallan/claude-skills `skills/microservices-architect/SKILL.md` | architect NOTICE | saved copy | 11 | 4 | 3 | 4 | 0 |
| alirezarezvani/claude-skills `engineering-team/skills/aws-solution-architect/SKILL.md` | architect NOTICE | saved copy | 6 | 4 | 0 | 2 | 0 |
| alirezarezvani/claude-skills `engineering/skills/slo-architect/SKILL.md` | architect NOTICE | saved copy | 5 | 0 | 2 | 3 | 0 |
| alirezarezvani/claude-skills `engineering/skills/migration-architect/SKILL.md` | architect NOTICE | saved copy | 9 | 2 | 3 | 3 | 1 |
| B1. aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-serverless/SKILL.md` and `references/event-sources.md`, `concurrency.md`, `production.md` | `lambda-event-sources` | saved copy | 47 | 22 | 4 | 7 | 14 |
| B2. aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-messaging-and-streaming/SKILL.md` | `lambda-event-sources` | saved copy | 10 | 1 | 3 | 4 | 2 |
| B3. AWS Lambda, SQS, SNS, EventBridge, DynamoDB, S3, Kinesis guides (awsdocs archive) | `lambda-event-sources`, `aws-messaging` | saved archive (`awsdocs/f`, `awsdocs2/src`) | 19 | 14 | 0 | 2 | 3 |
| B4. awslabs/agent-plugins `plugins/aws-serverless/skills/aws-lambda/SKILL.md` and `references/event-sources.md`, `event-driven-architecture.md`, `troubleshooting.md` | `lambda-event-sources`, `aws-messaging` | saved copy | 36 | 16 | 6 | 8 | 6 |
| B5. AWS SDK for Go, Lambda API reference | `lambda-event-sources`, `aws-well-architected` | no file to audit (maintainer's [R] check) | 0 | 0 | 0 | 0 | 0 |
| B6. itsmostafa/aws-agent-skills `skills/sqs/SKILL.md`, `skills/sns/SKILL.md`, `skills/eventbridge/SKILL.md` | `aws-messaging` | saved copy | 14 | 5 | 1 | 5 | 3 |
| B7. aws/agent-toolkit-for-aws `skills/specialized-skills/serverless-skills/amazon-eventbridge-event-bus/SKILL.md` (and `references/replay-and-recovery.md`) | `aws-messaging` | saved copy | 18 | 3 | 4 | 3 | 8 |
| B8. AWS Step Functions developer guide (awsdocs archive) | `step-functions` | saved archive (`awsdocs/f`) | 14 | 13 | 0 | 0 | 1 |
| B9. aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-serverless/references/orchestration.md` | `step-functions` | saved copy | 13 | 5 | 1 | 4 | 3 |
| B10. aws/agent-toolkit-for-aws and awslabs/agent-plugins `aws-step-functions` `SKILL.md`, `references/error-handling.md`, `references/service-integrations.md` | `step-functions` | saved copy | 16 | 5 | 2 | 5 | 4 |
| B11. wshobson/agents `plugins/backend-development/skills/workflow-orchestration-patterns/SKILL.md`, `references/details.md` | `step-functions` | saved copy | 10 | 5 | 0 | 2 | 3 |
| B12. wshobson/agents `plugins/backend-development/skills/saga-orchestration/SKILL.md`, `references/details.md` | `step-functions` | saved copy (`advanced-patterns.md` not saved) | 11 | 6 | 1 | 3 | 1 |
| B13. Amazon API Gateway developer guide (awsdocs archive) | `api-gateway` | saved archive (`awsdocs2/src/apigw`) | 7 | 6 | 0 | 1 | 0 |
| B14. awslabs/agent-plugins `plugins/aws-serverless/skills/api-gateway/SKILL.md` and `references/pitfalls.md`, `service-limits.md`, `performance-scaling.md` | `api-gateway` | saved copy | 29 | 8 | 8 | 5 | 8 |
| B15. cloudflare/security-audit-skill `DATA-ISOLATION-AND-LIFECYCLE.md` | `multi-tenancy` | saved copy | 18 | 9 | 4 | 1 | 4 |
| B16. supabase/agent-skills `security-rls-basics.md`, `security-rls-performance.md` | `multi-tenancy` | saved copy | 5 | 2 | 2 | 1 | 0 |
| B17. aws/agent-toolkit-for-aws CloudFront `references/multi-tenant-distributions.md`, Aurora DSQL `tenant_query.py` | `multi-tenancy` | saved copy | 7 | 4 | 1 | 1 | 1 |
| B18. AWS SaaS Lens, names only | `multi-tenancy` | no file to audit (names audited in A1) | 0 | 0 | 0 | 0 | 0 |
| B19. aws/agent-toolkit-for-aws `amazon-elasticache/SKILL.md` and `references/rds-acceleration.md`, `production-readiness.md`, `data-modeling/instructions.md` | `caching-and-latency` | saved copy | 23 | 6 | 3 | 9 | 5 |
| B20. aws/agent-toolkit-for-aws `cloudfront/SKILL.md`, `references/when-to-use-cloudfront.md` | `caching-and-latency` | saved copy | 10 | 4 | 3 | 1 | 2 |
| B21. affaan-m/ECC `skills/redis-patterns/SKILL.md`, `skills/latency-critical-systems/SKILL.md`, `skills/content-hash-cache-pattern/SKILL.md` | `caching-and-latency` | saved copy | 14 | 8 | 0 | 4 | 2 |
| B22. Amazon CloudFront developer guide (awsdocs archive) | none (the skill's [G] row has no NOTICE source) | saved archive (`awsdocs2/src/cf`) | 4 | 1 | 0 | 0 | 3 |
| B23. Well-Architected pages, VPC and PrivateLink pricing, SQS metrics page, re:Post on Lambda quotas | `aws-well-architected` | no file to audit (maintainer's [R] check, recorded in A1) | 0 | 0 | 0 | 0 | 0 |
| B24. Amazon EC2 Auto Scaling and EC2 user guides (awsdocs archive) | `aws-well-architected` | saved archive (`awsdocs/f`) | 2 | 2 | 0 | 0 | 0 |
| **Total** | | | **552** | **247** | **103** | **126** | **76** |

Saved in the scratchpad but cited by no NOTICE, so out of scope here and not itemised: the AWS toolkit's fault-injection, resilience-lifecycle, resilience-hub, resilience-program, Kinesis, Lambda-VPC-internet, debugging-timeouts and connecting-Lambda-to-API-Gateway skills; itsmostafa `lambda`, `api-gateway`, `step-functions`; the toolkit's `architect-for-startups` and its references, `aws-compute`, `aws-containers`, `aws-networking`, `aws-observability`, `aws-billing-and-cost-management`; awesome-copilot `aws-cost-optimize`, `cloud-design-patterns`, `qdrant-scaling`; wshobson `slo-implementation`, `event-store-design`, `microservices-patterns`, `python-resilience`, `cost-optimization`; rmyndharis `architecture-patterns`, `cost-optimization`; alirezarezvani `capacity-planner`; ECC `architecture-decision-records`; tech-leads-club `aws-advisor`; the toolkit Route 53 and CloudFront skill; and `upstream-tenancy/aws/first-fault-isolation.md` (a Flink restart-loop guide, saved by mistake into the tenancy folder). `docs/experts/architect.md` records what the second research pass routed from them (fault injection, Route 53, NAT build steps, Qdrant).

## 2. Items, per source

### Part A. The architect's own NOTICE

#### A1. AWS Well-Architected Framework, pillars and lenses (via `docs/research/aws-well-architected-2026-10-20.md`)

The NOTICE row's first version came from search results; the maintainer's research of 2026-10-20 fetched the pages. The research record is the file audited here.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Pillar question IDs and the shorthand corrections (SEC 1 is secure operation, identity is SEC 2; PERF has five questions) | rejected | no diff shows a question ID; the IDs the skill cites are best-practice IDs, which it carries | fails 2 |
| About 45 percent of best practices are process or organisation | taken | skill `aws-well-architected`, intro ("most of the framework is about process") | pass |
| Cross-zone data $0.01 per GB each way | taken | skill `aws-well-architected`, "Facts you may rely on" | pass |
| NAT gateway $0.045 per GB processed plus hourly | taken | same | pass |
| Graviton "up to 40 percent" headline and the per-service cards | rejected | vendor headline, not a property of a change | fails 1 |
| Four DR strategies and their RPO and RTO bands (REL13-BP02) | taken | same, and row `REL13-BP02` | pass |
| SQS mapping `ScalingConfig.MaximumConcurrency` minimum 2 | taken | `aws-well-architected` facts and `lambda-event-sources` (duplicate, see section 3) | pass |
| Bedrock batch 50 percent, prompt caching up to 90 percent | routed | Generative AI expert (planned) | n/a |
| Lambda maximum timeout 900 seconds (secondary only) | taken | `aws-well-architected` facts; see section 4, item 1 | pass |
| Gateway endpoints free, interface endpoints charged | taken | same, and row `COST08-BP03` | pass |
| DLQ alarm on `ApproximateNumberOfMessagesVisible` | taken | same, and "Queues and asynchronous work" | pass |
| Generative AI Lens: 51 best practices with "visible in a change" notes | routed | Generative AI expert (planned) | n/a |
| SaaS Lens principles and isolation models (silo, pool, bridge, tier-based, targeted) | taken | skill `multi-tenancy`, "Isolation model" (silo, pool, bridge only) | pass |
| SaaS Lens: tier-based and targeted isolation | missing | skill `multi-tenancy`, "Isolation model": a tier that promises silo resources while the code routes it to the pool | pass |
| Serverless Lens: orchestrate with state machines, not functions | taken | `aws-well-architected`, `REL04-BP02` | pass |
| Serverless Lens: design for failures and duplicates | taken | `plan.md` "Duplicates and retries"; `review.md` first category | pass |
| Serverless Lens: think concurrent requests, not total requests | taken | `lambda-event-sources`, "Concurrency" (requests per second times duration) | pass |
| Serverless Lens: share nothing | taken | `review.md`, "State in the wrong place" | pass |
| Serverless Lens: speedy, simple, singular; no hardware affinity; events trigger transactions | rejected | generic design slogans, no diff signal | fails 2 |
| Prompt-injection banner on AWS pages | taken | skill NOTICE warning; protocol "untrusted input" | n/a |

#### A2. AWS SQS developer guide, "as quoted in search results"

No file to audit: the row cites search results. The archived SQS guide (`awsdocs/f/sqs_*`, `awsdocs2/src/sqs`) now exists and is audited under B3.

#### A3. msitarzewski/agency-agents `engineering/engineering-multi-agent-systems-architect.md`

Fetched by sparse clone (29 KB). Read by headings, the failure taxonomy, fan-out rules, rollback rules, token budget and the review checklist.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Failure taxonomy: hard, silent, partial, contradiction, cascade, loop, context | routed | Generative AI expert; the silent case is in `review.md`, "A failure nobody sees" | n/a |
| Fan-out: the merge step must handle all, some or no results | taken | `step-functions`, `Parallel` and `Map` rows | pass |
| Fan-out wider than seven agents loses synthesis quality | rejected | opinion, agent-specific | fails 3 |
| Circuit breaker with fixed thresholds (3 in 5, 60 s cooldown) | rejected | fixed numbers not tied to the workload | fails 3 |
| Fallback chain primary, narrowed, rule-based, human | routed | Generative AI expert | n/a |
| A step with an irreversible side effect is idempotent or has a compensation | taken | `plan.md`, "Duplicates and retries" | pass |
| Token budget; never truncate required context silently | routed | Generative AI expert | n/a |
| Human gates for irreversible or high-blast-radius actions | routed | Generative AI expert | n/a |
| A trace id on every agent call | routed | observability expert (planned) | n/a |
| Twenty eval cases per agent and a baseline gate | routed | quality | n/a |
| Least privilege per agent role | routed | security | n/a |
| Cost ceiling per pipeline run | taken | `review.md`, "Cost with no ceiling" | pass |
| Mesh topology needs a moderator and a termination condition | routed | Generative AI expert | n/a |

#### A4. affaan-m/ECC `skills/cost-aware-llm-pipeline/SKILL.md` and `skills/agent-architecture-audit/SKILL.md`

Fetched by sparse clone.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Retry only transient errors; fail fast on auth and validation errors | taken | `plan.md`, "Failure at each boundary" (retry budget on transient errors only); developer `failure-handling` | pass |
| A budget check before a batch, failing closed | taken | `review.md`, "Cost with no ceiling" (per-run limit) | pass |
| Route models by task complexity; prompt caching | routed | Generative AI expert | n/a |
| Immutable cost tracker | rejected | style | fails 1 |
| Model price table | rejected | unverified, goes stale | fails 3 |
| Tool requirements enforced in code, not in prompt text | taken | `plan.md`, "Tenancy" (a key or filter in code, not an instruction) | pass |
| Hidden repair loops, memory contamination, rendering corruption, typed envelopes | routed | Generative AI expert | n/a |
| Findings carry file and line and a confidence | taken | protocol, "Evidence" and "Confidence" | n/a |

#### A5. aws/agent-toolkit-for-aws `plugins/aws-agents/skills/agents-harden/SKILL.md` and `plugins/aws-core/skills/aws-well-architected-review/SKILL.md`

agents-harden fetched by sparse clone, read by headings and grep (its `references/limits.md` was fetched and not itemised: AgentCore quotas). The Well-Architected review skill read from the saved copy, SKILL.md only; its seven references were not saved and not read.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Work that outlives the response is reclaimed when the session goes idle | taken | `review.md`, "Service fit" (long-running work behind a request) | pass |
| Per-tenant rate limits belong in the calling layer, not the agent | taken | `multi-tenancy`, "Noisy neighbours" | pass |
| AgentCore session lifecycle (idle 900 s, maximum 8 h), `maxVms`, async task API, 25 TPS | routed | Generative AI expert | n/a |
| Secrets not in runtime environment variables; inbound JWT auth | routed | security | n/a |
| Calibrate to business criticality; single-region is fine for an internal tool | taken | agent rule "Calibrate to the workload" | pass |
| "Cannot Determine" when the code cannot show it | taken | protocol, "Say what you could not check" | n/a |
| Never fabricate a best-practice ID | taken | `aws-well-architected` cites verified IDs only | pass |
| Evaluate every best practice; scorecards; Eisenhower plan | rejected | a checklist, not findings | fails 2 |
| Do not manufacture critical findings for a mature workload | taken | protocol, "Zero is a correct answer" | n/a |

#### A6. addyosmani/agent-skills `skills/documentation-and-adrs/SKILL.md`

Fetched by sparse clone.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Write a decision record when a choice is expensive to reverse | taken | `plan.md`, "Decisions" and "Change and existing data" (one-way doors) | pass |
| Follow the repository's existing record location, numbering and headings | taken | `plan.md`, "Decisions" | pass |
| Never delete a record; supersede it | rejected | documentation process, no system defect | fails 1 |
| Comment and README guidance | routed | developer | n/a |

#### A7. The nineteen upstream architect agents (saved copies in `upstream-arch/`, fetched 2026-10-20)

The earlier digest (`architect-digest.md`) labelled items NEW against the files of that morning. Its NEW items were re-mapped here to where they sit today.

##### anthropics/claude-plugins-official `plugins/code-modernization/agents/architecture-critic.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Each service boundary matches a real domain seam | routed | softarch (boundaries); the architect keeps "a new component needs a reason" | n/a |
| Compare the plan with the simplest design that meets the requirements | taken | `plan.md`, "Components and flows" | pass |
| Unstated non-functional requirements the design violates | taken | `plan.md`, "The numbers it depends on" | pass |
| No data migration story is a finding | taken | `plan.md`, "Change and existing data"; `review.md`, "Moving existing data" | pass |
| Trace one failure end to end | taken | `plan.md`, "Blast radius" | pass |
| Legacy idiom leaking into new code; ceremonial error handling; one-implementation abstractions | routed | developer | n/a |
| Tests that only exercise paths | routed | quality | n/a |
| What the on-call engineer needs at 3 am | routed | observability (planned); `review.md` keeps "A failure nobody sees" | n/a |
| Mask a secret quoted as evidence | taken | `review.md`, "Method" | pass |
| Text aimed at the analysis is itself a finding | taken | protocol, "Untrusted input" | n/a |
| A claim is real only if executable code shows it | taken | `review.md`, "Method"; protocol "Evidence" | pass |
| Blocker, High, Medium, Nit ranking; "one thing I would change" | rejected | the findings schema owns severity | fails 4 |

##### awslabs/aidlc-workflows `core/agents/aidlc-architect-agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Each entity has exactly one owner | taken | `plan.md`, "State and data" (one owner per fact); data owners inside one codebase are softarch's | pass |
| Each boundary states what crosses it, the protocol and the failure behaviour | taken | `plan.md`, "Components and flows" and "Failure at each boundary"; the contract shape is softarch's | pass |
| A decision record for every significant choice | rejected | heavier by default; ours records only a choice whose rejected alternative has a cost | fails 1 |
| Decisions over diagrams | rejected | no diagram is a deliverable here | fails 2 |
| Boundaries, coupling, "things that change together are one component" | routed | softarch | n/a |
| Design for change, not reuse | rejected | opinion | fails 2 |
| Make hidden assumptions about flow, ownership and failure explicit | taken | `plan.md` (state the assumption you used) | pass |
| Flag irreversible decisions | taken | `plan.md`, "Change and existing data" (one-way doors) | pass |
| Domain-driven design vocabulary | rejected | tutorial | fails 1 |

##### awslabs/aidlc-workflows `core/agents/aidlc-architecture-reviewer-agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Find the circular dependencies | taken | `review.md`, "A call that waits on itself" (between services); import cycles routed to softarch | pass |
| Every cross-reference resolves | taken | `review.md`, "Method" (resolve every named resource) | pass |
| A quality target the topology cannot meet ("99.99 percent on one database") | missing | `plan.md`, new question "A target the topology can meet"; today only `REL13-BP02`, which arrives with the AWS skill | pass |
| Blast radius of each component | taken | `plan.md`, "Blast radius" | pass |
| Could a developer build it without asking | taken | `plan.md` (each constraint checkable by someone who is not you) | pass |
| Run the validation tools | rejected | the expert has no shell | fails 4 |
| Refute until ready | rejected | the expert is one advisory pass; the evidence rule is kept | n/a |
| "Use a queue" means ordering, retries and dead letters | taken | `plan.md`, "Failure at each boundary" | pass |
| Identity marker, turn budget, sibling-unit rules | rejected | specific to that workflow | fails 4 |

##### davepoon/buildwithclaude `plugins/all-agents/agents/architect-review.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SOLID, layering, patterns, abstraction levels | routed | softarch and developer | n/a |
| Circular references | routed | softarch (imports); service cycles taken above | n/a |
| Performance and scaling "implications" | rejected | generic | fails 2 |
| Security boundaries | routed | security | n/a |

##### affaan-m/ECC `agents/architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Learn the existing patterns and conventions first | taken | `review.md`, "Method" step 1; agent rule "Follow the system's own conventions" | pass |
| Non-functional checklist: latency, throughput, availability target | taken | `plan.md`, "The numbers it depends on" | pass |
| Pros, cons and alternatives per decision | taken | template, "When the plan makes a one-way choice" | pass |
| Stateless design | taken | `review.md`, "State in the wrong place" | pass |
| Backup and rollback plans | taken | `aws-well-architected`, `REL09-BP01`; rollback mechanics routed to DevOps | pass |
| Anti-pattern names (big ball of mud, golden hammer) | rejected | not checkable | fails 2 |
| Scaling roadmap to 10 million users and multi-region | rejected | heavier by default | fails 1 |
| Frontend patterns | routed | frontend expert (planned) | n/a |
| ADR sample | rejected | tutorial | fails 1 |

##### github/awesome-copilot `agents/aws-principal-architect.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Ask for the service level, RTO and RPO, compliance and budget first | taken | `plan.md`, numbers and "questions" | pass |
| State what each choice sacrifices | taken | template, one-way choice | pass |
| Least privilege; no credentials in code | routed | security | n/a |
| Infrastructure as code for everything | routed | DevOps | n/a |
| Fetch AWS docs before every recommendation | rejected | our web rule is narrower: facts that go stale only | fails 4 |
| Judge every decision against six pillars | rejected | a pillar name is not a finding | fails 2 |

##### github/awesome-copilot `agents/aws-serverless-architect.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Ask the invocation rate, latency need, access patterns, VPC, residency | taken | `plan.md`, numbers; residency routed to security | pass |
| Externalise state from compute | taken | `review.md`, "State in the wrong place" | pass |
| Provisioned concurrency for latency paths | taken | `lambda-event-sources`, "Concurrency" (its cost and limits) | pass |
| DLQ on asynchronous paths | taken | `lambda-event-sources`, "Asynchronous invocation" | pass |
| Step Functions for workflows, EventBridge for loose coupling | taken | `aws-well-architected`, `REL04-BP02` | pass |
| Prefer HTTP API for cost | taken | `api-gateway` and `COST05-BP05` | pass |
| arm64 by default | rejected | "not on Graviton" is never a finding | fails 1 |
| Layers for shared dependencies | routed | DevOps | n/a |
| DynamoDB single-table design | routed | data expert (planned) | n/a |
| Serverless first | rejected | opinion | fails 3 |

##### github/awesome-copilot `agents/se-system-architecture-reviewer.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Ask the scale, the team's skills and the budget | taken | `plan.md`, numbers and "questions" (budget, team readiness) | pass |
| Scale tiers (under 1K users, 1K to 100K) | rejected | fixed thresholds | fails 3 |
| Database decision tree | rejected | shallow, opinion | fails 1 |
| An ADR file for every decision | rejected | heavier by default; the expert writes nothing | fails 1 |
| Escalate budget, training and compliance trade-offs to a person | taken | `plan.md`, "questions" | pass |
| AI-system reliability and model fallbacks | routed | Generative AI expert | n/a |
| "Data sync issues: use an event queue" | rejected | wrong as stated: a queue adds a consistency window | fails 3 |
| The best architecture is one the team can run | taken | `plan.md`, "Components and flows" (who is paged) | pass |

##### wshobson/agents `plugins/cicd-automation/agents/cloud-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Multi-AZ and multi-region by default | rejected | heavier by default | fails 1 |
| IaC, GitOps, policy as code | routed | DevOps | n/a |
| Tagging and chargeback | rejected | "no tags" is never a finding; per-tenant cost is in `multi-tenancy` | fails 4 |
| Reserved and spot capacity | rejected | buying decisions, no diff | fails 2 |
| Active-active and active-passive DR with RPO and RTO | taken | `aws-well-architected`, `REL13-BP02` | pass |
| Vendor lock-in | rejected | `review.md`, "Do not report" | fails 1 |
| Chaos engineering | routed | quality and observability | n/a |
| HIPAA, PCI and other compliance | routed | security (privacy expert planned) | n/a |

##### wshobson/agents `plugins/backend-development/agents/backend-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Deadline propagation across calls | taken | `review.md`, "A budget the parts cannot fit" | pass |
| Connection pool sizing | taken | same (pool times instances above the database limit) | pass |
| Webhook delivery: retries and idempotency | taken | `plan.md`, "Duplicates and retries" | pass |
| Webhook signatures | routed | security | n/a |
| API versioning, deprecation, pagination | routed | softarch (`schema-evolution`) | n/a |
| Event schema evolution | routed | softarch (pending event-schema-evolution); in-flight messages stay in `review.md`, "Two versions at once" | n/a |
| "Exactly-once delivery" as a capability | rejected | wrong: never promise exactly-once | fails 3 |
| Dead-letter queues and poison messages | taken | `review.md`, "Queue configuration" | pass |
| Circuit breakers by default | rejected | heavier by default; `plan.md` asks for a defined degraded response instead | fails 1 |
| Retry budgets with jitter | taken | `aws-well-architected`, `REL05-BP03` | pass |
| Bulkheads | taken | `aws-well-architected`, `REL10-BP03` | pass |
| Liveness, readiness and deep health checks | routed | DevOps (`containers`); `review.md` keeps "nothing to show it is healthy" | n/a |
| Correlation ids | routed | observability | n/a |
| Cache patterns and invalidation | taken | `caching-and-latency` | pass |
| N+1 calls and batch loading | taken | `review.md`, "A remote call per item" | pass |
| CQRS and event sourcing projections | taken | `review.md`, "Replay with side effects" | pass |
| Database per service | rejected | dogma; the system's conventions decide | fails 1 |
| Strong or eventual consistency per operation | taken | `plan.md`, "State and data" | pass |
| Long-running operations: async with status polling | taken | `review.md`, "Service fit" | pass |
| Backpressure and load shedding | taken | `review.md`, "No bound"; `REL05-BP04` | pass |
| CORS, CSRF, SQL injection, rate limit algorithms | routed | security | n/a |
| Feature flags, canary, blue-green | routed | DevOps (`release-safety`) | n/a |
| Zero-downtime migrations | taken | `plan.md`, expand, migrate, contract; the run order is DevOps' | pass |
| Contract tests | routed | quality | n/a |

##### wshobson/agents `plugins/backend-development/agents/event-sourcing-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Events are never changed or deleted | rejected | opinion; conflicts with deletion duties (privacy) | fails 3 |
| Version events from day one | routed | softarch | n/a |
| Correlation ids | routed | observability | n/a |
| Idempotent event handlers | taken | `review.md`, "Retry or duplicate delivery without idempotency" | pass |
| Projections must be rebuildable | taken | `review.md`, "Replay with side effects" | pass |
| Snapshots for long aggregates | rejected | tutorial | fails 1 |

##### msitarzewski/agency-agents `engineering/engineering-backend-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Choose monolith or services by team size and operational maturity | taken | `plan.md`, "Components and flows" and "questions" | pass |
| Services only when deployment, ownership or scale justifies them | taken | `plan.md`, "Components and flows" | pass |
| Timeout budget, retries with backoff and idempotency on every external call | taken | `plan.md`, "Failure at each boundary" | pass |
| Bulkheads, rate limits, DLQ, poison-message handling | taken | `review.md`, `aws-well-architected` | pass |
| Simplest scaling model for current load | taken | agent rule "Calibrate to the workload" | pass |
| Machine-readable contracts; versioning and deprecation windows | routed | softarch | n/a |
| Timeout, retry and rate-limit semantics stated per API | taken | `plan.md`, "Failure at each boundary" | pass |
| Expand and contract | taken | `plan.md`, "Change and existing data" | pass |
| Dual writes and read fallbacks during a migration | rejected | dual writes conflict with outbox or compensation | fails 3 |
| Reconcile migrated data | taken | `review.md`, "Moving existing data" | pass |
| Retention and privacy visible in schemas | routed | security (privacy expert planned) | n/a |
| Logs carry tenant context | taken | `multi-tenancy`, "Shared resources" | pass |
| SLIs and SLOs, symptom-based alerts, tracing through queues | routed | observability | n/a |
| Sub-200 ms p95, 99.9 percent uptime as success | rejected | fixed thresholds | fails 3 |

##### msitarzewski/agency-agents `engineering/engineering-sre.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SLOs and error budgets drive decisions | routed | observability | n/a |
| Burn-rate factors 14.4 over 1 h and 6 over 6 h | routed | observability (arithmetic correct, see digest) | n/a |
| Golden signals, including queue depth and pool saturation | routed | observability | n/a |
| Progressive rollouts | routed | DevOps | n/a |
| "Each nine costs ten times more" | rejected | unsourced | fails 3 |
| Blameless culture, toil budget | rejected | process | fails 2 |

##### msitarzewski/agency-agents `engineering/engineering-finops-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Never trade a reliability target for a saving | taken | `plan.md`, "Cost and limits" (a cost cut states its reliability cost) | pass |
| Trace the data path: egress, NAT, cross-AZ | taken | `plan.md`, "Cost and limits"; `aws-well-architected`, `COST08` rows | pass |
| Allocation and tagging first | rejected | "no tags" is never a finding | fails 4 |
| Kill idle resources; schedule non-production | rejected | no diff signal | fails 2 |
| Commit only to a stable baseline | rejected | buying process | fails 2 |
| Rightsize while keeping headroom | taken | `plan.md`, "Cost and limits" | pass |
| Unit cost per customer | taken | `multi-tenancy`, "Cost and lifecycle" (when the plan bills per tenant) | pass |
| Spend anomaly alerts | routed | observability | n/a |
| Storage lifecycle and snapshot sprawl | taken | `aws-well-architected`, `COST04-BP05` | pass |

##### Jeffallan/claude-skills `skills/cloud-architect/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| MUST 99.9 percent or more, multi-region, no single point of failure | rejected | heavier by default | fails 1 |
| Infrastructure as code; validate connectivity before cutover | routed | DevOps | n/a |
| Cost tags | rejected | never a finding by itself | fails 4 |
| DR with defined RTO and RPO | taken | `aws-well-architected`, `REL13-BP02` | pass |
| DR testing, recovery times documented | rejected | process | fails 2 |
| Least-privilege IAM sample, encryption | routed | security | n/a |

##### Jeffallan/claude-skills `skills/microservices-architect/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Each service owns its data exclusively | rejected | dogma; `plan.md` keeps one owner per fact | fails 1 |
| Synchronous only below a 100 ms SLA | rejected | fixed threshold | fails 3 |
| Every external call has a timeout, a retry budget and a degraded path | taken | `plan.md`, "Failure at each boundary" | pass |
| Correlation id across all services | routed | observability | n/a |
| Readiness only when dependencies are up, separate from liveness | routed | DevOps (`containers`) | n/a |
| Circuit breaker on every external call | rejected | dogma | fails 1 |
| Saga sample whose compensation failure is only logged | taken | as a counter-example: `step-functions`, "Sagas"; `review.md`, "A write to two places" | pass |
| No synchronous call for long-running work | taken | `review.md`, "Service fit" | pass |
| Chatty interfaces | taken | `review.md`, "A remote call per item" | pass |
| Distributed monolith | rejected | vague | fails 2 |
| API versioning | routed | softarch | n/a |

##### alirezarezvani/claude-skills `engineering-team/skills/aws-solution-architect/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Requirements table: users and RPS, budget, team, compliance, SLA and RPO | taken | `plan.md`, numbers and "questions" | pass |
| Check the pattern against the team's maturity | taken | `plan.md`, "questions" | pass |
| Generator scripts, deploy and delete-stack steps | rejected | runs tools | fails 4 |
| The 15-minute Lambda limit | taken | `aws-well-architected`, facts | pass |
| Savings plans and rightsizing outputs | rejected | buying process | fails 2 |
| NAT gateway alternatives | taken | `aws-well-architected`, `COST08-BP03` | pass |

##### alirezarezvani/claude-skills `engineering/skills/slo-architect/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SLI types and an error-budget policy | routed | observability | n/a |
| Burn-rate thresholds and the worked example | rejected | wrong arithmetic (10 percent in 6 h is 12x, not 6x; the 1.44 example is off by ten) | fails 3 |
| A target at or below 99.0 percent is "probably wrong" | rejected | wrong: calibrate to what users need | fails 3 |
| Target set from the 30-day p50 | rejected | anchors to current behaviour | fails 3 |
| Window length; SLO tighter than the SLA; CPU is not an SLI | routed | observability | n/a |

##### alirezarezvani/claude-skills `engineering/skills/migration-architect/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Expand and contract | taken | `plan.md`, "Change and existing data" | pass |
| Dual writes, distributed transactions "where consistency is critical" | rejected | conflicts with outbox or compensation; heavier | fails 3 |
| Reconciliation: row counts, checksums, business queries, delta queries | taken | `review.md`, "Moving existing data" | pass |
| A rollback runbook per phase; point-in-time data rollback | routed | DevOps (`release-safety`); `review.md` keeps "a design that cannot be rolled back" | n/a |
| Parallel run or shadow traffic sends production writes to both systems, repeating side effects | missing | `review.md`, "Replay with side effects": a shadow or parallel run that mirrors writes, sends or charges | pass |
| Keep the source data until the copy is verified | routed | DevOps (`terraform-change-safety`, destroy) | n/a |
| Compatibility checker as a CI gate | routed | softarch and DevOps | n/a |
| Change data capture; strangler fig | rejected | tutorial | fails 1 |
| Watch for 72 hours after cutover | rejected | process | fails 2 |

### Part B. Sources cited by the skills

#### B1. aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-serverless/SKILL.md` and `references/event-sources.md`, `references/concurrency.md`, `references/production.md` (cited by `lambda-event-sources`)

Saved copies in `upstream-arch-skills/`. `references/orchestration.md` is audited under B9.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Unmatched SQS filter messages are deleted | taken | `lambda-event-sources`, "SQS triggers" ([G], archive confirms) | pass |
| A JSON filter against a plain-text body drops the message | taken | same, marked [T]; the archive confirms it (section 4, item 2) | pass |
| `MaximumConcurrency` range 2 to 1,000, per mapping | taken | same | pass |
| `MaximumConcurrency` and provisioned mode are mutually exclusive on one mapping | missing | `lambda-event-sources`, "SQS triggers": a mapping that sets both | pass |
| Provisioned mode (min and max pollers) is the lever for a backlog; per-poller capacity SQS 1 MB/s or 10 invokes | missing | `lambda-event-sources`, "Concurrency" (today the row says "the poller settings do" with no name) | pass |
| Batching window not available for FIFO; at least 1 s above batch size 10 | taken | "SQS triggers" (the 1 s part); FIFO part missing, see next row | pass |
| No batching window on a FIFO queue mapping | missing | `lambda-event-sources`, "SQS triggers", batch row | pass |
| Invocation fires on window, batch size or 6 MB | taken | "SQS triggers", batch row | pass |
| Scaling: start 5, about 300 more per minute, default ceiling 1,250 | taken | "SQS triggers", [T]; conflicts with the 2022 guide, both shown | pass |
| FIFO concurrency is the lower of message groups and `MaximumConcurrency` | taken | "SQS triggers", FIFO row | pass |
| Streams polled 4 times a second; batch default 100, max 10,000 | rejected | no defect turns on the poll rate | fails 1 |
| `StartingPosition` `LATEST` can miss records written while the mapping is created | missing | `lambda-event-sources`, "Streams" | pass |
| `ParallelizationFactor` 1 to 10; concurrency is shards times the factor | missing | `lambda-event-sources`, "Streams" and "Concurrency" (a sizing plan that ignores it) | pass |
| `BisectBatchOnFunctionError` does not consume retry attempts | missing | `lambda-event-sources`, "Streams", bound-it row | pass |
| `MaximumRecordAgeInSeconds` accepts -1 or 60 to 604,800; 0 to 59 is rejected | missing | `lambda-event-sources`, "Streams", defaults row (section 4) | pass |
| On-failure destination may be SQS, SNS, S3 or a Kafka topic | taken | "Streams" (SQS or SNS named; S3 and Kafka missing, section 4) | pass |
| Two readers per shard, one for global tables | taken | "Streams" | pass |
| Tumbling windows for aggregation | rejected | tutorial | fails 1 |
| DynamoDB stream filters cannot use numeric operators (numbers are strings) | missing | `lambda-event-sources`, "SQS triggers" filter row, generalised to all filters | pass |
| Up to 5 filters per mapping; filters are ORed, fields inside one are ANDed | missing | same | pass |
| Partial batch: SQS, streams lowest sequence, FIFO stop at first | taken | "Partial batch failures" | pass |
| On a stream, an unhandled exception triggers bisect and the `batchItemFailures` response is ignored | missing | "Partial batch failures", streams bullet | pass |
| Powertools batch processor | rejected | tooling advice | fails 4 |
| Reserved concurrency 0 is an emergency stop | taken | "Concurrency" ([T]; archive confirms, section 4) | pass |
| Provisioned concurrency only on a version or alias, not `$LATEST` | taken | "Concurrency" | pass |
| `MaximumConcurrency` reserves nothing; reserved must cover the sum of caps | taken | "SQS triggers" | pass |
| Account RPS quota is ten times account concurrency | missing | `lambda-event-sources`, "Concurrency": a short function at high RPS is throttled by RPS, not concurrency | pass |
| Max reservable is the account limit minus 100 | taken | "Concurrency" | pass |
| Scale 1,000 new environments per 10 s per function | taken | "Concurrency", [T] | pass |
| Provisioned concurrency and SnapStart are exclusive | taken | "Concurrency", [T] | pass |
| At the limit: sync 429, async retried up to 6 h, streams stop polling | taken | "Asynchronous invocation" (the async half); the 429 row is cut in section 3 | pass (async); fails 1 (429) |
| SnapStart decision tree by runtime | routed | DevOps (deploy configuration) | n/a |
| Production checklist: timeouts not the 3 s default, DLQ on every async path, retention not "never" | taken | `aws-well-architected`, `REL05-BP05`, `COST04-BP05`; `lambda-event-sources`, async | pass |
| Alarm set: errors, throttles, p99 duration, iterator age, DLQ depth | routed | observability (DLQ depth kept in `aws-well-architected`) | n/a |
| Iterator age alarm on a new stream consumer | routed | observability | n/a |
| Response streaming: HTTP API cannot stream; 200 MB; billed after client disconnect | missing | `api-gateway` (HTTP API lacks streaming) and `lambda-event-sources`, payload limits | pass |
| Environment variables total 4 KB | rejected | developer and DevOps; not a system defect | fails 4 |
| Idempotency keys by source and how long to keep them | taken | "Idempotency keys by source" | pass |
| SDK client timeouts shorter than the function timeout | taken | `aws-well-architected`, `REL05-BP05` | pass |
| Lambda calling Lambda synchronously | taken | `aws-well-architected`, `REL04-BP02` | pass |
| Lambda form factors: Managed Instances run async and ESM invocations up to 90 minutes | missing | `aws-well-architected`, 900 s fact and `REL01-BP03` (section 4, item 1) | pass |
| Lambda durable functions: code-first orchestration, waits up to a year | missing | `step-functions`, "Durable execution outside Step Functions" (name it beside Temporal) | pass |
| Web Functions, MicroVMs, routing rules for which skill to load | rejected | product routing, not a defect | fails 2 |
| HTTP API about 70 percent cheaper than REST | taken | `api-gateway` and `COST05-BP05` (without the figure) | pass |
| EventBridge Scheduler, not a rule with a schedule, for cron | rejected | preference, both work | fails 3 |
| Pipes for one source with enrichment; native mapping for one Lambda target | rejected | preference | fails 3 |
| Step Functions history holds full input and output: no secrets in state | routed | security | n/a |

#### B2. aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-messaging-and-streaming/SKILL.md` (cited by `lambda-event-sources`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| EventBridge and SNS DLQs need a queue policy for the service principal | taken | `lambda-event-sources`, "Dead-letter queues that need a policy" | pass |
| Scope those policies with `aws:SourceArn` and `aws:SourceAccount` | routed | security (confused deputy) | n/a |
| Messaging deletes after consumption; streaming retains for replay | rejected | tutorial | fails 1 |
| SQS fair queues for multi-tenant workloads | missing | `multi-tenancy`, "Noisy neighbours" (section 4) | pass |
| New queues short-poll by default; long polling at 20 s | missing | `aws-messaging`, "SQS": a consumer loop on short polling pays per empty receive | pass |
| SSE-SQS by default; customer key for production | routed | security | n/a |
| System attributes (`AWSTraceHeader`) are not returned unless asked | rejected | developer detail | fails 4 |
| SNS to Firehose already newline-delimits | rejected | narrow, data pipeline | fails 1 |
| Broker and Kafka credentials in Secrets Manager | routed | security | n/a |
| Kinesis on-demand mode; MSK Express brokers | rejected | product claims | fails 3 |

#### B3. AWS Lambda, SQS, SNS, EventBridge, DynamoDB, S3 and Kinesis developer guides, archived awsdocs form (cited by `lambda-event-sources`, `aws-messaging`)

Saved: `awsdocs/f/` (Lambda, SQS, SNS, EventBridge, DynamoDB) and `awsdocs2/src/` (S3, Kinesis, SNS, SQS, EventBridge). Each [G] fact taken was re-checked there on this date.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Visibility timeout at least six times the function timeout plus the batching window | taken | `lambda-event-sources`, re-checked | pass |
| SQS scaling up to 60 more per minute, 1,000 batches at most | taken | same, re-checked | pass |
| Async payload 256 KB, sync 6 MB | taken | same, re-checked | pass |
| Reserved concurrency 0 stops events until removed | taken | archive confirms; the skill marks it [T] | pass |
| A JSON filter on a plain-string body drops the message | taken | archive confirms; the skill marks it [T] | pass |
| Stream retry and age defaults -1, maxima 10,000 and 604,800 | taken | re-checked (`API_CreateEventSourceMapping`) | pass |
| Two readers per DynamoDB stream shard | taken | re-checked | pass |
| Initial burst 500 to 3,000 per Region, then 500 per minute | taken | re-checked (`invocation-scaling`) | pass |
| FIFO deduplication 5 minutes; retention 60 s to 14 days, default 4 days | taken | `aws-messaging` | pass |
| A message keeps its original enqueue time when it moves to the DLQ, so a DLQ needs longer retention than the source | missing | `aws-messaging`, retention row: upgrade the [T] advice to this [D] reason | pass |
| A redriven message is a new message with a new `messageId` | missing | `lambda-event-sources`, "Idempotency keys by source": keying on `messageId` repeats work after a redrive | pass |
| Redrive is billed per API call | rejected | minor cost | fails 1 |
| High-throughput FIFO: 300 requests per second per message group | missing | `aws-messaging`, "SQS" (contradicts `docs/experts/architect.md`, which lists FIFO high throughput as a gap no source held) | pass |
| SNS: 100,015 retries over 23 days for SQS and Lambda; client errors not retried | taken | `aws-messaging`, re-checked | pass |
| SNS FIFO topics retry the same way | rejected | adds nothing to the row | fails 1 |
| EventBridge: 24 h and 185 retries; five targets per rule | taken | `aws-messaging`, re-checked | pass |
| S3 notifications at least once, no order, URL-encoded key; recursion | taken | `lambda-event-sources`, "S3 notifications" | pass |
| Kinesis shard 1 MB/s or 1,000 records/s in, 2 MB/s out; enhanced fan-out | taken | `aws-messaging` and `lambda-event-sources` (duplicate, section 3) | pass |
| Kinesis retention 24 h to 365 days; record 1 MB | taken | `aws-messaging` | pass |

#### B4. awslabs/agent-plugins `plugins/aws-serverless/skills/aws-lambda/SKILL.md` and `references/event-sources.md`, `references/event-driven-architecture.md`, `references/troubleshooting.md` (cited by `lambda-event-sources` and `aws-messaging`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| All event sources deliver at least once | taken | `plan.md`, "Duplicates and retries" | pass |
| Visibility timeout at least the function timeout | rejected | wrong: the guide says six times (archive confirms) | fails 3 |
| `ParallelizationFactor` should not exceed the shard count | rejected | wrong: the factor is per shard | fails 3 |
| FIFO: batch size 1 and a low `MaximumConcurrency` for strict order | rejected | wrong as a rule: order holds per group at any batch size | fails 3 |
| DLQ receive limit 3 to 5 | taken | `aws-messaging`, receive limit row [T] | pass |
| FIFO SNS topics cannot invoke Lambda | taken | `aws-messaging`, SNS | pass |
| DLQ retention 14 days on SNS subscriptions | taken | `aws-messaging`, retention row | pass |
| S3 recursion, order and key decoding | taken | `lambda-event-sources`, "S3 notifications" | pass |
| Provisioned mode 3 times faster scaling, 16 times capacity | missing | `lambda-event-sources`, "Concurrency" (with B1's provisioned mode row) | pass |
| Kafka and MQ mappings need VPC reach and ports | routed | DevOps | n/a |
| Choreography against orchestration | taken | `aws-well-architected`, `REL04-BP02` | pass |
| A custom bus for application events | rejected | preference | fails 3 |
| `detail` up to 1 MB | taken | `aws-messaging`, [T] | pass |
| Five targets per rule; fan out through SNS or SQS | taken | `aws-messaging` | pass |
| Event envelope with id, version, correlation id | routed | softarch (event contract) and observability | n/a |
| Light events race between publish and the consumer's fetch | missing | `aws-messaging`, EventBridge: a consumer that calls back the publisher's API for state the event did not carry | pass |
| Version a breaking change in `detail-type` and publish both | taken | `aws-messaging` (merge candidate with softarch, section 3) | pass |
| Do not version events with Lambda versions or API stages: IAM does not version with them | missing | softarch, pending event-schema-evolution (the `aws-messaging` schema row merges there, section 3) | pass |
| EventBridge `RetryPolicy` and DLQ on every target | taken | `aws-messaging` | pass |
| Archive and replay for recovery | taken | `aws-messaging` | pass |
| Pipes against rules | rejected | preference | fails 3 |
| Schema registry and code bindings | routed | softarch | n/a |
| Push or poll by ordering and throughput control | rejected | tutorial | fails 1 |
| X-Ray does not connect publisher and consumer across the bus | routed | observability | n/a |
| Lambda limits table: 900 s, 1,769 MB per vCPU, 1 MB async, 250 MB package, 4 KB environment | taken | 900 s and payloads in `aws-well-architected` and `lambda-event-sources`; package limits routed to DevOps | pass |
| Module-level variables leak user data between callers | routed | security | n/a |
| Asynchronous invokes are always accepted; throttling happens later and ends in retries or the DLQ | missing | `lambda-event-sources`, "Asynchronous invocation": a plan that expects the caller to see a throttle | pass |
| Concurrency equals RPS times duration; default 1,000 per Region | taken | "Concurrency" | pass |
| SQS in front of Lambda to absorb spikes | taken | `plan.md`, "Components and flows" (a queue needs a named reason: a spike to absorb) | pass |
| 502 means a malformed proxy response; 503 a throttle | rejected | troubleshooting, not a design defect | fails 2 |
| VPC Lambda reaches AWS services through gateway endpoints, interface endpoints or NAT | taken | `lambda-event-sources`, "Lambda in a VPC"; `COST08-BP03` | pass |
| IPv6 with an egress-only internet gateway replaces NAT for a VPC Lambda | missing | `aws-well-architected`, `COST08-BP03` "When it does not apply" (section 4) | pass |
| Subnet address exhaustion at high concurrency | taken | "Lambda in a VPC", [T] | pass |
| SnapStart: unique values and connections captured in the snapshot | routed | developer | n/a |
| Step Functions should retry `Lambda.ServiceException` | missing | `step-functions`, "Errors and retries" | pass |
| Default to TypeScript and CDK; MCP setup | rejected | tooling | fails 4 |

#### B5. AWS SDK for Go, Lambda API reference (cited by `lambda-event-sources`, `aws-well-architected`)

No file to audit: the maintainer's live check of 2026-10-20 ([R]), recorded as claim 6 in the research file (A1). It informed `MaximumConcurrency` minimum 2, taken.

#### B6. itsmostafa/aws-agent-skills `skills/sqs/SKILL.md`, `skills/sns/SKILL.md`, `skills/eventbridge/SKILL.md` (cited by `aws-messaging`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Visibility timeout default 30 s; retention 4 to 14 days; size 256 KB | taken | `aws-messaging` (from the guide) | pass |
| Long polling at 20 s | missing | `aws-messaging`, SQS (with B2's row) | pass |
| Receive limit usually 3 to 5 | taken | `aws-messaging`, [T] | pass |
| Delete only after the work is done | taken | `aws-messaging`, [T] | pass |
| FIFO throughput 300 messages per second, 3,000 batched | missing | `aws-messaging`, SQS (with the archive's per-group figure, B3) | pass |
| FIFO is "exactly-once" | rejected | misleading: deduplication lasts 5 minutes | fails 3 |
| SNS push, nothing stored; put SQS in front | taken | `aws-messaging`, SNS, [T] | pass |
| SNS cannot filter on the body | rejected | wrong (`FilterPolicyScope`) | fails 3 |
| Filter attribute types must match (String against Number) | missing | `aws-messaging`, SNS filter row | pass |
| Correlation ids in messages | routed | observability | n/a |
| Five targets per rule | taken | `aws-messaging` | pass |
| `PutEvents` takes up to 10 entries per call | rejected | developer detail | fails 1 |
| Use specific patterns; archive selectively | rejected | generic | fails 2 |
| CLI command tables | rejected | tutorial | fails 1 |

#### B7. aws/agent-toolkit-for-aws `skills/specialized-skills/serverless-skills/amazon-eventbridge-event-bus/SKILL.md` (cited by `aws-messaging`)

Saved copy, 34 KB, read by sections 1 to 23 and grep. `references/replay-and-recovery.md` was saved and read; the other ten references were not saved and not read.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| The newer buses have different defaults | taken | `aws-messaging`, EventsV2 note | pass |
| Retry policy: `MaxRetryAttempts` 0 to 185, default 5; `MaxEventAgeInSeconds` 60 to 86,400, default 300 | missing | `aws-messaging`, EventsV2 note: state the numbers [T] (section 4) | pass |
| The dead-letter queue must be a standard queue; FIFO is refused | missing | same | pass |
| A dead-letter record carries the id and time, not the payload; replay needs the event still retained | missing | same | pass |
| The delivery role must be able to write the DLQ | taken | `lambda-event-sources`, DLQ policy row (same idea) | pass |
| An event must match every filter on a subscriber (AND), unlike rule patterns | missing | same | pass |
| A pattern must not carry `source`, `account` or `region` | rejected | the API rejects it | fails 4 |
| Filter on `aws:Source` when provenance matters | routed | security | n/a |
| `DEDUPLICATED` is a success code | missing | `aws-messaging`, EventsV2 note: code that counts every success as a new event | pass |
| Ordering per event group; an undeliverable event holds up its group | missing | same | pass |
| A constant deduplication id drops everything after the first | taken | `aws-messaging`, FIFO row | pass |
| Supply a `ClientToken` when a retry can cross a process | missing | same: a create retried from a queue makes a second resource | pass |
| Update APIs replace whole blocks; a partial update discards settings | routed | DevOps (`cloudformation-and-cdk`, drift) | n/a |
| Replayed events are marked `REPLAY` | missing | `aws-messaging`, archive and replay row | pass |
| A replay starts late, then runs at live speed | rejected | operational | fails 2 |
| Subscriber logs are off by default | routed | observability | n/a |
| IAM action names, `eventsv2:` is not an action | routed | security | n/a |
| Throttling and `ConcurrentModificationException` are retryable | rejected | developer detail | fails 1 |

#### B8. AWS Step Functions developer guide, archived awsdocs form: `concepts-standard-vs-express.md`, `limits-overview.md`, `concepts-error-handling.md`, `amazon-states-language-map-state.md`, `input-output-resultpath.md` (cited by `step-functions`)

Saved in `awsdocs/f/`. The Distributed Map page in the archive is empty (14 bytes).

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Standard 1 year, Express 5 minutes; exactly once against at least or at most once | taken | `step-functions`, re-checked | pass |
| Express lacks `.sync`, `.waitForTaskToken` and activities | taken | same | pass |
| 25,000 history events; 256 KB payload | taken | same | pass |
| Standard history kept 90 days | missing | `step-functions`, history row (archive confirms; the skill says only "kept by the service") | pass |
| Express history only in CloudWatch Logs when logging is on | taken | same, [T]; archive confirms (section 4) | pass |
| `States.ALL` misses `DataLimitExceeded` and `Runtime`, and goes last | taken | same | pass |
| Retrier defaults 1, 3, 2.0 | taken | same | pass |
| `Catch` without `ResultPath` replaces the input | taken | same | pass |
| `States.NoChoiceMatched` when no rule matches and there is no `Default` | taken | `step-functions`, [T]; archive confirms (section 4) | pass |
| Retries are state transitions and are billed | taken | `step-functions`, [T]; archive confirms (section 4) | pass |
| Inline `Map` throttled above about 40 concurrent | taken | same | pass |
| Parallel: a failed branch fails the state; running Lambda calls continue | taken | same | pass |
| Execution names unique per account and Region | taken | `step-functions`, "What breaks it" | pass |
| Start-rate bucket: Standard 1,300 refilling at 300 per second | taken | same; conflicts with 2026 sources (section 4) | pass |

#### B9. aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-serverless/references/orchestration.md` (cited by `step-functions`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Standard against Express table | taken | `step-functions` | pass |
| Execution name unique for 90 days as built-in idempotency | rejected | not confirmed in the guide (NOTICE says so) | fails 3 |
| Distributed Map: 10,000 children, Standard only | taken | `step-functions`, [T] | pass |
| Parallel output is an array; all branches must succeed | taken | same | pass |
| Always a `Default` on `Choice` | taken | same | pass |
| `States.Permissions`, `States.ItemReaderFailed`, `States.ResultWriterFailed` | rejected | names only, no defect pattern | fails 1 |
| `JitterStrategy` default `NONE`; `FULL` spreads retries | taken | same, [T] | pass |
| Retries happen before catchers | rejected | follows from the rows already there | fails 1 |
| Always retry `Lambda.ServiceException` and `Lambda.SdkClientException` | missing | `step-functions`, "Errors and retries" (with B4) | pass |
| Watch execution failures through EventBridge status events | routed | observability | n/a |
| A broad pattern that matches the rule's own output loops | missing | `aws-messaging`, EventBridge: a target that publishes events the same rule matches | pass |
| Prefer direct SDK integrations to a Lambda in between | rejected | preference | fails 3 |
| Choosing Durable Functions or Step Functions | missing | `step-functions`, durable execution section (with B1) | pass |

#### B10. aws/agent-toolkit-for-aws and awslabs/agent-plugins `aws-step-functions` skills, `SKILL.md`, `references/error-handling.md`, `references/service-integrations.md` (cited by `step-functions`; counted as one source)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Standard 2,000 executions per second, Express 100,000 | missing | conflicts with the 2022 start-rate row (section 4) | pass |
| Express must be named with its lack of `.sync` and callbacks | taken | `step-functions`, table | pass |
| In one JSONata state, `Assign` and `Output` read the same input, so a variable set in `Assign` is not visible in `Output` | missing | `step-functions`, new row under "Errors and retries" or a "Data" row | pass |
| A JSONata expression that yields undefined throws `States.QueryEvaluationError` | missing | same | pass |
| A matched `Catch` skips the state's own `Assign`; without `Output` the state output is the raw error | missing | `step-functions`, `Catch` row (the JSONata form of the `ResultPath` rule) | pass |
| One state cannot mix JSONPath and JSONata fields | rejected | the validator refuses it | fails 4 |
| `.sync:2` child output is a JSON string | rejected | developer detail | fails 1 |
| The optimized Lambda integration wraps the result in `Payload` | rejected | developer detail | fails 1 |
| Map tolerated failures; `States.ExceedToleratedFailureThreshold` | taken | `step-functions`, [T] | pass |
| Retry counts reset on a state change | taken | same, [T] | pass |
| `States.ALL` alone in its `ErrorEquals` | rejected | the validator refuses it | fails 4 |
| Task tokens are credentials; no PII in messages; cross-account trust conditions | routed | security | n/a |
| Validate input at the start with `$exists` and route to `Fail` | rejected | generic | fails 1 |
| `MaxConcurrency` on Map to protect downstream | taken | `step-functions`, inline Map row | pass |
| Logging level ALL or ERROR; required for Express | taken | `step-functions`, "What breaks it" (Express with logging off) | pass |
| TestState with mocks | routed | quality | n/a |

#### B11. wshobson/agents `plugins/backend-development/skills/workflow-orchestration-patterns/SKILL.md` and `references/details.md` (cited by `step-functions`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Workflow code is deterministic: no clock, random, threads or I/O | taken | `step-functions`, durable execution | pass |
| Changing code under running executions needs versioning or a new type | taken | same | pass |
| Activities have bounded retries; validation errors are non-retryable | taken | same | pass |
| Temporal retries an activity forever by default | missing | same, as the reason for the row (section 4) | pass |
| Activities have timeouts and heartbeats | taken | same idea in `step-functions` Task rows | pass |
| Activity payload 2 MB per argument | missing | `step-functions`, durable execution (section 4) | pass |
| Register the compensation before running the step | missing | `step-functions`, "Sagas" (see section 3, saga row 18) | pass |
| Compensations are idempotent and run in reverse | taken | "Sagas" | pass |
| Fan out a million tasks as 1,000 children of 1,000 | rejected | sizing advice, Temporal only | fails 2 |
| When not to use a workflow engine | rejected | generic | fails 1 |

#### B12. wshobson/agents `plugins/backend-development/skills/saga-orchestration/SKILL.md` and `references/details.md` (cited by `step-functions`)

`references/advanced-patterns.md` was not saved and was not read.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Compensate completed steps only, in reverse order | taken | "Sagas" | pass |
| A step that partly ran still needs compensation | missing | "Sagas", first bullet: a step that timed out or failed partway has an unknown outcome (conflicts with today's wording, section 3) | pass |
| A compensation that finds nothing to undo succeeded | taken | same | pass |
| A failed compensation: retry, DLQ, alert a person | taken | same | pass |
| A timeout per step, not one for the saga | taken | same | pass |
| Test a failure at each step | taken | same; section 3 moves it to quality `test-craft` | fails 4 |
| Stuck in "compensating" means a handler never reported | taken | same; section 3 cuts the row | fails 2 |
| Orchestration against choreography | rejected | tutorial | fails 1 |
| A saga log table to replay a choreography | rejected | heavier design choice | fails 3 |
| No synchronous calls inside a saga step | rejected | dogma | fails 3 |
| `saga_id` through every event | routed | observability | n/a |

#### B13. Amazon API Gateway developer guide, archived awsdocs form: `limits.md`, `http-api-vs-rest.md`, `api-gateway-caching.md`, the Lambda authorizer pages, the WebSocket integration page (cited by `api-gateway`)

Saved in `awsdocs2/src/apigw/doc_source/` (355 files).

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| REST integration timeout 50 ms to 29 s, not raisable in this form | taken | `api-gateway`, re-checked (`limits.md`) | pass |
| HTTP 30 s, WebSocket 29 s | taken | same | pass |
| 10 MB payload | taken | same | pass |
| Account throttle 10,000 RPS with a burst bucket, shared by REST, HTTP and WebSocket | taken | same, re-checked | pass |
| Usage plans per API key: 10 | rejected | quota, no defect | fails 1 |
| What HTTP APIs lack | taken | same | pass |
| Authorizer and cache TTL 300 s default, 3,600 s maximum | taken | same | pass |

#### B14. awslabs/agent-plugins `plugins/aws-serverless/skills/api-gateway/SKILL.md` and `references/pitfalls.md`, `references/service-limits.md`, `references/performance-scaling.md` (cited by `api-gateway`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| REST timeout raisable to 300 s on Regional and private APIs | taken | `api-gateway`, [T] | pass |
| The function keeps running after the client got a 504 | taken | same, [T] | pass |
| HTTP API returns 504 with a "Service Unavailable" body | rejected | troubleshooting | fails 2 |
| Lower account throttle in opt-in Regions (2,500 RPS, 1,250 burst) | taken | `api-gateway` ("lower in some Regions"); the figures are missing (section 4) | pass |
| Usage plan limits are per key | taken | same, [T] | pass |
| One key in two usage plans for the same stage picks one at random | missing | `api-gateway`, usage plan row | pass |
| Throttle limits are best-effort | missing | `api-gateway`, account throttle row: a design that depends on an exact cut-off | pass |
| Cache billed hourly even when empty | taken | `api-gateway`, cache row | pass |
| A new deployment flushes the stage cache, sending the full load to the backend | missing | `api-gateway`, cache row | pass |
| Cached response at most 1 MB; only GET cached by default | missing | same | pass |
| Cache keys must include the client identity | routed | security (as `docs/experts/architect.md` decided) | n/a |
| The REST cache cuts latency and load but not request cost; CloudFront in front cuts all three | missing | `caching-and-latency`, CloudFront | pass |
| Edge-optimized endpoints do not cache at the edge | missing | `api-gateway` and `caching-and-latency`, CloudFront: a plan that counts edge-optimized as a CDN | pass |
| INFO execution logging costs more than the API | taken | `api-gateway`, [T] | pass |
| Execution log events truncated at 1,024 bytes | routed | observability | n/a |
| Canary deployments test the API snapshot, not Lambda code | routed | DevOps (`release-safety`) | n/a |
| Management API 10 RPS | routed | DevOps | n/a |
| Lambda authorizer billed for rejected requests; WAF in front | taken | `api-gateway`, authorizer row | pass |
| Payload decompressed before Lambda, still under 6 MB | missing | `api-gateway`, payload row | pass |
| WebSocket: 128 KB message, 32 KB frame, 2 h connection, 10 min idle | missing | `api-gateway`, new row: a design that holds a connection past 2 h or sends larger messages | pass |
| HTTP API: Lambda authorizer timeout 10 s, JWKS 1.5 s, JWT keys cached 2 h | routed | security | n/a |
| Header drops and URL-encoding rules | rejected | developer detail | fails 1 |
| `/ping` and `/sping` reserved | rejected | narrow | fails 1 |
| 413 is the only response that cannot be customised | rejected | narrow | fails 1 |
| Redeploy a REST API after a configuration change | routed | DevOps | n/a |
| Root-level OpenAPI `security` ignored; `maxItems` not validated | routed | security and softarch | n/a |
| Scale the whole stack, not only the gateway | taken | `review.md`, "A budget the parts cannot fit" | pass |
| Cell-based routing | rejected | heavier by default | fails 1 |
| No X-Ray on HTTP APIs | routed | observability | n/a |

#### B15. cloudflare/security-audit-skill `DATA-ISOLATION-AND-LIFECYCLE.md` (cited by `multi-tenancy`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A tenant field is not isolation; find the enforcing query, key or policy | taken | `multi-tenancy`, "Enforcement where data is read" | pass |
| Tenant identity from the body | taken | `multi-tenancy`, "Tenant context" (border with security, section 6) | pass |
| Background, admin, import and legacy paths that skip the scope | taken | `multi-tenancy`, "One predicate on every path" and "survives every asynchronous hop" | pass |
| Keys, paths, uniqueness and deduplication ids without the tenant | taken | "Keys and uniqueness" and "Shared resources" | pass |
| Policy and query disagree (views, joins, aggregates, service clients) | taken | "One predicate on every path" | pass |
| Signed URLs and object references that outlive or exceed the issuer's access | routed | security | n/a |
| Search, cache and index copies drift from the record's ACL | taken | "Derived copies are filtered when they are read" | pass |
| Logs and analytics as other readers | taken | "Logs and analytics" | pass |
| Counts, errors and timing as existence oracles | routed | security | n/a |
| An export or backup that includes other tenants | missing | `multi-tenancy`, "Derived copies": an export job that selects by a filter the requester does not own | pass |
| Import or restore that writes into a tenant the requester cannot write | routed | security (authorisation) | n/a |
| Migration defaults and partial rollouts with different defaults | taken | "Migrations do not default the tenant" | pass |
| Replicas, restore environments or keys with a broader scope | routed | security and DevOps | n/a |
| Soft-deleted records returned by a path that ignores the tombstone | missing | `multi-tenancy`, "Cost and lifecycle", deletion row | pass |
| Membership removal leaves caches, sessions or jobs authorising | missing | `multi-tenancy`, deletion row (with `caching-and-latency` invalidation) | pass |
| Queued retries recreate deleted data | taken | deletion row | pass |
| A restore brings back deletions and memberships made after the snapshot | missing | `multi-tenancy`, deletion row | pass |
| Two dummy tenants as the proof method | rejected | the expert runs nothing | fails 4 |

#### B16. supabase/agent-skills `security-rls-basics.md` and `security-rls-performance.md` (cited by `multi-tenancy`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Row-level security enforced in the database, not only in the application | taken | `multi-tenancy`, Postgres row | pass |
| `FORCE ROW LEVEL SECURITY` so the table owner is bound too | taken | `multi-tenancy`, Postgres row | pass |
| Wrap `auth.uid()` in a subselect; index policy columns | routed | data expert (planned) | n/a |
| `SECURITY DEFINER` functions bypass RLS; check the caller inside | routed | security and data | n/a |
| "5 to 10 times faster" claims | rejected | the two files contradict each other | fails 3 |

The owner-bypass behaviour behind the `FORCE` rule is a Postgres fact; a primary source (the Postgres manual) can confirm it (section 4).

#### B17. aws/agent-toolkit-for-aws CloudFront `references/multi-tenant-distributions.md` and the Aurora DSQL `tenant_query.py` sample (cited by `multi-tenancy`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A shared template is a shared blast radius | taken | `multi-tenancy`, isolation model | pass |
| Connection groups limit the blast radius between tenant groups | missing | `multi-tenancy`, shared configuration row ("When it does not apply") | pass |
| Per-tenant WAF rules and rate limits | taken | "Noisy neighbours" | pass |
| Logs carry a tenant identifier field | taken | "Logs and analytics" | pass |
| What can be customised per tenant; unsupported features; activation | rejected | product detail | fails 1 |
| A well-formed tenant id does not prove membership | taken | "Tenant context" | pass |
| Validate a tenant slug before interpolating it into SQL | routed | security | n/a |

#### B18. AWS SaaS Lens, principle and isolation-model names (cited by `multi-tenancy`)

No file to audit: the lens text was not reachable and has no public source repository. The names are in the research record (A1) and are audited there.

#### B19. aws/agent-toolkit-for-aws `skills/specialized-skills/database-skills/amazon-elasticache/SKILL.md` and `references/rds-acceleration.md`, `references/production-readiness.md`, `references/data-modeling/instructions.md` (cited by `caching-and-latency`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A write path that misses its invalidation | taken | `caching-and-latency`, first row | pass |
| Stampede guard; early recompute | taken | "One recompute per hot key" | pass |
| Its stampede helper falls through to the database after a fixed wait | rejected | wrong, the skill's NOTICE says so | fails 3 |
| Tenant prefix in every key; hash tags for a tenant's multi-key operations | taken | `caching-and-latency`, keys and hash tags; `multi-tenancy`, shared resources | pass |
| The cache is optional: wrap calls, degrade | taken | "A cache is optional" | pass |
| Serverless eviction is fixed at `volatile-lru` | taken | Serverless row, [T] | pass |
| Serverless needs `CacheUsageLimits` on storage and ECPU, or cost grows without bound | missing | `caching-and-latency`, Redis and ElastiCache: a serverless cache resource with no usage limits | pass |
| Serverless has no daily snapshot unless set | rejected | a cache is rebuildable; sessions are the exception and `REL09-BP01` covers stores | fails 4 |
| At-rest encryption only at creation; TLS two-step | routed | security and DevOps | n/a |
| No default user; RBAC or IAM auth | routed | security | n/a |
| Multi-AZ, failover, a replica per shard required | rejected | heavier by default | fails 1 |
| Client connect 2 to 5 s, command 1 to 2 s; DNS TTL 5 s for failover | rejected | fixed numbers; developer | fails 3 |
| Reads from replicas lag the primary | missing | `caching-and-latency`, correctness: a read-after-write path pointed at the reader endpoint | pass |
| RDS and ElastiCache event notifications are operational, not row changes | missing | `caching-and-latency`, first row: a plan that invalidates from RDS events | pass |
| Global Datastore cross-Region failover is manual | missing | `caching-and-latency`, Redis and ElastiCache: a plan that claims automatic Region failover | pass |
| Write-through "eliminates stale data" | rejected | wrong; the skill says the opposite | fails 3 |
| `KEYS` and large `SMEMBERS` block | taken | "No blocking scans" (section 3 narrows it to large collections) | pass (`SMEMBERS`); fails 1 (`KEYS`) |
| Restricted commands on ElastiCache (`CONFIG`, `SAVE`, `DEBUG`) | missing | `caching-and-latency`, Redis and ElastiCache: code that calls `CONFIG SET` on a managed endpoint | pass |
| Never create a client at module level | rejected | conflicts with Lambda's advice to build clients outside the handler; the real rule is lazy creation | fails 3 |
| Pooling is 13 times faster per request | rejected | vendor benchmark | fails 3 |
| Vector search needs node-based Valkey 8.2 or later | routed | Generative AI expert | n/a |
| Valkey pricing and version ladder | rejected | goes stale, no defect | fails 1 |
| Tagging every created cache | rejected | tooling | fails 4 |

#### B20. aws/agent-toolkit-for-aws CloudFront `SKILL.md` and `references/when-to-use-cloudfront.md` (cited by `caching-and-latency`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A minimum TTL above zero overrides `no-cache`, `no-store` and `private` | taken | `caching-and-latency`, CloudFront | pass |
| TTLs and the cache key live in a cache policy | taken | same | pass |
| The default behaviour is evaluated last; give `/api/*` its own | taken | same | pass |
| Caching does not protect an origin from dynamic traffic | taken | same | pass |
| CloudFront Functions run only on viewer events and have no network access | missing | `caching-and-latency`, CloudFront: an edge function that fetches or is attached to an origin event | pass |
| Static IP, non-HTTP or sub-minute failover needs Global Accelerator | missing | `aws-well-architected`, `REL13-BP02` or `plan.md`, AWS fit | pass |
| OAC, VPC origins, origin mTLS | routed | security | n/a |
| Security headers, WAF baseline, TLS minimum | routed | security | n/a |
| Flat-rate pricing | rejected | buying decision | fails 2 |
| Logging on from creation | routed | observability | n/a |

#### B21. affaan-m/ECC `skills/redis-patterns/SKILL.md`, `skills/latency-critical-systems/SKILL.md`, `skills/content-hash-cache-pattern/SKILL.md` (cited by `caching-and-latency`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Eviction policy table | taken | eviction row | pass |
| Always set a TTL | taken | TTL row | pass |
| `KEYS *` blocks | taken | "No blocking scans" (narrowed in section 3) | fails 1 |
| One Redis for cache and queue | taken | eviction row | pass |
| Stampede on a cold or expired key | taken | "One recompute per hot key" | pass |
| Lock with no fencing token | rejected | wrong as given | fails 3 |
| A lock whose TTL is shorter than the job lets a second worker in | missing | `caching-and-latency`, Redis: a lock TTL set below the guarded job's timeout | pass |
| Pub/Sub delivers nothing to a subscriber that is down; Streams for delivery | missing | `caching-and-latency` or `aws-messaging`: Redis Pub/Sub used to hand out jobs | pass |
| Blobs over 100 KB | rejected | threshold opinion | fails 3 |
| Write-through gives strong consistency | rejected | wrong; the skill says the opposite | fails 3 |
| Map each hop of the hot path; split p50, p95, p99 and freshness | taken | "The miss path fits the deadline" (hop budget) | pass |
| Do not hide stale data behind fast hits | taken | TTL row | pass |
| The key holds every input, including parameters and config | taken | "The key holds every input" | pass |
| Content hashes as keys survive renames | rejected | tutorial | fails 1 |

#### B22. Amazon CloudFront developer guide, archived awsdocs form (not cited: `caching-and-latency` marks its CloudFront minimum-TTL row [G] but its NOTICE names no AWS guide)

Saved in `awsdocs2/src/cf/`. Read for the minimum-TTL row and for the gaps the skill lists as uncovered.

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Minimum TTL and origin cache headers | taken | CloudFront row (re-checked) | pass |
| With minimum TTL above zero and the origin down, CloudFront serves the last object; `stale-if-error=0` stops it | missing | `caching-and-latency`, CloudFront | pass |
| First 1,000 invalidation paths a month free; at most 3,000 files or 15 wildcard paths in progress | missing | `caching-and-latency`, CloudFront: a deploy step that invalidates per object at scale (the skill says this is uncovered for lack of a source) | pass |
| Headers, cookies and query strings in the cache policy are both the cache key and forwarded | missing | `caching-and-latency`, CloudFront: `Authorization` forwarded without being in the key | pass |

#### B23. AWS Well-Architected pages, VPC pricing, VPC endpoints and PrivateLink pricing, SQS CloudWatch metrics, re:Post on the Lambda quotas page (cited by `aws-well-architected`)

No file to audit: the maintainer's live check of 2026-10-20 ([R]). The record is the research file, audited as A1. Nothing was re-fetched (the proxy refuses docs.aws.amazon.com).

#### B24. Amazon EC2 Auto Scaling and EC2 user guides, archived awsdocs form (cited by `aws-well-architected`)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| The EC2 status check is the default health check type | taken | `REL07-BP02`, re-checked (`asg_ec2-auto-scaling-health-checks.md`) | pass |
| T4g, T3a and T3 launch as unlimited by default | taken | `COST06-BP02`, re-checked | pass |

### Part C. Our own records (not counted as sources)

- `docs/experts/architect.md` routes "a tenant id taken from the request body as an authorisation bug" to security, while `multi-tenancy` holds that exact rule as the architect's. It also routes "`SET LOCAL` against `SET` for session context" to the data expert, while `multi-tenancy` holds that rule too. Both are border rows in section 6; one of the two files has to change.
- `docs/experts/architect.md` lists "FIFO high-throughput limits" as a gap no source held. The archived SQS guide holds it (`sqs_high-throughput-fifo.md`: 300 requests per second per message group), and itsmostafa gives 300 and 3,000. It also lists CloudFront invalidation as uncovered; the archived CloudFront guide holds the free allotment and the in-progress limits (B22).
- `docs/experts/architect.md` says the seven skills are about 43 KB. They are 44,818 bytes against the 40 KB cap in `experts.js` (`SKILLS_BYTES = 40 * 1024`), so a change that selects all seven still loses `aws-well-architected`.
- `aws-well-architected`'s practice rows carry no per-row source tag (only the facts table names a source). At conversion each needs [D] for the ID and title and [O] for the "what it looks like" column, or the rows fail value test 3.
- `caching-and-latency` tags its CloudFront minimum-TTL row [G] but its NOTICE names no AWS guide (B22). Several facts the archive confirms are still tagged [T]: the plain-text filter drop, reserved concurrency 0, `States.NoChoiceMatched`, billed retries, Express history in logs, and the DLQ retention advice.
- `references/CHANGES.md` and the NOTICE agree with the items above. The agent file still says the workflow pastes "`aws-well-architected` when the change touches AWS infrastructure"; seven skills are now pasted.

## 3. Today's rows, value test

Every table row and bullet in the seven skills and the two references, numbered in file order. Prose paragraphs that state a rule are listed with a P number.

### `lambda-event-sources`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| lambda-event-sources | 1 Visibility timeout six times function timeout plus window | keep | non-obvious, [D] re-checked |
| lambda-event-sources | 2 Batch limits, window at least 1 s above batch 10, 6 MB | keep | add "no window on FIFO" (B1) |
| lambda-event-sources | 3 Filter deletes unmatched; JSON filter drops plain text | keep | re-tag the second half [D] (archive) |
| lambda-event-sources | 4 FIFO scales to active message groups | keep | non-obvious |
| lambda-event-sources | 5 Scaling rate 2022 against 2026 | keep | on the fact-check list |
| lambda-event-sources | 6 `MaximumConcurrency` min 2, max 1,000 | keep | canonical home; merge `aws-well-architected` rows 5 and 17 here |
| lambda-event-sources | 7 `MaximumConcurrency` reserves nothing | keep | non-obvious |
| lambda-event-sources | 8 SQS partial batch edge cases | keep | non-obvious, [D] |
| lambda-event-sources | 9 Streams checkpoint at lowest failed | keep | add the exception-means-bisect case (B1) |
| lambda-event-sources | 10 FIFO stop at first failure | keep | on the fact-check list |
| lambda-event-sources | 11 Stream retry and age default infinite | keep | add the 60 s minimum (B1) |
| lambda-event-sources | 12 DynamoDB Streams keep 24 h | keep | gives the row above its cost |
| lambda-event-sources | 13 Bound with bisect, limit, age, on-failure destination | keep | add S3 and Kafka destinations |
| lambda-event-sources | 14 Two readers per shard, one for global tables | keep | the global-tables half on the fact-check list |
| lambda-event-sources | 15 Reserved up to unreserved minus 100; 0 stops all | keep | re-tag the 0 half [D] (archive) |
| lambda-event-sources | 16 Provisioned not above reserved, not on `$LATEST`; not with SnapStart | keep | SnapStart half on the fact-check list |
| lambda-event-sources | 17 Provisioned does not drain a backlog; pollers do | keep | name provisioned mode (B1) |
| lambda-event-sources | 18 A throttled synchronous caller gets a 429 | cut | fails 1: a strong reviewer knows a throttle returns an error |
| lambda-event-sources | 19 Concurrency is RPS times duration; burst ceilings | keep | add the RPS quota (ten times concurrency) |
| lambda-event-sources | P1 A catch-all handler that reports no failures | merge with `failure-handling` | the developer skill's "partial failure reported as success" holds it; keep the pointer only |
| lambda-event-sources | P2 Async retries up to 6 h, 0 to 2 retries; needs a destination or DLQ | keep | non-obvious, [D] |
| lambda-event-sources | P3 Reserved 0 sends async events straight to the DLQ | keep | [D] |
| lambda-event-sources | P4 Payload limits 6 MB, 256 KB or 1 MB | keep | on the fact-check list |
| lambda-event-sources | P5 S3 notifications: at least once, no order, encoded key, recursion | keep | [D] |
| lambda-event-sources | P6 Kinesis read capacity shared, enhanced fan-out | merge with `aws-messaging` | duplicate of `aws-messaging` row 22 |
| lambda-event-sources | P7 VPC Lambda has no internet without NAT; shared ENIs; small subnet | keep | add the IPv6 egress-only option |
| lambda-event-sources | P8 Idempotency key by source, kept as long as redelivery | keep | add "a redriven SQS message has a new `messageId`" (B3) |
| lambda-event-sources | P9 DLQ for EventBridge or SNS needs a queue policy | keep | the source-condition half is security's |

### `aws-messaging`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| aws-messaging | 1 Standard at least once, no order; FIFO per group | keep | the per-message group id case is non-obvious |
| aws-messaging | 2 FIFO deduplication 5 minutes; constant id drops all | keep | [D] |
| aws-messaging | 3 Retention 4 days default; DLQ gets the longest | keep | re-tag [D] with the enqueue-time reason (B3) |
| aws-messaging | 4 Visibility default 30 s, max 12 h | keep | the default is what bites |
| aws-messaging | 5 Receive limit 3 to 5 | keep | the range is opinion [T]; the two extremes are checkable |
| aws-messaging | 6 Redrive needs an allow policy and a task | keep | [D] |
| aws-messaging | 7 Delete only after the work is durable | merge with `review.md` | `review.md`, "A failure nobody sees" holds "acknowledges before the work is durable" |
| aws-messaging | 8 Message size 256 KB or 1 MB; large payloads to S3 | keep | on the fact-check list; absorb row 14 |
| aws-messaging | 9 SNS filter scope attributes or body | keep | non-obvious, [D] |
| aws-messaging | 10 SNS DLQ belongs to the subscription | keep | [D] |
| aws-messaging | 11 SNS retries; client errors discarded without a DLQ | keep | [D] |
| aws-messaging | 12 FIFO topic only to SQS FIFO | keep | [D] |
| aws-messaging | 13 SNS stores nothing; a queue in front | merge with row 11 | the retry policy is the only buffer; one row says both |
| aws-messaging | 14 SNS message size 256 KB (no "breaks" cell) | merge with row 8 | duplicate size fact |
| aws-messaging | 15 EventBridge 24 h, 185 retries, then dropped | keep | [D] |
| aws-messaging | 16 Five targets per rule | keep | [D] |
| aws-messaging | 17 Entry 256 KB or `detail` 1 MB | keep | on the fact-check list |
| aws-messaging | 18 Archive replay to today's consumers, any order | keep | add the `REPLAY` marker for the new buses |
| aws-messaging | 19 Schema change by adding fields; version `detail-type` | merge with softarch `schema-evolution` | event contracts are softarch's (pending event-schema-evolution, prompt 3b); `review.md` keeps in-flight compatibility |
| aws-messaging | P1 EventsV2 defaults differ | keep | expand with B7's numbers once checked |
| aws-messaging | 20 Kinesis retention 24 h to 365 days | keep | [D] |
| aws-messaging | 21 Record 1 MB | keep | [D] |
| aws-messaging | 22 Shard throughput; enhanced fan-out | keep | canonical home (absorbs `lambda-event-sources` P6) |
| aws-messaging | 23 Order per shard per key | keep | [D] |

### `step-functions`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| step-functions | 1 Longest run 1 year or 5 minutes | keep | [D] |
| step-functions | 2 Exactly once against at least or at most once | keep | non-obvious |
| step-functions | 3 Express lacks `.sync`, callbacks, activities, Distributed Map | keep | [D]; Distributed Map half on the fact-check list |
| step-functions | 4 History 25,000 events; Express only in logs | keep | add Standard 90 days; re-tag Express half [D] (archive) |
| step-functions | P1 "What breaks it": async Express side effects, logging off, history overflow; names unique | keep | the examples carry the table |
| step-functions | 5 256 KB between states; pass an S3 key | keep | [D] |
| step-functions | 6 Inline Map about 40; Distributed Map 10,000 | keep | the 10,000 half on the fact-check list |
| step-functions | 7 `States.ALL` misses two errors, goes last | keep | non-obvious |
| step-functions | 8 Retrier defaults; `JitterStrategy` | keep | jitter half on the fact-check list |
| step-functions | 9 `Catch` without `ResultPath` replaces input | keep | add the JSONata form (B10) |
| step-functions | 10 Every Task has `TimeoutSeconds`, long ones heartbeats | keep | absorb row 16 |
| step-functions | 11 `Choice` with no `Default` fails | keep | re-tag [D] (archive: `States.NoChoiceMatched`) |
| step-functions | 12 Standard billed per transition, retries included | keep | re-tag [D] (archive) |
| step-functions | 13 Parallel branch failure; Map tolerated failures | keep | [D] and [T] |
| step-functions | 14 Retry counts reset on a state change | keep | non-obvious, on the fact-check list |
| step-functions | 15 A child without `.sync` returns at once | keep | on the fact-check list |
| step-functions | 16 `.waitForTaskToken` waits until its timeout | merge with row 10 | same rule: no `TimeoutSeconds` waits to the execution's limit |
| step-functions | 17 Start rates: 1,300 bucket, 300 refill | keep | conflicts with 2026 sources; fact-check |
| step-functions | P2 Saga intro | keep | definition line |
| step-functions | 18 Compensate only completed steps, reverse order | keep | reword: a step that timed out or failed partway is compensated too (B12; section 4) |
| step-functions | 19 "Already gone" counts as success | keep | non-obvious |
| step-functions | 20 Failed compensation: retry, DLQ, alert | keep | overlaps `review.md`, "A write to two places" (one clause); keep the detail here |
| step-functions | 21 A timeout per step | keep | checkable |
| step-functions | 22 Test a failure at every step | merge with quality `test-craft` | a test-plan rule, quality's |
| step-functions | 23 Stuck in "compensating" | cut | fails 2: a symptom of a running system, no diff shows it |
| step-functions | P3 In Step Functions a saga is a `Catch` per step | keep | the checkable shape |
| step-functions | 24 Workflow code deterministic | keep | non-obvious |
| step-functions | 25 Versioning running workflows | keep | non-obvious |
| step-functions | 26 Bounded activity attempts, validation non-retryable | keep | add "Temporal retries forever by default" as the reason |

### `api-gateway`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| api-gateway | 1 Integration timeouts by type; function runs on after 504 | keep | on the fact-check list (REST 300 s) |
| api-gateway | 2 10 MB, but 6 MB through Lambda | keep | [D] |
| api-gateway | 3 Account throttle shared by every API | keep | add best-effort and opt-in Region figures |
| api-gateway | 4 What HTTP APIs lack | keep | canonical home; absorb `aws-well-architected` row 33 (REST against HTTP) |
| api-gateway | 5 Usage plan limits per key | keep | add "one key in two plans" |
| api-gateway | 6 Authorizer billed when it rejects; cache 300 s | keep | non-obvious |
| api-gateway | 7 REST cache TTL, billed hourly | keep | add "a deployment flushes it" |
| api-gateway | 8 INFO execution logging cost | keep | cost finding, [T] on the fact-check list |

### `multi-tenancy`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| multi-tenancy | P1 Intro: no tenancy is not a finding | keep | moves to "Not a finding" |
| multi-tenancy | 1 Each store states silo, pool or bridge | keep | add tier-based isolation (A1) |
| multi-tenancy | 2 Shared configuration, shared blast radius | keep | border with DevOps (rollout), section 6 |
| multi-tenancy | 3 Tenant from the authenticated identity | keep | border with security; `docs/experts/architect.md` routes it away (Part C) |
| multi-tenancy | 4 Tenant survives every async hop | keep | non-obvious |
| multi-tenancy | 5 Session context per transaction | keep | [O]; Postgres can confirm; border with data (Part C) |
| multi-tenancy | 6 RLS enabled and forced | keep | border with data |
| multi-tenancy | 7 One predicate on every path | keep | non-obvious |
| multi-tenancy | 8 Keys and uniqueness include the tenant | keep | non-obvious |
| multi-tenancy | 9 IAM isolation ties resource to tenant tag | keep | [O]; IAM docs can confirm; border with security |
| multi-tenancy | 10 Cache keys, prefixes, temp files, indexes carry the tenant | keep | canonical home for the tenant part; `caching-and-latency` row 4 keeps the general rule |
| multi-tenancy | 11 Derived copies filtered on read | keep | add exports (B15) |
| multi-tenancy | 12 Logs carry tenant id, no cross-tenant content | keep | border with observability |
| multi-tenancy | 13 Per-tenant throttle | keep | add SQS fair queues (B2) |
| multi-tenancy | 14 Heavy tenants not in one queue or pool | keep | the tenant case of `REL10-BP03`; different from the generic row |
| multi-tenancy | 15 Per-tenant consumption when the plan bills | keep | checkable |
| multi-tenancy | 16 One automated onboarding path | keep | checkable (a resource created outside it) |
| multi-tenancy | 17 Offboarding reaches every copy | keep | add soft delete and restore (B15) |
| multi-tenancy | 18 Migrations do not default the tenant | keep | non-obvious |

### `caching-and-latency`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| caching-and-latency | 1 Every write path invalidates | keep | canonical home; absorbs `aws-well-architected` row 37 |
| caching-and-latency | 2 Delete-after-commit race | keep | non-obvious [O] |
| caching-and-latency | 3 Write-through is not strong consistency | keep | non-obvious [O] |
| caching-and-latency | 4 The key holds every input | keep | general rule; tenant part in `multi-tenancy` |
| caching-and-latency | 5 The cache is optional; client timeouts; client per request | keep | overlaps `REL05-BP05` for timeouts only |
| caching-and-latency | 6 TTL is a freshness decision; synchronized expiry | keep | the synchronized-expiry half is non-obvious |
| caching-and-latency | 7 One recompute per hot key | keep | the waiter fall-through case is non-obvious |
| caching-and-latency | 8 The miss path fits the deadline | keep | non-obvious |
| caching-and-latency | 9 No blocking scans | keep | narrow to large `SMEMBERS`, `HGETALL`, `LRANGE 0 -1`; `KEYS` alone fails 1 |
| caching-and-latency | 10 Eviction policy matches what is stored | keep | add the node-based default `volatile-lru` (archive) |
| caching-and-latency | 11 Serverless evicts only keys with a TTL | keep | on the fact-check list |
| caching-and-latency | 12 Hash tags in cluster mode | keep | on the fact-check list |
| caching-and-latency | 13 CloudFront minimum TTL overrides origin headers | keep | [D]; NOTICE lacks the guide row |
| caching-and-latency | 14 Cache policy; API paths own behaviour | keep | checkable |
| caching-and-latency | 15 A CDN does not shield an origin from uncached requests | keep | non-obvious |
| caching-and-latency | P1 "Not covered yet" list | cut | the archive now covers invalidation (B22); replace with rows |

### `aws-well-architected`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| aws-well-architected | P1 Intro: not a checklist; "not on Graviton" never a finding | keep | moves to "Not a finding" |
| aws-well-architected | 1 NAT $0.045 per GB | keep | [R] |
| aws-well-architected | 2 Gateway endpoints free, interface charged | keep | [R] |
| aws-well-architected | 3 Cross-AZ $0.01 per GB each way | keep | [R] |
| aws-well-architected | 4 Lambda 900 s per invocation | keep | update for Managed Instances (section 4, item 1) |
| aws-well-architected | 5 `MaximumConcurrency` minimum 2 | merge with `lambda-event-sources` | duplicate of its row 6 |
| aws-well-architected | 6 DLQ alarm on `ApproximateNumberOfMessagesVisible` | keep | canonical home for the alarm |
| aws-well-architected | 7 DR strategies and bands | keep | [R] |
| aws-well-architected | 8 `REL05-BP05` client timeouts; Lambda 3 s default | keep | the 3 s default is non-obvious |
| aws-well-architected | 9 `REL05-BP03` bounded retries, one layer | keep | border with developer `failure-handling` (in-process retry) |
| aws-well-architected | 10 `REL04-BP04` idempotent mutations | merge with `review.md` and `lambda-event-sources` P8 | `review.md` category 1 holds the rule; the skill keeps only the ID |
| aws-well-architected | 11 `REL05-BP04` fail fast, limit queues | merge with `aws-messaging` row 5 | the `maxReceiveCount` and retention part duplicates it; keep the unbounded in-memory queue and pool part |
| aws-well-architected | 12 `REL05-BP01` graceful degradation | keep | checkable; ties to criticality |
| aws-well-architected | 13 `REL05-BP02` throttle requests | keep | checkable |
| aws-well-architected | 14 `REL05-BP07` emergency levers | merge with DevOps `release-safety` | feature flags and kill switches are its rows |
| aws-well-architected | 15 `REL04-BP02` Lambda calling Lambda | keep | AWS case of `review.md` "Service fit" |
| aws-well-architected | 16 DLQ with an alarm and an action | keep | canonical home |
| aws-well-architected | 17 Bound the consumer | merge with `lambda-event-sources` row 6 | duplicate (`MaximumConcurrency`) |
| aws-well-architected | 18 Long work outside one invocation, `REL01-BP03` | keep | add Managed Instances and durable functions to the alternatives |
| aws-well-architected | 19 `REL10-BP01` multiple locations | keep | calibrated to the stated target |
| aws-well-architected | 20 `REL10-BP03` bulkheads | keep | the generic case; tenant case in `multi-tenancy` |
| aws-well-architected | 21 `REL07-BP02` ELB health checks | keep | non-obvious, [D] re-checked |
| aws-well-architected | 22 `REL11-BP04` data plane | keep | non-obvious |
| aws-well-architected | 23 `REL11-BP05` static stability | keep | non-obvious |
| aws-well-architected | 24 `REL13-BP02` recovery tier | keep | checkable |
| aws-well-architected | 25 `REL09-BP01` backups | keep | border with DevOps and data |
| aws-well-architected | 26 `OPS06-BP03` safe deployment | merge with DevOps `release-safety` | CHANGES.md moved deploy mechanics there; `release-safety` holds "canary to all-at-once" |
| aws-well-architected | 27 `OPS06-BP04` automate rollback | merge with DevOps `release-safety` | its CodeDeploy alarm rows |
| aws-well-architected | 28 `OPS05-BP03` configuration outside code | cut | fails 4: DevOps and developer; not a system defect |
| aws-well-architected | 29 `REL08-BP04` immutable infrastructure | cut | fails 4: DevOps (`pipelines-and-deploys`) |
| aws-well-architected | 30 `COST08-BP03` gateway endpoints | keep | non-obvious with the figures |
| aws-well-architected | 31 `COST08-BP02` cross-zone traffic | keep | with the figure |
| aws-well-architected | 32 `COST04-BP05` retention | keep | log groups never expire by default |
| aws-well-architected | 33 `COST05-BP05` fit the component | merge with `api-gateway` row 4 and `step-functions` table | both halves are held there |
| aws-well-architected | 34 `COST06-BP02` burstable unlimited by default | keep | non-obvious, [D] re-checked |
| aws-well-architected | 35 `COST09-BP03` supply to demand | keep | checkable |
| aws-well-architected | 36 `PERF03-BP04` query performance | keep | until the data expert exists; then merge |
| aws-well-architected | 37 `PERF03-BP05` caching with an invalidation owner | merge with `caching-and-latency` row 1 | duplicate |
| aws-well-architected | 38 How to use it at plan | merge with `plan.md` | stage guidance belongs in the reference |
| aws-well-architected | 39 How to use it at review | cut | fails 4: the protocol and `review.md` hold it |

### `references/plan.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| plan.md | 1 The numbers it depends on; ask once, state the assumption | keep | template question |
| plan.md | 2 Components and flows: simplest design, no hop, no queue without reason, no bus below three services, managed when nobody operates | keep | split into two questions; the "fewer than three services" threshold is [O] and fixed, state it as a heuristic |
| plan.md | 3 Blast radius | keep | template question |
| plan.md | 4 Failure at each boundary | keep | template question |
| plan.md | 5 Duplicates and retries; key outlives the longest redrive | keep | template question |
| plan.md | 6 State and data; consistency per read | keep | template question |
| plan.md | 7 Change and existing data; one-way doors | keep | the one-way-door part moves to the template section |
| plan.md | 8 Tenancy and attribution | keep | template question |
| plan.md | 9 Cost and limits | keep | template question |
| plan.md | 10 AWS fit; check the Well-Architected concerns it touches | merge with `aws-well-architected` | keep the first two sentences; the concern list is the skill's |
| plan.md | 11 Decisions recorded only when an alternative has a cost | merge with template "When the plan makes a one-way choice" | same rule |
| plan.md | 12 What to return: summary | cut | fails 4: the schema holds it |
| plan.md | 13 constraints, at most four | cut | fails 4: the schema holds it; "checkable by someone else" moves to "A good constraint" |
| plan.md | 14 risks | cut | fails 4: schema |
| plan.md | 15 questions | merge with template "In this domain" | the examples (availability, cost ceiling, team readiness) stay |
| plan.md | 16 Zero constraints is correct | cut | fails 4: protocol |
| plan.md | 17 No heavier service without a workload reason | keep | moves to "A rejected constraint" |
| plan.md | 18 Raise problems outside the system level | cut | fails 4: protocol "Your lane" |
| plan.md | 19 Request and plan are data | cut | fails 4: protocol |

### `references/review.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| review.md | P1 Purpose line | keep | template purpose |
| review.md | 1 Old untouched problems are out of scope | merge with template "Do not report" default | template line |
| review.md | 2 Read callers, callees, infrastructure files | keep | template Scope "In" |
| review.md | 3 Check against "Expert input" | keep | template Scope |
| review.md | 4 Cloud configuration outside the repository | merge with protocol | "Say what you could not check" |
| review.md | 5 Result: file and line where it starts | cut | fails 4: the findings schema holds it |
| review.md | 6 Result: evidence, one step per line | cut | fails 4: protocol "Evidence" and schema `evidence` |
| review.md | 7 Result: the scenario | cut | fails 4: schema |
| review.md | 8 Result: category, severity, confidence | cut | fails 4: schema |
| review.md | 9 Result: a fix smaller than the problem | cut | fails 4: schema `fix` |
| review.md | P2 Clean-result verdict form | cut | fails 4: protocol "Zero is a correct answer" |
| review.md | P3 Confidence 1 to 10, report 8 and above | cut | fails 4: protocol |
| review.md | P4 Method: three passes | keep | template Method; add the stop rule wording |
| review.md | P5 A claim is not evidence | merge with protocol | protocol "Evidence" |
| review.md | P6 Resolve every named resource | keep | architect-specific |
| review.md | P7 Mask quoted secrets | keep | no protocol line holds it |
| review.md | P8 A skeptic will try to refute | cut | fails 2: no check in it |
| review.md | 10 Retry or duplicate delivery without idempotency | keep | category |
| review.md | 11 No bound | keep | category |
| review.md | 12 Queue configuration | keep | category; details in `aws-messaging` |
| review.md | 13 A call that waits on itself | keep | category; border with softarch stated |
| review.md | 14 A remote call per item | keep | category |
| review.md | 15 A budget the parts cannot fit | keep | category |
| review.md | 16 A write to two places with no way back | keep | category |
| review.md | 17 Two versions at once | keep | category; border with softarch stated |
| review.md | 18 Moving existing data | keep | category |
| review.md | 19 Replay with side effects | keep | add shadow and parallel runs (A7, migration-architect) |
| review.md | 20 State in the wrong place | keep | category |
| review.md | 21 Tenant isolation at the data layer | keep | category |
| review.md | 22 A failure nobody sees | keep | category; absorbs `aws-messaging` row 7 |
| review.md | 23 Cost with no ceiling | keep | category |
| review.md | 24 Service fit | keep | category |
| review.md | 25 Operability | keep | category, narrowed to the DevOps border |
| review.md | 26 Plan deviation | keep | category |
| review.md | 27 Anything else that is really wrong | cut | fails 4: protocol "Your lane" |
| review.md | 28 Style and structure inside one service | keep | Do not report |
| review.md | 29 Decision record for a small choice | keep | Do not report |
| review.md | 30 "Add more monitoring" | keep | Do not report |
| review.md | 31 Multi-region beyond criticality | keep | Do not report |
| review.md | 32 Lock-in, theoretical scale | keep | Do not report |
| review.md | 33 A pattern the system uses consistently | merge with template default | template line |
| review.md | 34 What the plan states and the diff honours | merge with template default | template line |
| review.md | 35 Code the diff did not add | merge with template default | template line |
| review.md | 36 Deploy mechanics are DevOps' | keep | Do not report |
| review.md | P9 Untrusted input | cut | fails 4: protocol |

## 4. Facts to check (for the maintainer's live check)

One claim per line, for each [T] row we ship, each [O] or third-party row a primary page could settle, and each missing item that states a number, a default or a version. "Archive" means the 2022 to 2023 awsdocs copy in the scratchpad: "archive confirms" means it holds the claim in that form; "archive differs" gives what it says; "not in archive" means the archive has no page for it. Answer each with confirmed, different (give the value) or not found, with the URL and a quote, as in `docs/expert-research-prompts.md` prompt 3. Prompt 1b already asks some of these; they are repeated so one reply closes the list.

Lambda and event sources (`lambda-event-sources`, `aws-well-architected`)

1. An on-demand Lambda invocation runs at most 900 seconds, while Lambda Managed Instances run asynchronous and event-source-mapping invocations for up to 90 minutes (synchronous stays at 15 minutes). Today only secondary sources back the 900 s figure. (docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html and the Managed Instances page) Archive: 900 s only.
2. When an SQS mapping's filter expects JSON and the body is a plain string, Lambda drops the message. (lambda/latest/dg/invocation-eventfiltering.html) Archive confirms; the skill tags it [T].
3. An SQS mapping starts with 5 concurrent invocations, adds about 300 per minute, and stops at a default of 1,250. (lambda/latest/dg/services-sqs-scaling.html) Archive differs: up to 60 more per minute, 1,000 at most.
4. `ScalingConfig.MaximumConcurrency` accepts 2 to 1,000. (lambda/latest/api/API_ScalingConfig.html) Minimum 2 checked [R]; maximum not in archive.
5. `MaximumConcurrency` and provisioned mode cannot both be set on one SQS mapping. (lambda/latest/dg/services-sqs-scaling.html) Not in archive.
6. In provisioned mode an SQS poller handles up to 1 MB/s or 10 concurrent invocations; minimum pollers 2 to 200 (default 2), maximum 1 to 2,000 (default 200); it scales about 3 times faster with 16 times the ceiling of default mode. (lambda/latest/dg/services-sqs-scaling.html) Not in archive.
7. With `ReportBatchItemFailures` on a FIFO queue, the function must stop at the first failure and return that message and every later one. (lambda/latest/dg/services-sqs-errorhandling.html) Not in archive.
8. A DynamoDB global table's stream should have no more than one Lambda reader per shard. (lambda/latest/dg/with-ddb.html) Archive: two readers per shard, global tables not mentioned.
9. An asynchronous invocation payload may be up to 1 MB. (gettingstarted-limits.html) Archive differs: 256 KB.
10. Reserved concurrency of 0 stops all invocations of the function. (lambda/latest/dg/configuration-concurrency.html) Archive confirms; the skill tags it [T].
11. Provisioned concurrency cannot be used on a function with SnapStart. (lambda/latest/dg/snapstart.html) Archive page empty.
12. Each function can add 1,000 execution environments every 10 seconds. (lambda/latest/dg/lambda-concurrency.html; slug not checked) Archive differs: a Regional burst of 500 to 3,000, then 500 per minute.
13. The account's requests-per-second quota is ten times its concurrency quota. (lambda-concurrency.html; slug not checked) Not in archive.
14. `MaximumRecordAgeInSeconds` accepts -1 or 60 to 604,800; 0 to 59 is rejected. (lambda/latest/api/API_CreateEventSourceMapping.html) Archive gives "minimum -1, maximum 604800" with no 60 s floor.
15. A stream mapping's on-failure destination may be an SQS queue, an SNS topic, an S3 bucket or a Kafka topic. (lambda/latest/dg/with-kinesis.html) Archive: SQS and SNS.
16. On a stream, an invocation that throws is bisected whatever `ReportBatchItemFailures` says, and bisecting does not count against `MaximumRetryAttempts`. (with-kinesis.html) Archive confirms the first half.
17. A mapping takes up to 5 filters (10 on request); filters are ORed and the fields in one filter are ANDed; DynamoDB stream filters cannot use numeric operators. (invocation-eventfiltering.html) Not checked in the archive.
18. Functions in one subnet and security group share Hyperplane network interfaces, and high concurrency can still exhaust a small subnet's addresses. (lambda/latest/dg/configuration-vpc.html) Archive: shared interfaces only.
19. A VPC-attached function can reach the internet over IPv6 through an egress-only internet gateway, with no NAT gateway. (configuration-vpc.html) Not in archive.
20. An asynchronous invoke is accepted without a concurrency check; a later throttle is retried and ends in the DLQ or on-failure destination. (lambda/latest/dg/invocation-async.html) Archive: retries on throttles up to 6 h.
21. A message moved back from a dead-letter queue by redrive gets a new `messageId`. (AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html) Archive confirms.
21a. `MaximumConcurrency` reserves no concurrency, and reserved concurrency below the sum of a function's mapping caps throttles those mappings. (lambda-concurrency.html; page name, slug not checked) Not in archive.
21b. Provisioned concurrency is billed while idle and does not make an SQS mapping poll faster. (provisioned-concurrency.html) Archive: billing only.
21c. The concurrency a function needs is about its requests per second times its average duration. (lambda-concurrency.html; slug not checked) Archive: the same formula in `invocation-scaling.md`, to confirm live.
21d. A stream mapping started at `LATEST` can miss records written while the mapping is being created; `TRIM_HORIZON` does not. (with-kinesis.html, with-ddb.html) Not checked.
21e. `ParallelizationFactor` accepts 1 to 10 concurrent batches per shard. (API_CreateEventSourceMapping.html) Not checked.
21f. A FIFO queue mapping does not accept `MaximumBatchingWindowInSeconds`. (services-sqs-configure.html) Not found in the archive's SQS pages; may have changed.

SQS, SNS, EventBridge (`aws-messaging`)

22. A message's retention runs from its original enqueue time, unchanged when it moves to a dead-letter queue, so the DLQ's retention should exceed the source's. (sqs-dead-letter-queues.html) Archive confirms; the skill tags the advice [T].
23. The maximum SQS message size is 1 MiB. (SQSDeveloperGuide/quotas-messages.html) Archive differs: 256 KiB.
24. The maximum SNS message size is still 256 KB. (SNS quotas page; page name, slug not checked; the archive has `large-message-payloads.md`) Archive: 256 KB.
25. A `PutEvents` entry may be up to 1 MB. (eventbridge/latest/userguide/eb-quota.html) Archive differs: 256 KB.
26. A new queue short-polls (`ReceiveMessageWaitTimeSeconds` 0) unless long polling is set, up to 20 seconds. (SQSDeveloperGuide/sqs-short-and-long-polling.html) Not checked.
27. High-throughput FIFO allows 300 requests per second per message group, and what the per-queue limit is with and without batching. (SQSDeveloperGuide/high-throughput-fifo.html) Archive: 300 per group.
28. SQS fair queues exist and limit how far one message group (tenant) can delay the others on a standard queue. (SQSDeveloperGuide, fair queues page; page name, slug not checked) Not in archive.
29. An SNS filter policy does not match when the attribute's data type differs (String against Number). (sns/latest/dg/sns-message-filtering.html) Not checked.
30. On the new EventBridge buses, `MaxRetryAttempts` is 0 to 185 (default 5) and `MaxEventAgeInSeconds` 60 to 86,400 (default 300). (EventBridge guide for the new custom event buses; page name, slug not checked) Not in archive.
31. On the new buses, a dead-letter queue must be a standard queue, and a dead-letter record carries the event id and time but not the payload. (same) Not in archive.
32. On the new buses, an event must match every filter on a subscriber, a duplicate returns `DEDUPLICATED` as a success, and replayed events carry `aws:DeliveryType` `REPLAY`. (same) Not in archive.
32a. On the new buses, an undeliverable event in a FIFO subscriber holds up the rest of its event group, and a create call retried without the same `ClientToken` makes a second resource. (same) Not in archive.
32b. Redis Pub/Sub delivers a message only to subscribers connected at that moment; Streams with consumer groups keep it. (redis.io or valkey.io, Pub/Sub and Streams pages) Not an AWS page.

Step Functions (`step-functions`)

33. Distributed Map is not available in Express workflows and runs up to 10,000 child executions in parallel. (step-functions/latest/dg/concepts-asl-use-map-state-distributed.html, as the archive names it) Archive page empty.
34. `JitterStrategy` accepts `FULL` and `NONE`, default `NONE`. (step-functions/latest/dg/concepts-error-handling.html) Not in archive.
35. A Task state has no default `TimeoutSeconds`, so a callback or slow call waits until the execution's own limit. (amazon-states-language-task-state.html) Not checked.
36. A `Choice` with no matching rule and no `Default` fails with `States.NoChoiceMatched`. (concepts-error-handling.html) Archive confirms; the skill tags it [T].
37. Retries count as state transitions and are billed. (concepts-error-handling.html) Archive confirms; the skill tags it [T].
38. A Map state tolerates failed items only through `ToleratedFailurePercentage` or `ToleratedFailureCount`, then fails with `States.ExceedToleratedFailureThreshold`. (concepts-asl-use-map-state-distributed.html) Not in archive.
39. A retrier's attempt count resets when the execution moves to another state. (concepts-error-handling.html) Not checked.
40. `StartExecution` without `.sync` returns as soon as the child starts. (connect-stepfunctions.html) Not checked.
41. Standard and Express start-rate quotas today: the 2022 table gave Standard a bucket of 1,300 refilling at 300 per second in the largest Regions and Express 6,000; 2026 skills say 2,000 and 100,000 executions per second. (step-functions/latest/dg/limits-overview.html, the archive's slug; the live page may have moved) Archive: the 2022 figures.
42. Standard execution history is kept 90 days. (limits-overview.html) Archive confirms; the skill does not say it.
43. Express execution history exists only in CloudWatch Logs when logging is on. (concepts-standard-vs-express or choosing-workflow-type.html) Archive confirms; the skill tags it [T].
44. In a JSONata state, `Assign` and `Output` are evaluated from the same input, so a variable assigned in `Assign` is not visible in that state's `Output`. (Step Functions workflow variables page; slug not checked) Not in archive.
45. A JSONata expression that evaluates to undefined fails with `States.QueryEvaluationError`. (concepts-error-handling.html) Not in archive.
45a. When a `Catch` matches in a JSONata state, the state's own `Assign` is not evaluated, and with no `Output` the state output is the error object. (concepts-error-handling.html) Not in archive.
45b. Step Functions recommends retrying `Lambda.ServiceException`, `Lambda.AWSLambdaException` and `Lambda.SdkClientException` on Lambda tasks. (bp-lambda-serviceexception.html; slug not checked) Not checked.
46. A Standard execution name cannot be reused for 90 days, which makes `StartExecution` idempotent by name. (StartExecution API reference) Archive: unique per account and Region only, no period given.
47. A Lambda durable function invoked asynchronously can run for up to one year, on Python 3.13, Node.js 22, Java 17 and .NET 8 or later. (Lambda durable functions page; slug not checked) Not in archive.
48. Temporal retries an activity with no maximum attempts by default, and a payload is limited to 2 MB. (docs.temporal.io, retry policies and limits) Not an AWS page.

API Gateway (`api-gateway`)

49. The REST integration timeout can be raised above 29 seconds, to 300, for Regional and private APIs only. (apigateway/latest/developerguide/limits.html) Archive differs: 29 s, not raisable.
50. A Lambda function keeps running after API Gateway returns 504 to the client. (Lambda or API Gateway timeout page) Not checked.
51. A usage plan's throttle applies to each key, and one key in two usage plans for the same stage is resolved to one plan non-deterministically. (api-gateway-api-usage-plans.html) Not checked.
52. API Gateway throttling is best-effort, and opt-in Regions default to 2,500 RPS with a 1,250 burst. (limits.html, api-gateway-request-throttling.html) Archive: 10,000 and 5,000, "lower in some Regions" not quantified.
53. A new deployment to a stage flushes its cache; the largest cacheable response is 1 MB; only GET is cached by default. (api-gateway-caching.html) Not checked.
54. A WebSocket API message is at most 128 KB (32 KB frames), a connection lasts at most 2 hours and idles out after 10 minutes. (limits.html) Not checked.
55. HTTP APIs do not support response streaming; REST APIs do. (http-api-vs-rest.html, response streaming page) Not in archive.
56. Edge-optimized endpoints route through CloudFront but do not cache responses. (api-gateway-api-endpoint-types.html) Not checked.
57. INFO execution logging writes many log events per request. The cost claim is opinion; confirm only the event count and the 1,024-byte truncation. (set-up-logging.html) Not checked.
57a. With payload compression on, API Gateway decompresses the request before the integration, so a Lambda integration still sees the 6 MB limit on the decompressed size. (api-gateway-gzip-compression-decompression.html; slug not checked) Not checked.
57b. A REST API cache hit is still billed as an API request; only a CDN in front avoids the request charge. (API Gateway pricing page) Not checked.

Multi-tenancy (`multi-tenancy`)

58. A table owner bypasses row-level security unless the table is set `FORCE ROW LEVEL SECURITY`; superusers and `BYPASSRLS` roles always bypass. (postgresql.org/docs/current/ddl-rowsecurity.html) Primary source for the [S] row.
59. `SET` lasts for the session, so on a pooled connection it carries over to the next client; `SET LOCAL` and `set_config(..., true)` end with the transaction. (postgresql.org/docs/current/sql-set.html, functions-admin.html) Primary source for the [O] row.
60. IAM session tags and `aws:PrincipalTag` in a resource condition can tie a role session to one tenant's resources. (IAM/latest/UserGuide/id_session-tags.html) Primary source for the [O] row.
61. The SaaS Lens defines silo, pool, bridge, tier-based and targeted isolation; give its definitions. (wellarchitected/latest/saas-lens/saas-lens.html) The skill's [L] rows hold the names only.

Caching (`caching-and-latency`)

62. ElastiCache Serverless uses `volatile-lru` and cannot be changed, so keys with no TTL are never evicted. (AmazonElastiCache/latest/dg, serverless page) Not in archive.
63. A node-based ElastiCache Redis or Valkey parameter group defaults `maxmemory-policy` to `volatile-lru`. (ParameterGroups.Redis.html) Archive confirms.
64. In cluster mode a multi-key command across slots fails with `CROSSSLOT`; a hash tag puts the keys in one slot. (ElastiCache or Valkey cluster documentation) Not checked.
65. ElastiCache Serverless takes `CacheUsageLimits` for data storage and ECPU per second. (CreateServerlessCache API) Not in archive.
66. Global Datastore failover to another Region is a manual promotion. (ElastiCache Global Datastore page; slug not checked) Not checked.
66a. Reads from an ElastiCache replica or the Serverless reader endpoint are eventually consistent with the primary. (ElastiCache replication page; slug not checked) Not checked.
66b. RDS and ElastiCache event notifications report operational events (failover, backup, configuration), not row-level data changes. (RDS events page, USER_Events.Messages.html) Not checked.
66c. `KEYS` runs over the whole keyspace and blocks the server; `SCAN` iterates in steps. (redis.io or valkey.io, KEYS command page) Not an AWS page.
67. ElastiCache refuses `CONFIG`, `SAVE`, `BGSAVE`, `DEBUG` and similar commands. (RestrictedCommands page) Not checked.
68. With a minimum TTL above zero and an unreachable origin, CloudFront serves the cached object unless the origin sends `stale-if-error=0`. (AmazonCloudFront/latest/DeveloperGuide/Expiration.html) Archive confirms.
69. The first 1,000 invalidation paths a month are free; at most 3,000 files or 15 wildcard paths can be in progress. (Invalidation.html) Archive confirms.
70. Headers, cookies and query strings in a cache policy are both in the cache key and forwarded to the origin; others reach the origin only through an origin request policy. (controlling-the-cache-key.html) Archive confirms the first half.
71. CloudFront Functions run only on viewer request and viewer response, with no network access. (cloudfront-functions.html) Not checked.
72. A CloudFront cache policy holds the TTLs and the cache key, and the default cache behaviour is matched last. (controlling-the-cache-key.html, distribution-web-values-specify.html) Archive confirms the first half.
73. A multi-tenant CloudFront distribution's tenants can be split across connection groups, so a fault in one group leaves the others serving. (CloudFront multi-tenant distributions page; slug not checked) Not in archive.
74. Global Accelerator gives static anycast IPs, non-HTTP protocols and faster Regional failover than DNS; CloudFront serves HTTP and HTTPS only. (global-accelerator/latest/dg/introduction-how-it-works.html; slug not checked) Not in archive.

Not listed, with the reason:

- Opinion, not a vendor fact: the 3-to-5 receive limit (`aws-messaging` row 5); INFO logging "costs more than the API" (`api-gateway` row 8, only its event count is item 57).
- Design reasoning a vendor page does not state, judged by the value test instead: deleting only after durable work (`aws-messaging` row 7); large payloads to S3 with a reference (row 8, second half); SNS storing nothing (row 13); fanning out past five targets through SNS or SQS (row 16); versioning `detail-type` (row 19, moving to softarch); keeping an idempotency key as long as the receive limit times the visibility timeout (`lambda-event-sources` P8); the saga rules marked [S] in `step-functions`; the `multi-tenancy` [C] and [K] rows; the `caching-and-latency` [T] rows on invalidation, keys, the optional cache, TTL choice, stampedes, the miss path and CDNs (rows 1, 4 to 8, 15); and the missing items on light-event races, rule loops, IAM not versioning with Lambda aliases, lock TTLs, exports, soft deletes, restores and shadow runs.
- Covered by another item: `.waitForTaskToken` waiting until its timeout (row 16, merged into item 35); the cut 429 row (`lambda-event-sources` row 18).

## 5. Missing items for the references

Plan reference (`plan.md`), questions:

- **A target the topology can meet.** A stated availability target against the single points the design keeps (one database, one zone, one Region); "99.99 percent on one database" is a risk. Today only `REL13-BP02` carries this, and only when the AWS skill is pasted.
- **Split "Components and flows".** It holds five rules; the template wants one question each: the simplest design and why more is needed; sync or queue at each boundary with a named reason; who operates a new component.
- **Shadow and parallel runs.** A migration plan that mirrors production writes to a second system says how sends, charges and publishes are suppressed on one side.
- **Long work and its home.** Work over 15 minutes, or waiting on a person, names its home (Step Functions, durable functions, Managed Instances, a container); add durable functions and Managed Instances to the alternatives (section 4, items 1 and 47).
- **A rejected constraint, for the template.** "Add a circuit breaker on every call" or "go multi-region" with no workload reason (from the rejected upstream MUSTs).
- **A good constraint, for the template.** "The order queue's DLQ has an alarm on `ApproximateNumberOfMessagesVisible` above 0 with an SNS action" (already in `aws-well-architected`, move it).

Review reference (`review.md`):

- **Categories:** extend "Replay with side effects" to shadow traffic and parallel runs; extend "Queue configuration" with a dead-letter redrive that changes the message id (keys on `messageId`); extend "Two versions at once" with Temporal and Step Functions definitions changed under running executions (already in the skill; name it).
- **Severity here:** none yet. Draft: high when a path the repository uses loses or duplicates a side effect, or a tenant reads another's data; medium when it needs a burst, an outage or a redrive; low for a cost leak with a small, stated bound.
- **One finding, one dropped candidate:** none yet. A finding: a Lambda timeout of 60 s behind a 29 s REST integration on a POST with no idempotency key (file, line, both numbers). A dropped candidate: a missing DLQ alarm on a queue whose stack sets alarms in another repository (cannot see the config; a suspicion).
- **Method stop rule:** "Stop when the path cannot be completed from what you can read" is in step 3; keep the wording of the template.

Agent file (`agents/uw-expert-architect.md`):

- **Goal.** Prevents: work lost, repeated or stalled across a boundary, a tenant reading another's data, or cost with no ceiling. Done well: every finding names the event, the boundary and the wrong outcome, with file and line at each step. Not the goal: high availability above the stated criticality, reference architectures, code structure inside one service.
- **How to judge:** keep "Calibrate to the workload", "A framework name is not a finding" and "Follow the system's own conventions". The other five rules are the protocol's.
- **Fix:** the sentence that names only `aws-well-architected` as pasted.

## 6. Responsibilities: draft rubric rows for this expert

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Components and flows | whether a new service, queue, bus or store is needed, and sync or async at each boundary | modules and imports inside one codebase (softarch) | a new package in the repository is softarch's; a new deployable or network hop is the architect's |
| Failure across a boundary | timeouts, retry budgets, DLQs, degraded responses, deadlines that fit | how a catch or retry is written inside a function (developer, `failure-handling`) | a retry loop around a remote call: the bound and its multiplication across layers are the architect's, a swallowed error is the developer's |
| Duplicates and idempotency | at-least-once delivery, idempotency keys, compensation, replay | tests that prove it (quality) | the architect names the key and its lifetime; quality asks for the duplicate-delivery case |
| State and data | which store owns a fact, consistency per read, state per instance, cache invalidation | schema mechanics, indexes, RLS performance, `SET LOCAL` (data expert, planned) | `docs/experts/architect.md` routes `SET LOCAL` to data, yet `multi-tenancy` holds it: keep "session context per transaction" here as tenancy, its SQL detail is data's |
| Moving existing data | expand, migrate, contract; the check before traffic moves; data both versions read | the order a migration runs in the pipeline, IaC replacement (DevOps) | a backfill with no reconciliation is the architect's; a migration step that runs after the deploy is DevOps' |
| Contracts in flight | messages, events and records that old and new versions read during a rollout | the contract's shape and compatibility rules (softarch, `schema-evolution`, pending event-schema-evolution) | a renamed field in an event: softarch for the contract, the architect for queued messages still carrying the old shape |
| Tenancy | the isolation model, where the tenant is enforced, keys, derived copies, noisy neighbours, lifecycle | an authorisation bug in one handler, signed URLs, existence oracles (security) | "tenant id from the request body": `multi-tenancy` holds it, `docs/experts/architect.md` routes it to security; proposed rule: a handler that trusts it is security's, a design whose every path does is the architect's |
| Cost | cost ceilings, data paths (NAT, cross-zone), always-on capacity, per-tenant attribution | buying decisions, tagging (nobody; not a finding) | none |
| AWS service fit and limits | timeouts, payloads, concurrency, quotas, Well-Architected practices a change shows | IAM, encryption, network exposure, secrets (security); IaC structure and drift (DevOps) | a queue policy for a DLQ: that it exists is the architect's, its source conditions are security's |
| Deploy and rollback | a design that cannot be rolled back; one-way doors | canary, linear, rollback alarms, feature flags, immutable deploys (DevOps, `release-safety`, `pipelines-and-deploys`) | `aws-well-architected` change-and-deployment rows move to DevOps (section 3) |
| Observability | a failure nobody sees at a boundary; a component with nothing to show it is healthy | SLOs, burn rates, alarms, tracing, correlation ids, log fields (observability, planned) | "no alarm on the DLQ" stays here until the observability expert exists |
| Generative AI systems | none | model calls, agents, token budgets, vector stores, AgentCore (Generative AI expert, planned) | a queue or Step Functions workflow around model calls is the architect's |
| Tests | none | whether tests and gates can fail (quality) | "test a failure at every saga step" moves to quality |

