---
name: motion
description: Use when a change adds or changes CSS transitions, keyframes, the Web Animations API or a motion library (Motion, Framer Motion, React Spring, GSAP) in web UI, to find motion that breaks something - content left invisible, state that never completes, input locked, an animation that jumps or never runs, a loop with no pause, a hold gesture with no keyboard path. Not for whether the motion feels right.
verified: 2026-10-22
---

# Motion that breaks

## Goal

- **Lets the expert catch:** motion that makes the UI fail rather than feel off: content that stays hidden when the animation does not run, state that waits on an animation event that never fires, input refused while something animates, a re-triggered animation that jumps, a height that snaps, a loop nobody can stop, a hold-to-confirm only a pointer can perform.
- **Applies to:** added lines with `transition`, `animation`, `@keyframes`, `element.animate(`, `transitionend`, `animationend`, `motion.`, `animate={`, `useSpring`, `gsap`, and the styles of components that use them.
- **Not for:** easing, duration, origin, springs and whether something should animate at all (taste: `motion-craft`, plan and build only, never a finding); a missing `prefers-reduced-motion` branch on movement (`visual-accessibility`); hover motion that sticks on touch and drags that lose the pointer (`responsive-and-devices`); dropped frames, animated layout properties, `will-change` and `transition: all` (developer, `web-performance`).

Sources: **[R]** the maintainer's live check of the WCAG 2.2 Understanding pages, block G (2026-10-22); **[T]** Emil Kowalski's animation skills (`animate`, `review-animations`, `improve-animations`, `emil-design-eng`, `apple-design`; MIT, commit 2d22863), not checked; **[O]** our own reasoning. Every row here waits for the maintainer's live check of the pages named in its claim; until then it is a prompt to check, not a finding on its own.

## First, establish the target

- **How the repository honours reduced motion:** a global `@media (prefers-reduced-motion: reduce)` reset, a library setting (Motion's `MotionConfig reducedMotion="user"`), or per-component branches. The rows below depend on what that reset does to `animation` and `transition`.
- **The motion library and its version**, and whether the component library (Radix, Base UI) already animates mount and unmount through data attributes.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Content and state that depend on the animation running

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An element whose resting style is hidden and which only an animation reveals stays hidden whenever that animation does not run: reduced motion set to `animation: none`, a script that never marks it visible, a print stylesheet [O] | Base style `opacity: 0` (or an off-screen `transform`) plus `animation: fadeIn ... forwards`, or a `data-visible` set only by an `IntersectionObserver` | The reduced-motion branch also sets the final style, or the hidden state is the `from` keyframe rather than the base style |
| State that completes only in a `transitionend` or `animationend` handler never completes when no transition or animation runs [O] | Unmounting, moving focus, enabling a button or resolving a promise inside such a handler, with no timeout or fallback, in a codebase whose reduced-motion reset removes the transition | The handler is backed by a fallback, or the library (Motion `onExitComplete`, Radix presence) handles the no-animation case |
| Input refused while something animates breaks the user's next action; an animation must be interruptible [T] | `pointer-events: none`, `disabled`, or an `isAnimating` guard that drops clicks during an entrance, a stagger or a close | A destructive commit that must not be double-fired, with the guard on that action alone |

## Animations that jump or never run

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A keyframe animation restarted on an element triggered again mid-flight starts again from its first keyframe and jumps; a transition starts from the current value [T] | `@keyframes` (or `animation` toggled by a class) on a toast, toggle, accordion or anything that can fire twice in a second | The element cannot be re-triggered before the animation ends |
| A transition to or from `height: auto` does not interpolate in browsers without `interpolate-size` or `calc-size()`, so the panel snaps [T] | `transition: height` where one end is `auto`, with no measured height and no `interpolate-size: allow-keywords` | The height is measured in script, or the primitive supplies it (`--radix-accordion-content-height`) |

## Motion a user cannot stop or bypass

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Moving content that starts on its own, runs longer than five seconds and sits beside other content needs a way to pause, stop or hide it (WCAG 2.2.2, level A) [O] | An infinite marquee, an auto-advancing carousel, an animated background or a looping illustration with no pause control | The motion is essential, or it is a loading indicator |
| A hold-to-confirm built on `:active` or pointer events alone has no keyboard path, and a long hold has no alternative for users who cannot hold [O] | A destructive button whose progress fill runs only on `:active` or `pointerdown`, with no key handler or confirm step | A key handler drives the same hold, or a confirmation dialog is offered |

## Excuses that do not hold

- "Reduced motion is AAA, so it is optional" (2.3.3 is AAA [R] 2026-10-22): the rows above are not about reduced motion being honoured; they are about the UI failing when an animation does not run, which a reduced-motion reset, a slow device or a failed script all cause.
- "It works in the demo": the demo always runs the animation.

## Not a finding

- An easing, duration, origin or spring value you would have chosen differently (taste, `motion-craft`).
- An animation the plan approved, or a deliberate motion trade-off documented in the code.
- A place that could animate and does not.
- A modal that scales from its centre.
- `transition` on `height` with both ends measured.
