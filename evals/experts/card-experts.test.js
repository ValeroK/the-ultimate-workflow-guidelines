'use strict';

// Item 7 of the re-wash review: experts per card. A plan has one `experts:` line, G6 holds the commit
// to it, and a UI-only card got the same nine experts as a security-adjacent CLI card. A card may now
// carry its own `experts:` field. Which set applies is worked out from the changed files at the moment
// of use, never from a pointer that can go stale: the card (or cards) must cover every changed file,
// each must carry the field, and the field must be a subset of the plan's line; anything else is the
// plan's line, unchanged.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const cards = require(path.join(PLUGIN, 'experts', 'cards.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8' });

const PLAN = `---
plan_confirmed: true
tests_confirmed: true
experts: [frontend, quality, developer, security, architect]
---

# PLAN: x

## Cards

- 8a: the ui
  paths: src/ui/**
  experts: [frontend, quality]
- 9: the api
  paths: src/api/**
  experts: [security, developer]
- 10: misc
  paths: src/misc/**
- 11: nothing needed
  paths: src/static/**
  experts: []
`;

function project(planText = PLAN) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-cardx-')));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  for (const d of ['src/ui', 'src/api', 'src/misc', 'src/static', 'src/other', 'tests']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  for (const f of ['src/ui/a.js', 'src/api/b.js', 'src/misc/c.js', 'src/static/d.js', 'src/other/e.js']) fs.writeFileSync(path.join(dir, f), '1\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), planText);
  return dir;
}
const touch = (dir, ...files) => files.forEach((f) => fs.writeFileSync(path.join(dir, f), `${Math.random()}\n`));
const effective = (dir) => experts.effectiveExperts(dir, path.join(dir, 'PLAN-x.md'));

// --- the card field ----------------------------------------------------------------------------

test('a card with no experts field has none; [] is a decision of its own', () => {
  const list = cards.parseCards(PLAN);
  assert.equal(list.find((c) => c.name === '10').experts, undefined);
  assert.deepStrictEqual(list.find((c) => c.name === '11').experts, []);
  assert.deepStrictEqual(list.find((c) => c.name === '8a').experts, ['frontend', 'quality']);
});

test('the field reads as a comma list, with Windows line endings and tabs', () => {
  const crlf = PLAN.replace(/\n/g, '\r\n').replace('\r\n  experts: [frontend, quality]', '\r\n\texperts: frontend, quality');
  assert.deepStrictEqual(cards.findCard(crlf, '8a').experts, ['frontend', 'quality']);
});

// --- the set that applies, from the changed files ----------------------------------------------

test('changes inside one card use that card\'s experts', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js');
  const e = effective(dir);
  assert.deepStrictEqual(e.experts, ['frontend', 'quality']);
  assert.equal(e.source, 'cards');
  assert.deepStrictEqual(e.cards, ['8a']);
  assert.deepStrictEqual(e.planExperts, ['frontend', 'quality', 'developer', 'security', 'architect']);
});

test('changes in several cards use the union of their experts', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js', 'src/api/b.js');
  assert.deepStrictEqual(effective(dir).experts.slice().sort(), ['developer', 'frontend', 'quality', 'security']);
});

test('a file no card covers puts the whole plan\'s experts back', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js', 'src/other/e.js');
  const e = effective(dir);
  assert.equal(e.source, 'plan');
  assert.deepStrictEqual(e.experts, ['frontend', 'quality', 'developer', 'security', 'architect']);
  assert.match(e.reason, /src\/other\/e\.js/);
});

test('a covering card with no experts field puts the plan\'s experts back', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js', 'src/misc/c.js');
  assert.equal(effective(dir).source, 'plan');
});

test('experts: [] on a card means no experts for that card', () => {
  const dir = project();
  touch(dir, 'src/static/d.js');
  assert.deepStrictEqual(effective(dir).experts, []);
});

test('the plan, the plugin folder and test files do not widen or narrow the set', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js', 'tests/ui.test.js');
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'x.json'), '{}');
  const e = effective(dir);
  assert.deepStrictEqual(e.experts, ['frontend', 'quality']);
  assert.equal(e.source, 'cards');
});

test('a field that names an expert outside the plan\'s line, or one that is not installed, is treated as absent', () => {
  const outside = PLAN.replace('experts: [frontend, quality]', 'experts: [frontend, devops]');
  const dir = project(outside);
  touch(dir, 'src/ui/a.js');
  assert.equal(effective(dir).source, 'plan', 'devops is not in the plan\'s line');

  const bogus = PLAN.replace('experts: [frontend, quality]', 'experts: [frontend, bogus]');
  const dir2 = project(bogus);
  touch(dir2, 'src/ui/a.js');
  assert.equal(effective(dir2).source, 'plan');
});

test('a plan with no Cards section, or no experts line, is exactly as before', () => {
  const noCards = PLAN.slice(0, PLAN.indexOf('## Cards'));
  const dir = project(noCards);
  touch(dir, 'src/ui/a.js');
  const e = effective(dir);
  assert.equal(e.source, 'plan');
  assert.deepStrictEqual(e.experts, ['frontend', 'quality', 'developer', 'security', 'architect']);

  const noLine = PLAN.replace(/experts: \[frontend, quality, developer, security, architect\]\n/, '');
  const dir2 = project(noLine);
  touch(dir2, 'src/ui/a.js');
  assert.equal(effective(dir2).source, 'plan');
  assert.deepStrictEqual(effective(dir2).experts, []);
});

test('nothing changed leaves the plan\'s line', () => {
  const dir = project();
  assert.equal(effective(dir).source, 'plan');
});

// --- card-add --------------------------------------------------------------------------------

test('card-add --experts writes the field; a name outside the plan\'s line or not installed is refused', () => {
  const dir = project();
  const ok = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '12', '--title', 't', '--paths', 'src/new/**', '--experts', 'frontend,quality');
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepStrictEqual(cards.findCard(fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8'), '12').experts, ['frontend', 'quality']);

  const outside = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '13', '--title', 't', '--paths', 'src/n2/**', '--experts', 'devops');
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /devops/);
  assert.match(outside.stderr, /plan/);

  const unknown = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '14', '--title', 't', '--paths', 'src/n3/**', '--experts', 'bogus');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /bogus/);
});

test('card-add --experts none writes the empty list, and with no flag writes no field', () => {
  const dir = project();
  assert.equal(cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '12', '--title', 't', '--paths', 'a/**', '--experts', 'none').status, 0);
  assert.equal(cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '13', '--title', 't', '--paths', 'b/**').status, 0);
  const text = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.deepStrictEqual(cards.findCard(text, '12').experts, []);
  assert.equal(cards.findCard(text, '13').experts, undefined);
});

test('card-add --experts needs the plan to record its experts first', () => {
  const noLine = PLAN.replace(/experts: \[frontend, quality, developer, security, architect\]\n/, '');
  const dir = project(noLine);
  const r = cli(dir, 'card-add', '--plan', 'PLAN-x.md', '--name', '12', '--title', 't', '--paths', 'a/**', '--experts', 'frontend');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /select/);
});

// --- the commit gate and the command line use the same set -------------------------------------

test('commitEvidence holds the commit to the card\'s experts, and says which card', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js');
  const ev = experts.commitEvidence(dir, path.join(dir, 'PLAN-x.md'));
  assert.deepStrictEqual(ev.planExperts, ['frontend', 'quality']);
  assert.deepStrictEqual(ev.cards, ['8a']);
});

test('G6 names the card when a re-check dropped one of its experts', () => {
  const ev = { hash: 'h', recheck: { hash: 'h', final: ['frontend'] }, records: { frontend: 'h' }, planExperts: ['frontend', 'quality'], cards: ['8a'], available: [], open: [] };
  const verdict = gates.commitGate(ev);
  assert.equal(verdict.allow, false);
  assert.match(verdict.reason, /quality/);
  assert.match(verdict.reason, /card 8a/);
});

test('G6 allows a commit that has exactly the card\'s experts reviewed', () => {
  const ev = { hash: 'h', recheck: { hash: 'h', final: ['frontend', 'quality'] }, records: { frontend: 'h', quality: 'h' }, planExperts: ['frontend', 'quality'], cards: ['8a'], available: [], open: [] };
  assert.equal(gates.commitGate(ev).allow, true);
});

test('read --plan reports the effective set next to the plan\'s own', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js');
  const r = cli(dir, 'read', '--plan', 'PLAN-x.md');
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepStrictEqual(j.experts, ['frontend', 'quality', 'developer', 'security', 'architect'], 'the plan\'s own line, unchanged');
  assert.deepStrictEqual(j.effective.experts, ['frontend', 'quality']);
  assert.equal(j.effective.source, 'cards');
});

test('status.js shows which card narrowed the experts', () => {
  const dir = project();
  touch(dir, 'src/ui/a.js');
  const status = path.join(PLUGIN, 'hooks', 'status.js');
  const r = spawnSync(process.execPath, [status], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout, /card 8a/);
  assert.match(r.stdout, /frontend, quality/);
  const j = JSON.parse(spawnSync(process.execPath, [status, '--json'], { cwd: dir, encoding: 'utf8' }).stdout);
  assert.equal(j.experts.effective.source, 'cards');
});

test('the review and experts commands pass the effective set and tell the user which ran', () => {
  assert.match(read('commands/review.md'), /effective\.experts/);
  assert.match(read('commands/experts.md'), /effective/);
});
