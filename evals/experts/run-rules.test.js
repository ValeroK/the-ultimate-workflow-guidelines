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
