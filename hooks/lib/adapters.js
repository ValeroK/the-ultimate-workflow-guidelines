'use strict';

// Vendor adapters: translate each host's hook wire format to and from one
// canonical shape. The gate predicates in gates.js decide; these only translate.
//
// Everything here that looks arbitrary was measured from recorded payloads
// rather than read from documentation. See PLAN-hook-gates.md for the defects
// that motivated each piece.

/** Canonical events the gates care about. */
// preTool | postTool | afterEdit | prompt | stop

const GEMINI_EVENTS = {
  BeforeTool: 'preTool',
  AfterTool: 'postTool',
  // Gemini has no distinct tool-failure event, so a red verification cannot be
  // detected from the event alone the way it can elsewhere. See dispatch.js.
  BeforeAgent: 'prompt',
  AfterAgent: 'stop',
  SessionStart: 'sessionStart',
  PreCompress: 'preCompact',
};

const CLAUDE_EVENTS = {
  PreToolUse: 'preTool',
  PostToolUse: 'postTool',
  PostToolUseFailure: 'postToolFailure',
  UserPromptSubmit: 'prompt',
  Stop: 'stop',
  SubagentStop: 'stop',
  SessionStart: 'sessionStart',
  PreCompact: 'preCompact',
};

const CURSOR_EVENTS = {
  preToolUse: 'preTool',
  postToolUse: 'postTool',
  postToolUseFailure: 'postToolFailure',
  afterFileEdit: 'afterEdit',
  beforeSubmitPrompt: 'prompt',
  stop: 'stop',
  sessionStart: 'sessionStart',
  preCompact: 'preCompact',
};

/**
 * Whether a vendor's pre-tool hook can actually prevent a file write.
 *
 * Measured, not assumed. Cursor honours a deny for Read and ignores it for
 * Write: the file is created and the following postToolUse reports
 * success: true, so the model is never told it was blocked. Confirmed across
 * three independent runs on Cursor 3.17.19, 2026-08-25.
 *
 * Codex and Gemini are documented as supporting it and are marked true, but
 * neither has been measured -- record fixtures with hooks/dev/record.js and
 * verify before relying on them.
 */
const CAN_BLOCK_WRITE = {
  claude: true,
  gemini: true,
  cursor: false,
};

function canBlockWrite(vendor) {
  return CAN_BLOCK_WRITE[vendor] !== false;
}

/**
 * Parse a hook payload.
 *
 * Cursor prefixes every payload with a UTF-8 BOM, which makes JSON.parse throw.
 * A hook that parses before deciding therefore catches the exception, decides
 * nothing, and exits 0 -- installed, silent, and enforcing nothing. This is the
 * single most dangerous defect found while building this, so the strip lives
 * here, once, and every entry point goes through it.
 */
function parsePayload(text) {
  const s = typeof text === 'string' ? text : String(text);
  return JSON.parse(s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
}

function detect(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.cursor_version || payload.conversation_id) return 'cursor';

  const ev = payload.hook_event_name || payload.hookEventName || '';
  if (GEMINI_EVENTS[ev]) return 'gemini';
  if (CURSOR_EVENTS[ev] && !CLAUDE_EVENTS[ev]) return 'cursor';

  // Claude Code and Codex CLI share event names, stdin fields, stdout fields,
  // and exit-code semantics, so one adapter serves both.
  return 'claude';
}

/** Cursor sends workspace_roots as URI-ish paths: "/C:/Users/k/proj". */
function normalizeRoot(p) {
  if (!p) return null;
  const s = String(p).replace(/\\/g, '/');
  return /^\/[a-zA-Z]:\//.test(s) ? s.slice(1) : s;
}

/**
 * Collapse each host's tool names to one vocabulary.
 * Claude Code says Bash, Cursor says Shell, Gemini says run_shell_command.
 * Cursor has no Edit tool at all -- writes and edits are both Write.
 */
function canonicalTool(name) {
  const t = String(name || '').toLowerCase();
  if (t === 'bash' || t === 'shell' || t === 'run_shell_command' || t === 'runshellcommand') {
    return 'shell';
  }
  if (t === 'multiedit') return 'multiedit';
  if (t === 'notebookedit' || t === 'replace' || t === 'write_file') return 'edit';
  return t;
}

/**
 * Reduce a vendor payload to the fields the gates need.
 *
 * `path` and `cwd` are the load-bearing pair: the gate relativises one against
 * the other, and if they disagree in format every file looks outside the
 * project and the gate silently allows everything.
 */
function normalize(payload) {
  const vendor = detect(payload);
  const rawEvent = payload.hook_event_name || payload.hookEventName || '';

  const table =
    vendor === 'cursor' ? CURSOR_EVENTS : vendor === 'gemini' ? GEMINI_EVENTS : CLAUDE_EVENTS;
  const event = table[rawEvent] || null;

  const input = payload.tool_input || payload.tool_args || {};

  // afterFileEdit puts file_path at the top level; the tool events nest it.
  const target = input.file_path || payload.file_path || input.path || null;

  const cwd =
    normalizeRoot(payload.cwd) ||
    normalizeRoot(Array.isArray(payload.workspace_roots) ? payload.workspace_roots[0] : null) ||
    null;

  let ok;
  if (payload.tool_output) {
    try {
      const parsed =
        typeof payload.tool_output === 'string'
          ? JSON.parse(payload.tool_output)
          : payload.tool_output;
      ok = parsed && parsed.success;
    } catch {
      ok = undefined;
    }
  }
  if (ok === undefined && payload.tool_response && typeof payload.tool_response === 'object') {
    ok = payload.tool_response.success;
  }

  return {
    vendor,
    event,
    rawEvent,
    tool: canonicalTool(payload.tool_name),
    path: target,
    cwd,
    command: input.command || null,
    status: payload.status || null,
    ok,
  };
}

/**
 * Build a vendor-shaped response.
 *
 * kind: allow | deny | context | stopBlock
 */
function respond(vendor, kind, opts = {}) {
  const reason = opts.reason || '';
  const text = opts.text || '';

  if (kind === 'allow') return { stdout: null, exit: 0 };

  if (kind === 'deny') {
    if (vendor === 'cursor') {
      return {
        stdout: { permission: 'deny', user_message: reason, agent_message: reason },
        exit: 2,
      };
    }
    if (vendor === 'gemini') {
      // Gemini requires a reason alongside a deny; it reaches the model as a
      // tool error.
      return { stdout: { decision: 'deny', reason }, exit: 2 };
    }
    return {
      stdout: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      },
      exit: 2,
    };
  }

  if (kind === 'context') {
    if (vendor === 'cursor') {
      // Cursor has no per-prompt injection point; the caller falls back to
      // sessionStart or postToolUse.
      return { stdout: { additional_context: text }, exit: 0 };
    }
    // The host validates hookSpecificOutput.hookEventName against the event
    // that actually fired and throws "Hook returned incorrect event name" on a
    // mismatch, discarding the whole result. Hardcoding this meant the G4
    // escalation was dropped as a hook error: the round cap counted correctly
    // and then said nothing to anyone.
    const firedAs = opts.hookEventName || (vendor === 'gemini' ? 'BeforeAgent' : 'UserPromptSubmit');

    return {
      stdout: {
        hookSpecificOutput: {
          hookEventName: firedAs,
          additionalContext: text,
        },
      },
      exit: 0,
    };
  }

  if (kind === 'stopBlock') {
    if (vendor === 'cursor') {
      // Cursor's stop hook cannot refuse completion. followup_message is
      // auto-submitted as the next user message instead, bounded by Cursor's
      // own loop_limit. Exit 2 here would be meaningless, so exit 0.
      return { stdout: { followup_message: reason }, exit: 0 };
    }
    if (vendor === 'gemini') {
      return { stdout: { decision: 'deny', reason }, exit: 2 };
    }
    return { stdout: { decision: 'block', reason }, exit: 2 };
  }

  return { stdout: null, exit: 0 };
}

module.exports = {
  parsePayload,
  detect,
  normalize,
  respond,
  canBlockWrite,
  normalizeRoot,
};
