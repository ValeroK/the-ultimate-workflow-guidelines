---
name: interface-design
description: Use when a plan or build designs or restyles web interface - feedback and confirmation, navigation and labels, translucent surfaces and depth, typography, component-library and toast choices, and the platform polish that makes a web app feel native - following Emil Kowalski's design-engineering judgement and the Apple design talks he distils. Guidance for plan and build; never a review finding.
verified: 2026-10-22
---

# Interface design

## Goal

- **Lets the expert catch:** at plan, an interaction that confirms every action instead of offering undo, validates only on submit, labels navigation vaguely or places a control far from what it changes, and a hand-built component where a maintained primitive exists; at build, translucent chrome that loses legibility, type set with one letter-spacing for every size, and a toast or theme setup that ignores the product's dark mode.
- **Applies to:** plans that add screens, navigation, forms, overlays, toasts or a component library; at build, the styles and components that implement them.
- **Not for:** motion (`motion-craft`, `motion`); contrast ratios and focus visibility as accessibility (`visual-accessibility`); semantics and keyboard paths (`semantics-and-aria`); a new dependency's supply chain (developer, `dependency-discipline`); state libraries (developer).

Everything here is taste: Emil Kowalski's judgement in `emil-design-eng`, `apple-design` (his reading of Apple's WWDC design talks), `pick-ui-library`, `ask-sonner` and `mobile-native` (MIT, commit 2d22863). Rows are **[T]**, attributed, unchecked. At plan, state a row as a recommendation the user may decline; at build, follow it unless the design system or the plan says otherwise. Never report a departure from it as a finding.

## First, establish the target

- **The design system**: its tokens, primitives, type scale and theme mechanism. It wins over every row below.
- **The libraries already installed** (`package.json`): an installed choice is kept; replacing it is a plan question, not a build decision [T].
- **Whether the product has dark mode and right-to-left locales**, which several build rows depend on.

## Interaction foundations (plan)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Offer undo for slips; keep confirmation dialogs for destructive, irreversible actions, because confirming everything trains users to click through [T] Apple via Emil Kowalski | Delete, archive, send flows | Irreversible actions with no undo path |
| Feedback comes as status, completion, warning and error: show ongoing status, confirm meaningful actions, warn before a problem, validate inline rather than only on submit [T] Apple via Emil Kowalski | Forms, long operations | |
| Every screen answers where am I, where can I go, and how do I get out; no dead ends [T] Apple via Emil Kowalski | New screens, flows, modals | |
| Put a control next to what it affects and arrange controls to mirror what they change; a control that needs a label to explain it is mapped weakly [T] Apple via Emil Kowalski | Toolbars, settings, forms | |
| Name navigation by its contents ("Invoices", "Library"), not a generic umbrella ("Home", "Misc") [T] Apple via Emil Kowalski | Navigation labels | |
| Show the common path first and advanced options one level deeper; things that look alike behave alike and live in the same place [T] Apple via Emil Kowalski | Settings, menus | |

## Components and libraries (plan, then build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Build dialogs, popovers, menus, selects and comboboxes on the repository's headless accessible primitives (Emil Kowalski's pick: Base UI) rather than a `div` with hand-written focus handling [T] | New overlays and menus | The primitive does not exist for the pattern |
| Emil Kowalski's picks when nothing is installed: `cmdk` for command palettes, Sonner for toasts, `input-otp` for one-time codes, NumberFlow for animated numbers, dnd kit for drag and drop, recharts for charts, `next-themes` for theme switching without a flash on load, `clsx` and `cva` for class names [T] | A plan that adds one of these patterns | The repository already uses another library for it |
| Toast timers pause while the tab is hidden, so a message is not missed [T] Emil Kowalski | Hand-built or configured toasts | |

## Sonner, when the repository uses it (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Mount one `<Toaster />` at the root; a second (layout and page) duplicates every toast [T] Emil Kowalski | `<Toaster` in layouts and pages | |
| `theme` defaults to light and does not follow the OS; pass `"system"` or the resolved theme in a product with dark mode [T] Emil Kowalski | `<Toaster` with no `theme` | Light-only products |
| `dir` defaults to `ltr`; pass the document direction in a right-to-left product [T] Emil Kowalski | `<Toaster` with no `dir` | |
| Classes on toast parts lose to Sonner's own styles unless marked important; a design-system toast is cleaner as `toast.custom()` wrapped in the project's own function [T] Emil Kowalski | `toastOptions.classNames` | `unstyled` toasts |
| A Toaster inside a transformed, filtered or clipped ancestor renders behind overlays; mount it at the document root [T] Emil Kowalski | `<Toaster` inside a dialog or portal container | |

## Surfaces, materials and depth (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Floating chrome (toolbars, tab bars, sheets) can be a translucent layer (`backdrop-filter: blur()` over a semi-transparent background, with the `-webkit-` prefix for Safari) with content scrolling under it [T] Apple via Emil Kowalski | Sticky and fixed chrome | |
| Never stack a light translucent surface on another; legibility collapses [T] Apple via Emil Kowalski | Nested popovers and sheets | |
| Text on a translucent surface needs more contrast and weight than on a solid one; its contrast depends on what scrolls behind (the check is `visual-accessibility`'s) [T] Apple via Emil Kowalski | Text over blur | |
| Under `prefers-reduced-transparency: reduce`, make translucent surfaces solid; under `prefers-contrast: more`, use near-solid backgrounds with a defined border [T] Apple via Emil Kowalski | Translucent surfaces | |
| A blocking task gets a dimming scrim; a parallel, non-blocking panel does not [T] Apple via Emil Kowalski | Modals and side panels | |
| Where floating chrome overlaps content, fade the edge rather than drawing a hard divider; separate surfaces with soft, semi-transparent shadows rather than solid borders [T] Emil Kowalski | Headers, cards | The design system specifies borders |

## Typography (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Letter-spacing depends on size: tighten large display text (around -0.02em), leave body near 0; one value for every size is wrong somewhere [T] Apple via Emil Kowalski | Type scale | The design system sets tracking |
| Line height falls as size rises: tight on headings, looser on body, looser still for scripts with tall ascenders [T] Apple via Emil Kowalski | Type scale | |
| Build hierarchy from weight, size and leading together; emphasise with weight before size [T] Apple via Emil Kowalski | Headings, labels | |
| Default to the system font (`system-ui`) with optical sizing before a custom face [T] Apple via Emil Kowalski | New products | A brand typeface is specified |

## Platform polish on phones (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| One `theme-color` per colour scheme (`<meta name="theme-color" media="(prefers-color-scheme: dark)">`), matching the top of the page, with `color-scheme` declared [T] Emil Kowalski | Root layout | |
| Remove the tap highlight once, globally, and give every tappable element its own `:active` state [T] Emil Kowalski | Global styles | |
| Prefer native scroll snapping (`scroll-snap-type`, `scroll-snap-align`) over a hand-rolled carousel gesture [T] Emil Kowalski | Carousels | |
| `user-select: none` on controls (buttons, tabs, chips, drag handles), never on content [T] Emil Kowalski | Controls | |

## Not a finding

- Any departure from the rows above. This skill is not loaded at review.
- A library other than Emil Kowalski's pick that the repository already uses.
- An opaque toolbar or a border where the design system asks for one.
- A custom typeface the brand specifies.
- A confirmation dialog the plan approved.
