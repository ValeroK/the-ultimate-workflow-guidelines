'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const { briefs } = require(path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'experts.js'));

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const build = () => loadWorkflow(path.join(PLUGIN, 'workflows', 'build.js'));

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

test('command: build.md loads the briefs in code and passes them as an object', () => {
  const fs = require('node:fs');
  const text = fs.readFileSync(path.join(PLUGIN, 'commands', 'build.md'), 'utf8');
  assert.match(text, /experts\.js" brief/);
  assert.match(text, /"briefs": <the array, unchanged>/);
  assert.match(text, /briefsLoaded/);
  assert.match(text, /JSON object, not a string/);
});
