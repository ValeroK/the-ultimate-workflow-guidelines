'use strict';

// PLAN-run-records.md, W0b and W1. From the re-wash trace: the build command said to save the
// Workflow result "exactly as returned", but `ledger add --result` read it as the phase result, so
// the wrapper {summary, agentCount, result, ...} produced a row with ok:false, green:false and
// rounds:null that looked like a failed build. And every card needed a hand patch to set the model.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const L = require(path.join(PLUGIN, 'experts', 'ledger.js'));
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'uw-records-'));
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8' });

const buildResult = { ok: true, green: true, rounds: 3, briefsLoaded: ['developer'], filesChanged: ['a.py'] };
const wrapper = (inner) => ({ summary: 'Build card 8a', agentCount: 6, logs: [], result: inner });

// --- W0b: the ledger takes the Workflow wrapper, and refuses what is not a phase result ----------

test('a Workflow wrapper is unwrapped, so the row carries the build and not ok:false', () => {
  const dir = tmp();
  const e = L.addRun(dir, 'build', { runId: 'wf_1', tokens: 899616 }, wrapper(buildResult));
  assert.equal(e.ok, true);
  assert.equal(e.build.green, true);
  assert.equal(e.build.rounds, 3);
});

test('a wrapper whose result arrives as a JSON string is unwrapped too', () => {
  const dir = tmp();
  const e = L.addRun(dir, 'build', { runId: 'wf_1', tokens: 1 }, wrapper(JSON.stringify(buildResult)));
  assert.equal(e.build.rounds, 3);
});

test('the phase result itself still works, as before', () => {
  const dir = tmp();
  const e = L.addRun(dir, 'build', { runId: 'wf_1', tokens: 1 }, buildResult);
  assert.equal(e.build.rounds, 3);
});

test('a failed phase result is recorded as failed, not refused', () => {
  const dir = tmp();
  const e = L.addRun(dir, 'build', { runId: 'wf_1', tokens: 1 }, { ok: false, error: 'tests passed too early' });
  assert.equal(e.ok, false);
});

test('a result that is not a phase result is refused and nothing is appended', () => {
  const dir = tmp();
  for (const bad of [{ summary: 'x', agentCount: 2 }, { result: { green: true } }, { green: true, rounds: 1 }, 'text', 7, []]) {
    assert.throws(() => L.addRun(dir, 'build', { runId: 'wf_1', tokens: 1 }, bad), /phase result/, JSON.stringify(bad));
  }
  assert.deepStrictEqual(L.readAll(dir), []);
});

test('no result at all is still accepted, as before, and recorded as not ok', () => {
  const dir = tmp();
  const e = L.addRun(dir, 'plan', { runId: 'wf_2', tokens: 10 }, null);
  assert.equal(e.ok, false);
});

test('ledger add on the command line takes a saved wrapper end to end, and refuses a bad file', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'row.json'), JSON.stringify({ runId: 'wf_3', tokens: 5 }));
  fs.writeFileSync(path.join(dir, 'wrapper.json'), JSON.stringify(wrapper(buildResult)));
  const ok = cli(dir, 'ledger', 'add', '--phase', 'build', '--row', 'row.json', '--result', 'wrapper.json');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(L.readAll(dir).at(-1).build.rounds, 3);

  fs.writeFileSync(path.join(dir, 'junk.json'), JSON.stringify({ summary: 'x' }));
  const bad = cli(dir, 'ledger', 'add', '--phase', 'build', '--row', 'row.json', '--result', 'junk.json');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr + bad.stdout, /phase result/);
  assert.equal(L.readAll(dir).length, 1, 'the bad file appended nothing');
});

test('the build command no longer says to save the wrapper in a way the ledger could not read', () => {
  const text = fs.readFileSync(path.join(PLUGIN, 'commands', 'build.md'), 'utf8');
  assert.match(text, /wrapper/i, 'the command names the wrapper and says the ledger unwraps it');
});

// --- W1: the model for the build agents is a setting, not a hand patch -------------------------

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const BUILD = path.join(PLUGIN, 'phases', 'build.js');

// A build that goes red once, so write-tests, attempt-1, diagnose-1 and attempt-2 all run.
async function runBuild(args) {
  let attempts = 0;
  return loadWorkflow(BUILD)({ plan: 'PLAN-x.md', briefs: [], ...args }, async (c) => {
    if (c.label === 'write-tests') return { filesWritten: ['a.test.js'], testsFailAsExpected: true, testCommand: 'npm test', summary: 's' };
    if (c.label.startsWith('attempt-')) {
      attempts += 1;
      return { green: attempts > 1, filesChanged: ['a.js'], failureOutput: attempts > 1 ? '' : 'red', summary: 's' };
    }
    if (c.label.startsWith('diagnose-')) return { cause: 'c', signature: 's', suggestedFix: 'f', confidence: 'high' };
    return null;
  });
}
const modelOf = (calls, label) => calls.find((c) => c.label === label).model;

test('W1 by default the test writer and the implementer run on Sonnet, and the diagnosis on the session model', async () => {
  const { calls } = await runBuild({});
  assert.equal(modelOf(calls, 'write-tests'), 'sonnet');
  assert.equal(modelOf(calls, 'attempt-1'), 'sonnet');
  assert.equal(modelOf(calls, 'attempt-2'), 'sonnet');
  assert.equal(modelOf(calls, 'diagnose-1'), undefined);
});

test('W1 implementerModel and diagnoserModel in the arguments change them; inherit means the session model', async () => {
  const a = await runBuild({ implementerModel: 'opus', diagnoserModel: 'haiku' });
  assert.equal(modelOf(a.calls, 'write-tests'), 'opus');
  assert.equal(modelOf(a.calls, 'attempt-1'), 'opus');
  assert.equal(modelOf(a.calls, 'diagnose-1'), 'haiku');

  const b = await runBuild({ implementerModel: 'inherit' });
  for (const label of ['write-tests', 'attempt-1', 'attempt-2']) assert.equal(modelOf(b.calls, label), undefined, label);
});

test('W1 a model name that is not one is refused before any agent starts', async () => {
  for (const bad of ['gpt-4', 'sonnet 4', '', 42]) {
    const calls = [];
    const r = await loadWorkflow(BUILD)({ plan: 'PLAN-x.md', briefs: [], implementerModel: bad }, async (c) => {
      calls.push(c);
      return null;
    });
    if (bad === '') {
      assert.ok(calls.length > 0, 'an empty string is the same as unset, so the default applies');
      continue;
    }
    assert.equal(r.result.ok, false, String(bad));
    assert.match(r.result.error, /implementerModel/);
    assert.equal(calls.length, 0, `no agent for ${JSON.stringify(bad)}`);
  }
});

test('W1 a full model id is accepted', async () => {
  const { calls } = await runBuild({ implementerModel: 'claude-sonnet-5-5' });
  assert.equal(modelOf(calls, 'attempt-1'), 'claude-sonnet-5-5');
});

function stagedArgs(dir, env, extraArgs = []) {
  const e = { ...process.env, ...env };
  if (!('ULTIMATE_WORKFLOW_BUILD_MODEL' in env)) delete e.ULTIMATE_WORKFLOW_BUILD_MODEL;
  const r = spawnSync(process.execPath, [CLI, 'script', '--phase', 'build', ...extraArgs], { cwd: dir, encoding: 'utf8', env: e });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(/const EMBEDDED_ARGS = (.*)/.exec(fs.readFileSync(JSON.parse(r.stdout).scriptPath, 'utf8'))[1]);
}

test('W1 experts.js script carries ULTIMATE_WORKFLOW_BUILD_MODEL as the implementer model, and an arguments file wins over it', () => {
  const dir = tmp();
  assert.equal(stagedArgs(dir, { ULTIMATE_WORKFLOW_BUILD_MODEL: 'haiku' }).implementerModel, 'haiku');
  assert.equal(stagedArgs(dir, {}).implementerModel, undefined, 'unset: the phase default applies');

  fs.writeFileSync(path.join(dir, 'build.args.json'), JSON.stringify({ implementerModel: 'opus', diagnoserModel: 'sonnet' }));
  const withFile = stagedArgs(dir, { ULTIMATE_WORKFLOW_BUILD_MODEL: 'haiku' }, ['--args-file', 'build.args.json']);
  assert.equal(withFile.implementerModel, 'opus');
  assert.equal(withFile.diagnoserModel, 'sonnet');
});
