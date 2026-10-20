'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { lintChecklist, SECURITY_PROFILE, GENERIC_PROFILE } = require('../security-expert/lib/checklist-lint.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const developer = fs.readFileSync(path.join(PLUGIN, 'experts', 'developer', 'references', 'review.md'), 'utf8');
const security = fs.readFileSync(path.join(PLUGIN, 'experts', 'security', 'references', 'review.md'), 'utf8');

test('a craft checklist passes the generic profile without any source-to-sink wording', () => {
  assert.doesNotMatch(developer.toLowerCase(), /\bsink\b/);
  assert.deepEqual(lintChecklist(developer, GENERIC_PROFILE), []);
});

test('the security profile still requires source and sink, so the craft checklist fails it', () => {
  const problems = lintChecklist(developer, SECURITY_PROFILE);
  assert.ok(problems.some((p) => /"source"/.test(p)), problems.join(' | '));
  assert.ok(problems.some((p) => /"sink"/.test(p)), problems.join(' | '));
});

test('the security checklist passes the security profile', () => {
  assert.deepEqual(lintChecklist(security, SECURITY_PROFILE), []);
});

test('where and how a finding is shown (file, line, evidence) is the protocol\'s, not each checklist\'s', () => {
  const protocol = fs.readFileSync(path.join(PLUGIN, 'experts', 'protocol.md'), 'utf8');
  for (const word of ['file and line', 'evidence']) assert.ok(protocol.toLowerCase().includes(word), `protocol must say "${word}"`);
});

test('profile shape words are what the lint reads, not a fixed list', () => {
  assert.deepEqual(GENERIC_PROFILE.shapeWords, []);
  assert.deepEqual(SECURITY_PROFILE.shapeWords, ['source', 'sink']);
});
