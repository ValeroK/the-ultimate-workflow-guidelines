# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| Kubernetes documentation, as published in kubernetes/website (commit 1ad9080, 2026-10-20): probes, pod lifecycle, managing resources, pod QoS, Deployments, PodDisruptionBudgets and disruptions, images, HorizontalPodAutoscaler | CC BY 4.0 | Every fact marked [D] |
| github/awesome-copilot `platform-sre-kubernetes`; affaan-m/ECC `kubernetes-patterns` | MIT | Liveness checking a dependency, probe duplication, Job restart policy, CronJob overlap, Helm renames and hooks. Marked [T] where not in the documentation. Their fixed replica counts and limit ratios were not taken |

Left out: `securityContext`, RBAC, NetworkPolicy and Secrets (the security expert); replica counts and high availability (the architect); "every pod needs all three probes".
