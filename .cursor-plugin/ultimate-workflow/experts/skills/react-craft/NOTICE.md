# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `react-reviewer` agent and `react-patterns` skill | MIT | Hook rules, derived state in effects, effect chains, missing cleanup, stale closures, state mutation, index keys, state initialised from props, server and client boundaries, server actions as public endpoints, client-exposed secrets, tokens in `localStorage` |
| vercel-labs/agent-skills, `react-best-practices` | MIT | Derive state during render instead of in effects, components defined inside components, no module-level request state in server rendering. Its performance rules (waterfalls, bundles, memoisation) are left to the frontend expert |
| tech-leads-club/agent-skills, `react-composition-patterns` (authored by Vercel) | MIT | Boolean props versus explicit variants and composition through `children` |
| wshobson/agents, `react-state-management` | MIT | Colocate state; do not duplicate server state in client stores |

Out-of-order responses in fetching effects and `count && <X />` rendering `0` come from our own review experience.
