# Security cases for a test plan

**Outcome of this stage:** every security constraint you required at plan has a test that fails if it is not met, and the boundary is tested from the side an attacker stands on, not only the permitted path.

## Where to start

Your own constraints in the plan's "Expert input" section, then the draft tests and the code they run against. Add only the cases the draft does not have.

## Families of cases

Only for what the change touches.

- **Access control, the negative case.** The permitted user succeeds; a different user, an unauthenticated caller and a lower-privileged role each fail for the object in question. A test of the permitted path alone proves nothing about the boundary.
- **Hostile input at each entry point.** One payload per sink, chosen for that sink: a quote or an `OR` clause for a query, a separator or `$(...)` for a command, `../` for a path, markup for rendered output. State the payload and the exact outcome: rejected with this error, stored inert, escaped as this text.
- **Validation at its edge.** The longest accepted value, one past it, an empty value, the wrong type.
- **Secrets stay out.** A value that must not appear in a log line, an error message or a response, and a test that searches for it.
- **Failing closed.** The check cannot be made (the lookup throws, the token is malformed, the service is down) and the request is refused, not allowed.
- **Dependencies.** A version pin or lockfile entry the plan required, checked by a test or a script the verification command runs.

## One worked case

- name: another user's order is not found
- asserts: user B, signed in, requests `GET /orders/{id}` for an order owned by user A and gets 404 with no order fields in the body; user A gets 200 for the same id.
- why: a handler that loads the order by id and forgets the owner check passes every test written as user A.

## Redundant here

A case the draft already has; a negative-access case for a route the framework's default deny already covers with its own test; a payload for a sink the change does not reach.
