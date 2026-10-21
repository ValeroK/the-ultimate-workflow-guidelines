---
name: api-gateway
description: Use when a change adds or changes an API behind API Gateway (a REST, HTTP or WebSocket API, its integrations, throttling, usage plans, authorizers or cache) - timeouts, payload and message limits, throttling, and what HTTP APIs lack.
verified: 2026-10-21
requires: Amazon API Gateway REST (v1), HTTP and WebSocket (v2) APIs; integration timeout quotas and WebSocket limits as of 2026
---

# API Gateway

## Goal

- **Lets the expert catch:** a backend that outlives the gateway's timeout, a payload, message or connection beyond the limit for its API type, throttles or usage-plan quotas treated as hard caps, an HTTP API relied on for a feature only REST has, and authorizer or cache settings that cost money or keep stale answers.
- **Applies to:** `AWS::ApiGateway::*`, `AWS::ApiGatewayV2::*`, `AWS::Serverless::Api`, `AWS::Serverless::HttpApi`, `aws_api_gateway_*`, `aws_apigatewayv2_*`, CDK `aws-apigateway` and `aws-apigatewayv2`, and settings such as `TimeoutInMillis`, throttling limits, usage plans, authorizer TTLs and stage cache.
- **Not for:** authorizer logic, cache keys and client identity, resource-policy conditions and WAF rules (security); redeploying a REST API after a change (`cloudformation-and-cdk`); canary deployments (devops, `release-safety`); execution-log truncation and tracing (observability); a CDN in front of the API (`caching-and-latency`); choosing HTTP over REST for cost (`aws-well-architected`, `COST05-BP05`); a function's own concurrency (`lambda-event-sources`).

Sources: **[D]** the Amazon API Gateway developer guide as published in the awsdocs repository (2023 snapshot); **[R]** the maintainer's live check of docs.aws.amazon.com (2026-10-20 and 2026-10-21); **[T]** a third-party answer or skill, not checked; **[O]** our own reasoning. A [D] value may be out of date where an [R] row gives a newer one; a [T] or [O] item is a prompt to check the current page, not a finding on its own.

## First, establish the target

- **The API type:** REST (`AWS::ApiGateway::RestApi`, `aws_api_gateway_rest_api`), HTTP or WebSocket (`AWS::ApiGatewayV2::Api` with `ProtocolType`).
- **The endpoint type** of a REST API: edge-optimized, Regional or private (`EndpointConfiguration`). If the change does not set it, say which you assumed.
- **The integration:** a Lambda proxy, an HTTP backend, or a direct service integration (SQS, EventBridge, Step Functions), and the backend's own timeout.
- **What lives outside the repository:** quota increases, account-level throttles, WAF associations. Say what you could not see.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Timeouts and sizes

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The integration timeout caps how long the backend can take: REST 50 ms to 29 s, HTTP API at most 30 s, WebSocket 29 s [D]. A REST timeout above 29 s needs a Regional or private REST API and a raised quota; edge-optimized REST APIs and HTTP APIs cannot have one [R]. A Lambda function keeps running after the client got the 504 [T] | A backend, function timeout or downstream chain longer than the integration timeout; a `TimeoutInMillis` above 29,000 on an edge-optimized REST API or an HTTP API, or on a Regional one with no word on the quota increase | A direct integration to SQS or EventBridge that returns once the message is accepted [O] |
| A request payload is at most 10 MB [D]; a synchronous Lambda invocation is at most 6 MB [R], so a Lambda integration is the smaller limit [O]. A compressed request is decompressed before the mapping template and the integration [R], so the limit applies to the decompressed body [O] | A new upload path through Lambda, or a size check on the compressed request in front of a Lambda integration | Uploads that go straight to S3 by presigned URL [O] |
| A WebSocket message is at most 128 KB, sent in frames of at most 32 KB; a connection lasts at most 2 hours and is closed after 10 minutes idle [R] | A client or server that sends larger messages, or a design that holds a connection past 2 hours or across quiet periods with no reconnect or keep-alive | |
| `/ping` and `/sping` are reserved at the root of a custom domain [R] | A new route `/ping` or `/sping` on an API mapped to the root of a custom domain | The API's default `execute-api` endpoint, or a non-root base path [O] |

## Throttling and usage plans

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The account throttle (10,000 requests per second with a 5,000 burst [D]; 2,500 with a 1,250 burst in opt-in Regions [R]) is shared by every REST, HTTP and WebSocket API in the account and Region [D] | A new high-volume API with no stage or method throttle beside an existing one, so either can starve the other; capacity planned at 10,000 in an opt-in Region | |
| Throttles and usage-plan quotas are best-effort, not hard limits [R] | A usage-plan quota used as a hard billing cap, or a backend that fails above an exact rate protected by a throttle alone | A backend with headroom above the throttle [O] |
| An API key can be in only one usage plan per stage [R] | The same key attached (`UsagePlanKey`, `aws_api_gateway_usage_plan_key`) to two plans that both cover one stage | Plans covering different stages |

## What HTTP APIs lack

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| HTTP APIs have no usage plans or API keys, per-client throttling, WAF, caching, request validation, resource policies or private endpoints; those are REST only [D]. HTTP APIs do not stream responses; REST APIs can [R] | A plan or code that relies on one of these behind an HTTP API, including a streaming Lambda response (`InvokeWithResponseStream`) behind one; a REST API moved to HTTP for cost while still using one | |

## Authorizers and the cache

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A Lambda authorizer runs, and is billed, for the requests it rejects [T]; its result is cached for 300 seconds by default, at most 3,600 [D], so a revoked permission keeps working until the cached result expires [O] | A public API with a Lambda authorizer and no WAF rate rule, so an attack becomes Lambda cost; a long `AuthorizerResultTtlInSeconds` where revocation must take effect at once | Private APIs; a TTL of 0 |
| The REST cache defaults to a 300-second TTL, at most 3,600 [D]; it holds responses up to 1 MB and caches only GET by default [R]; it is billed by the hour [D], and a cache hit is still billed as an API request [R] | A cache added in front of data that must be fresh; a cache expected to absorb POST or responses above 1 MB; a cache justified as cutting request cost; a cache left on an idle stage | |

## Not a finding

- An HTTP API with none of the REST-only features in use.
- A REST API with the default 29-second timeout in front of a backend that answers well within it.
- An API with no cache, where nothing says reads must be cheaper or faster.
- A Lambda authorizer on a private API, or behind a WAF rate rule.
