# Kubernetes manifests

Use this when a change adds or changes Kubernetes workloads, Helm charts or values, or Kustomize overlays. It holds what decides whether a rollout keeps serving, whether pods are restarted for the wrong reason, and whether a change can be applied at all.

Each fact carries its source: **[D]** the Kubernetes documentation as published on GitHub (`kubernetes/website`, read 2026-10-20); **[T]** an upstream community skill, not checked against the documentation; **[O]** our own reasoning. Do not demand a probe, a budget or an autoscaler the workload does not need: report what this change makes wrong.

## Probes

Defaults [D]: `initialDelaySeconds` 0, `periodSeconds` 10, `timeoutSeconds` 1, `successThreshold` 1 (it must be 1 for liveness and startup), `failureThreshold` 3.

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A failed liveness or startup probe kills the container; a failed readiness probe only takes the pod out of the Service's endpoints [D] | A `livenessProbe` that calls the database or another service, so one outage of that dependency restarts every pod [O] | Readiness may check what the pod needs to serve |
| While a startup probe has not succeeded, liveness and readiness do not run [D] | A slow-starting app with liveness and no `startupProbe`, its first failure arriving before start-up ends (with the defaults, about 30 seconds) | Fast start, or a `startupProbe` covering the worst case |
| Readiness keeps traffic off pods that cannot serve [D] | A Deployment behind a Service with no `readinessProbe`, so a rollout sends requests to pods still starting [O] | Workloads no Service routes to |
| A probe's timeout is 1 second unless set [D] | A probe endpoint that does real work, with the default timeout | |
| The same endpoint and thresholds for liveness and readiness restart a pod that is only busy [T] | Copy-pasted probes | |

## Resources

- CPU over the limit is throttled; memory over the limit can be OOM-killed, but only when the kernel acts, so the kill may come later [D].
- A limit with no request makes the request equal to the limit [D].
- A pod with no request or limit on any container is BestEffort and is evicted first, then Burstable, then Guaranteed [D]. A new container with no requests is scheduled blind [O].
- An HPA on CPU utilisation does nothing for that metric if any container in the pod lacks a CPU request [D].
- With an HPA, remove `spec.replicas` from the manifest, or every apply resets the count the autoscaler set [D].

## Rollouts

- The default strategy is `RollingUpdate` with `maxSurge` 25 percent (rounded up) and `maxUnavailable` 25 percent (rounded down); `progressDeadlineSeconds` is 600 and must exceed `minReadySeconds` [D].
- A new revision is created only when `.spec.template` changes [D]. `revisionHistoryLimit` defaults to 10; set to 0 it makes rollback impossible [D].
- `spec.selector` of an apps/v1 Deployment is immutable [D]: a changed selector or a selector label removed from the template fails the apply, or needs the Deployment deleted and recreated [O].
- A `maxUnavailable` that, with the replica count, allows zero ready pods, or `Recreate` on a serving workload, drops traffic on every rollout [O]. Not for a single-writer workload on a volume that one pod can mount.

## Disruption budgets

- A PodDisruptionBudget limits voluntary disruptions such as drains; involuntary ones count against it but are not prevented, and a Deployment's rolling update is not limited by it [D].
- `minAvailable` equal to the replica count, or `maxUnavailable: 0`, blocks every drain [O]. A budget whose selector matches no pods protects nothing [O].

## Shutdown

- `terminationGracePeriodSeconds` defaults to 30 seconds; `preStop` runs inside it, and if it is still running when the period ends the kubelet adds a one-off 2 seconds [D]. TERM goes to the main process after `preStop` [D].
- Long requests with no `preStop` delay and no grace period to match are cut on every rollout [O].

## Images

- If `imagePullPolicy` is omitted, the tag `:latest` or no tag gives `Always`; any other tag, or a digest, gives `IfNotPresent`; the value is set when the object is created and not updated if the tag changes [D]. A mutable tag with `IfNotPresent` lets nodes run different code under one tag [O].

## Jobs and Helm

- A Job with `restartPolicy: Always` is rejected; a CronJob with `concurrencyPolicy: Allow` runs overlapping copies of work that may not be safe twice [T].
- A changed Helm release name or `fullnameOverride` renames every resource, which is a delete and a create [T]. A migration hook with no delete policy leaves the old Job and blocks the next run [T].
