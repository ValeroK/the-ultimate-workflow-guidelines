---
name: modularity-schema-rename
tags: [modularity, migration]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

In production we need to rename the column amount to total_amount in the orders table. Three different services read it. Just give me the migration.
