# PRD review question bank

> Used during Phase 1 of `project-bootstrap-guidelines`. Walk through these with the user before the PRD is confirmed. Don't make the user answer every one — pick what's load-bearing for this project. The goal is to surface silent assumptions before they become code.

## Users & use cases

- Who is the primary user? Are there secondary users with different needs?
- What is the single most important job this system does for them?
- How will they discover it / learn to use it?
- What does a typical session look like (frequency, duration, device)?

## Scope

- What are we explicitly **not** building? (Pin this down — non-goals are half the PRD.)
- What's the smallest usable version — the thing we'd ship first and still call a product?
- Is this replacing something existing, or net-new?

## Scale

- Expected number of users at launch? In 6 months? In 2 years?
- Expected requests per second / data volume / storage growth?
- Any burst patterns (traffic spikes, batch jobs, seasonal loads)?

## Authentication & authorization

- Is there a login? If so, via what (email/password, OAuth providers, SSO, magic link)?
- Roles or permission tiers? Who can do what?
- Session model — persistent, short-lived, revocable?
- Multi-tenant? If yes, how is data isolated?

## Data

- What data do we collect? What's the most sensitive item?
- Retention — how long is it kept? Deletion on request?
- Ownership — does the user own their data? Export?
- Any data we explicitly shouldn't collect?

## Compliance & regulatory

- GDPR, CCPA, HIPAA, SOC2, PCI — any of these in scope?
- Audit logs required?
- Geographic restrictions on where data may live?

## Performance

- P95 latency target for the primary action?
- Offline / degraded-mode behavior?
- Any hard timeouts (upstream SLAs, user patience thresholds)?

## Integrations

- What external services must this talk to (payments, email, analytics, CRM)?
- Who owns each integration? What's the fallback when it's down?
- Any webhook / API consumers of **our** system?

## Deployment & operations

- Where does this run — our cloud, theirs, on-prem, hybrid?
- Who operates it? SRE model — on-call, incident response?
- CI/CD expectations — preview environments, staging, blue/green?
- Monitoring & alerting — what's the bar for "healthy"?

## Budget & timeline

- Hard budget ceiling for infra? For build effort?
- Launch deadline — fixed date or target window?
- If we're behind, what drops first — scope, quality, or date?

## Failure modes

- What's the worst plausible failure (data loss, downtime, wrong output, security breach)?
- What's the recovery story for each?
- Any single points of failure we're accepting knowingly?

## Success metrics

- What's the one metric that, if it moves, tells us this worked?
- Leading indicators we can measure before the main metric shifts?
- Counter-metrics — what would tell us we're gaming the primary number?

## Exit criteria

- When do we call the project "done" rather than "ongoing"?
- What signals retire it or trigger a rewrite?
