# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| Docker documentation, as published in docker/docs (commit 5bd4f66, 2026-10-20), including the Dockerfile reference vendored from moby/buildkit: shell and exec forms, `HEALTHCHECK`, build best practices, build cache, compose startup order and services reference, `docker run` reference | Apache-2.0 | Every fact marked [D] |
| docker/skills `docker-build-strategies`, `docker-compose-patterns` | Apache-2.0 | The checklist shape for builds and compose; their security items were routed to the security expert |

Left out: non-root users, capabilities, secrets in build arguments (the security expert), image size and layer order as findings.
