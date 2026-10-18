'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadWorkflow } = require('./lib/run-workflow.js');

const REVIEW = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'workflows', 'review.js');
const CORE = ['correctness', 'simplicity', 'surgical-scope', 'test-coverage'];

const clean = (call) => ({ findings: [], lensVerdict: `clean through ${call.label}` });

const finding = (over = {}) => ({
  file: 'src/run.js',
  line: 12,
  what: 'user input reaches a shell command',
  howItFails: 'a branch name containing ; runs arbitrary commands',
  confidence: 'high',
  ...over,
});

const lensCalls = (calls) => calls.filter((c) => c.phase === 'Lenses');
const EXP = { diffFile: '.ultimate-workflow/review.diff', expertsDir: '/plugin/experts' };
const DEPS = { tier1: [{ name: 'lodash', version: '4.17.15', advisory: 'GHSA-p6mc-m468-83gw' }] };

test('baseline: with no experts, exactly the core lenses run, all as uw-reviewer', async () => {
  const run = loadWorkflow(REVIEW);
  const { calls, result } = await run({}, clean);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.ok(lensCalls(calls).every((c) => c.agentType === 'uw-reviewer'));
  assert.strictEqual(result.ok, true);
});

test('empty and absent experts spawn no expert and leak no expert material into any prompt', async () => {
  for (const args of [{}, { experts: [] }, { experts: '' }, { experts: undefined }, { deps: DEPS }]) {
    const run = loadWorkflow(REVIEW);
    const { calls } = await run(args, clean);
    assert.strictEqual(calls.filter((c) => /expert/.test(c.agentType)).length, 0, JSON.stringify(args));
    for (const c of calls) {
      assert.ok(!/experts\/security|diff-review|GHSA-/.test(c.prompt), `prompt for ${c.label} mentions expert material`);
    }
  }
});

test('experts: ["security"] adds one security lens run by the expert agent, after the core lenses', async () => {
  const run = loadWorkflow(REVIEW);
  const { calls } = await run({ ...EXP, experts: ['security'], range: 'main..HEAD', deps: DEPS }, clean);
  const lenses = lensCalls(calls);
  assert.deepStrictEqual(lenses.map((c) => c.label), [...CORE, 'security']);
  const sec = lenses.find((c) => c.label === 'security');
  assert.strictEqual(sec.agentType, 'uw-expert-security');
  assert.ok(sec.prompt.includes('main..HEAD'), 'expert is told which range to review');
  assert.ok(sec.prompt.includes('GHSA-p6mc-m468-83gw'), 'expert receives the dependency audit JSON');
  for (const c of lenses.filter((c) => c.label !== 'security')) {
    assert.strictEqual(c.agentType, 'uw-reviewer');
    assert.ok(!c.prompt.includes('GHSA-p6mc-m468-83gw'), `${c.label} must not receive the dependency audit`);
  }
});

test('a comma-separated string is accepted the same way as an array', async () => {
  const run = loadWorkflow(REVIEW);
  const { calls } = await run({ ...EXP, experts: 'security' }, clean);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), [...CORE, 'security']);
});

test('duplicates collapse to one run', async () => {
  const run = loadWorkflow(REVIEW);
  const { calls } = await run({ ...EXP, experts: ['security', 'security'] }, clean);
  assert.strictEqual(lensCalls(calls).filter((c) => c.label === 'security').length, 1);
});

test('the set of experts comes from the registry, not a hardcoded name, and order follows the list', async () => {
  const withDevops = (src) => {
    const out = src.replace(/(const EXPERTS = \{)/, "$1 devops: 'uw-expert-devops',");
    assert.notStrictEqual(out, src, 'EXPERTS registry literal not found in review.js');
    return out;
  };
  const run = loadWorkflow(REVIEW, { transform: withDevops });
  const a = await run({ ...EXP, experts: ['devops', 'security'] }, clean);
  assert.deepStrictEqual(lensCalls(a.calls).slice(CORE.length).map((c) => [c.label, c.agentType]), [
    ['devops', 'uw-expert-devops'],
    ['security', 'uw-expert-security'],
  ]);
  const b = await run({ ...EXP, experts: ['security'] }, clean);
  assert.deepStrictEqual(lensCalls(b.calls).slice(CORE.length).map((c) => c.label), ['security']);
});

test('one known and one unknown expert is an error naming the unknown one, and nothing runs', async () => {
  const run = loadWorkflow(REVIEW);
  const { result, calls } = await run({ ...EXP, experts: ['security', 'frobnicator'] }, clean);
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /frobnicator/);
  assert.ok(!/security,/.test(result.error), 'only the unknown name is blamed');
  assert.strictEqual(calls.length, 0, 'a bad plan must not half-run');
});

test('expert findings flow through the same verify and merge path as other lenses', async () => {
  const run = loadWorkflow(REVIEW);
  const respond = (call) => {
    if (call.phase === 'Lenses') {
      return call.label === 'security'
        ? { lensVerdict: 'one injection', findings: [finding()] }
        : clean(call);
    }
    return { verdicts: [{ index: 0, verdict: 'confirmed', reason: 'reachable from the CLI' }] };
  };
  const { result, calls } = await run({ ...EXP, experts: ['security'] }, respond);
  const verify = calls.filter((c) => c.phase === 'Verify');
  assert.strictEqual(verify.length, 1);
  assert.ok(verify[0].prompt.includes('user input reaches a shell command'), 'skeptic is shown the expert finding');
  assert.strictEqual(result.findings.length, 1);
  assert.strictEqual(result.findings[0].lens, 'security');
});

test('an expert that fails is reported as not run, never as a clean review', async () => {
  const run = loadWorkflow(REVIEW);
  const respond = (call) => {
    if (call.label === 'security') throw new Error('agent type uw-expert-security not found');
    return clean(call);
  };
  const { result } = await run({ ...EXP, experts: ['security'] }, respond);
  assert.deepStrictEqual(result.failedLenses, ['security']);
  assert.match(result.summary, /security did not run/);
  assert.doesNotMatch(result.summary, /Every lens ran/);
});

test('an expert prompt points at the diff file and references, and never tells it to run a shell command', async () => {
  const run = loadWorkflow(REVIEW);
  const { calls } = await run({ ...EXP, experts: ['security'], range: 'main..HEAD' }, clean);
  const sec = lensCalls(calls).find((c) => c.label === 'security');
  assert.ok(sec.prompt.includes('.ultimate-workflow/review.diff'), 'tells the expert where the diff is');
  assert.ok(sec.prompt.includes('/plugin/experts/security/references/'), 'tells the expert where its references are');
  assert.ok(!/git diff/.test(sec.prompt), 'the expert has no shell, so it must not be told to run git');
  for (const c of lensCalls(calls).filter((c) => c.label !== 'security')) {
    assert.ok(c.prompt.includes('git diff main..HEAD'), `${c.label} still reads the diff with git`);
    assert.ok(!c.prompt.includes('/plugin/experts'), `${c.label} must not see the expert directory`);
  }
});

test('experts without a diff file or a references directory stop the run before anything is spawned', async () => {
  for (const args of [
    { experts: ['security'], expertsDir: '/plugin/experts' },
    { experts: ['security'], diffFile: 'r.diff' },
    { experts: ['security'] },
  ]) {
    const run = loadWorkflow(REVIEW);
    const { result, calls } = await run(args, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(args));
    assert.match(result.error, /diffFile|expertsDir/);
    assert.strictEqual(calls.length, 0, 'an expert that cannot see the diff must not run blind');
  }
});
