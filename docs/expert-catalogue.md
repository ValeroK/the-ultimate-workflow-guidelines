# The expert catalogue: which experts the plugin needs, and what already exists for each

The plugin does two things:

1. **The ADLC workflow.** Plan, tests, build, review and harvest, with confirmation points and gates. This exists.
2. **The expert catalogue.** Experts that any phase can bring in, each with the skills and tools it loads only when the change needs them. This document lists the experts. The next step maps each expert's skills, and then each expert is built one at a time.

## Where the list comes from

- **All 75 skills and agent repositories** from the survey (`docs/skills-survey-2026-10-20.md`), not only addyosmani and ECC.
- **Every agent definition in them, by name.** There are 924 distinct agent names in the 21 repositories that ship agents, plus about 120 more in `msitarzewski/agency-agents`. Among the 67 repositories with skills there are 3,694 distinct skill names. The names are in `docs/skills-catalog-2026-10-20.json`.
- **The survey's 146 scored candidates**, grouped by domain, with their scores and their "use as base" or "reference" verdicts.

An agent was placed under an expert by its name and the survey's domain notes, not by reading every file. The quality judgments are the survey's, and the survey read samples, not everything.

## The experts

"Have" means the expert exists in the plugin today. Upstream agents are listed by repository. The survey candidates column gives the best-scored skill sources for that domain (score 0 to 100).

### 1. System architect (have: `architect`)
- **Owns:** components and services, the flows between them, AWS service fit, failure handling at boundaries, state, cost, and the Well-Architected concerns.
- **Stages:** plan, review.
- **Upstream agents:**
  - ECC `architect`
  - awesome-copilot `aws-principal-architect`, `aws-serverless-architect`, `se-system-architecture-reviewer`, `arch`
  - wshobson and buildwithclaude `cloud-architect`, `architect-review`
  - awslabs aidlc `architect-agent`, `aidlc-architecture-reviewer-agent`
  - anthropics `architecture-critic`
- **Survey candidates:** AWS serverless (aws/agent-toolkit, 62), finops (agency-agents, 66), our `distributed-systems-resilience-guidelines` and `system-architect-engineering-guidelines` skills.

### 2. Software architect (have: `softarch`)
- **Owns:** module boundaries, dependency direction, public contracts and their compatibility, data ownership between modules.
- **Stages:** plan, review.
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
- **Stages:** plan, tests, review.
- **Upstream agents:**
  - addyosmani, anthropics, wshobson and buildwithclaude `security-auditor`
  - ECC `security-reviewer`
  - awesome-copilot `se-security-reviewer`, `sast-sca-security-analyzer`, `agent-governance-reviewer`
  - wshobson `backend-security-coder`, `frontend-security-coder`, `threat-modeling-expert`
  - agency-agents `appsec-engineer`, `security-architect`, `cloud-security-architect`, `secrets-credential-engineer`, `ai-generated-code-auditor`
- **Survey candidates:** OWASP and ASVS (agamm, 85), RLS and tenant isolation (supabase, 82), insecure defaults (trailofbits, 78), appsec hardening (addyosmani, 74), authorisation (agency-agents, 74), threat model (tech-leads-club, 72), cloud security and secrets (cloudflare and agency-agents, 68 to 72), web security (tech-leads-club, 62).

### 6. Agent-system architect (new)
- **Owns:** agent orchestration and topology, tool design and tool contracts, context and memory, loop and budget limits, guardrails and human approval, MCP servers.
- **Stages:** plan, review.
- **Upstream agents:**
  - ECC `agent-evaluator`, `harness-optimizer`, `loop-operator`
  - agency-agents `multi-agent-systems-architect`, `agents-orchestrator`, `agentic-identity-trust`, `automation-governance-architect`
  - awesome-copilot `context-architect`, `agent-governance-reviewer`, `declarative-agents-architect`, `custom-agent-foundry`
  - buildwithclaude `mcp-server-architect`, `mcp-security-auditor`, `agent-expert`
  - anthropics `agent-sdk-verifier-py`, `agent-sdk-verifier-ts`
- **Survey candidates:** agent security (cloudflare, 82; ECC, 80), MCP server security and release QA (awesome-copilot, 82), Bedrock AgentCore (aws/agent-toolkit, 80), tool design (muratcankoylan, 76), agent context (muratcankoylan, 58), agent SDK (anthropics, 48).

### 7. AI/LLM engineer (new)
- **Owns:** prompts, model calls and their failure modes, retrieval and embeddings (RAG), token cost, model fallback, evaluation of model output.
- **Stages:** plan, tests, review.
- **Upstream agents:**
  - ECC `rag-pipeline-reviewer`, `mle-reviewer`
  - wshobson and buildwithclaude `ai-engineer`, `prompt-engineer`
  - wshobson `vector-database-engineer`, `eval-judge`
  - agency-agents `ai-engineer`, `rag-pipeline-engineer`, `prompt-engineer`, `search-relevance-engineer`
  - awesome-copilot `prompt-engineer`, `prompt-builder`, `se-responsible-ai-code`
  - aws `llm2bedrock-prompt-evaluator`
- **Survey candidates:** retrieval and RAG review (ECC, 82), pgvector and hybrid search (timescale, 82), Claude API pitfalls (anthropics, 74), agent evals (muratcankoylan, 72), LLM security (alirezarezvani, 63), LLM cost (ECC, 62), RAG metrics (buildwithclaude, 55).

### 8. Data and database (new)
- **Owns:** Postgres and pgvector schema, migrations, queries and indexes, DynamoDB key design, tenancy and data lifecycle at the data layer.
- **Stages:** plan, review.
- **Upstream agents:**
  - ECC `database-reviewer`
  - wshobson `database-architect`, `sql-pro`
  - wshobson and buildwithclaude `database-optimizer`, `database-admin`, `data-engineer`
  - awesome-copilot `postgresql-dba`, `neon-migration-specialist`, `neon-optimization-analyzer`
  - agency-agents `database-optimizer`, `database-reliability-engineer`, `data-engineer`
  - alirezarezvani `migration-planner`
- **Survey candidates:** migrations (timescale, 84), pgvector (timescale, 82), RLS (supabase, 82), DB reliability (agency-agents, 72), Postgres table design (timescale and wshobson, 62 to 70), tenancy (cloudflare, 70), AWS data (aws/agent-toolkit, 72).

### 9. Cloud infrastructure and IaC (new)
- **Owns:** Terraform and CDK/CloudFormation, IAM policies, networking, containers, and AWS service configuration as code.
- **Stages:** plan, review.
- **Upstream agents:**
  - awesome-copilot `terraform-iac-reviewer`, `terraform-aws-planning`, `terraform-aws-implement`, `aws-cloud-expert`
  - wshobson and buildwithclaude `terraform-specialist`, `cloud-architect`, `network-engineer`
  - wshobson `kubernetes-architect`
  - ECC `network-architect`, `network-config-reviewer`
  - agency-agents `platform-engineer`, `network-engineer`
  - aws/agent-toolkit (7 agents)
- **Survey candidates:** Terraform (antonbabenko, 86), AWS IAM (aws/agent-toolkit, 84), CDK and CloudFormation (aws/agent-toolkit, 78), Docker (docker/skills, 80), cloud (alirezarezvani, 74), AWS ops (aws/agent-toolkit, 66), Terraform tests (hashicorp, 62).

### 10. Delivery and CI/CD (new)
- **Owns:** pipelines, GitHub Actions hardening, deploys and rollback, feature flags, release safety.
- **Stages:** plan, review.
- **Upstream agents:**
  - awesome-copilot `github-actions-expert`, `se-gitops-ci-specialist`, `devops-expert`, `launchdarkly-flag-cleanup`
  - wshobson and buildwithclaude `deployment-engineer`, `devops-troubleshooter`
  - agency-agents `devops-automator`, `git-workflow-master`
  - alirezarezvani `devops-engineer`
- **Survey candidates:** GitHub Actions hardening (awesome-copilot, 85), agentic actions (trailofbits, 80), CI/CD (addyosmani, 52), deploy defaults (awslabs, 50).

### 11. Observability and operations (new)
- **Owns:** logs, metrics, traces, alerts, SLOs, runbooks, incident readiness.
- **Stages:** plan, review.
- **Upstream agents:**
  - wshobson `observability-engineer`
  - wshobson and buildwithclaude `incident-responder`
  - agency-agents `sre`, `incident-response-commander`
  - awesome-copilot `aws-incident-triage`, `elasticsearch-observability`, `platform-sre-kubernetes`, `pagerduty-incident-responder`
  - ECC `observer`
- **Survey candidates:** observability and instrumentation (addyosmani, 72), OpenTelemetry (ollygarden, 64 to 68), our `operability-guidelines` skill.

### 12. Performance (new)
- **Owns:** latency and throughput at realistic load, N+1 and unbounded work, caching, web vitals.
- **Stages:** plan, review.
- **Upstream agents:**
  - addyosmani `web-performance-auditor`
  - ECC `performance-optimizer`
  - wshobson and buildwithclaude `performance-engineer`
  - awesome-copilot `frontend-performance-investigator`, `mongodb-performance-advisor`
- **Survey candidates:** web performance (addyosmani 48, ziniman 45), cost and performance (vercel, 40). These are weak sources: performance has the thinnest material.

### 13. Frontend and accessibility (new)
- **Owns:** UI components and state, rendering, design-system drift, accessibility.
- **Stages:** plan, tests, review.
- **Upstream agents:**
  - ECC `a11y-architect`, `react-reviewer`, `vue-reviewer`
  - wshobson `accessibility-expert`, `design-system-architect`, `ui-visual-validator`
  - awesome-copilot `accessibility`, `accessibility-runtime-tester`, `expert-react-frontend-engineer`, `react19-auditor`
  - agency-agents `frontend-developer`, `section-508-specialist`, `ux-architect`
  - Community-Access accessibility agents
- **Survey candidates:** a11y (Community-Access 78, ziniman 78), worst-case UI cases (emilkowalski, 72), React (vercel, 66), UI drift (ibelick, 62), RTL and localisation (skills-il, 55).

### 14. Privacy and compliance (new)
- **Owns:** personal data, retention and deletion, consent, audit trails, LLM data handling.
- **Stages:** plan, review.
- **Upstream agents:**
  - agency-agents `privacy-engineer`, `data-privacy-officer`, `compliance-auditor`
  - alirezarezvani `cs-dpo-gdpr`, `cs-soc2-auditor`, `cs-ai-act-compliance`
- **Survey candidates:** privacy (agency-agents 70, Sushegaad GRC 62).

## What is not an expert, and where it goes instead

| Upstream items | Where they go |
|---|---|
| Planners, spec writers, PRD agents, TDD red/green, interview and refine agents | Part 1, the workflow phases |
| Language reviewers (ECC's 20, the `*-expert` and `*-pro` agents in wshobson and buildwithclaude) | **Skills** the developer expert loads by language |
| Build-error resolvers (ECC's `*-build-resolver`) | Build-phase skills or tools, not reviewers |
| Doc writers, doc updaters, comment analysers, ADR generators | The harvest phase, or skills |
| FinOps, threat modelling, OWASP, RLS, Docker hardening | **Skills** under their expert |
| Business, marketing, finance, legal, HR, SEO, content and personal-productivity agents (most of alirezarezvani's 117, large parts of buildwithclaude and agency-agents) | Out of scope |
| Azure, Salesforce, Power Platform and other platform-specific agents | Out of scope unless the stack changes |

## Optional merges, to start smaller

- 6 and 7 as one "AI systems" expert.
- 9 and 10 as one "platform and delivery" expert.
- 12 split between developer, data and frontend.
- 14 folded into security.

That leaves 9 experts instead of 14.

## Gaps the sources leave

From the survey: DynamoDB and OpenSearch, VPC and networking depth, CloudFormation/CDK review depth, CI/CD beyond GitHub Actions, Claude tool use and MCP design (one good source each), LLM privacy and PII, LLM cost control, alerting and SLOs, and performance. These experts will need more of our own writing.

## Next step

For each expert, in build order: list the skills it needs from the 3,694 skill names and the survey candidates, pick the source for each, then build the expert and its skills.
