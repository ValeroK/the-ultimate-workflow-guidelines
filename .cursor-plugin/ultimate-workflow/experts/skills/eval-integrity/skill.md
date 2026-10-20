---
name: eval-integrity
description: Use when a change adds or changes an evaluation of an LLM or agent - an eval set, a scorer, an LLM judge, a pass@k or repeat-run metric - or a plan decides how such behaviour will be judged.
verified: 2026-10-20
---

# Eval integrity

## Goal

- **Lets the expert catch:** an eval whose number does not mean what it claims: a judge biased by answer order, an uncalibrated judge, pass@k computed from k runs, an agent "reliability" figure from a single run, an eval set the system was tuned on.
- **Applies to:** eval scripts, scorer and judge prompts, eval datasets and their splits, metric code, and plan text that defines how an LLM or agent is judged.
- **Not for:** the prompt or agent design itself (Generative AI engineer, planned); ordinary unit tests (`test-craft`); whether the CI job running the eval can fail (`test-gates`).

Sources: **[R]** the maintainer's live check of the papers (Zheng et al. 2023, arXiv 2306.05685; Wang et al. 2023, 2305.17926; Chen et al. 2021, 2107.03374; Yao et al. 2024, 2406.12045; 2026-10-20); **[O]** our own reasoning. An [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **What the eval claims:** capability (can it ever do this), reliability (does it do it every time), or a regression check against a fixed baseline.
- **How it is scored:** an exact or programmatic check, a pointwise rubric, or a pairwise comparison. The rules differ.
- **Which data it runs on,** and whether any part was used to write or tune the prompt.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Judges

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| LLM judges show position bias, verbosity bias and possibly self-enhancement bias [R]; a pairwise judge is called twice with the order swapped, and a disagreement is a tie [R] | A pairwise judge called once, with the candidates in a fixed order | Pointwise scoring of one answer against a rubric or reference |
| Swapping the candidates can overturn a verdict; balanced position calibration averages both orders [R] | A pairwise template with hard-coded slots and no swap | |
| Whether a judge favours its own model is not established (Zheng et al. could not determine it) [R]; a judge that is also the model under test is an unchecked confound [O] | The same model id as judge and as candidate, with no calibration against labelled cases | A judge calibrated against human labels, with agreement reported |
| A judge is calibrated against labelled cases, with agreement on positives and negatives reported separately; a changed judge prompt or model needs recalibration [O] | A new or edited judge prompt, or a new judge model, with no calibration run | The judge is labelled advisory and blocks nothing |

## Metrics

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| pass@k uses the unbiased estimator over n >= k samples and the count of passing samples c, not "run k times and check any" [R] | `any(passed)` over exactly k runs reported as pass@k | pass@1 as the mean pass rate over n samples (the estimator reduces to c/n) |
| pass^k is the chance that all k independent trials succeed, averaged over tasks; it measures reliability, which pass@k and a single run do not [R] | An agent reliability claim from one run, or from pass@k | A task with an exact verifier where one verified solution suffices |
| A non-deterministic system is judged with a stated run count and pass rule [O] | A single run reported as a pass for an agent or LLM path | |

## Data

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A held-out split is never used to write or tune the prompt [O] | Eval examples copied into the prompt or few-shot set, or the held-out split read while tuning | |
| A run script never writes into the eval set [O] | A scorer or run script that appends outputs or labels to the dataset it reads | |
| An agent eval does not demand one exact tool-call sequence when several are correct [O] | An assertion on the full ordered list of tool calls | The sequence itself is the requirement, such as an approval before a payment |
| A judge sees what decides the result: the tool calls and state changes, not only the final answer [O] | A judge prompt given only the final message for a task whose result is in the tool calls | |

## Not a finding

- A pointwise rubric with no position swap.
- An eval labelled advisory that blocks no merge, with a single run.
- A judge from the same provider as the candidate, when calibration against labels is reported.
