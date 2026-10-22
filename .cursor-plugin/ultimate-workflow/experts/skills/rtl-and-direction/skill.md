---
name: rtl-and-direction
description: Use when a change touches layout, alignment, spacing, icons, scrolling or text rendering in a web UI for a product that supports right-to-left languages (Arabic, Hebrew, Persian, Urdu), to find what breaks when the direction flips - physical properties, row-reverse added for RTL, scrollLeft assumed positive, numbers and URLs with no isolation, icons that should or should not mirror, and portals that lose the direction.
verified: 2026-10-22
---

# Right-to-left and direction

## Goal

- **Lets the expert catch:** a layout that is correct left to right and wrong right to left: spacing and alignment that do not flip, a reversal that flips twice, scroll code that assumes positive offsets, a phone number or URL scrambled by the bidirectional algorithm, a back arrow that points forward, and an overlay rendered outside the element that carries `dir`.
- **Applies to:** styles and utility classes that set sides (`margin-left`, `pl-4`, `left-0`, `text-align`), flex and grid direction, scroll code, icons, components that render user text, numbers or URLs inside translated text, and portals.
- **Not for:** translation workflow and copy (never a finding); plurals, numbers and dates by locale (`ui-on-real-data`); keyboard and screen-reader paths (`semantics-and-aria`).

Sources: **[R]** the maintainer's live check of MDN and Sonner's source, blocks G and K (2026-10-22); **[T]** skills-il/localization `hebrew-rtl-best-practices` (MIT), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **Whether the product supports a right-to-left locale.** If it does not, by decision, this skill has nothing to report: say so and stop.
- **Where `dir` is set**: on `<html>` from the locale, or per component; and whether the CSS framework has `rtl:` and `ltr:` variants or logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`).
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Layout

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Logical properties follow `writing-mode` and `direction`; physical ones do not [R] | New `margin-left`, `padding-right`, `left:`, `border-left`, `text-align: left`, or `ml-`, `pr-`, `left-` utilities, on layout that should mirror | Something that must not mirror (a media scrubber, a code block); an `rtl:` override beside it |
| In RTL `flex-direction: row` already runs right to left, so `row-reverse` added "for RTL" makes it run left to right again [R] | `row-reverse` or `flex-row-reverse` applied under `[dir=rtl]`, an `rtl:` variant or a locale check | Reversal that is wanted in both directions |
| Transforms and absolute offsets do not mirror [O] | `translateX(-100%)` for an off-canvas drawer, or `left: 0` for a side sheet, with no RTL counterpart | |
| Background positions, gradients and shadows with a horizontal offset do not mirror [O] | `background-position: left`, `linear-gradient(to right, ...)` as a fade at the reading edge | Purely decorative symmetry |

## Scrolling and measurement

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| In an RTL scroll container `scrollLeft` is 0 at the start and negative toward the end [R] | Carousel, virtual-list or "scroll to end" code that assumes `scrollLeft` grows positive, or clamps it at 0 | Code that reads `direction` and handles both |
| `getBoundingClientRect().left` and pointer `clientX` stay physical, so drag and slider maths must flip in RTL [O] | A slider or drag that computes progress as `(x - rect.left) / rect.width` with no direction check | |

## Text and isolation

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Phone numbers, codes, URLs and email addresses stay left to right inside RTL text, and need isolating (`<bdi>`, `dir="ltr"`, `unicode-bidi: isolate`) or the punctuation moves [T] | Such a value interpolated into a translated RTL sentence or label with no isolation | |
| User-entered text of unknown direction gets `dir="auto"` [T] | A comment, name or message field rendered or edited with the page's `dir` | Fields constrained to one script |
| A Latin brand name or number at the start or end of an RTL string can move to the wrong end without isolation [T] | `${count} ${t('items')}` or a product name concatenated at the edge of an RTL string | The i18n library inserts isolation marks |

## Icons

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Icons that show direction mirror in RTL: back and forward arrows, chevrons in breadcrumbs and pagination, send, undo and redo, text alignment [T] | A new directional icon with no `rtl:-scale-x-100`, `[dir=rtl]` flip or mirrored variant | |
| Icons that show real-world objects or time do not mirror: play and media controls, clocks, checkmarks, logos, a slash in a search icon [T] | A blanket `[dir=rtl] svg { transform: scaleX(-1) }` | |

## Portals and overlays

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A modal, popover or toast portalled to `body` loses a `dir` set on an inner element [T] | `dir` set on a layout wrapper rather than `<html>`, with portalled overlays | `dir` on `<html>`; the primitive's direction provider wraps the portals |

## Cases for the tests stage

What only rendering shows becomes a test case: each changed screen with `dir="rtl"` on `<html>`, with a real RTL string; a phone number and a URL inside an RTL sentence; a carousel or list scrolled to its end in RTL; a slider dragged in RTL.

## Not a finding

- Anything in a product that does not support RTL, by decision.
- A physical property on something that must not mirror, with a comment or an `rtl:` override.
- `row-reverse` that is wanted in both directions.
- Sonner's `<Toaster />` with no `dir`: it defaults to `auto`, from the document [R].
