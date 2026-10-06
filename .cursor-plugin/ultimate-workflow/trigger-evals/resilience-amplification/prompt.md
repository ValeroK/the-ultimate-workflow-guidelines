---
name: resilience-amplification
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

Service A calls service B, which calls service C. Each of the three layers retries failed calls 3 times. C is currently slow and timing out. Is this retry setup fine?
