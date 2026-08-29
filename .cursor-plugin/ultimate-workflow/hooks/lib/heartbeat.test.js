'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const hb = require('./heartbeat.js');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uw-hb-'));
}

const entry = (o = {}) => ({
  event: 'preTool',
  vendor: 'claude',
  stage: 'feature',
  decision: 'deny',
  at: '2026-08-25T10:00:00.000Z',
  ...o,
});

// --- recording -------------------------------------------------------------

test('record writes a heartbeat with the fields status needs', () => {
  const dir = tmpdir();
  hb.record(dir, entry());

  const h = hb.read(dir);
  assert.equal(h.count, 1);
  assert.equal(h.last_seen, '2026-08-25T10:00:00.000Z');
  assert.equal(h.recent.length, 1);
  assert.deepEqual(h.recent[0], {
    at: '2026-08-25T10:00:00.000Z',
    event: 'preTool',
    vendor: 'claude',
    stage: 'feature',
    decision: 'deny',
  });
});

test('record creates the heartbeat directory if it does not exist', () => {
  const dir = tmpdir();
  assert.equal(fs.existsSync(path.join(dir, '.ultimate-workflow')), false);
  hb.record(dir, entry());
  assert.equal(fs.existsSync(path.join(dir, '.ultimate-workflow', 'heartbeat.json')), true);
});

test('record keeps at most 20 recent entries, evicting the oldest', () => {
  const dir = tmpdir();
  for (let i = 0; i < 25; i += 1) {
    hb.record(dir, entry({ at: `2026-08-25T10:00:${String(i).padStart(2, '0')}.000Z` }));
  }

  const h = hb.read(dir);
  assert.equal(h.recent.length, hb.MAX_RECENT);
  assert.equal(h.recent[0].at, '2026-08-25T10:00:05.000Z', 'oldest five evicted');
  assert.equal(h.recent.at(-1).at, '2026-08-25T10:00:24.000Z', 'newest kept');
});

test('count is a running total, not the length of recent', () => {
  const dir = tmpdir();
  for (let i = 0; i < 25; i += 1) hb.record(dir, entry());

  const h = hb.read(dir);
  assert.equal(h.count, 25);
  assert.equal(h.recent.length, 20);
});

// --- robustness ------------------------------------------------------------
// A heartbeat is diagnostics. It must never be able to affect a gate decision,
// so every failure path returns quietly instead of throwing.

test('a corrupt heartbeat file is replaced rather than thrown on', () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'heartbeat.json'), 'not json {{{');

  assert.doesNotThrow(() => hb.record(dir, entry()));
  const h = hb.read(dir);
  assert.equal(h.count, 1);
  assert.equal(h.recent.length, 1);
});

test('a truncated heartbeat file is replaced rather than thrown on', () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'heartbeat.json'), '{"count": 3, "rec');

  assert.doesNotThrow(() => hb.record(dir, entry()));
  assert.equal(hb.read(dir).count, 1);
});

test('recording into an unwritable location fails silently', () => {
  // A path whose parent is a file, not a directory: mkdir cannot succeed.
  const dir = tmpdir();
  const blocked = path.join(dir, 'a-file');
  fs.writeFileSync(blocked, 'x');

  assert.doesNotThrow(() => hb.record(blocked, entry()));
});

test('read returns a null-ish heartbeat when none exists, without throwing', () => {
  const h = hb.read(tmpdir());
  assert.equal(h.count, 0);
  assert.equal(h.last_seen, null);
  assert.deepEqual(h.recent, []);
});

test('read on a corrupt file returns the empty shape rather than throwing', () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'heartbeat.json'), '}{');
  assert.equal(hb.read(dir).count, 0);
});

// --- liveness interpretation ----------------------------------------------
// The whole reason this exists: distinguishing "never ran" from "ran recently"
// from "disabled". Those three looked identical before, and one of them cost
// twenty minutes of silent non-enforcement.

test('liveness reports never when no heartbeat exists', () => {
  const l = hb.liveness(hb.read(tmpdir()), { now: Date.parse('2026-08-25T10:00:00Z') });
  assert.equal(l.state, 'never');
});

test('liveness reports live for a recent heartbeat', () => {
  const l = hb.liveness(
    { count: 5, last_seen: '2026-08-25T09:59:00.000Z', recent: [] },
    { now: Date.parse('2026-08-25T10:00:00Z') }
  );
  assert.equal(l.state, 'live');
  assert.ok(l.ageSeconds >= 59 && l.ageSeconds <= 61, String(l.ageSeconds));
});

test('liveness reports stale for an old heartbeat', () => {
  const l = hb.liveness(
    { count: 5, last_seen: '2026-08-24T10:00:00.000Z', recent: [] },
    { now: Date.parse('2026-08-25T10:00:00Z') }
  );
  assert.equal(l.state, 'stale');
});

test('liveness reports disabled regardless of heartbeat age', () => {
  const l = hb.liveness(
    { count: 5, last_seen: '2026-08-25T09:59:00.000Z', recent: [] },
    { now: Date.parse('2026-08-25T10:00:00Z'), disabled: true }
  );
  assert.equal(l.state, 'disabled');
});
