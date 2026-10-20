# Extraction ledger: frontend and accessibility (planned expert, catalogue 13)

Playbook steps 2 (sweep), 4 (compare) and 4b (ledger) for the planned frontend and accessibility expert, 2026-10-20. Nothing here is shipped; the expert, its references and skills are built from this ledger after the maintainer's live check of section 4.

## 1. Sources

Sweep: the regular expression `frontend|ui|ux|react|vue|svelte|angular|next|css|tailwind|design-system|component|a11y|accessib|wcag|aria|screen-reader|keyboard|focus|contrast|i18n|l10n|rtl|vitals|lcp|inp|cls|playwright|storybook|web-perf|web-design|interface|figma` over `docs/skills-catalog-2026-10-20.json`: 52 agent names and 211 skill names across 30 repositories. Most are framework catalogues, migration commanders (`react18-*`, `react19-*`), Figma and image generators, or document-format accessibility (Word, PDF, ePub), which is not this expert's. The catalogue gives names only and the GitHub API was not open to this session, so files were fetched by their conventional paths from raw.githubusercontent.com; two tech-leads-club skills were not at those paths and were not read.

| # | Repository | Path | Licence | Verdict |
|---|---|---|---|---|
| S1 | Community-Access/accessibility-agents | `skills/aria-specialist`, `keyboard-navigator`, `contrast-master`, `kb-framework-accessibility`, `wcag-guide`, `kb-accessibility-rules` (each `SKILL.md`) | MIT | **Best community source.** Native-first ARIA, focus and trap rules, framework pitfalls per stack. `kb-accessibility-rules` is document formats (Word, PDF): not ours. One error: large text given as "18px", where WCAG defines 18 pt (section 4) |
| S2 | emilkowalski/skills | `skills/break-ui/SKILL.md` | MIT | **Strong and unusual.** Worst-case data and the CSS cause behind each visual break (flex `min-width: auto`, shrinking avatars, hard-coded plurals, initials from bytes). Checkable in code. Its "initial response" persona text is an instruction to an agent: noted, not followed |
| S3 | ibelick/ui-skills | `skills/fixing-accessibility`, `skills/baseline-ui` (each `SKILL.md`) | MIT | `fixing-accessibility`: a tight, prioritised rule list. `baseline-ui`: mostly house taste (Tailwind, no gradients, `motion/react`), rejected; a few items (no blocked paste, `h-dvh`, safe-area insets) kept as checks |
| S4 | affaan-m/ECC | `agents/a11y-architect.md`, `skills/frontend-a11y/SKILL.md`, `agents/react-reviewer.md`, `skills/design-system/SKILL.md` | MIT | `frontend-a11y` good on forms; `react-reviewer` mostly the developer's (hooks) and security's (XSS, secrets in bundles). `a11y-architect` mislabels focus visibility as "SC 2.4.11" and treats 44x44 as the 2.2 target size (section 4). Each file opens with a "Prompt Defense Baseline" addressed to an agent: noted, not followed |
| S5 | github/awesome-copilot | `agents/accessibility.agent.md`, `agents/accessibility-runtime-tester.agent.md` | MIT | Broad and correct in outline; the runtime tester is the clearest statement of what reading code cannot show (section 8) |
| S6 | addyosmani/agent-skills | `skills/frontend-ui-engineering/SKILL.md` | MIT | Required states (loading, empty, error), semantic tokens over raw values, "AI aesthetic" list (taste, rejected) |
| S7 | vercel-labs/agent-skills | `skills/web-design-guidelines/SKILL.md`, `skills/react-best-practices/SKILL.md` | not found (no LICENSE at the repository root; take ideas only) | `web-design-guidelines` only tells the agent to fetch a remote rule file at run time: not followed and not taken (our rule: no fetching from a skill). `react-best-practices` is performance (waterfalls, bundles, re-renders): routed to performance |
| S8 | ziniman/ai-instruct | `skills/web-accessibility/SKILL.md` | Apache-2.0 | Long and mostly sound; the rgba-text contrast warning is non-obvious. It titles 2.4.11 "Focus Appearance (AA)", which is wrong in WCAG 2.2 (section 4) |
| S9 | skills-il/localization | `hebrew-rtl-best-practices/SKILL.md` | MIT | **Strong** for RTL: logical properties, `row-reverse` double flip, negative `scrollLeft`, bidi isolation, which icons mirror |
| S10 | wshobson/agents | `plugins/ui-design/agents/accessibility-expert.md`, `design-system-architect.md`; `plugins/accessibility-compliance/skills/wcag-audit-patterns/SKILL.md` | MIT | Capability catalogues; nothing checkable kept |

Ten sources, 22 files in 10 repositories. Standards to confirm live (section 4): WCAG 2.2 and its Understanding pages, WAI-ARIA 1.2 and the APG, the HTML standard (`dialog`, `inert`), MDN, web.dev (Core Web Vitals), CSS Logical Properties, `eslint-plugin-jsx-a11y`.

## 2. Items, per source

Outcome: **taken** (into a proposed reference or skill), **routed** (owner), **rejected** (why), **missing** (worth taking, not stated by any source).

### S1 Community-Access/accessibility-agents

| Item | Outcome |
|---|---|
| Native HTML before ARIA; `<div role="button">` worse than `<button>` | taken (`semantics-and-aria`) |
| Redundant ARIA on elements with implicit roles (`<nav role="navigation">`, `<button role="button">`) | taken, low severity |
| Several `<nav>` need distinct `aria-label` | taken |
| Icon-only button needs an accessible name; decorative SVG `aria-hidden` | taken |
| Every input has a programmatic label; errors linked by `aria-describedby`; first error focused on submit | taken |
| `aria-controls` / `aria-labelledby` point to existing ids | taken |
| ARIA states (`aria-expanded`, `aria-selected`) updated with the state | taken |
| Landmark and `role="region"` overuse | taken, low |
| Modal traps focus and returns it; `<dialog>` with `showModal()` does it natively | taken (fact 7) |
| Custom widget that captures Tab with no Escape | taken |
| Skip link to `main` | taken, low (plan question for new layouts) |
| `inert` on content behind a modal | taken (fact 8) |
| Scrollable non-focusable region needs `tabindex="0"` | taken |
| `onClick` on `div` / `span` with no keyboard path | taken (also `jsx-a11y`; see "already caught") |
| Hover-only interaction; drag with no alternative | taken (fact 6) |
| Contrast 4.5:1 / 3:1, non-text 3:1, focus indicator contrast | taken (facts 1, 2) |
| "Large text is 18px or 14px bold" | rejected as stated: WCAG defines 18 pt and 14 pt bold (fact 2) |
| `outline: none` with no replacement | taken |
| `:focus-visible` over `:focus` | taken |
| Dark mode and `forced-colors` | taken, plan question |
| Python contrast script | rejected: tells the reader to run something |
| React: `key` on interactive lists and focus loss; portal with no focus containment; route change moves focus | taken (key: developer holds stable keys; the focus consequence is ours) |
| Vue: `v-if` on a live region breaks announcements, use `v-show` | taken (fact 10) |
| Angular: `[aria-label]` is not a binding, use `[attr.aria-label]` | taken (fact 11) |
| Angular `trackBy`, `LiveAnnouncer` on route change | taken |
| `target="_blank"` warning text for screen readers | taken, low |
| `dangerouslySetInnerHTML`, `v-html` with user content | routed: security (XSS); the accessibility of injected markup is ours only as "audit it" (rejected as not checkable) |
| Document-format rules (DOCX, PDF/UA, ePub) | rejected: not product UI code |
| The skills' own confidence scale and output schema | rejected: the protocol holds ours |

### S2 emilkowalski/skills `break-ui`

| Item | Outcome |
|---|---|
| Worst-case values must be plausible or schema-backed, never random | taken (tests reference) |
| Fixtures change, not the component | taken (tests) |
| Limits looked up in the schema, migration, API type or `maxLength`; front and back disagreeing is a finding | taken (review category) |
| Empty, one, many (huge) list states | taken (tests); "empty, one, many" for plain logic stays the core critics' |
| Flex child `min-width: auto` overflow; `min-width: 0` | taken (fact 15) |
| Fixed-size avatar or icon shrinking; `flex-shrink: 0` | taken |
| Unbreakable email or URL; `overflow-wrap: anywhere` | taken |
| `word-break: break-all` breaking words mid-heading | taken |
| Initials from `.split(' ')[0][0]` break on emoji and multi-part names; grapheme segmentation | taken (fact 16) |
| Hard-coded plurals ("1 members"); `Intl.PluralRules` | taken (fact 17) |
| Proportional figures jitter; `tabular-nums` | taken, low |
| Raw numbers rendered (`NaN`, float noise); `Intl.NumberFormat` | taken |
| Fixed-width button overflowing with a translated label | taken |
| Tight `line-height` with `overflow: hidden` clipping diacritics | taken |
| Broken image with no fallback | taken |
| Ellipsis with no way to read the full value | taken |
| Never truncate numbers, amounts or dates | taken |
| 1,000 unvirtualised rows | routed: performance |
| Escaping layer rendering raw `<b>` or `&amp;` | routed: security for `dangerouslySetInnerHTML`; double escaping is the developer's |
| Check at real container width, 320 px, 200 percent zoom, dark mode, RTL | taken (tests families; reflow fact 4) |
| The dev-only toggle and screenshot workflow | rejected: needs a browser and writes code; this expert reviews |
| Persona and "initial response" text | rejected (instruction to an agent) |

### S3 ibelick/ui-skills

| Item | Outcome |
|---|---|
| Accessible names, keyboard, focus and dialog rules (priority list) | taken (merged with S1) |
| `tabindex` greater than 0 | taken (also `jsx-a11y` `tabindex-no-positive`) |
| Escape closes dialogs and overlays | taken |
| Initial focus inside a dialog; restore to trigger on close | taken |
| Heading levels not skipped; lists and table headers | taken, low |
| `aria-invalid` on invalid fields; required announced; disabled submit explains why | taken |
| Toasts not the only carrier of critical information | taken |
| Use the project's existing primitives; do not mix primitive systems in one surface | taken (review: against the design system) |
| Never rebuild keyboard or focus behaviour by hand where a primitive exists | taken |
| `AlertDialog` for destructive actions | taken as "a destructive action has a confirmation the user can reach by keyboard" |
| Never block paste in inputs | taken (fact 13, WCAG 3.3.8) |
| `h-screen` versus `h-dvh`; `safe-area-inset` for fixed elements | taken, low (mobile viewports) |
| Animate only `transform` and `opacity` | routed: performance |
| Respect `prefers-reduced-motion` | taken (fact 12) |
| Tailwind defaults, `cn`, `motion/react`, no gradients, no purple, one accent per view, 200 ms limit | rejected: house taste |
| `useEffect` for render logic | routed: developer (`react-craft`) |

### S4 affaan-m/ECC

| Item | Outcome |
|---|---|
| Label `htmlFor` / `id` pairing; required with `required`; errors with `aria-describedby` and `aria-invalid`; `role="alert"` on errors | taken |
| Visual-only asterisk | taken, low |
| Target size 24x24 CSS px (2.5.8) | taken (fact 3) |
| "44x44 is the requirement" | rejected as stated: 44x44 is 2.5.5, AAA (fact 3) |
| "Focus indicators are high-contrast (SC 2.4.11)" | rejected as stated: 2.4.11 is Focus Not Obscured (fact 5) |
| Reflow to 400 percent | taken as fact 4 |
| Redundant entry 3.3.7 | taken (fact 13) |
| Accessibility decision records | rejected: heavier than a change needs |
| React reviewer: hooks rules, dependency arrays, derived state, stale closures | routed: developer (`react-craft`) |
| React reviewer: `dangerouslySetInnerHTML`, `javascript:` URLs, secrets in `NEXT_PUBLIC_*`, tokens in `localStorage`, server actions without auth | routed: security |
| React reviewer: server and client component boundary, `"use client"` propagation | routed: developer (`react-craft`); a large client bundle is performance's |
| React reviewer: `key={index}` attaching state to the wrong row | routed: developer (already in `react-craft`) |
| React reviewer: accessibility list (div onClick, labels, alt, ARIA misuse, heading order, colour alone) | taken (merged) |
| React reviewer: render performance, memo, Suspense placement, virtualisation | routed: performance |
| React reviewer: forms without `<form>`, missing `name` | taken (form semantics) |
| React reviewer: "component over 200 lines", "prop drilling beyond 3" | rejected: fixed thresholds |
| Design system: palette against raw hex values, spacing scale, component consistency | taken (review: design-system drift) |
| Design system: competitor research by browser, "AI slop" list | rejected |
| Prompt Defense Baseline text | rejected (instruction to an agent) |

### S5 github/awesome-copilot

| Item | Outcome |
|---|---|
| Accessibility acceptance criteria defined at plan | taken (plan question) |
| Programmatic name matches the visible label (2.5.3) | taken (fact 14) |
| `autocomplete` and input purpose (1.3.5) | taken (fact 14) |
| Focus not hidden by sticky UI (2.4.11) | taken (fact 5) |
| Dragging alternatives (2.5.7) | taken (fact 6) |
| Consistent help (3.2.6), accessible authentication (3.3.8) | taken (fact 13) |
| Route change announced and focus managed in an SPA | taken |
| Live region politeness | taken |
| Composite widgets follow APG keyboard patterns (menus, tabs, combobox) | taken (fact 9) |
| "Passing Lighthouse is not proof" | taken (Do not report: an automated score is not a finding, nor a pass) |
| Runtime testing with a browser | rejected for this expert's tools; stated as what reading code cannot show |
| Captions and audio description | taken as a plan question for media features only |

### S6 addyosmani/agent-skills

| Item | Outcome |
|---|---|
| Every data view has loading, empty and error states | taken (review category; plan question) |
| Semantic colour tokens instead of raw hex | taken (design-system drift) |
| Colour not the only indicator | taken (merged) |
| Realistic placeholder content, not lorem ipsum | taken (tests, with S2) |
| "AI aesthetic" defaults list | rejected: taste |
| Reference catalogue research before building | rejected |
| "Component over 200 lines", "3x harder later" | rejected: thresholds and unsourced figures |

### S7 vercel-labs/agent-skills

| Item | Outcome |
|---|---|
| `web-design-guidelines`: fetch remote rules at run time | rejected (instruction to fetch; our skills never fetch) |
| `react-best-practices`: waterfalls, barrel imports, dynamic imports, re-render rules | routed: performance |
| `server-auth-actions` | routed: security |
| `server-no-shared-module-state` | routed: developer (shared mutable state) |

### S8 ziniman/ai-instruct `web-accessibility`

| Item | Outcome |
|---|---|
| WCAG 2.2 new criteria list | taken (facts 3, 5, 6, 13) |
| "2.4.11 Focus Appearance (AA)" | rejected as stated (fact 5) |
| 4.1.1 Parsing removed in 2.2 | taken (fact 19): do not report parsing errors as 4.1.1 |
| Semi-transparent `rgba()` text has unpredictable contrast | taken (review: contrast that cannot be known from the token) |
| The same token passes on one background and fails on another | taken |
| 1.4.13 content on hover or focus: dismissible, hoverable, persistent | taken (fact 18) |
| Tailwind slate contrast table | rejected: values to be computed, not copied |
| Legal and compliance overview | routed: privacy (planned) for policy; rejected as a check |
| Testing steps (screen reader, zoom, text spacing) | taken (tests families) |

### S9 skills-il/localization `hebrew-rtl-best-practices`

| Item | Outcome |
|---|---|
| Physical properties (`margin-left`, `text-align: left`) do not flip; logical properties do | taken (fact 20) |
| `flex-direction: row` already reverses in RTL; adding `row-reverse` flips back | taken (fact 21) |
| `scrollLeft` is 0 at the start and negative toward the end in RTL | taken (fact 22) |
| Phone numbers, codes and URLs stay LTR inside RTL (`<bdo dir="ltr">`, `unicode-bidi: isolate`) | taken |
| Which icons mirror (back arrows) and which do not (play, clocks, logos) | taken |
| Portalled UI (modals, toasts) misses `dir` | taken |
| `dir="auto"` on user-entered fields | taken |
| Hebrew fonts, Israeli compliance | rejected: locale-specific, not general |

### S10 wshobson/agents

| Item | Outcome |
|---|---|
| Capability lists (WCAG levels, screen readers, token taxonomies, Style Dictionary) | rejected: no check |
| "Automate what you can: 30 to 50 percent detectable" | rejected: unsourced figure |
| Do not disable zoom (`user-scalable=no`, `maximum-scale=1`) | taken (fact 4) |

### Missing (no source states them; worth taking)

| Item | Outcome |
|---|---|
| A change that turns off a configured `eslint-plugin-jsx-a11y` rule, or drops the plugin, is a finding; a rule it enforces is not | missing, taken (fact 23) |
| `aria-hidden="true"` on a focusable element, or on an ancestor of one, leaves a focus stop with no name | missing, taken (fact 24) |
| A `placeholder` is not a label | missing, taken (fact 25) |
| A component that changes the design system's shared primitive for one caller | missing, taken (review: design-system drift); the module side is the software architect's |

## 3. Today's rows, value test

No skill or reference exists for this expert. Rows already held by siblings, which this expert must not repeat:

- `react-craft` (developer): hook rules and names, effects and cleanup, stable keys, derived state, error boundaries, Strict Mode, `jsx-no-leaked-render`, `no-unstable-nested-components`.
- `test-craft` (quality): the oracle and determinism of any test, UTF-16 lengths and RFC 2606 names in fixtures.
- security: XSS through `dangerouslySetInnerHTML`, `v-html`, `javascript:` URLs; secrets in client bundles; tokens in `localStorage`.

## 4. Facts that need the maintainer's live check

Each is one checkable sentence, with the primary page that should hold it.

WCAG 2.2 (w3.org/TR/WCAG22 and the Understanding pages):
1. 1.4.3 Contrast (Minimum), AA: 4.5:1 for text, 3:1 for large text; 1.4.11 Non-text Contrast, AA: 3:1 for UI component boundaries, states and meaningful graphics. (Understanding 1.4.3, 1.4.11)
2. Large text is at least 18 point, or 14 point bold, which the Understanding page equates to about 24 CSS px and 18.66 CSS px. (Understanding 1.4.3)
3. 2.5.8 Target Size (Minimum), AA, new in 2.2: 24 by 24 CSS px, with a spacing exception; 2.5.5 Target Size (Enhanced), 44 by 44, is AAA. (Understanding 2.5.8, 2.5.5)
4. 1.4.10 Reflow, AA: content works at 320 CSS px width without two-dimensional scrolling, the equivalent of 400 percent zoom at 1280 px; 1.4.4 Resize Text requires 200 percent. (Understanding 1.4.10, 1.4.4)
5. 2.4.11 Focus Not Obscured (Minimum) is AA; 2.4.13 Focus Appearance is AAA; a sticky header or footer that covers the focused element fails 2.4.11. (Understanding 2.4.11, 2.4.13)
6. 2.5.7 Dragging Movements, AA: any dragging action has a single-pointer alternative. (Understanding 2.5.7)
7. A `<dialog>` opened with `showModal()` makes the rest of the document inert and moves focus into the dialog; one opened with `show()` or the `open` attribute does not. (HTML standard, the dialog element; MDN `HTMLDialogElement.showModal`)
8. The `inert` attribute makes a subtree unfocusable and hidden from the accessibility tree. (HTML standard, inert; MDN)
9. The WAI-ARIA Authoring Practices give the keyboard pattern for tabs (arrow keys between tabs, Tab into the panel), menus and comboboxes. (w3.org/WAI/ARIA/apg/patterns)
10. A live region must be in the DOM before its content changes for the change to be announced reliably. (MDN ARIA live regions)
11. In Angular, ARIA attributes are bound with `[attr.aria-label]`; `[aria-label]` binds a property that does not exist on most elements. (angular.dev accessibility guide)
12. `prefers-reduced-motion` reports the user's request to minimise non-essential motion; 2.3.3 Animation from Interactions is AAA. (MDN; Understanding 2.3.3)
13. 3.3.7 Redundant Entry (A), 3.3.8 Accessible Authentication (Minimum) (AA, so pasting into a password or code field must not be blocked), and 3.2.6 Consistent Help (A) are new in 2.2. (Understanding 3.3.7, 3.3.8, 3.2.6)
14. 2.5.3 Label in Name (A): the accessible name contains the visible label text; 1.3.5 Identify Input Purpose (AA) uses the HTML `autocomplete` tokens. (Understanding 2.5.3, 1.3.5)
15. A flex item's automatic minimum size is `min-width: auto`, so it will not shrink below its content without `min-width: 0` or `overflow` other than visible. (CSS Flexbox, automatic minimum size; MDN)
16. `Intl.Segmenter` with `granularity: "grapheme"` splits user-perceived characters, so emoji and combined characters are not cut. (MDN `Intl.Segmenter`)
17. `Intl.PluralRules` gives the plural category per locale, and languages have more than two categories (Arabic has six). (MDN `Intl.PluralRules`; CLDR plural rules)
18. 1.4.13 Content on Hover or Focus (AA): additional content is dismissible without moving focus, hoverable, and persistent until dismissed. (Understanding 1.4.13)
19. 4.1.1 Parsing is obsolete and removed in WCAG 2.2. (WCAG 2.2, 4.1.1 note)
20. CSS logical properties (`margin-inline-start`, `text-align: start`) follow the writing direction; physical ones (`margin-left`, `text-align: left`) do not. (CSS Logical Properties; MDN)
21. In an RTL context, `flex-direction: row` already runs right to left, so `row-reverse` runs left to right. (CSS Flexbox; MDN `flex-direction`)
22. In an RTL scroll container, `scrollLeft` is 0 at the start and negative toward the end in current browsers. (CSSOM View, `scrollLeft`; MDN)
23. The rules in `eslint-plugin-jsx-a11y`'s recommended config, by name (for example `alt-text`, `click-events-have-key-events`, `no-static-element-interactions`, `label-has-associated-control`, `tabindex-no-positive`, `no-autofocus`). (github.com/jsx-eslint/eslint-plugin-jsx-a11y)
24. `aria-hidden="true"` must not be used on focusable elements or their ancestors. (WAI-ARIA 1.2, `aria-hidden`; ARIA in HTML)
25. A `placeholder` attribute is not a substitute for a label. (HTML standard, the placeholder attribute; WAI forms tutorial)

## 5. Proposed reference content

**Agent file, Goal (draft).**
- Prevents: a UI change that someone cannot use with a keyboard, a screen reader, zoom or a different language direction, or that breaks on real data and drifts from the design system.
- Done well: every finding names the element or style, the user or data that hits it (a keyboard user, a long email, RTL, 320 px), and what fails, with file and line.
- Not the goal: visual taste, pixel-perfect matching of a design, component state and effects (developer), XSS (security), render performance (performance, planned).

**How to judge (draft).** Native semantics first: a finding about ARIA names the native element that would have made it unnecessary. Judge what the code makes impossible (no keyboard path, no name, a focus trap with no exit), not what a screenshot would show; say what only a browser could confirm. Follow the repository's design system and component primitives before any guideline.

**`plan.md`, questions (draft).**
- **Interaction model.** For each new interactive element: the native element or the primitive it builds on, its keyboard path, and where focus goes when it opens and closes.
- **States.** Loading, empty, error, and success for every data view; what a screen reader hears when each appears.
- **Data limits.** The longest realistic value per field, from the schema, and how the UI handles it (wrap, truncate with a way to read it, never truncate amounts).
- **Direction and language.** Whether the product supports RTL or other locales, so logical properties and `Intl` are a constraint, not an afterthought.
- **The design system.** Which primitives and tokens the change uses; a new one is a question for the user.
- **Conformance target.** WCAG 2.2 AA unless the user says otherwise; a criterion the plan cannot meet is a question for the user.
- One-way choice: a component library or design system, named with the alternatives.
- Good constraint: "The share dialog uses `<dialog>` with `showModal()`, returns focus to the Share button on close, and closes on Escape." Rejected: "Make it accessible" (not checkable).

**`tests.md`, families (draft).** Keyboard-only path through each new flow (Tab order, Escape, return of focus); the accessible name and state of each new control as an assertion on the accessibility tree (role and name queries, not class names); worst-case data per field from the schema (S2: long, short, missing, one, many); RTL and 320 px for layouts that support them; reduced motion; a live region announcing an async result. The oracle and determinism of each case are quality's.
Worked case: name "share dialog returns focus", asserts: open with Enter on the Share button, press Escape; the dialog is closed and `document.activeElement` is the Share button; why: a dialog that closes without restoring focus drops keyboard users at the top of the page, and every mouse-only test passes.

**`review.md`, categories (draft, each with its "Not when").**
- **No keyboard path.** A click handler on a non-interactive element with no key handler and role; hover-only menus; drag with no alternative. Not when the element is a native control or the repository's primitive provides the behaviour.
- **No accessible name or wrong role.** An icon-only button with no name; an input with only a placeholder; `aria-labelledby` pointing at a missing id; a role with its required states missing. Not when the enabled `jsx-a11y` rule already enforces it.
- **Focus lost or trapped.** A modal with no containment or no return of focus; a custom widget that captures Tab with no Escape; route changes that leave focus on a removed element; `aria-hidden` on a focusable ancestor. Not when `<dialog>` with `showModal()` or the primitive handles it.
- **Focus invisible.** `outline: none` with no replacement, or a sticky element covering the focused control. Not when a `:focus-visible` style replaces it.
- **State nobody hears.** An async result, error or toast with no live region, or a live region created at the same moment as its content. Not when focus moves to the result.
- **Contrast that cannot hold.** Text colour below the ratio on the background it sits on, semi-transparent text whose contrast depends on what is behind it, focus or border colours below 3:1. Not when the token is the design system's and its contrast is documented for that background.
- **Breaks on real data.** A flex text column with no `min-width: 0`, a fixed-size box that shrinks, a fixed-width label, an unbreakable string with no wrap, truncation with no way to read the value, truncated amounts, initials or lengths from code units, hard-coded plurals, front-end limits below the back end's. Not when the field's schema bounds it below the breaking length.
- **Direction-blind.** Physical properties or `left` alignment in a product that supports RTL, `row-reverse` added for RTL, `scrollLeft` assumed positive, numbers and URLs without isolation, directional icons not mirrored. Not when the product is LTR-only by decision.
- **Missing states.** A data view with no loading, empty or error state. Not when the parent renders them.
- **Design-system drift.** Raw colour or spacing values where tokens exist, a second primitive system in one surface, a shared primitive changed for one caller. Not when the plan introduces the token or primitive.
- **Zoom or reflow blocked.** `user-scalable=no` or `maximum-scale=1`, fixed heights that clip text at 200 percent, layouts that need horizontal scrolling at 320 px. Not when the component is a canvas or map whose content requires two dimensions.

**Severity here (draft).** High: a user group cannot complete the task (no keyboard path, no name on a required control, a focus trap, a blocked paste on authentication). Medium: the task is possible but confusing or lossy (lost focus, unannounced errors, truncated values with no way to read them, RTL breakage in a supported locale). Low: polish with a cheap fix (redundant ARIA, a heading skip, tabular figures).

**Worked pair (draft; not from any eval corpus case).** Finding: `components/ShareDialog.tsx:14` renders a `div` with `role="dialog"` and no focus handling, and `ShareButton.tsx:9` opens it on click; a keyboard user who opens it keeps focus on the page behind, can Tab past the dialog and never reaches its Copy link button, and Escape does nothing. Category: focus lost or trapped; severity high. Fix: render it with `<dialog>` and `showModal()`, close on Escape, and return focus to the Share button. Dropped: `styles/buttons.css:22` sets `outline: none`; line 23 adds a `:focus-visible` outline in the brand colour, documented at 3.2:1 against the button, so focus stays visible.

## 6. Responsibilities: draft rubric rows

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Semantics and keyboard | native elements against ARIA, roles, names and states, keyboard paths, focus order, traps and return | component state, effects and hooks (developer, `react-craft`) | a button with no name or no key path is the frontend expert's; an effect that runs twice is the developer's |
| Focus and announcements | dialogs, route changes, live regions, focus visibility | none | an async result with no announcement is the frontend expert's |
| Visual accessibility | contrast of text, controls and focus, colour alone, reduced motion, zoom and reflow | none | a token's contrast against the background it is used on is the frontend expert's |
| Layout on real data | wrapping, truncation, overflow, plurals, number and date formatting, fixed sizes | the fixture's oracle and determinism (quality) | which worst-case values to test is the frontend expert's; whether the test can fail is the quality engineer's |
| Direction and locale in UI | logical properties, bidi isolation, mirrored icons, `Intl` in rendering | translation workflow and copy (not a finding) | a layout that breaks in RTL is the frontend expert's |
| Design system use | tokens and primitives used, drift, a second primitive system | module boundaries of a shared UI package (softarch) | a component bypassing the design system's button is the frontend expert's; a package importing another's internals is the software architect's |
| UI states | loading, empty, error and success states, destructive confirmations | API error shapes (softarch) | a missing error state is the frontend expert's; the error contract is the software architect's |
| Rendering safety | none | XSS through unsafe sinks, secrets in client bundles (security) | an unescaped user string in `dangerouslySetInnerHTML` is security's |
| Rendering performance | web vitals and bundle size until a performance expert exists (decision below) | none yet | see the border conflict below |

**Border conflicts found.**
- **The developer's table** routes "rendering performance, accessibility, bundle size" to "frontend, planned", while the catalogue's planned performance expert (12) owns web vitals. Proposal: accessibility and UI correctness here; web vitals and bundle size go to performance if it is built, and to this expert if the maintainer folds performance into skills (the maintainer was asked).
- **Quality's table** routes "selectors, rendering and accessibility" of UI tests here. That matches: this expert names the cases and the accessible queries; quality owns the oracle.
- **Security** owns XSS; `break-ui`'s "wrong escaping layer" row is split (unsafe sink: security; double escaping: developer).

## 7. Proposed skills, with selectors and the value test

| Skill | Holds | Review selector (draft) | Value test |
|---|---|---|---|
| `semantics-and-aria` | native-first rules, names, roles and states, dialogs and `inert`, live regions, APG keyboard patterns, framework pitfalls (React portals and route focus, Vue live regions, Angular `attr.` binding), what `jsx-a11y` already catches | `files: *.tsx, *.jsx, *.vue, *.svelte, *.html, *.component.html, *.astro` | passes: version and framework specific, checkable, the linter's coverage stated so it is not repeated |
| `visual-accessibility` | contrast ratios and large-text sizes, non-text contrast, focus visibility and obscuring, target size, reflow and zoom, reduced motion, hover content | `files: *.css, *.scss, *.less, tailwind.config.*; added: outline|:focus|color:|background|opacity|rgba\(|prefers-reduced-motion|user-scalable|maximum-scale` | passes once facts 1 to 5, 12, 18 are confirmed; the 18 pt / 44 px errors in the sources show a strong reviewer gets these wrong |
| `ui-on-real-data` | the CSS causes of breaks on long, short and missing values, truncation rules, `Intl` for plurals, numbers and graphemes, schema limits against the UI | `files: *.tsx, *.jsx, *.vue, *.svelte, *.css, *.scss` | passes: non-obvious CSS causes, checkable; overlaps `test-craft` only on UTF-16 lengths (keep that row in `test-craft`) |
| `rtl-and-direction` | logical properties, `row-reverse`, `scrollLeft`, bidi isolation, which icons mirror, portals and `dir` | `added: dir=|rtl|margin-left|margin-right|padding-left|padding-right|text-align: (left|right)|row-reverse|scrollLeft` | passes, but only for products that support RTL: its target section must say so first |

Rejected: a design-taste skill (no gradients, one accent colour, animation durations), a design-token taxonomy skill, a Figma skill, a document-format accessibility skill, a framework-migration skill.

## Verdict: does this domain need an expert?

**Yes.** It sets requirements a plain lens cannot at plan time (the interaction model and focus path of each new widget, the states, the data limits, direction support), it adds test cases the draft tests miss (keyboard-only paths, worst-case data, RTL), and its review has a large "not when" surface a checklist must prune (native elements and primitives that already do the work, enabled lint rules). Accessibility defects are invisible to the plain reviewer's usual "does it work" reading.

**Tools: reading code is enough for review and plan; a browser is not needed to build it.** The categories above are visible in markup, styles and component code. What only a browser shows (actual contrast over images and gradients, a sticky header covering focus at a given scroll, screen-reader output, layout at a width) the expert states as "what I could not check" and turns into a tests-stage case. A browser for screenshots would widen the tools and needs the threat discussion in `docs/adding-an-expert.md`; it should be a later, measured addition, not a starting requirement. Web search would help confirm a criterion's wording, under the same decision as the other experts.
