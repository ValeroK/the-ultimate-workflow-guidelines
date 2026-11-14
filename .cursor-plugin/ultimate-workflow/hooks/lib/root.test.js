'use strict';

// The gates find the project root before they read anything (PLAN-run-records.md, W0a).
//
// A hook fires with the cwd the host happens to be in. In the re-wash a build agent working in
// dashboard/src fired it there: the plan lives at the root, so every gate saw "no plan" and allowed,
// and the heartbeat landed in dashboard/src/.ultimate-workflow, where a test that guards that tree
// failed on it in every worktree.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

{
  const made = [];
  const mkdtemp = fs.mkdtempSync;
  fs.mkdtempSync = (...args) => {
    const dir = mkdtemp(...args);
    made.push(dir);
    return dir;
  };
  process.on('exit', () => {
    for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
  });
}

const stateLib = require('./state.js');

const GATE = path.join(__dirname, '..', 'gate.js');
const STATUS = path.join(__dirname, '..', 'status.js');
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-root-')));
const mkdirs = (...p) => fs.mkdirSync(path.join(...p), { recursive: true });

test('projectRoot is the nearest ancestor holding a .git directory', () => {
  const root = tmp();
  mkdirs(root, '.git');
  mkdirs(root, 'dashboard', 'src');
  assert.equal(stateLib.projectRoot(path.join(root, 'dashboard', 'src')), root);
  assert.equal(stateLib.projectRoot(root), root);
});

test('projectRoot accepts a .git file, which is what a git worktree has', () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, '.git'), 'gitdir: /elsewhere\n');
  mkdirs(root, 'a', 'b');
  assert.equal(stateLib.projectRoot(path.join(root, 'a', 'b')), root);
});

test('projectRoot accepts a directory that holds a plan, with or without git', () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, 'PLAN-x.md'), '---\nplan_confirmed: false\n---\n');
  mkdirs(root, 'src');
  assert.equal(stateLib.projectRoot(path.join(root, 'src')), root);

  const prd = tmp();
  fs.writeFileSync(path.join(prd, 'PRD.md'), '---\nprd_confirmed: false\n---\n');
  mkdirs(prd, 'src');
  assert.equal(stateLib.projectRoot(path.join(prd, 'src')), prd);
});

test('a plan below a git root wins, so a project kept in a subfolder keeps its own gates', () => {
  const repo = tmp();
  mkdirs(repo, '.git');
  mkdirs(repo, 'app', 'src');
  fs.writeFileSync(path.join(repo, 'app', 'PLAN-x.md'), '---\nplan_confirmed: false\n---\n');
  assert.equal(stateLib.projectRoot(path.join(repo, 'app', 'src')), path.join(repo, 'app'));
});

test('with no marker anywhere the folder itself is the root', () => {
  const dir = tmp();
  mkdirs(dir, 'x');
  assert.equal(stateLib.projectRoot(path.join(dir, 'x')), path.join(dir, 'x'));
});

test('a stray .ultimate-workflow folder is not a marker, or one bad write would make itself the root', () => {
  const root = tmp();
  mkdirs(root, '.git');
  mkdirs(root, 'dashboard', 'src', '.ultimate-workflow');
  assert.equal(stateLib.projectRoot(path.join(root, 'dashboard', 'src')), root);
});

function project() {
  const root = tmp();
  mkdirs(root, '.git');
  fs.writeFileSync(path.join(root, 'PLAN-x.md'), '---\nplan_confirmed: false\n---\n');
  mkdirs(root, 'dashboard', 'src');
  return root;
}

const editPayload = (cwd, file) => ({
  hook_event_name: 'PreToolUse',
  permission_mode: 'auto',
  cwd,
  tool_name: 'Write',
  tool_input: { file_path: file },
});

test('gate.js fired from a subfolder still enforces the root plan', () => {
  const root = project();
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'base'], { cwd: root });
  const sub = path.join(root, 'dashboard', 'src');
  fs.writeFileSync(path.join(sub, 'a.js'), 'x\n');
  const commit = (cwd) => spawnSync(process.execPath, [GATE], { input: JSON.stringify({ hook_event_name: 'PreToolUse', cwd, tool_name: 'Bash', tool_input: { command: 'git commit -am x' } }), encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  const r = commit(sub);
  assert.equal(r.status, 2, `an unconfirmed plan must refuse the commit; got exit ${r.status}, stdout ${r.stdout}`);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason, /plan_confirmed/);
});

test('gate.js fired from a subfolder writes its commit-check stamp at the root and nothing in the subfolder', () => {
  const root = project();
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'base'], { cwd: root });
  const sub = path.join(root, 'dashboard', 'src');
  fs.writeFileSync(path.join(sub, 'a.js'), 'x\n');
  const commit = (cwd) => spawnSync(process.execPath, [GATE], { input: JSON.stringify({ hook_event_name: 'PreToolUse', cwd, tool_name: 'Bash', tool_input: { command: 'git commit -am x' } }), encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  commit(sub);
  assert.ok(fs.existsSync(path.join(root, '.ultimate-workflow', 'commit-check.json')), 'the stamp is at the root');
  assert.ok(!fs.existsSync(path.join(sub, '.ultimate-workflow')), 'no stray folder in the subfolder');
});

test('status.js run from a subfolder reports the root project', () => {
  const root = project();
  const sub = path.join(root, 'dashboard', 'src');
  const r = spawnSync(process.execPath, [STATUS, '--json'], { cwd: sub, encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  assert.equal(j.stage, 'feature');
  assert.ok(j.file && j.file.endsWith('PLAN-x.md'));
});
