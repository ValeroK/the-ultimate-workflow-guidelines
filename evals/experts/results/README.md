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
