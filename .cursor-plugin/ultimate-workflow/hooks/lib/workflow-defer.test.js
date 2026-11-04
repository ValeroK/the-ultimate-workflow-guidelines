'use strict';

// G3 and a background workflow (PLAN-run-records.md, W2).
//
// In the re-wash, G3 fired at the end of the main session's turn while a build workflow was still
// running, forcing a verify of half-built code (twice per card). A Stop hook payload lists the
// running workflow in `background_tasks`; the fixtures under fixtures/claude-code/workflow/ were
// recorded from a real run (S0, Claude Code 2.1.316), not written by hand.

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

const adapters = require('./adapters.js');
const { dispatch } = require('./dispatch.js');
const hb = require('./heartbeat.js');

const GATE = path.join(__dirname, '..', 'gate.js');
const FIXTURES = path.join(__dirname, '..', '..', 'fixtures', 'claude-code', 'workflow');
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
const normalized = (name, patch = {}) => adapters.normalize({ ...fixture(name), ...patch });

const dirtyFeature = (extra = {}) => ({
  stage: 'feature',
  file: 'PLAN-x.md',
  data: { plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test', ...extra },
});

test('normalize exposes the workflow list a Stop payload carries', () => {
  const running = normalized('Stop.workflow-running.json');
  assert.equal(running.event, 'stop');
  assert.equal(running.backgroundTasks.length, 1);
  assert.equal(running.backgroundTasks[0].type, 'workflow');
  assert.equal(running.backgroundTasks[0].status, 'running');

  assert.deepEqual(normalized('Stop.workflow-finished.json').backgroundTasks, []);
});

test('normalize marks a workflow subagent edit, and leaves a main-session edit unmarked', () => {
  const sub = normalized('PreToolUse.subagent-write.json');
  assert.equal(sub.agentType, 'workflow-subagent');
  assert.ok(sub.agentId);

  const main = normalized('PreToolUse.main-write-during-workflow.json');
  assert.equal(main.agentType, null);
  assert.equal(main.agentId, null);
});

test('G3 defers while a workflow is running, and says so', () => {
  const r = dispatch(normalized('Stop.workflow-running.json'), dirtyFeature());
  assert.equal(r.kind, 'allow');
  assert.equal(r.deferred.gate, 'G3');
  assert.equal(r.deferred.workflowId, 'w2fghywnb');
  assert.equal(r.deferred.workflowName, 'hook-experiment');
});

test('G3 applies as before once the workflow has finished', () => {
  const r = dispatch(normalized('Stop.workflow-finished.json'), dirtyFeature());
  assert.equal(r.kind, 'stopBlock');
  assert.match(r.reason, /node --test/);
});

test('a finished workflow entry does not defer G3', () => {
  const p = fixture('Stop.workflow-running.json');
  p.background_tasks[0].status = 'completed';
  const r = dispatch(adapters.normalize(p), dirtyFeature());
  assert.equal(r.kind, 'stopBlock');
});

test('a running background task that is not a workflow does not defer G3', () => {
  const p = fixture('Stop.workflow-running.json');
  p.background_tasks[0].type = 'shell';
  const r = dispatch(adapters.normalize(p), dirtyFeature());
  assert.equal(r.kind, 'stopBlock');
});

test('a missing or malformed background_tasks leaves G3 exactly as it was', () => {
  for (const bad of [undefined, null, 'running', { type: 'workflow', status: 'running' }, [null, 5]]) {
    const p = fixture('Stop.workflow-running.json');
    if (bad === undefined) delete p.background_tasks;
    else p.background_tasks = bad;
    const r = dispatch(adapters.normalize(p), dirtyFeature());
    assert.equal(r.kind, 'stopBlock', `background_tasks = ${JSON.stringify(bad)} must not defer`);
  }
});

test('a recorded gate violation still blocks while a workflow runs', () => {
  const r = dispatch(
    normalized('Stop.workflow-running.json'),
    dirtyFeature({ gate_violation: 'Gate G1: no source edit before the plan is confirmed.' })
  );
  assert.equal(r.kind, 'stopBlock');
  assert.match(r.reason, /Gate G1/);
});

test('nothing is deferred when G3 would have allowed anyway', () => {
  const r = dispatch(normalized('Stop.workflow-running.json'), dirtyFeature({ dirty: false }));
  assert.equal(r.kind, 'allow');
  assert.equal(r.deferred, undefined, 'a deferral is only reported when it changed the outcome');
});

// --- end to end through gate.js: the heartbeat and status.js must show the deferral ---------

function project(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-defer-'));
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `---\n${lines.join('\n')}\n---\n`);
  return dir;
}

function runGate(payload) {
  const r = spawnSync(process.execPath, [GATE], { input: JSON.stringify(payload), encoding: 'utf8' });
  return { exit: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('gate.js lets the turn end while the workflow runs, and records why in the heartbeat', () => {
  const dir = project({ plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test' });
  const r = runGate({ ...fixture('Stop.workflow-running.json'), cwd: dir });
  assert.equal(r.exit, 0);
  assert.equal(r.stdout, '', 'no block');

  const last = hb.read(dir).recent.at(-1);
  assert.equal(last.event, 'stop');
  assert.equal(last.decision, 'allow');
  assert.equal(last.deferred.gate, 'G3');
  assert.equal(last.deferred.workflowName, 'hook-experiment');
});

test('gate.js blocks the same turn end once the workflow is gone', () => {
  const dir = project({ plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test' });
  const r = runGate({ ...fixture('Stop.workflow-finished.json'), cwd: dir });
  assert.equal(JSON.parse(r.stdout).decision, 'block');
  assert.equal(hb.read(dir).recent.at(-1).deferred, undefined);
});

test('status.js reports a deferral from the last Stop, so it is never a silent no-op', () => {
  const dir = project({ plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test' });
  runGate({ ...fixture('Stop.workflow-running.json'), cwd: dir });

  const status = path.join(__dirname, '..', 'status.js');
  const r = spawnSync(process.execPath, [status, '--json'], { cwd: dir, encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  assert.equal(j.deferral.gate, 'G3');
  assert.equal(j.deferral.workflowName, 'hook-experiment');

  const text = spawnSync(process.execPath, [status], { cwd: dir, encoding: 'utf8' }).stdout;
  assert.match(text, /G3 deferred/);
  assert.match(text, /hook-experiment/);
});

test('status.js shows no deferral once a later Stop was not deferred', () => {
  const dir = project({ plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test' });
  runGate({ ...fixture('Stop.workflow-running.json'), cwd: dir });
  runGate({ ...fixture('Stop.workflow-finished.json'), cwd: dir });

  const status = path.join(__dirname, '..', 'status.js');
  const j = JSON.parse(spawnSync(process.execPath, [status, '--json'], { cwd: dir, encoding: 'utf8' }).stdout);
  assert.equal(j.deferral, null);
});
