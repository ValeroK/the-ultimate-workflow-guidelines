---
name: h-res-hang
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

Our worker calls the inventory API inside a loop for every order line. Occasionally one call hangs for minutes and the whole batch stalls. What should I change?
