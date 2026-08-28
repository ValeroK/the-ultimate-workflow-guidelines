'use strict';

// Structural checks on hooks/hooks.json.
//
// This file decides whether any of the gate predicates ever run, and until
// v3.0.0 nothing read it: not one test, and not CI, whose JSON syntax check
// enumerates the three plugin manifests and stops. Delete the Stop block, drop
// Bash from the PostToolUse matcher, or leave a trailing comma, and the whole
// suite stays green while the plugin installs into the state
// memory/hooks-and-gates.md calls route 3 -- registered, correct, and inert.
//
// That state is undetectable from the outside, because gates fail open: a hook
// that never fires and a hook that correctly allowed everything produce
// identical silence. Testing the predicates while leaving their registration
// unread tests the half that was never the problem.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(__dirname, 'hooks.json');
const raw = fs.readFileSync(FILE, 'utf8');

test('hooks.json is parseable JSON', () => {
  // CI parses the three plugin manifests and not this one. A trailing comma
  // here ships a plugin whose hooks silently do not load.
  assert.doesNotThrow(() => JSON.parse(raw));
});

const config = JSON.parse(raw);

test('every event the gates depend on is registered', () => {
  // Each maps to a gate: PreToolUse -> G1/G2, PostToolUse + PostToolUseFailure
  // -> G4, Stop -> G3, UserPromptSubmit -> G5.
  for (const event of ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'UserPromptSubmit', 'Stop']) {
    assert.ok(Array.isArray(config.hooks[event]), `${event} is not registered, so its gate can never fire`);
    assert.ok(config.hooks[event].length > 0, `${event} is registered with no hooks`);
  }
});

test('gate.js is registered for every event it handles', () => {
  for (const event of ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'UserPromptSubmit', 'Stop']) {
    const commands = config.hooks[event].flatMap((g) => (g.hooks || []).map((h) => h.command || ''));
    assert.ok(
      commands.some((c) => c.includes('gate.js')),
      `${event} is registered but does not run gate.js`
    );
  }
});

test('every registered command points at a file that exists', () => {
  // The one failure mode a syntax check cannot see: valid JSON naming a script
  // that was renamed or never shipped.
  const seen = new Set();
  for (const groups of Object.values(config.hooks)) {
    for (const g of groups) {
      for (const h of g.hooks || []) {
        const m = /hooks\/([A-Za-z0-9._-]+\.js)/.exec(h.command || '');
        assert.ok(m, `cannot tell which script this command runs: ${h.command}`);
        seen.add(m[1]);
        assert.ok(
          fs.existsSync(path.join(__dirname, m[1])),
          `hooks.json registers hooks/${m[1]}, which does not exist`
        );
      }
    }
  }
  assert.ok(seen.has('gate.js'), 'gate.js is registered nowhere');
});

test('the verify-command events match Bash, or G4 never sees a test run', () => {
  // G4 counts verification rounds by watching shell commands. If Bash falls out
  // of these matchers the round cap silently stops counting and escalation
  // never happens -- the gate is present, registered, and blind.
  for (const event of ['PostToolUse', 'PostToolUseFailure']) {
    const matchers = config.hooks[event].map((g) => g.matcher || '');
    assert.ok(
      matchers.some((m) => m.split('|').includes('Bash')),
      `${event} does not match Bash, so G4 cannot observe a verification run`
    );
  }
});

test('the pre-edit matcher covers every write tool', () => {
  const matcher = config.hooks.PreToolUse.map((g) => g.matcher || '').join('|').split('|');
  for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']) {
    assert.ok(matcher.includes(tool), `PreToolUse does not match ${tool}; edits through it bypass G1 and G2`);
  }
});

test('every command is quoted, so a path with a space still runs', () => {
  // CLAUDE_PLUGIN_ROOT routinely expands under "Application Support" or
  // "Program Files". An unquoted path there fails at the shell, and the failure
  // is one more way to be installed and enforcing nothing.
  for (const groups of Object.values(config.hooks)) {
    for (const g of groups) {
      for (const h of g.hooks || []) {
        assert.match(
          h.command,
          /"\$\{CLAUDE_PLUGIN_ROOT\}\/[^"]+"/,
          `unquoted plugin path breaks on any install directory containing a space: ${h.command}`
        );
      }
    }
  }
});
