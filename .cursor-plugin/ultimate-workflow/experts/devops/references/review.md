# DevOps engineer review of a diff

## Purpose

Find the delivery and infrastructure-change defects this change introduces that cost something concrete: a resource destroyed or replaced with its data, a build or deploy that cannot be repeated, two deploys racing, a release that cannot be stopped or undone. It restates ideas from vendor documentation and from several open-source agents (see `NOTICE.md`); no text is copied.

## Scope

Report delivery and change-safety problems this change introduces or makes worse. This is not a review of the system's design and not an audit of the whole pipeline.

- A problem that was already there and is untouched is out of scope, unless the change makes it newly reachable.
- Read the infrastructure code, CI workflows, Dockerfiles, manifests and deploy scripts in the repository: that is how you learn how it builds and deploys.
- If the plan has an "Expert input" section, check the diff against what you required there, and report any requirement the diff does not honour.
- The state file, the cloud, the CI settings (branch protection, environment rules) and the cluster are things you cannot see. When a conclusion depends on them, say what you would need and do not report a finding. If a plan or dry-run output is attached, use it.

## Method

1. Learn how this repository does it: the CI workflows, the deploy path, the IaC root and its backend, the Dockerfiles and manifests, how environments are named. Do not assume a platform it does not use.
2. Sort each infrastructure change by what it will do when applied: create, update in place, replace, or destroy. Spend your attention on replace and destroy, and on anything that holds data.
3. Trace each risky path from the run that triggers it to the outcome, with file and line at every step. Resolve every named target: an environment, a job in `needs:`, a Deployment a Service switches to, a module path, an image a manifest pulls must exist with the shape claimed.

A claim that an attribute forces replacement, or that a tool has a given default, must come from a skill in your prompt or a cited page; from memory it is a suspicion. Stop a trace when it reaches the wrong outcome, or when it cannot be completed from the repository: then it stays out. Stop the review when every replace, destroy, pipeline and rollout change in the diff has been traced.

Every finding states the scenario: the run, the deploy or the rollback, and the wrong outcome, in one or two sentences. In a clean result, name the criticality you assumed.

## Categories

Check what the change touches and skip the rest.

- **A change that destroys or replaces data.** A renamed or moved resource or construct with no `moved` block or kept logical id, `count` turned into `for_each`, a changed attribute that forces replacement, a removed resource block, on anything that holds data; name the resource and what is lost. Not when the resource holds nothing that cannot be rebuilt, such as a cache or a stateless function.
- **Protection removed or missing.** A deletion or retention guard (`prevent_destroy`, `DeletionPolicy`, `RemovalPolicy`, deletion protection) removed or set to destroy on a stateful resource the repository otherwise protects; `ignore_changes` on a field the code owns, which hides drift. Not when the plan records that the resource is being retired on purpose.
- **Volumes and persistent data in Kubernetes.** A PVC, StatefulSet or StorageClass change that deletes data: a `Delete` reclaim or retention policy set on a volume that holds data, a PVC dropped from a pruned manifest. Not when the volume holds a cache.
- **Shared or unlocked state.** Two environments writing one state key or workspace, a backend with no locking, state changed by hand-run commands outside the pipeline. Not when the shared key is read-only for one side, through a remote-state data source.
- **A build that cannot be repeated.** A provider, module, chart or base image with no version (a `FROM` with no tag, `latest`, a module `source` with no ref), a lock file deleted or not committed, a CI runtime version that differs from the repository's version file, an image tag reused across builds. Not when the repository pins by digest elsewhere and the tag is only a label next to it.
- **What runs is not what was reviewed.** `apply` without the reviewed plan, production rebuilt from source instead of promoting what staging tested, a task pointed at "latest", a pipeline step that changes the cloud or cluster (`kubectl set image`, a console-only change) while the repository keeps the old value, so the next apply reverts it. Not when the step writes the new value back to the repository in the same run.
- **Deploys that race or stop halfway.** A deploy job with no concurrency group, a group keyed on the branch while several branches deploy to one environment, `cancel-in-progress` on a job that applies infrastructure or migrates data. Not when the target environment is per pull request and torn down after.
- **Promotion skipped.** A production job that does not depend on the staging job, or has no environment so protection rules cannot apply; a path filter or condition that lets a change reach production without the checks others pass. Not when the skipped check is one whose result can pass while skipped (owner: quality).
- **Migration order.** A migration step that runs after the new code is live, inside application start-up on every replica at once, or with a destructive step (drop, rename) in the same release as the code that stops using it. Not when the question is whether old and new versions can share the data (owner: architect).
- **A rollback that no longer works.** The mechanism the repository uses to go back broken by this change: the old tag overwritten or pruned from the deploy host, a one-way step with no way back, a flag removed while code still reads it. Not when the plan names the step as one-way and orders it after the code that no longer needs the old shape.
- **Containers that do not stop or start cleanly.** A shell-form start command that keeps the process from receiving the stop signal, a health check that cannot fail or checks a dependency, `depends_on` that waits for start rather than health when the service needs the dependency ready. Not when an init process such as `tini` forwards signals.
- **Kubernetes rollout and health.** A readiness probe missing behind a Service, a liveness probe that checks a dependency (one outage restarts every pod), a fixed start delay where a startup probe fits, no resource requests on a new container, a rollout or disruption budget that allows zero ready pods or blocks every drain, a selector changed on an existing Deployment, a ConfigMap or Secret change no pod template change carries, so nothing rolls out. Not when the workload is a Job or CronJob with no Service.

## Severity here

- **high**: data destroyed or replaced on apply, a production deploy that races or ships an unreviewed artifact, a rollback made impossible.
- **medium**: the harm needs a condition, such as a manual run, a second branch deploying or a failed rollout, or it is recoverable without data loss.
- **low**: concrete and cheap to fix, such as a missing startup probe on a slow-starting container.

## Do not report

These produce noise. Skip them unless the change makes one concretely harmful and you can state the path.

- A tool, platform or practice the repository does not use (GitOps, a service mesh, policy as code, a new environment, a canary) without a reason from this change.
- Fixed thresholds such as a replica count, a probe interval or a watch time, unless this change makes a value concretely wrong.
- Replica counts, high availability, recovery targets, and whether a rollback is designed at all (owner: architect).
- Trigger trust, workflow permissions, action pins, secrets and IAM (owner: security). A version left unpinned is yours only as "this build cannot be repeated".
- Style and formatting of infrastructure code.
- A pattern the repository already uses consistently, even if you would choose another.
- Anything the plan states and the diff honours.

## One finding, and one candidate dropped

- Reported: `infra/db.tf:3` renames `aws_db_instance.orders` to `aws_db_instance.main` with no `moved` block anywhere in the root module, and `deletion_protection` is not set. The next `terraform apply` in `.github/workflows/deploy.yml:40` destroys the orders database and creates an empty one. Category: a change that destroys or replaces data; severity high. Fix: add `moved { from = aws_db_instance.orders to = aws_db_instance.main }` and set `deletion_protection = true`.
- Dropped: `.github/workflows/deploy.yml:12` has no concurrency group. It looked like a race, but the job deploys only to per-pull-request preview environments that are torn down on close, so two runs never share a target.
