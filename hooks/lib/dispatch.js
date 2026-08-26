'use strict';

// Routes a normalised hook event to the right gate and returns what the entry
// point should emit. Pure: no I/O, no environment reads, so it is testable
// row by row against the gate tables in PRD sections 5 and 5.1.

const gates = require('./gates.js');
const { canBlockWrite } = require('./adapters.js');

const WRITE_TOOLS = new Set(['write', 'edit', 'multiedit']);

/** Did this shell command run the project's verification? */
function isVerifyCommand(command, state) {
  const cmd = String(command || '').trim();
  if (!cmd) return false;
  const configured = state.data.test_command || state.data.build_command;
  if (!configured) return false;
  // Substring rather than equality: agents wrap commands in cd, &&, and quotes.
  return cmd.includes(String(configured).trim());
}

/**
 * Whether a shell command plausibly wrote to a file.
 *
 * Deliberately over-inclusive. A false positive costs one test run; a false
 * negative means source changed and the tree still looks verified.
 */
function looksLikeShellWrite(command) {
  const cmd = String(command || '');
  if (!cmd) return false;
  return (
    />>?\s*\S/.test(cmd) || // redirection into a file
    /\bsed\b[^|]*\s-i\b/.test(cmd) || // in-place sed
    /\b(tee|cp|mv|install|patch|truncate)\b/.test(cmd) ||
    /\b(mkdir|touch|rm)\b/.test(cmd) ||
    /<<-?\s*['"]?\w+/.test(cmd) // heredoc
  );
}

/**
 * @param {object} ev    normalised event from adapters.normalize
 * @param {object} state resolved state from state.readState
 * @param {object} opts  { workflowsAvailable, failed }
 * @returns {{kind: string, reason?: string, text?: string, patch?: object, note?: string}}
 */
function dispatch(ev, state, opts = {}) {
  const allow = { kind: 'allow' };
  if (!ev || !ev.event) return allow;
  if (state.stage === 'none') return allow;

  // --- G1, G2, B-G1, B-G2: pre-edit ---------------------------------------
  if (ev.event === 'preTool' && WRITE_TOOLS.has(ev.tool)) {
    const verdict = gates.preEditGate(state, { path: ev.path, cwd: ev.cwd });

    // An edit that is now permitted means the condition the violation
    // described -- an unconfirmed plan, usually -- no longer holds. Clear it
    // the moment it stops being true, not at the next green run, so stop
    // messages never quote a resolved problem back at the user.
    if (verdict.allow) {
      return state.data.gate_violation ? { kind: 'allow', patch: { gate_violation: '' } } : allow;
    }

    // Cursor ignores a deny on a write and reports success to the model, so
    // emitting one is worse than useless: it looks enforced and is not. Record
    // the violation instead and let the stop follow-up correct it.
    if (!canBlockWrite(ev.vendor)) {
      return {
        kind: 'allow',
        patch: { dirty: true, gate_violation: verdict.reason },
        note: 'detect-only on this vendor',
      };
    }
    return { kind: 'deny', reason: verdict.reason };
  }

  // --- mark the tree dirty once an edit has landed -------------------------
  if ((ev.event === 'postTool' && WRITE_TOOLS.has(ev.tool)) || ev.event === 'afterEdit') {
    const rel = ev.cwd ? gates.toProjectPath(ev.cwd, ev.path) : ev.path;
    if (rel === null || rel === '' || gates.isDocPath(rel)) return allow;
    return { kind: 'allow', patch: { dirty: true } };
  }

  // --- G4: round cap on the verify command ---------------------------------
  if ((ev.event === 'postTool' || ev.event === 'postToolFailure') && ev.tool === 'shell') {
    if (!isVerifyCommand(ev.command, state)) {
      // A shell command can write source, and the harness's own auto-mode
      // guidance actively pushes agents toward sed and heredocs for file
      // changes. Tool-name matching cannot prevent that -- only the
      // phase-scoped design can -- but the tree must not be reported clean
      // when a shell command may have written to it. Over-marking costs one
      // test run; under-marking silently loses the verification requirement.
      return looksLikeShellWrite(ev.command) ? { kind: 'allow', patch: { dirty: true } } : allow;
    }

    // No vendor puts an exit code in the payload, so pass or fail comes from
    // WHICH event fired: the failure event means the command exited non-zero.
    const passed = ev.event !== 'postToolFailure' && opts.failed !== true;
    const result = gates.roundCap(state, { passed });

    if (result.escalated && !result.alreadyEscalated) {
      return {
        kind: 'context',
        patch: result.patch,
        text: `[ultimate-workflow] Verification failed ${result.patch.verify_rounds} times. Stop here. State the problem, what changed between rounds, and the failure signature; present 2-3 options with tradeoffs; wait for the user.`,
      };
    }
    return { kind: 'allow', patch: result.patch };
  }

  // --- G3: stop ------------------------------------------------------------
  if (ev.event === 'stop') {
    // Cursor fires stop on cancelled and superseded generations too. Emitting a
    // follow-up there auto-submits a user message for a turn that did nothing,
    // which burns the loop_limit and pesters the user.
    if (ev.status && ev.status !== 'completed') return allow;

    const verdict = gates.stopGate(state);
    if (verdict.allow) return allow;

    let reason = verdict.reason;
    if (state.data.gate_violation) {
      reason = `${state.data.gate_violation} That edit was not prevented on this host, so revert it before continuing. ${reason}`;
    }
    return { kind: 'stopBlock', reason };
  }

  // --- G5: phase pointer ---------------------------------------------------
  if (ev.event === 'prompt' || ev.event === 'sessionStart') {
    const text = gates.phasePointer(state, { workflowsAvailable: opts.workflowsAvailable });
    if (!text) return allow;
    return { kind: 'context', text };
  }

  return allow;
}

module.exports = { dispatch, isVerifyCommand, looksLikeShellWrite };
