'use strict';

// PLAN-autopilot.md, W1: phases/run.js, the card loop of /ultimate-workflow:run, against a stub agent
// function (as the other phase scripts are tested). What it must decide in code: which card is next,
// when a card is parked and the run goes on, which cards are blocked by a parked one, where a
// non-blocking expert finding goes, when the findings card and the fix-up card run, and when the run
// stops. Agents only report; their reports are one JSON line per command.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const RUN = path.join(PLUGIN, 'phases', 'run.js');
const BUILD = path.join(PLUGIN, 'phases', 'build.js');

const card = (name, extra = {}) => ({ name, title: `card ${name}`, paths: [`src/${name}/**`], depends: [], carried: [], experts: ['quality'], briefs: [], reviewSkills: {}, preflight: { ok: true, contextFile: `.ultimate-workflow/run/f/cards/${name}/context.md` }, ...extra });
const AVAILABLE = [{ name: 'quality', agent: 'uw-expert-quality', description: 'tests', stages: ['plan', 'tests', 'review'] }];
const baseArgs = (cards, extra = {}) => ({ plan: 'PLAN-f.md', feature: 'f', cli: 'node "/p/experts/experts.js"', base: 'abc1234', verify: 'node "/p/hooks/verify.js" --plan "PLAN-f.md"', command: 'npm test', available: AVAILABLE, expertsDir: '/p/experts', protocol: 'rules', cards, ...extra });

const steps = (...lines) => ({ outputs: lines.map((l) => ({ command: '', output: typeof l === 'string' ? l : JSON.stringify(l) })) });

/**
 * A responder that plays every role of a healthy run, with per-card overrides:
 *   red: cards whose every attempt fails;  findings: { card: [finding] } from the quality expert;
 *   stillPresent: { card: [index] };  reviewFindings: [finding] from the correctness lens;
 *   commitFails: { card: reason }.
 */
function responder(o = {}) {
  const seen = [];
  const fn = async (call) => {
    seen.push(call.label);
    const [who, role] = String(call.label).includes(':') ? call.label.split(':') : [call.label, ''];
    if (role === 'write-tests') return { filesWritten: [`test/${who}.test.js`], testsFailAsExpected: true, summary: 'red' };
    if (/^attempt-/.test(role)) return (o.red || []).includes(who) ? { green: false, filesChanged: [`src/${who}/x.js`], failureOutput: `fail ${role}`, summary: role } : { green: true, fullSuiteGreen: true, filesChanged: [`src/${who}/x.js`], summary: 'done' };
    if (/^diagnose-/.test(role)) return { cause: 'wrong', signature: `sig-${role}`, suggestedFix: 'fix', confidence: 'medium' };
    if (role === 'prepare') return steps({ card: who, outOfScope: [] }, { ok: true });
    if (role === 'recheck') return { experts: [] };
    if (role === 'quality' && who !== 'review') return { lensVerdict: 'ok', findings: (o.findings && o.findings[who]) || [], stillPresent: (o.stillPresent && o.stillPresent[who]) || [] };
    if (role === 'refute' && who !== 'review') return { verdicts: [] };
    if (role === 'commit') {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(call.prompt)[1]).expertLane;
      const reason = o.commitFails && o.commitFails[who];
      return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] }, reason ? { ok: false, reason } : { ok: true, card: who, commit: `c-${who}`, files: 1, handoff: 'h', missingClaims: [] });
    }
    if (role === 'park') return steps({ ok: true, card: who, branch: `uw/parked/f/${who}` });
    if (role === 'journal') return steps({ ok: true });
    if (role === 'carry') return steps({ ok: true });
    if (role === 'setup') return steps({ ok: true }, { ok: true, contextFile: `.ultimate-workflow/run/f/cards/${who}/context.md` });
    if (who === 'review' && role === 'refute') return { verdicts: (o.reviewFindings || []).map((_, index) => ({ index, verdict: 'confirmed', reason: 'yes' })) };
    if (who === 'review') return { lensVerdict: 'ok', findings: role === 'correctness' ? o.reviewFindings || [] : [] };
    if (call.label === 'harvest') return { proposals: [{ destination: 'gotcha', path: 'AGENTS.md', text: '- Beware x.', source: 'card 1', rationale: 'r' }], discarded: [] };
    if (role === 'branch') return steps({ ok: true, branch: 'uw/harvest/f', commits: ['h1'] });
    throw new Error(`unexpected agent ${call.label}`);
  };
  fn.seen = seen;
  return fn;
}

const run = (args, respond) => loadWorkflow(RUN)(args, respond);

test('a card that stays red is parked, an independent card after it is committed, and a card that depends on it is blocked', async () => {
  const cards = [card('1'), card('2'), card('3'), card('4', { depends: ['2'] })];
  const r = responder({ red: ['2'] });
  const { result } = await run(baseArgs(cards), r);
  assert.equal(result.ok, true, JSON.stringify(result));
  const by = Object.fromEntries(result.cards.map((c) => [c.card, c]));
  assert.equal(by['1'].status, 'committed');
  assert.equal(by['2'].status, 'parked');
  assert.equal(by['2'].branch, 'uw/parked/f/2');
  assert.match(by['2'].reason, /^not green: Verification failed 3 times/);
  assert.equal(by['3'].status, 'committed');
  assert.equal(by['4'].status, 'blocked');
  assert.match(by['4'].reason, /depends on 2, which is parked/);
  assert.deepStrictEqual(result.counts, { committed: 2, parked: 1, blocked: 1 });
  assert.ok(!r.seen.some((l) => l.startsWith('4:')), 'no agent ran for the blocked card');
  assert.ok(r.seen.indexOf('2:park') < r.seen.indexOf('3:write-tests'), 'card 3 started after card 2 was parked');
  assert.ok(r.seen.includes('2:journal'), 'a parked card writes its journal lines too');
});

test('a card waits for its dependency even when the plan lists it first', async () => {
  const cards = [card('b', { depends: ['a'] }), card('a')];
  const r = responder();
  const { result } = await run(baseArgs(cards), r);
  assert.deepStrictEqual(result.cards.map((c) => c.card), ['a', 'b']);
  assert.ok(r.seen.indexOf('a:commit') < r.seen.indexOf('b:write-tests'));
});

test('a review finding confirmed and high runs one fix-up card through the same loop', async () => {
  const r = responder({ reviewFindings: [{ file: 'src/1/x.js', line: 3, what: 'off by one', howItFails: 'n=0', confidence: 'high' }] });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.review.findings.length, 1);
  assert.equal(result.fixupCard.status, 'committed');
  assert.equal(r.seen.filter((l) => l === 'fixup:write-tests').length, 1);
  const setup = r.seen.indexOf('fixup:setup');
  assert.ok(setup > r.seen.indexOf('review:refute') && setup < r.seen.indexOf('harvest'), 'after review, before harvest');
});

test('a non-blocking finding goes to the later card that covers its file; unfixed there, and one no card covers, both go to the findings card before review', async () => {
  const cards = [card('1'), card('2'), card('3')];
  const r = responder({
    findings: {
      1: [
        { file: 'src/3/a.js', line: 1, what: 'missing guard', howItFails: 'null', confidence: 'medium' },
        { file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low' },
      ],
    },
    stillPresent: { 3: [0] },
  });
  const calls = []
  const wrapped = async (c) => {
    calls.push(c);
    return r(c);
  };
  const { result } = await run(baseArgs(cards), wrapped);
  const by = Object.fromEntries(result.cards.map((c) => [c.card, c]));
  assert.deepStrictEqual(by['1'].experts.carriedOn, ['3'], 'the src/3 finding went to card 3, not card 2');
  const build3 = calls.find((c) => c.label === '3:write-tests');
  assert.match(build3.prompt, /CARRIED to this card[\s\S]*src\/3\/a\.js:1: missing guard/);
  assert.ok(!calls.find((c) => c.label === '2:write-tests').prompt.includes('missing guard'));
  const expert3 = calls.find((c) => c.label === '3:quality');
  assert.match(expert3.prompt, /CARRIED findings[\s\S]*"index": 0/);
  assert.ok(calls.some((c) => c.label === '1:carry' && /card-field .*--card 3/.test(c.prompt)), 'the carry is written to the plan');
  assert.equal(result.findingsCard.status, 'committed');
  const setup = calls.find((c) => c.label === 'findings:setup');
  assert.match(setup.prompt, /card-add .*--name findings/);
  assert.match(setup.prompt, /src\/3\/a\.js.*docs\/x\.md|docs\/x\.md.*src\/3\/a\.js/);
  const order = r.seen;
  assert.ok(order.indexOf('3:commit') < order.indexOf('findings:setup') && order.indexOf('findings:setup') < order.indexOf('review:correctness'));
  assert.match(calls.find((c) => c.label === 'findings:write-tests').prompt, /items carried to this card/);
});

test('a high-confidence expert finding parks the card; the next card still runs', async () => {
  const r = responder({ findings: { 1: [{ file: 'src/1/x.js', line: 9, what: 'secret logged', howItFails: 'log', confidence: 'high' }] } });
  const { result } = await run(baseArgs([card('1'), card('2')]), r);
  assert.equal(result.cards[0].status, 'parked');
  assert.match(result.cards[0].reason, /blocking finding/);
  assert.ok(!r.seen.includes('1:commit'));
  assert.equal(result.cards[1].status, 'committed');
});

test('a card whose preflight failed is parked without building, and two parks in a row for the same reason stop the run', async () => {
  const cards = [card('1', { preflight: { ok: false, reason: 'missing input: the plan cites docs/a.md, which does not exist' } }), card('2', { preflight: { ok: false, reason: 'missing input: the plan cites docs/a.md, which does not exist' } }), card('3')];
  const r = responder();
  const { result } = await run(baseArgs(cards), r);
  assert.ok(!r.seen.includes('1:write-tests'));
  assert.match(result.stopped, /two cards in a row were parked for the same reason/);
  assert.equal(result.cards.find((c) => c.card === '3').status, 'not started');
  assert.ok(!r.seen.includes('review:correctness'), 'a stopped run does not review');
});

test('a refused commit parks the card with the gate\'s reason; earlier committed and parked cards are left alone', async () => {
  const cards = [card('0', { committed: 'abc' }), card('p', { parked: { branch: 'uw/parked/f/p', reason: 'x' } }), card('1'), card('2', { depends: ['p'] })];
  const r = responder({ commitFails: { 1: 'Gate G7: no passing full test suite run covers these changes' } });
  const { result } = await run(baseArgs(cards), r);
  assert.deepStrictEqual(result.earlier.map((e) => [e.card, e.status]), [['0', 'committed'], ['p', 'parked']]);
  const one = result.cards.find((c) => c.card === '1');
  assert.equal(one.status, 'parked');
  assert.match(one.reason, /commit was refused: Gate G7/);
  assert.equal(result.cards.find((c) => c.card === '2').status, 'blocked');
  assert.ok(!r.seen.some((l) => l.startsWith('0:') || l.startsWith('p:')));
});

test('a lane the agent retyped wrong is caught: the record count must match what the script built', async () => {
  const r = responder({ findings: { 1: [{ file: 'src/1/x.js', line: 1, what: 'w', howItFails: 'h', confidence: 'low' }] } });
  const wrong = async (c) => (c.label === '1:commit' ? steps({ recorded: ['quality'], findings: 0 }, { ok: false, reason: 'Gate G6: no review from quality covers these changes' }) : r(c));
  const { result } = await run(baseArgs([card('1')]), wrong);
  assert.match(result.cards[0].reason, /evidence was not recorded as built/);
});

test('resume continues the parked card at the implementation with its tests, and runs nothing for committed cards', async () => {
  const cards = [card('1', { committed: 'c1' }), card('2', { parked: { branch: 'uw/parked/f/2', reason: 'red' } })];
  const r = responder();
  const { result } = await run(baseArgs(cards, { resume: { card: '2', testFiles: ['test/2.test.js'], reason: 'resumed by the user' } }), r);
  assert.ok(!r.seen.includes('2:write-tests'), 'tests are not rewritten');
  assert.ok(r.seen.includes('2:attempt-1'));
  assert.equal(result.cards.find((c) => c.card === '2').status, 'committed');
});

test('every command a run agent is given carries the user\'s authority and the one-command rule; skills come by name from one table', async () => {
  const calls = [];
  const r = responder();
  const skillTexts = { 'test-craft': 'TEST CRAFT BODY' };
  await run(baseArgs([card('1', { reviewSkills: { quality: ['test-craft'] }, briefs: [{ name: 'quality', text: 'BRIEF', skills: ['test-craft'] }] })], { skillTexts }), async (c) => {
    calls.push(c);
    return r(c);
  });
  for (const c of calls.filter((x) => /:(prepare|commit|park|journal)$/.test(x.label))) {
    assert.match(c.prompt, /the user started \/ultimate-workflow:run for PLAN-f\.md/, c.label);
  }
  assert.match(calls.find((c) => c.label === '1:commit').prompt, /card-commit --plan "PLAN-f\.md" --card 1 --feature f/);
  assert.match(calls.find((c) => c.label === '1:quality').prompt, /SKILLS for this card \(test-craft\)[\s\S]*TEST CRAFT BODY/);
  assert.match(calls.find((c) => c.label === '1:attempt-1').prompt, /STANDING BRIEF[\s\S]*TEST CRAFT BODY/);
  assert.match(calls.find((c) => c.label === '1:attempt-1').prompt, /context pack \.ultimate-workflow\/run\/f\/cards\/1\/context\.md/);
});

test('the result names the harvest branch and the counts, and missing inputs stop before any agent', async () => {
  const { result } = await run(baseArgs([card('1')]), responder());
  assert.equal(result.harvest.branch, 'uw/harvest/f');
  assert.equal(result.branch, 'uw/run/f');
  assert.match(result.summary, /^1 committed, 0 parked, 0 blocked/);
  const none = responder();
  const bad = await run({ cards: [card('1')] }, none);
  assert.equal(bad.result.ok, false);
  assert.match(bad.result.error, /plan, feature, cli, base/);
  assert.equal(none.seen.length, 0);
});

// --- the shared blocks ------------------------------------------------------------------------

const block = (file, start, end) => {
  const s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const a = s.indexOf(start);
  const b = s.indexOf(end);
  return a === -1 || b === -1 ? null : s.slice(a, b);
};

test('run.js carries the build loop and the build model exactly as build.js has them', () => {
  for (const [a, b] of [['// --- build loop', '// --- end build loop ---'], ['// --- build model', '// --- end build model ---']]) {
    const inBuild = block(BUILD, a, b);
    assert.ok(inBuild, `build.js lacks ${a}`);
    assert.strictEqual(block(RUN, a, b), inBuild, `${a} differs between build.js and run.js`);
  }
});

test('a fix-up card for a missing test goes on when its tests pass against code that is already right, and says so', async () => {
  const finding = { file: 'test/1.test.js', line: 4, what: 'the b argument check has no test', howItFails: 'a regression goes unseen', confidence: 'high' };
  const base = responder({ reviewFindings: [finding] });
  const seen = [];
  const r = async (c) => {
    seen.push(c.label);
    if (c.label === 'fixup:write-tests') return { filesWritten: ['test/1b.test.js'], testsFailAsExpected: false, unexpectedlyPassing: ['b check'], summary: 'passes already' };
    return base(c);
  };
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.fixupCard.status, 'committed', JSON.stringify(result.fixupCard));
  assert.equal(result.fixupCard.build.testsOnly, true);
  assert.ok(seen.includes('fixup:attempt-1'), 'it still ran the full suite through an implementation round');
  assert.equal(seen.filter((l) => l === 'fixup:write-tests').length, 1, 'the tests are not written twice');
});

test('a fix-up card for a real defect whose tests pass first is still parked', async () => {
  const finding = { file: 'src/1/x.js', line: 4, what: 'returns the stale value after a retry', howItFails: 'n', confidence: 'high' };
  const base = responder({ reviewFindings: [finding] });
  const r = async (c) => (c.label === 'fixup:write-tests' ? { filesWritten: ['test/x.test.js'], testsFailAsExpected: false, summary: 'passes' } : base(c));
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.fixupCard.status, 'parked');
  assert.match(result.fixupCard.reason, /tests did not fail first/);
});
