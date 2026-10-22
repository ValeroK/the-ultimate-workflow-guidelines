---
name: model-calls
description: Use when a change calls a language model through the Anthropic API or SDK (directly, or the same models on Bedrock or Google Cloud) - request parameters, max_tokens and stop reasons, thinking settings, structured output, parsing tool input, server-tool errors, prompt caching, retries - to find the call that the pinned model refuses, that silently loses output, that misparses what came back, or whose cache never hits.
verified: 2026-10-22
---

# Model calls

## Goal

- **Lets the expert catch:** a request the pinned model answers with 400, a response cut at its output limit and used as complete, tool input matched as a string, a server-tool error treated as success, a refusal parsed as an answer, and a prompt cache that never hits.
- **Applies to:** code that builds a Messages API request or reads its response: `messages.create`, `messages.stream`, `messages.parse`, batch requests, `cache_control`, `thinking`, `tool_choice`, `output_config`, `stop_reason`.
- **Not for:** loops, tool contracts and approvals (`agent-loops-and-tools`); Bedrock's own APIs, quotas and guardrails (`bedrock-and-agentcore`); retrieval (`rag-retrieval`); how the catch is written in the language (developer, `failure-handling`); whether untrusted text can steer the model (security).

Sources: **[R]** the maintainer's live check of platform.claude.com (API errors, define tools, streaming, thinking, prompt caching, parallel tool use, mid-conversation system messages, the Opus 5.5 and Haiku 5.5 migration guides), block D (2026-10-22); **[T]** anthropics/skills `claude-api` and ECC's cost skills (MIT), not checked; **[O]** our own reasoning. Model behaviour changes with each release: every model-specific row names the models the page named on 2026-10-22. For a model not named, check the vendor page with the web tool before a finding rests on the row.

## First, establish the target

- **The model id the code pins**, from configuration or the call. A row applies only to the models it names.
- **The SDK and how responses are read**: the SDK's own `parse()` helper, a framework, or hand-written parsing.
- If you cannot establish the model, say so and lower your confidence by one step.

## Parameters the pinned model refuses (as of 2026-10-22)

| Rule | What breaks it in a diff | Models that still accept it |
|---|---|---|
| An assistant-turn prefill returns 400 on Claude 4.6 and later, Mythos Preview and Haiku 5.5 [R] | A last `assistant` message used to force a prefix ("{", "Answer:") | Haiku 4.5 and Sonnet 4.5, with thinking off [R] |
| `tool_choice` `{type: "any"}` or `{type: "tool"}` returns 400 on Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1, token counting included [R] | Forced tool use to get structured output | Opus 5, Sonnet 5, Opus 4.8 and 4.7 [R]; on newer models use structured output instead [O] |
| `thinking: {type: "disabled"}` returns 400 on Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1, Fable 5, Mythos 5 and Mythos Preview; on Sonnet 5.5 up-front thinking is turned off with `between_tools` at effort high or below [R] | Thinking disabled to save latency | Opus 5, Sonnet 5 and Haiku 5.5 [R] |
| `thinking: {type: "enabled"}` returns 400 on Claude 4.7 and later [R] | A `budget_tokens` style thinking request copied from older code | Older models |
| A non-default `temperature`, `top_p` or `top_k` returns 400 on Opus 4.7 and every later model the page lists [R] | `temperature: 0` "for determinism" | Older models |
| `output_format` is deprecated for `output_config.format`; the SDK's `parse()` helper still takes the model [R] | New code using `output_format` | |
| On Fable 5.1, Mythos 5.1, Opus 5.5, Sonnet 5.5 and Haiku 5.5, editing an earlier part of the conversation invalidates the later thinking blocks: 400 by default, or `prefix_mismatch_behavior: "drop_block"` drops them [R] | History trimmed, summarised or redacted in place while thinking blocks after it are sent back | Only the newest turn changes |
| Sonnet 5.5 and Haiku 5.5 thinking blocks are bound to the account that produced them [R] | Conversation history moved between API keys of different accounts, or replayed from another tenant's store | |
| Fable 5.1 and Mythos 5.1 need 30-day retention: under zero data retention without authorisation they return 400 [R] | One of them pinned in an organisation that runs under zero data retention | |
| Mid-conversation `system` messages work on Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 4.8, Opus 5, Sonnet 5.5 and Haiku 5.5; turn-scoped ones (`clear_at`) take text only [R] | A `system` entry in `messages[]` on another model; an image or document in a turn-scoped one | |

## Output limits, stop reasons and refusals

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The SDKs require streaming for a large `max_tokens`; batches need none [R] | A non-streaming `create` with a large `max_tokens` outside a batch | `stream`, or a batch request |
| `stop_reason: "max_tokens"` means the output was cut; `"model_context_window_exceeded"` means the context ran out [R] | Output parsed, stored or shown with no check of `stop_reason` | The SDK's `parse()` with a schema, which fails loudly [O] |
| A refusal is HTTP 200 with `stop_reason: "refusal"` [R], so code that checks only for an exception treats it as an answer [O] | A handler that reads the text of every 200 response | |
| The tokenizer of the 5.5 models and Fable 5.1 gives about 30 percent more tokens for the same text than Sonnet 4.6, 4.5 and Haiku 4.5 [R] | A model upgrade that keeps `max_tokens`, a context budget or a cost cap computed for the old model | |

## Parsing what came back

- Opus 4.6 and later may escape tool arguments differently from older models: parse `input` with a JSON parser, never match the raw string [R].
- `strict: true` tools need `additionalProperties: false` on every object of the schema [R]; strict mode allows at most 20 tools, 24 optional parameters and 16 union parameters, and compiles the grammar in at most 180 seconds [R].
- Web search and web fetch errors come back as HTTP 200 with an error block in the tool result; an invalid tool configuration is a 400 [R]. Code that checks only the HTTP status treats a failed search as results [O].

## Prompt caching

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The cache key is the prefix in the order tools, system, messages; a changed byte at or before a breakpoint misses everything after it [R] | A timestamp, request id, user name or unsorted serialised object in the tools or system prompt, before the breakpoint | Volatile text placed after the last breakpoint |
| At most 4 breakpoints; each looks back at most 20 blocks [R] | A fifth `cache_control`; a breakpoint more than 20 blocks after the content it should reuse | |
| Minimum cacheable prefix: 512 tokens on the 5.x models and Haiku 5.5; 1,024 on Sonnet 4.6 and 4.5; 2,048 on Mythos Preview and Opus 4.7; 4,096 on Opus 4.6, 4.5 and Haiku 4.5. A shorter prefix is not cached and reports zero cache counters [R] | Caching added to a short prompt and counted as a saving | |
| Top-level automatic caching returns 400 on the legacy Bedrock integration for Opus 4.6 and earlier [R] | Automatic caching on that path | |
| A cache key is not an authorisation boundary [T] (security's) | | |

## Retries

- Retry transient errors only: rate limits, overload, server errors and network failures, not 400, 401 or 404 [T]. An application retry on top of the SDK's own multiplies the attempts [O]. Which errors are retryable is this skill's; how the catch is written is the developer's.

## Not a finding

- A parameter refused by a newer model, in code pinned to a model the row lists as accepting it.
- Caching left off a prompt shorter than the model's minimum.
- `temperature` on a model older than Opus 4.7.
- A model id you would not have chosen.
