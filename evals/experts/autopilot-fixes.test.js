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

test('gate-card 18: a card-commit whose diff holds only test files is still judged by the card\'s own experts', () => {
  const g = gateRepo();
  touch(g, 'test/ok.test.js');
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
    // The name family: a card called fixup-2 is reused, so no fixup-3 is added beside it.
    { name: 'd: uncommitted fixup-2 with the same carried text', extra: oldFixup('fixup', 'x', true) + oldFixup('fixup-2', same), calls: 1, names: ['fixup-2'], added: 0 },
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

// --- settle-first (PLAN-run-fixes.md, card settle-first): run-state reads and records run.json ------

const runFileOf = (g) => path.join(g.dir, '.ultimate-workflow', 'run', 'f', 'run.json');
const writeRunFile = (g) => {
  fs.mkdirSync(path.dirname(runFileOf(g)), { recursive: true });
  fs.writeFileSync(runFileOf(g), `${JSON.stringify({ base: 'abc123456789', plan: 'PLAN-gate.md', feature: 'f', at: 'then' }, null, 2)}\n`);
};
const readRunFile = (g) => JSON.parse(fs.readFileSync(runFileOf(g), 'utf8'));
const runState = (g, ...a) => {
  const r = gateCli(g, 'run-state', '--feature', 'f', ...a);
  assert.ok(r.stdout.trim(), `run-state printed no JSON line; stderr: ${r.stderr}`);
  return lastJson(r);
};
const headOf = (g) => git(g.dir, 'rev-parse', 'HEAD');
const commitLater = (g) => {
  touch(g, 'src/a/a.js');
  git(g.dir, 'commit', '-q', '-am', 'later');
};

test('settle-first 51: run-state reads the HEAD and what run.json recorded; a run with nothing recorded has empty fields', () => {
  const g = gateRepo();
  writeRunFile(g);
  const r = runState(g);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.head.length >= 12 && headOf(g).startsWith(r.head), r.head);
  assert.equal(r.reviewedHead, '');
  assert.equal(r.harvestBranch, '');
  assert.equal(readRunFile(g).base, 'abc123456789', 'reading changes nothing');
  assert.equal(readRunFile(g).reviewedHead, undefined);
});

test('settle-first 52: --record stores the HEAD the review covered next to base, and a new commit makes head differ from it', () => {
  const g = gateRepo();
  writeRunFile(g);
  const rec = runState(g, '--record');
  assert.equal(rec.ok, true, JSON.stringify(rec));
  const file = readRunFile(g);
  assert.equal(file.base, 'abc123456789', 'base is kept');
  assert.equal(file.feature, 'f');
  assert.ok(file.reviewedHead.length >= 12 && headOf(g).startsWith(file.reviewedHead), JSON.stringify(file));
  const same = runState(g);
  assert.equal(same.head, same.reviewedHead);
  commitLater(g);
  const after = runState(g);
  assert.notEqual(after.head, after.reviewedHead);
  assert.equal(after.reviewedHead, file.reviewedHead);
});

test('settle-first 53: --harvest-branch is recorded, and a later --record without it keeps it', () => {
  const g = gateRepo();
  writeRunFile(g);
  runState(g, '--record', '--harvest-branch', 'uw/harvest/f');
  assert.equal(runState(g).harvestBranch, 'uw/harvest/f');
  commitLater(g);
  runState(g, '--record');
  const r = runState(g);
  assert.equal(r.harvestBranch, 'uw/harvest/f');
  assert.equal(r.head, r.reviewedHead, 'the recorded head moved to the new HEAD');
  assert.equal(readRunFile(g).base, 'abc123456789');
});

test('settle-first 55: --findings stores the findings no card fixed in run.json, run-state reads them back, and an empty list clears them', () => {
  const g = gateRepo();
  writeRunFile(g);
  assert.deepStrictEqual(runState(g).pendingFindings, []);
  const file = path.join(g.dir, 'findings.json');
  const kept = [{ file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low' }];
  fs.writeFileSync(file, JSON.stringify(kept));
  const set = runState(g, '--findings', file);
  assert.equal(set.ok, true, JSON.stringify(set));
  assert.deepStrictEqual(runState(g).pendingFindings, kept);
  assert.equal(readRunFile(g).base, 'abc123456789', 'base is kept');
  assert.equal(readRunFile(g).reviewedHead, undefined, 'storing findings records no review');
  runState(g, '--record');
  assert.deepStrictEqual(runState(g).pendingFindings, kept, 'a record keeps them');
  fs.writeFileSync(file, '[]');
  runState(g, '--findings', file);
  assert.deepStrictEqual(runState(g).pendingFindings, []);
});

test('settle-first 54:run-state without a feature is refused with one JSON line', () => {
  const g = gateRepo();
  const r = gateCli(g, 'run-state');
  const lines = r.stdout.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `stdout: ${r.stdout} stderr: ${r.stderr}`);
  assert.equal(JSON.parse(lines[0]).ok, false);
});

test('settle-first 56: --record --review and --record --harvest move one head each; --record alone moves both', () => {
  const g = gateRepo();
  writeRunFile(g);
  const first = headOf(g);
  const rev = runState(g, '--record', '--review');
  assert.ok(first.startsWith(rev.reviewedHead) && rev.reviewedHead.length >= 12, JSON.stringify(rev));
  assert.equal(rev.harvestedHead, '', 'the harvest is not on record');
  assert.equal(readRunFile(g).harvestedHead, undefined);
  commitLater(g);
  const har = runState(g, '--record', '--harvest', '--harvest-branch', 'uw/harvest/f');
  assert.ok(headOf(g).startsWith(har.harvestedHead) && har.harvestedHead.length >= 12, JSON.stringify(har));
  assert.ok(first.startsWith(har.reviewedHead), 'the review head stays where the review left it');
  assert.notEqual(har.reviewedHead, har.harvestedHead);
  assert.equal(har.harvestBranch, 'uw/harvest/f');
  g.put('src/a/a.js', 'module.exports = 2;\n');
  git(g.dir, 'commit', '-q', '-am', 'later still');
  const both = runState(g, '--record');
  assert.equal(both.reviewedHead, both.head);
  assert.equal(both.harvestedHead, both.head);
  const read = runState(g);
  assert.equal(read.harvestedHead, read.head);
});

// --- harvest-name (PLAN-run-fixes.md, card harvest-name, tests 51, 52 and 54) -----------------------

const harvest = (g, proposals = [{ destination: 'gotcha', path: 'AGENTS.md', text: '- Beware x.', source: 'card 1', rationale: 'r' }]) => {
  g.put('.ultimate-workflow/run/f/harvest.json', JSON.stringify(proposals));
  const r = gateCli(g, 'harvest-branch', '--feature', 'f', '--from', '.ultimate-workflow/run/f/harvest.json');
  assert.ok(r.stdout.trim(), `harvest-branch printed no JSON line; stderr: ${r.stderr}`);
  return lastJson(r);
};
const branchesOf = (g) => git(g.dir, 'branch', '--list', 'uw/harvest/*', '--format=%(refname:short)').split(/\r?\n/).filter(Boolean).sort();

test('harvest-name 51: with uw/harvest/<f> taken, harvest makes <f>-2 and returns ok: true', () => {
  const g = gateRepo();
  const first = harvest(g);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.branch, 'uw/harvest/f');
  const second = harvest(g);
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(second.branch, 'uw/harvest/f-2');
  assert.deepStrictEqual(branchesOf(g), ['uw/harvest/f', 'uw/harvest/f-2']);
  assert.match(git(g.dir, 'show', 'uw/harvest/f-2:AGENTS.md'), /Beware x/, 'the second branch holds the proposals');
});

test('harvest-name 52: with <f> and <f>-2 taken, harvest makes <f>-3', () => {
  const g = gateRepo();
  git(g.dir, 'branch', 'uw/harvest/f');
  git(g.dir, 'branch', 'uw/harvest/f-2');
  const third = harvest(g);
  assert.equal(third.ok, true, JSON.stringify(third));
  assert.equal(third.branch, 'uw/harvest/f-3');
  assert.deepStrictEqual(branchesOf(g), ['uw/harvest/f', 'uw/harvest/f-2', 'uw/harvest/f-3']);
});

test('harvest-name 53b: run-state lists the open harvest branches of this feature only', () => {
  const g = gateRepo();
  writeRunFile(g);
  assert.deepStrictEqual(runState(g).openHarvests, []);
  for (const b of ['uw/harvest/f', 'uw/harvest/f-2', 'uw/harvest/fother', 'uw/harvest/g']) git(g.dir, 'branch', b);
  assert.deepStrictEqual(runState(g).openHarvests, ['uw/harvest/f', 'uw/harvest/f-2']);
});

test('harvest-name 54: the memory.md merge-conflict note is still given, on a second harvest branch too', () => {
  const g = gateRepo();
  g.put('memory.md', '# Memory\n');
  git(g.dir, 'add', '-A');
  git(g.dir, 'commit', '-q', '-m', 'memory');
  const topical = (name) => [{ destination: 'memory', path: `memory/${name}.md`, text: `# ${name}\n\nHow it works.`, description: `How ${name} works.`, paths: [`lib/${name}.js`], keywords: [name], source: 'card 1', rationale: 'r' }];
  for (const [name, branch] of [['parsing', 'uw/harvest/f'], ['hooks', 'uw/harvest/f-2']]) {
    const r = harvest(g, topical(name));
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.branch, branch);
    assert.match(git(g.dir, 'log', '-1', '--format=%B', branch), /conflicts in memory\.md, take either side/, branch);
  }
});

// --- reasons (PLAN-run-fixes.md, card reasons, tests 55 to 57 and 59) ------------------------------

const runRulesLib = require(path.join(PLUGIN, 'lib', 'run-rules.js'));
const longReason = () => Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
const parkWith = (g, card, reason) => {
  g.put('why.txt', reason);
  const r = lastJson(gateCli(g, 'park', '--plan', 'PLAN-gate.md', '--card', card, '--feature', 'f', '--reason-file', 'why.txt'));
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
};
const planLines = (g, key) => fs.readFileSync(g.plan, 'utf8').split(/\r?\n/).filter((l) => new RegExp(`^\\s+${key}: `).test(l));
const reportFor = (g, cardsOut) => {
  g.put('.ultimate-workflow/run/f/result.json', JSON.stringify({ ok: true, feature: 'f', branch: 'uw/run/f', base: 'abc', plan: 'PLAN-gate.md', cards: cardsOut, counts: {}, review: { ran: false, reason: 'x' }, harvest: { ran: false, reason: 'x' } }));
  const r = lastJson(gateCli(g, 'run-report', '--result', '.ultimate-workflow/run/f/result.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  return fs.readFileSync(path.join(g.dir, '.ultimate-workflow', 'run', 'f', 'report.md'), 'utf8');
};

test('reasons 55 and 56: a 5000-character park reason is whole and on one line in report.md, and newlines are joined', () => {
  const g = gateRepo();
  const whole = longReason();
  assert.ok(whole.length > 5000 && !whole.includes('\n'));
  const withNewlines = 'first line\nsecond line\n\nfourth line';
  const report = reportFor(g, [
    { card: 'A', title: 'first', status: 'parked', branch: 'uw/parked/f/A', reason: whole },
    { card: 'B', title: 'second', status: 'parked', branch: 'uw/parked/f/B', reason: withNewlines },
  ]);
  const rowA = report.split(/\r?\n/).find((l) => l.startsWith('| A |'));
  assert.ok(rowA.includes(whole), 'the whole reason is in the card row, on one line');
  const rowB = report.split(/\r?\n/).find((l) => l.startsWith('| B |'));
  assert.ok(rowB.includes('first line second line fourth line'), rowB);
});

test('reasons 57: park writes status: and parked: lines cut at a word end that name parked.md, and parked.md holds the whole reason', () => {
  const table = [
    { name: 'the cap inside a word', reason: longReason() },
    { name: 'no whitespace', reason: 'x'.repeat(600) },
    { name: 'short', reason: 'not green: the sum is wrong, twice over, in src/a/a.js' },
    { name: 'a non-BMP character at the cap', reason: `${'a'.repeat(239)}${String.fromCodePoint(0x1f600)} and more text ${'b'.repeat(300)}` },
  ];
  for (const row of table) {
    const g = gateRepo();
    touch(g, 'src/a/a.js');
    const parked = parkWith(g, 'A', row.reason);
    const file = path.join(g.dir, parked.parked);
    assert.ok(fs.readFileSync(file, 'utf8').includes(row.reason), `${row.name}: parked.md holds the whole reason`);
    const want = runRulesLib.shortReason(row.reason, `whole text: ${parked.parked}`);
    for (const key of ['status', 'parked']) {
      const lines = planLines(g, key).filter((l) => l.includes('uw/parked/f/A'));
      assert.equal(lines.length, 1, `${row.name}: one ${key} line`);
      assert.ok(lines[0].endsWith(`uw/parked/f/A; ${want}`), `${row.name}: ${key} line is "${lines[0].slice(0, 120)}..."`);
      assert.ok(lines[0].includes(parked.parked), `${row.name}: ${key} names parked.md`);
      assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(lines[0]), `${row.name}: no lone surrogate`);
    }
    if (row.name === 'short') assert.ok(planLines(g, 'status').some((l) => l.includes(`; ${row.reason} (whole text:`)), 'nothing cut from a short reason');
  }
});

test('reasons 59: unpark on a real 3-way conflict names the file in conflict', () => {
  const g = gateRepo();
  // Two files: the first applies cleanly, so git's first line is about it; the second is the conflict.
  g.put('src/a/a.js', 'module.exports = 1; // from the card\n');
  g.put('src/b/b.js', 'module.exports = 1; // from the card\n');
  parkWith(g, 'A', 'not green: red three times');
  g.put('src/b/b.js', 'module.exports = 2; // on the tip\n');
  git(g.dir, 'commit', '-q', '-am', 'the tip moved on the same line');
  const r = spawnSync(process.execPath, [CLI, 'unpark', '--plan', 'PLAN-gate.md', '--card', 'A', '--feature', 'f'], { cwd: g.dir, encoding: 'utf8', env: { ...gateEnv(), LC_ALL: 'C', LANG: 'C' } });
  const out = lastJson(r);
  assert.equal(out.ok, false, JSON.stringify(out));
  assert.match(out.reason, /does not apply on the current tip/);
  assert.ok(out.reason.includes('conflict in src/b/b.js'), out.reason);
  assert.ok(!out.reason.includes('src/a/a.js'), `the file that applied cleanly is not named: ${out.reason}`);
  assert.equal(git(g.dir, 'status', '--porcelain'), '', 'the tree is left as it was');
});

// --- one-notice (PLAN-run-fixes.md, card one-notice, tests 61 and 62) -------------------------------

const autopilotLib = require(path.join(PLUGIN, 'experts', 'autopilot.js'));
const noticesOf = (g) => fs.readFileSync(path.join(g.dir, '.ultimate-workflow', 'run', 'f', 'notifications.jsonl'), 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));

test('one-notice 61a: with notifications off, every kind except finished is file-only and finished is off', () => {
  const g = gateRepo();
  assert.ok(Array.isArray(autopilotLib.NOTIFY_KINDS) && autopilotLib.NOTIFY_KINDS.includes('finished'), 'NOTIFY_KINDS is exported');
  for (const kind of autopilotLib.NOTIFY_KINDS) {
    const r = lastJson(gateCli(g, 'notify', '--feature', 'f', '--kind', kind, '--reason', `a ${kind} notice`));
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.desktop, kind === 'finished' ? 'off' : 'file-only', kind);
  }
  const byKind = Object.fromEntries(noticesOf(g).map((n) => [n.kind, n.desktop]));
  for (const kind of autopilotLib.NOTIFY_KINDS) assert.equal(byKind[kind], kind === 'finished' ? 'off' : 'file-only', kind);
});

test('one-notice 61b: with notifications on, the desktop notifier is called once across every kind, for finished', () => {
  const g = gateRepo();
  const saved = process.env.ULTIMATE_WORKFLOW_NOTIFY;
  delete process.env.ULTIMATE_WORKFLOW_NOTIFY;
  const seen = [];
  // A counting stand-in passed as an option: it never shells out, so no real toast is fired.
  const counter = (title, body) => { seen.push({ title, body }); return 'sent'; };
  try {
    for (const kind of autopilotLib.NOTIFY_KINDS) {
      const r = autopilotLib.notify(g.dir, { feature: 'f', kind, reason: `a ${kind} notice`, desktop: counter });
      assert.equal(r.desktop, kind === 'finished' ? 'sent' : 'file-only', kind);
    }
  } finally {
    if (saved === undefined) delete process.env.ULTIMATE_WORKFLOW_NOTIFY;
    else process.env.ULTIMATE_WORKFLOW_NOTIFY = saved;
  }
  assert.equal(seen.length, 1, JSON.stringify(seen));
  assert.match(seen[0].title, /run finished/);
});

test('one-notice 62: notifications.md and notifications.jsonl still hold every notice', () => {
  const g = gateRepo();
  for (const kind of autopilotLib.NOTIFY_KINDS) gateCli(g, 'notify', '--feature', 'f', '--kind', kind, '--reason', `a ${kind} notice`);
  const md = fs.readFileSync(path.join(g.dir, '.ultimate-workflow', 'run', 'f', 'notifications.md'), 'utf8').trim().split(/\r?\n/);
  assert.equal(md.length, autopilotLib.NOTIFY_KINDS.length);
  assert.equal(noticesOf(g).length, autopilotLib.NOTIFY_KINDS.length);
  for (const kind of autopilotLib.NOTIFY_KINDS) {
    assert.equal(md.filter((l) => l.includes(`**${kind}**`) && l.includes(`a ${kind} notice`)).length, 1, kind);
    assert.equal(noticesOf(g).filter((n) => n.kind === kind).length, 1, kind);
  }
});

// --- report-cost (PLAN-run-fixes.md, card report-cost, tests 73 to 78) ------------------------------

// The Workflow output file as the host writes it: the phase result under `result`, one entry per agent
// under `workflowProgress`, and the run's total.
const agentOf = (label, tokens, usage) => ({ type: 'workflow_agent', label, ...(tokens === undefined ? {} : { tokens }), ...(usage ? { usage } : {}) });
const costReport = (g, cardsOut, agents, totalTokens) => {
  const result = { ok: true, feature: 'f', branch: 'uw/run/f', base: 'abc', plan: 'PLAN-gate.md', cards: cardsOut, counts: {}, review: { ran: false, reason: 'x' }, harvest: { ran: false, reason: 'x' } };
  g.put('.ultimate-workflow/run/f/output.json', JSON.stringify({ summary: 's', result, workflowProgress: [{ type: 'workflow_phase', index: 1, title: 'Cards' }, ...agents], ...(totalTokens === undefined ? {} : { totalTokens }) }));
  const r = lastJson(gateCli(g, 'run-report', '--result', '.ultimate-workflow/run/f/output.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  return fs.readFileSync(path.join(g.dir, '.ultimate-workflow', 'run', 'f', 'report.md'), 'utf8');
};
const tableOf = (report) => {
  const rows = report.split(/\r?\n/).filter((l) => l.startsWith('|')).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const head = rows[0];
  return rows.slice(2).map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i]])));
};
const done = (card, extra = {}) => ({ card, title: `card ${card}`, status: 'committed', commit: 'c0ffee', build: { rounds: 1 }, ...extra });

test('report-cost 73: report.md has a Pack (est.) column with each card\'s pack tokens, and the Note cell no longer holds the pack size', () => {
  const g = gateRepo();
  const rows = tableOf(costReport(g, [done('A', { pack: { tokens: 1234, budget: 15000 } }), done('B', { pack: { tokens: 37235, budget: 15000 } }), done('C')], [], 10));
  assert.deepStrictEqual(rows.map((r) => r['Pack (est.)']), ['1234', '37235', 'unknown']);
  for (const r of rows) {
    assert.doesNotMatch(r.Note, /pack|15000/, r.Note);
    assert.match(r.Note, /1 round/);
  }
});

test('report-cost 74 and 75: a card with token data shows the sum over its labels, a card without shows unknown, and no cell is 0', () => {
  const g = gateRepo();
  const agents = [
    agentOf('A:write-tests', 100), agentOf('A:attempt-1', 2000), agentOf('A:quality', 30), agentOf('A:quality:retry', 4),
    agentOf('A-fix:quality', 500), agentOf('A-fix:quality:retry', 6), agentOf('A-fix:refute', 7),
    agentOf('review:correctness', 9000), agentOf('harvest', 800), agentOf('B:start'),
  ];
  const rows = tableOf(costReport(g, [done('A'), done('B')], agents, 12447));
  const byCard = Object.fromEntries(rows.map((r) => [r.Card, r]));
  assert.equal(byCard.A.Tokens, String(100 + 2000 + 30 + 4 + 500 + 6 + 7));
  assert.equal(byCard.B.Tokens, 'unknown', 'an agent with no token number is not counted as 0');
  for (const r of rows) assert.notEqual(r.Tokens, '0');
});

test('report-cost 76: Tokens matches the card name exactly', () => {
  const g = gateRepo();
  const agents = [agentOf('x:attempt-1', 10), agentOf('xy:attempt-1', 200), agentOf('x-fix:quality', 3000), agentOf('x-fix-fix:quality', 40000), agentOf('x2:attempt-1', 500000)];
  // With cards x and xy only, x-fix: is the fix round of x.
  const two = Object.fromEntries(tableOf(costReport(g, [done('x'), done('xy')], agents)).map((r) => [r.Card, r.Tokens]));
  assert.deepStrictEqual(two, { x: '3010', xy: '200' });
  // With a card named x-fix, its labels are its own, and its fix round is x-fix-fix:.
  const three = Object.fromEntries(tableOf(costReport(g, [done('x'), done('xy'), done('x-fix')], agents)).map((r) => [r.Card, r.Tokens]));
  assert.deepStrictEqual(three, { x: '10', xy: '200', 'x-fix': '43000' });
});

test('report-cost 77: cache reads are shown apart from the token total', () => {
  const g = gateRepo();
  const agents = [
    agentOf('A:attempt-1', 99999, { input: 100, cacheWrite: 20, output: 3, cacheRead: 5000 }),
    agentOf('A:quality', 99999, { input: 1000, cacheWrite: 0, output: 30, cacheRead: 60000 }),
    agentOf('B:attempt-1', 777),
  ];
  const byCard = Object.fromEntries(tableOf(costReport(g, [done('A'), done('B')], agents)).map((r) => [r.Card, r]));
  assert.equal(byCard.A.Tokens, String(100 + 20 + 3 + 1000 + 30), 'input + cache write + output, without cache reads');
  assert.equal(byCard.A['Cache read'], '65000');
  assert.equal(byCard.B.Tokens, '777', 'one number from the host is the total');
  assert.equal(byCard.B['Cache read'], 'unknown', 'the host gave no split, so the cache reads are not known');
});

test('report-cost 78: when every card is unknown the report gives the run\'s total from the Workflow result', () => {
  const g = gateRepo();
  const report = costReport(g, [done('A'), done('B')], [agentOf('review:correctness', 5)], 8131826);
  assert.deepStrictEqual(tableOf(report).map((r) => r.Tokens), ['unknown', 'unknown']);
  assert.match(report, /The run used 8131826 tokens in all \(from the Workflow result\)/);
  const none = costReport(g, [done('A')], []);
  assert.match(none, /The run's total tokens are unknown/);
  assert.doesNotMatch(none, /used 0 tokens/);
});

// --- review of the whole branch (2026-11-13) --------------------------------------------------------

// Plan test 8: card-commit reads the full-suite gate's state from its own --plan, not from the plan the
// pointer names, so G6 and G7 never judge two different plans.
test('plan-subfolder 8: card-commit judges G7 by its own --plan when the pointer names another plan', () => {
  const setup = (pointer) => {
    const g = gateRepo();
    g.put('PLAN-two.md', gateConfirmed(gatePlan().replace(/^test_command:.*\r?\n/m, '')));
    git(g.dir, 'add', '-A');
    git(g.dir, 'commit', '-q', '-m', 'a second plan, with no test command');
    assert.equal(lastJson(gateCli(g, 'run-branch', '--feature', 'gate')).ok, true);
    touch(g, 'src/a/a.js');
    reviewedBy(g, ['quality']);
    g.put('.ultimate-workflow/active-plan', `${pointer}\n`);
    return g;
  };
  const saved = process.env.ULTIMATE_WORKFLOW_GATES;
  process.env.ULTIMATE_WORKFLOW_GATES = '';
  try {
    // The pointer names the plan with no test command; --plan names the one that has it and no full run.
    const a = setup('PLAN-two.md');
    const head = headOf(a);
    const refused = autopilotLib.cardCommit(a.dir, { plan: 'PLAN-gate.md', card: 'A', feature: 'gate' });
    assert.equal(refused.ok, false, JSON.stringify(refused));
    assert.equal(refused.gate, 'G7', JSON.stringify(refused));
    assert.equal(headOf(a), head, 'nothing was committed');
    // The other way round: --plan has no test command, so G7 has nothing to ask, whatever the pointer says.
    const b = setup('PLAN-gate.md');
    const other = autopilotLib.cardCommit(b.dir, { plan: 'PLAN-two.md', card: 'A', feature: 'gate' });
    assert.notEqual(other.gate, 'G7', JSON.stringify(other));
  } finally {
    if (saved === undefined) delete process.env.ULTIMATE_WORKFLOW_GATES;
    else process.env.ULTIMATE_WORKFLOW_GATES = saved;
  }
});
