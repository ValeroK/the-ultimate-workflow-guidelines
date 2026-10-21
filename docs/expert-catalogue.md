# The expert catalogue: which experts the plugin needs, and what already exists for each

The plugin does two things:

1. **The ADLC workflow.** Plan, tests, build, review and harvest, with confirmation points and gates. This exists.
2. **The expert catalogue.** Experts that any phase can bring in. This document lists them. Nine are built: `architect`, `softarch`, `developer`, `quality`, `security`, `devops`, and, with no skills yet, `genai`, `frontend` and `data`. The first six have shared skills (see "Skills by expert and stage"). Experts 6, 8 and 11 to 14 are not built.

Skills are chosen in code at review, build and tests, and by a model question at plan; the chosen text is pasted into the expert's prompt. How it works: [Shared skills](adding-an-expert.md#shared-skills).

## Where the list comes from

- **All 75 skills and agent repositories** from the survey (`docs/skills-survey-2026-10-20.md`), not only addyosmani and ECC.
- **Every agent definition in them, by name.** There are 924 distinct agent names in the 21 repositories that ship agents, plus about 120 more in `msitarzewski/agency-agents`. Among the 67 repositories with skills there are 3,694 distinct skill names. The names are in `docs/skills-catalog-2026-10-20.json`.
- **The survey's 146 scored candidates**, grouped by domain, with their scores and their "use as base" or "reference" verdicts.

An agent was placed under an expert by its name and the survey's domain notes, not by reading every file. The quality judgments are the survey's, and the survey read samples, not everything.

## The experts

"Have" means the expert exists in the plugin today. Upstream agents are listed by repository. The survey candidates column gives the best-scored skill sources for that domain (score 0 to 100).

### 1. System architect (have: `architect`)
- **Owns:** components and services, the flows between them, AWS service fit, failure handling at boundaries, state, cost, the Well-Architected concerns, and multi-tenancy (isolation models, tenant context through every layer, tenant isolation where data is read, noisy neighbours, per-tenant limits and cost).
- **Stages:** plan, review.
- **Sources compared and skills:** `docs/experts/architect.md`.
- **Upstream agents:**
  - ECC `architect`
  - awesome-copilot `aws-principal-architect`, `aws-serverless-architect`, `se-system-architecture-reviewer`, `arch`
  - wshobson and buildwithclaude `cloud-architect`, `architect-review`
  - awslabs aidlc `architect-agent`, `aidlc-architecture-reviewer-agent`
  - anthropics `architecture-critic`
- **Survey candidates:** AWS serverless (aws/agent-toolkit, 62), finops (agency-agents, 66), tenancy (cloudflare, 70; RLS from supabase, 82, for the data-layer mechanics), our `distributed-systems-resilience-guidelines` and `system-architect-engineering-guidelines` skills.

### 2. Software architect (have: `softarch`)
- **Owns:** module boundaries, dependency direction, public contracts and their compatibility, data ownership between modules.
- **Stages:** plan, review.
- **Built:** three skills, every fact checked live by the maintainer; see `docs/experts/softarch.md`.
- **Upstream agents:**
  - ECC and anthropics `code-architect`, `type-design-analyzer`
  - wshobson and buildwithclaude `backend-architect`, `graphql-architect`
  - wshobson `event-sourcing-architect`, `monorepo-architect`
  - awesome-copilot `api-architect`, `repo-architect`
  - agency-agents `software-architect`, `backend-architect`, `api-platform-engineer`
- **Survey candidates:** API design (addyosmani, 62), our `modularity-and-evolution-guidelines` skill.

### 3. Senior developer (have: `developer`)
- **Owns:** craft in new code: simplicity, SOLID, duplication, naming, error handling, dependencies. It is also the standing brief at build.
- **Stages:** plan, build, review.
- **Skills:** see the table below and `docs/experts/developer.md`.
- **Upstream agents:**
  - addyosmani `code-reviewer`
  - ECC `code-reviewer`, `code-simplifier`, `silent-failure-hunter`, `refactor-cleaner`, and 20 language reviewers (`python-`, `typescript-`, `go-`, `rust-`, `java-reviewer` and others)
  - anthropics `code-simplifier`, `silent-failure-hunter`
  - awesome-copilot `principal-software-engineer`, `gem-reviewer`, `gem-code-simplifier`, `janitor`, `tech-debt-remediation-plan`
  - agency-agents `senior-developer`, `code-reviewer`, `minimal-change-engineer`
  - alirezarezvani `karpathy-reviewer`, `cs-senior-engineer`
- **Survey candidates:** error and silent-failure handling (anthropics claude-plugins-official, 58), footguns (trailofbits, 66), insecure defaults (trailofbits, 78, also a security skill).

### 4. Quality engineer (have: `quality`)
- **Owns:** tests, evals, fixtures and CI gates, and whether each can actually fail.
- **Stages:** plan, tests (always), build (a standing test brief), review. Skill: `test-craft`.
- **Upstream agents:**
  - addyosmani and anthropics `test-engineer`
  - ECC and anthropics `pr-test-analyzer`
  - ECC `e2e-runner`, `tdd-guide`
  - awesome-copilot `playwright-tester`, `qa-subagent`, `quality-playbook`, `terratest-module-testing`, `tdd-red`, `tdd-green`
  - alirezarezvani `test-architect`, `test-debugger`
  - wshobson `test-automator`, `qa`
  - trailofbits `test-generator`
- **Survey candidates:** e2e with Playwright (alirezarezvani, 66), worst-case test cases (emilkowalski break-ui, 72), test audit (morluto/rea, 58), agent evals (muratcankoylan, 72), reviewgate (tech-leads-club, 74).

### 5. Security (have: `security`)
- **Owns:** application security, authentication and authorisation, secrets, dependencies and supply chain, agent and CI configuration.
- **Stages:** plan, tests, review. Also references `agent-surface.md` and `dependencies.md`, and the dependency audit script `experts/deps-audit.js`.
- **Upstream agents:**
  - addyosmani, anthropics, wshobson and buildwithclaude `security-auditor`
  - ECC `security-reviewer`
  - awesome-copilot `se-security-reviewer`, `sast-sca-security-analyzer`, `agent-governance-reviewer`
  - wshobson `backend-security-coder`, `frontend-security-coder`, `threat-modeling-expert`
  - agency-agents `appsec-engineer`, `security-architect`, `cloud-security-architect`, `secrets-credential-engineer`, `ai-generated-code-auditor`
- **Survey candidates:** OWASP and ASVS (agamm, 85), RLS and tenant isolation (supabase, 82), insecure defaults (trailofbits, 78), appsec hardening (addyosmani, 74), authorisation (agency-agents, 74), threat model (tech-leads-club, 72), cloud security and secrets (cloudflare and agency-agents, 68 to 72), web security (tech-leads-club, 62).

### 6. Generative AI engineer (have: `genai`, plan, tests and review; skills wait for the fact-check, see `docs/experts/genai.md`; merges the former 6, agent-system architect, and 7, AI/LLM engineer)
- **Owns:** prompts and prompt engineering, model calls and their failure modes, agent orchestration and tool design (tool contracts, loop and budget limits, human approval), context and memory, retrieval and embeddings (RAG), guardrails, token cost, model fallback, evaluation of model output, MCP servers. On AWS: Amazon Bedrock (models, Guardrails, Knowledge Bases, Prompt Management, batch inference, prompt caching, cross-region inference) and Amazon Bedrock AgentCore (Runtime, Gateway and its other services).
- **Stages:** plan, tests, review.
- **Reference material ready:** the Well-Architected Generative AI Lens (November 19, 2025): its best-practice IDs (`GENOPS`, `GENSEC`, `GENREL`, `GENPERF`, `GENCOST`, `GENSUS`), titles and what a change can show, in `docs/research/aws-well-architected-2026-10-20.md`. Bedrock pricing facts there: batch inference at half the on-demand price (primary); prompt caching savings from a secondary source only. AgentCore still needs its own research pass.
- **Upstream agents:**
  - ECC `agent-evaluator`, `harness-optimizer`, `loop-operator`, `rag-pipeline-reviewer`, `mle-reviewer`
  - agency-agents `multi-agent-systems-architect`, `agents-orchestrator`, `agentic-identity-trust`, `automation-governance-architect`, `ai-engineer`, `rag-pipeline-engineer`, `prompt-engineer`, `search-relevance-engineer`
  - awesome-copilot `context-architect`, `agent-governance-reviewer`, `declarative-agents-architect`, `custom-agent-foundry`, `prompt-engineer`, `prompt-builder`, `se-responsible-ai-code`
  - buildwithclaude `mcp-server-architect`, `mcp-security-auditor`, `agent-expert`, `ai-engineer`, `prompt-engineer`
  - wshobson `ai-engineer`, `prompt-engineer`, `vector-database-engineer`, `eval-judge`
  - anthropics `agent-sdk-verifier-py`, `agent-sdk-verifier-ts`
  - aws `llm2bedrock-prompt-evaluator`
- **Survey candidates:** agent security (cloudflare, 82; ECC, 80), MCP server security and release QA (awesome-copilot, 82), Bedrock AgentCore (aws/agent-toolkit, 80), retrieval and RAG review (ECC, 82), pgvector and hybrid search (timescale, 82), tool design (muratcankoylan, 76), Claude API pitfalls (anthropics, 74), agent evals (muratcankoylan, 72), LLM security (alirezarezvani, 63), LLM cost (ECC, 62), agent context (muratcankoylan, 58), RAG metrics (buildwithclaude, 55), agent SDK (anthropics, 48).
- **Likely skills:** prompt engineering, agent loop and tool design, RAG, Bedrock and AgentCore, LLM cost.

### 7. (merged into 6)

### 8. Data and database (have: `data`, plan, tests and review; skills wait for the fact-check, see `docs/experts/data.md`)
- **Owns:** Postgres and pgvector schema, migrations, queries and indexes, DynamoDB key design, and data lifecycle at the data layer. Multi-tenancy is the architect's (decided 2026-10-20), including tenant isolation where data is read.
- **Stages:** plan, review.
- **Upstream agents:**
  - ECC `database-reviewer`
  - wshobson `database-architect`, `sql-pro`
  - wshobson and buildwithclaude `database-optimizer`, `database-admin`, `data-engineer`
  - awesome-copilot `postgresql-dba`, `neon-migration-specialist`, `neon-optimization-analyzer`
  - agency-agents `database-optimizer`, `database-reliability-engineer`, `data-engineer`
  - alirezarezvani `migration-planner`
- **Survey candidates:** migrations (timescale, 84), pgvector (timescale, 82), RLS (supabase, 82), DB reliability (agency-agents, 72), Postgres table design (timescale and wshobson, 62 to 70), AWS data (aws/agent-toolkit, 72). (Tenancy, cloudflare 70, moved to the architect.)
- **Full catalogue sweep (2026-10-20), skills to read when it is built:**
  - Vendors first: planetscale/database-skills `postgres`, `mysql`; supabase/agent-skills `supabase-postgres-best-practices`; timescale/pg-aiguide `design-postgres-tables`, `postgres-database-migration`, `postgres`, `pgvector-semantic-search`, `postgres-hybrid-text-search`; aws/agent-toolkit `amazon-dynamodb`, `amazon-aurora-postgresql`, `aurora-dsql`, `aws-database`, `connecting-lambda-to-dynamodb`.
  - Community: ECC `postgres-patterns`, `database-migrations`, `prisma-patterns`, `mysql-patterns`, `redis-patterns`; itsmostafa/aws-agent-skills `dynamodb`, `rds`; wshobson `postgresql-table-design`, `sql-optimization-patterns`, `database-migration`; Jeffallan `postgres-pro`, `sql-pro`, `database-optimizer`; alirezarezvani `database-designer`, `database-schema-designer`.
  - Research prompt: 6 in `docs/expert-research-prompts.md` (Postgres locks and migrations, transactions, connection pools, DynamoDB, data lifecycle).
- **Boundaries:** the architect owns where state lives and how the system fails around it, and caching as a pattern; this expert owns schema, migrations, queries, indexes, transactions and the data stores' own semantics (Redis as a store included). Vector stores used for retrieval are shared with the Generative AI engineer. Data engineering (dbt, Airflow, data lakes, Redshift, Snowflake, BigQuery) is not in scope unless decided otherwise.

### 9. DevOps engineer (have: `devops`; merges the former 9, cloud infrastructure and IaC, and 10, delivery and CI/CD)
- **Owns:** how infrastructure is written and changed (Terraform, CDK, CloudFormation, SAM: state, replacement and deletion, drift, pinning), containers and Kubernetes, CI/CD pipelines and their deploy mechanics (promotion, environments, concurrency, build once), deployment and rollback mechanics, feature flags and release safety. The architect owns *what* is built and how it fails; this expert owns *how* it is built, shipped and changed. CI workflow security (triggers, permissions, action pinning, OIDC), secrets and IAM stay with security; gates that cannot fail stay with quality.
- **Built:** see `docs/experts/devops.md`, which also decides the items routed here from the architect's research.
- **Stages:** plan, build (only when the plan names infrastructure, pipeline, container or manifest files), review.
- **Upstream agents:**
  - awesome-copilot `terraform-iac-reviewer`, `terraform-aws-planning`, `terraform-aws-implement`, `aws-cloud-expert`
  - wshobson and buildwithclaude `terraform-specialist`, `cloud-architect`, `network-engineer`
  - wshobson `kubernetes-architect`
  - ECC `network-architect`, `network-config-reviewer`
  - agency-agents `platform-engineer`, `network-engineer`
  - aws/agent-toolkit (7 agents)
- **Survey candidates:** Terraform (antonbabenko, 86), AWS IAM (aws/agent-toolkit, 84), CDK and CloudFormation (aws/agent-toolkit, 78), Docker (docker/skills, 80), cloud (alirezarezvani, 74), AWS ops (aws/agent-toolkit, 66), Terraform tests (hashicorp, 62).

### 10. (merged into 9, DevOps engineer; its sources below stay as candidates)
- **Owns:** pipelines, deploys and rollback, feature flags, release safety (GitHub Actions hardening is security's).
- **Stages:** plan, review.
- **Upstream agents:**
  - awesome-copilot `github-actions-expert`, `se-gitops-ci-specialist`, `devops-expert`, `launchdarkly-flag-cleanup`
  - wshobson and buildwithclaude `deployment-engineer`, `devops-troubleshooter`
  - agency-agents `devops-automator`, `git-workflow-master`
  - alirezarezvani `devops-engineer`
- **Survey candidates:** GitHub Actions hardening (awesome-copilot, 85), agentic actions (trailofbits, 80), CI/CD (addyosmani, 52), deploy defaults (awslabs, 50).

### 11. Observability and operations (skills, not an expert: maintainer decision 2026-10-21)
- **Now:** alarms, SLOs and runbooks with the architect (proposed skill `alarms-and-slos`); log fields, correlation ids, metric labels and spans in code with the developer (proposed skill `telemetry-in-code`). Both wait for fact-check block H. Ledger: `docs/experts/ledgers/observability.md`.
- **Owns:** logs, metrics, traces, alerts, SLOs, runbooks, incident readiness.
- **Stages:** plan, review.
- **Upstream agents:**
  - wshobson `observability-engineer`
  - wshobson and buildwithclaude `incident-responder`
  - agency-agents `sre`, `incident-response-commander`
  - awesome-copilot `aws-incident-triage`, `elasticsearch-observability`, `platform-sre-kubernetes`, `pagerduty-incident-responder`
  - ECC `observer`
- **Survey candidates:** observability and instrumentation (addyosmani, 72), OpenTelemetry (ollygarden, 64 to 68), our `operability-guidelines` skill.

### 12. Performance (skills, not an expert: maintainer decision 2026-10-21)
- **Now:** `web-performance` under the developer (maintainer's choice of host), waiting for fact-check block I; backend work that grows faster than its input becomes one category in the developer's review reference. Ledger: `docs/experts/ledgers/performance.md`.
- **Owns:** latency and throughput at realistic load, N+1 and unbounded work, caching, web vitals.
- **Stages:** plan, review.
- **Upstream agents:**
  - addyosmani `web-performance-auditor`
  - ECC `performance-optimizer`
  - wshobson and buildwithclaude `performance-engineer`
  - awesome-copilot `frontend-performance-investigator`, `mongodb-performance-advisor`
- **Survey candidates:** web performance (addyosmani 48, ziniman 45), cost and performance (vercel, 40). These are weak sources: performance has the thinnest material.

### 13. Frontend and accessibility (have: `frontend`, plan, tests, review; skills wait for the fact-check, see `docs/experts/frontend.md`)
- **Owns:** UI components and state, rendering, design-system drift, accessibility.
- **Stages:** plan, tests, review.
- **Upstream agents:**
  - ECC `a11y-architect`, `react-reviewer`, `vue-reviewer`
  - wshobson `accessibility-expert`, `design-system-architect`, `ui-visual-validator`
  - awesome-copilot `accessibility`, `accessibility-runtime-tester`, `expert-react-frontend-engineer`, `react19-auditor`
  - agency-agents `frontend-developer`, `section-508-specialist`, `ux-architect`
  - Community-Access accessibility agents
- **Survey candidates:** a11y (Community-Access 78, ziniman 78), worst-case UI cases (emilkowalski, 72), React (vercel, 66), UI drift (ibelick, 62), RTL and localisation (skills-il, 55).

### 14. Privacy and compliance (skills, not an expert: maintainer decision 2026-10-21)
- **Now:** `personal-data-exposure` under security and `erasure-and-retention` under data (split accepted), both waiting for fact-check block J. Lawful basis, consent and retention periods are a person's decision. Ledger: `docs/experts/ledgers/privacy.md`.
- **Owns:** personal data, retention and deletion, consent, audit trails, LLM data handling.
- **Stages:** plan, review.
- **Upstream agents:**
  - agency-agents `privacy-engineer`, `data-privacy-officer`, `compliance-auditor`
  - alirezarezvani `cs-dpo-gdpr`, `cs-soc2-auditor`, `cs-ai-act-compliance`
- **Survey candidates:** privacy (agency-agents 70, Sushegaad GRC 62).

## Skills by expert and stage

Taken from each expert's `.cursor-plugin/ultimate-workflow/experts/<name>/skills.md`, which only code reads. Skills live in `experts/skills/<name>/skill.md`. The selector is the rule in parentheses on the reference line; at plan there is none, and a model chooses from the skills offered. Rows are in each reference's priority order.

| Expert | Stage | Skill | Selector as written | For |
|---|---|---|---|---|
| developer | review | `failure-handling` | `added: \b(catch\|except\|rescue\|recover\|finally\|retry\|fallback\|rollback)\b\|\.catch\(\|Err\(\|unwrap_or\|err != nil\|throw \|raise ` | catch blocks, error returns, fallbacks, retries, undo on failure |
| developer | build | `failure-handling` | the review regex plus `\|error path\|error handling`, matched against the plan's text | the same, as the plan describes it |
| developer | review, build | `python-craft` | `files: *.py, *.pyi` | Python idioms and mistakes |
| developer | review, build | `typescript-craft` | `files: *.ts, *.tsx, *.mts, *.cts, *.js, *.jsx, *.mjs, *.cjs` | TypeScript and JavaScript |
| developer | review, build | `react-craft` | `files: *.tsx, *.jsx` | React components and hooks |
| developer | review, build | `go-craft` | `files: *.go, go.mod` | Go |
| developer | review, build | `rust-craft` | `files: *.rs, Cargo.toml` | Rust |
| developer | review, build | `java-craft` | `files: *.java, pom.xml, build.gradle, build.gradle.kts` | Java |
| developer | review, build | `dependency-discipline` | `files: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements*.txt, pyproject.toml, uv.lock, poetry.lock, Pipfile, Pipfile.lock, go.mod, go.sum, Cargo.toml, Cargo.lock, pom.xml, build.gradle, build.gradle.kts, Gemfile, Gemfile.lock` | a manifest or lockfile change |
| developer | review, build | `surgical-change` | `always` | every changed line traced to the task |
| developer | review, build | `simplification` | `always` | no structure the change does not need |
| developer | review, build | `engineering-principles` | `always` | a principle's exact meaning and counter-case |
| developer | plan | `engineering-principles` | offered | the plan adds structure |
| developer | plan | `dependency-discipline` | offered | the plan adds, removes or upgrades a dependency |
| developer | plan | `failure-handling` | offered | the plan adds error paths, fallbacks, retries or multi-step writes |
| quality | tests | `test-craft` | `always` | each case can fail and has an exact expected value |
| quality | tests | `eval-integrity` | `added:` judge, pass@k, eval-set or rubric wording in the plan | judges, pass@k and pass^k, held-out data |
| quality | build | `test-craft` | `always` | writing any test |
| quality | review | `test-craft` | test files and test directories | each changed test can fail |
| quality | review | `test-gates` | runner configs, `conftest.py`, workflow files; `added:` zero-test, `.only`, retry and `continue-on-error` settings | a run or job that cannot fail |
| quality | review | `eval-integrity` | `added:` judge, pass@k, eval-set or rubric wording | the eval's number means what it claims |
| quality | plan | `eval-integrity`, `test-gates` | offered | the plan decides how behaviour is verified |

| architect | review | `lambda-event-sources` | `added:` event source mapping, scaling, batch-failure, visibility and concurrency settings | queues and streams that trigger Lambda |
| architect | review | `aws-messaging` | `added:` SQS, SNS, EventBridge and Kinesis resources and send calls | delivery, ordering, deduplication, loss |
| architect | review | `api-gateway` | `added:` API Gateway resources, timeout and throttle settings | timeouts, payloads, throttles, HTTP versus REST |
| architect | review | `multi-tenancy` | `added:` tenant ids, row-level security, `PrincipalTag` | isolation, tenant context, shared resources, lifecycle |
| architect | review | `caching-and-latency` | `added:` Redis, ElastiCache, CloudFront, cache headers | invalidation, keys, stampedes, eviction, CDN rules |
| architect | review | `step-functions` | `files: *.asl.json, *.asl.yaml, *.asl.yml; added:` state machines, `States.` errors, compensation | workflows and sagas |
| architect | review | `aws-well-architected` | `files: *.tf, *.tfvars, template.yaml, template.yml, template.json, serverless.yml, serverless.yaml, cdk.json, samconfig.toml; added: AWS::\|resource "aws_\|aws-cdk-lib\|aws_cdk\|@aws-cdk/\|boto3\|@aws-sdk/\|aws-sdk-go\|software.amazon.awssdk` | Well-Architected practices a diff can show, with IDs and verified AWS costs and limits |
| architect | plan | `lambda-event-sources`, `aws-messaging`, `step-functions`, `api-gateway`, `multi-tenancy`, `caching-and-latency` | offered | the plan adds triggered Lambdas, workflows or sagas |
| architect | plan | `aws-well-architected` | offered | the plan adds or changes AWS infrastructure or AWS calls |

| devops | review, build | `terraform-change-safety` | `files: *.tf, *.tf.json, *.tfvars, .terraform.lock.hcl, terragrunt.hcl` (build also: Terraform in the plan) | what an apply moves, replaces or destroys; state; pins |
| devops | review, build | `cloudformation-and-cdk` | template and CDK config files; `added:` SAM types, deletion policies, imports, CDK imports | logical ids, replacement, deletion and replace policies |
| devops | review, build | `kubernetes-manifests` | Helm and Kustomize files; `added:` probes, rollout fields, budgets, workload kinds | probes, requests, rollouts, disruption budgets, shutdown |
| devops | review, build | `pipelines-and-deploys` | `files: .github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, buildspec.yml, appspec.yml, Jenkinsfile, action.yml` and variants | promotion, environments, concurrency, limits, caches |
| devops | review, build | `release-safety` | `added:` flag SDKs, CodeDeploy, AppConfig, canary rollouts, migration commands, image lifecycle rules | flags, canaries, migrations in the release, rollback targets |
| devops | review, build | `containers` | Dockerfiles, Containerfiles, `.dockerignore`, compose files | stop signals, repeatable images, health and start order |
| devops | plan | all six | offered | the plan changes infrastructure, pipelines, containers or releases |

| security | review | `ci-workflow-security` | `files: .github/workflows/*.yml, .github/workflows/*.yaml, .github/workflows/actions.lock, **/action.yml, **/action.yaml` | fork-code triggers, event text in steps, token and secrets, caches, pinning, OIDC |

| softarch | review | `protobuf-compat` | `files: *.proto, buf.yaml, buf.gen.yaml, buf.lock` | wire, ProtoJSON and generated-code compatibility |
| softarch | review | `schema-evolution` | API description and GraphQL files; `added:` an `openapi:` line, `type Query {`, a JSON Schema `$schema` | what breaks callers or readers; versions |
| softarch | review | `event-schema-evolution` | `files: *.avsc, *.avdl, asyncapi.*`; `added:` registry compatibility modes, Glue schemas, Avro records, CloudEvents attributes | registry modes, Avro resolution, CloudEvents and AsyncAPI |
| softarch | review | `module-boundaries` | boundary tool configs, `tsconfig*.json`, `module-info.java`, `project.json`; `added:` `/internal/`, `"exports":`, tag constraints | what each ecosystem's boundary tool enforces |
| softarch | plan | all four | offered | the plan changes a contract or a module boundary |

No skills: `security` (plan, tests, review).

Fixed cost per build: the developer's three `always` skills, `test-craft` and the two briefs come to about 28 KB before any file-matched skill. The DevOps brief has no `always` skill, so it joins only builds whose plan selects one of its skills.

## What is not an expert, and where it goes instead

| Upstream items | Where they go |
|---|---|
| Planners, spec writers, PRD agents, TDD red/green, interview and refine agents | Part 1, the workflow phases |
| Language reviewers (ECC's 20, the `*-expert` and `*-pro` agents in wshobson and buildwithclaude) | Language **skills** that code selects by file name for the developer expert |
| Build-error resolvers (ECC's `*-build-resolver`) | Build-phase skills or tools, not reviewers |
| Doc writers, doc updaters, comment analysers, ADR generators | The harvest phase, or skills |
| FinOps, threat modelling, OWASP, RLS, Docker hardening | **Skills** under their expert |
| Business, marketing, finance, legal, HR, SEO, content and personal-productivity agents (most of alirezarezvani's 117, large parts of buildwithclaude and agency-agents) | Out of scope |
| Azure, Salesforce, Power Platform and other platform-specific agents | Out of scope unless the stack changes |

## Optional merges, to start smaller

- 6 and 7 as one "AI systems" expert (done: 6 is the Generative AI engineer).
- 9 and 10 as one "platform and delivery" expert (done: 9 is the DevOps engineer).
- 12 split between developer, data and frontend.
- 14 folded into security.

That leaves 9 experts instead of 14.

## Gaps the sources leave

From the survey: DynamoDB and OpenSearch, VPC and networking depth, CloudFormation/CDK review depth, CI/CD beyond GitHub Actions, Claude tool use and MCP design (one good source each), LLM privacy and PII, LLM cost control, alerting and SLOs, and performance. These experts will need more of our own writing.

## Status

Built: experts 1 to 5 (`architect`, `softarch`, `developer`, `quality`, `security`) and 9 (`devops`, six skills; see `docs/experts/devops.md`). `softarch` has four skills (`docs/experts/softarch.md`). Skills are mapped for `developer` (eleven), `quality` (three: `test-craft`, `test-gates`, `eval-integrity`) and `architect` (seven: `lambda-event-sources`, `aws-messaging`, `step-functions`, `api-gateway`, `multi-tenancy`, `caching-and-latency`, `aws-well-architected`; see `docs/experts/architect.md`); `security` has none. Experts 6, 8 and 11 to 14 are not built (7 is merged into 6, 10 into 9).

Next: the Generative AI engineer (6), which has the Generative AI Lens research ready and needs an AgentCore pass; then data and Postgres (8), or UI and accessibility (13).
