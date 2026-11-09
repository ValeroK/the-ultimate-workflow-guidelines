# Run report: svc

Branch `uw/run/svc` from e79cbed46908. 0 committed, 1 parked, 1 blocked. Review: 0 confirmed. Harvest: 1 proposals on uw/harvest/svc.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| server | the listening number | parked | uw/parked/svc/server | not green: Verification failed 3 times. Stopping. What is wrong: The failure is in the plan, not the code or the test. PLAN-svc.md section "Tests > server: the listening number" says that when the deployment configures a different number "through the environment", listenOn() must return it, but it n |
| banner | a start-up line using the listening number | blocked |  | depends on server, which is parked |

Before this run: greet committed, fixup committed.

## Needs you

- server (parked): not green: Verification failed 3 times. Stopping. What is wrong: The failure is in the plan, not the code or the test. PLAN-svc.md section "Tests > server: the listening number" says that when the deployment configures a different number "through the environment", listenOn() must return it, but it n
  Run: `/ultimate-workflow:feature --resume server`

## Out of scope and claims

- none

## Review

0 confirmed, 0 refuted, 0 unverified (e79cbed46908c3e4bd04ec2065af51c0407ed935..HEAD).

## Harvest

1 proposal(s) on `uw/harvest/svc`, one commit per file: CLAUDE.md (3355191b37ea). Merge it to keep them, or delete it.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
