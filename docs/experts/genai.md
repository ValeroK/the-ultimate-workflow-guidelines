# Generative AI engineer expert: sources, borders and status

The Generative AI engineer owns the code around model calls and agents: what bounds every loop and call, which tools change state and how they are approved, how model output is checked before it is used, how retrieval answers when it finds nothing, prompt caching and token cost, and the Bedrock and AgentCore settings that sit on the call path. It joins at plan, tests and review.

## Status

- **Built:** agent file (Goal, Responsibilities, How to judge), plan and review references, selection examples, `NOTICE.md`. Tools: read, search and the web (maintainer decision, 2026-10-21).
- **Waiting:** research prompt 5 and fact-check prompt 7 (`docs/research/fact-check-round-2-prompts.md`), sent to the maintainer 2026-10-20. The four skills below are drafted in the ledger and not written until the reply is in (playbook step 6b). The references hold no model-specific number or parameter rule for the same reason.
- **Not measured.** No corpus exists for this domain; planted cases come from the skills' facts once they are confirmed.

## Stages: plan, tests and review

The maintainer added the tests stage on 2026-10-21. The agent-and-tool case family (tool failures, bounds, approvals bound to arguments, truncated or refused output, planted instructions, retrieval that finds nothing) moved here from quality's tests reference; quality keeps the oracle and determinism of each case.

## Boundaries

| Concern | Owner |
|---|---|
| Loop and token bounds, tool contracts and approvals, structured output and parsing, retryable provider errors, caching, embedding consistency, insufficient-context answers, guardrails on the call path, AgentCore sessions | genai |
| Untrusted text that makes an agent with tools act, and what a tool's credentials can reach | security (mirrored in security's table) |
| Whether an eval can fail: judges, splits, pass rules | quality (`eval-integrity`) |
| The queue or workflow around model calls; a system-wide or per-tenant spend cap | architect (mirrored in the architect's Cost row and review category) |
| How vectors are stored and indexed | data, planned |

## Sources

Fifteen upstream sources (38 files in 12 repositories) and the Generative AI Lens record; every item is in `docs/experts/ledgers/genai.md` (111 items: 61 taken, 30 routed, 16 rejected, 4 missing). Two files addressed instructions to an agent; they were noted and not followed.

## Proposed skills (waiting for the facts)

| Skill | What it would hold |
|---|---|
| `model-calls` | Parameters each pinned model refuses, output limits and stop reasons, structured output, retryable errors, prompt-cache invalidation |
| `agent-loops-and-tools` | Turn and token bounds, tool contracts and overlap, approvals bound to arguments, how tool results are returned, MCP connector rules |
| `rag-retrieval` | One embedding model for data and queries, re-embedding, answers for "found nothing", citations, Knowledge Base ingestion |
| `bedrock-and-agentcore` | Converse against InvokeModel, unset output limits and quota, inference profiles as residency, guardrails attached, AgentCore quotas and sessions |

Rejected: a prompt-style skill, a model-price skill, a multi-agent pattern catalogue (not checkable in a diff).
