'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const P = '.cursor-plugin/ultimate-workflow/';

// 4.1.0: one command runs the workflow at a chosen tier, and the gates are on by default.
// These pin what the command promises and that no doc still tells the user the gates are opt-in.

const FEATURE = read(P + 'commands/feature.md');

test('the feature command names the three tiers and runs the phases through their own files', () => {
  for (const tier of ['Skip', 'Light', 'Full']) assert.match(FEATURE, new RegExp(`\\*\\*${tier}\\*\\*`));
  for (const phase of ['plan', 'tests', 'build', 'review', 'experts', 'harvest']) {
    assert.match(FEATURE, new RegExp('`' + phase + '\\.md`'), phase);
  }
  assert.match(FEATURE, /\$\{CLAUDE_PLUGIN_ROOT\}\/commands\//);
});

test('the feature command keeps both confirmations as stops and never runs a script itself', () => {
  assert.equal((FEATURE.match(/Stop for the user's confirmation of the plan/g) || []).length, 2);
  assert.equal((FEATURE.match(/Stop for the user's confirmation of the Tests section/g) || []).length, 2);
  assert.match(FEATURE, /never yours/);
  assert.doesNotMatch(FEATURE, /script --phase/);
});

test('a PRD runs the bootstrap, then one full flow per roadmap milestone', () => {
  assert.match(FEATURE, /project-bootstrap-guidelines/);
  assert.match(FEATURE, /once per roadmap milestone/);
  assert.match(FEATURE, /never one plan for the whole PRD/);
});

test('the workflow docs point at the feature command and the tiers', () => {
  for (const rel of [P + 'skills/the-ultimate-workflow-guidelines/SKILL.md', P + 'rules/the-ultimate-workflow-guidelines.mdc', 'AGENTS.md', 'README.md']) {
    const doc = read(rel);
    assert.match(doc, /\/ultimate-workflow:feature/, rel);
    assert.match(doc, /\*\*Light\*\*/, rel);
  }
});

test('no doc still says the gates are opt-in or off by default', () => {
  const docs = ['README.md', 'AGENTS.md', 'docs/gates.md', 'docs/index.html', 'docs/adding-an-expert.md',
    P + 'skills/the-ultimate-workflow-guidelines/SKILL.md', P + 'memory/hooks-and-gates.md',
    '.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json',
    P + '.claude-plugin/plugin.json', P + '.cursor-plugin/plugin.json'];
  for (const rel of docs) {
    const doc = read(rel);
    assert.doesNotMatch(doc, /opt-in (lifecycle )?gates|gates?[^.\n]{0,40}\boff by default|GATES=on\b|off unless you turn the gates on|\bare \*\*opt-in\*\*/i, rel);
  }
  assert.match(read('docs/gates.md'), /\*\*on by default\*\*/);
});
