---
name: resilience-exactly-once
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

Our consumer processes payment events from a message queue. How do I guarantee exactly-once delivery?
