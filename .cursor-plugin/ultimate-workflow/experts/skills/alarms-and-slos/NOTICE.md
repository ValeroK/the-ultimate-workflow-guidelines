# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| aws/agent-toolkit-for-aws `aws-observability` and its CloudWatch references | Read 2026-10-21 | Apache-2.0 | Missing-data treatment per metric type, M of N, percentiles over averages, rates over counts |
| alirezarezvani/claude-skills `slo-architect`, `observability-designer` | Read 2026-10-21 | MIT | Symptoms over causes, multi-window burn rates, dependent alert suppression |
| itsmostafa/aws-agent-skills `cloudwatch`; addyosmani/agent-skills `observability-and-instrumentation` | Read 2026-10-21 | MIT | OK actions, mute rules and warm-up, alerting on symptoms |
| CloudWatch user guide and API reference; AWS what's new; sre.google (SRE book and Workbook); prometheus.io | Checked live by the maintainer, 2026-10-22 (blocks H and H2) | Vendor documentation and books | Every fact marked [R] |

What is marked [O] is our own reasoning.

Left out, and why: recommended thresholds and period counts (calibrate to the workload); dashboard design; incident process; the ADOT Collector version that accepts W3C trace ids (secondary sources only).
