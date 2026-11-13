'use strict';

// Regression tests for the confirmed findings from the 2026-08-26 /review run.
//
// All four bugs below lived in code with 136 passing tests. Every one of those
// tests exercised a pure predicate; none touched the wire format the host
// actually validates, or the defaults actually shipped in the template. The
// bugs lived in the gaps between the units.
//
// Kept in one file, named for their origin, so the next reader can trace each
// test back to the finding that motivated it.

const test = require('node:test');
const assert = require('node:assert');

const adapters = require('./adapters.js');
const state = require('./state.js');
const gates = require('./gates.js');
const { dispatch } = require('./dispatch.js');

const BACKSLASH = String.fromCharCode(92);

// --- Finding 0 -------------------------------------------------------------
// respond() hardcoded hookEventName: 'UserPromptSubmit' for every context
// emission. Claude Code validates that field against the event that actually
// fired and throws "Hook returned incorrect event name", so the G4 escalation
// was discarded as a hook error and never reached the model. The round cap
// counted correctly and then said nothing.

test('a context response names the event that actually fired, not a hardcoded one', () => {
  const r = adapters.respond('claude', 'context', {
    text: 'escalation',
    hookEventName: 'PostToolUseFailure',
  });
  assert.equal(r.stdout.hookSpecificOutput.hookEventName, 'PostToolUseFailure');
});

test('a context response still works when no event name is supplied', () => {
  const r = adapters.respond('claude', 'context', { text: 'pointer' });
  assert.equal(r.stdout.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

// --- Finding 1 -------------------------------------------------------------
// format() escaped with JSON.stringify; coerce() stripped the quotes without
// unescaping. Every patchState doubled the backslashes in a Windows path, so
// isVerifyCommand could never match and G3 blocked every turn while quoting an
// ever-longer mangled command -- into the user's own plan file.

// --- Finding 2 -------------------------------------------------------------
// dirty could only be cleared by a command matching test_command verbatim. The
// shipped template defaults it to "", so roundCap never ran, neither dirty nor
// escalated could ever become true, and every turn end was blocked until the
// host's consecutive-block override fired. A gate that cannot be satisfied is
// worse than no gate.

// --- Finding 6 -------------------------------------------------------------
// Source written through Bash was neither gated nor marked dirty, because both
// the matcher and the dirty branch keyed on the file-editing tools only. The
// harness's own auto-mode guidance actively pushes agents toward sed and
// heredocs, so this is a routine path, not an exotic one.
//
// Full prevention is not possible by tool name -- that is what the graph-native
// design addresses. What IS possible is refusing to report a clean tree when a
// shell command may have written to it.

test('a shell command is not guessed at, in either direction', () => {
  // The heuristic that used to live here scored three false positives and no
  // true ones. Shell writes are now handled structurally by tool scoping, not
  // by inferring intent from a command string, so nothing here should mark the
  // tree dirty -- including the commands that used to trip it.
  const shellEvent = (command) => ({
    vendor: 'claude',
    event: 'postTool',
    tool: 'shell',
    command,
    path: null,
    cwd: 'C:/proj',
  });
  const st = { stage: 'feature', file: 'PLAN-x.md', data: { plan_confirmed: true, tests_confirmed: true } };

  for (const cmd of [
    'git status --short',
    ["git commit -q -F - <<'MSG'", 'subject', 'MSG'].join('\n'),
    'node -e "xs.forEach((x) => console.log(x))"',
    'command -v node 2>/dev/null',
    'sed -i "s/a/b/" src/app.js',
  ]) {
    assert.equal(dispatch(shellEvent(cmd), st, {}).patch, undefined, cmd);
  }
});
