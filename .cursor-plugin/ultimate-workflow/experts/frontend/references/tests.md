# Frontend and accessibility cases for a test plan

**Outcome of this stage:** every interaction and state the plan required has a test that fails if a keyboard or screen-reader user cannot complete it, and every displayed field is tested with its worst real value.

## Where to start

Your own constraints in the plan's "Expert input" section, then the draft tests and the components they render. The oracle and determinism of each case are the quality engineer's; you name the case and what it asserts.

## Families of cases

Only for what the change touches.

- **Keyboard-only path.** Each new flow completed with the keyboard alone: Tab order, Enter and Space, Escape, and where focus returns.
- **Accessible name and state.** Each new control found by its role and accessible name in the accessibility tree, not by class or test id, with its state (expanded, checked, disabled) asserted.
- **Worst-case data.** For each displayed field, from its schema: the longest value, the shortest, a missing value, one item and many items.
- **Direction and narrow screens.** Right-to-left and a 320-pixel width, for layouts the product supports in those modes.
- **Reduced motion.** An animation that is skipped or reduced when the user asks for less motion.
- **Announcements.** An async result or error announced through a live region, or focus moved to it.

## One worked case

- name: share dialog returns focus
- asserts: open the dialog with Enter on the Share button, then press Escape; the dialog is closed and the focused element is the Share button.
- why: a dialog that closes without restoring focus drops keyboard users at the top of the page, and every mouse-only test still passes.

## Redundant here

A case the draft already has; a name or role a native element or the repository's primitive guarantees and an enabled lint rule already checks; a right-to-left case for a product that is left-to-right only by decision.
