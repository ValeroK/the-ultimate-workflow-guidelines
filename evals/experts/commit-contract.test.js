'use strict';

// PLAN-simplify, card baseline. The contract of the commit check, written against the 4.8.0
// behaviour and run in every later card. Every case spawns the real hooks/gate.js with a
// `git commit` payload (hand path) or runs the real `card-commit` command (run path) against a
// temp git project. Nothing is called in-process. Evidence (the full-run record and the expert
// records) is made by the real writers, so a field renamed on the writer side breaks a case.
// Each refuse and allow pair differs in exactly one fact, named in a comment.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const GATE = path.join(PLUGIN, 'hooks', 'gate.js');
const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));
const memoryLib = require(path.join(PLUGIN, 'lib', 'memory.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-contract-')));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

// The one place a child process that reaches a gate is built. It refuses to build an env without
// the gates on: this repository keeps them off, which would make every refusal case pass for the
// wrong reason. `gatesOff` is the one deliberate exception, for the "gates off" exemption.
function childEnv({ gates = 'on' } = {}) {
  if (gates !== 'on' && gates !== 'off') throw new Error(`gates must be "on" or "off", got ${gates}`);
  const env = { ...process.env, ULTIMATE_WORKFLOW_GATES: gates, ULTIMATE_WORKFLOW_NOTIFY: 'off' };
  delete env.NODE_TEST_CONTEXT;
  return env;
}
function run(file, args, { cwd, input, gates = 'on' } = {}) {
  return spawnSync(process.execPath, [file, ...args], { cwd, input, encoding: 'utf8', env: childEnv({ gates }) });
}
const cli = (cwd, ...a) => run(CLI, a, { cwd });
const json = (r) => {
  const line = r.stdout.trim().split(/\r?\n/).pop();
  try {
    return JSON.parse(line);
  } catch {
    throw new Error(`not one JSON line: ${r.stdout} ${r.stderr}`);
  }
};
/** The hook as a host runs it: a Bash PreToolUse payload on stdin. */
function hook(dir, command, { gates = 'on', input } = {}) {
  const payload = input !== undefined ? input : JSON.stringify({ cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
  const r = run(GATE, [], { cwd: dir, input: payload, gates });
  let reason = '';
  try {
    reason = JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason || '';
  } catch {
    reason = '';
  }
  return { status: r.status, decision: r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : `exit ${r.status}`, reason, stdout: r.stdout };
}
const COMMIT = 'git add -A && git commit -m "change"';

const PLAN = `---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: []
---

# PLAN: calc

## Goal

A calculator.

## Cards

- 1: adder
  paths: src/add.js
- 2: docs
  paths: README.md

## Tests

### 1: adder

- add(1, 2) is 3
`;
// The expert is the card's own (a card-level experts field), not the plan's.
// The plan names two experts and card 1 narrows to one: that is the run's rule (narrowedExperts).
const CARD_EXPERT_PLAN = PLAN.replace('experts: []', 'experts: [security, developer]').replace('  paths: src/add.js\n- 2', '  paths: src/add.js\n  experts: [security]\n- 2');
const confirmed = (text) => expertsLib.setFrontLine(text, 'confirmed_hash', expertsLib.confirmHash(text));
const PASSING = "const test = require('node:test'); const assert = require('node:assert');\ntest('add', () => assert.strictEqual(require('../src/add.js')(1, 2), 3));\n";
const FAILING = "const test = require('node:test'); const assert = require('node:assert');\ntest('add', () => assert.strictEqual(require('../src/add.js')(1, 2), 4));\n";
const topic = (desc) => `---\ndescription: ${desc}\nread_when:\n  paths:\n    - src/**\n---\n\n# ${desc}\n\nbody\n`;
const AGENTS_OK = '# Rules\n\nSee [memory](memory.md).\n';

/** A committed project on `main` (hand path) with a confirmed plan; the working tree is clean. */
function project({ plan = PLAN, memory = false, agents = AGENTS_OK, testBody = PASSING } = {}) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b;\n');
  write(dir, 'test/add.test.js', testBody);
  write(dir, 'README.md', '# calc\n');
  write(dir, 'PLAN-calc.md', confirmed(plan));
  if (memory) {
    write(dir, 'memory/a.md', topic('Topic A.'));
    write(dir, 'memory.md', memoryLib.renderIndex('# Memory\n', { 'memory/a.md': topic('Topic A.') }));
    write(dir, 'AGENTS.md', agents);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}
const editSource = (dir, tag = 'x') => write(dir, 'src/add.js', `module.exports = (a, b) => a + b; // ${tag}\n`);
const fullRun = (dir) => run(VERIFY, ['--full', '--plan', 'PLAN-calc.md'], { cwd: dir });
const LANE = (extra = {}) => JSON.stringify({ ok: true, expertLane: { stage: 'review', selected: [], ran: [], recheck: true, findings: [], ...extra } });
function reviewRecord(dir, lane = LANE(), plan = 'PLAN-calc.md') {
  const prep = cli(dir, 'prepare', '--range', 'working');
  assert.strictEqual(prep.status, 0, prep.stderr);
  write(dir, '.ultimate-workflow/run/lane.json', lane);
  const r = cli(dir, 'record', '--stage', 'review', '--plan', plan, '--result', '.ultimate-workflow/run/lane.json');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
}
/** The state a commit needs, made by the real writers: a passing full run and a review of these changes. */
function checked(dir) {
  editSource(dir);
  const v = fullRun(dir);
  assert.strictEqual(v.status, 0, v.stdout + v.stderr);
  reviewRecord(dir);
}
/** 4.8.0 positive sign that a hand commit was judged: `check` exits 0 with ok and no skip reason. */
function judged(dir) {
  const r = cli(dir, 'check', '--plan', 'PLAN-calc.md');
  const out = json(r);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual(out.ok, true);
  assert.ok(!out.skip, `an ordinary source commit is judged on evidence, not on a skip: ${r.stdout}`);
}

// ---- run path: a project on the run branch ------------------------------------------------

function runProject(opts) {
  const dir = project(opts);
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  return dir;
}
const commitCard = (dir, ...extra) => json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', ...extra));

// ---- G7: a full run on exactly these changes --------------------------------------------------

test('contract G7 hand: a commit with no full run on these changes is refused, and the reason names the verify command', () => {
  const dir = project();
  editSource(dir); // fact: no verify.json
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /G7/);
  assert.match(r.reason, /verify\.js/);
});

test('contract G7 hand: the same commit after a passing full run is allowed', () => {
  const dir = project();
  checked(dir); // fact: verify.json matches the fingerprint
  judged(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
});

test('contract G7 hand: one edit after the passing full run and the commit is refused again', () => {
  const dir = project();
  checked(dir);
  editSource(dir, 'one more byte'); // fact: one byte changed in a source file
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /Gate G7/);
});

test('contract G7 hand: a failed full run does not allow the commit', () => {
  const dir = project({ testBody: FAILING });
  editSource(dir);
  const v = fullRun(dir);
  assert.notStrictEqual(v.status, 0, 'the tests fail, so the full run fails'); // fact: the record says failed
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /G7/);
});

test('contract G7 run: card-commit without a passing full run is refused with gate G7 and commits nothing', () => {
  const dir = runProject();
  editSource(dir); // fact: no verify.json
  const tip = git(dir, 'rev-parse', 'HEAD');
  const r = commitCard(dir);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.gate, 'G7');
  assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), tip);
});

test('contract G7 run: card-commit after a passing full run commits the card', () => {
  const dir = runProject();
  checked(dir); // fact: record present
  const tip = git(dir, 'rev-parse', 'HEAD');
  const r = commitCard(dir);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(git(dir, 'rev-list', '--count', `${tip}..HEAD`), '1');
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['PLAN-calc.md', 'src/add.js']);
});

// ---- G6: the experts reviewed exactly these changes --------------------------------------------

test('contract G6 hand: a commit the experts did not review is refused, and the reason names the experts command', () => {
  const dir = project();
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0); // G7 holds; fact: no expert record
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /G6/);
  assert.match(r.reason, /\/ultimate-workflow:experts/);
});

test('contract G6 hand: the same commit with every selected expert recorded on this fingerprint is allowed', () => {
  const dir = project({ plan: PLAN.replace('experts: []', 'experts: [security]') });
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir, LANE({ available: ['security'], selected: ['security'], ran: ['security'] })); // fact: records present
  judged(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
});

const FINDING = (over = {}) => ({ expert: 'security', file: 'src/add.js', line: 1, what: 'The adder lets any caller overflow the total', confidence: 'high', status: 'confirmed', ...over });
function withFinding(over) {
  const dir = project({ plan: PLAN.replace('experts: []', 'experts: [security]') });
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir, LANE({ available: ['security'], selected: ['security'], ran: ['security'], findings: [FINDING(over)] }));
  return dir;
}

test('contract G6 hand: an open high-confidence finding refuses the commit and the reason holds its id, file and line', () => {
  const dir = withFinding({}); // fact: one open high finding
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /high-confidence finding/);
  assert.match(r.reason, /src\/add\.js:1/);
  assert.match(r.reason, /\[[^\]]+\]/);
});

test('contract G6 hand: the same finding at medium confidence does not refuse', () => {
  const dir = withFinding({ confidence: 'medium' }); // fact: the confidence field
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
});

test('contract G6 hand: expert records made before a later edit do not allow the commit', () => {
  const dir = project();
  checked(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
  write(dir, 'src/extra.js', 'module.exports = 1;\n'); // fact: the fingerprint moved after the expert records
  assert.strictEqual(fullRun(dir).status, 0, 'G7 holds again, so only G6 can refuse');
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /Gate G6/);
});

test("contract G6 run: card-commit with one of the card's experts missing is refused with gate G6 and names the card", () => {
  const dir = runProject({ plan: CARD_EXPERT_PLAN });
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir); // fact: the lane records no security expert
  const tip = git(dir, 'rev-parse', 'HEAD');
  const r = commitCard(dir);
  assert.strictEqual(r.ok, false, JSON.stringify(r));
  assert.strictEqual(r.gate, 'G6');
  assert.match(r.reason, /card 1/);
  assert.match(r.reason, /security/);
  assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), tip);
});

test("contract G6 run: card-commit with exactly the card's experts recorded commits the card", () => {
  const dir = runProject({ plan: CARD_EXPERT_PLAN });
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir, LANE({ available: ['security'], selected: ['security'], ran: ['security'] })); // fact: record present
  const r = commitCard(dir);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
});

// ---- memory: not newly broken by this commit ----------------------------------------------------

test('contract memory hand: a commit that adds a broken memory link is refused, with the link in the reason', () => {
  const dir = project({ memory: true });
  write(dir, 'AGENTS.md', `${AGENTS_OK}See [gone](gone.md).\n`); // fact: the link
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /gone\.md/);
});

test('contract memory hand: a link already broken at HEAD does not refuse the commit', () => {
  const dir = project({ memory: true, agents: `${AGENTS_OK}See [old](old.md).\n` });
  write(dir, 'AGENTS.md', `${AGENTS_OK}See [old](old.md).\nA new line.\n`); // fact: broken before, not by this commit
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
});

test('contract memory run: card-commit that makes a memory header invalid is refused with gate memory and commits nothing', () => {
  const dir = runProject({ memory: true });
  write(dir, 'memory/a.md', topic('Topic A.').replace('description:', 'colour: blue\ndescription:')); // fact: the header
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir);
  const tip = git(dir, 'rev-parse', 'HEAD');
  const r = commitCard(dir);
  assert.strictEqual(r.ok, false, JSON.stringify(r));
  assert.strictEqual(r.gate, 'memory');
  assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), tip);
});

test('contract memory run: card-commit with the header valid commits the card', () => {
  const dir = runProject({ memory: true });
  checked(dir); // fact: the header is untouched
  assert.strictEqual(commitCard(dir).ok, true);
});

// ---- exemptions: ways the check lets a commit through ----------------------------------------------

test('contract exempt: gates off lets the commit through on the hook path', () => {
  const dir = project();
  editSource(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'deny', 'with the gates on, the same tree is refused');
  assert.strictEqual(hook(dir, COMMIT, { gates: 'off' }).decision, 'allow'); // fact: the env
});

test('contract exempt: gates off lets card-commit through', () => {
  const dir = runProject();
  editSource(dir);
  assert.strictEqual(commitCard(dir).ok, false, 'with the gates on, the same tree is refused');
  const r = json(run(CLI, ['card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'], { cwd: dir, gates: 'off' }));
  assert.strictEqual(r.ok, true, JSON.stringify(r)); // fact: the env
});

test('contract exempt: a project with no plan lets the commit through', () => {
  const dir = project();
  fs.rmSync(path.join(dir, 'PLAN-calc.md'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'no plan');
  editSource(dir); // fact: no plan
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
});

test('contract bootstrap: a source commit with a PRD and no plan is judged by G6 only (no G7), as 4.8.0 does', () => {
  const dir = project();
  fs.rmSync(path.join(dir, 'PLAN-calc.md'));
  write(dir, 'PRD.md', '---\nprd_confirmed: false\n---\n# PRD\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'bootstrap');
  editSource(dir);
  // 4.8.0: G7 is feature-only, so no full run is asked for; G6 still asks for the experts.
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /G6/);
  assert.doesNotMatch(r.reason, /G7|verify\.js/);
});

test('contract exempt: a documentation-only commit needs no full run and no expert', () => {
  const hand = project();
  write(hand, 'README.md', '# calc\n\nmore words\n'); // fact: only documentation changed
  assert.strictEqual(hook(hand, COMMIT).decision, 'allow');
  const dir = runProject();
  write(dir, 'README.md', '# calc\n\nmore words\n');
  const r = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '2', '--feature', 'calc'));
  assert.strictEqual(r.ok, true, JSON.stringify(r));
});

test('contract exempt: an empty commit is allowed', () => {
  const dir = project(); // fact: nothing changed
  assert.strictEqual(hook(dir, 'git commit --allow-empty -m "empty"').decision, 'allow');
});

test('contract exempt: a hook payload that cannot be parsed fails open', () => {
  const dir = project();
  editSource(dir);
  const r = hook(dir, COMMIT, { input: '{ not json' });
  assert.strictEqual(r.decision, 'allow');
});

test("contract exempt: the run's stale memory index exception regenerates and commits the index, and the hook path refuses the same tree", () => {
  const dir = runProject({ memory: true });
  write(dir, 'memory/b.md', topic('Topic B.')); // fact: a topical the index does not list
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir);
  const hand = hook(dir, COMMIT);
  assert.strictEqual(hand.decision, 'deny', hand.stdout);
  assert.match(hand.reason, /memory index/);
  const r = commitCard(dir);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.ok(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n').includes('memory.md'));
});

// ---- migration: evidence made by the 4.8.0 code is read by the code under test ---------------------
// The fixtures under fixtures/4.8.0/ were made by the 4.8.0 writers (this code, before any card
// changed a writer). The cases copy them into a project built to the fixture's recorded tree.

const FIXTURES = path.join(__dirname, 'fixtures', '4.8.0');
const fixture = (...p) => fs.readFileSync(path.join(FIXTURES, ...p), 'utf8');

/** The tree the fixtures were recorded on, with the evidence of one fixture set copied in. */
function migrationProject({ records, waivers = false }) {
  const dir = project({ plan: fixture('plan-calc.md.fixture') });
  editSource(dir, 'recorded');
  assert.strictEqual(expertsLib.testFingerprint(dir), JSON.parse(fixture('state', 'verify.json')).fingerprint, 'the fingerprint recipe is the 4.8.0 one');
  write(dir, '.ultimate-workflow/verify.json', fixture('state', 'verify.json'));
  for (const name of ['security.json', '_recheck.json']) write(dir, `.ultimate-workflow/experts/review/${name}`, fixture('state', records, name));
  if (waivers) write(dir, '.ultimate-workflow/experts/waivers.json', fixture('state', 'waivers.json'));
  return dir;
}

test('contract migration: 4.8.0 verify.json, expert records and waivers.json on their matching tree allow the commit', () => {
  // Sub-case 1: verify.json and clean expert records.
  const clean = migrationProject({ records: 'clean' });
  assert.strictEqual(hook(clean, COMMIT).decision, 'allow', hook(clean, COMMIT).stdout);
  // Sub-case 2: an open high finding, and no waiver.
  const open = migrationProject({ records: 'open' });
  const refused = hook(open, COMMIT);
  assert.strictEqual(refused.decision, 'deny', refused.stdout);
  assert.match(refused.reason, /5438b144da/);
  // Sub-case 3: the same finding, dismissed only by the 4.8.0 waivers.json.
  const waived = migrationProject({ records: 'open', waivers: true });
  assert.strictEqual(hook(waived, COMMIT).decision, 'allow', hook(waived, COMMIT).stdout);
});

test('fixtures 4.8.0: each fixture file is tracked, byte-identical to the recorded checksum, and the table has 41 rows', () => {
  const crypto = require('node:crypto');
  const sums = JSON.parse(fixture('checksums.json'));
  assert.strictEqual(Object.keys(sums).length, 41);
  const tracked = git(path.join(__dirname, '..', '..'), 'ls-files', 'evals/experts/fixtures/4.8.0').split('\n');
  for (const [rel, sum] of Object.entries(sums)) {
    assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(FIXTURES, rel))).digest('hex'), sum, rel);
    assert.ok(tracked.includes(`evals/experts/fixtures/4.8.0/${rel}`), `${rel} is tracked`);
  }
  assert.match(fs.readFileSync(path.join(__dirname, '..', '..', '.gitattributes'), 'utf8'), /^evals\/experts\/fixtures\/\*\* -text$/m);
});

test('fixtures 4.8.0: every recorded 4.8.0 answer still holds (confirmHash of each frozen plan, experts list, memory headers)', () => {
  const hashes = JSON.parse(fixture('recorded', 'confirm-hashes.json'));
  assert.ok(Object.keys(hashes).length >= 12);
  for (const [rel, hash] of Object.entries(hashes)) assert.strictEqual(expertsLib.confirmHash(fixture(rel)), hash, rel);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(expertsLib.list(PLUGIN))), JSON.parse(fixture('recorded', 'experts-list.json')));
  const headers = JSON.parse(fixture('recorded', 'parse-header.json'));
  assert.ok(Object.keys(headers).length >= 5);
  for (const [name, value] of Object.entries(headers)) assert.deepStrictEqual(JSON.parse(JSON.stringify(memoryLib.parseHeader(fixture('frozen', 'memory', name)))), value, name);
});

test('fixtures 4.8.0: the Known failures plan was made by the real baseline accept, and the recorded counts match the code', () => {
  const kf = fixture('plan-known-failures.md.fixture');
  assert.match(kf, /^known_failures: 1\r?$/m);
  assert.match(kf, /^## Known failures\r?$/m);
  // 4.8.0 stamped the hash before the accept: it is the hash of the body without the section.
  const stamped = kf.match(/^confirmed_hash: (\w+)/m)[1];
  assert.strictEqual(stamped, expertsLib.confirmHash(fixture('plan-nohash.md.fixture')));
  const caps = JSON.parse(fixture('recorded', 'caps.json'));
  for (const [name, files] of Object.entries(caps)) {
    for (const [file, value] of Object.entries(files)) assert.match(fs.readFileSync(path.join(PLUGIN, file), 'utf8'), new RegExp(`const ${name} = ${value}\\b`), `${name} in ${file}`);
  }
  const calls = JSON.parse(fixture('recorded', 'review-call-counts.json'));
  assert.deepStrictEqual([calls.noExperts.count, calls.oneExpert.count, calls.twoExperts.count], [5, 6, 7]);
});

test('contract migration: a verify.json without a field the reader wants is refused with the tests item and the full-run fix', () => {
  const dir = project();
  editSource(dir);
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'verify.json'), JSON.stringify({ mode: 'full', passed: true })); // fact: no fingerprint
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /verify\.js/);
});

// ---- guards: a harness that proves nothing ------------------------------------------------------------

test('contract harness: gate.js and card-commit are spawned only through the helper, and the helper refuses to build an env without gates on', () => {
  const src = fs.readFileSync(__filename, 'utf8');
  const sites = src.split('\n').filter((l) => /\bspawnSync\(process\.execPath/.test(l));
  assert.strictEqual(sites.length, 1, `process.execPath is spawned in exactly one place: ${sites.join(' | ')}`);
  assert.throws(() => childEnv({ gates: undefined === 0 ? 'on' : '' }), /must be "on" or "off"/);
  assert.throws(() => childEnv({ gates: 'maybe' }), /must be "on" or "off"/);
  assert.strictEqual(childEnv().ULTIMATE_WORKFLOW_GATES, 'on');
});

test('contract harness: an ordinary source commit is judged on evidence, not on a skip', () => {
  const dir = project();
  checked(dir);
  judged(dir);
  const unchecked = project();
  editSource(unchecked);
  const out = json(cli(unchecked, 'check', '--plan', 'PLAN-calc.md'));
  assert.strictEqual(out.ok, false, 'without evidence, check refuses: it did not skip');
});

test('contract harness: each guarantee has a refuse case and an allow case on both paths', () => {
  const titles = fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => /^test\(/.test(l));
  for (const id of ['G7', 'G6', 'memory']) {
    for (const path_ of ['hand', 'run']) {
      const mine = titles.filter((t) => t.includes(`contract ${id} ${path_}:`));
      assert.ok(mine.length >= 2, `${id} ${path_} needs a refuse case and an allow case, found ${mine.length}`);
    }
  }
});
