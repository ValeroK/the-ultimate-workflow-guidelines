---
name: resilience-retry
tags: [resilience, trigger]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

My order service calls a third-party payments API to charge cards. It sometimes times out. Design the call and add retry logic so it is reliable. (Answer from this description alone; there is no repository to inspect.)
