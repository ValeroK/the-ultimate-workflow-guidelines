# GenAI research prompt 5 (block C), reply of 2026-10-21

The maintainer ran research prompt 5 (`docs/expert-research-prompts.md`, block C of `docs/research/fact-checks-to-run-2026-10-21.md`). The session that answered could read **search snippets only, not pages**; it says so and marks every claim "snippet only". Facts are restated here, not copied.

## What this reply can and cannot do

- **No claim here is [R].** The shared rule asks for the page itself; a snippet is not that. These are leads: each names the page that should hold the fact, which narrows block D.
- **Three claims are secondary only:** the OWASP LLM Top 10 list (a Medium post), Greshake et al. (a mirror of the arXiv abstract), and pass^k (a blog). The quality round already confirmed pass@k and pass^k from primary sources.
- **Several quotes do not carry the whole claim.** That is noted per row below. A row whose quote supports only part of its claim counts only for that part.
- **Not reachable** (no claim, not filled from memory): the OpenAI prompt and function-calling guides, Anthropic's prompting best practices, the Bedrock prompt-caching page, the Messages API page (retries, `max_tokens`, streaming), Guardrails, Knowledge Bases, AgentCore limits and pricing. Section J returned nothing.

## Claims

| # | Section | Claim, restated | What the quote supports | Use |
|---|---|---|---|---|
| 1 | A | Anthropic: automatic caching (one top-level `cache_control`) and up to 4 explicit breakpoints; automatic uses one of the 4 | the 4-slot sharing | lead for D |
| 2 | A | Cache prefix order is tools, system, messages | as claimed | lead for D |
| 3 | A | Changing any block at or before a breakpoint changes the hash | as claimed | lead for D |
| 4 | A | Minimum cacheable length 1,024 / 2,048 / 4,096 by model; 5-minute default TTL, 1-hour option | **only the 1-hour option**; the minimums are not in the quote | minimums unconfirmed |
| 5 | A | Bedrock Converse caching uses `cachePoint` blocks | as claimed | lead for D |
| 6 | B | Anthropic error types: 400 `invalid_request_error`, 401 `authentication_error`, 429 `rate_limit_error`, 529 `overloaded_error` | 400 and 401 only | 429 and 529 unconfirmed here |
| 7 | B | Bedrock throws `ThrottlingException`, `AccessDeniedException`, `ServiceUnavailable` | names only, from a troubleshooting page for another feature | weak lead |
| 8 | C | "Building effective agents": start simple, add agentic systems only when simpler ones fall short | as claimed | lead for D |
| 9 | C | Tool descriptions of at least 3 to 4 sentences | the sentence count | lead; style guidance, not a defect rule |
| 10 | C | `tool_choice` forcing a tool plus `strict: true` guarantees a call with schema-valid input | as claimed | lead for D |
| 11 | C | A tool parameter asking for the model's step-by-step reasoning may cause a `reasoning_extraction` refusal | as claimed | lead; new, checkable in a diff |
| 12 | D | MCP specification version 2026-07-28 with authorization security considerations | the date | agrees with the security round, item 19 |
| 13 | D | MCP forbids token passthrough | as claimed | agrees with the security round, item 19 |
| 14 | E | OWASP LLM Top 10 2025, ten items | the first five ids | secondary only |
| 15 | E | Indirect prompt injection (Greshake et al., 2023) | as claimed | secondary copy of the abstract |
| 16 | F | pgvector HNSW: better speed and recall trade-off than IVFFlat, no training step, slower build, more memory | trade-off, build and memory | lead for data fact-check F |
| 17 | F | pgvector filters after an approximate index scan; iterative scans or partial indexes fix starved results | the post-scan filtering example | lead for data fact-check F |
| 18 | G | Bedrock batch inference at 50% lower than on-demand for select models | as claimed, from the pricing page | lead for D (the prompt asked for this from the pricing page) |
| 19 | H | AgentCore services: Runtime, Gateway, Memory, Identity, Browser, Code Interpreter, Observability | five names | partial |
| 20 | H | AgentCore Runtime sessions up to 8 hours on microVMs, 14 days on Instances; one microVM per session | the durations | lead for D; "Instances" is new and needs the page |
| 21 | H | Gateway targets: Lambda, API Gateway stages, OpenAPI, Smithy, MCP servers; Memory strategies: semantic, user preference, summary, episodic | the target list | strategies unconfirmed |
| 22 | H | AgentCore Identity: inbound JWT, outbound credential providers, on-behalf-of exchange, Private Key JWT | as claimed | lead for D |
| 23 | I | Start evals with 20 to 50 tasks from real failures | as claimed | lead; for quality |
| 24 | I | 0% pass@100 usually means a broken task | as claimed | lead; for quality's `eval-integrity` |
| 25 | I | pass@k rises with k, pass^k falls | as claimed | secondary here; confirmed in the quality round |
| 26 | I | LLM judges reach over 80% agreement with humans; position, verbosity and self-enhancement bias (Zheng et al.) | the agreement figure | the quality round already narrowed the bias claim |
| 27 | I | HumanEval pass@k estimator with n ≥ k samples | as claimed, from the paper | primary, but the snippet only |

## Our assessment

- **It does not unlock the four GenAI skills.** The skills need [R] facts, and none of these are. Block D (39 claims) is still needed, run in a session that can open pages, not only search.
- **Where it helps:**
  - It names the page that should hold each fact, which makes block D faster.
  - Items 12, 13 and 25 agree with facts already confirmed elsewhere.
  - Item 11 (`reasoning_extraction`) and item 20 (AgentCore Instances) are new; block D should add them.
- **The reported disagreement is not one.** MCP forbids passing a client's token through to another API. AgentCore Gateway forwarding the caller's IAM identity is a different mechanism, not token passthrough.
- **Its "top three checks" per section are suggestions, not facts.** Each rests on the claims above, at their strength.
