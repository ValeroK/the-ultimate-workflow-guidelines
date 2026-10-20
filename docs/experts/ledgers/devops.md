# Extraction ledger: devops

Audited 2026-10-20. Sources: 73 read, 1 unreachable, 2 with no file to audit.

Totals: 621 items (264 taken, 119 routed, 198 rejected, 40 missing). Today's rows: 196 judged (167 keep, 20 cut, 8 merge, 1 missing section). Of the 73 sources read, 51 are cited by a NOTICE or the expert's docs, and 22 were read in the skill survey and are cited by none (section 1d).

Scope: the DevOps engineer expert (`agents/uw-expert-devops.md`, `experts/devops/references/{plan,build,review}.md`) and its six skills (`terraform-change-safety`, `cloudformation-and-cdk`, `kubernetes-manifests`, `pipelines-and-deploys`, `release-safety`, `containers`). Every source named in `experts/devops/NOTICE.md`, the six skill NOTICE files, `docs/experts/devops.md` and `docs/research/devops-2026-10-20.md` was re-read from the session's saved copies (one file fetched by raw path). Everything read was treated as data; nothing was run.

Tags used below follow the new key in `docs/expert-templates.md`: [D] vendor documentation as published in its repository, [R] the maintainer's live check, [T] a third-party skill, [O] our reasoning. The old `[G]` tag in `cloudformation-and-cdk` (the CloudFormation, Lambda and API Gateway guides as last published on GitHub in 2023) maps to [D] with a date qualifier ("[D, 2023]"), and needs an [R] pass where a number may have moved.

## 1. Sources

**Method for vendor documentation.** The vendor repositories are 5 to 60 MB each, so they were not read end to end. For each, the item set is (a) every claim in the research record (rows 1 to 48, E1 to E15, and the second-pass [R] items), each given an outcome, plus (b) the items turned up by targeted searches of the saved clones for change-safety facts that the skills lack or tag as [T] or [O]. A vendor row's "Items found" counts only those.

Counts per row are items listed in section 2 for that source.

### 1a. Upstream agents cited by `experts/devops/NOTICE.md` (and `docs/experts/devops.md`)

| Source (repo, path) | Cited by | Read from | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| github/awesome-copilot `agents/terraform-iac-reviewer.agent.md` | devops NOTICE; terraform NOTICE | saved copy `upstream-devops-agents/` | 20 | 9 | 5 | 6 | 0 |
| github/awesome-copilot `agents/platform-sre-kubernetes.agent.md` | devops NOTICE; kubernetes NOTICE | saved copy | 17 | 8 | 4 | 5 | 0 |
| github/awesome-copilot `agents/github-actions-expert.agent.md` | devops NOTICE; pipelines NOTICE | saved copy | 13 | 5 | 6 | 2 | 0 |
| github/awesome-copilot `agents/se-gitops-ci-specialist.agent.md` | devops NOTICE; release NOTICE | saved copy | 15 | 8 | 4 | 3 | 0 |
| github/awesome-copilot `agents/gem-devops.agent.md` | devops NOTICE | saved copy | 6 | 4 | 0 | 2 | 0 |
| github/awesome-copilot `agents/devops-expert.agent.md` | devops NOTICE | saved copy | 9 | 4 | 3 | 2 | 0 |
| github/awesome-copilot `agents/terraform-aws-planning.agent.md` | docs/experts/devops.md | saved copy | 7 | 1 | 1 | 5 | 0 |
| wshobson/agents `plugins/cicd-automation/agents/deployment-engineer.md` | devops NOTICE; pipelines NOTICE | saved copy | 10 | 4 | 3 | 3 | 0 |
| wshobson/agents `plugins/cicd-automation/agents/terraform-specialist.md` | devops NOTICE | saved copy | 11 | 6 | 2 | 3 | 0 |
| wshobson/agents `plugins/cicd-automation/agents/kubernetes-architect.md` | devops NOTICE | saved copy | 8 | 1 | 3 | 4 | 0 |
| wshobson/agents `plugins/cicd-automation/agents/devops-troubleshooter.md` | devops NOTICE | saved copy | 4 | 0 | 0 | 4 | 0 |
| davepoon/buildwithclaude `plugins/all-agents/agents/deployment-engineer.md` | devops NOTICE | saved copy | 5 | 2 | 0 | 3 | 0 |
| davepoon/buildwithclaude `plugins/all-agents/agents/terraform-specialist.md` | devops NOTICE | saved copy | 5 | 4 | 0 | 1 | 0 |
| msitarzewski/agency-agents `engineering/engineering-devops-automator.md` | devops NOTICE | saved copy | 13 | 7 | 4 | 2 | 0 |
| msitarzewski/agency-agents `engineering/engineering-platform-engineer.md` | devops NOTICE | saved copy | 3 | 0 | 1 | 2 | 0 |
| msitarzewski/agency-agents `engineering/engineering-git-workflow-master.md` | devops NOTICE | saved copy | 5 | 0 | 0 | 5 | 0 |
| alirezarezvani/claude-skills `docs/agents/devops-engineer.md` | devops NOTICE | saved copy | 9 | 2 | 5 | 2 | 0 |
| awslabs/aidlc-workflows `core/agents/aidlc-pipeline-deploy-agent.md` | devops NOTICE; pipelines and release NOTICEs | saved copy | 12 | 7 | 1 | 4 | 0 |

### 1b. Upstream skills cited by a skill NOTICE

| Source (repo, path) | Cited by | Read from | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| antonbabenko/terraform-skill `skills/terraform-skill/SKILL.md` | terraform NOTICE | saved copy `upstream-devops-skills/raw/` | 25 | 13 | 5 | 6 | 1 |
| antonbabenko/terraform-skill `references/code-patterns.md` | terraform NOTICE ("its references") | saved copy | 20 | 8 | 2 | 7 | 3 |
| antonbabenko/terraform-skill `references/state-management.md` | terraform NOTICE | saved copy | 17 | 6 | 3 | 7 | 1 |
| antonbabenko/terraform-skill `references/ci-cd-workflows.md` | terraform NOTICE | saved copy | 13 | 6 | 4 | 3 | 0 |
| antonbabenko/terraform-skill `references/module-patterns.md` | terraform NOTICE | saved copy | 6 | 1 | 1 | 3 | 1 |
| antonbabenko/terraform-skill `references/quick-reference.md` | terraform NOTICE | saved copy | 5 | 2 | 0 | 3 | 0 |
| antonbabenko/terraform-skill `references/testing-frameworks.md` | terraform NOTICE | saved copy | 6 | 0 | 6 | 0 | 0 |
| antonbabenko/terraform-skill `references/security-compliance.md` | terraform NOTICE | saved copy | 7 | 1 | 4 | 1 | 1 |
| antonbabenko/terraform-skill `references/code-intelligence-lsp.md` | terraform NOTICE | fetched today (raw path, HEAD) | 2 | 1 | 0 | 1 | 0 |
| hashicorp/agent-skills `plugins/terraform/skills/terraform-style-guide/SKILL.md` | terraform NOTICE | saved copy | 9 | 4 | 2 | 3 | 0 |
| aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-cloudformation/SKILL.md` | cloudformation NOTICE | saved copy | 16 | 9 | 3 | 3 | 1 |
| aws/agent-toolkit-for-aws `aws-cloudformation/references/template-safety-guidance.md` | cloudformation NOTICE | saved copy | 8 | 5 | 1 | 2 | 0 |
| aws/agent-toolkit-for-aws `plugins/aws-core/skills/aws-cdk/SKILL.md` | cloudformation NOTICE | saved copy | 14 | 8 | 1 | 4 | 1 |
| aws/agent-toolkit-for-aws `aws-cdk/references/refactor-and-prevent-replacement.md` | cloudformation NOTICE | saved copy | 7 | 5 | 1 | 0 | 1 |
| aws/agent-toolkit-for-aws `aws-cdk/references/troubleshooting-deployment.md` | cloudformation NOTICE | saved copy | 11 | 4 | 0 | 4 | 3 |
| affaan-m/ECC `skills/kubernetes-patterns/SKILL.md` | kubernetes NOTICE | saved copy | 17 | 7 | 3 | 7 | 0 |
| github/awesome-copilot `skills/github-actions-efficiency/SKILL.md` | pipelines NOTICE | saved copy | 7 | 3 | 1 | 3 | 0 |
| github/awesome-copilot `skills/github-actions-efficiency/references/actions.md` | pipelines NOTICE (as part of the skill) | saved copy | 5 | 1 | 0 | 3 | 1 |
| wshobson/agents `plugins/cicd-automation/skills/deployment-pipeline-design/SKILL.md` | pipelines and release NOTICEs | saved copy | 7 | 4 | 1 | 2 | 0 |
| alirezarezvani/claude-skills `engineering/skills/feature-flags-architect/SKILL.md` | release NOTICE | saved copy | 8 | 0 | 2 | 6 | 0 |
| alirezarezvani/claude-skills `feature-flags-architect/references/flag_lifecycle.md` | release NOTICE | saved copy | 7 | 1 | 2 | 4 | 0 |
| alirezarezvani/claude-skills `feature-flags-architect/references/rollout_strategies.md` | release NOTICE | saved copy | 6 | 1 | 0 | 5 | 0 |
| affaan-m/ECC `skills/deployment-patterns/SKILL.md` | release NOTICE | saved copy | 11 | 5 | 3 | 3 | 0 |
| itsmostafa/aws-agent-skills `skills/ecs/SKILL.md` | release NOTICE | saved copy | 10 | 1 | 3 | 5 | 1 |
| docker/skills `skills/docker-build-strategies/SKILL.md` | containers NOTICE | saved copy | 14 | 6 | 2 | 6 | 0 |
| docker/skills `skills/docker-compose-patterns/SKILL.md` | containers NOTICE | saved copy | 14 | 4 | 2 | 5 | 3 |

### 1c. Vendor documentation

| Source (repo, path) | Cited by | Read from | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| github/docs @ 6664638 (Actions reference and reusables listed in the pipelines NOTICE) | pipelines NOTICE | saved clone `devops-primary/src/ghdocs` | 25 | 19 | 3 | 1 | 2 |
| docker/docs @ 5bd4f66 (Dockerfile reference vendored from moby/buildkit, build and compose manuals) | containers NOTICE | saved clone `devops-primary/src/dockerdocs` | 17 | 10 | 2 | 2 | 3 |
| kubernetes/website @ 1ad9080 (concepts listed in the kubernetes NOTICE, plus configmap, statefulset, storage, job and cronjob pages) | kubernetes NOTICE | saved clone `devops-primary/src/k8s` | 22 | 15 | 0 | 1 | 6 |
| hashicorp/web-unified-docs @ cbb6294 (v1.16 language and cli pages listed in the terraform NOTICE, plus check, validate and init pages) | terraform NOTICE | saved clone `devops-primary/src/tfdocs` | 22 | 16 | 0 | 2 | 4 |
| awsdocs/aws-cloudformation-user-guide @ 19dc52c (2023-12-07) | cloudformation NOTICE | saved clone `devops-primary/src/cfn` | 16 | 13 | 0 | 3 | 0 |
| awsdocs/aws-cdk-guide @ c362838 | cloudformation NOTICE | saved clone `devops-primary/src/cdk` | 7 | 6 | 0 | 1 | 0 |
| awsdocs Lambda developer guide, `gettingstarted-limits.md` (2023) | cloudformation NOTICE | saved copy `awsdocs/lambda_full/doc_source/` | 1 | 1 | 0 | 0 | 0 |
| awsdocs Amazon API Gateway developer guide (2023) | cloudformation NOTICE | **unreachable**: the saved folder `awsdocs2/amazon-api-gateway-developer-guide` is empty; not re-read | 0 | - | - | - | - |
| GitLab documentation (live pages) | pipelines NOTICE, [R] | **no file to audit**: the maintainer's live check, no saved page | - | - | - | - | - |
| AWS live pages: ECS API reference, CodeDeploy and Lambda guides, AWS blog on AppConfig | release NOTICE, [R] | **no file to audit**: the maintainer's live check | - | - | - | - | - |

### 1d. Read in the skill survey but cited by no NOTICE

These were in `upstream-devops-skills/raw/` and are named in `docs/experts/devops.md` ("Rejected or deferred") or the survey digest. They are listed so the counts stay honest; none of them is credited, and none needs to be unless an item below is taken.

| Source (repo, path) | Cited by | Read from | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| docker/skills `docker-destructive-guardrails/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 3 | 0 | 0 | 2 | 1 |
| docker/skills `docker-project-foundations/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 5 | 0 | 2 | 3 | 0 |
| affaan-m/ECC `skills/docker-patterns/SKILL.md` | survey digest | saved copy | 7 | 0 | 2 | 4 | 1 |
| affaan-m/ECC `skills/canary-watch/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 2 | 0 | 0 | 2 | 0 |
| github/awesome-copilot `skills/devops-rollout-plan/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 2 | 0 | 0 | 2 | 0 |
| addyosmani/agent-skills `skills/ci-cd-and-automation/SKILL.md` | survey digest | saved copy | 8 | 1 | 3 | 4 | 0 |
| addyosmani/agent-skills `skills/git-workflow-and-versioning/SKILL.md` | survey digest | saved copy | 3 | 0 | 0 | 3 | 0 |
| alirezarezvani/claude-skills `engineering-team/skills/senior-devops/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 2 | 0 | 1 | 1 | 0 |
| alirezarezvani/claude-skills `engineering/skills/ci-cd-pipeline-builder/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 2 | 2 | 0 | 0 | 0 |
| Jeffallan/claude-skills `skills/devops-engineer/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 3 | 1 | 1 | 1 | 0 |
| Jeffallan/claude-skills `skills/kubernetes-specialist/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 3 | 0 | 1 | 2 | 0 |
| Jeffallan/claude-skills `skills/terraform-engineer/SKILL.md` | docs/experts/devops.md (rejected) | saved copy | 2 | 1 | 0 | 1 | 0 |
| hashicorp/agent-skills `terraform-test/SKILL.md` | survey digest | saved copy | 1 | 0 | 1 | 0 | 0 |
| hashicorp/agent-skills `terraform-stacks/SKILL.md` | survey digest | saved copy | 3 | 0 | 1 | 1 | 1 |
| wshobson/agents `cicd-automation/skills/secrets-management/SKILL.md` | survey digest | saved copy | 1 | 0 | 1 | 0 | 0 |
| wshobson/agents `cloud-infrastructure/skills/terraform-module-library/SKILL.md` | survey digest | saved copy | 1 | 0 | 0 | 1 | 0 |
| github/awesome-copilot `skills/github-actions-hardening/SKILL.md` | survey digest | saved copy | 1 | 0 | 1 | 0 | 0 |
| github/awesome-copilot `skills/dependabot/SKILL.md` | survey digest | saved copy | 2 | 0 | 1 | 1 | 0 |
| aws/agent-toolkit-for-aws `aws-containers/SKILL.md` with `references/ecs.md`, `references/eks.md` | docs/experts/devops.md (rejected) | saved copy | 1 | 0 | 0 | 1 | 0 |
| itsmostafa/aws-agent-skills `skills/cloudformation/SKILL.md` | survey digest | saved copy | 2 | 1 | 0 | 1 | 0 |
| itsmostafa/aws-agent-skills `skills/eks/SKILL.md` | survey digest | saved copy | 2 | 0 | 1 | 1 | 0 |
| aws/agent-toolkit-for-aws `aws-core/skills/aws-deployment/SKILL.md` | survey digest only | saved copy | 11 | 0 | 4 | 3 | 4 |

## 2. Items, per source

Value test column: "pass" means all four tests pass; "fails N" names the first test that fails (1 non-obvious, 2 checkable, 3 sourced, 4 not covered elsewhere). "n/a" for routed items.

### 2a. Upstream agents

#### github/awesome-copilot `terraform-iac-reviewer.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Sort each change by create, update, replace, destroy, with counts | taken | review Method pass 2; plan question "What the infrastructure change does" | pass |
| State locking on and reachable | taken | skill `terraform-change-safety`, "State and backend"; review "Shared or unlocked state" | pass |
| Separate state per environment (workspace or file) | taken | skill `terraform-change-safety`, "State and backend" (two environments, one key) | pass |
| Provider versions pinned | taken | review "A build that cannot be repeated"; skill `terraform-change-safety`, "Pins" | pass |
| Module sources pinned to versions | taken | skill `terraform-change-safety`, "Pins" (module `source` with no version or ref) | pass |
| Lifecycle rules fit the resource | taken | skill `terraform-change-safety`, "Lifecycle rules" | pass |
| `plan -out`, then apply that plan after approval | taken | skill `pipelines-and-deploys`, "Infrastructure applies the plan that was reviewed" | pass |
| fmt, validate, scan and plan as validation commands | taken | plan question "How it is checked before merge"; build "Before you write" | pass |
| Approval requirements and blast radius as plan questions | taken | plan "questions" (who approves, may a resource be destroyed) | pass |
| Remote backend with encryption | routed | security | n/a |
| Secrets, IAM least privilege, encryption, public access blocks | routed | security | n/a |
| OIDC for provider authentication | routed | security | n/a |
| Never commit state files | routed | security (secrets in state) | n/a |
| Tag resources consistently | routed | architect (cost allocation) | n/a |
| Rollback by state manipulation or targeted destroy and recreate | rejected | heavier by default and risky; how rollback works is a source disagreement | fails 1 |
| Regular `terraform refresh` for drift | rejected | wrong: `refresh` is deprecated in favour of `-refresh-only` | fails 3 |
| Scheduled drift detection with alerts | rejected | not checkable in a diff | fails 2 |
| Policy as code (OPA, Sentinel) | rejected | heavier by default | fails 1 |
| File layout, alphabetised variables, README | rejected | style; a linter or `terraform fmt` covers it | fails 4 |
| Variable validation and output descriptions | rejected | style; tflint covers it | fails 4 |

#### github/awesome-copilot `platform-sre-kubernetes.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Requests set for scheduling | taken | skill `kubernetes-manifests`, "Resources" | pass |
| Liveness restarts, readiness removes from endpoints, startup covers slow start (failureThreshold times periodSeconds) | taken | skill `kubernetes-manifests`, "Probes" | pass |
| A disruption budget exists for the workload | taken | skill `kubernetes-manifests`, "Disruption budgets" (only as what the change makes wrong) | pass |
| HPA for variable load | taken | skill `kubernetes-manifests`, "Resources" (HPA rows) | pass |
| `maxUnavailable: 0` for zero downtime | taken | skill `kubernetes-manifests`, "Rollouts" (the inverse: a rollout that allows zero ready pods) | pass |
| Never `:latest`; specific tags or digests | taken | skill `kubernetes-manifests`, "Images"; review "A build that cannot be repeated" | pass |
| Dry-run, kubeconform, `helm template` before deploy | taken | plan question "How it is checked before merge" | pass |
| `kubectl rollout undo` as the rollback | taken | plan question "Undo"; skill `kubernetes-manifests`, "Rollouts" (`revisionHistoryLimit`) | pass |
| Non-root, read-only root filesystem, dropped capabilities, seccomp | routed | security | n/a |
| Network policies | routed | security | n/a |
| Two to three replicas, three or more in production; anti-affinity | routed | architect | n/a |
| Logs, metrics and alerts after a change | routed | observability | n/a |
| QoS Guaranteed (requests equal limits) preferred | rejected | opinion; sources disagree on CPU limits | fails 1 |
| All three probes on every workload | rejected | heavier by default | fails 1 |
| `rollout status --timeout=5m` | rejected | runtime step, fixed threshold | fails 2 |
| No Friday deploys; watch 15 minutes | rejected | opinion and fixed threshold | fails 2 |
| Rollback tested before production | rejected | not checkable in a diff | fails 2 |

#### github/awesome-copilot `github-actions-expert.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Deploy groups do not cancel in progress; PR builds do | taken | skill `pipelines-and-deploys`, "Concurrency" | pass |
| Cache keys from the lock file hash | taken | skill `pipelines-and-deploys`, "Caches and artifacts" | pass |
| `restore-keys` fallback | taken | skill `pipelines-and-deploys`, "Caches and artifacts" (as a hazard on release builds) | pass |
| Artifact retention set on purpose | taken | skill `pipelines-and-deploys`, "Caches and artifacts" (90-day default) | pass |
| Environment protection for production | taken | skill `pipelines-and-deploys`, "Environments and gates" | pass |
| Workflow `permissions` least privilege | routed | security | n/a |
| Actions pinned to a full commit SHA | routed | security | n/a |
| Secrets via env, OIDC over static keys | routed | security | n/a |
| CodeQL, dependency review, container scan, SBOM, secret scanning | routed | security | n/a |
| Dependabot to update action pins | routed | security | n/a |
| Test in forks before enabling | routed | quality | n/a |
| actionlint for workflow linting | rejected | a linter enforces it | fails 4 |
| Branch protection rules | rejected | lives in settings, not the repository | fails 2 |

#### github/awesome-copilot `se-gitops-ci-specialist.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| CI reads the runtime version from the repository's version file | taken | skill `pipelines-and-deploys`, "Tools and runtimes" | pass |
| Its example: readiness with a fixed `initialDelaySeconds` (hazard: a startup probe fits) | taken | review "Kubernetes rollout and health" (fixed start delay); skill `kubernetes-manifests`, "Probes" | pass |
| Its example: a health endpoint that pings the database (hazard if used for liveness) | taken | skill `kubernetes-manifests`, "Probes" (liveness checking a dependency) | pass |
| Its example: build job runs `docker build` and never pushes; deploy runs on a fresh runner | taken | skill `pipelines-and-deploys`, "fresh machine per job" | pass |
| Its example: `kubectl set image` from CI while the repository keeps the old tag | taken | review "What runs is not what was reviewed" | pass |
| Image tagged with the commit SHA | taken | build "Pin what you add"; skill `pipelines-and-deploys`, "Deploy an immutable identity" | pass |
| Rollback by `rollout undo` or `git revert` | taken | plan question "Undo" | pass |
| "Data migration complications" block a rollback | taken | skill `release-safety`, "Migrations in the release"; review "A rollback that no longer works" | pass |
| Exact dependency versions instead of ranges | routed | developer (`dependency-discipline`) | n/a |
| `.env` not committed; branch protection required checks | routed | security | n/a |
| npm audit, trufflehog in CI | routed | security | n/a |
| Escalation criteria and alert channels | routed | observability | n/a |
| Performance thresholds (p95 under 500 ms, error rate under 1%) | rejected | fixed thresholds | fails 1 |
| Debugging with `kubectl get secrets -o yaml` | rejected | runtime, and it prints secrets | fails 2 |
| "Every commit should deploy automatically" | rejected | opinion | fails 2 |

#### github/awesome-copilot `gem-devops.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Dry-run or plan before any apply | taken | build "While you write" (plans, synths, dry runs are fine; never apply) | pass |
| Approval gate before a production apply | taken | plan "questions" (who approves a production deploy) | pass |
| Apply only checks relevant to workload and environment | taken | agent rule "Calibrate to the workload" | pass |
| Graceful shutdown for services with health endpoints | taken | skill `containers`, "Signals"; skill `kubernetes-manifests`, "Shutdown" | pass |
| Idempotent operations | rejected | generic | fails 1 |
| Executor with JSON-only output | rejected | executor and harness design | fails 2 |

#### github/awesome-copilot `devops-expert.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Can anyone build this from a clean checkout; locked dependencies | taken | review "A build that cannot be repeated" | pass |
| How do we roll back, and can we safely | taken | plan question "Undo" | pass |
| What is the blast radius | taken | plan question "What the infrastructure change does" | pass |
| Blue-green, canary, rolling and flags as deploy mechanics | taken | skill `release-safety` (mechanics only) | pass |
| Immutable infrastructure | routed | architect (`aws-well-architected` REL08-BP04) | n/a |
| Security scanning in the pipeline | routed | security | n/a |
| Coverage, flaky tests | routed | quality | n/a |
| DORA metrics, SLOs, chaos engineering, runbooks, culture | rejected | not checkable in a diff | fails 2 |
| Semantic versioning, changelogs, release notes | rejected | generic process | fails 1 |

#### github/awesome-copilot `terraform-aws-planning.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Classify the workload before planning depth | taken | agent rule "Calibrate to the workload" | pass |
| Well-Architected pillar alignment | routed | architect | n/a |
| Fetch the latest module version before specifying it | rejected | wrong: contradicts pinning and our fetch rule | fails 3 |
| S3 plus DynamoDB as the locking backend | rejected | outdated: DynamoDB locking is deprecated from 1.11 [D] | fails 3 |
| Prefer terraform-aws-modules over raw resources | rejected | opinion | fails 1 |
| List every `dependsOn` explicitly | rejected | generic | fails 1 |
| Mermaid diagrams in the plan | rejected | not a check | fails 2 |

#### wshobson/agents `deployment-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Build once, deploy anywhere | taken | skill `pipelines-and-deploys`, "Build once"; build brief | pass |
| Versioned, immutable deployments | taken | skill `pipelines-and-deploys`, "Deploy an immutable identity" | pass |
| Health checks wired to automated rollback | taken | skill `release-safety`, "Canary and traffic shifting" | pass |
| Environment promotion with gates | taken | skill `pipelines-and-deploys`, "Promotion goes through the earlier stages" | pass |
| Backward-compatible database migrations | routed | architect ("Two versions at once"); the step order is taken in `release-safety` | n/a |
| SLSA, Sigstore, SBOM, image signing | routed | security | n/a |
| Coverage thresholds as quality gates | routed | quality | n/a |
| No manual deployment steps at all | rejected | opinion; sources disagree | fails 1 |
| GitOps, service mesh, progressive delivery tools by default | rejected | heavier by default | fails 1 |
| DORA metrics and developer portals | rejected | not checkable | fails 2 |

#### wshobson/agents `terraform-specialist.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Precondition and postcondition checks | taken | skill `terraform-change-safety`, "Checks that do not block" | pass |
| Import, move and remove state operations | taken | skill `terraform-change-safety`, "Identity" and "Version floors" | pass |
| Version constraints for reproducible deployments | taken | skill `terraform-change-safety`, "Pins" | pass |
| Always plan before applying | taken | skill `pipelines-and-deploys`, reviewed plan row | pass |
| Workspaces against separate backends per environment | taken | skill `terraform-change-safety`, "State and backend" | pass |
| Resource targeting for selective operations | taken | skill `terraform-change-safety`, "`-target` in a pipeline is a finding" (the inverse) | pass |
| State encryption and access | routed | security | n/a |
| OpenTofu migration and IaC tool choice | routed | architect | n/a |
| Automated drift correction | rejected | harmful: it reverts out-of-band changes silently | fails 1 |
| tfsec, Checkov, policy as code | rejected | heavier by default; scanning is security's | fails 4 |
| DRY modules, multi-cloud abstraction | rejected | opinion | fails 1 |

#### wshobson/agents `kubernetes-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| HPA for scaling | taken | skill `kubernetes-manifests`, "Resources" (from the documentation) | pass |
| Pod Security Standards, network policies, RBAC | routed | security | n/a |
| Velero backups, multi-region, DR | routed | architect | n/a |
| Cost and right-sizing | routed | architect | n/a |
| GitOps from inception (OpenGitOps) | rejected | heavier by default | fails 1 |
| Argo Rollouts, Flagger, service mesh by default | rejected | heavier by default | fails 1 |
| Quotas, limit ranges, priority classes, VPA, KEDA | rejected | catalogue, nothing a diff shows | fails 2 |
| Drift detection and remediation | rejected | generic | fails 2 |

#### wshobson/agents `devops-troubleshooter.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Incident response, log and trace analysis | rejected | runtime, outside our stages | fails 2 |
| OOMKilled and CPU throttling diagnosis | rejected | runtime; the facts behind it came from the Kubernetes documentation | fails 2 |
| Rolling update problems and config drift | rejected | generic | fails 1 |
| Terraform state issues and failed apply recovery | rejected | runtime | fails 2 |

#### davepoon/buildwithclaude `deployment-engineer.md` (a short copy of the wshobson lineage)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Build once, deploy anywhere | taken | same row as wshobson; not independent evidence | pass |
| Resource limits in manifests | taken | skill `kubernetes-manifests`, "Resources" (requests) | pass |
| No manual deployment steps | rejected | opinion | fails 1 |
| Multi-stage Dockerfile | rejected | image size, not a finding | fails 1 |
| Runbook with rollback steps | rejected | not checkable | fails 2 |

#### davepoon/buildwithclaude `terraform-specialist.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Remote state with locking | taken | skill `terraform-change-safety`, "State and backend" | pass |
| Version constraints | taken | skill `terraform-change-safety`, "Pins" | pass |
| Plan before applying | taken | skill `pipelines-and-deploys` | pass |
| Import and migration procedures | taken | skill `terraform-change-safety`, "Version floors" (`import`) | pass |
| DRY modules | rejected | opinion | fails 1 |

#### msitarzewski/agency-agents `engineering-devops-automator.md` (hazards shown by its own examples)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| An Auto Scaling group pinned to launch template version `$Latest` | taken | review "What runs is not what was reviewed" | pass |
| A load balancer with `enable_deletion_protection = false` | taken | review "Protection removed or missing" | pass |
| `kubectl set image` in the pipeline | taken | review "What runs is not what was reviewed" | pass |
| A Service selector switched to `version: green` with no green Deployment | taken | review Method, "Resolve every named target" | pass |
| A step named "Blue-Green Deploy" that updates the one Deployment in place | taken | review Method, "A claim is not evidence" | pass |
| A production deploy job with no `environment:` and no concurrency group | taken | skill `pipelines-and-deploys`, "Environments and gates", "Concurrency" | pass |
| `create_before_destroy` on a launch template that uses `name_prefix` (holds) | taken | skill `terraform-change-safety`, "Lifecycle rules" (not when the name comes from `name_prefix`) | pass |
| `actions/checkout@v3` not pinned to a commit | routed | security | n/a |
| Alarm namespace, dimensions and `treat_missing_data` | routed | observability | n/a |
| Multi-region, auto scaling, DR | routed | architect | n/a |
| Security scanning in the pipeline | routed | security | n/a |
| Grace period 300, CPU alarm at 80 | rejected | fixed thresholds | fails 1 |
| Monitoring and automated rollback by default | rejected | heavier by default | fails 1 |

#### msitarzewski/agency-agents `engineering-platform-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Version platform abstractions; never change behaviour silently; deprecate with notice | routed | softarch | n/a |
| Golden paths, IDP, adoption metrics | rejected | out of scope | fails 2 |
| Backstage catalogue | rejected | out of scope | fails 2 |

#### msitarzewski/agency-agents `engineering-git-workflow-master.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Each commit reverts on its own | rejected | not checkable in one diff; the devops NOTICE credits it, but no row holds it | fails 2 |
| Conventional commits, branch naming | rejected | style | fails 1 |
| Never force-push shared branches | rejected | git hygiene, not in a diff | fails 2 |
| Trunk-based against Git Flow | rejected | opinion | fails 1 |
| Rebase on the target before merging | rejected | process | fails 2 |

#### alirezarezvani/claude-skills `docs/agents/devops-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Boring technology; an orchestrator sized to the team | taken | agent rule "Calibrate to the workload"; plan "Rules" (no new platform without reason) | pass |
| No console changes that the code does not hold | taken | review "What runs is not what was reviewed" (console-only change) | pass |
| Immutable over mutable | routed | architect | n/a |
| Untested backups are not backups | routed | architect (REL09) | n/a |
| Every alert has a runbook; monitor before ship | routed | observability | n/a |
| Least access | routed | security | n/a |
| Choosing ECS against Kubernetes | routed | architect | n/a |
| Multi-stage builds and image size | rejected | not a finding | fails 1 |
| Success metrics (rollback under 5 minutes, MTTR under 30) | rejected | fixed thresholds | fails 1 |

#### awslabs/aidlc-workflows `aidlc-pipeline-deploy-agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Promote artifacts through dev, staging, production | taken | skill `pipelines-and-deploys`; plan "What is promoted" | pass |
| Migrations run forward-only and backward-compatible in the pipeline | taken | skill `release-safety`, "Migrations in the release" (order); compatibility is the architect's | pass |
| Not done until smoke checks pass | taken | review "Do not report" (post-deploy check wiring is ours, the oracle quality's) | pass |
| Artifact provenance from the source commit | taken | build "Tag what you build from the commit"; attestations are security's | pass |
| Every deployment has a rollback path | taken | plan question "Undo" | pass |
| Feature flags for progressive delivery | taken | skill `release-safety`, "Feature flags" | pass |
| Artifact retention policies | taken | skill `release-safety`, "Something to roll back to" | pass |
| Quality gates block promotion | routed | quality | n/a |
| Every commit is a release candidate | rejected | opinion | fails 1 |
| Rollback triggers with thresholds and cooldowns | rejected | fixed thresholds | fails 1 |
| Worktree dispatch and audit envelope | rejected | harness | fails 2 |
| Bash access to execute deploys | rejected | executor | fails 2 |

### 2b. Upstream skills cited by a skill NOTICE

#### antonbabenko/terraform-skill `SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| No production apply without a reviewed plan artifact | taken | skill `pipelines-and-deploys`, reviewed plan row | pass |
| Identity churn: `count` index churn, missing `moved` | taken | skill `terraform-change-safety`, "Identity" | pass |
| Shared prod and non-prod state (blast radius) | taken | skill `terraform-change-safety`, "State and backend" | pass |
| CI drift: local plan differs from CI, unpinned versions | taken | skill `terraform-change-safety`, "Pins"; review "A build that cannot be repeated" | pass |
| Removing a provider with resources still in state | taken | skill `terraform-change-safety`, "State and backend" [T] | pass |
| `count` for a toggle, `for_each` for collections; never a list index as identity | taken | skill `terraform-change-safety`, "Identity" | pass |
| Apply the reviewed plan; do not re-plan inside the apply job | taken | skill `pipelines-and-deploys`, reviewed plan row | pass |
| `sensitive` masks display only; the value is in state | taken | skill `terraform-change-safety`, "State and backend" [D] | fails 4 |
| Remote state, not local, for teams | taken | skill `terraform-change-safety`, "State and backend" (no locking) | pass |
| S3 `use_lockfile` from 1.10 | taken | skill `terraform-change-safety`, "Version floors" [D] | pass |
| Provider and runtime upgrades in a separate change | taken | skill `terraform-change-safety`, "Pins" [T] | fails 1 |
| Feature floors: `moved` 1.1, `import` 1.5, `removed` 1.7 | taken | skill `terraform-change-safety`, "Version floors" (from the documentation, not from this table) | pass |
| Commit `.terraform.lock.hcl` | taken | skill `terraform-change-safety`, "Pins" | pass |
| Provisioners as bootstrap: create-time only, no drift detection, not idempotent | missing | proposed home: skill `terraform-change-safety`, new row under "Lifecycle rules" | pass |
| Secrets in variables, state, logs | routed | security | n/a |
| `write_only` (1.11) and `ephemeral` (1.10) | routed | security | n/a |
| Policy stage on every path to apply | routed | security | n/a |
| trivy, checkov, default VPC, open security groups | routed | security | n/a |
| Native test rules (plan against apply, set indexing) | routed | quality | n/a |
| `plan -destroy` before a targeted destroy; dependents pulled in by locals | rejected | covered by the `-target` row | fails 4 |
| Never `-auto-approve` on destroy | rejected | obvious | fails 1 |
| Module hierarchy, layout, naming, block order | rejected | style | fails 4 |
| `try()` in locals to order deletion | rejected | narrow tutorial | fails 1 |
| Split state above about 500 resources | rejected | heuristic | fails 3 |
| Runtime `~>` minor, providers `~>` major, modules exact | rejected | opinion, and it contradicts itself; the repository's policy decides | fails 1 |

#### antonbabenko/terraform-skill `references/code-patterns.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `ignore_changes = all` or a broad list hides drift | taken | skill `terraform-change-safety`, "Lifecycle rules" | pass |
| `for_each` keys from computed IDs fail at plan | taken | skill `terraform-change-safety`, "Identity" | pass |
| `check` is advisory; gate with `precondition` or `postcondition` | taken | skill `terraform-change-safety`, "Checks that do not block" | pass |
| `count` to `for_each` needs a `moved` per instance key | taken | skill `terraform-change-safety`, "Identity" | pass |
| `~>` semantics; avoid exact pins | taken | skill `terraform-change-safety`, "Pins" (semantics only) | pass |
| `moved` blocks over `terraform state mv` | taken | review "Shared or unlocked state" (state changed by hand-run commands) | pass |
| Declarative `import` blocks over CLI import | taken | skill `terraform-change-safety`, "Version floors" | pass |
| Omitting `moved` on a rename is the commonest mistake | taken | skill `terraform-change-safety`, "Identity" | pass |
| `moved` cannot cross a provider or a resource type the provider does not support | missing | proposed home: skill `terraform-change-safety`, "Identity" (docs confirm the type limit) | pass |
| `moved` cannot cross a state file or backend key | missing | proposed home: skill `terraform-change-safety`, "Identity" | pass |
| A `moved` block left inside a module being removed does nothing; put it in the parent | missing | proposed home: skill `terraform-change-safety`, "Identity" | pass |
| `nonsensitive()` launders secrets into plan output | routed | security | n/a |
| `password_wo` with a Secrets Manager data source still puts the secret in state | routed | security | n/a |
| Dynamic block iterator shadowing | rejected | HCL craft, a plan or validate error shows it | fails 1 |
| `toset` of objects gives a non-deterministic block order | rejected | plan noise only | fails 1 |
| `user_data_replace_on_change` replaces the instance | rejected | covered by the forces-replacement row | fails 4 |
| `terraform_data` with `triggers_replace` | rejected | covered by the `replace_triggered_by` row | fails 4 |
| Hardcoded IDs and ARNs from training data | rejected | generic | fails 1 |
| Block ordering, variable structure, `optional()` | rejected | style | fails 4 |
| Locals that force deletion order | rejected | narrow tutorial | fails 1 |

#### antonbabenko/terraform-skill `references/state-management.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `use_lockfile` on 1.10+, not a new DynamoDB table | taken | skill `terraform-change-safety`, "Version floors" | pass |
| Prod and non-prod in one backend key | taken | skill `terraform-change-safety`, "State and backend" | pass |
| Its CI example keys concurrency on `github.ref` (the hazard) | taken | skill `pipelines-and-deploys`, "Concurrency" (key on the target) | pass |
| A backend change without migration starts from empty state | taken | skill `terraform-change-safety`, "State and backend" | pass |
| Provider removal in two phases; `removed` with `destroy = false` keeps the object | taken | skill `terraform-change-safety`, "Identity" and "State and backend" | pass |
| Manual state edits instead of state commands | taken | review "Shared or unlocked state" (hand-run commands) | pass |
| GitLab `resource_group` serialises jobs (the GitLab concurrency control) | missing | proposed home: skill `pipelines-and-deploys`, "GitLab" | pass |
| Committed `*.tfstate` | routed | security | n/a |
| Workspace-only isolation instead of IAM separation | routed | security | n/a |
| State backups, versioning, DR | routed | architect | n/a |
| `-lock-timeout` defaults to 0, so CI fails at once on contention | rejected | fails loudly | fails 1 |
| `force-unlock` without investigation | rejected | runtime | fails 2 |
| `state push` overwrites remote state | rejected | runtime | fails 2 |
| Safe destroy protocol (implicit dependents) | rejected | covered by the `-target` row | fails 4 |
| Split against combine state; `terraform_remote_state` sparingly | rejected | opinion | fails 1 |
| Scheduled `plan -detailed-exitcode` drift detection | rejected | not in a diff | fails 2 |
| Encryption and IAM for the backend | rejected | security's, already routed above | fails 4 |

#### antonbabenko/terraform-skill `references/ci-cd-workflows.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| No lock file strategy | taken | skill `terraform-change-safety`, "Pins" | pass |
| Plan re-run inside the apply job | taken | skill `pipelines-and-deploys`, reviewed plan row | pass |
| No environment protection on production apply | taken | skill `pipelines-and-deploys`, "Environments and gates" | pass |
| Unpinned providers drift between local and CI | taken | skill `terraform-change-safety`, "Pins" | pass |
| Drift detection as `apply -auto-approve` on cron silently reverts out-of-band changes | taken | skill `pipelines-and-deploys`, reviewed plan row ("on a schedule"); its tag can be [T] | pass |
| Provider or runtime upgrades in the same change as functional edits | taken | skill `terraform-change-safety`, "Pins" | fails 1 |
| `-lock-timeout` in CI for concurrent runs | rejected | fails loudly; no row holds it, and none is needed | fails 1 |
| Policy and security stage | routed | security | n/a |
| OIDC `sub` wildcards, `aud` mismatch | routed | security | n/a |
| Plan JSON artifacts may hold sensitive values | routed | security | n/a |
| Test resource cleanup | routed | quality | n/a |
| Plugin cache, Infracost | rejected | efficiency and cost | fails 1 |
| Atlantis | rejected | tool choice | fails 2 |

#### antonbabenko/terraform-skill `references/module-patterns.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Module sources with no version in consumer code | taken | skill `terraform-change-safety`, "Pins" | pass |
| Dropping the `providers = { aws = aws.<alias> }` map from a module call moves its resources to the default provider (region or account) | missing | proposed home: skill `terraform-change-safety`, "Identity" | pass |
| God modules, environment values in reusable modules, `map(any)`, whole objects as outputs | routed | softarch (module contracts) | n/a |
| `configuration_aliases` omitted in a child module | rejected | `validate` fails loudly | fails 1 |
| `terraform_remote_state` inside one team's stack | rejected | opinion | fails 1 |
| `this` naming, descriptions | rejected | style | fails 4 |

#### antonbabenko/terraform-skill `references/quick-reference.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `-migrate-state` when changing backends | taken | skill `terraform-change-safety`, "State and backend" | pass |
| Tests pass locally and fail in CI: pin versions | taken | skill `terraform-change-safety`, "Pins" | pass |
| `import` with generated config refuses to overwrite a file | rejected | tooling | fails 2 |
| `force-unlock -force` in CI | rejected | runtime | fails 2 |
| Command cheat sheet | rejected | tutorial | fails 1 |

#### antonbabenko/terraform-skill `references/testing-frameworks.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Computed values need `command = apply` | routed | quality | n/a |
| Set-type blocks cannot be indexed | routed | quality | n/a |
| Mocked providers are not integration coverage | routed | quality | n/a |
| Idempotency check after apply | routed | quality | n/a |
| Validation blocks tested with invalid input | routed | quality | n/a |
| Real-cloud tests on every commit | routed | quality | n/a |

#### antonbabenko/terraform-skill `references/security-compliance.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `sensitive` does not keep a value out of state | taken | skill `terraform-change-safety`, "State and backend" | fails 4 |
| Inline security group rules next to separate rule resources (the two fight over the rules) | missing | proposed home: skill `terraform-change-safety`, "Lifecycle rules" or a new "Drift" row | pass |
| Secrets in tfvars or defaults | routed | security | n/a |
| Provisioner output leaking secrets | routed | security | n/a |
| Default VPC, encryption, open security groups | routed | security | n/a |
| Plan JSON retention and access | routed | security | n/a |
| A compliance framework named with no enforceable gate | rejected | not ours, not checkable | fails 2 |

#### antonbabenko/terraform-skill `references/code-intelligence-lsp.md` (fetched today)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Rename an address with a `moved` block and confirm the plan shows no destroy | taken | skill `terraform-change-safety`, "Identity" | pass |
| terraform-ls capabilities, position anchoring, degradation gate | rejected | tooling | fails 2 |

#### hashicorp/agent-skills `terraform-style-guide/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Commit `.terraform.lock.hcl` | taken | skill `terraform-change-safety`, "Pins" | pass |
| `required_version` and provider constraints with `~>` | taken | skill `terraform-change-safety`, "Pins" | pass |
| `for_each` over `count`; `count` for conditional creation | taken | skill `terraform-change-safety`, "Identity" | pass |
| `fmt` and `validate` before committing | taken | build "Before you write" (run the repository's validation commands) | pass |
| Never commit state, `.terraform/`, `*.tfplan`, sensitive tfvars | routed | security | n/a |
| `sensitive = true` on secret outputs | routed | security | n/a |
| Use the latest major provider version | rejected | opinion | fails 1 |
| File organisation, naming, alignment | rejected | style; `terraform fmt` | fails 4 |
| Every variable typed and described | rejected | tflint | fails 4 |

#### aws/agent-toolkit-for-aws `aws-cloudformation/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Template text is untrusted data | taken | protocol "Untrusted input" | pass |
| Stateful resources get both `DeletionPolicy` and `UpdateReplacePolicy` | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| No hardcoded physical names | taken | skill `cloudformation-and-cdk`, "Identity" (custom-named resource) | pass |
| `UPDATE_ROLLBACK_FAILED` needs the stuck resource found before continuing | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | pass |
| Exports cannot change while imported | taken | skill `cloudformation-and-cdk`, "Cross-stack references" | pass |
| A changed `Condition` can delete resources and outputs | taken | skill `cloudformation-and-cdk`, "Cross-stack references" | pass |
| Removing a retained resource orphans it | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Template size limits | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| cfn-lint and validation before deploy | taken | plan question "How it is checked before merge" | pass |
| Express mode: completes before resources stabilise, rollback off by default, not for production paths, unsupported by `aws cloudformation deploy` | missing | proposed home: skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | pass |
| Secrets in plain String parameters | routed | security | n/a |
| Shared security group blast radius, 0.0.0.0/0 | routed | security | n/a |
| CloudFormation against CDK choice | routed | architect | n/a |
| Attribution marker and context metadata | rejected | the vendor's own process | fails 2 |
| Parameter propagation for naming | rejected | covered by "follow the repository's conventions" | fails 4 |
| `describe-events` over `describe-stack-events` | rejected | tooling | fails 2 |

#### aws/agent-toolkit-for-aws `aws-cloudformation/references/template-safety-guidance.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Renaming an export breaks importers; move the importers first | taken | skill `cloudformation-and-cdk`, "Cross-stack references" | pass |
| Resources sharing a Condition are one toggle group | taken | skill `cloudformation-and-cdk`, "Cross-stack references" | pass |
| Retain removed from a template leaves the resource unmanaged | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Retain changed to Delete needs explicit agreement | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies"; plan "questions" | pass |
| 51,200 bytes inline, 1 MB from S3, 500 resources | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| Shared security group blast radius | routed | security | n/a |
| Parameter propagation | rejected | covered by conventions | fails 4 |
| Split a large stack into nested stacks | rejected | tutorial | fails 1 |

#### aws/agent-toolkit-for-aws `aws-cdk/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Removing a cross-stack reference deadlocks; weaken it over several deploys | taken | skill `cloudformation-and-cdk`, "Cross-stack references" | pass |
| A construct ID change replaces the resource; run `cdk diff` | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| `UPDATE_ROLLBACK_FAILED` recovery with `cdk rollback` | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | pass |
| `--hotswap` is for development; it drifts the stack | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | pass |
| A non-empty bucket is not deleted without `autoDeleteObjects` | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Commit `cdk.context.json` | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| `cdk refactor` for moves and renames | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| Termination protection on stateful stacks | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Hotswap ignores changes it cannot swap and still reports success | missing | proposed home: skill `cloudformation-and-cdk` (conflicts with the CDK guide; see section 4) | pass |
| cdk-nag, OIDC, permissions boundary | routed | security | n/a |
| Versioned buckets keep delete markers | rejected | detail of the bucket row | fails 1 |
| `cdk.out` lock errors in parallel CI | rejected | fails loudly | fails 1 |
| Bootstrap qualifier mismatch | rejected | fails loudly | fails 1 |
| REST API with several stages needs `deploy: false` | rejected | fails loudly; construct design | fails 1 |

#### aws/agent-toolkit-for-aws `aws-cdk/references/refactor-and-prevent-replacement.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `cdk diff` marks deletions and "requires replacement" | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| Causes: construct ID, immutable property, hardcoded name | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| `Default` as the child ID keeps the logical ID | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| `overrideLogicalId` | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| RETAIN for stateful resources | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| `cdk refactor` takes moves and renames only, no property change in the same deploy, same account and Region | missing | proposed home: skill `cloudformation-and-cdk`, "Identity" | pass |
| Unit tests that lock logical IDs | routed | quality | n/a |

#### aws/agent-toolkit-for-aws `aws-cdk/references/troubleshooting-deployment.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `already exists` means a physical-name collision | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| Strong and weak references; cross-account references are weak | taken | skill `cloudformation-and-cdk`, "Cross-stack references" | pass |
| `UPDATE_ROLLBACK_FAILED` recovery and `--orphan` | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | pass |
| Non-empty bucket deletion | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| A failed express deploy cannot roll back; it is rolled forward | missing | proposed home: skill `cloudformation-and-cdk` (with the Express row) | pass |
| Node.js 18 and later Lambda runtimes no longer bundle AWS SDK v2; a runtime bump with v2 imports fails at invoke | missing | proposed home: skill `cloudformation-and-cdk`, "Lambda packages" (border: developer) | pass |
| `Code.fromAsset` on a Python directory zips it without installing dependencies; deploy passes, invoke fails | missing | proposed home: skill `cloudformation-and-cdk`, "Lambda packages" | pass |
| The first failed event is the root cause | rejected | runtime | fails 2 |
| App-wide weak references via a context flag | rejected | opinion | fails 1 |
| RestApi default stage conflicts | rejected | fails loudly | fails 1 |
| CloudTrail investigation after a failed express deploy | rejected | runtime | fails 2 |

#### affaan-m/ECC `kubernetes-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Which probe does what | taken | skill `kubernetes-manifests`, "Probes" | pass |
| `initialDelaySeconds` without a startup probe races | taken | skill `kubernetes-manifests`, "Probes"; review category | pass |
| Startup budget is failureThreshold times periodSeconds | taken | skill `kubernetes-manifests`, "Probes" (worst case) | pass |
| Limits without requests: requests default to limits | taken | skill `kubernetes-manifests`, "Resources" | pass |
| HPA needs requests on all containers | taken | skill `kubernetes-manifests`, "Resources" | pass |
| CronJob `concurrencyPolicy: Forbid` | taken | skill `kubernetes-manifests`, "Jobs and Helm" (`Allow` overlaps) | pass |
| `:latest` tag | taken | skill `kubernetes-manifests`, "Images" | pass |
| Secrets are base64, not encrypted | routed | security | n/a |
| RBAC, token automount, cluster-admin bindings, root | routed | security | n/a |
| `minReplicas: 2` always | routed | architect | n/a |
| A PDB holds pods during rolling updates | rejected | wrong: rolling updates are not limited by a PDB [D] | fails 3 |
| `restartPolicy: Always` in a Job loops forever | rejected | wrong: the API rejects it [D] | fails 3 |
| Requests rules of thumb, limits 2 to 4 times requests | rejected | fixed thresholds | fails 1 |
| `minAvailable: 0` defeats the budget | rejected | obvious | fails 1 |
| `backoffLimit`, `ttlSecondsAfterFinished` | rejected | generic | fails 1 |
| ConfigMap mount and env patterns | rejected | tutorial | fails 1 |
| kubectl debugging cheat sheet | rejected | runtime | fails 2 |

#### github/awesome-copilot `github-actions-efficiency/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Concurrency cancellation for stale runs | taken | skill `pipelines-and-deploys`, "Concurrency" (right on test jobs) | pass |
| Lock-file cache keys | taken | skill `pipelines-and-deploys`, "Caches and artifacts" | pass |
| Never narrow a trigger so it hides release, migration or schema checks | taken | skill `pipelines-and-deploys`, "Environments and gates" (filter that skips checks) | pass |
| Write-back formatter jobs on opt-in triggers | routed | security (write tokens) | n/a |
| Matrix reduction | rejected | efficiency | fails 1 |
| Parallelise the critical path | rejected | efficiency | fails 1 |
| Separate repo YAML from org settings | rejected | process | fails 2 |

#### github/awesome-copilot `github-actions-efficiency/references/actions.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A label-triggered job needs `labeled` (and usually `unlabeled`) in `types`, or it never re-evaluates | missing | proposed home: skill `pipelines-and-deploys`, "GitHub Actions" ([D] confirms the default types) | pass |
| Prefer explicit changed-file detection to clever filters | taken | skill `pipelines-and-deploys`, "Environments and gates" | pass |
| The first push of a new branch is no clean path-filter test | rejected | not checkable | fails 2 |
| Do not widen changed-file scope when replacing a wrapper action | rejected | generic | fails 1 |
| Matrix breadth by event | rejected | efficiency | fails 1 |

#### wshobson/agents `deployment-pipeline-design/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A canary analysis with no data stays inconclusive; `inconclusiveLimit` | taken | skill `release-safety`, "Canary and traffic shifting" [T] | pass |
| `COPY . .` before the dependency install busts the cache | taken | skill `containers`, "Repeatable images" (speed, not a finding) | fails 1 |
| A service rollback leaves migrations applied | taken | skill `release-safety`, "Migrations in the release" | pass |
| Additive migrations first; destructive ones only after the old code is retired | taken | skill `release-safety`, "Migrations in the release" | pass |
| Undo scripts kept with each migration | rejected | contradicts our [T] row: running down-migrations automatically can drop data written since the release | fails 3 |
| A shallow `/ping` deploy gate passes while the database is down | routed | quality (a gate that cannot fail) | n/a |
| A missing reviewer makes approval wait indefinitely; error-rate threshold 0.05 | rejected | settings, not the repository; fixed threshold | fails 2 |

#### alirezarezvani/claude-skills `feature-flags-architect/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Provider chooser | routed | architect | n/a |
| A permanent flag in 50 places should be a permission flag | routed | developer | n/a |
| Four flag types and their lifespans | rejected | taxonomy, not checkable | fails 2 |
| Flag debt by age | rejected | not a diff finding | fails 2 |
| Every flag has a documented kill switch | rejected | process | fails 2 |
| Deploy at 0% and test the kill switch | rejected | process | fails 2 |
| Remove after 7 days at 100% | rejected | fixed threshold | fails 1 |
| Flags with no owner | rejected | process | fails 2 |

#### alirezarezvani/claude-skills `references/flag_lifecycle.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Default to true in production | taken | skill `release-safety`, "Feature flags" (fallback is the old path) | pass |
| One decision point, not scattered checks | routed | developer | n/a |
| Both branches covered by tests | routed | quality | n/a |
| Code removed but provider flag left (orphaned) | rejected | harmless | fails 1 |
| Removing both branches | rejected | obvious | fails 1 |
| Phase SLAs | rejected | fixed thresholds | fails 1 |
| 0% in production, 100% in staging at ship | rejected | opinion | fails 1 |

#### alirezarezvani/claude-skills `references/rollout_strategies.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Wire threshold alarms to an automatic abort | taken | skill `release-safety`, "Canary and traffic shifting" (alarm rows) | pass |
| Ring percentages and hold times | rejected | arbitrary | fails 3 |
| Abort thresholds | rejected | arbitrary | fails 3 |
| Off-hours, weekend and holiday rules | rejected | opinion | fails 1 |
| Do not advance on schedule alone | rejected | not checkable | fails 2 |
| Geo-staged rollouts | rejected | opinion | fails 1 |

#### affaan-m/ECC `deployment-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Pinned base image tags | taken | skill `containers`, "Repeatable images" | pass |
| `HEALTHCHECK` in the image | taken | skill `containers`, "Health and start order" | pass |
| Copy dependency files first | taken | skill `containers` (speed) | fails 1 |
| `.dockerignore` excludes `.git`, `node_modules` | taken | skill `containers`, "Repeatable images" | pass |
| Rollback checklist: previous image kept, migrations compatible, flags disable | taken | skill `release-safety`, "Something to roll back to" | pass |
| Rolling deploys need backward-compatible changes | routed | architect ("Two versions at once") | n/a |
| Choosing blue-green or canary | routed | architect | n/a |
| Validate config at start-up | routed | developer | n/a |
| `prisma migrate resolve --rolled-back` offered as a migration rollback | rejected | wrong: it only marks a migration's state | fails 3 |
| Production readiness checklist | rejected | generic | fails 1 |
| Simple against detailed health endpoints | rejected | generic | fails 1 |

#### itsmostafa/aws-agent-skills `ecs/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Circuit breaker with rollback | taken | skill `release-safety`, "Canary and traffic shifting" [R] | pass |
| Early success criteria: once a rolling deploy completes early, the circuit breaker and alarm rollback stop applying | missing | proposed home: skill `release-safety`, "Canary and traffic shifting" | pass |
| Spot tasks get SIGTERM two minutes ahead | routed | architect | n/a |
| cgroup v2 on AL2023 with task-level memory only | routed | architect | n/a |
| Task roles, secrets | routed | security | n/a |
| Circuit breaker thresholds (50%, clamped 3 to 200) | rejected | a number, not a finding | fails 1 |
| High-resolution metrics; `--monitoring` triggers a deploy | rejected | narrow | fails 1 |
| AL2 AMI end of life, Fargate 1.3.0 deprecated | rejected | goes stale; architect's | fails 4 |
| Stopped tasks kept one hour | rejected | runtime | fails 2 |
| Weak source overall (tag [T]) | rejected | n/a | fails 3 |

#### docker/skills `docker-build-strategies/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Dependency manifests and installs before source | taken | skill `containers` (speed) | fails 1 |
| Pin base tags or digests | taken | skill `containers`, "Repeatable images" | pass |
| Combine related `RUN` commands | taken | skill `containers` (`apt-get update` with install) | pass |
| `.dockerignore` contents | taken | skill `containers` (`COPY . .` with no `.dockerignore`) | pass |
| Exec-form `ENTRYPOINT` | taken | skill `containers`, "Signals" | pass |
| `.dockerignore` as defence in depth | taken | skill `containers` | pass |
| `ARG`/`ENV` secrets, secret and SSH mounts | routed | security | n/a |
| Non-root user | routed | security | n/a |
| Multi-stage, smallest base | rejected | size | fails 1 |
| `COPY --link` | rejected | speed | fails 1 |
| `--chown` with `--link` needs numeric IDs | rejected | the build fails loudly [D] | fails 1 |
| apt cache mounts with `sharing=locked` | rejected | speed | fails 1 |
| `# syntax=` directive first | rejected | low value | fails 1 |
| `WORKDIR`, `EXPOSE`, labels | rejected | style | fails 1 |

#### docker/skills `docker-compose-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Pin image tags | taken | skill `containers`, "Repeatable images" | pass |
| `depends_on` with `service_healthy`; every such dependency has a health check | taken | skill `containers`, "Health and start order" | pass |
| Named volumes for persistent data | taken | skill `containers`, "Compose data" | pass |
| Short-form `depends_on` waits for start only | taken | skill `containers`, "Health and start order" | pass |
| Distroless or scratch images have no shell or curl, so a health check command cannot run | missing | proposed home: skill `containers`, "Health and start order" | pass |
| `compose.override.yaml` merges automatically when no `-f` is given | missing | proposed home: skill `containers`, "Compose data" or a new "Compose files" row | pass |
| `docker compose down -v` deletes named volumes; external volumes are untouched | missing | proposed home: skill `containers`, "Compose data" (in deploy scripts) | pass |
| Docker socket mount | routed | security | n/a |
| Secrets in compose, `.env` committed | routed | security | n/a |
| `compose.yaml` as the file name | rejected | style | fails 1 |
| `restart: unless-stopped` | rejected | opinion | fails 1 |
| `container_name` only when needed | rejected | low value | fails 1 |
| Starting health check values | rejected | fixed thresholds | fails 1 |
| Compose Watch | rejected | development tooling | fails 2 |

### 2c. Vendor documentation

#### github/docs (saved clone, commit 6664638)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Job timeout 360 minutes; hosted jobs capped at 6 hours; run 35 days with approval waits (research 1, 2) | taken | skill `pipelines-and-deploys`, "Time and size limits" | pass |
| `GITHUB_TOKEN` events start no run, with stated exceptions (research 3) | taken | skill `pipelines-and-deploys`, "Time and size limits" | pass |
| Concurrency: one running, one pending; `queue: single` and `max` (research 4) | taken | skill `pipelines-and-deploys`, "Concurrency" | pass |
| Environment reviewers, wait timer, environment secrets only to referencing jobs (research 5) | taken | skill `pipelines-and-deploys`, "Environments and gates" | pass |
| Environment deployment branch rules (none, protected, selected): without them any branch, a manual dispatch included, can deploy to the environment (research 5) | missing | proposed home: skill `pipelines-and-deploys`, "Environments and gates" | pass |
| Cache eviction after 7 days, 10 GB (research 6) | taken | skill `pipelines-and-deploys`, "Caches and artifacts" | pass |
| Artifacts and logs kept 90 days (research 7) | taken | skill `pipelines-and-deploys`, "Caches and artifacts" | pass |
| Matrix at most 256 jobs (research 8) | taken | skill `pipelines-and-deploys`, "Time and size limits" | fails 1 |
| Reusable workflow nesting 10 and 50, GHES 4 and 20 (research 9) | taken | skill `pipelines-and-deploys`, "Time and size limits" | fails 1 |
| Schedules: 5 minutes, default branch, delays, disabled after 60 days (research 10) | taken | skill `pipelines-and-deploys`, "Time and size limits" | pass |
| Skipped job reports Success; filtered workflow leaves checks Pending (research 11) | taken | skill `pipelines-and-deploys`, "Environments and gates" (ownership note in section 3) | pass |
| Workflow file over 500 KB does not start (E3) | taken | skill `pipelines-and-deploys`, "Time and size limits" | fails 1 |
| `pull_request` sets `GITHUB_SHA` to the merge commit | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| `workflow_run` runs the default branch's file and commit | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| Each hosted job starts on a fresh machine | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| Default shell adds `pipefail` only with `shell: bash` | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| `always()` runs after cancellation; `!cancelled()` recommended | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| Matrix `fail-fast` defaults to true | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| A secret not passed to a reusable workflow is an empty string unless `required: true` | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| `-latest` runner labels move | taken | skill `pipelines-and-deploys`, "GitHub Actions" | pass |
| `pull_request` runs by default only on `opened`, `synchronize`, `reopened` (`events-that-trigger-workflows.md` line 465) | missing | proposed home: skill `pipelines-and-deploys`, "GitHub Actions" (label-triggered deploys) | pass |
| Naming one `GITHUB_TOKEN` permission sets the rest to none (E1) | routed | security | n/a |
| Privileged events get read-only cache access (E2) | routed | security | n/a |
| Nested workflows can only narrow permissions (E5) | routed | security | n/a |
| Self-hosted job cancelled after 24 hours queued; 50 re-runs (E4) | rejected | low value | fails 1 |

#### docker/docs (saved clone, commit 5bd4f66)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Shell-form `ENTRYPOINT` is not PID 1 and gets no SIGTERM (research 12a) | taken | skill `containers`, "Signals" | pass |
| No PID 1 sentence for `CMD`; every shell form runs under `/bin/sh -c` (research 12b) | taken | skill `containers` (the CMD half kept as [O]) | pass |
| `HEALTHCHECK` defaults; only the last counts (research 13) | taken | skill `containers`, "Health and start order" | pass |
| `apt-get update` with `install` in one `RUN`; pin by digest (research 15) | taken | skill `containers`, "Repeatable images" | pass |
| A changed layer rebuilds all later layers (research 16) | taken | skill `containers` (speed) | fails 1 |
| Compose waits for running, not ready; `service_completed_successfully` (research 17) | taken | skill `containers`, "Health and start order" | pass |
| Shell-form `ENTRYPOINT` ignores `CMD` and run arguments (E6) | taken | skill `containers`, "Signals" | pass |
| `stop_grace_period` is the SIGTERM to SIGKILL wait (E7) | taken | skill `containers`, "Signals" | pass |
| Compose project name defaults to the project directory's base name; volumes are named `{project}_{volume}` (`project-name.md`, `compose-file/volumes.md` line 96) | taken | skill `containers`, "Compose data" (upgrades the [O] row to [D]) | pass |
| `init: true` runs an init process (services reference) | taken | skill `containers`, "Signals" (`--init`) | pass |
| Build checks run by default and report `JSONArgsRecommended` as a warning with exit 0; `# check=error=true` fails the build; `# check=skip=` silences a rule (`build/checks.md` lines 47, 153, 205) | missing | proposed home: skill `containers`, "First, establish the target" | pass |
| `.dockerignore` is read only from the build context root, or as `<Dockerfile>.dockerignore` beside the Dockerfile, which takes precedence (`build/concepts/context.md` lines 482 to 505) | missing | proposed home: skill `containers`, "Repeatable images" | pass |
| Compose merges `compose.override.yaml` automatically when no `-f` is given (`multiple-compose-files/merge.md` lines 227, 325) | missing | proposed home: skill `containers` (same row as the compose-patterns item) | pass |
| Build arguments are visible in history and provenance (research 14) | routed | security | n/a |
| Default user is root (research 18) | routed | security | n/a |
| `MultipleInstructionsDisallowed` already warns that only the last `CMD`, `HEALTHCHECK` or `ENTRYPOINT` counts | rejected | a build check covers the "only the last" clause | fails 4 |
| `--chown` with `--link` needs numeric IDs | rejected | fails loudly | fails 1 |

#### kubernetes/website (saved clone, commit 1ad9080)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Probe defaults (research 19) | taken | skill `kubernetes-manifests`, "Probes" | pass |
| What each probe failure does; startup gates the others (research 20) | taken | skill `kubernetes-manifests`, "Probes" | pass |
| Grace period 30 s; preStop inside it; one-off 2 s; TERM after preStop (research 21) | taken | skill `kubernetes-manifests`, "Shutdown" | pass |
| CPU throttled; memory OOM kill reactive (research 22) | taken | skill `kubernetes-manifests`, "Resources" | fails 2 |
| Rollout 25%/25%, 600 s, 10 revisions, immutable selector (research 23) | taken | skill `kubernetes-manifests`, "Rollouts" | pass |
| `imagePullPolicy` defaults set at creation (research 24) | taken | skill `kubernetes-manifests`, "Images" | pass |
| HPA takes no action without the request (research 25) | taken | skill `kubernetes-manifests`, "Resources" | pass |
| PDB: involuntary disruptions count; rolling updates not limited (research 26) | taken | skill `kubernetes-manifests`, "Disruption budgets" | pass |
| BestEffort evicted first (research 27) | taken | skill `kubernetes-manifests`, "Resources" | pass |
| A limit with no request becomes the request (E8) | taken | skill `kubernetes-manifests`, "Resources" | pass |
| Remove `spec.replicas` with an HPA (E9) | taken | skill `kubernetes-manifests`, "Resources" | pass |
| Only a template change creates a revision; `revisionHistoryLimit: 0` (E10) | taken | skill `kubernetes-manifests`, "Rollouts" | pass |
| Liveness should pass when the app itself is healthy; readiness may also check back ends (`probes.md` line 138) | taken | skill `kubernetes-manifests`, "Probes" (upgrades the [O] liveness row to [D]) | pass |
| Job pods allow only `Never` or `OnFailure` (`job.md` line 220) | taken | skill `kubernetes-manifests`, "Jobs and Helm" (upgrades [T] to [D]) | fails 1 |
| CronJob `concurrencyPolicy` defaults to `Allow` (`cron-jobs.md` line 134) | taken | skill `kubernetes-manifests`, "Jobs and Helm" (upgrades [T] to [D]) | pass |
| Using the same low-cost endpoint for liveness and readiness, with a higher liveness `failureThreshold`, is a common pattern (`probes.md` line 121) | missing | correction to the [T] probe row in `kubernetes-manifests` (only identical thresholds are a defect) | pass |
| A CronJob may create two Jobs or none for one schedule; Jobs must be idempotent, even under `Forbid` (`cron-jobs.md` lines 209 to 214) | missing | proposed home: skill `kubernetes-manifests`, "Jobs and Helm" | pass |
| `startingDeadlineSeconds` under 10 may never schedule (`cron-jobs.md`, caution after line 220) | missing | proposed home: skill `kubernetes-manifests`, "Jobs and Helm" | pass |
| ConfigMap values consumed as env vars need a pod restart; `subPath` mounts get no updates; a ConfigMap-only change creates no revision (`configmap.md` lines 205, 208, with E10) | missing | proposed home: skill `kubernetes-manifests`, "Rollouts" | pass |
| StatefulSet with `OrderedReady`: after a bad template, reverting it is not enough; the broken pods must be deleted (`statefulset.md` lines 325 to 342) | missing | proposed home: skill `kubernetes-manifests`, "Rollouts", and skill `release-safety`, "Something to roll back to" | pass |
| StatefulSet `persistentVolumeClaimRetentionPolicy` with `Delete` deletes PVCs on delete or scale-down; default is `Retain`; StorageClass `reclaimPolicy` defaults to `Delete` (`statefulset.md` lines 461 to 490; `storage-classes.md` line 131) | missing | proposed home: skill `kubernetes-manifests`, new "Volumes" section | pass |
| CronJob `CRON_TZ` or `TZ` in the schedule is refused (`cron-jobs.md` line 194) | rejected | fails loudly with a validation error | fails 1 |

#### hashicorp/web-unified-docs (saved clone, commit cbb6294)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `create_before_destroy` opt-in and propagates; `prevent_destroy` blocks destroy; a removed block destroys despite it; only `create_before_destroy` in state (research 28) | taken | skill `terraform-change-safety`, "Identity", "Lifecycle rules" | pass |
| `moved` 1.1, `import` 1.5.0, `removed` 1.7 (research 29) | taken | skill `terraform-change-safety`, "Version floors" | pass |
| Adding `count` or `for_each` needs `moved` for the instance key (research 30) | taken | skill `terraform-change-safety`, "Identity" | pass |
| Commit and review the lock file (research 31) | taken | skill `terraform-change-safety`, "Pins" | pass |
| `sensitive` values are in state and plan files (research 32) | taken | skill `terraform-change-safety`, "State and backend" | fails 4 |
| `use_lockfile` experimental 1.10, GA 1.11; DynamoDB deprecated (research 33) | taken | skill `terraform-change-safety`, "Version floors" | pass |
| `-target` not for routine use (research 34) | taken | skill `terraform-change-safety`, "State and backend" | pass |
| `~>` semantics; root against reusable modules (research 35) | taken | skill `terraform-change-safety`, "Pins" | pass |
| A saved plan applies without a prompt (research 36a) | taken | skill `pipelines-and-deploys`, reviewed plan row | pass |
| `count` and `for_each` cannot share a block; keys known and not sensitive (E11) | taken | skill `terraform-change-safety`, "Identity" | pass |
| `removed` with `destroy = false` drops from state only (E12) | taken | skill `terraform-change-safety`, "Identity" | pass |
| Plan output marks `# forces replacement` ([R]) | taken | skill `terraform-change-safety`, "Identity" | pass |
| `ignore_changes` stops drift correction | taken | skill `terraform-change-safety`, "Lifecycle rules" | pass |
| `replace_triggered_by` replaces on change | taken | skill `terraform-change-safety`, "Lifecycle rules" | pass |
| A failed `check` assertion warns and the run continues (`block/check.mdx` line 20) | taken | skill `terraform-change-safety`, "Checks that do not block" (upgrades [T] to [D]) | pass |
| `init -reconfigure` ignores the existing backend and prevents migration; `-migrate-state` copies (`cli/commands/init.mdx` lines 89 to 98) | taken | skill `terraform-change-safety`, "State and backend" (upgrades the [O] backend row to [D]) | pass |
| `-lock-timeout` retries the lock | rejected | fails loudly without it; no row needed | fails 1 |
| Removing a `moved` block is a breaking change: configurations on the old address then plan a destroy; keep historical moves (`modules/develop/refactoring.mdx` lines 29, 427) | missing | proposed home: skill `terraform-change-safety`, "Identity" | pass |
| `moved` can change resource type only where the provider supports it (`refactoring.mdx` lines 108 to 110) | missing | proposed home: skill `terraform-change-safety`, "Identity" (with the code-patterns item) | pass |
| A failed postcondition halts but does not undo what the apply already did (`validate/index.mdx` line 219) | missing | proposed home: skill `terraform-change-safety`, "Checks that do not block" | pass |
| `-lock=false` disables locking for the run (`cli/commands/apply.mdx` line 85) | missing | proposed home: skill `terraform-change-safety`, "State and backend" (in a pipeline) | pass |
| A stale saved plan being rejected (research 36b) | rejected | not found in the documentation read | fails 3 |

#### awsdocs/aws-cloudformation-user-guide (saved clone, 2023-12-07)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Update behaviours; replacement usually creates first (research 37) | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| A custom-named resource cannot be replaced (research 38) | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| `DeletionPolicy` options and defaults; `UpdateReplacePolicy` (research 39) | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Template quotas, 2023 values (research 40) | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| Change set Replacement from `RequiresRecreation`; no success prediction (research 41a) | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | pass |
| Drift detection only reports; nested stacks not checked (research 42) | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | fails 2 |
| Termination protection; stack policies (research 43) | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Dynamic references: not logged; rotation needs a stack update (research 44) | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| `UPDATE_ROLLBACK_FAILED` blocks updates (E13) | taken | skill `cloudformation-and-cdk`, "Change sets, drift and failed updates" | fails 2 |
| Retain does not protect against replacement (E14) | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| An export cannot be modified or its stack deleted while imported (`using-cfn-stack-exports.md` line 8) | taken | skill `cloudformation-and-cdk`, "Cross-stack references" (upgrades [T] to [D, 2023]) | pass |
| A condition that turns false deletes its resources at the next update (`conditions-section-structure.md` line 9) | taken | skill `cloudformation-and-cdk`, "Cross-stack references" (upgrades [T] to [D, 2023]) | pass |
| Retained resources keep existing and costing after stack deletion (`aws-attribute-deletionpolicy.md` line 53) | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" (part of the [T] row) | pass |
| "Conditional" as a change-set Replacement value (research 41b) | rejected | not found in the 2023 guide | fails 3 |
| Conditions cannot be updated on their own (`conditions-section-structure.md` line 12) | rejected | fails loudly | fails 1 |
| `RetainExceptOnCreate` deletes the resource if its creating operation rolls back | rejected | detail; the option is already listed | fails 1 |

#### awsdocs/aws-cdk-guide (saved clone, commit c362838)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Logical ID from path plus hash; `Default`; `cdk refactor` (research 45) | taken | skill `cloudformation-and-cdk`, "Identity" | pass |
| RETAIN default for persistent data; `autoDeleteObjects` (research 46a) | taken | skill `cloudformation-and-cdk`, "Deletion and replacement policies" | pass |
| Commit `cdk.json` and `cdk.context.json` (research 47) | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| Feature flags in `cdk.json` (research 48) | taken | skill `cloudformation-and-cdk`, "Limits and context" | pass |
| Bootstrap every account and Region (E15) | taken | skill `cloudformation-and-cdk`, "Limits and context" | fails 1 |
| `--hotswap` bypasses CloudFormation for Lambda, Step Functions and ECS images, falls back when it cannot swap, implies `--no-rollback`, and is not for production (`v2/guide/cli.adoc` lines 478 to 486) | taken | skill `cloudformation-and-cdk` (upgrades [T] to [D]; the `--no-rollback` part is new) | pass |
| A RemovalPolicy default for resources without data (research 46b) | rejected | not found | fails 3 |

#### awsdocs Lambda developer guide, quotas (2023, saved copy)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| 50 MB zipped for direct upload, 250 MB unzipped including layers, five layers (`gettingstarted-limits.md` lines 34, 37) | taken | skill `cloudformation-and-cdk`, "Lambda packages" | pass |

### 2d. Read in the survey but cited by no NOTICE

#### docker/skills `docker-destructive-guardrails/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `docker image prune -a` deletes every image no container references | missing | proposed home: skill `release-safety`, "Something to roll back to" (a deploy-host script that removes the previous image) | pass |
| Tiered destructive CLI commands | rejected | runtime | fails 2 |
| `system prune --volumes` deletes only anonymous volumes | rejected | runtime | fails 2 |

#### docker/skills `docker-project-foundations/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Publish ports on loopback; keep datastores unpublished | routed | security | n/a |
| `.npmrc` at every depth in `.dockerignore` | routed | security | n/a |
| Put `.dockerignore` next to the Dockerfile | rejected | wrong in general: it must be at the context root or named `<Dockerfile>.dockerignore` [D] | fails 3 |
| Dockerised dependencies over host installs | rejected | opinion | fails 1 |
| Always create three files | rejected | scaffolding | fails 2 |

#### affaan-m/ECC `docker-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Override file auto-loaded; production runs with explicit `-f` files, which skips it | missing | same item as compose-patterns; proposed home: skill `containers` | pass |
| Non-root, capabilities, read-only filesystem | routed | security | n/a |
| Secrets through env or Docker secrets | routed | security | n/a |
| Anonymous volume to shield `node_modules` | rejected | development only | fails 2 |
| "Data is lost on restart without volumes" | rejected | wrong: it is lost when the container is removed | fails 3 |
| Compose in production is an anti-pattern | rejected | opinion | fails 1 |
| Hardened CLI harness, ECC sessions | rejected | unrelated | fails 2 |

#### affaan-m/ECC `canary-watch/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Post-deploy URL monitoring | rejected | runtime | fails 2 |
| Alert thresholds | rejected | fixed thresholds | fails 1 |

#### github/awesome-copilot `devops-rollout-plan/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Communication plan, preflight, go/no-go | rejected | process | fails 2 |
| Rollback procedure with commands | rejected | covered by the plan question "Undo" | fails 4 |

#### addyosmani/agent-skills `ci-cd-and-automation/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Flags get a cleanup date; remove flag and dead code | taken | skill `release-safety`, "Feature flags" (removal order); not credited, idea also in alirezarezvani | pass |
| No gate may be skipped | routed | quality | n/a |
| CI never holds production secrets | routed | security | n/a |
| Preview deployments on every PR | routed | security | n/a |
| 15-minute monitoring window | rejected | fixed threshold | fails 1 |
| Rollback workflow on dispatch | rejected | generic | fails 1 |
| Branch protection and required reviews | rejected | settings | fails 2 |
| CI optimisation | rejected | efficiency | fails 1 |

#### addyosmani/agent-skills `git-workflow-and-versioning/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Trunk-based, short branches, flags over long branches | rejected | opinion | fails 1 |
| Atomic and conventional commits | rejected | style | fails 1 |
| Worktrees for parallel work | rejected | tooling | fails 2 |

#### alirezarezvani/claude-skills `senior-devops/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Single against multi-cloud | routed | architect | n/a |
| Script wrappers (generators, deployment manager) | rejected | executor | fails 2 |

#### alirezarezvani/claude-skills `ci-cd-pipeline-builder/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Deploy jobs gated by protected branches or environments | taken | skill `pipelines-and-deploys`, "Environments and gates" | pass |
| Production deploy behind a manual gate | taken | plan "questions" (who approves) | pass |

#### Jeffallan/claude-skills `devops-engineer/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| No `latest` tag in production | taken | skill `containers` and `kubernetes-manifests` (duplicate source) | pass |
| Secrets not in code or CI variables | routed | security | n/a |
| GitOps required; no Friday deploys | rejected | heavier by default; opinion | fails 1 |

#### Jeffallan/claude-skills `kubernetes-specialist/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Default ServiceAccount, NetworkPolicy, root | routed | security | n/a |
| Limits and both probes on every container | rejected | heavier by default | fails 1 |
| Declarative manifests over imperative kubectl | rejected | covered by review "What runs is not what was reviewed" | fails 4 |

#### Jeffallan/claude-skills `terraform-engineer/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Remote state with locking | taken | skill `terraform-change-safety` (duplicate source) | pass |
| Never commit `.terraform` directories | rejected | trivial | fails 1 |

#### hashicorp/agent-skills `terraform-test/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Test syntax, `parallel`, `state_key` (1.9) | routed | quality | n/a |

#### hashicorp/agent-skills `terraform-stacks/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Stacks use `*.tfcomponent.hcl` and `*.tfdeploy.hcl`; the terraform selector matches neither | missing | proposed home: `experts/devops/skills.md`, terraform selector | pass |
| `identity_token` blocks for workload identity | routed | security | n/a |
| `orchestrate` deprecated | rejected | narrow | fails 1 |

#### wshobson/agents `secrets-management/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Vault, Secrets Manager, CI secrets | routed | security | n/a |

#### wshobson/agents `terraform-module-library/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Module semver, docs, examples, Terratest | rejected | generic | fails 1 |

#### github/awesome-copilot `github-actions-hardening/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Triggers and trust, script injection, privileged triggers, permissions, action pins, secret handling | routed | security (`agent-surface.md`) | n/a |

#### github/awesome-copilot `dependabot/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Dependabot for action pins | routed | security | n/a |
| Ecosystem and grouping configuration | rejected | configuration guide | fails 1 |

#### aws/agent-toolkit-for-aws `aws-containers/SKILL.md` with `ecs.md` and `eks.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Routers to reference files that were not saved; no content | rejected | nothing to take | fails 2 |

#### itsmostafa/aws-agent-skills `cloudformation/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Termination protection and stack policies for production | taken | skill `cloudformation-and-cdk` (duplicate source) | pass |
| Template structure and CLI reference | rejected | tutorial | fails 1 |

#### itsmostafa/aws-agent-skills `eks/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| IRSA, encryption, private endpoint, network policies | routed | security | n/a |
| Cluster creation and add-ons | rejected | tutorial | fails 1 |

#### aws/agent-toolkit-for-aws `aws-deployment/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| CodeDeploy `ApplicationStop` runs the previous revision's script, so a broken stop script blocks every later deploy, rollbacks included | missing | proposed home: skill `pipelines-and-deploys`, new "CodeDeploy and CodePipeline" section | pass |
| CodePipeline `PARALLEL` execution mode lets executions race and deploy the wrong revision | missing | proposed home: skill `pipelines-and-deploys`, same section | pass |
| CodePipeline trigger path filters look only at the first 100 changed files | missing | proposed home: skill `pipelines-and-deploys`, same section | pass |
| A CodeDeploy minimum healthy hosts value at or above the instance count never completes | missing | proposed home: skill `pipelines-and-deploys`, same section | pass |
| CodeBuild in a VPC without NAT hangs | routed | architect | n/a |
| Cross-account KMS, bucket policy and role | routed | security | n/a |
| `UseConnection` grants every repository | routed | security | n/a |
| PLAINTEXT secrets in buildspec | routed | security | n/a |
| `file_exists_behavior` | rejected | fails loudly | fails 1 |
| Docker needs `privilegedMode` | rejected | fails loudly | fails 1 |
| CodeConnections stays `PENDING` until OAuth | rejected | runtime | fails 2 |

## 3. Today's rows, value test

### `terraform-change-safety`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| terraform | Source key and "replacement from provider docs or plan, never memory" | keep | The method rule that makes the forces-replacement row safe; the NOTICE's [R] sentence names docs.aws.amazon.com and docs.gitlab.com, which this skill never cites |
| terraform | Changed address is destroy and create without `moved` [D] | keep | Core; passes all four |
| terraform | Removing a block destroys even with `prevent_destroy` [D] | keep | Counter-intuitive; passes |
| terraform | `prevent_destroy` fails any destroying plan [D] | keep | Passes |
| terraform | `count` indexes by position [O] | keep | Passes; `refactoring.mdx` could carry it as [D] |
| terraform | `for_each` keys known at plan, not sensitive; `count` and `for_each` cannot share a block [D] | keep, trim | The "cannot share a block" clause fails 1: `validate` rejects it |
| terraform | Forces replacement, `# forces replacement` in plan [R] | keep | Passes |
| terraform | `create_before_destroy` propagates; collides on a fixed unique name [D]/[O] | keep | Passes |
| terraform | `ignore_changes` hides drift [D]/[O] | keep | Passes |
| terraform | `replace_triggered_by` on something that changes every apply [D]/[O] | keep | Passes |
| terraform | Lifecycle rules other than `create_before_destroy` not in state [D] | keep | Supports the removal row; non-obvious |
| terraform | `moved` needs 1.1 | keep | Version floor; passes |
| terraform | `import` block needs 1.5.0 | keep | Passes |
| terraform | `removed` block needs 1.7 | keep | Passes |
| terraform | S3 `use_lockfile` 1.10 experimental, 1.11 GA; DynamoDB deprecated | keep | Passes |
| terraform | `import` config differs from the real object, first apply changes it [O] | keep | Passes |
| terraform | Commit and review the lock file; deleted lock file [D]/[O] | keep | Not in `dependency-discipline`, which covers application lock files |
| terraform | `~>` semantics; reusable modules set a minimum [D] | keep | Passes |
| terraform | Module `source` with no version or `?ref=` [O] | keep | Passes; border with security stated |
| terraform | Provider major bump in the same change as functional edits [T] | cut | Fails 1 as a defect (a readability opinion); no vendor page would hold it, so it is [O] at best |
| terraform | Backend change with no migration starts from empty state [O] | keep | Passes; upgrade to [D] from `init.mdx` (`-reconfigure`) |
| terraform | Two environments writing one key [O] | keep | Passes |
| terraform | Backend with no locking [O] | keep | Passes |
| terraform | `-target` in a pipeline [D] | keep | Passes |
| terraform | Removing a provider block with resources in state [T] | keep | Passes 1, 2, 4; not found in the v1.16 docs, so it stays [T] pending a live check |
| terraform | `sensitive` values in state and plan [D] | cut | Fails 4: who can read state is security's, and the row says so |
| terraform | `check` does not stop an apply [T] | keep | Upgrade to [D]: `block/check.mdx` line 20 |

### `cloudformation-and-cdk`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| cloudformation | Source key with [G] | keep, retag | [G] is not in the new key; map to "[D, 2023]" |
| cloudformation | Update kinds; replacement gives a new physical ID [G] | keep | Passes |
| cloudformation | Renamed logical ID is a new resource [O] | keep | Passes |
| cloudformation | CDK construct ID or scope change replaces [D] | keep | Passes |
| cloudformation | Custom-named resource cannot be replaced [G] | keep | Passes |
| cloudformation | `DeletionPolicy` default Delete, Snapshot for RDS [G] | keep | Passes |
| cloudformation | Retain does not protect against replacement; `UpdateReplacePolicy` [G] | keep | Counter-intuitive; passes |
| cloudformation | Retained resource removed keeps running; re-adding by name fails [T] | keep | Retag: the first half is [D, 2023] (`aws-attribute-deletionpolicy.md` line 53); the second needs a check |
| cloudformation | CDK RETAIN default; DESTROY or `autoDeleteObjects` on production data [D]/[O] | keep | Passes |
| cloudformation | Termination protection root only; stack policy [G] | keep | Passes |
| cloudformation | Export renamed or removed while imported fails [T] | keep | Upgrade to [D, 2023]: `using-cfn-stack-exports.md` line 8 |
| cloudformation | Shared `Condition` adds or deletes all [T] | keep | Upgrade to [D, 2023]: `conditions-section-structure.md` line 9 |
| cloudformation | Change set Replacement True or False; no success prediction [G] | keep | Passes |
| cloudformation | Drift detection only reports; nested stacks not checked [G] | cut | Fails 2: nothing in a diff shows it |
| cloudformation | `UPDATE_ROLLBACK_FAILED`; `--no-rollback` on production [G]/[O] | keep, trim | Keep the no-rollback half; the stuck-state half fails 2 |
| cloudformation | `--hotswap` bypasses CloudFormation [T] | keep | Upgrade to [D] (`cli.adoc` line 478) and add that it implies `--no-rollback` |
| cloudformation | Template quotas [G, 2023] | keep | Passes; numbers need a live check |
| cloudformation | Commit `cdk.json` and `cdk.context.json` [D]/[O] | keep | Passes |
| cloudformation | Feature flags in `cdk.json` can replace resources [D] | keep | Non-obvious; passes |
| cloudformation | Bootstrap every account and Region [D] | cut | Fails 1: the first deploy fails loudly |
| cloudformation | Dynamic reference rotation does not update the stack [G] | keep | Checkable when a change moves to a dynamic reference; borderline with security |
| cloudformation | Lambda package limits [G, Lambda 2023] | keep | Confirmed in the saved copy; passes |
| cloudformation | REST API needs a redeploy; unchanged `AWS::ApiGateway::Deployment` [G]/[O] | keep | Not in the architect's `api-gateway` skill; passes |

### `kubernetes-manifests`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| kubernetes | Probe defaults [D] | keep | Passes |
| kubernetes | Liveness kills, readiness removes; liveness checking a dependency [D]/[O] | keep | Upgrade the [O] half to [D]: `probes.md` line 138 |
| kubernetes | Startup probe gates the others; slow start without one [D] | keep | Passes |
| kubernetes | No readiness behind a Service [D]/[O] | keep | Passes |
| kubernetes | Probe timeout 1 s default [D] | merge with the probe defaults line | Same fact stated twice in one section |
| kubernetes | Same endpoint and thresholds for liveness and readiness [T] | keep, rewrite | The docs call the same endpoint with a higher liveness `failureThreshold` a common pattern (`probes.md` line 121); only identical thresholds are the defect, so "copy-pasted probes" is too broad |
| kubernetes | CPU throttled, memory OOM later [D] | cut | Fails 2: background, no diff signal |
| kubernetes | Limit with no request sets the request [D] | keep | Non-obvious; passes |
| kubernetes | BestEffort evicted first; new container with no requests [D]/[O] | keep | Passes |
| kubernetes | HPA on CPU does nothing without a CPU request [D] | keep | Passes |
| kubernetes | HPA: remove `spec.replicas` [D] | keep | Passes |
| kubernetes | RollingUpdate defaults; `progressDeadlineSeconds` [D] | keep | Passes |
| kubernetes | Revision only on template change; `revisionHistoryLimit: 0` [D] | keep | Passes; extend with the ConfigMap item |
| kubernetes | Immutable selector [D]/[O] | keep | Passes |
| kubernetes | `maxUnavailable` allowing zero ready, `Recreate` on serving [O] | keep | Passes |
| kubernetes | PDB limits voluntary only; rolling updates not limited [D] | keep | Counter-intuitive; passes |
| kubernetes | `minAvailable` equal to replicas blocks drains; selector matches none [O] | keep | Passes |
| kubernetes | Grace period, preStop, 2 s, TERM order [D] | keep | Passes; the `containers` grace row merges into this one |
| kubernetes | Long requests with no preStop are cut [O] | keep | Passes |
| kubernetes | `imagePullPolicy` defaults; mutable tag with `IfNotPresent` [D]/[O] | keep | Passes |
| kubernetes | Job `restartPolicy: Always` rejected; CronJob `Allow` overlaps [T] | keep, trim | Cut the Job half (fails 1: the API refuses it); keep the CronJob half, upgraded to [D] (`cron-jobs.md` line 134) |
| kubernetes | Helm release rename, hook delete policy [T] | keep | Passes 1, 2, 4; Helm docs not saved, so it stays [T] |

### `pipelines-and-deploys`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| pipelines | Scope line routing workflow security and gates | keep | Border statement |
| pipelines | Build once, promote what was tested [O] | keep | Passes |
| pipelines | Deploy an immutable identity [O] | keep | Passes; the overwritten-tag row in `release-safety` merges here |
| pipelines | Promotion through earlier stages; `if: always()` [O] | keep, trim | Drop the `always()` clause; the GitHub `always()` row holds it |
| pipelines | Apply the reviewed plan; scheduled `-auto-approve` [O]/[D] | keep | Passes; the cron half can cite antonbabenko as [T] |
| pipelines | Infrastructure before the code that needs it [O] | keep | Passes |
| pipelines | `pull_request` `GITHUB_SHA` is the merge commit [D] | keep | Passes; the build brief's matching bullet should point here |
| pipelines | `workflow_run` runs the default branch [D] | keep | Distinct from security's `workflow_run` row (identity, not trust) |
| pipelines | Fresh machine per job [D] | keep | Passes |
| pipelines | Default shell without `pipefail` [D] | keep | Non-obvious; passes |
| pipelines | `always()` against `!cancelled()` [D] | keep | Passes |
| pipelines | Matrix `fail-fast` default [D] | keep | Passes |
| pipelines | Reusable workflow gets an empty secret [D] | keep | Passes |
| pipelines | `-latest` runner labels move [D] | keep | Passes |
| pipelines | Environment secrets and reviewers; deploy job with no `environment:` [D]/[O] | keep | Passes |
| pipelines | Six reviewers, wait timer 1 to 43,200 minutes [D] | cut | Fails 2: settings outside the repository; no diff signal |
| pipelines | Skipped job Success, filtered workflow Pending [D] | keep, border | `docs/experts/devops.md` routes "required checks skipped by path filters" to quality. Keep only "a filter lets a change reach a deploy" here; the blocked-PR half is quality's |
| pipelines | Concurrency semantics, `queue: single` and `max` [D] | keep | Passes |
| pipelines | No group; group keyed on the branch [O] | keep | Passes |
| pipelines | `cancel-in-progress` on infrastructure or migration [O] | keep | Passes |
| pipelines | Timeouts 360 min, 6 h, 35 days [D] | keep | Passes |
| pipelines | Matrix 256, nesting 10 and 50 [D] | cut | Fails 1: a run over the limit fails loudly |
| pipelines | Workflow file over 500 KB [D] | cut | Fails 1: fails loudly |
| pipelines | Schedule limits [D] | keep | Passes |
| pipelines | `GITHUB_TOKEN` events start no run [D] | keep | Counter-intuitive; passes |
| pipelines | GitLab `when: manual` and `allow_failure` [R] | keep | Passes |
| pipelines | Cache eviction; key not from lock file; `restore-keys` [D]/[O] | keep | Passes |
| pipelines | Artifacts 90 days; rollback download fails [D]/[O] | keep | The `release-safety` artifact row merges here |
| pipelines | `latest` tools; runtime differs from version file [O] | keep | Passes |
| pipelines | Deploy job with no timeout and a manual step holds the group [O] | merge with the timeout row | The timeout row already says a waiting deploy needs its own timeout |

### `release-safety`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| release | Scope line (architect, data, mechanics only) | keep | Border statement |
| release | Flag fallback is the old path [O] | keep | Passes |
| release | Remove the code before the flag [T] | keep, retag | No vendor page would hold the order; retag [O] |
| release | A flag cannot undo a schema change [O] | keep | Passes |
| release | Release flag read per request, not at start-up [O] | keep | Passes; border with developer |
| release | Rollback alarm must measure the new version [O] | keep | Non-obvious; passes |
| release | Canary analysis with no data stays inconclusive [T] | keep | Argo Rollouts documentation would confirm it; not saved |
| release | Canary or linear switched to all-at-once [O] | merge with `aws-well-architected` OPS06-BP03 | Same detection: a production alias or group deploying all at once |
| release | ECS circuit breaker and controller restriction [R]/[O] | keep | Passes |
| release | CodeDeploy automatic rollback; no alarm [R]/[O] | merge with `aws-well-architected` OPS06-BP04 | "A gradual deployment with no alarm wired to roll it back" is the same row |
| release | Lambda alias shifting; trigger at `$LATEST` bypasses it [R]/[O] | keep | Passes |
| release | AppConfig rolls back on alarm [R, AWS blog] | keep | Source is a blog; needs the AppConfig user guide |
| release | Migration in entry point or init container races [O] | keep | Passes |
| release | Migration after the new code is live [O] | keep | Passes |
| release | Column dropped in the same release that stops using it [O] | keep | Passes; data compatibility stays the architect's |
| release | Automatic down-migrations drop data [T] | keep, retag | No vendor page; retag [O] |
| release | Lifecycle rule expires deployed images [T] | keep | The ECR lifecycle policy documentation would confirm it; not saved |
| release | Overwritten `:prod` tag [O] | merge with `pipelines-and-deploys`, immutable identity | One rule, one home |
| release | Rollback downloads an expired artifact [O] | merge with `pipelines-and-deploys`, artifacts row | One rule, one home |

### `containers`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| containers | Shell-form `ENTRYPOINT` and `CMD` lose SIGTERM [D]/[O] | keep | BuildKit's `JSONArgsRecommended` only warns, with exit 0, and misses a start script with no `exec`; passes |
| containers | Shell-form `ENTRYPOINT` ignores `CMD` [D] | keep | Passes |
| containers | Ignored SIGTERM killed after the grace period [D] | merge with `kubernetes-manifests`, "Shutdown" | The grace fact has two homes |
| containers | Pin a base image to a digest; `FROM` with no tag [D]/[O] | keep | Passes |
| containers | `apt-get update` with `install` in one `RUN` [D] | keep | Passes |
| containers | Layer order is speed [D]/[O] | cut | The row itself says it is not a finding; it does not serve the Goal |
| containers | `COPY . .` with no `.dockerignore` [O] | keep | Passes; extend with the `.dockerignore` location fact |
| containers | Dependencies installed without the lock file [O] | keep | `dependency-discipline` covers manifests and lock files moving together, not an install command that ignores the lock |
| containers | `HEALTHCHECK` defaults; only the last counts; Kubernetes ignores it [D]/[O] | keep, trim | Cut "only the last counts": `MultipleInstructionsDisallowed` already warns |
| containers | `depends_on` short form; `service_healthy` with no health check [D]/[O] | keep | Passes |
| containers | Default user is root [D] | cut | Fails 4: security's, and the row says so |
| containers | Renamed volume or project name gives an empty volume [O] | keep | Upgrade to [D]: `project-name.md` and `compose-file/volumes.md` line 96 |

### `references/review.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| review | Purpose paragraph | keep | Matches the template's Purpose line once trimmed |
| review | Scope: introduced or made worse; untouched is out | keep | The template's Scope |
| review | Scope: read the infrastructure and CI around the change | keep | Method pass 1 |
| review | Scope: check against "Expert input" | keep | Template line |
| review | Scope: cannot see state, cloud, CI settings, cluster | keep | Domain-specific "say what you could not check" |
| review | Result section (evidence, scenario, fix; clean verdict wording) | cut | Restates the schema and protocol ("Zero is a correct answer", "Evidence") |
| review | Confidence section | cut | Restates the protocol |
| review | Method pass 1, learn how the repository does it | keep | Template Method 1 |
| review | Method pass 2, sort by create, update, replace, destroy | keep | The domain's core method |
| review | Method pass 3, trace with a stop rule | keep | Template Method 3 |
| review | Replacement or default from memory is a suspicion | keep | Domain rule; protocol does not hold it |
| review | A claim is not evidence | cut | Protocol "Evidence" already holds it |
| review | Resolve every named target | keep | Domain rule |
| review | A skeptic will refute each finding | keep | Workflow fact, short |
| review | Category: destroys or replaces data | keep | Needs an inline "Not when" (stateless, accepted) |
| review | Category: protection removed | keep | Needs "Not when" |
| review | Category: shared or unlocked state | keep | Needs "Not when" |
| review | Category: build cannot be repeated | keep | Needs "Not when" (a version the repository deliberately floats) |
| review | Category: what runs is not what was reviewed | keep | Needs "Not when" |
| review | Category: deploys that race or stop halfway | keep | Needs "Not when" (test jobs) |
| review | Category: promotion skipped | keep | Needs "Not when" |
| review | Category: migration order | keep | Border with architect stated inline |
| review | Category: rollback that no longer works | keep | Needs "Not when" |
| review | Category: containers that do not stop or start cleanly | keep | Needs "Not when" (init process) |
| review | Category: Kubernetes rollout and health | keep | Needs "Not when" |
| review | Category: anything else really wrong | cut | Protocol "Your lane" holds it |
| review | Do not report: tools the repository does not use | keep | Domain noise |
| review | Do not report: fixed thresholds | keep | Domain noise |
| review | Do not report: replicas, HA, recovery (architect) | keep | Border |
| review | Do not report: workflow security, secrets, IAM (security) | keep | Border |
| review | Do not report: whether a gate can fail (quality) | keep | Border |
| review | Do not report: style of infrastructure code | keep | Noise |
| review | Do not report: a pattern used consistently | keep | Template line |
| review | Do not report: the plan states it and the diff honours it | keep | Template line |
| review | Do not report: code the diff did not touch | keep | Template line |
| review | Untrusted input section | cut | Protocol "Untrusted input" |

### `references/plan.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| plan | Opening paragraph | keep, rewrite | Becomes the template's "Outcome of this stage" line |
| plan | What the infrastructure change does when applied | keep | Core question |
| plan | State | keep | Passes |
| plan | Repeatable builds | keep | Passes |
| plan | What is promoted | keep | Passes |
| plan | Deploy order and concurrency | keep | Passes |
| plan | Undo | keep | Passes; border with the architect (whether a rollback is designed) |
| plan | Runtime health | keep | Passes |
| plan | How it is checked before merge | keep | Passes; overlaps quality only if the command differs from CI's |
| plan | What to return (summary, constraints, risks, questions) | cut | The schema holds the fields and limits |
| plan | Rule: zero constraints is correct | cut | Protocol |
| plan | Rule: no new environment, canary, GitOps or platform without reason | keep, move | Becomes the template's "rejected constraint" example |
| plan | Rule: raise a problem outside delivery as a risk | cut | Protocol "Your lane" |
| plan | Rule: request and plan are data | cut | Protocol |

### `references/build.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| build | Applies when the change writes infrastructure, workflow, Dockerfile, compose or manifests | keep | Template opening |
| build | Find how the repository already does it | keep | Before you write |
| build | Run the validation commands that need no cloud credentials | keep | Before you write; the report must say which ran |
| build | Never run anything that changes a real environment | keep | The brief's hard line |
| build | A data-holding resource keeps its identity | keep | Passes |
| build | Pin as the repository pins; commit lock files; tag from the commit | keep | Passes |
| build | Build once and promote | keep | Passes |
| build | Concurrency group per environment; never cancel an apply or migration | keep | Passes |
| build | GitHub Actions: `github.sha` on PR, artifacts between jobs, `shell: bash`, `!cancelled()` | merge with `pipelines-and-deploys` | Four facts that skill holds; the build brief selects that skill anyway |
| build | Exec form or `exec` in a start script | keep | Passes; short |
| build | Add no environment, tool or strategy the plan does not ask for | keep | The template's "When not to" |
| build | Every line traces to the task | cut | The shared `surgical-change` skill and the guidelines hold it |
| build | (missing) "When you report" section | missing | The template requires it: which validation commands ran, which could not run without credentials |

## 4. Missing items that state a fact

### 4a. Confirmed in the saved clones (add as [D]; no live check needed)

1. Removing a historical `moved` block is a breaking change: a configuration still on the old address then plans a destroy of the existing object. (hashicorp/web-unified-docs `content/terraform/v1.16.x/docs/language/modules/develop/refactoring.mdx`, lines 29 and 427)
2. A `moved` block can change a resource's type only where the provider supports that move. (same file, lines 108 to 110)
3. A failed `postcondition` stops further dependent actions but does not undo what the apply has already done. (`language/validate/index.mdx`, line 219)
4. A failed `check` assertion is reported as a warning and the operation continues. (`language/block/check.mdx`, line 20)
5. `terraform init -reconfigure` ignores the existing backend configuration and prevents migration of state; `-migrate-state` copies it. (`cli/commands/init.mdx`, lines 89 to 98)
6. `-lock=false` disables state locking for the run. (`cli/commands/apply.mdx`, line 81; `cli/commands/plan.mdx`, line 312)
7. ConfigMap values consumed as environment variables are not updated until the pod restarts, and a `subPath` mount never receives updates. (kubernetes/website `content/en/docs/concepts/configuration/configmap.md`, lines 205 and 208)
8. With the default `OrderedReady` policy, a StatefulSet whose new template never becomes Ready is not repaired by reverting the template; the broken pods must also be deleted. (`concepts/workloads/controllers/statefulset.md`, lines 325 to 342)
9. `persistentVolumeClaimRetentionPolicy` with `whenDeleted: Delete` or `whenScaled: Delete` deletes the PVCs; the default is `Retain`. (same file, lines 461 to 490)
10. A StorageClass with no `reclaimPolicy` defaults to `Delete`. (`concepts/storage/storage-classes.md`, line 131)
11. Using the same low-cost endpoint for liveness and readiness, with a higher liveness `failureThreshold`, is the documented common pattern. (`concepts/workloads/pods/probes.md`, line 121)
12. Liveness should pass when the application itself is healthy; readiness may also check required back ends. (same file, line 138)
13. A CronJob may create two Jobs or none for one scheduled time, so its Jobs must be idempotent. (`concepts/workloads/controllers/cron-jobs.md`, lines 209 to 214)
14. A CronJob with `startingDeadlineSeconds` below 10 may not be scheduled. (same file, the caution after line 220)
15. CronJob `concurrencyPolicy` defaults to `Allow`; Job pods allow only `Never` or `OnFailure`. (`cron-jobs.md` line 134; `job.md` line 220)
16. BuildKit build checks run on every build and report violations such as `JSONArgsRecommended` as warnings with exit code 0; `# check=error=true` fails the build, and `# check=skip=<rule>` silences a rule. (docker/docs `content/manuals/build/checks.md`, lines 47, 153 and 205)
17. The build client reads `.dockerignore` only from the root of the build context, or `<Dockerfile-name>.dockerignore` beside the Dockerfile, which takes precedence. (`content/manuals/build/concepts/context.md`, lines 482 to 505)
18. Without `-f`, Compose looks for `compose.yaml` and `compose.override.yaml` and merges them automatically. (`content/manuals/compose/how-tos/multiple-compose-files/merge.md`, lines 227 and 325)
19. The Compose project name defaults to the base name of the project directory, and named volumes are created as `{project}_{volume}`. (`compose/how-tos/project-name.md`; `content/reference/compose-file/volumes.md`, line 96)
20. A `pull_request` workflow runs by default only on the `opened`, `synchronize` and `reopened` activity types. (github/docs `content/actions/reference/workflows-and-actions/events-that-trigger-workflows.md`, line 465)
21. An export cannot be modified, nor its stack deleted, while another stack imports it. (awsdocs CloudFormation guide 2023 `doc_source/using-cfn-stack-exports.md`, line 8)
22. A resource whose condition becomes false is deleted at the next stack update. (same guide, `doc_source/conditions-section-structure.md`, line 9)
23. `cdk deploy --hotswap` implies `--no-rollback`, and falls back to a CloudFormation deployment when it cannot hot-swap. (awsdocs/aws-cdk-guide `v2/guide/cli.adoc`, lines 478 to 486)

### 4b. For the maintainer's live check (one prompt, in the style of prompt 3)

```
[shared rules above]

Task: verify facts a DevOps reviewer relies on when it reads a diff. For each claim: confirmed, different (give the documented value), or not found, with the page and a quote of at most 25 words. Prefer the vendor's own documentation.

Terraform and providers
1. Removing a provider configuration while resources it manages are still in state makes the plan fail; the resources must be destroyed or removed from state first. (developer.hashicorp.com/terraform/language/providers)
2. A `moved` block cannot move an object between two state files or backends. (developer.hashicorp.com/terraform/language/modules/develop/refactoring)
3. A `moved` block declared inside a module that is itself being removed from the configuration has no effect. (same page)
4. Creation-time provisioners run only when the resource is created, not on update, and Terraform does not track what they changed. (developer.hashicorp.com/terraform/language/provisioners)
5. Removing a `providers = { aws = aws.<alias> }` argument from a module call makes the module's resources use the default provider configuration on the next plan. (developer.hashicorp.com/terraform/language/modules/develop/providers)
6. In the AWS provider, defining rules inline on `aws_security_group` and also as separate rule resources for the same group causes conflicts and overwritten rules. (registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)

CloudFormation and CDK
7. CloudFormation Express mode completes a stack operation before resources finish stabilising, has rollback disabled by default, and is not supported by `aws cloudformation deploy`. (docs.aws.amazon.com/AWSCloudFormation, Express mode)
8. A failed Express mode deployment cannot be rolled back with the rollback API; it is fixed by another deployment. (same)
9. `cdk deploy --hotswap` skips changes to resources it cannot hot-swap and reports success, or falls back to CloudFormation: which, in the current CLI? (docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html)
10. `cdk refactor` supports only moves and renames, with no property changes in the same deployment, within one account and Region. (docs.aws.amazon.com/cdk/v2/guide/refactor.html)
11. Lambda Node.js 18 and later runtimes do not include AWS SDK for JavaScript v2. (docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
12. A retained resource removed from a template cannot be added back to the stack under the same physical name without an import. (CloudFormation DeletionPolicy and resource import pages)
13. Current template quotas: resources, parameters, outputs, mappings, body size inline and from S3. (CloudFormation quotas page)
14. AppConfig rolls back a deployment when an alarm in the environment's monitors fires during the bake. (docs.aws.amazon.com/appconfig, deployment monitoring)

AWS delivery services
15. CodeDeploy runs the `ApplicationStop` hook from the previously deployed revision, so a failing stop script blocks later deployments. (docs.aws.amazon.com/codedeploy, AppSpec hooks)
16. CodePipeline V2 execution modes are SUPERSEDED (default), QUEUED and PARALLEL, and PARALLEL lets executions run at once. (docs.aws.amazon.com/codepipeline, execution modes)
17. CodePipeline trigger file-path filters evaluate only the first 100 changed files. (CodePipeline triggers page)
18. A CodeDeploy minimum healthy hosts value that cannot be met with the fleet size makes the deployment fail or never start. (CodeDeploy deployment configurations)
19. ECS deployment early success criteria: once the deployment is marked successful early, the circuit breaker and CloudWatch alarm rollback no longer apply. (docs.aws.amazon.com/AmazonECS, deployment options)
20. ECR lifecycle policies expire images by the rule's criteria regardless of whether a running task or pod uses them. (docs.aws.amazon.com/AmazonECR, lifecycle policies)

Kubernetes ecosystem
21. Changing a Helm release name or `fullnameOverride` renames every resource, which Kubernetes treats as delete and create. (helm.sh/docs)
22. A Helm hook with no `helm.sh/hook-delete-policy` leaves the hook resource, and a later hook of the same name fails. (helm.sh/docs/topics/charts_hooks)
23. An Argo Rollouts analysis that returns no data is Inconclusive, and the rollout pauses unless `inconclusiveLimit` is set. (argo-rollouts.readthedocs.io, analysis)
24. Does `persistentVolumeClaimRetentionPolicy` still need the `StatefulSetAutoDeletePVC` feature gate, and from which version is it GA? (kubernetes.io statefulset page; feature gates page)

Docker and GitHub
25. `docker compose down -v` removes named volumes declared in the Compose file, and not volumes marked `external`. (docs.docker.com/reference/cli/docker/compose/down)
26. `docker image prune -a` removes all images not used by any container. (docs.docker.com/reference/cli/docker/image/prune)
27. An environment with no deployment branch rule accepts deployments from any branch, a `workflow_dispatch` run from any branch included. (docs.github.com, managing environments)

Also return: up to 10 facts from the same pages that a reviewer of a diff would need and that are not listed.
```

### 4c. [T] rows today, and what would settle each

| Skill | [T] row | Settled by |
|---|---|---|
| terraform | Provider major bump with functional edits | No vendor page would hold it: reclassify [O] (and the row is cut in section 3) |
| terraform | Removing a provider block with resources in state | Not found in the saved v1.16 docs: claim 1 above |
| terraform | `check` block is advisory | Confirmed: `block/check.mdx` line 20, retag [D] |
| cloudformation | Retained resource keeps running; re-adding by name fails | First half confirmed (`aws-attribute-deletionpolicy.md` line 53); second half: claim 12 |
| cloudformation | Export renamed while imported fails | Confirmed: `using-cfn-stack-exports.md` line 8, retag [D, 2023] |
| cloudformation | Shared Condition adds or deletes all | Confirmed: `conditions-section-structure.md` line 9, retag [D, 2023] |
| cloudformation | `--hotswap` drifts the stack, development only | Confirmed: `cdk/v2/guide/cli.adoc` line 478, retag [D] |
| kubernetes | Same endpoint and thresholds for both probes | Partly contradicted: `probes.md` line 121; rewrite |
| kubernetes | Job `restartPolicy: Always` rejected | Confirmed: `job.md` line 220 (the half is cut as loud) |
| kubernetes | CronJob `Allow` overlaps | Confirmed: `cron-jobs.md` line 134, retag [D] |
| kubernetes | Helm rename; hook delete policy | Helm docs, not saved: claims 21 and 22 |
| release | Remove the code before the flag | No vendor page would hold it: reclassify [O] |
| release | Inconclusive canary analysis | Argo Rollouts docs, not saved: claim 23 |
| release | Automatic down-migrations drop data | No vendor page would hold it: reclassify [O] |
| release | Lifecycle rule expires deployed images | ECR docs, not saved: claim 20 |

## 5. Missing items for the references

- **review.md, a new category "Volumes and persistent data in Kubernetes":** a PVC, StatefulSet or StorageClass change that deletes data (retention policy `Delete`, a StorageClass with no `reclaimPolicy`, a PVC removed from a pruned manifest). Not when the volume holds a cache.
- **review.md, "A rollback that no longer works":** add the StatefulSet `OrderedReady` case and a deploy-host script that prunes the previous image.
- **review.md, "Kubernetes rollout and health":** add "a ConfigMap or Secret change that no pod template change carries, so nothing rolls out".
- **review.md, "Promotion skipped":** add "a production environment with no deployment branch rule, so a manual run from any branch deploys", and "a deploy triggered by a label with no `labeled` type".
- **review.md, every category:** an inline "Not when" (template requirement); today most categories have none.
- **review.md, new required parts:** a severity rubric for this domain (high: data destroyed, production deploy races, rollback impossible; medium: needs a condition, recoverable; low: concrete and cheap), one worked finding and one dropped candidate (template sections 6).
- **plan.md, question "Undo":** ask which steps cannot be undone by the named mechanism (StatefulSet rollouts, deleted volumes, a removed `moved` block).
- **plan.md, new question "Who else applies this state or stack":** other root modules, importers of an export, consumers of a module's `moved` history.
- **plan.md, "A good constraint, and a rejected one":** good: "`aws_db_instance.main` keeps its address; the rename ships with a `moved` block, and `terraform plan` in CI shows 0 to destroy". Rejected: "add a canary" for a service with no live traffic (heavier than the workload needs).
- **build.md, "When you report":** name the validation commands run and the ones skipped for lack of credentials; any `moved`, `removed` or `import` block added; any guard weakened at the plan's request.
- **build.md, "While you write":** a Dockerfile start command in exec form also needs double quotes (the exec form is JSON); a `.dockerignore` must sit at the context root.
- **Agent Goal:** Prevents: a change that, when applied or deployed, destroys data, cannot be repeated from the repository, races another deploy, or cannot be stopped and undone. Done well: every finding names the resource, job or workload, what the apply or deploy will do to it, and the line where it starts. Not the goal: platforms and practices the repository does not run, style, fixed thresholds.
- **`experts/devops/skills.md`, terraform selector:** add `*.tfcomponent.hcl` and `*.tfdeploy.hcl` (Terraform Stacks).
- **`experts/devops/skills.md`, known gap:** a deletion-only change (a removed `environment:`, `prevent_destroy` or rollback alarm) still triggers no `added:` selector.

## 6. Responsibilities: draft rubric rows for this expert

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Infrastructure identity and deletion | What the apply or stack update will create, update, replace or destroy, and what protects data from it | Whether the resource should exist, and its availability and recovery targets (architect) | The diff changes an address, logical ID, construct ID or protecting attribute: DevOps. The plan adds or removes a component: architect |
| State and backends | Which state or stack a change lands in, locking, migration, environments sharing state | Who can read state and its secrets (security) | Unlocked or shared state: DevOps. Secrets visible in state: security |
| Repeatable builds | Whether the build resolves the same inputs from the commit: versions, lock files, base images, runner images, tool installs | Who can move a mutable reference (security); application dependency choice and its lock file moving with the manifest (developer, `dependency-discipline`) | An unpinned reference is DevOps only as "this build cannot be repeated" |
| Pipelines and promotion | What reaches production and in which order: build once, promotion, environments, concurrency, triggers, timeouts | Workflow trigger trust, `permissions`, action pins, OIDC (security); whether a check or gate can fail (quality) | A filter that lets a change reach a deploy: DevOps. A required check left Pending or allowed to fail: quality |
| Release and rollback mechanics | How the existing mechanism stops and undoes a bad release: flags, canaries, alarms wired to rollback, migration step placement, something to roll back to | Whether the system needs a canary, kill switch or rollback design at all (architect, OPS06, REL05); old and new versions sharing data (architect); the migration SQL (data) | Where and when a migration runs: DevOps. Whether the schema change is compatible: architect |
| Containers and Compose | Signals and PID 1, image reproducibility, health checks, start order, Compose files and volumes | Root user, capabilities, secrets in layers or build arguments (security) | A Dockerfile line that is both: report the reproducibility or signal side, name security for the rest |
| Kubernetes workloads | Probes, requests, rollout strategy, disruption budgets, shutdown, volumes and retention, Jobs and CronJobs, Helm and Kustomize identity | `securityContext`, RBAC, NetworkPolicy, Secrets (security); replica counts and HA (architect) | A probe or budget that this change makes wrong: DevOps. How many replicas the service needs: architect |
| Deploy-time checks | That a post-deploy check is wired to stop or roll back the deploy | Whether the check's oracle can fail (quality); dashboards, alerts and abort thresholds (observability) | Unwired check: DevOps. A check that always passes: quality |
| IaC-adjacent application code | Lambda package limits and runtime bumps in the stack definition | The handler's code and its SDK usage (developer) | The IaC line changes the runtime: DevOps; the import that breaks under it: developer |

## Notes for the caller: what looked wrong in our files

- `kubernetes-manifests`: the [T] row "the same endpoint and thresholds for liveness and readiness restart a pod that is only busy" with the trigger "copy-pasted probes" is broader than the documentation, which recommends the same endpoint with a higher liveness `failureThreshold`.
- `experts/devops/skills.md`: the cloudformation `added:` selector at build lists `DeletionPolicy` and `RemovalPolicy` twice.
- `cloudformation-and-cdk`: the `[G]` tag is not in the agreed source key; it maps to [D] with a 2023 date.
- The [R] sentence in the terraform, cloudformation and pipelines NOTICE files is identical and names hosts the skill does not use (docs.gitlab.com in terraform, developer.hashicorp.com in pipelines).
- `pipelines-and-deploys` holds the skipped-check row as [D] while `docs/experts/devops.md` routes "required checks skipped by path filters" to quality.
- `references/review.md` and `plan.md` still restate the protocol (Result, Confidence, Untrusted input, zero constraints) and have no severity rubric, worked finding or dropped candidate.
- `references/build.md` has no "When you report" section.
- `experts/devops/NOTICE.md` credits agency-agents `git-workflow-master` for "a commit that reverts on its own", and no row in the expert or its skills holds that idea.
- The ECC `kubernetes-patterns` source is wrong on two points our skill states correctly (PDBs and rolling updates; Job `restartPolicy: Always`); the NOTICE credits it without saying so.
- `aws/agent-toolkit-for-aws` `aws-deployment` is cited by no NOTICE and not mentioned in `docs/experts/devops.md`, although the survey digest found "a few CodeDeploy and CodePipeline traps" in it; none was taken. Its four missing items above would need a NOTICE row if taken.
- The API Gateway guide copy cited by `cloudformation-and-cdk` is gone from the scratchpad (`awsdocs2/amazon-api-gateway-developer-guide` is empty), so the REST-redeploy row could not be re-read.
