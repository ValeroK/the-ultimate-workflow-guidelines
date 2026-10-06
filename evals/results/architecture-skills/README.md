# Architecture skill eval results

Recorded `claude plugin eval --json` output for the five architecture skills, kept at the repo
root so it is **not** inside the plugin payload and never ships in a release ZIP. The suites
that produced it live in the plugin (`architecture-evals/`, `trigger-evals/`,
`heldout-trigger-evals/`); how to run them is in `architecture-evals/README.md` there.

Compare a new run against these before claiming an improvement:

```
node evals/results/architecture-skills/summarize.js <result.json>
```

| File | What it is |
|---|---|
| `2026-10-06-quality-after-rewrite.json` | **Best quality baseline.** 13 cases, 3 runs per arm, with and without plugin, current descriptions, no prompt suffix. Mean delta +0.09, 13/13 pass. |
| `2026-10-06-quality-before-rewrite-with-suffix.json` | Same cases with the first-draft descriptions **and** a prompt suffix that suppressed skill loading. Not like-for-like with the above; kept as the historical low. |
| `2026-10-06-trigger-heldout-before.json` | Fire rate on 18 held-out prompts (15 positive, 3 negative), first-draft descriptions: 24/45 positive (53%). |
| `2026-10-06-trigger-heldout-after.json` | Same prompts, rewritten descriptions: 45/45 (100%). |
| `2026-10-06-trigger-tuning-before.json` | Fire rate on the 13 tuning prompts, first-draft descriptions: 21/36 (58%). |
| `2026-10-06-trigger-tuning-after.json` | Same prompts, rewritten descriptions: 33/36 (92%). |
| `2026-10-06-quality-hard-probes.json` | 11 hard probes (planted flaw, regex graders), resilience, modularity and operability only. Mean delta -0.03; per skill -0.02, -0.04, -0.04. Pre-registered rule says fold all three. See `architecture-hard-evals/README.md` in the plugin for the rule. |

## Read before comparing

- The held-out set informed no description wording the first time it was run, but it is **spent**
  once you tune against it. Write a fresh held-out set before the next rewrite.
- A quality run only means something for a case where the skill fired. Check the fired column.
- Quality cases are largely saturated: a 1.0 with the skill often equals the baseline.
- 3 runs per cell; a 0.33 delta is a single run.
- Dated 2026-10-06; judge claude-sonnet-5-5, agent on the CLI default model (not pinned). A different model or CLI version
  is a different baseline; record it when you add files here.
- Excluded on purpose: the first-draft suite (noisy small-model grader, suffix), and smoke runs.
