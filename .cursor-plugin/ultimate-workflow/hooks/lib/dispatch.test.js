'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
// Every temporary directory this file creates is removed when it exits (node --test runs each
// file in its own process); without this, each run left hundreds behind in the system temp folder.
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

test('an allowed edit produces no violation record', () => {
  const r = dispatch(ev({}), feature({ plan_confirmed: true, tests_confirmed: true, experts: '[]' }));
  assert.equal(r.kind, 'allow');
  assert.equal(r.patch, undefined);
});

test('stage none is never gated', () => {
  const r = dispatch(ev({}), { stage: 'none', file: null, data: {} });
  assert.equal(r.kind, 'allow');
});

// --- dirty marking ---------------------------------------------------------

// --- verify and the round cap ----------------------------------------------

test('isVerifyCommand matches a wrapped invocation', () => {
  const s = feature({ test_command: 'node --test' });
  assert.equal(isVerifyCommand('cd /proj && node --test "hooks/**"', s), true);
  assert.equal(isVerifyCommand('git status', s), false);
});

test('isVerifyCommand is false when no command is configured', () => {
  assert.equal(isVerifyCommand('node --test', feature({})), false);
});

test('the failure event is what marks a verify red -- no payload carries an exit code', () => {
  const r = dispatch(ev({ event: 'postToolFailure', tool: 'shell', command: 'node --test', path: null }), feature({ test_command: 'node --test' }));
  assert.deepEqual(r.verified, { kind: 'full', passed: false });
});

// --- stop ------------------------------------------------------------------

test('stop stays silent on an aborted Cursor turn', () => {
  const r = dispatch(
    ev({ vendor: 'cursor', event: 'stop', tool: '', path: null, status: 'aborted' }),
    feature({ dirty: true, test_command: 'node --test' })
  );
  assert.equal(r.kind, 'allow', 'a follow-up here would burn the loop_limit for a turn that did nothing');
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

test('an allowed pre-edit with no recorded violation writes no patch', () => {
  const r = dispatch(ev({}), feature({ plan_confirmed: true, tests_confirmed: true }));
  assert.equal(r.patch, undefined, 'no violation to clear means nothing to write');
});

// --- heartbeat integration -------------------------------------------------


function tmpRepo(frontMatter) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-hbi-'));
  if (frontMatter) fs.writeFileSync(path.join(dir, 'PLAN-x.md'), frontMatter);
  return dir;
}

// --- regressions from the v3.0.0 /review run --------------------------------
//
// Both of these were found by review lenses against code with 211 green tests,
// and both were reproduced end to end by the adversarial verifier before being
// accepted. Each test below fails against the code as it shipped.

test('a failing verify run is NOT scored green just because the host sent postTool', () => {
  // The pass/fail signal is read from every signal the host gives, not from the event name alone: a red run once arrived as a
  // plain PostToolUse (fixtures/claude-code/PostToolUse.18.json). It is what the full-run record is written from.
  const state = feature({ test_command: 'node --test' });
  const r = dispatch(ev({ event: 'postTool', tool: 'shell', command: 'node --test', path: null, ok: false }), state, {});
  assert.deepEqual(r.verified, { kind: 'full', passed: false });
});

test('a passing verify run on a plain postTool is still scored green', () => {
  // The other direction, so the fix above cannot be "call everything a failure".
  const state = feature({ test_command: 'node --test' });
  const r = dispatch(ev({ event: 'postTool', tool: 'shell', command: 'node --test', path: null, ok: true }), state, {});
  assert.deepEqual(r.verified, { kind: 'full', passed: true });
});

test('no violation and nothing to verify still ends the turn', () => {
  // The fix must not make a clean turn unfinishable.
  const state = feature({ plan_confirmed: true, tests_confirmed: true, test_command: '', dirty: true });
  const r = dispatch(ev({ event: 'stop', status: 'completed', tool: null, path: null }), state, {});
  assert.equal(r.kind, 'allow');
});

// --- G6: the commit gate ------------------------------------------------------------

const commit = (o = {}) => ev({ tool: 'shell', path: null, command: 'git commit -m "x"', ...o });
const staleEvidence = { hash: 'h1', recheck: null, records: {}, planExperts: ['security'], available: ['security'] };
const goodEvidence = { hash: 'h1', recheck: { hash: 'h1', final: ['security'] }, records: { security: 'h1' }, planExperts: ['security'], available: ['security'] };
const planned = feature({ plan_confirmed: true, tests_confirmed: true, experts: '[security]' });

test('G6: a commit with no re-check is denied on a blocking vendor, with the reason', () => {
  const r = dispatch(commit(), planned, { commitEvidence: staleEvidence });
  assert.equal(r.kind, 'deny');
  assert.match(r.reason, /Gate G6/);
});

test('G6: a commit with matching evidence is allowed', () => {
  assert.equal(dispatch(commit(), planned, { commitEvidence: goodEvidence }).kind, 'allow');
});

test('G6: no evidence to judge by means allow, because a gate that cannot look must not block', () => {
  assert.equal(dispatch(commit(), planned, {}).kind, 'allow');
  assert.equal(dispatch(commit(), planned, { commitEvidence: undefined }).kind, 'allow');
});

test('G6: Cursor gets no deny it would ignore; the violation is noted instead', () => {
  const r = dispatch(commit({ vendor: 'cursor' }), planned, { commitEvidence: staleEvidence });
  assert.equal(r.kind, 'allow');
  assert.match(r.note, /detect-only/);
});

test('G6 looks at commits only: other shell commands and the verify command are untouched', () => {
  for (const command of ['git status', 'git log --grep=commit', 'ls', 'node --test']) {
    assert.equal(dispatch(commit({ command }), planned, { commitEvidence: staleEvidence }).kind, 'allow', command);
  }
});

test('G6 applies only while a feature is active', () => {
  assert.equal(dispatch(commit(), { stage: 'none', file: null, data: {} }, { commitEvidence: staleEvidence }).kind, 'allow');
});

// --- 4.1.1: related runs while working, a full run before a commit ------------------

const { verifyKind } = require('./dispatch.js');
const VERIFY = 'node "/plugins/ultimate-workflow/hooks/verify.js"';

test('T15 only a real full run counts as full; narrowed runs are related, others nothing', () => {
  const s = feature({ test_command: 'npm test' });
  for (const c of ['npm test', 'cd /proj && npm test', '  npm test  ', `${VERIFY} --full`, 'node C:\\x\\hooks\\verify.js --full']) {
    assert.equal(verifyKind(c, s), 'full', c);
  }
  for (const c of ['npm test -- one.test.ts', 'npm test 2>&1 | tail -20', `${VERIFY}`, 'node hooks/verify.js --plan PLAN-x.md']) {
    assert.equal(verifyKind(c, s), 'related', c);
  }
  for (const c of ['npx vitest related --run src/a.ts', 'git status', 'echo npm']) {
    assert.equal(verifyKind(c, s), null, c);
  }
  // a test_command that is itself a chain is matched whole, not split
  const chain = feature({ test_command: 'npm run build && npm test' });
  assert.equal(verifyKind('npm run build && npm test', chain), 'full');
  assert.equal(verifyKind('npm test', chain), null);
  assert.equal(verifyKind('npm test', feature({})), null);
});

const tested = feature({ plan_confirmed: true, tests_confirmed: true, experts: '[security]', test_command: 'npm test' });
const fresh = { hash: 'h1', record: { mode: 'full', passed: true, fingerprint: 'h1' } };
// The tests part of the commit evidence, as experts.commitEvidence gathers it for feature work with a test_command
// (PLAN-simplify, card commit-check: the full-suite check is part of the one commit decision).
const withTests = (evidence, tests, script = '', command = 'npm test') => (command ? { ...evidence, tests: { command, script, ...tests } } : evidence);

test('T17 a commit with a passing full run at the current fingerprint passes the test check', () => {
  assert.equal(dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, fresh) }).kind, 'allow');
});

test('T18 a commit after only related runs (no full record) is refused, naming verify.js --full', () => {
  const r = dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, { hash: 'h1', record: null }, VERIFY) });
  assert.equal(r.kind, 'deny');
  assert.match(r.reason, /full test suite/);
  assert.ok(r.reason.includes(`${VERIFY} --full`), r.reason);
});

test('T19 an edit after the full run makes it stale; a failed full run never counts', () => {
  const stale = dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, { hash: 'h2', record: fresh.record }) });
  assert.equal(stale.kind, 'deny');
  assert.match(stale.reason, /changed since/);
  const failed = dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, { hash: 'h1', record: { ...fresh.record, passed: false } }) });
  assert.equal(failed.kind, 'deny');
  const related = dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, { hash: 'h1', record: { ...fresh.record, mode: 'related' } }) });
  assert.equal(related.kind, 'deny');
});

test('T20 a docs-only or empty commit is not held by the test check', () => {
  assert.equal(dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, { skip: 'only documentation changed' }) }).kind, 'allow');
  assert.equal(dispatch(commit(), tested, { commitEvidence: withTests(goodEvidence, { skip: 'nothing to commit' }) }).kind, 'allow');
});

test('T21 no test_command: the test check steps aside', () => {
  const noCmd = feature({ plan_confirmed: true, tests_confirmed: true, experts: '[security]' });
  assert.equal(dispatch(commit(), noCmd, { commitEvidence: withTests(goodEvidence, { hash: 'h1', record: null }, '', (noCmd.data.test_command || '')) }).kind, 'allow');
});

test('the test check runs before G6, and Cursor gets a note, not a deny', () => {
  const r = dispatch(commit(), tested, { commitEvidence: withTests(staleEvidence, { hash: 'h1', record: null }) });
  assert.match(r.reason, /full test suite/);
  const c = dispatch(commit({ vendor: 'cursor' }), tested, { commitEvidence: withTests(goodEvidence, { hash: 'h1', record: null }) });
  assert.equal(c.kind, 'allow');
  assert.match(c.note, /detect-only/);
});

test('G7 applies to feature work only: at bootstrap the gates write PRD.md, so a record could never be current', () => {
  const prd = { stage: 'bootstrap', file: 'PRD.md', data: { prd_confirmed: true, design_confirmed: true, test_command: 'npm test' } };
  assert.equal(dispatch(commit(), prd, { commitEvidence: { skip: 'n/a' } }).kind, 'allow');
});
