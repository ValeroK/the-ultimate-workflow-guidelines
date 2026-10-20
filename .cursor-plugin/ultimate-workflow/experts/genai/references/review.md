# Generative AI engineer review of a diff

## Purpose

Find the code around model calls and agents that this change makes unsafe or wrong: loops with no bound, consequential tools with no approval, model output trusted without a check, and retrieval that answers from nothing. Written from vendor documentation and open-source agents compared on 2026-10-20 (see `NOTICE.md`); no text is copied.

## Scope

Report problems this change introduces or makes worse in code that calls a model, defines or runs tools, assembles prompts, embeds or retrieves, or configures a model service. This is not a review of prompt wording.

- A problem that was already there and is untouched is out of scope, unless the change makes it reachable.
- Read the loop that drives the model, the tool implementations it can call, and the code that consumes the output.
- If the plan has an "Expert input" section, check the diff against what you required there.
- How a pinned model behaves today is something you may not be able to confirm; say so rather than assert it.

## Method

1. Learn how this repository already calls models: the client wrapper, where limits and retries are set, how tools are registered, how output is parsed.
2. Compare the change against that, and against the plan's bounds, tools and retrieval answers.
3. Trace each risky path from the model's output to the side effect or the stored result, with file and line at every step.

Stop a trace when it reaches a bound, an approval or a validation that holds, or when it cannot be completed from what you can read: then it stays out. Stop the review when every changed call, loop, tool and retrieval path has been traced.

Every finding states the trigger (an input, a model behaviour such as a long answer or a planted instruction) and the wrong outcome, in one or two sentences.

## Categories

Check what the change touches and skip the rest.

- **No ceiling on turns, tools or tokens.** A loop over model turns with no maximum, no timeout, no output token limit, or input of unbounded length. Not when a limit configured in the framework or wrapper applies, and you can cite it.
- **A consequential tool with no approval tied to its arguments.** A delete, payment, send or deploy tool that runs on the model's say-so, or an approval shown with a summary the call can change. Not when the tool is read-only, or the approval record is compared field by field with the call before it runs. Whether untrusted text can steer it there is security's (owner: security).
- **Model output trusted as structured.** JSON found by string matching, a response cut off at the token limit parsed as complete, a schema-less parse feeding a write, no path for a parse failure. Not when a schema or strict tool input constrains the output and the code checks the stop reason.
- **Input or output lost without a signal.** Input truncated to fit the context window with no signal, or an output limit so low the answer is cut. Not when truncation is documented behaviour and the caller is told.
- **The wrong failures retried.** A retry on validation or other client errors, none on throttling or overload, or an application retry on top of the SDK's own. Not when the retried errors match the provider's retryable list in the repository's client.
- **A cached prefix that never hits.** A timestamp, request id or unsorted serialised object placed before the cache breakpoint. Not when the prefix is too short to be cached anyway.
- **Embeddings that no longer match.** A changed embedding model or dimension with no re-embedding of stored vectors, or queries embedded with a different model than the data. Not when the change ships with a full re-index step.
- **Retrieval with no way to say it found nothing.** Top results forwarded whatever their relevance, no insufficient-context answer, citations not tied to retrieved chunks. Not when the corpus is small and curated and a measurement shows recall.
- **A guardrail that is not on the call path.** A guardrail defined but not passed on the call that serves users. Not when the requirement does not ask for one.
- **Sessions that are never released.** A new agent session per request with no stop or reuse, so idle sessions pile up against a quota. Not when traffic is low and the session timeout is set for it.
- **More agents than the task needs.** A multi-agent split for a task one agent with tools can do, paying the coordination and token cost. Not when the plan names the reason (isolation, parallel research).

## Severity here

- **high**: an agent can take a state-changing action, or spend without a ceiling, on a path users reach; or model output is silently wrong and is written somewhere.
- **medium**: the harm needs a condition, such as a burst, a model upgrade or a long input.
- **low**: a cache miss or extra tokens with a small, stated bound.

## Do not report

- Prompt wording, tone and formatting.
- A model choice made by preference, with no failure shown.
- A missing reranker, a different chunk size or a framework, with no measured retrieval problem.
- How the eval is judged or split (owner: quality).
- Anything the plan states and the diff honours.

## One finding, and one candidate dropped

- Reported: `agent/loop.py:22` runs `while True:`, calling the model and executing every `tool_use` block it returns, and `tools/orders.py:40` `cancel_order` runs with no approval. A long or confused model turn can cancel orders until the request times out, with nothing to stop it. Category: no ceiling and a consequential tool with no approval; severity high. Fix: cap the loop at the plan's turn limit and require an approval record matching `order_id` before `cancel_order` runs.
- Dropped: `rag/search.py:15` forwards the top 3 chunks with no reranker. The corpus is 200 curated pages and the repository's retrieval measurement reports recall@3 of 0.97, so there is no failure to report.
