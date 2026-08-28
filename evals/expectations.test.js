'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { FIXTURES } = require('./expectations.js');
const score = require('./lib/score.js');

// The fixture prompts live in `context-boundary.js` (a workflow script, which
// cannot be required) and the pass conditions live in `expectations.js`. That
// split is forced by the harness, not chosen -- so it needs a check, or the
// two lists drift and the scorer silently stops covering a fixture.
const WORKFLOW = fs.readFileSync(path.join(__dirname, 'context-boundary.js'), 'utf8');

function idsInWorkflow() {
  return [...WORKFLOW.matchAll(/^\s*id:\s*'([^']+)'/gm)].map((m) => m[1]);
}

test('every fixture in the workflow script has a pass condition', () => {
  const workflowIds = idsInWorkflow();
  const scored = new Set(FIXTURES.map((f) => f.id));

  assert.ok(workflowIds.length >= 8, `expected the 8 planned fixtures, parsed ${workflowIds.length}`);
  for (const id of workflowIds) {
    assert.ok(scored.has(id), `${id} runs but is never scored -- it proves nothing`);
  }
});

test('every pass condition corresponds to a fixture that actually runs', () => {
  const workflowIds = new Set(idsInWorkflow());
  for (const f of FIXTURES) {
    assert.ok(workflowIds.has(f.id), `${f.id} is scored but never run`);
  }
});

test('the two lists agree on what each fixture tests', () => {
  const labels = Object.fromEntries(
    [...WORKFLOW.matchAll(/^\s*id:\s*'([^']+)',\s*\n\s*tests:\s*'([^']+)'/gm)].map((m) => [m[1], m[2]])
  );
  for (const f of FIXTURES) {
    assert.equal(f.tests, labels[f.id], `${f.id} describes itself differently in the two files`);
  }
});

test('every fixture asserts something -- an empty expectation always passes', () => {
  const KEYS = ['mustRead', 'mustNotRead', 'mustWrite', 'mustNotWrite', 'mustMention', 'mustNotMention'];
  for (const f of FIXTURES) {
    const total = KEYS.reduce((n, k) => n + (f[k] || []).length, 0);
    assert.ok(total > 0, `${f.id} has no checks, so it cannot fail and measures nothing`);
  }
});

test('every expectation key is one the scorer actually reads', () => {
  // A typo'd key is the worst outcome here: it is silently ignored, so the
  // fixture keeps passing while covering less than it claims to.
  const KNOWN = new Set(['id', 'tests', 'mustRead', 'mustNotRead', 'mustWrite', 'mustNotWrite', 'mustMention', 'mustNotMention']);
  for (const f of FIXTURES) {
    for (const k of Object.keys(f)) {
      assert.ok(KNOWN.has(k), `${f.id} sets "${k}", which score() ignores`);
    }
  }
});

test('the negative controls are still negative', () => {
  // C2 and C7 pass by reading nothing extra. If someone gives either a
  // mustRead, the eval starts rewarding over-retrieval, which is exactly the
  // failure the controls exist to catch.
  for (const id of ['C2', 'C7']) {
    const f = FIXTURES.find((x) => x.id === id);
    assert.ok(f, `${id} is missing`);
    assert.equal((f.mustRead || []).length, 0, `${id} is a negative control and must not require a read`);
  }
});

test('the recorded runs still parse and score', () => {
  const dir = path.join(__dirname, 'results');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'no recorded runs -- the baseline is the whole point');

  for (const file of files) {
    const run = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.ok(Array.isArray(run.trajectories), `${file} has no trajectories`);
    for (const f of FIXTURES) {
      const t = run.trajectories.find((x) => x.id === f.id);
      assert.ok(t, `${file} has no trajectory for ${f.id}`);
      const r = score.score(f, t);
      assert.equal(typeof r.pass, 'boolean');
    }
  }
});
