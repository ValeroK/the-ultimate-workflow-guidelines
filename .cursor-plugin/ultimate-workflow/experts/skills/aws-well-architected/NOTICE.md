# Notice

This skill is written in our own words. No text is copied. Best-practice IDs and titles are cited so a reader can find the source; they are references, not quoted content.

Researched on 2026-10-20 by the maintainer, with pages fetched from AWS documentation and pricing pages. The research record, "AWS Well-Architected research, 2026-10-20", is kept in the source repository's docs folder, not in the plugin.

| Source | Version | What it informed |
|---|---|---|
| AWS Well-Architected Framework, pillars and appendix of questions and best practices (docs.aws.amazon.com/wellarchitected/latest/framework/appendix.html and each pillar's pages) | Operational Excellence, Security, Reliability, Performance Efficiency and Sustainability pillars dated November 6, 2024; Cost Optimization pillar dated June 27, 2024 | The best-practice IDs and titles, and which of them a change can show |
| Reliability pillar, REL13-BP02 (docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html) | November 6, 2024 | The four disaster recovery strategies and their RPO and RTO bands |
| Serverless Applications Lens, general design principles | July 14, 2022 | Orchestrate with state machines rather than chained functions; design for failures and duplicates |
| Amazon VPC pricing (aws.amazon.com/vpc/pricing/) | fetched 2026-10-20 | NAT gateway data processing at $0.045 per GB; cross-zone data at $0.01 per GB each way |
| VPC endpoints for S3 (docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html) and PrivateLink pricing (aws.amazon.com/privatelink/pricing/) | fetched 2026-10-20 | Gateway endpoints at no cost; interface endpoints charged per ENI hour and per GB |
| SQS developer guide, available CloudWatch metrics (docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html) | fetched 2026-10-20 | The dead-letter queue alarm on `ApproximateNumberOfMessagesVisible` |
| AWS SDK for Go, Lambda API reference | fetched 2026-10-20 | `ScalingConfig.MaximumConcurrency` with a minimum of 2 |
| AWS re:Post and documentation snippets quoting the Lambda quotas page (secondary: the quotas table itself was not readable in the fetch) | fetched 2026-10-20 | The 900-second maximum invocation time |

What is ours, not AWS's: which best practices count as visible in a change, the "what it looks like" column (several rows follow the research's own suggestions, which AWS does not publish), the "when it does not apply" column, the mapping of a dead-letter alarm, a consumer cap and the 900-second limit to best-practice IDs, and the Lambda default timeout, HTTP versus REST API and Standard versus Express Step Functions notes.

Left out on purpose: about 45 percent of the best practices, which concern process or organisation and cannot be seen in a change; the Security pillar, which the security expert owns; the Generative AI lens, kept for a separate expert; and vendor headline figures (Graviton "up to 40 percent", prompt caching "up to 90 percent", the latter from a secondary source only).

AWS documentation pages fetched during the research carried a banner addressed to AI coding agents, offering a setup prompt. It was treated as page data and ignored. An expert that fetches AWS pages must do the same.
