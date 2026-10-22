# Generative AI engineer expert: sources, borders and status

The Generative AI engineer owns the code around model calls and agents: what bounds every loop and call, which tools change state and how they are approved, how model output is checked before it is used, how retrieval answers when it finds nothing, prompt caching and token cost, and the Bedrock and AgentCore settings that sit on the call path. It joins at plan, tests and review.

## Status

- **Built:** agent file (Goal, Responsibilities, How to judge), plan and review references, selection examples, `NOTICE.md`. Tools: read, search and the web (maintainer decision, 2026-10-21).
- **Skills (2026-10-22):** four, after the maintainer's live check of block D (37 items, 5 different; `docs/research/fact-check-replies-2026-10-22.md`). Rows the check confirmed are [R]; model-specific rows name the models the page named on that date, and must be re-checked when the repository pins a model they do not name.
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

## Skills

| Skill | Stages | Holds |
|---|---|---|
| `agent-loops-and-tools` | plan, review | loop bounds and their cost, approvals bound to exact arguments, workflows before agents, tool definitions and strict limits, tool results and `is_error`, MCP connector, tool search, computer and browser tools |
| `model-calls` | plan, review | parameters each model refuses (prefill, forced tool choice, thinking settings, sampling), stop reasons and refusals, the 5.5 tokenizer, parsing tool input, server-tool errors, prompt caching |
| `bedrock-and-agentcore` | plan, review | token burndown and `maxTokens`, Converse, inference profiles and residency, guardrails and logging, classic agents, AgentCore quotas and sessions |
| `rag-retrieval` | plan, review | one embedding model, re-embedding, found-nothing answers, citations, rerankers, context order, Knowledge Base ingestion |

No tests section: the tests reference holds the agent and retrieval case families. Left out: model prices and ids, the MCP specification version and pgvector settings (not in the checked reply), and the facts that are security's (environment variables, `InvokeAgentRuntimeCommand`, the execution role's model scope).

Rejected: a prompt-style skill, a model-price skill, a multi-agent pattern catalogue (not checkable in a diff).
