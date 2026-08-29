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
      env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' },
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

// --- clearing gate_violation ----------------------------------------------
// The bug this fixes: gate_violation was written once and never cleared, so a
// resolved violation kept being quoted in every later stop message -- telling
// the user to revert an edit that no longer existed. Stale nagging is exactly
// how a gate earns an ULTIMATE_WORKFLOW_GATES=off.

test('a green verify clears gate_violation', () => {
  const r = dispatch(
    ev({ event: 'postTool', tool: 'shell', command: 'node --test', path: null }),
    feature({ test_command: 'node --test', dirty: true, gate_violation: 'Gate G1: stale.' })
  );
  assert.equal(r.patch.gate_violation, '');
});

test('a red verify leaves gate_violation alone', () => {
  const r = dispatch(
    ev({ event: 'postToolFailure', tool: 'shell', command: 'node --test', path: null }),
    feature({ test_command: 'node --test', dirty: true, gate_violation: 'Gate G1: still true.' })
  );
  assert.equal(r.patch.gate_violation, undefined, 'red must not clear it -- nothing was fixed');
});

test('a newly allowed pre-edit clears a violation that is no longer true', () => {
  const r = dispatch(
    ev({ vendor: 'cursor' }),
    feature({ plan_confirmed: true, tests_confirmed: true, gate_violation: 'Gate G1: stale.' })
  );
  assert.equal(r.kind, 'allow');
  assert.equal(r.patch.gate_violation, '');
});

test('an allowed pre-edit with no recorded violation writes no patch', () => {
  const r = dispatch(ev({}), feature({ plan_confirmed: true, tests_confirmed: true }));
  assert.equal(r.patch, undefined, 'no violation to clear means nothing to write');
});

test('a denied pre-edit on a detect-only host still records the violation', () => {
  const r = dispatch(ev({ vendor: 'cursor' }), feature({ plan_confirmed: false }));
  assert.match(r.patch.gate_violation, /plan_confirmed/);
});

// --- heartbeat integration -------------------------------------------------

const hb = require('./heartbeat.js');

function tmpRepo(frontMatter) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-hbi-'));
  if (frontMatter) fs.writeFileSync(path.join(dir, 'PLAN-x.md'), frontMatter);
  return dir;
}

test('gate.js records a heartbeat even at stage none, where no gate acts', () => {
  const dir = tmpRepo(null);
  const r = runGate(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      permission_mode: 'auto',
      cwd: dir,
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'src', 'a.js') },
    })
  );
  assert.equal(r.exit, 0);

  const h = hb.read(dir);
  assert.equal(h.count, 1, 'silence at stage none must still be evidenced');
  assert.equal(h.recent[0].stage, 'none');
  assert.equal(h.recent[0].decision, 'allow');
});

test('gate.js records the decision when it denies', () => {
  const dir = tmpRepo('---\nplan_confirmed: false\n---\n');
  const r = runGate(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      permission_mode: 'auto',
      cwd: dir,
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'src', 'a.js') },
    })
  );
  assert.equal(r.exit, 2);

  const h = hb.read(dir);
  assert.equal(h.recent.at(-1).decision, 'deny');
  assert.equal(h.recent.at(-1).stage, 'feature');
  assert.equal(h.recent.at(-1).event, 'preTool');
});

test('gate.js still decides correctly when the heartbeat cannot be written', () => {
  const dir = tmpRepo('---\nplan_confirmed: false\n---\n');
  // Occupy the heartbeat directory name with a file, so mkdir cannot succeed.
  fs.writeFileSync(path.join(dir, hb.DIR), 'blocked');

  const r = runGate(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      permission_mode: 'auto',
      cwd: dir,
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'src', 'a.js') },
    })
  );
  assert.equal(r.exit, 2, 'a diagnostics failure must not change the decision');
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason, /plan_confirmed/);
});

// --- regressions from the v3.0.0 /review run --------------------------------
//
// Both of these were found by review lenses against code with 211 green tests,
// and both were reproduced end to end by the adversarial verifier before being
// accepted. Each test below fails against the code as it shipped.

test('a failing verify run is NOT scored green just because the host sent postTool', () => {
  // The bug: pass/fail was read from the event name alone, on the belief that a
  // failure arrives as `postToolFailure`. Claude Code does not appear to send
  // that event -- fixtures/claude-code/PostToolUse.18.json is a non-zero-exit
  // command recorded as a plain PostToolUse. So a red run cleared `dirty` and
  // reset the round counter: failing the tests satisfied the gate that exists
  // to make you pass them.
  const state = feature({ test_command: 'node --test', dirty: true, verify_rounds: 2 });
  const r = dispatch(ev({ event: 'postTool', tool: 'shell', command: 'node --test', path: null, ok: false }), state, {});

  assert.notEqual(r.patch.last_verify, 'green', 'a failing run must never be recorded as green');
  assert.notEqual(r.patch.dirty, false, 'a failing run must not clear the dirty flag');
  assert.ok(r.patch.verify_rounds > 2, `round counter must advance, got ${r.patch.verify_rounds}`);
});

test('a passing verify run on a plain postTool is still scored green', () => {
  // The other direction, so the fix above cannot be "call everything a failure".
  const state = feature({ test_command: 'node --test', dirty: true, verify_rounds: 1 });
  const r = dispatch(ev({ event: 'postTool', tool: 'shell', command: 'node --test', path: null, ok: true }), state, {});

  assert.equal(r.patch.last_verify, 'green');
  assert.equal(r.patch.dirty, false);
  assert.equal(r.patch.verify_rounds, 0);
});

test('a recorded gate violation blocks the stop even with no verify command set', () => {
  // The bug: this is the ENTIRE compensation for a host that cannot block a
  // write, and it only fired when stopGate independently blocked. stopGate
  // steps aside when no verification command is configured, and the shipped
  // plan template ships `test_command: ""` -- so on Cursor, the one host it
  // exists for, a bypassed G1 was recorded and reported to nobody.
  const state = feature({
    plan_confirmed: false,
    test_command: '',
    dirty: true,
    gate_violation: 'Gate G1: plan_confirmed is not true in PLAN-x.md.',
  });

  const r = dispatch(ev({ event: 'stop', status: 'completed', tool: null, path: null }), state, {});

  assert.equal(r.kind, 'stopBlock', 'a recorded violation must reach the user');
  assert.match(r.reason, /Gate G1/);
  assert.match(r.reason, /revert/i, 'it must say what to do about it');
});

test('the violation still carries the stop reason when stopGate also blocks', () => {
  const state = feature({
    plan_confirmed: false,
    test_command: 'node --test',
    dirty: true,
    gate_violation: 'Gate G1: plan_confirmed is not true in PLAN-x.md.',
  });

  const r = dispatch(ev({ event: 'stop', status: 'completed', tool: null, path: null }), state, {});

  assert.equal(r.kind, 'stopBlock');
  assert.match(r.reason, /Gate G1/);
  assert.match(r.reason, /node --test/, 'the verification command must still be named');
});

test('no violation and nothing to verify still ends the turn', () => {
  // The fix must not make a clean turn unfinishable.
  const state = feature({ plan_confirmed: true, tests_confirmed: true, test_command: '', dirty: true });
  const r = dispatch(ev({ event: 'stop', status: 'completed', tool: null, path: null }), state, {});
  assert.equal(r.kind, 'allow');
});

test('gate.js echoes the real event name on a G4 escalation, end to end', () => {
  // The hookEventName bug had two halves: adapters.respond() hardcoding
  // 'UserPromptSubmit', and gate.js passing the real event through. The
  // regression test in review-findings.test.js covers the first and REBUILDS
  // the second by hand -- it calls adapters.respond() with the event spread in
  // itself rather than invoking gate.js. So the gate.js half was protected by
  // nothing: reverting that line left the whole suite green while every G4
  // escalation and G5 pointer was discarded by the host for an event-name
  // mismatch, which is the exact defect the file exists to prevent.
  //
  // This goes through gate.js, so it fails if either half regresses.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-gate-g4-'));
  fs.writeFileSync(
    path.join(dir, 'PLAN-x.md'),
    '---\nplan_confirmed: true\ntests_confirmed: true\ntest_command: node --test\ndirty: true\nverify_rounds: 2\n---\n'
  );

  const r = runGate(
    JSON.stringify({
      hook_event_name: 'PostToolUse',
      cwd: dir,
      tool_name: 'Bash',
      tool_input: { command: 'node --test' },
      tool_response: { success: false },
    })
  );

  assert.equal(r.exit, 0);
  assert.ok(r.stdout.trim(), 'the third failing round must emit an escalation');

  const out = JSON.parse(r.stdout);
  const eventName = out.hookSpecificOutput && out.hookSpecificOutput.hookEventName;
  assert.equal(
    eventName,
    'PostToolUse',
    `the host discards output whose event name does not match; got ${eventName}`
  );
});
