# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| facebook/react `eslint-plugin-react-hooks`; jsx-eslint/eslint-plugin-react rule documentation (`jsx-key`, `no-array-index-key`, `no-unstable-nested-components`, `jsx-no-leaked-render`) | Read in each tool's source repository on GitHub, 2026-10-20 | MIT | Every fact marked [D] |
| react.dev (rules of hooks, reusing logic with custom hooks, `Component` reference and error boundaries, Strict Mode); the Redux Toolkit quick start (read on its Chinese mirror; the English page was not reachable) | Checked live by the maintainer, 2026-10-20 (developer round 2) | Vendor documentation | Every fact marked [R] |
| affaan-m/ECC `react-reviewer` agent and `react-patterns` skill | Read 2026-10-20 | MIT | Derived state in effects, effect chains, missing cleanup, stale closures, state mutation, state initialised from props, server and client boundaries |
| vercel-labs/agent-skills `react-best-practices` | Read 2026-10-20 | MIT | Derive state during render, components defined inside components, minimal data to client components |
| wshobson/agents `react-state-management` | Read 2026-10-20 | MIT | Do not duplicate server state in client stores |

Out-of-order responses in fetching effects are our own reasoning, marked [O].

Left out, and why: `dangerouslySetInnerHTML`, unsafe URL schemes, server actions without validation and authorization, client-exposed environment variables and tokens in `localStorage` (security owns them); `"use client"` at the top of a large tree (bundle size, frontend and performance experts, planned); boolean props that switch behaviour (one home, the developer's review checklist); tech-leads-club `react-composition-patterns` (only that row used it); "mutating the draft and returning a value is an error" in Redux Toolkit (only in the checker's own wording, not quoted).
