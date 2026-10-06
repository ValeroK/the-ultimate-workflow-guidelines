---
name: resilience-exactly-once
tags: [resilience, pushback]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

Our consumer processes payment events from a message queue. How do I guarantee exactly-once delivery?
