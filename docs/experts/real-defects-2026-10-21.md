# Real defects: criteria, set before any case is mined

Every written hard set hit the ceiling: cases a model writes are cases a model of the same class can see. This set takes its defects from real projects instead, so that no model chose what is detectable. This file fixes the method **before** a case is mined, and is committed first so the order is visible in the history.

## The rule that keeps the measurement honest

The same as for the hard sets (`hard-cases-2026-10-21.md`): a case is kept or dropped only for a property of the case, never for how an arm did on it. After the first run nothing in the corpus changes.

## Where the cases come from

- **Public repositories only**, cloned read-only through the session's git proxy. The repository, both commit hashes and the fix's link are recorded per case (`provenance`), and never shown to a reviewer.
- **The developer expert first** (`developer-real`): application code in the languages its skills cover (Go, Rust, Java, TypeScript and React, Python). Other experts follow if this one shows a difference.
- **Recent fixes only:** the fix commit is dated 2026-06-01 or later, after the reviewer models' training data, so a reviewer cannot recall the fix. The introducing commit may be older.

## Seeded cases (12)

1. **Find a fix:** a commit whose message or linked issue names a bug, that changes code (not only tests or docs) and that adds or changes a test where the project has tests.
2. **Find what introduced it:** blame the lines the fix removes or changes, in the fix's parent. Keep the case only when one commit introduced those lines and that commit is a focused change of at most about 300 changed lines.
3. **The case diff is that introducing commit**, unchanged. Files with nothing to review (lock files, generated files, snapshots, docs) may be left out; no line of the remaining files is edited.
4. **The summary** is the introducing commit's own message, cut to its first paragraph, with issue numbers and links removed.
5. **`planted`** states the defect as the fix shows it: what goes wrong, on what input, and where in the introducing diff. It is written from the fix diff and its message.
6. **Detectable from the diff:** the validity check (below) confirms a careful reviewer could see the defect from the case diff and summary alone, without code outside it. A case that needs code the diff does not show is dropped, and the count is recorded.
7. **In the expert's domain:** the defect is one the developer expert owns (correctness, error handling, concurrency, resource handling, language and framework rules), not security, performance or test design.

`hard` is recorded as `real` for every seeded case, so `byHard` keeps it apart from the written sets.

## Benign cases (8)

Real commits from the same repositories, of similar size and in the same files or modules as a seeded case, whose changed lines were **not** later touched by a fix: blame in the current head shows them unchanged or changed only by commits that do not name a bug. `whyOk` says what was checked. These catch an expert that over-reports on real code.

## Sibling cases (8)

Real fix-mined defects from the same or similar repositories that another built expert owns (security, quality, softarch, architect, devops), mined the same way, with `siblingDomain` named.

## Who does what

- **A miner agent** finds and writes the cases. It does not read `.cursor-plugin/ultimate-workflow/experts/`, `agents/` or any skill.
- **A validity agent** that did not mine them checks each case: the seeded defect is real and visible from the diff, it is the only developer-domain defect the fix touches, each benign commit is safe as far as the history shows, each sibling belongs to its named domain. Failing cases are dropped or replaced before freezing, and the counts are recorded.
- The usual split: every third case of each kind is held out.

## Running

- Arms A0 (plain reviewer told the domain) and A3 (the developer expert with its skills, as shipped), three runs per case, Sonnet as the reviewer, the usual judge. The dev split first.
- The gate in `thresholds.json` is unchanged. Results go to `evals/experts/results/README.md` under their own heading.

## Known limits

- **Blame is not proof of origin.** A fix can change lines that were correct when written and broke because of a later change elsewhere; the validity check drops such cases.
- **Real defects are uneven.** Some will be trivial and some invisible from any diff; the criteria drop the second kind and keep the first, so this set measures realistic difficulty, not maximum difficulty.
- **Training data:** a reviewer may have seen the introducing commit, but not its fix, given the date rule.
