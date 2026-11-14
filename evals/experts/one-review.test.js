'use strict';

// PLAN-simplify, card one-review (the parts built in this branch). Fault 20: `prepare --range` listed the files of
// the working tree, not the files of the range it saved.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
};

test('fault 20: prepare --range lists files from the saved diff, not the working tree', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-range-')));
  made.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'base.js'), '1\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  fs.writeFileSync(path.join(dir, 'in-range.js'), '2\n');
  fs.writeFileSync(path.join(dir, 'gone.js'), '3\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'range');
  fs.rmSync(path.join(dir, 'gone.js')); // in the diff, deleted from the tree
  fs.writeFileSync(path.join(dir, 'only-in-tree.js'), '4\n'); // in the tree, not in the diff
  const r = spawnSync(process.execPath, [CLI, 'prepare', '--range', 'HEAD~1..HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepStrictEqual([...out.files].sort(), ['gone.js', 'in-range.js']);
  assert.ok(fs.existsSync(path.join(dir, out.diffFile)), 'one saved diff location, which is the one named');
});

test('one review: the by-hand review and the run use one list of core lenses', () => {
  const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
  const review = experts.assemblePhase(PLUGIN, 'review');
  const run = experts.assemblePhase(PLUGIN, 'run');
  assert.ok(review.includes('const CORE = CORE_LENSES') && run.includes('const REVIEW_LENSES = CORE_LENSES'));
  for (const text of [review, run]) assert.strictEqual(text.split("const CORE_LENSES = ['correctness', 'simplicity', 'surgical-scope', 'test-coverage']").length - 1, 1);
});

// ---- review bounds, cost and labels (the run's per-card experts check, which is the shared section) ----

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const AVAILABLE = experts.list(PLUGIN).experts;

function reviewArgs(over = {}) {
  return { range: 'working', available: AVAILABLE, experts: ['security'], diffFile: 'd.diff', expertsDir: '/p/experts', plan: 'PLAN-x.md', skills: {}, expertsOnly: true, ...over };
}

test('review cost: by hand with one expert and no recheck retry the agent calls are recheck + the expert + refuter-free', async () => {
  const labels = [];
  await loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'))(reviewArgs(), (c) => {
    labels.push(c.label);
    return c.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: 'clean' };
  });
  assert.deepStrictEqual(labels, ['recheck', 'security'], 'no lens in an experts-only review, no refuter with no findings');
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', '4.8.0', 'recorded', 'review-call-counts.json'), 'utf8'));
  const full = [];
  await loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'))(reviewArgs({ expertsOnly: false }), (c) => {
    full.push(c.label);
    return c.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: 'clean' };
  });
  assert.strictEqual(full.length, baseline.oneExpert.count, 'the by-hand review still makes the number of calls recorded in card baseline');
});

test('review model: the by-hand review passes no model, and the run passes its model setting', async () => {
  const calls = [];
  await loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'))(reviewArgs(), (c) => {
    calls.push(c);
    return c.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: 'clean' };
  });
  assert.ok(calls.every((c) => c.model === undefined), 'no call pins a model by hand');
  const run = experts.assemblePhase(PLUGIN, 'run');
  assert.match(run, /\.\.\.modelOpt\(IMPLEMENTER_MODEL\)/, 'the run pins its model setting on the experts check');
});

test('review bounds: the run asks an empty recheck once more and an empty expert once more, and no more than that', () => {
  const shared = experts.sharedSections(PLUGIN)['cards-experts-check'];
  const lane = experts.sharedSections(PLUGIN)['experts-check'];
  assert.strictEqual((lane.match(/:retry`/g) || []).length, 1, 'the one shared recheck function holds the one retry label');
  assert.ok(shared.includes(':recheck`, selected, AVAILABLE, true)'), 'the run asks for the retry');
  assert.strictEqual((shared.match(/:retry`/g) || []).length, 2, 'expert and refute each get exactly one retry label');
  assert.match(shared, /if \(!v\) failed\.push\('refute'\)/, 'a refute that answers nothing twice is a failed check, so no fix round is paid on unchecked findings');
});

test('review labels: the labels of the run\'s experts check are built from the card, the tag and the role only', () => {
  const shared = experts.sharedSections(PLUGIN)['cards-experts-check'];
  for (const m of shared.matchAll(/label: ?`?([^,}]*)/g)) assert.ok(!/Date|random|Math/.test(m[1]), m[1]);
  assert.ok(/\$\{card\.name\}\$\{tag\}:\$\{e\.name\}/.test(shared));
});

test('concern 11: a finding the refuter could not rule on is named unverified, never confirmed', async () => {
  const high = { file: 'src/a.js', line: 1, what: 'The check is skipped for admins', howItFails: 'an admin reads any order', confidence: 'high', basis: 'general' };
  const { result } = await loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'))(reviewArgs(), (c) => {
    if (c.label === 'recheck') return { experts: [] };
    if (c.label === 'security') return { findings: [high], lensVerdict: 'found one' };
    return null; // the refuter answers nothing
  });
  const f = result.expertLane.findings.find((x) => x.expert === 'security');
  assert.ok(f, JSON.stringify(result.expertLane.findings));
  assert.strictEqual(f.status, 'unverified');
});

test('saved diff: one location is written and read: prepare names .ultimate-workflow/review.diff and the run reads that same path', () => {
  const run = experts.assemblePhase(PLUGIN, 'run');
  const shared = experts.sharedSections(PLUGIN)['cards-experts-check'];
  assert.ok(shared.includes('.ultimate-workflow/review.diff'));
  assert.ok(!/delta\.diff|review\.[a-z]+\.diff/.test(shared));
  assert.ok(run.includes('.ultimate-workflow/review.diff') || shared.includes('.ultimate-workflow/review.diff'));
});

test('review-core: the shared findings schema keeps stillPresent, which the run\'s experts check reads to carry unfixed findings forward', () => {
  const core = experts.sharedSections(PLUGIN)['review-core'];
  assert.match(core, /stillPresent: \{ type: 'array', items: \{ type: 'integer' \}/);
  const check = experts.sharedSections(PLUGIN)['cards-experts-check'];
  assert.ok(check.includes('stillPresent'));
});

// ---- the experts check: one set of functions the by-hand review and the run's card check both call ----

test('one experts check: the by-hand review and the run call the same recheck, concern and lane-finding functions, and neither writes its own', () => {
  const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
  const raw = (name) => fs.readFileSync(path.join(PLUGIN, 'phases', `${name}.js`), 'utf8');
  for (const name of ['review', 'run']) {
    const staged = experts.assemblePhase(PLUGIN, name);
    for (const fn of ['recheckAdd', 'collectConcerns', 'laneFinding']) {
      assert.strictEqual(staged.split(`function ${fn}(`).length - 1 + staged.split(`const ${fn} = `).length - 1, 1, `${name}: ${fn} is declared once (the shared one)`);
      assert.ok(staged.includes(`${fn}(`), `${name} calls ${fn}`);
      assert.ok(!raw(name).includes(`function ${fn}(`) && !raw(name).includes(`const ${fn} = `), `${name}.js declares no ${fn} of its own`);
    }
    // The pieces those functions replace are gone from the scripts themselves.
    assert.ok(!/basisQuote: f\.basisQuote/.test(raw(name)), `${name}.js does not map a finding into the lane itself`);
    assert.ok(!/\.slice\(0, 3\)|CONCERN_CAP/.test(raw(name)), `${name}.js does not cap concerns itself`);
  }
  assert.ok(!/addOnly\(/.test(fs.readFileSync(path.join(PLUGIN, 'phases', 'run.js'), 'utf8')), 'run.js does not merge the recheck answer itself');
});
