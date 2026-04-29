# Memory templates

Two templates: the **slim index** that lives at the repo root (`memory.md`), and the **per-topic file** shape under `memory/`.

---

## `memory.md` — slim index (copy to repo root)

```markdown
# Memory

> Slim index of topical knowledge for this repo. Read the topical file only when
> the task touches the topic. For one-line empirical lessons, use `## Gotchas`
> in `CLAUDE.md` instead.

<!-- Each entry: link to the topical file + short purpose + a "Read when..." cue
     with concrete keywords and file globs. The cue is what the model uses to
     decide whether to fetch this topical for the current task. Concrete
     keywords (auth, JWT, migrations) beat vague phrases (handles things). -->

- [`memory/<topic>.md`](memory/<topic>.md) — <one-line purpose>. **Read when** <keyword 1>, <keyword 2>, or `<file glob>` files.
```

**Soft caps:** target ≤50 entries (~80 lines). Past that, group with `##` subsections (e.g. `## Backend`, `## Frontend`) or split into a sibling area.

---

## `memory/<topic>.md` — topical file

```markdown
# <Topic>

> Last updated: YYYY-MM-DD. When this stops being true, edit or delete the file.

## Mental model

<1–3 paragraphs: how this part of the system actually works. Make it readable
to someone who has never opened the codebase.>

## Key decisions

- **<Decision>**. Why: <rationale>. Alternatives considered: <…>. *(Optional date.)*
- **<Decision>**. …

## Common operations

- **How to <X>**: <steps>.
- **How to debug <Y>**: <steps>.

## Gotchas (topic-specific)

- <Optional. Use only if the gotcha is meaningful only inside this topic;
  otherwise put it in `CLAUDE.md`'s `## Gotchas`.>
```

**Soft cap:** target ≤2 pages (~150 lines) per topical. Past that, split into narrower topics (e.g. `auth-tokens.md` + `auth-roles.md`).

---

## Worked example — `memory/auth.md`

```markdown
# Auth

> Last updated: 2026-04-29. When this stops being true, edit or delete.

## Mental model

The client gets a short-lived (15-min) JWT after login plus a refresh token
stored in an HTTPOnly cookie. The frontend never sees the refresh token; it
calls `/auth/refresh` which the cookie middleware authorizes. Role checks
happen in the `requireRole(...)` middleware (`src/auth/middleware.ts`), not in
route handlers.

## Key decisions

- **`jose` for JWT validation, not `jsonwebtoken`**. Why: latency requirement (P99 < 5ms);
  `jose` is ~3x faster on Node 20. Alternatives considered: `jsonwebtoken` (slower),
  custom HMAC (fragile). *(2026-02-10.)*
- **Refresh token in HTTPOnly cookie, not localStorage**. Why: XSS-resistant; same-site Lax to
  block CSRF on top-level navigation. Alternatives considered: token in JS-readable cookie
  (XSS exposure), session in DB (extra round-trip).

## Common operations

- **How to add a new role**: edit `src/auth/roles.ts`, add to the union type, run
  `pnpm gen:roles` (regenerates the role-check middleware factory).
- **How to debug a 401**: check the JWT header in DevTools → Network; if missing, the
  cookie was rejected (likely cross-domain). If present, decode at `jwt.io` and look
  at `iat`/`exp`.

## Gotchas (topic-specific)

- The `/auth/refresh` endpoint must NOT be CORS-credentialed-allowed across origins —
  refresh tokens belong to one origin. (Discovered 2026-03-04, hit twice.)
```

This isn't an actual repo gotcha — it's a shape demonstration.
