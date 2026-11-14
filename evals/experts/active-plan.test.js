'use strict';

// PLAN-simplify, card active-plan. The plan a hook works on is chosen, not guessed: with exactly one open
// plan that plan is active; with several and no pointer none is, whatever their modification times, and
// `experts.js use --plan` is the command that picks one. A commit in the unchosen state goes through
// unchecked and says so (owner decision, 2026-11-13).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const GATE = path.join(PLUGIN, 'hooks', 'gate.js');
const state = require(path.join(PLUGIN, 'hooks', 'lib', 'state.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-active-')));
  made.push(dir);
  return dir;
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const plan = (extra = '') => `---\nphase: build\nplan_confirmed: true\ntests_confirmed: true\ntest_command: node --test x\n${extra}---\nbody\n`;
const env = () => {
  const e = { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const use = (dir, value) => spawnSync(process.execPath, [CLI, 'use', '--plan', value], { cwd: dir, encoding: 'utf8', env: env() });
const pointer = (dir) => (fs.existsSync(path.join(dir, '.ultimate-workflow', 'active-plan')) ? fs.readFileSync(path.join(dir, '.ultimate-workflow', 'active-plan'), 'utf8') : null);

test('active plan: exactly one plan not done is active without a pointer', () => {
  const dir = tmp();
  write(dir, 'PLAN-a.md', plan());
  write(dir, 'PLAN-old.md', plan().replace('phase: build', 'phase: done'));
  const s = state.readState(dir);
  assert.strictEqual(s.stage, 'feature');
  assert.strictEqual(path.basename(s.file), 'PLAN-a.md');
});

test('active plan: several plans and no pointer picks none, whatever their mtimes', () => {
  const dir = tmp();
  write(dir, 'PLAN-a.md', plan());
  write(dir, 'PLAN-b.md', plan());
  const older = new Date('2026-01-01T00:00:00Z');
  const newer = new Date('2026-06-01T00:00:00Z');
  for (const [a, b] of [[older, newer], [newer, older]]) {
    fs.utimesSync(path.join(dir, 'PLAN-a.md'), a, a);
    fs.utimesSync(path.join(dir, 'PLAN-b.md'), b, b);
    const s = state.readState(dir);
    assert.strictEqual(s.stage, 'feature');
    assert.strictEqual(s.file, null, 'no plan is guessed');
    assert.deepStrictEqual(s.several.map((f) => path.basename(f)).sort(), ['PLAN-a.md', 'PLAN-b.md']);
  }
});

test('active plan: experts.js use --plan sets the pointer and the next read returns that plan', () => {
  const dir = tmp();
  write(dir, 'PLAN-a.md', plan());
  write(dir, 'plans/PLAN-b.md', plan());
  write(dir, 'PLAN-c.md', plan());
  assert.strictEqual(state.readState(dir).file, null);
  const r = use(dir, 'plans/PLAN-b.md');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(pointer(dir).trim(), 'plans/PLAN-b.md');
  assert.strictEqual(path.basename(state.readState(dir).file), 'PLAN-b.md');
});

test('active plan: use --plan refuses a path outside the project or not a plan, and leaves the pointer as it was', () => {
  const dir = tmp();
  write(dir, 'PLAN-a.md', plan());
  write(dir, 'PLAN-b.md', plan());
  write(dir, 'notes.md', 'x');
  const outside = tmp();
  write(outside, 'PLAN-out.md', plan());
  assert.strictEqual(use(dir, 'PLAN-a.md').status, 0);
  const before = pointer(dir);
  for (const value of ['../PLAN-b.md', 'sub/../../PLAN-b.md', path.join(outside, 'PLAN-out.md'), 'C:/x/PLAN-b.md', 'notes.md', 'PLAN-nope.md']) {
    const r = use(dir, value);
    assert.notStrictEqual(r.status, 0, `${value} is refused`);
    assert.ok(r.stderr.includes(value), `${value} is named in stderr: ${r.stderr}`);
    assert.strictEqual(pointer(dir), before, `the pointer is unchanged after ${value}`);
  }
  // A link inside the project that leads outside it, where the platform lets one be made.
  try {
    fs.symlinkSync(path.join(outside, 'PLAN-out.md'), path.join(dir, 'PLAN-l.md'));
    const r = use(dir, 'PLAN-l.md');
    assert.notStrictEqual(r.status, 0);
    assert.strictEqual(pointer(dir), before);
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EACCES' && err.code !== 'ENOSYS') throw err;
  }
});

test('active plan: resolveStage and activePlanFiles agree for zero, one and several plans', () => {
  const dir = tmp();
  assert.strictEqual(state.resolveStage(dir), 'none');
  assert.strictEqual(state.activePlanFiles(dir).length, 0);
  write(dir, 'PLAN-a.md', plan());
  assert.strictEqual(state.resolveStage(dir), 'feature');
  assert.strictEqual(state.activePlanFiles(dir).length, 1);
  write(dir, 'PLAN-b.md', plan());
  assert.strictEqual(state.resolveStage(dir), 'feature');
  assert.strictEqual(state.activePlanFiles(dir).length, 2);
  assert.strictEqual(state.readState(dir).file, null);
});

test('active plan: the exempt message names the use command', () => {
  const dir = tmp();
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  write(dir, 'PLAN-a.md', plan());
  write(dir, 'PLAN-b.md', plan());
  write(dir, 'src/a.js', 'x\n');
  const r = spawnSync(process.execPath, [GATE], { input: JSON.stringify({ cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit -am x' } }), encoding: 'utf8', cwd: dir, env: env() });
  assert.strictEqual(r.status, 0);
  const text = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(text, /several plans and no active plan chosen/);
  assert.match(text, /experts\.js use --plan/);
});
