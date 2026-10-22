# Frontend and accessibility expert: sources, borders and status

The frontend and accessibility expert owns whether a UI change can be operated and perceived by keyboard, screen-reader, zoom and right-to-left users, whether it holds up on real data, and whether it uses the design system. It also owns the web on every device: desktop browsers, tablets and phones (viewports, touch and pointer input, safe areas, on-screen keyboards), and motion and interface polish (maintainer decision, 2026-10-22, with Emil Kowalski's skills as the source). It joins at plan, tests and review.

## Status

- **Built:** agent file (Goal, Responsibilities, How to judge), plan, tests and review references, selection examples, `NOTICE.md`. Tools: read, search and the web (maintainer decision, 2026-10-21); no browser. What only a browser shows becomes a test case, not a finding; a screenshot browser would widen the tools and is a later, measured decision.
- **Skills (2026-10-22):** nine, after the maintainer's live checks of blocks G (accessibility, 25 items, 3 different) and K (devices, 65 items, 2 different; `docs/research/fact-check-replies-2026-10-22.md`). Sources for the device, motion and design skills: Emil Kowalski's whole skills repository (ledger section 8). A row whose fact a check confirmed is [R]; the rest stay [T] or [O].

| Skill | Stages | Holds |
|---|---|---|
| `semantics-and-aria` | plan, review | native first, names and roles, keyboard paths and APG patterns, focus in dialogs and routes, live regions, WCAG 2.2 authentication and forms, what `jsx-a11y` already catches |
| `visual-accessibility` | plan, review | contrast and large text, non-text contrast, focus visibility and 2.4.11, target size, reflow and text resizing, content on hover or focus, reduced motion and forced colours |
| `ui-on-real-data` | plan, review | the CSS cause behind each break on long, short and missing values, truncation, initials, `Intl` for plurals, numbers and dates, images, schema limits |
| `responsive-and-devices` | plan, tests, review | viewport units, safe areas, zoom, the software keyboard, touch against pointer, gestures, orientation and split screen, focus rings |
| `rtl-and-direction` | plan, tests, review | logical properties, `row-reverse`, `scrollLeft`, isolation, mirrored icons, portals |
| `motion` | review | motion that breaks: content hidden when it does not run, end events that never fire, input locked, restarts, `height: auto`, loops with no pause |
| `worst-case-data` | tests | the worst realistic value per displayed field |
| `motion-craft`, `interface-design` | plan only | Emil Kowalski's taste, attributed; never a finding |

- **Decisions (maintainer, 2026-10-22):** the cap for this expert is 56 KB per stage, so all six review skills fit together (about 53 KB; a test holds it). No build stage: the taste skills are offered at plan and reach the implementer through the plan. Opinions on easing, durations and aesthetics are plan guidance only, because taste rules raise false alarms on correct code.
- **Conflicts with the checked pages (the page won):** Motion `x`/`y` not hardware-accelerated (rejected); an animated blur limit of 20 px (no published limit); `will-change` wherever motion is imminent (rejected); `touchmove` with `preventDefault()` (passive by default on window, document and body); missing reduced motion as a blocker (2.3.3 is AAA); 44 by 44 targets (web AA is 24 by 24); Angular `[aria-label]` (now binds directly); Sonner `dir` (defaults to `auto`).
- **Not measured.** No corpus exists for this domain. The proposed next step is frontend defects mined from real fix commits, as for `developer-real`.

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
