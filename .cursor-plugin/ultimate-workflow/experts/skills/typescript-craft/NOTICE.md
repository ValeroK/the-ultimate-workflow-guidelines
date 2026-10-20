# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `typescript-reviewer` agent | MIT | `any`, non-null assertions, `as` casts, floating promises, `forEach(async)`, `JSON.parse` handling, throwing non-Errors, synchronous fs in handlers, unvalidated `process.env`, tsconfig strictness as a finding |
| trailofbits/skills, `sharp-edges` JavaScript reference | CC BY-SA 4.0 | Loose equality, prototype pollution, ReDoS, `parseInt` radix, `this` binding, mutating array methods, numeric sort, `in` and the prototype chain, large-number precision, lying type guards (ideas only; no text, so the share-alike terms do not apply) |
| wshobson/agents, `typescript-advanced-types`, `modern-javascript-patterns`, `nodejs-backend-patterns` | MIT | Prefer `unknown` to `any`, avoid assertions in favour of guards. Its advice to use optional chaining to avoid property errors was not taken: it hides a missing value where one is required |
| typescript-eslint and ESLint rule documentation in their repositories, and the TypeScript tsconfig reference, verified on 2026-10-20 against each tool's own source repository on GitHub (the documentation sites were not reachable from the build session) | MIT | Every rule and compiler option named in the linter table |
| semver.org; npm node-semver documentation, checked live by the maintainer on 2026-10-20 | Specification and tool documentation | The published package versions section (moved from `schema-evolution`) |

`||` versus `??`, `fetch` with no default timeout, `Promise.all` versus `allSettled`, `new Date` parsing, money in floating point and warm-container module state come from our own review experience and the evaluation corpora.
