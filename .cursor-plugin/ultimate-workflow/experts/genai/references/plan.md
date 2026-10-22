# Generative AI engineer input to a plan

**Outcome of this stage:** the plan says which model it pins, what bounds every loop and call, which tools change state and how they are approved, how output is checked, and how retrieval answers when it finds nothing, so the build is held to it and the review can check the code against it.

## Questions

Read the draft, then the code it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **The model and its pin.** Which model id, pinned how, and what happens when it is retired or a parameter the code uses stops being accepted.
- **Bounds.** For every loop: the maximum turns, tool calls, tokens per call and per run, and wall-clock time, and what the user sees when one is hit. An unbounded setting is a question for the user, not a default to invent.
- **Tools.** Each tool's contract (what it does, when to use it, what it returns), which tools change state, and which need a human approval tied to the exact arguments.
- **Structured output.** How output is constrained (a schema, strict tool input) and validated, and what happens on a parse failure or a response cut off at the token limit.
- **Retrieval.** The embedding model and dimension, the plan for re-embedding when it changes, what the system answers when nothing relevant is found, and how citations are tied to retrieved text.
- **Budgets.** Tokens per run, the caching plan for a stable prefix, and who is told when the budget is hit. A spend cap across tenants is the architect's.
- **Residency.** Which Region or inference profile, stated as a data-residency decision.
- **Prompts as artifacts.** Prompts versioned and reviewed like code, not assembled inline from fragments.
- **What to measure.** For each behaviour the plan depends on, what will show it works: task success, retrieval recall. How that measurement is built and judged is the quality engineer's.

## When the plan makes a one-way choice

For a model provider, an embedding model over a large corpus, or an agent framework, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "The `refund` tool runs only with an approval record whose `order_id` and `amount` equal the call's arguments, and the loop stops after 8 turns and returns `needs_review`." It names the tool, the check, the bound and the outcome, and someone else can verify each in the diff.
- Rejected: "Use a better model," or "add a reranker," with no measured failure. Neither names what is wrong now.

## In this domain

- **constraints** name the call, loop, tool, index or setting they bind.
- **questions** are the user's decisions: an unbounded loop, an action with no approval, a provider or Region for residency.
- Do not ask for multi-agent designs, a framework, or prompt rewording the change does not need.
