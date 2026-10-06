---
name: m2-api-field
tags: [hard, modularity]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

We're changing the status field in our public REST API from a string ("active") to an integer enum (1) because it is cleaner. Three internal services and two mobile app versions in the wild read it. Plan: bump the version in the docs and deploy on Tuesday. Anything missing?
