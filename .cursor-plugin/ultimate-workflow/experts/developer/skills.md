# Skills: developer

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

## plan

- engineering-principles
- telemetry-in-code
- web-performance
- dependency-discipline
- failure-handling

## build

- failure-handling (added: \b(catch|except|rescue|recover|finally|retry|fallback|rollback)\b|\.catch\(|Err\(|unwrap_or|err != nil|throw |raise |error path|error handling)
- python-craft (files: *.py, *.pyi)
- typescript-craft (files: *.ts, *.tsx, *.mts, *.cts, *.js, *.jsx, *.mjs, *.cjs)
- react-craft (files: *.tsx, *.jsx)
- go-craft (files: *.go, go.mod)
- rust-craft (files: *.rs, Cargo.toml)
- java-craft (files: *.java, pom.xml, build.gradle, build.gradle.kts)
- dependency-discipline (files: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements*.txt, pyproject.toml, uv.lock, poetry.lock, Pipfile, Pipfile.lock, go.mod, go.sum, Cargo.toml, Cargo.lock, pom.xml, build.gradle, build.gradle.kts, Gemfile, Gemfile.lock)
- surgical-change (always)
- simplification (always)
- engineering-principles (always)

## review

- failure-handling (added: \b(catch|except|rescue|recover|finally|retry|fallback|rollback)\b|\.catch\(|Err\(|unwrap_or|err != nil|throw |raise )
- python-craft (files: *.py, *.pyi)
- typescript-craft (files: *.ts, *.tsx, *.mts, *.cts, *.js, *.jsx, *.mjs, *.cjs)
- react-craft (files: *.tsx, *.jsx)
- go-craft (files: *.go, go.mod)
- rust-craft (files: *.rs, Cargo.toml)
- java-craft (files: *.java, pom.xml, build.gradle, build.gradle.kts)
- dependency-discipline (files: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements*.txt, pyproject.toml, uv.lock, poetry.lock, Pipfile, Pipfile.lock, go.mod, go.sum, Cargo.toml, Cargo.lock, pom.xml, build.gradle, build.gradle.kts, Gemfile, Gemfile.lock)
- surgical-change (always)
- simplification (always)
- engineering-principles (always)
- web-performance (files: next.config.*, vite.config.*, webpack.config.*, rollup.config.*, index.html, **/app/layout.*, **/pages/_app.*, **/pages/_document.*, src/main.*; added: loading=|<img\b|<Image\b|<iframe|<video|<script\b|<link rel=|@font-face|font-display|@import url|fetchpriority|\btransition:|transition-property|@keyframes|will-change|content-visibility|\bimport\(|React\.lazy|\blazy\(|next/dynamic|["']use client["']|["']use cache["']|cacheComponents|sideEffects|optimizePackageImports|getBoundingClientRect|offsetHeight|offsetWidth|scheduler\.yield|onScroll|onPointerMove|requestAnimationFrame|addEventListener\(.(scroll|wheel|touchstart|touchmove|pointermove|unload)|useDeferredValue|startTransition|onFID)
- telemetry-in-code (added: getLogger\(|structlog|logging\.basicConfig|logging\.config|dictConfig|pino\(|winston\.create|zap\.New|slog\.New|tracing_subscriber|@opentelemetry/|from opentelemetry|import opentelemetry|go\.opentelemetry\.io|io\.opentelemetry|OTEL_|propagators?\b|[Pp]ropagator|traceparent|X-Amzn-Trace-Id|aws-xray-sdk|aws_xray_sdk|xray\.|put_metric_data|PutMetricData|prom-client|prometheus_client|client_golang|metrics\.(create|get)Meter|meter\.create|create_counter|create_histogram|CloudWatchMetrics|aws-embedded-metrics|aws_embedded_metrics|aws_lambda_powertools|@aws-lambda-powertools|LoggingConfig|ApplicationLogLevel|LogFormat)
