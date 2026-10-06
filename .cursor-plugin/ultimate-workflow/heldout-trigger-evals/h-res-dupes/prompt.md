---
name: h-res-dupes
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

We consume messages from a broker and sometimes the same message is handled twice, which sends customers duplicate emails. Advice?
