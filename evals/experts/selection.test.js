'use strict';

// PLAN-simplify, card selection. Which experts apply is decided once, at plan. Every later step only adds:
// tests (the experts marked always), review (the experts whose review skills matched the diff, and the recheck of
// the diff), and the run's recheck of each card. The recheck no longer asks the selection question a second time:
// it reports which experts' areas the diff touches, and code adds them.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const usage = require(path.join(PLUGIN, 'experts', 'usage.js'));
const wf = (name) => loadWorkflow(path.join(PLUGIN, 'phases', `${name}.js`));
const AVAILABLE = experts.list(PLUGIN).experts;
const SELECT = /Decide which domain experts should contribute/;

const reviewArgs = (over = {}) => ({ range: 'working', available: AVAILABLE, experts: ['security'], diffFile: 'd.diff', expertsDir: '/p/experts', plan: 'PLAN-x.md', skills: {}, expertsOnly: true, ...over });
const reviewer = (recheck) => (call) => (call.label === 'recheck' ? recheck : { findings: [], lensVerdict: 'clean' });

test('selection: the selection question is asked once per feature, in plan', async () => {
  const prompts = [];
  const record = (inner) => (call) => {
    prompts.push(call.prompt);
    return inner(call);
  };
  await wf('plan')({ feature: 'add a route', available: AVAILABLE, expertsDir: '/p/experts', skills: {} }, record((call) => {
    if (call.label === 'select-experts') return { experts: [{ name: 'security', why: 'x' }] };
    if (call.label === 'synthesise') return { planMarkdown: '---\nplan_confirmed: false\n---\n# P\n', openQuestions: [], deviations: [] };
    if (call.label.startsWith('plan:')) return { summary: 's', constraints: [], risks: [], suggestions: [] };
    return { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };
  }));
  await wf('review')(reviewArgs(), record(reviewer({ experts: [] })));
  assert.strictEqual(prompts.filter((p) => SELECT.test(p)).length, 1, 'only the plan asks which experts apply');
  assert.ok(prompts.some((p) => /Report which domain experts' areas this change touches/.test(p)), 'review reports areas instead');
  assert.ok(!prompts.some((p) => /Decide which domain experts should review/.test(p)), 'and does not decide who reviews');
});

test('selection: the review recheck can only add: an empty answer, a name not installed, and a name already selected change nothing they should not', async () => {
  const none = await wf('review')(reviewArgs(), reviewer({ experts: [] }));
  assert.ok(none.result.expertLane.selected.includes('security'), 'the planned expert stays');
  const odd = await wf('review')(reviewArgs(), reviewer({ experts: [{ name: 'ghost', why: 'x' }, { name: 'security', why: 'again' }, { name: 'data', why: 'schema' }] }));
  assert.ok(odd.result.expertLane.selected.includes('security') && odd.result.expertLane.selected.includes('data'));
  assert.ok(!odd.result.expertLane.selected.includes('ghost'), 'an unknown name is never applied');
  assert.deepStrictEqual(odd.result.expertLane.added, ['data']);
});

test('selection: a recheck that returns nothing is named as failed and does not refuse the commit', async () => {
  const { result } = await wf('review')(reviewArgs(), reviewer(null));
  assert.strictEqual(result.expertLane.recheckFailed, true);
  assert.strictEqual(result.expertLane.recheck, true, 'it does not refuse the commit (owner decision, 2026-11-13)');
  assert.ok(result.expertLane.selected.includes('security'));
});

test('selection: the run\'s recheck uses the same report wording, and usage still names the role', () => {
  const run = experts.assemblePhase(PLUGIN, 'run');
  assert.ok(run.includes('recheckPrompt('), 'run.js builds its recheck prompt from the shared section');
  assert.ok(!/Decide which domain experts/.test(run));
  assert.strictEqual(usage.role("Report which domain experts' areas this change touches. x"), 'recheck');
});
