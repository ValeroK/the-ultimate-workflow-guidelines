'use strict';

// PLAN-simplify, card one-resume. The resume object the run is given is built by one pure function of the card
// fields in the plan (decision, parked), what unpark brought back, and what the user asked for. The flags only
// say which card and why; they carry no state of their own.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const rules = require(path.join(PLUGIN, 'lib', 'run-rules.js'));

test('resume: the resume object is built by one pure function from the flags and the card fields', () => {
  assert.strictEqual(typeof rules.resumeObject, 'function');
  // No flag: nothing to build.
  assert.strictEqual(rules.resumeObject({ flag: null }), null);
  // --resume with no card: resume everything left.
  assert.deepStrictEqual(rules.resumeObject({ flag: { all: true } }), { all: true });
  // A parked card with no decision: continues from its parked work, with the test files unpark brought back.
  assert.deepStrictEqual(
    rules.resumeObject({ flag: { card: 'b', reason: 'fixed the test', accept: false }, held: { name: 'b', parked: { branch: 'uw/parked/f/b' } }, back: { testFiles: ['t.js'] }, feature: 'f' }),
    { card: 'b', reason: 'fixed the test', testFiles: ['t.js'] }
  );
  // A held decision, accepted: the decision rides along.
  assert.deepStrictEqual(
    rules.resumeObject({ flag: { card: 'b', reason: 'ok', accept: true }, held: { name: 'b', decision: 'adds a dependency' }, back: { testFiles: [] }, feature: 'f' }),
    { card: 'b', reason: 'ok', testFiles: [], accepted: 'adds a dependency' }
  );
  // A held decision, not accepted: the card runs again from its tests and avoids the decision; the branch comes from the plan field.
  assert.deepStrictEqual(
    rules.resumeObject({ flag: { card: 'b', reason: 'no', accept: false }, held: { name: 'b', decision: 'adds a dependency', parked: { branch: 'uw/parked/f/b' } }, feature: 'f' }),
    { card: 'b', rerun: true, reason: 'no', avoid: 'adds a dependency', heldBranch: 'uw/parked/f/b' }
  );
  // ... and when the plan has no parked field the branch is the computed one.
  assert.strictEqual(rules.resumeObject({ flag: { card: 'b', reason: 'no' }, held: { name: 'b', decision: 'd' }, feature: 'f' }).heldBranch, 'uw/parked/f/b');
});

test('resume: --resume-card and --resume-reason only name the card and the reason, and deleting parked.md changes nothing the resume decides', () => {
  const a = rules.resumeObject({ flag: { card: 'B', reason: 'r' }, held: { name: 'b', parked: { branch: 'x' } }, back: { testFiles: [] }, feature: 'f' });
  assert.strictEqual(a.card, 'B', 'the card as the user named it, matched to the plan case-insensitively by the caller');
  const src = require('node:fs').readFileSync(path.join(PLUGIN, 'lib', 'run-rules.js'), 'utf8');
  assert.ok(!/parked\.md/.test(src.slice(src.indexOf('function resumeObject'))), 'the resume form reads no parked.md');
});
