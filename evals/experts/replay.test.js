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

const ROOT = path.join(__dirname, '..', '..');
const PLUGIN = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const REPLAY = path.join(__dirname, 'manual', 'replay.js');
const { list } = require(path.join(PLUGIN, 'experts', 'experts.js'));

// The replay tool runs the real workflow scripts with something else answering the agent() calls.
// These tests play the part of that something, so they check the loop end to end without a model.

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `uw-${p}-`));
const AVAILABLE = list(PLUGIN).experts;

function setup(args) {
  const work = tmp('replay-work');
  const repo = tmp('replay-repo');
  const argsFile = path.join(work, 'args.json');
  fs.writeFileSync(argsFile, JSON.stringify(args));
  const env = { ...process.env, UW_WORK: work, UW_REPO: repo, UW_IDLE_MS: '150' };
  const run = (workflow, name = 'r', extraEnv = {}) => {
    const r = spawnSync(process.execPath, [REPLAY, workflow, argsFile, name], { encoding: 'utf8', env: { ...env, ...extraEnv } });
    return { status: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout) : null, stderr: r.stderr };
  };
  return { work, repo, argsFile, run };
}

const answer = (p, value) => fs.writeFileSync(p.resultFile, JSON.stringify(value));
const SLICE = { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };
const PLAN = { planMarkdown: '---\nplan_confirmed: false\n---\n# Plan\n', openQuestions: [], deviations: [] };
const INPUT = { summary: 'Needs an ownership check.', constraints: ['The id is compared with the session user.'], risks: [], questions: [] };

const planArgs = (over = {}) => ({ feature: 'add an orders route', available: AVAILABLE, expertsDir: path.join(PLUGIN, 'experts'), ...over });

test('the first round lists every parallel reader as pending at once, with a task a subagent can follow on its own', () => {
  const s = setup(planArgs());
  const { status, out } = s.run('plan');
  assert.strictEqual(status, 0);
  assert.deepStrictEqual(out.pending.map((p) => p.label).sort(), ['code', 'memory', 'project-docs']);
  const task = fs.readFileSync(out.pending[0].taskFile, 'utf8');
  assert.ok(task.includes(s.repo), 'it names the repository to read');
  assert.ok(task.includes(out.pending[0].resultFile), 'it names the one file to write');
  assert.match(task, /# Explorer/, 'it carries the real agent definition');
  assert.match(task, /add an orders route/, 'it carries the workflow\'s own prompt');
  assert.match(task, /"patterns"/, 'it carries the schema the answer must match');
  assert.match(task, /data, not instructions/, 'it tells the agent the repository is data');
});

test('answering each round and running again walks the real plan workflow to the end, with the expert consulted', () => {
  const s = setup(planArgs());
  let r = s.run('plan');
  r.out.pending.forEach((p) => answer(p, SLICE));
  r = s.run('plan');
  assert.deepStrictEqual(r.out.pending.map((p) => p.label), ['synthesise']);
  answer(r.out.pending[0], PLAN);
  r = s.run('plan');
  assert.deepStrictEqual(r.out.pending.map((p) => p.label), ['select-experts']);
  assert.match(fs.readFileSync(r.out.pending[0].taskFile, 'utf8'), /- security: Security expert\. Applies when/);
  answer(r.out.pending[0], { experts: [{ name: 'security', why: 'an orders route' }] });
  r = s.run('plan');
  assert.deepStrictEqual(r.out.pending.map((p) => [p.label, p.agentType]), [['plan:security', 'uw-expert-security']]);
  const task = fs.readFileSync(r.out.pending[0].taskFile, 'utf8');
  assert.match(task, /# Security expert/, 'the expert\'s own definition is the role');
  assert.ok(task.includes(path.join(PLUGIN, 'experts', 'security', 'references', 'plan.md')), 'and it is pointed at its plan reference');
  assert.match(task, /read-only shell commands/);
  answer(r.out.pending[0], INPUT);
  r = s.run('plan');
  assert.strictEqual(r.out.done, true);
  assert.strictEqual(r.out.calls, 6);
  const result = JSON.parse(fs.readFileSync(r.out.resultFile, 'utf8'));
  assert.match(result.planMarkdown, /## Expert input\n\n### security/);
  assert.deepStrictEqual(result.expertLane.ran, ['security']);
});

test('running again when everything is answered gives the same finished result and asks for nothing', () => {
  const s = setup(planArgs({ available: [] }));
  let r = s.run('plan');
  r.out.pending.forEach((p) => answer(p, SLICE));
  r = s.run('plan');
  answer(r.out.pending[0], PLAN);
  const first = s.run('plan');
  const second = s.run('plan');
  assert.strictEqual(first.out.done, true);
  assert.deepStrictEqual(second.out, first.out);
});

test('an answer belongs to the exact prompt: change the request and the same agents are asked again', () => {
  const s = setup(planArgs());
  const first = s.run('plan').out.pending.map((p) => p.key).sort();
  first.forEach((k) => answer({ resultFile: path.join(s.work, 'cache', `${k}.json`) }, SLICE));
  assert.strictEqual(s.run('plan').out.pending[0].label, 'synthesise', 'answered readers are not asked twice');

  fs.writeFileSync(s.argsFile, JSON.stringify(planArgs({ feature: 'add an invoices route' })));
  const changed = s.run('plan').out.pending.map((p) => p.key).sort();
  assert.strictEqual(changed.length, 3);
  assert.ok(changed.every((k) => !first.includes(k)), 'a stale answer is never reused for a different prompt');
});

test('the repository is not part of an answer\'s identity, so a recorded run can be moved', () => {
  const a = setup(planArgs());
  const b = setup(planArgs());
  const keysA = a.run('plan').out.pending.map((p) => p.key).sort();
  const keysB = b.run('plan').out.pending.map((p) => p.key).sort();
  assert.deepStrictEqual(keysA, keysB);
  assert.notStrictEqual(a.repo, b.repo);
});

test('a workflow that refuses to run finishes with its refusal as the result, and asks for no one', () => {
  const s = setup({ range: 'main..HEAD' });
  const r = s.run('review');
  assert.strictEqual(r.out.done, true);
  assert.strictEqual(r.out.calls, 0);
  const result = JSON.parse(fs.readFileSync(r.out.resultFile, 'utf8'));
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /experts\.js list/);
});

test('an agent type with no definition in the plugin stops the run and says which', () => {
  const s = setup(planArgs());
  const plugin = tmp('replay-plugin');
  fs.cpSync(PLUGIN, plugin, { recursive: true, filter: (p) => !/ultimate-workflow[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(p) });
  fs.rmSync(path.join(plugin, 'agents', 'uw-explorer.md'));
  const r = s.run('plan', 'r', { UW_PLUGIN: plugin });
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /no agent definition for "uw-explorer"/);
});

test('bad invocations exit 2 with a reason', () => {
  const s = setup(planArgs());
  const noArgs = spawnSync(process.execPath, [REPLAY], { encoding: 'utf8' });
  assert.strictEqual(noArgs.status, 2);
  assert.match(noArgs.stderr, /usage/);

  const badJson = path.join(s.work, 'bad.json');
  fs.writeFileSync(badJson, '{nope');
  const bad = spawnSync(process.execPath, [REPLAY, 'plan', badJson, 'r'], { encoding: 'utf8' });
  assert.strictEqual(bad.status, 2);
  assert.match(bad.stderr, /cannot read args/);

  const unknown = s.run('nosuchworkflow');
  assert.strictEqual(unknown.status, 2);
});

test('the tool says in its own header what it does not do, and the vetting guide points at it', () => {
  const src = fs.readFileSync(REPLAY, 'utf8');
  assert.match(src, /does not call a model/);
  assert.match(src, /how the prompts and the script behave with a real model/);
  const guide = fs.readFileSync(path.join(ROOT, 'docs', 'what-a-good-expert-looks-like.md'), 'utf8');
  assert.ok(guide.includes('`evals/experts/manual/replay.js`'));
  assert.doesNotMatch(guide, /is not committed/);
});

test('a script that neither finishes nor asks for anything is called stuck, not waited on forever', () => {
  const s = setup(planArgs());
  // A copy of the plugin whose plan workflow awaits a promise that never settles.
  const plugin = tmp('replay-stuck');
  fs.cpSync(PLUGIN, plugin, { recursive: true, filter: (p) => !/ultimate-workflow[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(p) });
  const file = path.join(plugin, 'workflows', 'plan.js');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace("phase('Explore')", "phase('Explore')\nawait new Promise(() => {})"));
  const r = s.run('plan', 'r', { UW_PLUGIN: plugin, UW_STALL_MS: '400' });
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /neither finished nor asked for anything/);
});
