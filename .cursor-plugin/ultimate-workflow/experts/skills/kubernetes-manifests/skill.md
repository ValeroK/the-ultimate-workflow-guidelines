---
name: kubernetes-manifests
description: Use when a change adds or changes Kubernetes workloads or Helm charts: probes, requests, rollout strategy, disruption budgets, shutdown.
---

# Kubernetes manifests

Use this when a change adds or changes Kubernetes workloads, Helm charts or values, or Kustomize overlays. It holds what decides whether a rollout keeps serving, whether pods are restarted for the wrong reason, and whether a change can be applied at all.

Each fact carries its source: **[D]** the Kubernetes documentation as published on GitHub (`kubernetes/website`, read 2026-10-20); **[R]** the maintainer's check of the live helm.sh and kubernetes.io pages, block B (2026-10-22); **[O]** our own reasoning. Do not demand a probe, a budget or an autoscaler the workload does not need: report what this change makes wrong.

## Probes

Defaults [D]: `initialDelaySeconds` 0, `periodSeconds` 10, `timeoutSeconds` 1, `successThreshold` 1 (it must be 1 for liveness and startup), `failureThreshold` 3. A probe endpoint that does real work, left at the 1-second timeout, fails under load [O].

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A failed liveness or startup probe kills the container; a failed readiness probe only takes the pod out of the Service's endpoints. Liveness should pass when the application itself is healthy; readiness may also check the back ends it needs [D] | A `livenessProbe` that calls the database or another service, so one outage of that dependency restarts every pod | Readiness may check what the pod needs to serve |
| While a startup probe has not succeeded, liveness and readiness do not run [D] | A slow-starting app with liveness and no `startupProbe`, its first failure arriving before start-up ends (with the defaults, about 30 seconds) | Fast start, or a `startupProbe` covering the worst case |
| Readiness keeps traffic off pods that cannot serve [D] | A Deployment behind a Service with no `readinessProbe`, so a rollout sends requests to pods still starting [O] | Workloads no Service routes to |
| One low-cost endpoint for both probes, with a higher liveness `failureThreshold`, is the documented common pattern [D] | Liveness and readiness with the same endpoint and the same thresholds, so a busy pod is restarted when it should only leave the endpoints [O] | A higher liveness `failureThreshold` |

## Resources

- A limit with no request makes the request equal to the limit [D].
- A pod with no request or limit on any container is BestEffort and is evicted first, then Burstable, then Guaranteed [D]. A new container with no requests is scheduled blind [O].
- An HPA on CPU utilisation does nothing for that metric if any container in the pod lacks a CPU request [D].
- With an HPA, remove `spec.replicas` from the manifest, or every apply resets the count the autoscaler set [D].

## Rollouts

- The default strategy is `RollingUpdate` with `maxSurge` 25 percent (rounded up) and `maxUnavailable` 25 percent (rounded down); `progressDeadlineSeconds` is 600 and must exceed `minReadySeconds` [D].
- A new revision is created only when `.spec.template` changes [D]. ConfigMap values read as environment variables change only when the pod restarts, and a `subPath` mount never receives updates [D], so a ConfigMap or Secret change that no template change carries rolls out nothing [O]. `revisionHistoryLimit` defaults to 10; set to 0 it makes rollback impossible [D].
- `spec.selector` of an apps/v1 Deployment is immutable [D]: a changed selector or a selector label removed from the template fails the apply, or needs the Deployment deleted and recreated [O].
- A `maxUnavailable` that, with the replica count, allows zero ready pods, or `Recreate` on a serving workload, drops traffic on every rollout [O]. Not for a single-writer workload on a volume that one pod can mount.

## StatefulSets and volumes

- With the default `OrderedReady` policy, a StatefulSet whose new template never becomes Ready is not repaired by reverting the template; the broken pods must also be deleted [D]. Name this when the plan's undo is "roll back the template".
- `persistentVolumeClaimRetentionPolicy` with `whenDeleted: Delete` or `whenScaled: Delete` deletes the PVCs; the default is `Retain` [D]. It needs no feature gate from 1.32 (GA; beta and on by default from 1.27) [R].
- A StorageClass with no `reclaimPolicy` defaults to `Delete` [D]: a released volume is deleted with its data [O]. Not when the volume holds a cache.

## Disruption budgets

- A PodDisruptionBudget limits voluntary disruptions such as drains; involuntary ones count against it but are not prevented, and a Deployment's rolling update is not limited by it [D].
- `minAvailable` equal to the replica count, or `maxUnavailable: 0`, blocks every drain [O]. A budget whose selector matches no pods protects nothing [O].

## Shutdown

- `terminationGracePeriodSeconds` defaults to 30 seconds; `preStop` runs inside it, and if it is still running when the period ends the kubelet adds a one-off 2 seconds [D]. TERM goes to the main process after `preStop` [D].
- Long requests with no `preStop` delay and no grace period to match are cut on every rollout [O].

## Images

- If `imagePullPolicy` is omitted, the tag `:latest` or no tag gives `Always`; any other tag, or a digest, gives `IfNotPresent`; the value is set when the object is created and not updated if the tag changes [D]. A mutable tag with `IfNotPresent` lets nodes run different code under one tag [O].

## Jobs and Helm

- A CronJob's `concurrencyPolicy` defaults to `Allow`, so runs overlap [D]; it may create two Jobs, or none, for one scheduled time, so its Jobs must be idempotent [D]; a `startingDeadlineSeconds` below 10 may never schedule [D].
- Helm resource names come from `.Release.Name` or `fullnameOverride` [R], so changing either renames every resource, which Kubernetes treats as a delete and a create [O].
- A hook with no `helm.sh/hook-delete-policy` gets `before-hook-creation`, so a rerun replaces it rather than failing [R]; `helm uninstall` never removes hook resources [R], so a migration Job or a hook-created Secret outlives the release [O].
