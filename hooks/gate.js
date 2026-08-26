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

  const cwd = ev.cwd || process.cwd();
  const state = stateLib.readState(cwd);

  const result = dispatch(ev, state, {
    workflowsAvailable: workflowsAvailable(cwd, process.env),
  });

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
    });
  } catch {
    // Diagnostics must never affect a decision.
  }

  return adapters.respond(ev.vendor, result.kind, result);
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
