# Quality engineer cases for a test plan

**Outcome of this stage:** every constraint you required at plan has a test that fails if it is not met, and every case you add rejects a wrong implementation the draft would let through.

## Where to start

Your own constraints in the plan's "Expert input" section, then the draft tests and the code they run against. For each draft test, ask which wrong implementation would still pass it. Before adding cases, read `test-craft` in your prompt: each case you specify must be one that can be written to that standard (a literal expected value, a double only at the edge, a named break it would catch).

## Families of cases

Only for what the change touches.

- **Agent and tool behaviour.** For each tool the agent can call: the tool errors, times out, returns nothing, returns malformed or oversized output. Assert that the agent surfaces the failure and does not invent a result. An instruction planted in a tool result or a retrieved document, and a request for a forbidden action: assert the refusal and that the forbidden side effect did not happen.
- **Non-deterministic paths.** A repeat-run case with a stated run count and pass rule, and a statement of which parts are plain code tested without a model.
- **Judge-based checks.** Pairwise comparisons run twice with the order swapped, with a tie when the two disagree. Evidence required before the score. At least one deterministic check per case.
- **Contracts.** The consumer's fixture validates against the contract; the provider's real response validates against it; one path crosses the real boundary; a removed field and a new enum value show what the consumer does.
- **Response shape.** Every field the contract requires is selected by the query or projection, and the mock or sandbox path returns the same shape as the real one.
- **Failure cleanup.** After an error, stale data is cleared, an optimistic update is rolled back, a partial write is compensated.
- **Edge values by input type.** Empty, one, many, exactly the page size and one more, the maximum the schema allows; absent against null against empty string; duplicates, out of order, whitespace only, a newline in a one-line field; non-Latin and right-to-left text, and emoji whose length differs by count. Zero, one, negative, rounding at the smallest money unit, large integer ids kept as strings; time zone changes, month ends and epoch zero, with the clock injected.
- **Concurrency and repetition.** A double submit, two clients, a refresh mid-flow, an expired session, another user's data staying invisible, an idempotent retry of the same request.
- **Algebraic code.** A round trip, an idempotent normaliser or a comparator gets a property case, written with the repository's property library; if it has none, that is a question for the user. Reject a property that restates the implementation.
- **Characterisation.** Where behaviour must not change, the old output is the oracle: the same inputs run against the old and the new code.
- **AWS integration.** State what the emulator cannot show and move it to a real-account smoke test with an exact expected answer and cleanup. Throttling, timeout and partial batch failure: assert that a retry does not repeat the side effect.
- **Resilience.** The dependency is down, slow or throttled: assert the documented degraded response and, after recovery, that the circuit closes.

## One worked case

- name: duplicate submit charges once
- asserts: two identical `POST /payments` requests with the same idempotency key, sent 50 ms apart, produce one charge in the payments fake and the same response body twice.
- why: an implementation that checks the key after charging, or does not store it, passes every single-request test and charges twice here.

## Redundant here

A case the draft already has; one a type or a schema already guarantees; one the core critics cover ("empty, one, many" for a plain function); an end-to-end case for something a unit test shows.
