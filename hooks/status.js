#!/usr/bin/env node
'use strict';

// Answers one question the gates cannot answer for themselves:
// are they actually running?
//
// A hook the host never loaded, a hook that crashes, and a hook that correctly
// allows all look identical -- nothing blocks, nothing is logged. This reads
// the heartbeat every gate leaves behind and says which of those is true, then
// reports what would block next.
//
// Read-only by construction. It never writes, so it can be run at any time
// without disturbing the state it is describing.

const stateLib = require('./lib/state.js');
const gates = require('./lib/gates.js');
const heartbeat = require('./lib/heartbeat.js');

const out = [];
const say = (s = '') => out.push(s);

function reportLiveness(cwd, disabled) {
  const h = heartbeat.read(cwd);
  const l = heartbeat.liveness(h, { disabled });

  if (l.state === 'disabled') {
    say('Gates:   DISABLED (ULTIMATE_WORKFLOW_GATES is off)');
    say('         Nothing is being enforced. Unset the variable to re-enable.');
    return h;
  }

  if (l.state === 'never') {
    say('Gates:   NEVER RUN in this project');
    say('         The hooks are probably not loaded. Hook configuration is read');
    say('         at startup, so a registration added mid-session does not take');
    say('         effect until you restart the host.');
    return h;
  }

  const mins = Math.round(l.ageSeconds / 60);
  const ago = l.ageSeconds < 90 ? `${l.ageSeconds}s ago` : `${mins}m ago`;

  if (l.state === 'stale') {
    say(`Gates:   STALE -- last ran ${ago}, ${l.count} invocations total`);
    say('         Registered and working at some point, but quiet recently.');
  } else {
    say(`Gates:   LIVE -- last ran ${ago}, ${l.count} invocations total`);
  }
  return h;
}

function reportState(cwd) {
  const state = stateLib.readState(cwd);

  say(`Stage:   ${state.stage}`);

  if (state.stage === 'none') {
    say('         No PRD.md and no PLAN-*.md, so no gate will ever block here.');
    return;
  }

  say(`File:    ${state.file}`);

  const shown = ['plan_confirmed', 'tests_confirmed', 'prd_confirmed', 'design_confirmed', 'dirty', 'last_verify', 'verify_rounds', 'escalated', 'test_command'];
  const present = shown.filter((k) => state.data[k] !== undefined);
  if (present.length) {
    say('State:');
    for (const k of present) say(`         ${k}: ${state.data[k]}`);
  }

  // Ask the real gates rather than reimplementing their logic here.
  const edit = gates.preEditGate(state, { path: 'src/example.js' });
  const stop = gates.stopGate(state);

  say('');
  if (!edit.allow) {
    say('Blocking now:');
    say(`         ${edit.reason}`);
  } else if (!stop.allow) {
    say('Blocking now:');
    say(`         ${stop.reason}`);
  } else {
    say('Blocking now:');
    say('         Nothing blocking. Source edits and turn completion are both allowed.');
  }
}

function main() {
  const cwd = process.cwd();
  const disabled = stateLib.gatesDisabled(process.env);

  say('ultimate-workflow status');
  say('');
  reportLiveness(cwd, disabled);
  say('');
  reportState(cwd);
}

try {
  main();
} catch (err) {
  // A status report must never be the thing that fails. Say what went wrong in
  // one line, in the same voice as the rest of the output, and exit clean.
  say('');
  say(`Could not complete the report: ${err && err.message ? err.message : 'unknown error'}`);
}

process.stdout.write(`${out.join('\n')}\n`);
process.exit(0);
