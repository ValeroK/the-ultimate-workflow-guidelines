---
name: modularity-schema-rename
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

In production we need to rename the column amount to total_amount in the orders table. Three different services read it. Just give me the migration.
