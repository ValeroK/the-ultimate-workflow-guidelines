---
name: alarms-and-slos
description: Use when a change adds or changes CloudWatch alarms (metric, composite, log), Prometheus alerting rules or SLO and burn-rate definitions, or when a plan states a reliability objective, to find an alarm that cannot fire, fires on one stray point, measures the wrong statistic or a cause instead of a symptom, takes an action it is not allowed to, or an objective with no alert that would show it being spent.
verified: 2026-10-22
---

# Alarms and SLOs

## Goal

- **Lets the expert catch:** an alarm that never fires on the failure it was written for, one that fires on a single stray datapoint, latency judged by its average, an error count where a rate is needed, a composite or math alarm given an action CloudWatch refuses, a paging alarm on CPU while no symptom alarm exists, and an objective with no burn-rate alert.
- **Applies to:** `AWS::CloudWatch::Alarm`, `AWS::CloudWatch::CompositeAlarm`, `aws_cloudwatch_metric_alarm`, `aws_cloudwatch_composite_alarm`, CDK `Alarm` and `CompositeAlarm`, log alarms, Prometheus rule files, SLO definitions, and plans that state an availability or latency objective.
- **Not for:** log fields, trace context and metric labels in application code (developer, `telemetry-in-code`); whether a deploy rolls back on an alarm (devops); whether a test proves an alarm fires (quality); a dead-letter queue's alarm (already `aws-well-architected` OPS08-BP04).

Sources: **[R]** the maintainer's live check of the CloudWatch user guide and API reference, the AWS what's new posts, the SRE book and Workbook and prometheus.io, blocks H and H2 (2026-10-22); **[T]** the aws `aws-observability` skill, alirezarezvani `slo-architect` and `observability-designer`, itsmostafa `cloudwatch` and addyosmani `observability-and-instrumentation` (MIT, Apache-2.0), not checked; **[O]** our own reasoning. A threshold, period count or target is the workload's: never demand a number, only report a setting that makes the alarm wrong for its metric.

## First, establish the target

- **What each alarm is for**: a symptom a user feels (errors, latency, freshness), a cause (CPU, memory, queue depth), or a heartbeat that must keep arriving.
- **Who receives it**: a page, a ticket or a dashboard. The paging rows apply only to alarms that page.
- **Whether the repository defines SLOs**, and where.

## Missing data and evaluation

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| With no `TreatMissingData`, missing data is treated as `missing`; alarms on `AWS/DynamoDB` metrics default to `ignore` [R]. The options are `missing`, `notBreaching`, `breaching`, `ignore` [R] | A heartbeat or "job ran" alarm left at the default, so a job that stops reporting never alarms (it wants `breaching`); a sparse error-count alarm left at the default where gaps mean "no errors" (it wants `notBreaching`) [T] | The metric is emitted every period, zero included |
| Under `missing`, the alarm goes to ALARM when the oldest breaching point in the evaluation range is at least `DatapointsToAlarm` old and the newer points are breaching or missing [R], so on a sparse metric one breach followed by gaps can alarm [O] | `DatapointsToAlarm` of 2 or more on a metric that reports only on activity, with the default treatment | A metric with no gaps |
| CloudWatch reads a range wider than `EvaluationPeriods`; an alarm whose periods times length exceed one day is evaluated once an hour; the total is capped at 7 days for periods of an hour or more and 1 day for shorter ones [R] | `Period` times `EvaluationPeriods` above 86,400 s with a period under 3,600 s, or above 604,800 s; a daily alarm expected to react within minutes | |
| Periods are 10, 20 or 30 seconds or a multiple of 60 [R] | Another value | |
| One datapoint out of one, on one-minute periods, pages on every blip [T] | `EvaluationPeriods: 1` and `DatapointsToAlarm: 1` with `Period: 60` on a paging alarm | Heartbeats, where one miss is the signal |

## What the alarm measures

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Latency is judged by a percentile, never the average: the average hides a slow tail [T]; Prometheus measures latency with histograms or summaries [R] | `Statistic: Average` (or `avg()`) on a latency metric that pages | A ticket or dashboard alarm |
| Errors are judged as a rate of requests, not a raw count, so the alarm means the same at night and at peak [T] | A threshold on a raw error `Sum` for a service whose traffic varies | Errors that are rare by construction, where one is the incident |
| Page on symptoms; CPU or memory is a cause [T] | A paging alarm on CPU or memory while no error-rate or latency alarm covers the same service | Ticket or dashboard alarms, or a resource that fails hard at saturation (disk full) |

## Actions

- Actions run only when the state changes, except Auto Scaling actions, which repeat every minute while the state holds [R]; a notification expected to repeat while the alarm stays in ALARM never does [O].
- An alarm on a metric math expression cannot take EC2 actions [R].
- A composite alarm cannot take EC2 or Auto Scaling actions, and every child alarm must be in the same account and Region [R]; a composite that references an alarm in another account or Region does not work [O]. Use a composite to stop dependent alarms paging during a known outage [T].
- An alarm with no `OKActions` never says it recovered [T] (low).

## Newer CloudWatch features (as of 2026-10-22)

- Log alarms on a Logs Insights query (`PutLogAlarm`, 2026-07-01), alarm mute rules (`PutAlarmMuteRule`, 2026-02-10) and warm-up periods (`WarmUpConfiguration` on `PutMetricAlarm` and `PutLogAlarm`; launched August or September 2026) exist [R]. A maintenance script that disables alarm actions, where a mute rule would do, and an alarm created with a new resource that alarms during its start-up, where a warm-up period fits, are low-severity findings [O].

## SLOs and burn rates

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Multi-window burn-rate alerting, as the SRE Workbook tabulates it: page at 2 percent of the budget spent in 1 hour (burn rate 14.4) or 5 percent in 6 hours (6); ticket at 10 percent in 3 days (1) [R]. A single-window burn alert is either noisy or late [T] | An SLO alert on one window only, or burn-rate thresholds that do not match the windows they are paired with | The repository documents another policy |
| The four golden signals are latency, traffic, errors and saturation [R]; an SLI is measured from the user's side, not from CPU [T] | An SLO defined on CPU or memory | |

## Not a finding

- A threshold, period count or SLO target you would have chosen differently.
- `Average` on a dashboard or ticket alarm.
- A missing alarm on a resource whose alarms live in another repository the diff does not include: say so as what you could not check.
- A log group's retention (`aws-well-architected` COST04-BP05).
