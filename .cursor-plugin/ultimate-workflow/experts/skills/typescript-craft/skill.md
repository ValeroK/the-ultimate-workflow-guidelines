---
name: typescript-craft
description: Use when a change touches TypeScript or JavaScript files.
---

# TypeScript and JavaScript craft

Use this when a change touches `.ts`, `.tsx`, `.js`, `.mjs` or `.cjs` files. It holds only what is specific to the language and the Node runtime. Component and hook rules are in the React skill; checks true in every language stay in the expert's checklist, `engineering-principles` and `failure-handling`.

## First, find out what the linter and compiler already cover

Read `tsconfig.json` (and any `tsconfig.*.json` the changed files belong to), the ESLint config, `package.json` scripts, and the CI and pre-commit config. A problem that an enabled rule or compiler option catches is not a review finding. A change that weakens `tsconfig` strictness (`strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`) is a finding.

| Problem | Rule or option that catches it, when enabled |
|---|---|
| Promise neither awaited nor handled | typescript-eslint `no-floating-promises` |
| Promise passed where a value is expected (`if (promise)`, `forEach(async ...)`) | typescript-eslint `no-misused-promises` |
| `any` | typescript-eslint `no-explicit-any`, the `no-unsafe-*` family, `noImplicitAny` |
| Non-null assertion `!` | typescript-eslint `no-non-null-assertion` |
| Throwing a non-Error | typescript-eslint `only-throw-error` |
| `==` | ESLint `eqeqeq` |
| `||` used for a default | typescript-eslint `prefer-nullish-coalescing` |
| Unused variables and imports | typescript-eslint `no-unused-vars`, `noUnusedLocals` |
| Switch over a union that misses a case | typescript-eslint `switch-exhaustiveness-check` |
| `@ts-ignore` | typescript-eslint `ban-ts-comment` (prefer `@ts-expect-error` with a reason) |
| `parseInt` without a radix | ESLint `radix` |

## Traps a linter often misses

### Types that lie
- **`as` casts on external data.** `JSON.parse(body) as Order`, `response.json() as User`: the type is a promise nobody checked. Data from a request, a queue, a file or another service needs a runtime check at the boundary (a schema validator or a hand-written guard).
- **A type guard that does not check.** `function isAdmin(u): u is Admin { return true }` makes the compiler trust a lie.
- **`!` after a lookup** (`map.get(id)!`, `array.find(...)!`) where the value can be missing.
- **Indexing without `noUncheckedIndexedAccess`.** `record[key]` is typed as present when it may be `undefined`.

### Async
- **Missing `await`.** An async call whose result or completion the next line depends on (a validation, a write) runs in the background, and failures surface later or never.
- **`array.forEach(async ...)`** waits for nothing; the function returns before any item is processed. Use `for ... of` with `await`, or `Promise.all(array.map(...))`.
- **`Promise.all` versus `Promise.allSettled`.** `all` rejects on the first failure while the rest keep running; `allSettled` reports each result, and the code must then look at them.
- **`await` in a loop over independent work.** Correct but slow; a finding only when the cost is real (a request path, many items).
- **No timeout.** `fetch` has no default timeout; an external call without an `AbortSignal` (for example `AbortSignal.timeout(ms)`) can hang the request.

### Values and comparisons
- **`||` for a default** treats `0`, `''` and `false` as missing: `const limit = req.limit || 50` turns an explicit `0` into 50. Use `??`.
- **`==` coercion**, including `null == undefined` and `'' == 0`.
- **Numbers above 2^53** (database ids, Snowflake ids, money in minor units of large amounts) lose precision in `number` and in `JSON.parse`. Keep them as strings or `bigint`.
- **Money in floating point.** Use integer minor units or a decimal library.
- **`array.sort()` without a comparator** sorts numbers as strings and sorts in place, mutating a shared array. `reverse`, `splice` and `fill` also mutate.
- **`new Date(string)`** parses date-only strings as UTC and date-time strings without an offset as local time.
- **`in` and plain-object lookups** see inherited properties (`'toString' in {}` is true); use `Object.hasOwn` or a `Map` for dictionaries.
- **`this` lost in a callback** when a method is passed as a function (`setTimeout(obj.method)`).

### Errors
- **`catch (e)` used as an `Error`** without checking; `e` is `unknown` and may be a string or `undefined`.
- **Wrapping without a cause.** `throw new Error('save failed')` inside a catch loses the original; pass `{ cause: e }`.
- **`JSON.parse` on external input** with no handling, in a path where a malformed body should be a 400 and not a crash.

### Node and serverless runtime
- **Synchronous file or crypto calls** (`readFileSync`, `pbkdf2Sync`) in a request handler block every request on the event loop.
- **Module-level mutable state** in a Lambda or a long-lived server leaks between invocations or requests and between users.
- **`process.env.X` read without a check** deep in the code, so a missing setting fails at the first request instead of at start-up. Validate configuration once, at start-up.
- **Mixing `require` and `import`** in one package without intent.

### Security-relevant traps (raise them, name the domain as security)
- **Prototype pollution.** Merging untrusted objects (`Object.assign`, deep merge, spread of parsed JSON into a config) or `obj[userKey] = value`, where the key can be `__proto__`, `constructor` or `prototype`.
- **`eval`, `new Function`, `setTimeout` with a string**, on input a user can influence.
- **Regular expressions with nested quantifiers** (`(a+)+`, `(.*)*`) applied to user input: catastrophic backtracking freezes the event loop.
- **`child_process.exec`** with interpolated input; use `execFile` or `spawn` with an argument list.

## Not a finding

- Formatting, semicolons, quote style, import order where a formatter is configured.
- `interface` versus `type`, arrow functions versus `function`, `for ... of` versus array methods: preferences, unless the repository's convention says otherwise.
- `any` in a test fixture, or at a boundary to an untyped library with a comment saying so.
- Intentional fire-and-forget marked with `void` for telemetry or logging.
- A top-level error handler or Express error middleware that catches everything, logs it, and returns a generic response.
