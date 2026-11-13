'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
// Every temporary directory this file creates is removed when it exits (node --test runs each
// file in its own process); without this, each run left hundreds behind in the system temp folder.
{
  const made = [];
  const mkdtemp = fs.mkdtempSync;
  fs.mkdtempSync = (...args) => {
    const dir = mkdtemp(...args);
    made.push(dir);
    return dir;
  };
  process.on('exit', () => {
    for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
  });
}
const os = require('node:os');
const path = require('node:path');

const state = require('./state.js');

// --- helpers ---------------------------------------------------------------

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uw-gates-'));
}

function write(dir, rel, content) {
  const target = path.join(dir, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}

function fm(obj, body = '\n# Body\n') {
  const lines = Object.entries(obj).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

/** A repo state that satisfies every handoff condition in PRD 4.8. */
function seedCompleteBootstrap(dir) {
  write(dir, 'PRD.md', fm({ scale: 'weekend', prd_confirmed: true, design_confirmed: true, scaffold_verify: 'green' }, '\n## Design\n\nConfirmed.\n'));
  write(dir, 'CLAUDE.md', '# CLAUDE.md\n\n## Key files\n\n- x\n\n## Gotchas\n');
  write(dir, 'ROADMAP.md', '# Roadmap\n\n## Milestone 1 — thing\n');
  write(dir, 'progress.md', '# Progress\n\n## 2026-08-25\n\nStarted.\n');
  write(dir, 'memory.md', '# Memory\n');
}

// --- parseFrontMatter ------------------------------------------------------

test('parseFrontMatter reads scalar keys and types them', () => {
  const { data, hadFrontMatter } = state.parseFrontMatter(
    fm({ phase: 'implement', plan_confirmed: true, verify_rounds: 2, last_verify: 'red' })
  );
  assert.equal(hadFrontMatter, true);
  assert.equal(data.phase, 'implement');
  assert.strictEqual(data.plan_confirmed, true);
  assert.strictEqual(data.verify_rounds, 2);
  assert.equal(data.last_verify, 'red');
});

test('parseFrontMatter returns empty data when there is no front matter', () => {
  const { data, hadFrontMatter, body } = state.parseFrontMatter('# Just a heading\n');
  assert.deepEqual(data, {});
  assert.equal(hadFrontMatter, false);
  assert.equal(body, '# Just a heading\n');
});

test('parseFrontMatter tolerates CRLF line endings', () => {
  const text = '---\r\nplan_confirmed: true\r\nverify_rounds: 1\r\n---\r\n# Body\r\n';
  const { data } = state.parseFrontMatter(text);
  assert.strictEqual(data.plan_confirmed, true);
  assert.strictEqual(data.verify_rounds, 1);
});

test('parseFrontMatter ignores malformed lines instead of throwing', () => {
  const text = '---\nplan_confirmed: true\nthis line has no colon\n: missing key\n---\n';
  const { data } = state.parseFrontMatter(text);
  assert.strictEqual(data.plan_confirmed, true);
  assert.equal(Object.keys(data).length, 1);
});

test('parseFrontMatter keeps unknown keys', () => {
  const { data } = state.parseFrontMatter(fm({ plan_confirmed: false, something_new: 'kept' }));
  assert.equal(data.something_new, 'kept');
});

test('parseFrontMatter strips surrounding quotes from values', () => {
  const { data } = state.parseFrontMatter('---\ntest_command: "node --test hooks/"\n---\n');
  assert.equal(data.test_command, 'node --test hooks/');
});

test('a --- separator inside the body is not treated as front matter', () => {
  const { data, hadFrontMatter } = state.parseFrontMatter('# Title\n\n---\n\nnot: frontmatter\n');
  assert.equal(hadFrontMatter, false);
  assert.deepEqual(data, {});
});

// --- patchState ------------------------------------------------------------

test('patchState updates a key and preserves the body and other keys', () => {
  const dir = tmpdir();
  const file = write(dir, 'PLAN-x.md', fm({ plan_confirmed: false, verify_rounds: 0 }, '\n## Feature\n\nText.\n'));

  state.patchState(file, { plan_confirmed: true });

  const after = state.parseFrontMatter(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(after.data.plan_confirmed, true);
  assert.strictEqual(after.data.verify_rounds, 0);
  assert.match(after.body, /## Feature/);
});

test('patchState adds front matter to a file that has none', () => {
  const dir = tmpdir();
  const file = write(dir, 'PLAN-x.md', '# Plan\n\nNo front matter here.\n');

  state.patchState(file, { plan_confirmed: true });

  const after = state.parseFrontMatter(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(after.data.plan_confirmed, true);
  assert.match(after.body, /No front matter here\./);
});

// --- resolveStage ----------------------------------------------------------

test('resolveStage returns none for a repo with no PRD and no plan', () => {
  const dir = tmpdir();
  write(dir, 'src/a.js', 'x');
  assert.equal(state.resolveStage(dir), 'none');
});

test('resolveStage returns bootstrap when PRD exists and handoff is incomplete', () => {
  const dir = tmpdir();
  write(dir, 'PRD.md', fm({ scale: 'weekend', prd_confirmed: false }));
  assert.equal(state.resolveStage(dir), 'bootstrap');
});

test('resolveStage returns feature when a PLAN file exists', () => {
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  write(dir, 'PLAN-thing.md', fm({ plan_confirmed: false }));
  assert.equal(state.resolveStage(dir), 'feature');
});

test('an active PLAN file wins even while bootstrap docs are incomplete', () => {
  const dir = tmpdir();
  write(dir, 'PRD.md', fm({ prd_confirmed: false }));
  write(dir, 'PLAN-thing.md', fm({ plan_confirmed: true }));
  assert.equal(state.resolveStage(dir), 'feature');
});

// --- handoffComplete -------------------------------------------------------

test('handoffComplete is true when every condition in PRD 4.8 is met', () => {
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  assert.equal(state.handoffComplete(dir), true);
});

for (const missing of ['PRD.md', 'CLAUDE.md', 'ROADMAP.md', 'progress.md', 'memory.md']) {
  test(`handoffComplete is false when ${missing} is absent`, () => {
    const dir = tmpdir();
    seedCompleteBootstrap(dir);
    fs.rmSync(path.join(dir, missing));
    assert.equal(state.handoffComplete(dir), false);
  });
}

test('handoffComplete is false when the scaffold has not verified green', () => {
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  write(dir, 'PRD.md', fm({ prd_confirmed: true, design_confirmed: true, scaffold_verify: 'red' }));
  assert.equal(state.handoffComplete(dir), false);
});

test('handoffComplete is false when CLAUDE.md lacks its required sections', () => {
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  write(dir, 'CLAUDE.md', '# CLAUDE.md\n\nNothing structured here.\n');
  assert.equal(state.handoffComplete(dir), false);
});

// --- readState -------------------------------------------------------------

test('readState points at PRD.md during bootstrap', () => {
  const dir = tmpdir();
  write(dir, 'PRD.md', fm({ scale: 'product', prd_confirmed: false }));
  const s = state.readState(dir);
  assert.equal(s.stage, 'bootstrap');
  assert.equal(path.basename(s.file), 'PRD.md');
  assert.equal(s.data.scale, 'product');
});

test('readState points at the PLAN file during feature work', () => {
  const dir = tmpdir();
  write(dir, 'PLAN-gates.md', fm({ plan_confirmed: true, tests_confirmed: false }));
  const s = state.readState(dir);
  assert.equal(s.stage, 'feature');
  assert.equal(path.basename(s.file), 'PLAN-gates.md');
  assert.strictEqual(s.data.tests_confirmed, false);
});

test('readState on an unmanaged repo yields stage none and no file', () => {
  const dir = tmpdir();
  const s = state.readState(dir);
  assert.equal(s.stage, 'none');
  assert.equal(s.file, null);
  assert.deepEqual(s.data, {});
});

test('readState picks the most recently modified PLAN file when several exist', () => {
  const dir = tmpdir();
  const older = write(dir, 'PLAN-old.md', fm({ plan_confirmed: true }));
  const newer = write(dir, 'PLAN-new.md', fm({ plan_confirmed: false }));
  fs.utimesSync(older, new Date(1000), new Date(1000));
  fs.utimesSync(newer, new Date(9_000_000), new Date(9_000_000));
  assert.equal(path.basename(state.readState(dir).file), 'PLAN-new.md');
});

// --- the plan pointer may name a plan in a subfolder -------------------------

const POINTER = path.join('.ultimate-workflow', 'active-plan');
const SUB_PLAN = 'internal/plans/PLAN-x.md';

function writePointer(dir, value) {
  write(dir, POINTER, `${value}\n`);
}

function withoutPointer(dir) {
  fs.rmSync(path.join(dir, POINTER), { force: true });
  return state.readState(dir);
}

test('pointer to internal/plans/PLAN-x.md: readState returns that file and its volatile_paths when the root has no PLAN file', () => {
  const dir = tmpdir();
  const file = write(dir, SUB_PLAN, fm({ plan_confirmed: true, volatile_paths: 'src/a.js, src/b.js' }));
  writePointer(dir, SUB_PLAN);

  const s = state.readState(dir);
  assert.equal(s.stage, 'feature');
  assert.equal(path.resolve(s.file), path.resolve(file));
  assert.deepEqual(s.data.volatile_paths, 'src/a.js, src/b.js');
});

test('setActivePlan accepts a relative subfolder path and pointedPlanFile returns it', () => {
  const dir = tmpdir();
  const file = write(dir, SUB_PLAN, fm({ plan_confirmed: false }));

  assert.strictEqual(state.setActivePlan(dir, SUB_PLAN), true);
  assert.equal(fs.readFileSync(path.join(dir, POINTER), 'utf8').trim(), SUB_PLAN);
  assert.equal(path.resolve(state.pointedPlanFile(dir)), path.resolve(file));
});

test('setActivePlan normalises backslashes in a subfolder path', () => {
  const dir = tmpdir();
  const file = write(dir, SUB_PLAN, fm({ plan_confirmed: false }));

  assert.strictEqual(state.setActivePlan(dir, 'internal\\plans\\PLAN-x.md'), true);
  assert.equal(fs.readFileSync(path.join(dir, POINTER), 'utf8').trim(), SUB_PLAN);
  assert.equal(path.resolve(state.pointedPlanFile(dir)), path.resolve(file));
});

test('pointer refused: each unsafe form is ignored', () => {
  const outer = tmpdir();
  const dir = path.join(outer, 'root');
  fs.mkdirSync(dir);
  write(outer, 'PLAN-x.md', fm({ plan_confirmed: true }));
  const real = write(dir, SUB_PLAN, fm({ plan_confirmed: true }));
  write(dir, 'internal/plans/notes.md', fm({ plan_confirmed: true }));

  const rows = [
    '../PLAN-x.md',
    'internal/../../PLAN-x.md',
    real, // absolute path to a plan that really exists
    '/abs/PLAN-x.md',
    'C:PLAN-x.md',
    'C:\\x\\PLAN-x.md',
    '//server/share/PLAN-x.md',
    'internal\\..\\..\\PLAN-x.md',
    'internal/plans/notes.md',
    'internal/plans/PLAN-missing.md',
  ];
  const baseline = withoutPointer(dir);
  assert.equal(baseline.file, null);

  for (const row of rows) {
    assert.strictEqual(state.setActivePlan(dir, row), false, `setActivePlan ${row}`);
    writePointer(dir, row);
    assert.deepEqual(state.readState(dir), baseline, `readState with pointer ${row}`);
    assert.equal(state.pointedPlanFile(dir), null, `pointedPlanFile ${row}`);
    fs.rmSync(path.join(dir, POINTER), { force: true });
  }
});

test('pointer through a directory junction out of the root is refused', () => {
  const outer = tmpdir();
  const dir = path.join(outer, 'root');
  fs.mkdirSync(dir);
  write(outer, 'elsewhere/PLAN-x.md', fm({ plan_confirmed: true }));
  fs.symlinkSync(path.join(outer, 'elsewhere'), path.join(dir, 'linked'), 'junction');

  assert.strictEqual(state.setActivePlan(dir, 'linked/PLAN-x.md'), false);
  writePointer(dir, 'linked/PLAN-x.md');
  assert.deepEqual(state.readState(dir), withoutPointer(dir));
  assert.equal(withoutPointer(dir).file, null);
});

test('pointer to a phase: done plan is ignored', () => {
  const dir = tmpdir();
  const old = write(dir, 'PLAN-old.md', fm({ phase: 'implement' }));
  write(dir, SUB_PLAN, fm({ phase: 'done' }));
  writePointer(dir, SUB_PLAN);

  const s = state.readState(dir);
  assert.deepEqual(s, withoutPointer(dir));
  assert.equal(path.resolve(s.file), path.resolve(old));
});

test('without a pointer the root-only guess is unchanged', () => {
  const dir = tmpdir();
  write(dir, SUB_PLAN, fm({ plan_confirmed: true }));

  const s = state.readState(dir);
  assert.equal(s.stage, 'none');
  assert.equal(s.file, null);
});

// --- escape hatch ----------------------------------------------------------

test('gates are ON unless explicitly switched off (4.1.0)', () => {
  // On by default again, by decision (2026-10-30): status.js now tells a gate that
  // never ran from one that is live, and a real run skipped steps without them.
  assert.equal(state.gatesEnabled({}), true);
  assert.equal(state.gatesEnabled({ ULTIMATE_WORKFLOW_GATES: '' }), true);
  for (const v of ['on', 'ON', '1', 'true', 'yes']) {
    assert.equal(state.gatesEnabled({ ULTIMATE_WORKFLOW_GATES: v }), true, v);
  }
});

test('gates turn off for any negative spelling, and only for those', () => {
  for (const v of ['off', 'OFF', ' off ', '0', 'false', 'no']) {
    assert.equal(state.gatesEnabled({ ULTIMATE_WORKFLOW_GATES: v }), false, v);
  }
});

test('gatesDisabled stays the exact inverse, so either caller agrees', () => {
  for (const env of [{}, { ULTIMATE_WORKFLOW_GATES: 'on' }, { ULTIMATE_WORKFLOW_GATES: 'off' }]) {
    assert.equal(state.gatesDisabled(env), !state.gatesEnabled(env));
  }
});

// --- the AGENTS.md handoff, after main moved the always-on doc --------------

test('a project bootstrapped the new way can hand off', () => {
  // The bootstrap skill now writes AGENTS.md plus a one-line `@AGENTS.md`
  // CLAUDE.md stub. Checking CLAUDE.md for `## Key files` and `## Gotchas`
  // therefore failed on every new project -- the stub has no headings -- and
  // left it permanently un-handed-off, with the gates blocking feature work.
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  write(dir, 'AGENTS.md', '# AGENTS.md\n\n## Key files\n\n- x\n\n## Gotchas\n');
  write(dir, 'CLAUDE.md', '@AGENTS.md\n');

  assert.equal(state.handoffComplete(dir), true);
});

test('a project bootstrapped the old way still hands off', () => {
  // No AGENTS.md at all: the sections live in CLAUDE.md, as they used to.
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  assert.equal(state.handoffComplete(dir), true);
});

test('handoff still fails when neither file carries the sections', () => {
  const dir = tmpdir();
  seedCompleteBootstrap(dir);
  write(dir, 'AGENTS.md', '# AGENTS.md\n\nNothing structured here.\n');
  write(dir, 'CLAUDE.md', '@AGENTS.md\n');

  assert.equal(state.handoffComplete(dir), false);
});

// ---- PLAN-simplify, card frontmatter: one block finder, one parser, one in-place writer ----

const expertsLib = require('../../experts/experts.js');

// Every fence shape a real editor produces. `write` builds the plan the way that editor saves it.
const SHAPES = {
  LF: { eol: '\n', bom: '', fence: '---' },
  CRLF: { eol: '\r\n', bom: '', fence: '---' },
  BOM: { eol: '\n', bom: '﻿', fence: '---' },
  'BOM and CRLF': { eol: '\r\n', bom: '﻿', fence: '---' },
  'trailing spaces on both fences': { eol: '\n', bom: '', fence: '--- ' },
  'trailing tab on both fences': { eol: '\n', bom: '', fence: '---\t' },
  'closing fence at end of file, no newline': { eol: '\n', bom: '', fence: '---', noFinalNewline: true },
};
function planOf(shape, front, body = '# PLAN\n\n## Cards\n\n- 1: a\n  paths: src/a.js\n') {
  const { eol, bom, fence, noFinalNewline } = shape;
  const tail = noFinalNewline ? '' : body.replace(/\n/g, eol);
  return `${bom}${fence}${eol}${front.join(eol)}${eol}${fence}${noFinalNewline ? '' : eol}${tail}`;
}
const FRONT = ['phase: build', 'plan_confirmed: false', 'tests_confirmed: false', 'test_command: node --test x', 'dirty: true', 'verify_rounds: 2'];

test('frontmatter: a plan written by setConfirmed is read as confirmed by checkConfirmed, for every fence shape', () => {
  for (const [name, shape] of Object.entries(SHAPES)) {
    let text = planOf(shape, FRONT);
    text = expertsLib.setConfirmed(text, 'plan_confirmed');
    text = expertsLib.setConfirmed(text, 'tests_confirmed');
    const verdict = expertsLib.checkConfirmed(text);
    assert.strictEqual(verdict.ok, true, `${name}: ${verdict.reason}`);
    assert.strictEqual(state.parseFrontMatter(text).data.plan_confirmed, true, `${name}: the flag reads as true`);
  }
});

test('frontmatter: setFrontLine keeps the BOM, the line endings and every other byte, on replace and on insert', () => {
  for (const [name, shape] of Object.entries(SHAPES)) {
    const text = planOf(shape, FRONT);
    // replace: the key is present
    const replaced = state.setFrontLine(text, 'tests_confirmed', 'true');
    assert.strictEqual(replaced, text.replace('tests_confirmed: false', 'tests_confirmed: true'), `${name}: replace changes one line only`);
    // insert: the key is absent; the new line uses the file's own line ending and sits last in the block
    const inserted = state.setFrontLine(text, 'confirmed_hash', 'abc');
    const closing = shape.fence + (shape.noFinalNewline ? '' : shape.eol);
    const at = text.lastIndexOf(shape.fence + (shape.noFinalNewline ? '' : shape.eol), text.length);
    const expected = text.slice(0, at) + `confirmed_hash: abc${shape.eol}` + text.slice(at);
    assert.strictEqual(inserted, expected, `${name}: insert adds one line with the file's line ending (${JSON.stringify(closing)})`);
  }
});

test('frontmatter: setFrontLine on a file with no front matter throws', () => {
  assert.throws(() => state.setFrontLine('# no front matter\n', 'a', '1'), /no front matter/);
});

test('frontmatter: unknown and old keys survive a write untouched', () => {
  const text = planOf(SHAPES.LF, ['phase: build', 'plan_confirmed: false', 'tests_confirmed: false', 'dirty: true', 'verify_rounds: 2', 'last_verify: red', 'escalated: false', 'gate_violation: G1 text', 'odd_key: some value']);
  let next = expertsLib.setConfirmed(text, 'plan_confirmed');
  next = expertsLib.setConfirmed(next, 'tests_confirmed');
  for (const line of ['dirty: true', 'verify_rounds: 2', 'last_verify: red', 'escalated: false', 'gate_violation: G1 text', 'odd_key: some value']) {
    assert.ok(next.split('\n').includes(line), `${line} is still there, byte for byte`);
  }
});

test('frontmatter: the block finder and the parser agree on a BOM plan', () => {
  const parsed = state.parseFrontMatter(planOf(SHAPES['BOM and CRLF'], FRONT));
  assert.strictEqual(parsed.hadFrontMatter, true);
  assert.strictEqual(parsed.data.test_command, 'node --test x');
  assert.strictEqual(parsed.body.startsWith('# PLAN'), true);
  const split = state.splitFrontMatter(planOf(SHAPES.LF, FRONT));
  assert.deepStrictEqual(Object.keys(split).sort(), ['after', 'block', 'bom', 'eol', 'open']);
  assert.strictEqual(state.splitFrontMatter('no front matter'), null);
  assert.strictEqual(state.splitFrontMatter('---\nunclosed: true\n'), null);
});
