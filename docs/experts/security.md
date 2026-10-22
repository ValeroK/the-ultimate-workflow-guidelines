# Security expert: sources, borders and references

The security expert owns whether a change lets an outsider, a lower-privileged user or untrusted text reach data, code execution or a credential. It joins at plan, tests and review, may run read-only commands and use the web, and at review gets the diff as a file and the dependency audit when one ran.

## Boundaries

The full rubric is the agent file's Responsibilities table. The borders that were argued:

| Concern | Owner |
|---|---|
| Untrusted input reaching a sink; authorization per handler and object; secrets and cryptography; dependency advisories; CI trigger trust, `permissions`, pins and OIDC; IAM, network exposure, `securityContext`; the agent, skill, hook and MCP surface | security |
| The tenancy model and where isolation is enforced | architect (one handler trusting a tenant id from the body is security's; a design where every path does is the architect's) |
| Contract shape and compatibility | softarch (exposing a field to the wrong caller is security's) |
| Whether a dependency should exist; build reproducibility | developer; devops |
| Whether a security test can fail | quality (the case is security's) |

## Sources

The core review checklist is adapted from `anthropics/claude-code-security-review` (MIT); what changed is in `.cursor-plugin/ultimate-workflow/experts/security/references/CHANGES.md`. The extraction audit is `docs/experts/ledgers/security.md`. Optional steps taken: the compare (playbook step 4) against the upstream command.

## What the expert holds

- **Plan:** trust boundary, identity and permission and where identity comes from, secrets and personal data, dependencies and install steps, agent and CI reach, failing closed, and the one-way-choice rule for identity providers and key hierarchies.
- **Tests:** negative access, hostile input per sink, validation edges, secrets kept out, failing closed, dependency pins, and one worked case.
- **Review:** nine categories with "Not when", a stop rule per trace, severity, "Excuses that do not hold", and a worked finding through `allow-unsafe-pr-checkout`. `agent-surface.md` and `dependencies.md` load only when the diff or the audit calls for them.

## Skills

`ci-workflow-security` at review, selected by a workflow file, a composite action or `actions.lock` (maintainer decision 2026-10-21). It holds the GitHub Actions rows from round-2 items 1 to 11 and the DevOps facts E1, E2 and E5, each tagged; `agent-surface.md`'s CI section now points to it and keeps only the general questions for other CI systems. Item 10 (newline injection through `GITHUB_ENV`) and organisation-wide OIDC trust stay [T]: only secondary pages state them. The IAM, JWT, CORS, deserialisation and MCP facts from the same round are confirmed and wait for their proposed skills (ledger section 2). `personal-data-exposure` at plan and review (2026-10-22, from fact-check block J): where a personal value goes, and consent or opt-out gates a change skips. Security has no `review-when-skills`: it joins a workflow change through the plan or the recheck, as before.

## Not measured

The pilot runs predate the restructure (scorecard in `docs/what-a-good-expert-looks-like.md`). Nothing has been measured since.
