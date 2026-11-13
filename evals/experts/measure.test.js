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
  put(dir, 'experts/a.js', "const f = 'verify.json'; const g = 'heartbeat.json';\n");
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
  for (const must of ['heartbeat.json', 'verify.json', 'baseline.json', 'waivers.json', 'ledger.jsonl', 'active-plan', 'review.diff', 'verify.lock', 'verify.log']) {
    assert.ok(state.includes(must), `${must} is listed`);
  }
});

test('measure: the current payload has the commit check alone, and no heartbeat module', () => {
  assert.deepStrictEqual(measure.blockingChecks(PAYLOAD), ['G7', 'G6 at commit', 'memory at commit', 'confirmation at commit']);
  const state = measure.stateFiles(PAYLOAD);
  // status.js still names the leftover file (to say it can be deleted); no module writes or reads it.
  assert.ok(!fs.existsSync(path.join(PAYLOAD, 'hooks', 'lib', 'heartbeat.js')));
  assert.ok(state.includes('commit-check.json') && state.includes('verify.json'));
  assert.ok(measure.zipSize(PAYLOAD).raw > 1000000);
});
