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

**Spot check:** items 9, 18 and 21 match MDN's own sources word for word (`mdn/content` for `img` and `addEventListener`; `mdn/browser-compat-data` `api/Scheduler.json`: Chrome 129, Firefox 142, Safari false). Rows 1 to 22a are [R].

### I, items 22b to 46 and extras (second paste)

| # | Verdict | Fact as returned | Page |
|---|---|---|---|
| 22b | Confirmed | WAAPI and CSS animations can run off the main thread; `filter`, `background-color`, `clip-path` are named as accelerated in Motion's guide. | motion.dev performance |
| 23 | Confirmed | `will-change` in a stylesheet keeps optimisations in memory; excessive use costs memory and speed. | MDN `will-change` |
| 24 | Confirmed | `content-visibility: auto` skips layout and paint off screen; pair with `contain-intrinsic-size`. | web.dev content-visibility |
| 25 | Different | Animating a CSS variable is not accelerated, but Motion's `x`/`y` independent transforms are. | motion.dev performance |
| 26 | Confirmed | Classic scripts block parsing; `async` runs on arrival; `defer` in order after parsing; module scripts defer by default. | MDN `script` |
| 27 | Confirmed | Inline handlers are blocked under CSP unless `script-src-attr` (or `script-src`) allows `'unsafe-inline'` or a matching `'unsafe-hashes'`. | MDN CSP `script-src-attr` |
| 28 | Confirmed | An `unload` listener or `Cache-Control: no-store` on the HTML blocks the bfcache. | web.dev bfcache |
| 29 | Confirmed | webpack tree shaking needs ES modules, `sideEffects`, `usedExports` and production mode. | webpack tree shaking |
| 30 | Confirmed | Rollup `treeshake.moduleSideEffects: false` drops imported modules whose exports are unused. | rollupjs.org options |
| 31 | Confirmed | Next.js `optimizePackageImports` loads only used modules from barrels; libraries such as `lucide-react`, `date-fns`, `lodash-es` are on by default. The 200 to 800 ms figure stays out. | nextjs.org config |
| 32 | Confirmed | Compiling ES modules to CommonJS stops webpack tree shaking. | webpack tree shaking |
| 33 | Confirmed | webpack: an expression in `import()` creates a context module with every match. Vite: variables match one directory level only. | webpack dependency management; vite.dev features |
| 34 | Confirmed | `next/dynamic` and `React.lazy` split code; `ssr: false` is an error in Server Components. | nextjs.org lazy loading |
| 35 | Confirmed | `'use client'` marks the module and its transitive imports as client code. | react.dev `use client` |
| 36 | Different | Next.js 16 deprecates `<Image priority>` in favour of `preload`. | nextjs.org Image |
| 37 | Different | Next.js 16 `'use cache'` needs `cacheComponents: true`, but `unstable_cache` still works and is the one that persists across deployments. | nextjs.org migrating to Cache Components |
| 38 | Confirmed | `useMemo`/`useCallback` only for slow work or props to a `memo` child. | react.dev `useMemo` |
| 39 | Confirmed | React Compiler memoises components and hooks; react.dev recommends relying on it for new code. The 1.0 release date is not in the quote. | react.dev React Compiler |
| 40 | Confirmed | `useDeferredValue` and transitions keep input responsive; the input's own state must not be in a transition. | react.dev `useDeferredValue` |
| 41 | Confirmed | `<Activity>` is in React 19.2 with `visible` and `hidden` (hidden unmounts effects, keeps state). | react.dev blog, React 19.2 |
| 42 | Confirmed | `React.cache` is for Server Components and is invalidated across requests. | react.dev `cache` |
| 43 | Confirmed in part | Lighthouse budgets via `--budget-path` and LHCI; the source is a GitHub issue discussing deprecation, not the docs. Weak. | GoogleChrome/lighthouse issue 15203 |
| 44 | Confirmed | LHCI `temporary-public-storage` reports are readable by anyone with the link. | lighthouse-ci configuration |
| 45 | Not found | No vendor publishes a `blur()` size limit; only "blur takes longer to paint". Both figures stay out. | web.dev animations guide |
| 46 | Confirmed | Font `preconnect` and `preload` need `crossorigin`; without it preconnect only does DNS. | web.dev preconnect |

**Extras (all primary pages):** `preconnect` and `dns-prefetch` in one `<link>` makes Safari cancel the preconnect; add `beforeunload` only while there are unsaved changes; `React.lazy` inside a component body resets state on every render; `React.cache` inside a component body never shares; `'use cache'` functions cannot read `cookies()`, `headers()` or `searchParams`; with `cacheComponents` on, segment exports `dynamic`, `revalidate`, `fetchCache` are errors; `@property` without `syntax` or `inherits` is ignored; a nonce in `script-src` makes the browser ignore `'unsafe-inline'`; incomplete dependency arrays in manual memoisation block React Compiler; `will-change` inside `@keyframes` does nothing.

**Not reached:** the browser-level lazy-loading article and the WHATWG HTML pages; the reply used MDN and web.dev companions instead.

Block I is complete: 46 items, 8 different, 1 not found, 1 weak (43).
