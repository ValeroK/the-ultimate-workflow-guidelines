---
name: typescript-craft
description: Use when a change touches TypeScript or JavaScript files - types that lie, async and promise traps, value and comparison traps, error wrapping, Node runtime traps, and the public API of a package others install.
verified: 2026-10-20
requires: TypeScript 4.4+ for useUnknownInCatchVariables under strict; typescript-eslint 6+ preset names
---

# TypeScript and JavaScript craft

## Goal

- **Lets the expert catch:** TypeScript and JavaScript code that compiles and passes its linter yet lies about its types, loses a rejection, mis-handles a value (`0`, a large id, a date string), drops an error's cause, blocks the event loop, or breaks the consumers of a published package.
- **Applies to:** `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs` files, and `package.json` of a package others install.
- **Not for:** components and hooks (`react-craft`); prototype pollution, `eval`, ReDoS and command injection (security); callers of an export inside this repository (softarch); lock files and new dependencies (`dependency-discipline`); checks true in every language (`failure-handling`, `engineering-principles`).

Sources: **[D]** typescript-eslint and ESLint rule documentation and the TypeScript tsconfig reference, as published in their repositories (2026-10-20); **[R]** the maintainer's live check (typescriptlang.org, typescript-eslint.io, eslint.org, the TypeScript wiki, semver.org, semver-ts.org, api-extractor.com, the npm semver docs, RFC 8259; 2026-10-20); **[T]** an upstream community skill, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **What the compiler and linter already enforce.** Read the `tsconfig.json` (and any `tsconfig.*.json`) the changed files belong to, the ESLint config, the `package.json` scripts and the CI and pre-commit config. A problem an enabled rule or option catches is not a finding; a change that turns one off, or weakens `strict`, `noImplicitAny`, `strictNullChecks` or `noUncheckedIndexedAccess`, is [T].
- **Which typescript-eslint preset is on.** `no-floating-promises`, `no-misused-promises`, `restrict-plus-operands` and `unbound-method` are in `recommended-type-checked` (so in `strict-type-checked` too); `no-misused-spread` is in `strict-type-checked`; `require-array-sort-compare` is in no preset, only `all` [R].
- **The compile target.** ES5 against ES2015 or later changes the `Error` subclass rule below.
- **Whether the package is installed by others** (`"private": true` absent, published to a registry). Only then does the public API section apply.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## What an enabled rule already catches

Each row is a finding only when its rule or option is off; with it on, the linter already reports it.

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A promise neither awaited nor handled: an async call whose result or completion the next line depends on [R] | `saveOrder(o);` with no `await`, `.then` or `.catch` | `no-floating-promises` is on |
| `void promise` silences `no-floating-promises` but does not handle the rejection, which stays unhandled [R] | `void sendEmail(u)` where `sendEmail` can reject and has no `.catch` | The called function catches every error itself |
| A promise where a value is expected: `if (promise)`, `array.forEach(async ...)`, which waits for nothing [R] | `items.forEach(async (i) => await save(i))` | `no-misused-promises` is on |
| A promise returned without `await` inside `try` escapes the `catch` [R] | `try { return fetchUser(id) } catch (e) { ... }` | `return-await` is on (its default is `in-try-catch`) |
| `+` concatenates when one side is a string: `"5" + 3` is `"53"`, for example a number read from a query string [R] | `req.query.page + 1` | `restrict-plus-operands` is on |
| A method passed as a function loses `this` [R] | `setTimeout(obj.method)`, `arr.map(this.format)` | `unbound-method` is on, or the method is an arrow function or bound |
| Spreading a Promise, an array, a class instance or a string into an object loses what it is (you meant `await`, or the methods) [R] | `{ ...fetchUser(id) }` without `await`, `{ ...userInstance }` | `no-misused-spread` is on; a plain data object with no methods |
| `catch (e)` used as an `Error`; under `strict` from 4.4, `useUnknownInCatchVariables` types it `unknown` [R] | `catch (e: any) { log(e.message) }`, or the option set to false | The option is on and `e` is narrowed |
| `||` for a default turns `0`, `''` and `false` into the default: `req.limit \|\| 50` makes an explicit `0` fifty [O] | `const x = input \|\| fallback` where `0` or `''` is valid | `prefer-nullish-coalescing` is on |
| `any`, a non-null assertion `!` after a lookup (`map.get(id)!`), a non-Error thrown, `@ts-ignore`, an unhandled union case, `==`, `parseInt` without a radix [D] | Those constructs in added lines | `no-explicit-any`, `no-non-null-assertion`, `only-throw-error`, `ban-ts-comment`, `switch-exhaustiveness-check`, `eqeqeq`, `radix` are on |
| A `return` or `throw` in `finally` overrides the `try` and `catch` outcome [R] | `finally { return cached }` | `no-unsafe-finally` (in `eslint:recommended`) is on |
| A rethrow inside `catch` without the original as `cause` loses it [D] | `catch (e) { throw new Error('save failed') }` | `preserve-caught-error` is on, or `{ cause: e }` is passed |

## Types that lie

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An `as` cast on external data is a promise nobody checked; data from a request, a queue, a file or another service needs a runtime check at the boundary [T] | `JSON.parse(body) as Order`, `(await res.json()) as User` | A schema validator or guard runs on the value first |
| A type guard that does not check makes the compiler trust a lie [T] | `function isAdmin(u): u is Admin { return true }` | |
| Without `noUncheckedIndexedAccess`, `record[key]` is typed as present when it may be `undefined` [T] | Indexed access used without a check in a project with the option off | The option is on |
| With an ES5 target, a subclass of `Error`, `Array` or `Map` fails `instanceof` unless the constructor calls `Object.setPrototypeOf(this, FooError.prototype)` with the class's own prototype (`new.target` cannot be ensured in ES5) [R] | `class NotFound extends Error` with `target: "ES5"` and no `setPrototypeOf` | Target ES2015 or later |

## Async, values and errors

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `Promise.all` rejects on the first failure while the rest keep running; `allSettled` reports each, and the code must then read the results [O] | `Promise.all` over independent side effects where one failure should not hide the others | All-or-nothing work where the first failure ends it |
| `fetch` has no default timeout, so an external call can hang the request [O] | `fetch(url)` with no `signal`, such as `AbortSignal.timeout(ms)` | A client wrapper that sets one |
| JSON integers are exact only within +/-(2^53 - 1), so database and Snowflake ids, or large minor-unit amounts, lose precision in `number` and `JSON.parse` [R] | A 64-bit id parsed into `number` | Kept as a string or `bigint` |
| Money in floating point rounds wrongly [O] | `price * 1.2` on a `number` of currency | Integer minor units or a decimal type |
| `array.sort()` with no comparator sorts numbers as strings and sorts in place, mutating a shared array; `reverse`, `splice` and `fill` mutate too (`toSorted` does not) [T]. No preset enables `require-array-sort-compare` [R] | `ids.sort()` on numbers, or `sort` on an array a caller owns | A string array where code-unit order is wanted |
| `new Date(string)` reads a date-only string as UTC and a date-time with no offset as local time [O] | `new Date('2026-10-20')` compared with a local date | An ISO string with an offset |
| `in` and plain-object lookups see inherited properties (`'toString' in {}` is true) [T] | A plain object used as a dictionary of user keys | `Object.hasOwn`, or a `Map` |
| Numeric strings compare as strings: `"10" > "9"` is false [T] | Comparing values read from a query string or a header | Converted to numbers first |
| `JSON.parse` on external input with no handling crashes a path where a malformed body should be a 400 [T] | `JSON.parse(req.body)` outside a `try` on a request path | A framework body parser that already returns 400 |

## Node and serverless runtime

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A synchronous file or crypto call in a request handler blocks every request on the event loop [T] | `readFileSync`, `pbkdf2Sync` inside a handler | Start-up code, or a CLI |
| Module-level mutable state leaks between invocations of a warm Lambda or requests of a long-lived server, and between users [O] | A module-level `let` or a cache keyed by user, written in a handler | A cache that may be shared across users by design |
| `process.env.X` read deep in the code fails at the first request instead of at start-up [T] | A new `process.env` read inside business logic | Configuration validated once at start-up |

## Public API of a published package

Only for a package others install. Consumers inside this repository are the software architect's.

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A wider return type breaks consumers; a narrower parameter type breaks them [R] | `(): string` becomes `(): string \| null`; `(x: string \| number)` becomes `(x: string)` | |
| A required property added to a type users construct breaks them [R] | A new non-optional field on an exported input or options type | An output-only type |
| A mutable property's type change breaks consumers in either direction; a class export turned type-only, or a method turned into an arrow-function property, breaks them [R] | Those edits on exported declarations | |
| Dropping a supported TypeScript version is breaking under the package's declared support policy [R] | A raised `typescript` peer range or a syntax older compilers reject | No support policy is declared |
| api-extractor writes the public API to an `*.api.md` report (`.api.ts` before version 7) [R] | An exported API change with no matching report update, where the repository uses api-extractor | |
| Under SemVer, 0.x may change anything; from 1.0 a deprecation needs a minor bump and a breaking change a major one [R]. npm's `^0.2.3` allows `<0.3.0` and `^0.0.3` only `0.0.3`, so a breaking 0.x patch reaches every caret consumer [R] | A breaking export change with no matching bump, or a changeset marked patch for a removed export [O] | |

## Not a finding

- `interface` against `type`, arrow functions against `function`, `for ... of` against array methods, unless the repository's convention says otherwise.
- `any` in a test fixture, or at a boundary to an untyped library with a comment saying so.
- `await` in a loop over independent work, where the code is correct (a performance question, not a defect here).
- A rule the enabled preset already reports.
