# Skills: devops

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

## plan

- terraform-change-safety
- cloudformation-and-cdk
- kubernetes-manifests
- pipelines-and-deploys
- release-safety
- containers

## build

- terraform-change-safety (files: *.tf, *.tf.json, *.tfvars, .terraform.lock.hcl, terragrunt.hcl; added: [Tt]erraform|OpenTofu)
- cloudformation-and-cdk (files: template.yaml, template.yml, template.json, *.template.json, *.template.yaml, *.template.yml, samconfig.toml, cdk.json, cdk.context.json; added: CloudFormation|\bSAM\b|\bCDK\b|DeletionPolicy|RemovalPolicy|AWS::Serverless::|AWS::ApiGateway::Deployment|DeletionPolicy|UpdateReplacePolicy|Fn::ImportValue|!ImportValue|RemovalPolicy|removal_policy|autoDeleteObjects|auto_delete_objects|overrideLogicalId|override_logical_id|aws-cdk-lib|aws_cdk)
- kubernetes-manifests (files: Chart.yaml, values.yaml, values-*.yaml, values.*.yaml, kustomization.yaml, kustomization.yml; added: Kubernetes|\bHelm\b|kubectl|Kustomize|livenessProbe|readinessProbe|startupProbe|maxUnavailable|maxSurge|minAvailable|PodDisruptionBudget|HorizontalPodAutoscaler|terminationGracePeriodSeconds|preStop|imagePullPolicy|kind:\s*(Deployment|StatefulSet|DaemonSet|Job|CronJob)\b)
- pipelines-and-deploys (files: .github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, buildspec.yml, buildspec.yaml, appspec.yml, appspec.yaml, Jenkinsfile, action.yml, action.yaml; added: GitHub Actions|GitLab CI|CI/CD|deploy job|release pipeline|deployment pipeline)
- release-safety (added: [Ff]eature flag|[Cc]anary deploy|[Cc]anary release|blue.green|traffic shift|LaunchDarkly|launchdarkly|LDClient|ldclient|OpenFeature|openfeature|[Uu]nleash|GrowthBook|growthbook|[Ss]tatsig|[Ff]lipt|AWS::AppConfig|aws_appconfig_|DeploymentPreference|AutoPublishAlias|CodeDeployDefault\.|AWS::CodeDeploy|aws_codedeploy_|[Dd]eploymentCircuitBreaker|deployment_circuit_breaker|AnalysisTemplate|canarySteps|kind:\s*Rollout|prisma migrate deploy|alembic upgrade|manage\.py migrate|db:migrate|flyway |liquibase |LifecyclePolicy|lifecycle_policy)
- containers (files: Dockerfile, Dockerfile.*, *.Dockerfile, *.dockerfile, Containerfile, .dockerignore, compose.yaml, compose.yml, compose.*.yaml, compose.*.yml, docker-compose.yml, docker-compose.yaml, docker-compose.*.yml, docker-compose.*.yaml; added: Dockerfile|docker compose|docker-compose|[Cc]ontainer image)

## review

- terraform-change-safety (files: *.tf, *.tf.json, *.tfvars, .terraform.lock.hcl, terragrunt.hcl)
- cloudformation-and-cdk (files: template.yaml, template.yml, template.json, *.template.json, *.template.yaml, *.template.yml, samconfig.toml, cdk.json, cdk.context.json; added: AWS::Serverless::|AWS::ApiGateway::Deployment|DeletionPolicy|UpdateReplacePolicy|Fn::ImportValue|!ImportValue|RemovalPolicy|removal_policy|autoDeleteObjects|auto_delete_objects|overrideLogicalId|override_logical_id|aws-cdk-lib|aws_cdk)
- kubernetes-manifests (files: Chart.yaml, values.yaml, values-*.yaml, values.*.yaml, kustomization.yaml, kustomization.yml; added: livenessProbe|readinessProbe|startupProbe|maxUnavailable|maxSurge|minAvailable|PodDisruptionBudget|HorizontalPodAutoscaler|terminationGracePeriodSeconds|preStop|imagePullPolicy|kind:\s*(Deployment|StatefulSet|DaemonSet|Job|CronJob)\b)
- pipelines-and-deploys (files: .github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, buildspec.yml, buildspec.yaml, appspec.yml, appspec.yaml, Jenkinsfile, action.yml, action.yaml)
- release-safety (added: LaunchDarkly|launchdarkly|LDClient|ldclient|OpenFeature|openfeature|[Uu]nleash|GrowthBook|growthbook|[Ss]tatsig|[Ff]lipt|AWS::AppConfig|aws_appconfig_|DeploymentPreference|AutoPublishAlias|CodeDeployDefault\.|AWS::CodeDeploy|aws_codedeploy_|[Dd]eploymentCircuitBreaker|deployment_circuit_breaker|AnalysisTemplate|canarySteps|kind:\s*Rollout|prisma migrate deploy|alembic upgrade|manage\.py migrate|db:migrate|flyway |liquibase |LifecyclePolicy|lifecycle_policy)
- containers (files: Dockerfile, Dockerfile.*, *.Dockerfile, *.dockerfile, Containerfile, .dockerignore, compose.yaml, compose.yml, compose.*.yaml, compose.*.yml, docker-compose.yml, docker-compose.yaml, docker-compose.*.yml, docker-compose.*.yaml)
