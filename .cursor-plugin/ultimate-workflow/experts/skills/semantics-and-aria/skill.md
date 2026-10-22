---
name: semantics-and-aria
description: Use when a change adds or changes interactive web UI - buttons, links, forms, dialogs, menus, tabs, comboboxes, toasts, route changes - in React, Vue, Svelte, Angular or HTML, to find what a keyboard or screen-reader user cannot reach, name, operate or hear - the native element against ARIA, names and roles, focus in dialogs and routes, live regions, the APG keyboard patterns, and what eslint-plugin-jsx-a11y already catches.
verified: 2026-10-22
---

# Semantics, keyboard and ARIA

## Goal

- **Lets the expert catch:** an interactive element a keyboard user cannot reach or operate, a control a screen reader announces with no name or the wrong role, focus that is lost or trapped when a dialog or route changes, a result nobody hears, and ARIA that replaces a native element badly.
- **Applies to:** markup and components (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.astro`, Angular templates), their event handlers, and the dialog, menu, toast and router code they use.
- **Not for:** contrast, focus-ring styling, target size and zoom (`visual-accessibility`); hover and touch input on devices (`responsive-and-devices`); direction (`rtl-and-direction`); component state, effects and keys as correctness (developer, `react-craft`); unsafe HTML sinks (security).

Sources: **[R]** the maintainer's live check of WCAG 2.2 and its Understanding pages, the ARIA Authoring Practices (APG), ARIA in HTML, the HTML standard, MDN, angular.dev and the eslint-plugin-jsx-a11y README, blocks G and K (2026-10-22); **[T]** Community-Access/accessibility-agents, ibelick/ui-skills and affaan-m/ECC (MIT), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The primitives the repository builds on** (Radix, Base UI, React Aria, Headless UI, Angular CDK, native `<dialog>`): a trace stops where a primitive provides the behaviour.
- **Whether `eslint-plugin-jsx-a11y` (or the Vue, Svelte or Angular equivalent) runs in CI, and with which rules.** Its recommended set includes `alt-text`, `click-events-have-key-events`, `no-static-element-interactions`, `label-has-associated-control`, `tabindex-no-positive` and `no-autofocus` [R]. A rule it enforces is not a finding; a change that turns one off, or drops the plugin, is [O].
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Native first, names and roles

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A native element brings its role, focus and keys; `<div role="button">` needs `tabindex="0"` and Enter and Space handlers to match `<button>` [T] | A click handler on a `div` or `span` with no role, no `tabindex` or no key handler | A native control, or a primitive that renders one |
| Every control has an accessible name; an icon-only button needs `aria-label` or visually hidden text, and its decorative SVG `aria-hidden="true"` [T] | `<button><Icon /></button>` with no text and no label | The icon component renders a title the primitive exposes as the name |
| A `placeholder` is not a label [R]; every input has a programmatic label (`<label for>`, wrapping `<label>`, `aria-labelledby`) [T] | An input whose only text is its `placeholder` | |
| The accessible name contains the visible label text, best at its start (2.5.3 Label in Name, A) [R] | `aria-label="Close dialog"` on a button that shows "Cancel" | |
| `aria-labelledby`, `aria-describedby` and `aria-controls` point to ids that exist in the same document [T] | A referenced id that is renamed, generated twice, or rendered only later | |
| Duplicate ids no longer fail 4.1.1 (obsolete and removed in 2.2), but still fail 1.3.1 or 4.1.2 where they break a name or a relationship [R] | A list item component that renders a fixed `id` and is used more than once, with a label pointing at it | Duplicate ids nothing references |
| Stateful ARIA follows the state: `aria-expanded`, `aria-selected`, `aria-pressed`, `aria-checked` change when the UI does [T] | A disclosure that toggles a class but sets `aria-expanded` once | |
| No `aria-hidden="true"` on a focusable element or an ancestor of one [R] | `aria-hidden` on a wrapper of a button, link or input | The subtree is also `inert` or removed from the tab order |
| `autocomplete` tokens identify fields about the user (1.3.5 Identify Input Purpose, AA) [R] | A new name, email, address, phone or one-time-code field with no `autocomplete` | Fields about someone other than the user |
| Redundant ARIA (`<nav role="navigation">`, `<button role="button">`) is noise, low severity [T] | Such a role added | |

## Keyboard paths

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Composite widgets follow the APG pattern: tabs take Tab into the panel and arrow keys between tabs; menus and comboboxes have their own key models [R] | A custom tab list where every tab is a Tab stop and arrows do nothing; a combobox that does not open or move with arrow keys | The primitive implements the pattern |
| Content shown on hover also shows on focus, and a hover-only menu has a keyboard path [T] | `onMouseEnter` opening a menu with no focus or key handler | |
| Dragging has a single-pointer alternative (2.5.7, AA); keyboard access alone does not meet it [R] | Drag-to-reorder or a slider with no buttons or click-to-set path | Dragging is essential |
| A single-character shortcut can be turned off or remapped, or works only while its component has focus (2.1.4, A) [R] | A global `keydown` listener acting on a bare letter or digit | The shortcut needs a modifier |
| `tabindex` above 0 breaks the tab order [T] | `tabIndex={1}` or higher | |
| Flex `order` and `*-reverse` change the visual order, not the tab or reading order (2.4.3) [R] | `order` or `row-reverse` that moves an interactive element ahead of others visually | Direction-only reversal handled by `dir` (`rtl-and-direction`) |
| A scrollable region with no focusable content needs `tabindex="0"` and a name, or a keyboard user cannot scroll it [T] | A new `overflow: auto` panel of text or a table, with no focusable child | |

## Focus in dialogs and routes

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `showModal()` makes the rest of the document inert and moves focus inside; `show()` and the `open` attribute do not [R]; `showModal()` on a dialog already open non-modally throws `InvalidStateError` [R] | A modal opened with `show()` or `open`; `showModal()` called without checking `open` | A non-modal dialog by design |
| `inert` removes a subtree from focus, clicks and the accessibility tree [R]; a hand-built modal needs it (or a primitive) on everything behind [T] | A `role="dialog"` overlay with no `inert`, no focus containment and no primitive | |
| A modal returns focus to its trigger on close and closes on Escape [T] | A close handler that unmounts with no focus return; no Escape handler | The primitive does both |
| A modal inside an iframe blocks only the iframe [R] | An embedded widget's modal expected to block the host page | |
| A client-side route change moves focus to the new content or announces it [T] | A router change that leaves focus on a removed link | The framework's router announcer is enabled |
| Unmounting the focused element drops focus to `body` [O] | A list where deleting a row removes the focused button with no next focus target | |

## Announcements

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A live region must exist, empty, before its content changes [R] | A region rendered together with its message (`{error && <div aria-live="polite">...}`); in Vue `v-if` on the region (use `v-show`) [T] | |
| `role="alert"` already implies assertive; adding `aria-live="assertive"` makes iOS VoiceOver speak twice [R] | Both on one element | |
| Content deferred into view (Angular `@defer`, lazy panels) that the user waits for sits in a live region [R] | A deferred result with no region and no focus move | Focus moves to it |
| A toast is not the only carrier of critical information or of an action [T] | An error, or an Undo, shown only in a toast that times out | |
| A form error is tied to its field (`aria-describedby`, `aria-invalid`) and the first error is focused or summarised on submit [T] | Errors rendered as text with no link to the field | |

## Framework notes

- **Angular:** current Angular binds ARIA attributes directly (`[aria-label]`) as well as with `[attr.aria-label]`, and removes the attribute when the value is null [R]. Neither form is a finding.
- **React portals:** a portalled dialog is outside its trigger's DOM, so focus return and `inert` must be handled explicitly [T].

## Authentication and forms (WCAG 2.2)

- Blocking paste into a password or code field fails 3.3.8 Accessible Authentication (AA), and so does asking for "the 1st, 3rd and 5th character" of a password [R].
- 3.3.7 Redundant Entry (A): information already entered in the same process is filled in or selectable [R].
- 3.2.6 Consistent Help (A): help offered on several pages stays in the same relative place [R].

## Not a finding

- A rule an enabled lint rule enforces.
- A primitive's own markup you would have written differently.
- Duplicate ids nothing references (4.1.1 is gone).
- `[aria-label]` in an Angular template.
- An automated score (Lighthouse, axe) going up or down: neither proof of a defect nor of its absence.
