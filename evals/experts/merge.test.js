'use strict';

// 4.2.1: a merge reviews only what is new in it, and a test run says which files it rewrote
// (PLAN-merge-gates.md). Real git repositories in temp folders; the gate end to end through gate.js.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const PLUGIN = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const verifyLib = require(path.join(PLUGIN, 'hooks', 'verify.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const GATE = path.join(PLUGIN, 'hooks', 'gate.js');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = (name) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `uw-merge-${name}-`));
  made.push(d);
  return d;
};
const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });

// A git that knows no identity at all, as on a fresh CI runner: the plugin must not need one.
const emptyConfig = path.join(tmp('cfg'), 'empty');
fs.writeFileSync(emptyConfig, '');
const NO_ID = { GIT_CONFIG_GLOBAL: emptyConfig, GIT_CONFIG_NOSYSTEM: '1' };
function withoutIdentity(fn) {
  const saved = {};
  for (const k of Object.keys(NO_ID)) saved[k] = process.env[k];
  Object.assign(process.env, NO_ID);
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/**
 * Starts a merge and leaves it uncommitted. Git refuses to start even `--no-commit` without an
 * identity (as on a CI runner), so it gets one for this call, and the test fails here, loudly,
 * if no merge is in progress afterwards: a gate test on a merge that never began proves nothing.
 */
function startMerge(dir, ...args) {
  git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'merge', '--no-commit', '--no-ff', ...args);
  assert.ok(fs.existsSync(path.join(dir, '.git', 'MERGE_HEAD')), 'the merge did not start');
}

/**
 * rewash has its own commit; main has others (reviewed elsewhere). The merge of main into
 * rewash is started and left uncommitted. `conflict` makes both sides edit src/f1.js;
 * `docsOnly` makes main change nothing but NOTES.md.
 */
function mergeRepo({ conflict = false, docsOnly = false, front = [] } = {}) {
  const dir = tmp('repo');
  git(dir, 'init', '-q', '-b', 'main');
  // Not the machine's line-ending setting: these tests call the plugin under a git with no system
  // config, so a repo built under autocrlf=true (the Windows default) would look modified to it.
  git(dir, 'config', 'core.autocrlf', 'false');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  for (let i = 1; i <= 4; i++) fs.writeFileSync(path.join(dir, 'src', `f${i}.js`), `export const a${i} = ${i}\n`);
  fs.writeFileSync(path.join(dir, 'NOTES.md'), 'notes\n');
  fs.writeFileSync(path.join(dir, 'test_times.json'), '{}\n');
  fs.writeFileSync(path.join(dir, 'full.js'), 'process.exit(0)\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  git(dir, 'checkout', '-q', '-b', 'rewash');
  fs.writeFileSync(path.join(dir, 'src', 'mine.js'), 'export const mine = 1\n');
  if (conflict) fs.writeFileSync(path.join(dir, 'src', 'f1.js'), "export const clash = 'mine'\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'mine');
  git(dir, 'checkout', '-q', 'main');
  if (docsOnly) fs.writeFileSync(path.join(dir, 'NOTES.md'), 'notes, edited on main\n');
  else for (const i of [2, 3, 4]) fs.writeFileSync(path.join(dir, 'src', `f${i}.js`), `export const a${i} = 'main-${i}'\n`);
  if (conflict) fs.writeFileSync(path.join(dir, 'src', 'f1.js'), "export const clash = 'main'\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'main work, reviewed there');
  git(dir, 'checkout', '-q', 'rewash');
  startMerge(dir, 'main');
  fs.writeFileSync(
    path.join(dir, 'PLAN-x.md'),
    `---\n${['plan_confirmed: true', 'tests_confirmed: true', 'experts: []', 'test_command: node full.js', ...front].join('\n')}\n---\n`
  );
  git(dir, 'config', '--unset', 'user.email');
  git(dir, 'config', '--unset', 'user.name');
  return dir;
}
const resolve = (dir) => {
  fs.writeFileSync(path.join(dir, 'src', 'f1.js'), "export const clash = 'both'\nexport const extra = 'my own new line'\n");
  git(dir, 'add', 'src/f1.js');
};

// --- G6: what a merge asks the experts to review ---------------------------------------------

test('T1 a clean merge adds nothing for the experts to review; the same files edited plainly still do', () => {
  const dir = mergeRepo();
  const c = withoutIdentity(() => experts.workingChanges(dir));
  assert.deepEqual(c.files, []);
  assert.equal(c.diff, '');
  assert.ok(withoutIdentity(() => experts.commitEvidence(dir, '')).skip, 'G6 evidence is skipped');
  git(dir, 'merge', '--abort');
  for (const i of [2, 3, 4]) fs.writeFileSync(path.join(dir, 'src', `f${i}.js`), `export const a${i} = 'edited'\n`);
  const plain = withoutIdentity(() => experts.workingChanges(dir));
  assert.equal(plain.files.length, 3, 'no merge in progress: every edited file is reviewed, as before');
});

test('T2 a hand-resolved conflict shows only the resolution, and the fingerprint follows it', () => {
  const dir = mergeRepo({ conflict: true });
  resolve(dir);
  const c = withoutIdentity(() => experts.workingChanges(dir));
  assert.deepEqual(c.files, ['src/f1.js']);
  assert.match(c.diff, /my own new line/);
  assert.doesNotMatch(c.diff, /src\/f2\.js|main-2/);
  const before = withoutIdentity(() => experts.fingerprint(dir));
  fs.writeFileSync(path.join(dir, 'src', 'f1.js'), "export const clash = 'both'\nexport const extra = 'a different line'\n");
  git(dir, 'add', 'src/f1.js');
  assert.notEqual(withoutIdentity(() => experts.fingerprint(dir)), before);
});

test('T3 an unresolved conflict, or edits not yet staged, fall back to the whole diff against HEAD', () => {
  const open = mergeRepo({ conflict: true });
  const o = withoutIdentity(() => experts.workingChanges(open));
  assert.ok(o.files.includes('src/f2.js'), 'unresolved: everything is reviewed');
  const unstaged = mergeRepo();
  fs.appendFileSync(path.join(unstaged, 'src', 'f4.js'), '// edited after staging\n');
  const u = withoutIdentity(() => experts.workingChanges(unstaged));
  assert.ok(u.files.includes('src/f2.js'), 'worktree differs from the index: everything is reviewed');
});

test('T6 a changed-only recheck is refused while a merge is being committed', () => {
  const dir = mergeRepo({ conflict: true });
  resolve(dir);
  const p = withoutIdentity(() => experts.prepare(dir, 'working', PLUGIN, { delta: true }));
  assert.match(p.deltaRefused || '', /merge/);
});

test('T7 volatile_paths still excludes a file from a merge', () => {
  const dir = mergeRepo({ conflict: true, front: ['volatile_paths: src/f1.js'] });
  resolve(dir);
  const c = withoutIdentity(() => experts.workingChanges(dir));
  assert.deepEqual(c.files, []);
});

// --- G7 and the gates end to end ------------------------------------------------------------------

const hook = (dir, command) => {
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, ...NO_ID, ULTIMATE_WORKFLOW_GATES: 'on' },
  });
  const out = r.stdout ? JSON.parse(r.stdout) : null;
  return (out && out.hookSpecificOutput && out.hookSpecificOutput.permissionDecisionReason) || '';
};
const runVerify = (dir) => spawnSync(process.execPath, [VERIFY, '--full'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...NO_ID } });

test('T4 committing a clean merge needs a passing full test run on the merged tree, and no experts', () => {
  const dir = mergeRepo();
  assert.match(hook(dir, 'git commit -m merge'), /Gate G7/, 'no full run yet');
  assert.equal(runVerify(dir).status, 0);
  assert.equal(hook(dir, 'git commit -m merge'), '', 'the full run covers the merged tree: allowed, so G6 did not hold it either');
  fs.appendFileSync(path.join(dir, 'src', 'f4.js'), '// edited after the full run\n');
  assert.match(hook(dir, 'git commit -m merge'), /Gate G[67]/, 'an edit after the run is refused again');
});

test('T4b a full run on one merge does not cover a different merge whose combined diff is also empty', () => {
  const dir = mergeRepo();
  assert.equal(runVerify(dir).status, 0);
  assert.equal(hook(dir, 'git commit -m merge'), '');
  git(dir, 'merge', '--abort');
  git(dir, 'checkout', '-q', 'main');
  fs.writeFileSync(path.join(dir, 'src', 'f2.js'), "export const a2 = 'a later change on main'\n");
  git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-am', 'later main work');
  git(dir, 'checkout', '-q', 'rewash');
  startMerge(dir, 'main');
  assert.deepEqual(withoutIdentity(() => experts.workingChanges(dir)).files, [], 'another clean merge: still nothing new for the experts');
  assert.match(hook(dir, 'git commit -m merge'), /Gate G7/, 'but its tree was never tested');
});

test('T5 a merge that changes nothing in the tree, or only documents, is not held by G7', () => {
  const same = mergeRepo();
  git(same, 'merge', '--abort');
  startMerge(same, '-s', 'ours', 'main');
  const e = withoutIdentity(() => verifyLib.fullEvidence(same));
  assert.ok(e.skip, `merge -s ours: ${JSON.stringify(e)}`);
  const docs = mergeRepo({ docsOnly: true });
  const d = withoutIdentity(() => verifyLib.fullEvidence(docs));
  assert.match(d.skip || '', /documentation/);
  const real = mergeRepo();
  assert.ok(withoutIdentity(() => verifyLib.fullEvidence(real)).hash, 'a merge that changes code needs the full run');
});

// --- the volatile hint ---------------------------------------------------------------------------------

function rewriteRepo(command, front = []) {
  const dir = tmp('rewrite');
  git(dir, 'init', '-q', '-b', 'main');
  // Not the machine's line-ending setting: these tests call the plugin under a git with no system
  // config, so a repo built under autocrlf=true (the Windows default) would look modified to it.
  git(dir, 'config', 'core.autocrlf', 'false');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'test_times.json'), '{}\n');
  fs.writeFileSync(path.join(dir, 'rewrite.js'), "require('fs').writeFileSync('test_times.json', JSON.stringify({ t: process.hrtime.bigint().toString() }) + '\\n')\n");
  fs.writeFileSync(path.join(dir, 'quiet.js'), 'process.exit(0)\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `---\n${['plan_confirmed: true', 'tests_confirmed: true', `test_command: node ${command}`, ...front].join('\n')}\n---\n`);
  return dir;
}

test('T8 a run that rewrote a tracked file names it and prints the line to add; a quiet run, or a file already volatile, prints nothing', () => {
  const noisy = runVerify(rewriteRepo('rewrite.js'));
  assert.match(noisy.stdout, /test_times\.json/);
  assert.match(noisy.stdout, /volatile_paths: test_times\.json/);
  assert.doesNotMatch(runVerify(rewriteRepo('quiet.js')).stdout, /volatile_paths/);
  assert.doesNotMatch(runVerify(rewriteRepo('rewrite.js', ['volatile_paths: test_times.json'])).stdout, /volatile_paths/);
  const more = runVerify(rewriteRepo('rewrite.js', ['volatile_paths: data/*.db']));
  assert.match(more.stdout, /volatile_paths: data\/\*\.db, test_times\.json/, 'the line to add keeps what is already listed');
});

test('T9 the stale-evidence refusals carry the volatile_paths hint; the never-checked one does not', () => {
  const stale = { hash: 'h2', recheck: { hash: 'h1', final: [] }, records: {}, planExperts: [], available: ['security'] };
  assert.match(gates.commitGate(stale).reason, /volatile_paths/);
  assert.match(gates.commitGate(stale).reason, /have not been re-checked against these changes/);
  assert.doesNotMatch(gates.commitGate({ ...stale, recheck: null }).reason, /volatile_paths/);
  const moved = gates.commitGate({ skip: 'x', tests: { command: 'node full.js', script: '', hash: 'h2', record: { mode: 'full', passed: true, fingerprint: 'h1' } } });
  assert.match(moved.reason, /volatile_paths/);
});

test('T10 the docs and the changelog describe merges and the hint', () => {
  const gatesDoc = fs.readFileSync(path.join(ROOT, 'docs', 'gates.md'), 'utf8');
  assert.match(gatesDoc, /^### Merges \(4\.2\.1\)$/m);
  assert.match(gatesDoc, /combined diff/);
  const log = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  assert.match(log, /^## \[4\.2\.1\]/m);
  assert.match(log, /merge/i);
});
