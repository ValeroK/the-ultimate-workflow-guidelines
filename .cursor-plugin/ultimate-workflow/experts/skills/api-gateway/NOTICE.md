# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| Amazon API Gateway developer guide, as AWS last published it in the awsdocs GitHub repository (2023 snapshot): `limits.md`, `http-api-vs-rest.md`, `api-gateway-caching.md`, the Lambda authorizer pages, the WebSocket integration page | AWS documentation | Every fact marked [G]: integration timeouts by API type, payload size, the account throttle, what HTTP APIs lack, authorizer and cache TTLs, cache billing |
| awslabs/agent-plugins, `api-gateway` skill and its `pitfalls`, `service-limits` and `performance-scaling` references (2026) | Apache-2.0 | The selection of what matters, the raisable REST timeout, functions running on after a 504, usage plans per key, logging cost; marked [T] |

Checked on 2026-10-20; docs.aws.amazon.com was not reachable from the build session. The REST integration timeout differs between the 2023 guide (not raisable) and the 2026 source (raisable to 300 seconds); both are shown.
