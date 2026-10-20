---
name: react-craft
description: Use when a change touches React components or hooks - hook rules, effects and their cleanup, state, rendering traps, error boundaries, and server and client component boundaries.
verified: 2026-10-20
requires: React 18 or 19 (use() is 19); eslint-plugin-react-hooks and eslint-plugin-react where enabled
---

# React craft

## Goal

- **Lets the expert catch:** a component or hook that renders or behaves wrongly although it compiles: a hook the lint rules cannot see, an effect that races or leaks, mutated or duplicated state, a render trap, an error an error boundary never catches, a server-only module or a full record crossing into client code.
- **Applies to:** `.tsx` and `.jsx` files, and hooks in `.ts` and `.js`.
- **Not for:** TypeScript and JavaScript traps (`typescript-craft`); `dangerouslySetInnerHTML`, unsafe URL schemes, server actions without authorization, client-exposed secrets and tokens in `localStorage` (security); accessibility, rendering performance and bundle size (frontend, planned); a boolean prop that switches behaviour (the developer's review checklist).

Sources: **[D]** `eslint-plugin-react-hooks` and `eslint-plugin-react` rule documentation in their repositories (2026-10-20); **[R]** the maintainer's live check of react.dev and the Redux Toolkit site (2026-10-20); **[T]** an upstream community skill, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **What the linter already enforces.** Read the ESLint config. Without `eslint-plugin-react-hooks`, the hook rules below are unchecked; say so once [T]. A suppression of `exhaustive-deps` added by the change without a reason is a finding [T].
- **The React version** (19 permits `use()` in conditions) and **the framework** (React Server Components, Next.js App Router) for the server and client rows.
- **Whether Strict Mode is on** in development, which double-mounts components.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Hooks

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A hook called conditionally, in a loop, in a nested function, inside `try`/`catch`/`finally`, or after a conditional early return breaks the call order [R] | `if (x) useState()`, `try { useData() }`, a hook below `if (!user) return null` | React 19's `use()`, which may be called conditionally [R]; `rules-of-hooks` is on [D] |
| A function is treated as a hook, and checked by the lint rules, only when its name is `use` followed by a capital letter [R] | A function that calls `useState` or `useEffect` named `getUser` or `usedata` | A plain utility that calls no hooks |
| Missing effect, memo or callback dependencies read stale values [D] | A dependency array that omits a value the callback reads | `exhaustive-deps` is on |

## Effects

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An effect that computes derived state renders twice and can show a stale value between [T] | `useEffect(() => setTotal(sum(items)), [items])` | Compute it during render |
| Effects that set state that triggers other effects form a chain that renders several times [T] | Two or more effects linked through state they set | The work moves to the event handler that caused it |
| An effect with no cleanup for a subscription, an interval, a listener or a request leaks; Strict Mode in development mounts, unmounts and mounts again to expose it, and `componentDidMount` in a class component needs a matching `componentWillUnmount` [R] | `useEffect(() => { socket.on(...) }, [])` with no returned cleanup; a class subscribing in `componentDidMount` only | |
| An effect that fetches on every change, with no cancel or ignore of the previous request, lets an older response overwrite a newer one [O] | `useEffect(() => { fetch(q).then(setData) }, [q])` | An `AbortController` aborted in the cleanup, or a stale flag |
| An interval or async handler reading state captured when it was created uses a stale value [T] | `setInterval(() => setCount(count + 1), 1000)` in an effect with `[]` | The functional updater (`setCount(c => c + 1)`) or a ref |

## State and rendering

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Mutating state does not re-render and breaks memoised children [T] | `items.push(x); setItems(items)` | Inside an Immer `produce` or a Redux Toolkit reducer (below) |
| The same data in two places, or state that is only a computed copy of props or other state, goes out of step [T] | `useState(props.items.length)`, or server data copied into a client store | |
| State initialised from a prop does not follow later changes to it [T] | `const [name, setName] = useState(props.name)` where the prop changes | The prop is an initial value by contract, or the component is reset with a `key` |
| `key={index}` on a list that can be reordered, filtered or inserted into attaches state and focus to the wrong row; a list item with no key at all [D] | `items.map((it, i) => <Row key={i} />)` on a sortable list | A static list that never changes order; `no-array-index-key` and `jsx-key` are on |
| A component defined inside another is a new type on every render, so it remounts and loses its state [D] | `function Parent() { function Child() {...} return <Child /> }` | `no-unstable-nested-components` is on |
| `{count && <Badge />}` renders `0` when the count is zero [D] | `&&` with a number on the left | A boolean (`count > 0 &&`); `jsx-no-leaked-render` is on |

## Errors

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An error boundary does not catch errors in event handlers, asynchronous code (timers, `fetch` callbacks), server rendering, or the boundary itself [R] | A handler or a fetch callback that throws, relying on an ancestor `ErrorBoundary` | The error is caught and set into state, then thrown during render |

## Server and client boundaries

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A server-only module imported into a client component: a database client, a secret-holding SDK, a module marked `server-only` [T] | An `import` of such a module in a file under `"use client"` | |
| A full record passed as props to a client component ships every field to the browser [T] | `<Profile user={user} />` from a server component, where `user` holds fields the page never shows | Only the fields shown are passed |

## Not a finding

- Missing `useMemo`, `useCallback` or `React.memo` without a measured or obvious cost.
- Mutating syntax inside an Immer `produce` or a Redux Toolkit `createSlice` reducer, which turns it into an immutable update [R].
- Class components in code the change did not touch.
- Prop drilling through one or two levels.
- Styling, file layout and the choice of state library, unless the repository's convention says otherwise.
