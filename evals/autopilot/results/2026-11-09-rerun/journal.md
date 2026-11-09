# Run journal: calc

Lessons from each card of this run, for the cards after it. Not committed; harvest reads it at the end.

## add (committed) 2026-11-09T08:25

- add committed in 1 round; src/add.js (CommonJS, module.exports = fn) and test/add.test.js.
- Convention: node:test + node:assert, tests in test/<name>.test.js, require('../src/<name>').
- Convention: validate with Number.isInteger, throw TypeError with message "<arg> must be an integer".
- Gap: test only covers non-integer a; the b check is untested. Later cards should test both args.
- The commit also touched PLAN-calc.md (+5 lines), which was already modified in the tree; later cards should not assume it is clean.

## sub (committed) 2026-11-09T08:27

- Clean pass: 1 round, 2 files (src/sub.js, test/sub.test.js), no findings.
- Convention: modules use CommonJS, export the function via module.exports = sub (default export of one function).
- Convention: args validated with Number.isInteger; throws TypeError with message naming the arg ("a must be an integer", "b must be an integer").
- Tests use node:test + node:assert (strictEqual, throws with { name, message: /\bb\b/ }).
- parse card can require ../src/add and ../src/sub directly; both throw TypeError on non-integers, so parse should validate/convert operands to integers first.

## parse (committed) 2026-11-09T08:28

- Committed in 1 round, 0 findings; no trouble.
- src/parse.js exports a single function via module.exports = parse (CommonJS, like add and sub).
- parse returns a Number and throws SyntaxError on anything but "int op int" (spaces allowed, ints only, no negatives).
- Tests use node:test + node:assert, strictEqual and assert.throws with { name: 'SyntaxError' }.
- format card depends on parse: it should take the Number parse returns and produce "= n".
- The commit also touched PLAN-calc.md (experts and card status), not only the card paths.

## format (committed) 2026-11-09T08:30

- Clean card, 1 round, no findings. src/format.js exports a single function via module.exports = format (same CommonJS style as add/sub/parse).
- parse returns a number; format(parse("1+2")) gives "= 3". Tests use node:test and node:assert with relative requires.
- The card commit also rewrites PLAN-calc.md status lines (pending -> committed); expect that in the diff.

## findings (committed) 2026-11-09T08:32

- Test-only change in test/add.test.js: exact messages 'a must be an integer' / 'b must be an integer' now asserted, plus a new b-validation test.
- Convention: add validation errors are TypeError with message "<name> must be an integer"; sub likely follows it, keep tests exact-match.
- Carried findings went through in one round; PLAN-calc.md status lines record the commit hash.
