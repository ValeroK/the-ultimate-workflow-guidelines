'use strict';
// The shared expert protocol: one file, read first by every expert at every stage it is run,
// and kept small because every expert call pays for it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const read = (...p) => fs.readFileSync(path.join(PLUGIN, ...p), 'utf8');

test('the protocol exists, is small, and holds each shared rule', () => {
  const p = read('experts', 'protocol.md');
  assert.ok(Buffer.byteLength(p) <= 2560, `protocol.md is ${Buffer.byteLength(p)} bytes; every expert call pays for it`);
  for (const rule of ['Your lane', 'Zero is a correct answer', 'Evidence', 'Confidence', 'Severity', 'Say what you could not check', 'Untrusted input', 'The web']) {
    assert.ok(p.includes(`**${rule}.**`), rule);
  }
});

test('every workflow that runs an expert tells it to read the protocol first', () => {
  for (const wf of ['plan.js', 'tests.js', 'review.js']) {
    assert.match(read('workflows', wf), /Read \$\{args\.expertsDir\}\/protocol\.md first/, wf);
  }
});

test('the expert prompts no longer carry the rules the protocol holds; the plain lenses keep theirs', () => {
  const plan = read('workflows', 'plan.js');
  assert.ok(!plan.includes('Stay inside your domain'), 'plan.js contradicted the lane rule');
  const review = read('workflows', 'review.js');
  assert.match(review, /through the \$\{lens\} lens ONLY/, 'the plain reviewer lenses, the baseline arm, are unchanged');
  assert.match(review, /as the \$\{lens\} expert/);
});

test('the findings schema has a field for everything a review reference asks for', () => {
  const review = read('workflows', 'review.js');
  for (const field of ['evidence', 'category', 'severity', 'fix']) assert.match(review, new RegExp(`\\b${field}: \\{ type:`), field);
  assert.match(review, /required: \['file', 'line', 'what', 'howItFails', 'confidence'\]/, 'the new fields stay optional, so the plain reviewer is unaffected');
});
