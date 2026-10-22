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

const { spawnSync } = require('node:child_process');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const ex = require(path.join(PLUGIN, 'experts', 'experts.js'));

test('every workflow pastes the protocol it is sent, and falls back to naming the file', () => {
  for (const wf of ['plan.js', 'tests.js', 'review.js']) {
    const src = read('phases', wf);
    assert.match(src, /args\.skills\._protocol/, `${wf} reads the protocol from the skills object`);
    assert.match(src, /THE PROTOCOL every expert follows/, wf);
    assert.match(src, /Read \$\{dir\}\/protocol\.md first/, `${wf} still names the file when nothing was sent`);
  }
});

test('experts.js sends the protocol with the skills at plan and tests', () => {
  const cli = path.join(PLUGIN, 'experts', 'experts.js');
  const plan = spawnSync(process.execPath, [cli, 'skills', '--stage', 'plan'], { encoding: 'utf8' });
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(JSON.parse(plan.stdout)._protocol, read('experts', 'protocol.md').trim());
});

test('review.js: an expert gets the protocol text in its prompt; a plain lens does not', async () => {
  const available = ex.list(PLUGIN).experts;
  const args = { available, experts: ['developer'], diffFile: '.ultimate-workflow/review.diff', expertsDir: '/p/experts', skills: { _protocol: 'MARKER-PROTOCOL rules' } };
  const clean = (call) => (call.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: `clean through ${call.label}` });
  const { calls } = await loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'))(args, clean);
  const dev = calls.find((c) => c.label === 'developer');
  assert.match(dev.prompt, /THE PROTOCOL every expert follows:\nMARKER-PROTOCOL/);
  assert.ok(!dev.prompt.includes('protocol.md first'), 'pasted, so not also told to open it');
  assert.ok(!calls.find((c) => c.label === 'correctness').prompt.includes('MARKER-PROTOCOL'), 'the plain reviewer, the baseline arm, is unchanged');
});

test('plan.js: the protocol entry is not offered as an expert\'s skills', async () => {
  const available = ex.list(PLUGIN).experts;
  let asked = null;
  await loadWorkflow(path.join(PLUGIN, 'phases', 'plan.js'))({ feature: 'add a retry', available, expertsDir: '/p/experts', skills: { _protocol: 'MARKER-PROTOCOL' } }, (call) => {
    if (!asked) asked = call;
    return { experts: [], skills: [] };
  });
  assert.ok(asked && !asked.prompt.includes('MARKER-PROTOCOL'), 'the selection call is not offered the protocol');
});

test('the expert prompts no longer carry the rules the protocol holds; the plain lenses keep theirs', () => {
  const plan = read('phases', 'plan.js');
  assert.ok(!plan.includes('Stay inside your domain'), 'plan.js contradicted the lane rule');
  const review = read('phases', 'review.js');
  assert.match(review, /through the \$\{lens\} lens ONLY/, 'the plain reviewer lenses, the baseline arm, are unchanged');
  assert.match(review, /as the \$\{lens\} expert/);
});

test('the findings schema has a field for everything a review reference asks for', () => {
  const review = read('phases', 'review.js');
  for (const field of ['evidence', 'category', 'severity', 'fix']) assert.match(review, new RegExp(`\\b${field}: \\{ type:`), field);
  assert.match(review, /required: \['file', 'line', 'what', 'howItFails', 'confidence'\]/, 'the new fields stay optional, so the plain reviewer is unaffected');
});
