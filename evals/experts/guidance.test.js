'use strict';

// Two things the re-wash sessions had to work out for themselves because the commands were silent:
// what to do while a build workflow runs, and that the experts' `record` and the commit are two
// commands. See PLAN-run-records.md.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

test('the build command says to end the turn after launching the workflow, and not to poll', () => {
  const text = read('commands/build.md');
  assert.match(text, /end your turn/i);
  assert.match(text, /do not poll/i);
  assert.match(text, /notification/i, 'the host reports the end of the run; the session does not have to look');
  assert.match(text, /G3/, 'G3 waits for the workflow, which is what makes ending the turn safe');
});

test('the build command does not ask for periodic progress checks of its own', () => {
  const text = read('commands/build.md');
  assert.doesNotMatch(text, /every \d+ minutes/i);
});

test('the experts command says record, check and the commit are separate commands', () => {
  const text = read('commands/experts.md');
  assert.match(text, /separate command/i);
  assert.match(text, /git commit/);
  assert.match(text, /&&/, 'it names the chaining it forbids');
});
