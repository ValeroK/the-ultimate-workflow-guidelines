'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { buildPrompt, ARMS } = require('./manual/build-prompts.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ctx = {
  worktree: '/wt/s01',
  diffFile: '/work/diffs/s01.diff',
  resultFile: '/work/results/r007.json',
  pluginDir: PLUGIN,
  vendorDir: path.join(__dirname, '..', '..', 'vendor', 'anthropic-security-review'),
};

const built = (async () => {
  const out = {};
  for (const arm of ARMS) out[arm] = await buildPrompt({ arm, ...ctx });
  return out;
})();

test('there are exactly four arms', () => {
  assert.deepStrictEqual([...ARMS].sort(), ['expert', 'generic', 'lens', 'upstream']);
});

test('every arm tells the reviewer where the repository, the diff and the result file are, and forbids a shell', async () => {
  const P = await built;
  for (const arm of ARMS) {
    const p = P[arm];
    assert.ok(p.includes('/wt/s01'), `${arm}: repository`);
    assert.ok(p.includes('/work/diffs/s01.diff'), `${arm}: diff`);
    assert.ok(p.includes('/work/results/r007.json'), `${arm}: result file`);
    assert.match(p, /do not run shell commands/i, arm);
    assert.match(p, /"findings"/, `${arm}: output contract`);
  }
});

test('no arm is told to run git diff to get the diff, so none gets a tool the others lack', async () => {
  const P = await built;
  for (const arm of ARMS) assert.ok(!/git diff/.test(P[arm]), arm);
});

test('the expert arm is told that its shell and web are off for the exercise, so every arm has the same tools', async () => {
  const P = await built;
  assert.match(P.expert, /in this exercise the shell and the web are not available/i);
  for (const arm of ['generic', 'lens', 'upstream']) assert.ok(!/in this exercise the shell and the web are not available/i.test(P[arm]), arm);
});

test('every arm gets the identical output contract, so scoring is not format-dependent', async () => {
  const P = await built;
  const tail = (p) => p.slice(p.indexOf('When you are finished'));
  const first = tail(P.generic);
  assert.ok(first.length > 100);
  for (const arm of ARMS) assert.strictEqual(tail(P[arm]), first, arm);
});

test('the arms differ in the instructions they carry', async () => {
  const P = await built;
  const instructions = (p) => p.split('When you are finished')[0];

  assert.match(P.generic, /any defects/i);
  assert.ok(!/security lens|vulnerab|OWASP/i.test(instructions(P.generic)), 'the generic arm carries no security guidance');

  assert.match(P.lens, /through the security lens ONLY/);
  assert.ok(!/experts\/security/.test(P.lens), 'the lens arm has no checklist');

  assert.match(P.upstream, /MINIMIZE FALSE POSITIVES/);
  assert.ok(!/!`/.test(P.upstream) && !/^GIT STATUS:/m.test(P.upstream), 'upstream shell-injection lines are removed');
  assert.ok(!/Use a sub-task/.test(P.upstream), 'the upstream sub-task choreography is removed; every arm is a single stage');
  assert.ok(!/MUST output your findings in markdown/.test(P.upstream), 'the upstream report format yields to the shared JSON contract');
  assert.match(P.upstream, /SEVERITY GUIDELINES/, 'the rest of the upstream guidance is kept');

  assert.match(P.expert, /experts\/security\/references/);
  assert.match(P.expert, /zero findings/i);
  assert.match(P.expert, /references\/review\.md/);
});

test("no arm contains another arm's distinguishing text", async () => {
  const P = await built;
  const leaks = [
    ['generic', /MINIMIZE FALSE POSITIVES|experts\/security|security lens/],
    ['lens', /MINIMIZE FALSE POSITIVES|experts\/security/],
    ['upstream', /experts\/security|security lens ONLY/],
    // review.js wraps every lens, experts included, in the same "through the X lens
    // ONLY" sentence, so the expert's real prompt legitimately contains it.
    ['expert', /MINIMIZE FALSE POSITIVES/],
  ];
  for (const [arm, re] of leaks) assert.ok(!re.test(P[arm]), `${arm} leaks another arm's text`);
});

test('the lens and expert prompts are produced by the real review.js, not paraphrased', async () => {
  const P = await built;
  assert.match(P.lens, /Another reviewer has each of the other lenses; stay inside yours\./);
  assert.match(P.expert, /You are the security domain expert\./);
});

test('an unknown arm is an error', async () => {
  await assert.rejects(buildPrompt({ arm: 'nope', ...ctx }), /nope/);
});
