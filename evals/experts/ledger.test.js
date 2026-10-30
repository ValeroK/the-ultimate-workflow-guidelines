'use strict';

// The value ledger (PLAN-value-ledger.md, decided 2026-10-29). Code records and adds up; it never
// judges whether a catch was unique or real.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const L = require(path.join(PLUGIN, 'experts', 'ledger.js'));
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'uw-ledger-'));
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, 'ledger', ...a], { cwd, encoding: 'utf8' });

const reviewResult = {
  ok: true,
  findings: [{ lens: 'correctness', file: 'a.ts', what: 'x' }, { lens: 'frontend', file: 'b.tsx', what: 'y' }],
  expertLane: {
    stage: 'review', selected: ['frontend'], ran: ['frontend'], failed: [],
    skillsLoaded: { frontend: ['semantics-and-aria', 'visual-accessibility'] },
    findings: [
      { expert: 'frontend', file: 'b.tsx', basis: 'skill:semantics-and-aria', basisQuote: 'q' },
      { expert: 'frontend', file: 'c.tsx', basis: 'general' },
    ],
    delta: { files: ['b.tsx'], chain: 1, experts: ['frontend'] },
  },
};

test('a run row takes the session\'s numbers and the workflow\'s own lane, and appends one line', () => {
  const dir = tmp();
  const e = L.addRun(dir, 'review', { runId: 'wf_1', tokens: 274959, agents: 4, durationMs: 114000, workarounds: ['embedded args'] }, reviewResult);
  assert.equal(e.phase, 'review');
  assert.deepStrictEqual(e.experts.ran, ['frontend']);
  assert.deepStrictEqual(e.review.byBasis, { skill: 1, reference: 0, general: 1, missing: 0 });
  assert.deepStrictEqual(e.review.uncited, { frontend: ['visual-accessibility'] });
  assert.equal(e.review.core, 1, 'the correctness finding is a core lens');
  assert.deepStrictEqual(e.review.delta, { files: 1, chain: 1 });
  L.addRun(dir, 'tests', { runId: 'wf_2', tokens: 504190 }, { ok: true, expertLane: { stage: 'tests', ran: ['frontend'], casesAdded: { frontend: 8 } } });
  const lines = fs.readFileSync(L.file(dir), 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.deepStrictEqual(JSON.parse(lines[1]).casesAdded, { frontend: 8 });
});

test('a run row without its run id or tokens, or for an unknown phase, is refused', () => {
  const dir = tmp();
  assert.throws(() => L.addRun(dir, 'review', { tokens: 1 }, null), /needs runId/);
  assert.throws(() => L.addRun(dir, 'review', { runId: 'wf' }, null), /needs tokens/);
  assert.throws(() => L.addRun(dir, 'deploy', { runId: 'wf', tokens: 1 }, null), /unknown phase/);
  assert.equal(fs.existsSync(L.file(dir)), false);
});

test('catches keep their id through confirm and refute; an unknown id or a bare origin is refused', () => {
  const dir = tmp();
  const c = L.addCatch(dir, { what: 'Escape closes two layers', by: 'expert:frontend', stage: 'plan', unique: 'yes' });
  assert.equal(c.status, 'open');
  L.settleCatch(dir, c.id, 'confirmed', 'DECK-DS-16 went red on the draft approach');
  assert.equal(L.report(dir).catches.list[0].status, 'confirmed');
  assert.throws(() => L.settleCatch(dir, 'nope', 'confirmed', 'evidence here'), /no catch has id nope/);
  assert.throws(() => L.addCatch(dir, { what: 'something real', by: 'frontend', stage: 'plan' }), /--by/);
  assert.throws(() => L.addCatch(dir, { what: 'something real', by: 'critic', stage: 'ship' }), /--stage/);
});

test('report: totals per phase, the experts\' unique precision, and skills never cited across runs', () => {
  const dir = tmp();
  L.addRun(dir, 'plan', { runId: 'p', tokens: 600000, durationMs: 600000 }, { ok: true, expertLane: { ran: ['frontend'] } });
  L.addRun(dir, 'review', { runId: 'r1', tokens: 300000, durationMs: 120000, workarounds: ['copied the script'] }, reviewResult);
  L.addRun(dir, 'review', { runId: 'r2', tokens: 200000, durationMs: 60000 }, reviewResult);
  const a = L.addCatch(dir, { what: 'drawer never opens', by: 'expert:frontend', stage: 'plan', unique: 'yes' });
  const b = L.addCatch(dir, { what: 'bell containing block', by: 'expert:frontend', stage: 'plan', unique: 'yes' });
  L.addCatch(dir, { what: 'status dot contrast', by: 'critic', stage: 'build', unique: 'no', confirmed: 'DS-23 red' });
  L.addCatch(dir, { what: 'open one, not judged', by: 'expert:quality', stage: 'tests', unique: 'yes' });
  L.settleCatch(dir, a.id, 'confirmed', 'DS-20 red on the draft');
  L.settleCatch(dir, b.id, 'refuted', 'card 2 removed the translate');
  const r = L.report(dir);
  assert.deepStrictEqual(r.total, { runs: 3, tokens: 1100000, durationMs: 780000 });
  assert.equal(r.phases.review.runs, 2);
  assert.equal(r.phases.review.workarounds, 1);
  assert.deepStrictEqual(r.catches.expertsUnique, { total: 3, confirmed: 1, refuted: 1, precision: 0.5 }, 'the open one counts in total, not in precision');
  assert.equal(r.catches.byStage.plan.uniqueToExperts, 2);
  assert.equal(r.catches.byOrigin.critic, 1);
  assert.deepStrictEqual(r.review.byBasis, { skill: 2, reference: 0, general: 2, missing: 0 });
  assert.equal(r.review.skillShare, 0.5);
  assert.deepStrictEqual(r.review.neverCited, [{ skill: 'frontend/visual-accessibility', loaded: 2 }]);
  assert.deepStrictEqual(r.workarounds, [{ phase: 'review', runId: 'r1', what: 'copied the script' }]);
});

test('report on an empty ledger says so; precision is null until a unique catch is judged', () => {
  const dir = tmp();
  assert.equal(L.report(dir).empty, true);
  L.addCatch(dir, { what: 'not judged yet', by: 'expert:frontend', stage: 'plan', unique: 'yes' });
  assert.equal(L.report(dir).catches.expertsUnique.precision, null);
});

test('CLI: add reads the row and the result from files; report prints JSON; errors exit 2', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'row.json'), JSON.stringify({ runId: 'wf_9', tokens: 63659 }));
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(reviewResult));
  const r = cli(dir, 'add', '--phase', 'experts', '--row', 'row.json', '--result', 'result.json');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).review.findings, 2);
  assert.equal(JSON.parse(cli(dir, 'report').stdout).total.tokens, 63659);
  const bad = cli(dir, 'confirm', '--id', 'nope', '--text', 'some evidence');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /no catch has id nope/);
  assert.equal(cli(dir, 'frobnicate').status, 2);
});

test('every phase command ends by recording its run in the ledger, with its own phase', () => {
  const read = (f) => fs.readFileSync(path.join(PLUGIN, 'commands', f), 'utf8');
  for (const phase of ['plan', 'tests', 'build', 'review', 'harvest']) {
    assert.match(read(`${phase}.md`), new RegExp(`ledger add --phase ${phase} --row \\.ultimate-workflow/run/${phase}\\.row\\.json --result \\.ultimate-workflow/run/${phase}\\.result\\.json`), phase);
  }
  assert.match(read('experts.md'), /--phase experts/);
  assert.match(read('plan.md'), /ledger catch --what .* --by expert:<name> --stage plan/);
  assert.match(read('value.md'), /experts\.js" ledger report/);
});

test('tests and build ask for their own catches: the test plan\'s gaps, and what the build found', () => {
  const read = (f) => fs.readFileSync(path.join(PLUGIN, 'commands', f), 'utf8');
  assert.match(read('tests.md'), /ledger catch --what .* --by <critic or expert:<name>> --stage tests/);
  assert.match(read('build.md'), /ledger catch --what .* --by build-agent --stage build --confirmed/);
});
