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

None yet. The round-2 check (`docs/research/security-2026-10-20.md`) confirmed the CI facts (`allow-unsafe-pr-checkout`, `actions.lock`, the 2026-11-02 `pull_request_target` policy, OIDC subject forms, cache modes), IAM, JWT, CORS, deserialisation and MCP facts that the ledger proposed for skills. Turning `agent-surface.md`'s CI section into a `ci-workflow-security` skill, with those rows, is the next step; it was kept as a reference in the restructure.

## Not measured

The pilot runs predate the restructure (scorecard in `docs/what-a-good-expert-looks-like.md`). Nothing has been measured since.
