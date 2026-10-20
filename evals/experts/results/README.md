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
