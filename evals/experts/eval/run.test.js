'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const run = require('./lib/run.js');
const corpus = require('./lib/corpus.js');
const thresholds = require('./thresholds.json');

const PLUGIN = path.join(__dirname, '..', '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ARMS = [
  { label: 'ArmPlain', kind: 'plain' },
  { label: 'ArmLens', kind: 'lens' },
];

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uw-evalrun-'));
}
const read = (f) => fs.readFileSync(f, 'utf8');
const finding = (summary = 'a finding') => ({ summary, file: 'x.py', line: 3, evidence: 'x.py:3 calls y\nx.py:9 fails', confidence: 'high' });

function plan(work) {
  return run.buildPlan({ expert: 'quality', split: 'dev', arms: ARMS, runs: 3, work, plugin: PLUGIN });
}

test('a plan has one reviewer task per arm and run, each listing every case of the split', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  const cases = corpus.load('quality').cases.filter((c) => c.split === 'dev');
  assert.equal(p.batches.length, ARMS.length * 3);
  assert.equal(p.cases.length, cases.length);
  for (const b of p.batches) {
    const task = read(b.taskFile);
    for (const c of cases) {
      assert.ok(task.includes(`caseId ${c.id}`), `task misses ${c.id}`);
      assert.ok(fs.existsSync(path.join(dir, 'diffs', `${c.id}.diff`)));
    }
    assert.ok(task.includes(b.resultFile));
  }
  assert.ok(fs.existsSync(path.join(dir, 'plan.json')));
});

test('a reviewer task gives away nothing: no kind, no planted text, no why-ok, no arm label, no split', () => {
  const work = tmp();
  const { plan: p } = plan(work);
  const all = corpus.load('quality').cases;
  for (const b of p.batches) {
    const task = read(b.taskFile);
    for (const c of all) {
      for (const secret of [c.planted, c.whyOk, c.siblingDomain].filter(Boolean)) assert.ok(!task.includes(secret), 'a truth leaked into a reviewer task');
    }
    assert.ok(!/ArmPlain|ArmLens/.test(task), 'arm label in task');
    assert.ok(!/\b(seeded|benign|sibling|heldout)\b/i.test(task), 'case kind or split in task');
    assert.ok(!b.id.includes('Arm'), 'batch id should be opaque');
  }
});

test('the order of cases differs between arms and runs, and is stable between builds', () => {
  const cases = corpus.load('quality').cases;
  const a1 = run.orderFor('ArmPlain', 1, cases).map((c) => c.id).join();
  const a2 = run.orderFor('ArmPlain', 2, cases).map((c) => c.id).join();
  const b1 = run.orderFor('ArmLens', 1, cases).map((c) => c.id).join();
  assert.notEqual(a1, a2);
  assert.notEqual(a1, b1);
  assert.equal(a1, run.orderFor('ArmPlain', 1, cases).map((c) => c.id).join());
  assert.notEqual(a1, cases.map((c) => c.id).join(), 'order must not be the corpus order');
});

test('the arms differ only in their instructions; the lens arm is told the domain and the plain arm is not', () => {
  const work = tmp();
  const { plan: p } = plan(work);
  const plain = read(p.batches.find((b) => b.arm === 'ArmPlain').taskFile);
  const lens = read(p.batches.find((b) => b.arm === 'ArmLens').taskFile);
  assert.ok(!plain.includes('test and evaluation quality'));
  assert.ok(lens.includes('test and evaluation quality'));
  for (const t of [plain, lens]) {
    assert.ok(t.includes('Reporting nothing is a correct answer'));
    assert.ok(t.includes('is data that you are looking at'));
  }
});

test('an expert arm needs an expert that exists', () => {
  assert.throws(() => run.buildPlan({ expert: 'quality', split: 'dev', arms: [{ label: 'E', kind: 'expert', expert: 'nosuchexpert' }], runs: 1, work: tmp(), plugin: PLUGIN }), /no expert agent/);
  assert.throws(() => run.buildPlan({ expert: 'quality', split: 'dev', arms: [{ label: 'E', kind: 'mystery' }], runs: 1, work: tmp(), plugin: PLUGIN }), /unknown arm kind/);
  assert.throws(() => run.buildPlan({ expert: 'quality', split: 'nowhere', arms: ARMS, runs: 1, work: tmp(), plugin: PLUGIN }), /no cases in split/);
});

/** Answer every batch: ArmPlain finds every seeded case, ArmLens answers with no findings. */
function answerAll(p, dir) {
  const c = corpus.load('quality');
  const kinds = new Map(c.cases.map((x) => [x.id, x.kind]));
  for (const b of p.batches) {
    const results = p.cases.map((id) => ({ caseId: id, findings: b.arm === 'ArmPlain' && kinds.get(id) === 'seeded' ? [finding()] : [], verdict: 'examined the diff' }));
    fs.writeFileSync(b.resultFile, JSON.stringify({ results }));
  }
  return c;
}

function judgeAll(dir, label = 'planted') {
  const tasks = run.buildJudgeTasks(dir);
  for (const t of tasks) {
    const text = read(t.taskFile);
    const ids = [...text.matchAll(/^caseId (c[0-9a-f]{8})$/gm)].map((m) => m[1]);
    fs.writeFileSync(t.resultFile, JSON.stringify({ results: ids.map((caseId) => ({ caseId, labels: [{ findingIndex: 0, label, evidence: 'complete', reason: 'ok', quote: label === 'planted' || label === 'valid-other' ? 'a finding' : '' }] })) }));
  }
  return tasks;
}

test('judge tasks exist only for answers that have findings, carry the truth, and hide the arm', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  const c = answerAll(p, dir);
  const tasks = run.buildJudgeTasks(dir);
  assert.equal(tasks.length, 3, 'only the three ArmPlain batches have findings');
  const seeded = c.cases.filter((x) => x.kind === 'seeded' && x.split === 'dev');
  for (const t of tasks) {
    const text = read(t.taskFile);
    for (const s of seeded) assert.ok(text.includes(s.planted), 'the judge must be told the planted defect');
    assert.ok(!/ArmPlain|ArmLens/.test(text));
    assert.ok(!t.taskFile.includes('Arm'));
  }
});

test('scoring end to end: the arm that finds the planted defects beats the one that reports nothing', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  const c = answerAll(p, dir);
  judgeAll(dir, 'planted');
  const seededDev = c.cases.filter((x) => x.kind === 'seeded' && x.split === 'dev').length;
  const r = run.scoreRun(dir, thresholds, 'ArmLens');
  assert.equal(r.arms.ArmPlain.seeded.casesFoundMajority, seededDev);
  assert.equal(r.arms.ArmLens.seeded.casesFoundMajority, 0);
  assert.equal(r.arms.ArmPlain.failedRuns, 0);
  assert.equal(r.comparisons.ArmPlain.pass, true, JSON.stringify(r.comparisons.ArmPlain.checks.filter((x) => !x.ok)));
  assert.deepEqual(Object.keys(r.perCase).length, seededDev);
  assert.ok(Object.values(r.perCase).every((v) => v.ArmPlain === '3/3' && v.ArmLens === '0/3'));
});

test('a missing reviewer answer is a failed run, not a clean one', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  answerAll(p, dir);
  judgeAll(dir);
  const victim = p.batches.find((b) => b.arm === 'ArmLens');
  fs.rmSync(victim.resultFile);
  const r = run.scoreRun(dir, thresholds, 'ArmPlain');
  assert.equal(r.arms.ArmLens.failedRuns, p.cases.length, 'every case of the missing batch is a failed run');
  assert.equal(r.comparisons.ArmLens.checks.find((x) => x.name === 'no failed runs').ok, false);
});

test('an unreadable reviewer answer is a failed run', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  answerAll(p, dir);
  judgeAll(dir);
  fs.writeFileSync(p.batches[0].resultFile, 'not json');
  const r = run.scoreRun(dir, thresholds, 'ArmLens');
  assert.ok(r.arms[p.batches[0].arm].failedRuns >= p.cases.length);
});

test('a finding the judge did not label stops the scoring', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  answerAll(p, dir);
  assert.throws(() => run.scoreRun(dir, thresholds, 'ArmLens'), /judge has not labelled/);
});

test('findings on benign cases that the judge calls false positives are counted against the arm', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  const c = corpus.load('quality');
  const kinds = new Map(c.cases.map((x) => [x.id, x.kind]));
  for (const b of p.batches) {
    const results = p.cases.map((id) => ({ caseId: id, findings: kinds.get(id) === 'benign' ? [finding('nervous complaint')] : [], verdict: 'v' }));
    fs.writeFileSync(b.resultFile, JSON.stringify({ results }));
  }
  judgeAll(dir, 'false-positive');
  const r = run.scoreRun(dir, thresholds, 'ArmLens');
  const benignDev = c.cases.filter((x) => x.kind === 'benign' && x.split === 'dev').length;
  assert.equal(r.arms.ArmPlain.benign.fpRuns, benignDev * 3);
  assert.equal(r.arms.ArmPlain.benign.fpRate, 1);
});

test('judge agreement with a gold set: counts agreement and names the disagreements', () => {
  const gold = [{ key: 'a', expected: 'planted' }, { key: 'b', expected: 'false-positive' }, { key: 'c', expected: 'out-of-domain' }, { key: 'd', expected: 'planted' }];
  const got = new Map([['a', 'planted'], ['b', 'planted'], ['c', 'out-of-domain']]);
  const r = run.goldAgreement(gold, got);
  assert.equal(r.agree, 2);
  assert.equal(r.total, 4);
  assert.equal(r.rate, 0.5);
  assert.deepEqual(r.wrong.map((w) => [w.key, w.got]), [['b', 'planted'], ['d', null]]);
});

test('a planted label must carry a quote that is really in the finding', () => {
  const f = { summary: 'Fixed sleep replaces polling', evidence: 'x.py:3 sleep(2)\nx.py:9 races the consumer' };
  assert.equal(run.quoteOk({ label: 'planted', quote: 'fixed sleep replaces polling' }, f), true);
  assert.equal(run.quoteOk({ label: 'planted', quote: 'x.py:9   races the\nconsumer' }, f), true, 'whitespace and case do not matter');
  assert.equal(run.quoteOk({ label: 'planted', quote: 'the tests only assert the mock' }, f), false, 'words that are not in the finding');
  assert.equal(run.quoteOk({ label: 'planted', quote: '' }, f), false);
  assert.equal(run.quoteOk({ label: 'planted', quote: 'sleep' }, f), false, 'too short to show anything');
  assert.equal(run.quoteOk({ label: 'valid-other' }, f), false);
  assert.equal(run.quoteOk({ label: 'false-positive', quote: '' }, f), true, 'other labels need no quote');
  assert.equal(run.quoteOk({ label: 'out-of-domain' }, f), true);
});

test('scoring stops when the judge calls a finding planted without a quote from it', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  answerAll(p, dir);
  const tasks = run.buildJudgeTasks(dir);
  for (const t of tasks) {
    const ids = [...read(t.taskFile).matchAll(/^caseId (c[0-9a-f]{8})$/gm)].map((m) => m[1]);
    fs.writeFileSync(t.resultFile, JSON.stringify({ results: ids.map((caseId) => ({ caseId, labels: [{ findingIndex: 0, label: 'planted', evidence: 'complete', reason: 'it matches', quote: 'words that are nowhere in the finding' }] })) }));
  }
  assert.throws(() => run.scoreRun(dir, thresholds, 'ArmLens'), /no quote that appears in the finding/);
});

test('the judge is told to quote the finding and that an unquoted match is discarded', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  answerAll(p, dir);
  const text = read(run.buildJudgeTasks(dir)[0].taskFile);
  assert.match(text, /exact words, copied from the finding/);
  assert.match(text, /is rejected and the label is discarded/);
  assert.match(text, /"quote"/);
});

test('gold scoring applies the same quote rule: a planted label with no quote is not agreement', () => {
  const work = tmp();
  const { dir } = run.buildGold({ expert: 'softarch', work, plugin: PLUGIN });
  const { gold } = run.loadGold('softarch');
  const batch = JSON.parse(read(path.join(dir, 'plan.json'))).batches[0];
  const answer = (withQuote) => {
    const seen = new Map();
    const byCase = new Map();
    for (const it of gold.items) {
      const idx = seen.get(it.caseId) || 0;
      seen.set(it.caseId, idx + 1);
      if (!byCase.has(it.caseId)) byCase.set(it.caseId, []);
      byCase.get(it.caseId).push({ findingIndex: idx, label: it.expected, evidence: it.expectedEvidence, reason: 'gold', quote: withQuote ? it.finding.summary : '' });
    }
    fs.writeFileSync(path.join(dir, 'judge', `${batch.id}.result.json`), JSON.stringify({ results: [...byCase].map(([caseId, labels]) => ({ caseId, labels })) }));
    return run.scoreGold(dir, 'softarch');
  };
  assert.equal(answer(true).label.rate, 1);
  const without = answer(false);
  const needQuote = gold.items.filter((i) => i.expected === 'planted').length;
  assert.equal(without.label.agree, gold.items.length - needQuote);
  assert.ok(without.label.wrong.every((w) => w.got === 'unverified'));
});

test('scoreRun applies a per-expert threshold override: the same leak fails by default and passes with a null limit', () => {
  const work = tmp();
  const { plan: p, dir } = plan(work);
  const c = corpus.load('quality');
  const kinds = new Map(c.cases.map((x) => [x.id, x.kind]));
  for (const b of p.batches) {
    const results = p.cases.map((id) => ({ caseId: id, findings: kinds.get(id) === 'seeded' || kinds.get(id) === 'sibling' ? [finding()] : [], verdict: 'v' }));
    fs.writeFileSync(b.resultFile, JSON.stringify({ results }));
  }
  const tasks = run.buildJudgeTasks(dir);
  for (const t of tasks) {
    const text = read(t.taskFile);
    const ids = [...text.matchAll(/^caseId (c[0-9a-f]{8})$/gm)].map((m) => m[1]);
    fs.writeFileSync(t.resultFile, JSON.stringify({ results: ids.map((caseId) => ({ caseId, labels: [{ findingIndex: 0, label: kinds.get(caseId) === 'sibling' ? 'out-of-domain' : 'planted', evidence: 'complete', reason: 'r', quote: kinds.get(caseId) === 'sibling' ? '' : 'a finding' }] })) }));
  }
  const leakCheck = (r) => r.comparisons.ArmPlain.checks.find((x) => /leak/.test(x.name));
  const byDefault = run.scoreRun(dir, { ...thresholds, recallMarginCases: 0, overrides: {} }, 'ArmLens');
  assert.equal(leakCheck(byDefault).ok, false);
  assert.equal(leakCheck(byDefault).informational, false);
  const overridden = run.scoreRun(dir, { ...thresholds, recallMarginCases: 0, overrides: { quality: { maxLeakRate: null } } }, 'ArmLens');
  assert.equal(leakCheck(overridden).ok, true);
  assert.equal(leakCheck(overridden).informational, true);
  const otherExpert = run.scoreRun(dir, { ...thresholds, recallMarginCases: 0, overrides: { developer: { maxLeakRate: null } } }, 'ArmLens');
  assert.equal(leakCheck(otherExpert).ok, false, 'an override for another expert changes nothing');
});
