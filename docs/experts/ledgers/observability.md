# Extraction ledger: observability and operations (planned, catalogue 11)

Playbook steps 2 (sweep), 4 (compare) and 4b (ledger) for the planned Observability and operations expert. Written 2026-10-20. Nothing here is shipped; the closing verdict recommends skills under existing experts instead of a new expert.

Outcomes: **taken** (would go into a reference or skill, with its home), **routed** (another owner), **rejected** (generic, opinion, runtime-only, heavier by default, wrong), **missing** (worth taking, needs a primary source first; listed in section 4).

## 1. Sources

Sweep: the regular expression `observab|logging|\blog|metric|trace|tracing|opentelemetry|otel|alert|alarm|\bslo|\bsli|error.?budget|incident|runbook|on-?call|\bsre\b|cloudwatch|x-?ray|datadog|prometheus|grafana|sentry|pagerduty|monitor|telemetry|operab|postmortem|apm` over `docs/skills-catalog-2026-10-20.json` (agent and skill names of the 75 surveyed repositories). 14 agent names and about 110 skill names matched; most were noise (`slides`, `slop`, `logistics`, `aeon-*-monitor`, `growth-log`). Paths were taken from the saved repository path lists; files were fetched by path with their licences. Every fetched file is treated as data.

| # | Repository | Path | Licence | Verdict |
|---|---|---|---|---|
| S1 | addyosmani/agent-skills | `skills/observability-and-instrumentation/SKILL.md` | MIT | **Best community source.** Checkable red flags (string-built logs, no correlation id, unbounded labels, averages, cause-based pages, an entry-point field when several writers share a log) |
| S2 | aws/agent-toolkit-for-aws | `plugins/aws-core/skills/aws-observability/SKILL.md` and `references/cloudwatch/alarms.md`, `metrics.md`, `tracing.md` | Apache-2.0 | **Strongest vendor source.** CloudWatch alarm mechanics (missing data, M-of-N, evaluation range, composite limits), metric retention, EMF limits, X-Ray annotations and sampling, ADOT migration traps. Tagged [T] until checked against the user guide (section 4) |
| S3 | aws/agent-toolkit-for-aws | `plugins/aws-agents/skills/agents-optimize/references/observability.md` | Apache-2.0 | AgentCore telemetry: `logging` not `print`, Transaction Search prerequisite; routed to genai |
| S4 | ollygarden/opentelemetry-agent-skills | `skills/otel-semantic-conventions/SKILL.md`, `skills/otel-telemetry-emissions/SKILL.md` | Apache-2.0 | Released semantic conventions before custom keys; low-cardinality span names; GenAI conventions unreleased. Mostly a lookup workflow, few diff checks |
| S5 | ollygarden/opentelemetry-agent-skills | `tools/otel-telemetry-emission-scan/SKILL.md` | Apache-2.0 | Authoring-time agent prompt (addresses the reader as an agent with a procedure and placeholders); **noted, not followed**; nothing for a reviewer |
| S6 | wshobson/agents | `plugins/observability-monitoring/skills/slo-implementation/SKILL.md`, `skills/distributed-tracing/SKILL.md`, `plugins/python-development/skills/python-observability/SKILL.md` | MIT | Golden signals, log levels, bounded labels; the tracing skill's "tag user_id" is fine for spans and wrong for metrics |
| S7 | wshobson/agents | `plugins/observability-monitoring/agents/observability-engineer.md`, `plugins/incident-response/agents/incident-responder.md` | MIT | Capability catalogues and incident procedure; runtime, nothing checkable in a diff |
| S8 | alirezarezvani/claude-skills | `engineering/skills/slo-architect/SKILL.md` | MIT | SLO anti-patterns (CPU as SLI, single-window burn alert, no budget policy). **Its burn-rate figures look wrong** ("10% in 6 hours", "1.44 ratio multiplier"; the SRE Workbook's table is 2% in 1 h, 5% in 6 h, 10% in 3 days): section 4, fact 19 |
| S9 | alirezarezvani/claude-skills | `engineering/skills/observability-designer/SKILL.md` | MIT | Catalogue; dashboard rules (7 panels, colour) are opinion |
| S10 | Jeffallan/claude-skills | `skills/monitoring-expert/SKILL.md`, `skills/sre-engineer/SKILL.md` | MIT | MUST/MUST NOT lists, all generic or covered by S1 |
| S11 | github/awesome-copilot | `agents/aws-incident-triage.agent.md`, `skills/aws-cloudwatch-investigation/SKILL.md` | MIT | Live-incident investigation; runtime; two gotchas (end-of-period timestamps, alarm delay) are not diff checks |
| S12 | itsmostafa/aws-agent-skills | `skills/cloudwatch/SKILL.md` | MIT | Log alarms, mute rules, warm-up configuration, wall-clock evaluation windows: new CloudWatch features, need a live check |
| S13 | this repository | `.cursor-plugin/ultimate-workflow/skills/operability-guidelines/SKILL.md` | ours | Production-readiness checklist for the main session; overlaps S1; already loaded by the host, not by experts |
| S14 | this repository | `experts/skills/aws-well-architected/skill.md` (OPS, REL, COST rows) and `experts/architect/references/*` | ours | Already hold: a DLQ with an alarm, rollback wired to an alarm, log-group retention, a failure nobody sees |

Twelve upstream files from seven repositories were read, plus our two internal sources. Not read: the Datadog, Sentry, PagerDuty and New Relic vendor-automation skills (they operate a product, not review a diff), and antigravity's copies of the wshobson skills.

## 2. Items, per source

Owners when routed: architect, softarch, developer, quality, security, devops, genai, data, frontend, privacy, performance.

### S1 addyosmani `observability-and-instrumentation`

| Item | Outcome | Home or owner |
|---|---|---|
| Write the on-call questions before instrumenting | rejected | advice, not a diff check |
| Log events with a stable name and structured fields, not string interpolation | taken | `telemetry-in-code` (a linter rarely catches it) |
| Log levels: error is an invariant broken, warn is degraded and handled | taken | `telemetry-in-code`, merged with S6 |
| A correlation id generated or accepted at the boundary and propagated on every log line, span and outbound call | taken | `telemetry-in-code` |
| Several entry points writing one log need an entry-point field, set where the run starts | taken | `telemetry-in-code` ([T], non-obvious) |
| No secrets, tokens or full PII in logs; allowlist fields | routed | security |
| RED for every endpoint and external dependency; USE for resources | taken | `telemetry-in-code` (as "a new dependency call with no duration and error metric") |
| Latency as a histogram, never an average | taken | `alarms-and-slos` and `telemetry-in-code` |
| Label cardinality: route template and status class, never user id, raw URL or error text | taken | `telemetry-in-code` |
| OpenTelemetry auto-instrumentation imported before anything else | missing | needs a primary source (section 4, fact 17) |
| Context propagated across every async boundary, queue metadata included, or the trace breaks | taken | `telemetry-in-code` |
| Head sampling low, keep all errors with tail sampling | rejected | backend-specific; no diff check |
| Alert on symptoms, not causes | taken | `alarms-and-slos` |
| Every alert actionable, linked to a runbook, threshold justified | taken | `alarms-and-slos` (the runbook link is checkable on the alarm resource) |
| Two severities only | rejected | opinion |
| Runbooks stored in `docs/runbooks/` | rejected | repository convention |
| Verify telemetry by triggering it in staging | routed | quality (a test that shows the signal fires) |

### S2 aws `aws-observability` and its CloudWatch references

| Item | Outcome | Home or owner |
|---|---|---|
| `put-metric-alarm` is an upsert keyed on the name and overwrites actions silently | routed | devops (an IaC name collision is what shows in a diff) |
| Composite alarms cannot take EC2 or Auto Scaling actions; same account and Region; 100 children | missing | `alarms-and-slos`, fact 7 |
| `TreatMissingData` defaults to `missing`; error-count metrics want `notBreaching`, heartbeats `breaching` | missing | `alarms-and-slos`, fact 1 |
| With `missing`, M, M, B, M, M can go to ALARM on one breaching point | missing | `alarms-and-slos`, fact 2 |
| Valid periods: 10, 20, 30 or a multiple of 60 | missing | fact 4 |
| Evaluation range is wider than the evaluation periods; windows over a day are evaluated hourly | missing | fact 3 |
| Max evaluation window: 7 days for periods of an hour or more, 1 day below | missing | fact 3 |
| Anomaly detection trains on up to two weeks | rejected | not a diff check |
| Recommended defaults (3 to 5 periods, 2 to 3 of N, 60 s, 5 percent error rate) | rejected | fixed thresholds; calibrate to the workload |
| Never `Average` for latency; use p90 or p99 | taken | `alarms-and-slos` |
| M = N = 1 on one-minute periods is too sensitive | taken | `alarms-and-slos` ([T]) |
| Metric math alarms cannot take EC2 actions | missing | fact 6 |
| DynamoDB alarms default to `ignore` in the console | rejected | console only, not IaC |
| Actions fire on state changes only, except Auto Scaling | missing | fact 5 |
| Alarm on an error rate, not a raw count | taken | `alarms-and-slos` |
| EMF versus PutMetricData; EMF limits (100 metrics, 30 dimensions, 1 MB event); `Timestamp` required | missing | `telemetry-in-code`, fact 10 |
| PutMetricData limits (1,000 datums, 150 values, 30 dimensions) | missing | fact 9 |
| Metric filters: 100 per log group | rejected | quota, rarely hit |
| Retention cascade: under 60 s for 3 h, 1 min for 15 days, 5 min for 63 days, 1 h for 455 days | missing | fact 8 |
| Each dimension combination is a separate metric and cost; `{InstanceId, InstanceType}` is not queryable by one alone | taken | `telemetry-in-code` (the cost half), fact 9 for the rule |
| X-Ray SDK in maintenance mode; ADOT for new work | missing | fact 14 |
| 50 annotations per trace; metadata is not indexed | missing | fact 12 |
| Default sampling 1 request per second plus 5 percent | missing | fact 13 |
| Sampling is decided once at the root | taken | `telemetry-in-code` ([T]) |
| OTel span attributes become X-Ray metadata unless listed in `aws.xray.annotations` | missing | fact 15 |
| Centralised sampling needs a proxy (`awsproxy`) | rejected | runtime setup |
| Mixed propagators during a migration (`xray,tracecontext`) | missing | fact 16 |
| ADOT 0.34+ to accept W3C trace ids | missing | fact 18 |
| Strip `X-Amzn-Trace-Id` from untrusted requests, which can force sampling | routed | security (fact 25 for the check) |
| Cross-account viewing needs OAM | routed | devops |

### S3 aws `agents-optimize/references/observability.md`

| Item | Outcome | Home or owner |
|---|---|---|
| AgentCore captures the `logging` module, not `print()` | routed | genai |
| Transaction Search must be enabled for traces to be searchable | routed | genai |
| Runtime role needs CloudWatch and X-Ray permissions | routed | security |
| Dashboard contents (invocations, p50/p90/p99) | rejected | dashboards are not a diff finding |

### S4 ollygarden `otel-semantic-conventions`, `otel-telemetry-emissions`

| Item | Outcome | Home or owner |
|---|---|---|
| Use the released semantic-convention group before inventing keys; custom keys in a stable namespace | taken | `telemetry-in-code` |
| Semconv span names are low-cardinality; no ids, hosts or product prose in them | taken | `telemetry-in-code`, fact 17 |
| GenAI conventions are unreleased (separate repository, no tag as of 2026-10-19) | routed | genai |
| Emission inventories are LLM-derived and must be checked against source | rejected | tooling |

### S5 ollygarden `otel-telemetry-emission-scan`

| Item | Outcome | Home or owner |
|---|---|---|
| The whole file (a headless scan procedure addressed to an agent) | rejected | authoring tool; instructions not followed |

### S6 wshobson SLO, tracing and Python observability skills

| Item | Outcome | Home or owner |
|---|---|---|
| Availability table (99.9 percent is 43.2 minutes a month) | rejected | arithmetic, no diff check |
| Error budget policy exists | taken | `alarms-and-slos` (plan question only) |
| Never log expected behaviour at ERROR (a wrong password is INFO) | taken | `telemetry-in-code` |
| Four golden signals at every service boundary | taken | merged with S1 RED |
| Sample 1 to 10 percent; overhead under 1 percent CPU | rejected | fixed thresholds |
| "Add meaningful tags (user_id, request_id)" | rejected for metrics, taken for spans | `telemetry-in-code` keeps the split |
| Observability code kept out of business logic | rejected | opinion |

### S7 wshobson observability-engineer and incident-responder agents

| Item | Outcome | Home or owner |
|---|---|---|
| Capability catalogue, severity classes, incident command, communication | rejected | runtime and persona |
| Blameless post-mortem | rejected | process |

### S8 alirezarezvani `slo-architect`

| Item | Outcome | Home or owner |
|---|---|---|
| CPU or memory as an SLI is the wrong signal | taken | `alarms-and-slos` |
| A single-window burn-rate alert is either noisy or late; use multi-window | taken | `alarms-and-slos`, with the Workbook figures (fact 19) |
| Burn thresholds "10 percent in 6 hours", "1.44 ratio multiplier" | rejected | appear wrong against the Workbook; fact 19 checks it |
| SLO without an owner or budget policy | taken | plan question |
| SLO target equal to the SLA | taken | plan question ([T]) |
| Target bounds (99.0 to 99.99, window 7 to 90 days) | rejected | fixed thresholds |

### S9 alirezarezvani `observability-designer`

| Item | Outcome | Home or owner |
|---|---|---|
| Hysteresis: different thresholds to fire and resolve | taken | `alarms-and-slos` ([T], low) |
| Dependent alert suppression during known outages | taken | `alarms-and-slos` (composite alarms, mute rules) |
| Dashboard design rules (7 panels, colours, 80/20) | rejected | opinion |
| Silent failures: processing failures with no HTTP error | routed | architect ("A failure nobody sees") |

### S10 Jeffallan `monitoring-expert`, `sre-engineer`

| Item | Outcome | Home or owner |
|---|---|---|
| Structured logs, request ids, no sensitive data, no string interpolation | taken | merged with S1 |
| Health check endpoints | routed | devops (probes) and architect (health signal) |
| Toil, chaos engineering, capacity planning | rejected | process, not diff |
| Load testing with k6 | routed | performance (planned) or quality |

### S11 awesome-copilot incident triage and CloudWatch investigation

| Item | Outcome | Home or owner |
|---|---|---|
| Phased investigation protocol, Logs Insights templates, deploy correlation | rejected | runtime investigation |
| Metric timestamps are end-of-period; alarm delay of periods times evaluations | rejected | runtime reading, not a diff check |

### S12 itsmostafa `cloudwatch`

| Item | Outcome | Home or owner |
|---|---|---|
| Log alarms on a Logs Insights query; omitted from `describe-alarms` unless asked | missing | fact 23 |
| Mute rules instead of disabling actions; `enable-alarm-actions` does not unmute | missing | fact 23 |
| Warm-up configuration for alarms created with new resources | missing | fact 23 |
| Include OK actions to track recovery | taken | `alarms-and-slos` ([T], low) |
| Set retention policies; log groups never expire by default | taken | already in `aws-well-architected` COST04-BP05; the default needs fact 11 |

### S13, S14 this repository

| Item | Outcome | Home or owner |
|---|---|---|
| Define working with an SLI, an SLO and an error budget | taken | `alarms-and-slos` plan questions |
| A health signal separate from "process is up" | routed | devops (probes), architect (health signal) |
| DLQ with an alarm; rollback wired to an alarm; log retention | covered | `aws-well-architected`, architect |
| A failure nobody sees at a boundary | covered | architect |
| A fallback with no log, metric or return flag | covered | developer `failure-handling` |

**Count:** 91 items. Taken 30, routed 13, rejected 24, missing 21, covered by our own files 3. (One row, S6 "tags", is counted as rejected though it keeps the span half.)

## 4. Facts that need the maintainer's live check

One checkable sentence each, with the page that should hold it.

CloudWatch alarms (docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/):
1. `TreatMissingData` defaults to `missing`, and the options are `missing`, `notBreaching`, `breaching` and `ignore`. (AlarmThatSendsEmail, "Configuring how CloudWatch alarms treat missing data")
2. With `missing`, an alarm can go to ALARM when the oldest breaching datapoint is at least `DatapointsToAlarm` old and every later point is breaching or missing, so M, M, B, M, M can alarm on one breach. (same page, evaluation examples)
3. CloudWatch evaluates over an evaluation range wider than the evaluation periods; an alarm whose periods times evaluations exceed one day is evaluated once an hour; the maximum window is 7 days for periods of an hour or more and 1 day below. (Alarm evaluation)
4. Valid alarm periods are 10, 20 and 30 seconds and any multiple of 60. (PutMetricAlarm API)
5. Alarm actions run on a state change only, except Auto Scaling actions, which repeat while the state holds. (AlarmThatSendsEmail, alarm actions)
6. An alarm on a metric math expression cannot take EC2 actions. (Using metric math alarms)
7. A composite alarm cannot take EC2 or Auto Scaling actions, and its children must be in the same account and Region. (Create a composite alarm)

CloudWatch metrics and logs:
8. Retention: data under 60 s for 3 hours, 60 s for 15 days, 300 s for 63 days, 3,600 s for 455 days. (cloudwatch_concepts, metric retention)
9. PutMetricData takes up to 1,000 metrics per request and 30 dimensions per metric, and each dimension combination is a separate metric. (PutMetricData API; CloudWatch quotas)
10. EMF: up to 100 metrics per directive, 30 dimensions per dimension set, and `Timestamp` is required in `_aws`. (CloudWatch_Embedded_Metric_Format_Specification)
11. A new log group's retention is "never expire" unless set. (Working with log groups; PutRetentionPolicy)

X-Ray and OpenTelemetry:
12. X-Ray allows 50 annotations per trace, and metadata is not indexed for search. (xray-concepts, annotations and metadata)
13. The default X-Ray sampling rule is the first request each second and 5 percent of the rest. (xray-console-sampling)
14. The X-Ray SDKs are in maintenance mode and AWS recommends the ADOT or OpenTelemetry SDKs; give the date. (X-Ray SDK support policy)
15. With ADOT, span attributes are exported as X-Ray metadata unless listed in `aws.xray.annotations`. (aws-otel.github.io, X-Ray exporter)
16. The OpenTelemetry SDK default for `OTEL_PROPAGATORS` is `tracecontext,baggage`. (opentelemetry.io SDK environment variables)
17. The HTTP semantic conventions name a server span `{method} {target}` with `http.route` as the low-cardinality target, and forbid unbounded values in span names. (opentelemetry.io semantic conventions, HTTP spans)
18. The ADOT Collector accepts W3C-format trace ids for X-Ray from a stated version (the source says 0.34.0). (aws-otel collector release notes)
20. The OpenTelemetry metrics SDK applies a default cardinality limit per metric stream; give the number and what happens past it. (opentelemetry.io metrics SDK specification, cardinality limits)

SLOs:
19. The SRE Workbook's multiwindow burn-rate alerting table: page at 2 percent of budget in 1 hour (burn rate 14.4) and 5 percent in 6 hours (6), ticket at 10 percent in 3 days (1). (sre.google/workbook/alerting-on-slos)
21. The SRE book's four golden signals are latency, traffic, errors and saturation. (sre.google/sre-book/monitoring-distributed-systems)
22. Prometheus recommends histograms or summaries for latency and warns against labels with unbounded values. (prometheus.io practices: naming, instrumentation)

Newer CloudWatch features (S12, unconfirmed):
23. CloudWatch has log alarms on a Logs Insights query (`put-log-alarm`), alarm mute rules, and an alarm warm-up configuration; give their API names and launch dates. (CloudWatch user guide, what's new)

Lambda:
24. Lambda's advanced logging controls set a JSON log format and an application log level per function (`LoggingConfig`). (Lambda developer guide, monitoring-cloudwatchlogs-advanced)

Security (for security):
25. An `X-Amzn-Trace-Id` header from a client can carry a sampling decision that the service honours. (xray-concepts, tracing header)

## 5. Proposed reference content (if the domain were an expert)

**Goal (draft).** Prevents: a change that ships a failure path, a new component or a reliability promise that nobody can see or be told about. Done well: every finding names the signal, alarm or field that is missing or wrong, and the failure that would go unseen or page wrongly. Not the goal: dashboards, tool choice, fixed thresholds.

**Plan questions (draft).**
- **The objective.** For a new user-facing flow: the SLI from the user's side (success, latency, freshness), the target and window, and the error-budget policy. None given is a question, not an invented 99.9.
- **The signals.** For each new component and external call: what shows its rate, errors and duration, and how one request is followed across it (correlation id, trace context through queues).
- **The alarms.** What pages a person, on which symptom, tied to the objective; what only goes to a dashboard or ticket; who receives it.
- **The fields.** What every log line for the flow carries (event name, correlation id, entry point), and what it must never carry (owner: security).
- **Retention and cost.** Log retention and metric resolution chosen, with the cost of each new high-cardinality signal.
- Good constraint: "The `checkout` p99 latency alarm uses `p99`, 3 of 5 one-minute periods, `notBreaching` for missing data, and links the runbook in its description." Rejected: "Add monitoring for the new service."

**Review categories (draft, each with "Not when").**
- **A new failure path with no signal.** A catch, fallback or DLQ added with no log, metric or alarm. Not when an existing alarm on the same metric covers it (architect keeps this category today).
- **An alarm that cannot fire, or fires wrongly.** Default missing-data treatment on an error metric, `Average` on latency, a threshold on a raw error count, M = N = 1 on one-minute periods, a composite alarm given an EC2 action. Not when the repository documents the choice for that metric.
- **An alarm that pages on a cause.** CPU or memory paging a person while no symptom alarm exists. Not when it is a ticket or dashboard alarm.
- **Unbounded metric dimensions.** A user id, request id, raw path or error message as a metric dimension or label. Not when the set is fixed and small by construction.
- **A broken trace.** Context not propagated into a queue message or a new thread, or a new service with a different propagator. Not when the hop is outside any traced flow.
- **Logs that cannot be queried or correlated.** String-built messages for events on a path the repository queries, no correlation id, several entry points into one log with no entry-point field. Not when the repository's logger adds them.
- **A log group with no retention.** Not when the repository sets retention centrally.

**Severity (draft).** High: a failure path on a user-facing flow that no alarm can see, or a paging alarm that cannot fire. Medium: a signal that is late, noisy or uncorrelated. Low: a cost or retention leak with a small bound.

**Worked pair (draft, from no corpus case).** Finding: `infra/alarms.tf:14` adds `aws_cloudwatch_metric_alarm.checkout_latency` with `statistic = "Average"` and `evaluation_periods = 1` on a payment API; a slow tail of 5 s requests at p99 leaves the average at 300 ms and the alarm never fires. Dropped: `billing/metrics.py:22` labels `invoices_total` with `tenant_id`; it looked like a cardinality bomb, but the product has a fixed list of 12 enterprise tenants in `config/tenants.yaml`, so the set is bounded.

## 6. Responsibilities: draft rows, and what would move

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Alarms and paging | whether an alarm can fire and pages on a symptom; missing-data treatment, statistic, M of N | whether the alarm is wired to roll back a deploy (devops); whether a test proves the alarm fires (quality) | the alarm's definition is observability's; its rollback wiring is the DevOps engineer's |
| SLOs | the SLI, target, window, budget policy and burn-rate alerts the plan states | the availability target as a business decision (the user); the topology that can meet it (architect) | the measurement is observability's; whether the design can reach the target is the architect's |
| Telemetry in code | structured events, correlation ids, trace context, metric dimensions | secrets and personal data in telemetry (security); how the catch is written (developer) | a missing correlation id is observability's; a token in a log line is security's |
| Retention and resolution | log retention, metric resolution and their cost | data lifecycle rules (privacy, planned) | the default "never expire" is observability's; a legal retention period is privacy's |

What would move from existing experts if it were built:
- **Architect:** "A failure nobody sees" would split: the failure path stays the architect's (it is about the boundary), the missing alarm on it moves here; "a dead-letter queue with no alarm" moves here (the architect's own table says so).
- **Security:** "rotation runbooks (observability, planned)" moves here; secrets in logs stays security's.
- **DevOps:** nothing; deploy-time check wiring stays.
- **Quality:** nothing; whether a check can fail stays.
- **Developer:** structured logging and correlation ids move here from nowhere (no expert owns them today).

## 7. Proposed skills, with selectors and the value test

| Skill | Rows (value test passed) | Owner if no expert is built | Selector |
|---|---|---|---|
| `alarms-and-slos` | missing-data treatment per metric type; M of N; evaluation range; `Average` on latency; rate not count; composite and math alarm action limits; symptom against cause; multi-window burn rates; OK actions | architect | `added: aws_cloudwatch_metric_alarm\|AWS::CloudWatch::Alarm\|AWS::CloudWatch::CompositeAlarm\|aws_cloudwatch_composite_alarm\|new Alarm\(\|CompositeAlarm\|TreatMissingData\|treat_missing_data\|treatMissingData\|DatapointsToAlarm\|datapoints_to_alarm\|PrometheusRule\|alerting_rules\|burn.?rate`; `files: *.rules.yml, prometheus-rules*.yaml, alerts*.yaml` |
| `telemetry-in-code` | event-named structured logs; levels; correlation id and entry-point field; trace context through queues and threads; metric dimension cardinality and cost; semantic conventions before custom keys; X-Ray annotations against metadata and the ADOT opt-in; EMF limits; Lambda JSON log format | developer | `added: getLogger\|structlog\|logging\.\|pino\|winston\|zap\.\|slog\.\|tracing::\|opentelemetry\|@opentelemetry\|otel\|propagat\|traceparent\|X-Amzn-Trace-Id\|put_metric_data\|PutMetricData\|prom-client\|prometheus_client\|Counter\(\|Histogram\(\|_aws.*CloudWatchMetrics\|aws-embedded-metrics\|Powertools.*(Logger\|Metrics\|Tracer)` |

Value test notes: rows a linter catches (unused logger, print in production code) were cut; dashboards, runbook format and incident process fail "checkable in a diff"; recommended thresholds fail "calibrate to the workload". Both skills together are about 12 KB, under the 40 KB stage cap with the architect's or developer's other skills (to check when written).

## Verdict: does this domain need its own expert?

**No, not now.** By the test in `docs/adding-an-expert.md` an expert earns its place by something a lens or a skill cannot give: a requirement that must shape the plan, cases the tests would miss, noise a "do not report" list would cut, or a decision needing outside input.

- The plan-time requirement (state the SLO, the paging alarm and the signals for a new component) is real, but the architect already asks most of it ("who is alerted when a message dead-letters", availability target, "a new component with nothing to show it is healthy"). Two plan questions (the objective, the alarms) would close the gap.
- The review checks split cleanly between infrastructure alarms (architect, beside `aws-well-architected`) and telemetry in code (developer, beside `failure-handling`). A separate expert would review the same lines as one of them on almost every diff, which is the overlap the playbook warns about.
- The material is thin where it matters: the community sources are catalogues and runtime procedures; the checkable content is almost entirely the AWS toolkit's alarm mechanics plus a handful of instrumentation rules.

Recommendation: build `alarms-and-slos` under the architect and `telemetry-in-code` under the developer after the live check, add the two plan questions to the architect's `plan.md`, and change "(observability, planned)" in the architect's and security's tables to the architect and developer. Revisit an expert only if a measured corpus shows those two missing what a dedicated reviewer finds.

**Tools needed:** Read, Grep and Glob. Web lookups would help for alarm behaviour that changes, under the existing network decision if extended; no shell.
