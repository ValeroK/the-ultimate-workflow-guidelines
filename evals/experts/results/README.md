# Eval results

One file per run: `<date>-<expert>-<split>-<what>.json`. Each holds per-arm counts, the comparison against the named baseline arm, and the thresholds in force. Raw counts only; nothing here is a verdict until a person reads it.

## 2026-10-20 baselines (dev split, 3 runs per case)

Reviewers: fresh subagents on Sonnet, given only the diff and a one-paragraph instruction. Judge: fresh subagents on the session default model, labelling with the quote rule in `eval/lib/run.js`. Arms: `A0` plain reviewer (no domain named); `A1` the same reviewer told the domain (quality only).

What they show:

- `quality`, `architect`: the plain reviewer finds every seeded defect in every run. The corpus cannot show that an expert beats it on recall.
- `softarch`: one seeded case found in 1 of 3 runs. Little room.
- `developer`: the plain reviewer misses seeded cases and raises false positives on benign look-alikes. This is the corpus on which an expert can be shown to help.
- The plain reviewer reports other domains' real defects on most sibling cases. That is not an error for a generalist; it is what the leak metric measures for a candidate expert.

Judge calibration on the gold sets (label agreement): softarch 100%, developer 100% (after a prompt fix), architect 97%, quality 89% (below the 90% bar: two unlabelled items, two borderline calls). Evidence-rating agreement was 61 to 92% and is informational only.

Not yet done: A2 (third-party skill as is) and A3 (our expert) arms; the heldout split; other models; judge run twice per batch.

## 2026-10-20 developer expert v1 versus the plain reviewer (dev split, 3 runs, Sonnet reviewers)

File: `2026-10-20-developer-dev-expert-v1-vs-baseline.json`. `A0` plain reviewer, `A3` the expert (plan and review stages; review reference only was read). The A0 answers are the ones from the baseline run above.

- Seeded defects found by majority: A3 12 of 12, A0 9 of 12. Runs: 36/36 against 27/36.
- False positives on benign look-alikes: A3 1 of 30 runs, A0 4 of 30.
- Real but unplanted findings ("valid-other"): A3 1, A0 11. The expert is more conservative; some of what it drops is real.
- Findings per run: 0.64 against 0.81.
- Lane discipline (a real defect of another domain reported on a sibling case): A3 12 of 24 runs, A0 18 of 24. **This fails the pre-set limit of 10 percent.** Test-quality siblings no longer leak (0, against 10 for A0). What remains is string-built SQL and a swallowing catch, which the expert reports as deviation from the repository's convention and as a swallowed failure. Those are categories of its own checklist that overlap security and reliability.
- Not yet run: the heldout split. It is untouched; running it once is the unbiased figure.
- Nothing has been tuned against these results. Any change to the expert after this point makes the dev numbers a development number, not a test.

## 2026-10-20 developer expert v1, held-out split (run once, expert unchanged since the dev run)

File: `2026-10-20-developer-heldout-expert-v1-vs-baseline.json`. Same arms, model and judge as the dev run. The expert was not changed between the dev run and this one, so this is the unbiased figure for v1.

- Seeded defects found by majority: A3 6 of 6, A0 4 of 6; runs 18/18 against 12/18. Two cases that A0 missed in all three runs are found by A3 in every run.
- Benign false positives: 2 of 12 runs for both. No improvement on this split.
- Real but unplanted findings: A3 10, A0 8. Here the expert raised more, not fewer; on the dev split it raised fewer (1 against 11). Read the two together as noise in a small sample, not a trend.
- Lane discipline is informational for this expert by maintainer decision (it should raise everything it finds): 8 of 12 sibling runs against 12 of 12.
- All gated checks pass. Sample: 6 seeded cases, 3 runs, one reviewer model, judge run once per batch and not hand-checked on this run.

## 2026-10-20 generation eval, harness v1 (superseded, kept)

File: `2026-10-20-gen-developer-dev-harness-v1.json`. Dev split, 9 tasks, 3 runs, Sonnet implementers, no code run. **Plain and brief arms came out identical**: 8 of 9 tasks clean by majority in both, 0 of 27 traps fallen into in both, 0 over-engineered runs, correctness 23 of 27 in both, 23.4 against 23.8 added lines per run. The gate fails because the brief did not make more tasks clean.

Why this run is not the answer: the harness's shared instruction told both arms "Match what the repository already does", which is the brief's most important rule. The real build prompt says only "smallest change that works, nothing beyond the plan". The plain arm was therefore stronger than the arm that ships. Found by reading the two prompts side by side after seeing the null result; the harness was then changed to mirror the real wording and the run repeated (v2). Both runs are kept. Also: task `gd6b2b81a` is 0 of 3 clean in both arms because the task's starting files omit the repository file the change must call, so its correctness check cannot be satisfied; it adds the same noise to both arms.
