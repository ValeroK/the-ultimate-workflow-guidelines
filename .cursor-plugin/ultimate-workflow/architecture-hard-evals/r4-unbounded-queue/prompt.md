---
name: r4-unbounded-queue
tags: [hard, distributed]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Memory on our API pods climbs during dependency outages until they get OOM-killed. Why?

```java
ExecutorService pool = Executors.newFixedThreadPool(50);   // default queue
public Future<Report> generate(Request req) {
    return pool.submit(() -> reportService.fetch(req));    // HTTP call, no timeout configured
}
```
