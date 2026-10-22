'use strict';

// 4.0.1: an installed plugin registers its agents as "<plugin name>:<agent>". The workflows
// called them by the bare name, so every phase failed with "agent type not found" once
// installed, while every test here passed. These hold the namespace to the plugin's own
// name and keep every workflow on the same helper.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const WORKFLOWS = ['plan.js', 'tests.js', 'review.js', 'build.js', 'harvest.js'];
const read = (f) => fs.readFileSync(path.join(PLUGIN, 'workflows', f), 'utf8');
const block = (src) => {
  const a = src.indexOf('// --- agent names');
  const b = src.indexOf('// --- end agent names ---');
  return a === -1 || b === -1 ? null : src.slice(a, b).replace(/\r\n/g, '\n');
};

test('every workflow carries the same agent names block', () => {
  const blocks = WORKFLOWS.map((f) => [f, block(read(f))]);
  for (const [f, b] of blocks) assert.ok(b, `workflows/${f} lacks the agent names block`);
  for (const [f, b] of blocks) assert.strictEqual(b, blocks[0][1], `workflows/${f} differs from workflows/${blocks[0][0]}`);
});

test('the namespace is the plugin name from plugin.json', () => {
  const { name } = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  for (const f of WORKFLOWS) assert.ok(read(f).includes(`args.agentNamespace : '${name}:'`), `workflows/${f}`);
});

test('a local run can pass agentNamespace "" to reach agents copied to .claude/agents/', async () => {
  // Run without the harness, which insists on the prefix.
  const { stripMeta } = require('../security-expert/lib/run-workflow.js');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', stripMeta(read('plan.js')));
  const types = [];
  const agent = async (prompt, opts) => { types.push(opts.agentType); return null; };
  const parallel = async (thunks) => Promise.all(thunks.map((t) => t().catch(() => null)));
  await fn({ feature: 'x', agentNamespace: '', available: [] }, agent, parallel, () => {}, () => {});
  assert.ok(types.length > 0 && types.every((t) => t === 'uw-explorer'), JSON.stringify(types));
});

test('no agentType is passed without agentName()', () => {
  for (const f of WORKFLOWS) {
    const bare = read(f).match(/agentType:\s*(?!agentName\()[^\s,}]+/g);
    assert.deepStrictEqual(bare, null, `workflows/${f}`);
  }
});

test('every agent a workflow names exists in agents/', () => {
  for (const f of WORKFLOWS) {
    for (const [, name] of read(f).matchAll(/agentName\('([a-z-]+)'\)/g)) {
      assert.ok(fs.existsSync(path.join(PLUGIN, 'agents', `${name}.md`)), `workflows/${f} names ${name}`);
    }
  }
});
