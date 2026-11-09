'use strict';

// PLAN-autopilot.md, criterion 1, held to the recorded end-to-end runs: the main conversation of an
// N-card run stays within 1.5x of a 1-card run's. A new recording replaces the file; this keeps a
// regression in the recorded numbers, or a hand edit that breaks them, from passing unseen.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, 'results', '2026-11-07-e2e.json');
const r = JSON.parse(fs.readFileSync(FILE, 'utf8'));

test('criterion 1: the four-card main conversation is within 1.5x of the one-card one', () => {
  const one = r.runs.oneCard.usage.main.tokens;
  const four = r.runs.fourCards.usage.main.tokens;
  assert.ok(one > 0 && four > 0);
  assert.ok(four / one <= 1.5, `${four} / ${one}`);
  assert.equal(r.criterion1.ratio, Math.round((four / one) * 1000) / 1000);
  assert.equal(r.criterion1.met, true);
  assert.equal(r.runs.fourCards.usage.main.turns, r.runs.oneCard.usage.main.turns, 'the main conversation does the same steps whatever the number of cards');
});

test('the recorded runs committed every planned card and parked none', () => {
  for (const name of ['add', 'sub', 'parse', 'format']) assert.ok(r.runs.fourCards.committed.includes(name), name);
  assert.deepStrictEqual(r.runs.fourCards.parked, []);
  assert.ok(r.runs.oneCard.committed.includes('add'));
});

test('the recorded files hold no local user path', () => {
  const dir = path.join(__dirname, 'results');
  const files = [FILE, ...fs.readdirSync(path.join(dir, '2026-11-07-e2e')).map((f) => path.join(dir, '2026-11-07-e2e', f))];
  for (const f of files) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /C:[\\/]+Users[\\/]+[a-z]/i, f);
});
