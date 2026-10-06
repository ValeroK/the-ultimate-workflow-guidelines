---
name: operability-guidelines
description: Use when the question is about running software in production: releases, deploys, rollback, outages, uptime or availability targets (SLO, 99.9x), monitoring, logging, metrics, tracing, alerting or paging, health checks, runbooks, config and secrets, backups, go-live or production readiness. Loads the production-readiness checklist (reliability target, observability, symptom-based alerts, rollback path, cost drivers). Load before advising. Not for in-code retries and timeouts.
license: LicenseRef-MIT-Attribution
---

# Operability Guidelines

Software that cannot be observed, released, or undone safely is unfinished. Design operability **with** the feature, not after the first incident. Rules are stated as outcomes so they apply on any platform.

## 1. Define "working" with a number

Reliability needs a target that users would notice. Express it as:

- an **indicator**: a measured ratio such as the fraction of requests that succeed fast enough;
- an **objective**: the target for it over a window (for example 99.9% over 30 days);
- an **error budget**: the allowed shortfall, which is what you spend on risky changes and what triggers slowing down when exhausted.

Pick indicators from the user's perspective (availability, latency, correctness, freshness). Do not set objectives tighter than the users need or the business will pay for; each extra nine costs disproportionately. If no number exists, record an explicit assumption.

## 2. Make it observable

For every new component or flow, make sure it emits enough to answer "what is it doing and is it healthy" without a code change:

- **Metrics** for the key signals: latency, traffic, errors, and saturation of the resource that limits it.
- **Structured logs** with a correlation or request identifier that spans the call chain, at levels that distinguish normal from actionable.
- **Traces** across process boundaries where a request fans out.
- A **health signal** that reflects ability to serve (dependencies included where that is meaningful), separate from "process is up".

Never log secrets or personal data. Cardinality matters: do not put unbounded values (user ids, raw urls) in metric labels.

## 3. Alert on symptoms, not causes

Page a human only for conditions that are **urgent, user-affecting, and need action now**; tie these to the objective (budget burning fast). Cause-level signals (CPU, one node down) are for dashboards and diagnosis. Every alert needs a link to what to check first. An alert nobody acts on is noise to be deleted.

## 4. Release so you can undo it

- **Small, frequent, reversible** changes beat large rare ones.
- Roll out **progressively**: expose a small slice, compare its indicators against the rest, then widen; stop automatically on regression.
- **Separate deploy from release** with a feature flag for risky behaviour; remove the flag when finished.
- Every change has a stated **rollback path** and you know its cost. Schema and data changes are the hard case: use expand-then-contract so the previous version still works against the new data, and never ship a change that cannot be rolled back without data loss unless the user has approved that explicitly.
- Migrations must be safe to run twice, resumable, and rehearsed on realistic data volume.

## 5. Configuration and secrets

Config that differs per environment lives outside the code and is validated at startup (fail fast on missing or malformed values). Secrets come from the platform's secret mechanism, are never committed or logged, and are rotatable. Defaults should be the safe choice.

## 6. Prepare for the bad day

- Know the **recovery targets**: how much data loss and how long an outage is acceptable. Backups that have never been restored are a hope, not a control; verify a restore.
- Have a short **runbook** for each alert and each known failure mode. The 3 a.m. reader is tired and new to the code.
- After an incident, write what happened, why, and what changes; fix the system, not the person.

## 7. Cost is a quality attribute

Note the cost drivers of a design (storage growth, egress, per-request charges, always-on capacity) and whether they scale with usage as intended. A design that works but whose cost grows faster than value is a defect found late.

## Before you say done

Report each as verified, not verified (and why), or not applicable:

- [ ] The change emits the metrics and logs needed to tell if it is healthy.
- [ ] There is a stated rollback path, and data changes are backward compatible.
- [ ] Any new alert is symptom-based, actionable, and linked to a first step.
- [ ] Config and secrets are validated and kept out of code and logs.
- [ ] Reliability objective and cost drivers are stated or flagged as assumptions.

## When to skip

Throwaway scripts and local-only tooling with no deployment or users.
