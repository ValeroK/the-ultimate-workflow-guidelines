---
name: motion
description: Use when a change adds or changes CSS transitions, keyframes, the Web Animations API or a motion library (Motion, Framer Motion, React Spring, GSAP) in web UI, to find motion that breaks something - content left invisible, state that never completes, input locked, an animation that jumps or never runs, a loop with no pause, a hold gesture with no keyboard path. Not for whether the motion feels right.
verified: 2026-10-22
---

# Motion that breaks

## Goal

- **Lets the expert catch:** motion that makes the UI fail rather than feel off: content that stays hidden when the animation does not run, state that waits on an animation event that never fires, input refused while something animates, a re-triggered animation that jumps, a height that snaps, a loop nobody can stop, a hold-to-confirm only a pointer can perform.
- **Applies to:** added lines with `transition`, `animation`, `@keyframes`, `element.animate(`, `transitionend`, `animationend`, `motion.`, `animate={`, `useSpring`, `gsap`, and the styles of components that use them.
- **Not for:** easing, duration, origin, springs and whether something should animate at all (taste: `motion-craft`, plan only, never a finding); a missing `prefers-reduced-motion` branch on movement (`visual-accessibility`); hover motion that sticks on touch and drags that lose the pointer (`responsive-and-devices`); dropped frames, animated layout properties, `will-change` and `transition: all` (developer, `web-performance`).

Sources: **[R]** the maintainer's live check of the CSS Transitions and Animations pages on MDN and the W3C, the WCAG 2.2 Understanding pages, the HTML standard, radix-ui.com, base-ui.com and motion.dev, blocks G and K (2026-10-22); **[T]** Emil Kowalski's animation skills (`animate`, `review-animations`, `improve-animations`, `emil-design-eng`, `apple-design`; MIT, commit 2d22863), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **How the repository's reduced-motion reset works**, because the end-event rows depend on it [R]:
  - `animation: none` or `transition: none`: neither `animationend` nor `transitionend` fires.
  - a 0 s duration: `transitionend` does not fire; `animationend` still does.
  - the common `0.01ms` reset: both still fire.
  - a library setting (Motion's `MotionConfig reducedMotion="user"` turns off transform and layout animations): the library's own callbacks decide.
- **The motion library and its version**, and whether the component library (Radix, Base UI) already animates mount and unmount through data attributes.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Content and state that depend on the animation running

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An element whose resting style is hidden and which only an animation reveals stays hidden whenever that animation does not run: with `animation-fill-mode: forwards`, removing the animation returns the element to its base style [R]; a reduced-motion `animation: none`, a script that never marks it visible or a print stylesheet all do this [O] | Base style `opacity: 0` (or an off-screen `transform`) plus `animation: fadeIn ... forwards`, or a `data-visible` set only by an `IntersectionObserver` | The reduced-motion branch also sets the final style, or the hidden state is the `from` keyframe rather than the base style |
| State that completes only in an end-event handler never completes when the event does not fire: `transitionend` does not fire when no transition runs or a zero duration is set, and fires `transitioncancel` instead when the transition is removed mid-way; `animationend` does not fire under `animation: none` [R] | Unmounting, moving focus, enabling a button or resolving a promise inside such a handler, with no timeout or fallback, where the reset (above) stops that event | A fallback backs the handler; Motion's `AnimatePresence` calls `onExitComplete` with no exit animation, and Radix Presence unmounts at once [R] (Radix waits only for a CSS `@keyframes` animation on the closed state, not for a `transition` [R]); nested `AnimatePresence` with `propagate` for inner exits [R]; Base UI, which detects a Motion exit only when it animates `opacity` [R], so an exit without it unmounts at once |
| Input refused while something animates breaks the user's next action; an animation must be interruptible [T] | `pointer-events: none`, `disabled`, or an `isAnimating` guard that drops clicks during an entrance, a stagger or a close | A destructive commit that must not be double-fired, with the guard on that action alone |
| `animation-fill-mode: forwards` keeps the animation's stacking context and `will-change` effect after it ends [R], and a kept `transform` or `filter` makes the element the containing block of its `position: fixed` children [R], so a finished entrance can still sit above a later overlay or pin a fixed child to itself [O] | A `forwards` entrance on a container that holds a dropdown, a fixed toast or a portal target, or that a later overlay must cover | The animated properties create no stacking context, or the animation is removed when it ends |

## Animations that jump or never run

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Removing and reapplying a keyframe animation restarts it from its first keyframe, so re-triggering mid-flight jumps; an interrupted transition starts from the current value [R] | `@keyframes` (or `animation` toggled by a class) on a toast, toggle, accordion or anything that can fire twice in a second | The element cannot be re-triggered before the animation ends |
| A transition to or from `height: auto` does not interpolate without `interpolate-size: allow-keywords` or `calc-size()`, and `interpolate-size` is Chromium only (129 and later), so the panel snaps elsewhere [R] | `transition: height` where one end is `auto`, with no measured height, in a product that supports Safari or Firefox | The height is measured in script, or the primitive supplies it (Radix's `--radix-accordion-content-height` [R]) |

## Motion a user cannot stop or bypass

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Moving content that starts on its own, lasts more than five seconds and sits beside other content needs a way to pause, stop or hide it (2.2.2, level A) [R] | An infinite marquee, an auto-advancing carousel, an animated background or a looping illustration with no pause control | The motion is essential, or it is a loading indicator |
| A hold-to-confirm built on `:active` or pointer events alone has no reliable keyboard path: whether `:active` matches while Space is held is up to the browser [R]; a long hold also needs an alternative for users who cannot hold [O] | A destructive button whose progress fill runs only on `:active` or `pointerdown`, with no key handler or confirm step | A key handler drives the same hold, or a confirmation dialog is offered |

## Excuses that do not hold

- "Reduced motion is AAA, so it is optional" (2.3.3 is AAA [R]): the rows above are not about reduced motion being honoured; they are about the UI failing when an animation does not run, which a reduced-motion reset, a slow device or a failed script all cause.
- "It works in the demo": the demo always runs the animation.

## Not a finding

- An easing, duration, origin or spring value you would have chosen differently (taste, `motion-craft`).
- An animation the plan approved, or a deliberate motion trade-off documented in the code.
- A place that could animate and does not.
- A modal that scales from its centre.
- `transition` on `height` with both ends measured.
