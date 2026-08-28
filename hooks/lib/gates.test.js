'use strict';

const test = require('node:test');
const assert = require('node:assert');

const gates = require('./gates.js');

const featureState = (data) => ({ stage: 'feature', file: 'PLAN-x.md', data });
const bootstrapState = (data) => ({ stage: 'bootstrap', file: 'PRD.md', data });
const noneState = () => ({ stage: 'none', file: null, data: {} });

// --- path classification ---------------------------------------------------
// Getting "is this a test file" wrong makes G2 either useless or maddening,
// so the trap cases are covered explicitly.

test('isDocPath recognises markdown and plain text as documentation', () => {
  for (const p of ['README.md', 'docs/guide.md', 'PLAN-x.md', 'PRD.md', 'notes.txt', 'a/b/c.MD']) {
    assert.equal(gates.isDocPath(p), true, p);
  }
});

test('isDocPath does not classify source as documentation', () => {
  for (const p of ['src/a.js', 'hooks/lib/state.js', 'main.py', 'app.ts', 'x.mdx']) {
    assert.equal(gates.isDocPath(p), false, p);
  }
});

test('isTestPath recognises the common test conventions', () => {
  for (const p of [
    'hooks/lib/state.test.js',
    'src/a.spec.ts',
    'src/__tests__/a.js',
    'test/helper.js',
    'tests/integration/a.py',
    'spec/models/user_spec.rb',
    'src/__mocks__/fs.js',
    'a\\b\\__tests__\\c.js',
  ]) {
    assert.equal(gates.isTestPath(p), true, p);
  }
});

test('isTestPath does not fire on "test" appearing as a substring', () => {
  for (const p of [
    'src/latest.js',
    'src/contest.ts',
    'src/protest/index.js',
    'lib/greatest-common.js',
    'src/testing-library-shim.js',
  ]) {
    assert.equal(gates.isTestPath(p), false, p);
  }
});

// --- G1: no source edit before a confirmed plan ----------------------------

test('G1 denies a source edit while the plan is unconfirmed, naming the gate', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'src/a.js' });
  assert.equal(r.allow, false);
  assert.match(r.reason, /plan_confirmed/);
});

test('G1 allows editing the plan file itself', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'PLAN-x.md' });
  assert.equal(r.allow, true);
});

test('G1 allows documentation edits', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'README.md' });
  assert.equal(r.allow, true);
});

// --- G2: no implementation before confirmed tests --------------------------

test('G2 denies a source edit while tests are unconfirmed', () => {
  const r = gates.preEditGate(
    featureState({ plan_confirmed: true, tests_confirmed: false }),
    { path: 'src/a.js' }
  );
  assert.equal(r.allow, false);
  assert.match(r.reason, /tests_confirmed/);
});

test('G2 allows editing test files while tests are unconfirmed -- that is the point', () => {
  const r = gates.preEditGate(
    featureState({ plan_confirmed: true, tests_confirmed: false }),
    { path: 'hooks/lib/state.test.js' }
  );
  assert.equal(r.allow, true);
});

test('both confirmed allows source edits', () => {
  const r = gates.preEditGate(
    featureState({ plan_confirmed: true, tests_confirmed: true }),
    { path: 'src/a.js' }
  );
  assert.equal(r.allow, true);
});

// --- stage none and bootstrap ---------------------------------------------

test('stage none never blocks anything', () => {
  assert.equal(gates.preEditGate(noneState(), { path: 'src/a.js' }).allow, true);
  assert.equal(gates.stopGate(noneState()).allow, true);
});

test('B-G2 denies source edits before the design is confirmed', () => {
  const r = gates.preEditGate(
    bootstrapState({ prd_confirmed: true, design_confirmed: false }),
    { path: 'src/index.js' }
  );
  assert.equal(r.allow, false);
  assert.match(r.reason, /design_confirmed/);
});

test('B-G1 denies scaffolding before the PRD is confirmed', () => {
  const r = gates.preEditGate(
    bootstrapState({ prd_confirmed: false, design_confirmed: false }),
    { path: 'src/index.js' }
  );
  assert.equal(r.allow, false);
  assert.match(r.reason, /prd_confirmed/);
});

test('bootstrap always allows editing PRD.md', () => {
  const r = gates.preEditGate(bootstrapState({ prd_confirmed: false }), { path: 'PRD.md' });
  assert.equal(r.allow, true);
});

// --- G3: coding must route through verify ---------------------------------

test('G3 blocks turn completion while the tree is dirty', () => {
  const r = gates.stopGate(featureState({ plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test hooks/' }));
  assert.equal(r.allow, false);
  assert.match(r.reason, /node --test hooks\//);
});

test('G3 allows turn completion once verification is green', () => {
  const r = gates.stopGate(featureState({ dirty: false, last_verify: 'green' }));
  assert.equal(r.allow, true);
});

test('G3 does not block when nothing has been edited', () => {
  const r = gates.stopGate(featureState({ plan_confirmed: true, tests_confirmed: true }));
  assert.equal(r.allow, true);
});

test('G3 stays out of the way once the run has escalated', () => {
  const r = gates.stopGate(featureState({ dirty: true, escalated: true }));
  assert.equal(r.allow, true);
});

// --- G4: round cap ---------------------------------------------------------

test('G4 counts failing rounds and escalates on the third', () => {
  let data = { verify_rounds: 0, escalated: false };

  let r = gates.roundCap({ stage: 'feature', data }, { passed: false });
  assert.equal(r.patch.verify_rounds, 1);
  assert.equal(r.patch.escalated, false);

  data = { ...data, ...r.patch };
  r = gates.roundCap({ stage: 'feature', data }, { passed: false });
  assert.equal(r.patch.verify_rounds, 2);
  assert.equal(r.patch.escalated, false);

  data = { ...data, ...r.patch };
  r = gates.roundCap({ stage: 'feature', data }, { passed: false });
  assert.equal(r.patch.verify_rounds, 3);
  assert.equal(r.patch.escalated, true);
});

test('G4 does not re-escalate on a fourth failing round', () => {
  const r = gates.roundCap(
    { stage: 'feature', data: { verify_rounds: 3, escalated: true } },
    { passed: false }
  );
  assert.equal(r.alreadyEscalated, true);
  assert.equal(r.patch.verify_rounds, 4);
});

test('G4 resets the counter and clears dirty on a green run', () => {
  const r = gates.roundCap(
    { stage: 'feature', data: { verify_rounds: 2, escalated: false, dirty: true } },
    { passed: true }
  );
  assert.equal(r.patch.verify_rounds, 0);
  assert.equal(r.patch.last_verify, 'green');
  assert.equal(r.patch.dirty, false);
});

test('G4 records red without clearing dirty', () => {
  const r = gates.roundCap(
    { stage: 'feature', data: { verify_rounds: 0, dirty: true } },
    { passed: false }
  );
  assert.equal(r.patch.last_verify, 'red');
  assert.notEqual(r.patch.dirty, false);
});

// --- G5: phase pointer -----------------------------------------------------

test('G5 names the stage and the next required action', () => {
  const line = gates.phasePointer(featureState({ plan_confirmed: false }), { workflowsAvailable: true });
  assert.match(line, /feature/);
  assert.match(line, /confirm the plan/i);
});

test('G5 reports workflow availability', () => {
  const on = gates.phasePointer(featureState({ plan_confirmed: true, tests_confirmed: true }), { workflowsAvailable: true });
  const off = gates.phasePointer(featureState({ plan_confirmed: true, tests_confirmed: true }), { workflowsAvailable: false });
  assert.match(on, /workflows available/i);
  assert.match(off, /workflows unavailable/i);
});

test('G5 says nothing at stage none', () => {
  assert.equal(gates.phasePointer(noneState(), { workflowsAvailable: true }), '');
});

test('G5 surfaces an escalation instead of the ordinary next action', () => {
  const line = gates.phasePointer(featureState({ escalated: true, verify_rounds: 3 }), { workflowsAvailable: true });
  assert.match(line, /escalat/i);
});

// --- toProjectPath ---------------------------------------------------------
// Driven by real recorded payloads (fixtures/claude-code/PreToolUse.3.json),
// which revealed that file_path is always absolute and is routinely outside cwd.

const CWD = String.raw`C:\Users\kobiv\Projects\claude-basic-skill`;

test('toProjectPath relativises an absolute path inside the project', () => {
  assert.equal(gates.toProjectPath(CWD, CWD + String.raw`\hooks\lib\state.js`), 'hooks/lib/state.js');
});

test('toProjectPath returns null for a path outside the project', () => {
  const scratch =
    String.raw`C:\Users\kobiv\AppData\Local\Temp\claude\C--Users-kobiv-Projects-claude-basic-skill\x\scratchpad\gate-probe.js`;
  assert.equal(gates.toProjectPath(CWD, scratch), null);
});

test('toProjectPath treats Windows paths case-insensitively', () => {
  assert.equal(gates.toProjectPath(CWD, String.raw`c:\users\KOBIV\Projects\Claude-Basic-Skill\src\a.js`), 'src/a.js');
});

test('toProjectPath treats POSIX paths case-sensitively', () => {
  assert.equal(gates.toProjectPath('/home/k/proj', '/home/k/proj/src/a.js'), 'src/a.js');
  assert.equal(gates.toProjectPath('/home/k/proj', '/home/k/PROJ/src/a.js'), null);
});

test('toProjectPath passes a relative path through unchanged', () => {
  assert.equal(gates.toProjectPath(CWD, 'src/a.js'), 'src/a.js');
});

test('toProjectPath returns empty string for the project root itself', () => {
  assert.equal(gates.toProjectPath(CWD, CWD), '');
});

test('a sibling directory sharing a prefix is outside the project', () => {
  assert.equal(gates.toProjectPath(CWD, CWD + String.raw`-other\src\a.js`), null);
});

// The regression that absolute paths would otherwise cause: an ancestor
// directory named "test" anywhere on the machine must not make a source file
// look like test code.
test('an ancestor directory named test outside the project does not leak in', () => {
  const cwd = '/home/k/test/myproject';
  const rel = gates.toProjectPath(cwd, '/home/k/test/myproject/src/a.js');
  assert.equal(rel, 'src/a.js');
  assert.equal(gates.isTestPath(rel), false);
  assert.equal(gates.isTestPath('/home/k/test/myproject/src/a.js'), true, 'unrelativised path misfires -- which is why relativisation is required');
});

// --- preEditGate with cwd --------------------------------------------------

test('preEditGate ignores edits outside the project even with an unconfirmed plan', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), {
    path: String.raw`C:\Users\kobiv\AppData\Local\Temp\scratch\a.js`,
    cwd: CWD,
  });
  assert.equal(r.allow, true);
});

test('preEditGate still blocks an absolute path inside the project', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), {
    path: CWD + String.raw`\src\a.js`,
    cwd: CWD,
  });
  assert.equal(r.allow, false);
  assert.match(r.reason, /plan_confirmed/);
});

test('preEditGate allows an absolute path to a test file inside the project', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: true, tests_confirmed: false }), {
    path: CWD + String.raw`\hooks\lib\state.test.js`,
    cwd: CWD,
  });
  assert.equal(r.allow, true);
});
