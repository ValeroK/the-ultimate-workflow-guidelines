'use strict';

// PLAN-autopilot.md, W2 to W4 (4.7.0). The autopilot run builds every card in one background workflow.
// A workflow script cannot read a file or run git, so each card step that touches either is one
// command: `pack` writes the card's context pack and fails the preflight on missing input, `handoff`
// says from git what a card left behind, `park` moves a card that cannot be finished onto a branch
// and resets, `journal` passes lessons to later cards, and `card-commit` commits only what the
// commit gates would let through. Every one prints a single JSON line with a boolean `ok`, because
// the S0 spike showed a workflow agent never sees the exit code.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const cards = require(path.join(PLUGIN, 'experts', 'cards.js'));
const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));
// A plan with both confirmations gets the hash `present --confirm tests_confirmed` would write.
const confirmed = (text) => (/tests_confirmed: true/.test(text) ? expertsLib.setFrontLine(text, 'confirmed_hash', expertsLib.confirmHash(text)) : text);
const autopilot = require(path.join(PLUGIN, 'experts', 'autopilot.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-auto-')));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const env = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
// A child `node --test` (the test_command verify.js runs) reports to this runner when it inherits this.
delete env.NODE_TEST_CONTEXT;
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8', env });
const json = (r) => {
  const line = r.stdout.trim().split(/\r?\n/).pop();
  try {
    return JSON.parse(line);
  } catch {
    throw new Error(`not one JSON line: ${r.stdout} ${r.stderr}`);
  }
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

const PLAN = `---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: []
---

# PLAN: calc

## Goal

A calculator. See \`docs/design.md\` and \`docs/new-guide.md\`.

## Decisions

- integers only

## Cards

- 1: adder
  paths: src/add.js, docs/new-guide.md
- 2: parser
  paths: src/parse.js
  depends: 1
- 3: docs
  paths: README.md

## Tests

### 1: adder

- add(1, 2) is 3

### 2: parser

- parse("1+2") is 3

## Notes

nothing
`;

function repo({ plan = PLAN } = {}) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b;\n');
  write(dir, 'test/add.test.js', "const test = require('node:test'); const assert = require('node:assert');\ntest('add', () => assert.strictEqual(require('../src/add.js')(1, 2), 3));\n");
  write(dir, 'docs/design.md', '# Design of the calculator\n\nbody\n');
  write(dir, 'PLAN-calc.md', confirmed(plan));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

// --- cards: depends, parked, committed -------------------------------------------------------

// --- card status in the plan (2026-11-09) ------------------------------------------------------

test('a card status reads and writes back, keeping CRLF, and only the run\'s statuses are accepted', () => {
  const crlf = PLAN.replace(/\n/g, '\r\n');
  let t = cards.setField(crlf, '2', 'status', cards.checkStatus('running'));
  assert.equal(cards.findCard(t, '2').status, 'running');
  t = cards.setField(t, '2', 'status', cards.checkStatus('parked uw/parked/calc/2; not green: red 3 times'));
  assert.equal(cards.findCard(t, '2').status, 'parked uw/parked/calc/2; not green: red 3 times');
  assert.equal((t.match(/status:/g) || []).length, 1, 'a status is replaced, not added twice');
  assert.ok(!/[^\r]\n/.test(t), 'every line ending is still CRLF');
  assert.equal(cards.findCard(t, '1').status, undefined);
  for (const ok of ['pending', 'running (resumed)', 'resumed', 'committed abc1234', 'fixed-in-round abc1234def', 'blocked by 1']) assert.equal(cards.checkStatus(ok), ok);
  for (const bad of ['done', 'committed', 'blocked', 'committed xyz', '']) {
    if (bad === 'committed') continue;
    assert.throws(() => cards.checkStatus(bad), /is not one of/, bad);
  }
  assert.equal(cards.statusKind('parked uw/parked/calc/2; x'), 'parked');
  assert.equal(cards.statusKind('fixed-in-round abc1234'), 'fixed-in-round');
});

test('card-status writes running and blocked by into the plan, and refuses a status the run does not use', () => {
  const dir = repo();
  assert.equal(json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '1', '--status', 'running')).ok, true);
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').status, 'running');
  assert.equal(json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '2', '--status', 'blocked by 1')).ok, true);
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '2').status, 'blocked by 1');
  const bad = json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '1', '--status', 'done'));
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /is not one of/);
});

test('park writes parked into the plan and commits the plan alone on the run branch; unpark sets resumed', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  const tip = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/add.js', 'module.exports = () => { throw 1; };\n');
  const p = json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'not green: red three times'));
  assert.equal(p.ok, true, JSON.stringify(p));
  assert.equal(p.planCommit.committed, true, JSON.stringify(p.planCommit));
  assert.equal(git(dir, 'rev-parse', 'HEAD~1'), tip, 'one commit on the run branch: the plan');
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['PLAN-calc.md']);
  assert.equal(cards.findCard(git(dir, 'show', 'HEAD:PLAN-calc.md'), '1').status, 'parked uw/parked/calc/1; not green: red three times');
  assert.equal(git(dir, 'status', '--porcelain'), '', 'the plan on the run branch matches git');
  const u = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(u.ok, true, JSON.stringify(u));
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').status, 'resumed');
});

// 2026-11-09, a real run: a reason that is a heading and a list kept only its heading in the plan.
test('park keeps the whole reason in the plan, on one line, when it is a heading and a list', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = () => 0;\n');
  write(dir, 'why.txt', 'blocking finding from the experts check, outside this card\'s paths so no fix round:\n- quality: src/prices.js:4 an unknown item is priced at 0\n');
  assert.equal(json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason-file', 'why.txt')).ok, true);
  const c = cards.findCard(read(dir, 'PLAN-calc.md'), '1');
  assert.match(c.status, /so no fix round: - quality: src\/prices\.js:4 an unknown item is priced at 0$/);
  assert.match(c.parked.reason, /src\/prices\.js:4 an unknown item is priced at 0/);
});

// The user's two confirmations gate the run (2026-11-09): run-start refuses, and creates nothing,
// unless both are recorded and the plan is the one confirmed. The run's own writes do not count.
test('run-start refuses without the plan confirmation, without the test plan confirmation, or with the plan changed since', () => {
  const noPlan = repo({ plan: PLAN.replace('plan_confirmed: true', 'plan_confirmed: false') });
  const a = json(cli(noPlan, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(a.ok, false);
  assert.equal(a.missing, 'plan');
  assert.match(a.reason, /the plan is not confirmed/);
  assert.equal(git(noPlan, 'branch', '--list', 'uw/run/calc'), '', 'no run branch was created');

  const noTests = repo({ plan: PLAN.replace('tests_confirmed: true', 'tests_confirmed: false') });
  const b = json(cli(noTests, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(b.missing, 'tests');
  assert.match(b.reason, /the test plan is not confirmed/);

  const hand = tmp();
  for (const [k, v] of [['init', ['-q', '-b', 'main']], ['config', ['user.email', 't@localhost']], ['config', ['user.name', 't']]]) git(hand, k, ...v);
  write(hand, 'PLAN-calc.md', PLAN);
  git(hand, 'add', '-A');
  git(hand, 'commit', '-q', '-m', 'init');
  const c = json(cli(hand, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(c.missing, 'hash', 'flags set by hand, with no confirmed_hash, are not proof');

  const dir = repo();
  write(dir, 'PLAN-calc.md', read(dir, 'PLAN-calc.md').replace('- integers only', '- integers and floats'));
  const d = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(d.missing, 'unchanged');
  assert.match(d.reason, /the plan changed after the user confirmed it/);
  assert.equal(git(dir, 'branch', '--list', 'uw/run/calc'), '');
});

test('the run\'s own writes to the plan do not count as a change to what the user confirmed', () => {
  const dir = repo();
  json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '1', '--status', 'running'));
  json(cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', 'findings', '--title', 'x', '--paths', 'src/add.js', '--carried', 'a finding'));
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
});

// --- decisions the plan does not state, and notices (2026-11-09) ------------------------------

test('decisions: an unplanned dependency, env var, external host, removed export and deleted outside file are major', () => {
  const dir = repo();
  write(dir, 'package.json', JSON.stringify({ name: 'calc', dependencies: {} }, null, 2));
  write(dir, 'src/old.js', 'module.exports = 1;\n');
  write(dir, 'src/add.js', 'module.exports = function add(a, b) { return a + b; };\nmodule.exports.sum = 1;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  write(dir, 'package.json', JSON.stringify({ name: 'calc', dependencies: { 'left-pad': '1.3.0' } }, null, 2));
  write(dir, 'src/add.js', "const key = process.env.CALC_KEY;\nfetch('https://api.numbers.io/x');\nmodule.exports = function plus(a, b) { return a + b; };\n");
  fs.rmSync(path.join(dir, 'src/old.js'));
  const r = json(cli(dir, 'decisions', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const kinds = r.major.map((d) => d.kind).sort();
  assert.deepStrictEqual(kinds, ['dependency', 'env', 'file', 'interface', 'interface', 'service'], JSON.stringify(r.major));
  assert.ok(r.major.some((d) => /left-pad@1\.3\.0/.test(d.what)));
  assert.ok(r.major.some((d) => /deleted src\/old\.js/.test(d.what)));
  assert.match(read(dir, r.file), /## Major \(need the user\)/);
});

test('decisions: the same changes, named in the plan, are planned; a declared minor choice is recorded only', () => {
  const dir = repo({ plan: PLAN.replace('- integers only', '- integers only\n- uses the left-pad package, reads CALC_KEY, calls api.numbers.io') });
  write(dir, 'package.json', JSON.stringify({ name: 'calc', dependencies: {} }, null, 2));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  write(dir, 'package.json', JSON.stringify({ name: 'calc', dependencies: { 'left-pad': '1.3.0' } }, null, 2));
  write(dir, 'src/add.js', "const key = process.env.CALC_KEY;\nfetch('https://api.numbers.io/x');\nmodule.exports = (a, b) => a + b;\n");
  write(dir, 'declared.json', JSON.stringify([{ what: 'named the helper toInt', major: false }, { what: 'kept the cache in memory', major: false }]));
  const r = json(cli(dir, 'decisions', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--declared', 'declared.json'));
  assert.deepStrictEqual(r.major, [], JSON.stringify(r));
  assert.ok(r.minor.some((d) => d.what === 'named the helper toInt'));
});

test('decisions: a declared major decision is major', () => {
  const dir = repo();
  write(dir, 'declared.json', JSON.stringify([{ what: 'switched the result type to BigInt', major: true }]));
  const r = json(cli(dir, 'decisions', '--plan', 'PLAN-calc.md', '--card', '1', '--declared', 'declared.json'));
  assert.deepStrictEqual(r.major, [{ kind: 'declared', what: 'switched the result type to BigInt' }]);
});

// 2026-11-09, the live --accept run: the resumed card declared the accepted decision again and was
// held a second time; and the accepted line was the decision cut at 240 characters.
test('after --accept, the card\'s re-declared decision is covered, but a new unplanned dependency is still held', () => {
  const dir = repo({ plan: PLAN.replace('- integers only', '- integers only\n- Accepted during the run for card 1: - env: reads the environment variable PORT') });
  write(dir, 'package.json', JSON.stringify({ name: 'calc', dependencies: {} }, null, 2));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  write(dir, 'src/add.js', 'const p = process.env.PORT;\nmodule.exports = (a, b) => a + b;\n');
  write(dir, 'declared.json', JSON.stringify([{ what: 'read the PORT environment variable', major: true }]));
  const covered = json(cli(dir, 'decisions', '--plan', 'PLAN-calc.md', '--card', '1', '--declared', 'declared.json'));
  assert.deepStrictEqual(covered.major, [], JSON.stringify(covered));
  assert.ok(covered.minor.some((d) => /covered by the decision the user accepted/.test(d.what)));
  write(dir, 'package.json', JSON.stringify({ name: 'calc', dependencies: { 'left-pad': '1.3.0' } }, null, 2));
  const still = json(cli(dir, 'decisions', '--plan', 'PLAN-calc.md', '--card', '1', '--declared', 'declared.json'));
  assert.deepStrictEqual(still.major.map((d) => d.kind), ['dependency']);
  const other = json(cli(dir, 'decisions', '--plan', 'PLAN-calc.md', '--card', '2', '--declared', 'declared.json'));
  assert.ok(other.major.some((d) => d.kind === 'declared'), 'another card is not covered by card 1\'s acceptance');
});

test('park keeps only the decision from a "cannot be done within the plan" reason, so --accept records the decision, not the instructions', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = 0;\n');
  write(dir, 'why.txt', 'cannot be done within the plan: needs decision - env: reads PORT; run --resume 1 --accept to allow it, or change the plan.\n- detail, from the run within the plan: tests did not fail first\n');
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason-file', 'why.txt', '--needs-decision'));
  const c = cards.findCard(read(dir, 'PLAN-calc.md'), '1');
  assert.equal(c.decision, '- env: reads PORT');
  assert.match(c.status, /^needs-decision uw\/parked\/calc\/1; cannot be done within the plan: needs decision - env: reads PORT, run --resume 1 --accept/);
});

test('park --needs-decision keeps the whole decision, not the 240-character status cut', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = 0;\n');
  const long = `needs a decision the plan does not state:\n- declared: ${'used the PORT variable because the plan only says through the environment '.repeat(5)}END`;
  write(dir, 'why.txt', long);
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason-file', 'why.txt', '--needs-decision'));
  const c = cards.findCard(read(dir, 'PLAN-calc.md'), '1');
  assert.match(c.decision, /^- declared: used the PORT/);
  assert.match(c.decision, /END$/);
});

test('park --needs-decision holds the card with its decision in the plan; --accept takes it into Decisions and resumes', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = require("left-pad");\n');
  write(dir, 'why.txt', 'needs a decision the plan does not state:\n- dependency: added dependency left-pad@1.3.0 in package.json\n');
  const p = json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason-file', 'why.txt', '--needs-decision'));
  assert.equal(p.ok, true, JSON.stringify(p));
  const held = cards.findCard(read(dir, 'PLAN-calc.md'), '1');
  assert.match(held.status, /^needs-decision uw\/parked\/calc\/1; needs a decision the plan does not state: - dependency: added dependency left-pad/);
  assert.match(held.decision, /added dependency left-pad@1\.3\.0/);
  assert.match(git(dir, 'log', '-1', '--format=%s', 'uw/parked/calc/1'), /^needs decision: card 1/);
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc', '--resume-card', '1', '--accept'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const plan = read(dir, 'PLAN-calc.md');
  assert.match(plan, /## Decisions\n\n- integers only\n- Accepted during the run for card 1: - dependency: added dependency left-pad/);
  assert.equal(cards.findCard(plan, '1').decision, undefined);
  assert.equal(read(dir, 'src/add.js'), 'module.exports = require("left-pad");\n', 'the held work is back');
  assert.equal(expertsLib.checkConfirmed(plan).ok, true, 'the accepted decision is part of the confirmed plan');
  assert.match(JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json')).resume.accepted, /left-pad/);
});

test('--resume <card> without --accept runs a held card again without its work, told what to avoid', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = require("left-pad");\n');
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'needs a decision the plan does not state: - dependency: left-pad', '--needs-decision'));
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc', '--resume-card', '1'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a + b;\n', 'the held work is not brought back');
  const c = cards.findCard(read(dir, 'PLAN-calc.md'), '1');
  assert.equal(c.status, 'pending');
  assert.equal(c.parked, undefined);
  const resume = JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json')).resume;
  assert.equal(resume.rerun, true);
  assert.match(resume.avoid, /left-pad/);
  assert.equal(resume.heldBranch, 'uw/parked/calc/1', 'the held branch is named, so the report can say it is superseded');
  assert.equal(git(dir, 'rev-parse', '--verify', '-q', 'uw/parked/calc/1') !== '', true, 'and it is kept');
  // 2026-11-09, a live run: the first call cleared the decision, so a second call without --accept
  // would have taken the accept path and brought the unaccepted work back.
  assert.match(c.decision, /left-pad/, 'the decision stays until the card is committed or held again');
  const again = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc', '--resume-card', '1'));
  assert.equal(again.ok, true, JSON.stringify(again));
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a + b;\n', 'a second call is the same rerun, not an accept');
  assert.equal(JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json')).resume.rerun, true);
  const notices = read(dir, '.ultimate-workflow/run/calc/notifications.jsonl').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(notices.some((n) => n.kind === 'resumed' && n.card === '1' && /run again from its tests within the plan/.test(n.reason)), 'the resume is notified');
});

test('card-commit clears a held card\'s decision once it is done within the plan', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '1', '--status', 'pending'));
  write(dir, 'PLAN-calc.md', cards.setField(read(dir, 'PLAN-calc.md'), '1', 'decision', '- env: reads PORT'));
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b; // within the plan\n');
  const r = JSON.parse(spawnSync(process.execPath, [CLI, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'], { cwd: dir, encoding: 'utf8', env: { ...env, ULTIMATE_WORKFLOW_GATES: 'off' } }).stdout.trim().split('\n').pop());
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').decision, undefined);
  assert.equal(cards.findCard(git(dir, 'show', 'HEAD:PLAN-calc.md'), '1').decision, undefined, 'and the committed plan has no held decision');
});

test('pack does not treat the run\'s own report, named in the Run status block, as a cited document', () => {
  const dir = repo();
  write(dir, 'PLAN-calc.md', `${read(dir, 'PLAN-calc.md').replace(/\s+$/, '')}\n\n## Run status\n\n- Report: .ultimate-workflow/run/calc/report.md\n`);
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '2', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('a resume pack rebuilds parked.md from the parked commit when the run folder is gone', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = () => 0;\n');
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'not green: the sum is wrong'));
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'run'), { recursive: true, force: true });
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--resume'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match(read(dir, '.ultimate-workflow/run/calc/cards/1/parked.md'), /not green: the sum is wrong/);
});

test('notify appends the notice to the run folder and reports the desktop result', () => {
  const dir = repo();
  const r = spawnSync(process.execPath, [CLI, 'notify', '--feature', 'calc', '--kind', 'needs-decision', '--card', '1', '--reason', 'added left-pad', '--action', '/ultimate-workflow:feature --resume 1 --accept'], { cwd: dir, encoding: 'utf8', env: { ...env, ULTIMATE_WORKFLOW_NOTIFY: 'off' } });
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(out.ok, true);
  assert.equal(out.desktop, 'off');
  assert.match(read(dir, '.ultimate-workflow/run/calc/notifications.md'), /\*\*needs-decision\*\* card 1: added left-pad Next: `\/ultimate-workflow:feature --resume 1 --accept`/);
  const bad = spawnSync(process.execPath, [CLI, 'notify', '--feature', 'calc', '--kind', 'oops'], { cwd: dir, encoding: 'utf8', env });
  assert.match(bad.stdout, /notify --kind is one of/);
  // The desktop result is kept with the notice (a live run's step outputs are not in its result).
  const rec = JSON.parse(read(dir, '.ultimate-workflow/run/calc/notifications.jsonl').trim().split('\n').pop());
  assert.equal(rec.desktop, 'off');
  assert.equal(rec.card, '1');
});

test('the report has a Needs you section with the command for each held card', () => {
  const dir = repo();
  const result = { ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc', plan: 'PLAN-calc.md', summary: 's', counts: {}, expertLanes: [], review: { ran: false, reason: 'r' }, harvest: { ran: false, reason: 'r' },
    cards: [{ card: 'server', title: 't', status: 'needs-decision', branch: 'uw/parked/calc/server', reason: 'needs a decision the plan does not state: - env: reads PORT', action: '/ultimate-workflow:feature --resume server --accept (take the decision into the plan), or --resume server (run it again within the plan)' }, { card: 'greet', title: 'g', status: 'committed', commit: 'c1', build: { rounds: 1 } }] };
  write(dir, 'out/wf_need-1.output', JSON.stringify({ agentCount: 1, totalTokens: 1, result: JSON.stringify(result) }));
  const text = read(dir, json(cli(dir, 'run-finish', '--output', 'out/wf_need-1.output')).report);
  assert.match(text, /## Needs you\n\n- server \(needs-decision\): needs a decision the plan does not state: - env: reads PORT\n  Run: `\/ultimate-workflow:feature --resume server --accept/);
  assert.doesNotMatch(text, /- greet \(committed\)/);
});

test('run-start marks every open card pending and reports a card a run died inside', () => {
  const dir = repo();
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(cards.parseCards(read(dir, 'PLAN-calc.md')).map((c) => c.status), ['pending', 'pending', 'pending']);
  assert.equal(r.interrupted, undefined);
  json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '1', '--status', 'running'));
  const again = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc', '--resume'));
  assert.equal(again.ok, true, JSON.stringify(again));
  assert.deepStrictEqual(again.interrupted, ['1'], 'a card left at running is one the run died inside');
});

test('card-commit --fixed-round records fixed-in-round in the commit and its sha after it', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b; // fixed\n');
  const env2 = { ...env, ULTIMATE_WORKFLOW_GATES: 'off' };
  const r = JSON.parse(spawnSync(process.execPath, [CLI, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--fixed-round'], { cwd: dir, encoding: 'utf8', env: env2 }).stdout.trim().split('\n').pop());
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(cards.findCard(git(dir, 'show', 'HEAD:PLAN-calc.md'), '1').status, 'fixed-in-round');
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').status, `fixed-in-round ${r.commit}`);
});

test('a card reads its depends, parked and committed fields', () => {
  const text = PLAN.replace('  depends: 1\n', '  depends: 1, 0a\n  parked: uw/parked/calc/2; verification failed 3 times\n  committed: abc123\n');
  const c = cards.findCard(text, '2');
  assert.deepStrictEqual(c.depends, ['1', '0a']);
  assert.deepStrictEqual(c.parked, { branch: 'uw/parked/calc/2', reason: 'verification failed 3 times' });
  assert.equal(c.committed, 'abc123');
  assert.equal(cards.findCard(text, '1').depends, undefined, 'no field is not an empty list');
});

test('setField replaces, removes and appends in the plan\'s own line endings, and refuses an unknown card', () => {
  let text = cards.setField(PLAN, '2', 'parked', 'uw/parked/calc/2; red');
  assert.deepStrictEqual(cards.findCard(text, '2').parked, { branch: 'uw/parked/calc/2', reason: 'red' });
  text = cards.setField(text, '2', 'parked', 'uw/parked/calc/2; red again');
  assert.equal((text.match(/parked:/g) || []).length, 1, 'replaced, not added twice');
  text = cards.setField(text, '2', 'parked', null);
  assert.equal(cards.findCard(text, '2').parked, undefined);
  text = cards.setField(text, '3', 'carried', 'fix the typo in README.md:4');
  text = cards.setField(text, '3', 'carried', 'second; fix the typo in README.md:4');
  assert.deepStrictEqual(cards.findCard(text, '3').carried, ['fix the typo in README.md:4', 'second']);
  assert.equal(cards.findCard(text, '3').paths[0], 'README.md', 'the other fields are untouched');
  const crlf = cards.setField(PLAN.replace(/\n/g, '\r\n'), '1', 'committed', 'abc');
  assert.ok(!/[^\r]\n/.test(crlf), 'no bare LF in a CRLF plan');
  assert.throws(() => cards.setField(PLAN, '9', 'committed', 'x'), /no card "9"/);
  assert.throws(() => cards.setField(PLAN, '1', 'paths', 'x'), /one of/);
});

test('card-add takes --depends and refuses a card that depends on itself', () => {
  const dir = repo();
  const r = cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', '4', '--title', 'sub', '--paths', 'src/sub.js', '--depends', '1, 2');
  assert.equal(r.status, 0, r.stderr);
  assert.deepStrictEqual(cards.findCard(read(dir, 'PLAN-calc.md'), '4').depends, ['1', '2']);
  const self = cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', '5', '--title', 'x', '--paths', 'x.js', '--depends', '5');
  assert.equal(self.status, 2);
  assert.match(self.stdout, /cannot depend/);
});

// 2026-11-08, a real run: the review named the fix-up card's file by absolute path and card-add refused it.
test('card-add takes an absolute path inside the project as relative, and still refuses one outside it', () => {
  const dir = repo();
  const r = cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', 'fixup', '--title', 'fix', '--paths', path.join(dir, 'test', 'sub.test.js'));
  assert.equal(r.status, 0, r.stderr);
  assert.deepStrictEqual(cards.findCard(read(dir, 'PLAN-calc.md'), 'fixup').paths, ['test/sub.test.js']);
  const out = cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', 'out', '--title', 'x', '--paths', path.join(path.dirname(dir), 'x.js'));
  assert.equal(out.status, 2);
  assert.match(out.stdout, /must be relative to the project root/);
});

// --- pack ------------------------------------------------------------------------------------

test('pack lists the shared plan sections, the card, its tests, cited docs, the rules and the dependency handoffs', () => {
  const dir = repo();
  write(dir, 'AGENTS.md', '# Rules\n');
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '2', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.contextFile, '.ultimate-workflow/run/calc/cards/2/context.md');
  const text = read(dir, r.contextFile);
  const listed = text.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.replace(/:.*$/, ''));
  assert.deepStrictEqual(listed, [
    '- PLAN-calc.md lines 12-15',
    '- PLAN-calc.md lines 16-19',
    '- PLAN-calc.md lines 20-29',
    '- PLAN-calc.md lines 36-39',
    '- docs/design.md',
    '- AGENTS.md',
    '- .ultimate-workflow/run/calc/cards/1/handoff.md (if present)',
    '- .ultimate-workflow/run/calc/journal.md (if present)',
  ]);
  assert.match(text, /docs\/design\.md: Design of the calculator/);
  assert.match(text, /this card's tests: 2: parser/);
  assert.match(text, /Files this card may change: src\/parse\.js/);
  assert.doesNotMatch(text, /new-guide/, 'a doc a card is to write is neither read nor missing');
});

test('pack fails the preflight on a cited document that does not exist, and says which', () => {
  const dir = repo({ plan: PLAN.replace('`docs/design.md`', '`docs/gone.md`') });
  const res = cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc');
  const r = json(res);
  assert.equal(r.ok, false);
  assert.equal(res.status, 1);
  assert.match(r.reason, /^missing input: .*docs\/gone\.md, which does not exist/);
  assert.ok(fs.existsSync(path.join(dir, r.contextFile)), 'the pack is still written, for the parked card');
});

test('pack fails the preflight on a card with no test-plan section', () => {
  const dir = repo();
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '3', '--feature', 'calc'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /no test-plan section for card 3/);
});

test('pack: one card and no subheadings uses the whole Tests section; --resume needs a parked diagnosis', () => {
  const one = PLAN.replace(/- 2: parser[\s\S]*?README\.md\n/, '').replace(/### 1: adder\n\n/, '').replace(/### 2: parser\n\n- parse\("1\+2"\) is 3\n\n/, '');
  const dir = repo({ plan: one });
  assert.equal(json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc')).ok, true);
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--resume'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /has no parked\.md/);
});

test('pack lists the memory topicals whose Read-when cue matches the card, chosen in code', () => {
  const dir = repo();
  write(dir, 'memory.md', [
    '# Memory',
    '- [memory/parsing.md](memory/parsing.md) - how input is read. **Read when** touching `src/parse.js` or the tokenizer.',
    '- [memory/deploy.md](memory/deploy.md) - releases. **Read when** `deploy/**`, a release.',
    '- [memory/adders.md](memory/adders.md) - arithmetic. **Read when** changing the adder module.',
    '',
  ].join('\n'));
  for (const f of ['parsing', 'deploy', 'adders']) write(dir, `memory/${f}.md`, `# ${f}\n`);
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, cards.findCard(PLAN, '2')).map((m) => m.path), ['memory/parsing.md']);
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, cards.findCard(PLAN, '1')).map((m) => m.path), ['memory/adders.md']);
});

test('pack reads memory from the plan memory_root and lists the matched topical from the project root', () => {
  const plan = PLAN.replace('experts: []', 'experts: []\nmemory_root: sub/dir').replace('paths: src/parse.js', 'paths: sub/dir/hooks/x.js');
  const dir = repo({ plan });
  write(dir, 'sub/dir/memory.md', '# Memory\n');
  write(dir, 'sub/dir/memory/h.md', '---\ndescription: Hooks.\nread_when:\n  paths:\n    - hooks/**\n---\n\n# Hooks\n');
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '2', '--feature', 'calc'));
  assert.match(read(dir, r.contextFile), /^- sub\/dir\/memory\/h\.md: /m);
});

test('pack refuses a feature name that cannot be a branch or a folder', () => {
  const dir = repo();
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', '../x'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /--feature/);
});

// --- handoff ---------------------------------------------------------------------------------

test('handoff says from git what changed and what is exported, and names a claimed test file the diff does not have', () => {
  const dir = repo();
  const base = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/parse.js', 'function parse(s) { return 3; }\nmodule.exports = { parse };\nexport function tokens() {}\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'parse');
  const r = json(cli(dir, 'handoff', '--card', '2', '--feature', 'calc', '--range', `${base}..HEAD`, '--claimed', 'test/parse.test.js, src/parse.js'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.missingClaims, ['test/parse.test.js']);
  const text = read(dir, r.handoff);
  assert.match(text, /- added src\/parse\.js: exports tokens/);
  assert.match(text, /Claimed by the build but not in the diff: test\/parse\.test\.js/);
});

// --- park and unpark -------------------------------------------------------------------------

test('park commits the card\'s work, failing tests and new files included, to its branch, resets, and records it in the plan', () => {
  const dir = repo();
  const head = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a - b;\n');
  write(dir, 'test/sub.test.js', "require('node:test')('sub', () => { throw new Error('red'); });\n");
  write(dir, '.ultimate-workflow/run/calc/journal.md', '# journal\n');
  const planBefore = read(dir, 'PLAN-calc.md').replace('phase: build', 'phase: build\nverify_rounds: 3');
  write(dir, 'PLAN-calc.md', planBefore);
  write(dir, 'why.txt', 'Verification failed 3 times; the subtraction test cannot pass.\nSignature: sub-red');
  const r = json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason-file', 'why.txt'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.branch, 'uw/parked/calc/1');
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head, 'the working branch is back at the last good commit');
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a + b;\n');
  assert.ok(!fs.existsSync(path.join(dir, 'test/sub.test.js')), 'the new test file is gone from the tree');
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow/run/calc/journal.md')), 'the run folder is untouched');
  const files = git(dir, 'show', '--name-only', '--format=', 'uw/parked/calc/1').split('\n');
  assert.deepStrictEqual(files.sort(), ['src/add.js', 'test/sub.test.js', 'why.txt'].sort());
  assert.match(git(dir, 'log', '-1', '--format=%B', 'uw/parked/calc/1'), /sub-red/);
  assert.equal(git(dir, 'rev-parse', 'uw/parked/calc/1^'), head);
  const plan = read(dir, 'PLAN-calc.md');
  assert.match(plan, /verify_rounds: 3/, 'the plan is kept as it was, not reset to its committed version');
  assert.deepStrictEqual(cards.findCard(plan, '1').parked, { branch: 'uw/parked/calc/1', reason: 'Verification failed 3 times, the subtraction test cannot pass. Signature: sub-red' });
  assert.match(read(dir, r.parked), /Signature: sub-red/);
  assert.equal(git(dir, 'status', '--porcelain', '--', 'src', 'test'), '');
});

test('park needs a reason; unpark brings the work back onto the tip and clears the field', () => {
  const dir = repo();
  write(dir, 'src/add.js', 'module.exports = (a, b) => a - b;\n');
  write(dir, 'test/sub.test.js', "require('node:test')('sub', () => {});\n");
  assert.equal(json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc')).ok, false);
  assert.equal(json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'red three times')).ok, true);
  // Another card lands on the tip meanwhile.
  write(dir, 'README.md', '# calc\n');
  git(dir, 'add', 'README.md');
  git(dir, 'commit', '-q', '-m', 'card 3');
  const r = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.testFiles, ['test/sub.test.js']);
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a - b;\n');
  assert.ok(fs.existsSync(path.join(dir, 'README.md')));
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').parked, undefined);
  assert.equal(git(dir, 'diff', '--cached', '--name-only'), '', 'nothing is staged');
});

test('unpark refuses a dirty tree and a work that no longer applies, and leaves the tree as it was', () => {
  const dir = repo();
  write(dir, 'src/add.js', 'module.exports = (a, b) => a - b;\n');
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'red three times'));
  write(dir, 'src/add.js', 'module.exports = (a, b) => a * b;\n');
  const dirty = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(dirty.ok, false);
  assert.match(dirty.reason, /uncommitted changes/);
  git(dir, 'commit', '-q', '-am', 'someone else changed the same line');
  const conflict = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(conflict.ok, false);
  assert.match(conflict.reason, /does not apply/);
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a * b;\n');
  assert.ok(cards.findCard(read(dir, 'PLAN-calc.md'), '1').parked, 'still parked');
});

// --- journal ---------------------------------------------------------------------------------

test('journal add appends a card\'s lines, refuses more than 15, and refuses an empty entry', () => {
  const dir = repo();
  write(dir, 'j1.txt', 'node:test needs the quoted glob\n- parse returns numbers, not strings\n');
  const r = json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', '1', '--from', 'j1.txt', '--status', 'committed'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const text = read(dir, '.ultimate-workflow/run/calc/journal.md');
  assert.match(text, /^## 1 \(committed\) \d{4}-\d\d-\d\dT\d\d:\d\d$/m);
  assert.match(text, /^- node:test needs the quoted glob$/m);
  write(dir, 'long.txt', Array.from({ length: 16 }, (_, i) => `line ${i}`).join('\n'));
  const long = json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', '2', '--from', 'long.txt'));
  assert.equal(long.ok, false);
  assert.match(long.reason, /16 lines.*at most 15/);
  write(dir, 'empty.txt', '\n\n');
  assert.equal(json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', '2', '--from', 'empty.txt')).ok, false);
  assert.doesNotMatch(read(dir, '.ultimate-workflow/run/calc/journal.md'), /line 0|## 2/, 'a refused entry adds nothing');
});

test('past 200 lines the journal names its oldest entries, and compact summarises one without dropping it', () => {
  const dir = repo();
  write(dir, 'j.txt', Array.from({ length: 15 }, (_, i) => `lesson ${i}`).join('\n'));
  let last;
  for (let i = 1; i <= 12; i++) last = json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', `c${i}`, '--from', 'j.txt'));
  assert.equal(last.overLimit, true);
  assert.equal(last.oldest[0], 'c1');
  write(dir, 's.txt', 'c1 found the quoted glob and the CRLF trap\n');
  const c = json(cli(dir, 'journal', 'compact', '--feature', 'calc', '--card', 'c1', '--from', 's.txt'));
  assert.equal(c.ok, true, JSON.stringify(c));
  const text = read(dir, '.ultimate-workflow/run/calc/journal.md');
  assert.match(text, /^## c1 .*\(summarised\)$/m);
  assert.match(text, /^- c1 found the quoted glob/m);
  assert.doesNotMatch(text.split('## c2')[0], /lesson 3/, 'the long entry was replaced');
  assert.match(text, /## c12/);
  write(dir, 'too.txt', 'a\nb\nc\nd\n');
  assert.equal(json(cli(dir, 'journal', 'compact', '--feature', 'calc', '--card', 'c2', '--from', 'too.txt')).ok, false);
});

// --- run branch, card-commit ---------------------------------------------------------------------

test('run-branch creates uw/run/<feature> from the tip, reuses it, and refuses a stale one', () => {
  const dir = repo();
  const r = json(cli(dir, 'run-branch', '--feature', 'calc'));
  assert.equal(r.ok, true);
  assert.equal(r.created, true);
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'uw/run/calc');
  assert.equal(json(cli(dir, 'run-branch', '--feature', 'calc')).created, false);
  git(dir, 'switch', '-q', 'main');
  const stale = json(cli(dir, 'run-branch', '--feature', 'calc'));
  assert.equal(stale.ok, false);
  assert.match(stale.reason, /already exists/);
});

const LANE = JSON.stringify({ ok: true, expertLane: { stage: 'review', selected: [], ran: [], recheck: true, findings: [] } });

test('card-commit refuses off the run branch and without a passing full run, then commits the card and its plan status, nothing else', () => {
  const dir = repo();
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b; // checked\n');
  const off = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(off.ok, false);
  assert.match(off.reason, /only on uw\/run\/calc/);
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  const noRun = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(noRun.ok, false);
  assert.equal(noRun.gate, 'G7');
  const v = spawnSync(process.execPath, [VERIFY, '--full', '--plan', 'PLAN-calc.md'], { cwd: dir, encoding: 'utf8', env });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  const noExperts = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(noExperts.ok, false);
  assert.equal(noExperts.gate, 'G6');
  cli(dir, 'prepare', '--range', 'working');
  write(dir, '.ultimate-workflow/run/lane.json', LANE);
  assert.equal(cli(dir, 'record', '--stage', 'review', '--plan', 'PLAN-calc.md', '--result', '.ultimate-workflow/run/lane.json').status, 0);
  write(dir, 'src/new.js', 'module.exports = 1;\n');
  const moved = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(moved.ok, false, 'a file added after the checks moves the fingerprint');
  fs.rmSync(path.join(dir, 'src/new.js'));
  const r = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--claimed', 'test/add.test.js'));
  assert.equal(r.ok, true, JSON.stringify(r));
  // 2026-11-09: the plan goes into the card's own commit, with the card's status, so the plan on
  // the run branch matches git. A commit cannot hold its own sha: that is written after it.
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['PLAN-calc.md', 'src/add.js']);
  assert.equal(cards.findCard(git(dir, 'show', 'HEAD:PLAN-calc.md'), '1').status, 'committed', 'the committed plan says the card is committed');
  assert.match(git(dir, 'log', '-1', '--format=%B'), /^card 1: adder\n\nPlan: PLAN-calc\.md\nRun: uw\/run\/calc/);
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').committed, r.commit);
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').status, `committed ${r.commit}`, 'and the working plan has its sha, for the next commit');
  assert.deepStrictEqual(r.missingClaims, ['test/add.test.js']);
  assert.ok(fs.existsSync(path.join(dir, r.handoff)));
});

test('ensure-ignored adds .ultimate-workflow/ to .gitignore once, keeping the file\'s line endings', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\r\ndist/');
  assert.equal(json(cli(dir, 'ensure-ignored')).added, true);
  assert.equal(json(cli(dir, 'ensure-ignored')).added, false);
  const text = read(dir, '.gitignore');
  assert.match(text, /^dist\/\r\n# ultimate-workflow.*\r\n\.ultimate-workflow\/\r\n$/m);
});

// --- harvest to a branch (W5) ------------------------------------------------------------------

test('harvest-branch commits each destination file once on uw/harvest/<feature>, without touching the working tree', () => {
  const dir = repo();
  write(dir, 'AGENTS.md', '# Rules\n\n## Gotchas\n\n- Old one.\n\n## Other\n\ntext\n');
  git(dir, 'add', 'AGENTS.md');
  git(dir, 'commit', '-q', '-m', 'agents');
  const head = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b; // wip\n');
  write(dir, '.ultimate-workflow/run/calc/harvest.json', JSON.stringify([
    { destination: 'gotcha', path: 'AGENTS.md', text: '- Beware the quoted glob.', source: 'card 1', rationale: 'hit twice' },
    { destination: 'memory', path: 'memory/parsing.md', text: '# Parsing\n\nHow it works.', source: 'card 2', rationale: 'explains' },
    { destination: 'gotcha', path: 'AGENTS.md', text: '- Note that CRLF matters.', source: 'card 2', rationale: 'r' },
  ]));
  const r = json(cli(dir, 'harvest-branch', '--feature', 'calc', '--from', '.ultimate-workflow/run/calc/harvest.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.branch, 'uw/harvest/calc');
  assert.deepStrictEqual(r.commits.map((c) => [c.file, c.proposals]), [['AGENTS.md', 2], ['memory/parsing.md', 1]]);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head, 'the working branch did not move');
  assert.equal(git(dir, 'rev-parse', 'uw/harvest/calc~2'), head, 'the branch starts at the tip');
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a + b; // wip\n', 'uncommitted work is untouched');
  assert.ok(!fs.existsSync(path.join(dir, 'memory/parsing.md')), 'nothing is written into the working tree');
  const agents = git(dir, 'show', 'uw/harvest/calc:AGENTS.md');
  assert.match(agents, /- Old one\.\n- Beware the quoted glob\.\n- Note that CRLF matters\.\n\n## Other/, 'gotchas go under the Gotchas heading');
  const again = json(cli(dir, 'harvest-branch', '--feature', 'calc', '--from', '.ultimate-workflow/run/calc/harvest.json'));
  assert.equal(again.ok, false);
  assert.match(again.reason, /already exists/);
  write(dir, 'bad.json', JSON.stringify([{ destination: 'gotcha', path: '../out.md', text: 'x' }]));
  assert.equal(json(cli(dir, 'harvest-branch', '--feature', 'other', '--from', 'bad.json')).ok, false);
});

// 2026-11-08, a real run: the harvester named its files by absolute path, and harvest-branch refused
// every proposal, so the lessons never reached the branch.
test('harvest-branch takes an absolute path inside the project as relative, and still refuses one outside it', () => {
  const dir = repo();
  write(dir, 'in.json', JSON.stringify([{ destination: 'gotcha', path: path.join(dir, 'CLAUDE.md'), text: '- Test each guard.' }]));
  const r = json(cli(dir, 'harvest-branch', '--feature', 'abs', '--from', 'in.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.commits.map((c) => c.file), ['CLAUDE.md']);
  assert.match(git(dir, 'show', 'uw/harvest/abs:CLAUDE.md'), /- Test each guard\./);
  write(dir, 'out.json', JSON.stringify([{ destination: 'gotcha', path: path.join(path.dirname(dir), 'elsewhere.md'), text: 'x' }]));
  const out = json(cli(dir, 'harvest-branch', '--feature', 'out', '--from', 'out.json'));
  assert.equal(out.ok, false);
  assert.match(out.reason, /must be relative to the project/);
});

// --- script --phase run (W1) -------------------------------------------------------------------

test('script --phase run writes in every card with its preflight, briefs and skills by name, the base and the commands', () => {
  const dir = repo();
  write(dir, '.ultimate-workflow/run/run.args.json', JSON.stringify({ plan: 'PLAN-calc.md', feature: 'calc' }));
  const r = cli(dir, 'script', '--phase', 'run', '--args-file', '.ultimate-workflow/run/run.args.json');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const text = read(dir, '.ultimate-workflow/run/run.js');
  const embedded = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(text)[1]);
  assert.deepStrictEqual(embedded.cards.map((c) => [c.name, c.preflight.ok]), [['1', true], ['2', true], ['3', false]]);
  assert.match(embedded.cards[2].preflight.reason, /no test-plan section for card 3/);
  assert.deepStrictEqual(embedded.cards[1].depends, ['1']);
  assert.equal(embedded.base, git(dir, 'rev-parse', 'HEAD'));
  assert.match(embedded.cli, /^node ".*\/experts\/experts\.js"$/);
  assert.ok(!embedded.cli.includes(String.fromCharCode(92)), 'no backslash reaches the script');
  assert.match(embedded.verify, /verify\.js" --plan "PLAN-calc\.md"$/);
  assert.equal(embedded.command, 'node --test "test/**/*.test.js"');
  for (const c of embedded.cards) {
    for (const b of c.briefs) for (const s of b.skills) assert.equal(typeof s, 'string', 'skills are names');
    for (const names of Object.values(c.reviewSkills)) for (const n of names) assert.ok(embedded.skillTexts[n], `${n} has its text once in skillTexts`);
  }
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow/run/calc/cards/1/context.md')));
  assert.ok(out.bytes > 0);
  // A resumed run keeps the base the run started from.
  write(dir, 'README.md', '# later\n');
  git(dir, 'add', 'README.md');
  git(dir, 'commit', '-q', '-m', 'later');
  cli(dir, 'script', '--phase', 'run', '--args-file', '.ultimate-workflow/run/run.args.json');
  const again = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(read(dir, '.ultimate-workflow/run/run.js'))[1]);
  assert.equal(again.base, embedded.base);
});

test('script --phase run refuses a plan with no cards and an arguments file with no feature', () => {
  const dir = repo({ plan: PLAN.replace(/## Cards[\s\S]*?## Tests/, '## Tests') });
  write(dir, 'a.json', JSON.stringify({ plan: 'PLAN-calc.md', feature: 'calc' }));
  const r = cli(dir, 'script', '--phase', 'run', '--args-file', 'a.json');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no ## Cards section/);
  write(dir, 'b.json', JSON.stringify({ plan: 'PLAN-calc.md' }));
  assert.match(cli(dir, 'script', '--phase', 'run', '--args-file', 'b.json').stderr, /needs "feature"/);
});

// --- run-start and run-finish: the main conversation's two steps around the one call --------------

test('run-start makes the run branch, commits only the ignore line there, takes a green baseline and builds the script', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  git(dir, 'commit', '-q', '-am', 'no ignore line yet');
  const main = git(dir, 'rev-parse', 'HEAD');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'uw/run/calc');
  assert.equal(git(dir, 'rev-parse', 'main'), main, 'the branch of the user did not move');
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['.gitignore']);
  assert.equal(r.baseline.taken, true);
  assert.equal(r.baseline.failures, 0);
  assert.deepStrictEqual(r.cards, ['1', '2', '3']);
  assert.deepStrictEqual(r.preflightFailed.map((p) => p.card), ['3']);
  assert.ok(fs.existsSync(r.scriptPath));
  assert.equal(JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json')).feature, 'calc');
  const again = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(again.ok, true, 'run again on its own branch, it reuses it');
  assert.equal(again.ignoreCommit, undefined);
});

test('run-start stops with the failing tests when the suite is already red, before any script', () => {
  const dir = repo();
  write(dir, 'test/red.test.js', "require('node:test')('already red', () => { throw new Error('x'); });\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'red');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, false);
  assert.equal(r.needs, 'baseline', JSON.stringify(r));
  assert.ok(r.failing.some((f) => /already red/.test(JSON.stringify(f))), JSON.stringify(r.failing));
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow/run/run.js')));
});

test('run-start --resume-card checks the run branch out again and brings the parked work back', () => {
  const dir = repo();
  json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  write(dir, 'test/sub.test.js', "require('node:test')('sub', () => {});\n");
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'red three times'));
  git(dir, 'switch', '-q', 'main');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc', '--resume-card', '1', '--resume-reason', 'try again'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'uw/run/calc');
  assert.ok(fs.existsSync(path.join(dir, 'test/sub.test.js')));
  const args = JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json'));
  assert.deepStrictEqual(args.resume, { card: '1', reason: 'try again', testFiles: ['test/sub.test.js'] });
});

test('run-finish keeps the output file, writes the report and the ledger row from it, findings as catches', () => {
  const dir = repo();
  const result = {
    ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc', plan: 'PLAN-calc.md', summary: '1 committed, 0 parked, 0 blocked.',
    counts: { committed: 1 }, cards: [{ card: '1', title: 'adder', status: 'committed', commit: 'c1', build: { rounds: 1 }, missingClaims: [], outOfScope: [] }],
    expertLanes: [{ card: '1', lane: { ran: ['quality'], findings: [{ expert: 'quality', file: 'test/a.test.js', line: 2, what: 'assertion never fails', confidence: 'low' }] } }],
    review: { ran: true, range: 'abc..HEAD', findings: [], refuted: [], unverified: [] }, harvest: { ran: true, proposals: 0, branch: null },
  };
  const wrapper = { summary: 's', agentCount: 9, totalTokens: 12345, result: JSON.stringify(result), workflowProgress: [{ type: 'workflow_agent', startedAt: 1000, durationMs: 500 }, { type: 'workflow_agent', startedAt: 1200, durationMs: 1800 }] };
  write(dir, 'out/wf_abc-123.output', JSON.stringify(wrapper));
  const r = json(cli(dir, 'run-finish', '--output', 'out/wf_abc-123.output'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.ledger, { runId: 'wf_abc-123', tokens: 12345, agents: 9, durationMs: 2000, catches: 1 });
  assert.match(read(dir, r.report), /\| 1 \| adder \| committed \| c1 \|/);
  assert.equal(read(dir, '.ultimate-workflow/run/run.result.json'), JSON.stringify(wrapper));
});

test('a card\'s fix round is in the report (row note and its own section) and in the ledger row', () => {
  const dir = repo();
  const fixRound = { round: 2, outcome: 'fixed', summary: 'wrote the b test', findings: [{ expert: 'quality', file: 'test/add.test.js', line: 10, what: 'b guard untested' }] };
  const result = {
    ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc', plan: 'PLAN-calc.md', summary: '1 committed.',
    counts: { committed: 1 }, cards: [{ card: 'add', title: 'adder', status: 'committed', commit: 'c1', build: { rounds: 1 }, fixRound, missingClaims: [], outOfScope: [] }],
    expertLanes: [], review: { ran: true, range: 'abc..HEAD', findings: [], refuted: [], unverified: [] }, harvest: { ran: true, proposals: 0, branch: null },
  };
  write(dir, 'out/wf_fix-1.output', JSON.stringify({ agentCount: 3, totalTokens: 10, result: JSON.stringify(result) }));
  const r = json(cli(dir, 'run-finish', '--output', 'out/wf_fix-1.output'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const report = read(dir, r.report);
  assert.match(report, /\| add \| adder \| committed \| c1 \| 1 round\(s\) and a fix round \(fixed\) \|/);
  assert.match(report, /## Fix rounds\n\n- add: round 2, fixed \(wrote the b test\)\n  - quality: test\/add\.test\.js:10 b guard untested/);
  const rows = read(dir, '.ultimate-workflow/ledger.jsonl').trim().split('\n').map((l) => JSON.parse(l));
  const run = rows.find((x) => x.run);
  assert.deepStrictEqual(run.run.cards[0].fixRound, { round: 2, outcome: 'fixed', findings: ['quality: test/add.test.js:10 b guard untested'] });
});

test('run-finish writes a Run status block into the plan and commits the plan on the run branch', () => {
  const dir = repo();
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '1', '--status', 'committed abc1234'));
  json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '2', '--status', 'parked uw/parked/calc/2; red'));
  json(cli(dir, 'card-status', '--plan', 'PLAN-calc.md', '--card', '3', '--status', 'blocked by 2'));
  const result = { ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc', plan: 'PLAN-calc.md', summary: 's', counts: {}, cards: [], expertLanes: [], review: { ran: false, reason: 'r' }, harvest: { ran: true, proposals: 1, branch: 'uw/harvest/calc', commits: [] } };
  write(dir, 'out/wf_st-1.output', JSON.stringify({ agentCount: 1, totalTokens: 1, result: JSON.stringify(result) }));
  const r = json(cli(dir, 'run-finish', '--output', 'out/wf_st-1.output'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.planStatus.committed, true, JSON.stringify(r.planStatus));
  const committed = git(dir, 'show', 'HEAD:PLAN-calc.md');
  assert.match(committed, /## Run status\n\n- Date: \d{4}-\d{2}-\d{2}\n- Run branch: uw\/run\/calc\n- Cards: 1 committed, 1 parked, 1 blocked\n- Harvest: uw\/harvest\/calc\n- Report: \.ultimate-workflow\/run\/calc\/report\.md/);
  assert.equal(git(dir, 'status', '--porcelain', '--', 'PLAN-calc.md'), '', 'the plan on the run branch matches git');
  json(cli(dir, 'run-finish', '--output', 'out/wf_st-1.output'));
  assert.equal((read(dir, 'PLAN-calc.md').match(/## Run status/g) || []).length, 1, 'a second finish replaces the block');
  // A card with no status line (a plan from before statuses) counts by its committed field.
  write(dir, 'PLAN-calc.md', read(dir, 'PLAN-calc.md').replace('  status: committed abc1234\n', '  committed: abc1234\n'));
  json(cli(dir, 'run-finish', '--output', 'out/wf_st-1.output'));
  assert.match(read(dir, 'PLAN-calc.md'), /- Cards: 1 committed, 1 parked, 1 blocked/);
});

// 2026-11-09, the final live run: the findings card is in `cards` and again as `findingsCard`, and
// "Out of scope and claims" listed it twice.
test('the report lists a findings card once, though the result holds it in cards and as findingsCard', () => {
  const dir = repo();
  const findings = { card: 'findings', title: 'non-blocking expert findings no card fixed', status: 'committed', commit: 'c9', build: { rounds: 1 }, outOfScope: ['test/parse.test.js'], missingClaims: [] };
  const result = { ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc', plan: 'PLAN-calc.md', summary: 's', counts: {}, cards: [findings], findingsCard: findings, expertLanes: [], review: { ran: false, reason: 'r' }, harvest: { ran: false, reason: 'r' } };
  write(dir, 'out/wf_dup-1.output', JSON.stringify({ agentCount: 1, totalTokens: 1, result: JSON.stringify(result) }));
  const r = json(cli(dir, 'run-finish', '--output', 'out/wf_dup-1.output'));
  const text = read(dir, r.report);
  assert.equal((text.match(/- findings: changed outside its paths/g) || []).length, 1);
  assert.equal((text.match(/^\| findings \|/gm) || []).length, 1);
});

test('handoff takes an absolute claimed path inside the project as the same file', () => {
  const dir = repo();
  const base = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'test/parse.test.js', "require('node:test')('p', () => {});\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'p');
  const r = json(cli(dir, 'handoff', '--card', '2', '--feature', 'calc', '--range', `${base}..HEAD`, '--claimed', path.join(dir, 'test', 'parse.test.js')));
  assert.deepStrictEqual(r.missingClaims, []);
});

// --- PLAN-memory-index, card gate: the autopilot and the memory check ------------------------------
// card-commit regenerates a stale index and commits it with the card; it refuses a new broken link or an
// invalid header, not one already there at HEAD. run-start reports what the check finds as warnings.

const memoryLib = require(path.join(PLUGIN, 'lib', 'memory.js'));

const topic = (desc) => `---\ndescription: ${desc}\nread_when:\n  paths:\n    - src/**\n---\n\n# ${desc}\n\nbody\n`;
const AGENTS_OK = '# Rules\n\nSee [memory](memory.md).\n';

// repo() plus a migrated memory (one topical, a current index) and AGENTS.md, committed on main.
function memoryRepo({ agents = AGENTS_OK, extraTopicals = {} } = {}) {
  const dir = repo();
  const topicals = { 'memory/a.md': topic('Topic A.'), ...extraTopicals };
  for (const [file, text] of Object.entries(topicals)) write(dir, file, text);
  write(dir, 'memory.md', memoryLib.renderIndex('# Memory\n', { 'memory/a.md': topicals['memory/a.md'] }));
  write(dir, 'AGENTS.md', agents);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'memory');
  return dir;
}

// The checks card-commit wants before it commits: a passing full run and a review of these changes.
function checked(dir) {
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  const v = spawnSync(process.execPath, [VERIFY, '--full', '--plan', 'PLAN-calc.md'], { cwd: dir, encoding: 'utf8', env });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  cli(dir, 'prepare', '--range', 'working');
  write(dir, '.ultimate-workflow/run/lane.json', LANE);
  assert.equal(cli(dir, 'record', '--stage', 'review', '--plan', 'PLAN-calc.md', '--result', '.ultimate-workflow/run/lane.json').status, 0);
}
const commitCard = (dir) => json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));

test('card-commit on a migrated project whose card changed a topical header commits the regenerated memory.md with the card', () => {
  const dir = memoryRepo();
  write(dir, 'memory/a.md', topic('Topic A, reworded.'));
  checked(dir);
  const r = commitCard(dir);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['PLAN-calc.md', 'memory.md', 'memory/a.md']);
  assert.match(git(dir, 'show', 'HEAD:memory.md'), /Topic A, reworded\./);
  assert.equal(cli(dir, 'memory', 'check').status, 0, 'the committed memory passes its own check');
});

test('card-commit refuses a card that adds a broken link, with the link in the reason, and commits nothing', () => {
  const dir = memoryRepo();
  write(dir, 'AGENTS.md', `${AGENTS_OK}See [gone](gone.md).\n`);
  checked(dir);
  const tip = git(dir, 'rev-parse', 'HEAD');
  const r = commitCard(dir);
  assert.equal(r.ok, false);
  assert.match(r.reason, /AGENTS\.md:4: broken link to gone\.md/);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), tip);
});

test('card-commit refuses a card that makes a header invalid, naming the problem', () => {
  const dir = memoryRepo();
  write(dir, 'memory/a.md', topic('Topic A.').replace('description:', 'colour: blue\ndescription:'));
  checked(dir);
  const r = commitCard(dir);
  assert.equal(r.ok, false);
  assert.match(r.reason, /memory\/a\.md.*invalid header.*colour/);
});

test('card-commit does not refuse for a link already broken at HEAD', () => {
  const dir = memoryRepo({ agents: `${AGENTS_OK}See [old](old.md).\n` });
  write(dir, 'AGENTS.md', `${AGENTS_OK}See [old](old.md).\nA new line.\n`);
  checked(dir);
  const r = commitCard(dir);
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('run-start with a stale index and a broken link returns both as warnings and still starts', () => {
  const dir = memoryRepo({ agents: `${AGENTS_OK}See [gone](gone.md).\n`, extraTopicals: { 'memory/b.md': topic('Topic B.') } });
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const warnings = (r.warnings || []).join('\n');
  assert.match(warnings, /AGENTS\.md:4: broken link to gone\.md/);
  assert.match(warnings, /memory\/b\.md is missing from the index/);
});

test('run-start on a project with healthy memory returns no warnings', () => {
  const dir = memoryRepo();
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.warnings || [], []);
  assert.ok(Array.isArray(r.warnings), 'the field is there, and empty');
});

test('run-start with a malformed memory.md still starts and reports the failure as a warning', () => {
  const dir = memoryRepo();
  write(dir, 'memory.md', '# Memory\n\n<!-- uw:memory-index:start -->\n- [A](memory/a.md)\n');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match((r.warnings || []).join('\n'), /memory check failed.*no "<!-- uw:memory-index:end -->"/);
});

// A harvester may name a file with a leading ./ or with backslashes; the memory.md refusal and the
// topical routing must see the same path the branch would write.
test('harvest-branch routes a backslash path to a new topical with its header, and refuses memory.md however it is spelled', () => {
  const dir = memoryRepo();
  write(dir, 'in.json', JSON.stringify([{ destination: 'memory', path: '.\\memory\\c.md', text: '# C\n\nHow C works.', description: 'Topic C.', paths: ['src/**'] }]));
  const r = json(cli(dir, 'harvest-branch', '--feature', 'bs', '--from', 'in.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match(git(dir, 'show', 'uw/harvest/bs:memory/c.md'), /^---\ndescription: Topic C\./, 'the new topical has a header');
  assert.match(git(dir, 'show', 'uw/harvest/bs:memory.md'), /memory\/c\.md/, 'and is in the regenerated index');
  for (const [i, p] of ['.\\memory.md', './memory.md', 'memory.md'].entries()) {
    write(dir, `idx${i}.json`, JSON.stringify([{ destination: 'memory', path: p, text: 'x' }]));
    const bad = json(cli(dir, 'harvest-branch', '--feature', `idx${i}`, '--from', `idx${i}.json`));
    assert.equal(bad.ok, false, p);
    assert.match(bad.reason, /memory\.md/, p);
  }
});

test('run-report shows the memory warnings run-start found, and no memory section when it found none', () => {
  const result = { ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc1234abcd', summary: '1 committed', counts: { committed: 1 }, cards: [{ card: '1', title: 'first', status: 'committed', commit: 'c1' }], review: { ran: false }, harvest: { ran: false } };
  const report = (dir) => {
    write(dir, 'result.json', JSON.stringify(result));
    const r = json(cli(dir, 'run-report', '--result', 'result.json'));
    assert.equal(r.ok, true, JSON.stringify(r));
    return fs.readFileSync(path.join(dir, r.report), 'utf8');
  };
  const bad = memoryRepo({ agents: `${AGENTS_OK}See [gone](gone.md).\n`, extraTopicals: { 'memory/b.md': topic('Topic B.') } });
  assert.equal(json(cli(bad, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc')).ok, true);
  const shown = report(bad);
  assert.match(shown, /AGENTS\.md:4: broken link to gone\.md/);
  assert.match(shown, /memory\/b\.md is missing from the index/);
  const good = memoryRepo();
  assert.equal(json(cli(good, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc')).ok, true);
  assert.doesNotMatch(report(good), /memory/i);
});

// ---- review findings of 2026-11-11: the same with memory under memory_root ----

// repo() with `memory_root: sub` in the plan and the migrated memory under sub/.
function nestedMemoryRepo({ extraTopicals = {} } = {}) {
  const dir = repo({ plan: PLAN.replace('experts: []\n', 'experts: []\nmemory_root: sub\n').replace('paths: src/add.js, docs/new-guide.md', 'paths: src/add.js, docs/new-guide.md, sub/**') });
  const topicals = { 'memory/a.md': topic('Topic A.'), ...extraTopicals };
  for (const [file, text] of Object.entries(topicals)) write(dir, `sub/${file}`, text);
  write(dir, 'sub/memory.md', memoryLib.renderIndex('# Memory\n', { 'memory/a.md': topicals['memory/a.md'] }));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'memory');
  return dir;
}

test('card-commit with memory_root regenerates the memory.md under that root and commits it with the card', () => {
  const dir = nestedMemoryRepo();
  write(dir, 'sub/memory/a.md', topic('Topic A, reworded.'));
  checked(dir);
  const r = commitCard(dir);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['PLAN-calc.md', 'sub/memory.md', 'sub/memory/a.md']);
  assert.match(git(dir, 'show', 'HEAD:sub/memory.md'), /Topic A, reworded\./);
  assert.ok(!fs.existsSync(path.join(dir, 'memory.md')), 'nothing is written at the project root');
  assert.equal(cli(dir, 'memory', 'check', '--root', 'sub').status, 0, 'the committed memory passes its own check');
});

test('run-start with memory_root checks the memory under that root', () => {
  const dir = nestedMemoryRepo({ extraTopicals: { 'memory/b.md': topic('Topic B.') } });
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match((r.warnings || []).join('\n'), /memory\/b\.md is missing from the index/);
});
