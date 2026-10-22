---
name: visual-accessibility
description: Use when a change touches colours, focus styles, opacity, sticky or fixed elements, sizes of controls, zoom, reflow, hover or focus popups, or reduced-motion handling in web UI, to find what a low-vision, zoom or motion-sensitive user cannot perceive - contrast of text, controls and focus, focus hidden behind sticky content, target size, reflow at 320 px, text resizing, content on hover or focus, colour as the only signal, and reduced motion.
verified: 2026-10-22
---

# Visual accessibility

## Goal

- **Lets the expert catch:** text, controls or focus rings below the contrast they need, contrast that cannot be known because it depends on what is behind, focus that disappears or hides behind sticky content, controls too small to hit, layouts that break when enlarged, popups that vanish before they can be read, and meaning carried by colour alone.
- **Applies to:** stylesheets and utility classes (`.css`, `.scss`, `.less`, Tailwind classes and config, CSS-in-JS), design tokens, and components that set colour, opacity, outlines, position or size.
- **Not for:** names, roles and keyboard paths (`semantics-and-aria`); device viewports, touch and the software keyboard (`responsive-and-devices`); motion that breaks state (`motion`); visual taste (never a finding).

Sources: **[R]** the maintainer's live check of WCAG 2.2 and its Understanding pages and MDN, block G (2026-10-22); **[T]** Community-Access/accessibility-agents, ziniman/ai-instruct `web-accessibility`, affaan-m/ECC and addyosmani/agent-skills (MIT), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own. The conformance target is WCAG 2.2 AA unless the plan says otherwise; an AAA criterion is never a finding at AA.

## First, establish the target

- **The design tokens and the backgrounds each is documented for**: a token's contrast holds only on the background it was measured against [T].
- **Whether the product has dark mode, high-contrast or `forced-colors` support**, which multiplies the backgrounds to check [T].
- **What you cannot see**: contrast over images and gradients, what scrolls under a sticky bar, the rendered size at a given width. Name these as tests-stage cases, not findings.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Contrast

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Text contrast is at least 4.5:1, large text 3:1 (1.4.3, AA); large is 18 pt or 14 pt bold, about 24 px and 18.5 px [R] | A text colour or background change whose pair falls below the ratio for its size, computed from the values in the diff | Inactive (disabled) controls and decorative content [R] |
| Component boundaries, states and graphics needed to understand them are at least 3:1 against what is next to them (1.4.11, AA) [R] | An input border, checkbox outline, toggle state or focus ring colour below 3:1 against its background | A control whose boundary is not needed to identify it, such as a text link [O] |
| Semi-transparent text or controls have contrast that depends on what is behind them, so it cannot be known from the token [T] | `rgba()`, `opacity` or a `/50` utility on text, borders or icons over varied content | The background behind is a fixed, known colour |
| The same token passes on one background and fails on another [T] | A text token reused on a new surface colour, or a light-theme token used unchanged in dark mode | |
| Colour is not the only way a state or meaning is shown [T] | Required, error or selected state shown only by a colour change; a chart series told apart only by hue | An icon, text or pattern also carries it |

## Focus

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A keyboard focus indicator must stay visible; removing it with no replacement leaves keyboard users lost [T] | `outline: none` or `focus:outline-none` with no `:focus-visible` style | A `:focus-visible` style replaces it |
| Focus Not Obscured (2.4.11, AA) fails only when the focused control is entirely hidden by author content, such as a sticky header or a cookie bar; a partly covered control passes [R] | A new sticky or fixed bar with no `scroll-padding` or `scroll-margin` for it, on a page with focusable content below | The bar is dismissible, or the focused control can never scroll under it |
| A semi-transparent sticky bar can pass 2.4.11 and still fail 1.4.11 for the focus ring it covers [R] | Translucent sticky chrome over focusable content | |
| Focus Appearance (2.4.13) is AAA: its size and contrast rules are not findings at AA [R] | | |

## Size, zoom and reflow

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Targets are at least 24 by 24 CSS px, or spaced under the criterion's spacing exception (2.5.8, AA); 44 by 44 is AAA (2.5.5) [R] | A new icon button or close control below 24 px with close neighbours | Inline links in text; the size is set by the user agent |
| Content reflows at 320 CSS px wide (1,280 px at 400 percent) without scrolling in two directions (1.4.10, AA) [R] | A fixed `min-width` or `width` above 320 px on a page container; a layout that needs horizontal scrolling | Content that needs two dimensions to be used [R], such as maps, data tables and diagrams [O] |
| Text resizes to 200 percent without loss (1.4.4, AA) [R] | Fixed `height` with `overflow: hidden` on text containers; text sized in `px` inside a container sized in `px` that clips | Captions and images of text [R] |

## Content on hover or focus

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Content that appears on hover or focus can be dismissed without moving the pointer or focus, can itself be hovered, and stays until dismissed (1.4.13, AA) [R] | A tooltip or popover with no Escape, that closes when the pointer moves onto it, or that hides on a timer | The browser's native `title` tooltip [R] |

## Motion and preferences

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `prefers-reduced-motion` reports the user's request for less motion; 2.3.3 Animation from Interactions is AAA [R], so a missing branch is low severity at AA, unless the motion is large, parallax or full-screen [O] | A new large or parallax movement with no reduced-motion branch | The repository's global reduced-motion reset covers it |
| A theme that hard-codes colours breaks under `forced-colors`: borders and focus rings drawn only with `box-shadow` or background colour vanish [T] | A focus ring made only of `box-shadow`, or a control boundary made only of background colour, in a product that supports Windows high contrast | `outline` with a transparent colour kept as the forced-colours fallback |

## Not a finding

- A contrast ratio you estimated without both colours: name it as a test case.
- An AAA criterion (2.4.13, 2.5.5, 2.3.3) at an AA target, beyond the low-severity note above.
- Disabled controls below 4.5:1.
- A design-system token whose contrast is documented for the background it is used on.
- Visual taste: a colour you would not have chosen.
