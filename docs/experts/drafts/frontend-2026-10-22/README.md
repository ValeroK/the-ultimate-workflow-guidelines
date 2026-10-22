# Frontend skill drafts from Emil Kowalski's skills, 2026-10-22

Drafts, not shipped: nothing here is loaded by the plugin. They become final after fact-check K (`docs/research/fact-check-prompts-open-2026-10-21/K.txt`) comes back and the two decisions below are made.

Source: `emilkowalski/skills` at commit 2d22863 (2026-10-11), MIT, read as data. Ledger: `docs/experts/ledgers/frontend.md` section 8 (263 items: 135 taken, 40 routed, 79 rejected, 9 missing; 81 rows are taste guidance).

## Scope (maintainer, 2026-10-22)

- Take everything usable, including the design guidelines (`emil-design-eng`, `apple-design`).
- The frontend expert owns the web on every device: desktop, tablet, phone. `mobile-native` became part of `responsive-and-devices`.
- Emil's opinions are tagged [T] and attributed. Concrete breaks can be review rows; taste (easing, durations, aesthetics) is plan and build guidance only, because taste rules raise false alarms on correct code.
- `write-swift` and `animate-expo` are routed to a mobile expert that is not built. Animation performance is routed to the developer's `web-performance`.

## The drafts

| Skill | Size | Stages | Holds |
|---|---|---|---|
| `ui-on-real-data` | 9.3 KB | review | the planned skill, with `break-ui` and its catalogue merged in |
| `worst-case-data` | 4.0 KB | tests | the catalogue of worst-case values |
| `responsive-and-devices` | 10.5 KB | plan, review, tests | viewports and dynamic units, safe areas, zoom on input, touch against pointer, sticky hover, keyboards on touch devices, orientation and split screen, desktop hover and focus rings |
| `motion` | 6.3 KB | review | concrete breaks only: content hidden when the animation does not run, state waiting on an end event that never fires, input locked during animation, loops with no pause (WCAG 2.2.2) |
| `motion-craft` | 8.7 KB | plan, build | Emil's motion taste, attributed |
| `interface-design` | 8.6 KB | plan, build | `apple-design` and the non-motion parts of `emil-design-eng`, library choices |

## Conflicts with the verified blocks (the verified page wins)

| Source claim | Verified | Outcome |
|---|---|---|
| Motion `x`/`y` not hardware-accelerated | I 25 says they are | rejected |
| Animated blur under 20 px | I 45: no published limit | number left out |
| `will-change` wherever motion is imminent | I 23: excessive use costs memory | rejected |
| `touchmove` with `preventDefault()` | I 21: passive by default on window, document, body | taken, corrected |
| Missing reduced motion blocks a change | G 12: 2.3.3 is AAA | severity lowered |
| 44 by 44 pt targets | G 3: web AA is 24 by 24 CSS px | native guidance only |

## Two decisions for the maintainer

1. **The review stage is over the 40 KB cap.** With the four planned skills, all six review skills selected at once come to about 48.5 KB; with the proposed trims, about 40.7 KB. Below the cap, the lowest-priority skills (`rtl-and-direction`, `motion`) are dropped on the rare diff that matches all six.
2. **The frontend expert has no build stage.** Taste guidance (`motion-craft`, `interface-design`) needs either a build stage with a short brief, or plan only.
