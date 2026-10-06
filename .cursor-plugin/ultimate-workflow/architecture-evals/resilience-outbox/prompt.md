---
name: resilience-outbox
tags: [resilience, hard]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

In one request handler I save an order to my database and then publish an OrderCreated event to a message broker. Sometimes the event is never published after the order is saved. How should I fix this? (Answer from this description alone; there is no repository to inspect.)
