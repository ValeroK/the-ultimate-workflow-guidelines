'use strict';

// PLAN-simplify, card baseline. internal/tools/measure.js is not shipped and sits outside the
// verify globs, so its tests live here.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const measure = require(path.join(ROOT, 'internal', 'tools', 'measure.js'));
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const put = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

test('measure: the script lists blocking checks and state files from the code and skips .claude/worktrees', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-measure-'));
  made.push(dir);
  put(dir, 'hooks/lib/gates.js', "deny('Gate G1: x'); deny('Gate G7: y');\n");
  put(dir, 'hooks/lib/dispatch.js', 'const x = 1;\n');
  put(dir, 'experts/a.js', "const f = 'verify.json'; const g = 'x'; const FILE = 'heartbeat.json';\n");
  put(dir, 'experts/a.test.js', "const h = 'ledger.jsonl'; deny('Gate G3: z');\n");
  // A whole other checkout under .claude/worktrees must not be counted.
  put(dir, '.claude/worktrees/w/hooks/lib/gates.js', "deny('Gate G2: q');\n");
  put(dir, '.claude/worktrees/w/hooks/big.js', 'x'.repeat(5000));
  assert.deepStrictEqual(measure.blockingChecks(dir), ['G1', 'G7']);
  assert.deepStrictEqual(measure.stateFiles(dir), ['verify.json', 'heartbeat.json']);
  assert.strictEqual(measure.sizes(dir).hooks.files, 2);
  assert.ok(measure.sizes(dir).hooks.bytes < 1000, 'the worktree copy is not counted');
});

const FROZEN = path.join(__dirname, 'fixtures', '4.8.0-payload');

/** A payload root made of the frozen 4.8.0 sources (copied without the .fixture suffix, so the script reads them as code). */
function frozenRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-frozen-'));
  made.push(dir);
  (function walk(p, rel) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(p, e.name), path.join(rel, e.name));
      else put(dir, path.join(rel, e.name.replace(/.fixture$/, '')), fs.readFileSync(path.join(p, e.name), 'utf8'));
    }
  })(FROZEN, '');
  return dir;
}

test('measure: on the 4.8.0 payload the script names every known blocking check and state file', () => {
  // The answer is written by hand from the 4.8.0 gates, not produced by the script.
  const hand = ['B-G1', 'B-G2', 'G1', 'G2', 'G6 at edit', 'G3', 'G4/G5', 'G7', 'G6 at commit', 'memory at commit', 'detect-only stop'];
  const root = frozenRoot();
  assert.deepStrictEqual(measure.blockingChecks(root), hand);
  const state = measure.stateFiles(root);
  // Under the same counting rules 4.8.0 had 8 kinds (the heartbeat) and 5.0.0 has 8 (the commit-check stamp instead).
  assert.strictEqual(state.length, 8, state.join('; '));
  for (const must of ['heartbeat.json', 'verify.json', 'baseline.json', 'ledger.jsonl', 'active-plan']) {
    assert.ok(state.includes(must), `${must} is listed`);
  }
});

test('measure: the current payload has the commit check alone, and no heartbeat module', () => {
  assert.deepStrictEqual(measure.blockingChecks(PAYLOAD), ['G7', 'G6 at commit', 'memory at commit', 'confirmation at commit']);
  const state = measure.stateFiles(PAYLOAD);
  // status.js still names the leftover file (to say it can be deleted); no module writes or reads it, so it is not counted.
  assert.ok(!state.includes('heartbeat.json'));
  assert.ok(state.length <= 8, `${state.length} state file kinds: ${state.join('; ')}`);
  assert.ok(!fs.existsSync(path.join(PAYLOAD, 'hooks', 'lib', 'heartbeat.js')));
  assert.ok(state.includes('commit-check.json') && state.includes('verify.json'));
  assert.ok(measure.zipSize(PAYLOAD).raw > 1000000);
});

// ---- card release ----

test('commands: feature, plan, tests, build, review, harvest, experts, value, expert-attribution and handoff each have a command file', () => {
  for (const name of ['feature', 'plan', 'tests', 'build', 'review', 'harvest', 'experts', 'value', 'expert-attribution', 'handoff']) {
    assert.ok(fs.existsSync(path.join(PAYLOAD, 'commands', `${name}.md`)), name);
  }
});

test('measure: payload bytes are under the 2 MB ZIP ceiling, with the numbers the report quotes', () => {
  const z = measure.zipSize(PAYLOAD);
  assert.ok(z.raw < 2000000 && z.deflated < 2000000, JSON.stringify(z));
  const after = measure.measure(PAYLOAD, ROOT);
  assert.deepStrictEqual(after.blockingChecks, ['G7', 'G6 at commit', 'memory at commit', 'confirmation at commit']);
  assert.ok(after.stateFiles.includes('commit-check.json'));
});

test('rollback: the recorded 4.8.0 parser reads a plan made without the old keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-rollback-'));
  made.push(dir);
  const file = path.join(dir, 'state-4.8.0.js');
  fs.writeFileSync(file, fs.readFileSync(path.join(__dirname, 'fixtures', '4.8.0', 'recorded', 'state-4.8.0.js.fixture'), 'utf8'));
  const old = require(file);
  const plan = ['---', 'phase: build', 'plan_confirmed: true', 'tests_confirmed: true', 'confirmed_hash: abc', 'confirmed_settings: {"test_command":"ab12cd34"}', 'test_command: node --test', '---', 'body', ''].join('\n');
  const data = old.parseFrontMatter(plan).data;
  assert.strictEqual(data.plan_confirmed, true);
  assert.strictEqual(data.tests_confirmed, true);
  assert.strictEqual(data.dirty, undefined, 'the old keys are optional there');
});
