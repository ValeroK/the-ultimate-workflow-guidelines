#!/usr/bin/env node
// Development-only payload recorder. NOT shipped as a gate.
//
// Purpose: capture real hook payloads from each vendor so the adapter contract
// tests run against reality rather than against documentation. See
// PLAN-hook-gates.md, "Tests / Build order" step 1.
//
// Usage: register for every hook event in one CLI, run one ordinary session,
// then unregister. Writes fixtures/<vendor>/<event>.json.
//
//   --vendor <name>                subdirectory, or ULTIMATE_WORKFLOW_RECORD_VENDOR
//   --out <dir>                    where to write, or ULTIMATE_WORKFLOW_RECORD_DIR
//
// Argv is preferred over env because hook configs cannot reliably set
// environment variables across shells and operating systems.
//
// Always exits 0 and prints nothing, so it can never block or corrupt a session.
// Gemini requires stdout to carry nothing but final JSON, hence the silence.

const fs = require('fs');
const path = require('path');

// Cursor prefixes its payloads with a UTF-8 BOM, which makes JSON.parse throw.
// Undocumented, and it silently no-ops any hook that parses before deciding.
function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

let raw = '';
process.stdin.on('data', (chunk) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  try {
    const argv = process.argv.slice(2);
    const flag = (name) => {
      const i = argv.indexOf(`--${name}`);
      return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
    };

    const dir =
      flag('out') ||
      process.env.ULTIMATE_WORKFLOW_RECORD_DIR ||
      path.join(__dirname, '..', '..', 'fixtures');
    const vendor = flag('vendor') || process.env.ULTIMATE_WORKFLOW_RECORD_VENDOR || 'unknown';

    // Event name comes from the payload itself; vendors spell the key differently.
    let event = 'unknown';
    try {
      const parsed = JSON.parse(stripBom(raw));
      event = parsed.hook_event_name || parsed.hookEventName || parsed.event || 'unknown';
    } catch {
      // Not JSON. Still worth keeping -- that itself is a finding.
    }

    const safe = String(event).replace(/[^A-Za-z0-9_-]/g, '_');
    const outDir = path.join(dir, vendor);
    fs.mkdirSync(outDir, { recursive: true });

    // Keep every observation; the first payload for an event is rarely the
    // interesting one. Numbered suffixes preserve them all.
    let n = 0;
    let target;
    do {
      target = path.join(outDir, n === 0 ? `${safe}.json` : `${safe}.${n}.json`);
      n += 1;
    } while (fs.existsSync(target) && n < 100);

    fs.writeFileSync(target, raw);
  } catch {
    // Recorder failures must never affect the session.
  }
  process.exit(0);
});
