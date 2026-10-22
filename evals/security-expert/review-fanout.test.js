'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadWorkflow } = require('./lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const REVIEW = path.join(PLUGIN, 'workflows', 'review.js');
const { list } = require(path.join(PLUGIN, 'experts', 'experts.js'));
const CORE = ['correctness', 'simplicity', 'surgical-scope', 'test-coverage'];

const clean = (call) => ({ findings: [], lensVerdict: `clean through ${call.label}` });
const answer = (...names) => ({ experts: names.map((name) => ({ name, why: `because of ${name}` })) });

const finding = (over = {}) => ({
  file: 'src/run.js',
  line: 12,
  what: 'user input reaches a shell command',
  howItFails: 'a branch name containing ; runs arbitrary commands',
  confidence: 'high',
  ...over,
});

const lensCalls = (calls) => calls.filter((c) => c.phase === 'Lenses');
const recheckCalls = (calls) => calls.filter((c) => c.label === 'recheck');

// What `node experts/experts.js list` prints, taken from the real discovery.
const AVAILABLE = list(PLUGIN).experts;
const devops = { name: 'devops', agent: 'uw-expert-devops', description: 'DevOps expert. Applies when the pipeline or deployment changes.', stages: ['plan', 'review'] };
const planOnly = { name: 'planonlyfixture', agent: 'uw-expert-planonlyfixture', description: 'A fixture expert that joins only the plan stage. Applies when module boundaries change.', stages: ['plan'] };

const EXP = { diffFile: '.ultimate-workflow/review.diff', expertsDir: '/plugin/experts', skills: {} };
const base = (over = {}) => ({ available: AVAILABLE, experts: [], ...EXP, ...over });
const DEPS = { tier1: [{ name: 'lodash', version: '4.17.15', advisory: 'GHSA-p6mc-m468-83gw' }] };

// The recheck answers with `names`; every other agent is clean.
const rechecking = (...names) => (call) => (call.label === 'recheck' ? answer(...names) : clean(call));

// ---- what the review must be told ------------------------------------------

test('a review that was not told which experts exist stops before anything is spawned, and says how to fix it', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)({ range: 'main..HEAD' }, clean);
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /available/);
  assert.match(result.error, /experts\.js list/);
  assert.match(result.error, /noExperts/);
  assert.strictEqual(calls.length, 0, 'a silent skip of discovery must become a loud failure');
});

test('a list that is not the discovery output is rejected, not guessed at', async () => {
  for (const available of ['security', 42, { name: 'security' }, [{ name: 'security' }], [null], [{ name: 'a', agent: 'b', stages: 'plan' }]]) {
    const { result, calls } = await loadWorkflow(REVIEW)({ available, ...EXP }, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(available));
    assert.match(result.error, /experts\.js list/);
    assert.strictEqual(calls.length, 0);
  }
});

test('noExperts is an explicit, visible choice: the core lenses run and the result says experts were not considered', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)({ noExperts: true }, clean);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.strictEqual(recheckCalls(calls).length, 0);
  assert.match(result.expertLane.skipped, /not considered/);
});

test('noExperts together with experts or expertsOnly is contradictory and refused', async () => {
  for (const args of [{ noExperts: true, experts: ['security'], available: AVAILABLE }, { noExperts: true, expertsOnly: true }]) {
    const { result, calls } = await loadWorkflow(REVIEW)(args, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(args));
    assert.match(result.error, /noExperts/);
    assert.strictEqual(calls.length, 0);
  }
});

test('an empty list of experts is valid: nothing is installed, so only the core lenses run and no recheck is asked', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)({ available: [] }, clean);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.strictEqual(recheckCalls(calls).length, 0);
  assert.deepStrictEqual(result.expertLane.available, []);
});

test('a plan that names an expert that is not installed stops the run, naming it', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)(base({ experts: ['security', 'frobnicator'] }), clean);
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /frobnicator/);
  assert.ok(!/security,/.test(result.error), 'only the unknown name is blamed');
  assert.strictEqual(calls.length, 0, 'a bad plan must not half-run');
});

test('experts need a diff file and a references directory, so the run stops before anything is spawned without them', async () => {
  for (const extra of [{ diffFile: undefined }, { expertsDir: undefined }, { skills: undefined }]) {
    const { result, calls } = await loadWorkflow(REVIEW)({ ...base(), ...extra }, clean);
    assert.strictEqual(result.ok, false, JSON.stringify(extra));
    assert.match(result.error, /diffFile|expertsDir|skills/);
    assert.strictEqual(calls.length, 0, 'an expert that cannot see the diff must not run blind');
  }
});

// ---- the recheck: ask again, add only ---------------------------------------

test('the recheck is asked once, of the real diff, with every available expert and its description in front of the model', async () => {
  const { calls } = await loadWorkflow(REVIEW)(base({ available: [...AVAILABLE, devops] }), rechecking());
  const [ask] = recheckCalls(calls);
  assert.strictEqual(recheckCalls(calls).length, 1);
  assert.strictEqual(ask.phase, 'Recheck');
  assert.ok(ask.prompt.includes('.ultimate-workflow/review.diff'), 'it reads the saved diff');
  for (const e of [...AVAILABLE, devops]) {
    assert.ok(ask.prompt.includes(`- ${e.name}: ${e.description}`), `${e.name} and its description are listed`);
  }
});

test('the recheck can add an expert the plan did not name, and the expert then runs as its own agent type', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)(base(), rechecking('security'));
  assert.deepStrictEqual(result.expertLane.added, ['security']);
  assert.deepStrictEqual(result.expertLane.selected, ['security']);
  assert.strictEqual(result.expertLane.recheck, true);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), [...CORE, 'security']);
  assert.strictEqual(lensCalls(calls).find((c) => c.label === 'security').agentType, 'uw-expert-security');
});

test('the recheck can never remove a planned expert, whatever it answers', async () => {
  for (const respond of [rechecking(), rechecking('devops'), (c) => (c.label === 'recheck' ? { experts: [] } : clean(c))]) {
    const { result, calls } = await loadWorkflow(REVIEW)(base({ available: [...AVAILABLE, devops], experts: ['security'] }), respond);
    assert.ok(result.expertLane.selected.includes('security'), 'security stays selected');
    assert.ok(lensCalls(calls).some((c) => c.label === 'security'), 'and still reviews');
  }
});

test('a name the model invents is ignored and reported, never applied', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)(base(), rechecking('security', 'ghost'));
  assert.deepStrictEqual(result.expertLane.selected, ['security']);
  assert.deepStrictEqual(result.expertLane.ignoredUnknown, ['ghost']);
  assert.ok(!lensCalls(calls).some((c) => c.label === 'ghost'));
});

test('a failed recheck is visible, runs the planned experts only, and is not recorded as a recheck', async () => {
  const respond = (c) => (c.label === 'recheck' ? null : clean(c));
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), respond);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.expertLane.recheck, false);
  assert.strictEqual(result.expertLane.recheckFailed, true);
  assert.deepStrictEqual(result.expertLane.selected, ['security']);
});

test('recheck: false skips the question and says so', async () => {
  const { result, calls } = await loadWorkflow(REVIEW)(base({ experts: ['security'], recheck: false }), clean);
  assert.strictEqual(recheckCalls(calls).length, 0);
  assert.strictEqual(result.expertLane.recheck, false);
  assert.ok(!result.expertLane.recheckFailed);
});

// ---- fan-out -----------------------------------------------------------------

test('baseline: with nothing selected, exactly the core lenses run, all as uw-reviewer', async () => {
  const { calls, result } = await loadWorkflow(REVIEW)(base(), rechecking());
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.ok(lensCalls(calls).every((c) => c.agentType === 'uw-reviewer'));
  assert.strictEqual(result.ok, true);
});

test('no expert material reaches any core lens prompt, whether or not an expert runs', async () => {
  for (const args of [base(), base({ deps: DEPS }), base({ experts: ['security'], deps: DEPS })]) {
    const { calls } = await loadWorkflow(REVIEW)(args, rechecking());
    for (const c of lensCalls(calls).filter((x) => x.agentType === 'uw-reviewer')) {
      assert.ok(!/experts\/security|references\/review|GHSA-/.test(c.prompt), `prompt for ${c.label} mentions expert material`);
    }
  }
});

test('the expert is the only lens that receives the dependency audit, and is told where its references and the diff are', async () => {
  const { calls } = await loadWorkflow(REVIEW)(base({ experts: ['security'], range: 'main..HEAD', deps: DEPS }), rechecking());
  const sec = lensCalls(calls).find((c) => c.label === 'security');
  assert.ok(sec.prompt.includes('GHSA-p6mc-m468-83gw'), 'expert receives the dependency audit JSON');
  assert.ok(sec.prompt.includes('main..HEAD'), 'expert is told which range to review');
  assert.ok(sec.prompt.includes('.ultimate-workflow/review.diff'), 'tells the expert where the diff is');
  assert.ok(sec.prompt.includes('/plugin/experts/security/references/review.md'), 'and which reference to read first for this stage');
  assert.match(sec.prompt, /Stage: review/);
  assert.ok(!/git diff/.test(sec.prompt), 'the expert is handed the diff as a file, not told to run git');
  for (const c of lensCalls(calls).filter((x) => x.label !== 'security')) {
    assert.ok(!c.prompt.includes('GHSA-'), `${c.label} must not receive the dependency audit`);
    assert.ok(c.prompt.includes('git diff main..HEAD'), `${c.label} still reads the diff with git`);
  }
});

test('with a plan file the expert is told to hold the diff to what it required at planning time', async () => {
  const withPlan = await loadWorkflow(REVIEW)(base({ experts: ['security'], plan: 'PLAN-x.md' }), rechecking());
  const sec = lensCalls(withPlan.calls).find((c) => c.label === 'security');
  assert.ok(sec.prompt.includes('PLAN-x.md') && /Expert input/.test(sec.prompt));
  const without = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), rechecking());
  assert.ok(!/Expert input/.test(lensCalls(without.calls).find((c) => c.label === 'security').prompt));
});

test('experts are not hardcoded: a second expert from the list runs under the agent name the list gives, in list order', async () => {
  const { calls, result } = await loadWorkflow(REVIEW)(base({ available: [...AVAILABLE, devops], experts: ['devops', 'security'] }), clean);
  assert.deepStrictEqual(lensCalls(calls).slice(CORE.length).map((c) => [c.label, c.agentType]), [
    ['devops', 'uw-expert-devops'],
    ['security', 'uw-expert-security'],
  ]);
  assert.deepStrictEqual(result.expertLane.ran, ['devops', 'security']);
});

test('an expert that does not take part at review is selected but does not review', async () => {
  const { calls, result } = await loadWorkflow(REVIEW)(base({ available: [...AVAILABLE, planOnly], experts: ['planonlyfixture'] }), clean);
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), CORE);
  assert.deepStrictEqual(result.expertLane.selected, ['planonlyfixture']);
  assert.deepStrictEqual(result.expertLane.ran, []);
});

test('duplicates in the plan collapse to one run', async () => {
  const { calls } = await loadWorkflow(REVIEW)(base({ experts: ['security', 'security'] }), rechecking());
  assert.strictEqual(lensCalls(calls).filter((c) => c.label === 'security').length, 1);
});

test('a comma-separated plan list is read the same way as an array', async () => {
  const { calls } = await loadWorkflow(REVIEW)(base({ experts: 'security' }), rechecking());
  assert.deepStrictEqual(lensCalls(calls).map((c) => c.label), [...CORE, 'security']);
});

test('expertsOnly runs just the experts: no core lens, and a clean "nothing applies" when none are selected', async () => {
  const only = await loadWorkflow(REVIEW)(base({ expertsOnly: true }), rechecking('security'));
  assert.deepStrictEqual(lensCalls(only.calls).map((c) => c.label), ['security']);

  const none = await loadWorkflow(REVIEW)(base({ expertsOnly: true }), rechecking());
  assert.strictEqual(none.result.ok, true, 'no expert applying is a result, not "every lens failed"');
  assert.strictEqual(none.calls.filter((c) => c.phase === 'Lenses').length, 0);
  assert.match(none.result.summary, /no expert applies/i);
  assert.strictEqual(none.result.expertLane.recheck, true);
});

// ---- findings and failures -------------------------------------------------

test('expert findings flow through the same verify and merge path as other lenses', async () => {
  const respond = (call) => {
    if (call.label === 'recheck') return answer();
    if (call.phase === 'Lenses') {
      return call.label === 'security' ? { lensVerdict: 'one injection', findings: [finding()] } : clean(call);
    }
    return { verdicts: [{ index: 0, verdict: 'confirmed', reason: 'reachable from the CLI' }] };
  };
  const { result, calls } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), respond);
  const verify = calls.filter((c) => c.phase === 'Verify');
  assert.strictEqual(verify.length, 1);
  assert.ok(verify[0].prompt.includes('user input reaches a shell command'), 'skeptic is shown the expert finding');
  assert.strictEqual(result.findings.length, 1);
  assert.strictEqual(result.findings[0].lens, 'security');
});

test('an expert that fails is reported as not run, never as a clean review', async () => {
  const respond = (call) => {
    if (call.label === 'recheck') return answer();
    if (call.label === 'security') throw new Error('agent type uw-expert-security not found');
    return clean(call);
  };
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), respond);
  assert.deepStrictEqual(result.failedLenses, ['security']);
  assert.deepStrictEqual(result.expertLane.failed, ['security']);
  assert.deepStrictEqual(result.expertLane.ran, [], 'a failed expert leaves no evidence of having reviewed');
  assert.match(result.summary, /security did not run/);
  assert.doesNotMatch(result.summary, /Every lens ran/);
});

test('the pre-existing optional security LENS still works when no expert is selected: a plain reviewer reading the diff with git', async () => {
  const { calls, result } = await loadWorkflow(REVIEW)(base({ lenses: 'security', range: 'main..HEAD' }), rechecking());
  assert.strictEqual(result.ok, true);
  const sec = lensCalls(calls).find((c) => c.label === 'security');
  assert.ok(sec, 'the security lens ran');
  assert.strictEqual(sec.agentType, 'uw-reviewer');
  assert.ok(sec.prompt.includes('git diff main..HEAD'));
  assert.ok(!/undefined|references|domain expert/.test(sec.prompt), 'no expert text and no unset values in a plain lens prompt');
});

test('asking for the lens and the expert of the same name runs only the expert', async () => {
  const { calls } = await loadWorkflow(REVIEW)(base({ lenses: 'security', experts: ['security'] }), rechecking());
  const secs = lensCalls(calls).filter((c) => c.label === 'security');
  assert.strictEqual(secs.length, 1);
  assert.strictEqual(secs[0].agentType, 'uw-expert-security');
});

test('the result carries everything `experts.js record` needs, and nothing the model wrote', async () => {
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), rechecking());
  assert.deepStrictEqual(Object.keys(result.expertLane).sort(), ['added', 'available', 'failed', 'findings', 'planned', 'ran', 'recheck', 'selected', 'skillsDropped', 'skillsLoaded', 'stage'].sort());
  assert.strictEqual(result.expertLane.stage, 'review');
  assert.deepStrictEqual(result.experts, result.expertLane.selected);
});

// ---- what the lane carries for the commit gate: the expert's open findings ----------------

const verdictFor = (map) => (call) => {
  if (call.label === 'recheck') return answer();
  if (call.phase === 'Lenses') {
    if (call.label === 'security') return { lensVerdict: 'two issues', findings: [finding({ what: 'admin bypass' }), finding({ what: 'order logged', line: 21, confidence: 'medium' })] };
    if (call.label === 'correctness') return { lensVerdict: 'one', findings: [finding({ what: 'off by one', file: 'src/other.js' })] };
    return clean(call);
  }
  // the skeptic: the verdicts are given by finding text, in the order the findings were numbered
  const numbered = JSON.parse(call.prompt.slice(call.prompt.indexOf('[\n'), call.prompt.lastIndexOf(']') + 1));
  return { verdicts: numbered.filter((f) => map[f.what]).map((f) => ({ index: f.index, verdict: map[f.what], reason: 'because' })) };
};

test('the lane carries the expert\'s confirmed findings, with their confidence and status, and none from the core lenses', async () => {
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), verdictFor({ 'admin bypass': 'confirmed', 'order logged': 'confirmed', 'off by one': 'confirmed' }));
  assert.deepStrictEqual(result.expertLane.findings.map((f) => [f.expert, f.what, f.confidence, f.status]), [
    ['security', 'admin bypass', 'high', 'confirmed'],
    ['security', 'order logged', 'medium', 'confirmed'],
  ]);
  assert.ok(result.findings.some((f) => f.lens === 'correctness'), 'the core finding is still reported, just not carried as the expert\'s');
});

test('a finding the skeptic refuted is not carried: it is not open', async () => {
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), verdictFor({ 'admin bypass': 'refuted', 'order logged': 'confirmed' }));
  assert.deepStrictEqual(result.expertLane.findings.map((f) => f.what), ['order logged']);
  assert.strictEqual(result.refuted.length, 1);
});

test('a finding the skeptic never ruled on is carried as unverified, so it cannot slip through silently', async () => {
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), verdictFor({ 'order logged': 'confirmed' }));
  const admin = result.expertLane.findings.find((f) => f.what === 'admin bypass');
  assert.strictEqual(admin.status, 'unverified');
});

test('a review with no findings carries an empty list, which is a recordable "nothing open"', async () => {
  const { result } = await loadWorkflow(REVIEW)(base({ experts: ['security'] }), rechecking());
  assert.deepStrictEqual(result.expertLane.findings, []);
});
