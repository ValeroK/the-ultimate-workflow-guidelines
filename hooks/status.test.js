'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const hb = require('./lib/heartbeat.js');

const STATUS = path.join(__dirname, 'status.js');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uw-status-'));
}

function runStatus(cwd, env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [STATUS], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return { exit: 0, stdout };
  } catch (e) {
    return { exit: e.status, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

function beat(dir, at) {
  hb.record(dir, { at, event: 'preTool', vendor: 'claude', stage: 'feature', decision: 'allow' });
}

// --- liveness, the reason this exists --------------------------------------

test('with no heartbeat it says the gates have never run, and names the restart', () => {
  const r = runStatus(tmpdir());
  assert.equal(r.exit, 0);
  assert.match(r.stdout, /never run/i);
  assert.match(r.stdout, /restart/i, 'the likely cause must be named, not left to guesswork');
});

test('with a recent heartbeat it reports live, with a count', () => {
  const dir = tmpdir();
  beat(dir, new Date().toISOString());
  beat(dir, new Date().toISOString());

  const r = runStatus(dir);
  assert.match(r.stdout, /live/i);
  assert.match(r.stdout, /2/, 'the invocation count belongs in the report');
});

test('with an old heartbeat it reports stale rather than live', () => {
  const dir = tmpdir();
  beat(dir, '2020-01-01T00:00:00.000Z');
  assert.match(runStatus(dir).stdout, /stale/i);
});

test('with the escape hatch set it reports disabled and does not claim to enforce', () => {
  const dir = tmpdir();
  beat(dir, new Date().toISOString());

  const out = runStatus(dir, { ULTIMATE_WORKFLOW_GATES: 'off' }).stdout;
  assert.match(out, /disabled/i);
  assert.doesNotMatch(out, /\blive\b/i, 'disabled gates must never read as live');
});

// --- stage and next action -------------------------------------------------

test('stage none reports that no plan or PRD is present', () => {
  const out = runStatus(tmpdir()).stdout;
  assert.match(out, /none/i);
});

test('stage feature reports the plan file and the next blocking gate', () => {
  const dir = tmpdir();
  fs.writeFileSync(
    path.join(dir, 'PLAN-x.md'),
    '---\nplan_confirmed: false\ntests_confirmed: false\n---\n'
  );

  const out = runStatus(dir).stdout;
  assert.match(out, /feature/i);
  assert.match(out, /PLAN-x\.md/);
  assert.match(out, /plan_confirmed/, 'the field that is blocking must be named');
});

test('stage bootstrap reports against PRD.md', () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'PRD.md'), '---\nprd_confirmed: false\n---\n');

  const out = runStatus(dir).stdout;
  assert.match(out, /bootstrap/i);
  assert.match(out, /PRD\.md/);
});

test('a fully confirmed plan reports nothing blocking', () => {
  const dir = tmpdir();
  fs.writeFileSync(
    path.join(dir, 'PLAN-x.md'),
    '---\nplan_confirmed: true\ntests_confirmed: true\ndirty: false\n---\n'
  );
  assert.match(runStatus(dir).stdout, /nothing blocking/i);
});

// --- robustness ------------------------------------------------------------

test('a malformed plan file exits 0 with no stack trace', () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nthis is not: valid: front: matter\n');

  const r = runStatus(dir);
  assert.equal(r.exit, 0);
  assert.doesNotMatch(r.stdout + (r.stderr || ''), /at Object\.|node:internal/, 'no stack trace');
});

test('a corrupt heartbeat file exits 0 and still reports', () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, hb.DIR), { recursive: true });
  fs.writeFileSync(path.join(dir, hb.DIR, 'heartbeat.json'), '}{ not json');

  const r = runStatus(dir);
  assert.equal(r.exit, 0);
  assert.match(r.stdout, /never run/i, 'an unreadable heartbeat is indistinguishable from none');
});

// --- it is a report, not a gate -------------------------------------------

test('status writes nothing at all', () => {
  const dir = tmpdir();
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '---\nplan_confirmed: true\n---\n# Plan\n');
  beat(dir, new Date().toISOString());

  const planBefore = fs.readFileSync(plan, 'utf8');
  const planMtime = fs.statSync(plan).mtimeMs;
  const hbBefore = fs.readFileSync(path.join(dir, hb.DIR, 'heartbeat.json'), 'utf8');

  runStatus(dir);

  assert.equal(fs.readFileSync(plan, 'utf8'), planBefore, 'plan file must be untouched');
  assert.equal(fs.statSync(plan).mtimeMs, planMtime, 'plan mtime must be untouched');
  assert.equal(
    fs.readFileSync(path.join(dir, hb.DIR, 'heartbeat.json'), 'utf8'),
    hbBefore,
    'reading the heartbeat must not record one'
  );
});
