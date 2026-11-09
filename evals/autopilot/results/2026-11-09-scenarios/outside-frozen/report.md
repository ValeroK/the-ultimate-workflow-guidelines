# Run report: cart

Branch `uw/run/cart` from 2f96f212da99. 0 committed, 1 parked, 0 blocked. Review: no card was committed, so there is nothing to review. Harvest: nothing was committed.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| cart | total the prices of a list of items | parked | uw/parked/cart/cart | blocking findings from the experts check, outside this card's paths so no fix round: - quality: src/prices.js:4 The plan's blocking requirement is not met in the called file: price() catches its own 'unknown item' error and returns 0, so a path in a file cart calls turns an unknown item into 0. - de |

## Out of scope and claims

- none

## Review

Not run: no card was committed, so there is nothing to review.

## Harvest

Not run: nothing was committed.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
