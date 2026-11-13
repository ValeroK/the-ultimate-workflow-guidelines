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
    if (role === 'pack') return steps({ ok: true, contextFile: `.ultimate-workflow/run/f/cards/${who}/context.md` });
    if (who === 'settle' && role === 'state') return steps({ ok: true, head: 'head1', reviewedHead: '', harvestBranch: '', ...(o.state || {}) });
    if (who === 'settle' && role === 'record') return steps({ ok: true });
    if (who === 'settle' && role === 'findings') return steps({ ok: true });
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
    const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(c.prompt)[1]).expertLane;
    return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] }, 'Gate G6: the domain experts have not been re-checked against these changes');
  };
  const { result } = await run(baseArgs([card('1')]), said);
  const got = result.cards.find((c) => c.card === '1');
  assert.equal(got.status, 'parked');
  assert.match(got.reason, /commit was refused: card-commit printed no JSON line; it printed: Gate G6: the domain experts have not been re-checked/);
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
    const base = responder({ findings: { 1: [{ file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low' }] } });
    const respond = async (c) => {
      calls.push(c);
      if (c.label === '1:ghost') return { lensVerdict: 'ok', findings: [{ file: 'docs/y.md', line: 1, what: 'old note', howItFails: 'misleads', confidence: 'low' }], stillPresent: [] };
      return base(c);
    };
    await run(baseArgs([card('1', { experts: ['quality', 'ghost'] })], { available: GHOST, planExperts: t.planExperts }), respond);
    const line = cardAddLine(calls, 'findings:setup');
    assert.match(line, /--name findings/, t.name);
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

test('34: a fix-up on a file covered by two cards gets past the gate: the lane is the union, and the commit check passes', async () => {
  const rules = require(path.join(PLUGIN, 'lib', 'run-rules.js'));
  const cards = [card('a', { paths: ['src/a/**', 'src/s/**'], experts: ['quality'] }), card('b', { paths: ['src/b/**', 'src/s/**'], experts: ['security'] })];
  const r = withFreeNames(responder({ reviewFindings: [finding('src/s/x.js')] }));
  const required = [];
  const gated = async (c) => {
    if (c.label === 'fixup:commit') {
      // The real G6 rule (lib/run-rules.js) on the plan as card-add wrote it: the run-added card has the lane's line.
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(c.prompt)[1]).expertLane;
      const add = r.calls.find((x) => x.label === 'fixup:setup').prompt.split('\n').find((l) => / card-add /.test(l));
      const written = /--experts (\S+)/.exec(add)[1].split(',');
      const planCards = [{ name: 'a', paths: ['src/a/**', 'src/s/**'], experts: ['quality'] }, { name: 'b', paths: ['src/b/**', 'src/s/**'], experts: ['security'] }, { name: 'fixup', paths: ['src/s/x.js'], experts: written }];
      const need = rules.narrowedExperts({ cards: planCards, name: 'fixup', changed: ['src/s/x.js'], accepted: [], covers: (paths, f) => paths.some((p) => f.startsWith(p.replace('**', ''))), valid: () => true });
      required.push(...need.experts);
      assert.deepStrictEqual(need.experts.filter((n) => !lane.ran.includes(n)), [], 'every expert G6 asks for ran on the fix-up');
    }
    return r(c);
  };
  const { result } = await run(baseArgs(cards, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), gated);
  assert.deepStrictEqual([...required].sort(), ['quality', 'security']);
  assert.equal(result.fixupCard.status, 'committed', JSON.stringify(result.fixupCard));
  assert.ok(labelsOf(r.calls).includes('fixup:security'), 'the security lane ran on the fix-up');
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

test('48: the findings card is held to the experts of every plan card covering its files, not only the experts that raised the findings', async () => {
  // Card b (security) commits first; card a's quality expert then finds a non-blocking defect in b's file.
  // No later card covers it, so it goes to the findings card; G6 asks for security there too.
  const cards = [card('b', { experts: ['security'] }), card('a', { experts: ['quality'] })];
  const low = { file: 'src/b/y.js', line: 3, what: 'old note', howItFails: 'misleads', confidence: 'low' };
  const r = withFreeNames(responder({ findings: { a: [low] } }));
  const { result } = await run(baseArgs(cards, { available: TWO_EXPERTS, planExperts: ['quality', 'security'] }), r);
  assert.equal(result.findingsCard.status, 'committed', JSON.stringify(result.findingsCard));
  const given = /--experts (\S+)/.exec(cardAddLine(r.calls, 'findings:setup'))[1].split(',').sort();
  assert.deepStrictEqual(given, ['quality', 'security']);
  assert.ok(labelsOf(r.calls).includes('findings:security'), 'the security lane ran on the findings card');
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

test('38: an expert that returns null once is retried and the card commits', async () => {
  const r = nullThen(responder(), { '1:quality': 1 });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'committed', JSON.stringify(result.cards[0]));
  assert.equal(r.count('1:quality') + r.count('1:quality:retry'), 2, 'one first call and one retry');
  assert.equal(r.count('1:quality:retry'), 1);
  assert.equal(r.count('1:commit'), 1);
});

test('39: experts that return null twice park the card with every failed name; card-commit and record are not called', async () => {
  const r = nullThen(responder(), { '1:quality': 2, '1:security': 2 });
  const { result } = await run(baseArgs([card('1', { experts: ['quality', 'security'] })], { available: TWO_EXPERTS }), r);
  const got = result.cards[0];
  assert.equal(got.status, 'parked', JSON.stringify(got));
  assert.match(got.reason, /quality/);
  assert.match(got.reason, /security/);
  assert.match(got.reason, /first check/);
  assert.equal(r.count('1:commit'), 0, 'no commit step');
  assert.ok(!r.calls.some((c) => /card-commit|experts\.js" record /.test(String(c.prompt))), 'neither card-commit nor record was issued');
});

test('40: a valid empty result is a success and is not retried', async () => {
  const r = nullThen(responder(), {});
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'committed');
  assert.equal(r.count('1:quality'), 1);
  assert.deepStrictEqual(r.retries(), []);
});

test('41: only the failed expert is retried', async () => {
  const r = nullThen(responder(), { '1:quality': 1 });
  const { result } = await run(baseArgs([card('1', { experts: ['quality', 'security'] })], { available: TWO_EXPERTS }), r);
  assert.equal(result.cards[0].status, 'committed', JSON.stringify(result.cards[0]));
  assert.equal(r.count('1:security'), 1);
  assert.equal(r.count('1:security:retry'), 0);
  assert.deepStrictEqual(r.retries(), ['1:quality:retry'], 'as many retries as experts that failed');
});

test('42b: the same retry and park rule applies after a fix round (-fix tag)', async () => {
  const blocking = { file: 'src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'delete it, all green', confidence: 'high' };
  const once = nullThen(responder({ findings: { 1: [blocking], '1-fix': [] } }), { '1-fix:quality': 1 });
  const ok = await run(baseArgs([card('1')]), once);
  assert.equal(ok.result.cards[0].status, 'committed', JSON.stringify(ok.result.cards[0]));
  assert.deepStrictEqual(once.retries(), ['1-fix:quality:retry']);
  assert.equal(once.count('1:commit'), 1);

  const twice = nullThen(responder({ findings: { 1: [blocking], '1-fix': [] } }), { '1-fix:quality': 2 });
  const bad = await run(baseArgs([card('1')]), twice);
  const got = bad.result.cards[0];
  assert.equal(got.status, 'parked', JSON.stringify(got));
  assert.match(got.reason, /after the fix round failed: quality/);
  assert.equal(twice.count('1:commit'), 0);
});

test('43: a refute agent null twice parks the card; no fix round is paid', async () => {
  const blocking = { file: 'src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'delete it, all green', confidence: 'high' };
  const r = nullThen(responder({ findings: { 1: [blocking] } }), { '1:refute': 2 });
  const { result } = await run(baseArgs([card('1')]), r);
  const got = result.cards[0];
  assert.equal(got.status, 'parked', JSON.stringify(got));
  assert.match(got.reason, /refute/);
  assert.equal(r.count('1:refute'), 1);
  assert.equal(r.count('1:refute:retry'), 1);
  assert.equal(r.count('1:fix-round'), 0);
  assert.equal(r.count('1:commit'), 0);
});

test('43b: a refute agent null once is retried and the card goes on', async () => {
  const blocking = { file: 'src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'delete it, all green', confidence: 'high' };
  const r = nullThen(responder({ findings: { 1: [blocking], '1-fix': [] } }), { '1:refute': 1 });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'committed', JSON.stringify(result.cards[0]));
  assert.equal(r.count('1:refute:retry'), 1);
});

test('43c: the verdicts of a refute retry are used, not discarded', async () => {
  const blocking = { file: 'src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'delete it, all green', confidence: 'high' };
  for (const verdict of ['refuted', 'confirmed']) {
    const base = nullThen(responder({ findings: { 1: [blocking], '1-fix': [] } }), { '1:refute': 1 });
    const r = async (c) => (c.label === '1:refute:retry' ? { verdicts: [{ index: 0, verdict, reason: 'from the retry' }] } : base(c));
    const { result } = await run(baseArgs([card('1')]), r);
    assert.equal(result.cards[0].status, 'committed', `${verdict}: ${JSON.stringify(result.cards[0])}`);
    // A refuted finding pays no fix round; a confirmed one does. A discarded retry would look like neither.
    assert.equal(base.count('1:fix-round'), verdict === 'confirmed' ? 1 : 0, verdict);
  }
});

test('43d: a retried expert that returns findings has them acted on: a blocking one gets the fix round, a non-blocking one reaches the findings card', async () => {
  const blocking = { file: 'src/1/x.js', line: 3, what: 'b guard untested', howItFails: 'delete it, all green', confidence: 'high' };
  const fixed = nullThen(responder({ findings: { 1: [blocking], '1-fix': [] } }), { '1:quality': 1 });
  const a = await run(baseArgs([card('1')]), fixed);
  assert.equal(fixed.count('1:quality:retry'), 1);
  assert.equal(fixed.count('1:fix-round'), 1, 'the retry\'s blocking finding drove a fix round');
  assert.equal(a.result.cards[0].status, 'committed', JSON.stringify(a.result.cards[0]));

  const low = { file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low' };
  const queued = nullThen(responder({ findings: { 1: [low] } }), { '1:quality': 1 });
  const b = await run(baseArgs([card('1')]), queued);
  assert.equal(queued.count('1:quality:retry'), 1);
  assert.ok(b.result.findingsCard && b.result.findingsCard.status === 'committed', 'the retry\'s non-blocking finding reached the findings card');
  assert.ok(queued.calls.find((c) => c.label === 'findings:setup').prompt.includes('docs/x.md'));
});

test('44: a recheck agent null is retried once', async () => {
  const r = nullThen(responder(), { '1:recheck': 1 });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'committed', JSON.stringify(result.cards[0]));
  assert.equal(r.count('1:recheck'), 1);
  assert.equal(r.count('1:recheck:retry'), 1);
  const twice = nullThen(responder(), { '1:recheck': 2 });
  const second = await run(baseArgs([card('1')]), twice);
  assert.equal(twice.count('1:recheck:retry'), 1, 'at most one retry');
  // What the run does next: the card is not parked, and the lane it commits records that no recheck happened.
  assert.equal(second.result.cards[0].status, 'committed', JSON.stringify(second.result.cards[0]));
  const commit = twice.calls.find((c) => c.label === '1:commit');
  const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(commit.prompt)[1]).expertLane;
  assert.equal(lane.recheck, false);
  assert.deepStrictEqual(lane.added, []);
});

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

test('46: with one card parked there is no review, no fix-up card, no findings card and no harvest', async () => {
  const calls = [];
  const base = responder({
    red: ['1'],
    findings: { 2: [{ file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low' }] },
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
  assert.equal(result.pendingFindings.length, 1, 'the finding stays in the report');
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

test('50: a later settling resume reviews only what is new since the recorded head', async () => {
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
    assert.ok(c.prompt.includes('r1..HEAD'), c.label);
    assert.ok(!c.prompt.includes('abc1234..HEAD'), `${c.label} does not start again at the base`);
  }
  assert.equal(labelsOf(callsB).filter((l) => l === 'harvest').length, 1);
  const rec = recordCalls(callsB);
  assert.equal(rec.length, 1);
  assert.match(rec[0].prompt, /run-state [^\n]*--record/);
  assert.equal(outB.result.review.range, 'r1..HEAD');
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

test('56: findings no card fixed outlive a run that waits, and the settling resume fixes them', async () => {
  const stuck = { file: 'docs/x.md', line: 2, what: 'stale doc', howItFails: 'misleads', confidence: 'low', expert: 'quality' };
  // (a) card 1 parks: the findings are written to run.json by the run-state step
  const a = responder({ red: ['1'], findings: { 2: [stuck] } });
  const callsA = [];
  await run(baseArgs([card('1'), card('2')]), async (c) => { callsA.push(c); return a(c); });
  const saved = callsA.filter((c) => c.label === 'settle:findings');
  assert.equal(saved.length, 1);
  assert.match(saved[0].prompt, /run-state [^\n]*--findings/);
  assert.ok(saved[0].prompt.includes('stale doc'), 'the finding is in the file');
  // (b) the settling resume: nothing new in memory, the recorded finding is fixed by the findings card
  // The review and the harvest both covered this HEAD: only the findings card's commit makes them run.
  const b = responder({ state: { head: 'h2', reviewedHead: 'h2', harvestedHead: 'h2', pendingFindings: [stuck] } });
  const callsB = [];
  const outB = await run(baseArgs([card('1', { committed: true }), card('2', { committed: true })]), async (c) => { callsB.push(c); return b(c); });
  assert.equal(outB.result.findingsCard.status, 'committed', JSON.stringify(outB.result.findingsCard));
  assert.ok(labelsOf(callsB).includes('findings:write-tests'));
  assert.equal(callsB.filter((c) => c.label === 'settle:findings').length, 1, 'the file is cleared');
  assert.ok(callsB.find((c) => c.label === 'settle:findings').prompt.includes('[]'), 'cleared to an empty list');
  assert.equal(outB.result.review.ran, true, 'the findings card commit is reviewed');
  assert.equal(outB.result.harvest.ran, true, 'and harvested');
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
  assert.equal(outC.result.review.range, 'r1..HEAD');
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
  const { result } = await run(baseArgs([card('1')]), async (c) => { calls.push(c); return c.label === 'review:simplicity' ? null : base(c); });
  assert.deepStrictEqual(result.review.failedLenses, ['simplicity']);
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
  const { result } = await run(baseArgs([card('1')]), async (c) => (c.label === '1:commit' ? steps({ stage: 'review', recorded: ['quality'], findings: 0, open: [] }, `refused ${LONG}`) : base(c)));
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

test('21 (carry): a finding carried to a later card reaches card-field through a file, and running the line in a shell leaves no PWNED file', async (t) => {
  const hostile = { file: 'src/2/$(touch PWNED).js', line: '1`touch PWNED`', what: '$(touch PWNED) and `touch PWNED` and $HOME', howItFails: 'x', confidence: 'low' };
  const calls = [];
  const base = responder({ findings: { 1: [hostile] } });
  await run(baseArgs([card('1'), card('2')]), async (c) => { calls.push(c); return base(c); });
  const carry = calls.find((c) => c.label === '1:carry');
  assert.ok(carry, `the finding is carried to card 2: ${labelsOf(calls).join(' ')}`);
  const lines = commandLinesOf([carry]);
  assert.equal(lines.length, 1);
  assert.ok(!/PWNED|\$\(|`|\$HOME/.test(lines[0]), lines[0]);
  assert.match(lines[0], /card-field [^\n]*--card 2 [^\n]*--carried-file /);
  assert.ok(!/--carried /.test(lines[0]), lines[0]);
  assert.ok(carry.prompt.includes('$(touch PWNED) and `touch PWNED` and $HOME'), 'the text is not lost: it is in the file the step writes');
  const bash = spawnSync('bash', ['-c', 'echo ok'], { encoding: 'utf8' });
  if (bash.status !== 0) return t.skip('no bash on this machine: the command line was checked as text only');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-pwned-'));
  spawnSync('bash', ['-c', lines[0].replace(/^\d+\. /, '')], { cwd: dir, encoding: 'utf8' });
  assert.deepStrictEqual(fs.readdirSync(dir), [], 'running the card-field line wrote nothing');
});

test('card-field --carried-file takes the carried text from the file, as written', () => {
  const dir = tmpPlan('---\nplan_confirmed: true\n---\n\n# PLAN: x\n\n## Cards\n\n- a: first\n  paths: src/a/**\n');
  fs.writeFileSync(path.join(dir, 'carry.txt'), 'quality at src/a/x.js:1: $(touch PWNED) and `x`\n');
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'card-field', '--plan', 'PLAN-x.md', '--card', 'a', '--carried-file', 'carry.txt'], { cwd: dir, encoding: 'utf8' });
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(out.ok, true, r.stdout + r.stderr);
  assert.deepStrictEqual(out.carried, ['quality at src/a/x.js:1: $(touch PWNED) and `x`']);
  assert.ok(!fs.existsSync(path.join(dir, 'PWNED')));
});
