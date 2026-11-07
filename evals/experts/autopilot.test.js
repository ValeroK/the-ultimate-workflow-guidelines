'use strict';

// PLAN-autopilot.md, W2 to W4 (4.7.0). The autopilot run builds every card in one background workflow.
// A workflow script cannot read a file or run git, so each card step that touches either is one
// command: `pack` writes the card's context pack and fails the preflight on missing input, `handoff`
// says from git what a card left behind, `park` moves a card that cannot be finished onto a branch
// and resets, `journal` passes lessons to later cards, and `card-commit` commits only what the
// commit gates would let through. Every one prints a single JSON line with a boolean `ok`, because
// the S0 spike showed a workflow agent never sees the exit code.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const cards = require(path.join(PLUGIN, 'experts', 'cards.js'));
const autopilot = require(path.join(PLUGIN, 'experts', 'autopilot.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-auto-')));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const env = { ...process.env, ULTIMATE_WORKFLOW_GATES: '' };
// A child `node --test` (the test_command verify.js runs) reports to this runner when it inherits this.
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

const PLAN = `---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test "test/**/*.test.js"
experts: []
---

# PLAN: calc

## Goal

A calculator. See \`docs/design.md\` and \`docs/new-guide.md\`.

## Decisions

- integers only

## Cards

- 1: adder
  paths: src/add.js, docs/new-guide.md
- 2: parser
  paths: src/parse.js
  depends: 1
- 3: docs
  paths: README.md

## Tests

### 1: adder

- add(1, 2) is 3

### 2: parser

- parse("1+2") is 3

## Notes

nothing
`;

function repo({ plan = PLAN } = {}) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b;\n');
  write(dir, 'test/add.test.js', "const test = require('node:test'); const assert = require('node:assert');\ntest('add', () => assert.strictEqual(require('../src/add.js')(1, 2), 3));\n");
  write(dir, 'docs/design.md', '# Design of the calculator\n\nbody\n');
  write(dir, 'PLAN-calc.md', plan);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

// --- cards: depends, parked, committed -------------------------------------------------------

test('a card reads its depends, parked and committed fields', () => {
  const text = PLAN.replace('  depends: 1\n', '  depends: 1, 0a\n  parked: uw/parked/calc/2; verification failed 3 times\n  committed: abc123\n');
  const c = cards.findCard(text, '2');
  assert.deepStrictEqual(c.depends, ['1', '0a']);
  assert.deepStrictEqual(c.parked, { branch: 'uw/parked/calc/2', reason: 'verification failed 3 times' });
  assert.equal(c.committed, 'abc123');
  assert.equal(cards.findCard(text, '1').depends, undefined, 'no field is not an empty list');
});

test('setField replaces, removes and appends in the plan\'s own line endings, and refuses an unknown card', () => {
  let text = cards.setField(PLAN, '2', 'parked', 'uw/parked/calc/2; red');
  assert.deepStrictEqual(cards.findCard(text, '2').parked, { branch: 'uw/parked/calc/2', reason: 'red' });
  text = cards.setField(text, '2', 'parked', 'uw/parked/calc/2; red again');
  assert.equal((text.match(/parked:/g) || []).length, 1, 'replaced, not added twice');
  text = cards.setField(text, '2', 'parked', null);
  assert.equal(cards.findCard(text, '2').parked, undefined);
  text = cards.setField(text, '3', 'carried', 'fix the typo in README.md:4');
  text = cards.setField(text, '3', 'carried', 'second; fix the typo in README.md:4');
  assert.deepStrictEqual(cards.findCard(text, '3').carried, ['fix the typo in README.md:4', 'second']);
  assert.equal(cards.findCard(text, '3').paths[0], 'README.md', 'the other fields are untouched');
  const crlf = cards.setField(PLAN.replace(/\n/g, '\r\n'), '1', 'committed', 'abc');
  assert.ok(!/[^\r]\n/.test(crlf), 'no bare LF in a CRLF plan');
  assert.throws(() => cards.setField(PLAN, '9', 'committed', 'x'), /no card "9"/);
  assert.throws(() => cards.setField(PLAN, '1', 'paths', 'x'), /one of/);
});

test('card-add takes --depends and refuses a card that depends on itself', () => {
  const dir = repo();
  const r = cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', '4', '--title', 'sub', '--paths', 'src/sub.js', '--depends', '1, 2');
  assert.equal(r.status, 0, r.stderr);
  assert.deepStrictEqual(cards.findCard(read(dir, 'PLAN-calc.md'), '4').depends, ['1', '2']);
  const self = cli(dir, 'card-add', '--plan', 'PLAN-calc.md', '--name', '5', '--title', 'x', '--paths', 'x.js', '--depends', '5');
  assert.equal(self.status, 2);
  assert.match(self.stderr, /cannot depend/);
});

// --- pack ------------------------------------------------------------------------------------

test('pack lists the shared plan sections, the card, its tests, cited docs, the rules and the dependency handoffs', () => {
  const dir = repo();
  write(dir, 'AGENTS.md', '# Rules\n');
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '2', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.contextFile, '.ultimate-workflow/run/calc/cards/2/context.md');
  const text = read(dir, r.contextFile);
  const listed = text.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.replace(/:.*$/, ''));
  assert.deepStrictEqual(listed, [
    '- PLAN-calc.md lines 11-14',
    '- PLAN-calc.md lines 15-18',
    '- PLAN-calc.md lines 19-28',
    '- PLAN-calc.md lines 35-38',
    '- docs/design.md',
    '- AGENTS.md',
    '- .ultimate-workflow/run/calc/cards/1/handoff.md (if present)',
    '- .ultimate-workflow/run/calc/journal.md (if present)',
  ]);
  assert.match(text, /docs\/design\.md: Design of the calculator/);
  assert.match(text, /this card's tests: 2: parser/);
  assert.match(text, /Files this card may change: src\/parse\.js/);
  assert.doesNotMatch(text, /new-guide/, 'a doc a card is to write is neither read nor missing');
});

test('pack fails the preflight on a cited document that does not exist, and says which', () => {
  const dir = repo({ plan: PLAN.replace('`docs/design.md`', '`docs/gone.md`') });
  const res = cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc');
  const r = json(res);
  assert.equal(r.ok, false);
  assert.equal(res.status, 1);
  assert.match(r.reason, /^missing input: .*docs\/gone\.md, which does not exist/);
  assert.ok(fs.existsSync(path.join(dir, r.contextFile)), 'the pack is still written, for the parked card');
});

test('pack fails the preflight on a card with no test-plan section', () => {
  const dir = repo();
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '3', '--feature', 'calc'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /no test-plan section for card 3/);
});

test('pack: one card and no subheadings uses the whole Tests section; --resume needs a parked diagnosis', () => {
  const one = PLAN.replace(/- 2: parser[\s\S]*?README\.md\n/, '').replace(/### 1: adder\n\n/, '').replace(/### 2: parser\n\n- parse\("1\+2"\) is 3\n\n/, '');
  const dir = repo({ plan: one });
  assert.equal(json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc')).ok, true);
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--resume'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /has no parked\.md/);
});

test('pack lists the memory topicals whose Read-when cue matches the card, chosen in code', () => {
  const dir = repo();
  write(dir, 'memory.md', [
    '# Memory',
    '- [memory/parsing.md](memory/parsing.md) - how input is read. **Read when** touching `src/parse.js` or the tokenizer.',
    '- [memory/deploy.md](memory/deploy.md) - releases. **Read when** `deploy/**`, a release.',
    '- [memory/adders.md](memory/adders.md) - arithmetic. **Read when** changing the adder module.',
    '',
  ].join('\n'));
  for (const f of ['parsing', 'deploy', 'adders']) write(dir, `memory/${f}.md`, `# ${f}\n`);
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, cards.findCard(PLAN, '2')), ['memory/parsing.md']);
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, cards.findCard(PLAN, '1')), ['memory/adders.md']);
});

test('pack refuses a feature name that cannot be a branch or a folder', () => {
  const dir = repo();
  const r = json(cli(dir, 'pack', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', '../x'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /--feature/);
});

// --- handoff ---------------------------------------------------------------------------------

test('handoff says from git what changed and what is exported, and names a claimed test file the diff does not have', () => {
  const dir = repo();
  const base = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/parse.js', 'function parse(s) { return 3; }\nmodule.exports = { parse };\nexport function tokens() {}\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'parse');
  const r = json(cli(dir, 'handoff', '--card', '2', '--feature', 'calc', '--range', `${base}..HEAD`, '--claimed', 'test/parse.test.js, src/parse.js'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.missingClaims, ['test/parse.test.js']);
  const text = read(dir, r.handoff);
  assert.match(text, /- added src\/parse\.js: exports tokens/);
  assert.match(text, /Claimed by the build but not in the diff: test\/parse\.test\.js/);
});

// --- park and unpark -------------------------------------------------------------------------

test('park commits the card\'s work, failing tests and new files included, to its branch, resets, and records it in the plan', () => {
  const dir = repo();
  const head = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a - b;\n');
  write(dir, 'test/sub.test.js', "require('node:test')('sub', () => { throw new Error('red'); });\n");
  write(dir, '.ultimate-workflow/run/calc/journal.md', '# journal\n');
  const planBefore = read(dir, 'PLAN-calc.md').replace('phase: build', 'phase: build\nverify_rounds: 3');
  write(dir, 'PLAN-calc.md', planBefore);
  write(dir, 'why.txt', 'Verification failed 3 times; the subtraction test cannot pass.\nSignature: sub-red');
  const r = json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason-file', 'why.txt'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.branch, 'uw/parked/calc/1');
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head, 'the working branch is back at the last good commit');
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a + b;\n');
  assert.ok(!fs.existsSync(path.join(dir, 'test/sub.test.js')), 'the new test file is gone from the tree');
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow/run/calc/journal.md')), 'the run folder is untouched');
  const files = git(dir, 'show', '--name-only', '--format=', 'uw/parked/calc/1').split('\n');
  assert.deepStrictEqual(files.sort(), ['src/add.js', 'test/sub.test.js', 'why.txt'].sort());
  assert.match(git(dir, 'log', '-1', '--format=%B', 'uw/parked/calc/1'), /sub-red/);
  assert.equal(git(dir, 'rev-parse', 'uw/parked/calc/1^'), head);
  const plan = read(dir, 'PLAN-calc.md');
  assert.match(plan, /verify_rounds: 3/, 'the plan is kept as it was, not reset to its committed version');
  assert.deepStrictEqual(cards.findCard(plan, '1').parked, { branch: 'uw/parked/calc/1', reason: 'Verification failed 3 times, the subtraction test cannot pass.' });
  assert.match(read(dir, r.parked), /Signature: sub-red/);
  assert.equal(git(dir, 'status', '--porcelain', '--', 'src', 'test'), '');
});

test('park needs a reason; unpark brings the work back onto the tip and clears the field', () => {
  const dir = repo();
  write(dir, 'src/add.js', 'module.exports = (a, b) => a - b;\n');
  write(dir, 'test/sub.test.js', "require('node:test')('sub', () => {});\n");
  assert.equal(json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc')).ok, false);
  assert.equal(json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'red three times')).ok, true);
  // Another card lands on the tip meanwhile.
  write(dir, 'README.md', '# calc\n');
  git(dir, 'add', 'README.md');
  git(dir, 'commit', '-q', '-m', 'card 3');
  const r = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.testFiles, ['test/sub.test.js']);
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a - b;\n');
  assert.ok(fs.existsSync(path.join(dir, 'README.md')));
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').parked, undefined);
  assert.equal(git(dir, 'diff', '--cached', '--name-only'), '', 'nothing is staged');
});

test('unpark refuses a dirty tree and a work that no longer applies, and leaves the tree as it was', () => {
  const dir = repo();
  write(dir, 'src/add.js', 'module.exports = (a, b) => a - b;\n');
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'red three times'));
  write(dir, 'src/add.js', 'module.exports = (a, b) => a * b;\n');
  const dirty = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(dirty.ok, false);
  assert.match(dirty.reason, /uncommitted changes/);
  git(dir, 'commit', '-q', '-am', 'someone else changed the same line');
  const conflict = json(cli(dir, 'unpark', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(conflict.ok, false);
  assert.match(conflict.reason, /does not apply/);
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a * b;\n');
  assert.ok(cards.findCard(read(dir, 'PLAN-calc.md'), '1').parked, 'still parked');
});

// --- journal ---------------------------------------------------------------------------------

test('journal add appends a card\'s lines, refuses more than 15, and refuses an empty entry', () => {
  const dir = repo();
  write(dir, 'j1.txt', 'node:test needs the quoted glob\n- parse returns numbers, not strings\n');
  const r = json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', '1', '--from', 'j1.txt', '--status', 'committed'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const text = read(dir, '.ultimate-workflow/run/calc/journal.md');
  assert.match(text, /^## 1 \(committed\) \d{4}-\d\d-\d\dT\d\d:\d\d$/m);
  assert.match(text, /^- node:test needs the quoted glob$/m);
  write(dir, 'long.txt', Array.from({ length: 16 }, (_, i) => `line ${i}`).join('\n'));
  const long = json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', '2', '--from', 'long.txt'));
  assert.equal(long.ok, false);
  assert.match(long.reason, /16 lines.*at most 15/);
  write(dir, 'empty.txt', '\n\n');
  assert.equal(json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', '2', '--from', 'empty.txt')).ok, false);
  assert.doesNotMatch(read(dir, '.ultimate-workflow/run/calc/journal.md'), /line 0|## 2/, 'a refused entry adds nothing');
});

test('past 200 lines the journal names its oldest entries, and compact summarises one without dropping it', () => {
  const dir = repo();
  write(dir, 'j.txt', Array.from({ length: 15 }, (_, i) => `lesson ${i}`).join('\n'));
  let last;
  for (let i = 1; i <= 12; i++) last = json(cli(dir, 'journal', 'add', '--feature', 'calc', '--card', `c${i}`, '--from', 'j.txt'));
  assert.equal(last.overLimit, true);
  assert.equal(last.oldest[0], 'c1');
  write(dir, 's.txt', 'c1 found the quoted glob and the CRLF trap\n');
  const c = json(cli(dir, 'journal', 'compact', '--feature', 'calc', '--card', 'c1', '--from', 's.txt'));
  assert.equal(c.ok, true, JSON.stringify(c));
  const text = read(dir, '.ultimate-workflow/run/calc/journal.md');
  assert.match(text, /^## c1 .*\(summarised\)$/m);
  assert.match(text, /^- c1 found the quoted glob/m);
  assert.doesNotMatch(text.split('## c2')[0], /lesson 3/, 'the long entry was replaced');
  assert.match(text, /## c12/);
  write(dir, 'too.txt', 'a\nb\nc\nd\n');
  assert.equal(json(cli(dir, 'journal', 'compact', '--feature', 'calc', '--card', 'c2', '--from', 'too.txt')).ok, false);
});

// --- run branch, card-commit ---------------------------------------------------------------------

test('run-branch creates uw/run/<feature> from the tip, reuses it, and refuses a stale one', () => {
  const dir = repo();
  const r = json(cli(dir, 'run-branch', '--feature', 'calc'));
  assert.equal(r.ok, true);
  assert.equal(r.created, true);
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'uw/run/calc');
  assert.equal(json(cli(dir, 'run-branch', '--feature', 'calc')).created, false);
  git(dir, 'switch', '-q', 'main');
  const stale = json(cli(dir, 'run-branch', '--feature', 'calc'));
  assert.equal(stale.ok, false);
  assert.match(stale.reason, /already exists/);
});

const LANE = JSON.stringify({ ok: true, expertLane: { stage: 'review', selected: [], ran: [], recheck: true, findings: [] } });

test('card-commit refuses off the run branch and without a passing full run, then commits the card and nothing else', () => {
  const dir = repo();
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b; // checked\n');
  const off = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(off.ok, false);
  assert.match(off.reason, /only on uw\/run\/calc/);
  json(cli(dir, 'run-branch', '--feature', 'calc'));
  const noRun = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(noRun.ok, false);
  assert.equal(noRun.gate, 'G7');
  const v = spawnSync(process.execPath, [VERIFY, '--full', '--plan', 'PLAN-calc.md'], { cwd: dir, encoding: 'utf8', env });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  const noExperts = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(noExperts.ok, false);
  assert.equal(noExperts.gate, 'G6');
  cli(dir, 'prepare', '--range', 'working');
  write(dir, '.ultimate-workflow/run/lane.json', LANE);
  assert.equal(cli(dir, 'record', '--stage', 'review', '--plan', 'PLAN-calc.md', '--result', '.ultimate-workflow/run/lane.json').status, 0);
  write(dir, 'src/new.js', 'module.exports = 1;\n');
  const moved = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc'));
  assert.equal(moved.ok, false, 'a file added after the checks moves the fingerprint');
  fs.rmSync(path.join(dir, 'src/new.js'));
  const r = json(cli(dir, 'card-commit', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--claimed', 'test/add.test.js'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/add.js']);
  assert.match(git(dir, 'log', '-1', '--format=%B'), /^card 1: adder\n\nPlan: PLAN-calc\.md\nRun: uw\/run\/calc/);
  assert.equal(cards.findCard(read(dir, 'PLAN-calc.md'), '1').committed, r.commit);
  assert.deepStrictEqual(r.missingClaims, ['test/add.test.js']);
  assert.ok(fs.existsSync(path.join(dir, r.handoff)));
});

test('ensure-ignored adds .ultimate-workflow/ to .gitignore once, keeping the file\'s line endings', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\r\ndist/');
  assert.equal(json(cli(dir, 'ensure-ignored')).added, true);
  assert.equal(json(cli(dir, 'ensure-ignored')).added, false);
  const text = read(dir, '.gitignore');
  assert.match(text, /^dist\/\r\n# ultimate-workflow.*\r\n\.ultimate-workflow\/\r\n$/m);
});

// --- harvest to a branch (W5) ------------------------------------------------------------------

test('harvest-branch commits each destination file once on uw/harvest/<feature>, without touching the working tree', () => {
  const dir = repo();
  write(dir, 'AGENTS.md', '# Rules\n\n## Gotchas\n\n- Old one.\n\n## Other\n\ntext\n');
  git(dir, 'add', 'AGENTS.md');
  git(dir, 'commit', '-q', '-m', 'agents');
  const head = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'src/add.js', 'module.exports = (a, b) => a + b; // wip\n');
  write(dir, '.ultimate-workflow/run/calc/harvest.json', JSON.stringify([
    { destination: 'gotcha', path: 'AGENTS.md', text: '- Beware the quoted glob.', source: 'card 1', rationale: 'hit twice' },
    { destination: 'memory', path: 'memory/parsing.md', text: '# Parsing\n\nHow it works.', source: 'card 2', rationale: 'explains' },
    { destination: 'gotcha', path: 'AGENTS.md', text: '- Note that CRLF matters.', source: 'card 2', rationale: 'r' },
  ]));
  const r = json(cli(dir, 'harvest-branch', '--feature', 'calc', '--from', '.ultimate-workflow/run/calc/harvest.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.branch, 'uw/harvest/calc');
  assert.deepStrictEqual(r.commits.map((c) => [c.file, c.proposals]), [['AGENTS.md', 2], ['memory/parsing.md', 1]]);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head, 'the working branch did not move');
  assert.equal(git(dir, 'rev-parse', 'uw/harvest/calc~2'), head, 'the branch starts at the tip');
  assert.equal(read(dir, 'src/add.js'), 'module.exports = (a, b) => a + b; // wip\n', 'uncommitted work is untouched');
  assert.ok(!fs.existsSync(path.join(dir, 'memory/parsing.md')), 'nothing is written into the working tree');
  const agents = git(dir, 'show', 'uw/harvest/calc:AGENTS.md');
  assert.match(agents, /- Old one\.\n- Beware the quoted glob\.\n- Note that CRLF matters\.\n\n## Other/, 'gotchas go under the Gotchas heading');
  const again = json(cli(dir, 'harvest-branch', '--feature', 'calc', '--from', '.ultimate-workflow/run/calc/harvest.json'));
  assert.equal(again.ok, false);
  assert.match(again.reason, /already exists/);
  write(dir, 'bad.json', JSON.stringify([{ destination: 'gotcha', path: '../out.md', text: 'x' }]));
  assert.equal(json(cli(dir, 'harvest-branch', '--feature', 'other', '--from', 'bad.json')).ok, false);
});

// --- script --phase run (W1) -------------------------------------------------------------------

test('script --phase run writes in every card with its preflight, briefs and skills by name, the base and the commands', () => {
  const dir = repo();
  write(dir, '.ultimate-workflow/run/run.args.json', JSON.stringify({ plan: 'PLAN-calc.md', feature: 'calc' }));
  const r = cli(dir, 'script', '--phase', 'run', '--args-file', '.ultimate-workflow/run/run.args.json');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const text = read(dir, '.ultimate-workflow/run/run.js');
  const embedded = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(text)[1]);
  assert.deepStrictEqual(embedded.cards.map((c) => [c.name, c.preflight.ok]), [['1', true], ['2', true], ['3', false]]);
  assert.match(embedded.cards[2].preflight.reason, /no test-plan section for card 3/);
  assert.deepStrictEqual(embedded.cards[1].depends, ['1']);
  assert.equal(embedded.base, git(dir, 'rev-parse', 'HEAD'));
  assert.match(embedded.cli, /^node ".*\/experts\/experts\.js"$/);
  assert.ok(!embedded.cli.includes(String.fromCharCode(92)), 'no backslash reaches the script');
  assert.match(embedded.verify, /verify\.js" --plan "PLAN-calc\.md"$/);
  assert.equal(embedded.command, 'node --test "test/**/*.test.js"');
  for (const c of embedded.cards) {
    for (const b of c.briefs) for (const s of b.skills) assert.equal(typeof s, 'string', 'skills are names');
    for (const names of Object.values(c.reviewSkills)) for (const n of names) assert.ok(embedded.skillTexts[n], `${n} has its text once in skillTexts`);
  }
  assert.ok(fs.existsSync(path.join(dir, '.ultimate-workflow/run/calc/cards/1/context.md')));
  assert.ok(out.bytes > 0);
  // A resumed run keeps the base the run started from.
  write(dir, 'README.md', '# later\n');
  git(dir, 'add', 'README.md');
  git(dir, 'commit', '-q', '-m', 'later');
  cli(dir, 'script', '--phase', 'run', '--args-file', '.ultimate-workflow/run/run.args.json');
  const again = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(read(dir, '.ultimate-workflow/run/run.js'))[1]);
  assert.equal(again.base, embedded.base);
});

test('script --phase run refuses a plan with no cards and an arguments file with no feature', () => {
  const dir = repo({ plan: PLAN.replace(/## Cards[\s\S]*?## Tests/, '## Tests') });
  write(dir, 'a.json', JSON.stringify({ plan: 'PLAN-calc.md', feature: 'calc' }));
  const r = cli(dir, 'script', '--phase', 'run', '--args-file', 'a.json');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no ## Cards section/);
  write(dir, 'b.json', JSON.stringify({ plan: 'PLAN-calc.md' }));
  assert.match(cli(dir, 'script', '--phase', 'run', '--args-file', 'b.json').stderr, /needs "feature"/);
});

// --- run-start and run-finish: the main conversation's two steps around the one call --------------

test('run-start makes the run branch, commits only the ignore line there, takes a green baseline and builds the script', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  git(dir, 'commit', '-q', '-am', 'no ignore line yet');
  const main = git(dir, 'rev-parse', 'HEAD');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'uw/run/calc');
  assert.equal(git(dir, 'rev-parse', 'main'), main, 'the branch of the user did not move');
  assert.deepStrictEqual(git(dir, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['.gitignore']);
  assert.equal(r.baseline.taken, true);
  assert.equal(r.baseline.failures, 0);
  assert.deepStrictEqual(r.cards, ['1', '2', '3']);
  assert.deepStrictEqual(r.preflightFailed.map((p) => p.card), ['3']);
  assert.ok(fs.existsSync(r.scriptPath));
  assert.equal(JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json')).feature, 'calc');
  const again = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(again.ok, true, 'run again on its own branch, it reuses it');
  assert.equal(again.ignoreCommit, undefined);
});

test('run-start stops with the failing tests when the suite is already red, before any script', () => {
  const dir = repo();
  write(dir, 'test/red.test.js', "require('node:test')('already red', () => { throw new Error('x'); });\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'red');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  assert.equal(r.ok, false);
  assert.equal(r.needs, 'baseline', JSON.stringify(r));
  assert.ok(r.failing.some((f) => /already red/.test(JSON.stringify(f))), JSON.stringify(r.failing));
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow/run/run.js')));
});

test('run-start --resume-card checks the run branch out again and brings the parked work back', () => {
  const dir = repo();
  json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc'));
  write(dir, 'test/sub.test.js', "require('node:test')('sub', () => {});\n");
  json(cli(dir, 'park', '--plan', 'PLAN-calc.md', '--card', '1', '--feature', 'calc', '--reason', 'red three times'));
  git(dir, 'switch', '-q', 'main');
  const r = json(cli(dir, 'run-start', '--plan', 'PLAN-calc.md', '--feature', 'calc', '--resume-card', '1', '--resume-reason', 'try again'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'uw/run/calc');
  assert.ok(fs.existsSync(path.join(dir, 'test/sub.test.js')));
  const args = JSON.parse(read(dir, '.ultimate-workflow/run/run.args.json'));
  assert.deepStrictEqual(args.resume, { card: '1', reason: 'try again', testFiles: ['test/sub.test.js'] });
});

test('run-finish keeps the output file, writes the report and the ledger row from it, findings as catches', () => {
  const dir = repo();
  const result = {
    ok: true, feature: 'calc', branch: 'uw/run/calc', base: 'abc', plan: 'PLAN-calc.md', summary: '1 committed, 0 parked, 0 blocked.',
    counts: { committed: 1 }, cards: [{ card: '1', title: 'adder', status: 'committed', commit: 'c1', build: { rounds: 1 }, missingClaims: [], outOfScope: [] }],
    expertLanes: [{ card: '1', lane: { ran: ['quality'], findings: [{ expert: 'quality', file: 'test/a.test.js', line: 2, what: 'assertion never fails', confidence: 'low' }] } }],
    review: { ran: true, range: 'abc..HEAD', findings: [], refuted: [], unverified: [] }, harvest: { ran: true, proposals: 0, branch: null },
  };
  const wrapper = { summary: 's', agentCount: 9, totalTokens: 12345, result: JSON.stringify(result), workflowProgress: [{ type: 'workflow_agent', startedAt: 1000, durationMs: 500 }, { type: 'workflow_agent', startedAt: 1200, durationMs: 1800 }] };
  write(dir, 'out/wf_abc-123.output', JSON.stringify(wrapper));
  const r = json(cli(dir, 'run-finish', '--output', 'out/wf_abc-123.output'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.ledger, { runId: 'wf_abc-123', tokens: 12345, agents: 9, durationMs: 2000, catches: 1 });
  assert.match(read(dir, r.report), /\| 1 \| adder \| committed \| c1 \|/);
  assert.equal(read(dir, '.ultimate-workflow/run/run.result.json'), JSON.stringify(wrapper));
});

test('handoff takes an absolute claimed path inside the project as the same file', () => {
  const dir = repo();
  const base = git(dir, 'rev-parse', 'HEAD');
  write(dir, 'test/parse.test.js', "require('node:test')('p', () => {});\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'p');
  const r = json(cli(dir, 'handoff', '--card', '2', '--feature', 'calc', '--range', `${base}..HEAD`, '--claimed', path.join(dir, 'test', 'parse.test.js')));
  assert.deepStrictEqual(r.missingClaims, []);
});
