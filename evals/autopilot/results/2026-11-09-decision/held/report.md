# Run report: svc

Branch `uw/run/svc` from 8a2176a57154. 2 committed, 0 parked, 1 blocked. Review: 1 confirmed. Harvest: 0 proposals.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| server | the listening number | needs-decision | uw/parked/svc/server | needs a decision the plan does not state: - env: reads the environment variable PORT in src/server.js - declared: Used the PORT environment variable as the name for the configured number. The plan only says 'through the environment', and the existing test already uses PORT. |
| greet | a greeting | committed | 11c47e1208b2 | 1 round(s) |
| banner | a start-up line using the listening number | blocked |  | depends on server, which is needs-decision |
| fixup | confirmed review findings | committed | bd33c45147ad | 1 round(s) |

## Out of scope and claims

- none

## Review

1 confirmed, 0 refuted, 0 unverified (8a2176a5715409b2aa686b7938350228c3a487c6..HEAD).
- [high] test-coverage: C:/Users/kobiv/Projects/uw-scn-decision/test/greet.test.js:5 The only assertion uses a single input, so an implementation that ignores the argument and returns the literal 'Hello, Ada' would pass.

## Harvest

0 proposals.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
