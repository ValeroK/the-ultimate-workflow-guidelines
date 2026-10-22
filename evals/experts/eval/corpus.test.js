'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const corpus = require('./lib/corpus.js');

// The second place each frozen corpus hash is pinned. corpus/MANIFEST.json is the first.
// Changing a frozen corpus means editing both on purpose, with a reason in the commit.
const PINNED = {
  architect: '0152cdc2597e5a381c170953e5451ad91d9eb96e1e0d21c41a6979a452741197',
  'architect-hard': 'cf394272a890208df20a5b93383b93dee8792a3202c2c25f4808b0f1f0e04f21',
  'architect-harder': '52ef3bdad5d52f61c002fd28da8415ef4b88f1b57774166f7c5f8e5e1d2e089f',
  'devops-hard': 'a97314ef5a8785c6e506d0433719f2387952c11a86de8d95b60090221667f01d',
  'devops-harder': 'ad25955e812f93feeaec6cff8086aadcb389e0cc1c018104f26014c5fc259aa8',
  developer: '829c83bf9dbafc6da5905461a4ad3812a0a84832a811314c3e8deaa0c654e211',
  'developer-hard': 'b19444242fedfd2fda0c9985c554d369ba11e6ecdb6313f6491e74b6692cf996',
  'developer-real': '522aab3b2bc7aa3a37f99d043e5addcb5ab564c7278d205a5e408d18bde9af14',
  quality: '7832c12fecb5af8dc081e68101725397b875abdea3a2b3f518f3b8b5a5c7e53f',
  'quality-hard': '8a1328c0fdfeda301dfeb78048413532fe916c72d3e97382003911b52ebe2a88',
  review: 'b85c22651f523e0de25e0a4163495e7c80b3f1087897abae6961cbb1e2c7aacc',
  softarch: 'c38136776a080a55a0b9846ae36fa9a157fcf5a81ebbbca8c5e2cd92c0d40231',
  'softarch-hard': 'a2869f4acbfaa9761cc08cbe4a55d16db34bc9149ba347f423d6133eeb9d17fd',
};

const rawCase = (over = {}) => ({
  kind: 'seeded',
  summary: 'Adds a retry around a charge call',
  diff: 'diff --git a/x.py b/x.py\n--- a/x.py\n+++ b/x.py\n@@ -1,2 +1,3 @@\n a = 1\n+b = 2\n c = 3\n',
  planted: 'The retry repeats a charge that is not idempotent, so a timeout bills twice.',
  ...over,
});

function validCorpus() {
  const raws = [];
  for (let i = 0; i < 8; i += 1) raws.push(rawCase({ summary: `Seeded change number ${i}` }));
  for (let i = 0; i < 6; i += 1) raws.push({ kind: 'benign', summary: `Benign change number ${i}`, diff: rawCase().diff, whyOk: 'The guard is in the diff itself.' });
  for (let i = 0; i < 6; i += 1) raws.push({ kind: 'sibling', summary: `Sibling change number ${i}`, diff: rawCase().diff, siblingDomain: 'security: SQL injection through a request parameter' });
  return corpus.freeze('demo', raws);
}

test('every frozen corpus is valid', () => {
  const experts = corpus.listCorpora();
  assert.ok(experts.length >= 3, 'expected corpora on disk');
  for (const e of experts) {
    assert.deepEqual(corpus.validate(corpus.load(e)), [], `corpus ${e}`);
  }
});

test('frozen corpora match the manifest and the pin in this file', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(corpus.CORPUS_DIR, 'MANIFEST.json'), 'utf8'));
  const actual = corpus.manifest();
  for (const e of Object.keys(PINNED)) {
    assert.equal(actual[e], PINNED[e], `${e}: file changed after it was frozen (pin in this test)`);
    assert.equal(manifest[e], PINNED[e], `${e}: MANIFEST.json disagrees with the pin in this test`);
  }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(manifest).sort(), 'a corpus is missing from MANIFEST.json or vice versa');
});

test('a corpus that is not pinned here is flagged, so a new one cannot slip in unpinned', () => {
  const unpinned = corpus.listCorpora().filter((e) => !(e in PINNED));
  assert.deepEqual(unpinned, []);
});

test('case ids are opaque and unique across all corpora', () => {
  const seen = new Set();
  for (const e of corpus.listCorpora()) {
    for (const c of corpus.load(e).cases) {
      assert.match(c.id, /^c[0-9a-f]{8}$/);
      assert.ok(!seen.has(c.id), `duplicate id ${c.id}`);
      seen.add(c.id);
    }
  }
});

test('the blind view shows a reviewer nothing that gives the answer away', () => {
  for (const e of corpus.listCorpora()) {
    for (const c of corpus.load(e).cases) {
      const view = corpus.blindView(c);
      assert.deepEqual(Object.keys(view).sort(), ['diff', 'id', 'summary']);
      for (const secret of [c.planted, c.whyOk, c.siblingDomain].filter(Boolean)) {
        assert.ok(!JSON.stringify(view).includes(secret), 'the view contains an answer');
      }
    }
  }
});

test('the dev and heldout split is deterministic and covers every kind', () => {
  const a = validCorpus();
  const b = validCorpus();
  assert.deepEqual(a, b);
  for (const kind of corpus.KINDS) {
    assert.ok(a.cases.some((c) => c.kind === kind && c.split === 'heldout'), `no heldout ${kind}`);
    assert.ok(a.cases.some((c) => c.kind === kind && c.split === 'dev'), `no dev ${kind}`);
  }
  assert.deepEqual(corpus.validate(a), []);
});

test('hunk headers are recomputed from the body and content is untouched', () => {
  const diff = 'diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1,99 +1,99 @@ def f():\n a\n-b\n+c\n+d\n e\n';
  const fixed = corpus.normaliseHunks(diff);
  assert.match(fixed, /@@ -1,3 \+1,4 @@ def f\(\):/);
  assert.equal(corpus.hunksConsistent(fixed), true);
  assert.equal(corpus.hunksConsistent(diff), false);
  assert.equal(fixed.replace(/@@ .*@@/, '').replace(/\n$/, ''), diff.replace(/@@ .*@@/, '').replace(/\n$/, ''));
});

test('validation catches each way a corpus can be unsound', () => {
  const mutate = (fn) => {
    const c = validCorpus();
    fn(c);
    return corpus.validate(c);
  };
  assert.match(mutate((c) => (c.cases[0].summary = c.cases[1].summary)).join('|'), /duplicate summary|id does not match/);
  assert.match(mutate((c) => (c.cases[0].id = 'c12345678')).join('|'), /id does not match/);
  assert.match(mutate((c) => (c.cases = c.cases.filter((x) => x.kind !== 'sibling'))).join('|'), /at least 6 sibling/);
  assert.match(mutate((c) => { const s = c.cases.find((x) => x.kind === 'seeded'); delete s.planted; }).join('|'), /planted/);
  assert.match(mutate((c) => { const s = c.cases.find((x) => x.kind === 'benign'); delete s.whyOk; }).join('|'), /whyOk/);
  assert.match(mutate((c) => { const s = c.cases.find((x) => x.kind === 'sibling'); delete s.siblingDomain; }).join('|'), /siblingDomain/);
  assert.match(mutate((c) => { c.cases.find((x) => x.kind === 'benign').planted = 'a planted description that should not be here'; }).join('|'), /only seeded cases carry/);
  assert.match(mutate((c) => (c.cases[0].diff = c.cases[0].diff.replace('+b = 2', '+b = 2  # BUG: double charge'))).join('|'), /giveaway/);
  assert.match(mutate((c) => (c.cases[0].diff = c.cases[0].diff.replace('@@ -1,2 +1,3 @@', '@@ -1,9 +1,9 @@'))).join('|'), /hunk header/);
  assert.match(mutate((c) => (c.cases[0].split = 'train')).join('|'), /split/);
});

test('freeze refuses to overwrite a corpus that exists', () => {
  const { spawnSync } = require('node:child_process');
  const raw = path.join(require('node:os').tmpdir(), `uw-freeze-${process.pid}.json`);
  fs.writeFileSync(raw, JSON.stringify({ cases: [] }));
  try {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'manual', 'freeze.js'), 'architect', raw], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /already exists/);
  } finally {
    fs.rmSync(raw, { force: true });
  }
});

test('a second corpus for an expert is a set: its own key and ids, and each seeded case says what makes it hard', () => {
  const raws = [];
  for (let i = 0; i < 8; i += 1) raws.push(rawCase({ summary: `Seeded change number ${i}`, hard: i % 2 ? 'knowledge' : 'reasoning' }));
  for (let i = 0; i < 6; i += 1) raws.push({ kind: 'benign', summary: `Benign change number ${i}`, diff: rawCase().diff, whyOk: 'The guard is in the diff itself.' });
  for (let i = 0; i < 6; i += 1) raws.push({ kind: 'sibling', summary: `Sibling change number ${i}`, diff: rawCase().diff, siblingDomain: 'security: SQL injection through a request parameter' });
  const set = corpus.freeze('demo-hard', raws);
  assert.equal(set.expert, 'demo');
  assert.equal(set.set, 'hard');
  assert.equal(corpus.keyOf(set), 'demo-hard');
  assert.deepEqual(corpus.validate(set), []);
  const plain = validCorpus();
  assert.ok(!set.cases.some((c) => plain.cases.some((p) => p.id === c.id)), 'a set does not reuse the plain corpus ids');

  const unlabelled = JSON.parse(JSON.stringify(set));
  delete unlabelled.cases.find((c) => c.kind === 'seeded').hard;
  assert.ok(corpus.validate(unlabelled).some((p) => /says what makes it hard/.test(p)));
  const onBenign = JSON.parse(JSON.stringify(set));
  onBenign.cases.find((c) => c.kind === 'benign').hard = 'knowledge';
  assert.ok(corpus.validate(onBenign).some((p) => /on seeded cases only/.test(p)));
});

test('the blind view of a hard case does not show what makes it hard', () => {
  const c = { id: 'c00000000', kind: 'seeded', summary: 'x'.repeat(12), diff: '@@ -1 +1 @@\n', planted: 'y'.repeat(20), hard: 'knowledge', split: 'dev' };
  assert.deepEqual(Object.keys(corpus.blindView(c)).sort(), ['diff', 'id', 'summary']);
});

test('a mined case keeps hard: real and its provenance, and the reviewer never sees the provenance', () => {
  const diff = ['diff --git a/a.go b/a.go', '--- a/a.go', '+++ b/a.go', '@@ -1,1 +1,2 @@', ' package a', '+var x = 1', ''].join('\n');
  const frozen = corpus.freeze('developer-real', [{ kind: 'seeded', hard: 'real', summary: 'Add x to package a', diff, planted: 'x is set but the caller reads y instead', provenance: { repo: 'o/r', introduced: 'abc', fixed: 'def' } }]);
  const c = frozen.cases[0];
  assert.equal(c.hard, 'real');
  assert.deepEqual(c.provenance, { repo: 'o/r', introduced: 'abc', fixed: 'def' });
  assert.ok(!corpus.validate(frozen).some((p) => /hard/.test(p)));
  assert.ok(!('provenance' in corpus.blindView(c)));
});
