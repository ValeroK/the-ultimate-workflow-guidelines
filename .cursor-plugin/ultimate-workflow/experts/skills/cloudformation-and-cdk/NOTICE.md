# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| AWS CloudFormation user guide, as last published in awsdocs/aws-cloudformation-user-guide (commit 19dc52c, 2023-12-07, the parent of the commit that removed the content): update behaviours, `aws-properties-name.md`, DeletionPolicy and UpdateReplacePolicy, limits, change sets, drift, stack protection, `UPDATE_ROLLBACK_FAILED`, dynamic references | CC BY-SA 4.0 (documentation); facts restated, no text copied | Every fact marked [G] |
| AWS CDK developer guide, awsdocs/aws-cdk-guide (commit c362838, 2026-10-14): identifiers, resources and removal policies, context, feature flags, bootstrapping | AWS documentation | Every fact marked [D] |
| AWS Lambda developer guide (awsdocs, 2023-10-30) quotas; Amazon API Gateway developer guide (awsdocs, 2023-06-29) | AWS documentation | Lambda package and layer limits; redeploying a REST API |
| aws/agent-toolkit-for-aws `aws-cloudformation` (`template-safety-guidance.md`) and `aws-cdk` (`refactor-and-prevent-replacement.md`, `troubleshooting-deployment.md`) | Apache-2.0 | Retained resources left unmanaged, export deadlocks, shared Conditions, hotswap. Marked [T] |

Left out: the toolkit's attribution marker and metadata rules (its own process), security group and encryption checks (the security expert), backups and immutable infrastructure (the architect's `aws-well-architected`), and "Conditional" as a change-set Replacement value, which the 2023 guide does not show.
