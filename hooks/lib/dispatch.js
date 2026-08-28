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

// A `looksLikeShellWrite` heuristic used to live here, marking the tree dirty
// when a shell command appeared to write a file. Removed after three false
// positives and zero true positives in real use: a heredoc (every
// `git commit -F -`), an arrow function (every `node -e` one-liner), and
// `2>/dev/null` (ordinary stderr suppression, which writes nothing).
//
// Its own comment claimed "over-marking costs one test run". That was wrong:
// it cost a test run after nearly every command, which is how a gate gets
// switched off rather than fixed.
//
// The gap it aimed at is real -- a shell CAN write source, and the harness
// pushes agents toward sed and heredocs. But inferring intent from a command
// string is the wrong instrument. Tool scoping answers it structurally: an
// agent without Bash cannot route around anything.

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
    // Any other shell command is left alone. See the note above on why guessing
    // whether one wrote a file was abandoned.
    if (!isVerifyCommand(ev.command, state)) return allow;

    // Pass or fail must come from every signal available, not from the event
    // name alone.
    //
    // It used to come from the event name alone, on the belief that a failing
    // command arrives as `postToolFailure`. Claude Code does not appear to send
    // that event: fixtures/claude-code/PostToolUse.18.json is a non-zero-exit
    // command recorded as a plain `PostToolUse`, and no failure fixture exists
    // among the recorded payloads. So a RED verification run was scored green
    // and written to the plan as `last_verify: green` -- which does not merely
    // weaken G3 and G4, it inverts them: failing the tests was the way to
    // satisfy the gate that exists to make you pass them.
    //
    // `normalize()` already derives `ok` from `tool_response.success`, and did
    // so before this bug was found; nothing read it. Any signal saying failure
    // now means failure.
    const passed = !(ev.event === 'postToolFailure' || opts.failed === true || ev.ok === false);
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

    // A recorded violation is checked BEFORE stopGate's verdict, not after it.
    //
    // On a host that cannot block a write, a denied pre-edit is downgraded to
    // "allow, but record the violation and let the stop follow-up correct it".
    // That promise was empty: stopGate steps aside whenever no verification
    // command is configured, and the shipped plan template ships
    // `test_command: ""`. So on Cursor -- the only host this compensation
    // exists for -- G1 and G2 were bypassed, the violation was written to the
    // plan front matter, and nothing ever told anyone.
    //
    // "Revert that edit" is satisfiable with no verification command
    // configured, so this branch does not need stopGate's verdict to fire.
    if (state.data.gate_violation) {
      const tail = verdict.allow ? '' : ` ${verdict.reason}`;
      return {
        kind: 'stopBlock',
        reason: `${state.data.gate_violation} That edit was not prevented on this host, so revert it before continuing.${tail}`,
      };
    }

    if (verdict.allow) return allow;
    return { kind: 'stopBlock', reason: verdict.reason };
  }

  // --- G5: phase pointer ---------------------------------------------------
  if (ev.event === 'prompt' || ev.event === 'sessionStart') {
    const text = gates.phasePointer(state, { workflowsAvailable: opts.workflowsAvailable });
    if (!text) return allow;
    return { kind: 'context', text };
  }

  return allow;
}

module.exports = { dispatch, isVerifyCommand };
