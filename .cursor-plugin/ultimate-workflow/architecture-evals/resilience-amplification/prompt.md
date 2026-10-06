---
name: resilience-amplification
tags: [resilience, hard]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

Service A calls service B, which calls service C. Each of the three layers retries failed calls 3 times. C is currently slow and timing out. Is this retry setup fine?
