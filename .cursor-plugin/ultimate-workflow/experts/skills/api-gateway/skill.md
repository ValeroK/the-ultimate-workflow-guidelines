# API Gateway

Use this when a change adds or changes an API Gateway REST, HTTP or WebSocket API, its integrations, throttling, usage plans, authorizers or cache.

Each fact carries its source: **[G]** AWS's API Gateway developer guide as last published on GitHub (2023); **[T]** AWS skills from 2026, not yet checked against the current guide. Where they differ, both are given; fetch the current quotas page when a decision turns on the number.

| Rule | What breaks it in a change | When it does not apply |
|---|---|---|
| The integration timeout caps how long the backend can take: REST 50 ms to 29 seconds (not raisable in the 2023 guide [G]; 2026 sources say raisable to 300 seconds on Regional and private APIs [T]); HTTP API at most 30 seconds; WebSocket 29 seconds [G]. A Lambda function keeps running after the client got a 504 [T] | A backend, function timeout or downstream chain longer than the integration timeout; worse, a POST that is not idempotent, so the work finishes, the client sees a failure and retries | Asynchronous integrations to SQS or EventBridge |
| Payload at most 10 MB [G], but a synchronous Lambda integration is limited to 6 MB [G] | A new upload path through Lambda; use presigned S3 URLs | |
| The account throttle (10,000 requests per second with a burst of 5,000, lower in some Regions) is shared by every API in the account and Region [G] | A new high-volume API with no stage or method throttle beside an existing one, so either can starve the other | |
| HTTP APIs have no usage plans or API keys, per-client throttling, WAF, caching, request validation, resource policies or private endpoints; those are REST only [G] | A plan or code that relies on one of these behind an HTTP API (the reverse of choosing HTTP for cost) | |
| Usage plan limits apply per API key [T] | A plan sized as if the limit were shared across keys | HTTP APIs |
| A Lambda authorizer runs, and is billed, for requests it then rejects; its result is cached for 300 seconds by default, at most 3,600 [G] | A public API with an authorizer and no WAF rate rule, so an attack becomes Lambda cost; a permission change expected to take effect at once while results are cached | Private APIs |
| The REST cache defaults to a 300-second TTL, at most 3,600 seconds, and is billed by the hour [G] | A cache added in front of data that must be fresh, or kept on an idle API | |
| Execution logging at INFO writes many log events per request and can cost more than the API [T] | INFO execution logging on a production stage | Non-production stages |
