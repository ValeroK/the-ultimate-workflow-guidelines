'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const { list } = require(path.join(PLUGIN, 'experts', 'experts.js'));
const wf = (name) => loadWorkflow(path.join(PLUGIN, 'workflows', `${name}.js`));

// The expert lanes of the plan and tests phases: who is asked, what the model may
// decide, and what is written into the result by the script and not by a model.

const AVAILABLE = list(PLUGIN).experts;
const ui = { name: 'uiux', agent: 'uw-expert-uiux', description: 'UI/UX expert. Applies when screens or flows change.', stages: ['plan', 'tests', 'review'] };
const reviewOnly = { name: 'lintish', agent: 'uw-expert-lintish', description: 'Style expert. Applies to formatting.', stages: ['review'] };
const EXP = { expertsDir: '/plugin/experts' };

const SLICE = { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };
const answer = (...names) => ({ experts: names.map((name) => ({ name, why: `because of ${name}` })) });
const input = (over = {}) => ({ summary: 'Needs a check on the new route.', constraints: ['The id is checked against the session user.'], risks: ['A user reads another user\'s order.'], questions: [], ...over });

// ---- plan ---------------------------------------------------------------------

const PLAN_MD = '---\nplan_confirmed: false\n---\n# Plan\n\nBody of the plan.\n';
const planResponder = (select, consult = () => input()) => (call) => {
  if (call.label === 'select-experts') return typeof select === 'function' ? select(call) : select;
  if (call.label.startsWith('plan:')) return consult(call);
  if (call.label === 'synthesise') return { planMarkdown: PLAN_MD, openQuestions: ['An existing question'], deviations: [] };
  return SLICE;
};
const planArgs = (over = {}) => ({ feature: 'add an orders route', available: AVAILABLE, ...EXP, ...over });

test('plan: without a list of experts the lane is skipped, visibly, and the plan is otherwise the same', async () => {
  const { result, calls } = await wf('plan')({ feature: 'add an orders route' }, planResponder(answer()));
  assert.strictEqual(result.ok, true);
  assert.match(result.expertLane.skipped, /args\.available/);
  assert.strictEqual(calls.filter((c) => c.label === 'select-experts').length, 0);
  assert.strictEqual(result.planMarkdown, PLAN_MD);
});

test('plan: a malformed list, or a list with no references directory, is skipped with the reason', async () => {
  const a = await wf('plan')({ feature: 'x', available: [{ name: 'a' }] }, planResponder(answer()));
  assert.match(a.result.expertLane.skipped, /not the output/);
  const b = await wf('plan')({ feature: 'x', available: AVAILABLE }, planResponder(answer()));
  assert.match(b.result.expertLane.skipped, /expertsDir/);
});

test('plan: nothing installed means no question is asked', async () => {
  const { result, calls } = await wf('plan')(planArgs({ available: [] }), planResponder(answer()));
  assert.strictEqual(calls.filter((c) => c.label === 'select-experts').length, 0);
  assert.deepStrictEqual(result.expertLane.available, []);
  assert.ok(!result.expertLane.skipped);
});

test('plan: the question shows the request, the draft plan and every expert with its description', async () => {
  const { calls } = await wf('plan')(planArgs({ available: [...AVAILABLE, ui] }), planResponder(answer()));
  const ask = calls.find((c) => c.label === 'select-experts');
  assert.ok(ask.prompt.includes('add an orders route'));
  assert.ok(ask.prompt.includes('Body of the plan.'));
  for (const e of [...AVAILABLE, ui]) assert.ok(ask.prompt.includes(`- ${e.name}: ${e.description}`));
});

test('plan: a selected expert is consulted as its own agent type, pointed at its plan reference, and its input is written into the plan', async () => {
  const { result, calls } = await wf('plan')(planArgs(), planResponder(answer('security')));
  const consult = calls.find((c) => c.label === 'plan:security');
  assert.strictEqual(consult.agentType, 'uw-expert-security');
  assert.match(consult.prompt, /Stage: plan/);
  assert.ok(consult.prompt.includes('/plugin/experts/security/references/plan.md'));
  assert.ok(consult.prompt.includes('Body of the plan.'), 'it sees the draft');
  assert.match(result.planMarkdown, /## Expert input\n\n### security\n\nNeeds a check on the new route\./);
  assert.match(result.planMarkdown, /\*\*Constraints\*\*\n- The id is checked against the session user\./);
  assert.match(result.planMarkdown, /\*\*Risks\*\*/);
  assert.ok(result.planMarkdown.startsWith(PLAN_MD.trimEnd()), 'the original plan is untouched, the input is appended');
  assert.deepStrictEqual(result.expertLane.selected, ['security']);
  assert.deepStrictEqual(result.expertLane.ran, ['security']);
  assert.deepStrictEqual(result.expertLane.added, ['security']);
  assert.strictEqual(result.expertInput[0].expert, 'security');
});

test('plan: an expert\'s questions for the user join the open questions, labelled with who asked', async () => {
  const { result } = await wf('plan')(planArgs(), planResponder(answer('security'), () => input({ questions: ['Accept a shared admin token?'] })));
  assert.ok(result.openQuestions.includes('An existing question'));
  assert.ok(result.openQuestions.includes('[security] Accept a shared admin token?'));
  assert.match(result.planMarkdown, /\*\*Questions for you\*\*\n- Accept a shared admin token\?/);
});

test('plan: nothing selected adds nothing to the plan', async () => {
  const { result, calls } = await wf('plan')(planArgs(), planResponder(answer()));
  assert.strictEqual(result.planMarkdown, PLAN_MD);
  assert.strictEqual(calls.filter((c) => c.label.startsWith('plan:')).length, 0);
  assert.deepStrictEqual(result.expertLane.selected, []);
});

test('plan: a name the model invents is ignored and reported, and an expert already selected stays selected', async () => {
  const { result, calls } = await wf('plan')(planArgs({ experts: ['security'] }), planResponder(answer('ghost')));
  assert.deepStrictEqual(result.expertLane.selected, ['security'], 'add-only: the existing selection survives an answer that omits it');
  assert.deepStrictEqual(result.expertLane.ignoredUnknown, ['ghost']);
  assert.ok(calls.some((c) => c.label === 'plan:security'));
  assert.ok(!calls.some((c) => c.label === 'plan:ghost'));
});

test('plan: a consult that fails says so in the plan itself, and the expert is not recorded as having given input', async () => {
  const { result } = await wf('plan')(planArgs(), planResponder(answer('security'), () => null));
  assert.deepStrictEqual(result.expertLane.failed, ['security']);
  assert.deepStrictEqual(result.expertLane.ran, []);
  assert.match(result.planMarkdown, /### security\n\nThe consult failed, so there is no input from this expert/);
});

test('plan: a failed selection is visible and consults nobody', async () => {
  const { result, calls } = await wf('plan')(planArgs({ experts: ['security'] }), planResponder(() => null));
  assert.strictEqual(result.expertLane.selectionFailed, true);
  assert.deepStrictEqual(result.expertLane.selected, ['security']);
  assert.strictEqual(calls.filter((c) => c.label.startsWith('plan:')).length, 0);
});

test('plan: an expert that does not take part in planning is selected but not consulted', async () => {
  const { result, calls } = await wf('plan')(planArgs({ available: [...AVAILABLE, reviewOnly] }), planResponder(answer('lintish')));
  assert.deepStrictEqual(result.expertLane.selected, ['lintish']);
  assert.deepStrictEqual(result.expertLane.ran, []);
  assert.strictEqual(calls.filter((c) => c.label.startsWith('plan:')).length, 0);
});

test('plan: experts are consulted in parallel, one agent each, in the order they were selected', async () => {
  const { calls, result } = await wf('plan')(planArgs({ available: [...AVAILABLE, ui] }), planResponder(answer('uiux', 'security')));
  assert.deepStrictEqual(calls.filter((c) => c.label.startsWith('plan:')).map((c) => [c.label, c.agentType]), [
    ['plan:uiux', 'uw-expert-uiux'],
    ['plan:security', 'uw-expert-security'],
  ]);
  assert.ok(result.planMarkdown.indexOf('### uiux') < result.planMarkdown.indexOf('### security'));
});

test('plan: the expert lane only reads, so the plan result still says nothing was written', async () => {
  const { result } = await wf('plan')(planArgs(), planResponder(answer('security')));
  assert.match(result.note, /Nothing was written/);
});

// ---- tests --------------------------------------------------------------------

const DRAFT = { testsMarkdown: '## Tests\n\n- the route works', testCommand: 'node --test', expectedTestNames: ['route works'] };
const cases = (over = {}) => ({ summary: 'Abuse cases for the new route.', cases: [{ name: 'other user is refused', asserts: 'GET /orders/2 as user 1 returns 403', why: 'a missing ownership check' }], ...over });
const testsResponder = ({ consult = () => cases(), gaps = [] } = {}) => (call) => {
  if (call.label === 'draft') return DRAFT;
  if (call.label.startsWith('tests:')) return consult(call);
  if (call.label === 'merge') return { ...DRAFT, testsMarkdown: '## Tests\n\n- the route works\n- merged', changesMade: ['x'], gapsDeclined: [] };
  return { angleVerdict: 'fine', gaps };
};
const testsArgs = (over = {}) => ({ plan: 'PLAN-x.md', available: AVAILABLE, experts: ['security'], ...EXP, ...over });

test('tests: the plan\'s experts add cases, appended under their names after the critics have worked', async () => {
  const { result, calls } = await wf('tests')(testsArgs(), testsResponder());
  const exp = calls.find((c) => c.label === 'tests:security');
  assert.strictEqual(exp.agentType, 'uw-expert-security');
  assert.match(exp.prompt, /Stage: tests/);
  assert.ok(exp.prompt.includes('/plugin/experts/security/references/tests.md'));
  assert.ok(exp.prompt.includes('PLAN-x.md') && /Expert input/.test(exp.prompt), 'it is pointed at what it required at planning time');
  assert.ok(exp.prompt.includes('the route works'), 'it sees the draft');
  assert.match(result.testsMarkdown, /### Expert test cases\n\n#### security\n\nAbuse cases for the new route\.\n\n- \*\*other user is refused\*\*: GET \/orders\/2 as user 1 returns 403 \(catches: a missing ownership check\)/);
  assert.deepStrictEqual(result.expertLane, { stage: 'tests', available: ['security'], selected: ['security'], ran: ['security'], failed: [], added: [] });
});

test('tests: no critic ever sees the experts\' cases, so they cannot anchor on them', async () => {
  const { calls } = await wf('tests')(testsArgs(), testsResponder());
  for (const c of calls.filter((x) => x.phase === 'Attack' || x.label === 'merge')) {
    assert.ok(!c.prompt.includes('other user is refused'), `${c.label} saw an expert case`);
  }
});

test('tests: the cases are appended on both paths out of the workflow, with and without gaps', async () => {
  const noGaps = await wf('tests')(testsArgs(), testsResponder());
  const withGaps = await wf('tests')(testsArgs(), testsResponder({ gaps: [{ gap: 'g', passingImplementation: 'p', suggestedTest: 's' }] }));
  assert.match(noGaps.result.testsMarkdown, /Expert test cases/);
  assert.match(withGaps.result.testsMarkdown, /merged[\s\S]*Expert test cases/);
});

test('tests: with no experts selected there is no lane and no change to the section', async () => {
  const { result, calls } = await wf('tests')(testsArgs({ experts: [] }), testsResponder());
  assert.strictEqual(calls.filter((c) => c.label.startsWith('tests:')).length, 0);
  assert.strictEqual(result.testsMarkdown, DRAFT.testsMarkdown);
  assert.deepStrictEqual(result.expertLane.ran, []);
});

test('tests: without a list the lane is skipped, visibly', async () => {
  const { result } = await wf('tests')({ plan: 'PLAN-x.md', experts: ['security'] }, testsResponder());
  assert.match(result.expertLane.skipped, /args\.available/);
  assert.strictEqual(result.testsMarkdown, DRAFT.testsMarkdown);
});

test('tests: selected experts but no references directory is skipped with the reason', async () => {
  const { result } = await wf('tests')({ plan: 'PLAN-x.md', available: AVAILABLE, experts: ['security'] }, testsResponder());
  assert.match(result.expertLane.skipped, /expertsDir/);
});

test('tests: a failed expert leaves a visible gap in the section and no record', async () => {
  const { result } = await wf('tests')(testsArgs(), testsResponder({ consult: () => null }));
  assert.deepStrictEqual(result.expertLane.failed, ['security']);
  assert.deepStrictEqual(result.expertLane.ran, []);
  assert.match(result.testsMarkdown, /#### security\n\nThe consult failed, so no cases from this expert/);
});

test('tests: an expert that is not part of the tests stage is not asked', async () => {
  const { result, calls } = await wf('tests')(testsArgs({ available: [...AVAILABLE, reviewOnly], experts: ['lintish'] }), testsResponder());
  assert.strictEqual(calls.filter((c) => c.label.startsWith('tests:')).length, 0);
  assert.deepStrictEqual(result.expertLane.ran, []);
});

// ---- build --------------------------------------------------------------------

test('build: the implementer is told that the plan\'s expert input is binding, at both the test and the implementation step', async () => {
  const respond = (call) => {
    if (call.label === 'write-tests') return { filesWritten: ['a.test.js'], testsFailAsExpected: true, summary: 's', testCommand: 'node --test' };
    return { green: true, filesChanged: ['a.js'], summary: 's' };
  };
  const { calls } = await wf('build')({ plan: 'PLAN-x.md' }, respond);
  const prompts = calls.filter((c) => c.phase === 'Tests' || c.phase === 'Implement');
  assert.ok(prompts.length >= 2);
  for (const c of prompts.slice(0, 2)) {
    assert.match(c.prompt, /"Expert input" section/);
    assert.match(c.prompt, /requirements, not suggestions/);
  }
});

// ---- the three workflows share their helpers --------------------------------------

test('the lane helpers are the same text in plan, tests and review', () => {
  const fs = require('node:fs');
  const block = (n) => {
    const s = fs.readFileSync(path.join(PLUGIN, 'workflows', `${n}.js`), 'utf8');
    return s.slice(s.indexOf('// --- expert lane helpers'), s.indexOf('// --- end expert lane helpers ---'));
  };
  assert.ok(block('plan').length > 500);
  assert.strictEqual(block('tests'), block('plan'));
  assert.strictEqual(block('review'), block('plan'));
});
