---
name: agent-loops-and-tools
description: Use when a change builds or changes an agent or a tool-using model loop - the loop and its bounds, tool definitions and descriptions, which tools change state and how they are approved, how tool results go back to the model, parallel tool calls, strict tools, MCP servers and the MCP connector, tool search, computer and browser tools, multi-agent splits - to find a loop with no ceiling, a consequential action with no approval bound to its arguments, results returned in a shape the API rejects or misreads, and agents the task does not need.
verified: 2026-10-22
---

# Agent loops and tools

## Goal

- **Lets the expert catch:** an agent that can loop, spend or act without a bound; a state-changing tool that runs on the model's say-so, or under an approval its arguments can drift from; tool results sent back so the API refuses them or the model misreads a failure as success; tool definitions the API rejects; and a multi-agent split that multiplies cost for no failure it prevents.
- **Applies to:** agent loops (hand-written or in a framework: LangGraph, the Agent SDK, CrewAI, AutoGen), `tools` arrays and tool decorators, `tool_use` and `tool_result` handling, MCP servers and clients, approval and confirmation code.
- **Not for:** single model calls and their parameters (`model-calls`); whether untrusted text can make the agent act, and what a tool's credentials can reach (security); the queue or workflow the agent runs in (architect); whether an agent eval can fail (quality, `eval-integrity`).

Sources: **[R]** the maintainer's live check of platform.claude.com (define tools, parallel tool use, tool search, the MCP connector, computer and browser tools), anthropic.com ("Building effective agents", the multi-agent research system) and genai.owasp.org, block D (2026-10-22); **[T]** muratcankoylan's context-engineering skills, github/awesome-copilot governance agents and ECC (MIT), not checked; **[O]** our own reasoning. Model-specific rows name the models the page named on 2026-10-22.

## First, establish the target

- **Where the loop is and what bounds it**: the framework's limit (`max_iterations`, `recursion_limit`, `max_turns`), or the code's own counter and timeout.
- **Which tools change state** (write, send, pay, delete, deploy) and which only read.
- **Whether the framework assembles tool results**, or the code does it by hand.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Bounds

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Every loop over model turns has a maximum number of turns or tool calls, a wall-clock limit and a per-call output limit, and says what the user sees when one is hit [O] | `while True:` (or `while not done`) around a model call; a framework limit set to a very large number or unset where its default is unbounded | A framework limit you can cite |
| Agents use about 4 times, and multi-agent systems about 15 times, the tokens of a chat [R], so a loop's bound is also its cost bound [O] | A new agent or sub-agent path with no token or cost ceiling per run | |
| Input from users or tools has a length limit before it reaches the model [T] | A tool result or uploaded document appended to the context whole | |

When a finding needs a name: the OWASP Top 10 for LLM applications 2025 calls these LLM10 Unbounded Consumption and LLM06 Excessive Agency (LLM01 is prompt injection, security's) [R].

## Consequential tools and approval

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A tool that changes state runs only after an approval bound to its exact normalised arguments (tool, target, amount, scope); any change after approval invalidates it [T] | A delete, send, refund or deploy tool executed straight from a `tool_use` block; an approval checked by a flag or by one id while other arguments can change | Read-only tools; an approval record compared field by field with the call before it runs |
| Start with the simplest pattern: workflows follow predefined code paths, agents direct their own; add agency only when the simpler one falls short [R] | A model-driven loop where the steps are fixed and known | The plan names why the steps cannot be fixed |
| A multi-agent split pays coordination and tokens [R]; more agents than the task needs adds both with no failure it prevents [O] | A supervisor plus sub-agents for a task one agent with tools does | Isolation, or parallel independent research, named in the plan |

## Tool definitions

- A tool's description is the contract the model routes on: what it does, when to use it, what it returns, what its errors mean [T]. Two tools whose descriptions overlap get chosen wrongly; one tool with many modes is no better [T].
- An error a tool returns says what the model can do next, not a stack trace [T].
- `strict: true` needs `additionalProperties: false` on every object [R]; at most 20 strict tools, 24 optional parameters and 16 union parameters, and the grammar must compile within 180 seconds [R].
- `disable_parallel_tool_use` goes inside `tool_choice`, not at the top level [R].
- Tool search returns 400 when every tool is deferred; never defer the tool search tool itself [R]. `defer_loading` together with `cache_control` on a tool returns 400 [R].

## Returning tool results

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| All results for one turn's parallel tool calls go back in one user message, with no text before them [R] | One user message per result, or a text block placed ahead of the `tool_result` blocks | The framework assembles them and is not bypassed |
| A failed tool is returned with `is_error: true`, not dropped [R]; a dropped result leaves a `tool_use` with no answer, and a failure sent as plain text reads as success [O] | An `except` that skips appending the result, or appends the error as normal content | |
| Computer and browser batch actions run in order and stop at the first failure [R] | Code that assumes every action in a batch ran | |

## MCP and server tools

- The MCP connector needs exactly one `mcp_toolset` for every `mcp_servers` entry, with the beta `mcp-client-2025-11-20`, or `mcp-client-2026-09-15`, which includes it [R].
- `web_fetch` fetches only URLs already present in the conversation [R]; a flow that expects it to open a URL the code builds gets an error [O].
- On the Claude API and Google Cloud, Opus, Sonnet and Haiku 5.5 need `computer_toolset_20260801` for computer use [R]; `fine-grained-tool-streaming-2025-05-14` with a computer or browser toolset returns 400 [R].
- Which servers an agent may reach, and their credentials, are security's.

## Not a finding

- A loop bounded by a framework limit you can cite.
- A read-only tool with no approval.
- A single agent with several tools.
- A tool description you would have worded differently, when it already says what, when and returns.
