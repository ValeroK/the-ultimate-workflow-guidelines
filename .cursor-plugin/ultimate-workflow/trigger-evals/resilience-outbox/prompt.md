---
name: resilience-outbox
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

In one request handler I save an order to my database and then publish an OrderCreated event to a message broker. Sometimes the event is never published after the order is saved. How should I fix this?
