---
name: m3-common-library
tags: [hard, modularity]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

We run 12 microservices. To cut duplication I want a single company-common library with all our DTOs, utility functions and the database entity classes, and every service imports it, versioned and released together. Good idea?
