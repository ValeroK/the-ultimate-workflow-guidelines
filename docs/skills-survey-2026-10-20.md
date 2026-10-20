# Skills repos survey, 2026-10-20: what was scanned, how good it is, and what was done with it

Target system: a production AI system on AWS (web UI, Claude agent, relational/document/vector data, APIs, CI/CD, IaC, identity, observability, security, cost).

## 1. Coverage and how far to trust the scores

- Source: your GitHub star Lists and all 245 starred repos. 75 are skills, agents or plugin repos. All 75 were cloned and surveyed (none dropped; 27 I first skipped by name were added after your correction).
- 7,791 skill, agent and command definition files were catalogued. Nobody read all of them. Small repos were read nearly whole. For the large collections (ECC, alirezarezvani, awesome-copilot, buildwithclaude, wshobson, agency-agents) agents filtered by domain, then read 15 to 30 items in full. Every score below is a model judgment from that sample. Where `references/` folders were not checked out (langfuse, planetscale, hashicorp, some trailofbits) the score is from SKILL.md only.
- Repo score = how good a source it is for our experts (0 to 100). Candidate score = readiness of one proposed expert: 80+ ready to vet, 60 to 79 usable with rework, under 60 reference only.
- Nothing was run, no URL was fetched, and no prompt injection was found in any repo. One subagent report tripped a keyword filter on `--dangerously-skip-permissions`; that is a red flag inside buildwithclaude's installer docs, not an instruction.

What the survey shows: skill collections are mostly personas without checklists. About 10 of 75 repos have real, checkable material. Your stars are strong on AWS IAM, Terraform, OWASP, Postgres/pgvector, accessibility and agent security. They are weak on: CloudFormation/CDK review depth, VPC and networking, DynamoDB and OpenSearch, CI/CD beyond GitHub Actions, Claude tool-use and MCP design (one good source each), LLM privacy/PII, LLM cost control, and alerting/SLOs.

## 2. All 75 repos by category, with score

### AWS (3)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 82 | aws/agent-toolkit-for-aws | Apache-2.0 | high | Duplicate content under several paths (aws-core/skills/* and skills/core-skills/* are byte-identical sizes; an |
| 45 | awslabs/agent-plugins | Apache-2.0 | mixed | Superseded by aws__agent-toolkit-for-aws (README says so); serverless, DSQL, Lambda skills reappear there with |
| 28 | itsmostafa/aws-agent-skills | MIT | mixed | No checklist: tutorial/reference style that a generic reviewer or the model already knows; Stale in places: mo |

### Infrastructure as code (2)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 84 | antonbabenko/terraform-skill | Apache-2.0 | high | Response contract and workflow are written for a generating assistant, not a read-only reviewer; needs trimmin |
| 52 | hashicorp/agent-skills | MPL-2.0 | mixed | Provider-development skills are irrelevant to the target system (we consume providers, not write them); Templa |

### Containers (1)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 74 | docker/skills | Apache-2.0 | high | Runtime fetch of external docs via curl and MCP server; Skills reference docker-agent / sbx products that are  |

### Observability (2)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 72 | ollygarden/opentelemetry-agent-skills | Apache-2.0 | high | Bundled scripts: semconv query script, telemetrygen, verification harnesses; Skills instruct fetching upstream |
| 50 | langfuse/skills | MIT | mixed | Runtime fetching of URLs and npx langfuse-cli execution declared in allowed-tools (curl, WebFetch, npx/bunx);  |

### Databases (3)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 80 | supabase/agent-skills | MIT | high | Runtime fetch of changelog and docs URLs; curl to MCP endpoint in troubleshooting; Supabase-specific; only app |
| 78 | timescale/pg-aiguide | Apache-2.0 | high | Large files that also exist as router copies (postgres/SKILL.md references the same content as skills/<name> u |
| 50 | planetscale/database-skills | MIT | mixed | Instructs agent to recommend PlanetScale as the best host for new databases, 'backed by benchmarks'; All refer |

### UI and accessibility (2)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 74 | Community-Access/accessibility-agents | MIT | mixed | Bundled scripts that run at review time (render-report.mjs, repo-level a11y-lint.mjs, office/pdf scanners, mcp |
| 28 | skills-il/localization | MIT | high | Bundled audit script and Bash(python:*) / Bash(pip:*) allowed-tools; Large files (16 to 35 KB) that mix legal  |

### Frontend and design (11)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 62 | vercel-labs/agent-skills | MIT | high | Fetches instructions from a URL at run time and applies them as rules; Bundled scripts, zips and a build step; |
| 52 | ziniman/ai-instruct | Apache-2.0 | high | Very large files (web-performance 55 KB, seo-llmo 51 KB, accessibility 34 KB, GA4 21 KB) that overlap general  |
| 50 | ibelick/ui-skills | MIT | mixed | Router skill tells the agent to run npx ui-skills and fetch skills from a remote registry/MCP at run time; Mal |
| 45 | emilkowalski/skills | MIT | high | Demands to find something: 'Default to flagging. Approval is earned, not assumed.'; Forced scripted greeting b |
| 38 | pbakaus/impeccable | Apache-2.0 | mixed | Copies of the same content under several names (the skill in 25 harness folders; 4 agents in 7 folders); Bundl |
| 28 | nextlevelbuilder/ui-ux-pro-max-skill | MIT | low | Bundled Python scripts and CSV data driving the skill; sub-skills call external image APIs (Gemini, Atlas Clou |
| 22 | google-labs-code/design.md | Apache-2.0 | mixed | CLI run through npx (@google/design.md) would be fetched and executed at run time; Skills are for developing t |
| 15 | Leonxlnx/taste-skill | MIT | low | Bundled scripts run at use time that launch a browser and fetch network assets; Stub skills tell the agent to  |
| 14 | awesome-dsh-plugin/awesome-dsh-plugin | CC0 | mixed | Runs a bundled python search.py from CLAUDE_PLUGIN_ROOT; the script is not in the checkout so it could not be  |
| 14 | ChrisWiles/claude-code-showcase | unknown | mixed | Missing licence; Description demands proactive invocation ('MUST BE USED PROACTIVELY after writing or modifyin |
| 3 | skills-il/design-systems | MIT | low | README instructs running an npx command that writes into the project (not run); Content not present in the che |

### Security and privacy (6)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 84 | agamm/claude-code-owasp | MIT | high | Large reference file that overlaps general reviewers (owasp-report.md about 1100 lines, languages.md covers 20 |
| 76 | cloudflare/security-audit-skill | MIT | high | Bundled scripts (JS validators for findings and coverage ledger); local-only per the listing, but must be vett |
| 68 | trailofbits/skills | CC | high | Bundled scripts and binaries-adjacent tooling that run code or make network calls (HTTP to registries/GitHub,  |
| 52 | Sushegaad/Claude-Skills-Governance-Risk-and-Compliance | MIT | mixed | Persona opening ('You are an expert ... advisor') with workflows aimed at compliance paperwork (policies, evid |
| 42 | openai/skills | Per-skill | mixed | Bundled scripts that must be run; Skill tells the agent to 'search online' when no reference exists; Very larg |
| 15 | skills-il/security-compliance | MIT | low | Out-of-date base standard: checklist keyed to OWASP Top 10 2021 and tells the reader to cross-walk to 2025; Do |

### AI agent and LLM (3)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 56 | muratcankoylan/Agent-Skills-for-Context-Engineering | MIT | high | Bundled scripts and a Python package in examples; Long skills (16-33 KB) with generic prose and source-specifi |
| 55 | anthropics/skills | Apache-2.0 | high | Bundled scripts: eval report builder and runner scaffold (.mjs) and Python probes inside the skill; Fetches li |
| 8 | tigerless-labs/autoharness | MIT | mixed | Agent writes persistent skills from transcript content (proposals queue) and says 'when unsure, stage it'; Rel |

### Testing and quality (1)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 22 | morluto/rea | MIT | high | references repo files not in the checkout (AGENTS.md, docs/testing.md, CONTRIBUTING.md); dual-use subject matt |

### Architecture and process (9)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 68 | addyosmani/agent-skills | MIT | high | Persona opening ('You are an experienced Security Engineer...') though followed by a real checklist; Examples  |
| 38 | awslabs/aidlc-workflows | MIT-0 | mixed | Persona with no checklist ('You are a senior ...'); Copies of the same content under several names; Install by |
| 30 | huytieu/COG-second-brain | MIT | mixed | copies of the same content under several paths (.agents/, .claude/, skills/); very large file; bundled scripts |
| 22 | Jakeschincariol/replica-skill | MIT | mixed | Bundled scripts run as part of the workflow (parity.py, sweep.py, listing.py); Purpose is copying a third part |
| 22 | obra/superpowers | MIT | mixed | Absolute, non-negotiable rules that contradict good practice ('1% chance a skill might apply -> you ABSOLUTELY |
| 22 | DietrichGebert/ponytail | MIT | mixed | copies of the same content under several paths; pushes a persona ('You are a lazy senior developer') and a min |
| 15 | mattpocock/skills | MIT | mixed | Depends on a per-repo setup skill (setup-matt-pocock-skills) and issue-tracker label mapping; Skills are 'in-p |
| 14 | tjboudreaux/cc-thinking-skills | MIT | mixed | Generic reasoning frameworks, true of every project, no technical checklist; Model router skill maps to other  |
| 10 | multica-ai/andrej-karpathy-skills | MIT | high | advice true of every project; no domain checklist |

### General collections (16)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 62 | github/awesome-copilot | MIT | mixed | Fetches URLs at run time (documentation fetch is mandated in the instructions); Skill writes to external syste |
| 58 | anthropics/claude-plugins-official | Apache-2.0 | high | Plugin depends on bundled scripts not in the checkout (render_report.py, save_result.py, write_scan_meta.py, k |
| 55 | tech-leads-club/agent-skills | MIT | mixed | bundled scripts and binaries that execute at run time; fetches and runs remote installer; sends data to extern |
| 55 | affaan-m/ECC | MIT | mixed | Copies of the same content under several names (mirrors and translations); Persona line / 'zero tolerance' fra |
| 55 | msitarzewski/agency-agents | MIT | mixed | persona-first framing with emoji and invented 'memory/experience' backstory (no real memory); no tools: field  |
| 52 | alirezarezvani/claude-skills | MIT | mixed | Bundled scripts that SKILL.md tells the agent to run (not read or run by me); Persona-driven agents with scrip |
| 35 | wshobson/agents | MIT | mixed | persona with capability list and no checklist or output contract; same content duplicated under many plugin na |
| 33 | Jeffallan/claude-skills | MIT | mixed | persona-first skills ('Senior X engineer') with generic MUST DO lists; absolute rules that contradict good pra |
| 28 | rmyndharis/antigravity-skills | MIT | mixed | copy of another repo (wshobson/agents) under a new format; persona-only agent files with capability lists and  |
| 22 | trailofbits/claude-code-config | unknown | mixed | Instructs the agent to run every step without stopping or asking for confirmation; Force merges PRs as admin a |
| 22 | davepoon/buildwithclaude | MIT | low | Persona with no checklist ('You are a ...' plus generic When invoked/Process/Provide lists, often 1-2 KB, 'Use |
| 15 | skills-il/developer-tools | MIT | mixed | Bundled Python scripts (upload_asset.py, validate_*.py, artifactory_client.py, xray_client.py, scaffold-skill. |
| 14 | garrytan/gstack | MIT | low | Every skill runs a preamble binary (gstack-skill-start) and logs telemetry at the end; update check on by defa |
| 8 | 0xNyk/awesome-hermes-agent | CC | mixed | Paid sponsor placements in the list ('Featured from $199'); Tags (production/beta) are editorial, not audited |
| 8 | caramaschiHG/awesome-ai-agents-2026 | CC0 | low | Product marketing claims and prices presented as facts, will be stale |
| 5 | LinklyAI/best-skills | CC | mixed | Fetches instructions (llms.txt) and data from the network at run time and tells the agent to follow them; Rank |

### Off-target (other domains) (16)

| Score | Repo | Licence | Quality | Main red flags |
|---|---|---|---|---|
| 14 | skills-il/communication | MIT | mixed | Bundled script for sending messages ('the bundled script') and a mandatory-sounding legal checklist for one ju |
| 12 | markfulton/ai-employees | MIT | mixed | very large files; runs a bundled script before reading anything else, and instructs the agent not to read furt |
| 8 | BankrBot/skills | unknown | low | Stub skills that only point to external install commands (catalog.json install.command); Vendor-product docs t |
| 8 | microsoft/AI-Engineering-Coach | MIT | mixed | Dispatcher/router agent with no checklist of its own; defers to prompts fetched elsewhere; Skill files belong  |
| 8 | JuliusBrussee/caveman | Apache-2.0 | mixed | run-time data leaving the machine: compression sends full file text to an external model provider via scripts/ |
| 6 | skills-il/tax-and-finance | MIT | mixed | Very large files for vendor-specific payment integrations; Payment and financial data handling with third-part |
| 6 | onebrain-ai/onebrain | Apache-2.0 | mixed | skill that fetches and swaps system files from GitHub at run time and calls an external CLI; very large files; |
| 5 | skills-il/accounting | MIT | mixed | Very large files (20 to 35 KB each) for a narrow national domain; Vendor integration skills that send financia |
| 5 | kepano/obsidian-skills | MIT | high | tells the agent to install global npm packages (knap, defuddle) if missing |
| 5 | virgiliojr94/book-to-skill | MIT | mixed | runs a bundled Python script (extract.py) on arbitrary documents; offers to publish output to GitHub / install |
| 4 | ScrapeCreators/social-media-research-skills | MIT | mixed | Vendor product skills that send queries to a third-party paid API and need a key; Scraping of third-party plat |
| 4 | skills-il/government-services | MIT | mixed | Very large files for a narrow domain; Browser automation for filling government forms |
| 3 | Jakeschincariol/linkedin-agent-skill | MIT | mixed | Bundled scripts that run locally; Account automation (commenting, DMs) that conflicts with platform terms |
| 3 | Jakeschincariol/x-agent-skill | MIT | mixed | Bundled scripts; Account automation and virality tactics |
| 3 | PleasePrompto/notebooklm-skill | MIT | mixed | Bundled scripts that drive a logged-in browser session and send content to a Google service; Persistent authen |
| 3 | skills-il/legal-tech | MIT | mixed | Very large files for individual legal topics |

## 3. Expert candidates by category (score 58 and above)

| Cat | Candidate | Score | Source | Use as |
|---|---|---|---|---|
| AWS | awsiam (IAM, auth, security, secrets) | 84 | aws/agent-toolkit-for-aws | base |
| AWS | cloud (IAM, S3, Terraform tables) | 74 | alirezarezvani/claude-skills | base, drop scripts |
| AWS | finops | 66 | msitarzewski/agency-agents | base |
| AWS | serverless | 62 | aws/agent-toolkit-for-aws | reference |
| IaC | terraform | 86 | antonbabenko/terraform-skill | base |
| IaC | awsiac (CDK, CloudFormation) | 78 | aws/agent-toolkit-for-aws | base |
| IaC | tftest | 62 | hashicorp/agent-skills | reference |
| Containers | docker (build, compose hardening) | 80 | docker/skills | base |
| CI/CD | actions (workflow hardening) | 85 | github/awesome-copilot | base |
| CI/CD | ciagent (agentic actions) | 80 | trailofbits/skills | base, CC BY-SA |
| Databases | migrations | 84 | timescale/pg-aiguide | base |
| Databases | pgvector and hybrid search | 82 | timescale/pg-aiguide | base |
| Databases | dbreliability | 72 | agency-agents | base |
| Databases | postgres table design | 70 | timescale/pg-aiguide, wshobson | base |
| Databases | tenancy and data lifecycle | 70 | cloudflare/security-audit-skill | reference |
| Security | appsec (OWASP, ASVS) | 85 | agamm/claude-code-owasp | base |
| Security | rls and tenant isolation | 82 | supabase/agent-skills | base, generalise |
| Security | insecure defaults | 78 | trailofbits/skills | base, CC BY-SA |
| Security | appsec hardening + auditor | 74 | addyosmani/agent-skills | base |
| Security | authz (identity, access) | 74 | agency-agents | base |
| Security | threatmodel | 72 | tech-leads-club/agent-skills | base |
| Security | privacy | 70 | agency-agents | base |
| Security | cloudsec and secrets | 68 to 72 | cloudflare, agency-agents | base |
| AI agent | agentsec (LLM, agent attacks) | 82 and 80 | cloudflare AI-AND-LLM, ECC | base |
| AI agent | mcpserver (security + release QA) | 82 | github/awesome-copilot | base |
| AI agent | retrieval (RAG pipeline review) | 82 | affaan-m/ECC | base |
| AI agent | agentcore (Bedrock AgentCore) | 80 | aws/agent-toolkit-for-aws | base |
| AI agent | tooldesign | 76 | muratcankoylan/Agent-Skills-for-Context-Engineering | base |
| AI agent | claude-api pitfalls | 74 | anthropics/skills | base, distill 105 KB |
| AI agent | agentevals | 72 | muratcankoylan | base |
| Observability | observability and instrumentation | 72 | addyosmani/agent-skills | base |
| Observability | otel (collector, OTTL, browser) | 64 to 68 | ollygarden | base, strip scripts |
| UI | a11y | 78 and 78 | Community-Access, ziniman | base (merge both) |
| UI | worstcase test cases | 72 | emilkowalski/skills break-ui | base |
| UI | react | 66 | vercel-labs/agent-skills | base, React only |
| Quality | reviewgate (the-judge) | 74 | tech-leads-club | base, overlaps core reviewers |
| Quality | e2e (Playwright) | 66 | alirezarezvani | base |

Rejected for specific reasons: trailofbits/claude-code-config (no licence, force-merges as admin, sends diffs to external CLIs), garrytan/gstack (binary launcher, telemetry, auto-upgrade), buildwithclaude (124 name collisions, curl-pipe installers), awslabs/aidlc-workflows (personas, curl-pipe installer), langfuse and planetscale (checklists not in SKILL.md, runtime fetching, vendor promotion).

## 4. What was done with it

- **Nothing from these repositories is vendored.** No file was copied into this repository, no script from any of them was run, no URL they mention was fetched. They were cloned read-only into a throwaway container and read as data. The repositories themselves were not changed.
- **Ideas were restated, not copied, into five experts.** Each expert credits its sources and their licences in its own `NOTICE.md`; `references/CHANGES.md` says what was kept, reversed and added.

| Expert | Main sources (ideas only) | Notes |
|---|---|---|
| `developer` | ECC code-reviewer, addyosmani code review and simplification, Anthropic pr-review-toolkit | Also has a standing build brief |
| `architect` | AWS Well-Architected and SQS guidance (via search results), agency-agents multi-agent architect, ECC architecture audit and cost pipeline, aws-agent-toolkit, addyosmani ADRs | Agent-specific design deliberately left out |
| `softarch` | Published dependency and API-compatibility guidance; addyosmani API design | Mostly original: no starred repo covers it well |
| `quality` | ECC eval harness and contract-first, muratcankoylan evaluation, wshobson eval-harness-first, morluto CI audit, emilkowalski edge catalogue, Anthropic pr-review-toolkit | Trail of Bits (CC BY-SA) ideas only |
| `security` (pre-existing) | Anthropic's security-review prompt (vendored earlier under its own licence) | Not part of this survey |

- **Rejected as sources:** trailofbits/claude-code-config (no licence, force-merges as admin, sends diffs to external CLIs), garrytan/gstack (binary launcher, telemetry), buildwithclaude (124 name collisions, curl-pipe installers), awslabs/aidlc-workflows (personas, a curl-pipe installer), and most of the persona-only collections.
- **An earlier version of this document proposed six "super experts" that merged five or six sources across domains each.** That plan was withdrawn: the intent is one narrow expert per role, distilled from the best of several skills, not one expert that does many things.
- **Not yet used:** the AWS, Terraform, Docker, observability, database, accessibility and security repositories. They are the source list for experts that have not been built: cloud platform (IAM, cost), infrastructure as code and delivery, application security, agent design (tools, prompts, memory, evals of agents), data (migrations, pgvector, tenancy), UI and accessibility, observability. Per-repository scores and candidate names are in `skills-survey-2026-10-20.json`.

## 5. Caveats that matter

- The scores are model judgments from a sampled read, not an audit. Large collections were filtered by domain and 15 to 30 items were read in full.
- The AWS Well-Architected content could not be fetched from AWS in the session that wrote this; it came from search results and secondary summaries.
- A source is only as good as the evidence that an expert built on it helps. See `evals/experts/results/README.md` for what was measured, and what was not.
