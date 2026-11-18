'use strict';

// 5.1.1: the unattended run makes the full test run one time after all the cards, and one time after the review's
// fix-up cards. Until 5.1.0 every card ended with a full run: in two days of real runs the implementer agents ran a
// four-minute suite 27 times (108 minutes), ten of them failed runs that were followed by the whole suite again.
// What these tests hold: a card runs its related tests only and is committed on them; the full run happens where the
// run says; a full run that fails gets one card that ends with a full run of its own; by hand nothing changes.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const RUN = path.join(PLUGIN, 'phases', 'run.js');
const BUILD = path.join(PLUGIN, 'phases', 'build.js');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));

const card = (name, extra = {}) => ({ name, title: `card ${name}`, paths: [`src/${name}/**`], depends: [], carried: [], experts: ['quality'], briefs: [], reviewSkills: {}, preflight: { ok: true, contextFile: `.ultimate-workflow/run/f/cards/${name}/context.md` }, ...extra });
const AVAILABLE = [{ name: 'quality', agent: 'uw-expert-quality', description: 'tests', stages: ['plan', 'tests', 'review'] }];
const baseArgs = (cards, extra = {}) => ({ plan: 'PLAN-f.md', feature: 'f', cli: 'node "/p/experts/experts.js"', base: 'abc1234', verify: 'node "/p/hooks/verify.js" --plan "PLAN-f.md"', command: 'npm test', available: AVAILABLE, expertsDir: '/p/experts', protocol: 'rules', cards, ...extra });
const steps = (...lines) => ({ outputs: lines.map((l) => ({ command: '', output: JSON.stringify(l) })) });

/** A healthy run of every role. `fullRun(who, n)` answers the full run; `red` lists cards whose attempts fail; `reviewFindings` come from the correctness lens. */
function responder(o = {}) {
  const calls = [];
  let fullRuns = 0;
  let said = true;
  const fn = async (call) => {
    calls.push(call);
    const [who, role] = String(call.label).includes(':') ? call.label.split(':') : [call.label, ''];
    if (role === 'run' && /^full-suite/.test(who)) {
      const fr = (o.fullRun && o.fullRun(who, ++fullRuns)) || { passed: true, failures: [], summary: 'full run passed' };
      said = fr.passed === true;
      return fr;
    }
    if (role === 'proof' && /^full-suite/.test(who)) return steps((o.proof && o.proof(who)) || { ok: true, current: true, passed: said });
    if (role === 'write-tests') return { filesWritten: [`test/${who}.test.js`], testsFailAsExpected: true, summary: 'red' };
    // No fullSuiteGreen: a card of the run never makes a full run.
    if (/^attempt-/.test(role)) return (o.red || []).includes(who) ? { green: false, filesChanged: [`src/${who}/x.js`], failureOutput: `fail ${role}`, summary: role } : { green: true, ...(o.fullGreen && o.fullGreen.includes(who) ? { fullSuiteGreen: true } : {}), filesChanged: [`src/${who}/x.js`], summary: 'done' };
    if (/^diagnose-/.test(role)) return { cause: 'wrong', signature: `sig-${role}`, suggestedFix: 'fix', confidence: 'medium' };
    if (role === 'scope') return steps({ card: who, outOfScope: [] });
    if (role === 'prepare') return steps({ ok: true });
    if (role === 'recheck') return { experts: [] };
    if (role === 'commit') return steps({ ok: true, card: who, commit: `c-${who}`, files: 1, handoff: 'h', missingClaims: [] });
    if (role === 'record' && who !== 'settle') {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(call.prompt)[1]).expertLane;
      return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] });
    }
    if (role === 'park') return steps({ ok: true, card: who, branch: `uw/parked/f/${who}` }, { ok: true, desktop: 'sent' });
    if (role === 'notify' || role === 'journal' || role === 'carry') return steps({ ok: true, desktop: 'sent' });
    if (role === 'decisions') return steps({ ok: true, card: who, major: [], minor: [] });
    if (role === 'start' || (who === 'blocked' && role === 'status')) return steps(...String(call.prompt).split('\n').filter((l) => /card-status/.test(l)).map(() => ({ ok: true })));
    if (role === 'setup') return steps({ ok: true, card: { name: who, paths: ['.'] } }, { ok: true });
    if (role === 'pack') return steps({ ok: true, contextFile: `.ultimate-workflow/run/f/cards/${who}/context.md` });
    if (who === 'settle' && role === 'state') return steps({ ok: true, head: 'head1', reviewedHead: '', harvestBranch: '' });
    if (who === 'settle' && role === 'record') return steps({ ok: true, head: 'head2', reviewed: { head: 'head2', at: 'now', open: 0 } });
    if (/^review/.test(who) && role === 'refute') return { verdicts: (o.reviewFindings || []).map((_, index) => ({ index, verdict: 'confirmed', reason: 'yes' })) };
    if (/^review/.test(who)) return { lensVerdict: 'ok', findings: role === 'correctness' && who === 'review' ? o.reviewFindings || [] : [] };
    if (call.label === 'harvest') return { proposals: [], discarded: [] };
    if (role === 'branch') return steps({ ok: true, branch: 'uw/harvest/f', commits: [] });
    throw new Error(`unexpected agent ${call.label}`);
  };
  fn.calls = calls;
  fn.labels = () => calls.map((c) => c.label);
  fn.prompt = (label) => (calls.find((c) => c.label === label) || { prompt: '' }).prompt;
  return fn;
}
const run = (args, respond) => loadWorkflow(RUN)(args, respond);

test('a card of the run runs its related tests only: the prompt forbids --full, and green needs no full run', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1'), card('2')]), r);
  assert.deepStrictEqual(result.counts, { committed: 2 }, JSON.stringify(result.cards));
  for (const n of ['1', '2']) {
    const p = r.prompt(`${n}:attempt-1`);
    assert.match(p, /After each change run `node "\/p\/hooks\/verify\.js" --plan "PLAN-f\.md"`/);
    assert.match(p, /Never add --full/);
    assert.doesNotMatch(p, /--full` once/, 'the card is not told to make a full run');
  }
});

test('the card commit of the run asks for the related-tests rule', async () => {
  const r = responder();
  await run(baseArgs([card('1')]), r);
  assert.match(r.prompt('1:commit'), /card-commit [^\n]*--full-at-end/);
});

test('the full suite runs one time, after the last card and before the review', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1'), card('2'), card('3')]), r);
  const labels = r.labels();
  assert.deepStrictEqual(labels.filter((l) => /^full-suite/.test(l)), ['full-suite:run', 'full-suite:proof'], labels.join(' '));
  const at = labels.indexOf('full-suite:run');
  assert.ok(at > labels.indexOf('3:commit'), 'after the last card');
  assert.ok(at < labels.findIndex((l) => /^review:/.test(l)), 'before the review');
  const p = r.prompt('full-suite:run');
  assert.match(p, /`node "\/p\/hooks\/verify\.js" --plan "PLAN-f\.md" --full`/);
  assert.match(p, /Change no file/);
  assert.equal(result.fullSuite.text, 'Full suite: passed');
  assert.match(result.summary, /Full suite: passed/);
  assert.deepStrictEqual(result.fullSuite.runs.map((x) => [x.at, x.passed]), [['full-suite', true]]);
});

test('a full run that fails gets one card: no new tests first, the failures carried, a full run of its own, and a commit that needs it', async () => {
  const r = responder({ fullRun: () => ({ passed: false, failures: ['tests/a.py::test_x', 'tests/b.py::test_y'], output: 'E assert 1 == 2', summary: 'two fail' }), fullGreen: ['full-suite'] });
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels();
  assert.ok(labels.includes('full-suite:setup'), labels.join(' '));
  assert.ok(!labels.includes('full-suite:write-tests'), 'the failing tests are its tests');
  const setup = r.prompt('full-suite:setup');
  assert.match(setup, /tests\/a\.py::test_x/);
  assert.match(setup, /tests\/b\.py::test_y/);
  const p = r.prompt('full-suite:attempt-1');
  assert.match(p, /--full` once/);
  assert.match(p, /run only the tests that failed/);
  assert.match(p, /What the full run printed: E assert 1 == 2/);
  assert.doesNotMatch(r.prompt('full-suite:commit'), /--full-at-end/, 'this card is committed on a full run');
  assert.equal(result.fullSuite.text, 'Full suite: passed after the card full-suite corrected it');
  assert.ok(labels.some((l) => /^review:/.test(l)), 'the review runs after it');
});

test('a full-run card that reports green without its own full run is not green', async () => {
  const r = responder({ fullRun: () => ({ passed: false, failures: ['t::x'], summary: 'fails' }) });
  const { result } = await run(baseArgs([card('1')]), r);
  const by = Object.fromEntries(result.cards.map((c) => [c.card, c]));
  assert.equal(by['full-suite'].status, 'parked');
});

test('a full suite that stays red parks its card, holds the review and the harvest back, and the result says so', async () => {
  const r = responder({ fullRun: () => ({ passed: false, failures: ['t::x'], summary: 'fails' }), red: ['full-suite'] });
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels();
  assert.ok(labels.includes('full-suite:park'), labels.join(' '));
  assert.ok(!labels.some((l) => /^review:/.test(l)), 'no review on a red suite');
  assert.ok(!labels.includes('harvest'));
  assert.match(result.fullSuite.text, /^FULL SUITE NOT GREEN: 1 failing test\(s\), and the card full-suite is parked/);
  assert.match(result.summary, /FULL SUITE NOT GREEN/);
});

test('the agent that makes the full run returning nothing is said, never read as a pass', async () => {
  const r = responder({ fullRun: () => null });
  const base = r;
  const fn = async (call) => (call.label === 'full-suite:run' ? null : base(call));
  const { result } = await run(baseArgs([card('1')]), fn);
  assert.match(result.fullSuite.text, /^FULL SUITE NOT GREEN: the agent that makes the full run returned nothing/);
});

test('no card committed in this run: no full run', async () => {
  const r = responder({ red: ['1'] });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.ok(!r.labels().some((l) => /^full-suite/.test(l)));
  assert.match(result.fullSuite.text, /^Full suite: not run/);
});

test('fix-up cards are committed on their related tests, and one more full run covers them before the experts check them', async () => {
  const r = responder({ reviewFindings: [{ file: 'src/1/x.js', line: 3, what: 'off by one', howItFails: 'n=0', confidence: 'high' }] });
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels();
  assert.equal(result.fixupCard.status, 'committed', JSON.stringify(result.fixupCard));
  assert.match(r.prompt('fixup:commit'), /--full-at-end/);
  assert.match(r.prompt('fixup:attempt-1'), /Never add --full/);
  const at = labels.indexOf('full-suite-fixups:run');
  assert.ok(at > labels.indexOf('fixup:commit'), labels.join(' '));
  assert.ok(at < labels.findIndex((l) => /^review-fixups:/.test(l)), 'before the experts check of the fix-up cards');
  assert.deepStrictEqual(result.fullSuite.runs.map((x) => x.at), ['full-suite', 'full-suite-fixups']);
});

test('a plan with no test command: no verify script, so no full run step and the old prompt', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1')], { verify: '' }), r);
  assert.ok(!r.labels().some((l) => /^full-suite/.test(l)));
  assert.match(r.prompt('1:attempt-1'), /Run `npm test` and report whether it is green/);
  assert.doesNotMatch(r.prompt('1:commit'), /--full-at-end/);
  assert.match(result.fullSuite.text, /no test_command/);
});

test('the build by hand is not changed: green needs the full run, and a failed full run is followed by the failed tests first', async () => {
  const calls = [];
  const { result } = await loadWorkflow(BUILD)({ plan: 'PLAN-f.md', verify: 'node "/p/hooks/verify.js"', command: 'npm test' }, async (c) => {
    calls.push(c);
    if (c.label === 'write-tests') return { filesWritten: ['a.test.js'], testsFailAsExpected: true, testCommand: 'npm test', summary: 's' };
    if (/^attempt-/.test(c.label)) return { green: true, fullSuiteGreen: false, filesChanged: ['a.js'], summary: 's' };
    if (/^diagnose-/.test(c.label)) return { cause: 'c', signature: `s-${c.label}`, suggestedFix: 'f', confidence: 'low' };
    return null;
  });
  assert.notEqual(result.green, true);
  const p = calls.find((c) => c.label === 'attempt-1').prompt;
  assert.match(p, /--full` once/);
  assert.match(p, /run only the tests that failed/);
  assert.doesNotMatch(p, /Never add --full/);
});

// ---- the commit check ----

const ev = (tests) => ({ tests: { command: 'npm test', script: 'verify.js', hash: 'h1', record: null, ...tests }, confirmation: { ok: true }, expertsDeferred: true, hash: 'h1', records: {}, planExperts: [], available: [], open: [] });

test('G7 for a card of the run: a passing related run on exactly these changes is enough', () => {
  const g = gates.commitGate(ev({ fullAtEnd: true, related: { mode: 'related', passed: true, fingerprint: 'h1' } }));
  assert.equal(g.allow, true, g.reason);
  assert.equal(g.outcome, 'deferred');
  assert.equal(g.why, "experts: deferred to the run's review; full suite: one run after all the cards");
});

test('G7 for a card of the run: a related run that failed, is older than the changes, or is missing refuses the commit', () => {
  for (const related of [{ mode: 'related', passed: false, fingerprint: 'h1' }, { mode: 'related', passed: true, fingerprint: 'h0' }, null, { mode: 'full', passed: true, fingerprint: 'h1' }]) {
    const g = gates.commitGate(ev({ fullAtEnd: true, related }));
    assert.equal(g.allow, false, JSON.stringify(related));
    assert.deepStrictEqual(g.missing.map((m) => m.kind), ['tests']);
    assert.match(g.reason, /^Gate G7: no passing test run covers these changes/);
    assert.match(g.reason, /Run `verify\.js` once/);
    assert.doesNotMatch(g.reason, /--full/);
  }
});

test('G7 for a card of the run: a passing full run on these changes counts too (verify chose the full suite)', () => {
  const g = gates.commitGate(ev({ fullAtEnd: true, related: null, record: { mode: 'full', passed: true, fingerprint: 'h1' } }));
  assert.equal(g.allow, true, g.reason);
});

test('G7 by hand is not changed: a related run never covers a commit', () => {
  const g = gates.commitGate({ ...ev({ related: { mode: 'related', passed: true, fingerprint: 'h1' } }), expertsDeferred: false });
  assert.equal(g.allow, false);
  assert.match(g.reason, /no passing full test suite run covers these changes/);
  assert.match(g.reason, /verify\.js --full/);
});

// ---- verify.js and the evidence, in a real repository ----

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
function repo() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-atend-')));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'test'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 1\n');
  fs.writeFileSync(path.join(dir, 'test', 'a.test.js'), "const { a } = require('../src/a.js'); if (typeof a !== 'number') process.exit(1)\n");
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\ntests_confirmed: true\nexperts: []\ntest_command: node test/a.test.js\ntest_related_command: node test/a.test.js {files}\n---\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 2\n');
  return dir;
}
const v = (cwd, ...args) => spawnSync(process.execPath, [VERIFY, '--plan', 'PLAN-x.md', ...args], { cwd, encoding: 'utf8' });
const json = (dir, name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', name), 'utf8'));
  } catch {
    return null;
  }
};
// The fixture's plan never went through the confirm step, so only the tests part of the decision is read here.
const needsTests = (dir, extra) => (gates.commitGate(evidence(dir, extra)).missing || []).some((m) => m.kind === 'tests');
const evidence = (dir, extra) => experts.commitEvidence(dir, 'PLAN-x.md', undefined, { stage: 'feature', script: 'verify.js', deferExperts: true, ...extra });

test('a run of the related tests is recorded in its own file and never replaces the record of a full run', () => {
  const dir = repo();
  assert.equal(v(dir, '--full').status, 0);
  const full = json(dir, 'verify.json');
  const r = v(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /verify: related because/);
  const rel = json(dir, 'verify-related.json');
  assert.equal(rel.mode, 'related');
  assert.equal(rel.passed, true);
  assert.equal(rel.fingerprint, full.fingerprint, 'the same changes, the same fingerprint');
  assert.deepStrictEqual(json(dir, 'verify.json'), full, 'the full record is as it was');
});

test('in a repository: the related run lets the card commit of the run through, and not a commit by hand', () => {
  const dir = repo();
  assert.equal(v(dir).status, 0);
  assert.equal(json(dir, 'verify.json'), null, 'no full run was made');
  assert.equal(needsTests(dir, { fullAtEnd: true }), false, 'the card commit of the run asks for no more tests');
  assert.equal(needsTests(dir, {}), true, 'a commit by hand still needs the full run');
});

test('in a repository: a change after the related run, or a related run that failed, refuses the card commit', () => {
  const dir = repo();
  assert.equal(v(dir).status, 0);
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 3\n');
  assert.equal(needsTests(dir, { fullAtEnd: true }), true, 'changed since the run');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), "exports.a = 'x'\n");
  assert.notEqual(v(dir).status, 0);
  assert.equal(json(dir, 'verify-related.json').passed, false);
  assert.equal(needsTests(dir, { fullAtEnd: true }), true, 'the related tests fail');
});

// 5.1.1, from the journals: "tests were already in the tree, so the card was not red-first" 9 times in one run (the
// run writes the tests in an earlier step), and lines such as "ruff is not installed" that help no later card.
test('the journal agent is told how the run works, and not to report it or the tools of the machine', async () => {
  const r = responder();
  await run(baseArgs([card('1')]), r);
  const j = { prompt: r.prompt('1:journal') };
  assert.match(j.prompt, /How this run works/);
  assert.match(j.prompt, /wrote the tests of the card in a step before the build/);
  assert.match(j.prompt, /the full suite runs one time after all the cards/);
  assert.match(j.prompt, /Do not run the tests yourself/);
  assert.match(j.prompt, /tools of this machine/);
});

// 5.1.1: "the full suite passed" is the record verify.js wrote, read by code, never the answer of the agent.
test('a pass the agent reports and the record does not show is not a pass, and no card is made for it', async () => {
  const r = responder({ proof: () => ({ ok: true, current: false, passed: false, reason: 'there is no record of a full run (.ultimate-workflow/verify.json)' }) });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.match(r.prompt('full-suite:proof'), /experts\.js" full-record/);
  assert.match(result.fullSuite.text, /^FULL SUITE NOT GREEN: the full run is not proven: there is no record of a full run .*the agent that ran it reported a pass/);
  assert.ok(!r.labels().includes('full-suite:setup'), 'nothing failed that a card could correct');
});

test('the record decides when the agent and the record disagree', async () => {
  const pass = responder({ fullRun: () => ({ passed: false, failures: [], summary: 'I think it failed' }), proof: () => ({ ok: true, current: true, passed: true }) });
  const a = await run(baseArgs([card('1')]), pass);
  assert.equal(a.result.fullSuite.text, 'Full suite: passed');
  assert.match(a.result.fullSuite.runs[0].note, /the record decides/);

  const fail = responder({ proof: () => ({ ok: true, current: true, passed: false }), fullGreen: ['full-suite'] });
  const b = await run(baseArgs([card('1')]), fail);
  assert.ok(fail.labels().includes('full-suite:setup'), 'the record says failed: one card corrects it');
});
