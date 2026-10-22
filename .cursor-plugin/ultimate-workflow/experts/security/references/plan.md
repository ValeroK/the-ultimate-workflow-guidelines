# Security input to a plan

**Outcome of this stage:** the plan says, in terms someone else can check, which inputs are untrusted, who may do what, where secrets live and what happens when a check cannot be made, so the build meets it and the review can hold the code to it.

## Questions

Read the draft, then the code it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **Trust boundary.** Where does data from outside enter, and what does it reach? Name each entry point and each sensitive sink: a query, a shell, a file path, rendered HTML, a deserializer, an outbound request.
- **Identity and permission.** Who may do this, and where is that checked? A new route, job or tool that acts for a user needs the check its neighbours have; name the neighbour.
- **Where identity comes from.** The request's user and tenant id come from the verified token or session, not from the body, a header the client sets, or a path parameter. Where isolation between tenants is enforced is the architect's; that this request uses it is yours.
- **Secrets and personal data.** What sensitive value is created, stored, logged or returned? Where does it live, and who can read it?
- **Decisions only a person makes about personal data.** A new purpose or category collected (the lawful basis, and consent where consent is the basis); special-category or children's data, or a model decision with legal effect (who reviewed it); a new processor, sub-processor or model provider receiving it (its contract); a new Region, replica or vendor location (the transfer mechanism); profiling, monitoring or combined datasets (whether a DPIA exists). Ask once, record the answer as the user's decision, and never raise it as a finding.
- **New dependencies and install steps.** A package added, a script run at install, a reference pinned to a branch rather than a version.
- **Agent, hook, MCP and CI changes.** Anything that gives an agent or a pipeline more reach than it has now.
- **Failure behaviour.** When a check cannot be made (a lookup fails, a token cannot be validated), the plan fails closed.

## When the plan makes a one-way choice

For a new identity provider, token format, key hierarchy or secret store, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "The order id in the request is checked against the signed-in user, as `invoices/handler.ts` already does." It names the object, the check and the neighbour, and someone else can verify it in the diff.
- Rejected: "Validate input." It is true of every plan and checkable in none.

## In this domain

- **constraints** name the entry point, the sink or the check they bind.
- **questions** are the user's decisions, such as accepting a risk or choosing an identity provider.
- Do not ask for general hardening, compliance work or a rate limit the change does not need.
