'use strict';

// PLAN-5.2.0.md, cards plan-state and resume-target. Two real sessions decided these from what they read themselves
// and got them wrong: one ran the tests phase on a plan that had a Tests section and left it with two; one was given
// `--resume slug` in a folder with no run, searched the other projects, found a card of that name and ran there.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const lib = require(path.join(PLUGIN, 'lib', 'plan-state.js'));
const read = (...p) => fs.readFileSync(path.join(PLUGIN, ...p), 'utf8');

const tmp = (name = 'uw-plan-state-') => fs.mkdtempSync(path.join(os.tmpdir(), name));
const env = () => {
  const e = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const cli = (dir, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd: dir, encoding: 'utf8', env: env() });
const json = (r) => {
  const last = r.stdout.trim().split(/\r?\n/).pop();
  assert.ok(last && last.startsWith('{'), `no JSON line; stdout: ${r.stdout} stderr: ${r.stderr}`);
  return JSON.parse(last);
};
const git = (dir, ...a) => {
  const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

const HEAD = '---\nphase: tests\nplan_confirmed: true\ntests_confirmed: false\ntest_command: node t.test.js\nexperts: []\n---\n\n# PLAN: x\n\n## Goal\n\nSmall.\n\n## Cards\n\n- slug: the slug function\n  paths: src/slug.js\n- 2a: the count\n  paths: src/count.js\n';
const TESTS = '## Tests\n\n### slug: the slug function\n\n1. it works\n\n### 2a: the count\n\n1. it counts\n';
const NOTES = '## Notes\n\nkept\n';

// --- plan-state ------------------------------------------------------------------------------------------------------

test('plan-state 1: a plan with no Tests section', () => {
  const dir = tmp();
  write(dir, 'PLAN-x.md', HEAD);
  const s = json(cli(dir, 'plan-state', '--plan', 'PLAN-x.md'));
  assert.deepStrictEqual(s, { ok: true, planConfirmed: true, testsConfirmed: false, cards: ['slug', '2a'], tests: false, testsSections: 0, missingCardSections: [] });
});

test('plan-state 2-3: a Tests section with a part for each card, and one with a card that has none', () => {
  const full = lib.planState(`${HEAD}\n${TESTS}`);
  assert.deepStrictEqual([full.tests, full.testsSections, full.missingCardSections], [true, 1, []]);
  const part = lib.planState(`${HEAD}\n${TESTS.replace('### 2a: the count', '### 2ab: another')}`);
  assert.deepStrictEqual(part.missingCardSections, ['2a'], 'the name is matched whole: 2ab is not 2a');
  assert.deepStrictEqual(lib.planState(`${HEAD}\n${TESTS.replace('### slug: the slug function', '### Card slug')}`).missingCardSections, []);
});

// One fixture for the two readers (the experts check of this change): the run reads a plan's Tests section and a card's
// part with experts/autopilot.js; plan-state must give the same answer for each form.
test('plan-state: it reads the Tests section and the part of a card as the run does, for every form of heading', () => {
  const auto = require(path.join(PLUGIN, 'experts', 'autopilot.js'));
  const forms = [
    ['## Tests', '### slug: the slug function'],
    ['## Test plan', '### Card slug'],
    ['### Tests (confirmed)', '#### slug'],
    ['## Test', '### slug: x'],
  ];
  for (const [head, sub] of forms) {
    const plan = `${HEAD}\n${head}\n\n${sub}\n\n1. it works\n`;
    const s = lib.planState(plan);
    assert.equal(s.tests, true, head);
    assert.equal(s.testsSections, 1, head);
    for (const c of s.cards) assert.equal(!s.missingCardSections.includes(c), Boolean(auto.testSection(plan, c, s.cards.length)), `${head} / ${c}`);
    assert.deepStrictEqual(s.missingCardSections, ['2a'], head);
  }
  // A plan with one card and no subheading: the run takes the Tests section itself, so no part is missing.
  const one = `${HEAD.replace('- 2a: the count\n  paths: src/count.js\n', '')}\n## Tests\n\n1. it works\n`;
  assert.deepStrictEqual(lib.planState(one).missingCardSections, []);
});

test('plan-state: a heading inside a fenced block of the Tests section is text, for the count and for the replacement', () => {
  const fenced = '## Tests\n\n### slug: the slug function\n\n```md\n## Tests\n## Notes\n```\n\n1. after the fence\n';
  const plan = `${HEAD}\n${fenced}\n${NOTES}`;
  assert.equal(lib.planState(plan).testsSections, 1);
  const after = lib.replaceSection(plan, 'Tests', NEW);
  assert.equal(after, `${HEAD}\n${NEW}\n${NOTES}`, 'the whole section goes, the fence and the lines after it too');
});

test('plan-state 4: two Tests sections are counted', () => {
  assert.equal(lib.planState(`${HEAD}\n${TESTS}\n## Open questions\n\nNone.\n\n${TESTS}`).testsSections, 2);
});

const NEW = '## Tests\n\n### slug: the slug function\n\n1. new\n';

test('plan-state 5: present --replace-section Tests puts the text in place of the section, and every other byte is the same', () => {
  for (const eol of ['\n', '\r\n']) {
    const dir = tmp();
    const before = `${HEAD}\n${TESTS}\n${NOTES}`.replace(/\n/g, eol);
    write(dir, 'PLAN-x.md', before);
    write(dir, 'new.md', NEW);
    const r = json(cli(dir, 'present', '--from', 'new.md', '--out', 'PLAN-x.md', '--replace-section', 'Tests'));
    assert.equal(r.out, 'PLAN-x.md');
    const after = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
    assert.equal(after, `${HEAD}\n${NEW}\n${NOTES}`.replace(/\n/g, eol), JSON.stringify(eol));
    assert.equal(lib.planState(after).testsSections, 1);
  }
});

test('plan-state 6: with two Tests sections it leaves one, where the first was', () => {
  const dir = tmp();
  write(dir, 'PLAN-x.md', `${HEAD}\n${TESTS}\n${NOTES}\n${TESTS.replace('it works', 'the other one')}`);
  write(dir, 'new.md', NEW);
  json(cli(dir, 'present', '--from', 'new.md', '--out', 'PLAN-x.md', '--replace-section', 'Tests'));
  const after = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.equal(lib.planState(after).testsSections, 1);
  assert.ok(after.indexOf('## Tests') < after.indexOf('## Notes'), 'the section is where the first one was');
  assert.doesNotMatch(after, /it works|the other one/);
  assert.match(after, /## Notes\n\nkept/);
});

test('plan-state 7: with no Tests section it adds the text at the end', () => {
  const dir = tmp();
  write(dir, 'PLAN-x.md', `${HEAD}\n${NOTES}`);
  write(dir, 'new.md', NEW);
  json(cli(dir, 'present', '--from', 'new.md', '--out', 'PLAN-x.md', '--replace-section', 'Tests'));
  const after = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.ok(after.indexOf('## Notes') < after.indexOf('## Tests'));
  assert.ok(after.startsWith(`${HEAD}\n${NOTES}`.replace(/\s+$/, '')));
});

test('plan-state 5: --replace-section and --append together are refused', () => {
  const dir = tmp();
  write(dir, 'PLAN-x.md', `${HEAD}\n${TESTS}`);
  write(dir, 'new.md', NEW);
  const r = cli(dir, 'present', '--from', 'new.md', '--out', 'PLAN-x.md', '--replace-section', 'Tests', '--append');
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /--replace-section or --append, not both/);
});

/** A git project with a plan and a passing test command, on main. */
function project(planText, name = 'PLAN-x.md') {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 't.test.js', "console.log('# tests 1\\n# pass 1\\n# fail 0');\n");
  write(dir, name, planText);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

test('plan-state 8: --replace-section with --confirm tests_confirmed writes the section and the confirmation, and run-start accepts the plan', () => {
  const dir = project(`${HEAD}\n${TESTS}`);
  write(dir, 'new.md', `${NEW}\n### 2a: the count\n\n1. new count\n`);
  const r = json(cli(dir, 'present', '--from', 'new.md', '--out', 'PLAN-x.md', '--replace-section', 'Tests', '--confirm', 'tests_confirmed'));
  assert.equal(r.confirmed, true);
  fs.rmSync(path.join(dir, 'new.md'));
  git(dir, 'commit', '-q', '-am', 'confirmed');
  const s = json(cli(dir, 'plan-state', '--plan', 'PLAN-x.md'));
  assert.deepStrictEqual([s.testsConfirmed, s.testsSections, s.missingCardSections], [true, 1, []]);
  const started = json(cli(dir, 'run-start', '--plan', 'PLAN-x.md', '--feature', 'x'));
  assert.equal(started.ok, true, JSON.stringify(started));
});

test('plan-state 9-10: the commands ask one question for a plan that has its tests, and replace the section', () => {
  const tests = read('commands', 'tests.md');
  assert.match(tests, /plan-state --plan <plan file>` first/);
  assert.match(tests, /Ask the user one question/);
  assert.match(tests, /\*\*Confirm the section as it is\.\*\* No phase runs and no agent is used/);
  assert.match(tests, /\*\*Run the tests phase and replace the section\.\*\*/);
  assert.match(tests, /`present \.\.\. --replace-section Tests` in place of `--append`: a plan never gets a second `## Tests` section/);
  assert.match(read('commands', 'feature.md'), /plan-state --plan <plan file>` says the plan has a Tests section that is not confirmed[\s\S]*?Do not run the phase before the answer/);
});

// --- resume-target ---------------------------------------------------------------------------------------------------

const RUNPLAN = (feature) => `${HEAD.replace('# PLAN: x', `# PLAN: ${feature}`)}\n${TESTS}`;
/** A project with a confirmed plan and a started run; `park` parks that card. */
function withRun(feature, { park = '' } = {}) {
  const dir = project(RUNPLAN(feature), `PLAN-${feature}.md`);
  json(cli(dir, 'present', '--confirm', 'plan_confirmed', '--plan', `PLAN-${feature}.md`));
  json(cli(dir, 'present', '--confirm', 'tests_confirmed', '--plan', `PLAN-${feature}.md`));
  git(dir, 'commit', '-q', '-am', 'confirmed');
  assert.equal(json(cli(dir, 'run-start', '--plan', `PLAN-${feature}.md`, '--feature', feature)).ok, true);
  if (park) {
    write(dir, `src/${park}.js`, 'module.exports = 1;\n');
    assert.equal(json(cli(dir, 'park', '--plan', `PLAN-${feature}.md`, '--card', park, '--feature', feature, '--reason', 'not green: test')).ok, true);
  }
  return dir;
}

test('resume-target 1: a folder with no run', () => {
  const dir = project(HEAD);
  const r = json(cli(dir, 'resume-target', '--card', 'slug'));
  assert.equal(r.ok, false);
  assert.equal(r.needs, 'folder');
  assert.deepStrictEqual(r.runs, []);
});

test('resume-target 2-3: the parked card of the one run, and a card name the run does not have', () => {
  const dir = withRun('one', { park: 'slug' });
  const r = json(cli(dir, 'resume-target', '--card', 'slug'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual([r.feature, r.plan, r.branch, r.card], ['one', 'PLAN-one.md', 'uw/run/one', 'slug']);
  assert.match(r.status, /^parked uw\/parked\/one\/slug/);
  const none = json(cli(dir, 'resume-target', '--card', 'nope'));
  assert.equal(none.ok, false);
  assert.equal(none.needs, 'folder');
  assert.deepStrictEqual(none.runs[0].cards.map((c) => c.name), ['slug', '2a']);
  assert.match(none.runs[0].cards[0].status, /^parked/);
});

test('resume-target 4-5: two runs in one folder; a card both have needs a choice, and so does a resume with no card', () => {
  const dir = withRun('one', { park: 'slug' });
  // A second plan and run in the same folder, from main.
  git(dir, 'switch', '-q', 'main');
  write(dir, 'PLAN-two.md', RUNPLAN('two').replace('- 2a: the count\n  paths: src/count.js\n', '- only2: second\n  paths: src/two.js\n').replace('### 2a: the count', '### only2: second'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'second plan');
  json(cli(dir, 'present', '--confirm', 'plan_confirmed', '--plan', 'PLAN-two.md'));
  json(cli(dir, 'present', '--confirm', 'tests_confirmed', '--plan', 'PLAN-two.md'));
  git(dir, 'commit', '-q', '-am', 'confirmed two');
  assert.equal(json(cli(dir, 'run-start', '--plan', 'PLAN-two.md', '--feature', 'two')).ok, true);
  const both = json(cli(dir, 'resume-target', '--card', 'slug'));
  assert.equal(both.ok, false);
  assert.equal(both.needs, 'choice');
  assert.deepStrictEqual(both.runs.map((r) => r.feature), ['one', 'two']);
  const only = json(cli(dir, 'resume-target', '--card', 'only2'));
  assert.deepStrictEqual([only.ok, only.feature], [true, 'two']);
  const bare = json(cli(dir, 'resume-target'));
  assert.deepStrictEqual([bare.ok, bare.needs], [false, 'choice']);
});

test('resume-target 5: with no card, the one run that is not finished', () => {
  const dir = withRun('one', { park: 'slug' });
  const r = json(cli(dir, 'resume-target'));
  assert.deepStrictEqual([r.ok, r.feature, r.plan], [true, 'one', 'PLAN-one.md']);
  assert.deepStrictEqual(r.open, ['slug', '2a']);
});

test('resume-target 5: a run whose cards are all committed has nothing to resume', () => {
  const dir = withRun('one');
  for (const c of ['slug', '2a']) json(cli(dir, 'card-status', '--plan', 'PLAN-one.md', '--card', c, '--status', 'committed abc1234'));
  const r = json(cli(dir, 'resume-target'));
  assert.deepStrictEqual([r.ok, r.needs], [false, 'folder']);
  assert.match(r.reason, /every card of the runs of this folder is committed/);
});

test('resume-target: the plan of a run is the one run-start was given, whatever its name', () => {
  const dir = project(RUNPLAN('named-otherwise'), 'PLAN-the-file.md');
  json(cli(dir, 'present', '--confirm', 'plan_confirmed', '--plan', 'PLAN-the-file.md'));
  json(cli(dir, 'present', '--confirm', 'tests_confirmed', '--plan', 'PLAN-the-file.md'));
  git(dir, 'commit', '-q', '-am', 'confirmed');
  assert.equal(json(cli(dir, 'run-start', '--plan', 'PLAN-the-file.md', '--feature', 'feat')).ok, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'run', 'feat', 'run.json'), 'utf8')).plan, 'PLAN-the-file.md');
  const r = json(cli(dir, 'resume-target', '--card', 'slug'));
  assert.deepStrictEqual([r.ok, r.feature, r.plan], [true, 'feat', 'PLAN-the-file.md']);
});

test('resume-target 6: a folder next to this one with a run and a card of that name does not change the answer', () => {
  const parent = tmp('uw-two-projects-');
  const other = withRun('one', { park: 'slug' });
  fs.cpSync(other, path.join(parent, 'other'), { recursive: true });
  const here = path.join(parent, 'here');
  fs.mkdirSync(here);
  git(here, 'init', '-q', '-b', 'main');
  const r = json(cli(here, 'resume-target', '--card', 'slug'));
  assert.deepStrictEqual([r.ok, r.needs], [false, 'folder']);
  assert.deepStrictEqual(r.runs, []);
  assert.ok(!JSON.stringify(r).includes('other'), 'nothing of the other folder is in the answer');
});

test('resume-target 7: a run whose plan file is gone', () => {
  const dir = withRun('one');
  git(dir, 'rm', '-q', '-f', 'PLAN-one.md');
  git(dir, 'commit', '-q', '-m', 'plan removed');
  const r = json(cli(dir, 'resume-target'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /the plan of the run is not here \(PLAN-one\.md\)/);
});

test('resume-target 7: the plan that is gone is named as run-start was given it, not as the feature', () => {
  const dir = project(RUNPLAN('named-otherwise'), 'PLAN-the-file.md');
  json(cli(dir, 'present', '--confirm', 'plan_confirmed', '--plan', 'PLAN-the-file.md'));
  json(cli(dir, 'present', '--confirm', 'tests_confirmed', '--plan', 'PLAN-the-file.md'));
  git(dir, 'commit', '-q', '-am', 'confirmed');
  assert.equal(json(cli(dir, 'run-start', '--plan', 'PLAN-the-file.md', '--feature', 'feat')).ok, true);
  git(dir, 'rm', '-q', '-f', 'PLAN-the-file.md');
  git(dir, 'commit', '-q', '-m', 'plan removed');
  const r = json(cli(dir, 'resume-target'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /the plan of the run is not here \(PLAN-the-file\.md\)/);
  assert.ok(!r.reason.includes('PLAN-feat.md'));
});

test('resume-target 8: run.md makes it the first step of a resume, and the session starts nothing on ok false', () => {
  const md = read('phases', 'run.md');
  const resume = md.slice(md.indexOf('## Resume'));
  assert.match(resume, /The first step of every resume is one command:\*\* `node "\$\{CLAUDE_PLUGIN_ROOT\}\/experts\/experts\.js" resume-target`/);
  assert.match(resume, /Act only on its answer/);
  assert.match(resume, /tell the user that, ask, and start nothing/);
});

// The experts check of the whole change (2026-11-19): "## Test data" and "### Test strategy" are other sections.
test('plan-state: --replace-section Tests leaves a section whose title only starts with "Test", and a heading of that name at another level', () => {
  const plan = `${HEAD}\n## Test data\n\nkept data\n\n${TESTS}\n## Test strategy\n\nkept strategy\n\n### Tests\n\nkept, under the strategy\n`;
  assert.equal(lib.planState(plan).testsSections, 1);
  const after = lib.replaceSection(plan, 'Tests', NEW);
  for (const kept of ['## Test data\n\nkept data', '## Test strategy\n\nkept strategy', '### Tests\n\nkept, under the strategy']) assert.ok(after.includes(kept), kept);
  assert.ok(after.includes('1. new'));
  assert.doesNotMatch(after, /it works|it counts/);
});

// The fourth experts check of the whole change: one rule for the heading of the test plan, the run's, used by both.
test('plan-state and the run read the heading of the test plan by one rule: a note or "by card" after it, never "Test data"', () => {
  const auto = require(path.join(PLUGIN, 'experts', 'autopilot.js'));
  const yes = ['Tests', 'Test', 'Test plan', 'Test cases', 'Tests (confirmed)', 'Tests: draft', 'Tests - second round', 'Tests by card', 'Tests for each card'];
  const no = ['Test data', 'Test strategy', 'Testing notes', 'Tested hosts', 'Tests and data'];
  for (const title of yes) assert.equal(auto.TESTS_TITLE.test(title), true, title);
  for (const title of no) assert.equal(auto.TESTS_TITLE.test(title), false, title);
  for (const title of [...yes, ...no]) {
    const plan = `${HEAD}\n## ${title}\n\n### slug: the slug function\n\n1. it works\n\n### 2a: the count\n\n1. it counts\n`;
    const s = lib.planState(plan);
    const runHas = Boolean(auto.testSection(plan, 'slug', 2));
    assert.equal(s.tests, runHas, `${title}: plan-state says ${s.tests}, the run finds ${runHas}`);
    assert.equal(s.tests, yes.includes(title), title);
  }
});
