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
const { spawnSync } = require('node:child_process');

const stateLib = require('./lib/state.js');
const gates = require('./lib/gates.js');

const STATUS = path.join(__dirname, 'status.js');

function tmpdir() {
  // realpath: on macOS os.tmpdir() is /var/folders/... while the child's
  // process.cwd() resolves to /private/var/folders/..., so any exact-equality
  // assertion against a path the child computed fails on Mac only.
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-status-')));
}

function runStatus(cwd, env = {}, args = []) {
  // spawnSync, not execFileSync: execFileSync returns stdout alone on success
  // and forwards the child's stderr to the parent's, so `r.stderr` is undefined
  // and every stderr assertion in this file is vacuous. spawnSync captures both
  // on every exit path.
  //
  // process.env FIRST: a developer with ULTIMATE_WORKFLOW_GATES=off in their
  // shell would otherwise override the harness default. The explicit `env`
  // argument still wins, and an explicit `undefined` deletes the variable.
  const child = { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on', ...env };
  for (const k of Object.keys(child)) if (child[k] === undefined) delete child[k];

  const r = spawnSync(process.execPath, [STATUS, ...args], { cwd, env: child, encoding: 'utf8' });
  return { exit: r.status, stdout: r.stdout, stderr: r.stderr };
}

function runJson(cwd, env = {}) {
  const r = runStatus(cwd, env, ['--json']);
  return { ...r, json: JSON.parse(r.stdout) };
}

function beat() {} // the heartbeat is gone (5.0.0); calls that wrote one are harmless

// --- liveness, the reason this exists --------------------------------------

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

// --- robustness ------------------------------------------------------------

test('a malformed plan file exits 0 with no stack trace', () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nthis is not: valid: front: matter\n');

  const r = runStatus(dir);
  assert.equal(r.exit, 0);
  assert.doesNotMatch(r.stdout + (r.stderr || ''), /at Object\.|node:internal/, 'no stack trace');
});

// --- it is a report, not a gate -------------------------------------------

// --- --json: the machine-readable report -----------------------------------
//
// Shape pinned by PLAN-status-json.md, "The shape, pinned". Renaming a key is
// allowed only by editing that plan and the key-set test below in one commit.

// `experts` was added with the G6 commit gate: additive, null outside a feature.
const JSON_KEYS = ['blocking', 'deferral', 'experts', 'file', 'fullVerify', 'g3Active', 'liveness', 'stage', 'state'];

function fenced(lines) {
  return `---\n${lines.join('\n')}\n---\n`;
}

function writePlan(dir, lines, name = 'PLAN-x.md') {
  fs.writeFileSync(path.join(dir, name), fenced(lines));
  return path.join(dir, name);
}

// 1 --- parseability and shape ---------------------------------------------

test('--json emits exactly one JSON object on stdout and nothing on stderr', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: false', 'tests_confirmed: false']);
  beat(dir, new Date().toISOString());

  const r = runStatus(dir, {}, ['--json']);
  assert.equal(r.exit, 0);
  assert.doesNotThrow(() => JSON.parse(r.stdout), 'raw stdout must parse, unfiltered');

  const trimmed = r.stdout.trim();
  assert.ok(trimmed.startsWith('{'), 'stdout must start with the object');
  assert.ok(trimmed.endsWith('}'), 'stdout must end with the object');

  assert.equal(r.stderr, '', 'nothing may be written to stderr');
  assert.doesNotMatch(r.stdout, /ultimate-workflow status/, 'no human banner alongside the JSON');
  assert.doesNotMatch(r.stdout, /^Gates:/m, 'no human report alongside the JSON');
});

// 3-6 --- liveness ----------------------------------------------------------

// 7-9 --- stage, file, state ------------------------------------------------

test('--json carries the stage and the absolute path of the file it read', () => {
  const feature = tmpdir();
  writePlan(feature, ['plan_confirmed: false']);

  const f = runJson(feature).json;
  assert.equal(f.stage, 'feature');
  assert.equal(f.file, path.join(feature, 'PLAN-x.md'), 'the full path, not the basename');

  const bootstrap = tmpdir();
  fs.writeFileSync(path.join(bootstrap, 'PRD.md'), fenced(['prd_confirmed: false']));

  const b = runJson(bootstrap).json;
  assert.equal(b.stage, 'bootstrap');
  assert.equal(b.file, path.join(bootstrap, 'PRD.md'));
});

test('--json carries file as an explicit null when there is no plan or PRD', () => {
  const { json } = runJson(tmpdir());
  assert.equal(json.stage, 'none');
  assert.ok('file' in json, 'the key must be present, not omitted');
  assert.strictEqual(json.file, null, 'null, not the string "null"');
});

// 10-11 --- what is blocking ------------------------------------------------

// 12 --- the single-code-path invariant -------------------------------------

// 13-15 --- exit code and robustness ----------------------------------------

test('--json degrades inside the contract when the report itself throws', (t) => {
  const dir = tmpdir();
  try {
    // state.js:100 stats every PLAN-*.md outside a try/catch, so a broken
    // symlink throws out of readState into the catch at status.js:110.
    fs.symlinkSync(path.join(dir, 'nowhere.md'), path.join(dir, 'PLAN-broken.md'));
  } catch {
    t.skip('symlink unavailable');
    return;
  }

  const r = runJson(dir);
  assert.equal(r.exit, 0);
  assert.equal(typeof r.json.error, 'string', 'the failure is named');
  assert.deepEqual(Object.keys(r.json).sort(), [...JSON_KEYS, 'error'].sort(), 'the contract survives the error');
  assert.ok(
    ['never', 'stale', 'live', 'disabled'].includes(r.json.liveness.state),
    'liveness is still one of the four legal values'
  );
  assert.equal(typeof r.json.blocking.blocked, 'boolean', 'blocked must never read as undefined');
  assert.doesNotMatch(r.stdout, /Could not complete/, 'no bare prose line on stdout');
});

// 16 --- still a report, not a gate -----------------------------------------

// 17-18 --- no regression to the default path -------------------------------

test('a plain run still prints the human report and emits no JSON', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: false']);

  const r = runStatus(dir);
  assert.ok(r.stdout.startsWith('ultimate-workflow status'), 'the human report is still the default');
  assert.throws(() => JSON.parse(r.stdout), 'the plain path emits no JSON');
});

test('an unrelated argument does not switch on JSON output', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: false']);

  const r = runStatus(dir, {}, ['--verbose']);
  assert.equal(r.exit, 0);
  assert.ok(r.stdout.startsWith('ultimate-workflow status'), 'only --json switches the output');
  assert.throws(() => JSON.parse(r.stdout));
});

test('--json reports the experts state for a feature, and null where there is no feature', () => {
  const none = runJson(tmpdir()).json;
  assert.equal(none.experts, null);

  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: true', 'tests_confirmed: true']);
  const undecided = runJson(dir).json.experts;
  assert.equal(undecided.decided, false);
  assert.deepEqual(undecided.selected, []);
  assert.ok(undecided.available.includes('security'));

  const decided = tmpdir();
  writePlan(decided, ['plan_confirmed: true', 'tests_confirmed: true', 'experts: [security]']);
  const e = runJson(decided).json.experts;
  assert.equal(e.decided, true);
  assert.deepEqual(e.selected, ['security']);
  assert.equal(typeof e.commit.allowed, 'boolean');
});

test('T23 --json reports the last full test run: n/a, never, fresh, stale', () => {
  const dir = tmpdir();
  const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  g('init', '-q');
  g('config', 'user.email', 't@t');
  g('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'a.js'), 'x\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\ntests_confirmed: true\n---\n');
  assert.equal(runJson(dir).json.fullVerify, 'n/a', 'no test_command');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\ntests_confirmed: true\ntest_command: node -v\n---\n');
  fs.appendFileSync(path.join(dir, 'a.js'), 'y\n');
  assert.equal(runJson(dir).json.fullVerify, 'never');
  spawnSync(process.execPath, [path.join(__dirname, 'verify.js'), '--full'], { cwd: dir, encoding: 'utf8' });
  assert.equal(runJson(dir).json.fullVerify, 'fresh');
  fs.appendFileSync(path.join(dir, 'a.js'), 'z\n');
  assert.equal(runJson(dir).json.fullVerify, 'stale');
});

// ---- PLAN-simplify, card reminders: the report after the heartbeat and the edit gates are gone ----

const snapshotDir = (dir) => {
  const out = {};
  (function walk(p) {
    if (!fs.existsSync(p)) return;
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const q = path.join(p, e.name);
      if (e.isDirectory()) walk(q);
      else out[path.relative(dir, q)] = fs.readFileSync(q, 'utf8');
    }
  })(dir);
  return out;
};
const NEW_KEYS = ['experts', 'file', 'fullVerify', 'gates', 'lastCheck', 'leftoverHeartbeat', 'reminders', 'stage', 'state'];

test('status: gates off still reports disabled, in the human report and in --json', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: true']);
  const human = runStatus(dir, { ULTIMATE_WORKFLOW_GATES: 'off' });
  assert.match(human.stdout, /DISABLED/);
  assert.match(human.stdout, /Nothing is being checked/);
  assert.strictEqual(runJson(dir, { ULTIMATE_WORKFLOW_GATES: 'off' }).json.gates, 'disabled');
  assert.strictEqual(runJson(dir).json.gates, 'enabled');
});

test('status: the --json object carries the documented top-level keys, and only those, at every stage', () => {
  const none = tmpdir();
  const feature = tmpdir();
  writePlan(feature, ['plan_confirmed: true', 'tests_confirmed: true']);
  const bootstrap = tmpdir();
  fs.writeFileSync(path.join(bootstrap, 'PRD.md'), fenced(['prd_confirmed: false']));
  for (const dir of [none, feature, bootstrap]) assert.deepStrictEqual(Object.keys(runJson(dir).json).sort(), NEW_KEYS);
});

test('status: a leftover heartbeat.json is reported as deletable and not read', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: true', 'tests_confirmed: true']);
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'heartbeat.json'), '}{ not json');
  const r = runJson(dir);
  assert.strictEqual(r.exit, 0);
  assert.strictEqual(r.json.leftoverHeartbeat, true);
  assert.match(runStatus(dir).stdout, /heartbeat\.json is left over[\s\S]*can be deleted/);
});

test('status: the report writes nothing at all, in either form', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: false']);
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'verify.json'), '{}');
  const before = snapshotDir(dir);
  runStatus(dir);
  runJson(dir);
  assert.deepStrictEqual(snapshotDir(dir), before);
});

test('status: a corrupt commit-check.json exits 0 and the report still parses', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: true', 'tests_confirmed: true']);
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'commit-check.json'), '}{ not json');
  const r = runJson(dir);
  assert.strictEqual(r.exit, 0);
  assert.strictEqual(r.json.lastCheck, null);
  assert.match(runStatus(dir).stdout, /Last commit check: none yet/);
});

test('status: a confirmed plan has no reminders and an unconfirmed one names the confirm command', () => {
  const ok = tmpdir();
  writePlan(ok, ['plan_confirmed: true', 'tests_confirmed: true']);
  assert.deepStrictEqual(runJson(ok).json.reminders, []);
  const open = tmpdir();
  writePlan(open, ['plan_confirmed: false', 'tests_confirmed: false']);
  const lines = runJson(open).json.reminders;
  assert.strictEqual(lines.length, 2);
  assert.match(lines[0], /--confirm plan_confirmed/);
  assert.match(lines[1], /--confirm tests_confirmed/);
});
