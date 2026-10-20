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
