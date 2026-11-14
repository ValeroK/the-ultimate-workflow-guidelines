#!/usr/bin/env node
'use strict';

// What the workflow says about this project right now: the reminders a turn would get, what the commit
// check would say about a commit made now, and when the commit check last ran.
//
// Read-only by construction. It never writes, so it can be run at any time without disturbing the state it
// is describing. It asks the real functions (gates.reminders, gates.commitGate) rather than restating them,
// so the report and the hook cannot disagree.
//
// One compute pass, two renderers: `report()` gathers the facts, the human report and `--json` both render
// that same object.

const stateLib = require('./lib/state.js');
const gates = require('./lib/gates.js');
const fs = require('node:fs');
const path = require('node:path');
const expertsLib = require('../experts/experts.js');

const out = [];
const say = (s = '') => out.push(s);

const SHOWN = ['plan_confirmed', 'tests_confirmed', 'prd_confirmed', 'design_confirmed', 'test_command'];

/**
 * Where the domain experts stand: what the plan decided, and whether a commit would pass the commit check
 * right now. Never throws.
 */
function expertsReport(cwd, state) {
  if (state.stage !== 'feature' || !state.file) return null;
  try {
    const parsed = expertsLib.readExperts(fs.readFileSync(state.file, 'utf8'));
    const evidence = expertsLib.commitEvidence(cwd, state.file, undefined, { stage: state.stage, script: expertsLib.verifyScript() });
    const verdict = gates.commitGate(evidence);
    return {
      decided: parsed.present,
      selected: parsed.experts,
      available: expertsLib.list().experts.map((e) => e.name),
      effective: (() => {
        try {
          const e = expertsLib.effectiveExperts(cwd, state.file);
          return { source: e.source, cards: e.cards, experts: e.experts, planExperts: e.planExperts, ...(e.reason ? { reason: e.reason } : {}) };
        } catch {
          return null;
        }
      })(),
      openFindings: (evidence.open || []).length,
      commit: verdict.allow ? { allowed: true, reason: null, ...(verdict.outcome ? { outcome: verdict.outcome, why: verdict.why } : {}), missing: [] } : { allowed: false, reason: verdict.reason, missing: (verdict.missing || []).map((m) => m.kind) },
      lastCheck: stateLib.readCommitStamp(cwd),
    };
  } catch (err) {
    return { decided: false, selected: [], available: [], openFindings: 0, commit: { allowed: true, reason: null, missing: [] }, lastCheck: null, error: err && err.message ? err.message : 'unknown error' };
  }
}

/**
 * The last full test run: 'never', 'fresh' (passed, at the current changes), 'stale' (passed, but the
 * changes moved since), 'failed', or 'n/a' (no test_command, or nothing that needs one). Computed by the same
 * code the commit check uses.
 */
function fullVerifyReport(cwd, state) {
  if (state.stage === 'none' || !state.data.test_command) return 'n/a';
  let ev;
  try {
    ev = expertsLib.testsEvidence(cwd, expertsLib.workingChanges(cwd, state.file || ''), state.file || '');
  } catch {
    return 'n/a';
  }
  if (ev.skip) return 'n/a';
  const r = ev.record;
  if (!r || r.mode !== 'full') return 'never';
  if (r.passed !== true) return 'failed';
  return r.fingerprint === ev.hash ? 'fresh' : 'stale';
}

/**
 * The whole report as data. Never throws: a report must never be the thing that fails, and the shape has
 * to survive the failure too.
 */
function report(cwd, env) {
  const disabled = stateLib.gatesDisabled(env);
  // 4.8.0 wrote a heartbeat on every hook event; nothing reads or writes it now.
  const leftoverHeartbeat = fs.existsSync(path.join(cwd, '.ultimate-workflow', 'heartbeat.json'));
  try {
    const state = stateLib.readState(cwd);
    const shown = {};
    for (const k of SHOWN) if (state.data[k] !== undefined) shown[k] = state.data[k];
    let codeChanged = false;
    const fullVerify = fullVerifyReport(cwd, state);
    if (fullVerify === 'never' || fullVerify === 'stale' || fullVerify === 'failed') codeChanged = true;
    return {
      gates: disabled ? 'disabled' : 'enabled',
      stage: state.stage,
      file: state.file,
      state: shown,
      reminders: gates.reminders(state, { codeChanged, script: expertsLib.verifyScript() }),
      experts: expertsReport(cwd, state),
      fullVerify,
      lastCheck: stateLib.readCommitStamp(cwd),
      leftoverHeartbeat,
    };
  } catch (err) {
    return { gates: disabled ? 'disabled' : 'enabled', stage: 'none', file: null, state: {}, reminders: [], experts: null, fullVerify: 'n/a', lastCheck: null, leftoverHeartbeat, error: err && err.message ? err.message : 'unknown error' };
  }
}

function render(r) {
  say('ultimate-workflow status');
  say('');
  if (r.gates === 'disabled') {
    say('Gates:   DISABLED (ULTIMATE_WORKFLOW_GATES is set to off)');
    say('         Nothing is being checked. Unset it, or set it to on, to enable.');
    say('');
  }
  say(`Stage:   ${r.stage}`);
  if (r.stage === 'none') {
    say('         No open plan and no PRD.md, so the commit check has nothing to judge here.');
  } else {
    say(`File:    ${r.file || '(none chosen)'}`);
    const present = Object.entries(r.state);
    if (present.length) {
      say('State:');
      for (const [k, v] of present) say(`         ${k}: ${v}`);
    }
  }

  say('');
  say('Reminders:');
  if (r.reminders.length === 0) say('         none');
  for (const line of r.reminders) say(`         ${line}`);

  const e = r.experts;
  if (e) {
    say('');
    say('Experts:');
    say(`         ${e.decided ? `decided: [${e.selected.join(', ')}]` : 'no decision recorded in the plan yet'}`);
    if (e.effective && e.effective.source === 'card' || e.effective.source === 'cards') {
      say(`         card ${e.effective.cards.join(', ')}: [${e.effective.experts.join(', ')}] (plan: ${e.effective.planExperts.length}) -- the commit is held to these`);
    }
    say(`         available: ${e.available.join(', ') || 'none'}`);
    if (e.openFindings > 0) say(`         open high-confidence findings: ${e.openFindings} (node experts/experts.js findings)`);
    say(`         commit: ${e.commit.allowed ? 'allowed now' : `BLOCKED -- ${e.commit.reason}`}`);
    if (e.commit.outcome) say(`         this commit would not be checked: ${e.commit.outcome}${e.commit.why ? ` (${e.commit.why})` : ''}`);
  }

  if (r.fullVerify && r.fullVerify !== 'n/a') {
    const says = {
      never: 'NONE yet for these changes -- a commit is refused until `node hooks/verify.js --full` passes',
      fresh: 'passed, and covers the current changes',
      stale: 'passed, but the changes moved since -- a commit is refused until it runs again',
      failed: 'FAILED -- a commit is refused until it passes',
    };
    say('');
    say(`Full test run: ${says[r.fullVerify]}`);
  }

  const last = r.lastCheck;
  say('');
  say(`Last commit check: ${last ? `${last.outcome}${last.why ? ` (${last.why})` : ''}${last.missing && last.missing.length ? `, missing ${last.missing.join(', ')}` : ''} at ${last.at}` : 'none yet'}`);
  if (!last) say('         It is written when a commit is checked. If commits happen and it stays empty, the hook is not registered: restart the host.');

  if (r.leftoverHeartbeat) {
    say('');
    say('Note:    .ultimate-workflow/heartbeat.json is left over from an older version. Nothing reads it; it can be deleted.');
  }
  if (r.error) {
    say('');
    say(`Could not complete the report: ${r.error}`);
  }
}

const r = report(stateLib.projectRoot(process.cwd()), process.env);

if (process.argv.slice(2).includes('--json')) {
  process.stdout.write(`${JSON.stringify(r)}\n`);
} else {
  render(r);
  process.stdout.write(`${out.join('\n')}\n`);
}

process.exit(0);
