# The run reviews once (design note)

Owner choice "C", 2026-11-14. The unattended run stops checking the experts on every card. It builds and commits
every card, then reviews the whole branch once, the same way the by-hand review does.

## Why

A per-card experts check cost about 0.9M tokens per card (11 to 22M for 12 cards). One review of the whole
branch costs about 1.5M. The per-card check also caused most of the stuck cards.

## What a card does now

Pack, write the tests (see them fail), implement (rounds as today), scope, the decisions check, then card-commit.
No recheck, no experts, no refute, no fix round, no record per card.

## The commit check on a run branch

`card-commit` on `uw/run/<feature>` runs the confirmation, full-suite and memory parts. The experts part is
reported as "deferred to the run's review". That is a fourth way a check can end; it is not a refusal. Only
`card-commit` on a run branch may defer. A commit by hand or through the hook is judged as before.

## The one review

After every card is settled: the same code as the by-hand review (recheck, core lenses and experts in parallel,
one verify pass) over BASE..HEAD, with one retry for an agent that returns nothing. One shared function,
`reviewRange`, in `lib/phase-shared.js`, is used by `phases/review.js` and by `phases/run.js`. It is recorded
(record, then ledger).

Confirmed high and medium findings become fix-up cards as today (at most 4). After the fix-up cards, ONE
experts-only check over the fix-up commits. What is still open is written in the report; there is no second
fix round.

## What goes away

The carry-to-a-later-card path, the separate findings card and the per-card fix round. Low findings stay in the
report. Old `run.json` files that hold `pendingFindings` are still read and the field is ignored.

## What the user sees

`run.json` gets `reviewed: { head, at, open }`. `report.md` and the finished notice say "Reviewed by the experts
at <head>: N findings open" or "NOT REVIEWED: <why>" (a parked card, for example). The run never says ready to
merge when it was not reviewed. A resume that settles the cards runs the review then.

## Range reviews

A review of a range A..B is recorded under a fingerprint of that range, not of the working tree, so its
findings never count as open for the working tree. A record of an empty tree reviews nothing and is never open
(this is why the old finding d556b629f4 shows as open today; it is not resolved by hand).
`experts.js check --range A..B` says whether that range was reviewed with nothing high open.

## Tests (written first, each seen failing)

1. A range review recorded on a clean tree is not open for the working tree; the old empty-tree record is not
   open; `check --range` says reviewed with nothing open, reviewed with a high finding open, and not reviewed.
2. `card-commit` on a run branch with no experts evidence is allowed and its check is outcome "deferred"; the
   hook commit on the same tree is still refused for the experts part; `card-commit` off a run branch refuses.
3. `reviewRange` is declared once in the shared file and called by `review.js` and `run.js`; `review.js` keeps
   its results (the existing review tests are the guard); with `retry` an agent that returns nothing is asked
   once more.
4. The run: a card makes no recheck, expert, refute or record call; the review runs after the last card with
   the experts; fix-up cards at most 4; one experts-only check after them; no findings card, no carry.
5. `run.json` records `reviewed`; the report and notice say reviewed or NOT REVIEWED; a parked card means
   NOT REVIEWED and never "ready to merge".

## Stop conditions

The full suite cannot be made green inside this scope, or removing the per-card check breaks a guarantee other
than "experts per card".
