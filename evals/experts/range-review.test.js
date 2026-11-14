'use strict';

// Run-one-review, range reviews: a review of a range is recorded under a fingerprint of that range, never of the
// working tree, so its findings are not open for a commit of the working tree; `check --range` is the question for
// a range; a record of an empty tree reviews nothing.

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
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim();
};
const cli = (cwd, args, input) => spawnSync(process.execPath, [CLI, ...args], { cwd, input, encoding: 'utf8' });
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

/** A repository with a base commit and one more commit (the range), and a clean working tree. */
function repoWithRange() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-range-review-')));
  made.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, 'src/a.js', 'module.exports = 1;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  const base = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/a.js', 'module.exports = 2;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'change');
  return { dir, base, range: `${base}..HEAD` };
}

const HIGH = { expert: 'security', file: 'src/a.js', line: 1, what: 'The value is trusted', confidence: 'high', severity: 'high', basis: 'general', status: 'confirmed' };
const lane = (findings) => JSON.stringify({ ok: true, expertLane: { stage: 'review', available: ['security'], planned: [], selected: ['security'], added: ['security'], ran: ['security'], failed: [], recheck: true, findings, concerns: [] } });

function reviewRange(dir, range, findings) {
  const p = cli(dir, ['prepare', '--range', range]);
  assert.strictEqual(p.status, 0, p.stderr);
  const r = cli(dir, ['record', '--stage', 'review'], lane(findings));
  assert.strictEqual(r.status, 0, r.stderr);
  return { prepared: JSON.parse(p.stdout), recorded: JSON.parse(r.stdout) };
}

test('range review: a range is fingerprinted by the range, not by the working tree', () => {
  const { dir, range } = repoWithRange();
  const p = JSON.parse(cli(dir, ['prepare', '--range', range]).stdout);
  const work = JSON.parse(cli(dir, ['prepare']).stdout);
  assert.notStrictEqual(p.hash, work.hash, 'the range hash is not the working-tree hash');
  assert.strictEqual(JSON.parse(cli(dir, ['prepare', '--range', range]).stdout).hash, p.hash, 'and it is stable');
});

test('range review: its high finding is not open for the working tree, also on a clean tree and on a dirty one', () => {
  const { dir, range } = repoWithRange();
  reviewRange(dir, range, [HIGH]);
  // A range review keeps its records apart from the working tree's evidence: nothing of it is listed or open there.
  assert.deepStrictEqual(JSON.parse(cli(dir, ['findings']).stdout).findings, [], 'a clean tree');
  write(dir, 'src/b.js', 'module.exports = 3;\n');
  assert.deepStrictEqual(JSON.parse(cli(dir, ['findings']).stdout).findings, [], 'a dirty tree too');
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow', 'experts', 'ranges')), 'the record is under ranges');
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'security.json')), 'and not where the working tree reads');
});

test('range review: a record of an empty tree is never open (the old stale finding)', () => {
  const { dir } = repoWithRange();
  // What 5.0.0 wrote for a range review on a clean tree: the hash of the empty working diff and no range.
  const empty = JSON.parse(cli(dir, ['prepare']).stdout).hash;
  const file = path.join(dir, '.ultimate-workflow', 'experts', 'review', 'security.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ stage: 'review', name: 'security', at: 'x', hash: empty, findings: [{ ...HIGH, id: 'd556b629f4' }], concerns: [] }));
  const f = JSON.parse(cli(dir, ['findings']).stdout).findings.find((x) => x.id === 'd556b629f4');
  assert.ok(f, 'it is still listed, with its record');
  assert.strictEqual(f.current, false);
});

test('range review: check --range says reviewed and clean, reviewed with a high finding open, and not reviewed', () => {
  const { dir, base, range } = repoWithRange();
  const none = cli(dir, ['check', '--range', range]);
  assert.strictEqual(none.status, 1);
  assert.strictEqual(JSON.parse(none.stdout).reviewed, false);
  reviewRange(dir, range, []);
  const clean = cli(dir, ['check', '--range', range]);
  assert.strictEqual(clean.status, 0, clean.stdout);
  assert.deepStrictEqual({ ok: JSON.parse(clean.stdout).ok, reviewed: JSON.parse(clean.stdout).reviewed, open: JSON.parse(clean.stdout).open.length }, { ok: true, reviewed: true, open: 0 });
  reviewRange(dir, range, [HIGH]);
  const open = cli(dir, ['check', '--range', range]);
  assert.strictEqual(open.status, 1);
  assert.strictEqual(JSON.parse(open.stdout).open.length, 1);
  // Another range was never reviewed.
  write(dir, 'src/a.js', 'module.exports = 4;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'more');
  assert.strictEqual(JSON.parse(cli(dir, ['check', '--range', `${base}..HEAD`]).stdout).reviewed, false, 'the range grew, so the earlier review does not cover it');
});

test('range review: the working-tree commit check still reads working-tree records as before', () => {
  const { dir } = repoWithRange();
  write(dir, 'src/a.js', 'module.exports = 5;\n');
  cli(dir, ['prepare']);
  const r = cli(dir, ['record', '--stage', 'review'], lane([HIGH]));
  assert.strictEqual(r.status, 0, r.stderr);
  const f = JSON.parse(cli(dir, ['findings']).stdout).findings;
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].current, true, 'a review of the working tree is current for that tree');
});
