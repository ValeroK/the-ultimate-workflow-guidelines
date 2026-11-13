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
