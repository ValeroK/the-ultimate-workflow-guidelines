# Run journal: calc

Lessons from each card of this run, for the cards after it. Not committed; harvest reads it at the end.

## add (committed) 2026-11-09T09:24

- Needed one fix round; committed with 0 findings after it.
- Convention: one CommonJS module per card in src/<name>.js, exporting the function via module.exports; tests in test/<name>.test.js.
- Validation order: Number.isInteger -> TypeError, then Number.isSafeInteger -> RangeError, per argument name ('a', 'b').
- Result is also checked as a safe integer and throws RangeError('result must be a safe integer').
- Later cards (sub, mul, etc.) should follow the same guards and test each guard separately, with safe-integer fixtures.
- checkArgument is private to src/add.js; reuse needs a shared helper, which the plan did not ask for.

## sub (committed) 2026-11-09T09:25

- sub committed in 1 round, 0 findings; files: src/sub.js, test/sub.test.js (plus PLAN status update).
- Convention: CommonJS, module.exports = function; node:test + node:assert.
- Guards, in order: checkArgument per arg (TypeError if not integer, RangeError "<name> must be a safe integer"), then result check (RangeError "result must be a safe integer").
- Tests assert error type and message naming the offending arg (a, b, result); parse should expect the same errors from add/sub.
- checkArgument is duplicated per file, not shared; a later card should not assume a common helper exists.

## parse (committed) 2026-11-09T09:26

- parse.js is CommonJS: require('./add'), module.exports = function; tests use node:test + node:assert strictEqual/throws with { name }.
- Errors: unparseable input throws SyntaxError; operand range/type checks are delegated to add/sub (RangeError for unsafe ints), not duplicated in parse.
- Grammar: optional surrounding spaces, signed integers, only + and - (regex EXPRESSION in src/parse.js). parse returns a plain number.
- format card: take parse's number result (not a string); do not re-parse expressions.
- PLAN-calc.md is edited by the run each card (status/committed lines); leave it alone.

## format (committed) 2026-11-09T09:27

- format: src/format.js exports a single function via module.exports (CommonJS), same as the other cards.
- format throws TypeError('n must be an integer') for non-integers; callers must pass integers.
- Output is exactly "= n" (one space after "="); parse results can be passed straight in.
- Commit also touched PLAN-calc.md (uncommitted plan edit rode along); keep plan edits out of card commits.

## findings (committed) 2026-11-09T09:29

- Hardened existing modules: format.js now throws RangeError (naming n) for unsafe integers, after the TypeError check for non-integers.
- parse.js: operands over ~309 digits become Infinity via Number(); guarded with Number.isFinite and RangeError naming a or b. Unsafe-but-finite operands are left to add/sub.
- Error convention: TypeError for wrong type, RangeError for out of range, messages name the argument (n, a, b); tests match with /\bn\b/.
- Tests use node:test with assert.throws({ name, message }). Infinity from format is a TypeError (not an integer).
- Finished in 1 round; no card is left depending on this one.

## fixup (committed) 2026-11-09T09:31

- Fixup added boundary tests only: add(MAX_SAFE-1,1) and sub(MIN_SAFE+1,1) return the exact limit; no src changes.
- Tests in test/add.test.js and test/sub.test.js are node:test with assert.strictEqual/throws; keep that style.
- Safe-range errors are RangeError naming a, b, or result; tests match on message regex.
- Still open from earlier findings: format.js checks only Number.isInteger (no safe-integer rule) and parse.js operands over ~309 digits give TypeError, not RangeError.
- Fixup touched PLAN-calc.md status lines too; the plan file is edited by the run itself.
