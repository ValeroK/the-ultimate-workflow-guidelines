# Frontend and accessibility review of a diff

## Purpose

Find the UI in this change that some users cannot operate or perceive, or that breaks on real data or drifts from the design system. Written from the standards and open-source skills compared on 2026-10-20 (see `NOTICE.md`); no text is copied.

## Scope

Report problems this change introduces or makes worse in components, markup, styles and the code that renders them. This is not a visual design review.

- A problem that was already there and is untouched is out of scope, unless the change makes it reachable.
- Read the component's parents and the primitives it uses: a native element or a primitive often already provides the behaviour.
- If the plan has an "Expert input" section, check the diff against what you required there.
- What only a browser shows (contrast over an image, focus hidden at a scroll position, screen-reader output) is something you cannot see; say so, and ask for it as a test case.

## Method

1. Learn the repository's primitives, tokens and lint rules (`eslint-plugin-jsx-a11y` or its equivalent), and what they already enforce.
2. Compare the change against them: a hand-built control where a primitive exists, a raw value where a token exists.
3. For each new or changed interactive element, follow the keyboard and screen-reader path: how it is reached, named, operated and left.

Stop a trace when the path reaches a native element or a primitive that provides the behaviour, or when it depends on rendering you cannot see: then name it as a test case, not a finding. Stop the review when every changed interactive element, style rule and displayed field has been checked.

Every finding names the user or the data that hits it and what fails.

## Categories

Check what the change touches and skip the rest.

- **No keyboard path.** A click handler on a non-interactive element with no key handler and no role, a menu that opens only on hover, drag with no alternative. Not when the element is a native control or the repository's primitive provides the behaviour.
- **No accessible name, or the wrong role.** An icon-only button with no name, an input labelled only by its placeholder, `aria-labelledby` pointing at a missing id, a role without the states it requires. Not when an enabled lint rule already enforces it.
- **Focus lost or trapped.** A modal with no containment or no return of focus, a widget that captures Tab with no Escape, a route change that leaves focus on a removed element, `aria-hidden` on an ancestor of something focusable. Not when `<dialog>` with `showModal()` or the primitive handles it.
- **Focus invisible.** `outline: none` with no replacement, or a sticky element covering the focused control. Not when a `:focus-visible` style replaces it.
- **State nobody hears.** An async result, an error or a toast with no live region, or a live region created at the same moment as its content. Not when focus moves to the result.
- **Contrast that cannot hold.** Text, control or focus colours below the WCAG ratio for their size on the background they sit on, or semi-transparent text whose contrast depends on what is behind it. Not when the token is the design system's and its contrast is documented for that background.
- **Breaks on real data.** A flex text child with no `min-width: 0`, a fixed-size box that shrinks, a fixed-width label, an unbreakable string with no wrap, truncation with no way to read the value, truncated amounts, lengths or initials taken from code units, hard-coded plurals, a front-end limit below the back end's. Not when the field's schema bounds it below the breaking length.
- **Direction-blind.** Physical properties or left alignment in a product that supports right-to-left, `row-reverse` added for right-to-left, numbers and URLs with no isolation, directional icons not mirrored. Not when the product is left-to-right only by decision.
- **Missing states.** A data view with no loading, empty or error state. Not when the parent renders them.
- **Design-system drift.** Raw colour or spacing values where tokens exist, a second primitive system in one surface, a shared primitive changed for one caller. Not when the plan introduces the token or primitive.
- **Zoom or reflow blocked.** `user-scalable=no` or `maximum-scale=1`, fixed heights that clip text when it is enlarged, a layout that needs horizontal scrolling at 320 pixels. Not when the content is a canvas or map that needs two dimensions.

## Severity here

- **high**: a group of users cannot complete the task: no keyboard path, no name on a required control, a focus trap, paste blocked on a sign-in field.
- **medium**: the task is possible but confusing or lossy: focus lost, an error not announced, a value truncated with no way to read it, a right-to-left break in a supported locale.
- **low**: polish with a cheap fix, such as redundant ARIA or a skipped heading level.

## Do not report

- Visual taste, spacing preferences, or a design the plan already approved.
- Component state, effects and hooks (owner: developer).
- Unsafe HTML sinks (owner: security).
- A rule an enabled lint rule enforces.
- Anything the plan states and the diff honours.

## One finding, and one candidate dropped

- Reported: `components/ShareDialog.tsx:14` renders a `div` with `role="dialog"` and no focus handling, and `ShareButton.tsx:9` opens it on click. A keyboard user who opens it keeps focus on the page behind, can Tab past the dialog without reaching its Copy link button, and Escape does nothing. Category: focus lost or trapped; severity high. Fix: render it with `<dialog>` and `showModal()`, close on Escape, and return focus to the Share button.
- Dropped: `styles/buttons.css:22` sets `outline: none`, but line 23 adds a `:focus-visible` outline in a design-system colour documented for that background, so focus stays visible.
