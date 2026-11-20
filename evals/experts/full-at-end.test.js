'use strict';

// 5.2.0: the unattended run makes the full test run one time after all the cards, and one time after the review's
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
    if (role === 'tests-before') return steps({ ok: true, files: 1 });
    if (role === 'tests-kept') return steps({ ok: true, kept: true, problems: [], changed: [], before: {} });
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

// 5.2.0, from the journals: "tests were already in the tree, so the card was not red-first" 9 times in one run (the
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

// 5.2.0: "the full suite passed" is the record verify.js wrote, read by code, never the answer of the agent.
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

// --- 5.2.0: the run corrects a wrong test one time ------------------------------------------------------------------
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
  // The tests are recorded before the first code round; after the tester's pass they are counted and recorded again.
  assert.deepStrictEqual(labels.slice(2, 10), ['1:tests-before', '1:attempt-1', '1:diagnose-1', '1:correct-tests', '1:tests-kept', '1:tests-before', '1:attempt-2', '1:tests-kept'], labels.join(' '));
  assert.equal(labels.filter((l) => l === '1:correct-tests').length, 1, 'one pass for all the tests');
  assert.match(r.prompt('1:tests-before'), /node "\/p\/lib\/test-guard\.js" snapshot "\.ultimate-workflow\/run\/f\/cards\/1\/tests-before\.json" "test\/1\.test\.js"/);
  assert.match(r.prompt('1:tests-kept'), /test-guard\.js" check /);
  const p = r.prompt('1:correct-tests');
  assert.match(p, /You are the tester of this change/);
  for (const named of ['test/1.test.js::title', 'test/1.test.js::quotes', 'PLAN-f.md:322', 'PLAN-f.md:323']) assert.ok(p.includes(named), named);
  assert.match(p, /Verify every one of these tests against the plan, all in this one pass/);
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
  assert.match(p, /THE PLAN\nPLAN-f\.md/, 'the diagnosis is told which plan the tests are read against');
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
  assert.deepStrictEqual(cli('check', 'snap/before.json'), { ok: true, kept: true, problems: [], changed: ['t/a.test.js'], before: { 't/a.test.js': 'snap/before.json.before/t__a.test.js' } }, 'a changed value: nothing went away, and the file is named as changed, with its copy');
  assert.equal(fs.readFileSync(path.join(dir, 'snap/before.json.before/t__a.test.js'), 'utf8'), body, 'the copy is the file as it was');
  fs.writeFileSync(file, body);
  assert.deepStrictEqual(cli('check', 'snap/before.json').changed, [], 'the same text is not a change');
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

// The first real run (2026-11-18): a test of the confirmed section contradicted the plan. The card left it out and
// said so in notDone, and nothing in the report showed it to the user.
test('a test of the section that was not written, and work a round left undone, are said in the result and recorded', async () => {
  const r = responder({
    on: (call, who, role) => {
      if (who !== '1') return undefined;
      if (role === 'write-tests') return { filesWritten: ['test/1.test.js'], testsFailAsExpected: true, notWritten: [{ test: 'plan test 4', why: 'it contradicts decision 2 and test 3' }], summary: 'red' };
      if (role === 'attempt-1') return { green: true, filesChanged: ['src/1/x.js'], notDone: ['plan test 4 is not implemented'], summary: 'done' };
      return undefined;
    },
  });
  const { result } = await run(baseArgs([card('1'), card('2')]), r);
  assert.match(r.prompt('1:write-tests'), /do not write it and do not write a changed form of it: list it in notWritten/);
  assert.deepStrictEqual(result.leftOut, [{ card: '1', items: ['did not write the test plan test 4: it contradicts decision 2 and test 3'] }], 'the result says the test that was not written; notDone is in the decisions only');
  assert.match(result.summary, /LEFT OUT BY A CARD: card 1: did not write the test plan test 4: it contradicts decision 2 and test 3\. Decide on each before you merge\./);
  const declared = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(r.prompt('1:decisions'))[1]);
  assert.deepStrictEqual(declared.map((d) => [d.what, d.major]), [['did not write the test plan test 4: it contradicts decision 2 and test 3', false], ['left undone: plan test 4 is not implemented', false]]);
});

test('a run where every card did all of its work says nothing about work left out', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1')]), r);
  assert.deepStrictEqual(result.leftOut, []);
  assert.doesNotMatch(result.summary, /LEFT OUT/);
});

// The second real run (2026-11-18): the rounds' notDone held "no lint command was run" and "I did not stage or commit",
// and the result said LEFT OUT BY A CARD for them.
test('notDone alone is not said in the result: it is in the minor decisions of the card', async () => {
  const r = responder({
    on: (call, who, role) => (who === '1' && role === 'attempt-1' ? { green: true, filesChanged: ['src/1/x.js'], notDone: ['No lint command was run: the repository has none.'], summary: 'done' } : undefined),
  });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.deepStrictEqual(result.leftOut, []);
  assert.doesNotMatch(result.summary, /LEFT OUT/);
  const declared = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(r.prompt('1:decisions'))[1]);
  assert.deepStrictEqual(declared.map((d) => d.what), ['left undone: No lint command was run: the repository has none.']);
});

// The second real run: a fix-up card wrote the test of its finding, and the report said it changed that test file
// "outside its paths".
test('the test file a card wrote for its own work is not reported as outside its paths; another file is', async () => {
  const r = responder({
    on: (call, who, role) => {
      if (who !== '1') return undefined;
      if (role === 'write-tests') return { filesWritten: ['C:\\proj\\test\\1.test.js'], testsFailAsExpected: true, summary: 'red' };
      if (role === 'scope') return steps({ card: '1', outOfScope: ['test/1.test.js', 'docs/other.md'] });
      return undefined;
    },
  });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.deepStrictEqual(result.cards[0].outOfScope, ['docs/other.md']);
});

// --- the third real run (2026-11-19): the code round changed two wrong tests itself -----------------------------------
// The round was green and nothing went back to the tester. The tests are the tester's: code sees that a code round
// changed a test file, and the tester verifies those tests against the plan before the round counts.

/** Card 1: the check after round 1 says the code round changed its test file. `fixed` is what the tester answers. */
const codeRoundEdits = (fixed, extra = () => undefined) => {
  let checks = 0;
  return responder({
    on: (call, who, role) => {
      if (who !== '1') return undefined;
      const own = extra(call, role);
      if (own !== undefined) return own;
      if (role === 'attempt-1') return { green: true, filesChanged: ['src/1/x.js', 'test/1.test.js'], decisions: [{ what: 'Corrected two test expectations to match the plan', major: false }], summary: 'done; two tests were wrong' };
      if (role === 'tests-kept') return steps(++checks === 1 ? { ok: true, kept: true, problems: [], changed: ['test/1.test.js'], before: { 'test/1.test.js': '.ultimate-workflow/run/f/cards/1/tests-before.json.before/test__1.test.js' } } : { ok: true, kept: checks !== 2, problems: checks === 2 ? ['test/1.test.js has 4 tests, and had 5'] : [], changed: [], before: {} });
      if (role === 'correct-tests') return fixed;
      return undefined;
    },
  });
};
const VERIFIED = { changed: false, tests: [{ test: 'test/1.test.js::title', verdict: 'agrees with the plan', planReference: 'PLAN-f.md:322', why: 'the plan says substring' }], summary: 'The change of the code round agrees with the plan.' };

test('the code round is told that the tests are not its work', async () => {
  const r = responder();
  await run(baseArgs([card('1')]), r);
  const p = r.prompt('1:attempt-1');
  assert.match(p, /The tests are not yours\. Never edit, add or delete a test file, not even to correct a test that is wrong/);
  assert.match(p, /leave it failing, report green false/);
});

test('a code round that changed a test file: the tester verifies it before the round counts; a change the plan supports stands', async () => {
  const r = codeRoundEdits(VERIFIED);
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels().filter((l) => /^1:/.test(l));
  assert.deepStrictEqual(labels.slice(2, 8), ['1:tests-before', '1:attempt-1', '1:tests-kept', '1:correct-tests', '1:tests-kept', '1:tests-before'], labels.join(' '));
  assert.ok(!labels.includes('1:attempt-2'), 'the tester changed nothing, so the round stands');
  const p = r.prompt('1:correct-tests');
  assert.match(p, /A code round changed test files, which is not its work, and then reported green/);
  assert.match(p, /tests-before\.json\.before\/test__1\.test\.js/, 'the tester is given the file as it was before the change');
  assert.match(p, /Corrected two test expectations to match the plan/, 'and what the code round said');
  assert.match(p, /A change that the plan supports stands/);
  assert.deepStrictEqual(result.counts, { committed: 1 });
  assert.equal(result.testCorrections[0].byCodeRound, true);
  assert.equal(result.testCorrections[0].outcome, 'verified');
  assert.match(result.summary, /TESTS CORRECTED BY THE RUN: card 1 \(changed by the code round, verified by the tester: kept test\/1\.test\.js::title, plan: PLAN-f\.md:322; counted: test\/1\.test\.js has 4 tests, and had 5\)/);
  const declared = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(r.prompt('1:decisions'))[1]);
  assert.ok(declared.some((d) => /^the code round changed tests, and the tester verified the test test\/1\.test\.js::title/.test(d.what)), JSON.stringify(declared));
});

test('a code round that changed a test file, and the tester puts a test right: the code runs again with the full account', async () => {
  const fixed = { changed: true, tests: [{ test: 'test/1.test.js::title', verdict: 'corrected', was: 'what the code round wrote', now: 'what the plan says', planReference: 'PLAN-f.md:322' }], summary: 'One test put right.' };
  const r = codeRoundEdits(fixed);
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels().filter((l) => /^1:/.test(l));
  assert.ok(labels.includes('1:attempt-2'), labels.join(' '));
  const p = r.prompt('1:attempt-2');
  assert.match(p, /"signature": "code-round-changed-tests"/);
  assert.match(p, /"testsChangedByTheTester"/);
  assert.match(p, /Do not change the tests\./);
  assert.deepStrictEqual(result.counts, { committed: 1 });
  assert.equal(result.testCorrections[0].outcome, 'corrected');
});

test('a tester that returns nothing after a code round changed tests: the card is parked, never committed on those tests', async () => {
  const r = codeRoundEdits(null);
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(result.cards[0].status, 'parked');
  assert.match(result.cards[0].reason, /The code round changed test files \(test\/1\.test\.js\) and the tester did not verify them/);
});

test('a card whose code round changed no test file gets no pass of the tester', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1')]), r);
  assert.ok(!r.labels().includes('1:correct-tests'));
  assert.deepStrictEqual(result.testCorrections, []);
});

// --- 5.2.0, card runner-model: the agents that only run commands run on Haiku ------------------------------------------
// The second real run: 35 of 55 agents ran one command each, at about 11,000 tokens each on the build model.

const modelOf = (r, label) => (r.calls.find((c) => c.label === label) || {}).model;
// A step whose commands may all run a second time. A step that changes state is not one of them (see below).
const COMMAND_STEPS = ['1:start', '1:tests-before', '1:tests-kept', '1:scope', '1:decisions', 'full-suite:proof', 'settle:state', 'review:prepare'];
const STATE_STEPS = ['1:commit', 'review:record', 'harvest:branch', 'finished:notify', 'settle:record'];

test('runner-model 1-2: a step that only runs commands is on haiku; the tests, the code and the journal are on the build model', async () => {
  const r = responder();
  await run(baseArgs([card('1')]), r);
  for (const l of COMMAND_STEPS) assert.equal(modelOf(r, l), 'haiku', l);
  for (const l of ['1:write-tests', '1:attempt-1', '1:journal', 'full-suite:run']) assert.equal(modelOf(r, l), 'sonnet', l);
  // The experts check of this change: a step that commits, parks, records or notifies cannot run a second time, so a
  // line a cheaper model copied wrongly could not be recovered. Those steps stay on the build model.
  for (const l of STATE_STEPS) assert.equal(modelOf(r, l), 'sonnet', l);
  assert.notEqual(modelOf(r, 'review:correctness'), 'haiku', 'a review lens is not a command step');
});

test('runner-model 3: runnerModel inherit gives a step no model, and a named model is passed', async () => {
  const a = responder();
  await run(baseArgs([card('1')], { runnerModel: 'inherit' }), a);
  assert.equal(modelOf(a, '1:scope'), undefined);
  const b = responder();
  await run(baseArgs([card('1')], { runnerModel: 'sonnet' }), b);
  assert.equal(modelOf(b, '1:scope'), 'sonnet');
});

test('runner-model 4: a runner model that is not allowed is refused before anything starts, as the build model is', async () => {
  const r = responder();
  const { result } = await run(baseArgs([card('1')], { runnerModel: 'gpt-9' }), r);
  assert.equal(result.ok, false);
  assert.match(result.error, /args\.runnerModel is "gpt-9": expected inherit, sonnet, opus, haiku or a claude-\* model id\. Nothing was started\./);
  assert.deepStrictEqual(r.labels(), []);
});

test('runner-model 4: the variable and the option of run-start reach the arguments of the run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-runner-'));
  const sh = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  sh('init', '-q', '-b', 'main');
  sh('config', 'user.email', 't@localhost');
  sh('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  fs.writeFileSync(path.join(dir, 'PLAN-f.md'), '---\nphase: build\nplan_confirmed: false\ntests_confirmed: false\ntest_command: node t.test.js\nexperts: []\n---\n\n# PLAN: f\n\n## Cards\n\n- 1: one\n  paths: src/**\n\n## Tests\n\n### 1: one\n\n- it works\n');
  fs.writeFileSync(path.join(dir, 't.test.js'), "console.log('# tests 1\\n# pass 1\\n# fail 0');\n");
  sh('add', '-A');
  sh('commit', '-q', '-m', 'init');
  const CLI = path.join(PLUGIN, 'experts', 'experts.js');
  const node = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_NOTIFY: 'off', ...env } });
  node(['present', '--confirm', 'plan_confirmed', '--plan', 'PLAN-f.md']);
  node(['present', '--confirm', 'tests_confirmed', '--plan', 'PLAN-f.md']);
  sh('commit', '-q', '-am', 'confirmed');
  const argsOf = () => JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'run', 'run.args.json'), 'utf8'));
  const scriptArgs = () => JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'run', 'run.js'), 'utf8'))[1]);
  const a = node(['run-start', '--plan', 'PLAN-f.md', '--feature', 'f', '--runner-model', 'sonnet']);
  assert.match(a.stdout, /"ok":true/, a.stdout + a.stderr);
  assert.equal(argsOf().runnerModel, 'sonnet');
  assert.equal(scriptArgs().runnerModel, 'sonnet');
  const b = node(['run-start', '--plan', 'PLAN-f.md', '--feature', 'f'], { ULTIMATE_WORKFLOW_RUNNER_MODEL: 'inherit' });
  assert.match(b.stdout, /"ok":true/, b.stdout + b.stderr);
  assert.equal(scriptArgs().runnerModel, 'inherit', 'the variable is the default when the option is not given');
});

const garbled = { outputs: [{ command: '', output: 'the command ran fine, I think' }] };

test('runner-model 5-6: a step with no JSON line in its answer runs one more time, on the build model; a step that answered does not', async () => {
  // The second answer is the one used: it says a file is out of scope, and the card's entry holds exactly that.
  const r = responder({ on: (call) => (call.label === '1:scope' ? garbled : call.label === '1:scope:again' ? steps({ card: '1', outOfScope: ['docs/seen-by-the-second-run.md'] }) : undefined) });
  const { result } = await run(baseArgs([card('1')]), r);
  const labels = r.labels();
  assert.ok(labels.includes('1:scope:again'), labels.join(' '));
  assert.deepStrictEqual(result.cards[0].outOfScope, ['docs/seen-by-the-second-run.md'], 'the answer of the second run is used');
  assert.equal(modelOf(r, '1:scope:again'), 'sonnet');
  assert.equal(r.prompt('1:scope:again').split('Run each of these')[1], r.prompt('1:scope').split('Run each of these')[1], 'the same commands');
  assert.deepStrictEqual(result.stepsRunAgain, ['1:scope']);
  assert.deepStrictEqual(result.counts, { committed: 1 });
  assert.equal(labels.filter((l) => /:again$/.test(l)).length, 1, 'no other step was run again');
});

test('runner-model 5: a step that must not run twice (the commit, the park) is never run again; it fails as before', async () => {
  const r = responder({ on: (call) => (call.label === '1:commit' ? garbled : undefined) });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.ok(!r.labels().includes('1:commit:again'));
  assert.equal(result.cards[0].status, 'parked');
  assert.deepStrictEqual(result.stepsRunAgain, []);
});

test('runner-model 7: a step that writes files and runs again writes the same files', async () => {
  const r = responder({ on: (call) => (call.label === '1:decisions' ? garbled : undefined) });
  await run(baseArgs([card('1')]), r);
  const files = (p) => (p.match(/<<<CONTENT\n[\s\S]*?\nCONTENT>>>/g) || []).join('|');
  assert.ok(files(r.prompt('1:decisions')).length > 0);
  assert.equal(files(r.prompt('1:decisions:again')), files(r.prompt('1:decisions')));
});

test('runner-model 8: run.md and build.md name the option and the variable', () => {
  for (const f of [['phases', 'run.md'], ['commands', 'build.md']]) {
    const md = fs.readFileSync(path.join(PLUGIN, ...f), 'utf8');
    assert.match(md, /--runner-model/, f.join('/'));
    assert.match(md, /ULTIMATE_WORKFLOW_RUNNER_MODEL/, f.join('/'));
  }
});

test('runner-model 5: a second run that also gives no JSON line leaves the step failed, and is not run a third time', async () => {
  const r = responder({ on: (call) => (/^1:decisions/.test(call.label) ? garbled : undefined) });
  const { result } = await run(baseArgs([card('1')]), r);
  assert.equal(r.labels().filter((l) => /^1:decisions/.test(l)).length, 2);
  assert.equal(result.cards[0].status, 'parked');
  assert.match(result.cards[0].reason, /the check for decisions the plan does not state could not run/);
});

test('runner-model: a record of the run state is not a step that may run twice', async () => {
  const r = responder();
  await run(baseArgs([card('1')]), r);
  assert.equal(modelOf(r, 'settle:state'), 'haiku', 'a read');
  assert.equal(modelOf(r, 'settle:record'), 'sonnet', 'a write');
});

// --- 5.2.0, card repos-end: the run script with more than one repository ----------------------------------------------

const DEMO = [{ name: 'demo', dir: 'C:/w/demo' }];
const twoRepoCard = () => card('1', { paths: ['src/1/**', 'demo:src/1/**'] });
/** Card 1 is committed in the two repositories; `proof` answers the two records of the full run. */
const inTwo = (o = {}) =>
  responder({
    ...o,
    on: (call, who, role) => {
      const own = o.on && o.on(call, who, role);
      if (own !== undefined) return own;
      if (who === '1' && role === 'commit') return steps({ ok: true, card: '1', commit: 'c-1', files: 2, handoff: 'h', missingClaims: [], repos: [{ repo: 'demo', commit: 'd-1' }] });
      if (role === 'proof' && /^full-suite/.test(who)) return steps(...(o.records || [{ ok: true, current: true, passed: true }, { ok: true, current: true, passed: true, repo: 'demo' }]));
      return undefined;
    },
  });

test('repos-end 1: the full run is made in each repository that got a commit, and each record is read', async () => {
  const r = inTwo();
  const { result } = await run(baseArgs([twoRepoCard()], { repos: DEMO }), r);
  const p = r.prompt('full-suite:run');
  assert.match(p, /Run these 2 commands, one at a time, in this order/);
  assert.match(p, /`node "\/p\/hooks\/verify\.js" --plan "PLAN-f\.md" --full` \(the main repository\), then `node "\/p\/hooks\/verify\.js" --plan "PLAN-f\.md" --repo demo --full` \(the repository demo\)/);
  const proof = r.prompt('full-suite:proof');
  assert.match(proof, /experts\.js" full-record\n/);
  assert.match(proof, /experts\.js" full-record --plan "PLAN-f\.md" --repo demo/);
  assert.equal(result.fullSuite.text, 'Full suite: passed');
  assert.deepStrictEqual(result.fullSuite.runs[0].repos, [{ repo: '', passed: true }, { repo: 'demo', passed: true }]);
  assert.deepStrictEqual(result.cards[0].repos, [{ repo: 'demo', commit: 'd-1' }]);
});

test('repos-end 1: a record of another repository that is not of its commit means the full run is not proven', async () => {
  const r = inTwo({ records: [{ ok: true, current: true, passed: true }, { ok: true, current: false, passed: false, repo: 'demo', reason: 'there is no record of a full run (.ultimate-workflow/verify.json)' }] });
  const { result } = await run(baseArgs([twoRepoCard()], { repos: DEMO }), r);
  assert.match(result.fullSuite.text, /^FULL SUITE NOT GREEN: the full run is not proven: repository demo: there is no record of a full run/);
});

test('repos-end 2: a full run that fails in another repository makes the one correcting card with paths there', async () => {
  const r = inTwo({ records: [{ ok: true, current: true, passed: true }, { ok: true, current: true, passed: false, repo: 'demo' }], fullGreen: ['full-suite'], fullRun: () => ({ passed: false, failures: ['demo: t::x'], output: 'E', summary: 'demo fails' }) });
  await run(baseArgs([twoRepoCard()], { repos: DEMO }), r);
  const setup = r.prompt('full-suite:setup');
  assert.match(setup, /the full suite fails after the cards \(demo\)/);
  const paths = /full-suite-paths\.txt with the Write tool\.[^\n]*\n<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(setup)[1];
  assert.equal(paths, 'demo:src/1/**', 'the card may change what the cards changed in that repository, and nothing of the main one');
});

test('repos-end 3: the review of a run with more than one repository is prepared for that run; one repository is prepared as before', async () => {
  const r = inTwo();
  await run(baseArgs([twoRepoCard()], { repos: DEMO }), r);
  assert.match(r.prompt('review:prepare'), /experts\.js" prepare --range "[^"]+" --feature f /);
  const one = responder();
  await run(baseArgs([card('1')]), one);
  assert.doesNotMatch(one.prompt('review:prepare'), /--feature/);
  assert.match(one.prompt('full-suite:run'), /Run this one command and report what it says: `node "\/p\/hooks\/verify\.js" --plan "PLAN-f\.md" --full`\./);
});

test('repos-end 7: the harvest is told the other repositories, and that the lessons go in this one only', async () => {
  const r = inTwo();
  await run(baseArgs([twoRepoCard()], { repos: DEMO }), r);
  const p = r.prompt('harvest');
  assert.match(p, /This run changed more than one repository: read the changes of each \(`demo` in C:\/w\/demo/);
  assert.match(p, /The lessons are written in this repository only/);
});

test('repos-end 5: a repository that moved since the last review makes the resume review again', async () => {
  const moved = (flag) => responder({ on: (call, who, role) => (who === 'settle' && role === 'state' ? steps({ ok: true, head: 'h1', reviewedHead: 'h1', harvestedHead: 'h1', harvestBranch: 'uw/harvest/f', ...(flag === undefined ? {} : { reposMoved: flag, repoHeads: { demo: 'd2' } }) }) : undefined) });
  const still = moved(false);
  const a = await run(baseArgs([card('1')], { repos: DEMO }), still);
  assert.equal(a.result.review.ran, false, 'nothing moved: no second review');
  const went = moved(true);
  const b = await run(baseArgs([card('1')], { repos: DEMO }), went);
  assert.equal(b.result.review.ran, true, JSON.stringify(b.result.review).slice(0, 200));
});

// The second experts check of the whole change: the park step and the step that adds a card are held too.
test('runner-model: the park step and the step that adds a card stay on the build model and never run a second time', async () => {
  const r = responder({ red: ['1'], on: (call) => (call.label === '1:park' ? garbled : undefined) });
  await run(baseArgs([card('1')]), r);
  assert.equal(modelOf(r, '1:park'), 'sonnet');
  assert.ok(!r.labels().includes('1:park:again'));
  const f = responder({ fullRun: () => ({ passed: false, failures: ['t::x'], summary: 'fails' }), proof: () => ({ ok: true, current: true, passed: false }), on: (call) => (call.label === 'full-suite:setup' ? garbled : undefined) });
  await run(baseArgs([card('1')]), f);
  assert.equal(modelOf(f, 'full-suite:setup'), 'sonnet');
  assert.ok(!f.labels().includes('full-suite:setup:again'));
});

// The fourth experts check of the whole change, plan case repos-end 4: a finding of the review in another repository.
test('repos-end 4: a review finding in a file of another repository makes a fix-up card with a path in that repository', async () => {
  const finding = { file: 'demo:src/1/x.js', line: 3, what: 'the label is not trimmed', howItFails: 'a space stays in front', confidence: 'high', severity: 'medium' };
  const r = inTwo({ reviewFindings: [finding] });
  const { result } = await run(baseArgs([twoRepoCard()], { repos: DEMO }), r);
  const setup = r.labels().find((l) => /^fixup[^:]*:setup$/.test(l));
  assert.ok(setup, r.labels().join(' '));
  const p = r.prompt(setup);
  const paths = /-paths\.txt with the Write tool\.[^\n]*\n<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(p)[1];
  assert.equal(paths, 'demo:src/1/x.js');
  assert.match(p, /demo:src\/1\/x\.js:3: the label is not trimmed/);
  assert.ok(result.fixupCard || result.cards.some((c) => /^fixup/.test(c.card)), 'the fix-up card is in the result');
});
