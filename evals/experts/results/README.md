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

Not yet done: A2 (third-party skill as is) and A3 (our expert) arms; the heldout split; other models; judge run twice per batch. (A2, A3 and the held-out split were run later the same day: see below. Other models and a second judge pass were not.)

## 2026-10-20 developer expert v1 versus the plain reviewer (dev split, 3 runs, Sonnet reviewers)

File: `2026-10-20-developer-dev-expert-v1-vs-baseline.json`. `A0` plain reviewer, `A3` the expert (plan and review stages; review reference only was read). The A0 answers are the ones from the baseline run above.

- Seeded defects found by majority: A3 12 of 12, A0 9 of 12. Runs: 36/36 against 27/36.
- False positives on benign look-alikes: A3 1 of 30 runs, A0 4 of 30.
- Real but unplanted findings ("valid-other"): A3 1, A0 11. The expert is more conservative; some of what it drops is real.
- Findings per run: 0.64 against 0.81.
- Lane discipline (a real defect of another domain reported on a sibling case): A3 12 of 24 runs, A0 18 of 24. **This fails the pre-set limit of 10 percent.** Test-quality siblings no longer leak (0, against 10 for A0). What remains is string-built SQL and a swallowing catch, which the expert reports as deviation from the repository's convention and as a swallowed failure. Those are categories of its own checklist that overlap security and reliability.
- Not yet run: the heldout split. It is untouched; running it once is the unbiased figure. (Run later the same day: see below.)
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

## 2026-10-20 generation eval, harness v2 (the one that mirrors the real build prompt)

File: `2026-10-20-gen-developer-dev-harness-v2.json`. Dev split, 9 tasks (5 trap, 4 restraint), 3 runs, Sonnet implementers, nothing run, one judge pass per batch.

| | plain | with the brief |
|---|---|---|
| tasks clean by majority | 7 of 9 | 8 of 9 |
| traps fallen into | 0 of 27 | 0 of 27 |
| over-engineered runs | 0 | 0 |
| correct runs | 22 of 27 | 22 of 27 |
| added lines per run | 21.1 | 20.7 |

The pre-set gate passes (a margin of one task is required, and there is one). **It should not be read as a result.** Reading the judge's reasons for the tasks that differ:

- `gf5af64bd`: plain 1 of 3 clean, brief 2 of 3. The runs differ on whether the size check measured the whole serialised event or only a `body` field. That is a requirements-interpretation point; the brief says nothing about it. One run flipped.
- `gfd97a60e`: plain 3 of 3, brief 2 of 3. The brief arm's one failure used a config key with a different name from the one specified. That is against the brief, and also noise.
- `gd6b2b81a`: 0 of 3 in both arms, because the task's check requires a `cancelled_at` timestamp that the request never mentions. A task-authoring defect; it adds the same noise to both arms.

Every craft measure is identical: no trap fallen into by either arm, nothing over-engineered by either arm. The tasks did not separate the arms on craft, because a Sonnet implementer asked for "the smallest change that works" already avoids every trap here (0 of 27 without the brief). So this run shows no evidence that the brief helps, and no evidence that it hurts: no extra over-engineering, equal correctness, equal size. It is cheap (under 3.5 KB per build). (Note, 2026-10-20, later: builds now also carry pasted skills, about 28 KB fixed per build before any file-matched skill. This run did not measure that.)

Not measured, and the limits of this harness: the brief's rule to run the repository's lint, format and type-check (implementers may not run anything here); other models (Haiku, Opus); larger or longer tasks, where drift over a long session is the real complaint; the held-out split (3 tasks; unrun on purpose, since the dev run did not separate the arms and tuning the tasks against it would spend it). To get a signal: harder tasks authored blind, with the repository's convention far from the code being changed, or a weaker implementer model.

## architect, softarch, quality: dev split, expert v1 against the plain reviewer

Six cases per expert, three runs per case, one judge pass per batch (not repeated, only spot-checked). JSON: `2026-10-20-{architect,softarch,quality}-dev-expert-v1-vs-baseline.json`.

| expert | recall (cases) expert / plain | false-positive runs expert / plain | pre-set gate |
|---|---|---|---|
| architect | 6 of 6 / 6 of 6 | 0 of 12 / 0 of 12 | fail (no margin) |
| softarch | 6 of 6 / 5 of 6 | 0 of 12 / 0 of 12 | pass |
| quality | 6 of 6 / 6 of 6 | 1 of 12 / 0 of 12 | fail (margin, and one false positive) |

**Read this as: no demonstrated gain, except possibly softarch.** The plain Sonnet reviewer already finds every planted defect on the architect and quality corpora, so these cannot show a recall gain; the ceiling is hit. The softarch pass rests on one case (`c3d41fb77`, plain 1 of 3, expert 3 of 3) and is exactly the one-case margin the threshold asks for, so it is weak evidence, not proof. The one quality false-positive run is a single run in twelve; it is not enough to call a pattern. Evidence completeness (informational) is lower for the expert on architect and quality, and the judge's evidence rating is the least reliable label (see the calibration section).

Leak into sibling domains is 75 to 100 percent for the experts and for the plain reviewer alike. With "raise everything found" in force, leak is informational for these experts; it does not measure a defect. That policy for architect, softarch and quality is my assumption extended from the developer decision, and is flagged in `eval/thresholds.json`.

Not done: held-out runs for these three, a repeated judge pass, a corpus hard enough to separate the arms.

## developer: a third-party skill as a comparison arm (dev split)

JSON: `2026-10-20-developer-dev-a2-addyosmani-vs-expert-v2.json`. The upstream skill is `addyosmani/agent-skills`, `skills/code-review-and-quality/SKILL.md` (MIT, about 21 KB), fetched on the day and used only as the A2 reviewer's reading material; it is not stored in this repository. A2 was told to apply it as written but to run nothing and fetch nothing it names, because reviewers here cannot run anything. A0 is the plain reviewer; A3 is the developer expert as it stands after the 2026-10-20 source pass (so this also checks that edit for regressions). 12 seeded, 10 benign and 8 sibling-domain cases, 3 runs each, all arms in one plan and one judge pass (one judge batch skipped a finding, the scorer refused it, and the batch was judged again; the first answer is kept outside the repository).

| | A0 plain | A2 upstream skill | A3 expert |
|---|---|---|---|
| seeded cases found in a majority of runs | 8 of 12 | 10 of 12 | 12 of 12 |
| seeded runs that found the defect | 24 of 36 | 31 of 36 | 36 of 36 |
| false-positive runs on benign cases | 5 of 30 | 3 of 30 | 0 of 30 |
| false-positive runs on sibling cases | 0 of 24 | 3 of 24 | 0 of 24 |
| evidence complete (informational) | 0.83 | 0.84 | 0.95 |

What it says: the upstream skill is a real improvement over a plain reviewer (24 to 31 of 36), so it is not a weak baseline. The expert found every planted defect in every run and raised no false positive on this split. Three cases separate the expert from the upstream skill: it found `c32b04375` and `c83de8112` in one run of three each, and `cb23e0ec9` in two of three; the expert found all three every time.

What it does not say:
- The corpus was written to the narrow craft scope the expert covers (SOLID, simplicity, duplication, error handling, dependencies, speculative generality). The upstream skill also covers security, performance, review process and change sizing, none of which this split rewards. A fair reading is "better on this scope", not "better".
- One split, 3 runs per case, one judge pass, and an expert whose categories were written against the same taxonomy as the corpus. The held-out split has not been run for this comparison. (Run later the same day: see the next section.)
- The expert's two categories added on 2026-10-20 are still not exercised by any case. This run shows they did not cause regressions on the existing cases, nothing more.

## developer: the same three arms on the held-out split

JSON: `2026-10-20-developer-heldout-a2-addyosmani-vs-expert-v2.json`. Same arms, models and procedure as the dev-split comparison above: 6 seeded, 4 benign and 4 sibling cases, 3 runs each, one judge pass with every batch complete. The held-out split had been run once before, for expert v1; nothing in the expert was changed because of that run.

| | A0 plain | A2 upstream skill | A3 expert |
|---|---|---|---|
| seeded cases found in a majority of runs | 4 of 6 | 4 of 6 | 6 of 6 |
| seeded runs that found the defect | 12 of 18 | 12 of 18 | 18 of 18 |
| false-positive runs on benign cases | 2 of 12 | 1 of 12 | 1 of 12 |
| false-positive runs on sibling cases | 0 of 12 | 0 of 12 | 0 of 12 |
| evidence complete (informational) | 0.87 | 0.91 | 0.95 |

Here the upstream skill found exactly what the plain reviewer found. The difference is two cases that neither the plain reviewer nor the upstream skill found in any run, and that the expert found in every run:

- `c42610081`: money travels as a bare number; a price in cents is stored as dollars (100 times too high) and the budget is a magic number with no unit. The expert's "wrong or hidden meaning" category names this.
- `c72516a95`: one method validates, writes to SQL, lays out the HTML email and sends it. The expert's "two reasons to change" category names this; the upstream skill mentions separating orchestration from business logic, but its reviewers did not report it.

Every arm's one benign false positive was on the same case (`c13deb587`): a speculative concern about callers not shown in the diff.

Reading across both splits: the expert's advantage comes from naming specific defect classes that a general reviewer, with or without the upstream skill, walks past. The caveat stays the same: the corpus and the expert's categories come from the same craft definition, so this measures the expert on the defects it was built for. Neither split rewards the upstream skill's security, performance or process coverage.

## A broader corpus: general code review, three arms (dev split)

Corpus `corpus/review.json` (pinned before any run): 36 cases from two blind agents told not to read any checklist, skill or corpus; 20 seeded defects across correctness, edge, concurrency, security, performance, maintainability, resilience and testing (categories in `review-categories.json`), 10 benign, 6 product-and-documentation siblings. This run uses the dev split (14 seeded, 7 benign, 4 sibling); the 11 held-out cases are kept unused (run later the same day: see the last section). Same arms, models and procedure as above; every judge batch complete. JSON: `2026-10-20-review-dev-three-arms.json`.

| | A0 plain | A2 upstream skill | A3 developer expert |
|---|---|---|---|
| seeded cases found in a majority of runs | 11 of 14 | 13 of 14 | 12 of 14 |
| seeded runs that found the defect | 35 of 42 | 38 of 42 | 35 of 42 |
| false-positive runs on benign cases | 0 of 21 | 1 of 21 | 2 of 21 |
| false-positive runs on sibling cases | 1 of 12 | 1 of 12 | 0 of 12 |

Runs that found the defect, by category (3 runs per case):

| category | cases | A0 | A2 | A3 |
|---|---|---|---|---|
| correctness | 3 | 9 | 9 | 9 |
| security | 3 | 9 | 9 | 9 |
| resilience | 2 | 6 | 6 | 6 |
| edge | 1 | 3 | 3 | 3 |
| concurrency | 1 | 3 | 3 | 3 |
| performance | 2 | 4 | 5 | 5 |
| testing | 1 | 1 | 3 | 0 |
| maintainability | 1 | 0 | 0 | 0 |

What it says:
- On general review the upstream skill is the best of the three, by a small margin: it found the test that cannot fail in every run (the plain reviewer once, the expert never), and one more performance run.
- The developer expert gave up nothing on correctness, security, resilience, edges or concurrency: its "raise everything you find" rule held. It lost exactly where its scope says to look away. Its checklist puts tests out of scope, so it walked past a test that passes with or without the fix. In this plugin the quality expert covers tests; used alone, the developer expert would miss them.
- No arm found the maintainability defect (an approval rule kept as a list of tool names in another package, so the next write tool silently skips approval). The expert's categories do not name that shape (a parallel registry that must be edited in step), so this is a gap in its checklist, not only a hard case.
- The expert raised two benign false positives here, the most of the three.

What it does not say:
- The plain reviewer already finds 35 of 42; most of this corpus does not separate the arms. The decisive cases are one test case, one performance case and one maintainability case, so these are small numbers.
- The judge labelled the same claim (a missing import in an excerpted hunk) false-positive in some batches and valid-other in others. That noise touches valid-other and false-positive counts, not recall.
- One split, 3 runs, one judge pass. The held-out split is reserved for checking any change made because of this run. (Run later the same day, with skills injected: see below.)

## The broad corpus, held-out split: developer expert v2 with skills injected in code

JSON: `2026-10-20-review-heldout-three-arms-skills-injected.json`. Corpus `review.json`, held-out split, run once: 6 seeded, 3 benign, 2 sibling cases, 3 runs each. Arms as before: `A0` plain, `A2` the addyosmani `code-review-and-quality` skill, `A3` the developer expert v2. For the first time the A3 prompt carries skill text chosen in code, per case, by the same `selectSkills` the review command uses. Each batch carried the union of its cases' skills, 35 KB; any one case in this split gets at most 25 KB; the cap is 32 KB per expert per stage. Reviewers on Sonnet, judges on Sonnet. In three batches the judge left out one case, so those three were judged again and the incomplete answers were kept aside.

| | A0 plain | A2 upstream skill | A3 expert + skills |
|---|---|---|---|
| seeded cases found in a majority of runs | 6 of 6 | 6 of 6 | 6 of 6 |
| seeded runs that found the defect | 17 of 18 | 18 of 18 | 18 of 18 |
| false-positive runs on benign cases | 1 of 9 | 1 of 9 | 1 of 9 |
| false-positive runs on sibling cases | 2 of 6 | 3 of 6 | 2 of 6 |
| findings per run | 0.88 | 1.03 | 0.91 |
| evidence complete (informational) | 0.90 | 0.79 | 0.87 |

Seeded runs by category: security, concurrency, correctness and edge 3 of 3 in every arm. Maintainability: A0 2, A2 3, A3 3. Testing: 3 of 3 in every arm. On the dev split the expert missed the testing case in all three runs; here it finds it. That may come from v2's "a test that cannot fail" category or from this case being easier. One case cannot tell which.

What it says:
- **The split is saturated.** The plain reviewer finds 17 of 18 runs, so no arm can show a gain. The pre-set "recall beats baseline by a margin of one case" check fails for both A2 and A3 for that reason, not because either did worse.
- **No sign that the extra prompt hurt.** A3 carried about 35 KB of skills and ended level with A2 on recall and false positives, and wrote fewer findings with more complete evidence. That rules out large dilution on this sample. It cannot rule out small dilution.
- **It does not show that the skills help.** The A3 arm has no "expert without skills" twin on this split, and the split leaves no room to show it anyway.
- The sibling-leak check fails in every arm (6 of 6). As before, that is expected of a general reviewer and only informational for this corpus.

What would answer the open question: cases the plain reviewer misses (repository context, a convention two files away), and an expert-without-skills arm on them.

## Not measured

- Skills at the build, tests and plan stages. Only review, on the held-out split above, has been run with skills.
- An expert-without-skills twin on any split.
- Skills in the build brief generation eval: that harness (`eval/lib/gen.js`) does not inject skills, so its results above say nothing about them. The brief itself was inconclusive there.

## 2026-10-20 developer expert v2 (after the Goal and Responsibilities restructure), held-out split

File: `2026-10-20-developer-heldout-expert-v2-vs-baseline.json`. Same split, arms, reviewer model (Sonnet subagents) and judge (session default) as the v1 held-out run; a fresh `A0` was run beside it. The expert had the restructured agent file, review reference and protocol, and the eleven converted skills pasted in.

| | A0 (this run) | A3 v2 | A3 v1 (earlier) |
|---|---|---|---|
| seeded cases found by majority | 4 of 6 | 6 of 6 | 6 of 6 |
| seeded runs found | 12/18 | 16/18 | 18/18 |
| seeded cases found in every run | 4 | 4 | 6 |
| benign false-positive runs | 3/12 | 1/12 | 2/12 |
| real but unplanted findings | 9 | 18 | 10 |
| evidence complete | 0.89 | 0.94 | 0.93 |

- The gate passes (recall margin of one case, false positives no worse, no failed runs).
- **Read it as no clear change from v1, not a gain.** v2 dropped from 18/18 to 16/18 seeded runs: `c42610081` (token budget per tenant) and `c72516a95` (a service that validates, stores, formats and sends) were each found in 2 of 3 runs. Benign false positives fell from 2 to 1 of 12. The fresh A0 matches the earlier A0 on recall and differs by one false-positive run, which shows the run-to-run noise at this size.
- **Contamination, found after the run.** v2's `review.md` used case `c72516a95` as its worked finding (the ledger had suggested it). That leaks a held-out case into the reference, biased in the expert's favour, and it was still found in only 2 of 3 runs. The worked pair was replaced the same day with an example far from every corpus case; the held-out split is no longer clean for the developer, so the next unbiased figure needs new cases.
- Not measured: plan and tests stages; any other expert since the restructure.

## 2026-10-21 softarch on its hard set, dev split

File: `2026-10-21-softarch-hard-dev-expert-vs-baseline.json`. Corpus `softarch-hard` (criteria in `docs/experts/hard-cases-2026-10-21.md`: written blind from the research records, checked by a second agent, frozen before any run). Arms A0 (plain reviewer told the domain) and A3 (softarch with its skills pasted by `selectSkills`); neither had the web. Sonnet subagents review, session-default judges, three runs per case.

| | A0 | A3 |
|---|---|---|
| seeded cases found by majority (of 8) | 6 | 6 |
| knowledge cases (of 4) / reasoning cases (of 4) | 2 / 4 | 2 / 4 |
| seeded runs found | 19/24 | 19/24 |
| benign false-positive runs | 2/18 | 0/18 |
| sibling runs reporting the other domain's defect | 12/18 | 7/18 |
| evidence complete | 0.80 | 0.96 |

- **The gate fails: no recall gain.** Both arms found the same six cases and missed the same two, both knowledge cases. The expert was given the relevant skill on each (`schema-evolution` on one, `protobuf-compat` on the other) and still missed them.
- **What the expert changed is precision:** no benign false positives against two, fewer findings per run (0.43 against 0.73), more complete evidence. The thresholds do not count that as a pass, and this run does not change them.
- **Reasoning cases did not separate the arms:** the plain reviewer found all four. "Needs two files joined" was not hard enough for this domain at this reviewer strength.
- Next: find out whether the two missed facts are in the skills at all (an agent that reads the cases answers yes or no per skill, so the skills' author stays blind). The held-out split stays unrun until then.

## 2026-10-21 developer on its hard set, dev split

File: `2026-10-21-developer-hard-dev-expert-vs-baseline.json`. Same arms, models and procedure as softarch above.

| | A0 | A3 |
|---|---|---|
| seeded cases found by majority (of 8) | 8 | 8 |
| seeded runs found | 24/24 | 24/24 |
| benign false-positive runs | 0/18 | 0/18 |
| sibling runs reporting the other domain's defect | 15/18 | 15/18 |
| findings per run / evidence complete | 0.68 / 1.00 | 0.72 / 0.91 |

- **Ceiling: the set is not hard for this reviewer.** Both arms found every planted case in every run, knowledge and reasoning alike, and neither flagged a safe twin. The gate fails only because there was no room to beat the baseline; this measures nothing about the expert in either direction.
- **No case is dropped or swapped for this,** per the criteria. A harder set would be a new corpus written to stricter criteria and frozen before it runs, not this one edited.
- The held-out split of this set is not worth running for the same reason.

## 2026-10-21 quality on its hard set, dev split

File: `2026-10-21-quality-hard-dev-expert-vs-baseline.json`. Same arms, models and procedure.

| | A0 | A3 |
|---|---|---|
| seeded cases found by majority (of 8) | 8 | 8 |
| seeded runs found | 24/24 | 24/24 |
| benign false-positive runs | 1/18 | 1/18 |
| sibling runs reporting the other domain's defect | 12/18 | 6/18 |
| findings per run / evidence complete | 0.70 / 0.95 | 0.53 / 1.00 |

- **Ceiling again.** Every planted case was found in every run by both arms. The expert's only measurable difference is staying in its lane (half the sibling reports) and fewer findings per run.

## What the three hard runs say together

- **No recall gain for any expert.** softarch 6 of 8 each, developer and quality 8 of 8 each.
- **No false-positive difference beyond noise:** softarch 0/18 against 2/18 (one case, two runs), quality 1/18 each, developer 0/18 each. The developer entry of 2026-10-20 treats a one-run difference as noise at this size; so does this one.
- **Fewer sibling reports is not a gain here.** The maintainer's override (`thresholds.json`) asks role experts to raise everything they find, other domains included, so the lower leak rates of softarch and quality are neutral at best.
- **Two of three sets are at ceiling.** Cases written by a model to "hard" criteria are mostly cases a model of the reviewer's class already catches. The only misses were softarch knowledge cases where reviewers saw the change and talked themselves out of reporting it; reasoning-hard cases never separated the arms.
- **The softarch dev split is now tuned.** The fixes of 2026-10-21 were written from a diagnosis of two dev cases, and the new `event-schema-evolution` row mirrors one of them. A rerun on the dev split is not evidence. The held-out split (about four seeded cases, so the one-case margin is nearly the whole gate) is checked for the same facts before it runs.
- Not measured: security (two authoring attempts stopped by a safety check), architect and devops (wait for their skills), genai, frontend and data (no skills yet).
