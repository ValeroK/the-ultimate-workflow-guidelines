---
name: resilience-retry
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

My order service calls a third-party payments API to charge cards. It sometimes times out. Design the call and add retry logic so it is reliable.
