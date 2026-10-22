# Changes

## 2026-10-22: erasure-and-retention

- First data skill, `erasure-and-retention`, at plan and review, from fact-check block J: soft deletes, copies the delete path misses, recipients (GDPR Article 19, CCPA 1798.105), audit rows, topics, restores, store mechanics (S3 versions, PostgreSQL VACUUM, search segments, Kafka tombstones, DynamoDB global tables and PITR), retention that nothing enforces. Needs a deletion baseline; without one it asks in the plan.
- Plan: erasure and retention.
- Not measured.

## 2026-10-20: first version

- Written to the expert templates from the sources in `../NOTICE.md`; no text copied.
- Plan and review only: quality's tests reference already holds the cases.
- No version-specific facts, no migration-tool flags and no skills until the maintainer's live check returns.
- Not measured.

## 2026-10-21: tests stage

- Joins the tests stage (maintainer decision). Cases for concurrent writers, retries, constraints, migrations on realistic data, resumable backfills, query bounds and store behaviour.
