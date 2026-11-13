'use strict';

// Routes a normalised hook event to what the entry point should emit. Pure: no I/O, no environment
// reads, so it is testable row by row.
//
// Since 5.0.0 only one thing here refuses: a `git commit`, through the one commit check
// (gates.commitGate). Every other event reminds or records, and none of them blocks an edit or a turn
// from ending. Hooks write nothing to the plan.

const gates = require('./gates.js');
const { canBlockWrite } = require('./adapters.js');

const VERIFY_SCRIPT = /hooks[\\/]verify\.js\b/;
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What kind of verification this shell command ran: 'full', 'related' or null (none).
 *
 * Full is only the plugin's `verify.js --full`, or the configured command as the whole of the
 * last simple command (after `cd x &&` and the like), with nothing appended. Anything else that
 * contains the configured command -- `npm test -- one.test.ts`, `npm test 2>&1 | tail` -- narrows
 * or masks the run and is related: it never counts for the commit check. Until 4.1.1 every
 * such run counted as the whole suite, because this was a bare substring match.
 */
function verifyKind(command, state) {
  const cmd = String(command || '').trim();
  if (!cmd) return null;
  if (VERIFY_SCRIPT.test(cmd)) return /(^|\s)--full(\s|$)/.test(cmd) ? 'full' : 'related';
  const configured = String(state.data.test_command || state.data.build_command || '').trim();
  if (!configured || !cmd.includes(configured)) return null;
  return new RegExp(`(^|&&|;|\\|\\||\\()\\s*${reEscape(configured)}\\s*\\)?\\s*$`).test(cmd) ? 'full' : 'related';
}

/** Did this shell command run the project's verification, whole or narrowed? */
function isVerifyCommand(command, state) {
  return verifyKind(command, state) !== null;
}

/**
 * @param {object} ev    normalised event from adapters.normalize
 * @param {object} state resolved state from state.readState
 * @param {object} opts  { workflowsAvailable, commitEvidence, codeChanged, verifyScript }
 * @returns {{kind: string, reason?: string, text?: string, say?: string, note?: string, check?: object, verified?: object}}
 */
function dispatch(ev, state, opts = {}) {
  const allow = { kind: 'allow' };
  if (!ev || !ev.event) return allow;

  const isCommit = ev.event === 'preTool' && ev.tool === 'shell' && gates.isCommitCommand(ev.command);
  if (state.stage === 'none') {
    // No plan and no PRD: nothing to check. A commit says so, and the stamp records it.
    if (!isCommit) return allow;
    const why = 'no plan is open in the project';
    return { kind: 'allow', say: `Commit check: this commit was not checked (exempt: ${why}).`, check: { outcome: 'exempt', why, missing: [] } };
  }

  // Several open plans and none chosen: no plan is guessed, so there is nothing to judge the commit by. It goes
  // through, says so, and names the command that picks one (owner decision, 2026-11-13).
  if (isCommit && state.stage === 'feature' && !state.file) {
    const why = 'several plans and no active plan chosen';
    return { kind: 'allow', say: `Commit check: this commit was not checked (exempt: ${why}). Pick the plan with: node experts/experts.js use --plan <file>`, check: { outcome: 'exempt', why, missing: [] } };
  }

  // --- the one commit check: confirmation, a full run, the experts, memory -----------------------
  if (isCommit) {
    // The evidence is gathered by the entry point, only for a commit, because it reads the working tree.
    if (!opts.commitEvidence) {
      const why = 'the commit evidence could not be gathered';
      return { kind: 'allow', say: `Commit check: could not check this commit (${why}). It goes through unchecked.`, check: { outcome: 'could-not-check', why, missing: [] } };
    }
    const verdict = gates.commitGate(opts.commitEvidence);
    const check = gates.checkRecord(verdict);
    const notes = (verdict.notices || []).map((n) => `Plan settings: ${n}.`);
    if (verdict.allow) {
      // By hand, a check that cannot be satisfied lets the commit through and says so. The run parks instead.
      if (verdict.outcome === 'could-not-check') return { kind: 'allow', say: [`Commit check: could not check this commit (${verdict.why}). It goes through unchecked.`, ...notes].join('\n'), check };
      if (verdict.outcome === 'exempt') return { kind: 'allow', say: [`Commit check: this commit was not checked (exempt: ${verdict.why}).`, ...notes].join('\n'), check };
      if (notes.length > 0) return { kind: 'allow', say: notes.join('\n'), check };
      return { ...allow, check };
    }
    if (!canBlockWrite(ev.vendor)) return { kind: 'allow', note: 'detect-only on this vendor', reason: verdict.reason, check };
    return { kind: 'deny', reason: verdict.reason, check };
  }

  // --- a full run of the project's test command, typed directly: recorded for the commit check ----
  if ((ev.event === 'postTool' || ev.event === 'postToolFailure') && ev.tool === 'shell') {
    const kind = verifyKind(ev.command, state);
    if (kind !== 'full') return allow;
    // Pass or fail must come from every signal available, not from the event name alone: a non-zero
    // exit has been recorded as a plain PostToolUse (fixtures/claude-code/PostToolUse.18.json).
    const passed = !(ev.event === 'postToolFailure' || opts.failed === true || ev.ok === false);
    return { kind: 'allow', verified: { kind, passed } };
  }

  // --- reminders ------------------------------------------------------------------------------------
  if (ev.event === 'stop') {
    // Cursor fires stop on cancelled and superseded generations too; nothing is said for a turn that did nothing.
    if (ev.status && ev.status !== 'completed') return allow;
    const lines = gates.reminders(state, { codeChanged: opts.codeChanged, script: opts.verifyScript });
    return lines.length > 0 ? { kind: 'notice', text: lines.join('\n') } : allow;
  }

  if (ev.event === 'prompt' || ev.event === 'sessionStart') {
    const pointer = gates.phasePointer(state, { workflowsAvailable: opts.workflowsAvailable });
    const lines = gates.reminders(state, { codeChanged: opts.codeChanged, script: opts.verifyScript });
    const text = [pointer, ...lines].filter(Boolean).join('\n');
    return text ? { kind: 'context', text } : allow;
  }

  return allow;
}

module.exports = { dispatch, isVerifyCommand, verifyKind };
