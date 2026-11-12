'use strict';

// PLAN-run-fixes.md, card gate-card (criterion 3), tests 18 and 19: the pure side.
//   18: what commitEvidence and effectiveExperts give when no card is named, pinned to literals
//       recorded from the code before this plan changed either function;
//   19: lib/run-rules.js and lib/claims.js do not load experts/ at the top level, so experts.js can
//       require run-rules.js without a load cycle (a cycle hands back a half-built exports object).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const expertsLib = require(path.join(PLUGIN, 'experts', 'experts.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

const FIVE = ['quality', 'security', 'genai', 'developer', 'architect'];

// Cards A (quality) and B (security) share src/shared/s.js; C (genai) is apart.
const planWith = ({ expertsLine = true, cardExperts = true } = {}) => `---
phase: build
plan_confirmed: true
tests_confirmed: true
${expertsLine ? `experts: [${FIVE.join(', ')}]\n` : ''}---

# PLAN: gate

## Cards

- A: first
  paths: src/a/**, src/shared/s.js
${cardExperts ? '  experts: quality\n' : ''}- B: second
  paths: src/b/**, src/shared/s.js
${cardExperts ? '  experts: security\n' : ''}- C: third
  paths: src/c/**
${cardExperts ? '  experts: genai\n' : ''}`;

function repo(plan) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-rules-')));
  made.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  for (const f of ['src/a/a.js', 'src/b/b.js', 'src/c/c.js', 'src/shared/s.js', 'src/z/z.js']) write(dir, f, 'module.exports = 0;\n');
  write(dir, 'PLAN-gate.md', plan);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}
const change = (dir, ...files) => files.forEach((f) => write(dir, f, `module.exports = '${f}';\n`));

// --- 18 -----------------------------------------------------------------------------------------

test('18: effectiveExperts with no card gives the same answers as before this plan', () => {
  const dir = repo(planWith());
  const plan = path.join(dir, 'PLAN-gate.md');
  const eff = (files) => expertsLib.effectiveExperts(dir, plan, PLUGIN, files);
  assert.deepStrictEqual(eff(['src/shared/s.js']), { experts: ['quality', 'security'], source: 'cards', cards: ['A', 'B'], planExperts: FIVE });
  assert.deepStrictEqual(eff(['src/a/a.js', 'src/c/c.js']), { experts: ['quality', 'genai'], source: 'cards', cards: ['A', 'C'], planExperts: FIVE });
  assert.deepStrictEqual(eff(['src/z/z.js']), { experts: FIVE, source: 'plan', cards: [], planExperts: FIVE, reason: 'no card covers src/z/z.js' });

  const bare = repo(planWith({ cardExperts: false }));
  assert.deepStrictEqual(expertsLib.effectiveExperts(bare, path.join(bare, 'PLAN-gate.md'), PLUGIN, ['src/a/a.js']), { experts: FIVE, source: 'plan', cards: [], planExperts: FIVE, reason: 'card A has no experts field' });

  const none = repo(planWith({ expertsLine: false }));
  assert.deepStrictEqual(expertsLib.effectiveExperts(none, path.join(none, 'PLAN-gate.md'), PLUGIN, ['src/a/a.js']), { experts: [], source: 'plan', cards: [], planExperts: [], reason: 'the plan records no experts line' });
});

test('18: commitEvidence with no card asks for the union of the covering cards, as before this plan', () => {
  const shared = repo(planWith());
  change(shared, 'src/shared/s.js');
  const a = expertsLib.commitEvidence(shared, path.join(shared, 'PLAN-gate.md'), PLUGIN);
  assert.deepStrictEqual([a.planExperts, a.cards], [['quality', 'security'], ['A', 'B']]);

  const apart = repo(planWith());
  change(apart, 'src/a/a.js', 'src/c/c.js');
  const b = expertsLib.commitEvidence(apart, path.join(apart, 'PLAN-gate.md'), PLUGIN);
  assert.deepStrictEqual([b.planExperts, b.cards], [['quality', 'genai'], ['A', 'C']]);
});

// --- 19 -----------------------------------------------------------------------------------------

test('19a: the new lib files have no top-level require that names experts/', () => {
  const run = path.join(PLUGIN, 'lib', 'run-rules.js');
  assert.ok(fs.existsSync(run), 'lib/run-rules.js must exist: this card creates it');
  for (const file of [run, path.join(PLUGIN, 'lib', 'claims.js')].filter((f) => fs.existsSync(f))) {
    // Top level means the line is not indented: a require inside a function is the lazy form, which is allowed.
    const top = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^\S.*\brequire\(/.test(l));
    assert.deepStrictEqual(top.filter((l) => /experts/.test(l)), [], `${path.basename(file)} requires experts/ at the top level`);
  }
});

test('19b: run-rules.js loaded first, then experts.js: commitEvidence --card still gives the full answer, not a partial export', () => {
  const dir = repo(planWith());
  change(dir, 'src/shared/s.js');
  // Outside the repository: inside it, the script would be one more changed file that no card covers.
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-rules-child-')));
  made.push(outside);
  const script = path.join(outside, 'child.js');
  write(outside, 'child.js', [
    "'use strict';",
    'const [plugin, cwd, plan] = process.argv.slice(2);',
    "const path = require('node:path');",
    "require(path.join(plugin, 'lib', 'run-rules.js'));",
    "const experts = require(path.join(plugin, 'experts', 'experts.js'));",
    "const ev = experts.commitEvidence(cwd, plan, plugin, { card: 'A' });",
    'process.stdout.write(JSON.stringify(ev.planExperts));',
    '',
  ].join('\n'));
  const r = spawnSync(process.execPath, [script, PLUGIN, dir, path.join(dir, 'PLAN-gate.md')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout), ['quality']);
});

// --- card-add (PLAN-run-fixes.md, card card-add, tests 27 and 28) --------------------------------

// 27: the free-name helper stops. A loop that never ends would hang the child and fail on its timeout.
test('27: freeName is bounded, counts a throwing taken() as taken, and gives names the confirmHash drop rule knows', () => {
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-rules-child-')));
  made.push(outside);
  write(outside, 'child.js', [
    "'use strict';",
    "const path = require('node:path');",
    "const rules = require(path.join(process.argv[2], 'lib', 'run-rules.js'));",
    'let thrown = 0;',
    'const out = {',
    '  all: rules.freeName("fixup", () => true),',
    '  third: rules.freeName("fixup", (n) => n === "fixup" || n === "fixup-2"),',
    '  thrown: rules.freeName("fixup", () => { thrown++; throw new Error("git failed"); }),',
    '};',
    'out.thrownCalls = thrown;',
    'process.stdout.write(JSON.stringify(out));',
    '',
  ].join('\n'));
  const r = spawnSync(process.execPath, [path.join(outside, 'child.js'), PLUGIN], { encoding: 'utf8', timeout: 5000 });
  assert.equal(r.signal, null, 'the child was killed: freeName did not stop');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.all.ok, false);
  assert.equal(typeof out.all.reason, 'string');
  assert.equal(out.thrown.ok, false, 'a taken() that throws counts as taken');
  assert.ok(out.thrownCalls >= 1 && out.thrownCalls <= 100, `taken() called ${out.thrownCalls} times`);
  assert.deepStrictEqual(out.third, { ok: true, name: 'fixup-3' });
  assert.match(out.third.name, require(path.join(PLUGIN, 'lib', 'run-rules.js')).RUN_ADDED);
});

// 28: inside ## Cards the hash drops fixup, fixup-2, findings-12 and nothing that merely looks like them.
test('28: confirmHash drops the run-added names with a number, and only those, and only inside ## Cards', () => {
  const plan = ({ cards = '', notes = '' } = {}) => `---
phase: build
plan_confirmed: true
tests_confirmed: true
experts: [quality]
---

# PLAN: names

## Cards

- A: first
  paths: src/a/**
${cards}
## Notes

- note: kept
${notes}`;
  const bullet = (n) => `- ${n}: x\n  paths: src/a/**\n`;
  const base = expertsLib.confirmHash(plan());
  for (const n of ['fixup', 'fixup-2', 'findings-12']) assert.equal(expertsLib.confirmHash(plan({ cards: bullet(n) })), base, `${n} is dropped`);
  for (const n of ['fixups', 'fixup-x', 'myfixup']) assert.notEqual(expertsLib.confirmHash(plan({ cards: bullet(n) })), base, `${n} is kept`);
  assert.notEqual(expertsLib.confirmHash(plan({ notes: bullet('fixup') })), base, 'a fixup bullet outside ## Cards is kept');
});

// --- reasons (PLAN-run-fixes.md, card reasons, tests 57 and 60): the pure side --------------------

const reasonRules = require(path.join(PLUGIN, 'lib', 'run-rules.js'));
const TAIL = 'whole text: .ultimate-workflow/run/f/cards/A/parked.md';
const loneSurrogate = (s) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

test('reasons 57: a plan line keeps the reason up to the last word end under the cap and names parked.md', () => {
  const keep = reasonRules.REASON_KEEP;
  assert.equal(keep, 240);
  // (a) the cap falls inside a word: cut at the last space before it
  const words = Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
  assert.notEqual(words[keep], ' ');
  assert.notEqual(words[keep - 1], ' ');
  const a = reasonRules.shortReason(words, TAIL);
  const kept = words.slice(0, words.lastIndexOf(' ', keep)).trim();
  assert.ok(a.startsWith(`${kept} `), a);
  assert.ok(!a.startsWith(`${kept} word`), 'nothing of the next word is kept');
  assert.ok(a.endsWith(`(${TAIL})`), a);
  assert.ok(a.length <= keep + TAIL.length + 10, `at most the cap: ${a.length}`);
  // (b) no whitespace at all: a hard cut at the cap, never an empty line and never an endless search
  const solid = 'x'.repeat(600);
  const b = reasonRules.shortReason(solid, TAIL);
  assert.ok(b.startsWith('x'.repeat(keep)), b.slice(0, 20));
  assert.ok(!b.startsWith('x'.repeat(keep + 1)), 'cut at the cap, not one short of the end');
  assert.ok(b.endsWith(`(${TAIL})`), b);
  // (c) a short reason is kept whole, followed by the path
  const short = 'not green: the sum is wrong in src/a/a.js, twice over';
  assert.equal(reasonRules.shortReason(short, TAIL), `${short} (${TAIL})`);
});

test('reasons 57 (expert case): a cut never splits a surrogate pair and never returns an empty prefix', () => {
  const keep = reasonRules.REASON_KEEP;
  const face = String.fromCodePoint(0x1f600);
  const atCap = `${'a'.repeat(keep - 1)}${face} and then more text that goes on and on ${'b'.repeat(400)}`;
  const out = reasonRules.shortReason(atCap, TAIL);
  assert.ok(!loneSurrogate(out), 'no lone surrogate');
  assert.ok(out.startsWith('a'.repeat(keep - 1)), 'the prefix is kept');
  assert.ok(out.endsWith(`(${TAIL})`));
  const five = reasonRules.shortReason('x'.repeat(5000), TAIL);
  assert.ok(five.length > TAIL.length + 10 && five.length <= keep + TAIL.length + 10, String(five.length));
  // A reason is one line in the plan, and a semicolon would end the field.
  assert.equal(reasonRules.shortReason('first line\n  second; third', TAIL), `first line second, third (${TAIL})`);
});

test('reasons 60: the conflict reader names the files in conflict, and gives the last lines when it finds none', () => {
  const conflict = [
    "Applied patch to 'src/a/a.js' cleanly.",
    "Applied patch to 'src/b/b.js' with conflicts.",
    'U src/b/b.js',
    "error: patch failed: src/c/c.js:3",
    "error: src/c/c.js: patch does not apply",
  ].join('\n');
  assert.deepStrictEqual(reasonRules.conflictOf(conflict), { files: ['src/b/b.js', 'src/c/c.js'], text: 'conflict in src/b/b.js, src/c/c.js' });
  const other = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join('\n');
  const got = reasonRules.conflictOf(other);
  assert.deepStrictEqual(got.files, []);
  assert.deepStrictEqual(got.text.split(' / '), other.split('\n').slice(-reasonRules.CONFLICT_TAIL));
  assert.ok(!got.text.includes('line 1 '), 'not the first lines');
  assert.equal(reasonRules.conflictOf('').text, 'git apply printed nothing');
});
