---
name: modularity-extract
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

Our billing and orders modules import each other, and both write directly to the same customers table. We want to extract billing into its own service. Describe the approach.
