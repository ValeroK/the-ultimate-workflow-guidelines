# Run journal: calc

Lessons from each card of this run, for the cards after it. Not committed; harvest reads it at the end.

## add (committed) 2026-11-07T20:47

- Layout: one function per file in src/<name>.js (CommonJS, module.exports = function), tests in test/<name>.test.js with node:test + node:assert.
- add validates both args with Number.isInteger and throws TypeError whose message names the argument ("a must be an integer, got ...").
- Later cards should reuse that error style (TypeError naming the param).
- Tests only cover a non-integer a; b rejection is implemented but untested.

## sub (committed) 2026-11-07T20:48

- Committed in 1 round, 2 files (src/sub.js, test/sub.test.js), no findings.
- Convention: one module per op in src/<op>.js using module.exports = function; tests in test/<op>.test.js with node:test and node:assert.
- Validation: Number.isInteger on each arg, throws TypeError with message "<name> must be an integer, got <value>"; tests match the arg name with /\bb\b/.
- Later cards should reuse this error message format and the arg names a and b.

## parse (committed) 2026-11-07T20:50

- Committed in 1 round, 0 findings; nothing tripped it up.
- Convention: CommonJS, one function per file in src/ via module.exports, tests in test/*.test.js using node:test and node:assert.
- parse (src/parse.js) takes a string, regex-matches integer a, operator +/-, integer b (optional spaces, negative operands allowed), and delegates to add and sub.
- Unsupported input throws SyntaxError "cannot parse expression: ..."; later cards should keep that error type.
- Only + and - are supported; any new operator needs both a regex change and a new branch in parse.

## format (committed) 2026-11-07T20:51

- format.js follows the add/sub convention: one module.exports function, Number.isInteger guard throwing TypeError with "x must be an integer, got ${x}".
- Output is "= n" (template string); negatives render as "= -4".
- Tests use node:test + node:assert, one file per module in test/, requiring ../src/<name>.
- format test composes with parse (format(parse('1+2')) === '= 3'); a later card wiring parse and format can rely on that.
- One round, 2 files, 1 finding; no trouble worth flagging.

## findings (committed) 2026-11-07T20:53

- Test-only card: added add() non-integer b test and format() non-integer n test; no source changes, zero findings.
- Convention: validation tests use assert.throws with TypeError and a /\bx\b/ regex on the argument name.
- Later cards: error messages must name the offending argument (a, b, n).

## fixup (committed) 2026-11-07T20:54

- Fixup added one test only (test/sub.test.js): sub(0.5, 1) throws TypeError naming a; no source change.
- Convention: validation tests assert TypeError and a word-boundary regex on the argument name (/\ba\b/, /\bb\b/).
- Nothing else to pass on.
