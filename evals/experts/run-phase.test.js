'use strict';

// PLAN-autopilot.md, W1: phases/run.js, the card loop of the Full tier of /ultimate-workflow:feature, against a stub agent
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
    if (role === 'scope') return steps({ card: who, outOfScope: [] });
    if (role === 'prepare') return steps({ ok: true }); // the review's prepare of a range
    if (role === 'fix-round') return (o.fixRound && o.fixRound[who]) || { green: true, fullSuiteGreen: true, filesChanged: [`test/${who}.test.js`], testFiles: [`test/${who}.test.js`], newTests: [{ name: 'b guard', failedFirst: false, why: 'the code was right' }], summary: 'wrote the missing test' };
    if (role === 'recheck') return { experts: [] };
    if (role === 'commit') {
      const reason = o.commitFails && o.commitFails[who];
      return steps(reason ? { ok: false, reason } : { ok: true, card: who, commit: `c-${who}`, files: 1, handoff: 'h', missingClaims: [] });
    }
    if (role === 'record' && who !== 'settle') {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(call.prompt)[1]).expertLane;
      return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] });
    }
    if (role === 'park') return steps({ ok: true, card: who, branch: `uw/parked/f/${who}` }, { ok: true, desktop: 'sent' });
    if (role === 'notify') return steps({ ok: true, desktop: 'sent' });
    if (role === 'decisions') return steps((o.decisions && o.decisions[who]) || { ok: true, card: who, major: [], minor: [] });
    if (role === 'journal') return steps({ ok: true });
    if (role === 'carry') return steps({ ok: true });
    if (role === 'start' || (who === 'blocked' && role === 'status')) return steps(...String(call.prompt).split('\n').filter((l) => /card-status/.test(l)).map(() => ({ ok: true })));
    if (role === 'setup') return steps({ ok: true }, { ok: true, contextFile: `.ultimate-workflow/run/f/cards/${who}/context.md` });
    if (role === 'pack') return steps({ ok: true, contextFile: `.ultimate-workflow/run/f/cards/${who}/context.md` });
    if (who === 'settle' && role === 'state') return steps({ ok: true, head: 'head1', reviewedHead: '', harvestBranch: '', ...(o.state || {}) });
    if (who === 'settle' && role === 'head') return steps({ ok: true, head: 'head1', ...(o.head || {}) });
    if (who === 'settle' && role === 'record') return steps({ ok: true, head: 'head2', reviewed: { head: 'head2', at: 'now', open: 0 } });
    if (/^review/.test(who) && role === 'refute') return { verdicts: (o.reviewFindings || []).map((_, index) => ({ index, verdict: 'confirmed', reason: 'yes' })) };
    if (/^review/.test(who)) return { lensVerdict: 'ok', findings: role === 'correctness' ? o.reviewFindings || [] : role === 'quality' ? (o.expertFindings || []) : [] };
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

// Decision 2 applied to the review (2026-11-09): run 4 ended with two confirmed medium review findings
// in its own files, reported and left. A confirmed finding is now fixed, not only reported.
test('a confirmed medium review finding in the run\'s files goes to the fix-up card; a low one and one outside the run stay in the report', async () => {
  const r = responder({ reviewFindings: [
    { file: 'C:/proj/src/1/x.js', line: 3, what: 'unsafe integers rounded', howItFails: '2^53+1', confidence: 'medium' },
    { file: 'src/1/y.js', line: 1, what: 'style', howItFails: 'n/a', confidence: 'low' },
    { file: 'vendor/z.js', line: 1, what: 'not ours', howItFails: 'h', confidence: 'medium' },
  ] });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.review.findings.length, 3);
  assert.equal(result.fixupCard.status, 'committed', JSON.stringify(result.fixupCard));
  assert.equal(result.review.leftInReport, 2, 'the low one and the one outside the run are left in the report');
  const setup = r.seen.indexOf('fixup:setup');
  assert.ok(setup > r.seen.indexOf('review:refute'));
});

test('only low review findings: no fix-up card', async () => {
  const r = responder({ reviewFindings: [{ file: 'src/1/y.js', line: 1, what: 'style', howItFails: 'n/a', confidence: 'low' }] });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.fixupCard, null);
  assert.ok(!r.seen.includes('fixup:setup'));
});

// 2026-11-08, a real run: card-add refused the fix-up card (the review named its file by absolute
// path), the run then tried to park a card the plan never had, and stopped with "the tree may still
// hold its work" although nothing had been built.
test('a fix-up card that could not be added is not started, is not parked, and the harvest still runs', async () => {
  const base = responder({ reviewFindings: [{ file: 'C:/p/src/1/x.js', line: 3, what: 'off by one', howItFails: 'n=0', confidence: 'high' }] });
  const seen = [];
  const r = async (c) => { seen.push(c.label); return c.label === 'fixup:setup' ? { outputs: [] } : base(c); };
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.fixupCard.status, 'not started');
  assert.match(result.fixupCard.reason, /could not be added to the plan/);
  assert.ok(!seen.includes('fixup:park'), 'a card the plan does not have is never parked');
  assert.equal(result.stopped, undefined, 'the run did not stop');
  assert.ok(seen.includes('harvest'), 'the harvest still ran');
});

// The plan's own status for every card (2026-11-09): written by commands the run issues, never by an
// agent's edit. These hold which command the script issues at each transition.
const statusOf = (calls, label) => {
  const c = calls.find((x) => x.label === label);
  return c ? (/card-status [^\n]*--status "([^"]+)"/.exec(c.prompt) || [])[1] : undefined;
};

test('the plan shows each card running before any work, then committed, parked or blocked', async () => {
  const calls = [];
  const base = responder({ red: ['2'] });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2'), card('3', { depends: ['2'] })]), r);
  assert.equal(statusOf(calls, '1:start'), 'running');
  assert.ok(base.seen.indexOf('1:start') < base.seen.indexOf('1:write-tests'), 'running is written before the tests');
  assert.doesNotMatch(calls.find((c) => c.label === '1:commit').prompt, /--fixed-round/, 'there is no fix round any more');
  assert.equal(result.cards.find((c) => c.card === '2').status, 'parked');
  assert.match(calls.find((c) => c.label === '2:park').prompt, /experts\.js" park /, 'parked is written by the park command');
  assert.equal(statusOf(calls, 'blocked:status'), 'blocked by 2');
});

test('a run that dies inside a card leaves it at running: nothing after the start step', async () => {
  const calls = [];
  const base = responder();
  const r = async (c) => {
    calls.push(c);
    if (c.label === '1:write-tests') throw new Error('the session ended');
    return base(c);
  };
  await assert.rejects(run(baseArgs([card('1')]), r));
  assert.equal(statusOf(calls, '1:start'), 'running');
  assert.ok(!calls.some((c) => /card-status|card-commit|park /.test(c.prompt) && c.label !== '1:start'), 'no later status overwrote running');
});

test('a resumed card shows running (resumed)', async () => {
  const calls = [];
  const base = responder();
  const r = async (c) => { calls.push(c); return base(c); };
  await run(baseArgs([card('1')], { resume: { card: '1', reason: 'try again', testFiles: ['test/1.test.js'] } }), r);
  assert.equal(statusOf(calls, '1:start'), 'running (resumed)');
});

// Major decisions the plan does not state, and the notices (2026-11-09).
test('an unplanned dependency holds the card as needs-decision, tells the user, and the independent cards go on', async () => {
  const calls = [];
  const base = responder({ decisions: { 1: { ok: true, card: '1', major: [{ kind: 'dependency', what: 'added dependency left-pad@1.3.0 in package.json' }], minor: [] } } });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2'), card('3', { depends: ['1'] })]), r);
  const one = result.cards.find((c) => c.card === '1');
  assert.equal(one.status, 'needs-decision');
  assert.match(one.reason, /needs a decision the plan does not state: - dependency: added dependency left-pad/);
  assert.match(one.action, /--resume 1 --accept/);
  const park = calls.find((c) => c.label === '1:park').prompt;
  assert.match(park, /experts\.js" park [^\n]*--needs-decision/, 'parked with its work, as needs-decision');
  assert.match(park, /experts\.js" notify [^\n]*--kind needs-decision --card 1/, 'the user is told from the same step');
  assert.ok(!base.seen.includes('1:commit'), 'nothing is committed silently');
  assert.equal(result.cards.find((c) => c.card === '2').status, 'committed', 'an independent card goes on');
  assert.equal(result.cards.find((c) => c.card === '3').status, 'blocked');
  assert.match(calls.find((c) => c.label === 'blocked:status').prompt, /notify [^\n]*--kind blocked --reason "1 card is blocked: 3 behind 1" --action "settle 1 first: [^\n]*--resume 1 --accept/);
  assert.match(calls.find((c) => c.label === 'finished:notify').prompt, /--kind finished/);
});

test('a planned dependency (or a minor choice) is committed, the minor choice on record', async () => {
  const r = responder({ decisions: { 1: { ok: true, card: '1', major: [], minor: [{ kind: 'declared', what: 'named the helper toInt' }] } } });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'committed');
  assert.deepStrictEqual(result.cards[0].decisions.minor.map((d) => d.what), ['named the helper toInt']);
});

test('the implementer\'s declared decisions reach the decisions check', async () => {
  const calls = [];
  const base = responder();
  const r = async (c) => {
    calls.push(c);
    if (/^1:attempt-/.test(c.label)) return { green: true, fullSuiteGreen: true, filesChanged: ['src/1/x.js'], summary: 'done', decisions: [{ what: 'added a cache', major: false }] };
    return base(c);
  };
  await run(baseArgs([card('1')]), r);
  assert.match(calls.find((c) => c.label === '1:decisions').prompt, /added a cache/);
});

test('a parked card and a stopped run each notify, naming the card and the command', async () => {
  const calls = [];
  const base = responder({ red: ['1', '2'] });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2'), card('3')]), r);
  assert.match(calls.find((c) => c.label === '1:park').prompt, /notify [^\n]*--kind parked --card 1 [^\n]*--resume 1/);
  assert.ok(result.stopped, 'two parks for the same reason stop the run');
  assert.match(calls.find((c) => c.label === 'stopped:notify').prompt, /--kind stopped/);
});

test('--resume without --accept runs the held card again from its tests, told to stay within the plan', async () => {
  const calls = [];
  const base = responder();
  const r = async (c) => { calls.push(c); return base(c); };
  await run(baseArgs([card('1')], { resume: { card: '1', rerun: true, reason: 'stay within the plan', avoid: 'added dependency left-pad' } }), r);
  const tests = calls.find((c) => c.label === '1:write-tests');
  assert.ok(tests, 'it starts again from the tests');
  assert.match(tests.prompt, /did not accept it: added dependency left-pad\. Stay within the plan/);
});

test('a held card run again within the plan that commits says its held branch is superseded', async () => {
  const { result } = await run(baseArgs([card('1')], { resume: { card: '1', rerun: true, reason: 'r', avoid: 'PORT', heldBranch: 'uw/parked/f/1' } }), responder());
  assert.equal(result.cards[0].status, 'committed');
  assert.equal(result.cards[0].superseded, 'uw/parked/f/1');
});

// The edge case: the card cannot be done within the plan, and the rerun takes the decision again.
// 2026-11-09, live: the rerun stayed within the plan, could not go green (the plan's tests need the
// decision), and was parked as "not green" with its decision hidden.
test('a held card run again that cannot go green within the plan goes back to needs-decision, with both reasons', async () => {
  const calls = [];
  const base = responder({ red: ['1'] });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2', { depends: ['1'] })], { resume: { card: '1', rerun: true, reason: 'stay within the plan', avoid: '- env: reads PORT', heldBranch: 'uw/parked/f/1' } }), r);
  const one = result.cards.find((c) => c.card === '1');
  assert.equal(one.status, 'needs-decision');
  // Said plainly, with the way out, and the cause kept as a detail.
  assert.match(one.reason, /^cannot be done within the plan: needs decision - env: reads PORT; run --resume 1 --accept to allow it, or change the plan\. - detail, from the run within the plan: not green/);
  assert.match(calls.find((c) => c.label === '1:park').prompt, /park [^\n]*--needs-decision/);
  assert.match(calls.find((c) => c.label === '1:park').prompt, /notify [^\n]*--kind needs-decision/);
  assert.ok(!base.seen.includes('1:commit'));
  assert.equal(result.cards.find((c) => c.card === '2').status, 'blocked');
});

test('a held card run again that needs the same decision is held again, notified, and never committed', async () => {
  const calls = [];
  const base = responder({ decisions: { 1: { ok: true, card: '1', major: [{ kind: 'env', what: 'reads the environment variable PORT in src/1/x.js' }], minor: [] } } });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2', { depends: ['1'] })], { resume: { card: '1', rerun: true, reason: 'stay within the plan', avoid: 'reads PORT', heldBranch: 'uw/parked/f/1' } }), r);
  assert.equal(result.cards.find((c) => c.card === '1').status, 'needs-decision');
  assert.ok(!base.seen.includes('1:commit'));
  assert.equal(base.seen.filter((l) => l === '1:write-tests').length, 1, 'one attempt, no loop');
  assert.match(calls.find((c) => c.label === '1:park').prompt, /notify [^\n]*--kind needs-decision --card 1/);
  assert.equal(result.cards.find((c) => c.card === '2').status, 'blocked');
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
  await run(baseArgs([card('1', { reviewSkills: { quality: ['test-craft'] }, briefs: [{ name: 'quality', text: 'BRIEF', skills: ['test-craft'] }] })], { skillTexts, planExperts: ['quality'] }), async (c) => {
    calls.push(c);
    return r(c);
  });
  for (const c of calls.filter((x) => /:(scope|commit|park|journal)$/.test(x.label))) {
    assert.match(c.prompt, /the user started \/ultimate-workflow:feature for PLAN-f\.md/, c.label);
  }
  assert.match(calls.find((c) => c.label === '1:commit').prompt, /card-commit --plan "PLAN-f\.md" --card 1 --feature f/);
  assert.match(calls.find((c) => c.label === 'review:quality').prompt, /SKILLS for this change \(test-craft\)[\s\S]*TEST CRAFT BODY/);
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

// ---- 4.7.1: what the first memory-index runs hit ----

test('bare --resume runs a parked card again from its tests, and the cards behind it; committed cards are left alone', async () => {
  const cards = [card('0', { committed: 'c0' }), card('1', { parked: { branch: 'uw/parked/f/1', reason: 'red' } }), card('2', { depends: ['1'] })];
  const r = responder();
  const { result } = await run(baseArgs(cards, { resume: { all: true } }), r);
  assert.ok(r.seen.includes('1:write-tests'), 'the parked card starts again at its tests');
  assert.equal(result.cards.find((c) => c.card === '1').status, 'committed');
  assert.equal(result.cards.find((c) => c.card === '2').status, 'committed');
  assert.ok(!r.seen.some((l) => l.startsWith('0:')), 'nothing runs for a committed card');
  assert.deepStrictEqual(result.earlier.map((e) => [e.card, e.status]), [['0', 'committed']]);
});

test('without a resume a parked card stays parked', async () => {
  const cards = [card('1', { parked: { branch: 'uw/parked/f/1', reason: 'red' } }), card('2')];
  const r = responder();
  const { result } = await run(baseArgs(cards), r);
  assert.ok(!r.seen.some((l) => l.startsWith('1:')));
  assert.deepStrictEqual(result.earlier.map((e) => [e.card, e.status]), [['1', 'parked']]);
});

test('a refused commit whose output is not a JSON line still gives its text as the reason', async () => {
  const r = responder();
  const said = async (c) => {
    if (c.label !== '1:commit') return r(c);
    return steps('Gate G7: no passing full test suite run covers these changes');
  };
  const { result } = await run(baseArgs([card('1')]), said);
  const got = result.cards.find((c) => c.card === '1');
  assert.equal(got.status, 'parked');
  assert.match(got.reason, /commit was refused: card-commit printed no JSON line; it printed: Gate G7: no passing full test suite run covers these changes/);
});

test('the commit step asks for the JSON line of each command, not just its last line', async () => {
  const calls = [];
  const base = responder();
  await run(baseArgs([card('1')]), async (c) => { calls.push(c); return base(c); });
  assert.match(calls.find((c) => c.label === '1:commit').prompt, /the last line of its output that is a JSON object/);
});

test('the cards blocked behind one parked card make one notice, not one each', async () => {
  const cards = [card('1'), card('2', { depends: ['1'] }), card('3', { depends: ['1'] }), card('4', { depends: ['2'] })];
  const calls = [];
  const base = responder({ red: ['1'] });
  const { result } = await run(baseArgs(cards), async (c) => { calls.push(c); return base(c); });
  assert.deepStrictEqual(result.counts, { parked: 1, blocked: 3 });
  const prompt = calls.find((c) => c.label === 'blocked:status').prompt;
  assert.equal(prompt.split('\n').filter((l) => / notify /.test(l)).length, 1);
  assert.equal(prompt.split('\n').filter((l) => / card-status /.test(l)).length, 3, 'each card still gets its status line in the plan');
  assert.match(prompt, /--kind blocked --reason "3 cards are blocked: 2, 3 behind 1; 4 behind 2" --action "settle 1 first: [^\n"]*--resume 1"/);
});

// --- card-add (PLAN-run-fixes.md, card card-add, tests 20 and 30 to 33) ---------------------------

const cardAddLine = (calls, label) => String(calls.find((c) => c.label === label).prompt).split('\n').find((l) => / card-add /.test(l));

test('20: adhocCard passes --experts only with names already in the plan\'s line', async () => {
  const GHOST = [...AVAILABLE, { name: 'ghost', agent: 'uw-expert-ghost', description: 'g', stages: ['review'] }];
  const table = [
    { name: 'one name in the line, one outside it', planExperts: ['quality'], want: 'quality' },
    { name: 'the line is empty: no --experts at all', planExperts: [], want: null },
    { name: 'no lane name in the line: none', planExperts: ['security'], want: 'none' },
  ];
  for (const t of table) {
    const calls = [];
    // The review finds one medium defect in card 1's files: the run adds a fix-up card for it.
    const base = responder({ reviewFindings: [{ file: 'src/1/y.js', line: 2, what: 'old note', howItFails: 'misleads', confidence: 'medium' }] });
    const respond = async (c) => {
      calls.push(c);
      return base(c);
    };
    await run(baseArgs([card('1', { experts: ['quality', 'ghost'] })], { available: GHOST, planExperts: t.planExperts }), respond);
    const line = cardAddLine(calls, 'fixup:setup');
    assert.match(line, /--name fixup/, t.name);
    const given = /--experts (\S+)/.exec(line);
    assert.equal(given && given[1], t.want, t.name);
  }
});

// The stub plays card-add: it prints the next free name, as the real one does with --free-name.
function withFreeNames(base) {
  const calls = [];
  const given = [];
  const fn = async (c) => {
    calls.push(c);
    if (/^fixup(-\d+)?:setup$/.test(c.label)) {
      // The paths reach card-add through a file the step writes (plan test 21), not the command line.
      const paths = /-paths\.txt [^\n]*\n<<<CONTENT\n([^\n]*)\nCONTENT>>>/.exec(c.prompt) || /--paths "([^"]*)"/.exec(c.prompt);
      const name = given.length === 0 ? 'fixup' : `fixup-${given.length + 1}`;
      given.push(name);
      return steps({ ok: true, card: { name, paths: paths ? paths[1].split(',') : [] } }, { ok: true, contextFile: `.ultimate-workflow/run/f/cards/${name}/context.md` });
    }
    if (/:pack$/.test(c.label)) return steps({ ok: true, contextFile: `.ultimate-workflow/run/f/cards/${c.label.split(':')[0]}/context.md` });
    if (/:security$/.test(c.label)) return { lensVerdict: 'ok', findings: [], stillPresent: [] };
    return base(c);
  };
  fn.calls = calls;
  return fn;
}
const labelsOf = (calls) => calls.map((c) => c.label);
const TWO_EXPERTS = [...AVAILABLE, { name: 'security', agent: 'uw-expert-security', description: 's', stages: ['plan', 'tests', 'review'] }];
// The card-add line of a setup step, followed by the paths it reads from the file the step writes
// (plan test 21: a finding's file is agent text, so it is not on the command line).
const addOf = (c) => `${c.prompt.split('\n').find((l) => / card-add /.test(l))} paths: ${(/-paths\.txt [^\n]*\n<<<CONTENT\n([^\n]*)\nCONTENT>>>/.exec(c.prompt) || ['', ''])[1]}`;
const finding = (file, confidence = 'high') => ({ file, line: 3, what: `defect in ${file}`, howItFails: 'n=0', confidence });

test('30: a refused card-add\'s reason reaches the report, not "printed nothing"', async () => {
  const table = [
    { name: 'a JSON refusal', out: steps({ ok: false, reason: 'card fixup is already in the plan (STUB-REASON)' }), want: 'card fixup is already in the plan (STUB-REASON)' },
    { name: 'a refusal that printed text and no JSON', out: steps('experts.js: no card "x" in PLAN-f.md (RAW-REASON)'), want: 'RAW-REASON' },
  ];
  for (const t of table) {
    const base = responder({ reviewFindings: [finding('src/1/x.js')] });
    const { result } = await run(baseArgs([card('1')]), async (c) => (c.label === 'fixup:setup' ? t.out : base(c)));
    assert.equal(result.fixupCard.status, 'not started', t.name);
    assert.ok(result.fixupCard.reason.includes(t.want), `${t.name}: ${result.fixupCard.reason}`);
    assert.doesNotMatch(result.fixupCard.reason, /printed nothing/, t.name);
  }
});

test('31: every later step of a run-added card keys on the name card-add printed', async () => {
  // card-add prints fixup-2 where the script asked for fixup; the card is red, so it is parked too.
  const second = withFreeNames(responder({ reviewFindings: [finding('src/1/x.js')], red: ['fixup-2'] }));
  const printed = async (c) => (c.label === 'fixup:setup' ? steps({ ok: true, card: { name: 'fixup-2', paths: ['src/1/x.js'] } }) : second(c));
  const out = await run(baseArgs([card('1')]), printed);
  assert.equal(out.result.fixupCard.card, 'fixup-2');
  assert.equal(out.result.fixupCard.status, 'parked');
  const labels = labelsOf(second.calls);
  assert.ok(labels.includes('fixup-2:write-tests'), labels.join(' '));
  assert.ok(labels.includes('fixup-2:park'), 'parkCard uses the printed name');
  assert.deepStrictEqual(labels.filter((l) => /^fixup:/.test(l) && l !== 'fixup:setup'), [], 'no label keeps the literal name after setup');
  const pack = second.calls.map((c) => c.prompt).filter((p) => /experts\.js" pack /.test(p)).join('\n');
  assert.match(pack, /--card fixup-2(?!\w)/);
  assert.doesNotMatch(pack, /--card fixup(?![-\w])/);
});

test('32: findings in files of two plan cards make two fix-up cards, each with its own findings and its card\'s experts', async () => {
  const cards = [card('a', { experts: ['quality'] }), card('b', { experts: ['security'] })];
  const r = withFreeNames(responder({ reviewFindings: [finding('src/a/x.js'), finding('src/b/y.js', 'medium')] }));
  await run(baseArgs(cards, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), r);
  const adds = r.calls.filter((c) => /^fixup(-\d+)?:setup$/.test(c.label)).map(addOf);
  assert.equal(adds.length, 2, 'two card-add calls');
  const forA = adds.find((l) => l.includes('src/a/x.js'));
  const forB = adds.find((l) => l.includes('src/b/y.js'));
  assert.ok(forA && forB && forA !== forB, adds.join('\n'));
  assert.match(forA, /--experts quality(?![,\w])/);
  assert.match(forB, /--experts security(?![,\w])/);
  assert.ok(!forA.includes('src/b/y.js') && !forB.includes('src/a/x.js'), 'nothing of the other group');
  const labels = labelsOf(r.calls);
  for (const name of ['fixup', 'fixup-2']) assert.ok(labels.includes(`${name}:commit`), `${name} was built and committed: ${labels.join(' ')}`);
});

test('33: findings in a file no plan card covers, or with no file, make one more card with the plan\'s line and none is dropped', async () => {
  const cards = [card('a', { experts: ['quality'] }), card('b', { experts: ['security'] })];
  const loose = [finding('test/a.test.js'), { ...finding(''), file: '' }, (({ file, ...rest }) => rest)(finding('x'))];
  const r = withFreeNames(responder({ reviewFindings: loose }));
  const { result } = await run(baseArgs(cards, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), r);
  const adds = r.calls.filter((c) => /^fixup(-\d+)?:setup$/.test(c.label)).map(addOf);
  assert.equal(adds.length, 1, adds.join('\n'));
  assert.match(adds[0], /--experts quality,security(?![,\w])/);
  assert.match(adds[0], /test\/a\.test\.js/);
  assert.equal(result.review.findings.length, 3);
  assert.equal(result.review.leftInReport, 2, 'the two without a file stay in the report');
});

test('35: one fix-up card that parks does not stop the others', async () => {
  const cards = [card('a', { experts: ['quality'] }), card('b', { experts: ['security'] })];
  const r = withFreeNames(responder({ reviewFindings: [finding('src/a/x.js'), finding('src/b/y.js')], red: ['fixup'] }));
  const { result } = await run(baseArgs(cards, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), r);
  const labels = labelsOf(r.calls);
  assert.equal(result.fixupCard.status, 'parked');
  assert.ok(labels.includes('fixup:park'), 'card 1 of 2 parked');
  assert.ok(labels.includes('fixup-2:commit'), 'card 2 reached commit: ' + labels.join(' '));
});

test('36: at most four fix-up cards per run; the findings of the rest stay in the report', async () => {
  const names = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const r = withFreeNames(responder({ reviewFindings: names.map((n) => finding(`src/${n}/x.js`)) }));
  const { result } = await run(baseArgs(names.map((n) => card(n))), r);
  const adds = r.calls.filter((c) => /^fixup(-\d+)?:setup$/.test(c.label));
  assert.equal(adds.length, 4);
  assert.equal(result.review.findings.length, 5);
  assert.equal(result.review.leftInReport, 1, 'the fifth group stays in the report');
  // Which four: the first four groups in plan order; the fifth is the one dropped.
  const added = adds.map(addOf);
  names.slice(0, 4).forEach((n, i) => assert.ok(added[i].includes(`src/${n}/x.js`), `card ${i + 1} holds ${n}: ${added[i]}`));
  assert.ok(!added.some((l) => l.includes('src/c5/x.js')), 'no card holds the fifth group');
});

test('49: agent text never reaches a card-add command line; it reaches the step through a file', async () => {
  const hostile = { ...finding('src/1/x.js'), what: '$(touch PWNED)' };
  const r = withFreeNames(responder({ reviewFindings: [hostile] }));
  await run(baseArgs([card('1')]), r);
  const setup = r.calls.find((c) => c.label === 'fixup:setup').prompt;
  const commandLines = setup.split('\n').filter((l) => / card-add /.test(l));
  assert.ok(commandLines.length > 0, 'a card-add line exists');
  assert.ok(!commandLines.some((l) => l.includes('PWNED')), commandLines.join('\n'));
  assert.ok(setup.includes('PWNED'), 'the text is not lost: it is in the step as a file to write');
});

test('21: a finding\'s file, line and text never reach a card-add command line, and running that line in a shell leaves no PWNED file', async (t) => {
  const hostile = { ...finding('src/1/$(touch PWNED).js'), line: '1`touch PWNED`', what: '$(touch PWNED) and `touch PWNED` and $HOME' };
  const r = withFreeNames(responder({ reviewFindings: [hostile] }));
  await run(baseArgs([card('1')]), r);
  const setup = r.calls.find((c) => c.label === 'fixup:setup').prompt;
  const commandLines = setup.split('\n').filter((l) => / card-add /.test(l)).map((l) => l.replace(/^\d+\. /, ''));
  assert.equal(commandLines.length, 1, 'one card-add line');
  const line = commandLines[0];
  assert.ok(!/PWNED|\$\(|`|\$HOME/.test(line), line);
  for (const flag of ['--title-file', '--paths-file', '--carried-file']) assert.ok(line.includes(flag), `${flag} is on the line: ${line}`);
  assert.ok(!/--(title|paths|carried) /.test(line), `no text flag is left on the line: ${line}`);
  assert.ok(setup.includes('src/1/$(touch PWNED).js'), 'the path is not lost: it is in a file the step writes');
  // The real thing: a shell that runs the line must not run the planted command.
  const bash = spawnSync('bash', ['-c', 'echo ok'], { encoding: 'utf8' });
  if (bash.status !== 0) return t.skip('no bash on this machine: the command line was checked as text only');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-pwned-'));
  spawnSync('bash', ['-c', line], { cwd: dir, encoding: 'utf8' });
  assert.deepStrictEqual(fs.readdirSync(dir), [], 'running the card-add line wrote nothing');
});

// --- expert-retry (PLAN-run-fixes.md, card expert-retry, tests 38 to 41) -----------------------------
// A responder keyed by call count: the shared responder splits a label on ':' and keeps two parts, so
// '<card>:<expert>:retry' would look like a first call. This one counts the calls per full label.

function nullThen(base, nulls) {
  const calls = [];
  const count = {};
  const asked = {};
  const fn = async (c) => {
    calls.push(c);
    count[c.label] = (count[c.label] || 0) + 1;
    // 'nulls' counts the calls of one expert across its first call and its retry: {x: 2} fails both.
    const family = c.label.replace(/:retry$/, '');
    asked[family] = (asked[family] || 0) + 1;
    const wanted = nulls[family];
    if (wanted !== undefined && asked[family] <= wanted) return null;
    if (/:security$|:security:retry$/.test(c.label)) return { lensVerdict: 'ok', findings: [], stillPresent: [] };
    return base(c);
  };
  fn.calls = calls;
  fn.count = (label) => count[label] || 0;
  fn.retries = () => calls.filter((c) => /:retry$/.test(c.label)).map((c) => c.label);
  return fn;
}

// Carried from card-add: a refused card-add for the second fix-up card was recorded under 'fixup'.
test('42: a refused card-add for fixup-2 is recorded under fixup-2, not under fixup', async () => {
  const cards = [card('a', { experts: ['quality'] }), card('b', { experts: ['security'] })];
  const r = withFreeNames(responder({ reviewFindings: [finding('src/a/x.js'), finding('src/b/y.js')] }));
  const refuse = async (c) => (c.label === 'fixup-2:setup' ? steps({ ok: false, reason: 'REFUSED-FOR-2' }) : r(c));
  const { result } = await run(baseArgs(cards, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), refuse);
  const notStarted = result.cards.filter((c) => c.status === 'not started');
  assert.deepStrictEqual(notStarted.map((c) => c.card), ['fixup-2']);
  assert.match(notStarted[0].reason, /fixup-2 card could not be added/);
  assert.match(notStarted[0].reason, /REFUSED-FOR-2/);
  assert.equal(result.cards.find((c) => c.card === 'fixup').status, 'committed', 'the first fix-up card is untouched');
});

// --- fixup card (PLAN-run-fixes.md, confirmed review findings) --------------------------------------

const os = require('node:os');
const { spawnSync } = require('node:child_process');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));

const tmpPlan = (text) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-fixup-')));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), text);
  return dir;
};

test('50: card-add --carried-file takes the carried text from the file, as written', () => {
  const dir = tmpPlan('---\nplan_confirmed: true\n---\n\n# PLAN: x\n\nBody.\n');
  fs.writeFileSync(path.join(dir, 'carried.txt'), 'quality at a.js:1: $(touch PWNED); second item');
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'card-add', '--plan', 'PLAN-x.md', '--name', 'findings', '--title', 'x', '--paths', 'a.js', '--carried-file', 'carried.txt'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const added = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.deepStrictEqual(added.card.carried, ['quality at a.js:1: $(touch PWNED)', 'second item']);
});

test('50b: card-add --title-file and --paths-file take the title and the paths from the files', () => {
  const dir = tmpPlan('---\nplan_confirmed: true\n---\n\n# PLAN: x\n\nBody.\n');
  fs.writeFileSync(path.join(dir, 'title.txt'), 'confirmed review findings\n');
  fs.writeFileSync(path.join(dir, 'paths.txt'), 'src/a/x.js,src/b/y.js\n');
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'card-add', '--plan', 'PLAN-x.md', '--name', 'fixup', '--title-file', 'title.txt', '--paths-file', 'paths.txt'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const added = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(added.card.title, 'confirmed review findings');
  assert.deepStrictEqual(added.card.paths, ['src/a/x.js', 'src/b/y.js']);
});

test('51: a card-commit whose diff holds only test files is still judged by the named card\'s experts', () => {
  const dir = tmpPlan(`---
experts: [quality, security]
---

# PLAN: x

## Cards

- A: first
  paths: src/a/**
  experts: quality
- B: second
  paths: src/b/**
  experts: security
`);
  const got = experts.effectiveExperts(dir, path.join(dir, 'PLAN-x.md'), PLUGIN, ['test/a.test.js'], { card: 'A' });
  assert.equal(got.source, 'card', JSON.stringify(got));
  assert.deepStrictEqual(got.experts, ['quality']);
  const byHand = experts.effectiveExperts(dir, path.join(dir, 'PLAN-x.md'), PLUGIN, ['test/a.test.js']);
  assert.deepStrictEqual(byHand.experts, ['quality', 'security'], 'no card named: the plan\'s line, as before');
});

// --- settle-first (PLAN-run-fixes.md, card settle-first, tests 46 to 50) -----------------------------
// The review, the fix-up cards, the findings card and the harvest wait until no card is parked,
// needs-decision, blocked or not started. The recorded state of the run (the HEAD the review covered
// and the harvest branch) is read by the step settle:state and written by settle:record.

const WAITING = /waiting for [^;]*; they run once, on the resume that settles them/;
const waitingLabels = (labels) => labels.filter((l) => /^(review:|harvest|fixup|findings)/.test(l));
const recordCalls = (calls) => calls.filter((c) => c.label === 'settle:record');
const LENS_LABEL = /^review:(correctness|simplicity|surgical-scope|test-coverage)$/;

test('46: with one card parked there is no review, no fix-up card and no harvest', async () => {
  const calls = [];
  const base = responder({
    red: ['1'],
    reviewFindings: [{ file: 'src/2/x.js', line: 3, what: 'off by one', howItFails: 'n=0', confidence: 'high' }],
  });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2')]), r);
  assert.equal(result.cards.find((c) => c.card === '1').status, 'parked');
  assert.equal(result.cards.find((c) => c.card === '2').status, 'committed');
  assert.deepStrictEqual(waitingLabels(labelsOf(calls)), [], labelsOf(calls).join(' '));
  assert.equal(result.review.ran, false);
  assert.match(result.review.reason, WAITING);
  assert.match(result.review.reason, /waiting for 1(?![\w-])/);
  assert.match(result.harvest.reason, /waiting for 1(?![\w-])/);
  const text = JSON.stringify(result);
  assert.ok(text.includes('/ultimate-workflow:review') && text.includes('/ultimate-workflow:harvest'), 'the commands to run them by hand');
  assert.equal(recordCalls(calls).length, 0, 'nothing ran, so run.json records no review and no harvest branch');
  assert.equal(result.reviewed, null, 'a parked card means the branch was not reviewed');
  assert.match(result.reviewedText, /^NOT REVIEWED: waiting for 1(?![\w-])/);
  assert.match(result.summary, /NOT REVIEWED/);
});

test('47: a card that is blocked, needs a decision, was not started, or is a parked fix-up card holds the review or the harvest back', async () => {
  const major = { ok: true, card: '1', major: [{ kind: 'dependency', what: 'added dependency left-pad@1.3.0 in package.json' }], minor: [] };
  const two = [card('a', { experts: ['quality'] }), card('b', { experts: ['security'] })];
  const table = [
    { name: 'blocked on a card the plan does not have', cards: [card('1'), card('2', { depends: ['ghost'] })], o: {}, waits: ['2'], harvestOnly: false },
    { name: 'needs-decision', cards: [card('1'), card('2')], o: { decisions: { 1: major } }, waits: ['1'], harvestOnly: false },
    { name: 'not started because the run stopped', cards: [card('0'), card('1'), card('2'), card('3')], o: { red: ['1', '2'] }, waits: ['3'], harvestOnly: false },
    { name: 'every plan card committed, fix-up card 1 of 2 parks', cards: two, args: { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }, o: { reviewFindings: [finding('src/a/x.js'), finding('src/b/y.js')], red: ['fixup'] }, waits: ['fixup'], harvestOnly: true },
  ];
  for (const t of table) {
    const r = withFreeNames(responder(t.o));
    const { result } = await run(baseArgs(t.cards, t.args || {}), r);
    const labels = labelsOf(r.calls);
    assert.ok(!labels.some((l) => /^harvest/.test(l)), `${t.name}: no harvest: ${labels.join(' ')}`);
    assert.equal(result.harvest.ran, false, t.name);
    for (const w of t.waits) assert.match(result.harvest.reason, new RegExp(`waiting for [^;]*(?<![\\w-])${w}(?![\\w-])`), `${t.name}: ${result.harvest.reason}`);
    assert.ok(recordCalls(r.calls).every((c) => !/--harvest-branch/.test(c.prompt)), `${t.name}: run.json records no harvest branch`);
    if (!t.harvestOnly) assert.deepStrictEqual(waitingLabels(labels), [], t.name);
    else assert.ok(labels.includes('fixup-2:commit'), `${t.name}: the second fix-up card still ran`);
  }
});

test('48: with every card committed each review lens and the harvest run exactly once, and run.json records both', async () => {
  const r = responder();
  const calls = [];
  const { result } = await run(baseArgs([card('1'), card('2')]), async (c) => { calls.push(c); return r(c); });
  const labels = labelsOf(calls);
  for (const lens of ['correctness', 'simplicity', 'surgical-scope', 'test-coverage']) assert.equal(labels.filter((l) => l === `review:${lens}`).length, 1, lens);
  assert.equal(labels.filter((l) => l === 'harvest').length, 1);
  assert.equal(labels.filter((l) => l === 'settle:state').length, 1);
  const rec = recordCalls(calls);
  assert.equal(rec.length, 1, 'one record step');
  assert.match(rec[0].prompt, /run-state [^\n]*--record/);
  assert.match(rec[0].prompt, /--harvest-branch uw\/harvest\/f/);
  assert.ok(labels.indexOf('harvest:branch') < labels.indexOf('settle:record'), 'recorded after the harvest branch was made');
  assert.equal(result.harvest.ran, true);
});

test('49: the review range starts at the base the run was given, never at the resume HEAD', async () => {
  const calls = [];
  const r = responder();
  const { result } = await run(baseArgs([card('1')], { base: 'feedbee0123', resume: { all: true } }), async (c) => { calls.push(c); return r(c); });
  const lenses = calls.filter((c) => LENS_LABEL.test(c.label));
  assert.equal(lenses.length, 4);
  for (const c of lenses) assert.ok(c.prompt.includes('feedbee0123..HEAD'), c.label);
  assert.ok(!calls.some((c) => /run-branch/.test(c.prompt)), 'the script never asks runBranch for a base');
  assert.equal(result.review.range, 'feedbee0123..HEAD');
});

test('50: a later settling resume reviews the whole branch again only when a card was committed since the recorded head', async () => {
  // (a) nothing was committed since the review and the harvest
  const a = responder({ state: { head: 'h2', reviewedHead: 'h2', harvestedHead: 'h2', harvestBranch: 'uw/harvest/f' } });
  const callsA = [];
  const outA = await run(baseArgs([card('1', { committed: true })]), async (c) => { callsA.push(c); return a(c); });
  assert.deepStrictEqual(waitingLabels(labelsOf(callsA)), [], 'no review, no harvest: ' + labelsOf(callsA).join(' '));
  assert.equal(recordCalls(callsA).length, 0);
  assert.equal(outA.result.review.ran, false);
  assert.equal(outA.result.harvest.ran, false);
  // (b) a card was committed on this resume
  const b = responder({ state: { head: 'h3', reviewedHead: 'r1', harvestedHead: 'r1', harvestBranch: 'uw/harvest/f' } });
  const callsB = [];
  const outB = await run(baseArgs([card('1', { committed: true }), card('2')]), async (c) => { callsB.push(c); return b(c); });
  const lenses = callsB.filter((c) => LENS_LABEL.test(c.label));
  assert.equal(lenses.length, 4, 'one review per lens');
  for (const c of lenses) {
    assert.ok(c.prompt.includes('abc1234..HEAD'), `${c.label} reviews the whole branch from the base`);
    assert.ok(!c.prompt.includes('r1..HEAD'), `${c.label} does not start at the earlier review`);
  }
  assert.equal(labelsOf(callsB).filter((l) => l === 'harvest').length, 1);
  const rec = recordCalls(callsB);
  assert.equal(rec.length, 1);
  assert.match(rec[0].prompt, /run-state [^\n]*--record/);
  assert.equal(outB.result.review.range, 'abc1234..HEAD');
});

test('55: a review that ran is recorded even when its fix-up card parks and the harvest waits', async () => {
  const two = [card('a', { experts: ['quality'] }), card('b', { experts: ['security'] })];
  const r = withFreeNames(responder({ reviewFindings: [finding('src/a/x.js'), finding('src/b/y.js')], red: ['fixup'] }));
  const { result } = await run(baseArgs(two, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), r);
  assert.equal(result.review.ran, true);
  assert.equal(result.harvest.ran, false);
  const rec = recordCalls(r.calls);
  assert.equal(rec.length, 1, 'the review is on record');
  assert.match(rec[0].prompt, /run-state [^\n]*--record/);
  assert.ok(!/--harvest-branch/.test(rec[0].prompt), 'no harvest branch was made');
});

test('57: the review and the harvest are recorded apart, so the half that failed is run again and the other is not', async () => {
  // (a) the review ran, the harvest agent returned nothing: only the review is recorded
  const a = responder();
  const callsA = [];
  const outA = await run(baseArgs([card('1')]), async (c) => { callsA.push(c); return c.label === 'harvest' ? null : a(c); });
  assert.equal(outA.result.review.ran, true);
  assert.equal(outA.result.harvest.ran, false);
  const recA = recordCalls(callsA);
  assert.equal(recA.length, 1);
  assert.match(recA[0].prompt, /run-state [^\n]*--record[^\n]*--review/);
  assert.ok(!/--harvest(?!-branch)/.test(recA[0].prompt), 'a harvest that did not run is not recorded: ' + recA[0].prompt);
  // (b) the resume after it: the review covered this HEAD, the harvest did not
  const b = responder({ state: { head: 'h2', reviewedHead: 'h2', harvestedHead: '' } });
  const callsB = [];
  const outB = await run(baseArgs([card('1', { committed: true })]), async (c) => { callsB.push(c); return b(c); });
  assert.equal(callsB.filter((c) => LENS_LABEL.test(c.label)).length, 0, 'no second review');
  assert.equal(labelsOf(callsB).filter((l) => l === 'harvest').length, 1, 'the harvest is run again');
  assert.equal(outB.result.review.ran, false);
  assert.equal(outB.result.harvest.ran, true);
  const recB = recordCalls(callsB);
  assert.equal(recB.length, 1);
  assert.match(recB[0].prompt, /run-state [^\n]*--record[^\n]*--harvest(?!-branch)/);
  assert.ok(!/--review/.test(recB[0].prompt), 'the review did not run, so its head is not moved: ' + recB[0].prompt);
  // (c) the other way round: the harvest covered this HEAD, the review did not
  const c3 = responder({ state: { head: 'h2', reviewedHead: 'r1', harvestedHead: 'h2' } });
  const callsC = [];
  const outC = await run(baseArgs([card('1', { committed: true })]), async (c) => { callsC.push(c); return c3(c); });
  assert.equal(callsC.filter((c) => LENS_LABEL.test(c.label)).length, 4, 'the review is run again');
  assert.equal(labelsOf(callsC).filter((l) => l === 'harvest').length, 0, 'no second harvest');
  assert.equal(outC.result.review.range, 'abc1234..HEAD');
  const recC = recordCalls(callsC);
  assert.equal(recC.length, 1);
  assert.match(recC[0].prompt, /--review/);
  assert.ok(!/--harvest(?!-branch)/.test(recC[0].prompt), recC[0].prompt);
});

test('57b: a harvest whose branch step failed is not recorded as done', async () => {
  const base = responder();
  const calls = [];
  const { result } = await run(baseArgs([card('1')]), async (c) => { calls.push(c); return c.label === 'harvest:branch' ? steps({ ok: false, reason: 'boom' }) : base(c); });
  assert.equal(result.harvest.error, 'boom');
  const rec = recordCalls(calls);
  assert.equal(rec.length, 1, 'the review is still recorded');
  assert.match(rec[0].prompt, /--review/);
  assert.ok(!/--harvest(?!-branch)/.test(rec[0].prompt), rec[0].prompt);
});

test('harvest-name 53: a second harvest is told the open uw/harvest/<f>* branches and to drop what they hold', async () => {
  const open = ['uw/harvest/f', 'uw/harvest/f-2'];
  const second = responder({ state: { head: 'h3', reviewedHead: 'r1', harvestedHead: 'r1', openHarvests: open } });
  const calls = [];
  await run(baseArgs([card('1', { committed: true }), card('2')]), async (c) => { calls.push(c); return second(c); });
  const prompt = calls.find((c) => c.label === 'harvest').prompt;
  for (const b of open) assert.ok(prompt.includes(b), `${b} is named: ${prompt.slice(0, 400)}`);
  assert.match(prompt, /drop what they already hold/);
  // A first harvest has no open branch to read.
  const first = responder();
  const firstCalls = [];
  await run(baseArgs([card('1')]), async (c) => { firstCalls.push(c); return first(c); });
  assert.doesNotMatch(firstCalls.find((c) => c.label === 'harvest').prompt, /drop what they already hold/);
});

test('58: a fix-up card committed by this run\'s review is harvested, though the harvest covered the head read before it', async () => {
  const two = [card('a', { experts: ['quality'], committed: true }), card('b', { experts: ['security'], committed: true })];
  const state = { head: 'h2', reviewedHead: 'r1', harvestedHead: 'h2' };
  const r = withFreeNames(responder({ state, reviewFindings: [finding('src/a/x.js'), finding('src/b/y.js')] }));
  const { result } = await run(baseArgs(two, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), r);
  const fixups = result.cards.filter((c) => /^fixup/.test(c.card));
  assert.deepStrictEqual(fixups.map((c) => `${c.card} ${c.status}`), ['fixup committed', 'fixup-2 committed']);
  assert.equal(labelsOf(r.calls).filter((l) => l === 'harvest').length, 1, 'the fix-up commits are harvested');
  assert.equal(result.harvest.ran, true);
  const rec = recordCalls(r.calls);
  assert.equal(rec.length, 1);
  assert.match(rec[0].prompt, /--review/);
  assert.match(rec[0].prompt, /--harvest(?!-branch)/);
});

test('59: a review with a lens that returned nothing is not recorded as covering the head, so the next resume reviews the range again', async () => {
  const base = responder();
  const calls = [];
  const { result } = await run(baseArgs([card('1')]), async (c) => { calls.push(c); return c.label.startsWith('review:simplicity') ? null : base(c); });
  assert.deepStrictEqual(result.review.failedLenses, ['simplicity'], 'asked once more, and still nothing');
  assert.ok(calls.some((c) => c.label === 'review:simplicity:retry'));
  assert.equal(result.reviewed, null);
  assert.match(result.reviewedText, /^NOT REVIEWED: simplicity returned nothing, also on the retry/);
  assert.equal(result.harvest.ran, true);
  const rec = recordCalls(calls);
  assert.equal(rec.length, 1, 'the harvest is still recorded');
  assert.match(rec[0].prompt, /--harvest(?!-branch)/);
  assert.ok(!/--review/.test(rec[0].prompt), 'an incomplete review does not move the reviewed head: ' + rec[0].prompt);
});

// --- reasons (PLAN-run-fixes.md, card reasons, test 58 and the expert case) -------------------------

const commandLinesOf = (calls) => calls.flatMap((c) => String(c.prompt).split('\n').filter((l) => /^\d+\. node "\/p\/experts\/experts\.js" /.test(l)));
const LONG = `${Array.from({ length: 200 }, (_, i) => `part${i}`).join(' ')} THE-END`;

test('reasons 58: a long park reason reaches the report whole', async () => {
  assert.ok(LONG.length > 700);
  const { result } = await run(baseArgs([card('1')]), responder({ commitFails: { 1: LONG } }));
  const entry = result.cards.find((c) => c.card === '1');
  assert.equal(entry.status, 'parked');
  assert.ok(entry.reason.includes('THE-END'), `the reason is not cut: ...${entry.reason.slice(-60)}`);
  assert.ok(!entry.reason.includes('\n'), 'one line');
});

test('reasons 58: a held card run again within the plan keeps the whole detail of why it failed', async () => {
  const calls = [];
  const base = responder({ commitFails: { 1: LONG } });
  const args = baseArgs([card('1', { parked: { branch: 'uw/parked/f/1' } })], { resume: { card: '1', rerun: true, avoid: 'needs a decision the plan does not state: a new dependency' } });
  const { result } = await run(args, async (c) => { calls.push(c); return base(c); });
  const entry = result.cards.find((c) => c.card === '1');
  assert.equal(entry.status, 'needs-decision', JSON.stringify(entry).slice(0, 300));
  assert.ok(entry.reason.includes('THE-END'), `...${entry.reason.slice(-80)}`);
  assert.ok(calls.find((c) => c.label === '1:park').prompt.includes('THE-END'), 'the park reason file holds it whole');
});

test('reasons 58: a refused commit that printed text and no JSON keeps all of that text', async () => {
  const base = responder();
  const { result } = await run(baseArgs([card('1')]), async (c) => (c.label === '1:commit' ? steps(`refused ${LONG}`) : base(c)));
  const entry = result.cards.find((c) => c.card === '1');
  assert.equal(entry.status, 'parked');
  assert.ok(entry.reason.includes('THE-END'), `...${entry.reason.slice(-80)}`);
});

test('reasons 58 and the expert case: the stop text goes to the stopped notice through a file, whole, and never on a command line', async () => {
  const hostile = `the same failure $(touch PWNED) and \`touch PWNED\` and $HOME ${LONG}`;
  const calls = [];
  const base = responder({ commitFails: { 1: hostile, 2: hostile } });
  const { result } = await run(baseArgs([card('1'), card('2'), card('3')]), async (c) => { calls.push(c); return base(c); });
  assert.match(result.stopped, /two cards in a row were parked for the same reason/);
  assert.ok(result.stopped.includes('THE-END'), 'the stop text is whole');
  const stop = calls.find((c) => c.label === 'stopped:notify');
  assert.ok(stop, 'the stopped notice is sent');
  assert.match(stop.prompt, /notify [^\n]*--kind stopped[^\n]*--reason-file/);
  assert.ok(stop.prompt.includes('THE-END'), 'the whole stop text is in the file the step writes');
  for (const line of commandLinesOf(calls)) assert.ok(!/PWNED|\$\(|`|\$HOME/.test(line), line.slice(0, 300));
});

// --- one-notice (PLAN-run-fixes.md, card one-notice, test 63) ---------------------------------------

test('one-notice 63: a run with two parked cards, blocked cards and a stop sends one finished notice that names every blocker', async () => {
  const calls = [];
  const base = responder({ commitFails: { p1: 'the same failure', p2: 'the same failure' } });
  const cards = [card('p1'), card('p2'), card('b1', { depends: ['p1'] }), card('b2', { depends: ['p2'] }), card('later')];
  const { result } = await run(baseArgs(cards), async (c) => { calls.push(c); return base(c); });
  assert.ok(result.stopped, 'the run stopped');
  const finished = calls.filter((c) => /notify [^\n]*--kind finished/.test(c.prompt));
  assert.equal(finished.length, 1, 'exactly one step sends the finished notice');
  assert.equal(commandLinesOf(calls).filter((l) => /--kind finished/.test(l)).length, 1, 'exactly one command line');
  const line = commandLinesOf(finished).find((l) => /--kind finished/.test(l));
  assert.match(line, /--reason-file/);
  const text = /<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(finished[0].prompt)[1];
  for (const name of ['p1', 'p2']) assert.match(text, new RegExp(`parked: [^;]*\\b${name}\\b`), `${name} is named as parked: ${text}`);
  for (const name of ['b1', 'b2']) assert.match(text, new RegExp(`blocked: [^;]*\\b${name}\\b`), `${name} is named as blocked: ${text}`);
  assert.match(text, /stopped/);
});

// --- review of the whole branch (2026-11-13) --------------------------------------------------------

test('a run-state read that fails stops the settle step: no findings card, review or harvest, nothing written, and the result says why', async () => {
  const stuck = { file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low' };
  for (const [name, answer] of [['ok: false', steps({ ok: false, reason: 'run.json is not JSON' })], ['nothing', null]]) {
    const calls = [];
    const base = responder({ findings: { 1: [stuck] } });
    const { result } = await run(baseArgs([card('1')]), async (c) => { calls.push(c); return c.label === 'settle:state' ? answer : base(c); });
    const labels = labelsOf(calls);
    assert.deepStrictEqual(waitingLabels(labels), [], `${name}: ${labels.join(' ')}`);
    assert.ok(!labels.includes('settle:findings'), `${name}: the saved findings are not overwritten`);
    assert.equal(recordCalls(calls).length, 0, `${name}: nothing is recorded`);
    assert.equal(result.review.ran, false);
    assert.match(result.review.reason, /the run state could not be read/, name);
    assert.match(result.harvest.reason, /the run state could not be read/, name);
    assert.match(result.stateError, /could not be read/, name);
    assert.match(result.summary, /the run state could not be read/, name);
    assert.equal(result.cards.find((c) => c.card === '1').status, 'committed', 'the card itself is not undone');
  }
});

// ---- PLAN-simplify, card one-resume: a resume repeats no step that is already recorded as done ----

test('resume: a run stopped after the review was recorded and before the harvest makes no lens or expert call on resume, and the harvest runs once', async () => {
  const r = responder({ state: { head: 'h2', reviewedHead: 'h2', harvestedHead: '', harvestBranch: '' } });
  const calls = [];
  await run(baseArgs([card('1', { committed: true })]), async (c) => { calls.push(c); return r(c); });
  assert.equal(calls.filter((c) => LENS_LABEL.test(c.label)).length, 0, 'no lens: ' + labelsOf(calls).join(' '));
  assert.equal(calls.filter((c) => /^[0-9a-z-]+:(recheck|refute)/.test(c.label)).length, 0, 'no experts check');
  assert.equal(labelsOf(calls).filter((l) => l === 'harvest').length, 1);
});

test('resume: a committed card is never rebuilt, and the remaining card makes exactly the calls a fresh run of it makes', async () => {
  const fresh = [];
  const f = responder();
  await run(baseArgs([card('2')]), async (c) => { fresh.push(c); return f(c); });
  const resumed = [];
  const g = responder({ state: { head: 'h3', reviewedHead: '', harvestedHead: '', harvestBranch: '' } });
  await run(baseArgs([card('1', { committed: true }), card('2')]), async (c) => { resumed.push(c); return g(c); });
  const mine = (calls) => labelsOf(calls).filter((l) => l.startsWith('2:'));
  assert.deepStrictEqual(mine(resumed), mine(fresh), 'card 2 makes the calls of a fresh run, no more and no fewer');
  assert.deepStrictEqual(labelsOf(resumed).filter((l) => l.startsWith('1:')), [], 'card 1 is not touched: ' + labelsOf(resumed).filter((l) => l.startsWith('1:')).join(' '));
});

test('resume: a parked 4.8.0 run resumes from its fixture run.json, and the old flags build the same object', async () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', '4.8.0', 'run', 'run-harvest-2.json'), 'utf8'));
  const r = responder({ state: { head: fixture.reviewedHead, reviewedHead: fixture.reviewedHead, harvestedHead: fixture.harvestedHead, harvestBranch: fixture.harvestBranch } });
  const calls = [];
  const out = await run(baseArgs([card('1', { committed: true })]), async (c) => { calls.push(c); return r(c); });
  assert.deepStrictEqual(waitingLabels(labelsOf(calls)), [], 'nothing recorded is repeated: ' + labelsOf(calls).join(' '));
  assert.equal(out.result.harvest.ran, false);
  const rules = require(path.join(PLUGIN, 'lib', 'run-rules.js'));
  assert.deepStrictEqual(rules.resumeObject({ flag: { card: '1', reason: 'resumed by the user', accept: false }, held: { name: '1', parked: { branch: 'uw/parked/calc/1' } }, back: { testFiles: [] }, feature: 'calc' }), { card: '1', reason: 'resumed by the user', testFiles: [] });
});

// ---- the run reviews once (owner choice C, 2026-11-14) ----

test('one review: a card makes no recheck, expert, refute or record call; its steps end with scope, decisions and the commit', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1'), card('2')], { planExperts: ['quality'] }), r);
  const perCard = r.seen.filter((l) => /^[12]:/.test(l));
  for (const l of perCard) assert.ok(!/:(recheck|quality|refute|record|prepare|fix-round|carry)/.test(l), `no per-card experts step: ${l}`);
  assert.deepStrictEqual(perCard.filter((l) => /^1:/.test(l)), ['1:start', '1:write-tests', '1:attempt-1', '1:scope', '1:decisions', '1:commit', '1:journal']);
  assert.equal(result.counts.committed, 2);
});

test('one review: after the last card the whole branch is reviewed once, experts included, then harvested', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1'), card('2')], { planExperts: ['quality'] }), r);
  const seen = r.seen;
  const lenses = ['review:correctness', 'review:simplicity', 'review:surgical-scope', 'review:test-coverage'];
  for (const l of [...lenses, 'review:recheck', 'review:quality']) assert.equal(seen.filter((x) => x === l).length, 1, l);
  assert.ok(seen.indexOf('2:commit') < seen.indexOf('review:prepare') && seen.indexOf('review:prepare') < seen.indexOf('review:recheck'));
  assert.ok(seen.indexOf('review:quality') < seen.indexOf('review:record') && seen.indexOf('review:record') < seen.indexOf('harvest'));
  assert.equal(result.review.range, 'abc1234..HEAD');
  assert.equal(result.expertLanes.length, 1, "one lane, the review's, for the ledger");
  assert.deepStrictEqual(result.expertLanes[0].lane.ran, ['quality']);
});

test('one review: the review is recorded with run.json, and the result, the notice and the report line say reviewed with the open count', async () => {
  const calls = [];
  const base = responder({ reviewFindings: [{ file: 'src/1/y.js', line: 1, what: 'style', howItFails: 'n/a', confidence: 'low' }] });
  const { result } = await run(baseArgs([card('1')]), async (c) => { calls.push(c); return base(c); });
  assert.match(calls.find((c) => c.label === 'settle:record').prompt, /run-state [^\n]*--record --review --open 1/, 'one low finding is open');
  assert.deepStrictEqual(result.reviewed, { head: 'head2', open: 1, ranges: ['abc1234..head1'] });
  assert.equal(result.reviewedText, 'Reviewed by the experts at head2: 1 finding open');
  assert.match(result.summary, /Reviewed by the experts at head2: 1 finding open/);
  const finished = calls.find((c) => c.label === 'finished:notify');
  assert.match(finished.prompt, /Reviewed by the experts at head2: 1 finding open/);
  assert.match(finished.prompt, /--action "read the report \(1 finding open\), then merge uw\/run\/f; before merging: experts\.js check --range abc1234\.\.head1"/);
});

test('one review: fix-up cards take the confirmed high and medium findings, then ONE experts-only check covers them, with no second fix round', async () => {
  const calls = [];
  const base = responder({ reviewFindings: [{ file: 'src/1/x.js', line: 3, what: 'off by one', howItFails: 'n=0', confidence: 'high' }] });
  const { result } = await run(baseArgs([card('1')], { planExperts: ['quality'] }), async (c) => { calls.push(c); return base(c); });
  const seen = labelsOf(calls);
  assert.equal(result.fixupCard.status, 'committed');
  assert.equal(seen.filter((l) => l === 'fixup:setup').length, 1, 'one fix-up card');
  assert.ok(seen.indexOf('fixup:commit') < seen.indexOf('review-fixups:prepare'), 'the check of the fix-up cards comes after them');
  assert.ok(seen.includes('review-fixups:quality'));
  assert.ok(!seen.includes('review-fixups:recheck'), 'the check of the fix-up cards asks no recheck');
  assert.ok(!seen.some((l) => /^review-fixups:(correctness|simplicity|surgical-scope|test-coverage)$/.test(l)), 'only the experts');
  assert.equal(seen.filter((l) => /^fixup[^:]*:write-tests$/.test(l)).length, 1, 'no second fix round');
  assert.equal(result.fixupReview.ran, true);
  assert.equal(result.fixupReview.range, 'head1..HEAD');
  assert.deepStrictEqual(result.reviewed, { head: 'head2', open: 0, ranges: ['abc1234..head1', 'head1..head2'] }, 'the one finding was fixed by a committed fix-up card');
  assert.deepStrictEqual(result.expertLanes.map((l) => l.card), ['review', 'review-fixups']);
});

test('one review: an expert that returns nothing is asked once more; after two nothings the run says NOT REVIEWED and never says to merge', async () => {
  const once = responder();
  let n = 0;
  const calls1 = [];
  const a = await run(baseArgs([card('1')], { planExperts: ['quality'] }), async (c) => { calls1.push(c); return c.label === 'review:quality' && n++ === 0 ? null : once(c); });
  assert.ok(labelsOf(calls1).includes('review:quality:retry'));
  assert.equal(a.result.reviewedText, 'Reviewed by the experts at head2: 0 findings open');
  const twice = responder();
  const calls2 = [];
  const b = await run(baseArgs([card('1')], { planExperts: ['quality'] }), async (c) => { calls2.push(c); return c.label.startsWith('review:quality') ? null : twice(c); });
  assert.equal(b.result.reviewed, null);
  assert.match(b.result.reviewedText, /^NOT REVIEWED: quality returned nothing, also on the retry/);
  assert.equal(recordCalls(calls2).filter((c) => /--review/.test(c.prompt)).length, 0, 'an incomplete review does not move the reviewed head');
  const finished = calls2.find((c) => c.label === 'finished:notify');
  assert.match(finished.prompt, /--action "do not merge yet: NOT REVIEWED/);
  assert.doesNotMatch(finished.prompt, /then merge uw\/run/);
});

test('one review: a parked card means NOT REVIEWED with its reason and the card as the action; a settling resume runs the review then', async () => {
  const calls = [];
  const base = responder({ red: ['1'] });
  const { result } = await run(baseArgs([card('1'), card('2')]), async (c) => { calls.push(c); return base(c); });
  assert.equal(result.review.ran, false);
  assert.match(result.reviewedText, /^NOT REVIEWED: waiting for 1/);
  assert.match(calls.find((c) => c.label === 'finished:notify').prompt, /--action "settle 1: the report lists the command for each"/, 'a held card is the action; no merge advice');
  const b2 = responder();
  const out = await run(baseArgs([card('1', { committed: true }), card('2', { committed: true })]), b2);
  assert.equal(out.result.reviewed.head, 'head2');
  assert.ok(b2.seen.includes('review:correctness'), 'the review runs on the resume that settles the cards');
});

test('one review: a review already recorded for this head is not run again, and its recorded line is shown', async () => {
  const base = responder({ state: { head: 'h2', reviewedHead: 'h2', harvestedHead: 'h2', harvestBranch: 'uw/harvest/f', reviewed: { head: 'h2', at: 'x', open: 2 } } });
  const { result } = await run(baseArgs([card('1', { committed: true })]), base);
  assert.equal(result.review.ran, false);
  assert.deepStrictEqual(result.reviewed, { head: 'h2', open: 2 });
  assert.equal(result.reviewedText, 'Reviewed by the experts at h2: 2 findings open');
});
