# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| addyosmani/agent-skills `web-performance-auditor`, `performance-optimization`, `performance-checklist` | Read 2026-10-21 | MIT | Potential impact over measured numbers, the main image, render-blocking scripts, layout thrashing |
| vercel-labs/agent-skills `react-best-practices`; tech-leads-club `core-web-vitals`, `perf-web-optimization`; ziniman `web-performance`; github/awesome-copilot `performance-optimization` | Read 2026-10-21 | MIT | `use client` at a root, heavy imports in shared entries, dynamic imports, barrels, fonts, unbounded lists |
| web.dev; MDN; the WHATWG HTML standard; W3C CSS Fonts 4; developer.chrome.com; webpack, Rollup and Vite documentation; nextjs.org; react.dev; motion.dev | Checked live by the maintainer, 2026-10-22 (block I, read twice) | Vendor documentation and standards | Every fact marked [R] |

What is marked [O] is our own reasoning.

Left out, and why: every fixed budget and community figure (200 to 800 ms per barrel, 200 KB bundles, 100 items, 1,500 DOM nodes); memoisation rows (`react-craft`); server caching and `Cache-Control` (architect); a blur radius limit (none is published); TTFB bands (read in one reply only).
