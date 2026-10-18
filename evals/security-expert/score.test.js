'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { scoreRuns, matches } = require('./lib/score-corpus.js');

const MANIFEST = [
  { id: 's01', kind: 'seeded', category: 'command injection', file: 'scripts/run.py', line: 40 },
  { id: 's02', kind: 'seeded', category: 'path traversal', file: 'tools/serve.py', line: 12 },
  { id: 'b01', kind: 'benign', category: 'safe subprocess', file: 'scripts/safe.py', line: 8 },
];

const f = (file, line, what = 'x') => ({ file, line, what, confidence: 'high' });

test('a finding matches a seeded case by file and a line tolerance', () => {
  const c = MANIFEST[0];
  assert.strictEqual(matches(f('scripts/run.py', 40), c), true);
  assert.strictEqual(matches(f('scripts/run.py', 49), c), true, 'within the tolerance');
  assert.strictEqual(matches(f('scripts/run.py', 51), c), false, 'outside the tolerance');
  assert.strictEqual(matches(f('scripts/other.py', 40), c), false, 'wrong file');
});

test('file matching is by path suffix and ignores separators, a leading ./ and the repo root prefix', () => {
  const c = MANIFEST[0];
  assert.strictEqual(matches(f('./scripts/run.py', 40), c), true);
  assert.strictEqual(matches(f('scripts\\run.py', 40), c), true);
  assert.strictEqual(matches(f('/home/user/wt/s01/scripts/run.py', 40), c), true);
  assert.strictEqual(matches(f('myscripts/run.py', 40), c), false, 'a different directory ending the same way is not a match');
});

test('a missing or non-numeric line never matches', () => {
  assert.strictEqual(matches({ file: 'scripts/run.py', what: 'x' }, MANIFEST[0]), false);
  assert.strictEqual(matches({ file: 'scripts/run.py', line: 'forty' }, MANIFEST[0]), false);
});

test('recall counts seeded cases found; false positives count benign runs with any finding', () => {
  const runs = [
    { caseId: 's01', arm: 'A', run: 1, findings: [f('scripts/run.py', 41)] },
    { caseId: 's02', arm: 'A', run: 1, findings: [] },
    { caseId: 'b01', arm: 'A', run: 1, findings: [f('scripts/safe.py', 8)] },
    { caseId: 's01', arm: 'B', run: 1, findings: [f('scripts/run.py', 40)] },
    { caseId: 's02', arm: 'B', run: 1, findings: [f('tools/serve.py', 12)] },
    { caseId: 'b01', arm: 'B', run: 1, findings: [] },
  ];
  const r = scoreRuns(MANIFEST, runs);
  assert.deepStrictEqual([r.arms.A.seededHits, r.arms.A.seededRuns, r.arms.A.benignFalsePositives, r.arms.A.benignRuns], [1, 2, 1, 1]);
  assert.deepStrictEqual([r.arms.B.seededHits, r.arms.B.seededRuns, r.arms.B.benignFalsePositives, r.arms.B.benignRuns], [2, 2, 0, 1]);
  assert.strictEqual(r.arms.A.recall, 0.5);
  assert.strictEqual(r.arms.B.recall, 1);
});

test('findings that are not the planted one are counted as extras, separately from recall', () => {
  const runs = [{ caseId: 's01', arm: 'A', run: 1, findings: [f('scripts/run.py', 40), f('scripts/run.py', 200), f('other/file.py', 3)] }];
  const r = scoreRuns(MANIFEST, runs);
  assert.strictEqual(r.arms.A.seededHits, 1);
  assert.strictEqual(r.arms.A.extraFindings, 2);
});

test('a run that failed or returned nothing parseable is a miss AND is reported as a failed run, never silently dropped', () => {
  const runs = [
    { caseId: 's01', arm: 'A', run: 1, error: 'agent timed out' },
    { caseId: 's02', arm: 'A', run: 1, findings: [f('tools/serve.py', 12)] },
  ];
  const r = scoreRuns(MANIFEST, runs);
  assert.strictEqual(r.arms.A.failedRuns, 1);
  assert.strictEqual(r.arms.A.seededRuns, 2, 'the failed run still counts in the denominator');
  assert.strictEqual(r.arms.A.seededHits, 1);
  assert.strictEqual(r.arms.A.recall, 0.5);
});

test('a benign run that failed is not counted as a clean pass', () => {
  const r = scoreRuns(MANIFEST, [{ caseId: 'b01', arm: 'A', run: 1, error: 'boom' }]);
  assert.strictEqual(r.arms.A.benignRuns, 1);
  assert.strictEqual(r.arms.A.failedRuns, 1);
  assert.strictEqual(r.arms.A.benignClean, 0, 'a failed run proves nothing about a benign case');
});

test('with several runs per case, a case counts as found only by hits/runs, and the per-case table keeps the raw counts', () => {
  const runs = [
    { caseId: 's01', arm: 'A', run: 1, findings: [f('scripts/run.py', 40)] },
    { caseId: 's01', arm: 'A', run: 2, findings: [] },
    { caseId: 's01', arm: 'A', run: 3, findings: [f('scripts/run.py', 40)] },
  ];
  const r = scoreRuns(MANIFEST, runs);
  assert.deepStrictEqual(r.perCase.s01.A, { hits: 2, runs: 3 });
  assert.strictEqual(r.arms.A.seededHits, 2);
});

test('the paired view lists cases where two arms differ, so a mean cannot hide which cases flipped', () => {
  const runs = [
    { caseId: 's01', arm: 'A', run: 1, findings: [f('scripts/run.py', 40)] },
    { caseId: 's01', arm: 'B', run: 1, findings: [] },
    { caseId: 's02', arm: 'A', run: 1, findings: [] },
    { caseId: 's02', arm: 'B', run: 1, findings: [f('tools/serve.py', 12)] },
  ];
  const r = scoreRuns(MANIFEST, runs);
  assert.deepStrictEqual(r.flips('A', 'B').map((x) => [x.id, x.A, x.B]), [['s01', 1, 0], ['s02', 0, 1]]);
});

test('a result for a case that is not in the manifest is an error, not ignored', () => {
  assert.throws(() => scoreRuns(MANIFEST, [{ caseId: 's99', arm: 'A', run: 1, findings: [] }]), /s99/);
});
