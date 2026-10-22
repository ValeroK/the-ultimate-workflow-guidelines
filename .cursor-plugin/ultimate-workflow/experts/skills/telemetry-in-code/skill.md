---
name: telemetry-in-code
description: Use when a change sets up or changes logging, metrics or tracing in application code - logger configuration, log levels and fields, correlation ids, OpenTelemetry or X-Ray setup, propagators, span names and attributes, metric registration and labels, CloudWatch EMF or PutMetricData, Lambda log settings - to find telemetry that cannot be queried or correlated, a trace that breaks, a metric whose labels grow without bound, and settings the platform ignores.
verified: 2026-10-22
---

# Telemetry in code

## Goal

- **Lets the expert catch:** logs that cannot be queried or tied to one request, a trace that breaks at a queue or a thread, a span named by its URL, metric labels that grow with users or requests, X-Ray attributes nobody can search, EMF events CloudWatch drops, and log-level settings Lambda ignores.
- **Applies to:** logger setup and structured logging calls, OpenTelemetry and X-Ray SDK setup, propagators and context passing, span creation, metric registration and labels (Prometheus clients, OpenTelemetry meters, PutMetricData, EMF), Lambda logging configuration.
- **Not for:** secrets or personal data in a log, span or metric (security, `personal-data-exposure`); alarms on the signals (architect, `alarms-and-slos`); how a catch is written (`failure-handling`); a trusted client's `X-Amzn-Trace-Id` as an attack (security).

Sources: **[R]** the maintainer's live check of opentelemetry.io (SDK configuration, HTTP semantic conventions, the metrics SDK specification), the X-Ray and CloudWatch guides, aws-otel.github.io, prometheus.io and the Lambda API reference, blocks H and H2 (2026-10-22); **[T]** addyosmani `observability-and-instrumentation`, ollygarden's semantic-convention skills, wshobson's observability skills and the aws `aws-observability` skill (MIT, Apache-2.0), not checked; **[O]** our own reasoning.

## First, establish the target

- **The logger and what it adds on its own** (a correlation id middleware, a JSON formatter, Powertools), and **the tracing stack**: OpenTelemetry, ADOT or the X-Ray SDK.
- **The metrics backend**: Prometheus, OpenTelemetry, CloudWatch (PutMetricData or EMF).

## Logs

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An event has a stable name and structured fields, not a message built by string interpolation [T] | `logger.info(f"order {id} failed for {user}")` on a path the repository queries | The repository's logger turns the arguments into fields |
| Error means an invariant broke; expected outcomes (a wrong password, a 404 the client asked for) are not errors [T] | `logger.error` for a handled, expected outcome | |
| A correlation id is accepted or created at the boundary and carried on every log line, span and outbound call [T]; with several entry points into one log, each line says which one [T] | A new entry point (a consumer, a scheduled job) whose lines carry no correlation id or entry-point field | The logger's middleware adds both |
| Lambda's `ApplicationLogLevel` and `SystemLogLevel` filter logs only with `LogFormat: JSON` [R] | A log level set while `LogFormat` is `Text` or unset | |

## Traces

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Context must be carried across every async boundary, queue message attributes included, or the trace breaks [T] | A message published with no trace context in its attributes; work moved to a thread or executor with no context passed | The hop is outside any traced flow |
| `OTEL_PROPAGATORS` defaults to `tracecontext,baggage` [R]; a service talking to X-Ray-propagated services during a migration needs both formats [O] | A new service with the default propagators beside services that send only `X-Amzn-Trace-Id` | |
| HTTP span names are `{method} {target}` with a low-cardinality target such as the route; instrumentation must not default to the URI path [R] | A span named with a raw path, an id or a query string | |
| X-Ray indexes at most 50 annotations per trace; metadata is not indexed [R]. The ADOT exporter sends span attributes as metadata, since `index_all_attributes` is false by default [R]; listing them in `aws.xray.annotations` makes them annotations [T] | An attribute the team will search on, added with no annotation setting | |
| The X-Ray SDKs and daemon are in maintenance mode from 2026-02-25, security fixes only; new work uses OpenTelemetry or ADOT [R] | New code adopting the X-Ray SDK | Existing code left as is |
| The X-Ray SDK's default sampling records the first request each second and 5 percent of the rest [R] | A low-traffic path whose rare failures must be traced, left at the default | A custom sampling rule covers it |

## Metrics

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A label or dimension takes a small, fixed set of values: never a user id, email, request id or raw path [R] (Prometheus); each dimension combination is a separate CloudWatch metric and cost [T] | A label taken from a user, tenant, request or URL | A set fixed and small by construction (status class, a closed enum) |
| The OpenTelemetry metrics SDK caps a stream at 2,000 series by default; past it, measurements go to one overflow series marked `otel.metric.overflow=true` [R], so per-user labels silently stop being per-user [O] | A per-user or per-request attribute on an OpenTelemetry instrument | |
| Latency is a histogram, not an average [R] (Prometheus) | A gauge or counter of average duration | |
| PutMetricData takes up to 1,000 metrics per request and 30 dimensions per metric [R] | A batch built without a limit | |
| EMF: `_aws` must contain `CloudWatchMetrics` and a numeric `Timestamp`; at most 100 metric definitions per event and 30 keys per dimension set [R] | A hand-built EMF object with no `Timestamp`, or a string one | The AWS EMF library writes it |
| A new call to a dependency gets a duration and an error signal [T] | A new external call with no metric or span | Auto-instrumentation covers that client |

## Not a finding

- A log message wording you would change.
- A bounded label (status code class, a closed enum).
- Telemetry the repository's middleware already adds.
- The X-Ray SDK in code the change does not touch.
