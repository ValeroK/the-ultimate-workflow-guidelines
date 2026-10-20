# React craft

Use this when a change touches React components (`.tsx`, `.jsx`) or hooks. It covers component and hook correctness. Accessibility, rendering performance and visual behaviour belong to the frontend expert; TypeScript and JavaScript traps are in `typescript-craft`.

## First, find out what the linter already covers

Read the ESLint config. Without `eslint-plugin-react-hooks` (`rules-of-hooks`, `exhaustive-deps`) the hook rules below are unchecked, which is worth saying once. A suppression of `exhaustive-deps` added by the change without a reason is a finding.

| Problem | Rule that catches it, when enabled |
|---|---|
| Hook called conditionally or outside a component | `react-hooks/rules-of-hooks` |
| Effect, memo or callback dependencies missing | `react-hooks/exhaustive-deps` |
| List item without a key | `react/jsx-key` |
| Index used as a key | `react/no-array-index-key` |

## Traps a linter often misses

### Effects
- **An effect that computes derived state** (`useEffect(() => setTotal(sum(items)), [items])`) renders twice and can show a stale value in between. Compute it during render.
- **Effects that set state that triggers other effects**: a chain that is hard to follow and renders several times. Derive during render, or do the work in the event handler that caused it.
- **An effect with no cleanup** for a subscription, an interval, an event listener or a request.
- **Out-of-order responses.** An effect that fetches on every change of a value, without cancelling or ignoring the previous request, lets an older response overwrite a newer one. Abort it or ignore stale results in the cleanup.
- **Stale closure.** An interval or async handler that reads a state value captured when it was created. Use the functional updater (`setCount(c => c + 1)`) or a ref.

### State
- **Mutating state** (`items.push(x); setItems(items)`) does not re-render and breaks memoised children. Create a new value.
- **The same data in two places**, or state that is only a computed copy of props or other state.
- **State initialised from a prop** does not follow later changes to that prop. Use the prop directly, or reset the component with a `key`.
- **`key={index}` on a list that can be reordered, filtered or inserted into**: state and focus attach to the wrong row.

### Rendering
- **A component defined inside another component** is a new type on every render, so it remounts and loses its state each time.
- **`{count && <Badge />}`** renders `0` when the count is zero. Use a boolean (`count > 0 &&`).
- **Boolean props piling up to switch behaviour** (`isCompact`, `isInline`, `showHeader`...): each new mode adds branches to one component. Explicit variants or composition through `children` keep each mode simple.

### Server and client boundaries (React Server Components, Next.js App Router)
- **A server-only module imported into a client component**: a database client, a secret-holding SDK, or a module marked `server-only`.
- **A full record passed as props to a client component** ships every field to the browser, including ones the page never shows.
- **`"use client"` at the top of a large tree** turns everything it imports into client code.

### Security-relevant traps (raise them, name the domain as security)
- `dangerouslySetInnerHTML` with content that is not sanitised at the same place.
- `href` or `src` built from user input without checking the scheme (`javascript:`, `data:`).
- A server action that does not validate its input and check authorisation: it is a public endpoint.
- A secret in a client-exposed environment variable (`NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`).
- A session token kept in `localStorage`.

## Not a finding

- Missing `useMemo`, `useCallback` or `React.memo` without a measured or obvious cost.
- Class components in code the change did not touch.
- Prop drilling through one or two levels.
- Styling, file layout, state-library choice: preferences unless the repository's convention says otherwise.
