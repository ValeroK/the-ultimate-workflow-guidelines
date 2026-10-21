# Hard cases: criteria, set before any run

The maintainer asked on 2026-10-21 to measure every expert on very hard cases, not simple ones. This file fixes what "hard" means **before** a corpus is written or any reviewer runs. It is committed with the loader changes and before the first hard corpus, so the order is visible in the history.

## The rule that keeps the measurement honest

A case is hard because of how it is built, never because of how an arm did on it. No case is kept or dropped for being missed or found by the plain reviewer (A0) or the expert (A3): keeping only A0's misses would set A0's recall to zero by construction. A frozen case changes only for a defect in the case itself (its planted defect does not hold, or a benign case is not safe), found by the validity check below, before the first run; after the first run it does not change at all. `thresholds.json` is not touched.

## What a hard case is

Each corpus is `evals/experts/corpus/<expert>-hard.json`: 12 seeded, 8 benign, 8 sibling cases; every third case of each kind is held out.

- **Seeded, `hard: knowledge`** (6): the defect turns on a documented fact a careful generalist may not know: a default, a version change, a recent platform change. The fact is one the maintainer confirmed ([R]) or one read in vendor documentation ([D]) in that expert's research record under `docs/research/`; the version that makes it apply is visible in the diff (a lock file, an image tag, a config line).
- **Seeded, `hard: reasoning`** (6): the defect needs two or more hunks or files joined. No single added line is wrong on its own.
- **Every seeded case** sits among at least two realistic, correct hunks, in a diff of roughly 60 to 200 lines. No comment, name or commit message hints at the defect, and the giveaway words the validator refuses are absent.
- **Benign** (8): a surface twin of a seeded case, with the condition that makes it safe visible in the diff: the version where the rule no longer applies, the guard in another hunk, the setting that turns the risk off. These catch an expert that over-reports.
- **Sibling** (8): the same files and surface as the expert's cases, with a defect an adjacent built expert owns, named in `siblingDomain`.

## Who writes them, and from what

- A general-purpose agent per expert, told not to read `.cursor-plugin/ultimate-workflow/experts/`, `agents/` or any skill, and given only the expert's scope from `evals/experts/eval/domains.json` and its research record. Never the plugin's own expert agents.
- Cases must not reuse a skill's row wording; the corpus-leak test checks verbatim summaries and ids only, so this is a rule for the author.
- New topics: no case repeats a defect already in the expert's first corpus.
- **Validity check**, by a second agent that did not write the cases: each seeded defect holds and is the only defect in the expert's domain; each benign case is safe; each sibling's defect belongs to the named domain. A failing case is fixed or removed before freezing, and the count is recorded.
- After freezing, the author of the skills does not open the hard corpora's `planted` or `summary` fields.

## Running

- Arms: A0 (plain reviewer told the domain) and A3 (the expert with its skills injected by `selectSkills`, as shipped). Neither has the web or a shell: the eval task says so for both, so tools are equal.
- Three runs per case and arm (`runsPerCase`). The dev split first; the held-out split once nothing about the expert will change.
- `score` reports `byHard`: seeded cases found by majority per arm, split into knowledge and reasoning, so a gain from knowing a newer fact is not reported as better reasoning.

## Which experts, when

| Expert | Corpus | Run |
|---|---|---|
| softarch, quality, security, developer | now | dev split now |
| architect, devops | now, from the research records | after their skills are converted (fact-check blocks A and B) |
| genai, frontend, data | after their skills are written | then |

The developer's first held-out split is spent (see `evals/experts/results/README.md`); its hard set gives it a new one.

## Validity results

Counts from the second agent's check, before freezing. The reasons are in general terms so that this file does not leak a case.

| Corpus | Passed as written | Fixed | Replaced | Frozen |
|---|---|---|---|---|
| architect-hard | 23 of 28 | 5: one knowledge and one reasoning seeded case, three siblings; all 8 siblings' `siblingDomain` expanded | none | 2026-10-21 |
| softarch-hard | 23 of 28 | 4: three malformed or misleading noise hunks in reasoning cases; one benign case that was not safe | 1 sibling whose defect was also a contract break; then all 8 siblings' `siblingDomain` expanded from a bare domain name, which also appeared in the diff | 2026-10-21 |
| developer-hard | 20 of 28 | 8: six seeded and two benign cases; all 8 siblings' `siblingDomain` expanded | none | 2026-10-21 |
| quality-hard | 21 of 28 | 7: five seeded, two siblings | none | 2026-10-21 |
| devops-hard | 22 of 28 | 3: two seeded reasoning, one benign | 3: two seeded reasoning, one benign | 2026-10-21 |

Security has no hard corpus: a safety check stopped its author before it wrote any case. Not retried; it waits for the maintainer.

## Second sets (`<expert>-harder`), criteria set 2026-10-21 before any case is written

The maintainer asked for a harder set before the architect and DevOps runs. These criteria come from what the first sets showed, not from any case's result: reasoning cases never separated the arms, and the only misses were facts reviewers saw and then talked themselves out of reporting. The rule that keeps it honest is unchanged: no case is kept or dropped by how an arm did on it.

- **Seeded (12): 8 knowledge, 4 reasoning.**
  - Each knowledge case rests on a fact the maintainer confirmed that is **new or changed in 2025 or 2026**, or that the record marks as different from what was commonly believed (a default, a limit, a product that changed), with the version or setting visible in the diff. The `planted` text names the record and item.
  - In at least half the seeded cases, **the harm lands outside the diff**: an account quota, a later deploy, a consumer or another account the diff does not show. The reviewer must report it from the rule alone.
- **Diffs are longer and noisier:** roughly 120 to 300 lines, at least four hunks, and at least one decoy per seeded case: a line that looks risky and is correct, with the reason visible.
- **Benign (8):** each a twin of a seeded case where the confirmed fact makes it safe (the newer limit allows it, the setting is the documented default that is fine, the version is past the change).
- **Sibling (8):** as before, with the defect owned by another built expert.
- **Who writes them:** a general-purpose agent per expert, with the same reading rules as the first sets, plus the first set's `summary` fields so no defect repeats. A second agent checks validity before freezing.
- **Which:** `architect-harder` from architect items 1 to 74 and the Well-Architected record; `devops-harder` from the DevOps record. Both run when their skills are converted. Security, genai, frontend and data get none yet.

### Second-set validity

| Corpus | Passed as written | Fixed | Replaced | Criterion not met | Harm outside the diff | Frozen |
|---|---|---|---|---|---|---|
| devops-harder | 20 of 28 | 3 (two benign, one sibling) | 2 knowledge | 3 knowledge cases rest on long-standing facts: the DevOps record has too few new ones left | 12 of 12 seeded | 2026-10-21 |

The three cases that miss the "new in 2025-2026" criterion are kept and frozen rather than dropped, because freezing waits for nothing and editing later would follow the skills; their results are reported apart from the other knowledge cases.
