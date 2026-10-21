# Generative AI engineer cases for a test plan

**Outcome of this stage:** every bound, approval and output check the plan required has a test that fails if it is missing, and the agent and model failure modes the change exposes are each exercised once.

## Where to start

Your own constraints in the plan's "Expert input" section, then the draft tests and the loop, tools and parsing code they run against. You name the case and what it asserts; the oracle and determinism of each case are the quality engineer's.

## Families of cases

Only for what the change touches.

- **Tool failures.** For each tool the agent can call: it errors, times out, returns nothing, returns malformed or oversized output. Assert the agent surfaces the failure and does not invent a result.
- **Bounds reached.** The turn, tool-call or token ceiling is hit; assert the loop stops and returns the planned outcome, not a partial answer presented as complete.
- **Approval bound to arguments.** An approval for one set of arguments followed by a call with different ones; assert the tool does not run.
- **Output that is not what it seems.** A response cut off at the output limit, a refusal, malformed structured output; assert each takes its failure path instead of being parsed as complete.
- **Planted instructions.** An instruction inside a tool result or a retrieved document; assert the forbidden side effect did not happen. Whether the defence is sound is security's.
- **Retrieval that finds nothing.** A query with no relevant document; assert the insufficient-context answer, not an answer from nothing.
- **Deterministic parts without a model.** Routing, prompt assembly and parsing tested with fixed inputs and no model call.

## One worked case

- name: refund needs the approved amount
- asserts: after an approval of `refund(order_id=7, amount=50)`, the model proposes `refund(order_id=7, amount=500)`; the tool is not executed and the loop returns `needs_review`.
- why: an approval checked by order id alone, or by a flag, passes every test where the model repeats the approved call.

## Redundant here

A case the draft already has; a repeat-run count or judge rule (quality's); a case for a tool the change does not touch.
