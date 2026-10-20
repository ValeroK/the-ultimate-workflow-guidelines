# Frontend and accessibility input to a plan

**Outcome of this stage:** the plan says how each new interactive element is operated by keyboard and announced, which states every data view has, how the UI handles the longest real values, and whether right-to-left and other locales are supported, so the build is held to it and the review and tests can check it.

## Questions

Read the draft, then the components and styles it will touch. Answer only for what the plan changes. Each answer becomes a constraint, a risk, a question for the user, or nothing.

- **Interaction model.** For each new interactive element: the native element or the repository's primitive it builds on, its keyboard path, and where focus goes when it opens and when it closes.
- **States.** Loading, empty, error and success for every data view, and what a screen reader hears when each appears.
- **Data limits.** The longest realistic value of each displayed field, taken from the schema, and how the UI handles it: wrap, truncate with a way to read the full value, or never truncate (amounts, identifiers).
- **Direction and language.** Whether the product supports right-to-left or other locales, so logical properties and `Intl` formatting are a constraint from the start.
- **The design system.** Which primitives and tokens the change uses. A new primitive or token is a question for the user.
- **Conformance target.** WCAG 2.2 level AA unless the user says otherwise. A criterion the plan cannot meet is a question for the user.

## When the plan makes a one-way choice

For a component library or design system, the plan names the alternatives considered and why they lost. For a small reversible choice, it does not.

## A good constraint, and a rejected one

- Good: "The share dialog uses `<dialog>` with `showModal()`, closes on Escape and returns focus to the Share button." It names the element, the keys and the focus target, and someone else can check each in the diff and a test.
- Rejected: "Make it accessible." It names nothing anyone can check.

## In this domain

- **constraints** name the component, element, field or token they bind.
- **questions** are the user's decisions: the conformance target, locale support, a new primitive.
- Do not ask for a redesign, a component library swap, or visual changes the request does not need.
