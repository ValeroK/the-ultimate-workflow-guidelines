'use strict';

// PLAN-simplify, card measure-experts. Nothing is cut: each expert is measured instead. The value report gives, per
// expert, the runs it took part in, its catches (confirmed, and confirmed unique to experts) and an estimated cost.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ledger = require(path.join(PLUGIN, 'experts', 'ledger.js'));
const NAMES = ['architect', 'data', 'developer', 'devops', 'frontend', 'genai', 'quality', 'security', 'softarch'];

test('value: the report shows catches and cost for each of the 9 experts from a fixture ledger', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-value-'));
  const rows = [
    { kind: 'run', id: 'r1', phase: 'review', tokens: 900, durationMs: 1000, experts: { selected: NAMES, ran: NAMES, failed: [] }, workarounds: [] },
    { kind: 'run', id: 'r2', phase: 'review', tokens: 300, durationMs: 1000, experts: { selected: ['security', 'quality', 'developer'], ran: ['security', 'quality', 'developer'], failed: [] }, workarounds: [] },
    { kind: 'catch', id: 'c1', stage: 'review', by: 'expert:security', unique: 'yes', status: 'open', what: 'a' },
    { kind: 'settle', ref: 'c1', status: 'confirmed', text: 'fixed' },
    { kind: 'catch', id: 'c2', stage: 'review', by: 'expert:security', unique: 'no', status: 'open', what: 'b' },
    { kind: 'catch', id: 'c3', stage: 'review', by: 'expert:data', unique: 'yes', status: 'open', what: 'c' },
    { kind: 'settle', ref: 'c3', status: 'refuted', text: 'not real' },
  ];
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'ledger.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const r = ledger.report(dir);
  assert.deepStrictEqual(Object.keys(r.perExpert).sort(), NAMES);
  // run r1 split 900 over 9 experts = 100 each; run r2 split 300 over 3 = 100 each for security, quality, developer
  assert.deepStrictEqual(r.perExpert.security, { runs: 2, catches: 2, confirmed: 1, uniqueConfirmed: 1, estimatedTokens: 200, tokensPerUniqueCatch: 200 });
  assert.deepStrictEqual(r.perExpert.data, { runs: 1, catches: 1, confirmed: 0, uniqueConfirmed: 0, estimatedTokens: 100, tokensPerUniqueCatch: null });
  assert.deepStrictEqual(r.perExpert.architect, { runs: 1, catches: 0, confirmed: 0, uniqueConfirmed: 0, estimatedTokens: 100, tokensPerUniqueCatch: null });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('nothing cut: 9 expert agents and 50 skills ship', () => {
  const agents = fs.readdirSync(path.join(PLUGIN, 'agents')).filter((f) => /^uw-expert-.*\.md$/.test(f));
  assert.strictEqual(agents.length, 9);
  const skills = fs.readdirSync(path.join(PLUGIN, 'experts', 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory());
  assert.strictEqual(skills.length, 50);
});
