---
name: containers
description: Use when a change adds or changes a Dockerfile or compose file: stop signals, repeatable images, health checks and start order.
---

# Containers

Use this when a change adds or changes a Dockerfile, a `.dockerignore` or a compose file. It holds what decides whether the image can be rebuilt the same way and whether the container starts and stops cleanly. Running as root, capabilities, secrets in build arguments and credentials in the build context are the security expert's; mention them there.

Each fact carries its source: **[D]** Docker's documentation as published on GitHub (`docker/docs`, with the Dockerfile reference vendored from `moby/buildkit`, read 2026-10-20); **[O]** our own reasoning.

## Signals and the main process

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The shell form of `ENTRYPOINT` runs under `/bin/sh -c`, so the app is not PID 1 and does not receive SIGTERM from `docker stop` [D]. Every shell form runs through `/bin/sh -c` [D], so `CMD` in shell form has the same effect [O] | `CMD node server.js` or `ENTRYPOINT ./start.sh` in shell form; a start script that runs the app without `exec` | Exec form (`CMD ["node", "server.js"]`), or an init process (`tini`, `--init`) |
| The shell form of `ENTRYPOINT` ignores `CMD` and `docker run` arguments [D] | A shell-form entry point with a `CMD` meant as its default arguments | |
| A container that ignores SIGTERM is killed after the grace period: compose `stop_grace_period`, Kubernetes `terminationGracePeriodSeconds` [D] | A long shutdown with the default grace | |

## Repeatable images

- Pin a base image to a digest to get the same image even if the publisher replaces the tag [D]. A production `FROM` with no tag or `latest` builds something different later [O]. Who can replace the tag is security's question.
- Run `apt-get update` and `apt-get install` in one `RUN`: `update` alone is cached and installs stale or missing packages [D].
- Once a layer changes, every layer after it is rebuilt; put rarely changing steps first [D]. This is speed, not a finding, unless the order makes a build depend on a stale cached layer [O].
- `COPY . .` with no `.dockerignore` puts untracked local files into the image, so it differs from the commit [O].
- Application dependencies installed without the lock file (`npm install` instead of `npm ci`, pip with no lock) build different trees from one commit [O].

## Health and start order

- Dockerfile `HEALTHCHECK` defaults: interval 30s, timeout 30s, start period 0s, start interval 5s, retries 3; only the last `HEALTHCHECK` counts [D]. Kubernetes does not use it; it has its own probes [O].
- Compose `depends_on` in short form waits only for the dependency to start, not to be ready; `condition: service_healthy` waits for its health check, and `service_completed_successfully` for a one-off job [D]. `service_healthy` on a service with no health check never becomes healthy [O]. Not when the app retries its connections.
- The default user in a container is root [D]; that is security's to report.

## Compose data

- A named volume that is renamed, or a changed project name, starts with an empty volume and leaves the old data behind [O].
