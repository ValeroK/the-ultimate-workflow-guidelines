# Frontend and accessibility expert: sources, borders and status

The frontend and accessibility expert owns whether a UI change can be operated and perceived by keyboard, screen-reader, zoom and right-to-left users, whether it holds up on real data, and whether it uses the design system. It joins at plan, tests and review.

## Status

- **Built:** agent file (Goal, Responsibilities, How to judge), plan, tests and review references, selection examples, `NOTICE.md`. Tools: read and search only. What only a browser shows becomes a test case, not a finding; a screenshot browser would widen the tools and is a later, measured decision.
- **Waiting:** fact-check prompt 8 (`docs/research/fact-check-round-2-prompts.md`), sent 2026-10-20. Three upstream sources had WCAG facts wrong (large-text size, 2.4.11 against 2.4.13, 44 against 24 pixel targets), so the references hold no WCAG number or criterion level until the reply. The four skills (`semantics-and-aria`, `visual-accessibility`, `ui-on-real-data`, `rtl-and-direction`) are drafted in the ledger.
- **Not measured.** No corpus exists for this domain.

## Boundaries

| Concern | Owner |
|---|---|
| Semantics, keyboard, focus, announcements, contrast, layout on real data, direction, design-system use, UI states | frontend |
| Component state, effects and hooks | developer (`react-craft`) |
| A UI test's oracle and determinism | quality |
| XSS through unsafe sinks, secrets in client bundles | security |
| Render performance and bundle size | not yet owned: the performance expert is in question (put to the maintainer) |

## Sources

Ten sources (22 files in 10 repositories); every item is in `docs/experts/ledgers/frontend.md` (92 taken, 14 routed, 23 rejected, 4 missing). Three files addressed instructions to an agent (one tells it to fetch a remote rules file at run time); they were noted and not followed.
