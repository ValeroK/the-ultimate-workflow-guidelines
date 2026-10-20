'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const score = require('./lib/score.js');
const select = require('./lib/select.js');
const thresholds = require('./thresholds.json');

const cases = [
  ...['s1', 's2', 's3', 's4'].map((id) => ({ id, kind: 'seeded' })),
  ...['b1', 'b2'].map((id) => ({ id, kind: 'benign' })),
  ...['x1', 'x2'].map((id) => ({ id, kind: 'sibling' })),
];

const rec = (caseId, run, labels = [], failed = false) => ({ arm: 'A', run, caseId, failed, labels: labels.map((l) => (typeof l === 'string' ? { label: l, evidence: 'complete' } : l)) });
const runs = (caseId, perRun) => perRun.map((labels, i) => rec(caseId, i + 1, labels));

function perfect() {
  return [
    ...['s1', 's2', 's3', 's4'].flatMap((id) => runs(id, [['planted'], ['planted'], ['planted']])),
    ...['b1', 'b2', 'x1', 'x2'].flatMap((id) => runs(id, [[], [], []])),
  ];
}

test('a perfect arm: everything found, nothing false, nothing leaked', () => {
  const s = score.summarise(cases, perfect());
  assert.equal(s.seeded.recall, 1);
  assert.equal(s.seeded.casesFoundMajority, 4);
  assert.equal(s.seeded.casesFoundAllRuns, 4);
  assert.equal(s.benign.fpRate, 0);
  assert.equal(s.sibling.leakRate, 0);
  assert.equal(s.failedRuns, 0);
});

test('recall counts runs and cases separately: a case found once in three is not found by majority', () => {
  const r = perfect().filter((x) => x.caseId !== 's1');
  r.push(...runs('s1', [['planted'], [], []]));
  const s = score.summarise(cases, r);
  assert.equal(s.seeded.runsFound, 10);
  assert.equal(s.seeded.casesFoundMajority, 3);
  assert.equal(s.seeded.casesFoundAllRuns, 3);
});

test('a failed run is a miss on a seeded case and is counted, never read as clean', () => {
  const r = perfect().filter((x) => x.caseId !== 's2');
  r.push(rec('s2', 1, [], true), rec('s2', 2, ['planted']), rec('s2', 3, ['planted']));
  const s = score.summarise(cases, r);
  assert.equal(s.failedRuns, 1);
  assert.equal(s.seeded.runsFound, 11);
});

test('false positives count only on benign cases, leaks only on sibling cases', () => {
  const r = perfect().filter((x) => x.caseId !== 'b1' && x.caseId !== 'x1');
  r.push(...runs('b1', [['false-positive'], [], ['false-positive']]));
  r.push(...runs('x1', [['out-of-domain'], ['out-of-domain'], []]));
  const s = score.summarise(cases, r);
  assert.equal(s.benign.fpRuns, 2);
  assert.equal(s.benign.runs, 6);
  assert.equal(s.sibling.leakRuns, 2);
  assert.equal(s.sibling.runs, 6);
  assert.equal(s.sibling.fpRuns, 0);
});

test('a finding that is a real defect the corpus author missed is reported, not counted as a false positive', () => {
  const r = perfect().filter((x) => x.caseId !== 'b2');
  r.push(...runs('b2', [['valid-other'], [], []]));
  const s = score.summarise(cases, r);
  assert.equal(s.benign.fpRuns, 0);
  assert.equal(s.findings.validOtherRuns, 1);
});

test('evidence completeness is the share of findings that carry a complete path', () => {
  const r = perfect().filter((x) => x.caseId !== 's3');
  r.push(...runs('s3', [[{ label: 'planted', evidence: 'none' }], [{ label: 'planted', evidence: 'partial' }], ['planted']]));
  const s = score.summarise(cases, r);
  assert.equal(s.findings.total, 12);
  assert.ok(Math.abs(s.findings.evidenceComplete - 10 / 12) < 1e-9);
});

test('an experiment with a missing or duplicated run is rejected instead of averaged', () => {
  assert.throws(() => score.summarise(cases, perfect().filter((x) => !(x.caseId === 's1' && x.run === 3))), /same, non-zero number of runs/);
  assert.throws(() => score.summarise(cases, [...perfect(), rec('s1', 1, ['planted'])]), /duplicate run numbers/);
  assert.throws(() => score.summarise(cases, perfect().filter((x) => x.caseId !== 'b1')), /same, non-zero number of runs/);
});

test('malformed records are rejected', () => {
  assert.throws(() => score.summarise(cases, [{ ...perfect()[0], labels: [{ label: 'great', evidence: 'complete' }] }]), /unknown label/);
  assert.throws(() => score.summarise(cases, [{ ...perfect()[0], failed: true, labels: [{ label: 'planted', evidence: 'complete' }] }]), /failed run cannot carry labels/);
  assert.deepEqual(score.recordProblems(perfect()[0]), []);
});

test('compare: a candidate that finds one more case with no more noise passes', () => {
  const base = perfect().filter((x) => x.caseId !== 's1' && x.caseId !== 's2');
  base.push(...runs('s1', [[], [], []]), ...runs('s2', [[], [], []]));
  const cand = perfect().filter((x) => x.caseId !== 's1');
  cand.push(...runs('s1', [[], [], []]));
  const b = score.summarise(cases, base);
  const c = score.summarise(cases, cand);
  const out = score.compare(c, b, thresholds);
  assert.equal(out.pass, true, JSON.stringify(out.checks.filter((x) => !x.ok)));
});

test('compare: equal recall, more false positives, a leak or a failed run each fail it, and say which', () => {
  const b = score.summarise(cases, perfect());
  const noisy = perfect().filter((x) => x.caseId !== 'b1');
  noisy.push(...runs('b1', [['false-positive'], [], []]));
  const sameRecall = score.compare(score.summarise(cases, perfect()), b, thresholds);
  assert.equal(sameRecall.pass, false, 'equal recall is not an improvement');
  assert.match(sameRecall.checks.find((x) => !x.ok).name, /recall/);

  const t = { ...thresholds, recallMarginCases: 0 };
  assert.equal(score.compare(score.summarise(cases, perfect()), b, t).pass, true);
  const fp = score.compare(score.summarise(cases, noisy), b, t);
  assert.match(fp.checks.filter((x) => !x.ok).map((x) => x.name).join('|'), /false positives/);

  const leaky = perfect().filter((x) => x.caseId !== 'x1');
  leaky.push(...runs('x1', [['out-of-domain'], ['out-of-domain'], ['out-of-domain']]));
  assert.match(score.compare(score.summarise(cases, leaky), b, t).checks.filter((x) => !x.ok).map((x) => x.name).join('|'), /leak/);

  const broken = perfect().filter((x) => x.caseId !== 'b2');
  broken.push(rec('b2', 1, [], true), rec('b2', 2), rec('b2', 3));
  assert.match(score.compare(score.summarise(cases, broken), b, t).checks.filter((x) => !x.ok).map((x) => x.name).join('|'), /failed runs/);
});

test('the thresholds file has every number the comparison reads, and they are sane', () => {
  for (const k of ['recallMarginCases', 'maxFpRateDelta', 'maxLeakRate', 'evidenceTolerance', 'minSelectionRecall', 'maxCofireRate', 'judgeAgreementMin', 'runsPerCase']) {
    assert.equal(typeof thresholds[k], 'number', k);
  }
  assert.ok(thresholds.recallMarginCases >= 1, 'a margin of zero cases cannot show an improvement');
  assert.ok(thresholds.runsPerCase >= 3, 'one run cannot show variance');
  assert.ok(thresholds.judgeAgreementMin >= 0.75);
});

const experts = ['alpha', 'beta'];
const sel = (origin, caseId, chosen, failed = false) => ({ origin, caseId, chosen, failed });

test('selection: own recall, benign choice and co-fire are counted from the right cases', () => {
  const selections = [
    sel('alpha:seeded', 'a1', ['alpha']),
    sel('alpha:seeded', 'a2', ['alpha', 'beta']),
    sel('alpha:benign', 'a3', ['alpha']),
    sel('alpha:sibling', 'a4', []),
    sel('beta:seeded', 'b1', ['beta']),
    sel('beta:seeded', 'b2', ['alpha']),
  ];
  const r = select.score(experts, selections);
  assert.equal(r.perExpert.alpha.ownRecall, 1);
  assert.equal(r.perExpert.alpha.benignChosen, 1);
  // foreign for alpha: beta's two seeded cases and alpha's one sibling case
  assert.equal(r.perExpert.alpha.foreignCases, 3);
  assert.equal(r.perExpert.alpha.cofireHits, 1);
  assert.equal(r.perExpert.beta.ownRecall, 0.5 + 0);
  assert.equal(r.perExpert.beta.cofireHits, 1);
  assert.equal(r.matrix['alpha:seeded'].alpha, 2);
  assert.equal(r.matrix['alpha:seeded'].beta, 1);
});

test('selection: a failed answer is not "chose nothing"', () => {
  const r = select.score(experts, [sel('alpha:seeded', 'a1', [], true), sel('alpha:seeded', 'a2', ['alpha'])]);
  assert.equal(r.perExpert.alpha.ownRecall, 0.5);
  assert.equal(r.perExpert.alpha.failed, 1);
  assert.equal(select.compare(r, thresholds).pass, false);
});

test('selection: compare passes only with high recall, low co-fire and no failures', () => {
  const good = [];
  for (let i = 0; i < 10; i += 1) good.push(sel('alpha:seeded', `a${i}`, ['alpha']), sel('beta:seeded', `b${i}`, ['beta']));
  assert.equal(select.compare(select.score(experts, good), thresholds).pass, true);
  const cofire = good.map((s, i) => (i < 6 ? { ...s, chosen: ['alpha', 'beta'] } : s));
  const out = select.compare(select.score(experts, cofire), thresholds);
  assert.equal(out.pass, false);
  assert.match(out.checks.filter((x) => !x.ok).map((x) => x.name).join('|'), /not chosen for other domains/);
});

test('selection: unknown experts and malformed origins are rejected', () => {
  assert.throws(() => select.score(experts, [sel('alpha:seeded', 'a1', ['gamma'])]), /unknown expert/);
  assert.throws(() => select.score(experts, [sel('gamma:seeded', 'a1', [])]), /unknown expert/);
  assert.throws(() => select.score(experts, [sel('alpha-seeded', 'a1', [])]), /bad origin/);
});

test('with two runs per case, one hit is a tie and does not count as found by majority', () => {
  const two = [
    ...['s1', 's2', 's3', 's4'].flatMap((id) => [rec(id, 1, ['planted']), rec(id, 2, id === 's1' ? [] : ['planted'])]),
    ...['b1', 'b2', 'x1', 'x2'].flatMap((id) => [rec(id, 1), rec(id, 2)]),
  ];
  const s = score.summarise(cases, two);
  assert.equal(s.runsPerCase, 2);
  assert.equal(s.seeded.casesFoundMajority, 3);
  assert.equal(s.seeded.casesFoundAllRuns, 3);
});

test('selection: a failed answer is ignored even if it still lists experts', () => {
  const r = select.score(experts, [sel('alpha:seeded', 'a1', ['alpha', 'beta'], true), sel('beta:seeded', 'b1', ['beta'], true)]);
  assert.equal(r.perExpert.alpha.ownHits, 0);
  assert.equal(r.perExpert.beta.ownHits, 0);
  assert.equal(r.perExpert.alpha.cofireHits, 0);
  assert.equal(r.matrix['alpha:seeded'].alpha, undefined);
  assert.equal(r.matrix['alpha:seeded'].failed, 1);
});
