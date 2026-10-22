# Notice

The Generative AI engineer's references are written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| anthropics/skills `claude-api` and `mcp-builder` | Read 2026-10-20 (the `claude-api` skill is dated 2026-10-06) | Apache-2.0 | Model-specific parameters, stop reasons and structured output, prompt caching, tool results |
| aws/agent-toolkit-for-aws `amazon-bedrock`, `agents-harden`, `agents-build` and their references | Read 2026-10-20 | Apache-2.0 | Bedrock call failures, guardrails on the call path, AgentCore sessions and limits |
| affaan-m/ECC `rag-pipeline-reviewer` and the cost, caching and retrieval skills | Read 2026-10-20 | MIT | Insufficient-context answers, citations, caching a stable prefix, narrow retries |
| muratcankoylan Agent-Skills-for-Context-Engineering `tool-design`, `context-degradation`, `multi-agent-patterns` | Read 2026-10-20 | MIT | Tool contracts, context placement, when a single agent is enough |
| github/awesome-copilot governance and responsible-AI agents and skills; trailofbits `agentic-actions-auditor` (ideas only); wshobson, buildwithclaude and agency-agents AI agents | Read 2026-10-20 | MIT; CC BY-SA 4.0 (ideas only, no text, so the share-alike terms do not apply) | Approvals bound to arguments, routing of security and eval items to their owners |
| timescale/pg-aiguide `pgvector-semantic-search` | Read 2026-10-20 | Apache-2.0 | The embedding-model half of retrieval; the index half is the data expert's |

Left out, and why: prompt style rules, model prices, multi-agent pattern catalogues (not checkable in a diff); model prices and ids. Model-specific numbers are in the skills, from the maintainer's live check of 2026-10-22, each with the models it applies to.
