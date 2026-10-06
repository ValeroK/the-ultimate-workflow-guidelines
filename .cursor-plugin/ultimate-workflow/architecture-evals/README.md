# Architecture skill evals

Three `claude plugin eval` suites for the five architecture skills
(`system-architect-engineering`, `greenfield-architecture`, `modularity-and-evolution`,
`distributed-systems-resilience`, `operability`). They live in sibling directories because
`--eval-dir` takes one directory per run.

| Directory | Question it answers | Grader |
|---|---|---|
| `architecture-evals/` (this one) | Does loading the skill change the answer? | regex plus an LLM judge, with/without ablation |
| `../trigger-evals/` | Does the right skill load? Tuning set. | `tool_used: Skill` only |
| `../heldout-trigger-evals/` | Same, on prompts never used to tune descriptions. | `tool_used: Skill` only |

Measure firing first. A skill that did not load cannot explain an answer, so a score delta
means nothing until the skill fired.

## Run

From `.cursor-plugin/ultimate-workflow/`. Each run is real model usage; keep a cap.

```
# answer quality, with and without the plugin (about 4 USD)
claude plugin eval . --eval-dir architecture-evals --trust-plugin --runs 3 -j 4 \
  --judge-model claude-sonnet-5-5 --max-cost-usd 12 --no-publish --json out.json

# fire rate only (about 2 to 3 USD each)
claude plugin eval . --eval-dir heldout-trigger-evals --trust-plugin --ablation none \
  -j 6 --max-cost-usd 4 --no-publish --json out.json
```

Results land in `<eval-dir>/results/`, which is gitignored. In `out.json`, `cases[].arms.with`
holds the runs; a trigger case passes when its single `skill-fired` grader passed.

## Recorded results (2026-10-06)

Fire rate, right skill loaded, 3 runs per prompt:

| Descriptions | Held-out (15 positive) | Tuning set (12 positive) | False positives |
|---|---|---|---|
| First draft | 61% | 58% | none seen |
| Rewritten (current) | 100% | 92% | none seen (3 and 1 negatives) |

The first-draft quality suite also carried a prompt suffix ("answer from this description
alone") that cut firing to about 39%. Do not add one.

Answer quality, current descriptions, 13 cases, 3 runs per arm, Sonnet judge:
all 13 pass with the skills; mean delta over the no-skill baseline **+0.09**.
Clear gains: greenfield-pushback +0.50, greenfield-shape +0.33, operability-golive +0.33.
All other cases score 1.0 in both arms.

## Limits, so the numbers are not over-read

- **Saturated.** The baseline model already passes most probes, so a 1.0 with the skill
  shows firing, not improvement. Add probes a baseline model fails before claiming gains.
- **Small n.** 3 runs per cell: a 0.33 delta is one run.
- **Tuned.** The tuning set informed the description rewrite, and the held-out set is spent
  once used for tuning. Write a fresh held-out set before the next rewrite.
- **Thin negatives.** Only easy negatives. Near-miss negatives ("write a SQL query") are untested.
- **Known miss.** `modularity-schema-rename` ("just give me the migration") does not fire.
- **Artificial setup.** The agent has only the `Skill` tool and an empty working directory.
- **Claims unverified.** The skills' architecture content was written from recall; primary
  sources were unreachable from the authoring environment.
