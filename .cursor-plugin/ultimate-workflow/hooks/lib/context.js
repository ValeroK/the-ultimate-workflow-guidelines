'use strict';

// How big the conversation is, for the reminder to start a new session (4.2.0).
//
// Every turn re-sends the whole conversation, so a long one costs more on every call: on the-ceo,
// main conversations were 73% of all tokens and one of them alone 5.8 billion. The size is the
// last assistant turn's usage (new input + cache write + cache read), read from the tail of the
// transcript so the hook never reads a whole file that can run to hundreds of megabytes. Pure
// apart from readTail; never throws.

const fs = require('node:fs');

/** Default: remind at 80k tokens of context, and again at every further 80k (150k before 4.7.0). */
const DEFAULT_THRESHOLD = 80000;

function readTail(file, bytes = 256 * 1024) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, bytes);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } catch {
    return '';
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

/** The context size of the last assistant turn in a transcript tail, or null. The first line may be cut in half. */
function lastContextTokens(tail) {
  const lines = String(tail || '').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    let ev;
    try {
      ev = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const u = ev && ev.type === 'assistant' && ev.message && ev.message.usage;
    if (u) return (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  }
  return null;
}

/** Which band the size is in, and whether that is a band not reminded of yet. A threshold of 0 or less is off. */
function decide({ tokens, threshold, lastBand }) {
  if (!(threshold > 0) || !(tokens > 0)) return { band: 0, remind: false };
  const band = Math.floor(tokens / threshold);
  return { band, remind: band >= 1 && band > (Number(lastBand) || 0) };
}

function reminderText(tokens) {
  const k = Math.round(tokens / 1000);
  return `[ultimate-workflow] This conversation is now about ${k}k tokens of context, and every turn re-sends all of it. When the current step is done, suggest to the user: run /handoff, then start a new session that reads the handoff file. A reminder only; nothing is blocked.`;
}

function threshold(env) {
  const raw = env && env.ULTIMATE_WORKFLOW_CONTEXT_REMINDER;
  if (raw === undefined || String(raw).trim() === '') return DEFAULT_THRESHOLD;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_THRESHOLD;
}

module.exports = { DEFAULT_THRESHOLD, readTail, lastContextTokens, decide, reminderText, threshold };
