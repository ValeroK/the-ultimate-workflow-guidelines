# DevOps engineer input to a plan

**Outcome of this stage:** the plan says what the infrastructure change will do when applied, how the build is repeated, what is promoted to production and in which order, and how the release is undone, so the build follows it and the review can hold the diff to it.

## Questions

Read the draft, then find how this repository builds and deploys: the CI workflows, the deploy path, the IaC root and its backend, the Dockerfiles and manifests, the environments. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **What the apply does.** For each resource it touches: created, updated in place, replaced, or destroyed. Anything replaced or destroyed that holds data (a database, bucket, volume, queue, key) names its protection, or a stated reason it may go. A rename or move in code names its `moved` block, kept logical id or import.
- **State.** Which state or stack the change lands in, whether environments share it, and how two runs are kept from writing it at once.
- **Who else applies it.** Other root modules, importers of a stack export, consumers of a module whose `moved` history the change edits.
- **Repeatable builds.** Provider, module, chart, base image and runtime versions pinned, and the lock files committed. The artifact is tagged from the commit.
- **What is promoted.** The artifact built once, the path it takes through the environments to production, the check at each step, and which job applies from which reviewed plan.
- **Deploy order and concurrency.** What runs first (infrastructure, migration, code, flag), what stops a deploy, and what keeps two deploys to one environment from running at once.
- **Undo.** The mechanism that takes production back (a previous tag, `rollout undo`, an alias, a flag), and the steps it cannot undo, such as a destructive migration or a deleted volume, which then need their own order.
- **Runtime health.** For a new container or workload: how it reports ready and healthy, and that it stops cleanly on the platform's stop signal.
- **How it is checked before merge.** The command CI runs to validate the change (format, validate, plan, schema check).

## When the plan makes a one-way choice

For a new state backend, a change of IaC tool, a new deploy platform or a destroyed data store, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "`aws_db_instance.main` keeps its address: the rename ships with a `moved` block, and the CI plan shows 0 to destroy." It names the resource, the mechanism and the check, and someone else can verify it in the diff and the plan output.
- Rejected: "Add a canary," for a service with no live traffic. It is heavier than the workload needs and names no failure it would catch.

## In this domain

- **constraints** name the resource, file, job or setting they bind; the summary names the criticality you assumed.
- **questions** are the user's decisions: whether a resource may be destroyed, who approves a production deploy, whether the team will run a tool the plan brings in.
- Do not ask for a new environment, a canary, GitOps, a service mesh or a platform the repository does not run without a reason from the workload.
