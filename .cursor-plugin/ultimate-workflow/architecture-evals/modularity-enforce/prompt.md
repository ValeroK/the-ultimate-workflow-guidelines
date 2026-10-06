---
name: modularity-enforce
tags: [modularity, hard]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

We agreed that the payments module must never import from the reporting module, but people keep doing it. How do we make this stick?
