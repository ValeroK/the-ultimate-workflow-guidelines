# DevOps engineer expert: sources, what was combined, and its skills

The DevOps engineer owns how a change is built, shipped and changed: what an infrastructure change will replace or destroy (Terraform, CloudFormation, SAM, CDK), state and drift, whether a build and a deploy can be repeated from the repository, containers, Kubernetes manifests, pipelines and their deploy order, and how a release is stopped and undone. It joins at plan, build and review.

**Like the developer, not like the other experts, at build.** Infrastructure is code the implementer writes, so this expert has a build brief, as the developer does. The difference: the developer's brief loads on every build, while the DevOps brief joins only when the plan names infrastructure, workflow, container or manifest files, or describes such a change (a build brief with no `always` skill is conditional; `experts.js`). Both briefs load on a mixed change, which is the common case: a handler and its CDK stack, a service and its Dockerfile. CDK code is also TypeScript or Python, so the developer's language skills still apply to it. At plan and review a model chooses the experts; the developer's description now says it is not for infrastructure, workflow, container or manifest files on their own, so an infrastructure-only change gets DevOps instead of the developer.

## Boundaries

| Concern | Owner |
|---|---|
| What the system is made of, how it fails, high availability, whether a rollback is designed at all, data compatibility across versions (Two versions at once, Moving existing data) | architect |
| CI workflow security (`pull_request_target`, `workflow_run`, fork-reachable secrets, `permissions`, actions pinned to a commit, OIDC), secrets, IAM, `securityContext` | security |
| Whether a test, a check or a gate can fail | quality |
| What an apply replaces or destroys, state, a build that cannot be repeated, promotion, deploy concurrency, migration order in the pipeline, a rollback this change breaks, container signals and health, Kubernetes rollout and probes | devops |

Two splits are deliberate. A version left unpinned (a provider, module, chart or base image) is DevOps's only as "this build cannot be repeated"; who can move that reference is security's. A post-deploy check whose failure neither stops nor rolls back the deploy is DevOps's for the wiring and quality's for the check itself. The architect's Operability category was narrowed on the same day so the two do not raise the same finding.

## 1. The upstream agents compared

Eighteen upstream agents were read on 2026-10-20 (licences in `.cursor-plugin/ultimate-workflow/experts/devops/NOTICE.md`). None reviews an infrastructure change for what it will replace or destroy, with evidence from the diff. `prevent_destroy`, `moved` and `import` blocks, deletion and replacement policies, CDK logical ids, Helm and compose appear in no upstream agent; that core was written from the vendors' documentation.

| Source | What it was good for | Why not more |
|---|---|---|
| awesome-copilot `terraform-iac-reviewer` | Sorting by create, update, replace, destroy; pins; state locking; lifecycle rules | Closest to the scope, still a checklist |
| awesome-copilot `platform-sre-kubernetes` | Probes, disruption budgets, rollout strategy, image identity | Fixed replica counts and thresholds |
| awesome-copilot `github-actions-expert`, `se-gitops-ci-specialist` | Deploy concurrency, cache keys, runtime versions in CI, image tags from the commit | Mostly CI security, which is security's |
| awesome-copilot `gem-devops`, awslabs aidlc `pipeline-deploy-agent` | Plan before apply; promotion; forward-only migrations | Executors that apply and deploy |
| wshobson and buildwithclaude `deployment-engineer`, `terraform-specialist`, `kubernetes-architect`, `devops-troubleshooter` | Build once, import and move, version constraints | Catalogues; Kubernetes- and GitOps-first; the buildwithclaude files copy wshobson's |
| agency-agents `devops-automator`, `platform-engineer`, `git-workflow-master` | Hazards its own examples show: a launch template on "latest", a blue-green switch to a Deployment that does not exist, `kubectl` changes the repository does not hold | Persona |
| alirezarezvani `devops-engineer` | Boring technology, an orchestrator sized to the team | Persona with slash commands |
| awesome-copilot `devops-expert`, `terraform-aws-planning` | Nothing beyond the above | Generic; "fetch the latest module version" contradicts pinning |

Not taken anywhere: personas, executors, fixed thresholds (replica counts, watch times, latency targets), Kubernetes-first, GitOps-first or service-mesh-first defaults, DORA tracking, SBOMs, policy as code and chaos engineering as checklist items. Where sources disagreed (requests against limits, tags against digests, push against pull deploys, how rollback works) the expert follows the repository's own convention and reports only what this change makes wrong.

## 2. What the expert holds

- **Review, eleven categories:** a change that destroys or replaces data; protection removed or missing; shared or unlocked state; a build that cannot be repeated; what runs is not what was reviewed; deploys that race or stop halfway; promotion skipped; migration order; a rollback that no longer works; containers that do not stop or start cleanly; Kubernetes rollout and health.
- **Review, method:** sort infrastructure changes by create, update, replace and destroy and spend attention on replace and destroy; a replacement or a default claimed from memory is a suspicion; resolve every named target (an environment, a `needs:` job, a Deployment a Service switches to).
- **Plan:** what the apply will do to each resource and what protects data; state; repeatable builds; what is promoted and through which environments; deploy order and concurrency; the exact undo and what it cannot undo; runtime health; the command CI runs to validate.
- **Build brief:** follow the repository's layout and run its validation commands; never apply or deploy against a real environment; a data-holding resource keeps its identity; pin as the repository pins and commit lock files; build once; one concurrency group per environment; exec-form start commands.

## 3. The skills this expert needs

Every number was checked against the vendor's own documentation as published on GitHub on 2026-10-20 (template C): `github/docs`, `docker/docs`, `kubernetes/website`, `hashicorp/web-unified-docs` and the live `awsdocs/aws-cdk-guide`, plus the CloudFormation user guide as last published in December 2023. Of 48 claims, 44 were confirmed in full and four in part, none was contradicted, and the four unconfirmed halves were left out or marked as our own reasoning (a CMD-specific PID 1 sentence, a stale saved plan being rejected, "Conditional" as a change-set value, a CDK removal default for resources without data).

| Skill | What it holds | Review selector | Build | Plan |
|---|---|---|---|---|
| `terraform-change-safety` | Address changes and `moved`, removing a block, `prevent_destroy`, `count` index identity, lifecycle rules, version floors, pins and the lock file, state and backend, `-target` | `files: *.tf, *.tf.json, *.tfvars, .terraform.lock.hcl, terragrunt.hcl` | same files, or "Terraform" in the plan | offered |
| `cloudformation-and-cdk` | Update behaviours, custom names, logical and construct ids, DeletionPolicy and UpdateReplacePolicy, CDK removal policies, exports, change sets, drift, failed rollbacks, limits, context and feature flags, Lambda package limits, REST API redeploys | template and CDK config files, or added lines with SAM types, deletion policies, imports or CDK imports | the same, or CloudFormation, SAM or CDK in the plan | offered |
| `kubernetes-manifests` | Probe defaults and semantics, requests and limits, HPA, rollout defaults, revisions, the immutable selector, disruption budgets, shutdown, image pull policy, Jobs and Helm | Helm and Kustomize files, or added lines with probes, rollout fields, budgets or workload kinds | the same, or Kubernetes, Helm or kubectl in the plan | offered |
| `pipelines-and-deploys` | GitHub Actions first: the commit a `pull_request` or `workflow_run` run really builds, fresh runners per job, the default shell without `pipefail`, `always()` on deploys, matrix fail-fast, empty secrets in reusable workflows, `-latest` runner labels; then build once, immutable deploy ids, promotion, applying the reviewed plan, environment gates, skipped checks, concurrency semantics, time and size limits, schedules, `GITHUB_TOKEN` events, caches and artifacts | `files: .github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, buildspec.yml, appspec.yml, Jenkinsfile, action.yml` and their variants | the same, or GitHub Actions, GitLab CI or a deploy job in the plan | offered |
| `release-safety` | Flag defaults and removal order, canary signals, stalled analysis, strategy downgrades, migrations in the release, something to roll back to | added lines naming a flag SDK, CodeDeploy or AppConfig, a canary rollout, a migration command or an image lifecycle rule | the same, or feature flags, canary releases or traffic shifting in the plan | offered |
| `containers` | Exec and shell forms and SIGTERM, base image pins, `apt-get`, layer cache, `.dockerignore`, lock files, `HEALTHCHECK` defaults, compose start order, volumes | Dockerfiles, Containerfiles, `.dockerignore`, compose files | the same, or Dockerfile, compose or container image in the plan | offered |

Order is priority. All six together are about 39 KB after round 2, under the 40 KB cap, so nothing is dropped even when one change touches every area (a test holds it). Any further row needs a cut elsewhere first. Selectors can now name a path (`.github/workflows/*.yml`), which this expert needed: before, a `files:` glob matched base names only, and `*.yml` would have loaded the pipeline skill on every YAML file.

Each fact says where it comes from: **[D]** the vendor's documentation as published on GitHub in October 2026, **[G]** the CloudFormation, Lambda and API Gateway guides as published until 2023, **[T]** an upstream community skill not checked against documentation, **[O]** our own reasoning. **[R]** marks what the maintainer's live checks of the vendor pages confirmed or added: a first pass on 2026-10-20 and round 2 (block B, 27 claims and 10 extras) on 2026-10-22 (`docs/research/fact-check-replies-2026-10-22.md`). Round 2 settled the [T] rows: each was confirmed and retagged, rewritten where the page said otherwise (Helm's default hook delete policy is `before-hook-creation`; express mode can be rolled back; `--hotswap` falls back only with `--hotswap-fallback`), or reclassified as our own reasoning where no vendor page would hold it. The rows the value test cut are gone, and the ledger's confirmed missing items (section 4a) are in, apart from 4a 23's fallback half, which the live page contradicts. One [T] row is left: a canary analysis with no data stays inconclusive, which only secondary pages state.

**Known gaps.** A change that only deletes lines (a removed `environment:` or rollback alarm) does not trigger an `added:` selector; skills selected by file name are unaffected. GitLab CI is barely covered: one rule is verified (`when: manual` outside `rules:` is allowed to fail by default); the rest is marked as unchecked in `pipelines-and-deploys`. CloudFormation template quotas were re-checked live on 2026-10-22.

## Rejected or deferred

- Upstream skills dropped: Docker's destructive CLI guardrails and project scaffolding, ECC's `canary-watch` (runtime actions), awesome-copilot's `devops-rollout-plan` (a communication plan), alirezarezvani's script wrappers, Jeffallan's lists (one recommends the deprecated `terraform refresh`), AWS's container routers (no content).
- Terraform style and naming, test syntax (quality), and efficiency savings in CI (cost, and a narrower trigger can hide a required check).
- Arbitrary abort thresholds, ring percentages and flag lifetimes.

Optional steps (playbook): both the upstream comparison and the upstream skill proposal were run for this expert. The comparison yielded about a dozen ideas and none of the core; it is the run that made the comparison optional.

## Items routed from the architect's research

| Item | Decision |
|---|---|
| REST API redeploy after configuration changes | Taken: `cloudformation-and-cdk` |
| Package and layer limits | Taken: `cloudformation-and-cdk` (Lambda guide, 2023) |
| Canary deployments | Taken as mechanics in `release-safety`; whether to have one stays the architect's |
| CI/CD and staging guidance | Taken: `pipelines-and-deploys` and the plan reference |
| Choosing an IaC tool | Rejected: a design decision, the architect's |
| SnapStart, CloudFront deploy steps, Route 53 aliases, NAT build procedures | Deferred: no verified source read; research prompt 8 |
| Cache client pool settings | Rejected here: the developer's or the architect's |
| Fault-injection logging and reports | Routed to observability, now skills: alarms with the architect, telemetry in code with the developer (maintainer decision 2026-10-21) |

## Routed to other experts

| Expert | Items |
|---|---|
| Security | Action pinning, workflow `permissions`, OIDC, cache trust across privilege, Dependabot for actions, secrets in build arguments and image layers, non-root users, `securityContext`, RBAC, NetworkPolicy, secrets in Terraform state, security groups |
| Quality | `continue-on-error`, allowed failures, required checks skipped by path filters, Terraform test syntax |
| Architect | Replica counts and availability, disaster recovery, whether a canary or kill switch is needed (OPS06, REL05), immutable infrastructure, the choice of orchestrator and IaC tool |
| Data | Migration SQL, destructive DDL timing, backup and point-in-time recovery settings |
| Observability | Post-deploy monitoring, abort thresholds, dashboards |

## Not measured

No corpus exists for this expert. Proposed first cases, each a planted defect a plain reviewer may miss: a renamed Terraform resource holding a database with no `moved` block; a shell-form `CMD`, so the process never receives SIGTERM; a production deploy job with no concurrency group and `cancel-in-progress: true` on the apply; `DeletionPolicy: Retain` on a table whose change requires replacement, with no `UpdateReplacePolicy`; a liveness probe that calls the database. The same cases would give the architect's unmeasured AWS skills something to be tested against.
