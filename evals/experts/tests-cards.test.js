'use strict';

// 5.2.0, from one real session (2026-11-16, a plan with seven cards). The tests phase wrote the test plan by test
// file, with each card only named in the text. The unattended run finds a card's tests by a heading that starts with
// the card's name, so it would have parked all seven cards as "missing input". The session asked the user how to
// lay the section out, the user chose to test at the end, and the build went to a general-purpose agent on the
// session model (Opus) and not to the build phase (Sonnet). The same session: `angles` given as a list stopped the
// tests script before any agent ran, and the confirm command was written for Git Bash in a PowerShell terminal.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const TESTS = path.join(PLUGIN, 'phases', 'tests.js');
const EXPERTS = path.join(PLUGIN, 'experts', 'experts.js');
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const CARDS = [{ name: 'check-harness', title: 'the stub harness' }, { name: 'deploy-sh', title: 'deploy.sh keeps a slot' }, { name: '3', title: 'docs' }];
const BY_CARD = '## Tests\n\n### Verification command\n\nnpm test\n\n### check-harness: the stub harness\n\n- t1\n\n### deploy-sh: deploy.sh keeps a slot\n\n- t2\n\n### 3: docs\n\nNo test of its own: documentation only.\n';
const BY_FILE = '## Tests\n\n### Source-level tests\n\n**tests/test_harness.py** (card check-harness)\n\n- t1\n\n**tests/test_deploy_sh.py** (card deploy-sh)\n\n- t2\n';

/** Runs the tests phase with a drafter that returns `md`; `gaps` makes the critics find one, so the merge runs. */
async function phase(args, { md = BY_CARD, merged = md, gaps = false } = {}) {
  const calls = [];
  const out = await loadWorkflow(TESTS)({ plan: 'PLAN-x.md', available: [], skills: {}, ...args }, async (c) => {
    calls.push(c);
    if (c.label === 'draft') return { testsMarkdown: md, testCommand: 'npm test', expectedTestNames: ['t1'] };
    if (c.label === 'merge') return { testsMarkdown: merged, testCommand: 'npm test', expectedTestNames: ['t1'], changesMade: ['x'], gapsDeclined: [] };
    return { verdict: gaps ? 'gaps' : 'solid', gaps: gaps ? [{ what: 'g', wrongImplementation: 'w', suggestedTest: 's', severity: 'high' }] : [] };
  });
  return { ...out, calls, prompt: (label) => (calls.find((c) => c.label === label) || { prompt: '' }).prompt };
}

test('a plan with cards: the drafter is told to write one section for each card, with the exact headings, in order', async () => {
  const r = await phase({ cards: CARDS });
  const p = r.prompt('draft');
  assert.match(p, /The plan has 3 cards/);
  assert.match(p, /### check-harness: the stub harness\n### deploy-sh: deploy\.sh keeps a slot\n### 3: docs/);
  assert.match(p, /A card with no test of its own still gets its heading/);
  assert.equal(r.result.ok, true, JSON.stringify(r.result).slice(0, 300));
  assert.equal(r.result.missingCardSections, undefined, 'every card has its heading');
});

test('a plan with no cards, or one card: no card rule and no note', async () => {
  for (const cards of [undefined, [], [CARDS[0]]]) {
    const r = await phase({ cards }, { md: BY_FILE });
    assert.doesNotMatch(r.prompt('draft'), /The plan has \d+ cards/);
    assert.equal(r.result.missingCardSections, undefined);
  }
});

test('a test plan written by file, with the card only named in the text: the result names the cards with no heading and says what to do', async () => {
  const r = await phase({ cards: CARDS }, { md: BY_FILE });
  assert.deepStrictEqual(r.result.missingCardSections, ['check-harness', 'deploy-sh', '3']);
  assert.match(r.result.cardSectionsNote, /No heading for check-harness, deploy-sh, 3/);
  assert.match(r.result.cardSectionsNote, /move the text, do not rewrite it/);
});

test('a card name is matched whole at the start of a heading, as the run matches it', async () => {
  const md = '## Tests\n\n### 3a: other\n\n- t\n\n### Card check-harness\n\n- t\n\n#### deploy-sh\n\n- t\n';
  const r = await phase({ cards: CARDS }, { md });
  assert.deepStrictEqual(r.result.missingCardSections, ['3'], '"3a" is not card 3; "Card check-harness" and a deeper heading count');
});

test('the merge after the critics keeps the card headings, and the result is checked on the merged text', async () => {
  const r = await phase({ cards: CARDS }, { md: BY_CARD, merged: BY_FILE, gaps: true });
  const p = r.prompt('merge');
  assert.match(p, /### deploy-sh: deploy\.sh keeps a slot/);
  assert.match(p, /Keep these headings as they are/);
  assert.deepStrictEqual(r.result.missingCardSections, ['check-harness', 'deploy-sh', '3'], 'a merge that lost the headings is reported');
});

test('angles as a list or as one comma-separated text both add a critic for each', async () => {
  for (const angles of [['security', 'rollback'], 'security, rollback']) {
    const r = await phase({ angles });
    const labels = r.calls.map((c) => c.label).join(' ');
    assert.match(labels, /security/, `${JSON.stringify(angles)} -> ${labels}`);
    assert.match(labels, /rollback/);
    assert.equal(r.result.ok, true);
  }
});

test('experts.js script reads the cards from the plan for the tests phase, and a caller that gives cards keeps them', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-tcards-')));
  try {
    fs.mkdirSync(path.join(dir, '.ultimate-workflow', 'run'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\n---\n\n# Plan\n\n## Cards\n\n- check-harness: the stub harness\n  paths: tests/**\n- deploy-sh: deploy.sh keeps a slot\n  paths: deploy/**\n  depends: check-harness\n');
    const args = path.join('.ultimate-workflow', 'run', 'tests.args.json');
    const script = () => fs.readFileSync(path.join(dir, '.ultimate-workflow', 'run', 'tests.js'), 'utf8');
    fs.writeFileSync(path.join(dir, args), JSON.stringify({ plan: 'PLAN-x.md', experts: [] }));
    const r = spawnSync(process.execPath, [EXPERTS, 'script', '--phase', 'tests', '--args-file', args], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(script(), /"cards":\s*\[\s*\{\s*"name":\s*"check-harness",\s*"title":\s*"the stub harness"\s*\},\s*\{\s*"name":\s*"deploy-sh"/);
    fs.writeFileSync(path.join(dir, args), JSON.stringify({ plan: 'PLAN-x.md', experts: [], cards: [] }));
    assert.equal(spawnSync(process.execPath, [EXPERTS, 'script', '--phase', 'tests', '--args-file', args], { cwd: dir, encoding: 'utf8' }).status, 0);
    assert.match(script(), /"cards":\s*\[\s*\]/, 'given cards are kept');
    // A plan that cannot be read is no reason to fail here: the phase says so itself.
    fs.writeFileSync(path.join(dir, args), JSON.stringify({ plan: 'PLAN-none.md', experts: [] }));
    assert.equal(spawnSync(process.execPath, [EXPERTS, 'script', '--phase', 'tests', '--args-file', args], { cwd: dir, encoding: 'utf8' }).status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the tests command says what to do with missingCardSections, and never to ask the user for the layout', () => {
  const t = read('commands/tests.md');
  assert.match(t, /If the result has `missingCardSections`/);
  assert.match(t, /Do not ask the user how to lay the section out/);
});

test('the feature and build commands keep the build in the build phase: never a general-purpose agent, never an agent with no model', () => {
  const f = read('commands/feature.md');
  assert.match(f, /\*\*The build is always the build phase\.\*\*/);
  assert.match(f, /Never give the build to a general-purpose agent/);
  assert.match(f, /`uw-implementer` with the model `sonnet`/);
  assert.match(read('commands/build.md'), /\*\*One build for a plan with cards\.\*\*/);
});

test('the three commands say to write the confirm command for the shell of the user: PowerShell on Windows, never a Git Bash path', () => {
  for (const c of ['plan', 'tests', 'feature']) assert.match(read(`commands/${c}.md`), /PowerShell/, c);
  for (const c of ['plan', 'tests']) assert.match(read(`commands/${c}.md`), /never a Git Bash path such as `\/c\/\.\.\.`/, c);
});
