---
name: worst-case-data
description: Use at the tests stage when a change renders data in UI, to choose the worst realistic value for each displayed field - names, strings, numbers, collections, times, media and states - so a test fails where the layout or formatting would break on real data.
verified: 2026-10-22
---

# Worst-case data for UI tests

## Goal

- **Lets the expert catch:** a test plan whose fixtures are demo data chosen, usually without anyone noticing, to make the design look good, so every case passes and the long name, the count of one and the empty list ship broken.
- **Applies to:** test plans for components and screens that render data.
- **Not for:** why a value breaks the layout (`ui-on-real-data`, review); UTF-16 lengths, reserved domains and whether a test can fail (quality, `test-craft`); right-to-left and narrow-viewport cases (`rtl-and-direction`, `responsive-and-devices`).

Sources: **[T]** Emil Kowalski's `break-ui` skill and its catalogue (MIT, commit 2d22863), not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The fields the component renders**, including the ones people forget: counts in headers, relative times, badge and status text, labels that come from data, tooltips, avatars, and the length of the list itself [T].
- **Each field's limit** from the schema, the column or the API type; with no limit, the field is unbounded and gets a long but believable value [T].

## How to choose values

| Rule | What a weak test plan shows | When it does not apply |
|---|---|---|
| Every value is one a real user produces, or the schema's own limit; never random filler like a 5,000-character string [T] | `'a'.repeat(5000)`, lorem ipsum, or no worst case at all | A limit test at exactly the schema's maximum |
| The worst case enters through the same boundary as the demo data (fixture, mock, props, API stub), never by editing the component [T] | A test that patches the component's markup or CSS to force the break | |
| One worst-case dataset spreads different failures across the first rows, as real data does, instead of stacking them in row 1 [T] | A list fixture whose first item carries every extreme | |
| Empty, one and many are separate cases, not one dataset [T] | No zero-item case, no case where every count is exactly 1 | |

## Values by kind

Use `example.com`, `example.org` or `.test` for emails and URLs [T].

| Kind | Values |
|---|---|
| Names | a long hyphenated name with diacritics; a name with a suffix ("III"); two letters; one letter; stacked Vietnamese diacritics; CJK with no spaces; an RTL name; lowercase particles ("de la"); an emoji first character and a ZWJ emoji sequence; leading, trailing and doubled spaces; no name at all |
| Strings | a long email on a long domain; the shortest real email; a plus address; a long URL with a query string; a UUID; a long file name that differs only in its version; a long single-word compound (German); a translated label; empty and whitespace-only titles; a newline in a single-line field |
| Numbers | 0, 1, a thousands value, a million, a large currency amount, a negative, a floating-point sum, over 100 percent, `null`, a value that ticks from 99 to 100, the same value in two locales |
| Collections | empty, one item, exactly a page, a page plus one, an unpaginated list at its realistic maximum, one item far larger than the rest, items with identical names |
| Time | now, a future date, a zero timestamp, 23:30 in a negative UTC offset, a duration in thousands of hours |
| Media and states | a 404 avatar, no avatar, a panorama and a tall image, a dark logo on a dark theme, loading, an API error, partial data, every enum status at once, no permission, the current user in the list |

## Not a finding

- A fixture that already covers the value through the schema's limit.
- A missing case for a field the schema bounds below the length at which it breaks.
- Random or implausible values left out on purpose.
