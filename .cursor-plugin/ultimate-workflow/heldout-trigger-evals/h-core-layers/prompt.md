---
name: h-core-layers
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

Our controllers call the database directly. I am planning to add a repository layer, a service layer and a mapper for every table. Is that worth it?
