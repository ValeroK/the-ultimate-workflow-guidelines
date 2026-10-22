---
name: web-performance
description: Use when a change alters what a web page loads or renders first - imports into the root layout or client entry, `use client`, dynamic imports and barrels, scripts and third-party tags, the main image, fonts, media dimensions, list rendering, input handlers, animations, bundler config, Next.js Image and caching - to find a cause of slow loading, layout shift or slow input that the diff shows, stated as potential impact, never as a measured number.
verified: 2026-10-22
---

# Web performance

## Goal

- **Lets the expert catch:** code every route pays for that one route needs, the page's main content found late or loaded lazily, layout that shifts as media and fonts arrive, main-thread work on every keystroke, animations that force layout, and bundler settings that stop unused code being dropped.
- **Applies to:** root layouts and client entries, `"use client"`, `import()`, `next/dynamic`, `React.lazy`, `<script>`, `<link rel>`, `<img>`, `<Image>`, `<video>`, `<iframe>`, `@font-face`, input and scroll handlers, CSS animations, `package.json` `sideEffects`, bundler and Next.js config.
- **Not for:** server latency, CDNs and `Cache-Control` headers, the back/forward cache's `no-store` half (architect, `caching-and-latency`); queries and pagination under a list (data); whether a Lighthouse or bundle gate can fail (quality, `test-gates`); effect and state correctness and memoisation (`react-craft`); motion that breaks the UI and taste (frontend).

Sources: **[R]** the maintainer's live check of web.dev, MDN, the HTML standard, W3C CSS Fonts, developer.chrome.com, webpack, Rollup, Vite, nextjs.org, react.dev and motion.dev, block I read twice (2026-10-22); **[T]** addyosmani, vercel, tech-leads-club, ziniman and awesome-copilot performance skills (MIT), not checked; **[O]** our own reasoning. Every finding is "potential impact" and names the cause; no build or browser runs here, so never state a size, a time or a score.

## First, establish the target

- **The framework, its rendering model and version** (Next.js App or Pages Router, Vite SPA, Remix), whether **React Compiler** is on, and the bundler.
- **Each changed page's main content** (a hero image, a heading, a block of text), and whether it is in the server-rendered HTML.
- **The repository's own budget gate**, if any. With none, do not invent a number.
- Thresholds, for context only: good is LCP at most 2,500 ms, INP at most 200 ms, CLS at most 0.1, poor above 4,000 ms, 500 ms and 0.25, judged at the 75th percentile, mobile and desktop apart [R]. INP replaced FID on 2024-03-12 [R]; new code reporting FID (`onFID`) measures a retired metric.

## Loading

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `"use client"` makes the module and everything it imports client code [R] | `"use client"` added to a layout or page root, pulling its whole import tree to the browser | Server components passed in as `children` stay on the server [R] |
| Code every route loads pays for every route [O] | A heavy or whole library imported into the root layout, `_app` or the client entry for one route's feature | The repository already ships it on every route |
| A large component shown only on demand (modal, editor, chart, map) can load with `next/dynamic` or `React.lazy` [R] | A static import of such a component where the repository splits similar ones | |
| `ssr: false` in `next/dynamic` is not allowed in Server Components [R] | `dynamic(..., { ssr: false })` in a file with no `"use client"` | |
| An `import()` with a variable path bundles every module that could match; Vite allows variables one directory level deep only [R] | `` import(`./${dir}/${name}`) `` or `import(path)` | A lookup table of static `() => import('./X')` [R] |
| Tree shaking needs ES modules kept as ES modules, `sideEffects` in `package.json`, `usedExports` and production mode [R]; compiling to CommonJS stops it [R]. Rollup's `treeshake.moduleSideEffects: false` keeps a module only if an export is used [R] | A frontend `tsconfig` or Babel config emitting CommonJS; `require()` in browser code; a library's `package.json` with no `sideEffects` | Polyfills and global CSS listed in `sideEffects` [R] |
| Barrel imports: Next.js `optimizePackageImports` loads only the modules used, and covers libraries such as `lucide-react`, `date-fns` and `lodash-es` by default [R] | A barrel import from a large in-repo or third-party package not on the default list and not configured | Packages on the default list |
| A classic `<script src>` with no `async`, `defer` or `type="module"` blocks parsing; module scripts defer by default [R] | Such a script in `<head>` or early `<body>` | A tiny inline script that sets the theme before first paint |
| A third-party script in the root layout runs on every route [O] | A tag manager, chat or analytics script added to the root layout for one page | |

## The main content

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Lazy-load below the fold, load the initial viewport eagerly [R]; `loading` defaults to `eager` [R], so below-the-fold images need `loading="lazy"` | `loading="lazy"` on the main or first visible image; below-the-fold images with no `loading` | Next.js `<Image>`, which lazy-loads by default |
| An LCP image found late is helped by `fetchpriority="high"`; an image preload is Low or Medium priority by default [R]. Use it on one or two resources [R] | The main image, or its preload, with no `fetchpriority`; several resources marked high | |
| The preload scanner reads the HTML, body included, but not CSS or script-inserted markup [R] | The main image set as a CSS `background-image` or injected by script, with no preload in the HTML | A `<link rel="preload" as="image">` for it |
| LCP candidates are `img`, `image` inside `svg`, `video` (poster or first frame), `url()` backgrounds and block-level text; a plain `<svg>` is not one [R]. Chromium ignores elements at `opacity: 0` [R], so a hero that fades in from 0 counts only when visible | A hero starting at `opacity: 0` for a script-driven fade-in | |
| In Next.js 16 `priority` on `<Image>` is deprecated for `preload` [R] | `priority` on the main `<Image>` in a Next.js 16 project, or no `preload` on it | Next.js 15 and earlier |
| Main content fetched on the client after hydration, in a framework that renders on the server, arrives late [O] | The main image or text fetched in `useEffect` | Data that only the client can know |

## Layout shift

- `width` and `height` on `img`, `video` and on `<source>` in `<picture>`, or CSS `aspect-ratio`, reserve the space before the media loads [R]. Media, iframes and embeds with none of these shift the layout [O]. Not when a fixed box around them reserves the space.
- Changing `top` or `left` causes layout shifts, even on an element in its own layer [R].
- Content inserted above existing content after load shifts it [O]; shifts within 500 ms of user input are excluded (`hadRecentInput`) [R].
- `content-visibility: auto` needs `contain-intrinsic-size` to keep the scrollbar and layout steady [R]. Not on content in the first viewport.

## Fonts

- `font-display`: `swap` has a block period of 100 ms or less and an infinite swap; `fallback` a short block and about 3 s of swap; `optional` a short block and no swap [R]. With `swap`, a fallback tuned with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` limits the shift [R].
- A font stylesheet loaded with `<link>` arrives sooner than through CSS `@import` [R]. Font `preload` and `preconnect` need `crossorigin` [R].
- `@font-face` alone downloads nothing [R], so preloading every weight downloads weights the page would have skipped [O]. Use WOFF2 only [R].

## Input and animation

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A task over 50 ms is a long task [R]; synchronous work over a whole data set in an input handler blocks the next frame [O] | Filtering or sorting a large list on every keystroke with no `useDeferredValue` or transition | The input's own state, which must stay urgent [R] |
| `scheduler.yield()` is in Chrome and Edge 129 and Firefox 142, not Safari [R] | `scheduler.yield()` with no feature check or fallback, in a product that supports Safari | |
| Reading layout after a style write in the same frame forces a synchronous layout [R] | `offsetHeight`, `getBoundingClientRect()` or `getComputedStyle()` read inside a loop that also writes styles | One deliberate read, as in a FLIP animation |
| `transform` and `opacity` animate without layout or paint [R]; animating a CSS variable is not hardware-accelerated, while Motion's `x`, `y` and `scale` are [R] | `@keyframes` or transitions on `top`, `left`, `width`, `height` or `box-shadow`; `transition: all` [O]; Motion animating a custom property | |
| A listener on `window`, `document` or `body` for `wheel`, `touchstart` or `touchmove` is passive by default [R] | A non-passive scroll or wheel listener on an element where nothing calls `preventDefault()` | A gesture that must cancel scrolling, with `{ passive: false }` |
| A list whose size the server does not bound renders every row [O] | `.map` over an unbounded collection with no virtualisation | The query bounds it (data) |

## Next.js and React caching

- `'use cache'` needs `cacheComponents: true` [R]; it cannot call `cookies()`, `headers()` or `searchParams` anywhere in its call stack [R]; `React.cache` is isolated inside a `'use cache'` boundary [R]; nesting a short-lived `'use cache'` inside one with no explicit `cacheLife` fails the build [R]; a cached layout does not cache its `children` [R].
- `React.cache` lasts one server request [R]; created inside a component body it never shares [R].
- With React Compiler on, new manual `useMemo`, `useCallback` and `memo` are noise [R]; without it, memoisation is for measured or obvious cost [R], and missing memoisation is never a finding here.

## Not a finding

- Missing memoisation; JavaScript micro-optimisations.
- A bundle size, timing or score you did not measure.
- Image format and `srcset` tuning.
- An `unload` listener or `no-store` on HTML as a server header (architect); an `unload` listener in client code is a finding here, since it blocks the back/forward cache [R].
- A blur radius: no vendor publishes a limit [R].
