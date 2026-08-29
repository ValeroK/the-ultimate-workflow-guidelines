#!/usr/bin/env node
// Development-only probe. NOT shipped as a gate.
//
// Answers open question O2 from PRD-graph-orchestration.md: can a vendor's
// pre-tool hook actually DENY a file edit, or only observe it?
//
// Behaviour:
//   1. Records the payload, exactly like hooks/dev/record.js.
//   2. If the tool targets a path containing the sentinel "o2-probe", emits a
//      deny in every vendor dialect at once and exits 2.
//   3. Otherwise allows, silently.
//
// Scoped to the sentinel so it cannot interfere with ordinary work: any edit
// to any other file passes straight through.
//
//   --vendor <name>   fixture subdirectory (default "unknown")
//   --out <dir>       fixture root (default <repo>/fixtures)

const fs = require('node:fs');
const path = require('node:path');

// Cursor prefixes its payloads with a UTF-8 BOM, which makes JSON.parse throw.
// Undocumented, and it silently no-ops any hook that parses before deciding.
function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const SENTINEL = 'o2-probe';

let raw = '';
process.stdin.on('data', (c) => {
  raw += c;
});

process.stdin.on('end', () => {
  let payload = {};
  try {
    payload = JSON.parse(stripBom(raw));
  } catch {
    // Keep going: recording a non-JSON payload is itself a finding.
  }

  try {
    const argv = process.argv.slice(2);
    const flag = (n) => {
      const i = argv.indexOf(`--${n}`);
      return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
    };
    const root = flag('out') || path.join(__dirname, '..', '..', 'fixtures');
    const vendor = flag('vendor') || 'unknown';
    const event = payload.hook_event_name || payload.hookEventName || payload.event || 'unknown';
    const safe = String(event).replace(/[^A-Za-z0-9_-]/g, '_');

    const dir = path.join(root, vendor);
    fs.mkdirSync(dir, { recursive: true });

    let n = 0;
    let target;
    do {
      target = path.join(dir, n === 0 ? `${safe}.json` : `${safe}.${n}.json`);
      n += 1;
    } while (fs.existsSync(target) && n < 100);
    fs.writeFileSync(target, raw);
  } catch {
    // Recording must never affect the session.
  }

  // Deny only a WRITE of the sentinel file.
  //
  // The first run of this probe matched the sentinel anywhere in the payload
  // and so fired on the agent's Read of the file, before any Write was
  // attempted. That proved pre-tool denial works in general, but gates G1 and
  // G2 block writes specifically, so the write path is what has to be proven.
  const mentionsSentinel = raw.toLowerCase().includes(SENTINEL);
  const tool = String(payload.tool_name || '').toLowerCase();
  const isWrite = tool === 'write' || tool === 'edit' || tool === 'multiedit';

  if (!mentionsSentinel || !isWrite) {
    process.exit(0);
  }

  const reason = `O2 probe: deny test. If this file was NOT created, the pre-tool hook can block edits on this vendor.`;

  // Every vendor dialect at once. Unknown fields are ignored by each host.
  process.stdout.write(
    JSON.stringify({
      // Cursor
      permission: 'deny',
      user_message: reason,
      agent_message: reason,
      // Gemini, Codex, Claude Code
      decision: 'deny',
      reason,
      systemMessage: reason,
      hookSpecificOutput: {
        hookEventName: payload.hook_event_name || 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );

  // Exit 2 is the block signal on all four vendors.
  process.exit(2);
});
