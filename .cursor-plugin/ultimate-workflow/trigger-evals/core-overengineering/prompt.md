---
name: core-overengineering
runs: 3
max_turns: 3
timeout_seconds: 120
allowed_tools: [Skill]
---

Our OrderService directly creates a SendGrid client and has a switch statement on channel (email, push). We are adding SMS. Should I add a NotificationStrategy interface hierarchy, a factory and a builder for all of it?
