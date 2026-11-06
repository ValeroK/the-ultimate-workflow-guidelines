'use strict';

// Harvest runs before the commit, so a commit range alone (origin/main..HEAD) is empty and the
// reader that looks at "what changed" would see nothing. It must be told to read the uncommitted
// work too. The wording of a prompt cannot be proven by a test; this keeps the instruction from
// being lost in a later edit, and checks the reader still gets the range.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const SCRIPT = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'phases', 'harvest.js');

async function readerPrompts(args) {
  const { calls } = await loadWorkflow(SCRIPT)(args, async (call) => {
    if (call.label === 'existing') return { gotchas: [], topicals: [], notes: '' };
    return { candidates: [] };
  });
  return Object.fromEntries(calls.map((c) => [c.label, c.prompt]));
}

test('the history reader is told to read the uncommitted work, not only the commit range', async () => {
  const prompts = await readerPrompts({ scope: 'a feature' });
  assert.ok(prompts.history, 'the history reader ran');
  assert.match(prompts.history, /range: origin\/main\.\.HEAD/, 'the default range is still given');
  assert.match(prompts.history, /uncommitted work/);
  assert.match(prompts.history, /git status --short/);
  assert.match(prompts.history, /git diff HEAD/);
  assert.match(prompts.history, /untracked/);
});

test('a range the caller names is passed through, and the uncommitted work is still read', async () => {
  const prompts = await readerPrompts({ scope: 'a feature', range: 'abc123..HEAD' });
  assert.match(prompts.history, /range: abc123\.\.HEAD/);
  assert.match(prompts.history, /git diff HEAD/);
});
