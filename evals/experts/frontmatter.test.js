'use strict';

// PLAN-simplify, card frontmatter. Characterization tests: the answers the 4.8.0 code gave, recorded
// by card baseline over frozen copies of the inputs, must not move when the parser and writer are
// merged. They pass before and after the card by design; they would fail if a merge changed a value.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const memory = require(path.join(PLUGIN, 'lib', 'memory.js'));
const FIX = path.join(__dirname, 'fixtures', '4.8.0');
const read = (...p) => fs.readFileSync(path.join(FIX, ...p), 'utf8');

test('frontmatter: confirmHash of every frozen 4.8.0 plan copy equals the recorded hash', () => {
  const recorded = JSON.parse(read('recorded', 'confirm-hashes.json'));
  const rows = Object.entries(recorded);
  assert.ok(rows.length >= 12, `the table has ${rows.length} rows`);
  assert.ok(rows.some(([k]) => k === 'plan-bom-crlf.md.fixture'), 'the BOM and CRLF plan is in the table');
  assert.ok(rows.some(([k]) => k === 'plan-two-cards.md.fixture'), 'the two-Cards plan is in the table');
  assert.ok(rows.some(([k]) => k === 'plan-known-failures.md.fixture'), 'the Known failures plan is in the table');
  for (const [file, hash] of rows) assert.strictEqual(experts.confirmHash(read(file)), hash, file);
});

test('frontmatter: experts list over the frozen 4.8.0 agent files returns the recorded output for all 9 experts', () => {
  const recorded = JSON.parse(read('recorded', 'experts-list.json'));
  assert.strictEqual(recorded.experts.length, 9);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(experts.list(PLUGIN))), recorded);
  // The frozen agent files are the ones the list reads.
  for (const e of recorded.experts) assert.strictEqual(read('frozen', 'agents', `uw-expert-${e.name}.md.fixture`), fs.readFileSync(path.join(PLUGIN, 'agents', `uw-expert-${e.name}.md`), 'utf8'));
});

test('frontmatter: memory parseHeader returns the recorded 4.8.0 value for every frozen memory file copy, line-numbered errors included', () => {
  const recorded = JSON.parse(read('recorded', 'parse-header.json'));
  assert.ok(Object.keys(recorded).length >= 5);
  for (const [name, value] of Object.entries(recorded)) assert.deepStrictEqual(JSON.parse(JSON.stringify(memory.parseHeader(read('frozen', 'memory', name)))), value, name);
  // A header with a bad line still reports its line number.
  const bad = memory.parseHeader('---\ndescription: x\ncolour: blue\n---\nbody\n');
  assert.match(JSON.stringify(bad), /colour/);
});
