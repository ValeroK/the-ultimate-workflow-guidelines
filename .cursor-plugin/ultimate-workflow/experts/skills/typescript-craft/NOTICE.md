# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| typescript-eslint and ESLint rule documentation in their repositories; the TypeScript tsconfig reference | Read in each tool's source repository on GitHub, 2026-10-20 | MIT | Every fact marked [D] |
| typescriptlang.org (4.4 release notes); typescript-eslint.io (rules and presets); eslint.org (`no-unsafe-finally`); the TypeScript wiki (breaking changes, 2.1); semver.org; the npm semver documentation; semver-ts.org; api-extractor.com; RFC 8259 | Checked live by the maintainer, 2026-10-20 (developer round 2, prompt 3b, software architect round 2) | Specification and tool documentation | Every fact marked [R] |
| affaan-m/ECC `typescript-reviewer` agent | Read 2026-10-20 | MIT | `as` casts on external data, `JSON.parse` handling, synchronous fs in handlers, unvalidated `process.env`, tsconfig strictness as a finding |
| trailofbits/skills `sharp-edges` JavaScript reference | Read 2026-10-20 | CC BY-SA 4.0 | Mutating array methods and numeric sort, `in` and the prototype chain, numeric strings compared as strings, lying type guards (ideas only; no text, so the share-alike terms do not apply) |
| wshobson/agents `typescript-advanced-types`, `modern-javascript-patterns`, `nodejs-backend-patterns` | Read 2026-10-20 | MIT | Prefer `unknown` to `any`, guards over assertions |

`||` against `??`, `fetch` with no default timeout, `Promise.all` against `allSettled`, `new Date` parsing, money in floating point and warm-container module state are our own reasoning, marked [O].

Left out, and why: prototype pollution, `eval`, ReDoS and `child_process.exec` (security owns them); `await` in a loop (correct code, a performance question); mixing `require` and `import` (not checkable in a diff); the `return-await` rule for a promise returned from `catch` when a `finally` follows (only a secondary source); wshobson's advice to use optional chaining to avoid property errors (it hides a missing value).
