'use strict';

// PLAN-simplify, card one-harvest. A feature is harvested once: its branch is uw/harvest/<feature>, the name is
// written to run.json before the branch is made, and a second call (or a resume after a crash) returns the recorded
// branch instead of making a -2.

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
  assert.strictEqual(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const gitTry = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_NOTIFY: 'off' } });
const last = (r) => JSON.parse(r.stdout.trim().split(/\r?\n/).pop());
const refs = (dir) => git(dir, 'for-each-ref', '--format=%(refname) %(objectname)');

function repo() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-harv-')));
  made.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 'AGENTS.md', '# Rules\n\n## Gotchas\n\n- Old one.\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  write(dir, '.ultimate-workflow/run/calc/harvest.json', JSON.stringify([{ destination: 'gotcha', path: 'AGENTS.md', text: '- A new lesson.', source: 'card 1', rationale: 'r' }]));
  return dir;
}
const harvest = (dir, feature = 'calc') => cli(dir, 'harvest-branch', '--feature', feature, '--from', `.ultimate-workflow/run/${feature}/harvest.json`);
const runJson = (dir, feature = 'calc') => JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'run', feature, 'run.json'), 'utf8'));
const setRecorded = (dir, value, feature = 'calc') => write(dir, `.ultimate-workflow/run/${feature}/run.json`, JSON.stringify({ feature, harvestBranch: value, reviewedHead: 'abc' }));

test('harvest once: a second harvest-branch call returns the recorded branch and makes no new ref', () => {
  const dir = repo();
  const first = last(harvest(dir));
  assert.strictEqual(first.ok, true, JSON.stringify(first));
  assert.strictEqual(first.branch, 'uw/harvest/calc');
  assert.strictEqual(runJson(dir).harvestBranch, 'uw/harvest/calc', 'the name is recorded');
  const before = refs(dir);
  const second = last(harvest(dir));
  assert.strictEqual(second.ok, true, JSON.stringify(second));
  assert.strictEqual(second.branch, 'uw/harvest/calc');
  assert.strictEqual(refs(dir), before);
});

test('harvest once: when making the branch fails the name is already in run.json, and the next call ends with exactly one uw/harvest/<feature> and no -2', () => {
  const dir = repo();
  git(dir, 'branch', 'uw/harvest'); // a branch named uw/harvest blocks the ref uw/harvest/calc
  const failed = last(harvest(dir));
  assert.strictEqual(failed.ok, false, JSON.stringify(failed));
  assert.strictEqual(runJson(dir).harvestBranch, 'uw/harvest/calc', 'recorded before the branch was made');
  git(dir, 'branch', '-D', 'uw/harvest');
  const again = last(harvest(dir));
  assert.strictEqual(again.ok, true, JSON.stringify(again));
  const mine = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/heads/uw/harvest/').split('\n').filter(Boolean);
  assert.deepStrictEqual(mine, ['refs/heads/uw/harvest/calc']);
});

test('harvest safety: a recorded branch that is not the computed name is an error and no ref moves', () => {
  for (const bad of ['main', 'master', '-x', 'uw/run/calc', 'uw/harvest/other', 'uw/harvest/calc/../../main', 'refs/heads/main', 'uw/harvest/calc-2x', 'uw/harvest/calc -f', 'uw/harvest/calcx', ['main']]) {
    const dir = repo();
    git(dir, 'branch', 'other-branch');
    git(dir, 'branch', 'uw/harvest/other');
    if (bad === 'uw/harvest/other') git(dir, 'branch', '-f', 'uw/harvest/other');
    setRecorded(dir, bad);
    const before = refs(dir);
    const treeBefore = git(dir, 'status', '--porcelain');
    const r = last(harvest(dir));
    assert.strictEqual(r.ok, false, `${JSON.stringify(bad)}: ${JSON.stringify(r)}`);
    assert.match(r.reason, /recorded harvest branch/);
    assert.strictEqual(refs(dir), before, `${JSON.stringify(bad)}: no ref moved`);
    assert.strictEqual(git(dir, 'status', '--porcelain'), treeBefore);
  }
});

test('harvest: a recorded uw/harvest/<feature>-2 from a 4.8.0 run is recognised as open, used, and no new -N is made', () => {
  const dir = repo();
  git(dir, 'branch', 'uw/harvest/calc-2');
  setRecorded(dir, 'uw/harvest/calc-2');
  const before = refs(dir);
  const r = last(harvest(dir));
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(r.branch, 'uw/harvest/calc-2');
  assert.strictEqual(refs(dir), before);
  // A recorded -2 whose ref does not exist is not used: the computed name is made.
  const dir2 = repo();
  setRecorded(dir2, 'uw/harvest/calc-2');
  const made2 = last(harvest(dir2));
  assert.strictEqual(made2.ok, false);
});

test('harvest: the last output line keeps ok, branch, commits and reason', () => {
  const dir = repo();
  const r = last(harvest(dir));
  for (const k of ['ok', 'branch', 'commits']) assert.ok(k in r, k);
  assert.ok(Array.isArray(r.commits));
  const bad = last(cli(dir, 'harvest-branch', '--feature', 'other', '--from', 'nope.json'));
  assert.strictEqual(bad.ok, false);
});

test('run.json has one writer: a harvest write keeps reviewedHead and pendingFindings', () => {
  const dir = repo();
  write(dir, '.ultimate-workflow/run/calc/run.json', JSON.stringify({ feature: 'calc', reviewedHead: 'abc123', pendingFindings: [{ what: 'x' }] }));
  assert.strictEqual(last(harvest(dir)).ok, true);
  const state = runJson(dir);
  assert.strictEqual(state.reviewedHead, 'abc123');
  assert.deepStrictEqual(state.pendingFindings, [{ what: 'x' }]);
  assert.strictEqual(state.harvestBranch, 'uw/harvest/calc');
});

test('one review, one harvest: phases/run.js and phases/harvest.js declare no harvest schema of their own and share one', () => {
  const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
  for (const f of ['run', 'harvest']) {
    const own = fs.readFileSync(path.join(PLUGIN, 'phases', `${f}.js`), 'utf8');
    assert.ok(!/^const PROPOSALS = /m.test(own), `${f}.js declares PROPOSALS`);
    assert.ok(/^\/\/ @shared harvest-proposals/m.test(own), `${f}.js names the shared section`);
    assert.strictEqual(experts.assemblePhase(PLUGIN, f).split('const PROPOSALS = {').length - 1, 1);
  }
});

test('harvest: an empty answer and a failed branch step are not recorded as done (run-phase 57, 57b), and the run still uses one harvest agent', () => {
  const run = fs.readFileSync(path.join(__dirname, 'run-phase.test.js'), 'utf8');
  assert.ok(/57: the review and the harvest are recorded apart/.test(run) && /57b: a harvest whose branch step failed is not recorded as done/.test(run));
  const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
  assert.strictEqual((experts.assemblePhase(PLUGIN, 'run').match(/agentType: agentName\('uw-harvester'\)/g) || []).length, 1);
});
