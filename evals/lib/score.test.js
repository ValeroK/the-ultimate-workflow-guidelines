'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { score, compare, pathMatches } = require('./score.js');

// --- path matching ---------------------------------------------------------
// Trajectories record absolute paths; fixtures name repo-relative ones. If
// these do not meet, every retrieval check silently fails and the eval reports
// a regression that is really a bug in the scorer.

test('an absolute recorded path matches a repo-relative expectation', () => {
  assert.equal(pathMatches('C:\\proj\\memory\\hooks-and-gates.md', 'memory/hooks-and-gates.md'), true);
  assert.equal(pathMatches('/home/k/proj/memory/hooks-and-gates.md', 'memory/hooks-and-gates.md'), true);
});

test('path matching is separator- and case-agnostic', () => {
  assert.equal(pathMatches('C:/Proj/Memory/Hooks-And-Gates.MD', 'memory/hooks-and-gates.md'), true);
});

test('a different file does not match', () => {
  assert.equal(pathMatches('C:/proj/memory/mirrors.md', 'memory/hooks-and-gates.md'), false);
});

// --- retrieval -------------------------------------------------------------

test('a fixture passes when the required file was read', () => {
  const r = score(
    { id: 'C5', mustRead: ['memory/hooks-and-gates.md'] },
    { filesRead: ['C:/proj/memory/hooks-and-gates.md'], filesWritten: [] }
  );
  assert.equal(r.pass, true);
});

test('a fixture fails, and says why, when retrieval did not fire', () => {
  const r = score(
    { id: 'C5', mustRead: ['memory/hooks-and-gates.md'] },
    { filesRead: ['C:/proj/README.md'], filesWritten: [] }
  );
  assert.equal(r.pass, false);
  assert.match(r.failures[0], /retrieval did not fire/);
});

// --- negative controls -----------------------------------------------------
// These are the load-bearing ones. Without them the eval rewards reading
// everything, which scores well while undoing the entire point of moving
// content out of always-on context.

test('reading something unnecessary is a failure, not a neutral act', () => {
  const r = score(
    { id: 'C2', mustNotRead: ['memory/hooks-and-gates.md'] },
    { filesRead: ['C:/proj/memory/hooks-and-gates.md'], filesWritten: [] }
  );
  assert.equal(r.pass, false);
  assert.match(r.failures[0], /over-retrieval/);
});

test('a trivial task passes by reading nothing extra', () => {
  const r = score(
    { id: 'C2', mustNotRead: ['memory/hooks-and-gates.md'], mustNotWrite: ['PLAN-typo.md'] },
    { filesRead: ['C:/proj/README.md'], filesWritten: ['C:/proj/README.md'] }
  );
  assert.equal(r.pass, true);
});

// --- scope -----------------------------------------------------------------

test('touching an out-of-scope file fails the surgical-scope fixture', () => {
  const r = score(
    { id: 'C4', mustNotWrite: ['hooks/lib/gates.js'] },
    { filesRead: [], filesWritten: ['C:/proj/hooks/lib/gates.js'] }
  );
  assert.equal(r.pass, false);
  assert.match(r.failures[0], /out of scope/);
});

test('a constraint must be surfaced, not merely obeyed silently', () => {
  const r = score(
    { id: 'C1', mustMention: ['package.json'] },
    { filesRead: [], filesWritten: [], summary: 'Added validation using only Node builtins.' }
  );
  assert.equal(r.pass, false);
  assert.match(r.failures[0], /was not surfaced/);
});

test('every check is reported, passing and failing alike', () => {
  const r = score(
    { id: 'X', mustRead: ['a.md'], mustNotWrite: ['b.js'] },
    { filesRead: ['a.md'], filesWritten: ['b.js'] }
  );
  assert.equal(r.checks.length, 2);
  assert.equal(r.checks.filter((c) => c.ok).length, 1);
});

// --- fat vs thin comparison ------------------------------------------------

test('a fixture that passed fat and fails thin is a regression', () => {
  const c = compare([{ id: 'C1', pass: true }], [{ id: 'C1', pass: false, failures: ['x'] }]);
  assert.equal(c.regressions.length, 1);
  assert.match(c.verdict, /REGRESSION/);
});

test('the regression verdict names section-level rollback, not reverting the change', () => {
  const c = compare([{ id: 'C1', pass: true }], [{ id: 'C1', pass: false, failures: ['x'] }]);
  assert.match(c.verdict, /restore the section/);
});

test('no regression is claimed as exactly that, and nothing stronger', () => {
  const c = compare([{ id: 'C1', pass: true }], [{ id: 'C1', pass: true }]);
  assert.equal(c.regressions.length, 0);
  assert.match(c.verdict, /nothing stronger/);
});

test('a fixture failing under both configurations is not a regression', () => {
  const c = compare([{ id: 'C3', pass: false }], [{ id: 'C3', pass: false, failures: ['y'] }]);
  assert.equal(c.regressions.length, 0);
  assert.equal(c.stable.length, 1);
});

test('a fixture that only passes thin is recorded as a fix, not ignored', () => {
  const c = compare([{ id: 'C6', pass: false }], [{ id: 'C6', pass: true }]);
  assert.deepEqual(c.fixes, ['C6']);
});
