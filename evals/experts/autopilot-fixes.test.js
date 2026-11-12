'use strict';

// PLAN-autopilot.md, W6, W7 and W9: the bugs the homeyos value report and session showed.
//   bug 1: the review's and the experts check's findings never reached the ledger as catches;
//   bug 2: `usage` missed the sessions started in a parent folder of the project;
//   bug 3: plan and harvest readers were counted as "other agents" (the host now frames every
//          workflow prompt, so the patterns anchored at its start never matched);
//   W7: `bash -c '...'` as test_command broke on cmd.exe quoting; an abandoned plan run went unrecorded;
//   W9: the long-conversation reminder at 80k instead of 150k.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const L = require(path.join(PLUGIN, 'experts', 'ledger.js'));
const usage = require(path.join(PLUGIN, 'experts', 'usage.js'));
const verify = require(path.join(PLUGIN, 'hooks', 'verify.js'));
const context = require(path.join(PLUGIN, 'hooks', 'lib', 'context.js'));
const CLI = path.join(PLUGIN, 'experts', 'experts.js');

const made = [];
process.on('exit', () => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});
const tmp = () => {
  const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-fix-')));
  made.push(d);
  return d;
};
const catches = (dir) => L.readAll(dir).filter((e) => e.kind === 'catch');

// --- bug 1 ------------------------------------------------------------------------------------

const review = {
  ok: true,
  findings: [
    { lens: 'correctness', file: 'src/a.ts', line: 4, what: 'returns the stale value after a retry', confidence: 'high' },
    { lens: 'security', file: 'src/b.ts', line: 9, what: 'token written to the log line', confidence: 'high' },
  ],
  unverified: [{ lens: 'simplicity', file: 'src/c.ts', line: 1, what: 'two helpers do the same parse', confidence: 'medium' }],
  refuted: [{ lens: 'correctness', file: 'src/d.ts', line: 2, what: 'refuted one, never a catch', confidence: 'low' }],
  expertLane: { stage: 'review', selected: ['security'], ran: ['security'], findings: [{ expert: 'security', file: 'src/b.ts', line: 9, what: 'token written to the log line', confidence: 'high', status: 'confirmed' }] },
};

test('bug 1: a review run records its confirmed and unverified findings as catches, by lens or expert, once', () => {
  const dir = tmp();
  L.addRun(dir, 'review', { runId: 'wf_r', tokens: 10 }, review);
  const got = catches(dir).map((c) => [c.by, c.stage, c.verdict, c.status]);
  assert.deepStrictEqual(got, [
    ['expert:security', 'review', 'confirmed', 'open'],
    ['lens:correctness', 'review', 'confirmed', 'open'],
    ['lens:simplicity', 'review', 'unverified', 'open'],
  ]);
  assert.match(catches(dir)[1].what, /^src\/a\.ts:4 returns the stale value/);
  L.addRun(dir, 'experts', { runId: 'wf_e', tokens: 5 }, { ok: true, expertLane: review.expertLane });
  assert.equal(catches(dir).length, 3, 'the experts check repeating a finding adds no second catch');
  const rep = L.report(dir);
  assert.equal(rep.catches.byStage.review.total, 3);
  assert.equal(rep.catches.byOrigin['expert:security'], 1);
});

test('bug 1: a run row carries its cards and every card\'s expert findings and the review\'s as catches', () => {
  const dir = tmp();
  const run = {
    ok: true,
    feature: 'f',
    counts: { committed: 1, parked: 1 },
    cards: [{ card: '1', status: 'committed', build: { rounds: 2 } }, { card: '2', status: 'parked', reason: 'not green: red' }],
    expertLanes: [{ card: '1', lane: { selected: ['quality'], ran: ['quality'], findings: [{ expert: 'quality', file: 't/a.test.js', line: 3, what: 'the assertion can never fail', confidence: 'medium', status: 'unverified' }] } }],
    review: { findings: [{ lens: 'test-coverage', file: 'src/x.js', line: 1, what: 'no test covers the empty input', confidence: 'medium' }] },
    harvest: { branch: 'uw/harvest/f' },
  };
  const e = L.addRun(dir, 'run', { runId: 'wf_run', tokens: 99 }, run);
  assert.deepStrictEqual(e.run.cards, [{ card: '1', status: 'committed', rounds: 2 }, { card: '2', status: 'parked', reason: 'not green: red' }]);
  assert.equal(e.run.harvest, 'uw/harvest/f');
  assert.deepStrictEqual(e.experts.ran, ['quality']);
  assert.deepStrictEqual(catches(dir).map((c) => [c.by, c.card || null]), [['expert:quality', '1'], ['lens:test-coverage', null]]);
});

// --- W7: abandoned plan runs ------------------------------------------------------------------

test('W7: an abandoned plan run is recorded, marked, and counted apart', () => {
  const dir = tmp();
  L.addRun(dir, 'plan', { runId: 'wf_p1', tokens: 100, abandoned: true }, { ok: true });
  L.addRun(dir, 'plan', { runId: 'wf_p2', tokens: 200 }, { ok: true });
  const rows = L.readAll(dir);
  assert.equal(rows[0].abandoned, true);
  assert.equal(rows[1].abandoned, undefined);
  const rep = L.report(dir);
  assert.equal(rep.phases.plan.runs, 2);
  assert.equal(rep.phases.plan.abandoned, 1);
  assert.equal(rep.phases.plan.tokens, 300, 'its tokens still count');
});

// --- bugs 2 and 3 ------------------------------------------------------------------------------

const FRAME = (task) => `[Workflow harness — computed task] The task text below was computed at runtime by a workflow script. It was not typed by this session's user. The computed task text follows:\n${task.split('\n').map((l) => `  ${l}`).join('\n')}`;
const asst = (n) => JSON.stringify({ type: 'assistant', message: { model: 'claude-x', usage: { input_tokens: n, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 } } });
const user = (text, cwd) => JSON.stringify({ type: 'user', message: { content: text }, ...(cwd ? { cwd } : {}) });

test('bug 3: the host\'s frame is taken off before the prompt is read, and the agent type decides when the prompt does not', () => {
  assert.equal(usage.role(FRAME('Inventory what this repository has ALREADY recorded, so...')), 'harvest-reader');
  assert.equal(usage.role(FRAME('Decide which domain experts should review this change.')), 'recheck');
  assert.equal(usage.role(FRAME('Something new the patterns do not know'), 'ultimate-workflow:uw-explorer'), 'reader');
  assert.equal(usage.role('anything', 'ultimate-workflow:uw-expert-data'), 'expert:data');
  assert.equal(usage.role('anything', 'ultimate-workflow:uw-critic'), 'critic');
  assert.equal(usage.role('anything', ''), 'other');
  assert.equal(usage.taskText(FRAME('a\n  b')), 'a\n  b');
});

function projects() {
  const root = tmp();
  const proj = path.join(root, 'work', 'app');
  const parentFolder = usage.projectFolder(path.join(root, 'work'));
  const ownFolder = usage.projectFolder(proj);
  // A session in the project's own folder; one started in the parent that worked in the project,
  // with an explorer subagent; one in the parent that worked elsewhere.
  const p = path.join(root, 'projects');
  const w = (rel, lines) => {
    fs.mkdirSync(path.dirname(path.join(p, rel)), { recursive: true });
    fs.writeFileSync(path.join(p, rel), `${lines.join('\n')}\n`);
  };
  w(`${ownFolder}/s1.jsonl`, [user('hi', proj), asst(1000)]);
  w(`${parentFolder}/s2.jsonl`, [user('hi', path.join(proj, 'src')), asst(2000)]);
  w(`${parentFolder}/s2/subagents/workflows/wf_1/agent-a.jsonl`, [user(FRAME('Read the code and report'), proj), asst(300)]);
  fs.writeFileSync(path.join(p, `${parentFolder}/s2/subagents/workflows/wf_1/agent-a.meta.json`), JSON.stringify({ agentType: 'ultimate-workflow:uw-explorer' }));
  w(`${parentFolder}/s3.jsonl`, [user('hi', path.join(root, 'work', 'other')), asst(5000)]);
  return { root, p, proj, ownFolder, parentFolder };
}

test('bug 2: a session started in a parent folder counts when its cwd is inside the project, and not otherwise', () => {
  const { p, proj, ownFolder } = projects();
  const rows = usage.scan({ root: p, inside: proj, exact: ownFolder });
  const s = usage.summarize(rows);
  assert.equal(s.main.tokens, 3000, 's1 and s2, not s3');
  assert.equal(s.agents.tokens, 300);
  assert.equal(s.phases.readers.tokens, 300, 'bug 3: the explorer is a reader, not another agent');
  assert.equal(rows.filter((r) => r.fromParent).length, 2);
  const matched = usage.summarize(usage.scan({ root: p, match: 'work-app', inside: proj }));
  assert.equal(matched.main.tokens, 3000, '--match finds it too');
  assert.equal(usage.summarize(usage.scan({ root: p, match: 'work-app' })).main.tokens, 1000, 'without inside, only the matching folder');
});

test('bug 2: experts.js usage with no --root reads the projects folder and says how many came from a parent folder', () => {
  const { root, proj } = projects();
  const home = path.join(root, 'home');
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.renameSync(path.join(root, 'projects'), path.join(home, '.claude', 'projects'));
  fs.mkdirSync(proj, { recursive: true });
  const r = spawnSync(process.execPath, [CLI, 'usage'], { cwd: proj, encoding: 'utf8', env: { ...process.env, USERPROFILE: home, HOME: home } });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(r.stdout);
  assert.equal(s.main.tokens, 3000);
  assert.equal(s.fromParentFolders, 2);
});

// --- W7: bash -c on Windows -------------------------------------------------------------------

test('W7: on Windows a bash -c test command runs through bash with its script as one argument; test_shell runs any', () => {
  assert.deepStrictEqual(verify.shellFor("bash -c 'npm test && npm run lint'", {}, 'win32'), { file: 'bash', args: ['-c', 'npm test && npm run lint'] });
  assert.deepStrictEqual(verify.shellFor('sh -c "echo \\"hi\\" && exit 0"', {}, 'win32'), { file: 'sh', args: ['-c', 'echo "hi" && exit 0'] });
  assert.equal(verify.shellFor("bash -c 'npm test'", {}, 'linux'), null, 'elsewhere the shell already reads quotes');
  assert.equal(verify.shellFor('npm test', {}, 'win32'), null, 'a plain command runs as before');
  assert.equal(verify.shellFor("bash -c 'a' && b", {}, 'win32'), null, 'only a command that is exactly bash -c <script>');
  assert.deepStrictEqual(verify.shellFor('make test', { test_shell: 'bash' }, 'win32'), { file: 'bash', args: ['-c', 'make test'] });
  assert.throws(() => verify.shellFor('x', { test_shell: 'bash; rm -rf' }, 'win32'), /not a program/);
});

test('W7: a bash -c test command passes through verify.js for real when bash is on the PATH', { skip: spawnSync('bash', ['-c', 'exit 0']).status !== 0 && 'no bash on this machine' }, () => {
  const dir = tmp();
  spawnSync('git', ['init', '-q'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), "---\nplan_confirmed: true\ntests_confirmed: true\ntest_command: bash -c 'echo one && echo two'\n---\n# PLAN: x\n");
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'verify.js'), '--full', '--plan', 'PLAN-x.md'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'verify.log'), 'utf8'), /one\r?\ntwo/);
});

// --- W9 ----------------------------------------------------------------------------------------

test('W9: the long-conversation reminder defaults to 80k tokens, and the variable still sets it', () => {
  assert.equal(context.DEFAULT_THRESHOLD, 80000);
  assert.equal(context.threshold({}), 80000);
  assert.equal(context.threshold({ ULTIMATE_WORKFLOW_CONTEXT_REMINDER: '150000' }), 150000);
  assert.deepStrictEqual(context.decide({ tokens: 90000, threshold: context.threshold({}), lastBand: 0 }), { band: 1, remind: true });
});

// --- gate-card (PLAN-run-fixes.md, criterion 3): G6 judges the card being committed ----------------
// Cards A (quality) and B (security) share src/shared/s.js; C (genai) is apart; D has `experts: none`.

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));
const GATE_FIVE = ['quality', 'security', 'genai', 'developer', 'architect'];
const gatePlan = (accepted = '') => `---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: [${GATE_FIVE.join(', ')}]
---

# PLAN: gate

## Cards

- A: first
  paths: src/a/**, src/shared/s.js
  experts: quality
${accepted}- B: second
  paths: src/b/**, src/shared/s.js
  experts: security
- C: third
  paths: src/c/**
  experts: genai
- D: nobody
  paths: src/d/**
  experts: none
`;
const gateConfirmed = (text) => expertsLib.setFrontLine(text, 'confirmed_hash', expertsLib.confirmHash(text));

function gateRepo(plan = gatePlan()) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  for (const f of ['src/a/a.js', 'src/b/b.js', 'src/c/c.js', 'src/d/d.js', 'src/shared/s.js']) put(f, 'module.exports = 0;\n');
  put('test/ok.test.js', "require('node:test')('ok', () => {});\n");
  put('PLAN-gate.md', gateConfirmed(plan));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return { dir, put, plan: path.join(dir, 'PLAN-gate.md') };
}

// The experts check as the run records it: these experts reviewed these exact changes.
function reviewedBy(g, selected, added = []) {
  expertsLib.prepare(g.dir, 'working', PLUGIN, {});
  const lane = { stage: 'review', selected, ran: selected, added, recheck: true, findings: [] };
  expertsLib.record(g.dir, 'review', { ok: true, expertLane: lane }, { planFile: g.plan, pluginRoot: PLUGIN });
}
const evidence = (g, card) => expertsLib.commitEvidence(g.dir, g.plan, PLUGIN, card === undefined ? undefined : { card });
const required = (g, card) => [...evidence(g, card).planExperts].sort();
const touch = (g, ...files) => files.forEach((f) => g.put(f, `module.exports = '${f}';\n`));
const gateEnv = () => {
  const e = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const gateCli = (g, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd: g.dir, encoding: 'utf8', env: gateEnv() });
const lastJson = (r) => JSON.parse(r.stdout.trim().split(/\r?\n/).pop());
const addFixup = (g, paths, experts) => {
  const r = lastJson(gateCli(g, 'card-add', '--plan', 'PLAN-gate.md', '--name', 'fixup', '--title', 'fix', '--paths', paths, '--experts', experts));
  assert.equal(r.ok, true, JSON.stringify(r));
};

test('gate-card 9: card-commit --card A on the shared file needs only A\'s experts, and commits', () => {
  const g = gateRepo();
  assert.equal(lastJson(gateCli(g, 'run-branch', '--feature', 'gate')).ok, true);
  touch(g, 'src/shared/s.js');
  const v = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'verify.js'), '--full', '--plan', 'PLAN-gate.md'], { cwd: g.dir, encoding: 'utf8', env: gateEnv() });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  reviewedBy(g, ['quality']);
  const r = lastJson(gateCli(g, 'card-commit', '--plan', 'PLAN-gate.md', '--card', 'A', '--feature', 'gate'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(git(g.dir, 'show', '--name-only', '--format=', 'HEAD').split('\n').includes('src/shared/s.js'));
});

test('gate-card 10: a hand commit, no card named, still needs both experts of the shared file', () => {
  const g = gateRepo();
  touch(g, 'src/shared/s.js');
  reviewedBy(g, ['quality']);
  const ev = evidence(g);
  assert.deepStrictEqual(ev.planExperts.filter((n) => !ev.recheck.final.includes(n)), ['security']);
  assert.equal(gates.commitGate(ev).allow, false);
});

test('gate-card 11: a card named but the diff not wholly its own falls back to the union of the covering cards', () => {
  const table = [
    { name: 'a: one file under C', card: 'A', files: ['src/a/a.js', 'src/c/c.js'], want: ['genai', 'quality'] },
    { name: 'a: shared file and a file under C', card: 'A', files: ['src/shared/s.js', 'src/c/c.js'], want: ['genai', 'quality', 'security'] },
    { name: 'b: a card the plan does not have', card: 'nosuch', files: ['src/a/a.js', 'src/b/b.js'], want: ['quality', 'security'] },
  ];
  for (const t of table) {
    const g = gateRepo();
    touch(g, ...t.files);
    assert.deepStrictEqual(required(g, t.card), t.want, t.name);
  }
});

test('gate-card 12: a fixup card with experts: [] on a file under a security card still needs security', () => {
  const g = gateRepo();
  addFixup(g, 'src/shared/s.js', 'none');
  touch(g, 'src/shared/s.js');
  reviewedBy(g, ['quality']);
  const ev = evidence(g, 'fixup');
  assert.ok(ev.planExperts.includes('security'), `required: ${ev.planExperts}`);
  const verdict = gates.commitGate(ev);
  assert.equal(verdict.allow, false);
  assert.match(verdict.reason, /security/);
});

test('gate-card 13 and 14: a run-added card is judged by its lane, never below the confirmed cards it shares a file with, never the plan line', () => {
  const own = gateRepo();
  addFixup(own, 'src/a/a.js', 'quality');
  touch(own, 'src/a/a.js');
  assert.deepStrictEqual(required(own, 'fixup'), ['quality'], '13');

  const shared = gateRepo();
  addFixup(shared, 'src/shared/s.js', 'quality');
  touch(shared, 'src/shared/s.js');
  assert.deepStrictEqual(required(shared, 'fixup'), ['quality', 'security'], '14');
});

test('gate-card 15: a plan card with experts: none asks for nobody, not for an expert called none', () => {
  const g = gateRepo();
  touch(g, 'src/d/d.js');
  assert.deepStrictEqual(required(g, 'D'), []);
});

test('gate-card 16: experts the recheck added for the named card are also required', () => {
  const g = gateRepo();
  touch(g, 'src/a/a.js');
  reviewedBy(g, ['quality', 'genai'], ['genai']);
  assert.deepStrictEqual(required(g, 'A'), ['genai', 'quality']);
});

test('gate-card 17: a file accepted for card A is judged by A\'s experts, and the accepted line does not change the confirmed hash', () => {
  const accepted = '  accepted: src/out/o.js\n';
  assert.equal(expertsLib.confirmHash(gatePlan(accepted)), expertsLib.confirmHash(gatePlan()), 'accepted: is a run field, left out of the hash');
  const g = gateRepo(gatePlan(accepted));
  touch(g, 'src/out/o.js');
  assert.deepStrictEqual(required(g, 'A'), ['quality']);
});

// --- card-add (PLAN-run-fixes.md, card card-add, tests 22 to 26 and 29) ---------------------------

const cardsLib = require(path.join(PLUGIN, 'experts', 'cards.js'));

// A flat list of cards, then `### Card` subsections that hold detail bullets which are not cards.
const subPlan = ({ extra = '', experts = `[${GATE_FIVE.join(', ')}]` } = {}) => `---
phase: build
plan_confirmed: true
tests_confirmed: true
${experts === null ? '' : `experts: ${experts}\n`}---

# PLAN: sub

## Cards

- A: first
  paths: src/a/**
  experts: quality
- B: second
  paths: src/b/**
  experts: security
${extra}
### Card A

- Rounds: 3
  paths: not a card

### Card B

- Rounds: 2

## Tests

- check it
`;
const FIXUP_TITLE = 'confirmed review findings';
const oldFixup = (name, carried, done = false) => `- ${name}: ${FIXUP_TITLE}\n  paths: src/a/a.js\n  carried: ${carried}\n${done ? '  committed: abc1234\n  status: committed abc1234\n' : ''}`;
const cardAddJson = (g, ...a) => {
  const r = gateCli(g, 'card-add', '--plan', 'PLAN-gate.md', ...a);
  const lines = r.stdout.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `card-add must print one JSON line; stdout: ${r.stdout} stderr: ${r.stderr}`);
  return JSON.parse(lines[0]);
};
const freeAdd = (g, carried = 'src/a/a.js:1: x') => cardAddJson(g, '--free-name', '--name', 'fixup', '--title', FIXUP_TITLE, '--paths', 'src/a/a.js', '--carried', carried);
const cardNames = (g) => cardsLib.parseCards(fs.readFileSync(g.plan, 'utf8')).map((c) => c.name);

test('card-add 22: a card added to a list followed by ### Card subsections lands inside the list and keeps confirmHash', () => {
  const g = gateRepo(subPlan());
  const before = expertsLib.confirmHash(fs.readFileSync(g.plan, 'utf8'));
  const r = cardAddJson(g, '--name', 'fixup', '--title', FIXUP_TITLE, '--paths', 'src/a/a.js');
  assert.equal(r.ok, true, JSON.stringify(r));
  const text = fs.readFileSync(g.plan, 'utf8');
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => /^- fixup:/.test(l));
  assert.ok(at > lines.findIndex((l) => /^- B:/.test(l)) && at < lines.findIndex((l) => /^### /.test(l)), 'after the last list item, before the first ### heading');
  assert.equal(expertsLib.confirmHash(text), before);
});

test('card-add 23: parseCards on a plan with ### Card subsections returns only the list items, before and after an add', () => {
  const g = gateRepo(subPlan());
  assert.deepStrictEqual(cardNames(g), ['A', 'B']);
  cardAddJson(g, '--name', 'fixup', '--title', FIXUP_TITLE, '--paths', 'src/a/a.js');
  assert.deepStrictEqual(cardNames(g), ['A', 'B', 'fixup']);
});

test('card-add 24: --free-name with fixup taken adds fixup-2, prints it, and the hash still holds', () => {
  const g = gateRepo(subPlan({ extra: oldFixup('fixup', 'an older finding') }));
  const before = expertsLib.confirmHash(fs.readFileSync(g.plan, 'utf8'));
  const r = freeAdd(g);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.card.name, 'fixup-2');
  assert.deepStrictEqual(cardNames(g), ['A', 'B', 'fixup', 'fixup-2']);
  assert.equal(expertsLib.confirmHash(fs.readFileSync(g.plan, 'utf8')), before);
});

test('card-add 25: --free-name with fixup and fixup-2 taken adds fixup-3', () => {
  const g = gateRepo(subPlan({ extra: oldFixup('fixup', 'first') + oldFixup('fixup-2', 'second') }));
  const r = freeAdd(g);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.card.name, 'fixup-3');
});

test('card-add 26: --free-name reuses a card only when it is uncommitted with the same title and the same carried text', () => {
  const same = 'src/a/a.js:1: x';
  const table = [
    { name: 'a: the same call twice', extra: '', calls: 2, names: ['fixup', 'fixup'], added: 1 },
    { name: 'b: uncommitted fixup with other carried text', extra: oldFixup('fixup', 'something else'), calls: 1, names: ['fixup-2'], added: 1 },
    { name: 'c: committed fixup with the same carried text', extra: oldFixup('fixup', same, true), calls: 1, names: ['fixup-2'], added: 1 },
  ];
  for (const t of table) {
    const g = gateRepo(subPlan({ extra: t.extra }));
    const count = cardNames(g).length;
    const names = [];
    for (let i = 0; i < t.calls; i++) {
      const r = freeAdd(g, same);
      assert.equal(r.ok, true, `${t.name}: ${JSON.stringify(r)}`);
      names.push(r.card.name);
    }
    assert.deepStrictEqual(names, t.names, t.name);
    assert.equal(cardNames(g).length, count + t.added, t.name);
  }
});

test('card-add 29: a refused card-add prints one JSON line with its own reason', () => {
  const table = [
    { name: 'a taken name', plan: subPlan({ extra: oldFixup('fixup', 'x') }), args: [], reason: /already in the plan/ },
    { name: 'no experts line', plan: subPlan({ experts: null }), args: ['--experts', 'quality'], reason: /records no experts/ },
    { name: 'an unknown expert', plan: subPlan(), args: ['--experts', 'nosuchexpert'], reason: /unknown expert/ },
    { name: 'an expert outside the plan line', plan: subPlan({ experts: '[quality]' }), args: ['--experts', 'security'], reason: /not in the plan's experts/ },
  ];
  for (const t of table) {
    const g = gateRepo(t.plan);
    const r = cardAddJson(g, '--name', 'fixup', '--title', FIXUP_TITLE, '--paths', 'src/a/a.js', ...t.args);
    assert.equal(r.ok, false, t.name);
    assert.match(r.reason, t.reason, t.name);
  }
});
