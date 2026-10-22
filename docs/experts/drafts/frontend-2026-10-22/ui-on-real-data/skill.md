---
name: ui-on-real-data
description: Use when a change renders data in UI - names, emails, labels, counts, money, dates, lists, images - to find the layout and formatting that breaks on the longest, shortest, missing or unusual real value.
verified: 2026-10-22
---

# UI on real data

## Goal

- **Lets the expert catch:** a component that looks right with demo data and breaks on real data: the CSS cause behind text that overflows, boxes that shrink, actions pushed off the row, values cut or rendered raw, initials, plurals and dates built by hand, and a front-end limit below the back end's.
- **Applies to:** components and styles that render data (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.css`, `.scss`), and the fixtures and schemas behind them.
- **Not for:** the worst-case values a test should use (`worst-case-data`, tests stage); right-to-left layout and bidi isolation (`rtl-and-direction`); narrow viewports, zoom-blocking and touch (`responsive-and-devices`); contrast and reflow (`visual-accessibility`); UTF-16 lengths and reserved domains in test fixtures, and whether a test can fail (quality, `test-craft`); an unescaped string in an HTML sink (security); 1,000 unvirtualised rows and image layout shift (developer, `web-performance`).

Sources: **[R]** the maintainer's live check of MDN and CSS Flexbox pages, block G (2026-10-22); **[T]** Emil Kowalski's `break-ui` skill and its catalogue (MIT, commit 2d22863), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The field's limit**, from the validation schema (Zod, Yup, Valibot), the column in a migration, the API type or a `maxLength`. A field with no limit anywhere is unbounded: judge it against a long but believable value.
- **The locales the product supports**, so a hand-built plural, number or date is a finding only where another locale is real.
- **The container the component lives in** (a 280 px sidebar is not a page), from its parents.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Overflow and shrinking

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A flex item's automatic minimum size keeps it from shrinking below its content, so a text column overflows its row [R] 2026-10-22 | A text child of a `display: flex` row with no `min-width: 0` and visible `overflow`; in grid, a `1fr` track with no `minmax(0, 1fr)` [T] | The text is `white-space: normal` and every word is short, or the item has `overflow` other than `visible` |
| A fixed-size box in a flex row shrinks when its sibling grows [T] | An avatar, icon or checkbox with `width` and `height` but no `flex-shrink: 0` (`shrink-0`) | The box is outside the flex row, or `flex: none` |
| Middle content takes the row and pushes the trailing action off it or clips it [T] | A row of avatar, text, `...` menu where the text has no `min-width: 0` or the menu has no `flex-shrink: 0` | The action is positioned outside the flow |
| A badge or status allowed to shrink wraps onto two lines and squeezes the name [T] | A badge with neither `white-space: nowrap` nor `flex-shrink: 0`, beside variable text | The badge text is a fixed enum whose longest value was checked in every locale |
| A fixed `width` on a button or label overflows a translated or data-driven label [T] | `width: 120px` on a button whose text comes from data or i18n | `min-width` with content-driven width |
| A fixed-height container cuts the last row mid-glyph with nothing to show more exists [T] | `height` plus `overflow: hidden` on a list or text box with no scroll, fade or "show more" | The content is bounded below the height by its schema |

## Long strings and truncation

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An email, URL, hash or file name has no break opportunity and runs past the edge [T] | Such a value rendered with no `overflow-wrap: anywhere` (or `break-word`) and no truncation | It sits in a scrolling code block by design |
| `word-break: break-all` breaks every word mid-word, headings included [T] | `break-all` on prose or a heading | A hash, token or code value where any break point is acceptable |
| An ellipsis with no way to read the full value hides data [T]; a `title` attribute alone does not reach keyboard or touch users [O] | `text-overflow: ellipsis` or `line-clamp` with no tooltip that opens on focus, no expanded view and no detail page | The full value is shown elsewhere on the same screen |
| Amounts, dates, identifiers and anything the user compares are never truncated [T] | Ellipsis or clamp on a price, total, date or ID column | |
| End truncation makes values that differ only at the end identical [T] | End ellipsis on file names (`report-v12-final.pdf`), paths, or emails that share a long domain | The meaningful part is at the start; middle truncation is used |
| A line clamp needs its companion declarations or it does nothing [T] | `-webkit-line-clamp` without `display: -webkit-box` and `-webkit-box-orient: vertical` (or the standard `line-clamp` where supported) | |
| A tight `line-height` with `overflow: hidden` clips stacked diacritics and tall scripts [T] | `line-height: 1` (or less) plus `overflow: hidden` on text that can hold Vietnamese, Thai or other tall scripts | The product supports no such locale |

## Names, initials and missing values

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Initials taken by indexing a string cut emoji and combined characters; `Intl.Segmenter` with grapheme granularity keeps them whole [R] 2026-10-22 | `name[0]`, `.charAt(0)`, `.split(' ')[0][0]`, `.slice(0, 2)` to build initials | Initials come from a library that segments graphemes |
| Initials from the first and second word go wrong on suffixes, particles, extra spaces and names with no spaces (CJK) [T] | `words[0][0] + words[1][0]` with no trim, no last-word choice, no fallback icon | |
| A placeholder rendered for a missing optional field leaves an orphan dash or empty line [T] | `{role ?? '-'}` in its own line of a card or row | The design reserves the line deliberately |
| A record with a missing required-looking field (no name, only an email) needs a fallback [T] | `user.name` rendered with no fallback where the schema makes it optional | The schema makes it required |

## Numbers, plurals and dates

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Hard-coded plurals are wrong at 1 and in other languages; `Intl.PluralRules` gives up to six categories, and Arabic uses all six [R] 2026-10-22 | `` `${n} members` ``, or `n === 1 ? 'member' : 'members'`, in a product with more than English | The i18n library's plural API is used |
| A raw number renders `1284`, float noise, `NaN` or `undefined`; separators and decimals differ by locale [T] | `{count}`, `{price}` or `toFixed` output in JSX with no `Intl.NumberFormat` and no null guard | The value is an identifier, not a quantity |
| A percentage or progress value outside 0 to 100, or computed from a zero total, breaks the bar [T] | `width: ${pct}%` with no clamp; `done / total` with `total` possibly 0 | The schema bounds it |
| Proportional figures make a live-updating number jitter and columns misalign [T] | A counter, timer or numeric column with no `font-variant-numeric: tabular-nums` | Static numbers in prose |
| Hand-built relative times read "0 seconds ago" or "-3 days ago" and never switch to a date [T] | String concatenation of a time difference; no `Intl.RelativeTimeFormat` | A date library that handles thresholds and future dates |
| A date formatted without the user's time zone shows another day near midnight; a zero timestamp renders as 1970 [T] | `toISOString().slice(0, 10)` for display; no `timeZone` in `Intl.DateTimeFormat`; no guard on `0` or `null` | The value is a calendar date with no time |

## Lists, states and images

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Counts and pagination are off by one at exactly the page size and one more [T] | "Showing 40 of 40" logic, or a next-page link computed with `>=` that opens an empty page | |
| A raw error from the API reaches the user [T] | `{error.message}` or `String(err)` rendered in the UI | The message is a curated, user-facing field of the API contract |
| A broken image shows the browser's broken-image icon [T] | An `<img>` avatar with no `onError` fallback to initials | |
| An image of any aspect ratio in a fixed box is distorted [T] | Fixed `width` and `height` on an `<img>` with no `object-fit: cover` (or `contain`) | The source images are generated at that ratio |
| A front-end limit below the back end's lets longer values in through import or the API; no limit anywhere is unbounded [T] | `maxLength={50}` on a field the schema or column allows at 255; no limit in either | |

## Not a finding

- CJK text breaking between any two characters: that is correct line breaking.
- Truncated secondary metadata whose full value is on the same screen or one step away.
- A field the schema bounds below the length at which it breaks.
- Demo data in a story or fixture: only the shipped component is judged.
- `word-break: break-all` on a hash, token or code value.
