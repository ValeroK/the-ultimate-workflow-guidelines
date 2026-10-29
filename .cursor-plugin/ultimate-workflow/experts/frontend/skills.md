# Skills: frontend

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

No build section, by decision (2026-10-22): the taste skills (`motion-craft`, `interface-design`) are offered at plan, where their advice shapes the work, and reach the implementer through the plan. The cap for this expert is 56 KB per stage, so all six review skills fit when one change matches them all; at review `experts.js` then keeps the first two in this order (the review cap, 2026-10-29). At review `rtl-and-direction` needs a direction signal in the added lines (`dir=`, `rtl`, `direction:`, `:dir(`, `<bdi`, `unicode-bidi`), not physical sides alone, by decision (2026-10-29): on an app with no RTL support, `ml-4` or `left-2` loaded it on nearly every diff. The cost: an RTL app's change that only adds physical sides no longer loads it.

## plan

- semantics-and-aria
- visual-accessibility
- ui-on-real-data
- responsive-and-devices
- rtl-and-direction
- motion-craft
- interface-design

## tests

- worst-case-data (files: *.tsx, *.jsx, *.vue, *.svelte, *.astro, *.component.html)
- responsive-and-devices (added: [Rr]esponsive|[Mm]obile|[Tt]ablet|\b[Pp]hones?\b|\b[Tt]ouch\b|[Vv]iewport|[Bb]reakpoint|\biOS\b|\bAndroid\b|\bSafari\b)
- rtl-and-direction (added: \bRTL\b|[Rr]ight-to-left|\bArabic\b|\bHebrew\b|\bPersian\b|\bUrdu\b|\bdir=)

## review

- semantics-and-aria (files: *.tsx, *.jsx, *.vue, *.svelte, *.html, *.astro)
- visual-accessibility (files: *.css, *.scss, *.sass, *.less, tailwind.config.*; added: outline(-[a-z]+)?:|outline-none|:focus|focus-visible|\bcolor:|background(-color)?:|opacity:|rgba\(|prefers-reduced-motion|prefers-contrast|forced-colors|user-scalable|maximum-scale|position:\s*(sticky|fixed)|class(Name)?="[^"]*\b(sticky|fixed)\b)
- ui-on-real-data (files: *.tsx, *.jsx, *.vue, *.svelte, *.astro, *.css, *.scss)
- responsive-and-devices (added: viewport|100vh|\bh-screen\b|[dsl]vh\b|safe-area-inset|\benv\(|:hover|\bhover:|@media\s*\((any-)?(hover|pointer)|touch-action|overscroll-behavior|user-select|inputmode|enterkeyhint|autocapitalize|pointerdown|pointermove|touchstart|touchmove|setPointerCapture|screen\.orientation|orientation:|innerWidth|tap-highlight|focus:outline|outline:\s*none)
- rtl-and-direction (added: \bdir=|\b[Rr][Tt][Ll]\b|\bdirection:\s*(rtl|ltr)|:dir\(|<bdi|unicode-bidi)
- motion (added: \btransition(-[a-z]+)?\s*:|\banimation(-[a-z]+)?\s*:|@keyframes|\.animate\(|transitionend|animationend|transitioncancel|<motion\.|motion/react|framer-motion|useSpring|@react-spring|\bgsap\b|AnimatePresence|class(Name)?="[^"]*\b(transition|animate-))
