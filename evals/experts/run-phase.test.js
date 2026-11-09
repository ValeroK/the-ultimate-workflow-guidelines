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
    if (role === 'prepare' || role === 'prepare-fix') return steps({ card: who, outOfScope: [] }, { ok: true });
    if (role === 'fix-round') return (o.fixRound && o.fixRound[who]) || { green: true, fullSuiteGreen: true, filesChanged: [`test/${who}.test.js`], testFiles: [`test/${who}.test.js`], newTests: [{ name: 'b guard', failedFirst: false, why: 'the code was right' }], summary: 'wrote the missing test' };
    if (role === 'recheck') return { experts: [] };
    if (role === 'quality' && who !== 'review') return { lensVerdict: 'ok', findings: (o.findings && o.findings[who]) || [], stillPresent: (o.stillPresent && o.stillPresent[who]) || [] };
    if (role === 'refute' && who !== 'review') return { verdicts: [] };
    if (role === 'commit') {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(call.prompt)[1]).expertLane;
      const reason = o.commitFails && o.commitFails[who];
      return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] }, reason ? { ok: false, reason } : { ok: true, card: who, commit: `c-${who}`, files: 1, handoff: 'h', missingClaims: [] });
    }
    if (role === 'park') return steps({ ok: true, card: who, branch: `uw/parked/f/${who}` }, { ok: true, desktop: 'sent' });
    if (role === 'notify') return steps({ ok: true, desktop: 'sent' });
    if (role === 'decisions') return steps((o.decisions && o.decisions[who]) || { ok: true, card: who, major: [], minor: [] });
    if (role === 'journal') return steps({ ok: true });
    if (role === 'carry') return steps({ ok: true });
    if (role === 'start' || (who === 'blocked' && role === 'status')) return steps(...String(call.prompt).split('\n').filter((l) => /card-status/.test(l)).map(() => ({ ok: true })));
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

// The in-card fix round (2026-11-09): three real runs of four parked a card on a missing test in its
// own test file. A blocking finding in the card's files now gets one more round in the card and a
// fresh experts check; only what is still blocking after it, or a finding outside the card, parks it.
test('a blocking finding in the card\'s own files is fixed in one more round, re-checked, and the card commits', async () => {
  const blocking = { file: 'C:/proj/src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'delete it, all green', confidence: 'high' };
  const r = responder({ findings: { 1: [blocking], '1-fix': [] } });
  const { result } = await run(baseArgs([card('1')]), r);
  const c = result.cards[0];
  assert.equal(c.status, 'committed', JSON.stringify(c));
  assert.equal(c.fixRound.outcome, 'fixed');
  assert.equal(c.fixRound.round, 2, 'one build round, then the fix round');
  assert.deepStrictEqual(c.fixRound.findings.map((f) => f.what), ['b guard untested']);
  assert.ok(r.seen.indexOf('1:fix-round') < r.seen.indexOf('1-fix:quality') && r.seen.indexOf('1-fix:quality') < r.seen.indexOf('1:commit'), 'fix, re-check, then commit');
  assert.ok(!r.seen.includes('1:park'));
  assert.equal(result.expertLanes.filter((l) => l.card === '1').length, 2, 'both checks are in the lanes, the second marked');
  assert.ok(result.expertLanes.some((l) => l.card === '1' && l.fixRound === true));
});

// The plan's own status for every card (2026-11-09): written by commands the run issues, never by an
// agent's edit. These hold which command the script issues at each transition.
const statusOf = (calls, label) => {
  const c = calls.find((x) => x.label === label);
  return c ? (/card-status [^\n]*--status "([^"]+)"/.exec(c.prompt) || [])[1] : undefined;
};

test('the plan shows each card running before any work, then committed, fixed in round, parked or blocked', async () => {
  const calls = [];
  const base = responder({ red: ['2'], findings: { 1: [{ file: 'src/1/x.js', line: 3, what: 'w', howItFails: 'h', confidence: 'high' }], '1-fix': [] } });
  const r = async (c) => { calls.push(c); return base(c); };
  const { result } = await run(baseArgs([card('1'), card('2'), card('3', { depends: ['2'] })]), r);
  assert.equal(statusOf(calls, '1:start'), 'running');
  assert.ok(base.seen.indexOf('1:start') < base.seen.indexOf('1:write-tests'), 'running is written before the tests');
  assert.match(calls.find((c) => c.label === '1:commit').prompt, /card-commit [^\n]*--fixed-round/, 'a card fixed in its fix round commits as fixed-in-round');
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
  assert.match(calls.find((c) => c.label === 'blocked:status').prompt, /notify [^\n]*--kind blocked --card 3/);
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
  assert.match(one.reason, /could not be finished without it\. - held for: - env: reads PORT - within the plan: not green/);
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

test('a finding still blocking after the fix round parks the card, with the round on record', async () => {
  const blocking = { file: 'src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'h', confidence: 'high' };
  const r = responder({ findings: { 1: [blocking], '1-fix': [{ ...blocking, what: 'still no b test' }] } });
  const { result } = await run(baseArgs([card('1'), card('2')]), r);
  assert.equal(result.cards[0].status, 'parked');
  assert.match(result.cards[0].reason, /not fixed by the fix round \(still blocking\).*still no b test/);
  assert.equal(result.cards[0].fixRound.outcome, 'still blocking');
  assert.ok(!r.seen.includes('1:commit'));
  assert.equal(result.cards[1].status, 'committed', 'the next card still runs');
});

test('a fix round that does not go green parks the card without a second experts check', async () => {
  const r = responder({ findings: { 1: [{ file: 'src/1/x.js', line: 3, what: 'w', howItFails: 'h', confidence: 'high' }] }, fixRound: { 1: { green: false, fullSuiteGreen: false, filesChanged: [], summary: 'red', failureOutput: 'x' } } });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'parked');
  assert.equal(result.cards[0].fixRound.outcome, 'not green');
  assert.ok(!r.seen.includes('1-fix:quality'));
});

test('a blocking finding outside the card\'s paths parks it with no fix round; the next card still runs', async () => {
  const r = responder({ findings: { 1: [{ file: 'src/other/x.js', line: 9, what: 'secret logged', howItFails: 'log', confidence: 'high' }] } });
  const { result } = await run(baseArgs([card('1'), card('2')]), r);
  assert.equal(result.cards[0].status, 'parked');
  assert.match(result.cards[0].reason, /outside this card's paths so no fix round/);
  assert.ok(!r.seen.includes('1:fix-round'));
  // 2026-11-08: the reason was cut at its first line, so the report said only "blocking finding from the experts check:".
  assert.match(result.cards[0].reason, /src\/other\/x\.js:9 secret logged/, 'the report row names the finding, not just its heading');
  assert.doesNotMatch(result.cards[0].reason, /\n/, 'one line, for the report table');
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
    assert.match(c.prompt, /the user started \/ultimate-workflow:feature for PLAN-f\.md/, c.label);
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

test('an expert a recheck adds on one card is held to on every later card, unless a card names its own', async () => {
  const AV = [...AVAILABLE, { name: 'developer', agent: 'uw-expert-developer', description: 'code', stages: ['plan', 'review'] }];
  const base = responder();
  const calls = [];
  const r = async (c) => {
    calls.push(c);
    if (c.label === 'a:recheck') return { experts: [{ name: 'developer', why: 'code' }] };
    if (/:developer$/.test(c.label)) return { lensVerdict: 'ok', findings: [] };
    if (/:commit$/.test(c.label)) {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(c.prompt)[1]).expertLane;
      return steps({ recorded: lane.ran, findings: lane.findings.length, open: [], plan: { experts: lane.selected } }, { ok: true, commit: 'x', files: 1 });
    }
    return base(c);
  };
  await run(baseArgs([card('a'), card('b'), card('c', { ownExperts: true, experts: ['quality'] })], { available: AV }), r);
  const lane = (n) => JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(calls.find((c) => c.label === `${n}:commit`).prompt)[1]).expertLane;
  assert.deepStrictEqual(lane('a').selected, ['quality', 'developer']);
  assert.deepStrictEqual(lane('b').planned, ['quality', 'developer'], 'card b starts from the grown plan line');
  assert.ok(calls.some((c) => c.label === 'b:developer'));
  assert.deepStrictEqual(lane('c').planned, ['quality'], 'a card with its own experts keeps them');
});
