'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hb = require('./lib/heartbeat.js');
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

// --- --json: the machine-readable report -----------------------------------
//
// Shape pinned by PLAN-status-json.md, "The shape, pinned". Renaming a key is
// allowed only by editing that plan and the key-set test below in one commit.

const JSON_KEYS = ['blocking', 'file', 'g3Active', 'liveness', 'stage', 'state'];

function frontMatter(lines) {
  return `---\n${lines.join('\n')}\n---\n`;
}

function writePlan(dir, lines, name = 'PLAN-x.md') {
  fs.writeFileSync(path.join(dir, name), frontMatter(lines));
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

test('the --json object carries the documented top-level keys, and only those, at every stage', () => {
  const empty = tmpdir();

  const plan = tmpdir();
  writePlan(plan, ['plan_confirmed: false', 'tests_confirmed: false']);

  const prd = tmpdir();
  fs.writeFileSync(path.join(prd, 'PRD.md'), frontMatter(['prd_confirmed: false']));

  const bare = tmpdir();
  writePlan(bare, ['feature: y'], 'PLAN-y.md');

  for (const dir of [empty, plan, prd, bare]) {
    const { json } = runJson(dir);
    assert.deepEqual(Object.keys(json).sort(), JSON_KEYS, `key set for ${dir}`);
  }

  for (const dir of [empty, bare]) {
    const { json } = runJson(dir);
    assert.deepEqual(json.state, {}, 'state is an object, always -- never null, never absent');
  }

  const { json } = runJson(empty);
  assert.deepEqual(json.blocking, { blocked: false, reason: null });
  assert.equal(json.g3Active, false);
});

// 3-6 --- liveness ----------------------------------------------------------

test('--json reports liveness as a state, a numeric age, and a numeric count', () => {
  const dir = tmpdir();
  beat(dir, new Date().toISOString());
  beat(dir, new Date().toISOString());

  const { json } = runJson(dir);
  assert.equal(json.liveness.state, 'live');
  assert.equal(typeof json.liveness.ageSeconds, 'number', 'not a rendered "12m ago"');
  assert.ok(json.liveness.ageSeconds >= 0 && json.liveness.ageSeconds < 90, 'age is in seconds');
  assert.strictEqual(json.liveness.count, 2, 'the number 2, not "2 invocations"');
});

test('--json reports never-run liveness with a null age and a zero count', () => {
  const { json } = runJson(tmpdir());
  assert.equal(json.liveness.state, 'never');
  assert.ok('ageSeconds' in json.liveness, 'the key must survive JSON.stringify');
  assert.strictEqual(json.liveness.ageSeconds, null);
  assert.strictEqual(json.liveness.count, 0);
});

test('--json reports stale rather than live for an old heartbeat', () => {
  const dir = tmpdir();
  beat(dir, '2020-01-01T00:00:00.000Z');

  const { json } = runJson(dir);
  assert.equal(json.liveness.state, 'stale');
  assert.ok(json.liveness.ageSeconds > 3600, 'stale means older than the live window');
});

test('--json reports disabled whenever the gates are not switched on', () => {
  const dir = tmpdir();
  beat(dir, new Date().toISOString());

  // 'off', and the shipped default: the variable absent altogether.
  for (const env of [{ ULTIMATE_WORKFLOW_GATES: 'off' }, { ULTIMATE_WORKFLOW_GATES: undefined }]) {
    const { json } = runJson(dir, env);
    assert.equal(json.liveness.state, 'disabled', `for env ${JSON.stringify(env)}`);
    assert.strictEqual(json.liveness.ageSeconds, null);
    assert.strictEqual(json.liveness.count, 1, 'the real count passes through under disabled');
  }
});

// 7-9 --- stage, file, state ------------------------------------------------

test('--json carries the stage and the absolute path of the file it read', () => {
  const feature = tmpdir();
  writePlan(feature, ['plan_confirmed: false']);

  const f = runJson(feature).json;
  assert.equal(f.stage, 'feature');
  assert.equal(f.file, path.join(feature, 'PLAN-x.md'), 'the full path, not the basename');

  const bootstrap = tmpdir();
  fs.writeFileSync(path.join(bootstrap, 'PRD.md'), frontMatter(['prd_confirmed: false']));

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

test('--json echoes the whole shown front-matter whitelist with types and quoting intact', () => {
  // Embedded double quotes and backslashes: this repo's own plan files carry
  // both in test_command, and CLAUDE.md records backslash mangling as hit 4x.
  const TEST_COMMAND = 'node --test "hooks/**/*.test.js" C:\\Users\\x';

  const dir = tmpdir();
  writePlan(dir, [
    'plan_confirmed: false',
    'tests_confirmed: false',
    'prd_confirmed: false',
    'design_confirmed: false',
    'dirty: true',
    'last_verify: red',
    'verify_rounds: 2',
    'escalated: false',
    `test_command: ${TEST_COMMAND}`,
    'feature: status-json',
  ]);

  const { json } = runJson(dir);
  assert.deepEqual(json.state, {
    plan_confirmed: false,
    tests_confirmed: false,
    prd_confirmed: false,
    design_confirmed: false,
    dirty: true,
    last_verify: 'red',
    verify_rounds: 2,
    escalated: false,
    test_command: TEST_COMMAND,
  });
  assert.strictEqual(
    json.state.test_command,
    stateLib.readState(dir).data.test_command,
    'byte-identical to what the state library reads'
  );
});

// 10-11 --- what is blocking ------------------------------------------------

test('--json reports blocking exactly as the gate predicates do, for every gate', () => {
  const rows = [
    ['G1', (d) => writePlan(d, ['plan_confirmed: false'])],
    ['G2', (d) => writePlan(d, ['plan_confirmed: true', 'tests_confirmed: false'])],
    ['B-G1', (d) => fs.writeFileSync(path.join(d, 'PRD.md'), frontMatter(['prd_confirmed: false']))],
    ['G3', (d) => writePlan(d, ['plan_confirmed: true', 'tests_confirmed: true', 'dirty: true', 'test_command: node --test'])],
    ['G3 escalated', (d) => writePlan(d, ['plan_confirmed: true', 'tests_confirmed: true', 'dirty: true', 'test_command: node --test', 'escalated: true'])],
    ['G3 no command', (d) => writePlan(d, ['plan_confirmed: true', 'tests_confirmed: true', 'dirty: true'])],
    ['G1 wins over G3', (d) => writePlan(d, ['plan_confirmed: false', 'dirty: true', 'test_command: node --test'])],
    ['clear', (d) => writePlan(d, ['plan_confirmed: true', 'tests_confirmed: true', 'dirty: false'])],
  ];

  for (const [label, setup] of rows) {
    const dir = tmpdir();
    setup(dir);

    const r = runJson(dir);

    // The expectation is computed from the live predicates, never from a
    // literal or a regex, so a second code path cannot invent its own wording.
    const st = stateLib.readState(dir);
    const edit = gates.preEditGate(st, { path: 'src/example.js' });
    const stop = gates.stopGate(st);
    const expected = !edit.allow ? edit.reason : !stop.allow ? stop.reason : null;

    assert.equal(r.json.blocking.reason, expected, `reason for ${label}`);
    assert.equal(r.json.blocking.blocked, expected !== null, `blocked for ${label}`);
    assert.equal(r.exit, 0, `exit for ${label}`);
  }
});

test('--json reports whether G3 is active, for test_command and build_command alike', () => {
  const confirmed = ['plan_confirmed: true', 'tests_confirmed: true'];

  const none = tmpdir();
  writePlan(none, confirmed);
  assert.equal(runJson(none).json.g3Active, false);

  const withTest = tmpdir();
  writePlan(withTest, [...confirmed, 'test_command: node --test']);
  assert.equal(runJson(withTest).json.g3Active, true);

  const withBuild = tmpdir();
  writePlan(withBuild, [...confirmed, 'build_command: make']);
  assert.equal(
    runJson(withBuild).json.g3Active,
    true,
    'stopGate reads test_command || build_command (gates.js:152)'
  );
});

// 12 --- the single-code-path invariant -------------------------------------

test('the JSON and the human report agree on every fact both carry', () => {
  const fixtures = [
    ['never-run, no plan', () => {}, {}],
    [
      'live, unconfirmed plan',
      (d) => {
        writePlan(d, ['plan_confirmed: false', 'tests_confirmed: false']);
        beat(d, new Date().toISOString());
      },
      {},
    ],
    [
      'stale, confirmed plan blocked by G3',
      (d) => {
        writePlan(d, ['plan_confirmed: true', 'tests_confirmed: true', 'dirty: true', 'test_command: node --test']);
        beat(d, '2020-01-01T00:00:00.000Z');
      },
      {},
    ],
    ['bootstrap', (d) => fs.writeFileSync(path.join(d, 'PRD.md'), frontMatter(['prd_confirmed: false'])), {}],
    [
      'gates disabled',
      (d) => {
        writePlan(d, ['plan_confirmed: false', 'tests_confirmed: false']);
        beat(d, new Date().toISOString());
      },
      { ULTIMATE_WORKFLOW_GATES: 'off' },
    ],
  ];

  for (const [label, setup, env] of fixtures) {
    const dir = tmpdir();
    setup(dir);

    const human = runStatus(dir, env).stdout;
    const json = runJson(dir, env).json;

    assert.match(human, new RegExp(json.liveness.state, 'i'), `liveness for ${label}`);
    assert.ok(human.includes(json.stage), `stage for ${label}`);

    if (json.file !== null) {
      assert.ok(human.includes(json.file), `the human report prints the full path for ${label}`);
    }

    for (const [k, v] of Object.entries(json.state)) {
      assert.ok(human.includes(`${k}: ${v}`), `state ${k} for ${label}`);
    }

    if (json.blocking.blocked) {
      assert.ok(human.includes(json.blocking.reason), `blocking reason verbatim for ${label}`);
    } else {
      assert.doesNotMatch(human, /Gate (B-)?G\d/, `no gate named for ${label}`);
    }

    // The human renderer returns before the G3 note at stage 'none'
    // (status.js:59-62), so the note is only comparable where it can be
    // printed at all. Deviation from the plan's unconditional iff, recorded.
    if (json.stage !== 'none') {
      assert.equal(/INACTIVE/.test(human), json.g3Active === false, `g3Active note for ${label}`);
    }
  }
});

// 13-15 --- exit code and robustness ----------------------------------------

test('--json exits 0 while a gate is blocking', () => {
  const dir = tmpdir();
  writePlan(dir, ['plan_confirmed: false']);

  const r = runJson(dir);
  assert.equal(r.json.blocking.blocked, true);
  assert.equal(r.exit, 0, 'status is a report, not a gate -- usable under set -e');
});

test('--json still parses, and still reports the truth, for a malformed plan and a corrupt heartbeat', () => {
  const malformed = tmpdir();
  fs.writeFileSync(path.join(malformed, 'PLAN-x.md'), '---\nthis is not: valid: front: matter\n');

  const m = runJson(malformed);
  assert.equal(m.exit, 0);
  assert.deepEqual(Object.keys(m.json).sort(), JSON_KEYS);
  assert.equal(m.json.stage, 'feature');
  assert.equal(m.json.file, path.join(malformed, 'PLAN-x.md'));
  assert.equal(m.json.blocking.blocked, true, 'no front matter means G1 denies');

  const corrupt = tmpdir();
  fs.mkdirSync(path.join(corrupt, hb.DIR), { recursive: true });
  fs.writeFileSync(path.join(corrupt, hb.DIR, 'heartbeat.json'), '}{ not json');

  const c = runJson(corrupt);
  assert.equal(c.exit, 0);
  assert.equal(c.json.liveness.state, 'never', 'an unreadable heartbeat is indistinguishable from none');
  assert.strictEqual(c.json.liveness.count, 0);

  for (const r of [m, c]) {
    const all = r.stdout + r.stderr;
    assert.doesNotMatch(all, /at Object\.|node:internal/, 'no stack trace');
    assert.doesNotMatch(all, /Could not complete/, 'no prose escape hatch');
  }
});

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

test('--json writes nothing at all', () => {
  const dir = tmpdir();
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '---\nplan_confirmed: true\n---\n# Plan\n');
  beat(dir, new Date().toISOString());

  const planBefore = fs.readFileSync(plan, 'utf8');
  const planMtime = fs.statSync(plan).mtimeMs;
  const hbBefore = fs.readFileSync(path.join(dir, hb.DIR, 'heartbeat.json'), 'utf8');

  runStatus(dir, {}, ['--json']);

  assert.equal(fs.readFileSync(plan, 'utf8'), planBefore, 'plan file must be untouched');
  assert.equal(fs.statSync(plan).mtimeMs, planMtime, 'plan mtime must be untouched');
  assert.equal(
    fs.readFileSync(path.join(dir, hb.DIR, 'heartbeat.json'), 'utf8'),
    hbBefore,
    'reading the heartbeat must not record one'
  );
});

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
