'use strict';

// PLAN-run-records.md, W5. In the re-wash a card's heading was written into the plan by hand before
// every build (three times in a row) so `brief --section` could find it, the carried items were added
// to the section by hand, and an attempt edited a file that belonged to the next card without anyone
// but the agent knowing. A plan now lists its cards in a `## Cards` section that a command writes;
// `brief --card` reads a card from it, and `scope` reports from git which changed files fall outside
// the card's paths, instead of trusting the agent's own list of what it changed.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const cards = require(path.join(PLUGIN, 'experts', 'cards.js'));
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-cards-')));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8' });

const PLAN = `---
plan_confirmed: true
---

# PLAN: re-wash

## Cards

- 8: the shell
  paths: dashboard/src/shell/**
- 8a: Command Deck routes
  paths: dashboard/src/app/skills/**, dashboard/src/components/skills/**, README.md
  carried: CAP-WASH-13 keys stay; SVG judge too strict
- 8b: batch two
  paths: dashboard/src/app/agents/**

## Other notes

- not-a-card: this bullet is outside the Cards section
  paths: ignored/**
`;

// --- parsing ---------------------------------------------------------------------------------

test('parseCards reads each card with its title, paths and carried items', () => {
  const list = cards.parseCards(PLAN);
  assert.deepStrictEqual(list.map((c) => c.name), ['8', '8a', '8b']);
  const a = list.find((c) => c.name === '8a');
  assert.equal(a.title, 'Command Deck routes');
  assert.deepStrictEqual(a.paths, ['dashboard/src/app/skills/**', 'dashboard/src/components/skills/**', 'README.md']);
  assert.deepStrictEqual(a.carried, ['CAP-WASH-13 keys stay', 'SVG judge too strict']);
});

test('a bullet outside the Cards section is not a card', () => {
  assert.ok(!cards.parseCards(PLAN).some((c) => c.name === 'not-a-card'));
});

test('a card is found by its whole name: 8 is not 8a, and 8a is not 8b', () => {
  assert.equal(cards.findCard(PLAN, '8').title, 'the shell');
  assert.equal(cards.findCard(PLAN, '8a').title, 'Command Deck routes');
  assert.equal(cards.findCard(PLAN, '8b').title, 'batch two');
  assert.equal(cards.findCard(PLAN, 'a'), null);
  assert.equal(cards.findCard(PLAN, '8c'), null);
  assert.equal(cards.findCard(PLAN, '8A').name, '8a', 'case does not matter');
});

test('Windows line endings and tab-indented fields parse the same', () => {
  const crlf = PLAN.replace(/\n/g, '\r\n').replace(/\r\n {2}paths:/g, '\r\n\tpaths:');
  const a = cards.findCard(crlf, '8a');
  assert.equal(a.title, 'Command Deck routes');
  assert.equal(a.paths.length, 3);
  assert.equal(a.carried.length, 2);
});

test('a plan with no Cards section has no cards, and nothing throws', () => {
  assert.deepStrictEqual(cards.parseCards('# PLAN: x\n\nno cards here\n'), []);
  assert.equal(cards.findCard('# PLAN: x\n', '8a'), null);
  assert.deepStrictEqual(cards.parseCards(''), []);
});

test('the text a card gives the briefs holds its title, paths and carried items', () => {
  const text = cards.cardText(cards.findCard(PLAN, '8a'));
  assert.match(text, /Command Deck routes/);
  assert.match(text, /dashboard\/src\/app\/skills\/\*\*/);
  assert.match(text, /CAP-WASH-13 keys stay/);
});

// --- writing a card ----------------------------------------------------------------------------

function planDir(text) {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), text);
  return dir;
}

test('card-add creates the Cards section when there is none, and the card can be read back', () => {
  const dir = planDir('---\nplan_confirmed: true\n---\n\n# PLAN: x\n\nBody.\n');
  const r = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '9', '--title', 'charts', '--paths', 'dashboard/src/charts/**, README.md', '--carried', 'one; two');
  assert.equal(r.status, 0, r.stderr);
  const c = cards.findCard(fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8'), '9');
  assert.equal(c.title, 'charts');
  assert.deepStrictEqual(c.paths, ['dashboard/src/charts/**', 'README.md']);
  assert.deepStrictEqual(c.carried, ['one', 'two']);
});

test('card-add puts a card at the end of an existing section, before the next heading', () => {
  const dir = planDir(PLAN);
  assert.equal(cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '9', '--title', 'charts', '--paths', 'c/**').status, 0);
  const text = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.deepStrictEqual(cards.parseCards(text).map((c) => c.name), ['8', '8a', '8b', '9']);
  assert.ok(text.indexOf('- 9: charts') < text.indexOf('## Other notes'));
  assert.ok(text.includes('## Other notes'), 'the rest of the plan is untouched');
});

test('card-add refuses a name that is taken, and changes nothing', () => {
  const dir = planDir(PLAN);
  const r = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '8a', '--title', 'again', '--paths', 'x/**');
  assert.equal(r.status, 2);
  assert.match(r.stdout, /already/);
  assert.equal(fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8'), PLAN);
});

test('card-add refuses a name with spaces or a colon, and a card with no paths', () => {
  const dir = planDir(PLAN);
  assert.equal(cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', 'card 9', '--title', 't', '--paths', 'x/**').status, 2);
  assert.equal(cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '9:b', '--title', 't', '--paths', 'x/**').status, 2);
  const noPaths = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '9', '--title', 't');
  assert.equal(noPaths.status, 2);
  assert.match(noPaths.stdout, /paths/);
  assert.equal(fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8'), PLAN);
});

test('card-add keeps a plan written with Windows line endings in that style', () => {
  const crlf = PLAN.replace(/\n/g, '\r\n');
  const dir = planDir(crlf);
  assert.equal(cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '9', '--title', 'charts', '--paths', 'c/**').status, 0);
  const text = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.ok(!/[^\r]\n/.test(text), 'no bare LF was introduced');
  assert.equal(cards.findCard(text, '9').title, 'charts');
});

// --- brief --card ------------------------------------------------------------------------------

test('brief --card reads the card; an unknown card is refused and the known ones are named', () => {
  const dir = planDir(PLAN);
  const ok = cli(dir, 'brief', '--plan', 'PLAN-x.md', '--card', '8a');
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(Array.isArray(JSON.parse(ok.stdout)));
  const bad = cli(dir, 'brief', '--plan', 'PLAN-x.md', '--card', '8c');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /8c/);
  assert.match(bad.stderr, /8a/);
});

test('a plan with no Cards section still works with a "Card 8a" heading, and 8 does not pick up 8a', () => {
  const plan = '# PLAN\n\n## Card 8a\n\nfiles: a.tf\n\n## Card 8\n\nthe other\n';
  assert.match(cards.headingCardText(plan, '8a'), /a\.tf/);
  const eight = cards.headingCardText(plan, '8');
  assert.match(eight, /the other/);
  assert.doesNotMatch(eight, /a\.tf/);
  assert.equal(cards.headingCardText(plan, '9'), null);
});

test('brief --section is unchanged', () => {
  const dir = planDir('# PLAN\n\n## Card 8a\n\nbody\n');
  const r = cli(dir, 'brief', '--plan', 'PLAN-x.md', '--section', 'Card 8a');
  assert.equal(r.status, 0, r.stderr);
});

// --- scope, from git ---------------------------------------------------------------------------

function project() {
  const dir = tmp();
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  fs.mkdirSync(path.join(dir, 'src', 'skills'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src', 'other'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'skills', 'a.js'), '1\n');
  fs.writeFileSync(path.join(dir, 'src', 'other', 'b.js'), '1\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(
    path.join(dir, 'PLAN-x.md'),
    '---\nplan_confirmed: true\n---\n\n## Cards\n\n- 8a: skills\n  paths: src/skills/**, docs/*.md, src/exact.js\n'
  );
  return dir;
}

test('scope names the changed files that are outside the card, from git', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'src', 'skills', 'a.js'), '2\n'); // in scope
  fs.mkdirSync(path.join(dir, 'src', 'skills', 'deep', 'er'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'skills', 'deep', 'er', 'n.js'), 'x\n'); // in scope, nested
  fs.writeFileSync(path.join(dir, 'src', 'other', 'b.js'), '2\n'); // out of scope
  fs.writeFileSync(path.join(dir, 'src', 'exact.js'), 'x\n'); // in scope by exact path
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'g.md'), 'x\n'); // in scope by glob
  const r = cli(dir, 'scope', '--plan', 'PLAN-x.md', '--card', '8a');
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepStrictEqual(j.outOfScope, ['src/other/b.js']);
  assert.equal(j.card, '8a');
});

test('scope leaves out the plan, the plugin folder and the tests the build wrote, but not other tests', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'tests', 'skills.test.js'), 'x\n'); // written by the build's test step
  fs.writeFileSync(path.join(dir, 'tests', 'other.test.js'), 'x\n'); // not reported as written
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'x.json'), '{}');
  fs.mkdirSync(path.join(dir, '.ultimate-workflow', 'run'), { recursive: true });
  // the Workflow tool's wrapper, as saved by the build command
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'run', 'build.result.json'), JSON.stringify({ summary: 's', result: { ok: true, testFiles: ['tests/skills.test.js'] } }));
  const r = cli(dir, 'scope', '--plan', 'PLAN-x.md', '--card', '8a', '--result', '.ultimate-workflow/run/build.result.json');
  assert.equal(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout).outOfScope, ['tests/other.test.js']);
});

test('scope does not trust the agent: a file the build never reported is still found', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'src', 'other', 'sneaky.js'), 'x\n');
  fs.mkdirSync(path.join(dir, '.ultimate-workflow', 'run'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'run', 'r.json'), JSON.stringify({ ok: true, filesChanged: ['src/skills/a.js'], testFiles: [] }));
  const r = cli(dir, 'scope', '--plan', 'PLAN-x.md', '--card', '8a', '--result', '.ultimate-workflow/run/r.json');
  assert.ok(JSON.parse(r.stdout).outOfScope.includes('src/other/sneaky.js'));
});

test('scope refuses an unknown card and a card with no paths', () => {
  const dir = project();
  assert.equal(cli(dir, 'scope', '--plan', 'PLAN-x.md', '--card', '9').status, 2);
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\n---\n\n## Cards\n\n- 8a: skills\n');
  const r = cli(dir, 'scope', '--plan', 'PLAN-x.md', '--card', '8a');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /paths/);
});

// --- the wiring ----------------------------------------------------------------------------------

test('the build command tells the session how to record, brief and check a card', () => {
  const text = read('commands/build.md');
  assert.match(text, /card-add/);
  assert.match(text, /--card/);
  assert.match(text, /scope --plan/);
});

// ---- PLAN-simplify, card cards-reader: one Cards-section reader ----

const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));

const TWO_CARDS = [
  '---', 'plan_confirmed: true', '---', '', '# PLAN', '',
  '## Cards', '',
  '- first: one', '  paths: a.js', '  status: pending', '',
  '## Notes', '', 'text', '',
  '## Cards', '',
  '- second: two', '  paths: b.js', '  status: pending', '',
].join('\n');

test('cards: the first heading named Cards is the section, for confirmHash and parseCards alike', () => {
  const lines = TWO_CARDS.split('\n');
  const range = cards.cardsRange(lines);
  assert.strictEqual(range.heading, 6, 'the first Cards heading, by hand-counted line number');
  assert.strictEqual(range.end, 12, 'the section ends at the next heading');
  assert.deepStrictEqual(cards.parseCards(TWO_CARDS).map((c) => c.name), ['first'], 'only the first section holds cards');
  // A run field inside the first section is outside the hash; the same line in the second section is ordinary plan text.
  const inFirst = TWO_CARDS.replace('  status: pending\n\n## Notes', '  status: running\n\n## Notes');
  assert.strictEqual(expertsLib.confirmHash(inFirst), expertsLib.confirmHash(TWO_CARDS), 'a status line in the first Cards section is not hashed');
  const inSecond = TWO_CARDS.replace(/status: pending\n$/, 'status: running\n');
  assert.notStrictEqual(inSecond, TWO_CARDS);
  assert.notStrictEqual(expertsLib.confirmHash(inSecond), expertsLib.confirmHash(TWO_CARDS), 'a status line under a second Cards heading is plan text the user confirmed');
  // A card added under the second heading is ordinary text: it moves the hash and is not a card.
  const added = `${TWO_CARDS}- third: three\n  paths: c.js\n`;
  assert.notStrictEqual(expertsLib.confirmHash(added), expertsLib.confirmHash(TWO_CARDS));
  assert.deepStrictEqual(cards.parseCards(added).map((c) => c.name), ['first']);
});

test('cards: accepted is a known field and does not land in carried', () => {
  const plan = '## Cards\n\n- a: one\n  paths: a.js\n  accepted: x/y.js, z.js\n  carried: do this\n';
  const [card] = cards.parseCards(plan);
  assert.deepStrictEqual(card.accepted, ['x/y.js', 'z.js']);
  assert.deepStrictEqual(card.carried, ['do this']);
});

test('cards: run-rules does not require experts.js', () => {
  const src = fs.readFileSync(path.join(PLUGIN, 'lib', 'run-rules.js'), 'utf8');
  const requires = [...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  assert.ok(requires.every((r) => !/experts/.test(r)), `run-rules requires: ${requires.join(', ') || 'nothing'}`);
});
