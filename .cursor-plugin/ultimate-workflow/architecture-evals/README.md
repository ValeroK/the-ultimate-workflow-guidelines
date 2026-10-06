# Architecture skill evals

One `claude plugin eval` suite for the five architecture skills (`system-architect-engineering`,
`greenfield-architecture`, `modularity-and-evolution`, `distributed-systems-resilience`,
`operability`). 42 cases, one `case.yaml` each (prompt under `execution`, graders inline), selected by tag:

| Tag | Cases | Question | Grader | Arms |
|---|---|---|---|---|
| `quality` | 13 | Does loading the skill change the answer? | regex plus an LLM judge | with and without the plugin |
| `trigger` | 18 | Does the right skill load? Held-out prompts, never used to tune descriptions. | `tool_used: Skill` only | one arm (`--ablation none`) |
| `hard` | 11 | Does it catch a planted flaw the user did not mention? | regex, one per flaw | with and without the plugin |

The hard probes carry a pre-registered keep-or-fold rule and its outcome: see `hard-probes.md`.
Measure firing first: a skill that did not load cannot explain an answer, so a score delta means
nothing until it fired.

## Run

From `.cursor-plugin/ultimate-workflow/`. Each run is real model usage; keep a cap.

```
# answer quality, with and without the plugin (about 4 USD)
claude plugin eval . --eval-dir architecture-evals --tag quality --trust-plugin --runs 3 -j 4 \
  --judge-model claude-sonnet-5-5 --max-cost-usd 12 --no-publish --json out.json

# fire rate only, single arm (about 2 to 3 USD)
claude plugin eval . --eval-dir architecture-evals --tag trigger --trust-plugin --ablation none \
  -j 6 --max-cost-usd 4 --no-publish --json out.json

# hard probes (about 3 USD)
claude plugin eval . --eval-dir architecture-evals --tag hard --trust-plugin --runs 3 -j 4 \
  --max-cost-usd 10 --no-publish --json out.json
```

Results land in `<eval-dir>/results/`, which is gitignored. In `out.json`, `cases[].arms.with`
holds the runs; a `trigger` case passes when its single `skill-fired` grader passed.

## Recorded results (2026-10-06)

Fire rate, right skill loaded, 3 runs per prompt:

| Descriptions | Held-out (15 positive) | Tuning set (12 positive) | False positives |
|---|---|---|---|
| First draft | 53% | 58% | none seen |
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

Correction recorded 2026-10-06: an earlier summary reported the first-draft held-out rate as 61%.
That counted the three negative prompts (which pass by not firing) as hits. The correct figure is
53% (24 of 45). Compute rates with the summarize script in the source repository, which excludes
negatives.

The saved result files and that script live in the source repository under evals/results/architecture-skills,
outside the plugin payload on purpose, so they do not ship in the release ZIP and are not present in an installed plugin.

Layout note, 2026-10-06: the suite was first built as four directories of `prompt.md` plus one file
per grader (173 files) and then merged into this one. Prompts and grader fields were carried over
unchanged (checked case by case), so the saved results keep the same case names and stay comparable.
The directory is excluded from the release ZIP; a test fails if a new `*evals` directory is not.
