---
name: handoff
description: Write a session handoff document so a fresh agent can pick up the work. Invoke with /handoff, optionally passing what the next session should focus on.
argument-hint: [what the next session will focus on]
disable-model-invocation: true
license: LicenseRef-MIT-Attribution
---

# Handoff

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

`$ARGUMENTS`, when present, describes what the next session will focus on. Treat it as scope: expand the parts that bear on that focus, compress the rest. When empty, cover the session as a whole.

## Rules

- **Don't duplicate other artifacts.** Specs, `PRD.md`, `PLAN-<feature>.md`, ADRs, `progress.md`, `memory/<topic>.md`, issues, commits, diffs, PRs — reference them by path or URL. Never restate their content.
- **Don't issue orders.** The document informs; it does not tell the next agent to start working. Close it by saying the information is to be held, and further instructions awaited.
- **Redact.** API keys, tokens, passwords, connection strings, and personally identifiable information get replaced with `[REDACTED]` — including anything pasted into the chat that isn't already public in the repo.
- **Language.** Write in the primary language of this chat.
- **Format.** Markdown.

## Structure

Sections, in this order:

1. **Purpose and background** — what the project is, why it exists, and the resources it draws on (upstream docs, specs, references).
2. **Description, tools, and how to use them** — what the project ships, plus the tooling a fresh agent needs: commands, scripts, test and lint entry points, MCP servers, environment expectations, and how each is run.
3. **Policies, data structures, schemas** — the detailed rules the next agent must respect: conventions, invariants, file formats, manifest schemas, API contracts, mirror or sync discipline between files.
4. **Suggested skills** — which skills the next agent should invoke, named exactly as invoked, each with the condition that triggers it. For repos using this plugin that usually means `the-ultimate-workflow-guidelines` for feature work in an existing codebase and `project-bootstrap-guidelines` for a greenfield start; add any project-specific or host-bundled skills that apply.
5. **Current state** — what has landed and where (branch, commits, PR), what is in flight, what is verified versus assumed.
6. **Open issues** — unresolved questions, known breakage, decisions still pending, and who or what is blocking each.
7. **What to do next** — candidate next steps framed as options with tradeoffs, not as a work order.

## Delivery

Write the document to `HANDOFF-<topic>.md` in the project root, then make it downloadable from within the chat body — in Claude Code, attach it with the host's file-send tool; on other hosts, surface the file however that host delivers downloads. State the path either way.
