---
name: erasure-and-retention
description: Use when a change deletes or anonymises people's data, adds soft deletes, retention or expiry settings, TTL or lifecycle rules, archives, audit or history tables, event topics, or a new column that holds personal data, to find a copy the delete path does not reach - versioned objects, search indexes, topics, replicas, backups, restores - or a retention that is never enforced. Needs a baseline in the repository; without one, it asks in the plan.
verified: 2026-10-22
---

# Erasure and retention

## Goal

- **Lets the expert catch:** a change after which a person's data survives their deletion, or its retention period, in a copy the delete path does not reach: an earlier object version, a search segment, a topic, a replica, an archive, an audit row, a restored backup, a re-import.
- **Applies to:** delete and anonymise paths, soft-delete flags, retention and expiry settings, TTL and lifecycle rules, archive and export jobs, audit and history tables, append-only stores and topics, restore and import scripts, new columns that hold personal data.
- **Not for:** where a value is sent (security, `personal-data-exposure`); backup schedules and recovery objectives (architect); deletion protection on a resource (devops); the retention period's value, and whether a legal duty to keep the data applies (a person decides).

Sources: **[R]** the maintainer's live check of the GDPR (EUR-Lex), the ICO, the CCPA (the CPPA's statute PDF), the eCFR and the S3, DynamoDB, Organizations, Kafka, PostgreSQL and Elastic documentation, block J (2026-10-22); **[T]** agency-agents `privacy-engineer`, awesome-copilot `gdpr-compliant` and ECC's compliance skills (MIT), not checked; **[O]** our own reasoning.

## First, establish the target, and say when there is none

- **The repository's deletion baseline**: a deletion job, an erasure registry, a data map, or schema markers listing where personal data lives.
- **With no baseline**, a new store or column "missing from the deletion path" is a plan question ("this change adds personal data; where is it deleted?"), never a review finding.
- **The retention periods the repository states** (a config file, a policy doc). The period's value is a person's decision; this skill checks that the code enforces it.

## The delete path

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A soft delete is not an erasure unless something later removes the row [O] | `deleted_at` set and nothing in the repository hard-deletes or anonymises such rows | A job that hard-deletes after the stated period |
| A new store, column, cache, index or derived table holding personal data must be on the delete path the repository already has [O] | A new table or index of user data that the deletion job or registry does not list | No baseline (a plan question) |
| An archive or export step copies data outside the path [T] | A nightly export to a bucket, warehouse or vendor that the deletion job does not reach | |
| An erasure is passed on to each recipient the data was disclosed to, unless impossible or disproportionate (GDPR Article 19) [R]; under the CCPA, to service providers, contractors and third parties it was sold or shared to (1798.105(c)) [R] | A deletion that skips one vendor client the repository already calls for others | |
| Audit and history rows that copy before-and-after values keep the deleted person [O] | A new trigger or audit table storing full row images of a personal table | Audit rows that keep ids only |
| An append-only log or topic needs an erasure route (compaction, crypto-shredding) [O] | Personal data published to an event store described as never deleted | |
| A restore or re-import brings a deleted person back [T]; the ICO says backups must be put "beyond use" until they are overwritten [R] | A restore or import script with no step that re-applies deletions | |
| A subject-rights export that misses a new field [O] | A new personal column not added to the export the repository has | |

## Where deleted values survive (store mechanics)

- **S3 with versioning:** a DELETE without a version id adds a delete marker and keeps earlier versions; `NoncurrentVersionExpiration` removes them, asynchronously [R]. Replication does not copy delete markers by default, and markers made by lifecycle rules are never replicated [R].
- **PostgreSQL:** a deleted row's bytes stay in the table files until VACUUM, and WAL archives and base backups keep them [R]. A dropped column's values stay until the table is rewritten [T] (data's own row; its fact is still being checked).
- **Search indexes (Elasticsearch, OpenSearch):** a deleted document stays in its segment until a merge, and snapshots keep old segments [R] (weak source); an async `_delete_by_query` leaves a task document holding the query [R].
- **Kafka:** a key is removed by a tombstone under compaction; tombstones are kept for `delete.retention.ms` (1 day by default), and a delete-policy topic keeps records for `retention.ms` (7 days by default) [R].
- **DynamoDB:** TTL deletes replicate to global table replicas; point-in-time recovery keeps restorable items up to 35 days [R]. TTL units and attribute type are data's own row.
- **Regions:** global tables copy only to configured replicas; an SCP restricts Regions with `aws:RequestedRegion`, exempting global services through `NotAction` [R]. Where stores live is the architect's.

## Retention

- A retention setting that nothing enforces (a config value no job reads, a column `expires_at` no query checks) is a finding where the repository states the period [O].
- HIPAA's six-year retention (45 CFR 164.316(b)(2)) applies to the required policies and documentation, not to raw audit logs; 164.312(b) states no retention [R]. Do not cite it for log retention.

## Excuses that do not hold

- "GDPR gives us 30 days": Article 17 says "without undue delay", and Article 12(3) gives one month to act on a request, extendable by two more [R]. The timing is a person's question; the code just has to reach every copy.
- "Backups expire anyway": put them beyond use until they do, and re-apply deletions on restore [R].
- "It is soft-deleted": see the first row.

## Not a finding

- A record the repository marks as kept for a legal reason.
- A backup that ages out on a documented schedule.
- A cache entry whose TTL is shorter than the deletion deadline the repository states.
- A retention period you would have set differently.
