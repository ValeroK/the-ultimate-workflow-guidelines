---
name: r2-poison-message
tags: [hard, distributed]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Our Python worker sometimes pins a CPU core at 100% and the queue never drains. What is going on?

```python
while True:
    msg = queue.get()
    try:
        handle(msg)
        queue.ack(msg)
    except Exception:
        queue.put(msg)  # try again later
```
