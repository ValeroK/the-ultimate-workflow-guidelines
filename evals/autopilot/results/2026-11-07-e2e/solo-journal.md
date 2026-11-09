# Run journal: calc

Lessons from each card of this run, for the cards after it. Not committed; harvest reads it at the end.

## add (committed) 2026-11-07T20:47

- Code is CommonJS: one function per file in src/, exported via module.exports = function name.
- Input validation uses Number.isInteger and throws TypeError whose message names the argument ("a must be an integer").
- Tests use node:test + node:assert (strictEqual, throws with {name, message}); files in test/<name>.test.js.
- Later cards (e.g. sub/mul) should follow the same file layout and validation message format.
- Committed after 1 round, 2 files, 1 review finding; no trip-ups recorded.

## findings (committed) 2026-11-07T20:48

- Committed in 1 round; only test/add.test.js changed (4 lines added), no source changes.
- Zero findings recorded; nothing tripped it up.
- Later cards: tests live in test/<name>.test.js, one file per function.
