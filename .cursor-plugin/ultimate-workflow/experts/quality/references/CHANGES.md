# What changed from the sources

Kept as ideas: see NOTICE.md in the folder above. Everything is restated.

Reversed or narrowed:
- Persona framing ("you are a senior ...") dropped.
- Coverage percentage by itself, test names, layout and style, and framework or assertion-library preferences: not findings (the "Do not report" list in `review.md`).
- Claims that need a run (whether a test fails first, what a mutation tool would report): asked for in the finding, never reported as established, because the expert cannot run anything.

Added by us (no source): the rule to raise everything found while naming the domain it belongs to; the caps of four constraints and four risks at the plan stage and eight cases at the tests stage; the "Do not report" list in `review.md`.

Dropped: everything that runs a tool, fetches a page, or installs something.

## 2026-10-20: build brief, test-craft, always at the tests stage

- New `build.md`: a standing brief for the agent that writes the tests. It adds no work; the confirmed test plan decides which tests exist.
- New shared skill `test-craft` (always, at build and tests): a test that can fail, the expected value, doubles, determinism, shape. Sources and the choices between them are in its NOTICE.
- The agent file says `always: [tests]`: the quality expert joins every tests stage, whether or not the plan selected it.
- `tests.md` asks that each case be one that can be written to the `test-craft` standard.
- Not measured at build or tests. The dev-split review was measured, with no gain shown: the plain reviewer already finds every seeded defect on that corpus.

## 2026-10-20: the Goal and Responsibilities restructure

- The agent file has a Goal (prevents, done well, not the goal), a Responsibilities table with an owner and a border rule for every area, and two to four judging rules. The shared rules (zero is correct, evidence, confidence, severity, untrusted input, the web) moved to `experts/protocol.md`, which the agent reads first.
- Plan and tests references open with the stage's outcome, define no return fields (the workflow schema holds them), and give one good and one rejected constraint, or one worked case.
- The review reference has a stop rule in its method, a "Not when" on every category, its own high, medium and low, and one worked finding with one dropped candidate. Result, Confidence and Untrusted input sections are gone.
- At least half of the negative selection examples are near misses with their owner named.
- Skills: `test-craft` follows the skill template, every row tagged; new `test-gates` (a run or job that cannot fail) and `eval-integrity` (judges, pass@k and pass^k, held-out data), both from the maintainer's round-2 check. `test-craft` also loads at review for test files.
- "A test that cannot fail" moved here from the developer's checklist. The judge rule no longer claims self-enhancement bias as established (round 2, item 26); calibration carries it.
- Not measured since the restructure.
