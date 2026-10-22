---
name: motion-craft
description: Use when a plan or build adds animation or motion to a web UI - whether it should animate at all, and if so the tool, easing, duration, origin, springs, gesture handoff, interruption and reduced-motion variant - following Emil Kowalski's design-engineering judgement. Guidance for plan and build; never a review finding.
verified: 2026-10-22
---

# Motion craft

## Goal

- **Lets the expert catch:** at plan, motion that should not exist (on a keyboard shortcut, on a view seen a hundred times a day, on data the user reads) and motion with no named purpose; at build, the wrong ingredients for motion that should exist (an `ease-in` entrance, a `scale(0)` pop, a popover growing from its centre, keyframes on a toast, a 400 ms dropdown, a drag that ignores the finger's velocity).
- **Applies to:** plan text that mentions animation, transitions, gestures, drawers, sheets, toasts or "feel"; at build, the files that implement them.
- **Not for:** motion that breaks the UI (`motion`, the review skill); reduced-motion requirements as accessibility (`visual-accessibility`); frame rate, compositing and `will-change` (developer, `web-performance`).

Everything here is taste: the expert judgement of Emil Kowalski, from his skills `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `apple-design` (which draws on Apple's WWDC 2018 talk "Designing Fluid Interfaces") and `prototype` (MIT, commit 2d22863). Rows are **[T]**, attributed, unchecked; **[R]** marks a fact from the maintainer's live check of web.dev and MDN, block I (2026-10-22). At plan, state a row as a recommendation the user may decline. At build, follow it unless the repository's own motion tokens or the plan say otherwise. Never report a departure from it as a finding.

## First, establish the target

- **The repository's motion tokens** (`--ease-*`, `--duration-*`, a Tailwind theme, a spring config module). Extend them; a second, parallel set is a defect [T].
- **The product's personality**: a daily-use dashboard gets less and crisper motion than a consumer app [T].
- **The component library**: Base UI, Radix and similar primitives expose mount and unmount states and a trigger origin to animate against.

## Should it animate (plan)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Decide by how often a user sees it: 100+ times a day (shortcuts, command palette) gets no animation; tens of times a day, barely perceptible or none; occasional (modals, drawers, toasts), standard; rare or first-run, room for delight [T] Emil Kowalski | Any new animated element | Marketing pages and explanatory motion |
| Never animate a keyboard-initiated action [T] Emil Kowalski | Shortcuts, palette open and close, focus jumps | |
| Name the purpose in one word before building: feedback, spatial consistency, state indication, preventing a jarring change, explanation; delight only at the rare tier. No purpose, no animation [T] Emil Kowalski | Every animation in a plan | |
| Data the user is reading or acting on does not move for decoration [T] Emil Kowalski | Charts, tables, figures in a functional UI | Marketing and onboarding |
| The cheapest tool that works: a CSS transition, then `@starting-style` for entry, then a CSS animation, then the Web Animations API, then a motion library for springs, layout and exit animations and gestures [T] Emil Kowalski | Tool choice at plan | The repository already standardises on one library |

## Easing and duration (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Entering and exiting: ease-out; moving on screen: ease-in-out; hover and colour: ease; constant motion: linear; never ease-in on UI, because it delays the moment the user watches [T] Emil Kowalski | Every transition | A progress fill, which is linear |
| Built-in CSS easings are weak; preferred curves: `cubic-bezier(0.23, 1, 0.32, 1)` ease-out, `cubic-bezier(0.77, 0, 0.175, 1)` ease-in-out, `cubic-bezier(0.32, 0.72, 0, 1)` for drawers (from Ionic) [T] Emil Kowalski | New easing tokens | The repository's tokens exist |
| Durations: press feedback 100 to 160 ms; tooltips and small popovers 125 to 200; dropdowns 150 to 250; modals and drawers 200 to 500; UI motion under 300 ms [T] Emil Kowalski | UI components | Marketing and explanatory motion |
| Exit faster than entry; the deliberate phase slow (a hold-to-confirm fill, 2 s linear), the system's response snappy (release, 200 ms ease-out) [T] Emil Kowalski | Press, hold and dismiss pairs | |

## Origin and physicality (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Never enter from `scale(0)`: start at 0.9 to 0.97 with `opacity: 0` [T] Emil Kowalski | Entrances | |
| Popovers, menus, dropdowns and tooltips scale from their trigger (`transform-origin` at the trigger, `var(--transform-origin)` in Base UI); modals stay centred [T] Emil Kowalski | Anchored overlays | Modals |
| Press feedback: `transform: scale(0.97)` on `:active` (0.95 to 0.98), on press, not on release [T] Emil Kowalski | Pressable elements | |
| Move by the element's own size with percentages (`translateY(100%)`) rather than pixels [T] Emil Kowalski | Drawers, toasts, sheets | |
| Enter and leave along the same path; anchor motion to its source [T] Apple via Emil Kowalski | Toasts, panels, sheets | |

## Interruption, springs and gestures (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Use transitions, not keyframes, for anything triggered rapidly; use springs for anything a finger drives, because they carry velocity through an interruption [T] Emil Kowalski | Toasts, toggles, drags | Predetermined, one-shot motion |
| Springs: critically damped (no bounce) by default; bounce (Motion `bounce` 0.1 to 0.3, Apple damping about 0.8) only when the gesture carried momentum [T] Apple via Emil Kowalski | Spring configs | |
| On interrupt, start from the on-screen value, not the target; at release, hand the finger's velocity to the spring [T] Apple via Emil Kowalski | Drags, sheets, swipes | |
| Choose the snap point from the projected resting position (exponential decay, rate about 0.998), dismiss on velocity as well as distance, and rubber-band past a boundary instead of a hard stop [T] Apple via Emil Kowalski | Sheets, carousels, swipe-to-dismiss | |
| Track 1:1 with the pointer and keep the grab offset; require a small movement threshold before committing to an axis [T] Apple via Emil Kowalski | Drags | |

## Polish (build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Tooltips delay the first time, then open neighbours instantly with no animation [T] Emil Kowalski | Toolbars | |
| Stagger group entrances 30 to 80 ms apart; stagger is decorative and never blocks input [T] Emil Kowalski | Lists and grids seen occasionally | Lists scrolled past all day |
| A small blur (about 2 px) can hide a crossfade's double exposure; no vendor publishes a blur size limit [R] 2026-10-22, so the "under 20 px" rule in the source is left out | Crossfades | |
| `clip-path: inset()` for reveals, hold-to-confirm fills, tab colour changes and comparison sliders [T] Emil Kowalski | Reveals | |
| Enable a transition only after first paint, so nothing animates on load [T] Emil Kowalski | Indicators positioned on mount | |
| Scroll reveals belong on marketing pages, fire once, and never on functional UI [T] Emil Kowalski | Scroll-triggered motion | |

## Reduced motion and feel (plan and build)

| Guidance | Where it applies | When it does not apply |
|---|---|---|
| Reduced motion means fewer and gentler, not none: keep opacity and colour changes that explain state, drop translation, scale, parallax and overshoot [T] Emil Kowalski | Every animation's reduced variant | |
| Avoid full-viewport moving backgrounds and slow looping oscillations; fade large surfaces during a large reposition [T] Apple via Emil Kowalski | Ambient and large motion | |
| Feel cannot be judged from code: name what to watch (slowed playback, frame by frame, a real device for gestures, a second look the next day) as a tests-stage case, not a guess at a value [T] Emil Kowalski | Crossfades, springs, list reflow | |

## Not a finding

- Any departure from the rows above. This skill is not loaded at review.
- Motion's `x`/`y` shorthand props: the source's claim that they are not hardware-accelerated is contradicted by Motion's own guide [R] 2026-10-22.
- A modal scaling from its centre.
- A longer or softer motion that matches the component's documented personality.
- An animation the user approved in the plan.
