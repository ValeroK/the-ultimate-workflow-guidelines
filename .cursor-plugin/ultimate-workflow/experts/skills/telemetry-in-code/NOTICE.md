# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| addyosmani/agent-skills `observability-and-instrumentation` | Read 2026-10-21 | MIT | Event-named structured logs, correlation ids, entry-point fields, context across async boundaries |
| ollygarden `otel-semantic-conventions`, `otel-telemetry-emissions` | Read 2026-10-21 | Apache-2.0 | Semantic conventions before custom keys, low-cardinality span names |
| wshobson/agents observability skills; aws/agent-toolkit-for-aws `aws-observability` | Read 2026-10-21 | MIT; Apache-2.0 | Log levels, dimension cost, X-Ray annotations against metadata |
| opentelemetry.io (SDK configuration, HTTP semantic conventions, metrics SDK specification); X-Ray and CloudWatch guides; aws-otel.github.io; prometheus.io; Lambda API reference | Checked live by the maintainer, 2026-10-22 (blocks H and H2), and three OpenTelemetry quotes matched against their repositories | Vendor documentation and specifications | Every fact marked [R] |

What is marked [O] is our own reasoning.

Left out, and why: secrets and personal data in telemetry (security); head and tail sampling policy (backend-specific); the ADOT Collector version for W3C trace ids (secondary sources only).
