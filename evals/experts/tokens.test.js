'use strict';

// 4.2.0: spend fewer tokens where they are really spent (PLAN-token-models.md).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const GATE = path.join(PLUGIN, 'hooks', 'gate.js');
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = (name) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `uw-tokens-${name}-`));
  made.push(d);
  return d;
};
const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });

// --- AC3: short test output ------------------------------------------------------------

function noisyRepo(fail) {
  const dir = tmp('verify');
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  fs.writeFileSync(
    path.join(dir, 'suite.js'),
    (fail ? `console.log('not ok 1 - the broken one');\nconsole.log('AssertionError: expected 1 to equal 2');\n` : '') +
      `for (let i = 0; i < 500; i++) console.log('ok ' + i + ' some passing test');\n` +
      (fail ? `process.exit(1)\n` : '')
  );
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\ntests_confirmed: true\ntest_command: node suite.js\n---\n');
  return dir;
}
const run = (dir, env = {}) => spawnSync(process.execPath, [VERIFY, '--full'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });

test('T1 a passing run prints a short tail, keeps the whole output in verify.log, and exits 0', () => {
  const dir = noisyRepo(false);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n').filter(Boolean);
  assert.ok(lines.length < 45, `printed ${lines.length} lines`);
  assert.match(r.stdout, /ok 499 some passing test/);
  assert.doesNotMatch(r.stdout, /ok 10 some passing test\n/);
  assert.match(r.stdout, /verify\.log/);
  const log = fs.readFileSync(path.join(dir, '.ultimate-workflow', 'verify.log'), 'utf8');
  assert.match(log, /ok 0 some passing test/);
  assert.match(log, /ok 499 some passing test/);
});

test('T1b a failing run keeps its failure lines and exits with the failure', () => {
  const dir = noisyRepo(true);
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /not ok 1 - the broken one/);
  assert.match(r.stdout, /AssertionError: expected 1 to equal 2/);
  assert.ok(r.stdout.split('\n').length < 160);
});

test('T1c the full-output switch streams everything, as before', () => {
  const dir = noisyRepo(false);
  const r = run(dir, { ULTIMATE_WORKFLOW_VERIFY_FULL_OUTPUT: '1' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ok 0 some passing test/);
  assert.match(r.stdout, /ok 250 some passing test/);
});

// --- AC2: Haiku for the agents that search and read -----------------------------------------

const SLICE = { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };

test('T2 the plan readers run on Haiku; the writer and the expert selection do not', async () => {
  const { calls } = await loadWorkflow(path.join(PLUGIN, 'phases', 'plan.js'))(
    { feature: 'x', areas: ['a.ts', 'b.ts'], available: [], skills: {} },
    async (c) => (c.label === 'synthesise' ? null : SLICE)
  );
  const readers = calls.filter((c) => c.phase === 'Explore');
  assert.ok(readers.length >= 2);
  for (const c of readers) assert.equal(c.model, 'haiku', c.label);
  for (const c of calls.filter((c) => c.phase !== 'Explore')) assert.equal(c.model, undefined, c.label);
});

test('T2b the harvest gatherers run on Haiku; the router does not', async () => {
  const { calls } = await loadWorkflow(path.join(PLUGIN, 'phases', 'harvest.js'))({ scope: 'x', range: 'HEAD~1..HEAD' }, async (c) =>
    c.label === 'existing' ? { gotchas: [], topicals: [], notes: '' } : { candidates: [] }
  );
  for (const label of ['plan', 'history', 'existing']) assert.equal(calls.find((c) => c.label === label).model, 'haiku', label);
  for (const c of calls.filter((c) => !['plan', 'history', 'existing'].includes(c.label))) assert.equal(c.model, undefined, c.label);
});

test('T2c a reader that returns nothing on Haiku is retried once on the session model; the override changes readers only', async () => {
  const { calls, logs } = await loadWorkflow(path.join(PLUGIN, 'phases', 'plan.js'))(
    { feature: 'x', areas: ['a.ts'], available: [], skills: {} },
    async (c) => (c.label === 'synthesise' ? null : c.model === 'haiku' ? null : SLICE)
  );
  const a = calls.filter((c) => c.label === 'a.ts');
  assert.equal(a.length, 2);
  assert.equal(a[0].model, 'haiku');
  assert.equal(a[1].model, undefined);
  assert.ok(logs.some((l) => /retried on the session model/.test(l)));
  const off = await loadWorkflow(path.join(PLUGIN, 'phases', 'plan.js'))(
    { feature: 'x', areas: ['a.ts'], available: [], skills: {}, readerModel: 'inherit' },
    async (c) => (c.label === 'synthesise' ? null : SLICE)
  );
  for (const c of off.calls) assert.equal(c.model, undefined, c.label);
  const sonnet = await loadWorkflow(path.join(PLUGIN, 'phases', 'plan.js'))(
    { feature: 'x', areas: ['a.ts'], available: [], skills: {}, readerModel: 'sonnet' },
    async (c) => (c.label === 'synthesise' ? null : SLICE)
  );
  assert.equal(sonnet.calls.find((c) => c.label === 'a.ts').model, 'sonnet');
});

test('T2e the reader-model block is the same in the plan and harvest phases', () => {
  const block = (f) => /\/\/ --- reader model[\s\S]*?\/\/ --- end reader model ---/.exec(read(f))[0];
  assert.equal(block('phases/plan.js'), block('phases/harvest.js'));
});

test('T2d experts.js script passes the reader model from the environment, chosen in code', () => {
  const dir = tmp('script');
  const cli = (env) => spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'script', '--phase', 'plan'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
  const embedded = (r) => JSON.parse(/const EMBEDDED_ARGS = (.*)/.exec(fs.readFileSync(JSON.parse(r.stdout).scriptPath, 'utf8'))[1]);
  assert.equal(embedded(cli({ ULTIMATE_WORKFLOW_READER_MODEL: 'inherit' })).readerModel, 'inherit');
  const env = { ...process.env };
  delete env.ULTIMATE_WORKFLOW_READER_MODEL;
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'script', '--phase', 'plan'], { cwd: dir, encoding: 'utf8', env });
  assert.equal(embedded(r).readerModel, undefined, 'unset: the phase default applies');
});

// --- AC1: the reminder ----------------------------------------------------------------------

const context = require(path.join(PLUGIN, 'hooks', 'lib', 'context.js'));
const turn = (ctx) =>
  JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: ctx - 10, output_tokens: 50 } } });

test('T3 the context size comes from the last assistant turn in the tail; bands decide the reminder', () => {
  const tail = ['ial line cut in half', turn(40000), JSON.stringify({ type: 'user', message: { content: 'x' } }), turn(160000), 'not json'].join('\n');
  assert.equal(context.lastContextTokens(tail), 160000);
  assert.equal(context.lastContextTokens('nothing here'), null);
  const t = 150000;
  assert.deepEqual(context.decide({ tokens: 100000, threshold: t, lastBand: 0 }), { band: 0, remind: false });
  assert.deepEqual(context.decide({ tokens: 160000, threshold: t, lastBand: 0 }), { band: 1, remind: true });
  assert.deepEqual(context.decide({ tokens: 200000, threshold: t, lastBand: 1 }), { band: 1, remind: false });
  assert.deepEqual(context.decide({ tokens: 310000, threshold: t, lastBand: 1 }), { band: 2, remind: true });
  assert.deepEqual(context.decide({ tokens: 900000, threshold: 0, lastBand: 0 }), { band: 0, remind: false });
  assert.match(context.reminderText(160000), /160k tokens.*\/handoff.*new session/);
});

function promptEvent(transcript, sessionId, env = {}) {
  const dir = tmp('gate');
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', cwd: dir, prompt: 'go on', session_id: sessionId, transcript_path: transcript }),
    encoding: 'utf8',
    env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on', ...env },
  });
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null };
}

test('T4 through gate.js: a large context gets one reminder as context, never a block; gates off says nothing', () => {
  const dir = tmp('transcript');
  const file = path.join(dir, 't.jsonl');
  fs.writeFileSync(file, `${turn(170000)}\n`);
  const sid = `s-${path.basename(dir)}`;
  const first = promptEvent(file, sid);
  assert.equal(first.status, 0);
  assert.match(first.out.hookSpecificOutput.additionalContext, /\/handoff/);
  assert.equal(first.out.hookSpecificOutput.permissionDecision, undefined);
  assert.equal(promptEvent(file, sid).out, null, 'same band, same session: no second reminder');
  assert.equal(promptEvent(file, `${sid}-other`, { ULTIMATE_WORKFLOW_GATES: 'off' }).out, null);
  fs.writeFileSync(file, `${turn(20000)}\n`);
  assert.equal(promptEvent(file, `${sid}-small`).out, null, 'a small context: nothing');
});

// --- AC5: the honest value report ----------------------------------------------------------

const usage = require(path.join(PLUGIN, 'experts', 'usage.js'));

function transcripts() {
  const root = tmp('projects');
  const proj = path.join(root, 'C--Users-a-the-ceo');
  fs.mkdirSync(path.join(proj, 'sess1', 'subagents'), { recursive: true });
  const line = (type, extra) => JSON.stringify({ type, ...extra });
  const assistant = (u, model = 'claude-opus-5-5') => line('assistant', { message: { model, usage: u, content: [{ type: 'tool_use', name: 'Bash' }] } });
  fs.writeFileSync(path.join(proj, 'sess1.jsonl'), [line('user', { message: { content: 'build the thing' } }), assistant({ input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 9000, output_tokens: 90 })].join('\n'));
  fs.writeFileSync(path.join(proj, 'sess1', 'subagents', 'agent-1.jsonl'), [line('user', { message: { content: 'x You are the frontend domain expert. y' } }), assistant({ input_tokens: 5, cache_creation_input_tokens: 50, cache_read_input_tokens: 900, output_tokens: 45 })].join('\n'));
  fs.writeFileSync(path.join(proj, 'sess1', 'subagents', 'agent-2.jsonl'), [line('user', { message: { content: 'Try to REFUTE each finding below.' } }), assistant({ input_tokens: 1, cache_creation_input_tokens: 9, cache_read_input_tokens: 80, output_tokens: 10 }, 'claude-sonnet-5-5')].join('\n'));
  fs.writeFileSync(path.join(proj, 'sess1', 'subagents', 'agent-3.jsonl'), [line('user', { message: { content: 'Read src/a.ts and report what it constrains for a change described as "x".' } }), assistant({ input_tokens: 2, cache_creation_input_tokens: 8, cache_read_input_tokens: 40, output_tokens: 0 }, 'claude-haiku-5-5')].join('\n'));
  fs.mkdirSync(path.join(root, 'C--Users-a-other'));
  fs.writeFileSync(path.join(root, 'C--Users-a-other', 's.jsonl'), assistant({ input_tokens: 1, cache_creation_input_tokens: 1, cache_read_input_tokens: 1, output_tokens: 1 }));
  return root;
}

test('T5 usage: main conversations and agents apart, the cache share, the roles, the filters', () => {
  const root = transcripts();
  const s = usage.summarize(usage.scan({ root, match: 'ceo' }));
  assert.equal(s.main.tokens, 9200);
  assert.equal(s.main.turns, 1);
  assert.equal(s.agents.tokens, 1000 + 100 + 50);
  assert.equal(s.byRole['expert:frontend'].tokens, 1000);
  assert.equal(s.byRole.skeptic.tokens, 100);
  assert.equal(Math.round(s.cacheShare * 100), Math.round(((9000 + 900 + 80 + 40) / 10350) * 100));
  assert.equal(usage.summarize(usage.scan({ root, projects: true })).projects.length, 2);
  assert.equal(usage.scan({ root, since: Date.now() + 86400000 }).length, 0);
});

test('T5b the default folder is the project path with every separator as a dash', () => {
  assert.equal(usage.projectFolder('C:\\Users\\a\\x'), 'C--Users-a-x');
  assert.equal(usage.projectFolder('/home/u/x'), '-home-u-x');
  assert.equal(usage.projectFolder('C:\\Users\\a\\the-ceo\\.claude\\worktrees\\w'), 'C--Users-a-the-ceo--claude-worktrees-w');
});

test('T5c experts.js usage prints the summary as JSON', () => {
  const root = transcripts();
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'usage', '--root', root, '--match', 'ceo'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(r.stdout);
  assert.equal(s.main.tokens, 9200);
});

// --- AC4 and the docs -------------------------------------------------------------------------

test('T6 the docs: loops in agents, value runs usage, the reminder', () => {
  const rule = /test-and-fix loops and wide searches inside a helper agent/;
  assert.match(read('skills/the-ultimate-workflow-guidelines/SKILL.md'), rule);
  assert.match(read('rules/the-ultimate-workflow-guidelines.mdc'), rule);
  assert.match(read('commands/feature.md'), rule);
  assert.match(read('commands/value.md'), /experts\.js" usage/);
  assert.match(fs.readFileSync(path.join(PLUGIN, '..', '..', 'HOW-TO-USE.md'), 'utf8'), /150k/);
});

// The value report takes its cost from the transcripts, grouped into phases, never from the ledger's tokens.
test('T7 usage groups the roles into phases whose tokens add up to the total, with shares', () => {
  const s = usage.summarize(usage.scan({ root: transcripts(), match: 'ceo' }));
  const p = s.phases;
  assert.equal(p.main.tokens, 9200);
  assert.equal(p.expertsCheck.tokens, 1100, 'experts + skeptic + recheck');
  assert.equal(p.build.tokens, 0);
  assert.equal(p.readers.tokens, 50, 'plan readers and harvest gatherers');
  assert.equal(p.otherAgents.tokens, 0);
  assert.equal(p.main.tokens + p.expertsCheck.tokens + p.build.tokens + p.readers.tokens + p.otherAgents.tokens, s.tokens);
  assert.equal(Math.round(p.expertsCheck.share * 1000), Math.round((1100 / 10350) * 1000));
});

test('T9 usage reports which model ran each role and each phase, by tokens', () => {
  const s = usage.summarize(usage.scan({ root: transcripts(), match: 'ceo' }));
  assert.deepEqual(s.byRole.reader.models, { 'claude-haiku-5-5': 50 });
  assert.deepEqual(s.byRole['expert:frontend'].models, { 'claude-opus-5-5': 1000 });
  assert.deepEqual(s.phases.expertsCheck.models, { 'claude-opus-5-5': 1000, 'claude-sonnet-5-5': 100 });
  assert.deepEqual(s.main.models, { 'claude-opus-5-5': 9200 });
  assert.equal(usage.role('Inventory what this repository has ALREADY recorded, so a later step'), 'harvest-reader');
});

test('T8 value.md takes cost from the usage phases and never reports a ledger token share', () => {
  const v = read('commands/value.md');
  assert.match(v, /`phases`/);
  assert.match(v, /never report the ledger's tokens as a share/i);
  assert.match(v, /per confirmed unique catch[^.]*`phases\.expertsCheck`/);
  assert.match(v, /which model ran each/i);
});
