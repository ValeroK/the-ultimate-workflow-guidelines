# Frontend and accessibility expert: sources, borders and status

The frontend and accessibility expert owns whether a UI change can be operated and perceived by keyboard, screen-reader, zoom and right-to-left users, whether it holds up on real data, and whether it uses the design system. It also owns the web on every device: desktop browsers, tablets and phones (viewports, touch and pointer input, safe areas, on-screen keyboards), and motion and interface polish (maintainer decision, 2026-10-22, with Emil Kowalski's skills as the source). It joins at plan, tests and review.

## Status

- **Built:** agent file (Goal, Responsibilities, How to judge), plan, tests and review references, selection examples, `NOTICE.md`. Tools: read, search and the web (maintainer decision, 2026-10-21); no browser. What only a browser shows becomes a test case, not a finding; a screenshot browser would widen the tools and is a later, measured decision.
- **Waiting:** fact-check prompt 8 (`docs/research/fact-check-round-2-prompts.md`), sent 2026-10-20. Three upstream sources had WCAG facts wrong (large-text size, 2.4.11 against 2.4.13, 44 against 24 pixel targets), so the references hold no WCAG number or criterion level until the reply. The four skills (`semantics-and-aria`, `visual-accessibility`, `ui-on-real-data`, `rtl-and-direction`) are drafted in the ledger.
- **Not measured.** No corpus exists for this domain.

## Boundaries

| Concern | Owner |
|---|---|
| Semantics, keyboard, focus, announcements, contrast, layout on real data, direction, design-system use, UI states | frontend |
| Component state, effects and hooks | developer (`react-craft`) |
| A UI test's oracle and determinism | quality |
| XSS through unsafe sinks, secrets in client bundles | security |
| Responsive and cross-device behaviour (desktop, tablet, phone), motion, interface polish | frontend |
| Render performance and bundle size | developer (`web-performance`, maintainer decision 2026-10-21) |
| Native app code (Swift, React Native and Expo) | not owned: a mobile expert is not built |

## Sources

Ten sources (22 files in 10 repositories); every item is in `docs/experts/ledgers/frontend.md` (92 taken, 14 routed, 23 rejected, 4 missing). Three files addressed instructions to an agent (one tells it to fetch a remote rules file at run time); they were noted and not followed.
