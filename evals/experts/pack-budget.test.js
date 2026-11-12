'use strict';

// Card budget of PLAN-memory-index: a context pack states its size, stays within a budget, lists a
// cited document as a pointer unless the card names it, and ends with what not to load. The pack is
// built by lib/pack.js through `pack` in autopilot.js; these tests drive the real command in a
// scratch git repo, and the run (phases/run.js) against a stub agent.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const REPO = path.join(__dirname, '..', '..');
const PLUGIN = path.join(REPO, '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const RUN = path.join(PLUGIN, 'phases', 'run.js');
const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-budget-')));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const env = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
delete env.NODE_TEST_CONTEXT;
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8', env });
const json = (r) => {
  const line = r.stdout.trim().split(/\r?\n/).pop();
  try {
    return JSON.parse(line);
  } catch {
    throw new Error(`not one JSON line: ${r.stdout} ${r.stderr}`);
  }
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

// ---- a scratch project --------------------------------------------------------------------------

const CARD_SECTIONS = `
### Card 1

Reads \`docs/design.md\` before it starts.

### Card 2

Nothing but the parser.
`;

const planText = ({ front = '', cardSections = true, goal = 'See `docs/design.md`.' } = {}) =>
  `---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test
experts: []
${front}---

# PLAN: calc

## Goal

${goal}

## Decisions

- integers only

## Cards

- 1: adder
  paths: src/add.js, src/more.js
- 2: parser
  paths: src/parse.js
  depends: 1
- 3: shell
  paths: docs/design.md
${cardSections ? CARD_SECTIONS : ''}
## Tests

### 1: adder

- add(1, 2) is 3

### 2: parser

- parse("1+2") is 3

### 3: shell

- the shell runs

## Notes

nothing
`;

const topical = (name, header) => `---\ndescription: ${name}.\nread_when:\n${header}\n---\n\n# ${name}\n\n${'x'.repeat(4000 - 12 - name.length)}\n`;
const TOPICALS = {
  // Names are chosen so that alphabetical order (a2, m1, zk) is not the drop order (zk, m1, a2), and
  // so that dropping keyword-only first with ties alphabetical (zk, a2, m1) is not either.
  'memory/zk.md': topical('zk', '  keywords:\n    - adder'),
  'memory/m1.md': topical('m1', '  paths:\n    - src/add.js'),
  'memory/a2.md': topical('a2', '  paths:\n    - src/**'),
};

function project({ plan = planText(), design = '# Design\n\nbody\n', topicals = false, agents = '# Agent conventions\n' } = {}) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 'src/add.js', 'module.exports = 1;\n');
  write(dir, 'docs/design.md', design);
  write(dir, 'AGENTS.md', agents);
  write(dir, 'CLAUDE.md', '@AGENTS.md\n');
  write(dir, 'PLAN-calc.md', /tests_confirmed: true/.test(plan) ? expertsLib.setFrontLine(plan, 'confirmed_hash', expertsLib.confirmHash(plan)) : plan);
  if (topicals) {
    write(dir, 'memory.md', '# Memory\n');
    for (const [f, text] of Object.entries(TOPICALS)) write(dir, f, text);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

const pack = (dir, card) => {
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', card, '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  return { r, text: read(dir, r.contextFile) };
};
const entry = (text, start) => text.split('\n').find((l) => l.startsWith(`- ${start}`));
const BIG = `# Design\n\n${'y'.repeat(40000)}\n`; // 10,000 tokens
const POINTER = /cited by the plan, read only if your work touches it/;

// ---- size ---------------------------------------------------------------------------------------

test('the size counts characters divided by 4 over the listed line ranges only', () => {
  const dir = project({ plan: planText({ cardSections: false }) });
  const { r, text } = pack(dir, '1');
  const plan = read(dir, 'PLAN-calc.md').split('\n');
  let chars = 0;
  for (const m of text.matchAll(/^- PLAN-calc\.md lines (\d+)-(\d+)/gm)) chars += plan.slice(Number(m[1]) - 1, Number(m[2])).join('\n').length;
  chars += read(dir, 'docs/design.md').length;
  // A newline or rounding convention may move each entry by a token; a whole-file count could not.
  assert.ok(Math.abs(r.tokens - chars / 4) <= 8, `tokens ${r.tokens}, listed ranges and documents hold ${chars / 4}`);
  assert.ok(r.tokens < read(dir, 'PLAN-calc.md').length / 4 + read(dir, 'docs/design.md').length / 4, 'the part of the plan outside the ranges is not counted');
  assert.match(text, new RegExp(`Pack size: about ${r.tokens} tokens \\(budget 15000\\)`));
});

test('a card\'s own section lies inside the Cards range: no plan line is listed twice, so none is counted twice', () => {
  const dir = project();
  const { text } = pack(dir, '1');
  const ranges = [...text.matchAll(/^- PLAN-calc\.md lines (\d+)-(\d+)/gm)].map((m) => [Number(m[1]), Number(m[2])]);
  const planLines = read(dir, 'PLAN-calc.md').split('\n');
  const own = planLines.findIndex((l) => l === '### Card 1') + 1;
  assert.ok(own > 0);
  const listing = ranges.filter(([a, b]) => a <= own && own <= b);
  assert.equal(listing.length, 1, `the line "### Card 1" is in ${listing.length} listed ranges: ${JSON.stringify(ranges)}`);
  for (const [i, [a, b]] of ranges.entries()) for (const [c, d] of ranges.slice(i + 1)) assert.ok(b < c || d < a, `ranges ${a}-${b} and ${c}-${d} overlap`);
});

test('under the budget nothing is dropped, and the result says so', () => {
  const dir = project({ topicals: true });
  const { r, text } = pack(dir, '1');
  assert.equal(r.budget, 15000);
  assert.equal(r.overBudget, false);
  assert.deepStrictEqual(r.dropped, []);
  assert.doesNotMatch(text, /not loaded \(budget\)/);
  for (const f of Object.keys(TOPICALS)) assert.ok(entry(text, f), `${f} is listed`);
});

// ---- one entry per file, AGENTS.md and CLAUDE.md --------------------------------------------------

test('a file listed for two reasons appears once, with both reasons', () => {
  const dir = project({ plan: planText({ goal: 'See `AGENTS.md`.' }) });
  const { text } = pack(dir, '2');
  const lines = text.split('\n').filter((l) => l.startsWith('- AGENTS.md'));
  assert.equal(lines.length, 1, lines.join('\n'));
  assert.match(lines[0], /Agent conventions/, 'the reason it was cited');
  assert.match(lines[0], /project rules/, 'the reason it is the project rules');
});

test('AGENTS.md and CLAUDE.md are read only if not already in context, and their size is not counted', () => {
  const small = pack(project(), '2');
  const large = pack(project({ agents: `# Agent conventions\n\n${'z'.repeat(40000)}\n` }), '2');
  for (const f of ['AGENTS.md', 'CLAUDE.md']) assert.match(entry(large.text, f), /read only if not already in your context/, f);
  assert.equal(large.r.tokens, small.r.tokens, 'a 10,000 token AGENTS.md changes nothing');
});

// ---- cited documents: required or pointer ---------------------------------------------------------

test('a cited document is required for the card whose section names it and a pointer for the others', () => {
  const dir = project({ design: BIG });
  const named = pack(dir, '1');
  const other = pack(dir, '2');
  assert.doesNotMatch(entry(named.text, 'docs/design.md'), POINTER);
  assert.ok(named.r.tokens >= 10000, `required and counted: ${named.r.tokens}`);
  const pointer = entry(other.text, 'docs/design.md');
  assert.match(pointer, POINTER);
  assert.match(pointer, /Design/, 'the pointer carries the summary');
  assert.ok(other.r.tokens < 3000, `a pointer is not counted: ${other.r.tokens}`);
});

test('a cited document the card\'s paths name is required', () => {
  const dir = project({ design: BIG });
  const { r, text } = pack(dir, '3');
  assert.doesNotMatch(entry(text, 'docs/design.md'), POINTER);
  assert.ok(r.tokens >= 10000, `counted: ${r.tokens}`);
});

test('a plan with no per-card section keeps every cited document required for every card', () => {
  const dir = project({ plan: planText({ cardSections: false }), design: BIG });
  for (const card of ['1', '2']) {
    const { r, text } = pack(dir, card);
    assert.doesNotMatch(entry(text, 'docs/design.md'), POINTER, `card ${card}`);
    assert.ok(r.tokens >= 10000, `card ${card}: ${r.tokens}`);
  }
});

// ---- the budget and the drop order -----------------------------------------------------------------

test('over budget only topicals are dropped: keyword-only first, then the path match with the fewest matches', () => {
  const required = pack(project(), '1').r.tokens; // no topicals
  const withBudget = (extra) => {
    const dir = project({ plan: planText({ front: `pack_budget: ${required + extra}\n` }), topicals: true });
    return pack(dir, '1');
  };
  // Each topical is about 1,000 tokens; a2 matches both of the card's paths, m1 one, zk only a keyword.
  const room2 = withBudget(2100);
  assert.deepStrictEqual(room2.r.dropped, ['memory/zk.md']);
  assert.match(room2.text, /not loaded \(budget\).*memory\/zk\.md|memory\/zk\.md.*not loaded \(budget\)/);
  assert.ok(entry(room2.text, 'memory/m1.md') && entry(room2.text, 'memory/a2.md'));
  const room1 = withBudget(1100);
  assert.deepStrictEqual(room1.r.dropped, ['memory/zk.md', 'memory/m1.md']);
  assert.ok(entry(room1.text, 'memory/a2.md'));
  const room0 = withBudget(300);
  assert.deepStrictEqual(room0.r.dropped, ['memory/zk.md', 'memory/m1.md', 'memory/a2.md']);
  assert.equal(room0.r.overBudget, false, 'the required entries fit');
  assert.ok(room0.r.tokens <= required + 300);
  assert.equal(room0.r.budget, required + 300);
});

test('required entries alone over budget: ok, overBudget, and nothing but topicals is dropped', () => {
  const dir = project({ plan: planText({ front: 'pack_budget: 10\n' }), design: BIG, topicals: true });
  write(dir, '.ultimate-workflow/run/calc/cards/1/handoff.md', '# Handoff\n');
  write(dir, '.ultimate-workflow/run/calc/journal.md', '# Journal\n');
  const { r, text } = pack(dir, '2');
  assert.equal(r.overBudget, true);
  assert.equal(r.budget, 10);
  assert.ok(r.dropped.length > 0 && r.dropped.every((f) => f.startsWith('memory/')), JSON.stringify(r.dropped));
  for (const kept of ['PLAN-calc.md lines', '.ultimate-workflow/run/calc/cards/1/handoff.md', '.ultimate-workflow/run/calc/journal.md', 'docs/design.md']) assert.ok(entry(text, kept), `${kept} stays`);
  assert.match(text, /this card's tests/);
  assert.match(entry(text, 'docs/design.md'), POINTER, 'a pointer is never dropped');
});

test('pack_budget in the front matter sets the budget; a non-number is ignored with a warning', () => {
  const set = pack(project({ plan: planText({ front: 'pack_budget: 4000\n' }) }), '1');
  assert.equal(set.r.budget, 4000);
  assert.match(set.text, /\(budget 4000\)/);
  const bad = pack(project({ plan: planText({ front: 'pack_budget: plenty\n' }) }), '1');
  assert.equal(bad.r.budget, 15000);
  assert.ok((bad.r.warnings || []).some((w) => /pack_budget/.test(w)), JSON.stringify(bad.r.warnings));
});

// ---- the do-not-load list ----------------------------------------------------------------------------

test('every pack ends with the do-not-load list', () => {
  for (const card of ['1', '2']) {
    const { text } = pack(project(), card);
    const at = text.search(/do not load/i);
    assert.ok(at > text.lastIndexOf('\n- '), 'after the last entry');
    const tail = text.slice(at);
    assert.match(tail, /other cards/i);
    assert.match(tail, /other PLAN-\*\.md/);
    assert.match(tail, /outside the (listed )?line ranges/i);
    assert.doesNotMatch(text.slice(at + 20), /\n- \.ultimate-workflow\/run\/calc\/journal\.md/, 'the list comes last');
  }
});

// ---- this plan, measured ---------------------------------------------------------------------------

test('on this plan no card but docs carries the workflow skill as required, and every pack is under the plan pack_budget (25,000) and under the 22,500 measured before, docs excepted from the second', () => {
  const feature = 'pack-budget-measure';
  const planFile = 'internal/plans/PLAN-memory-index.md';
  const names = ['index', 'links', 'match', 'budget', 'harvest', 'gate', 'docs'];
  const parsed = require(path.join(PLUGIN, 'experts', 'cards.js')).parseCards(fs.readFileSync(path.join(REPO, planFile), 'utf8')).map((c) => c.name);
  for (const name of names) assert.ok(parsed.includes(name), `${name} in ${parsed.join(',')}`);
  try {
    for (const name of names) {
      const r = json(cli(REPO, 'pack', '--plan', planFile, '--card', name, '--feature', feature));
      assert.equal(r.ok, true, `${name}: ${JSON.stringify(r)}`);
      assert.equal(r.budget, 25000, `${name}: the plan sets pack_budget`);
      assert.ok(r.tokens < 25000, `${name}: ${r.tokens}`);
      assert.equal(r.overBudget, false, `${name}`);
      if (name !== 'docs') assert.ok(r.tokens < 22500, `${name}: ${r.tokens}`);
      if (name === 'docs') continue;
      const skill = entry(read(REPO, r.contextFile), '.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/SKILL.md');
      assert.match(skill, POINTER, `${name}: the workflow skill is a pointer`);
    }
  } finally {
    fs.rmSync(path.join(REPO, '.ultimate-workflow', 'run', feature), { recursive: true, force: true });
  }
});

// ---- the run: one notice, and the report ---------------------------------------------------------------

const card = (name, extra = {}) => ({ name, title: `card ${name}`, paths: [`src/${name}/**`], depends: [], carried: [], experts: ['quality'], briefs: [], reviewSkills: {}, preflight: { ok: true, contextFile: `.ultimate-workflow/run/f/cards/${name}/context.md` }, ...extra });
const args = (cards) => ({ plan: 'PLAN-f.md', feature: 'f', cli: 'node "/p/experts/experts.js"', base: 'abc1234', verify: 'node "/p/hooks/verify.js" --plan "PLAN-f.md"', command: 'npm test', available: [{ name: 'quality', agent: 'uw-expert-quality', description: 'tests', stages: ['plan', 'tests', 'review'] }], expertsDir: '/p/experts', protocol: 'rules', cards, });
const steps = (...lines) => ({ outputs: lines.map((l) => ({ command: '', output: typeof l === 'string' ? l : JSON.stringify(l) })) });

// A healthy run of every role; each call is recorded.
function agent(calls) {
  return async (call) => {
    calls.push(call);
    const [who, role] = String(call.label).includes(':') ? call.label.split(':') : [call.label, ''];
    if (role === 'write-tests') return { filesWritten: [`test/${who}.test.js`], testsFailAsExpected: true, summary: 'red' };
    if (/^attempt-/.test(role)) return { green: true, fullSuiteGreen: true, filesChanged: [`src/${who}/x.js`], summary: 'done' };
    if (role === 'prepare') return steps({ card: who, outOfScope: [] }, { ok: true });
    if (role === 'recheck') return { experts: [] };
    if (role === 'quality' && who !== 'review') return { lensVerdict: 'ok', findings: [], stillPresent: [] };
    if (role === 'refute' && who !== 'review') return { verdicts: [] };
    if (role === 'commit') {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(call.prompt)[1]).expertLane;
      return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] }, { ok: true, card: who, commit: `c-${who}`, files: 1, handoff: 'h', missingClaims: [] });
    }
    if (role === 'decisions') return steps({ ok: true, card: who, major: [], minor: [] });
    if (role === 'start') return steps(...String(call.prompt).split('\n').filter((l) => /card-status/.test(l)).map(() => ({ ok: true })));
    if (role === 'journal' || role === 'carry') return steps({ ok: true });
    if (who === 'settle') return steps({ ok: true, head: 'head1', reviewedHead: '', harvestBranch: '' });
    if (who === 'review') return { lensVerdict: 'ok', findings: [] };
    if (call.label === 'harvest') return { proposals: [], discarded: [] };
    if (role === 'branch') return steps({ ok: true, branch: 'uw/harvest/f', commits: [] });
    if (/ notify /.test(call.prompt)) return steps({ ok: true, desktop: 'sent' });
    throw new Error(`unexpected agent ${call.label}`);
  };
}
const run = (a, respond) => loadWorkflow(RUN)(a, respond);
const budgetNotices = (calls) => calls.filter((c) => /--kind over-budget/.test(c.prompt));

test('a card whose required entries alone are over budget sends one notice naming the card and the size, and goes on', async () => {
  const calls = [];
  const over = { ok: true, contextFile: '.ultimate-workflow/run/f/cards/1/context.md', tokens: 16000, budget: 15000, overBudget: true };
  const { result } = await run(args([card('1', { preflight: over }), card('2')]), agent(calls));
  const notices = budgetNotices(calls);
  assert.equal(notices.length, 1, notices.map((c) => c.label).join(','));
  assert.match(notices[0].prompt, /--card 1\b/);
  assert.match(notices[0].prompt, /16000/);
  const by = Object.fromEntries(result.cards.map((c) => [c.card, c]));
  assert.equal(by['1'].status, 'committed', 'no park for the size');
  assert.equal(by['2'].status, 'committed');
});

test('a card within budget sends no notice, and each card entry carries its pack size', async () => {
  const calls = [];
  const fine = { ok: true, contextFile: '.ultimate-workflow/run/f/cards/1/context.md', tokens: 9000, budget: 15000, overBudget: false };
  const { result } = await run(args([card('1', { preflight: fine })]), agent(calls));
  assert.equal(budgetNotices(calls).length, 0);
  assert.deepStrictEqual(result.cards[0].pack, { tokens: 9000, budget: 15000 });
});

test('run-report shows the pack size for each card', () => {
  const dir = tmp();
  const result = { ok: true, feature: 'f', branch: 'uw/run/f', base: 'abc1234abcd', summary: '2 committed', counts: { committed: 2 }, cards: [
    { card: '1', title: 'first', status: 'committed', commit: 'c1', pack: { tokens: 9123, budget: 15000 } },
    { card: '2', title: 'second', status: 'committed', commit: 'c2', pack: { tokens: 17456, budget: 15000 } },
  ], review: { ran: false }, harvest: { ran: false } };
  write(dir, 'result.json', JSON.stringify(result));
  const r = json(cli(dir, 'run-report', '--result', 'result.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const report = read(dir, r.report);
  assert.match(report.split('\n').find((l) => /^\| 1 \|/.test(l)), /9123/);
  assert.match(report.split('\n').find((l) => /^\| 2 \|/.test(l)), /17456/);
});
