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
