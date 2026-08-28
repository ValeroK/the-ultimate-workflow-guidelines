'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
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

// --- escape hatch ----------------------------------------------------------

test('gates are OFF unless explicitly enabled', () => {
  // v3 demoted these from the enforcement story to a backstop for ad-hoc work.
  // A default-on mechanism that fails open and invisibly is worse than an
  // opt-in one somebody chose.
  assert.equal(state.gatesEnabled({}), false);
  assert.equal(state.gatesEnabled({ ULTIMATE_WORKFLOW_GATES: '' }), false);
  assert.equal(state.gatesEnabled({ ULTIMATE_WORKFLOW_GATES: 'off' }), false);
});

test('gates turn on for any affirmative spelling', () => {
  for (const v of ['on', 'ON', '1', 'true', 'yes']) {
    assert.equal(state.gatesEnabled({ ULTIMATE_WORKFLOW_GATES: v }), true, v);
  }
});

test('gatesDisabled stays the exact inverse, so either caller agrees', () => {
  for (const env of [{}, { ULTIMATE_WORKFLOW_GATES: 'on' }, { ULTIMATE_WORKFLOW_GATES: 'off' }]) {
    assert.equal(state.gatesDisabled(env), !state.gatesEnabled(env));
  }
});
