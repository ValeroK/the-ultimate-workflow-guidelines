'use strict';

const test = require('node:test');
const assert = require('node:assert');

const gates = require('./gates.js');

const featureState = (data) => ({ stage: 'feature', file: 'PLAN-x.md', data });
const bootstrapState = (data) => ({ stage: 'bootstrap', file: 'PRD.md', data });
const noneState = () => ({ stage: 'none', file: null, data: {} });

// --- path classification ---------------------------------------------------
// Getting "is this a test file" wrong makes G2 either useless or maddening,
// so the trap cases are covered explicitly.

test('isDocPath recognises markdown and plain text as documentation', () => {
  for (const p of ['README.md', 'docs/guide.md', 'PLAN-x.md', 'PRD.md', 'notes.txt', 'a/b/c.MD']) {
    assert.equal(gates.isDocPath(p), true, p);
  }
});

test('isDocPath does not classify source as documentation', () => {
  for (const p of ['src/a.js', 'hooks/lib/state.js', 'main.py', 'app.ts', 'x.mdx']) {
    assert.equal(gates.isDocPath(p), false, p);
  }
});

// A plan often needs an architecture diagram before anything is confirmed (found in the homeyos
// AWS planning session: the diagram had to wait for the plan to be accepted). Diagram source
// formats are writable anywhere; rendered formats only under a `docs` folder, because `.html` and
// `.svg` elsewhere are routinely application source.
test('isDiagramPath accepts diagram sources anywhere and rendered diagrams under docs/', () => {
  for (const p of [
    'arch.mmd', 'docs/flow.mermaid', 'design/seq.puml', 'x.plantuml', 'a/b.drawio', 'c.excalidraw', 'd.d2',
    'docs/arch.html', 'docs/aws/target.svg', 'docs/aws/target.png', 'DOCS/x.HTML', 'docs\\aws\\x.htm',
    'services/api/docs/arch.svg',
  ]) {
    assert.equal(gates.isDiagramPath(p), true, p);
  }
});

test('isDiagramPath does not open application html, svg or images', () => {
  for (const p of [
    'index.html', 'public/index.html', 'src/assets/logo.svg', 'app/icon.png', 'src/docs.html',
    'docsite/index.html', 'src/a.js', 'docs/build.js', 'docs/conf.py', 'mmd', '.drawio',
  ]) {
    assert.equal(gates.isDiagramPath(p), false, p);
  }
});

test('G1, G2, G6 and the bootstrap gates let diagrams through before confirmation', () => {
  const states = [
    featureState({ plan_confirmed: false }),
    featureState({ plan_confirmed: true }),
    featureState({ plan_confirmed: true, experts: [], tests_confirmed: false }),
    bootstrapState({ prd_confirmed: false }),
    bootstrapState({ prd_confirmed: true, design_confirmed: false }),
  ];
  for (const state of states) {
    for (const p of ['docs/aws/target.html', 'docs/aws/target.svg', 'arch.mmd', 'design.drawio']) {
      assert.equal(gates.preEditGate(state, { path: p }).allow, true, `${state.stage}: ${p}`);
    }
    const abs = gates.preEditGate(state, { path: 'C:\\proj\\docs\\arch.html', cwd: 'C:\\proj' });
    assert.equal(abs.allow, true, `${state.stage}: absolute`);
    assert.equal(gates.preEditGate(state, { path: 'public/index.html' }).allow, false, `${state.stage}: app html`);
  }
});

// The phase commands write their arguments and the ledger row into `.ultimate-workflow/run/` with
// the Write tool. Found in a real run: with the plan accepted and tests not yet confirmed, G2 refused
// `plan.row.json` and `tests.args.json`, so the tests phase could not even start.
test('G2 and G1 let the plugin write its own run files, in every stage', () => {
  const awaitingTests = featureState({ plan_confirmed: true, tests_confirmed: false });
  const awaitingPlan = featureState({ plan_confirmed: false });
  for (const state of [awaitingTests, awaitingPlan, bootstrapState({ prd_confirmed: false })]) {
    for (const p of ['.ultimate-workflow/run/tests.args.json', '.ultimate-workflow/run/plan.row.json', '.ultimate-workflow/run/deep/er/x.js']) {
      assert.equal(gates.preEditGate(state, { path: p }).allow, true, `${state.stage}: ${p}`);
    }
  }
  // An absolute Windows path inside the project reduces to the same relative path.
  const abs = gates.preEditGate(awaitingTests, { path: 'C:\\proj\\.ultimate-workflow\\run\\plan.row.json', cwd: 'C:\\proj' });
  assert.equal(abs.allow, true);
});

test('the run-folder exemption does not open the evidence the commit gate reads, or anything else', () => {
  const state = featureState({ plan_confirmed: true, tests_confirmed: false, experts: [] });
  for (const p of [
    '.ultimate-workflow/experts/review/security.json',
    '.ultimate-workflow/snapshots/abc.diff',
    '.ultimate-workflow/active-plan',
    '.ultimate-workflow/run',
    '.ultimate-workflow/runs/x.json',
    '.ultimate-workflow/run/../experts/review/security.json',
    '.ultimate-workflow/./experts/x.json',
    'src/.ultimate-workflow/run/x.json',
    'src/a.js',
  ]) {
    const r = gates.preEditGate(state, { path: p });
    assert.equal(r.allow, false, p);
    assert.match(r.reason, /Gate G2/, p);
  }
  assert.equal(gates.isRunPath('.ultimate-workflow/run/x.json'), true);
  assert.equal(gates.isRunPath('.ultimate-workflow/RUN/x.json'), true, 'Windows paths are case-insensitive');
});

test('isTestPath recognises the common test conventions', () => {
  for (const p of [
    'hooks/lib/state.test.js',
    'src/a.spec.ts',
    'src/__tests__/a.js',
    'test/helper.js',
    'tests/integration/a.py',
    'spec/models/user_spec.rb',
    'src/__mocks__/fs.js',
    'a\\b\\__tests__\\c.js',
  ]) {
    assert.equal(gates.isTestPath(p), true, p);
  }
});

test('isTestPath does not fire on "test" appearing as a substring', () => {
  for (const p of [
    'src/latest.js',
    'src/contest.ts',
    'src/protest/index.js',
    'lib/greatest-common.js',
    'src/testing-library-shim.js',
  ]) {
    assert.equal(gates.isTestPath(p), false, p);
  }
});

// --- G1: no source edit before a confirmed plan ----------------------------

test('G1 denies a source edit while the plan is unconfirmed, naming the gate', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'src/a.js' });
  assert.equal(r.allow, false);
  assert.match(r.reason, /plan_confirmed/);
});

test('G1 allows editing the plan file itself', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'PLAN-x.md' });
  assert.equal(r.allow, true);
});

test('G1 allows documentation edits', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'README.md' });
  assert.equal(r.allow, true);
});

// --- G2: no implementation before confirmed tests --------------------------

test('G2 denies a source edit while tests are unconfirmed', () => {
  const r = gates.preEditGate(
    featureState({ plan_confirmed: true, tests_confirmed: false, experts: '[]' }),
    { path: 'src/a.js' }
  );
  assert.equal(r.allow, false);
  assert.match(r.reason, /tests_confirmed/);
});

test('G2 allows editing test files while tests are unconfirmed -- that is the point', () => {
  const r = gates.preEditGate(
    featureState({ plan_confirmed: true, tests_confirmed: false }),
    { path: 'hooks/lib/state.test.js' }
  );
  assert.equal(r.allow, true);
});

test('both confirmed allows source edits', () => {
  const r = gates.preEditGate(
    featureState({ plan_confirmed: true, tests_confirmed: true, experts: '[]' }),
    { path: 'src/a.js' }
  );
  assert.equal(r.allow, true);
});

// --- stage none and bootstrap ---------------------------------------------

test('stage none never blocks anything', () => {
  assert.equal(gates.preEditGate(noneState(), { path: 'src/a.js' }).allow, true);
  assert.equal(gates.stopGate(noneState()).allow, true);
});

test('B-G2 denies source edits before the design is confirmed', () => {
  const r = gates.preEditGate(
    bootstrapState({ prd_confirmed: true, design_confirmed: false }),
    { path: 'src/index.js' }
  );
  assert.equal(r.allow, false);
  assert.match(r.reason, /design_confirmed/);
});

test('B-G1 denies scaffolding before the PRD is confirmed', () => {
  const r = gates.preEditGate(
    bootstrapState({ prd_confirmed: false, design_confirmed: false }),
    { path: 'src/index.js' }
  );
  assert.equal(r.allow, false);
  assert.match(r.reason, /prd_confirmed/);
});

test('bootstrap always allows editing PRD.md', () => {
  const r = gates.preEditGate(bootstrapState({ prd_confirmed: false }), { path: 'PRD.md' });
  assert.equal(r.allow, true);
});

// --- G3: coding must route through verify ---------------------------------

test('G3 blocks turn completion while the tree is dirty', () => {
  const r = gates.stopGate(featureState({ plan_confirmed: true, tests_confirmed: true, dirty: true, test_command: 'node --test hooks/' }));
  assert.equal(r.allow, false);
  assert.match(r.reason, /node --test hooks\//);
});

test('G3 allows turn completion once verification is green', () => {
  const r = gates.stopGate(featureState({ dirty: false, last_verify: 'green' }));
  assert.equal(r.allow, true);
});

test('G3 does not block when nothing has been edited', () => {
  const r = gates.stopGate(featureState({ plan_confirmed: true, tests_confirmed: true }));
  assert.equal(r.allow, true);
});

test('G3 stays out of the way once the run has escalated', () => {
  const r = gates.stopGate(featureState({ dirty: true, escalated: true }));
  assert.equal(r.allow, true);
});

// --- G4: round cap ---------------------------------------------------------

test('G4 counts failing rounds and escalates on the third', () => {
  let data = { verify_rounds: 0, escalated: false };

  let r = gates.roundCap({ stage: 'feature', data }, { passed: false });
  assert.equal(r.patch.verify_rounds, 1);
  assert.equal(r.patch.escalated, false);

  data = { ...data, ...r.patch };
  r = gates.roundCap({ stage: 'feature', data }, { passed: false });
  assert.equal(r.patch.verify_rounds, 2);
  assert.equal(r.patch.escalated, false);

  data = { ...data, ...r.patch };
  r = gates.roundCap({ stage: 'feature', data }, { passed: false });
  assert.equal(r.patch.verify_rounds, 3);
  assert.equal(r.patch.escalated, true);
});

test('G4 does not re-escalate on a fourth failing round', () => {
  const r = gates.roundCap(
    { stage: 'feature', data: { verify_rounds: 3, escalated: true } },
    { passed: false }
  );
  assert.equal(r.alreadyEscalated, true);
  assert.equal(r.patch.verify_rounds, 4);
});

test('G4 resets the counter and clears dirty on a green run', () => {
  const r = gates.roundCap(
    { stage: 'feature', data: { verify_rounds: 2, escalated: false, dirty: true } },
    { passed: true }
  );
  assert.equal(r.patch.verify_rounds, 0);
  assert.equal(r.patch.last_verify, 'green');
  assert.equal(r.patch.dirty, false);
});

test('G4 records red without clearing dirty', () => {
  const r = gates.roundCap(
    { stage: 'feature', data: { verify_rounds: 0, dirty: true } },
    { passed: false }
  );
  assert.equal(r.patch.last_verify, 'red');
  assert.notEqual(r.patch.dirty, false);
});

// --- G5: phase pointer -----------------------------------------------------

test('G5 names the stage and the next required action', () => {
  const line = gates.phasePointer(featureState({ plan_confirmed: false }), { workflowsAvailable: true });
  assert.match(line, /feature/);
  assert.match(line, /confirm the plan/i);
});

test('G5 reports workflow availability', () => {
  const on = gates.phasePointer(featureState({ plan_confirmed: true, tests_confirmed: true }), { workflowsAvailable: true });
  const off = gates.phasePointer(featureState({ plan_confirmed: true, tests_confirmed: true }), { workflowsAvailable: false });
  assert.match(on, /workflows available/i);
  assert.match(off, /workflows unavailable/i);
});

test('G5 says nothing at stage none', () => {
  assert.equal(gates.phasePointer(noneState(), { workflowsAvailable: true }), '');
});

test('G5 surfaces an escalation instead of the ordinary next action', () => {
  const line = gates.phasePointer(featureState({ escalated: true, verify_rounds: 3 }), { workflowsAvailable: true });
  assert.match(line, /escalat/i);
});

// --- toProjectPath ---------------------------------------------------------
// Driven by real recorded payloads (fixtures/claude-code/PreToolUse.3.json),
// which revealed that file_path is always absolute and is routinely outside cwd.

const CWD = String.raw`C:\Users\kobiv\Projects\claude-basic-skill`;

test('toProjectPath relativises an absolute path inside the project', () => {
  assert.equal(gates.toProjectPath(CWD, CWD + String.raw`\hooks\lib\state.js`), 'hooks/lib/state.js');
});

test('toProjectPath returns null for a path outside the project', () => {
  const scratch =
    String.raw`C:\Users\kobiv\AppData\Local\Temp\claude\C--Users-kobiv-Projects-claude-basic-skill\x\scratchpad\gate-probe.js`;
  assert.equal(gates.toProjectPath(CWD, scratch), null);
});

test('toProjectPath treats Windows paths case-insensitively', () => {
  assert.equal(gates.toProjectPath(CWD, String.raw`c:\users\KOBIV\Projects\Claude-Basic-Skill\src\a.js`), 'src/a.js');
});

test('toProjectPath treats POSIX paths case-sensitively', () => {
  assert.equal(gates.toProjectPath('/home/k/proj', '/home/k/proj/src/a.js'), 'src/a.js');
  assert.equal(gates.toProjectPath('/home/k/proj', '/home/k/PROJ/src/a.js'), null);
});

test('toProjectPath passes a relative path through unchanged', () => {
  assert.equal(gates.toProjectPath(CWD, 'src/a.js'), 'src/a.js');
});

test('toProjectPath returns empty string for the project root itself', () => {
  assert.equal(gates.toProjectPath(CWD, CWD), '');
});

test('a sibling directory sharing a prefix is outside the project', () => {
  assert.equal(gates.toProjectPath(CWD, CWD + String.raw`-other\src\a.js`), null);
});

// The regression that absolute paths would otherwise cause: an ancestor
// directory named "test" anywhere on the machine must not make a source file
// look like test code.
test('an ancestor directory named test outside the project does not leak in', () => {
  const cwd = '/home/k/test/myproject';
  const rel = gates.toProjectPath(cwd, '/home/k/test/myproject/src/a.js');
  assert.equal(rel, 'src/a.js');
  assert.equal(gates.isTestPath(rel), false);
  assert.equal(gates.isTestPath('/home/k/test/myproject/src/a.js'), true, 'unrelativised path misfires -- which is why relativisation is required');
});

// --- preEditGate with cwd --------------------------------------------------

test('preEditGate ignores edits outside the project even with an unconfirmed plan', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), {
    path: String.raw`C:\Users\kobiv\AppData\Local\Temp\scratch\a.js`,
    cwd: CWD,
  });
  assert.equal(r.allow, true);
});

test('preEditGate still blocks an absolute path inside the project', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), {
    path: CWD + String.raw`\src\a.js`,
    cwd: CWD,
  });
  assert.equal(r.allow, false);
  assert.match(r.reason, /plan_confirmed/);
});

test('preEditGate allows an absolute path to a test file inside the project', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: true, tests_confirmed: false }), {
    path: CWD + String.raw`\hooks\lib\state.test.js`,
    cwd: CWD,
  });
  assert.equal(r.allow, true);
});

// --- G6: the domain-experts decision and the commit gate ------------------------

test('G6 denies a source edit once the plan is confirmed but no experts decision is recorded, and says how to record one', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: true, tests_confirmed: true }), { path: 'src/a.js' });
  assert.equal(r.allow, false);
  assert.match(r.reason, /Gate G6/);
  assert.match(r.reason, /experts\.js select/);
  assert.match(r.reason, /--add ""/);
});

test('G6 accepts any recorded decision, including "none apply"', () => {
  for (const experts of ['[]', '[security]', '[security, devops]']) {
    const r = gates.preEditGate(featureState({ plan_confirmed: true, tests_confirmed: true, experts }), { path: 'src/a.js' });
    assert.equal(r.allow, true, experts);
  }
});

test('G6 does not block test files or documentation, so the tests can be written before the decision is recorded', () => {
  const st = featureState({ plan_confirmed: true, tests_confirmed: false });
  assert.equal(gates.preEditGate(st, { path: 'hooks/lib/state.test.js' }).allow, true);
  assert.equal(gates.preEditGate(st, { path: 'docs/notes.md' }).allow, true);
});

test('G1 is reported before G6: an unconfirmed plan is the first thing to fix', () => {
  const r = gates.preEditGate(featureState({ plan_confirmed: false }), { path: 'src/a.js' });
  assert.match(r.reason, /Gate G1/);
});

test('isCommitCommand sees a commit however git is invoked, and nothing else', () => {
  const yes = [
    'git commit -m "x"',
    'git commit',
    'git -C sub commit -m x',
    'git -c user.name=a commit -m x',
    'cd a && git commit -am x',
    'git add -A && git commit -m x',
    'GIT_AUTHOR_NAME=a git commit -m x',
    '(git commit -m x)',
    'git add .\ngit commit -m x',
    "git commit -F - <<'EOF'\nmessage\nEOF",
    'echo done; git commit --amend',
  ];
  const no = [
    'git log --grep=commit',
    'git commit-tree abc',
    'git status',
    'git add -A',
    'git diff HEAD',
    'echo "git commit"',
    'ls commit',
    'node --test',
    'git show HEAD~1',
    '',
    null,
    undefined,
  ];
  for (const c of yes) assert.equal(gates.isCommitCommand(c), true, c);
  for (const c of no) assert.equal(gates.isCommitCommand(c), false, String(c));
});

const evidence = (over = {}) => ({
  hash: 'h1',
  recheck: { hash: 'h1', final: ['security'] },
  records: { security: 'h1' },
  planExperts: ['security'],
  available: ['security'],
  ...over,
});

test('commitGate allows when the re-check and every selected expert\'s review match the current changes', () => {
  assert.equal(gates.commitGate(evidence()).allow, true);
});

test('commitGate allows when the evidence says there is nothing to review, or there is no evidence at all', () => {
  assert.equal(gates.commitGate({ skip: 'nothing to commit' }).allow, true);
  assert.equal(gates.commitGate(undefined).allow, true);
  assert.equal(gates.commitGate(null).allow, true);
});

test('commitGate blocks each way the evidence can fall short, and the reason names the command to run', () => {
  const cases = {
    'no recheck at all': evidence({ recheck: null }),
    'a recheck of other changes': evidence({ recheck: { hash: 'old', final: ['security'] } }),
    'a review of other changes': evidence({ records: { security: 'old' } }),
    'no review by a selected expert': evidence({ records: {} }),
    'a plan expert dropped by the recheck': evidence({ recheck: { hash: 'h1', final: [] }, records: {} }),
  };
  for (const [name, ev] of Object.entries(cases)) {
    const r = gates.commitGate(ev);
    assert.equal(r.allow, false, name);
    assert.match(r.reason, /Gate G6/, name);
    assert.match(r.reason, /\/ultimate-workflow:experts/, name);
  }
});

test('commitGate: an expert the re-check added needs its own review, and an unrelated stale record does not satisfy it', () => {
  const ev = evidence({ planExperts: [], recheck: { hash: 'h1', final: ['security', 'devops'] }, records: { security: 'h1', devops: 'old' } });
  const r = gates.commitGate(ev);
  assert.equal(r.allow, false);
  assert.match(r.reason, /devops/);
  assert.ok(!/security/.test(r.reason.replace('/ultimate-workflow:experts', '')) || /devops/.test(r.reason));
});

// --- G6: open high-confidence findings ------------------------------------------------

const openFinding = (over = {}) => ({ id: 'abc123def0', expert: 'security', file: 'src/routes/orders.js', line: 23, what: 'admin bypass', ...over });

test('commitGate blocks while a high-confidence finding is open, and tells the agent what to do and what not to', () => {
  const r = gates.commitGate(evidence({ open: [openFinding()] }));
  assert.equal(r.allow, false);
  assert.match(r.reason, /1 high-confidence finding is still open/);
  assert.match(r.reason, /\[abc123def0\] security: src\/routes\/orders\.js:23 admin bypass/);
  assert.match(r.reason, /Tell the user/);
  assert.match(r.reason, /resolve --id <id> --reason/);
  assert.match(r.reason, /only if the user says to/);
  assert.match(r.reason, /Do not dismiss one on your own authority/);
});

test('commitGate allows when no finding is open, and shows at most five when many are', () => {
  assert.equal(gates.commitGate(evidence({ open: [] })).allow, true);
  const many = Array.from({ length: 8 }, (_, i) => openFinding({ id: `id${i}`, what: `problem ${i}` }));
  const r = gates.commitGate(evidence({ open: many }));
  assert.match(r.reason, /8 high-confidence findings are still open/);
  assert.equal((r.reason.match(/^  - \[/gm) || []).length, 5);
  assert.match(r.reason, /and 3 more/);
});

test('the missing-review and stale-evidence reasons come before the findings, because they say the findings cannot be trusted yet', () => {
  const r = gates.commitGate(evidence({ recheck: null, open: [openFinding()] }));
  assert.match(r.reason, /have not been re-checked/);
});

// ---- the memory check inside commitGate (PLAN-memory-index, card gate) ----
// gates.js reads no files: it is handed evidence.memory = { added, existing }, the problems a commit
// introduces and the ones already there at HEAD. A problem is { file, kind, text } plus line and
// target for a link; kind is 'index', 'header' or 'link'.

const staleIndex = { file: 'memory.md', kind: 'index', text: 'memory/new.md is missing from the index in memory.md' };
const brokenLink = { file: 'AGENTS.md', kind: 'link', line: 7, target: 'gone.md', text: 'AGENTS.md:7: broken link to gone.md' };
const oldLink = { file: 'AGENTS.md', kind: 'link', line: 3, target: 'old.md', text: 'AGENTS.md:3: broken link to old.md' };

test('commitGate denies a commit that adds a stale index, and the reason names the problem and the fixing command', () => {
  const r = gates.commitGate({ skip: 'only documentation changed', memory: { added: [staleIndex], existing: [] } });
  assert.equal(r.allow, false);
  assert.match(r.reason, /memory\/new\.md is missing from the index in memory\.md/);
  assert.match(r.reason, /node experts\/experts\.js memory index/);
});

test('commitGate denies a new broken link naming file, line and target, and does not offer the index command for it', () => {
  const r = gates.commitGate({ skip: 'only documentation changed', memory: { added: [brokenLink], existing: [] } });
  assert.equal(r.allow, false);
  assert.match(r.reason, /AGENTS\.md:7: broken link to gone\.md/);
  assert.doesNotMatch(r.reason, /memory index/);
});

test('commitGate lets a problem that was already there through, and returns it as a warning', () => {
  const r = gates.commitGate({ skip: 'only documentation changed', memory: { added: [], existing: [oldLink] } });
  assert.equal(r.allow, true);
  assert.deepStrictEqual(r.warnings, [oldLink.text]);
});

test('commitGate denies for the new problem only and does not repeat the old one in the reason', () => {
  const r = gates.commitGate({ skip: 'only documentation changed', memory: { added: [brokenLink], existing: [oldLink] } });
  assert.equal(r.allow, false);
  assert.match(r.reason, /gone\.md/);
  assert.doesNotMatch(r.reason, /old\.md/);
});

test('commitGate checks memory before the experts, so a memory-only commit is not waved through and a new problem is not hidden by G6', () => {
  const r = gates.commitGate(evidence({ recheck: null, memory: { added: [brokenLink], existing: [] } }));
  assert.equal(r.allow, false);
  assert.match(r.reason, /gone\.md/);
});

test('commitGate keeps the old warnings when the experts gate then allows, and still denies on G6 when it must', () => {
  const ok = gates.commitGate(evidence({ memory: { added: [], existing: [oldLink] } }));
  assert.equal(ok.allow, true);
  assert.deepStrictEqual(ok.warnings, [oldLink.text]);
  const no = gates.commitGate(evidence({ recheck: null, memory: { added: [], existing: [oldLink] } }));
  assert.equal(no.allow, false);
  assert.match(no.reason, /Gate G6/);
});

test('commitGate: evidence with no memory part, or an empty one, behaves as before', () => {
  assert.deepStrictEqual(gates.commitGate(evidence()), { allow: true });
  assert.equal(gates.commitGate({ skip: 'nothing to commit', memory: { added: [], existing: [] } }).allow, true);
});
