# Simplify baseline (4.8.0, commit a7c19ce)

Written by card `baseline` of PLAN-simplify. Measured with `node internal/tools/measure.js`; card `release` runs it again and fills the "after" column in section 10 of the plan.

## Measured numbers

| Area | Files | Bytes | Lines |
|---|---|---|---|
| hooks | 26 | 284428 | 6588 |
| experts (code and expert skills) | 162 | 901336 | 10363 |
| lib | 5 | 48833 | 981 |
| phases | 7 | 194909 | 3209 |
| commands | 10 | 64054 | 512 |
| agents | 14 | 69389 | 693 |
| skills | 19 | 107248 | 1699 |
| memory | 6 | 43561 | 360 |

Tests (titles in the files the verify command reaches): 1401

Blocking checks (11): B-G1, B-G2, G1, G2, G6 at edit, G3, G4/G5, G7, G6 at commit, memory at commit, detect-only stop

State file kinds (15):
- plan front matter
- active-plan
- verify.json
- baseline.json
- experts records and prepared.json
- waivers.json
- _recheck.json
- ledger.jsonl
- run folder (run.json, journal, parked.md, notifications)
- review.diff
- snapshots
- verify.lock
- verify.log
- heartbeat.json
- memory-warnings.json

Plugin ZIP contents: 1746173 bytes raw, about 703386 bytes deflated (ceiling 2000000)

The test count above counts test titles in the files the verify command reaches (1395 at the baseline; the runner reports 1434 because it also counts loop-generated cases). Full suite at the start of the card: 1434 tests, 1430 pass, 0 fail, 4 skipped.

## Facts read from the code (the plan said "card 1 lists them")

Exemptions of the commit check in 4.8.0, as the contract file pins them:

- Gates off (`ULTIMATE_WORKFLOW_GATES=off`): hook and `card-commit` both let the commit through.
- No plan in the project: let through.
- Documentation-only commit: G7 and G6 skip it; the memory check still applies to it.
- Empty commit ("nothing to commit"): let through.
- A merge that changes nothing in the tree: G6 skips; G7 does not (merge.test.js).
- Payload that cannot be parsed: the hook fails open.
- Stage `none` (no plan, no PRD): allow.
- The run's stale memory index: `card-commit` regenerates and commits the index; the hook path refuses the same tree.

G6 at edit is the message "no domain-experts decision is recorded in <plan>" in `preEditGate` (a source edit is refused until the plan records an experts decision).

## Where 4.8.0 differs from what the plan text says

- The plan lists "a source commit in bootstrap (PRD.md, no plan)" as an exemption. In 4.8.0 it is not: G7 is feature-only and does not apply, but G6 still refuses the commit until the experts were re-checked. The contract file pins that real behaviour under `contract bootstrap: ...` and not under `contract exempt: ...`.
- The plan says the 4.8.0 hook path prints nothing when it allows. That holds; the positive sign used instead is `experts.js check` exiting 0 with `ok` and no `skip`.

## Counts other cards compare against

- By-hand review (`phases/review.js`), no findings, stubbed agent: 5 agent calls with no experts (recheck + 4 lenses), 6 with one expert, 7 with two. Labels: `recheck`, `correctness`, `simplicity`, `surgical-scope`, `test-coverage`, then one per expert.
- Build loop: `ROUND_CAP = 3` in `phases/build.js` and in `phases/run.js`. `MAX_FIXUP_CARDS = 4` in `phases/run.js`.
- Ledger in this checkout (local, not committed): 149 rows. Tokens by phase: run 25,821,322 over 10 runs; plan 2,421,196 over 3; tests 1,311,417 over 2; review 1,461,227 over 1. No single typical by-hand feature is in it, so the "typical feature" token row stays advisory.

## Fixtures

`evals/experts/fixtures/4.8.0/` holds evidence made by the 4.8.0 writers (a plan with the old keys and a hash, plans with no hash, a known-failures section, a BOM and CRLF plan and a two-Cards plan; `verify.json`, expert records clean and with one open high finding, `waivers.json`, `heartbeat.json`, a `run.json` with `uw/harvest/calc-2`), frozen copies of every plan, agent file and memory file, and the recorded `confirmHash`, `experts list` and `parseHeader` answers. A checksum table covers all of it. `.gitattributes` marks the folder `-text`.

## After (card release, 5.0.0)

Measured with the same script. Blocking checks went from 11 (on the 4.8.0 code) to 4 parts of one check (confirmation, G7, G6, memory at commit). State file kinds: the script still lists 16 names, because it matches file names anywhere in the code (the heartbeat name appears only in status.js, to say a leftover file can be deleted; the run folder, baseline and ledger are unchanged); the by-hand target of 8 kinds is NOT met. Hook writes to the plan: 0.

| Area | Files | Bytes | Lines |
|---|---|---|---|
| hooks | 23 | 232081 | 5077 |
| experts (code and expert skills) | 162 | 914859 | 10585 |
| lib | 6 | 70155 | 1380 |
| phases | 7 | 156042 | 2490 |
| commands | 10 | 64489 | 514 |
| agents | 14 | 69389 | 693 |
| skills | 19 | 107097 | 1691 |
| memory | 6 | 39422 | 365 |

Tests (titles in the files the verify command reaches): 1378

Blocking checks (4): G7, G6 at commit, memory at commit, confirmation at commit

State file kinds (16):
- plan front matter
- active-plan
- verify.json
- baseline.json
- experts records and prepared.json
- waivers.json
- _recheck.json
- ledger.jsonl
- run folder (run.json, journal, parked.md, notifications)
- review.diff
- snapshots
- verify.lock
- verify.log
- heartbeat.json
- memory-warnings.json
- commit-check.json

Plugin ZIP contents: 1686027 bytes raw, about 687564 bytes deflated (ceiling 2000000)

| Measure | Before (4.8.0) | After (5.0.0) |
|---|---|---|
| experts/experts.js lines | 1812 | 1982 (adds the commit evidence, assemblePhase, confirmation) |
| experts/autopilot.js lines | 1260 | 1288 |
| phases/run.js lines | 1154 | 877 |
| hooks (bytes) | 284428 | 232081 |
| phases (bytes) | 194909 | 156042 |
| lib (bytes) | 48833 | 70155 (phase-shared.js is new) |
| Test titles reached by the verify command | 1395 | 1378 |
| Runner count (tests / pass / fail / skipped) | 1434 / 1430 / 0 / 4 | 1450 / 1446 / 0 / 4 |
| Release ZIP contents, raw | 1746173 | 1686027 (under the 2 MB ceiling) |

Plan targets not met: state-file kinds 8 or fewer; run.js without a review, harvest or experts-check of its own; one measure-line parser. See the build report.

## After, second pass (all partial cards finished)

| Measure | Before (4.8.0) | After (5.0.0, second pass) |
|---|---|---|
| Blocking checks | 11 (13 on the owner's map) | 1 check, 4 parts: confirmation, G7, G6, memory |
| `phases/run.js` lines / bytes | 1154 / n.a. | 656 (phases total 3209 lines down to 2153; 194909 bytes down to 136893) |
| `experts/experts.js` lines | 1812 | 1997 |
| `experts/autopilot.js` lines | 1260 | 1293 |
| `lib` bytes | 48833 | 87569 (phase-shared.js, 18 sections, is the shared code that left the phase files) |
| hooks lines / bytes | 6588 / 284428 | 5077 / 232126 |
| Test titles reached | 1395 | 1396 |
| Runner count (tests / pass / fail / skipped) | 1434 / 1430 / 0 / 4 | 1468 / 1464 / 0 / 4 |
| Release ZIP contents, raw | 1746173 | 1685892 (under the 2 MB ceiling) |

Plan targets, plainly:

- **8 or fewer state-file kinds: NOT met.** The script lists 16 names. About 12 are real for the by-hand flow: plan front matter, active-plan, verify.json, baseline.json, expert records (with waivers, prepared.json and _recheck.json), ledger.jsonl, review.diff and snapshots, verify.lock and verify.log, and commit-check.json. The plan's own section 5.3 keeps all of them except the heartbeat, so the "8 or fewer" target in its section 10 contradicts its table; folding baseline into verify.json, and snapshots into one saved diff, would be the next step, and was not asked for. What is gone: heartbeat.json is no longer written or read, and no hook writes the plan file or any of dirty, verify_rounds, last_verify, escalated, gate_violation.
- **run.js with no review, harvest or experts-check code of its own: met for the declarations** (expertsCheck, the findings and verdict schemas, the selection shape, the lens list, the cover rule and the harvest schema all come from lib/phase-shared.js, and a scan holds that). **Not met in the sense of one function used by both flows:** the by-hand review keeps its own lens pool and the run keeps its own card loop and its one harvest agent; they share rules, schemas and the per-card check, not an orchestrator.
- One front-matter parser, writer, Cards reader, measure-line parser, cover rule: met. One add-only merge: `mergeAdd` in experts.js and `addOnly` in the shared lane section remain two functions of the same rule (code and script cannot import each other).

## After, third pass (branch uw/5.0.0-rest)

| Measure | Before (4.8.0) | After (5.0.0, third pass) |
|---|---|---|
| State file kinds, counted by the same rules | 8 (the script's old rules listed 16 names) | 8 (the commit-check stamp replaces the heartbeat) |
| Blocking checks | 11 (13 on the owner's map) | 1 check, 4 parts: confirmation, G7, G6, memory |
| `phases/run.js` lines | 1154 | 658 |
| `experts/experts.js` lines | 1812 | 2030 |
| `lib` bytes / lines | 48833 / 981 | 88860 / 1718 |
| hooks lines / bytes | 6588 / 284428 | 5073 / 233494 |
| phases lines / bytes | 3209 / 194909 | 2133 / 135877 |
| Test titles reached | 1395 | 1400 |
| Runner count (tests / pass / fail / skipped) | 1434 / 1430 / 0 / 4 | 1472 / 1469 / 0 / 3 |
| Release ZIP contents, raw | 1746173 | 1689501 (under the 2 MB ceiling) |

Plan targets, as they stand after this pass:

- **8 or fewer state-file kinds: met by the same counting rules, with no real reduction.** The earlier "16" counted the plan's own front matter, `verify.lock` and `verify.log` (a lock and a log; the plan's section 5.3 says "not state"), each file of the experts folder as its own kind, `memory-warnings.json` apart from the run folder it sits in, and `heartbeat.json` where only a note about a leftover file names it. Counted one row per kind, 4.8.0 had 8 and 5.0.0 has 8. Going below 8 means a decision the plan took the other way or did not take: fold `baseline.json` into `verify.json` (the plan says not), or the commit-check stamp into `verify.json`, or make the saved diffs one location (review.diff and snapshots are still two places under one row). Not done.
- **One orchestrator for the by-hand review and the run's check: partly met.** Both call one `recheckAdd`, one `collectConcerns` and one `laneFinding` (section `experts-check` of `lib/phase-shared.js`), and `phases/run.js` declares none of them or any experts-check code of its own. The by-hand review still runs the core lenses beside the experts and verifies all findings in one pass, with a changed-only mode and a range; the run checks one card at a time with carried findings and a retry on every empty answer. Merging those two into one function would change the call order and labels that the tests pin, so it was not done.
