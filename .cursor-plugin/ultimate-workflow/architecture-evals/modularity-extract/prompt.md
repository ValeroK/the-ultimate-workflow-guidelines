---
name: modularity-extract
tags: [modularity, trigger]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

Our billing and orders modules import each other, and both write directly to the same customers table. We want to extract billing into its own service. Describe the approach.
