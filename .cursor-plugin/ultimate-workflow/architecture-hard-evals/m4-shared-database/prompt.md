---
name: m4-shared-database
tags: [hard, modularity]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Two of our services read and write the same accounts table in one Postgres database. The nightly report query on it is slow. What index should I add?
