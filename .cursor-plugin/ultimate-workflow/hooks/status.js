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
//
// One compute pass, two renderers: `report()` gathers the facts, the human
// report and `--json` both render that same object, so they cannot disagree.

const stateLib = require('./lib/state.js');
const gates = require('./lib/gates.js');
const heartbeat = require('./lib/heartbeat.js');

const out = [];
const say = (s = '') => out.push(s);

// `gate_violation` is here because on a host that cannot block a write it is
// the ONLY trace that a gate was bypassed. Omitting it meant the violation was
// recorded in the plan front matter and shown to nobody, which is the same as
// not recording it. Keys are filtered to those actually present, so this widens
// nothing on a clean plan.
const SHOWN = ['plan_confirmed', 'tests_confirmed', 'prd_confirmed', 'design_confirmed', 'dirty', 'last_verify', 'verify_rounds', 'escalated', 'test_command', 'gate_violation'];

/**
 * The whole report as data. Shape pinned by PLAN-status-json.md; renaming a key
 * is a contract change.
 *
 * Never throws: a report must never be the thing that fails, and the shape has
 * to survive the failure too, or every consumer reading `blocking.blocked` gets
 * `undefined` on the one path that needed it.
 */
function report(cwd, env) {
  const disabled = stateLib.gatesDisabled(env);
  const liveness = heartbeat.liveness(heartbeat.read(cwd), { disabled });

  try {
    const state = stateLib.readState(cwd);

    const shown = {};
    for (const k of SHOWN) if (state.data[k] !== undefined) shown[k] = state.data[k];

    // Ask the real gates rather than reimplementing their logic here.
    const edit = gates.preEditGate(state, { path: 'src/example.js' });
    const stop = gates.stopGate(state);
    const reason = !edit.allow ? edit.reason : !stop.allow ? stop.reason : null;

    return {
      liveness,
      stage: state.stage,
      file: state.file,
      state: shown,
      blocking: { blocked: reason !== null, reason },
      g3Active: state.stage !== 'none' && Boolean(state.data.test_command || state.data.build_command),
    };
  } catch (err) {
    return {
      liveness,
      stage: 'none',
      file: null,
      state: {},
      blocking: { blocked: false, reason: null },
      g3Active: false,
      error: err && err.message ? err.message : 'unknown error',
    };
  }
}

function reportLiveness(l) {
  if (l.state === 'disabled') {
    say('Gates:   DISABLED (opt-in; ULTIMATE_WORKFLOW_GATES is not set to on)');
    say('         Nothing is being enforced. Set ULTIMATE_WORKFLOW_GATES=on to enable.');
    return;
  }

  if (l.state === 'never') {
    say('Gates:   NEVER RUN in this project');
    say('         The hooks are probably not loaded. Hook configuration is read');
    say('         at startup, so a registration added mid-session does not take');
    say('         effect until you restart the host.');
    return;
  }

  const mins = Math.round(l.ageSeconds / 60);
  const ago = l.ageSeconds < 90 ? `${l.ageSeconds}s ago` : `${mins}m ago`;

  if (l.state === 'stale') {
    say(`Gates:   STALE -- last ran ${ago}, ${l.count} invocations total`);
    say('         Registered and working at some point, but quiet recently.');
  } else {
    say(`Gates:   LIVE -- last ran ${ago}, ${l.count} invocations total`);
  }
}

function reportState(r) {
  say(`Stage:   ${r.stage}`);

  if (r.stage === 'none') {
    say('         No PRD.md and no PLAN-*.md, so no gate will ever block here.');
    return;
  }

  say(`File:    ${r.file}`);

  const present = Object.entries(r.state);
  if (present.length) {
    say('State:');
    for (const [k, v] of present) say(`         ${k}: ${v}`);
  }

  say('');
  say('Blocking now:');
  say(`         ${r.blocking.reason || 'Nothing blocking. Source edits and turn completion are both allowed.'}`);

  // G3 cannot fire without a command to verify with, and the shipped plan
  // template leaves it empty. Silence there would read as "the gate is fine",
  // which is exactly the confusion this tool exists to prevent.
  if (!r.g3Active) {
    say('');
    say('Note:    G3 (verify before finishing) is INACTIVE -- no test_command is set.');
    say(`         Set test_command in ${r.file} to turn it on.`);
  }
}

const r = report(process.cwd(), process.env);

if (process.argv.slice(2).includes('--json')) {
  process.stdout.write(`${JSON.stringify(r)}\n`);
} else {
  say('ultimate-workflow status');
  say('');
  reportLiveness(r.liveness);
  say('');
  reportState(r);

  // A status report must never be the thing that fails. Say what went wrong in
  // one line, in the same voice as the rest of the output, and exit clean.
  if (r.error) {
    say('');
    say(`Could not complete the report: ${r.error}`);
  }

  process.stdout.write(`${out.join('\n')}\n`);
}

process.exit(0);
