# Recorded eval runs

`fat.json` -- 8 trajectories captured with `CLAUDE.md` at 240 lines / 2769 words.
`thin.json` -- the same 8 after the restructure, `CLAUDE.md` at 49 lines / 507 words.

Score them with `evals/lib/score.js` against `evals/expectations.js`.

## What the comparison does NOT show

Scoring both gives **fat 4/8, thin 8/8, no regressions**. That number is not
evidence that the restructure improved anything, and it must not be quoted as
if it were. Two defects in the comparison, both recorded here rather than
discovered later:

1. **Three of the four fat failures are missing files, not failed retrieval.**
   `memory/hooks-and-gates.md` and the other topicals were created in commit
   `157d243` -- the same commit that thinned `CLAUDE.md`. Under the fat config
   they did not exist. C5's fat FAIL therefore reads "the file was not there",
   which is not the thing C5 was written to measure. The fat run predates the
   thing it is being compared against.

2. **The expectations were authored after the thin run was visible.** Only
   C5's `mustRead` was specified in advance, in the plan. The `mustMention`
   checks were written with the thin trajectories in hand, which biases
   directly toward thin passing. Writing pass conditions after seeing one
   arm's output is the eval equivalent of fitting the test to the code.

## What it does support

`thin.json` is a usable **baseline going forward**: expectations are now fixed,
so a later change that loses a fixture is a real signal. That is the value
here, and it is smaller than the headline number suggests.

The honest read of the restructure is the plan's own: *no detected regression
on C2, C3, C4, C7*, one run per cell, and nothing stronger. The four fixtures
that changed verdict changed for reasons the comparison cannot separate from
the restructure itself.

Re-capturing a fair fat arm would mean checking out the pre-restructure tree
with the topicals present, which is not a state that ever existed. The cost of
manufacturing it exceeded what the answer was worth, so it was not done -- a
choice, recorded, not an oversight.

## Re-running

```bash
node --test "evals/**/*.test.js"
```

The fixtures themselves run as a Claude Code workflow:
`evals/context-boundary.js`, with `args: {"config": "thin"}`.
