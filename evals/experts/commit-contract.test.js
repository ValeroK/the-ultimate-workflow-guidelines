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
function project({ plan = PLAN, memory = false, agents = AGENTS_OK, testBody = PASSING, stamp = true } = {}) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b;\n');
  write(dir, 'test/add.test.js', testBody);
  write(dir, 'README.md', '# calc\n');
  write(dir, 'PLAN-calc.md', stamp ? confirmed(plan) : plan);
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

test("contract G6 run: card-commit with one of the card's experts missing commits the card and says the experts part is deferred to the run's review", () => {
  const dir = runProject({ plan: CARD_EXPERT_PLAN });
  editSource(dir);
  assert.strictEqual(fullRun(dir).status, 0);
  reviewRecord(dir); // fact: the lane records no security expert
  const tip = git(dir, 'rev-parse', 'HEAD');
  const r = commitCard(dir);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(r.check.outcome, 'deferred');
  assert.match(r.check.why, /experts: deferred to the run's review/);
  assert.notStrictEqual(git(dir, 'rev-parse', 'HEAD'), tip);
  assert.strictEqual(stampOf(dir).outcome, 'deferred', 'the stamp says so');
  // The same missing experts by hand (the hook) are still refused: only the run's card commit defers.
  const byHand = project({ plan: CARD_EXPERT_PLAN });
  editSource(byHand);
  assert.strictEqual(fullRun(byHand).status, 0);
  reviewRecord(byHand);
  const h = hook(byHand, COMMIT);
  assert.strictEqual(h.decision, 'deny', h.stdout);
  assert.ok(kindsOf(byHand).includes('experts'));
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
  // The Known failures plan is the one recorded answer that card commit-check changes on purpose (see frontmatter.test.js).
  for (const [rel, hash] of Object.entries(hashes)) if (rel !== 'plan-known-failures.md.fixture') assert.strictEqual(expertsLib.confirmHash(fixture(rel)), hash, rel);
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
    for (const [file, value] of Object.entries(files)) assert.match(expertsLib.assemblePhase(PLUGIN, path.basename(file, '.js')), new RegExp(`const ${name} = ${value}\\b`), `${name} in ${file}`);
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

// ======================================================================================================
// PLAN-simplify, card commit-check (second commit): confirmation at commit, the full list with one fix
// each, the three outcomes, the commit-time stamp. Same rules as above: real hook, real card-commit,
// gates forced on, one fact differs between a refuse case and its allow twin.
// ======================================================================================================

const STAMP = '.ultimate-workflow/commit-check.json';
const stampOf = (dir) => JSON.parse(read(dir, STAMP));
const contextOf = (r) => {
  try {
    return JSON.parse(r.stdout).hookSpecificOutput.additionalContext || '';
  } catch {
    return '';
  }
};
/** A plan the way a user confirms it: flags false, then setConfirmed twice (hash and recorded settings). */
const userConfirmed = (plan = PLAN) => expertsLib.setConfirmed(expertsLib.setConfirmed(plan.replace('plan_confirmed: true', 'plan_confirmed: false').replace('tests_confirmed: true', 'tests_confirmed: false'), 'plan_confirmed'), 'tests_confirmed');
const noExperts = (text) => text.replace('experts: [security]', 'experts: []');
const checkOut = (dir) => JSON.parse(run(CLI, ['check', '--plan', 'PLAN-calc.md'], { cwd: dir }).stdout);
const kindsOf = (dir) => (checkOut(dir).missing || []).map((m) => m.kind);
function rewritePlan(dir, fn) {
  write(dir, 'PLAN-calc.md', fn(read(dir, 'PLAN-calc.md')));
}

test('contract confirmation: each unconfirmed state is refused with the fix for that state, on both paths', () => {
  const rows = [
    ['tests_confirmed false', (t) => t.replace('tests_confirmed: true', 'tests_confirmed: false'), 'tests_confirmed'],
    ['plan_confirmed false with tests_confirmed true', (t) => t.replace('plan_confirmed: true', 'plan_confirmed: false'), 'plan_confirmed'],
  ];
  for (const [name, edit, flag] of rows) {
    for (const path_ of ['hand', 'run']) {
      const mk = () => (path_ === 'hand' ? project() : runProject());
      const twin = mk();
      checked(twin);
      assert.ok(path_ === 'hand' ? hook(twin, COMMIT).decision === 'allow' : commitCard(twin).ok === true, `${name} ${path_}: the twin with the flag true is allowed`);
      const dir = mk();
      checked(dir);
      rewritePlan(dir, edit); // fact: the flag
      if (path_ === 'hand') {
        const r = hook(dir, COMMIT);
        assert.strictEqual(r.decision, 'deny', `${name}: ${r.stdout}`);
        assert.match(r.reason, new RegExp(`--confirm ${flag}`), `${name}: the fix names the confirm command for the flag that is false`);
      } else {
        const r = commitCard(dir);
        assert.strictEqual(r.ok, false, `${name}: ${JSON.stringify(r)}`);
        assert.strictEqual(r.gate, 'confirmation');
        assert.match(r.reason, new RegExp(`--confirm ${flag}`));
      }
    }
  }
});

test('contract confirmation: a plan whose text changed after confirmation is allowed with a reminder to re-confirm (owner decision, 2026-11-13)', () => {
  const dir = project({ plan: userConfirmed(), stamp: false });
  checked(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
  rewritePlan(dir, (t) => t.replace('A calculator.', 'A calculator that also divides.')); // fact: one line of plan text
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /the plan changed after you confirmed it; re-confirm when convenient/);
});

test('contract confirmation: a card added to the plan after confirmation is allowed with the same reminder (concern 1, owner decision 2026-11-13)', () => {
  const dir = project({ plan: userConfirmed(), stamp: false });
  checked(dir);
  rewritePlan(dir, (t) => t.replace('- 2: docs', '- 3: sneaky\n  paths: src/**\n- 2: docs')); // fact: a card an agent added
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /re-confirm when convenient/);
});

test('contract confirmation: a run-added card (findings, fixup) does not move the hash', () => {
  const dir = project({ plan: userConfirmed(), stamp: false });
  checked(dir);
  rewritePlan(dir, (t) => t.replace('- 2: docs', '- findings: review findings\n  paths: src/add.js\n- 2: docs')); // fact: a card the run adds itself
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
});

test('contract confirmation: both flags true and no confirmed_hash is refused, and the refusal names the confirm step (owner decision, 2026-11-13)', () => {
  const dir = project({ plan: noExperts(fixture('plan-nohash.md.fixture')), stamp: false });
  assert.ok(!/confirmed_hash/.test(read(dir, 'PLAN-calc.md')), 'the 4.8.0 fixture has no hash');
  checked(dir);
  const r = hook(dir, COMMIT); // fact: no hash
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /confirm the plan and tests with the confirm step \(present --confirm\), then commit/);
  assert.deepStrictEqual(kindsOf(dir), ['confirmation']);
  // With the hash stamped the same tree is allowed: one fact differs.
  rewritePlan(dir, (t) => expertsLib.setFrontLine(t, 'confirmed_hash', expertsLib.confirmHash(t)));
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
  // The run is unchanged: it still refuses a missing hash at its start.
  assert.strictEqual(expertsLib.checkConfirmed(noExperts(fixture('plan-nohash.md.fixture'))).missing, 'hash');
});

test('contract confirmation: a Known failures section does not move the hash, and text after it does', () => {
  // The 4.8.0 baseline accept: section last, the hash stamped before it.
  const dir = project({ plan: noExperts(fixture('plan-known-failures.md.fixture')), stamp: false });
  checked(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow', hook(dir, COMMIT).stdout);
  // The section in the middle: a list item and a ### subheading inside it are still inside it.
  const withSection = userConfirmed(PLAN.replace('## Cards', '## Known failures\n\n- known one\n\n## Cards'));
  const inside = project({ plan: withSection.replace('- known one', '- known one, edited\n\n### Why\n\nbecause'), stamp: false });
  checked(inside);
  assert.strictEqual(hook(inside, COMMIT).decision, 'allow', 'editing inside the section is not a plan change');
  const after = project({ plan: withSection, stamp: false });
  checked(after);
  rewritePlan(after, (t) => t.replace('- 1: adder', '- 1: adder changed')); // fact: a line in the next ## section
  const changed = hook(after, COMMIT);
  assert.strictEqual(changed.decision, 'allow');
  assert.match(contextOf(changed), /re-confirm when convenient/, 'text after the section moves the hash; text inside it does not');
  assert.doesNotMatch(contextOf(hook(inside, COMMIT)), /re-confirm/);
});

test('contract confirmation: a changed setting does not refuse and is named, an unchanged one is not', () => {
  const settings = {
    test_command: (t) => t.replace('test_command: node --test "test/**/*.test.js"', 'test_command: node --test "test/**/*.test.js" --test-reporter=spec'),
    volatile_paths: (t) => t.replace('experts: []', 'experts: []\nvolatile_paths: logs/**'),
    known_failures: (t) => t.replace('experts: []', 'experts: []\nknown_failures: 2'),
    full_suite_paths: (t) => t.replace('experts: []', 'experts: []\nfull_suite_paths: src/**'),
  };
  const same = project({ plan: userConfirmed(), stamp: false });
  checked(same);
  const unchanged = hook(same, COMMIT);
  assert.strictEqual(unchanged.decision, 'allow');
  for (const key of Object.keys(settings)) assert.ok(!contextOf(unchanged).includes(key), `unchanged: ${key} is not named`);
  for (const [key, edit] of Object.entries(settings)) {
    const dir = project({ plan: userConfirmed(), stamp: false });
    rewritePlan(dir, edit); // fact: only this key, after the confirmation
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'settings');
    checked(dir);
    const r = hook(dir, COMMIT);
    assert.strictEqual(r.decision, 'allow', `${key}: ${r.stdout}`);
    const said = contextOf(r);
    assert.ok(said.includes(key), `${key} is named: ${said}`);
    for (const other of Object.keys(settings).filter((k) => k !== key)) assert.ok(!said.includes(other), `${key}: ${other} is not named`);
  }
  // The 4.8.0 plan has a hash and no record of the settings: judged normally, no notice.
  const old = project({ plan: noExperts(fixture('plan-calc.md.fixture')), stamp: false });
  checked(old);
  const r = hook(old, COMMIT);
  assert.strictEqual(r.decision, 'allow');
  assert.strictEqual(contextOf(r), '');
});

test('contract list: with all four missing the hook text and the missing array hold four items in the order confirmation, tests, experts, memory', () => {
  const dir = project({ memory: true });
  rewritePlan(dir, (t) => t.replace('tests_confirmed: true', 'tests_confirmed: false'));
  editSource(dir);
  write(dir, 'memory/b.md', topic('Topic B.')); // a topical the index does not list, so the memory item has a fix command
  assert.deepStrictEqual(kindsOf(dir), ['confirmation', 'tests', 'experts', 'memory']);
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  const at = ['--confirm tests_confirmed', '--full', '/ultimate-workflow:experts', 'memory index'].map((s) => r.reason.indexOf(s));
  assert.ok(at.every((i) => i >= 0), `all four fixes are in the text: ${r.reason}`);
  assert.deepStrictEqual([...at].sort((a, b) => a - b), at, 'and in that order');
  const fixes = checkOut(dir).missing.map((m) => m.fix);
  assert.strictEqual(fixes.length, 4);
  assert.ok(fixes.every((f) => typeof f === 'string' && f.length > 0), 'one fix command each');
  assert.match(fixes[0], /--confirm tests_confirmed/);
  assert.match(fixes[1], /verify\.js.* --full$/);
  assert.match(fixes[2], /^\/ultimate-workflow:experts/);
  assert.match(fixes[3], /memory/);
});

test('contract list: with one item missing the refusal holds exactly that item', () => {
  const cases = {
    confirmation: (dir) => { checked(dir); rewritePlan(dir, (t) => t.replace('tests_confirmed: true', 'tests_confirmed: false')); },
    tests: (dir) => { editSource(dir); reviewRecord(dir); },
    experts: (dir) => { editSource(dir); assert.strictEqual(fullRun(dir).status, 0); },
    memory: (dir) => { write(dir, 'memory/b.md', topic('Topic B.')); checked(dir); },
  };
  for (const [kind, setup] of Object.entries(cases)) {
    const dir = project({ memory: true });
    setup(dir);
    assert.deepStrictEqual(kindsOf(dir), [kind], kind);
    const r = hook(dir, COMMIT);
    assert.strictEqual(r.decision, 'deny', `${kind}: ${r.stdout}`);
  }
});

test('contract outcome: evidence that cannot be read as a record is a missing item with a fix, and the commit is refused', () => {
  const rows = {
    'verify.json is not JSON': [(d) => write(d, '.ultimate-workflow/verify.json', '{'), 'tests'],
    'verify.json lacks the fingerprint': [(d) => write(d, '.ultimate-workflow/verify.json', JSON.stringify({ mode: 'full', passed: true })), 'tests'],
    'verify.json is a directory': [(d) => { fs.rmSync(path.join(d, '.ultimate-workflow/verify.json')); fs.mkdirSync(path.join(d, '.ultimate-workflow/verify.json')); }, 'tests'],
    '_recheck.json is not JSON': [(d) => write(d, '.ultimate-workflow/experts/review/_recheck.json', '{not json'), 'experts'],
    '_recheck.json is a directory': [(d) => { fs.rmSync(path.join(d, '.ultimate-workflow/experts/review/_recheck.json')); fs.mkdirSync(path.join(d, '.ultimate-workflow/experts/review/_recheck.json')); }, 'experts'],
  };
  for (const [name, [corrupt, kind]] of Object.entries(rows)) {
    for (const path_ of ['hand', 'run']) {
      const dir = path_ === 'hand' ? project() : runProject();
      checked(dir);
      corrupt(dir); // fact: one state file
      if (path_ === 'hand') {
        const r = hook(dir, COMMIT);
        assert.strictEqual(r.decision, 'deny', `${name}: ${r.stdout}`);
        assert.doesNotMatch(r.reason + contextOf(r), /could not check/i);
        assert.strictEqual(stampOf(dir).outcome, 'refused', name);
        assert.ok(kindsOf(dir).includes(kind), `${name}: ${kind} is missing`);
      } else {
        const tip = git(dir, 'rev-parse', 'HEAD');
        const r = commitCard(dir);
        // The run's card commit does not read the experts evidence (the review at the run's end does), so only the
        // tests and memory records can refuse it.
        assert.strictEqual(r.ok, kind === 'experts', `${name}: ${JSON.stringify(r)}`);
        if (kind !== 'experts') assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), tip);
      }
    }
  }
});

test('contract outcome: a git error by hand lets the commit through and prints could not check with the reason', () => {
  const dir = project();
  checked(dir);
  fs.writeFileSync(path.join(dir, '.git', 'index'), 'not an index'); // fact: git cannot read the index
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /could not check/i);
  const s = stampOf(dir);
  assert.strictEqual(s.outcome, 'could-not-check');
  assert.ok(s.why && s.why.length > 0);
});

test('contract outcome: a git error in the run parks the card and commits nothing', () => {
  const dir = runProject();
  checked(dir);
  const tip = git(dir, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(dir, '.git', 'index'), 'not an index');
  const r = commitCard(dir);
  assert.strictEqual(r.ok, false, JSON.stringify(r));
  assert.strictEqual(r.gate, 'could-not-check');
  assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), tip, 'nothing was committed');
});

test('contract outcome: a failure reading any one guarantee leaves the other three listed', () => {
  const inject = {
    confirmation: (d) => { fs.rmSync(path.join(d, 'PLAN-calc.md')); fs.mkdirSync(path.join(d, 'PLAN-calc.md')); },
    tests: (d) => fs.mkdirSync(path.join(d, '.ultimate-workflow/verify.json'), { recursive: true }),
    experts: (d) => fs.mkdirSync(path.join(d, '.ultimate-workflow/experts/review/_recheck.json'), { recursive: true }),
    memory: (d) => write(d, 'memory.md', '# Memory\n\n<!-- uw:memory-index:start -->\n- [A](memory/a.md)\n'),
  };
  for (const [kind, fail] of Object.entries(inject)) {
    const dir = project({ memory: true });
    rewritePlan(dir, (t) => t.replace('tests_confirmed: true', 'tests_confirmed: false'));
    editSource(dir);
    write(dir, 'AGENTS.md', `${AGENTS_OK}See [gone](gone.md).\n`);
    fail(dir); // fact: this guarantee's evidence cannot be read
    const out = checkOut(dir);
    const kinds = out.missing.map((m) => m.kind);
    // memory-gate.test.js pins that a memory that cannot be read at all lets the commit through (4.8.0): it is a warning, not an item.
    const expectKinds = ['confirmation', 'tests', 'experts', 'memory'].filter((k) => !(k === 'memory' && (kind === 'memory' || kind === 'confirmation')));
    for (const k of expectKinds) assert.ok(kinds.includes(k), `${kind} unreadable: ${k} is still listed (${kinds.join(',')})`);
    if (kind === 'memory') {
      assert.match((out.warnings || []).join(' '), /memory could not be read/);
      continue;
    }
    const mine = out.missing.find((m) => m.kind === kind);
    assert.match(mine.text, /could not|cannot|unreadable|re-?checked|covers|broken/i, `${kind}: reported in words: ${mine.text}`);
  }
});

test('contract outcome: exempt reasons are printed by the hook, by check and in card-commit, and each says what it is', () => {
  const docs = project();
  write(docs, 'README.md', '# calc\n\nmore words\n');
  const dr = hook(docs, COMMIT);
  assert.strictEqual(dr.decision, 'allow');
  assert.match(contextOf(dr), /documentation/i);
  assert.strictEqual(stampOf(docs).outcome, 'exempt');
  const dcheck = checkOut(docs);
  assert.strictEqual(dcheck.outcome, 'exempt');
  assert.match(dcheck.why, /documentation/i);
  const empty = project();
  const er = hook(empty, 'git commit --allow-empty -m "empty"');
  assert.match(contextOf(er), /nothing to commit/i);
  const noplan = project();
  fs.rmSync(path.join(noplan, 'PLAN-calc.md'));
  git(noplan, 'add', '-A');
  git(noplan, 'commit', '-q', '-m', 'no plan');
  editSource(noplan);
  const nr = hook(noplan, COMMIT);
  assert.match(contextOf(nr), /no plan/i);
  const off = runProject();
  editSource(off);
  const jr = json(run(CLI, ['card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'], { cwd: off, gates: 'off' }));
  assert.strictEqual(jr.ok, true, JSON.stringify(jr));
  assert.strictEqual(jr.check.outcome, 'exempt');
  assert.match(jr.check.why, /gates off/i);
  const whys = [contextOf(dr), contextOf(er), contextOf(nr), jr.check.why];
  assert.strictEqual(new Set(whys).size, whys.length, 'each reason is its own');
});

test('contract exempt: a documentation-only or empty commit is exempt from confirmation, tests and experts together, and still refused for a memory link it breaks', () => {
  const dir = project({ memory: true });
  rewritePlan(dir, (t) => t.replace('tests_confirmed: true', 'tests_confirmed: false').replace('test_command: node --test "test/**/*.test.js"', 'test_command:'));
  write(dir, 'README.md', '# calc\n\nmore words\n'); // fact: documentation only, in a plan that confirms and tests nothing
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
  write(dir, 'AGENTS.md', `${AGENTS_OK}See [gone](gone.md).\n`); // fact: and a broken memory link
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /gone\.md/);
});

test('contract stamp: commit-check.json is written when the check runs on a commit, holds the outcome, and is not written by any other event', () => {
  const dir = project();
  checked(dir);
  for (const command of ['git status', 'git log --grep=commit', 'git commit-tree HEAD^{tree}']) hook(dir, command);
  hook(dir, '', { input: JSON.stringify({ cwd: dir, hook_event_name: 'UserPromptSubmit', prompt: 'go' }) });
  assert.ok(!fs.existsSync(path.join(dir, STAMP)), 'no stamp from a non-commit event');
  assert.strictEqual(hook(dir, COMMIT).decision, 'allow');
  const s = stampOf(dir);
  assert.strictEqual(s.outcome, 'checked');
  assert.deepStrictEqual(s.missing, []);
  assert.ok(!Number.isNaN(Date.parse(s.at)));
  const status = run(path.join(PLUGIN, 'hooks', 'status.js'), [], { cwd: dir });
  assert.match(status.stdout, /last commit check/i);
});

test('contract stamp: when the stamp cannot be written a refusal is still a refusal', () => {
  const refused = project();
  editSource(refused);
  fs.mkdirSync(path.join(refused, STAMP), { recursive: true }); // fact: the stamp path is a directory
  const r = hook(refused, COMMIT);
  assert.strictEqual(r.decision, 'deny', r.stdout);
  assert.match(r.reason, /Gate G7/);
  const ok = project();
  checked(ok);
  fs.mkdirSync(path.join(ok, STAMP), { recursive: true });
  const spawned = run(GATE, [], { cwd: ok, input: JSON.stringify({ cwd: ok, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: COMMIT } }) });
  assert.strictEqual(spawned.status, 0);
  assert.doesNotMatch(spawned.stderr, /at .*\.js:\d+/, 'no stack trace');
});

test('contract volatile: the evidence uses the volatile_paths of the plan it was given', () => {
  const dir = project();
  write(dir, 'PLAN-other.md', PLAN.replace('experts: []', 'experts: []\nvolatile_paths: logs/**'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'other');
  write(dir, '.ultimate-workflow/active-plan', 'PLAN-other.md\n'); // the pointer names the other plan
  write(dir, 'logs/run.log', 'noise 1\n');
  const a = expertsLib.testFingerprint(dir, 'PLAN-calc.md');
  const b = expertsLib.testFingerprint(dir, 'PLAN-other.md');
  assert.notStrictEqual(a, b, 'logs/run.log counts for calc and is excluded by other');
  assert.strictEqual(expertsLib.testsEvidence(dir, expertsLib.workingChanges(dir, 'PLAN-calc.md'), 'PLAN-calc.md').hash, a);
});

test('status and hook agree: status.js --json lists the same missing kinds the hook refuses with', () => {
  const dir = project({ memory: true });
  rewritePlan(dir, (t) => t.replace('tests_confirmed: true', 'tests_confirmed: false'));
  editSource(dir);
  write(dir, 'AGENTS.md', `${AGENTS_OK}See [gone](gone.md).\n`);
  const status = JSON.parse(run(path.join(PLUGIN, 'hooks', 'status.js'), ['--json'], { cwd: dir }).stdout);
  assert.deepStrictEqual(status.experts.commit.missing, ['confirmation', 'tests', 'experts', 'memory']);
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'deny');
  assert.deepStrictEqual(stampOf(dir).missing, status.experts.commit.missing);
});

// ---- card active-plan ------------------------------------------------------------------------------

test('contract exempt: several plans and no active plan chosen lets the commit through, prints that reason, and the stamp records it', () => {
  const dir = project();
  write(dir, 'PLAN-second.md', PLAN);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'second plan');
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'active-plan'), { force: true });
  editSource(dir);
  // The commands set the pointer when given --plan; make sure none is set here.
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'active-plan'), { force: true });
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /several plans and no active plan chosen/);
  const s = stampOf(dir);
  assert.strictEqual(s.outcome, 'exempt');
  assert.match(s.why, /several plans/);
  // The same tree with the pointer set is checked and refused: one fact differs.
  write(dir, '.ultimate-workflow/active-plan', 'PLAN-calc.md\n');
  assert.strictEqual(hook(dir, COMMIT).decision, 'deny');
  // The run names its plan, so it is checked whatever the pointer says.
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'active-plan'), { force: true });
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'active-plan'), { force: true });
  const c = commitCard(dir);
  assert.strictEqual(c.ok, false, 'card-commit judges its own --plan');
});

test('active plan: a pointer the containment check rejects does not switch the commit check off when one plan is open', () => {
  for (const value of ['../outside/PLAN-x.md', 'PLAN-missing.md', '', 'C:/x/PLAN-x.md']) {
    const dir = project();
    editSource(dir);
    write(dir, '.ultimate-workflow/active-plan', `${value}\n`); // fact: a pointer the check rejects
    const r = hook(dir, COMMIT);
    assert.strictEqual(r.decision, 'deny', `${JSON.stringify(value)}: ${r.stdout}`);
    assert.match(r.reason, /Gate G7/);
    assert.strictEqual(stampOf(dir).outcome, 'refused');
  }
  // A pointer naming a second plan that is done does not hide the open one either.
  const dir = project();
  write(dir, 'PLAN-old.md', PLAN.replace('phase: build', 'phase: done'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'old plan');
  editSource(dir);
  write(dir, '.ultimate-workflow/active-plan', 'PLAN-old.md\n');
  assert.strictEqual(hook(dir, COMMIT).decision, 'deny');
});

test('contract exempt: the only plan flipped to phase done after confirmation is a printed and stamped exemption, not a silent allow', () => {
  const dir = project();
  editSource(dir);
  assert.strictEqual(hook(dir, COMMIT).decision, 'deny', 'the plan is open: refused'); // fact: phase
  rewritePlan(dir, (t) => t.replace('phase: build', 'phase: done'));
  const r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /no plan is open/);
  const s = stampOf(dir);
  assert.strictEqual(s.outcome, 'exempt');
  assert.match(s.why, /no plan is open/);
});

test('contract tests: a plan with an empty or missing test_command refuses the commit, and the refusal says what to do (owner decision, 2026-11-13)', () => {
  for (const variant of ['empty', 'missing']) {
    const plan = variant === 'empty' ? PLAN.replace('test_command: node --test "test/**/*.test.js"', 'test_command:') : PLAN.replace('test_command: node --test "test/**/*.test.js"\n', '');
    for (const path_ of ['hand', 'run']) {
      const dir = path_ === 'hand' ? project({ plan }) : runProject({ plan });
      editSource(dir); // fact: no command to run the full suite with
      reviewRecord(dir);
      if (path_ === 'hand') {
        const r = hook(dir, COMMIT);
        assert.strictEqual(r.decision, 'deny', `${variant}: ${r.stdout}`);
        assert.match(r.reason, /set test_command in the plan's front matter, then run the full suite/);
        assert.deepStrictEqual(kindsOf(dir), ['tests']);
      } else {
        const r = commitCard(dir);
        assert.strictEqual(r.ok, false, `${variant}: ${JSON.stringify(r)}`);
        assert.strictEqual(r.gate, 'G7');
        assert.match(r.reason, /set test_command in the plan's front matter/);
      }
    }
  }
  // A documentation-only commit is still exempt.
  const docs = project({ plan: PLAN.replace('test_command: node --test "test/**/*.test.js"', 'test_command:') });
  write(docs, 'README.md', '# calc\n\nmore\n');
  assert.strictEqual(hook(docs, COMMIT).decision, 'allow');
});

test('contract confirmation: the notice names the cards added after the confirmation and the cards whose experts or paths changed', () => {
  const dir = project({ plan: userConfirmed(), stamp: false });
  checked(dir);
  rewritePlan(dir, (t) => t.replace('- 2: docs', '- 3: sneaky\n  paths: src/**\n- 2: docs')); // fact: a card an agent added
  let r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /cards added after the confirmation: 3/);
  rewritePlan(dir, (t) => t.replace('  paths: src/add.js\n', '  paths: src/add.js, src/other.js\n')); // fact: card 1's paths
  r = hook(dir, COMMIT);
  assert.strictEqual(r.decision, 'allow', r.stdout);
  assert.match(contextOf(r), /cards whose experts or paths changed: 1/);
  // A run-added card (findings, fixup) is outside the hash and is never named.
  const quiet = project({ plan: userConfirmed(), stamp: false });
  checked(quiet);
  // The plan text also changes, so the hash differs and the card comparison really runs.
  rewritePlan(quiet, (t) => t.replace('- 2: docs', '- findings: x\n  paths: src/add.js\n- 2: docs') + '\nOne more sentence.\n');
  const q = contextOf(hook(quiet, COMMIT));
  assert.match(q, /plan changed after you confirmed/, 'the comparison ran');
  assert.doesNotMatch(q, /cards added|findings/);
});

test('contract confirmation: cardsChanged names a card whose experts changed, one added, and nothing for a plan with no card record', () => {
  const confirmed = userConfirmed(PLAN.replace('  paths: src/add.js\n', '  paths: src/add.js\n  experts: [quality]\n'));
  assert.deepStrictEqual(expertsLib.cardsChanged(confirmed), { added: [], changed: [] });
  const narrowed = confirmed.replace('experts: [quality]', 'experts: [security]');
  assert.deepStrictEqual(expertsLib.cardsChanged(narrowed), { added: [], changed: ['1'] });
  assert.deepStrictEqual(expertsLib.cardsChanged(confirmed.replace('- 2: docs', '- 3: new\n  paths: x/**\n- 2: docs')).added, ['3']);
  const noRecord = confirmed.replace(/^confirmed_settings:.*$/m, '');
  assert.deepStrictEqual(expertsLib.cardsChanged(noRecord.replace('experts: [quality]', 'experts: [security]')), { added: [], changed: [] });
});
