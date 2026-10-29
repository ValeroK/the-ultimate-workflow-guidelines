'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const { briefs } = require(path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'experts.js'));

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const build = () => loadWorkflow(path.join(PLUGIN, 'phases', 'build.js'));

const BRIEF = { name: 'developer', text: '# Engineering brief\n\nAlways reuse the helper the repository already has.' };

// A responder that writes the tests, fails them as expected, then goes green on the first attempt.
const responder = (call) => {
  if (call.label === 'write-tests') return { filesWritten: ['t.test.js'], testsFailAsExpected: true, summary: 'written', testCommand: 'npm test' };
  return { green: true, filesChanged: ['a.js'], summary: 'done' };
};

test('build: a standing brief reaches both the test-writing and the implementing prompts, and says it adds no work', async () => {
  const { result, calls } = await build()({ plan: 'PLAN-x.md', briefs: [BRIEF] }, responder);
  const writes = calls.filter((c) => c.agentType === 'uw-implementer');
  assert.equal(writes.length, 2);
  for (const c of writes) {
    assert.ok(c.prompt.includes('STANDING BRIEF, from developer'), `${c.label} has no brief`);
    assert.ok(c.prompt.includes('Always reuse the helper the repository already has.'));
    assert.match(c.prompt, /adds no work: do nothing the plan did not ask for/);
  }
  assert.deepEqual(result.briefsLoaded, ['developer']);
  assert.equal(result.ok, true);
});

test('build: the brief comes after the expert-input rule and before the task, so it frames the work', async () => {
  const { calls } = await build()({ plan: 'PLAN-x.md', briefs: [BRIEF] }, responder);
  const p = calls.find((c) => c.label === 'write-tests').prompt;
  assert.ok(p.indexOf('Expert input') < p.indexOf('STANDING BRIEF'));
  assert.ok(p.indexOf('STANDING BRIEF') < p.indexOf('Write the tests from its confirmed Tests section'));
});

test('build: with no briefs the prompts are unchanged and the result says none were loaded', async () => {
  for (const a of [{ plan: 'PLAN-x.md' }, { plan: 'PLAN-x.md', briefs: [] }, { plan: 'PLAN-x.md', briefs: null }]) {
    const { result, calls } = await build()(a, responder);
    for (const c of calls.filter((x) => x.agentType === 'uw-implementer')) assert.ok(!c.prompt.includes('STANDING BRIEF'));
    assert.deepEqual(result.briefsLoaded, []);
  }
});

test('build: a malformed brief is dropped, not guessed at', async () => {
  const bad = [null, {}, { name: 'x' }, { name: 'x', text: '   ' }, { name: 5, text: 'y' }, 'text'];
  const { result, calls } = await build()({ plan: 'PLAN-x.md', briefs: [...bad, BRIEF] }, responder);
  assert.deepEqual(result.briefsLoaded, ['developer']);
  const p = calls.find((c) => c.label === 'write-tests').prompt;
  assert.ok(p.includes('STANDING BRIEF, from developer'));
  assert.ok(!/from developer, x/.test(p));
});

test('build: several briefs are all loaded, in the order given', async () => {
  const { result, calls } = await build()({ plan: 'PLAN-x.md', briefs: [BRIEF, { name: 'security', text: 'Never log a token.' }] }, responder);
  assert.deepEqual(result.briefsLoaded, ['developer', 'security']);
  const p = calls.find((c) => c.label === 'write-tests').prompt;
  assert.ok(p.includes('from developer, security'));
  assert.ok(p.indexOf('Always reuse') < p.indexOf('Never log a token.'));
});

test('build: the shipped developer brief is short, concrete and tells the implementer when not to add structure and what to report', () => {
  const b = briefs(PLUGIN).briefs.find((x) => x.name === 'developer');
  assert.ok(b, 'developer declares build');
  assert.ok(Buffer.byteLength(b.text) < 3500, 'it is paid for on every build');
  assert.match(b.text, /^## When not to$/m);
  assert.match(b.text, /^## When you report$/m);
  assert.match(b.text, /second real user/);
  assert.match(b.text, /lint, format and type-check/);
  assert.match(b.text, /No empty catch/);
  assert.doesNotMatch(b.text, /\bSOLID\b|\bDRY\b/, 'rules, not principle names: AGENTS.md already says simplicity first');
});

test('command: build.md loads the briefs in code and builds them into the script from a file', () => {
  const fs = require('node:fs');
  const text = fs.readFileSync(path.join(PLUGIN, 'commands', 'build.md'), 'utf8');
  assert.match(text, /experts\.js" brief --plan <plan file> > \.ultimate-workflow\/run\/briefs\.json/);
  assert.match(text, /script --phase build [^`]*--file briefs=\.ultimate-workflow\/run\/briefs\.json/);
  assert.match(text, /briefsLoaded/);
  assert.match(text, /no `args`/);
});

// 4.0.2: a build stopped at the test step because accepted guards already pass could only be
// resumed by hand-editing a copy of build.js. resumeAt "implement" skips the test step on record.
test('build: resumeAt "implement" skips the test step, uses the given command, and says so in the result', async () => {
  const { result, calls } = await build()(
    { plan: 'PLAN-x.md', resumeAt: 'implement', resumeReason: 'DS-24 accepted as a guard (rejects the bad sample)', command: 'uv run python t.py', testFiles: ['t.py'] },
    responder
  );
  assert.equal(calls.some((c) => c.label === 'write-tests'), false, 'no test-writing call');
  const impl = calls.find((c) => c.label === 'attempt-1');
  assert.ok(impl.prompt.includes('uv run python t.py'));
  assert.equal(result.ok, true);
  assert.equal(result.resumedAt, 'implement');
  assert.match(result.resumeReason, /DS-24 accepted/);
  assert.deepEqual(result.testFiles, ['t.py']);
});

test('build: resumeAt "implement" without the command or the reason implements nothing', async () => {
  for (const over of [{ command: '' }, { resumeReason: '' }]) {
    const { result, calls } = await build()({ plan: 'PLAN-x.md', resumeAt: 'implement', resumeReason: 'r', command: 'c', ...over }, responder);
    assert.equal(result.ok, false);
    assert.match(result.error, /needs command .* and resumeReason/);
    assert.equal(calls.length, 0);
  }
});

// 4.0.2: on a plan split into cards, the devops brief loaded on cards 1 and 2 because card 3
// adds a CI job. --section scopes the selection to one card's section.
test('brief --section: a card is read alone, so another card\'s CI job loads no devops brief', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-section-'));
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, [
    '# Plan', '', '## Card 1: tokens', '', 'Change `web/src/app/globals.css` and `web/src/components/Sidebar.tsx`.', '',
    '## Card 3: capture', '', 'Add a job to `.github/workflows/tests.yml` that runs the capture.', '',
  ].join('\n'));
  const run = (...extra) => spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'brief', '--plan', plan, ...extra], { encoding: 'utf8' });
  const whole = JSON.parse(run().stdout).map((b) => b.name);
  const card1 = JSON.parse(run('--section', 'card 1').stdout).map((b) => b.name);
  assert.ok(whole.includes('devops'), whole.join(','));
  assert.ok(!card1.includes('devops'), card1.join(','));
  const missing = run('--section', 'card 9');
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /no heading containing "card 9"/);
});
