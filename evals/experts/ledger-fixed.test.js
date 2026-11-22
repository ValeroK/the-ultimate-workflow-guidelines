'use strict';

// PLAN-5.2.1, card ledger-fixed. A review finding became a catch with the status "open", and it stayed open after a
// fix-up card of the same run corrected it and committed: only `ledger confirm` changed it (seen in the value reports
// of the real runs of 2026-11-20 to 2026-11-22). The run result now lists what its fix-up cards took, and the ledger
// counts those as confirmed, with the commit as the evidence.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const L = require(path.join(PLUGIN, 'experts', 'ledger.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-ledger-fixed-')));
  made.push(dir);
  return dir;
};
const A = { file: 'test/slug.test.js', line: 80, what: 'the test never uses a digit', confidence: 'medium' };
const B = { file: 'src/x.js', line: 1, what: 'no test covers the empty input', confidence: 'medium' };
/** A run result: the quality expert found A (it is also in the list of the review, under its lens name), a core lens found B. */
const result = (fixed) => ({
  ok: true,
  feature: 'f',
  counts: { committed: 2 },
  cards: [{ card: '1', status: 'committed', build: { rounds: 1 } }],
  expertLanes: [{ card: null, lane: { selected: ['quality'], ran: ['quality'], findings: [{ expert: 'quality', ...A, status: 'confirmed' }] } }],
  review: { findings: [{ lens: 'quality', ...A }, { lens: 'test-coverage', ...B }], ...(fixed === undefined ? {} : { fixed }) },
});
const fixedBy = (f, lens, commit = 'abc123def456') => ({ lens, file: f.file, line: f.line, what: f.what, card: 'fixup', commit });
const list = (dir) => L.report(dir).catches.list.map((c) => ({ by: c.by, status: c.status, evidence: c.evidence || null }));
const review = (dir) => L.report(dir).catches.byStage.review;
const settles = (dir) => L.readAll(dir).filter((e) => e.kind === 'settle').length;

test('ledger-fixed 4: the findings a fix-up card took are counted as confirmed, with the card and the commit as the evidence', () => {
  const dir = tmp();
  L.addRun(dir, 'run', { runId: 'wf_1', tokens: 10 }, result([fixedBy(A, 'quality'), fixedBy(B, 'test-coverage')]));
  assert.deepStrictEqual(list(dir), [
    { by: 'expert:quality', status: 'confirmed', evidence: 'fixed by the card fixup, commit abc123def456' },
    { by: 'lens:test-coverage', status: 'confirmed', evidence: 'fixed by the card fixup, commit abc123def456' },
  ]);
  assert.deepStrictEqual([review(dir).total, review(dir).confirmed, review(dir).open], [2, 2, 0]);
});

test('ledger-fixed 4: a finding the fix-up card did not take stays open', () => {
  const dir = tmp();
  L.addRun(dir, 'run', { runId: 'wf_1', tokens: 10 }, result([fixedBy(A, 'quality')]));
  assert.deepStrictEqual(list(dir).map((c) => c.status), ['confirmed', 'open']);
});

test('ledger-fixed 5: a catch an earlier run wrote as open gets one settle entry, and no second catch', () => {
  const dir = tmp();
  L.addRun(dir, 'run', { runId: 'wf_1', tokens: 10 }, result());
  assert.deepStrictEqual(list(dir).map((c) => c.status), ['open', 'open']);
  L.addRun(dir, 'run', { runId: 'wf_2', tokens: 10 }, result([fixedBy(A, 'quality'), fixedBy(B, 'test-coverage')]));
  assert.deepStrictEqual(list(dir).map((c) => c.status), ['confirmed', 'confirmed']);
  assert.equal(L.readAll(dir).filter((e) => e.kind === 'catch').length, 2);
  assert.equal(settles(dir), 2);
  // The same result recorded one more time adds nothing.
  L.addRun(dir, 'run', { runId: 'wf_3', tokens: 10 }, result([fixedBy(A, 'quality'), fixedBy(B, 'test-coverage')]));
  assert.equal(settles(dir), 2);
});

test('ledger-fixed 6: a catch the user refuted stays refuted when a later result lists it as fixed', () => {
  const dir = tmp();
  L.addRun(dir, 'run', { runId: 'wf_1', tokens: 10 }, result());
  const id = L.report(dir).catches.list.find((c) => c.by === 'expert:quality').id;
  L.settleCatch(dir, id, 'refuted', 'the user says this is not a fault');
  L.addRun(dir, 'run', { runId: 'wf_2', tokens: 10 }, result([fixedBy(A, 'quality')]));
  const mine = L.report(dir).catches.list.find((c) => c.id === id);
  assert.deepStrictEqual([mine.status, mine.evidence], ['refuted', 'the user says this is not a fault']);
});

test('ledger-fixed 7: a result with no list of fixed findings, or with one that is not a usable list, leaves every catch as before', () => {
  for (const fixed of [undefined, 'yes', [null, {}, { what: 'x' }]]) {
    const dir = tmp();
    L.addRun(dir, 'run', { runId: 'wf_1', tokens: 10 }, result(fixed));
    assert.deepStrictEqual(list(dir).map((c) => c.status), ['open', 'open'], JSON.stringify(fixed));
    assert.equal(settles(dir), 0);
  }
});

test('ledger-fixed 7: an entry with no commit does not confirm a catch', () => {
  const dir = tmp();
  L.addRun(dir, 'run', { runId: 'wf_1', tokens: 10 }, result([{ ...fixedBy(A, 'quality'), commit: '' }]));
  assert.deepStrictEqual(list(dir).map((c) => c.status), ['open', 'open']);
});

test('ledger-fixed 7: a review or an experts result never confirms a catch by a list of fixed findings', () => {
  const dir = tmp();
  L.addRun(dir, 'review', { runId: 'wf_1', tokens: 10 }, { ok: true, findings: [{ lens: 'test-coverage', ...B }], fixed: [fixedBy(B, 'test-coverage')], review: { fixed: [fixedBy(B, 'test-coverage')] } });
  assert.deepStrictEqual(list(dir).map((c) => c.status), ['open']);
});

test('ledger-fixed 8: value.md says that a catch a fix-up card corrected is confirmed, with the commit as its evidence', () => {
  const md = fs.readFileSync(path.join(PLUGIN, 'commands', 'value.md'), 'utf8');
  assert.match(md, /A finding that a fix-up card of the run corrected is counted as confirmed, with the commit of that card as its evidence/);
});
