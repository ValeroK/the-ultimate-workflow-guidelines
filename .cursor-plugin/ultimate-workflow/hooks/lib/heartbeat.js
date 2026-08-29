'use strict';

// Proof that the gates are running.
//
// Before this existed, three different conditions were indistinguishable from
// the outside: hooks not loaded by the host, hooks loaded but crashing, and
// hooks correctly deciding to allow. All three look like "nothing happened".
// One of them -- a registration added mid-session, which the host does not pick
// up until restart -- cost twenty minutes of silent non-enforcement while this
// plugin was being built.
//
// So every gate invocation leaves a trace, and `status.js` reads it. Inference
// is what failed; this is evidence.
//
// Diagnostics must never affect a decision, so every function here swallows its
// own errors and returns something usable.

const fs = require('node:fs');
const path = require('node:path');

const DIR = '.ultimate-workflow';
const FILE = 'heartbeat.json';

/** Entries retained for inspection. The count is unbounded; this is not. */
const MAX_RECENT = 20;

/** How long a heartbeat stays "live" before it is merely "stale". */
const LIVE_WINDOW_SECONDS = 3600;

const EMPTY = () => ({ count: 0, last_seen: null, recent: [] });

function heartbeatPath(cwd) {
  return path.join(cwd, DIR, FILE);
}

/** Read the heartbeat. Never throws: a missing or corrupt file reads as empty. */
function read(cwd) {
  try {
    const parsed = JSON.parse(fs.readFileSync(heartbeatPath(cwd), 'utf8'));
    return {
      count: Number(parsed.count) || 0,
      last_seen: parsed.last_seen || null,
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    };
  } catch {
    return EMPTY();
  }
}

/**
 * Append one entry. Never throws.
 *
 * Read-modify-write on a small file. Concurrent invocations can lose an entry --
 * Codex launches matching hooks for the same event concurrently -- which is
 * acceptable for diagnostics and is documented rather than pretended away.
 */
function record(cwd, entry) {
  try {
    const current = read(cwd);

    const trimmed = {
      at: entry.at,
      event: entry.event,
      vendor: entry.vendor,
      stage: entry.stage,
      decision: entry.decision,
    };

    const recent = [...current.recent, trimmed].slice(-MAX_RECENT);

    fs.mkdirSync(path.join(cwd, DIR), { recursive: true });
    fs.writeFileSync(
      heartbeatPath(cwd),
      JSON.stringify({ count: current.count + 1, last_seen: entry.at, recent }, null, 2)
    );
  } catch {
    // A heartbeat failure must never turn into a gate failure.
  }
}

/**
 * Interpret a heartbeat.
 *
 * The three states this separates are the whole point:
 *   never    -- no gate has ever run here. Usually means the host has not
 *               loaded the hooks, which needs a restart.
 *   stale    -- gates ran once, but not recently.
 *   live     -- gates ran within the window.
 *   disabled -- ULTIMATE_WORKFLOW_GATES is off, so silence is expected.
 */
function liveness(heartbeat, opts = {}) {
  const now = opts.now || Date.now();

  if (opts.disabled) {
    return { state: 'disabled', ageSeconds: null, count: heartbeat.count };
  }
  if (!heartbeat.last_seen || heartbeat.count === 0) {
    return { state: 'never', ageSeconds: null, count: 0 };
  }

  const seen = Date.parse(heartbeat.last_seen);
  if (Number.isNaN(seen)) {
    return { state: 'never', ageSeconds: null, count: heartbeat.count };
  }

  const ageSeconds = Math.round((now - seen) / 1000);
  return {
    state: ageSeconds <= LIVE_WINDOW_SECONDS ? 'live' : 'stale',
    ageSeconds,
    count: heartbeat.count,
  };
}

module.exports = { record, read, liveness, heartbeatPath, MAX_RECENT, LIVE_WINDOW_SECONDS, DIR };
