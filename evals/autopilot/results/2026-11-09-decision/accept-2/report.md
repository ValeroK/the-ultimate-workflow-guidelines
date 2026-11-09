# Run report: svc

Branch `uw/run/svc` from 8a2176a57154. 2 committed, 0 parked, 0 blocked. Review: 1 confirmed. Harvest: 2 proposals.

| Card | Title | Outcome | Commit or branch | Note |
|---|---|---|---|---|
| server | the listening number | committed | 0042c0b16313 | 1 round(s) |
| banner | a start-up line using the listening number | committed | 91151ae8a589 | 1 round(s) and a fix round (fixed) |

Before this run: greet committed, fixup committed.

## Fix rounds

- banner: round 2, fixed (Added a test that sets PORT=3000 and expects 'listening on 3000'. A banner() that hard-coded 8080 would now fail. The code already read listenOn() correctly, so the test passed at once. Targeted and full verify runs both passed (6 tests). The new test runs against the real listenOn(), with no fakes. I did not read the plan or context pack for this fix pass, since the finding and both files were clear from the task text.)
  - quality: test/banner.test.js:17 The only test covers the default port, so banner() could ignore listenOn() and hard-code 8080 and still pass.

## Out of scope and claims

- none

## Review

1 confirmed, 0 refuted, 0 unverified (8a2176a5715409b2aa686b7938350228c3a487c6..HEAD).
- [low] correctness: C:/Users/kobiv/Projects/uw-scn-decision/src/server.js:2 A non-numeric PORT value makes listenOn() return NaN instead of failing or falling back to 8080.

## Harvest

2 proposals; not committed: uw/harvest/svc already exists: merge or delete it before harvesting this feature again.

Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.
