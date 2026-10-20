# Delivery brief

This applies when the change writes infrastructure code, a CI/CD workflow, a Dockerfile, a compose file or Kubernetes manifests. It adds no work: if the plan does not ask for something, do not build it. Where this brief and the plan disagree, the plan wins.

## Before you write

- Find how the repository already does it: the IaC root, its backend and module layout, how environments are named, the workflow that deploys, how images are tagged. Follow it, even where you would have chosen differently.
- Find the repository's own validation commands (format, validate, lint, schema check, a plan or synth) in its build files and CI. Run the ones that need no cloud credentials before you report done, and fix what they report.

## While you write

- Never run anything that changes a real environment: no apply, deploy, `kubectl apply`, `helm upgrade`, stack update or push of an image. The pipeline does that. Plans, synths, dry runs and local builds are fine.
- A resource that holds data keeps its identity. Renaming or moving it in code gets a `moved` block, a kept logical id or an import, never a destroy and a create. Do not remove or weaken a deletion or retention guard the repository uses.
- Pin what you add the way the repository pins: provider, module, chart, base image, tool and runtime versions. Commit the lock files the tool writes. Tag what you build from the commit, never with `latest`.
- Build once and promote what was built and tested; do not rebuild per environment.
- A deploy job gets a concurrency group per target environment, and never cancels a run that is applying infrastructure or migrating data.
- In GitHub Actions, deploy what the push to the default branch built (on a pull request `github.sha` is a merge commit), pass files between jobs as artifacts, name `shell: bash` where a pipe must fail the step, and use `!cancelled()` rather than `always()` on anything that deploys.
- A container's main process receives the stop signal: use the exec form for the start command, or `exec` in a start script.
- Add no environment, tool, platform, approval step or rollout strategy the plan does not ask for.
- Every line you change traces to the task. Do not reformat or reorganise infrastructure code the change does not need.

## Skills

The build command selects these in code from the plan, by the rule in parentheses, and passes their text with this brief: `files` matches file names the plan mentions, `added` matches the plan's text. This brief joins a build only when the plan selects at least one of them. This section is not part of the brief the implementer reads.

- `experts/skills/terraform-change-safety/skill.md` (files: *.tf, *.tf.json, *.tfvars, .terraform.lock.hcl, terragrunt.hcl; added: [Tt]erraform|OpenTofu): load when the plan touches Terraform or OpenTofu code, variables, a backend or the lock file, for what an apply will move, replace or destroy.
- `experts/skills/cloudformation-and-cdk/skill.md` (files: template.yaml, template.yml, template.json, *.template.json, *.template.yaml, *.template.yml, samconfig.toml, cdk.json, cdk.context.json; added: CloudFormation|\bSAM\b|\bCDK\b|DeletionPolicy|RemovalPolicy|AWS::Serverless::|AWS::ApiGateway::Deployment|DeletionPolicy|UpdateReplacePolicy|Fn::ImportValue|!ImportValue|RemovalPolicy|removal_policy|autoDeleteObjects|auto_delete_objects|overrideLogicalId|override_logical_id|aws-cdk-lib|aws_cdk): load when the plan touches a CloudFormation or SAM template or a CDK app, for logical ids, replacement and deletion policies.
- `experts/skills/kubernetes-manifests/skill.md` (files: Chart.yaml, values.yaml, values-*.yaml, values.*.yaml, kustomization.yaml, kustomization.yml; added: Kubernetes|\bHelm\b|kubectl|Kustomize|livenessProbe|readinessProbe|startupProbe|maxUnavailable|maxSurge|minAvailable|PodDisruptionBudget|HorizontalPodAutoscaler|terminationGracePeriodSeconds|preStop|imagePullPolicy|kind:\s*(Deployment|StatefulSet|DaemonSet|Job|CronJob)\b): load when the plan adds or changes Kubernetes workloads, Helm charts or values, or Kustomize overlays, for probes, resources, rollouts and disruption budgets.
- `experts/skills/pipelines-and-deploys/skill.md` (files: .github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, buildspec.yml, buildspec.yaml, appspec.yml, appspec.yaml, Jenkinsfile, action.yml, action.yaml; added: GitHub Actions|GitLab CI|CI/CD|deploy job|release pipeline|deployment pipeline): load when the plan adds or changes a CI/CD workflow, for promotion, environments, deploy concurrency, caches and limits.
- `experts/skills/release-safety/skill.md` (added: [Ff]eature flag|[Cc]anary deploy|[Cc]anary release|blue.green|traffic shift|LaunchDarkly|launchdarkly|LDClient|ldclient|OpenFeature|openfeature|[Uu]nleash|GrowthBook|growthbook|[Ss]tatsig|[Ff]lipt|AWS::AppConfig|aws_appconfig_|DeploymentPreference|AutoPublishAlias|CodeDeployDefault\.|AWS::CodeDeploy|aws_codedeploy_|[Dd]eploymentCircuitBreaker|deployment_circuit_breaker|AnalysisTemplate|canarySteps|kind:\s*Rollout|prisma migrate deploy|alembic upgrade|manage\.py migrate|db:migrate|flyway |liquibase |LifecyclePolicy|lifecycle_policy): load when the plan touches a feature flag SDK, a canary or traffic-shifting deployment, a migration command in the release, or an image lifecycle rule.
- `experts/skills/containers/skill.md` (files: Dockerfile, Dockerfile.*, *.Dockerfile, *.dockerfile, Containerfile, .dockerignore, compose.yaml, compose.yml, compose.*.yaml, compose.*.yml, docker-compose.yml, docker-compose.yaml, docker-compose.*.yml, docker-compose.*.yaml; added: Dockerfile|docker compose|docker-compose|[Cc]ontainer image): load when the plan adds or changes a Dockerfile, a .dockerignore or a compose file, for signals, repeatable images and start order.
