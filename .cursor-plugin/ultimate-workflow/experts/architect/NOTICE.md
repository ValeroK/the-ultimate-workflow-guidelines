# Notice

The system architect expert's checklists restate ideas from the sources below. No text is copied; the wording is our own. They are credited here because the ideas are theirs.

| Source | Licence | What the ideas informed |
|---|---|---|
| AWS Well-Architected Framework (public pillars and design principles) | AWS documentation | The concerns the plan and review are calibrated to: operations, security, reliability, performance, cost and sustainability, with workload criticality deciding how much each matters. The AWS pages could not be fetched in the session that wrote this; the pillar names and principles were taken from search results quoting them and from secondary summaries, and the exact figures were not relied on |
| AWS SQS developer guide (as quoted in search results) | AWS documentation | At-least-once delivery, visibility timeout against processing time, dead-letter queues and receive limits |
| msitarzewski/agency-agents, multi-agent systems architect | MIT | The failure taxonomy (hard, silent, partial, contradiction, cascade, loop) and idempotency under retry; the agent-specific parts were left for a later expert |
| affaan-m/ECC, agent architecture audit and cost-aware LLM pipeline | MIT | Narrow retries, cost ceilings that fail closed, enforcement in code and not in a prompt |
| aws/agent-toolkit-for-aws, agents-harden and the AWS well-architected review skill | Apache-2.0 | Long-running work outliving a request, scoping IAM and tenants at the data layer, calibrating to workload criticality and not demanding multi-region by default |
| addyosmani/agent-skills, documentation and ADRs | MIT | Recording a decision only when a rejected alternative has a cost, and following the repository's existing convention |

The sources were read as data. None of their scripts, hooks or fetches are used.
