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

## J. Privacy (37 items and 10 extras)

Mostly full pages (EUR-Lex HTML and PDF, EDPB, ICO, the CPPA's statute and regulation PDFs, eCFR, W3C GPC, vendor docs). The reply itself notes snippets for parts of items 2 and 6 and secondary pages for item 23. Spot check: item 35 matches the PostgreSQL 18 manual (`maintenance.sgml` line 164) and item 29's `REDACTED:REDACTED` rule is in the OpenTelemetry URL registry.

| # | Verdict | Fact as returned | Source |
|---|---|---|---|
| 1 | Confirmed | Art. 5(1)(c) minimisation; 5(1)(e) storage limitation, with the Art. 89(1) archiving, research and statistics exception; 5(2) accountability. | EUR-Lex GDPR |
| 2 | Different | Art. 17(1) says "without undue delay", no day count; 17(2) duty to inform other controllers when the data were made public; 17(3)(a) to (e) exceptions. Parts of the text came from snippets. | EUR-Lex GDPR |
| 3 | Different | Art. 12(3): one month, extendable by two further months. Not 30 days. | EUR-Lex GDPR |
| 4 | Confirmed | Art. 19: communicate erasure to each recipient, unless impossible or disproportionate. | EUR-Lex GDPR |
| 5 | Different | Art. 25(1) names pseudonymisation; 25(2): by default only data necessary for each purpose (amount, extent, storage, accessibility). It does not say "optional collection defaults to off". | EUR-Lex (CJEU case quoting Art. 25) |
| 6 | Confirmed | Art. 32(1)(a) to (d): pseudonymisation and encryption; confidentiality, integrity, availability, resilience; timely restore; regular testing. (b) and (c) partly from snippets. | EUR-Lex GDPR |
| 7 | Confirmed | Art. 35(1), (2), (3)(a) to (c), (7); Art. 36(1) prior consultation. | EUR-Lex GDPR |
| 8 | Different | WP248 rev.01 lists nine criteria, not ten, eight or six; transfer outside the EU is not one; two criteria is the rule of thumb. | European Commission (WP248) |
| 9 | Confirmed | Art. 4(1), 4(5); Recital 26 (pseudonymised data is personal data, anonymous is out); Recital 30 (IP addresses, cookie ids). | EUR-Lex GDPR |
| 10 | Different | Art. 7(1): be able to demonstrate consent; 7(3): withdrawal as easy as giving. Neither requires an immutable record or a policy version. | EUR-Lex GDPR |
| 11 | Confirmed | Art. 30(1)(f): envisaged time limits for erasure, where possible. | EUR-Lex GDPR |
| 12 | Confirmed in part | EDPB 05/2020 para. 86: scrolling or swiping is never consent. Escape or close as reject is not in it. | EDPB (quoted in Guidelines 8/2020; a gov.cy mirror of 05/2020) |
| 13 | Confirmed | EDPB Opinion 28/2024: models trained on personal data cannot in all cases be considered anonymous; case by case. | EDPB |
| 14 | Confirmed | ICO: backup data must be put "beyond use" until overwritten. | ico.org.uk right to erasure |
| 15 | Confirmed | CJEU C-413/23 P, EDPS v SRB, 2025-09-04: pseudonymised data is not personal data for a recipient with no means reasonably likely to re-identify; still personal data for the controller holding the key. | EUR-Lex judgment |
| 16 | Confirmed | Civ. Code 1798.105(c)(1): delete, notify service providers and contractors, and notify third parties sold or shared to, unless impossible or disproportionate. | CPPA statute PDF |
| 17 | Confirmed | 45 days, extendable once by 45 with notice. | CPPA FAQ (statute page not reached) |
| 18 | Confirmed | 11 CCR 7025: treat an opt-out preference signal (GPC) as an opt-out for the browser and a known consumer. GPC: header `Sec-GPC: 1`, `navigator.globalPrivacyControl`. | CPPA regulations; W3C GPC |
| 19 | Confirmed | 11 CCR 7026: comply and notify third parties within 15 business days. | CPPA regulations |
| 20 | Confirmed | 11 CCR 7022(f): an unverifiable deletion request is followed by an offer to opt out. | CPPA regulations |
| 21 | Confirmed | 11 CCR 7050(c): a cross-context behavioural advertising provider is a third party. | CPPA regulations |
| 22 | Confirmed | 1798.140(v) personal information includes unique identifiers, IP addresses, cookies; (ah) "share" means for cross-context advertising, paid or not. Hashed identifiers covered as unique identifiers. | CPPA statute PDF |
| 23 | Secondary only | AB 2561 and SB 923 signed 2026-09-27, effective 2027-01-01 (privacy settings not silently reverted; deletion "from or about" a consumer, suppression list). | a law firm alert; leginfo not reached |
| 24 | Confirmed | 45 CFR 164.514(b)(2): 18 identifiers (A to R) and the no-actual-knowledge condition. | eCFR |
| 25 | Different | 164.312(b) audit controls state no retention; 164.316(b)(2) six years applies to the required policies and documentation, not raw audit logs. | eCFR |
| 26 | Confirmed | Breach notice only for unsecured PHI (encryption per HHS guidance is the safe harbour); individuals within 60 calendar days of discovery. | eCFR 164.404 |
| 27 | Confirmed | Sentry: `sendDefaultPii` false by default (deprecated in newer SDKs for `dataCollection`); `beforeSend`/`beforeBreadcrumb` scrub client side; server-side scrubbing on by default; Replay `maskAllText` and `maskAllInputs` true by default. | docs.sentry.io |
| 28 | Confirmed | CloudWatch Logs data protection policies, account-wide or per log group, mask at ingestion (not earlier events); `logs:Unmask` reveals. | CloudWatch Logs guide |
| 29 | Confirmed | `url.full` and `url.query`; credentials in a URL SHOULD be redacted as `REDACTED:REDACTED`. | OpenTelemetry URL registry |
| 30 | Confirmed | GA forbids sending PII; GA4 does not log or store EU, UK and Swiss IP addresses. | support.google.com |
| 31 | Confirmed | Bedrock invocation logging (off by default) can write full input and output to S3 and CloudWatch Logs. | Bedrock user guide |
| 32 | Confirmed | Versioned S3: DELETE without a version id adds a delete marker; `NoncurrentVersionExpiration` removes old versions, asynchronously. | S3 user guide |
| 33 | Confirmed, weak source | Deleted documents stay until segment merges; snapshots keep old segments. Cited page is a JavaScript client reference. | elastic.co |
| 34 | Confirmed | Kafka: tombstones kept `delete.retention.ms` (1 day default); `retention.ms` 7 days default. | kafka.apache.org 3.8 topic configs |
| 35 | Confirmed | DELETE leaves bytes until VACUUM; WAL archives and base backups keep them. | PostgreSQL manual |
| 36 | Confirmed | TTL deletes replicate to global table replicas; PITR up to 35 days. | DynamoDB guide |
| 37 | Confirmed | Global tables copy only to configured replicas; S3 replication does not copy delete markers by default; SCPs restrict Regions with `aws:RequestedRegion` and a `NotAction` list for global services. | S3 and Organizations guides |

**Extras:** CloudWatch log groups never expire by default (answers H item 11 too); Sentry derives location from IP even with IP storage off; Sentry does not scrub AI agent span attributes (`input.messages`, `tool.call.arguments`, ...) by default; Sentry Python, PHP and Node SDKs capture stack local variables by default; S3 delete markers made by lifecycle rules are never replicated; GA4 redaction does not cover Measurement Protocol or Data Import; GA4 "reset on new activity" restarts user-data retention; async OpenSearch `_delete_by_query` leaves a task document holding the query; Kafka `local.retention.ms` must not exceed `retention.ms`; CCPA 11 CCR 7004 forbids "Yes/No" next to "Do Not Sell or Share" (double negative).

**Not reached:** leginfo.legislature.ca.gov (statute read from the CPPA's PDF instead), GA answer 6366371, the EDPB 05/2020 PDF on edpb.europa.eu (read from a government mirror).

## B. DevOps round 2 (27 items and 10 extras)

Full pages for most; the reply notes a snippet for part of item 7 and secondary pages for part of item 23.

| # | Verdict | Fact as returned | Page |
|---|---|---|---|
| 1 | Confirmed | Resources of a provider configuration must be destroyed before the configuration is removed. | Terraform module providers |
| 2 | Confirmed | `moved` works within one state; across states use `removed` and `import`. | Terraform refactoring |
| 3 | Confirmed | A `moved` block inside a removed module is not evaluated; keep a shim or declare it in the caller. | Terraform refactoring |
| 4 | Confirmed | Creation-time provisioners run only on create; Terraform cannot model what they do. | Terraform provisioners |
| 5 | Confirmed | A `providers` argument overrides inheritance; removing it falls back to the default provider. | Terraform module providers |
| 6 | Confirmed | Inline rules on `aws_security_group` plus separate rule resources cause conflicts, perpetual diffs, overwritten rules. | AWS provider registry |
| 7 | Confirmed in part | CloudFormation express mode completes before resources stabilise; rollback is off by default. The `aws cloudformation deploy` limitation was not in what the reply read. | CloudFormation express mode |
| 8 | Different | A failed express-mode operation can be rolled back: `rollback-stack` supports express mode, or set `disableRollback: false` up front. It is CDK hotswap that has no rollback. | CloudFormation rollback page |
| 9 | Confirmed | `--hotswap` skips what it cannot hotswap; `--hotswap-fallback` falls back to a CloudFormation deployment. | CDK deploy reference |
| 10 | Confirmed | `cdk refactor` fails with property changes, additions or deletions mixed in; no cross-environment moves. | CDK refactor |
| 11 | Confirmed | Lambda Node.js runtimes bundle SDK v3, not v2. | Lambda Node.js |
| 12 | Confirmed | A retained resource comes back into a stack through an import, not a re-create under the same name. | CloudFormation resource import |
| 13 | Confirmed | Template quotas: 500 resources, 200 parameters, 200 outputs, 200 mappings, 51,200 bytes inline, 1 MB from S3. | CloudFormation quotas |
| 14 | Confirmed | AppConfig rolls back when an environment alarm fires during deployment or bake; it needs a role to read the alarm. | AppConfig deployment strategy |
| 15 | Confirmed | CodeDeploy runs `ApplicationStop` from the last successful revision. | CodeDeploy agent |
| 16 | Confirmed | Execution modes SUPERSEDED (default), QUEUED and PARALLEL (V2 only); PARALLEL runs at once. | CodePipeline concepts |
| 17 | Confirmed | Trigger file-path filters see the first 100 changed files. | CodePipeline troubleshooting |
| 18 | Confirmed | If minimum healthy hosts rounds up to the fleet's healthy count, the deployment fails at once. | CodeDeploy instance health |
| 19 | Confirmed | With early success criteria, circuit breaker and alarm rollback apply only until ECS completes the deployment. | ECS failure detection |
| 20 | Confirmed in part | Lifecycle rules expire images by their criteria; "even if in use" is not stated on the page. | ECR lifecycle policies |
| 21 | Confirmed in part | Resource names come from `.Release.Name` or `fullnameOverride`; the delete-and-create consequence is not stated by Helm. | helm.sh variables |
| 22 | Different | With no `hook-delete-policy`, Helm applies `before-hook-creation` by default, so a same-name rerun does not fail; the resource does stay after uninstall. | helm.sh chart hooks |
| 23 | Confirmed in part | `inconclusiveLimit` is the inconclusive threshold; "no data is Inconclusive and pauses" rests on secondary pages. | Argo Rollouts FAQ |
| 24 | Confirmed | `StatefulSetAutoDeletePVC`: beta on by default 1.27 to 1.31, GA in 1.32. | kubernetes.io feature gates |
| 25 | Confirmed | `compose down -v` removes declared named and anonymous volumes; `external` ones never. | docs.docker.com |
| 26 | Confirmed | `image prune -a` removes all images not referenced by any container. | docs.docker.com |
| 27 | Confirmed | "No restriction" lets any branch deploy; "protected branches only" with no protection rules lets all branches deploy. | docs.github.com environments |

**Extras:** `create_before_destroy` stops destroy-time provisioners; a tainted resource skips its destroy-time provisioner; removing inline `ingress`/`egress` blocks does not delete the rules (set `ingress = []`); PARALLEL pipelines have no stage rollback; after hotswaps use `cdk deploy --revert-drift`; construct id `Default` keeps a logical id when wrapping; one nested-stack operation changes at most 2,500 resources; express mode still waits for custom resources (set `ServiceTimeout`); `helm uninstall` never removes hook resources; environment branch patterns: `*` does not match `/`.

**Two held-back review lines are now settled:** the StatefulSet PVC rule (24) and the deployment-branch rule (27).

## F again (third snippet-only reading)

Sent to a chat whose only tool was `google:search`, so every claim is marked snippet only. Verdicts match both earlier snippet readings (28, 39, 42 different; 31, 41 not found), plus:

- **Item 29 now reads the other way from the second reply's SDK page:** this snippet of the same SDK example page says conditional writes "consume the same amount of write capacity whether" the condition succeeds or fails. Two snippets of one page disagree, which is the case for reading the page itself.
- **Item 22:** the 8.0.28 date for `INSTANT RENAME COLUMN` was not in the snippet.
- **Added (snippet only):** Prisma batches only `findUnique` (not `findMany`) in its dataloader; `@unique`, `@id`, `@relation`, `@ignore`, `@updatedAt` are not allowed in composite types; `uuid()` and `cuid()` defaults live in Prisma, not the database; PartiQL `DELETE` takes one item by full key; RDS PostgreSQL temp-table churn contends on TOAST OIDs; dropping MySQL temp tables does not shrink the global temp tablespace; `DBInstanceClassMemory` excludes OS and RDS overhead.

F stays snippet only. It needs the chat that answered B, I and J (full pages).
