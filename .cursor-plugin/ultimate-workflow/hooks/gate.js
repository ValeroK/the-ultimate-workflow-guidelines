#!/usr/bin/env node
'use strict';

// Single entry point for every ultimate-workflow gate, on every host.
//
// Registered for all relevant hook events; it dispatches on the normalised
// event rather than needing one script per gate. The whole body is wrapped so
// that ANY internal failure exits 0 and blocks nothing -- a crashed gate must
// never be able to wedge a session. That posture is covered by a test, not
// just by this comment.
//
// Escape hatch: ULTIMATE_WORKFLOW_GATES=off disables every gate.

const fs = require('node:fs');
const path = require('node:path');

const adapters = require('./lib/adapters.js');
const stateLib = require('./lib/state.js');
const { dispatch } = require('./lib/dispatch.js');
const heartbeat = require('./lib/heartbeat.js');
const gatesLib = require('./lib/gates.js');
const experts = require('../experts/experts.js');
const verify = require('./verify.js');
const contextLib = require('./lib/context.js');
const os = require('node:os');

/**
 * The reminder to start a new session when the conversation's context is large (4.2.0). Once per
 * 150k band per session; the band reached is kept in the system temp folder, so a project that
 * does not use the workflow gets no files. Never blocks, never throws.
 */
function contextReminder(ev, env) {
  try {
    if (ev.event !== 'prompt' || !ev.transcriptPath) return null;
    const threshold = contextLib.threshold(env);
    if (!(threshold > 0)) return null;
    const tokens = contextLib.lastContextTokens(contextLib.readTail(ev.transcriptPath));
    if (!tokens) return null;
    const key = String(ev.sessionId || ev.transcriptPath).replace(/[^A-Za-z0-9_-]/g, '_').slice(-120);
    const file = path.join(os.tmpdir(), 'ultimate-workflow-reminders', `${key}.json`);
    let last = 0;
    try {
      last = JSON.parse(fs.readFileSync(file, 'utf8')).band || 0;
    } catch {}
    const d = contextLib.decide({ tokens, threshold, lastBand: last });
    if (!d.remind) return null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ band: d.band, tokens, at: new Date().toISOString() }));
    return contextLib.reminderText(tokens);
  } catch {
    return null;
  }
}

// How the gates' messages name the runner: forward slashes work for node on every OS, and
// keep a Windows path from reaching a JSON string with bare backslashes.
const VERIFY_SCRIPT = `node "${path.join(__dirname, 'verify.js').replace(/\\/g, '/')}"`;

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.on('data', (c) => {
      raw += c;
    });
    process.stdin.on('end', () => resolve(raw));
    // If stdin never closes, do nothing rather than hang the host.
    setTimeout(() => resolve(raw), 5000).unref?.();
  });
}

/**
 * Whether dynamic workflows are available (PRD open question Q4).
 *
 * There is no capability probe, and none is needed: the disable switches are
 * an environment variable read at startup and ordinary settings keys. The hook
 * detects; the skill does not guess.
 */
function workflowsAvailable(cwd, env) {
  if (env.CLAUDE_CODE_DISABLE_WORKFLOWS === '1') return false;

  const candidates = [
    path.join(cwd || '.', '.claude', 'settings.local.json'),
    path.join(cwd || '.', '.claude', 'settings.json'),
    path.join(env.CLAUDE_CONFIG_DIR || path.join(env.HOME || env.USERPROFILE || '.', '.claude'), 'settings.json'),
  ];

  for (const f of candidates) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (j.disableWorkflows === true) return false;
      if (j.enableWorkflows === false) return false;
    } catch {
      // Missing or unreadable settings tell us nothing either way.
    }
  }
  return true;
}

async function main() {
  const raw = await readStdin();
  if (!raw) return { stdout: null, exit: 0 };

  const payload = adapters.parsePayload(raw);
  const ev = adapters.normalize(payload);

  if (stateLib.gatesDisabled(process.env)) return { stdout: null, exit: 0 };

  // Everything below -- the plan, the evidence, the heartbeat, the paths an edit is judged by --
  // is read at the project root, not at the folder the host's shell happened to be in.
  const cwd = stateLib.projectRoot(ev.cwd || process.cwd());
  ev.cwd = cwd;
  const state = stateLib.readState(cwd);

  // Reading the working tree is not free, so the commit evidence is gathered only
  // for the one event that needs it. Any failure leaves it undefined, which allows.
  let commitEvidence;
  let verifyEvidence;
  if (ev.event === 'preTool' && ev.tool === 'shell' && gatesLib.isCommitCommand(ev.command)) {
    try {
      commitEvidence = experts.commitEvidence(cwd, state.file && state.stage === 'feature' ? state.file : '');
    } catch {
      commitEvidence = undefined;
    }
    if (state.data.test_command) {
      try {
        verifyEvidence = verify.fullEvidence(cwd);
      } catch {
        verifyEvidence = undefined;
      }
    }
  }

  const reminder = contextReminder(ev, process.env);
  let result = dispatch(ev, state, {
    workflowsAvailable: workflowsAvailable(cwd, process.env),
    commitEvidence,
    verifyEvidence,
    verifyScript: VERIFY_SCRIPT,
  });

  if (reminder) {
    if (result.kind === 'context') result = { ...result, text: `${result.text}\n${reminder}` };
    else if (result.kind === 'allow') result = { ...result, kind: 'context', text: reminder };
  }

  // A full run of the configured command typed directly (not through verify.js, which records
  // its own) is recorded for G7, passing or failing, against the changes as they are now.
  if (result.verified && result.verified.kind === 'full' && state.data.test_command && !/hooks[\\/]verify\.js\b/.test(ev.command || '')) {
    try {
      verify.recordFull(cwd, { passed: result.verified.passed, command: String(ev.command) });
    } catch {
      // Not recorded means the commit asks for a full run again; never a block from here.
    }
  }

  if (result.patch && state.file) {
    try {
      stateLib.patchState(state.file, result.patch);
    } catch {
      // A state write failure must not turn into a block.
    }
  }

  // Leave a trace that this gate ran, whatever it decided. Without it, "not
  // loaded", "crashed", and "allowed" are indistinguishable from outside --
  // and the first of those silently disables enforcement entirely.
  try {
    heartbeat.record(cwd, {
      at: new Date().toISOString(),
      event: ev.event,
      vendor: ev.vendor,
      stage: state.stage,
      decision: result.kind,
      deferred: result.deferred,
    });
  } catch {
    // Diagnostics must never affect a decision.
  }

  // Pass the event that actually fired. The host rejects a result whose
  // hookSpecificOutput.hookEventName does not match it, discarding everything
  // the hook had to say.
  return adapters.respond(ev.vendor, result.kind, { ...result, hookEventName: ev.rawEvent });
}

main()
  .then(({ stdout, exit }) => {
    // Gemini requires stdout to carry nothing but the final JSON.
    if (stdout) process.stdout.write(JSON.stringify(stdout));
    process.exit(exit || 0);
  })
  .catch(() => {
    // Fail OPEN. Always.
    process.exit(0);
  });
