'use strict';

// 5.1.1, from the sessions of 2026-11-16 to 2026-11-18.
// (1) The cards are part of the plan the user confirms: the plan phase asks for a `## Cards` section and
//     reports the cards it read, so a plan cannot reach the unattended run with none.
// (2) The claims check reads past a note after the number of a `measure:` line, and a claim on a file that a
//     card of the plan creates is shown as not measured yet and does not stop the confirmation.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const { loadWorkflow } = require(path.join(__dirname, '..', 'security-expert', 'lib', 'run-workflow.js'));
const claims = require(path.join(PLUGIN, 'lib', 'claims.js'));
const cardsLib = require(path.join(PLUGIN, 'experts', 'cards.js'));
const read = (...p) => fs.readFileSync(path.join(PLUGIN, ...p), 'utf8');

const WITH_CARDS = `---
phase: plan
---

# PLAN: x

## Cards

- harness: the end-to-end harness
  paths: test/e2e/**
- 2a: the route
  paths: src/route.js, src/route.test.js
  depends: harness

## Open questions

- none
`;
const NO_CARDS = '---\nphase: plan\n---\n\n# PLAN: x\n\n## Goal\n\nSmall.\n';

const runPlan = async (args, planMarkdown) => {
  const calls = [];
  const out = await loadWorkflow(path.join(PLUGIN, 'phases', 'plan.js'))({ feature: 'add a route', available: [], ...args }, (call) => {
    calls.push(call);
    if (call.label === 'synthesise') return { planMarkdown, openQuestions: [], deviations: [] };
    return { experts: [], skills: [], summary: 'read', findings: [] };
  });
  return { result: out.result || out, calls: out.calls || calls };
};

test('plan: the synthesis prompt asks for a Cards section in the form experts/cards.js reads', async () => {
  const { calls } = await runPlan({ cards: true }, WITH_CARDS);
  const p = calls.find((c) => c.label === 'synthesise').prompt;
  assert.match(p, /\*\*Cards\*\* -- required/);
  assert.match(p, /headed exactly `## Cards`/);
  assert.match(p, /^\s+paths: /m);
  assert.match(p, /^\s+depends: /m);
});

test('plan: with no cards argument the Cards section is asked for only when the work has parts', async () => {
  const { calls } = await runPlan({}, NO_CARDS);
  const p = calls.find((c) => c.label === 'synthesise').prompt;
  assert.match(p, /\*\*Cards\*\* -- only when the work has more than one part/);
});

test('plan: the result lists the cards of the plan, the same cards experts/cards.js reads', async () => {
  const { result } = await runPlan({ cards: true }, WITH_CARDS);
  assert.deepEqual(result.cards, [
    { name: 'harness', title: 'the end-to-end harness', paths: ['test/e2e/**'] },
    { name: '2a', title: 'the route', paths: ['src/route.js', 'src/route.test.js'] },
  ]);
  assert.deepEqual(result.cards.map((c) => c.name), cardsLib.parseCards(WITH_CARDS).map((c) => c.name));
  assert.equal(result.cardsNote, undefined);
});

test('plan: the Full tier with no Cards section in the plan says so, before the user sees the plan', async () => {
  const { result } = await runPlan({ cards: true }, NO_CARDS);
  assert.deepEqual(result.cards, []);
  assert.match(result.cardsNote, /no ## Cards section/);
  assert.match(result.cardsNote, /before the user sees the plan/);
});

test('plan: a small plan with no cards and no cards argument has no note', async () => {
  const { result } = await runPlan({}, NO_CARDS);
  assert.deepEqual(result.cards, []);
  assert.equal(result.cardsNote, undefined);
});

test('plan: a card with no paths line is named in the note', async () => {
  const { result } = await runPlan({ cards: true }, WITH_CARDS.replace('  paths: test/e2e/**\n', ''));
  assert.match(result.cardsNote, /no paths line: harness/);
});

test('the commands put the cards in the plan before the confirmation, not after it', () => {
  const run = read('phases', 'run.md');
  assert.match(run, /"cards": true/);
  assert.doesNotMatch(run, /Then split the plan into cards, in code/);
  assert.match(run, /cardsNote/);
  const plan = read('commands', 'plan.md');
  assert.match(plan, /"cards": true/);
  assert.match(plan, /cardsNote/);
  assert.match(read('commands', 'feature.md'), /"cards": true/);
});

// --- the claims check -------------------------------------------------------------------------------------

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'uw-plan-cards-'));
const put = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const measurePlan = (lines) => lines.map((l) => `- measure: ${l}`).join('\n');
const globRe = require(path.join(PLUGIN, 'experts', 'experts.js')).globToRegExp;
const covers = (paths, file) => cardsLib.covers(paths, file, globRe);

test('claims: a note after the number is read past, and the limit is the number', () => {
  const read1 = (l) => claims.parseMeasures(measurePlan([l]))[0];
  for (const l of ['bytes src/a.js <= 5000 (4,300 now)', 'bytes src/a.js <= 5,000 bytes', 'bytes src/a.js <= 5000 - the index file', '`bytes src/a.js <= 5000` (room for two cards)', 'bytes src/a.js <= 5000; see card 2']) {
    const m = read1(l);
    assert.equal(m.understood, true, l);
    assert.equal(m.limit, 5000, l);
    assert.equal(m.glob, 'src/a.js', l);
  }
});

test('claims: a unit after the number is still not understood, never read as bytes', () => {
  for (const l of ['bytes src/a.js <= 5 KB', 'bytes src/a.js <= 5k', 'bytes src/a.js <= 5 lines', 'bytes src/a.js <= 5.5', 'bytes src/a.js <= 5 000']) {
    const m = claims.parseMeasures(measurePlan([l]))[0];
    assert.equal(m.understood, false, l);
  }
});

test('claims: a claim on a file that a card of the plan creates is not measured yet, and does not stop', () => {
  const dir = tmp();
  put(dir, 'src/a.js', 'a'.repeat(10));
  const cards = [{ name: '1', paths: ['src/a.js'] }, { name: '2', paths: ['src/new/**', 'docs/api.md'] }];
  const out = claims.measureAll(measurePlan(['bytes docs/api.md <= 900', 'bytes src/new/*.js <= 400', 'bytes src/typo.js <= 10']), dir, cards, covers);
  for (const m of out.slice(0, 2)) {
    assert.equal(m.understood, true, m.line);
    assert.equal(m.passing, true, m.line);
    assert.equal(m.pending, true, m.line);
    assert.equal(m.size, 0, m.line);
    assert.deepEqual(m.cards, ['2'], m.line);
    assert.match(m.why, /no file yet: card 2 writes there/, m.line);
  }
  assert.equal(out[0].room, 900);
  assert.equal(out[2].understood, false, 'no card writes there: a typo is still not understood');
  assert.match(out[2].why, /matches no file/);
});

test('claims: the tests command tells the user about a claim that is not measured yet', () => {
  assert.match(read('commands', 'tests.md'), /`pending`/);
});

// 2026-11-19, a real session: started in another folder, it searched the other projects for the card and ran there.
test('run.md: a resume is of the run in the folder of the session, and the session never searches other projects', () => {
  const md = read('phases', 'run.md');
  const resume = md.slice(md.indexOf('## Resume'));
  assert.match(resume, /A resume is of the run in this folder/);
  assert.match(resume, /do not look in other folders or other projects, and do not start anything/);
});
