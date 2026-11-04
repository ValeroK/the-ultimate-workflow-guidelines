'use strict';

// PLAN-run-records.md, W3. A passing full run is already recorded with the fingerprint of the
// changes it covered, and G7 already accepts it. What was missing: a way to ask for a full run that
// does nothing when a passing one already covers the current changes, so the build's last full run,
// the experts check and the commit do not each run the suite again; and `verify.js` reading its plan
// and writing its record at the folder it was started in, where G7 does not look from a subfolder.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const verify = require(path.join(PLUGIN, 'hooks', 'verify.js'));
const { verifyKind } = require(path.join(PLUGIN, 'hooks', 'lib', 'dispatch.js'));
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

// A project whose test command counts its runs in a git-ignored file, so a run is observable.
function repo(command = 'node count.js') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-fresh-')));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src', 'deep'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 1\n');
  fs.writeFileSync(
    path.join(dir, 'count.js'),
    "const fs = require('fs'); const n = fs.existsSync('count.txt') ? Number(fs.readFileSync('count.txt', 'utf8')) : 0; fs.writeFileSync('count.txt', String(n + 1)); process.exit(fs.existsSync('fail') ? 1 : 0)\n"
  );
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\ncount.txt\nfail\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `---\nplan_confirmed: true\ntests_confirmed: true\nexperts: []\ntest_command: ${command}\n---\n`);
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 2\n'); // a source change, so a run is wanted
  return dir;
}
const runs = (dir) => {
  try {
    return Number(fs.readFileSync(path.join(dir, 'count.txt'), 'utf8'));
  } catch {
    return 0;
  }
};
const v = (cwd, ...args) => spawnSync(process.execPath, [VERIFY, ...args], { cwd, encoding: 'utf8' });
const record = (dir) => JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'verify.json'), 'utf8'));

test('--full --if-stale runs the suite when nothing covers the changes, and not again while that holds', () => {
  const dir = repo();
  const first = v(dir, '--full', '--if-stale');
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.equal(runs(dir), 1);
  const at = record(dir).at;

  const second = v(dir, '--full', '--if-stale');
  assert.equal(second.status, 0);
  assert.equal(runs(dir), 1, 'the suite must not run a second time on the same changes');
  assert.match(second.stdout, /already covers/);
  assert.equal(record(dir).at, at, 'a skipped run does not rewrite the record');
});

test('a change to the code makes the next --if-stale run the suite again', () => {
  const dir = repo();
  v(dir, '--full', '--if-stale');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 3\n');
  v(dir, '--full', '--if-stale');
  assert.equal(runs(dir), 2);
});

test('a failed full run is never counted as covering anything', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'fail'), '');
  assert.notEqual(v(dir, '--full', '--if-stale').status, 0);
  assert.equal(record(dir).passed, false);
  fs.rmSync(path.join(dir, 'fail'));
  assert.equal(v(dir, '--full', '--if-stale').status, 0);
  assert.equal(runs(dir), 2, 'the passing run happened because the failed one covered nothing');
});

test('a record made by a different test command does not count, even on the same changes', () => {
  const dir = repo();
  v(dir, '--full', '--if-stale');
  const file = path.join(dir, '.ultimate-workflow', 'verify.json');
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  rec.command = 'node a-narrower-command.js';
  fs.writeFileSync(file, JSON.stringify(rec));
  v(dir, '--full', '--if-stale');
  assert.equal(runs(dir), 2);
});

test('--full on its own always runs, as before', () => {
  const dir = repo();
  v(dir, '--full');
  v(dir, '--full');
  assert.equal(runs(dir), 2);
});

test('--if-stale says there is nothing to run when only documentation changed', () => {
  const dir = repo();
  git(dir, 'checkout', '-q', '--', 'src/a.js');
  fs.writeFileSync(path.join(dir, 'NOTES.md'), 'x\n');
  const r = v(dir, '--full', '--if-stale');
  assert.equal(r.status, 0);
  assert.equal(runs(dir), 0);
  assert.match(r.stdout, /nothing to run/);
});

test('a run is still wanted when the record is a related-tests run, not a full one', () => {
  const dir = repo();
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'verify.json'), JSON.stringify({ mode: 'related', passed: true, fingerprint: 'x', command: 'node count.js' }));
  v(dir, '--full', '--if-stale');
  assert.equal(runs(dir), 1);
});

// --- the project root ------------------------------------------------------------------------

test('verify.js started in a subfolder reads the plan and writes its record at the project root', () => {
  const dir = repo();
  const sub = path.join(dir, 'src', 'deep');
  const r = v(sub, '--full');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow', 'verify.json')), 'record at the root');
  assert.ok(!fs.existsSync(path.join(sub, '.ultimate-workflow')), 'nothing written in the subfolder');
  assert.equal(runs(dir), 1, 'the command ran at the root');

  const ev = verify.fullEvidence(dir);
  assert.equal(ev.record.passed, true);
  assert.equal(ev.record.fingerprint, ev.hash, 'G7 sees the run as covering the current changes');
});

test('a --plan path that is relative to the project root works from a subfolder', () => {
  const dir = repo();
  const r = v(path.join(dir, 'src', 'deep'), '--full', '--plan', 'PLAN-x.md');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(runs(dir), 1);
});

// --- the wiring ------------------------------------------------------------------------------

test('the gates read --full --if-stale as a full verification, so a skipped run still clears G3', () => {
  const state = { data: { test_command: 'node count.js' } };
  assert.equal(verifyKind('node "/x/hooks/verify.js" --full --if-stale', state), 'full');
});

test('the experts command asks for a full run only when one is needed', () => {
  assert.match(read('commands/experts.md'), /verify\.js" --full --if-stale/);
});

// --- why the ceo builds never got the final full run -------------------------------------------

test('the build script is given the verify command from the active plan when the arguments name no plan', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'build.args.json'), JSON.stringify({ command: 'node count.js' }));
  const r = spawnSync(process.execPath, [CLI, 'script', '--phase', 'build', '--args-file', 'build.args.json'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const embedded = JSON.parse(/const EMBEDDED_ARGS = (.*)/.exec(fs.readFileSync(JSON.parse(r.stdout).scriptPath, 'utf8'))[1]);
  assert.match(String(embedded.verify), /verify\.js/, 'a build whose arguments omit the plan must still end with the full run');
});
