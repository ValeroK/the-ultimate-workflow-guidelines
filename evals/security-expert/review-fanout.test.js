'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { loadWorkflow } = require('./lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const REVIEW = path.join(PLUGIN, 'workflows', 'review.js');
const ROUTE = path.join(PLUGIN, 'experts', 'route.js');
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

// What the router prints, passed through verbatim: the proof that it ran.
const routed = (experts, extra = {}) => ({ routing: { experts, ...extra } });

// ---- the routing requirement ---------------------------------------------

test('a review with no routing and no explicit skip stops before anything is spawned, and says how to fix it', async () => {
  const run = loadWorkflow(REVIEW);
  const { result, calls } = await run({ range: 'main..HEAD' }, clean);
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /routing/i);
  assert.match(result.error, /route\.js/);
  assert.match(result.error, /skipRouting/);
  assert.strictEqual(calls.length, 0, 'a silent skip of the router must become a loud failure');
});

test('routing that is not the router\'s output is rejected, not guessed at', async () => {
  for (const routing of ['security', null, 42, {}, { experts: 'security' }, { experts: [1] }, { experts: [null] }, []]) {
    const run = loadWorkflow(REVIEW);
    const { result, calls } = await run({ routing }, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(routing));
    assert.match(result.error, /routing/i);
    assert.strictEqual(calls.length, 0);
  }
});

test('skipRouting is an explicit, visible choice: the core lenses run and the result says experts were not considered', async () => {
  const run = loadWorkflow(REVIEW);
  const { result, calls } = await run({ skipRouting: true }, clean);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.strictEqual(result.routingSkipped, true);
  assert.match(result.summary, /not considered|skipped/i);
});

test('skipRouting together with routing or with experts is contradictory and refused', async () => {
  for (const args of [
    { skipRouting: true, ...routed([]) },
    { skipRouting: true, experts: ['security'], ...EXP },
  ]) {
    const run = loadWorkflow(REVIEW);
    const { result, calls } = await run(args, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(args));
    assert.match(result.error, /skipRouting/);
    assert.strictEqual(calls.length, 0);
  }
});

test('the router\'s empty answer is a valid routing: nothing applies, so only the core lenses run', async () => {
  const run = loadWorkflow(REVIEW);
  const { result, calls } = await run(routed([]), clean);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.ok(!result.routingSkipped);
  assert.deepStrictEqual(result.experts, []);
});

test('an explicit experts list is accepted only when it agrees with the routing, in any order', async () => {
  const same = await loadWorkflow(REVIEW)({ ...EXP, experts: ['security'], ...routed(['security']) }, clean);
  assert.strictEqual(same.result.ok, true);

  const mismatch = await loadWorkflow(REVIEW)({ ...EXP, experts: [], ...routed(['security']) }, clean);
  assert.strictEqual(mismatch.result.ok, false);
  assert.match(mismatch.result.error, /experts/);
  assert.match(mismatch.result.error, /security/);
  assert.strictEqual(mismatch.calls.length, 0, 'a transcription error between the router and the workflow must not run a different review');

  const alone = await loadWorkflow(REVIEW)({ ...EXP, experts: ['security'] }, clean);
  assert.strictEqual(alone.result.ok, false, 'an experts list with no routing is not proof the router ran');
  assert.strictEqual(alone.calls.length, 0);
});

test('the result records what the router said, so a report shows which experts were considered and why', async () => {
  const run = loadWorkflow(REVIEW);
  const { result } = await run({ ...EXP, ...routed(['security'], { planned: [], added: ['security'] }) }, clean);
  assert.deepStrictEqual(result.experts, ['security']);
  assert.deepStrictEqual(result.routing, { experts: ['security'], planned: [], added: ['security'] });
});

test('round trip: the real router\'s printed JSON is accepted by the real workflow and selects the expert', async () => {
  const r = spawnSync(process.execPath, [ROUTE], { input: 'M\tuv.lock\nM\tREADME.md\n', encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const routing = JSON.parse(r.stdout);
  const { result, calls } = await loadWorkflow(REVIEW)({ ...EXP, routing }, clean);
  assert.strictEqual(result.ok, true);
  assert.ok(lensCalls(calls).some((c) => c.label === 'security' && c.agentType === 'uw-expert-security'));

  const none = JSON.parse(spawnSync(process.execPath, [ROUTE], { input: 'M\tREADME.md\n', encoding: 'utf8' }).stdout);
  const quiet = await loadWorkflow(REVIEW)({ routing: none }, clean);
  assert.strictEqual(quiet.result.ok, true);
  assert.deepStrictEqual(lensCalls(quiet.calls).map((c) => c.label), CORE);
});

// ---- fan-out ---------------------------------------------------------------

test('baseline: with an empty routing, exactly the core lenses run, all as uw-reviewer', async () => {
  const { calls, result } = await loadWorkflow(REVIEW)(routed([]), clean);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.ok(lensCalls(calls).every((c) => c.agentType === 'uw-reviewer'));
  assert.strictEqual(result.ok, true);
});

test('no expert and no expert material reaches any prompt when nothing routes', async () => {
  for (const args of [routed([]), { ...routed([]), deps: DEPS }, { skipRouting: true }, { skipRouting: true, deps: DEPS }]) {
    const { calls } = await loadWorkflow(REVIEW)(args, clean);
    assert.strictEqual(calls.filter((c) => /expert/.test(c.agentType)).length, 0, JSON.stringify(args));
    for (const c of calls) {
      assert.ok(!/experts\/security|diff-review|GHSA-/.test(c.prompt), `prompt for ${c.label} mentions expert material`);
    }
  }
});

test('a routed security expert adds one security lens run by the expert agent, after the core lenses', async () => {
  const { calls } = await loadWorkflow(REVIEW)({ ...EXP, ...routed(['security']), range: 'main..HEAD', deps: DEPS }, clean);
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

test('a comma-separated explicit list is read the same way as an array when it agrees with the routing', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)({ ...EXP, experts: 'security', ...routed(['security']) }, clean);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), [...CORE, 'security']);
});

test('duplicates in the routing collapse to one run', async () => {
  const { calls } = await loadWorkflow(REVIEW)({ ...EXP, ...routed(['security', 'security']) }, clean);
  assert.strictEqual(lensCalls(calls).filter((c) => c.label === 'security').length, 1);
});

test('the set of experts comes from the registry, not a hardcoded name, and order follows the list', async () => {
  const withDevops = (src) => {
    const out = src.replace(/(const EXPERTS = \{)/, "$1 devops: 'uw-expert-devops',");
    assert.notStrictEqual(out, src, 'EXPERTS registry literal not found in review.js');
    return out;
  };
  const run = loadWorkflow(REVIEW, { transform: withDevops });
  const a = await run({ ...EXP, ...routed(['devops', 'security']) }, clean);
  assert.deepStrictEqual(lensCalls(a.calls).slice(CORE.length).map((c) => [c.label, c.agentType]), [
    ['devops', 'uw-expert-devops'],
    ['security', 'uw-expert-security'],
  ]);
  const b = await run({ ...EXP, ...routed(['security']) }, clean);
  assert.deepStrictEqual(lensCalls(b.calls).slice(CORE.length).map((c) => c.label), ['security']);
});

test('one known and one unknown expert is an error naming the unknown one, and nothing runs', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)({ ...EXP, ...routed(['security', 'frobnicator']) }, clean);
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /frobnicator/);
  assert.ok(!/security,/.test(result.error), 'only the unknown name is blamed');
  assert.strictEqual(calls.length, 0, 'a bad plan must not half-run');
});

test('expert findings flow through the same verify and merge path as other lenses', async () => {
  const respond = (call) => {
    if (call.phase === 'Lenses') {
      return call.label === 'security' ? { lensVerdict: 'one injection', findings: [finding()] } : clean(call);
    }
    return { verdicts: [{ index: 0, verdict: 'confirmed', reason: 'reachable from the CLI' }] };
  };
  const { result, calls } = await loadWorkflow(REVIEW)({ ...EXP, ...routed(['security']) }, respond);
  const verify = calls.filter((c) => c.phase === 'Verify');
  assert.strictEqual(verify.length, 1);
  assert.ok(verify[0].prompt.includes('user input reaches a shell command'), 'skeptic is shown the expert finding');
  assert.strictEqual(result.findings.length, 1);
  assert.strictEqual(result.findings[0].lens, 'security');
});

test('an expert that fails is reported as not run, never as a clean review', async () => {
  const respond = (call) => {
    if (call.label === 'security') throw new Error('agent type uw-expert-security not found');
    return clean(call);
  };
  const { result } = await loadWorkflow(REVIEW)({ ...EXP, ...routed(['security']) }, respond);
  assert.deepStrictEqual(result.failedLenses, ['security']);
  assert.match(result.summary, /security did not run/);
  assert.doesNotMatch(result.summary, /Every lens ran/);
});

test('an expert prompt points at the diff file and references, and never tells it to run a shell command', async () => {
  const { calls } = await loadWorkflow(REVIEW)({ ...EXP, ...routed(['security']), range: 'main..HEAD' }, clean);
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
  for (const extra of [{ expertsDir: '/plugin/experts' }, { diffFile: 'r.diff' }, {}]) {
    const { result, calls } = await loadWorkflow(REVIEW)({ ...routed(['security']), ...extra }, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(extra));
    assert.match(result.error, /diffFile|expertsDir/);
    assert.strictEqual(calls.length, 0, 'an expert that cannot see the diff must not run blind');
  }
});

test('the pre-existing optional security LENS still works: a plain reviewer reading the diff with git, never the expert path', async () => {
  const { calls, result } = await loadWorkflow(REVIEW)({ ...routed([]), lenses: 'security', range: 'main..HEAD' }, clean);
  assert.strictEqual(result.ok, true);
  const sec = lensCalls(calls).find((c) => c.label === 'security');
  assert.ok(sec, 'the security lens ran');
  assert.strictEqual(sec.agentType, 'uw-reviewer');
  assert.ok(sec.prompt.includes('git diff main..HEAD'));
  assert.ok(!/undefined|references|domain expert/.test(sec.prompt), 'no expert text and no unset values in a plain lens prompt');
});

test('asking for the lens and the expert of the same name runs only the expert', async () => {
  const { calls } = await loadWorkflow(REVIEW)({ ...EXP, lenses: 'security', ...routed(['security']) }, clean);
  const secs = lensCalls(calls).filter((c) => c.label === 'security');
  assert.strictEqual(secs.length, 1);
  assert.strictEqual(secs[0].agentType, 'uw-expert-security');
});
