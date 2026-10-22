# AWS Well-Architected research, 2026-10-20

Research run by the maintainer with web access, from the prompt in `docs/expert-research-prompts.md` (prompt 1). Kept here as the record behind two things: the `aws-well-architected` shared skill (used by the architect expert) and the future Generative AI expert. Best-practice IDs and titles are cited as references; AWS prose is not reproduced. Where a "visible in a change" note appears below, it is the researcher's suggestion, not AWS content.

## Versions and sources

| Document | Date shown | URL |
|---|---|---|
| Framework, and the Operational Excellence, Security, Reliability, Performance Efficiency and Sustainability pillars | November 6, 2024 | https://docs.aws.amazon.com/wellarchitected/latest/framework/appendix.html (questions and best practices) |
| Cost Optimization pillar | June 27, 2024 | https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html |
| Generative AI Lens | November 19, 2025 | https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html |
| SaaS Lens | April 4, 2023 | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html |
| Serverless Applications Lens | July 14, 2022 | https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html |

Not reachable as first tried: the appendix under the slug `a-questions-and-best-practices.html` (the real page is `appendix.html`); SaaS Lens pillar pages under guessed slugs; the body tables of the Lambda SQS and Lambda quotas pages (the navigation filled the fetch window).

Prompt injection seen: several AWS documentation pages carried a banner addressed to AI coding agents ("Agent Setup: ... via a single setup prompt in your AI coding agent"). It was treated as page data and ignored.

## What the pillars contain, in short

Pillar questions: OPS 1 to 11, SEC 1 to 11, REL 1 to 13, PERF 1 to 5, COST 1 to 11, SUS 1 to 6. Roughly 45 percent of the best practices concern process or organisation (priorities, culture, game days, reviews, KPIs) and cannot be seen in a change. The practices a change can show are the ones the `aws-well-architected` skill uses. Corrections the research made to our shorthand: SEC 1 is "How do you securely operate your workload?" (accounts, root user, threat model), not identity; identity is SEC 2. REL foundations are REL 1 (quotas) and REL 2 (network topology). PERF has five questions, not four.

## Verified claims

| # | Claim | Tier | Source | Counter-case |
|---|---|---|---|---|
| 1 | Pillar question IDs map to the titles above, with the corrections noted | primary | appendix | Process questions are not checkable in a change |
| 2 | Cross-zone data in one Region: $0.01 per GB in each direction | primary | https://aws.amazon.com/vpc/pricing/ | Multi-AZ replication the availability target needs |
| 3 | NAT gateway data processing: $0.045 per GB (US East), plus the hourly charge | primary | https://aws.amazon.com/vpc/pricing/ | Low-volume traffic to third-party internet APIs with no endpoint option |
| 4 | Graviton: "up to 40% better price performance" (per-service cards vary: RDS up to 35% better performance at 20% lower cost, Aurora up to 20%, Lambda up to 19%) | primary, vendor marketing | https://aws.amazon.com/ec2/graviton/getting-started/ | x86-only binaries, AVX-512; not used as a finding |
| 5 | DR strategies: backup and restore (RPO hours, RTO up to 24 h), pilot light (minutes, tens of minutes), warm standby (seconds, minutes), multi-site active-active (near zero, potentially zero) | primary | https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html | Non-critical and ephemeral workloads |
| 6 | SQS event source mapping `ScalingConfig.MaximumConcurrency`, minimum 2 | primary | AWS SDK for Go, Lambda API | Fully elastic downstream |
| 7 | Bedrock batch inference: 50% lower price than on demand (primary); prompt caching: up to 90% on cached tokens (secondary only, the pricing table renders in JavaScript) | mixed | https://aws.amazon.com/bedrock/pricing/ | Interactive requests (batch); prompts with no repeated prefix (caching) |
| 8 | Lambda maximum timeout 900 seconds | secondary only | AWS re:Post quoting the quotas page | Step Functions or durable orchestration across invocations |
| 9 | Gateway endpoints (S3, DynamoDB) free; interface endpoints charged per ENI hour and per GB | primary | https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html | On premises, cross-Region peering, Transit Gateway access |
| 10 | Watch a dead-letter queue with an alarm on `ApproximateNumberOfMessagesVisible` | primary | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html | None for production |

## Generative AI Lens: for the Generative AI expert

Design principles (names only): design for controlled autonomy; implement comprehensive observability; optimize resource efficiency; establish distributed resilience; standardize resource management; secure interaction boundaries.

The lens numbers its best practices `GENOPS`, `GENSEC`, `GENREL`, `GENPERF`, `GENCOST`, `GENSUS` (confirmed, for example `GENCOST05-BP01`). The researcher's note on what a change can show follows each title.

| ID | Title | What a change can show (researcher's note) |
|---|---|---|
| GENOPS01-BP01 | Periodically evaluate functional performance | Evaluation jobs or eval scripts in CI |
| GENOPS01-BP02 | Collect and monitor user feedback | A feedback endpoint and its storage |
| GENOPS02-BP01 | Monitor all application layers | Metrics and alarms across API, orchestration, vector store and model calls |
| GENOPS02-BP02 | Monitor foundation model metrics | Alarms on invocation latency, errors and token counts |
| GENOPS02-BP03 | Mitigate the risk of system overload | Rate limits, token quotas, queue buffering, circuit breakers |
| GENOPS03-BP01 | Implement prompt template management | Versioned prompt templates (Bedrock Prompt Management) instead of inline string building |
| GENOPS03-BP02 | Enable tracing for agents and RAG workflows | Agent trace enabled; spans around retrieval and generation |
| GENOPS04-BP01 | Automate the generative AI lifecycle with IaC | Agents, guardrails, knowledge bases and prompts defined in IaC |
| GENOPS04-BP02 | Implement GenAIOps | Evaluation and promotion pipelines for prompts and models |
| GENOPS05-BP01 | Learn when to customize models | Process |
| GENSEC01-BP01 | Least privilege to foundation model endpoints | `bedrock:InvokeModel` scoped to model ARNs, not `*` |
| GENSEC01-BP02 | Private network communication to models | VPC interface endpoints for the Bedrock runtime |
| GENSEC01-BP03 | Least privilege for models accessing data stores | Scoped roles for knowledge bases and agents |
| GENSEC01-BP04 | Access monitoring for generative AI services | CloudTrail and model invocation logging |
| GENSEC02-BP01 | Guardrails against harmful or incorrect responses | A guardrail resource, and its identifier passed on every call |
| GENSEC03-BP01 | Control plane and data access monitoring | CloudTrail data events, access logs on RAG buckets |
| GENSEC04-BP01 | Secure prompt catalog | Prompt management with encryption and access control |
| GENSEC04-BP02 | Sanitize and validate user inputs to models | Input validation, prompt-attack filters, system and user messages kept apart |
| GENSEC05-BP01 | Least privilege and permission boundaries for agentic workflows | Scoped tool roles, human confirmation on destructive tools, permission boundaries |
| GENSEC06-BP01 | Data purification filters for training workflows | Validation, PII redaction and anomaly filtering in ingestion |
| GENREL01-BP01 | Scale and balance model throughput by utilization | Cross-region inference profiles, provisioned throughput, backoff on throttling |
| GENREL02-BP01 | Redundant network connections to model endpoints | Endpoints across several zones |
| GENREL03-BP01 | Manage prompt flows and recover from failure | Fallback models, output schema validation with retry |
| GENREL03-BP02 | Timeouts on agentic workflows | Client timeouts, workflow timeouts, maximum iterations on agent loops |
| GENREL04-BP01 | Prompt catalog | Versioned prompts in IaC |
| GENREL04-BP02 | Model catalog | A model registry |
| GENREL05-BP01 | Load-balance inference across Regions | Cross-region inference profiles or routing |
| GENREL05-BP02 | Replicate embedding data across Regions | Cross-region replication of the vector store |
| GENREL05-BP03 | Agent capabilities available in every Region used | Tools, functions and knowledge bases deployed in each Region |
| GENREL06-BP01 | Fault tolerance for distributed training | Checkpointing, auto-recovery |
| GENPERF01-BP01 | Ground-truth set of prompts and responses | Process |
| GENPERF01-BP02 | Collect performance metrics | Time to first token and throughput telemetry |
| GENPERF02-BP01 | Load test model endpoints | Process |
| GENPERF02-BP02 | Optimize inference parameters | Temperature, top_p, max tokens, streaming |
| GENPERF02-BP03 | Select and customize the right model | Model id in config |
| GENPERF03-BP01 | Managed hosting where appropriate | Bedrock or SageMaker instead of self-hosted servers |
| GENPERF04-BP01 | Test embeddings for latency and relevance | Process |
| GENPERF04-BP02 | Optimize vector sizes | Embedding dimensions and quantization |
| GENCOST01-BP01 | Right-size model selection | Smaller models or prompt routing for simple tasks |
| GENCOST02-BP01 | Balance cost and performance across inference paradigms | Batch inference for offline work |
| GENCOST02-BP02 | Minimize hosting cost | Scale to zero on endpoints |
| GENCOST03-BP01 | Optimize prompt token length | Concise system prompts, top-k on retrieved chunks, truncation |
| GENCOST03-BP02 | Control response length | `maxTokens` and stop sequences on every call |
| GENCOST03-BP03 | Prompt caching | Cache points in the request |
| GENCOST03-BP04 | Annotate input for cost-aware filtering | Pre-filtering before expensive models |
| GENCOST04-BP01 | Reduce vector length | Dimension reduction, quantization |
| GENCOST05-BP01 | Stopping conditions for long-running workflows | Maximum steps, token budgets, timeouts in agent loops |
| GENSUS01-BP01 | Auto scaling and serverless for utilization | Serverless model APIs instead of idle GPUs |
| GENSUS01-BP02 | Efficient customization | Parameter-efficient fine-tuning or RAG instead of full fine-tuning |
| GENSUS02-BP01 | Efficient data processing and storage | Incremental ingestion, lifecycle rules |
| GENSUS03-BP01 | Smaller models and optimized inference | Distilled models, inference accelerators |

## SaaS Lens and Serverless Applications Lens

Neither assigns best-practice IDs; both organise guidance under pillar headings.

- SaaS Lens design principles (names): no one-size-fits-all architecture; decompose each service by its multi-tenant load and isolation profile; isolate all tenant resources; design for growth; instrument and analyse tenant metrics; one automated onboarding process; support several tenant experiences; global customization instead of one-off versions; bind user identity to tenant identity; align consumption with tenant activity; limit developers' exposure to tenancy; SaaS is a business strategy; tenant-aware operational views; measure each tenant's cost impact. Isolation models: silo, pool, bridge, tier-based, targeted.
- Serverless Applications Lens design principles (names): speedy, simple, singular; think concurrent requests, not total requests; share nothing; assume no hardware affinity; orchestrate with state machines, not functions; use events to trigger transactions; design for failures and duplicates.

## Disagreements in the sources

- Cost Optimization's date (June 27, 2024) is older than the other pillars (November 6, 2024).
- Newer lenses number their best practices; the SaaS and Serverless lenses do not.
- Graviton's headline (up to 40 percent) differs from the per-service cards on the same page.
