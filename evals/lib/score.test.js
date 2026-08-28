'use strict';

const test = require('node:test');
const assert = require('node:assert');

const fs = require('node:fs');
const path = require('node:path');

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

// --- regressions from the v3.0.0 /review run --------------------------------

test('a same-named file in a different directory is NOT a match', () => {
  // The matcher used to end with an unanchored `endsWith(expected)`, so these
  // both returned true. That corrupts the negative controls in both directions:
  // mustNotRead reports over-retrieval for a file never opened, and mustRead
  // passes on a same-named file somewhere else entirely.
  assert.equal(pathMatches('C:/proj/docs/team-memory/mirrors.md', 'memory/mirrors.md'), false);
  assert.equal(pathMatches('C:/proj/x/notmemory/hooks-and-gates.md', 'memory/hooks-and-gates.md'), false);
  assert.equal(pathMatches('C:/proj/src/mypackage.json', 'package.json'), false);
});

test('a genuine path suffix still matches, on either separator', () => {
  assert.equal(pathMatches('C:\\proj\\memory\\mirrors.md', 'memory/mirrors.md'), true);
  assert.equal(pathMatches('/home/u/proj/memory/mirrors.md', 'memory/mirrors.md'), true);
  assert.equal(pathMatches('memory/mirrors.md', 'memory/mirrors.md'), true);
  assert.equal(pathMatches('C:/proj/package.json', 'package.json'), true);
});

test('the recorded baselines score exactly what results/README.md claims', () => {
  // The only test that touched the baselines asserted `typeof pass === 'boolean'`,
  // which is true for every possible input. So the numbers the README calls "a
  // usable baseline going forward" were computed by nothing: tighten one
  // expectation and the documented baseline silently becomes false while the
  // suite stays green. A baseline nothing recomputes is a claim, not a baseline.
  const { FIXTURES } = require('../expectations.js');
  const results = path.join(__dirname, '..', 'results');

  const scoreRun = (file) => {
    const run = JSON.parse(fs.readFileSync(path.join(results, file), 'utf8'));
    const byId = new Map(run.trajectories.map((t) => [t.id, t]));
    const scored = FIXTURES.map((f) => score(f, byId.get(f.id)));
    return {
      passed: scored.filter((s) => s.pass).length,
      failing: scored.filter((s) => !s.pass).map((s) => s.id),
    };
  };

  const fat = scoreRun('fat.json');
  const thin = scoreRun('thin.json');

  assert.equal(thin.passed, 8, `thin baseline moved: now ${thin.passed}/8, failing ${thin.failing}`);
  assert.deepEqual(thin.failing, []);
  assert.equal(fat.passed, 4, `fat baseline moved: now ${fat.passed}/8`);
  assert.deepEqual(fat.failing, ['C1', 'C5', 'C6', 'C8']);

  // compare() must agree with the arithmetic, or the verdict string lies.
  const cmp = compare(FIXTURES.map((f) => score(f, new Map(JSON.parse(fs.readFileSync(path.join(results, 'fat.json'), 'utf8')).trajectories.map((t) => [t.id, t])).get(f.id))),
                      FIXTURES.map((f) => score(f, new Map(JSON.parse(fs.readFileSync(path.join(results, 'thin.json'), 'utf8')).trajectories.map((t) => [t.id, t])).get(f.id))));
  assert.deepEqual(cmp.regressions, [], 'a regression appeared against the recorded runs');
});
