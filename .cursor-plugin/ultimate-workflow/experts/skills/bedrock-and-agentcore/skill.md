---
name: bedrock-and-agentcore
description: Use when a change calls Amazon Bedrock (Converse, InvokeModel, inference profiles, Guardrails, classic Agents) or runs an agent on Bedrock AgentCore (Runtime sessions, Memory, Gateway), to find quota reserved by an unset output limit, a model id that cannot be invoked on demand, a profile that moves data out of its geography, a guardrail that does not cover the path, the wrong errors retried, and sessions that pile up against a shared quota.
verified: 2026-10-22
---

# Bedrock and AgentCore

## Goal

- **Lets the expert catch:** Bedrock calls that throttle because each reserves its full output limit, a model invoked by an id it cannot be invoked with, a cross-Region profile that sends data out of the geography the plan promised, a guardrail that misses what it was meant to mask, a classic agent change that never takes effect, and AgentCore sessions and calls that run into account-wide quotas.
- **Applies to:** `bedrock-runtime` and `bedrock-agent-runtime` clients, `converse`, `converse_stream`, `invoke_model`, inference profile ids, guardrail settings, `bedrock-agentcore` calls and configuration (`InvokeAgentRuntime`, session settings, Memory, Gateway targets), and the IaC that defines them.
- **Not for:** the Anthropic Messages parameters themselves (`model-calls`, which also holds for Claude on Bedrock); IAM scope of the execution role, secrets in environment variables, and the shell access `InvokeAgentRuntimeCommand` gives (security); the Lambda or workflow around the call (architect).

Sources: **[R]** the maintainer's live check of docs.aws.amazon.com (Bedrock token burndown, Guardrails sensitive information filters, inference profiles and cross-Region inference, Converse, the Agents classic maintenance notice and testing pages, Knowledge Base sync, AgentCore quotas, Runtime lifecycle, permissions and execute command) and nodejs.org, block D (2026-10-22); **[T]** aws/agent-toolkit-for-aws `amazon-bedrock` and AgentCore skills (Apache-2.0), not checked; **[O]** our own reasoning. Quotas are account defaults, adjustable, as of 2026-10-22.

## First, establish the target

- **The Region and the model or inference profile id** each call uses.
- **The residency the plan promised** (a geography, or none).
- **Whether the agent runs on classic Bedrock Agents or AgentCore.**

## Bedrock calls

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Bedrock deducts input tokens plus `maxTokens` from the quota when a request starts and credits unused output at the end [R], so an unset or oversized `maxTokens` throttles under load long before real usage reaches the quota [T] | No `maxTokens` (or the model maximum) on a high-volume path | Low-volume or batch paths |
| Converse takes one request shape across models; `InvokeModel` bodies are provider-specific [R] | A provider-specific `InvokeModel` body reused for another model family | Converse |
| Some models can be invoked on demand only through an inference profile [R] | A base model id passed where the model needs a profile id | |
| Geographic profiles keep processing in their geography; global profiles route to any commercial Region [R] | A `global.` profile, or a profile from another geography, in a product whose plan or contract promises residency | No residency requirement |
| Each API documents its own errors [R]; throttling, timeouts, service unavailable and internal errors are worth retrying, validation, access-denied and not-found errors are not [O] | A retry on `ValidationException` or `AccessDeniedException`; no retry on `ThrottlingException` | The SDK's retry configuration already handles it |

## Guardrails and logging

- Guardrails can mask personal data in requests and responses, but not in tool arguments [R], and model invocation logging collects the inputs and outputs [R]. A guardrail relied on to keep personal data out of an agent's tool calls, or out of the logs, does not [O]. What may be logged is privacy's and security's.
- A guardrail defined in IaC but not passed on the call that serves users protects nothing [O].

## Classic Bedrock Agents

- Classic agents are in maintenance mode: accounts that have not used them cannot create new ones [R]. New work on them is a plan question.
- A configuration change takes effect only after `PrepareAgent`, and an alias keeps the version it is bound to [R]. A change with no prepare step, or no new version and alias update, leaves the old agent serving [O].

## AgentCore (quotas as of 2026-10-22)

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `InvokeAgentRuntime` is 25 TPS per account per Region, shared across all data-plane APIs and endpoints, not per agent [R] | A second agent, or a fan-out that calls agents in parallel, planned as if each had its own 25 TPS | |
| Active session workloads: 5,000 in us-east-1 and us-west-2, 2,500 elsewhere; idle sessions count until `idleRuntimeSessionTimeout` (default 900 s) or `maxLifetime` (default 28,800 s) ends them [R] | A new session id per request with no reuse and no stop, so idle sessions fill the quota | Low traffic with timeouts set for it |
| New sessions have one quota shared by container and direct-code agents [R] | Capacity planned per deployment type | |
| Memory `CreateEvent` is 200 per second; long-term extraction 150,000 tokens per minute [R] | An event per token or per streamed chunk | |
| 1,000 gateways per account, 100 targets per gateway, 1,000 tools per target [R] | A gateway or target per tenant or per user | |
| A container service must bind all interfaces to be reachable through a published port; Node's `listen(port)` with no host already binds `::` or `0.0.0.0` [R] | An agent server bound to `127.0.0.1` or `localhost` inside its container | |

## Not a finding

- A quota you would raise: quotas are adjustable, and this skill reports only a design that assumes a quota it does not have.
- Converse against `InvokeModel` when the code uses one model family only.
- A `us.` or `eu.` profile in a product with no residency requirement.
