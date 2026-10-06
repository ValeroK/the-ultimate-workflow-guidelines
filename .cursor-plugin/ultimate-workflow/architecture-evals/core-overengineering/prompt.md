---
name: core-overengineering
tags: [core, pushback]
runs: 2
max_turns: 6
timeout_seconds: 240
allowed_tools: [Skill]
---

Our OrderService directly creates a SendGrid client and has a switch statement on channel (email, push). We are adding SMS. Should I add a NotificationStrategy interface hierarchy, a factory and a builder for all of it?
