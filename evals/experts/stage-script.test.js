'use strict';

// 4.0.2: the Workflow tool refuses a scriptPath in the plugin's install folder, and a model
// that passes args retypes 30-300 KB of skill text. `experts.js script` writes the phase
// script into the project with its arguments built in; the command runs that by path.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const EXPERTS = path.join(PLUGIN, 'experts', 'experts.js');
const PHASES = ['plan', 'tests', 'build', 'review', 'harvest'];

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'uw-script-'));
const cli = (cwd, ...argv) => spawnSync(process.execPath, [EXPERTS, ...argv], { cwd, encoding: 'utf8' });
const put = (dir, name, value) => {
  fs.mkdirSync(path.join(dir, '.ultimate-workflow', 'run'), { recursive: true });
  const p = path.join('.ultimate-workflow', 'run', name);
  fs.writeFileSync(path.join(dir, p), JSON.stringify(value));
  return p;
};

test('every phase gets a runnable copy that keeps the meta block first and parses', () => {
  const dir = tmp();
  const { stripMeta } = require('../security-expert/lib/run-workflow.js');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const phase of PHASES) {
    const r = cli(dir, 'script', '--phase', phase);
    assert.equal(r.status, 0, r.stderr);
    const { scriptPath } = JSON.parse(r.stdout);
    assert.equal(scriptPath, path.join(dir, '.ultimate-workflow', 'run', `${phase}.js`));
    const text = fs.readFileSync(scriptPath, 'utf8');
    assert.ok(text.startsWith('export const meta = {'), `${phase}: meta must stay the first statement`);
    assert.doesNotThrow(() => new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', stripMeta(text)), phase);
  }
});

test('the plan copy runs with no args passed: the experts get the skills from the files, untouched', async () => {
  const dir = tmp();
  const list = JSON.parse(cli(dir, 'list').stdout);
  const skills = JSON.parse(cli(dir, 'skills', '--stage', 'plan').stdout);
  const a = put(dir, 'available.json', list);
  const s = put(dir, 'skills.json', skills);
  const g = put(dir, 'plan.args.json', { feature: 'add a phone drawer' });
  const r = cli(dir, 'script', '--phase', 'plan', '--args-file', g, '--file', `available=${a}`, '--file', `skills=${s}`);
  assert.equal(r.status, 0, r.stderr);
  const printed = JSON.parse(r.stdout);
  assert.deepEqual(printed.keys, ['available', 'expertsDir', 'feature', 'skills']);
  assert.ok(printed.skills.frontend.includes('semantics-and-aria'));

  const text = skills.frontend.find((x) => x.name === 'semantics-and-aria').text;
  const { result, calls } = await loadWorkflow(printed.scriptPath)(undefined, async (c) => {
    if (c.label === 'select-experts') return { experts: [{ name: 'frontend', why: 'ui' }], skills: [{ expert: 'frontend', name: 'semantics-and-aria', why: 'x' }] };
    if (c.label.startsWith('plan:')) return { summary: 's', constraints: [], risks: [], questions: [] };
    if (c.label === 'synthesise') return { planMarkdown: '---\nplan_confirmed: false\n---\n# P\n', openQuestions: [], deviations: [] };
    return { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };
  });
  assert.equal(result.expertLane.skipped, undefined);
  assert.deepEqual(result.expertLane.skillsLoaded.frontend, ['semantics-and-aria']);
  const consult = calls.find((c) => c.label === 'plan:frontend');
  assert.ok(consult.prompt.includes(text.slice(0, 200)), 'the skill text reaches the expert byte for byte');
  assert.ok(calls.find((c) => c.label === 'code').prompt.includes('add a phone drawer'));
});

test('review: --merge takes available, skills and diffFile from prepare; the args file wins on its own keys', () => {
  const dir = tmp();
  const p = put(dir, 'prepare.json', { hash: 'h', diffFile: '.ultimate-workflow/review.diff', files: ['a.ts'], available: [], skills: {}, skillProblems: ['frontend: x left out'] });
  const g = put(dir, 'review.args.json', { range: 'working', experts: [], expertsOnly: true });
  const r = cli(dir, 'script', '--phase', 'review', '--args-file', g, '--merge', p);
  assert.equal(r.status, 0, r.stderr);
  const printed = JSON.parse(r.stdout);
  assert.deepEqual(printed.skillProblems, ['frontend: x left out'], 'the command shows these to the user');
  const embedded = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(fs.readFileSync(printed.scriptPath, 'utf8'))[1]);
  assert.equal(embedded.diffFile, '.ultimate-workflow/review.diff');
  assert.equal(embedded.expertsOnly, true);
  assert.equal(embedded.expertsDir, path.join(PLUGIN, 'experts'));
});

test('refusals: an unknown phase, a missing file, and a file that is not JSON each exit 2 with the reason', () => {
  const dir = tmp();
  for (const [argv, why] of [
    [['script'], /needs --phase/],
    [['script', '--phase', '../x'], /no phase script/],
    [['script', '--phase', 'plan', '--file', 'available=nope.json'], /nope\.json is not readable JSON/],
    [['script', '--phase', 'plan', '--file', 'available'], /--file needs key=path/],
  ]) {
    const r = cli(dir, ...argv);
    assert.equal(r.status, 2, argv.join(' '));
    assert.match(r.stderr, why);
  }
  fs.writeFileSync(path.join(dir, 'bad.json'), 'not json');
  const r = cli(dir, 'script', '--phase', 'plan', '--args-file', 'bad.json');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /bad\.json is not readable JSON/);
});
