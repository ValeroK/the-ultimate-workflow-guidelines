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

| Skill | What it holds | Review selector | Plan |
|---|---|---|---|
| `lambda-event-sources` | SQS, Kinesis and DynamoDB Streams triggers: visibility timeout, filters that delete, partial batch failure, poison records, asynchronous retries, concurrency interactions, idempotency keys by source, dead-letter queue policies | added lines naming an event source mapping, its scaling, batch-failure, visibility or concurrency settings | offered |
| `step-functions` | Standard versus Express semantics, the limits that end an execution, error and retry rules, saga compensation | `*.asl.json` and similar files, or added lines naming a state machine, `States.` errors or compensation | offered |
| `aws-well-architected` | The Well-Architected practices a change can show, with IDs, and verified AWS costs and limits | infrastructure files, or added lines with AWS resources or SDK calls | offered |

Order is priority: the most specific skill first. All three together are about 21 KB, under the 32 KB cap.

Each fact in the two serverless skills says where it comes from: AWS's own developer guides (as published on GitHub until 2022 and 2023; docs.aws.amazon.com was not reachable from the build session), the maintainer's check of live pages, or AWS's 2026 agent toolkit (marked as not yet checked against the current guide). Where the 2022 guide and the 2026 toolkit differ, both are given.

**Deferred, with a research prompt each** (`docs/expert-research-prompts.md`, prompts 1b and 1c):

- **Messaging semantics** (SQS standard and FIFO, SNS, EventBridge, Kinesis: ordering, deduplication windows, retention, payload limits, delivery and retry policies). No surveyed source held them.
- **Multi-tenancy isolation** (silo, pool and bridge models from the SaaS Lens; tenant context, noisy neighbours). The plan and review references keep their tenancy checks until then.

Rejected as separate skills: cost and FinOps (the sources were discount headlines; the cost checks are in `aws-well-architected`), sagas on their own (folded into `step-functions`), capacity planning (the source sized support teams), and decision records (the plan reference already says when one is needed).

Considered and not done: pasting the plugin's own host-loaded guideline skills (`distributed-systems-resilience-guidelines`, `operability-guidelines`) into the architect's prompt. They are written for the main session doing design work, not for a reviewer, and a selector that fires on every HTTP or queue call would make them effectively always on. The specific checks the architect lacked were copied into its references instead.
