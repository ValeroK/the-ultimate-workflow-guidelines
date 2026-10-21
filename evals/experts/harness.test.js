'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const { scaffoldExpert } = require('./lib/cookbook.js');

const ROOT = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const COOKBOOK = fs.readFileSync(path.join(ROOT, 'docs', 'adding-an-expert.md'), 'utf8');

// The whole flow through the real entry points: the real gate.js as the host would run it
// (a payload on stdin, an exit code and a decision on the way out), the real experts.js
// commands, and the real workflow scripts under a stub that answers for the model. What is
// not covered is a real model deciding which experts apply; that is measured separately.

const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), `uw-${prefix}-`));
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
};

/** A copy of the plugin that can have experts added to it without touching the real one. */
function pluginCopy() {
  const dir = tmp('plugin');
  const payload = path.join(dir, 'payload');
  fs.cpSync(PAYLOAD, payload, { recursive: true, filter: (s) => !/ultimate-workflow[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(s) });
  const examples = path.join(dir, 'examples');
  fs.cpSync(path.join(__dirname, 'examples'), examples, { recursive: true });
  return { payload, examples };
}

function project(planBody = 'plan_confirmed: true\ntests_confirmed: true') {
  const dir = tmp('proj');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 1;\n');
  write(path.join(dir, 'PLAN-x.md'), `---\n${planBody}\n---\nbody\n`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return { dir, plan: path.join(dir, 'PLAN-x.md') };
}

const gate = (payload, dir, event) =>
  spawnSync(process.execPath, [path.join(payload, 'hooks', 'gate.js')], {
    input: JSON.stringify({ cwd: dir, ...event }),
    encoding: 'utf8',
    env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' },
  });

const writeEdit = (dir, rel = 'src/a.js') => ({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: path.join(dir, rel) } });
const bash = (command) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
const decision = (r) => (r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : `exit ${r.status}`);
const reasonOf = (r) => {
  try {
    return JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason;
  } catch {
    return '';
  }
};

const experts = (payload, dir, args, input) =>
  spawnSync(process.execPath, [path.join(payload, 'experts', 'experts.js'), ...args], { cwd: dir, input, encoding: 'utf8' });

/** What the review phase does around the workflow, with the model's recheck answering `names`. */
async function review(payload, dir, plan, { recheck = [], expertsArg } = {}) {
  const prep = JSON.parse(experts(payload, dir, ['prepare']).stdout);
  const planned = JSON.parse(experts(payload, dir, ['read', '--plan', plan]).stdout).experts;
  const run = loadWorkflow(path.join(payload, 'workflows', 'review.js'));
  const { result } = await run(
    { range: 'working', available: prep.available, experts: expertsArg || planned, diffFile: prep.diffFile, expertsDir: path.join(payload, 'experts'), plan, skills: prep.skills, expertsOnly: true },
    (call) => (call.label === 'recheck' ? { experts: recheck.map((name) => ({ name, why: 'x' })) } : { findings: [], lensVerdict: `clean through ${call.label}` })
  );
  const rec = experts(payload, dir, ['record', '--stage', 'review', '--plan', plan], JSON.stringify({ ok: result.ok, expertLane: result.expertLane }));
  return { result, rec };
}

// ---- the flow, with the shipped security expert ---------------------------------

test('the flow end to end: a source edit waits for the experts decision, a commit waits for the experts, and any later change waits again', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project();

  // 1. The plan is confirmed, but nobody has said which experts apply: no source edit.
  let r = gate(payload, dir, writeEdit(dir));
  assert.strictEqual(decision(r), 'deny');
  assert.match(reasonOf(r), /Gate G6: no domain-experts decision/);

  // 2. Planning records its selection (here: the model chose security).
  const planRec = experts(payload, dir, ['record', '--stage', 'plan', '--plan', plan], JSON.stringify({ ok: true, expertLane: { stage: 'plan', selected: ['security'], ran: ['security'], failed: [], added: ['security'] } }));
  assert.strictEqual(planRec.status, 0, planRec.stderr);
  assert.strictEqual(decision(gate(payload, dir, writeEdit(dir))), 'allow');

  // 3. Code is written. A commit is refused: no one has re-checked.
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  r = gate(payload, dir, bash('git add -A && git commit -m "feat"'));
  assert.strictEqual(decision(r), 'deny');
  assert.match(reasonOf(r), /Gate G6: the domain experts have not been re-checked/);
  assert.match(reasonOf(r), /\/ultimate-workflow:experts/);
  assert.strictEqual(decision(gate(payload, dir, bash('git status'))), 'allow', 'other commands are untouched');

  // 4. The check runs; the commit is allowed.
  const out = await review(payload, dir, plan);
  assert.strictEqual(out.rec.status, 0, out.rec.stderr);
  assert.deepStrictEqual(out.result.expertLane.ran, ['security']);
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -m "feat"'))), 'allow');
  assert.strictEqual(JSON.parse(experts(payload, dir, ['check', '--plan', plan]).stdout).ok, true);

  // 5. A change after the review makes the evidence stale.
  write(path.join(dir, 'src', 'b.js'), 'module.exports = 3;\n');
  r = gate(payload, dir, bash('git commit -am "more"'));
  assert.strictEqual(decision(r), 'deny');
});

test('a commit that touches only documentation needs no expert', () => {
  const { payload } = pluginCopy();
  const { dir } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'README.md'), '# docs\n');
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am docs'))), 'allow');
});

test('the gates do nothing unless they were switched on, as before', () => {
  const { payload } = pluginCopy();
  const { dir } = project();
  const r = spawnSync(process.execPath, [path.join(payload, 'hooks', 'gate.js')], { input: JSON.stringify({ cwd: dir, ...bash('git commit -m x') }), encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: '' } });
  assert.strictEqual(decision(r), 'allow');
});

test('a hook payload that cannot be parsed fails open, commit command or not', () => {
  const { payload } = pluginCopy();
  const r = spawnSync(process.execPath, [path.join(payload, 'hooks', 'gate.js')], { input: '{not json git commit', encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  assert.strictEqual(r.status, 0);
});

test('a changed test file brings quality into review even when nobody selected it; a source-only change does not', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  let out = await review(payload, dir, plan);
  assert.ok(!out.result.expertLane.ran.includes('quality'), 'no test file changed, so quality stays out');

  write(path.join(dir, 'src', 'a.test.js'), "require('node:assert').strictEqual(require('./a.js'), 2);\n");
  out = await review(payload, dir, plan);
  assert.strictEqual(out.rec.status, 0, out.rec.stderr);
  assert.ok(out.result.expertLane.added.includes('quality'), JSON.stringify(out.result.expertLane));
  assert.deepStrictEqual(out.result.expertLane.ran.sort(), ['quality', 'security']);
  assert.ok(out.result.expertLane.skillsLoaded.quality.includes('test-craft'));
});

test('the recheck can add an expert at commit time, and the commit then waits for that expert too', async () => {
  const { payload, examples } = pluginCopy();
  scaffoldExpert({
    payload,
    examples,
    cookbook: COOKBOOK,
    name: 'infra',
    domain: 'infrastructure',
    fill: { applies: ['Adds a pipeline step', 'Changes a deployment file', 'Edits the container build'], does_not_apply: ['Fixes a typo in the README', 'Renames a CSS class', 'Adds a unit test for a helper'] },
  });
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');

  // The recheck finds that infra also applies. Both experts must review.
  const out = await review(payload, dir, plan, { recheck: ['infra'] });
  assert.strictEqual(out.rec.status, 0, out.rec.stderr);
  assert.deepStrictEqual(out.result.expertLane.added, ['infra']);
  assert.deepStrictEqual(out.result.expertLane.ran.sort(), ['infra', 'security']);
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am x'))), 'allow');
  assert.deepStrictEqual(JSON.parse(experts(payload, dir, ['read', '--plan', plan]).stdout).experts, ['security', 'infra'], 'recorded into the plan, add-only');

  // Now suppose infra's review never happened (its record is gone): the commit is refused, naming it.
  fs.rmSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'infra.json'));
  const r = gate(payload, dir, bash('git commit -am x'));
  assert.strictEqual(decision(r), 'deny');
  assert.match(reasonOf(r), /infra/);
});

test('a brand-new expert is picked up by every part of the flow with no edit beyond its own files', async () => {
  const { payload, examples } = pluginCopy();
  const shipped = JSON.parse(experts(payload, tmp('x'), ['list']).stdout).map((e) => e.name);
  scaffoldExpert({
    payload,
    examples,
    cookbook: COOKBOOK,
    name: 'uiux',
    domain: 'user interface',
    stages: ['plan', 'review'],
    fill: { applies: ['Adds a new screen', 'Changes a form flow', 'Edits a navigation menu'], does_not_apply: ['Fixes a typo in the README', 'Adds a database index', 'Bumps a patch dependency'] },
  });

  // discovery
  const list = JSON.parse(experts(payload, tmp('x'), ['list']).stdout);
  assert.deepStrictEqual(list.map((e) => e.name).sort(), [...shipped, 'uiux'].sort());

  // the plan phase offers it, consults it, and writes its input into the plan
  const planRun = loadWorkflow(path.join(payload, 'workflows', 'plan.js'));
  const planOut = await planRun({ feature: 'add a settings screen', available: list, expertsDir: path.join(payload, 'experts') }, (call) => {
    if (call.label === 'select-experts') {
      assert.ok(call.prompt.includes('- uiux: '), 'the new expert is in the question');
      return { experts: [{ name: 'uiux', why: 'a new screen' }] };
    }
    if (call.label === 'plan:uiux') return { summary: 'The screen needs a visible focus state.', constraints: ['Every control is reachable by keyboard.'], risks: [], questions: [] };
    if (call.label === 'synthesise') return { planMarkdown: '---\nplan_confirmed: false\n---\n# Plan\n', openQuestions: [], deviations: [] };
    return { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };
  });
  assert.match(planOut.result.planMarkdown, /### uiux\n\nThe screen needs a visible focus state\./);
  assert.deepStrictEqual(planOut.result.expertLane.ran, ['uiux']);
  assert.ok(!planOut.calls.some((c) => c.label === 'plan:security'), 'security was not chosen, so it was not consulted');

  // the tests phase skips it, since it declared no tests stage
  const testsRun = loadWorkflow(path.join(payload, 'workflows', 'tests.js'));
  const testsOut = await testsRun({ plan: 'PLAN-x.md', available: list, experts: ['uiux'], expertsDir: path.join(payload, 'experts') }, (call) =>
    call.label === 'draft' ? { testsMarkdown: '## Tests', testCommand: 'x', expectedTestNames: [] } : { angleVerdict: 'fine', gaps: [] }
  );
  // (the quality expert joins every tests stage, so it is the only one that runs)
  assert.deepStrictEqual(testsOut.result.expertLane.ran, ['quality']);
  assert.ok(!testsOut.calls.some((c) => c.label === 'tests:uiux'));

  // the commit gate waits for it
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [uiux]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am x'))), 'deny');
  const out = await review(payload, dir, plan);
  assert.strictEqual(out.rec.status, 0, out.rec.stderr);
  assert.deepStrictEqual(out.result.expertLane.ran, ['uiux']);
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am x'))), 'allow');
});

test('a failed expert review leaves the commit blocked', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  const prep = JSON.parse(experts(payload, dir, ['prepare']).stdout);
  const run = loadWorkflow(path.join(payload, 'workflows', 'review.js'));
  const { result } = await run(
    { available: prep.available, experts: ['security'], diffFile: prep.diffFile, expertsDir: path.join(payload, 'experts'), expertsOnly: true },
    (call) => {
      if (call.label === 'recheck') return { experts: [] };
      throw new Error('agent crashed');
    }
  );
  // Every lens failed, so the workflow says so and is not ok; recording it is refused, and no
  // evidence exists to satisfy the gate.
  assert.strictEqual(result.ok, false);
  const rec = experts(payload, dir, ['record', '--stage', 'review', '--plan', plan], JSON.stringify({ ok: result.ok, expertLane: result.expertLane }));
  assert.strictEqual(rec.status, 2);
  assert.match(rec.stderr, /not ok/);
  const r = gate(payload, dir, bash('git commit -am x'));
  assert.strictEqual(decision(r), 'deny');
  assert.match(reasonOf(r), /Gate G6/);
});

test('every gate invocation leaves a heartbeat, and status.js reports the experts state', () => {
  const { payload } = pluginCopy();
  const { dir } = project();
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  gate(payload, dir, bash('git commit -m x'));
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow', 'heartbeat.json')));
  const s = spawnSync(process.execPath, [path.join(payload, 'hooks', 'status.js'), '--json'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  const j = JSON.parse(s.stdout);
  assert.strictEqual(j.liveness.state, 'live');
  assert.strictEqual(j.experts.decided, false);
  assert.deepStrictEqual([...j.experts.available].sort(), JSON.parse(experts(payload, dir, ['list']).stdout).map((e) => e.name).sort());
  assert.strictEqual(j.experts.commit.allowed, false);
});

// ---- high-confidence findings are raised and resolved -----------------------------------

const HIGH = { expert: 'security', file: 'src/a.js', line: 3, what: 'The admin check lets support read any order', confidence: 'high', status: 'confirmed' };

async function reviewWith(payload, dir, plan, findings) {
  const prep = JSON.parse(experts(payload, dir, ['prepare']).stdout);
  const run = loadWorkflow(path.join(payload, 'workflows', 'review.js'));
  const { result } = await run(
    { available: prep.available, experts: ['security'], diffFile: prep.diffFile, expertsDir: path.join(payload, 'experts'), plan, expertsOnly: true },
    (call) => {
      if (call.label === 'recheck') return { experts: [] };
      if (call.phase === 'Lenses') return { lensVerdict: 'checked', findings: findings.map((f) => ({ file: f.file, line: f.line, what: f.what, howItFails: 'a support account reads any order', confidence: f.confidence })) };
      return { verdicts: findings.map((_, index) => ({ index, verdict: 'confirmed', reason: 'reachable' })) };
    }
  );
  const rec = experts(payload, dir, ['record', '--stage', 'review', '--plan', plan], JSON.stringify({ ok: result.ok, expertLane: result.expertLane }));
  return { result, rec };
}

test('an open high finding blocks the commit through the real gate, a fix resolves it, and the gate says why until then', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2; // admin bypass\n');

  const first = await reviewWith(payload, dir, plan, [HIGH]);
  assert.strictEqual(first.rec.status, 0, first.rec.stderr);
  assert.strictEqual(JSON.parse(first.rec.stdout).open.length, 1);

  const r = gate(payload, dir, bash('git commit -am feat'));
  assert.strictEqual(decision(r), 'deny');
  assert.match(reasonOf(r), /1 high-confidence finding is still open/);
  assert.match(reasonOf(r), /src\/a\.js:3/);
  assert.match(reasonOf(r), /Do not dismiss one on your own authority/);
  assert.strictEqual(JSON.parse(experts(payload, dir, ['check', '--plan', plan]).stdout).ok, false);

  // The fix. The old review no longer describes the code, so a new one is needed, and it is clean.
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am fix'))), 'deny', 'a changed tree needs a new review');
  const second = await reviewWith(payload, dir, plan, []);
  assert.strictEqual(second.rec.status, 0, second.rec.stderr);
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am fix'))), 'allow');
});

test('a finding the user dismisses stops blocking, with their reason kept', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2; // admin bypass\n');
  const first = await reviewWith(payload, dir, plan, [HIGH]);
  const id = JSON.parse(first.rec.stdout).open[0].id;

  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am feat'))), 'deny');
  const done = experts(payload, dir, ['resolve', '--id', id, '--reason', 'Support must see every order (the user)']);
  assert.strictEqual(done.status, 0, done.stderr);
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am feat'))), 'allow');

  const waivers = JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'waivers.json'), 'utf8'));
  assert.strictEqual(waivers[id].reason, 'Support must see every order (the user)');
  const s = spawnSync(process.execPath, [path.join(payload, 'hooks', 'status.js'), '--json'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  assert.strictEqual(JSON.parse(s.stdout).experts.openFindings, 0);
});

test('a medium finding is reported but does not block the commit', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  await reviewWith(payload, dir, plan, [{ ...HIGH, confidence: 'medium' }]);
  assert.strictEqual(decision(gate(payload, dir, bash('git commit -am feat'))), 'allow');
});

test('status shows how many high findings are open', async () => {
  const { payload } = pluginCopy();
  const { dir, plan } = project('plan_confirmed: true\ntests_confirmed: true\nexperts: [security]');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  await reviewWith(payload, dir, plan, [HIGH]);
  const s = spawnSync(process.execPath, [path.join(payload, 'hooks', 'status.js')], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  assert.match(s.stdout, /open high-confidence findings: 1/);
});
