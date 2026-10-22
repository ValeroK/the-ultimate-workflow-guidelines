# Fact-check replies, 2026-10-22

Two replies to the prompts in `fact-check-prompts-open-2026-10-21/`, pasted back by the maintainer. Facts are restated, not copied; each row names the page the reply cited.

| Block | Reply | Returned | Usable as |
|---|---|---|---|
| H. Observability | Full pages: exact URLs, no snippet note | 14 of 25 | [R] once the quotes are spot-checked (OpenTelemetry quotes checked against their repositories) |
| F. Data | Snippet only: the chat said it had `google:search` and no page reader, and marked every claim | 25 items, 8 extras, 10 added | still snippet only; a second, independent snippet reading |

## H. Observability (14 of 25)

| # | Verdict | Fact as returned | Page |
|---|---|---|---|
| 1 | Confirmed in part | `TreatMissingData` values are `breaching`, `notBreaching`, `ignore`, `missing`. The default `missing` is not in the quote. | CloudFormation `AWS::CloudWatch::Alarm` reference |
| 4 | Confirmed | Alarm periods: 10, 20, 30 and any multiple of 60 seconds. | `API_PutMetricAlarm` |
| 8 | Confirmed | Retention: under 60 s for 3 hours, 1 minute for 15 days, 5 minutes for 63 days, 1 hour for 15 months. | CloudWatch FAQ |
| 9 | Confirmed | PutMetricData: up to 1,000 metrics per request, up to 30 dimensions per metric. | `API_PutMetricData` |
| 10 | Confirmed in part | EMF: at most 100 metric definitions per log event and 30 keys per dimension set. `Timestamp` required in `_aws` is not in the quote. | EMF specification |
| 12 | Confirmed | X-Ray indexes up to 50 annotations per trace; metadata is not indexed. | X-Ray concepts |
| 14 | Confirmed | X-Ray SDKs and daemon in maintenance mode from 2026-02-25 (security fixes only); move to OpenTelemetry or ADOT. | X-Ray SDK and daemon timeline |
| 15 | Confirmed | ADOT X-Ray exporter: `index_all_attributes` false by default; attributes go to metadata. | aws-otel.github.io, X-Ray getting started |
| 16 | Confirmed | `OTEL_PROPAGATORS` defaults to `tracecontext,baggage`. | opentelemetry.io SDK configuration |
| 17 | Confirmed | HTTP span names SHOULD be `{method} {target}` with a low-cardinality target; instrumentation MUST NOT default to the URI path. | semantic conventions, HTTP spans |
| 19 | Confirmed | Burn-rate table: 2% in 1 h at 14.4 (page), 5% in 6 h at 6 (page), 10% in 3 days at 1 (ticket). | SRE Workbook, alerting on SLOs |
| 20 | Confirmed | Metrics SDK default cardinality limit: 2,000. What happens past it is not in the quote. | metrics SDK specification |
| 21 | Confirmed | Four golden signals: latency, traffic, errors, saturation. | SRE book, monitoring distributed systems |
| 24 | Confirmed in part | Lambda `LoggingConfig` sets the log format (text or JSON). The application log level is not in the quote. | `API_LoggingConfig` |

**Not returned (11):** 2 (`missing` evaluation example), 3 (evaluation range and hourly evaluation), 5 (actions on state change only), 6 (metric math alarms and EC2 actions), 7 (composite alarm limits), 11 (log group retention never expires), 13 (default sampling rule), 18 (ADOT Collector W3C trace ids version), 22 (Prometheus histograms and labels), 23 (log alarms, mute rules, warm-up), 25 (`X-Amzn-Trace-Id` sampling decision). Re-sent as a short follow-up prompt.

## F. Data (snippet only, second reading)

The same verdicts as the first snippet reply (`snippet-replies-2026-10-21.md`) for every item both covered: 28 different (4 times in 24 hours to on-demand), 39 different (foreign keys supported since 2026-08-26, `NOT VALID` on existing tables), 42 different (`connection_limit = 1` only without an external pooler), 41 not found. Two independent snippet readings agreeing is still not a full-page read.

**New in this reply:**
- **Sources disagree on item 29:** one DynamoDB guide page says a failed conditional write still consumes write capacity; an SDK example page in the same guide says it does not. A full read of both pages has to settle it before any row rests on it.
- **Prisma 7:** relational datasources use Node.js driver adapters by default, so the pool default comes from the driver, not the v6 `num_physical_cpus * 2 + 1` formula.
- **Item 21 and 26 rest only on secondary pages** in this reply (the MySQL manual's own paragraph was not in the snippet).
- **Ten added facts** (MySQL XA metadata locks across restarts, `DROP PRIMARY KEY` alone is `COPY` only, `BatchWriteItem` overwrites whole items, `GetItem` cannot read a GSI, GSI storage overhead 100 bytes per item, Aurora DSQL key size 1 KiB and row 2 MiB, DSQL index functions must be immutable, Prisma `shadowDatabaseUrl` equal to `url` can wipe data, Django `RunSQL` and `BEGIN`/`COMMIT`). All snippet only; leads.

## Spot check of H against the sources' own repositories

| # | Result | Where |
|---|---|---|
| 16 | Matches word for word | `open-telemetry/opentelemetry.io`, `content/en/docs/languages/sdk-configuration/general.md` |
| 17 | Both sentences match | `open-telemetry/semantic-conventions`, `docs/http/http-spans.md` |
| 20 | Matches; also answers the open half | `open-telemetry/opentelemetry-specification`, `specification/metrics/sdk.md`: past the limit, measurements go to one overflow series with the attribute `otel.metric.overflow=true`, and cumulative instruments keep exporting the series seen before |
| 15 | Not checked | `aws-observability/aws-otel.github.io` was not reachable |

Three of three checkable quotes match, so H's reader opened the pages. Its 14 rows are [R]; item 20 is now whole, and H2 need not ask it.

## What follows

- H's 14 rows can be used once the OpenTelemetry quotes check out against their repositories; the 11 missing items go out again.
- F needs a chat that can open pages: the one that answered H could, the one that answered F could not.

## I. Web performance (first part: items 1 to 22a; the reply was cut off in 22b)

Full pages, exact URLs. Verdicts as returned; "different" means the claim's source was wrong and the row must say what the page says.

| # | Verdict | Fact as returned | Page |
|---|---|---|---|
| 1 | Confirmed | Good is LCP ≤ 2,500 ms, INP ≤ 200 ms, CLS ≤ 0.1 (the boundary counts as good); poor is above 4,000 ms, 500 ms, 0.25. TTFB: good ≤ 0.8 s, poor > 1.8 s. | web.dev defining thresholds; web.dev TTFB |
| 2 | Confirmed | Assessed at the 75th percentile, mobile and desktop separately. | web.dev vitals |
| 3 | Confirmed | INP is the worst interaction; one highest interaction is ignored for every 50. | web.dev INP |
| 4 | Confirmed | Phases: input delay, processing duration, presentation delay. | web.dev optimize INP |
| 5 | Confirmed | INP replaced FID on 2024-03-12. | web.dev blog |
| 6 | Different | LCP candidates: `img`, `image` inside `svg`, `video` (poster or first frame), `url()` backgrounds, block-level text. A plain `<svg>` is not one. | web.dev LCP |
| 7 | Confirmed | LCP sub-parts and targets: TTFB ~40%, load delay < 10%, load duration ~40%, render delay < 10%. | web.dev optimize LCP |
| 8 | Confirmed | Lazy-loading an above-the-fold LCP image delays LCP. | web.dev LCP lazy loading |
| 9 | Different | The `loading` default is `eager`; browsers do not lazy-load by default. | MDN `img` |
| 10 | Confirmed | `fetchpriority="high"` raises an `img` or a preload; use it on one or two resources. | web.dev fetch priority |
| 11 | Different | The preload scanner reads all of the HTML, `<body>` included, but not CSS or script-injected markup. | web.dev preload scanner |
| 12 | Confirmed | Shift score = impact fraction × distance fraction; `hadRecentInput` within 500 ms; session windows with gaps under 1 s, at most 5 s. | web.dev CLS |
| 13 | Confirmed | `width`/`height` on `img` and on `<source>` in `<picture>`, or CSS `aspect-ratio`, reserve the space. | web.dev optimize CLS |
| 14 | Different | `swap`: 0 s block, infinite swap (fallback at once). `block`: about 3 s block. `fallback`: ≤ 100 ms block, 3 s swap. `optional`: ≤ 100 ms block, no swap. | MDN `FontFace.display` |
| 15 | Confirmed | `<link>` loads font stylesheets faster than `@import`. | web.dev font best practices |
| 16 | Confirmed | `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` calibrate the fallback; Chromium 87+, Firefox 89+. | web.dev size-adjust |
| 17 | Confirmed | A long task is over 50 ms. | W3C Long Tasks |
| 18 | Different | `scheduler.yield()`: Chrome and Edge 129, Firefox 142 (not 129), no Safari. | MDN `Scheduler.yield` |
| 19 | Confirmed | Long Animation Frames shipped in Chrome 123. | developer.chrome.com |
| 20 | Confirmed | Reading layout after a style write in the same frame forces synchronous layout. | web.dev layout thrashing |
| 21 | Confirmed | Passive listeners cannot `preventDefault()`; `passive` defaults to true for `wheel`, `mousewheel`, `touchstart`, `touchmove` on Window, Document, `documentElement`, `body`. | MDN `addEventListener` |
| 22a | Confirmed | `transform` and `opacity` avoid layout and paint. | web.dev compositor-only properties |

**Still to come:** 22b to 46 (the reply was cut off).
