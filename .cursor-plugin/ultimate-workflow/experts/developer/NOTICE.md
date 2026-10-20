# Notice

The developer expert's checklists restate ideas from the open-source review guides below. No text is copied; the wording is our own. They are credited here because the ideas are theirs.

| Source | Licence | What the ideas informed |
|---|---|---|
| affaan-m/ECC, its code-reviewer agent | MIT | The evidence gate before a finding, high severity needing proof, and the list of false positives that became the "Do not report" list |
| addyosmani/agent-skills, `code-review-and-quality`, `code-simplification`, `api-and-interface-design` | MIT | Complexity relocated rather than removed, feature logic leaking into shared code, near-duplicates of a canonical helper, the second-caller test for an abstraction, "maintain balance" |
| anthropics/claude-plugins-official, `pr-review-toolkit` agents (silent-failure hunter, type-design analyser) | Apache-2.0 | Swallowed failures and fallbacks that make failure look like success |

Trail of Bits `sharp-edges` (CC BY-SA 4.0) shaped the "wrong or hidden meaning" category (a zero or empty value that disables a check). Only the idea is used; nothing is copied, so its share-alike terms are not triggered. If text from it is ever adapted, this file and the licence of the adapted file must change first.

The sources were read as data. None of their scripts, hooks or fetches are used.
