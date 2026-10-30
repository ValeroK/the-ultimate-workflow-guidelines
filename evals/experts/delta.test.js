'use strict';

// The changed-only experts recheck (PLAN-delta-recheck.md, decided 2026-10-29): after a small fix
// an expert reviews only the files that changed since its last review and the files in the diff
// that use them; its findings elsewhere carry forward, and the commit gate is unchanged.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ex = require(path.join(PLUGIN, 'experts', 'experts.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
};

const FILES = {
  'src/focus.ts': 'export function focusables(root) {\n  return [];\n}\n',
  'src/Sidebar.tsx': "import { focusables } from './focus';\nexport const Sidebar = () => null;\n",
  'src/b.js': 'module.exports = 1;\n',
  'src/c.js': 'module.exports = 2;\n',
  'src/d.js': 'module.exports = 3;\n',
  'src/e.js': 'module.exports = 4;\n',
};

/** A repository whose working tree changes all six files, as a card in progress would. */
function card() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-delta-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  for (const [f, t] of Object.entries(FILES)) write(path.join(dir, f), t);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  for (const [f, t] of Object.entries(FILES)) write(path.join(dir, f), `${t}// card change\n`);
  return dir;
}

const lane = (over = {}) => ({
  ok: true,
  expertLane: { stage: 'review', selected: ['frontend'], ran: ['frontend'], failed: [], recheck: true, skillsLoaded: { frontend: [] }, findings: [], ...over },
});

/** The full review the deltas build on: one high finding in b.js, one medium in focus.ts. */
function fullReview(dir) {
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  ex.record(dir, 'review', lane({
    findings: [
      { expert: 'frontend', file: 'src/b.js', line: 1, what: 'b drops the focus ring', confidence: 'high', status: 'confirmed' },
      { expert: 'frontend', file: 'src/focus.ts', line: 2, what: 'focusables misses disabled', confidence: 'medium', status: 'confirmed' },
    ],
  }), { pluginRoot: PLUGIN });
  return p;
}

const fix = (dir, file = 'src/focus.ts') => write(path.join(dir, file), fs.readFileSync(path.join(dir, file), 'utf8') + '// fixed\n');

test('the first experts check has nothing to narrow from, and says why', () => {
  const dir = card();
  const p = fullReview(dir);
  assert.match(p.deltaRefused, /no earlier experts check/);
  assert.equal(p.delta, undefined);
});

test('a one-file fix narrows to that file and the file that imports it; others are left out', () => {
  const dir = card();
  fullReview(dir);
  fix(dir);
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  assert.deepStrictEqual(p.delta.changed, ['src/focus.ts']);
  assert.deepStrictEqual(p.delta.dependents, [{ file: 'src/Sidebar.tsx', uses: 'src/focus.ts' }]);
  assert.deepStrictEqual(p.delta.files, ['src/focus.ts', 'src/Sidebar.tsx']);
  assert.deepStrictEqual(p.delta.experts, ['frontend']);
  assert.equal(p.delta.chain, 1);
  const text = fs.readFileSync(path.join(dir, p.deltaFile), 'utf8');
  assert.match(text, /changed: src\/focus\.ts/);
  assert.match(text, /uses src\/focus\.ts: src\/Sidebar\.tsx/);
  assert.match(text, /\+\/\/ fixed/);
  assert.doesNotMatch(text, /src\/b\.js/);
});

test('a file that names a changed file\'s export, without importing it, joins as a dependent', () => {
  const dir = card();
  // Sidebar stops importing focus.ts here, so only c.js can be the dependent (2 of 6 files).
  write(path.join(dir, 'src', 'Sidebar.tsx'), 'export const Sidebar = () => null;\n// card change\n');
  write(path.join(dir, 'src', 'c.js'), 'module.exports = 2;\n// card change\nconst f = global.focusables;\n');
  fullReview(dir);
  fix(dir);
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  assert.deepStrictEqual(p.delta.dependents, [{ file: 'src/c.js', uses: 'src/focus.ts' }]);
});

test('a change reverted out of the diff is listed as removed, and its findings do not carry forward', () => {
  const dir = card();
  fullReview(dir);
  git(dir, 'checkout', '--', 'src/b.js');
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  assert.deepStrictEqual(p.delta.removed, ['src/b.js']);
  ex.record(dir, 'review', lane({ delta: { ...p.delta } }), { pluginRoot: PLUGIN });
  const rec = JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'frontend.json'), 'utf8'));
  assert.ok(!rec.findings.some((f) => f.file === 'src/b.js'));
});

test('recording a delta carries findings on unchanged files with their ids, drops those on changed files, and the gate still blocks on a carried high finding', () => {
  const dir = card();
  fullReview(dir);
  const before = JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'frontend.json'), 'utf8'));
  const bId = before.findings.find((f) => f.file === 'src/b.js').id;
  fix(dir);
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  const r = ex.record(dir, 'review', lane({ delta: { ...p.delta } }), { pluginRoot: PLUGIN });
  assert.deepStrictEqual(r.open.map((f) => f.id), [bId], 'the carried high finding is still open');
  const rec = JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'frontend.json'), 'utf8'));
  assert.equal(rec.hash, ex.fingerprint(dir), 'recorded for the current changes');
  assert.deepStrictEqual(rec.findings.map((f) => f.file), ['src/b.js'], 'the focus.ts finding was re-reviewed, so it does not carry');
  assert.equal(rec.delta.chain, 1);

  const verdict = () => gates.commitGate(ex.commitEvidence(dir, '', PLUGIN));
  assert.match(verdict().reason || JSON.stringify(verdict()), /still open[\s\S]*b drops the focus ring/);
  ex.resolve(dir, bId, 'the user says b.js is out of this card', PLUGIN);
  assert.equal(verdict().decision === 'deny', false, 'allowed once the carried finding is dismissed');
});

test('a delta that does not build on the review on record records nothing', () => {
  const dir = card();
  fullReview(dir);
  fix(dir);
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  assert.throws(() => ex.record(dir, 'review', lane({ delta: { ...p.delta, base: 'f'.repeat(64) } }), { pluginRoot: PLUGIN }), /not the one this changed-only review builds on/);
});

test('refusals: no snapshot, a chain of three, more than 40% of the files, and experts whose reviews disagree', () => {
  let dir = card();
  fullReview(dir);
  fix(dir);
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'experts', 'snapshots'), { recursive: true });
  assert.match(ex.prepare(dir, 'working', PLUGIN, { delta: true }).deltaRefused, /no snapshot/);

  dir = card();
  fullReview(dir);
  for (let i = 1; i <= 3; i++) {
    fix(dir);
    const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
    assert.equal(p.delta.chain, i);
    ex.record(dir, 'review', lane({ delta: { ...p.delta } }), { pluginRoot: PLUGIN });
  }
  fix(dir);
  assert.match(ex.prepare(dir, 'working', PLUGIN, { delta: true }).deltaRefused, /3 changed-only reviews in a row/);

  dir = card();
  fullReview(dir);
  for (const f of ['src/c.js', 'src/d.js', 'src/e.js']) fix(dir, f);
  assert.match(ex.prepare(dir, 'working', PLUGIN, { delta: true }).deltaRefused, /3 of 6 files .*over 40%/);

  dir = card();
  fullReview(dir);
  const rec = path.join(dir, '.ultimate-workflow', 'experts', 'review', 'frontend.json');
  fs.writeFileSync(rec, JSON.stringify({ ...JSON.parse(fs.readFileSync(rec, 'utf8')), hash: 'stale' }));
  fix(dir);
  assert.match(ex.prepare(dir, 'working', PLUGIN, { delta: true }).deltaRefused, /does not cover the last checked changes/);
});

test('review.js: a narrowed expert reads the delta file; an expert the recheck adds, and the recheck itself, read the full diff', async () => {
  const run = loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'));
  const delta = { base: 'b'.repeat(64), files: ['src/focus.ts'], removed: [], chain: 1, experts: ['frontend'] };
  const { result, calls } = await run(
    { range: 'working', available: ex.list(PLUGIN).experts, experts: ['frontend'], diffFile: '.ultimate-workflow/review.diff', deltaFile: '.ultimate-workflow/delta.diff', delta, expertsDir: '/p/experts', skills: {}, expertsOnly: true },
    async (c) => (c.label === 'recheck' ? { experts: [{ name: 'security', why: 'auth' }] } : { findings: [], lensVerdict: 'clean' })
  );
  const prompt = (label) => calls.find((c) => c.label === label).prompt;
  assert.match(prompt('recheck'), /review\.diff/);
  assert.doesNotMatch(prompt('recheck'), /delta\.diff/);
  assert.match(prompt('frontend'), /delta\.diff/);
  assert.match(prompt('frontend'), /earlier findings on every other file stand/);
  assert.match(prompt('security'), /saved at \.ultimate-workflow\/review\.diff/);
  assert.doesNotMatch(prompt('security'), /delta\.diff/);
  assert.deepStrictEqual(result.expertLane.delta.experts, ['frontend']);
});

// First real-install test (2026-10-29): the recheck answered "nobody" and the expert that reviewed
// the earlier changes never saw the fix. On a delta its experts stay; the recheck can only add.
test('review.js: on a delta, the last check\'s experts stay selected when the recheck answers nobody', async () => {
  const run = loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'));
  const delta = { base: 'b'.repeat(64), files: ['src/a.css'], removed: [], chain: 1, experts: ['frontend'] };
  const { result, calls } = await run(
    { range: 'working', available: ex.list(PLUGIN).experts, experts: [], diffFile: '.ultimate-workflow/review.diff', deltaFile: '.ultimate-workflow/delta.diff', delta, expertsDir: '/p/experts', skills: {}, expertsOnly: true },
    async (c) => (c.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: 'clean' })
  );
  assert.ok(calls.some((c) => c.label === 'frontend'), 'frontend reviewed the change');
  assert.deepStrictEqual(result.expertLane.selected, ['frontend']);
  assert.deepStrictEqual(result.expertLane.delta.experts, ['frontend']);
});

test('the commands pass --delta on the experts check and only there', () => {
  const read = (f) => fs.readFileSync(path.join(PLUGIN, 'commands', f), 'utf8');
  assert.match(read('experts.md'), /prepare --range working --delta > \.ultimate-workflow\/run\/prepare\.json/);
  assert.match(read('review.md'), /with `--delta` before the `>` when this is the experts check/);
});

// PLAN-flow-fixes item 2 (decided 2026-10-29): outside a delta too, the last check's experts stay
// while the changes are the same work in progress (its snapshot and the diff share a file).
test('prepare keeps the last check\'s experts while the work shares a file with it, and not after an unrelated new change', () => {
  let dir = card();
  assert.equal(ex.prepare(dir, 'working', PLUGIN).keep, undefined, 'no earlier check');
  fullReview(dir);
  fix(dir, 'src/b.js');
  const p = ex.prepare(dir, 'working', PLUGIN);
  assert.deepStrictEqual(p.keep.experts, ['frontend']);

  dir = card();
  fullReview(dir);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'card done');
  write(path.join(dir, 'src', 'z.js'), 'module.exports = 9;\n');
  assert.equal(ex.prepare(dir, 'working', PLUGIN).keep, undefined, 'a new, unrelated change keeps nothing');
});

test('review.js: a full recheck that answers nobody still runs the experts prepare kept', async () => {
  const run = loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'));
  const { result, calls } = await run(
    { range: 'working', available: ex.list(PLUGIN).experts, experts: [], diffFile: '.ultimate-workflow/review.diff', keep: { experts: ['frontend'], base: 'b' }, expertsDir: '/p/experts', skills: {}, expertsOnly: true },
    async (c) => (c.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: 'clean' })
  );
  assert.ok(calls.some((c) => c.label === 'frontend'));
  assert.match(calls.find((c) => c.label === 'frontend').prompt, /saved at \.ultimate-workflow\/review\.diff/, 'a full review reads the full diff');
  assert.deepStrictEqual(result.expertLane.selected, ['frontend']);
});

test('prepare warns when untracked files make up most of a large diff, and names the biggest; a normal diff gets no warning', () => {
  const dir = card();
  assert.equal(ex.prepare(dir, 'working', PLUGIN).untrackedHeavy, undefined);
  write(path.join(dir, '.capture', 'run1.json'), JSON.stringify({ rows: 'x'.repeat(300 * 1024) }));
  write(path.join(dir, '.capture', 'run2.json'), JSON.stringify({ rows: 'y'.repeat(10 * 1024) }));
  const p = ex.prepare(dir, 'working', PLUGIN);
  assert.equal(p.untrackedHeavy.files, 2);
  assert.equal(p.untrackedHeavy.biggest[0].path, '.capture/run1.json');
  assert.ok(p.untrackedHeavy.share > 0.9);
});

test('plan and tests commands decode HTML-escaped markdown before writing it', () => {
  for (const c of ['plan.md', 'tests.md']) {
    assert.match(fs.readFileSync(path.join(PLUGIN, 'commands', c), 'utf8'), /HTML-escaped .* decode those five before showing or writing it, `&amp;` last/, c);
  }
});
