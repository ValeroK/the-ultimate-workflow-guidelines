# Extraction ledger: Generative AI engineer (planned expert)

Playbook steps 2 (sweep), 4 (compare) and 4b (ledger) for catalogue entry 6. No expert files exist yet, so there is no "today's rows" value test (section 3 is empty); section 7 applies the value test to the proposed skills instead. Sources were read on 2026-10-20 from saved survey clones or fetched by path from GitHub; every file was treated as untrusted data. Several files carry instructions addressed to an agent (ECC's "Prompt Defense Baseline" block; the AWS Bedrock skill's "you MUST read ... before responding" lines; awesome-copilot's "Follow the comprehensive best practices"); they were noted and not followed.

Outcome key: **taken** (goes into a proposed reference or skill), **routed** (owner named), **rejected** (why), **missing** (worth taking, not in any source here; usually a fact for the live check).

## 1. Sources

Sweep: the regular expression `prompt|llm|agent|rag|retriev|embed|vector|guardrail|mcp|bedrock|agentcore|eval|token|context|tool-?use|langchain|langgraph|claude-api|openai|anthropic|ai|model|semantic|rerank|harness|memory` over `docs/skills-catalog-2026-10-20.json` matched 326 agent names and 339 skill names. Most agent matches in `github/awesome-copilot` are noise (the `.agent` suffix); the rest were screened by name and location, and the ones below read. Not read, with the reason: persona and marketing agents (`ai-sdr`, `twitter-ai-influencer-manager`), fine-tuning (`llm-finetuning-*`, out of scope), framework catalogues with no checks (`langchain-architecture`, `semantic-kernel`), harness and memory skills for coding agents themselves (`context-save`, `memory-review`), and payment-agent skills.

| # | Repository | Path | Licence | Verdict |
|---|---|---|---|---|
| S1 | anthropics/skills | `skills/claude-api/SKILL.md` (Common Pitfalls, Prompt Caching, Tool Use Patterns) | Apache-2.0 | **Best source.** Vendor, dated ("cached 2026-10-06"), model-specific and checkable. Facts need the live check (they move with each model) |
| S2 | anthropics/skills | `skills/mcp-builder/SKILL.md` | Apache-2.0 | Building guide; little to check in a diff |
| S3 | anthropics/claude-plugins-official | `plugins/agent-sdk-dev/agents/agent-sdk-verifier-ts.md`; `plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md` | Apache-2.0 | Setup checklists; one item (keys not hardcoded) is security's |
| S4 | aws/agent-toolkit-for-aws | `plugins/aws-core/skills/amazon-bedrock/SKILL.md` | Apache-2.0 | **Strong.** Vendor toolkit with service-specific failure causes; tagged [T] until checked against the user guide |
| S5 | aws/agent-toolkit-for-aws | `plugins/aws-agents/skills/agents-harden/SKILL.md` and `references/limits.md`; `agents-build/SKILL.md`; `amazon-bedrock/references/agentcore-gateway.md`, `agentcore-credentials-and-security.md` | Apache-2.0 | **Strong** for AgentCore: quotas, session lifecycle, env vars that are not secrets, the command API's blast radius |
| S6 | affaan-m/ECC | `agents/rag-pipeline-reviewer.md` | MIT | Good RAG review questions (reranking, insufficient-context path, citations); thresholds left to the project, correctly |
| S7 | affaan-m/ECC | `agents/agent-evaluator.md` | MIT | Rubric scorer for agent output; routed to quality or rejected |
| S8 | affaan-m/ECC | `skills/cost-aware-llm-pipeline`, `prompt-caching-strategy`, `token-budget-advisor`, `iterative-retrieval`, `ai-regression-testing`, `agent-security-hardening` (each `SKILL.md`) | MIT | Mixed: caching and narrow retries useful; a price table and token-estimate heuristics rejected; hardening is security's |
| S9 | github/awesome-copilot | `agents/agent-governance-reviewer.agent.md`, `agents/se-responsible-ai-code.agent.md`, `skills/ai-prompt-engineering-safety-review/SKILL.md`, `skills/verify-agent-action/SKILL.md`, `skills/mcp-implementation-security-review/SKILL.md` | MIT | One strong idea (an approval must bind the exact action); the rest is generic or security's |
| S10 | trailofbits/skills | `plugins/agentic-actions-auditor/skills/agentic-actions-auditor/SKILL.md` and `references/vector-g-eval-of-ai-output.md` | CC BY-SA 4.0 (ideas only, no text) | Model output consumed by a shell or `eval`: security's |
| S11 | wshobson/agents | `plugins/llm-application-dev/agents/ai-engineer.md`, `prompt-engineer.md`, `vector-database-engineer.md`; `skills/rag-implementation`, `llm-evaluation`, `prompt-engineering-patterns` | MIT | Capability catalogues; one checkable idea (embedding model versioning) |
| S12 | muratcankoylan/Agent-Skills-for-Context-Engineering | `skills/tool-design/SKILL.md`, `context-degradation/SKILL.md`, `multi-agent-patterns/SKILL.md` | MIT | Good on tool contracts and context placement; figures are its own claims (marked) |
| S13 | davepoon/buildwithclaude | `plugins/agents-quality-security/agents/mcp-security-auditor.md`, `agents-data-ai/agents/ai-engineer.md`, `all-skills/skills/rag-evaluation-harness/SKILL.md` | MIT | Thin; security and quality items routed |
| S14 | msitarzewski/agency-agents | `engineering/engineering-ai-engineer.md` | MIT | Persona and catalogue; nothing checkable kept |
| S15 | timescale/pg-aiguide | `skills/pgvector-semantic-search/SKILL.md` | Apache-2.0 | Strong pgvector facts; the database half is data's, the model half is ours |
| S16 | this repository | `docs/research/aws-well-architected-2026-10-20.md`, Generative AI Lens section | ours | GENOPS, GENSEC, GENREL, GENPERF, GENCOST best practices already researched |

Fifteen upstream sources (38 files across 12 repositories) plus our own Generative AI Lens record.

## 2. Items, per source

### S1 anthropics/skills `claude-api`

| Item | Outcome | Where or owner |
|---|---|---|
| Do not truncate input silently when it exceeds the context window | taken | review: "A call that silently loses input or output" |
| Assistant prefill returns 400 on newer models (4.6 family and 5.x) | taken | skill `model-calls`; fact 1 |
| Forced tool use (`tool_choice` any or named tool) returns 400 on the newest models | taken | `model-calls`; fact 2 |
| A low `max_tokens` truncates mid-output; large values need streaming in the SDKs | taken | `model-calls`; review category; fact 3 |
| Disabling thinking is a 400 on some models | taken | `model-calls`; fact 4 |
| Tool-call input escaping varies; parse with a JSON parser, never match the raw string | taken | `model-calls`; fact 5 |
| `output_format` deprecated for `output_config.format` | taken | `model-calls`; fact 6 |
| Catch a chain of SDK errors (retryable 429, 5xx, network; not 400, 404), not one broad class | taken | `model-calls`; border with developer `failure-handling` |
| Don't redefine SDK types; use SDK helpers | rejected | developer craft, and opinion |
| Server-tool errors (web search, fetch) return HTTP 200 with an error object, not an exception | taken | `model-calls`; fact 7 |
| MCP connector needs `mcp_toolset` beside `mcp_servers` | taken | `agent-loops-and-tools`; fact 8 |
| Tool search: at least one tool not deferred, or 400 | taken | `agent-loops-and-tools`; fact 9 |
| Prompt cache: any byte change in the prefix invalidates what follows; order tools, system, messages; at most 4 breakpoints; minimum prefix 512 to 4096 tokens by model; a volatile value (a timestamp) in the system prompt silently defeats it | taken | `model-calls`; fact 10 |
| Parallel tool results go back in one user message; a failed tool returns `is_error`, not dropped | taken | `agent-loops-and-tools`; fact 11 |
| `strict: true` tools need `additionalProperties: false` and `required` | taken | `agent-loops-and-tools`; fact 12 |
| Mid-conversation system messages instead of editing `system`, on some models | missing | fact 13 (model-specific, unconfirmed) |
| Advisor-tool pairing, Managed Agents, inference geography, code execution block types | rejected | product-specific detail with low review value; changes monthly |
| Model ids and the current model table | rejected | stale by design; the reviewer reads the repository's pinned id |

### S2, S3 Anthropic MCP and SDK guides

| Item | Outcome | Where or owner |
|---|---|---|
| Evaluate an MCP server with independent, verifiable questions | routed | quality (`eval-integrity`) |
| API keys not hardcoded | routed | security |
| SDK version "reasonably current" | rejected | not checkable |
| Tool descriptions and schemas inspected before allowing tools | taken | `agent-loops-and-tools` (tool contract) |

### S4 aws/agent-toolkit `amazon-bedrock`

| Item | Outcome | Where or owner |
|---|---|---|
| Unset `maxTokens` defaults to the model maximum and reserves far more quota, causing throttling | taken | `bedrock-and-agentcore`; fact 14 |
| Guardrails PII masking applies to the response only; the original text is still logged in CloudWatch | routed | privacy (planned) and security; fact 15 for the live check |
| Classic Bedrock Agents is in maintenance mode; new work goes to AgentCore | taken | plan question; fact 16 |
| Least-privilege IAM, Secrets Manager, confused-deputy conditions, CloudTrail | routed | security |
| Treat agent-generated parameters as untrusted in tool handlers | routed | security (border: the tool's validation is security's; which tools exist is ours) |
| Converse rather than InvokeModel; InvokeModel bodies differ per provider ("Malformed input request") | taken | `bedrock-and-agentcore`; fact 23 |
| Retry: Throttling, ModelTimeout, ServiceUnavailable, InternalServer; never Validation, AccessDenied, ResourceNotFound | taken | `bedrock-and-agentcore`; fact 17 |
| Use adaptive retry mode | rejected | adaptive mode can delay the first request (architect round 2, item 40); a default, not a finding |
| Some models need an inference profile id; on-demand with the base id is refused | taken | fact 18 |
| The inference profile prefix (`us.`, `eu.`, `apac.`, `global.`) is a data-residency decision | taken | plan question; border privacy; fact 19 |
| Classic agents need `prepare-agent` after a configuration change | taken | fact 20 (only if classic agents remain in scope) |
| A knowledge base queried before ingestion completes returns nothing; unsupported files are skipped silently | taken | `rag-retrieval`; fact 21 |
| Action group names match `([0-9a-zA-Z][_-]?){1,100}` | rejected | the API refuses it (value test 4) |
| Supervisor agents use built-in collaboration, not action groups | rejected | classic-agent detail in maintenance mode |
| Billing, SharePoint, SDK-version troubleshooting | rejected | operations, not review |

### S5 aws/agent-toolkit AgentCore (`agents-harden`, `limits`, `agents-build`, gateway, credentials)

| Item | Outcome | Where or owner |
|---|---|---|
| Runtime invocation default 25 TPS per agent, account and Region | taken | `bedrock-and-agentcore`; fact 24 |
| Active session workloads 1,000 (us-east-1, us-west-2), 500 elsewhere | taken | fact 25 |
| Idle sessions count against the quota until `idleRuntimeSessionTimeout` (default 900 s) or `maxLifetime` (default 8 h); call `StopRuntimeSession` when done; reuse session ids for related requests | taken | `bedrock-and-agentcore`; review category; fact 26 |
| New-session rate 100 per minute (container) or 25 TPS (direct code) | taken | fact 27 |
| Memory `CreateEvent` 10 TPS; long-term extraction 150,000 tokens per minute | taken | fact 28 |
| Gateway: 100 targets per gateway, 1,000 tools per target | taken | fact 29 |
| Runtime environment variables are plain configuration, not secrets | routed | security; fact 30 |
| `InvokeAgentRuntimeCommand` is shell execution in the microVM with the execution role | routed | security; fact 31 |
| The auto-created execution role allows every foundation model | routed | security; fact 32 |
| Prefer Gateway targets with credential providers over direct HTTP from agent code | taken | `bedrock-and-agentcore` (tool surface), border security |
| Error handling that leaks stack traces to callers | routed | developer and security |
| Input length limits to prevent token bombing | taken | review category "No ceiling on tokens, turns or tools" |
| Defer heavy initialisation; package size budget | routed | performance (planned) |
| Tracing enabled; evaluation baseline before launch | routed | observability (planned); quality |
| Application-level per-tenant rate limits belong in the caller or API Gateway | routed | architect |

### S6 ECC `rag-pipeline-reviewer`

| Item | Outcome | Where or owner |
|---|---|---|
| Raw top-k chunks forwarded with no relevance filter or reranking | taken | `rag-retrieval` [T]; "Not when" small curated corpora with measured recall |
| A reranker that is a pass-through | taken | `rag-retrieval` |
| A "not enough context" path instead of answering anyway | taken | review category "Retrieval with no way to say it found nothing" |
| Claims attributed only to retrieved chunks (citations) | taken | review category |
| RAGAS faithfulness, context recall and precision with a baseline, thresholds, slices and allowed regression | routed | quality (`eval-integrity`); the plan asks that one exists |
| Handoffs to security for untrusted retrieved content | taken | border, agrees with security's rubric |

### S7 ECC `agent-evaluator`

| Item | Outcome | Where or owner |
|---|---|---|
| Five-axis rubric with evidence for every score below 5 | routed | quality |
| Bash allow-list for read-only verification | rejected | tooling for that agent |

### S8 ECC skills

| Item | Outcome | Where or owner |
|---|---|---|
| Route by task complexity to cheaper models | rejected | a design preference with no failure it prevents |
| Explicit budget limit before a batch; fail early rather than overspend | taken | plan question "Budgets"; border architect (spend caps) |
| Retry only transient errors | taken | `model-calls` (with S1's error chain) |
| Pricing table (2026) | rejected | stale by design; headline figures stay out (playbook step 7) |
| Cache a stable prefix; put timestamps and retrieved text after it; a cache key is not an authorisation boundary | taken | `model-calls`; the authorisation half routed to security |
| Record cache read and write counters per provider | routed | observability (planned) |
| Token-budget depth menu; words x 1.3 estimates | rejected | not checkable; heuristic |
| Iterative retrieval in three cycles with relevance scores | rejected | an agent-harness pattern for coding agents |
| Sandbox and production path parity; SELECT omits a new field | routed | quality (already in its tests reference) |
| Agent hardening: trust boundaries, URL and path validation, temp files, secrets | routed | security |
| Destructive actions need authorisation for the exact operation and scope, and confirmation | taken | review category "A consequential tool with no approval bound to its exact arguments" (with S9) |
| An unbounded configuration value is a decision to make, not a value to invent | taken | plan question "Bounds" |

### S9 awesome-copilot

| Item | Outcome | Where or owner |
|---|---|---|
| An approval must bind the exact normalised action (tool, target, parameters, scope, count, expiry); a change after approval invalidates it | taken | review category; tests case |
| Approvals carry a nonce and expiry; reject replay | routed | security |
| Governance decorators, trust scoring, intent classification | rejected | heavier by default; framework-specific |
| Audit log of tool calls and approvals, append-only | routed | security and observability (planned) |
| Rate limits on tool calls | taken | "No ceiling on tokens, turns or tools" |
| Bias, harmful content and responsible-AI review | routed | privacy and compliance (planned); not checkable in most diffs |
| MCP baseline controls; Express binds all interfaces by default; FastMCP `run()` defaults to stdio; a container port publishes even a `127.0.0.1` bind | routed | security (fact 34 for the live check) |
| MCP protocol version 2025-03-26 or later | missing | fact 33 (current version and date) |

### S10 trailofbits `agentic-actions-auditor`

| Item | Outcome | Where or owner |
|---|---|---|
| Model output consumed by `eval`, `exec`, `$()` or an unquoted variable in a later step | routed | security (injection to a sink); the model output is the untrusted source |
| Wildcard allow-lists and dangerous sandbox settings for AI actions in CI | routed | security |

### S11 wshobson `llm-application-dev`

| Item | Outcome | Where or owner |
|---|---|---|
| Model, framework, vector-store and reranker catalogues | rejected | catalogues |
| Embedding drift and model versioning | taken | `rag-retrieval`: a changed embedding model with no re-embedding of the stored vectors |
| Prompt versioning and A/B testing | taken | plan question (prompts as versioned artifacts); GENOPS03-BP01 (S16) |
| BLEU, ROUGE, NDCG lists | routed | quality |
| Jailbreak detection and content filtering | taken | plan question on guardrails, with S16 GENSEC02-BP01 |

### S12 muratcankoylan context engineering

| Item | Outcome | Where or owner |
|---|---|---|
| A tool description is the contract the model routes on: what it does, when to use it, what it returns | taken | `agent-loops-and-tools` [T] |
| Overlapping tools cause wrong selection; consolidate until each has one purpose; but not into one tool with many modes | taken | `agent-loops-and-tools` [T] |
| Error messages a model can act on | taken | `agent-loops-and-tools` [T] |
| Namespaced tool names in a growing catalogue | taken | `agent-loops-and-tools` [T] |
| Information in the middle of a long context is recalled less ("lost in the middle"); the "10 to 40 percent" figure is the source's | missing | fact 37 (the paper's finding, not the skill's number) |
| A hallucination or tool error in context compounds; remove it rather than add corrections | rejected | runtime behaviour, not checkable in a diff |
| Context clash: contradictory sources need a precedence rule | taken | plan question on retrieval sources |
| Multi-agent runs cost about 15 times a single agent | missing | fact 40 |
| Supervisor bottleneck, sycophantic consensus, agent sprawl past 3 to 5 | taken | review category "More agents than the task needs" [T], with a "Not when" |

### S13 to S15

| Item | Outcome | Where or owner |
|---|---|---|
| buildwithclaude MCP security auditor | routed | security |
| buildwithclaude RAG evaluation harness (deterministic JSON fixtures) | routed | quality |
| agency-agents AI engineer: bias testing across groups, privacy-preserving ML | routed | privacy (planned) |
| pgvector: HNSW by default, `CREATE INDEX CONCURRENTLY`, `halfvec`, operator class must match the query operator or the index is not used, explicit casts, `ef_search` default 40 and at least `LIMIT` | routed | data (planned); fact 35 |
| The same embedding model for stored data and queries | taken | `rag-retrieval`; fact 36 |
| A dimension that must match everywhere (`halfvec(N)`) | taken | `rag-retrieval` (the model half: a model change changes `N`) |

### S16 Generative AI Lens (our record)

| Item | Outcome | Where or owner |
|---|---|---|
| GENREL03-BP02 timeouts and maximum iterations on agentic workflows | taken | review "No ceiling on tokens, turns or tools" |
| GENREL03-BP01 fallback models and output schema validation with retry | taken | review "Model output trusted as structured" |
| GENSEC02-BP01 a guardrail attached to every call | taken | review "A guardrail that is not on the call path" |
| GENSEC05-BP01 human confirmation on destructive tools | taken | review (with S9) |
| GENSEC01-BP01 `bedrock:InvokeModel` scoped to model ARNs | routed | security |
| GENOPS03-BP01 versioned prompt templates | taken | plan question |
| GENOPS02 and GENOPS03-BP02 metrics and tracing | routed | observability (planned) |
| GENREL01-BP01 and GENREL05 cross-region inference | taken | plan question (residency) |
| GENCOST items | taken | plan question "Budgets"; prices stay out |

## 3. Today's rows, value test

None: the expert has no files yet.

## 4. Facts that need the maintainer's live check

Each is one checkable sentence with the page that should hold it. Anthropic facts come from a vendor skill dated 2026-10-06 and are model-specific; give the model list each applies to.

Anthropic Messages API (platform.claude.com / docs.claude.com):
1. An assistant-turn prefill returns HTTP 400 on the 4.6 family and later models; give the exact model list. (Models overview; migration guide)
2. `tool_choice` `{type: "any"}` and `{type: "tool"}` return 400 on Claude Fable 5.1, Opus 5.5 and Sonnet 5.5. (Tool use: `tool_choice`)
3. Non-streaming requests with a large `max_tokens` are refused or time out in the official SDKs, and `stop_reason: "max_tokens"` marks a truncated response. (Messages API; streaming)
4. Disabling extended thinking returns 400 on Opus 5.5 and Sonnet 5.5. (Extended thinking)
5. Tool-call `input` may differ in string escaping between models, so it must be parsed as JSON. (Tool use)
6. `output_format` is deprecated in favour of `output_config.format`. (Structured outputs)
7. Web search and web fetch tool errors return HTTP 200 with an error object in the tool result content. (Web search tool; web fetch tool)
8. The MCP connector requires an `mcp_toolset` tool alongside `mcp_servers`, with beta `mcp-client-2025-11-20`. (MCP connector)
9. Tool search returns 400 when every tool has `defer_loading: true`. (Tool search)
10. Prompt caching: render order tools, system, messages; at most 4 breakpoints; minimum cacheable prefix per model (512 to 4096 tokens); a shorter prefix is not cached and reports zero cache counters. (Prompt caching)
11. Parallel tool results must all be returned in one user message, and a failed tool is returned with `is_error: true`. (Tool use: parallel tool use)
12. `strict: true` on a tool requires `additionalProperties: false` and `required` in its schema. (Structured outputs: strict tool use)
13. A `system` role message appended to `messages[]` is supported on which models. (Mid-conversation system messages)

Amazon Bedrock (docs.aws.amazon.com/bedrock):
14. When `maxTokens` is unset, Bedrock reserves quota for the model's maximum output, which can cause throttling. (Quotas; token burndown)
15. Guardrails masking applies to the model response, and model invocation logging records the original prompt and response unmasked. (Guardrails sensitive information filters; model invocation logging)
16. Classic Bedrock Agents is in maintenance mode and closed to new customers. (Agents classic maintenance mode)
17. Retryable Bedrock runtime errors are ThrottlingException, ModelTimeoutException, ServiceUnavailableException and InternalServerException; ValidationException, AccessDeniedException and ResourceNotFoundException are not. (Bedrock runtime API errors)
18. Some models cannot be invoked on demand by base model id and require an inference profile id. (Inference profiles)
19. Geographic inference profiles keep processing within their geography; global profiles route to any commercial Region. (Cross-region inference)
20. A classic agent's configuration change takes effect only after `PrepareAgent`. (Agents: prepare)
21. A knowledge base returns no results until its ingestion job completes, and files in unsupported formats or over the size limit are skipped without failing the job. (Knowledge bases: data sources and ingestion)
23. The Converse API takes one request shape across models; InvokeModel bodies are provider-specific. (Converse API)

Amazon Bedrock AgentCore (docs.aws.amazon.com/bedrock-agentcore):
24. Runtime `InvokeAgentRuntime` default 25 TPS per agent, per account, per Region, adjustable. (Quotas)
25. Active session workloads: 1,000 in us-east-1 and us-west-2, 500 elsewhere, adjustable. (Quotas)
26. `idleRuntimeSessionTimeout` defaults to 900 seconds and `maxLifetime` to 8 hours, and idle sessions count against the active-session quota until reclaimed. (Runtime: session lifecycle)
27. New sessions: 100 per minute for container deployments, 25 TPS for direct code. (Quotas)
28. Memory `CreateEvent` 10 TPS; long-term memory extraction 150,000 tokens per minute per account. (Quotas)
29. Gateway: 100 targets per gateway and 1,000 tools per target. (Quotas)
30. Runtime environment variables are stored as plain configuration, not as secrets. (Runtime configuration)
31. `InvokeAgentRuntimeCommand` runs a shell command in the session's microVM with the runtime's execution role. (Runtime API)
32. The execution role the starter toolkit creates allows `bedrock:InvokeModel` on every foundation model. (Runtime permissions)

Model Context Protocol (modelcontextprotocol.io):
33. The current specification version and its date (the source says 2025-11-25). (Specification)
34. Node's `server.listen(port)` with no host binds all interfaces, and a container port mapping publishes a service bound to `127.0.0.1` inside the container only if it binds `0.0.0.0`; give what the docs say. (Node.js `net.Server.listen`; Docker networking) [for security]

Retrieval:
35. pgvector: `hnsw.ef_search` defaults to 40; an index is used only when the query operator matches the index operator class; `halfvec` halves storage. (pgvector README) [for data]
36. Similarity search requires the same embedding model for stored vectors and queries, and a model change requires re-embedding. (an embedding provider's documentation, for example Amazon Titan or OpenAI embeddings)
37. Liu et al. 2023, "Lost in the Middle": accuracy is highest when relevant information is at the beginning or end of the context and lowest in the middle; give the measured drop. (arXiv 2307.03172)

Agents:
38. Anthropic "Building effective agents": its distinction between workflows and agents, and its advice to start with the simplest pattern. (anthropic.com/research/building-effective-agents)
39. OWASP Top 10 for LLM Applications 2025: ids and titles for prompt injection (LLM01), excessive agency (LLM06) and unbounded consumption (LLM10). (genai.owasp.org)
40. Anthropic's multi-agent research system post: multi-agent runs used about 15 times the tokens of a chat. (anthropic.com/engineering/multi-agent-research-system)

Number 22 is unused (the action-group pattern was rejected). 39 facts.

## 5. Proposed reference content

**Agent file, Goal (draft).**
- Prevents: a change where a model call or an agent can loop, spend or act without a bound, return something the code then trusts wrongly, or answer from retrieval that silently found nothing.
- Done well: every finding names the call, loop or tool, the input or model behaviour that triggers it, and the wrong outcome, with the line where the bound, check or parse is missing.
- Not the goal: prompt wording and style, model choice by preference, evaluation design (quality), or security of tools and data (security).

**How to judge (draft).** The model is a non-deterministic dependency: judge the code around it, not the prose of the prompt. Bounds and approvals are checked where the side effect happens, not where the prompt asks. Facts about a provider's API move with each model: name the model the repository pins, and check the vendor page with the web tool before a model-specific finding.

**`plan.md`, questions (draft).**
- **The model and its pin.** Which model id, pinned how, and what happens when it is retired or a feature is removed for it (prefill, forced tool choice, thinking off).
- **Bounds.** Maximum turns, tool calls, tokens per call and per run, and wall-clock time for every loop; what the user sees when a bound is hit. An unbounded setting is a question for the user, not a default to invent.
- **Tools.** Each tool's contract (what, when, returns), which tools change state, and which need a human approval bound to the exact arguments.
- **Structured output.** How output is constrained (schema, strict tools) and validated, and what happens on a parse failure or a truncated response.
- **Retrieval.** The embedding model and dimension, the plan for re-embedding when it changes, what the system answers when nothing relevant is found, and how citations are tied to retrieved text.
- **Budgets.** A cost ceiling per run or per tenant, the caching plan for a stable prefix, and who is told when the ceiling is hit (spend caps: border with the architect).
- **Residency.** Which inference profile or Region, as a data-residency decision (border with privacy).
- **Prompts as artifacts.** Prompts versioned and reviewed like code, not built inline from fragments.
- **One-way choice:** a provider, an embedding model with a large corpus, or an agent framework names the alternatives.
- Good constraint: "The `refund` tool requires an approval record whose `order_id` and `amount` equal the call's arguments; the loop stops after 8 turns and returns `needs_review`." Rejected: "Use a better model" or "add a reranker" with no measured retrieval problem.

**`review.md`, categories (draft, each with its "Not when").**
- **No ceiling on tokens, turns or tools.** A `while` loop over model turns with no maximum, no timeout, no `max_tokens`, or unbounded input length. Not when the framework's configured limit is cited.
- **A consequential tool with no approval bound to its exact arguments.** A delete, payment, send or deploy tool that runs on the model's say-so, or an approval shown with a summary that the call can change. Not when the tool is read-only, or the approval record is compared field by field before execution.
- **Model output trusted as structured.** JSON parsed by string matching, a truncated response (`stop_reason` max tokens) parsed as complete, a schema-less parse feeding a write, no fallback on parse failure. Not when strict tool use or a structured-output schema constrains it and the code checks the stop reason.
- **A call that silently loses input or output.** Input truncated to fit the window with no signal; a `max_tokens` set so low the answer is cut. Not when truncation is the documented behaviour and the caller is told.
- **The wrong failures retried.** A retry on 400 or validation errors, no retry on throttling or overload, or an application retry on top of the SDK's (border with developer and architect). Not when the error chain matches the provider's retryable list.
- **A cached prefix that never hits.** A timestamp, request id or unsorted JSON before the cache breakpoint. Not when the prompt is below the model's minimum cacheable length anyway.
- **A parameter the pinned model refuses.** Prefill, forced `tool_choice`, thinking disabled, or a deprecated field on a model that returns 400 for it. Not when the code is pinned to a model that still accepts it.
- **Tool results returned wrongly.** Parallel tool results split across messages, a failed tool dropped instead of returned with `is_error`. Not when the framework assembles the messages and is not bypassed.
- **Embeddings that no longer match.** A changed embedding model or dimension with no re-embedding of stored vectors, or queries embedded with a different model than the data. Not when the change ships with a full re-index step.
- **Retrieval with no way to say it found nothing.** Top-k results forwarded whatever their score, no insufficient-context answer, citations not tied to retrieved chunks. Not when the corpus is small and curated and the eval shows recall.
- **A guardrail that is not on the call path.** A guardrail resource defined but not passed on the call that serves users. Not when the requirement does not ask for one.
- **More agents than the task needs.** A multi-agent split for a task one agent with tools can do, with the coordination and token cost that brings. Not when the plan names the reason (isolation, parallel research).
- **AgentCore sessions that are never released.** A new session id per request with no `StopRuntimeSession`, under the default idle timeout. Not when traffic is low and the timeout is set for it.

**Severity here (draft).** High: an agent can take a state-changing action, or spend without a ceiling, on a path users reach; or model output is silently wrong (a truncated or misparsed response written somewhere). Medium: it needs a condition (a burst, a model upgrade, a long input). Low: a cache miss or extra tokens with a small bound.

**Worked pair (draft).** Finding: `agent/loop.py:22` `while True:` calls the model and executes every `tool_use` block, and `tools/orders.py:40` `cancel_order` runs with no approval; a planted instruction in a ticket makes the model cancel orders until the request times out. Dropped: `rag/search.py:15` forwards the top 3 chunks with no reranker; the corpus is 200 curated pages and `evals/retrieval.json` shows recall@3 of 0.97, so there is no failure to report.

**Tests (draft).** Families: a tool that errors, times out or returns malformed output (border: quality's tests reference already holds this family; see section 6); a response cut at `max_tokens`; a refusal; parallel tool calls; the turn ceiling reached; retrieval with no relevant document; an approval whose arguments differ from the call. Worked case: the model proposes `refund(order_id=7, amount=500)` after approval of `amount=50`; assert the tool is not executed and the loop returns `needs_review`.

## 6. Responsibilities: draft rubric rows

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Model calls | parameters, limits and stop reasons the pinned model requires; structured output and how it is parsed; retryable errors per provider; prompt caching | how the error handling is written in the language (developer) | which errors to retry is the Generative AI engineer's; how the catch is written is the developer's |
| Agent loops and tools | turn, token and time bounds; tool contracts; which tools change state and their approval; tool results returned correctly | IAM and auth behind a tool, injection that makes an agent with tools act (security) | which tools an agent holds and whether one needs approval is the Generative AI engineer's; what the tool's credentials can reach is security's |
| Retrieval | embedding model and its consistency, re-embedding, chunking, reranking, insufficient-context answers, citations | vector index type, operator class, migrations (data, planned) | the model that makes the vectors is the Generative AI engineer's; how the database stores and indexes them is data's |
| Model and token cost | tokens per call and per run, caching, model choice against the task | per-tenant and per-run spend ceilings across the system (architect) | a loop that can exceed its token budget is the Generative AI engineer's; a missing system-wide spend cap is the architect's |
| Prompts and guardrails | prompts as versioned artifacts, guardrails attached on the call path, operator and user text kept apart | whether untrusted text can make an agent act (security); harmful-content policy (privacy, planned) | a guardrail not attached is the Generative AI engineer's; a prompt-injection path to a tool is security's |
| Bedrock and AgentCore | model access, inference profiles, Knowledge Base ingestion, AgentCore quotas and session lifecycle | the queue, workflow or function around model calls (architect); deploy and IaC (devops) | the AgentCore session settings are the Generative AI engineer's; the Lambda or Step Functions around them are the architect's |
| Evaluation of model output | that the plan names what to measure (retrieval recall, task success) | whether the eval can fail: judges, splits, pass rules (quality) | what to measure is the Generative AI engineer's; whether the measurement is sound is the quality engineer's |

**Border conflicts found.**
- **Quality's tests reference already holds "Agent and tool behaviour"** (tool errors, timeouts, malformed output, planted instructions, forbidden actions). If this expert joins the tests stage it duplicates that family. Proposal: this expert joins **plan and review only**, and quality keeps the agent-case family; or the family moves here and quality keeps the oracle. The catalogue entry says plan, tests, review; this needs the maintainer's decision.
- **Security owns the agent, skill, hook and MCP surface** in this repository's own configuration, and "injection into agents that hold tools". The approval-binding category above is about product code's tools; the border row says which side each falls on, but the two experts will both look at a destructive tool. The row's rule (tool set and approval here, credentials and injection path there) must be mirrored in security's table when the expert is built.
- **The architect's "Cost with no ceiling"** names "clients or models built on every call" and per-tenant spend. Token cost per call and loop moves here; the system-wide cap stays the architect's; the architect's category needs its "Not when" updated.

## 7. Proposed skills, with selectors and the value test

| Skill | Holds | Review selector | Value test |
|---|---|---|---|
| `model-calls` | Anthropic, OpenAI and Bedrock call semantics a reviewer gets wrong: removed parameters per model, `max_tokens` and stop reasons, structured output, JSON parsing of tool input, retryable errors, server-tool errors, prompt-cache invalidation | `added: @anthropic-ai/sdk\|from anthropic\|import anthropic\|messages\.create\|messages\.stream\|bedrock-runtime\|\.converse\(\|InvokeModel\|from openai\|chat\.completions\|responses\.create\|cache_control` | passes: version- and model-specific (1), each shows in a call's arguments (2), vendor-sourced once checked (3), no linter or other skill holds it (4) |
| `agent-loops-and-tools` | turn and token bounds, tool contracts and overlap, approval bound to exact arguments, parallel tool results and `is_error`, strict tools, MCP connector and tool search rules | `added: tool_use\|tool_result\|tool_choice\|"tools":\|tools=\[\|@tool\b\|max_iterations\|recursion_limit\|StateGraph\|create_react_agent\|AgentExecutor\|mcp_servers\|FastMCP\|McpServer` | passes, except the tool-description advice from S12, which is [T] and goes on the next check if kept |
| `rag-retrieval` | same embedding model for data and queries, re-embedding on a change, insufficient-context answers, citations, reranking judged against measured recall, Knowledge Base ingestion | `added: embedding\|embed_documents\|embed_query\|similarity_search\|vector_store\|VectorStore\|pgvector\|halfvec\|rerank\|knowledge_base\|KnowledgeBase\|retrieve_and_generate` | passes for the model half; the index half is data's and stays out |
| `bedrock-and-agentcore` | Converse against InvokeModel, unset `maxTokens`, inference profiles and residency, Guardrails on the call path, AgentCore quotas and session lifecycle, Gateway targets over direct HTTP | `files: agentcore.json, .bedrock_agentcore.yaml; added: bedrock\|Bedrock\|AgentCore\|agentcore\|AWS::Bedrock\|aws_bedrock\|bedrock_agentcore` | passes; overlaps `aws-well-architected` GENREL and GENSEC rows (merge: the architect's skill points here when this one exists) |

Rejected skills: a prompt-engineering style skill (fails 2: wording is not checkable and the model reads prompts better than rules about them), a model-price skill (fails 3 over time: prices go stale; the playbook keeps headline figures out), a multi-agent patterns skill (one review category is enough).

## Closing: does this domain need an expert?

Yes, by the test in `docs/adding-an-expert.md`. It gives what a lens cannot: requirements that must shape the plan before code exists (loop bounds, which tools need approval, the re-embedding plan, budgets, the residency choice), and noise to cut (catalogues of models and frameworks, prompt style). Most of its facts are model- and vendor-specific and change monthly, which is the case for a skill pasted by code rather than a reviewer's memory.

**Tools.** The default `Read, Grep, Glob` is enough to review. Web search and fetch would let it check a model-specific parameter against the vendor's current page, as the five other role experts do by the maintainer's decision of 2026-10-20; that decision names the existing experts, so extending it to this one is the maintainer's call (and needs its `DECLARED_TOOLS` entry). No shell is needed.

**Stages.** Plan and review are clear. Tests depends on the border decision with quality in section 6.
