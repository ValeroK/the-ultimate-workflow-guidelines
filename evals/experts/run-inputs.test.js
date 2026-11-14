'use strict';

// PLAN-simplify, card run-inputs. Fault 17: a backticked name with no folder that does not exist is a warning in the
// pack, not a park. Fault 19: the run refuses when the plugin is another checkout of the same repository.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const autopilot = require(path.join(PLUGIN, 'experts', 'autopilot.js'));
const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-inputs-')));
  made.push(dir);
  return dir;
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

function planRepo(goal) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  write(dir, 'src/a.js', 'x\n');
  write(dir, 'PLAN-x.md', `---\nphase: build\nplan_confirmed: true\ntests_confirmed: true\ntest_command: node --test\nexperts: []\n---\n\n# PLAN: x\n\n## Goal\n\n${goal}\n\n## Cards\n\n- 1: a\n  paths: src/a.js\n\n## Tests\n\n### 1: a\n\n- it works\n`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return dir;
}
const pack = (dir) => autopilot.pack(dir, { plan: 'PLAN-x.md', card: '1', feature: 'x' });

test('fault 17: a backticked name with no slash that does not exist is a pack warning, not a park', () => {
  const dir = planRepo('Read `README.md` and `docs/design.md` first.');
  write(dir, 'docs/design.md', '# Design\n');
  const r = pack(dir);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.ok((r.warnings || []).some((w) => /README\.md/.test(w) && /does not exist/.test(w)), JSON.stringify(r.warnings));
  // A name with a folder that is missing is still an input the run cannot do without.
  const missing = planRepo('Read `docs/missing.md` first.');
  const bad = pack(missing);
  assert.strictEqual(bad.ok, false);
  assert.match(bad.reason, /docs\/missing\.md/);
});

test('fault 19: run-start refuses when the plugin root is another checkout of the same repository', () => {
  const main = tmp();
  git(main, 'init', '-q', '-b', 'main');
  git(main, 'config', 'user.email', 't@t');
  git(main, 'config', 'user.name', 't');
  write(main, 'a.txt', 'x\n');
  git(main, 'add', '-A');
  git(main, 'commit', '-q', '-m', 'base');
  const other = path.join(tmp(), 'wt');
  git(main, 'worktree', 'add', '-q', '-b', 'other', other);
  const unrelated = planRepo('x');
  assert.strictEqual(typeof autopilot.pluginIsAnotherCheckout, 'function');
  assert.ok(autopilot.pluginIsAnotherCheckout(main, other), 'a plugin in another worktree of the same repository');
  assert.ok(!autopilot.pluginIsAnotherCheckout(main, main), 'the same checkout is fine');
  assert.ok(!autopilot.pluginIsAnotherCheckout(main, unrelated), 'a plugin from an unrelated repository is fine');
  assert.ok(!autopilot.pluginIsAnotherCheckout(unrelated, PLUGIN), 'this plugin copy and a different project are fine');
});

test('fault 22: the pack drops optional entries only, lists each dropped path, and goes on with a warning when the card\'s own files are over budget', () => {
  const dir = planRepo('x');
  write(dir, 'PLAN-x.md', fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8').replace('experts: []', 'experts: []\npack_budget: 5'));
  write(dir, 'src/a.js', 'y'.repeat(4000));
  const r = pack(dir);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(r.overBudget, true);
  assert.ok(fs.readFileSync(path.join(dir, r.contextFile), 'utf8').includes('src/a.js'), 'the card\'s own file is never dropped');
  assert.ok(Array.isArray(r.dropped));
});

test('fault 22: confirming the test plan shows the pack warning at plan time, the same one the run would show', () => {
  const dir = planRepo('x');
  write(dir, 'PLAN-x.md', fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8').replace('plan_confirmed: true\ntests_confirmed: true', 'plan_confirmed: true\ntests_confirmed: false').replace('experts: []', 'experts: []\npack_budget: 5'));
  write(dir, 'result.json', JSON.stringify({ summary: 's', logs: [], result: { ok: true, testsMarkdown: '## Tests\n\n- it works\n' } }));
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'present', '--result', 'result.json', '--field', 'testsMarkdown', '--out', 'PLAN-x.md', '--append', '--confirm', 'tests_confirmed'], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.ok(Array.isArray(out.packWarnings) && out.packWarnings.length > 0, r.stdout);
  assert.match(out.packWarnings[0], /card 1/);
  assert.match(out.packWarnings[0], /budget of 5/);
});

test('size limits: an over-long journal or expert answer warns and does not stop the run (no limit in the run script ends it)', () => {
  const run = expertsLib.assemblePhase(PLUGIN, 'run');
  assert.ok(!/budget exceeded|too long.*(return|park)/i.test(run));
});

test('fault 19: the implementer brief states that the plugin root is read-only', () => {
  const loop = expertsLib.sharedSections(PLUGIN)['build-loop'];
  assert.match(loop, /plugin's own folder[^.]*is read-only: never create or edit a file in it/);
});
