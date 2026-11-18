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
    if (o.on) {
      const own = o.on(call, who, role);
      if (own !== undefined) return own;
    }
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

// --- 5.1.1: the run corrects a wrong test one time ------------------------------------------------------------------
// In three runs, one hold in four was "the test is wrong, the code is right", and each time the user resumed and the
// test was changed to agree with the plan. The run does that itself when the diagnosis names the line of the plan.

const WRONG = {
  cause: 'the tests expect a reordered title',
  signature: 'sig-title',
  suggestedFix: 'fix the tests',
  confidence: 'high',
  testMayBeWrong: true,
  wrongTests: [
    { test: 'test/1.test.js::title', why: 'asserts a reordered title; the plan says a substring', planReference: 'PLAN-f.md:322 "a normalised substring of the stored title"' },
    { test: 'test/1.test.js::quotes', why: 'drops the quotes; the plan keeps them', planReference: 'PLAN-f.md:323 "double quotes are kept"' },
  ],
};
const FIXED = {
  changed: true,
  tests: [
    { test: 'test/1.test.js::title', verdict: 'corrected', was: 'a reordered title', now: 'a substring of the title', planReference: 'PLAN-f.md:322', why: 'the plan says substring' },
    { test: 'test/1.test.js::quotes', verdict: 'agrees with the plan' },
    { test: 'test/1.test.js::spaces', verdict: 'corrected', was: 'one space', now: 'two spaces', planReference: 'PLAN-f.md:324', why: 'the same fault, not named' },
  ],
  summary: 'Two tests now follow the plan; the quotes test was right.',
};
/** Card 1 fails round 1 and passes round 2. `diagnosis` answers diagnose-1; `fixed` is the test writer's answer; `kept` the guard's. */
const correcting = ({ diagnosis = WRONG, fixed = FIXED, kept = { ok: true, kept: true, problems: [] }, snapshot = { ok: true, files: 1 } } = {}) =>
  responder({
    on: (call, who, role) => {
      if (who !== '1') return undefined;
      if (role === 'attempt-1') return { green: false, filesChanged: ['src/1/x.js'], failureOutput: 'title mismatch', summary: 'red' };
      if (role === 'diagnose-1') return diagnosis;
      if (role === 'tests-before') return steps(snapshot);
      if (role === 'correct-tests') return fixed;
      if (role === 'tests-kept') return steps(kept);
      return undefined;
    },
  });

test('wrong tests: the diagnosis names every one, all go back to the tester in one pass, and the card goes on', async () => {
  const r = correcting();
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels().filter((l) => /^1:/.test(l));
  assert.deepStrictEqual(labels.slice(2, 8), ['1:attempt-1', '1:diagnose-1', '1:tests-before', '1:correct-tests', '1:tests-kept', '1:attempt-2'], labels.join(' '));
  assert.equal(labels.filter((l) => l === '1:correct-tests').length, 1, 'one pass for all the tests');
  assert.match(r.prompt('1:tests-before'), /node "\/p\/lib\/test-guard\.js" snapshot "\.ultimate-workflow\/run\/f\/cards\/1\/tests-before\.json" "test\/1\.test\.js"/);
  assert.match(r.prompt('1:tests-kept'), /test-guard\.js" check /);
  const p = r.prompt('1:correct-tests');
  assert.match(p, /You are the tester of this change/);
  for (const named of ['test/1.test.js::title', 'test/1.test.js::quotes', 'PLAN-f.md:322', 'PLAN-f.md:323']) assert.ok(p.includes(named), named);
  assert.match(p, /Verify every named test against the plan, all in this one pass/);
  assert.match(p, /verify their other tests in the same way/);
  assert.match(p, /A test that agrees with the plan: leave it, and say so/);
  assert.match(p, /A test the change does not need \(the plan does not ask for what it checks, or it repeats another test\): remove it/);
  assert.match(p, /hold the tests this change needs, and only those/);
  assert.match(p, /The plan decides, never the code: do not change or remove a test because the code fails it/);
  assert.doesNotMatch(p, /Do not delete a test|Do not remove an assertion/i, 'the tester is free to remove what the change does not need');
  assert.match(p, /Do not add a skip or an expected-failure mark/);
  assert.match(p, /The agent that writes the code next, and the user, read your report/);
  assert.deepStrictEqual(result.counts, { committed: 1 });
  assert.equal(result.testCorrections.length, 1);
  assert.deepStrictEqual(result.testCorrections[0].corrected.map((x) => x.test), ['test/1.test.js::title', 'test/1.test.js::spaces']);
  assert.match(result.summary, /TESTS CORRECTED BY THE RUN: card 1 \(test\/1\.test\.js::title, plan: PLAN-f\.md:322; test\/1\.test\.js::spaces, plan: PLAN-f\.md:324\)\. Read them before you merge\./);
});

test('the diagnoser is told to read every test of the change when one looks wrong, and to name them all', async () => {
  const r = correcting();
  await run(baseArgs([card('1')]), r);
  const p = r.prompt('1:diagnose-1');
  assert.match(p, /THE TESTS OF THIS CHANGE\n\[\n  "test\/1\.test\.js"\n\]/);
  assert.match(p, /do not stop at the test that failed: read every test in the test files of this change against the plan/);
  assert.match(p, /they all go back to the tester in one pass/);
});

test('the code round after the tester gets the full account: each test sent, its verdict, and each change', async () => {
  const r = correcting();
  await run(baseArgs([card('1')]), r);
  const p = r.prompt('1:attempt-2');
  assert.match(p, /"testsWereWrong": true/);
  const account = JSON.parse(/diagnosed it:\n(\{[\s\S]*?\n\})\n\nUse that diagnosis/.exec(p)[1]);
  assert.deepStrictEqual(account.testsChangedByTheTester, FIXED.tests, 'every entry of the tester, the one it left also');
  assert.equal(account.testerSummary, FIXED.summary);
  assert.equal(account.cause, WRONG.cause);
  assert.match(account.suggestedFix, /Read each changed test before you touch the code/);
  assert.match(account.suggestedFix, /Do not change the tests back/);
});

test('each corrected test is recorded with the minor decisions of the card; a test the tester left is not', async () => {
  const r = correcting();
  await run(baseArgs([card('1')]), r);
  const declared = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(r.prompt('1:decisions'))[1]);
  assert.equal(declared.length, 2);
  assert.ok(declared.every((d) => d.major === false));
  assert.match(declared[0].what, /the tester corrected the test test\/1\.test\.js::title to agree with the plan \(PLAN-f\.md:322\): it asserted a reordered title, it now asserts a substring of the title/);
  assert.match(declared[1].what, /test\/1\.test\.js::spaces/);
  assert.ok(!declared.some((d) => /::quotes/.test(d.what)));
});

test('the tester removes a test the change does not need: the card goes on, and the user is shown what went away', async () => {
  const fixed = {
    changed: true,
    tests: [
      { test: 'test/1.test.js::title', verdict: 'corrected', was: 'a reordered title', now: 'a substring of the title', planReference: 'PLAN-f.md:322' },
      { test: 'test/1.test.js::quotes', verdict: 'removed', was: 'the quotes are dropped', planReference: 'PLAN-f.md:323', why: 'the plan does not ask for it' },
    ],
    summary: 'One test corrected, one removed.',
  };
  const r = correcting({ fixed, kept: { ok: true, kept: false, problems: ['test/1.test.js has 1 tests, and had 2', 'test/1.test.js has 2 assertions, and had 3'] } });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.ok(r.labels().includes('1:attempt-2'), 'fewer tests is not a reason to stop');
  assert.deepStrictEqual(result.counts, { committed: 1 });
  assert.match(result.summary, /TESTS CORRECTED BY THE RUN: card 1 \(test\/1\.test\.js::title, plan: PLAN-f\.md:322; removed test\/1\.test\.js::quotes, plan: PLAN-f\.md:323; counted: test\/1\.test\.js has 1 tests, and had 2, test\/1\.test\.js has 2 assertions, and had 3\)/);
  const declared = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(r.prompt('1:decisions'))[1]);
  assert.match(declared[1].what, /^the tester removed the test test\/1\.test\.js::quotes \(PLAN-f\.md:323\): it asserted the quotes are dropped$/);
  assert.equal(declared[1].why, 'the plan does not ask for it');
  assert.match(r.prompt('1:attempt-2'), /"verdict": "removed"/);
});

test('the count that cannot run does not stop the card: the pass of the tester stands', async () => {
  const r = responder({
    on: (call, who, role) => {
      if (who !== '1') return undefined;
      if (role === 'attempt-1') return { green: false, filesChanged: ['src/1/x.js'], failureOutput: 'x', summary: 'red' };
      if (role === 'diagnose-1') return WRONG;
      if (role === 'tests-before') return steps({ ok: true, files: 1 });
      if (role === 'correct-tests') return FIXED;
      if (role === 'tests-kept') return steps({ ok: false, reason: 'no snapshot' });
      return undefined;
    },
  });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.deepStrictEqual(result.counts, { committed: 1 });
  assert.deepStrictEqual(result.testCorrections[0].counted, []);
});

test('the test writer writes the tests the section names, and no others', async () => {
  const r = responder();
  await run(baseArgs([card('1')]), r);
  assert.match(r.prompt('1:write-tests'), /the tests it names, and no others/);
});

test('no line of the plan, no correction: the card is parked as before', async () => {
  const r = correcting({ diagnosis: { ...WRONG, wrongTests: WRONG.wrongTests.map((w) => ({ ...w, planReference: '' })) } });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.ok(!r.labels().includes('1:correct-tests'));
  assert.equal(result.cards[0].status, 'parked');
  assert.match(result.cards[0].reason, /the tests expect a reordered title/);
});

test('the test writer that finds the test agrees with the plan changes nothing, and the card is parked', async () => {
  const r = correcting({ fixed: { changed: false, tests: WRONG.wrongTests.map((w) => ({ test: w.test, verdict: 'agrees with the plan' })), summary: 'the tests agree with the plan' } });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.ok(!r.labels().includes('1:tests-kept'), 'nothing changed, nothing to check');
  assert.ok(!r.labels().includes('1:attempt-2'));
  assert.equal(result.cards[0].status, 'parked');
});

test('one correction for each build: a second "the test is wrong" parks the card', async () => {
  const r = responder({
    on: (call, who, role) => {
      if (who !== '1') return undefined;
      if (role === 'attempt-1' || role === 'attempt-2') return { green: false, filesChanged: ['src/1/x.js'], failureOutput: role, summary: 'red' };
      if (role === 'diagnose-1') return WRONG;
      if (role === 'diagnose-2') return { ...WRONG, signature: 'sig-other' };
      if (role === 'tests-before') return steps({ ok: true, files: 1 });
      if (role === 'correct-tests') return FIXED;
      if (role === 'tests-kept') return steps({ ok: true, kept: true, problems: [] });
      return undefined;
    },
  });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(r.labels().filter((l) => l === '1:correct-tests').length, 1);
  assert.equal(result.cards[0].status, 'parked');
});

test('by hand the build still stops for the user on a wrong test: the build phase gives no guard', async () => {
  const calls = [];
  const { result } = await loadWorkflow(BUILD)({ plan: 'PLAN-f.md', command: 'npm test' }, (call) => {
    calls.push(call.label);
    if (call.label === 'write-tests') return { filesWritten: ['test/a.test.js'], testsFailAsExpected: true, summary: 'red' };
    if (/^attempt-/.test(call.label)) return { green: false, filesChanged: ['src/a.js'], failureOutput: 'x', summary: 'red' };
    if (/^diagnose-/.test(call.label)) return WRONG;
    return null;
  });
  assert.ok(!calls.includes('correct-tests'), calls.join(' '));
  assert.equal(result.green, false);
  assert.match(result.reason, /needs a decision, not another attempt/);
});

// --- the guard itself ---------------------------------------------------------------------------------------------

const guard = require(path.join(PLUGIN, 'lib', 'test-guard.js'));
const GUARD_CLI = path.join(PLUGIN, 'lib', 'test-guard.js');

test('test-guard: the counts of the common runners', () => {
  assert.deepStrictEqual(guard.count("test('a', () => { assert.equal(1, 1); expect(x).toBe(2); });\nit('b', () => {});\n"), { tests: 2, asserts: 2, skips: 0 });
  assert.deepStrictEqual(guard.count('def test_a():\n    assert f() == 1\n\nasync def test_b():\n    with pytest.raises(ValueError):\n        f()\n'), { tests: 2, asserts: 2, skips: 0 });
  assert.equal(guard.count('@pytest.mark.xfail\ndef test_a():\n    assert 1\n').skips, 1);
  // The mark is built from two parts: the repository's own guard counts skip sites in the test files.
  assert.equal(guard.count(`it.${'sk'}${'ip'}('a', () => {});\n`).skips, 1);
});

test('test-guard: the counts before and after say what went away: a test, an assertion, a file, or a new skip mark', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-guard-'));
  const file = path.join(dir, 't', 'a.test.js');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const cli = (...a) => JSON.parse(spawnSync(process.execPath, [GUARD_CLI, ...a], { cwd: dir, encoding: 'utf8' }).stdout.trim());
  const body = "test('a', () => { assert.equal(f(), 1); assert.ok(g()); });\ntest('b', () => { assert.equal(h(), 2); });\n";
  fs.writeFileSync(file, body);
  assert.deepStrictEqual(cli('snapshot', 'snap/before.json', 't/a.test.js', 't/none.test.js'), { ok: true, files: 1 });
  fs.writeFileSync(file, body.replace('f(), 1', 'f(), 7'));
  assert.deepStrictEqual(cli('check', 'snap/before.json'), { ok: true, kept: true, problems: [] });
  fs.writeFileSync(file, body.replace(' assert.ok(g());', ''));
  assert.match(cli('check', 'snap/before.json').problems.join(), /has 2 assertions, and had 3/);
  fs.writeFileSync(file, body.split('\n')[0] + '\n');
  assert.match(cli('check', 'snap/before.json').problems.join(), /has 1 tests, and had 2/);
  fs.writeFileSync(file, body.replace("test('b'", `test.${'sk'}${'ip'}('b'`));
  assert.equal(cli('check', 'snap/before.json').kept, false);
  fs.rmSync(file);
  assert.match(cli('check', 'snap/before.json').problems.join(), /is gone/);
  assert.equal(cli('snapshot', 'snap/none.json', 't/none.test.js').ok, false, 'no file to record is said');
});
