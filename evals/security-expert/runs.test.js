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

const { planRuns, loadResults } = require('./manual/plan-runs.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const VENDOR = path.join(__dirname, '..', '..', 'vendor', 'anthropic-security-review');

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-runs-'));
  return { dir, base: { dir, pluginDir: PLUGIN, vendorDir: VENDOR, worktreeFor: (id) => `/wt/${id}`, diffFor: (id) => `/diffs/${id}.diff` } };
}

test('every case x arm x run appears exactly once, with a prompt file on disk', async () => {
  const { dir, base } = setup();
  const index = await planRuns({ ...base, cases: ['s01', 'b01'], arms: ['generic', 'expert'], runs: 2 });
  assert.strictEqual(index.length, 2 * 2 * 2);
  const keys = index.map((r) => `${r.caseId}|${r.arm}|${r.run}`);
  assert.strictEqual(new Set(keys).size, keys.length);
  for (const r of index) assert.ok(fs.existsSync(r.promptFile), r.promptFile);
  assert.ok(fs.existsSync(path.join(dir, 'runs.json')));
});

test('the blinding holds: neither the run id nor the prompt path reveals the arm or the case', async () => {
  const { dir, base } = setup();
  const index = await planRuns({ ...base, cases: ['s01', 'b01'], arms: ['generic', 'lens', 'upstream', 'expert'], runs: 1 });
  for (const r of index) {
    // The id is random hex, so it can contain "b01" by chance: check its shape, then
    // check the rest of what the reviewer can see with the id and the random temp dir removed.
    assert.match(r.runId, /^r[0-9a-f]{10}$/, 'the run id is opaque');
    const shown = `${r.promptFile} ${r.resultFile}`.split(r.runId).join('').split(dir).join('');
    assert.ok(!/generic|lens|upstream|expert|s01|b01|seed|benign/i.test(shown), shown);
  }
  assert.strictEqual(new Set(index.map((r) => r.runId)).size, index.length, 'run ids are unique');
});

test('the order is shuffled, so launch order does not group the arms', async () => {
  const { base } = setup();
  const index = await planRuns({ ...base, cases: ['s01', 's02', 'b01'], arms: ['generic', 'lens', 'upstream', 'expert'], runs: 1, seed: 7 });
  const arms = index.map((r) => r.arm).join(',');
  assert.notStrictEqual(arms, 'generic,lens,upstream,expert,generic,lens,upstream,expert,generic,lens,upstream,expert');
});

test('loadResults turns a missing, empty or malformed result file into a failed run, never a silent skip', async () => {
  const { dir, base } = setup();
  const index = await planRuns({ ...base, cases: ['s01'], arms: ['generic', 'lens', 'upstream', 'expert'], runs: 1 });
  fs.mkdirSync(path.dirname(index[0].resultFile), { recursive: true });
  fs.writeFileSync(index[0].resultFile, JSON.stringify({ findings: [{ file: 'a', line: 1, what: 'x', confidence: 'high' }], verdict: 'v' }));
  fs.writeFileSync(index[1].resultFile, '{ not json');
  fs.writeFileSync(index[2].resultFile, JSON.stringify({ verdict: 'no findings key' }));
  const results = loadResults(index);
  assert.strictEqual(results.length, 4);
  assert.ok(Array.isArray(results[0].findings) && !results[0].error);
  for (const i of [1, 2, 3]) assert.ok(results[i].error, `run ${i} should be a failed run`);
  assert.ok(dir);
});
