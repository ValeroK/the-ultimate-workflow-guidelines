---
name: responsive-and-devices
description: Use when a change touches layout, viewport, input fields, hover or touch handling, drag gestures or breakpoints in a web UI, to find what breaks on another device - a phone, a tablet in split screen, a touch laptop, a desktop with a mouse - the viewport and its browser bars, safe areas, the software keyboard, touch against pointer input, orientation, and focus rings.
verified: 2026-10-22
---

# Responsive web across devices

## Goal

- **Lets the expert catch:** web UI that works in a desktop browser and fails on another device: a layout sized to the wrong viewport, content under a notch or a keyboard, a page that zooms into an input, hover states that stick or hide the only way to an action, gestures that fight the page scroll or lose the pointer, a layout locked to one orientation or to a device class, and focus rings removed for everyone to hide them from mouse users.
- **Applies to:** the viewport `<meta>`, global and layout styles, `vh` and `env()` values, `:hover` and `@media (hover|pointer)`, `touch-action`, `overscroll-behavior`, `user-select`, input attributes (`type`, `inputmode`, `enterkeyhint`), pointer and touch handlers, breakpoints and orientation logic.
- **Not for:** contrast, reflow at 320 px and text resizing in general (`visual-accessibility`); a keyboard path for hover menus and a single-pointer alternative to dragging (the review reference's keyboard category); whether a layout breaks on long values (`ui-on-real-data`); passive listeners as a frame-rate matter (developer, `web-performance`); React Native and native apps (a mobile expert, not built).

Sources: **[R]** the maintainer's live check of WCAG 2.2, MDN and web.dev, blocks G and I (2026-10-22); **[T]** Emil Kowalski's `mobile-native` skill and the device rows of his other skills (MIT, commit 2d22863), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The devices and browsers the product supports**, from a support matrix, `browserslist`, or the plan. A desktop-only internal tool by decision drops the touch rows.
- **The viewport `<meta>`** in the root layout (Next.js `viewport` export), and whether the app is a scrolling document or an app shell with its own scroll containers.
- **The CSS framework's hover behaviour**: whether its `hover:` variant is already wrapped in a hover media query [T].
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Viewport, safe areas and zoom

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| On mobile browsers `100vh` is the large viewport, measured with the browser bars hidden, so a full-height shell overflows and a bottom-pinned control sits under the bar; `dvh` tracks the visible area and `svh` is the smallest [T] | `height: 100vh` (`h-screen`) on an app shell, sheet or anything pinned to the bottom | A `100vh` fallback line followed by a `dvh` or `svh` value |
| `dvh` changes as the bars show and hide, so a tall hero or first screen on a scrolling page resizes mid-scroll [T] | `100dvh` on marketing or document content | App shells, where tracking the visible area is the point |
| `env(safe-area-inset-*)` is zero unless the viewport `<meta>` has `viewport-fit=cover`; with it, fixed chrome that does not pad by the insets sits under the notch or the home indicator [T] | Insets used with no `viewport-fit=cover`; or `viewport-fit=cover` added while fixed headers, tab bars, toasts or sheets have no inset padding | Elements that are not fixed to an edge |
| Disabling zoom fails users who enlarge text (1.4.4 Resize Text, AA, 200 percent) [R] 2026-10-22 | `user-scalable=no` or `maximum-scale=1` in the viewport `<meta>` | |
| `text-size-adjust: none` can stop text zooming in some browsers; use `100%` to stop landscape inflation [O] | `-webkit-text-size-adjust: none` | `100%` |
| On iOS Safari, focusing an input whose font size is below 16 px zooms the page and does not zoom back; disabling zoom is the wrong fix [T] | `font-size` below `16px` (or `1rem` at a 16 px root) on `input`, `select`, `textarea` reachable on touch | The small size applies only under `(pointer: fine)` |

## The software keyboard

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A bottom-pinned input or action can be covered by the keyboard: by default Android Chrome resizes only the visual viewport, so layout-viewport units and fixed elements do not move [T] [O] | A composer or submit bar `position: fixed; bottom: 0` with no `interactive-widget=resizes-content`, no `visualViewport` handling and no VirtualKeyboard API use | The input is in normal flow and scrolls into view |
| The keyboard shown must fit the field: codes and amounts get `inputmode="numeric"` or `"decimal"`, emails and phones their `type`, usernames and codes `autocapitalize="none"` [T] | A one-time code, PIN, amount or email field rendered as a bare `type="text"` | Free text |

## Touch and pointer input

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| On touch, a tap applies `:hover` and it stays until the user taps elsewhere, so hover-only styling sticks; gate hover styles behind `@media (hover: hover) and (pointer: fine)` [T] | A new `:hover` rule that moves, scales, reveals or recolours, outside a hover media query | The framework's `hover:` variant is already wrapped [T]; colour-only hover in a desktop-only product |
| An action reachable only on hover cannot be reached on touch [T] | A `...` menu, delete button or tooltip shown only by `:hover` or `onMouseEnter`, with no tap or focus path | The same action is reachable another way on touch |
| Touch and mouse are not exclusive: deciding "touch" from the user agent or the window width misclassifies tablets with trackpads and touch laptops; the `any-hover` and `any-pointer` media features describe every input [T] | `'ontouchstart' in window`, a user-agent test or `innerWidth < 768` used to switch hover behaviour or hit sizes | Layout breakpoints, which are about width, not input |
| Target size: at least 24 by 24 CSS px, or enough spacing (2.5.8, AA); 44 by 44 is the AAA criterion; 2.5.8 does not depend on zoom [R] 2026-10-22 | A new icon button, close control or inline action below 24 px with neighbours closer than the spacing exception allows | Inline links in text, and sizes set by the user agent |
| Removing the tap highlight removes the only press feedback a control had [T] | `-webkit-tap-highlight-color: transparent` added with no `:active` state on tappable elements | Controls that already style `:active` |
| A gesture surface must say which axes it owns, or the page scrolls while the user drags; `touch-action: none` on something the user must scroll past traps the scroll [T] | A carousel, slider or drag-to-dismiss sheet with no `touch-action`; `touch-action: none` on a large or full-page element | Native scrolling with `scroll-snap`, which needs no `touch-action` |
| A drag that does not capture the pointer stops when the pointer leaves the element; a second finger during a drag makes the element jump [T] | `pointerdown`/`pointermove` drag code with no `setPointerCapture`, or that does not ignore pointers after the first | A gesture library that handles both |
| A `touchmove` listener on `window`, `document` or `body` is passive by default, so its `preventDefault()` does nothing; use `overscroll-behavior` to stop scroll chaining [R] 2026-10-22 | `addEventListener('touchmove', e => e.preventDefault())` to stop pull-to-refresh or background scroll | `{ passive: false }` on a small element that owns the gesture |
| An inner scroll area (sheet, chat, sidebar) chains its scroll to the page at its end unless it has `overscroll-behavior: contain` [T] | A modal or sheet with its own `overflow-y: auto` and no `overscroll-behavior` | The page behind does not scroll |
| `user-select: none` on content stops users copying addresses, errors and order numbers [T] | `user-select: none` on `body`, a layout root, or text content | Buttons, tabs, chips and drag handles |
| Vibration is not available in every browser, so it can never be the only feedback [O] | `navigator.vibrate` as the sole signal of success or error | |

## Orientation and window sizes

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Content restricted to one orientation fails 1.3.4 Orientation (AA) [O] | A "rotate your device" overlay, a landscape layout rotated back with `transform`, or `screen.orientation.lock()` relied on | The orientation is essential (a piano keyboard, a cheque scan) |
| A tablet in split screen or a slide-over window gives a phone-width viewport on a large device; layouts chosen by device class or by the `orientation` media feature break there [O] | Breakpoints keyed to device names, `orientation: landscape` used as "tablet", or a minimum width the layout assumes | Breakpoints on available width or container queries |
| A landscape phone has little height: a fixed header, a fixed bottom bar and the keyboard together can leave no room for content [O] | Two fixed bars plus a fixed-height panel with no `max-height` or short-height media query | |

## Desktop pointer and keyboard focus

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Removing focus outlines to hide them from mouse users removes them for keyboard users too; `:focus-visible` shows the ring for keyboard focus and not for a mouse click on a button [T] [O] | `:focus { outline: none }` (`focus:outline-none`) with no `:focus-visible` style | A `:focus-visible` style replaces it |

## Cases for the tests stage

What only a device shows becomes a test case, not a finding: a tap on each hover-styled control on a touch device (nothing stays stuck); the keyboard open with a bottom-pinned input; landscape on a phone; a split-screen width on a tablet; input focus on iOS Safari (no zoom); a drag that leaves the element; the page at 200 percent zoom.

## Not a finding

- `user-select: none` on controls, or `touch-action: manipulation` on buttons.
- Hover effects in a product that is desktop-only by decision.
- `100vh` immediately followed by a `dvh` or `svh` declaration.
- A missing `theme-color`, tap-highlight or status-bar tweak: polish (build guidance), not a break.
- What device emulation in a desktop browser shows or hides: neither proves nor clears these rows.
