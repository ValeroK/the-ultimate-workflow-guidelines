---
name: o1-friday-migration
tags: [hard, operability]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Release plan for Friday 5pm: run ALTER TABLE users DROP COLUMN legacy_id as a migration, then deploy v2 to all pods at once. If anything breaks we redeploy v1. Sign off?
