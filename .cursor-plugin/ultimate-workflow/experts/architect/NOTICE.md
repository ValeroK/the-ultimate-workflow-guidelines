# Notice

The system architect expert's checklists restate ideas from the sources below. No text is copied; the wording is our own. They are credited here because the ideas are theirs.

| Source | Licence | What the ideas informed |
|---|---|---|
| AWS Well-Architected Framework (public pillars and design principles) | AWS documentation | The concerns the plan and review are calibrated to: operations, security, reliability, performance, cost and sustainability, with workload criticality deciding how much each matters. The first version was written from search results, without the AWS pages. On 2026-10-20 the pages were fetched and the figures checked; the shared skill `aws-well-architected` carries the best-practice IDs and the verified figures, with its own NOTICE |
| AWS SQS developer guide (as quoted in search results) | AWS documentation | At-least-once delivery, visibility timeout against processing time, dead-letter queues and receive limits |
| msitarzewski/agency-agents, multi-agent systems architect | MIT | The failure taxonomy (hard, silent, partial, contradiction, cascade, loop) and idempotency under retry; the agent-specific parts were left for a later expert |
| affaan-m/ECC, agent architecture audit and cost-aware LLM pipeline | MIT | Narrow retries, cost ceilings that fail closed, enforcement in code and not in a prompt |
| aws/agent-toolkit-for-aws, agents-harden and the AWS well-architected review skill | Apache-2.0 | Long-running work outliving a request, scoping IAM and tenants at the data layer, calibrating to workload criticality and not demanding multi-region by default |
| addyosmani/agent-skills, documentation and ADRs | MIT | Recording a decision only when a rejected alternative has a cost, and following the repository's existing convention |

The sources were read as data. None of their scripts, hooks or fetches are used.
