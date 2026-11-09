# Run report: svc

Branch `uw/run/svc` from 6be75383aadf. 4 committed, 0 parked, 0 blocked. Review: 1 confirmed. Harvest: 1 proposals on uw/harvest/svc.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| server | the listening number | committed | 340f785adf5e | 1 round(s); ran again within the plan, the held work on uw/parked/svc/server is superseded (kept for reference, delete it when done) |
| greet | a greeting | committed | 16e1b12eac33 | 1 round(s) |
| banner | a start-up line using the listening number | committed | 0f427b957fec | 1 round(s) |
| fixup | confirmed review findings | committed | 57b9c7cad035 | 1 round(s) |

## Out of scope and claims

- none

## Review

1 confirmed, 0 refuted, 0 unverified (6be75383aadfc501f8c9c9a326687873c865952d..HEAD).
- [medium] test-coverage: C:/Users/kobiv/Projects/uw-scn-rerun/test/banner.test.js:5 The only banner test checks the default-case string 'listening on 8080' and never checks that banner() takes its number from listenOn(), which is the dependency the card title ('a start-up line using the listening number') and the 'depends: server' line name.

## Harvest

1 proposal(s) on `uw/harvest/svc`, one commit per file: progress.md (8c3935b76d5d). Merge it to keep them, or delete it.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
