'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { dispatch, isVerifyCommand } = require('./dispatch.js');

const GATE = path.join(__dirname, '..', 'gate.js');
const CWD = 'C:/proj';

const feature = (data) => ({ stage: 'feature', file: 'PLAN-x.md', data });

const ev = (o) => ({
  vendor: 'claude',
  event: 'preTool',
  tool: 'write',
  path: `${CWD}/src/a.js`,
  cwd: CWD,
  command: null,
  status: null,
  ...o,
});

// --- pre-edit, per vendor capability ---------------------------------------

test('a blocking vendor gets a deny when the plan is unconfirmed', () => {
  const r = dispatch(ev({ vendor: 'claude' }), feature({ plan_confirmed: false }));
  assert.equal(r.kind, 'deny');
  assert.match(r.reason, /plan_confirmed/);
});

test('Cursor gets no deny, because a deny there is ignored and reported as success', () => {
  const r = dispatch(ev({ vendor: 'cursor' }), feature({ plan_confirmed: false }));
  assert.equal(r.kind, 'allow', 'emitting a deny would look enforced while doing nothing');
  assert.equal(r.patch.dirty, true);
  assert.match(r.patch.gate_violation, /plan_confirmed/);
});

test('an allowed edit produces no violation record', () => {
  const r = dispatch(ev({}), feature({ plan_confirmed: true, tests_confirmed: true }));
  assert.equal(r.kind, 'allow');
  assert.equal(r.patch, undefined);
});

test('stage none is never gated', () => {
  const r = dispatch(ev({}), { stage: 'none', file: null, data: {} });
  assert.equal(r.kind, 'allow');
});

// --- dirty marking ---------------------------------------------------------

test('a landed source edit marks the tree dirty', () => {
  const r = dispatch(ev({ event: 'postTool' }), feature({ plan_confirmed: true, tests_confirmed: true }));
  assert.equal(r.patch.dirty, true);
});

test('a documentation edit does not mark the tree dirty', () => {
  const r = dispatch(
    ev({ event: 'postTool', path: `${CWD}/README.md` }),
    feature({ plan_confirmed: true, tests_confirmed: true })
  );
  assert.equal(r.patch, undefined);
});

test('an edit outside the project does not mark the tree dirty', () => {
  const r = dispatch(
    ev({ event: 'postTool', path: 'C:/elsewhere/x.js' }),
    feature({ plan_confirmed: true, tests_confirmed: true })
  );
  assert.equal(r.patch, undefined);
});

test('Cursor afterFileEdit marks dirty just like postTool', () => {
  const r = dispatch(
    ev({ vendor: 'cursor', event: 'afterEdit', tool: '' }),
    feature({ plan_confirmed: true, tests_confirmed: true })
  );
  assert.equal(r.patch.dirty, true);
});

// --- verify and the round cap ----------------------------------------------

test('isVerifyCommand matches a wrapped invocation', () => {
  const s = feature({ test_command: 'node --test' });
  assert.equal(isVerifyCommand('cd /proj && node --test "hooks/**"', s), true);
  assert.equal(isVerifyCommand('git status', s), false);
});

test('isVerifyCommand is false when no command is configured', () => {
  assert.equal(isVerifyCommand('node --test', feature({})), false);
});

test('a passing verify clears dirty and resets the counter', () => {
  const r = dispatch(
    ev({ event: 'postTool', tool: 'shell', command: 'node --test', path: null }),
    feature({ test_command: 'node --test', verify_rounds: 2, dirty: true })
  );
  assert.equal(r.patch.last_verify, 'green');
  assert.equal(r.patch.dirty, false);
  assert.equal(r.patch.verify_rounds, 0);
});

test('the failure event is what marks a verify red -- no payload carries an exit code', () => {
  const r = dispatch(
    ev({ event: 'postToolFailure', tool: 'shell', command: 'node --test', path: null }),
    feature({ test_command: 'node --test', verify_rounds: 0, dirty: true })
  );
  assert.equal(r.patch.last_verify, 'red');
  assert.equal(r.patch.verify_rounds, 1);
});

test('the third failure escalates and hands the user the blocker protocol', () => {
  const r = dispatch(
    ev({ event: 'postToolFailure', tool: 'shell', command: 'node --test', path: null }),
    feature({ test_command: 'node --test', verify_rounds: 2 })
  );
  assert.equal(r.kind, 'context');
  assert.equal(r.patch.escalated, true);
  assert.match(r.text, /2-3 options/);
});

// --- stop ------------------------------------------------------------------

test('stop blocks while the tree is dirty', () => {
  const r = dispatch(
    ev({ event: 'stop', tool: '', path: null, status: 'completed' }),
    feature({ dirty: true, test_command: 'node --test' })
  );
  assert.equal(r.kind, 'stopBlock');
  assert.match(r.reason, /node --test/);
});

test('stop stays silent on an aborted Cursor turn', () => {
  const r = dispatch(
    ev({ vendor: 'cursor', event: 'stop', tool: '', path: null, status: 'aborted' }),
    feature({ dirty: true, test_command: 'node --test' })
  );
  assert.equal(r.kind, 'allow', 'a follow-up here would burn the loop_limit for a turn that did nothing');
});

test('a recorded gate violation is surfaced in the stop message with a revert instruction', () => {
  const r = dispatch(
    ev({ vendor: 'cursor', event: 'stop', tool: '', path: null, status: 'completed' }),
    feature({ dirty: true, gate_violation: 'Gate G1: plan_confirmed is not true.', test_command: 'npm test' })
  );
  assert.equal(r.kind, 'stopBlock');
  assert.match(r.reason, /revert it/i);
  assert.match(r.reason, /Gate G1/);
});

// --- end to end through gate.js -------------------------------------------

function runGate(payloadText) {
  try {
    const stdout = execFileSync(process.execPath, [GATE], {
      input: payloadText,
      encoding: 'utf8',
    });
    return { exit: 0, stdout };
  } catch (e) {
    return { exit: e.status, stdout: e.stdout || '' };
  }
}

test('gate.js fails OPEN on unparseable input', () => {
  const r = runGate('this is not json');
  assert.equal(r.exit, 0, 'a crashed gate must never be able to wedge a session');
  assert.equal(r.stdout, '');
});

test('gate.js fails OPEN on empty input', () => {
  assert.equal(runGate('').exit, 0);
});

test('gate.js honours ULTIMATE_WORKFLOW_GATES=off', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-gate-'));
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: false\n---\n');
  const payload = JSON.stringify({
    hook_event_name: 'PreToolUse',
    permission_mode: 'auto',
    cwd: dir,
    tool_name: 'Write',
    tool_input: { file_path: path.join(dir, 'src', 'a.js') },
  });

  let out;
  try {
    out = execFileSync(process.execPath, [GATE], {
      input: payload,
      encoding: 'utf8',
      env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'off' },
    });
  } catch (e) {
    assert.fail(`gates should have been disabled, but exited ${e.status}`);
  }
  assert.equal(out, '');
});

test('gate.js denies an unplanned source edit end to end, BOM and all', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-gate-'));
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: false\n---\n');
  const payload =
    '\uFEFF' +
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      permission_mode: 'auto',
      cwd: dir,
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'src', 'a.js') },
    });

  const r = runGate(payload);
  assert.equal(r.exit, 2);
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /plan_confirmed/);
});

test('gate.js allows a test-file edit end to end', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-gate-'));
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\ntests_confirmed: false\n---\n');
  const r = runGate(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      permission_mode: 'auto',
      cwd: dir,
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'src', 'a.test.js') },
    })
  );
  assert.equal(r.exit, 0);
});
