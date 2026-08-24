'use strict';

// Contract tests for the vendor adapters.
//
// These run against payloads RECORDED from real sessions, not hand-written from
// documentation. Every defect found so far -- the UTF-8 BOM, absolute paths,
// paths outside cwd, workspace_roots instead of cwd -- was invisible to
// docs-derived fixtures and failed open. See PLAN-hook-gates.md.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const a = require('./adapters.js');

const FIXTURES = path.join(__dirname, '..', '..', 'fixtures');

/** Load a recorded fixture as a raw string, BOM and all. */
function raw(vendor, name) {
  return fs.readFileSync(path.join(FIXTURES, vendor, name), 'utf8');
}

function has(vendor, name) {
  return fs.existsSync(path.join(FIXTURES, vendor, name));
}

/** Find the first recorded fixture matching a predicate. */
function findFixture(vendor, pred) {
  const dir = path.join(FIXTURES, vendor);
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).sort()) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    let j;
    try {
      j = a.parsePayload(text);
    } catch {
      continue;
    }
    if (pred(j)) return { file: f, text, payload: j };
  }
  return null;
}

// --- parsePayload ----------------------------------------------------------

test('parsePayload strips a UTF-8 BOM', () => {
  const j = a.parsePayload('\uFEFF{"hook_event_name":"stop"}');
  assert.equal(j.hook_event_name, 'stop');
});

test('parsePayload handles a payload with no BOM', () => {
  assert.equal(a.parsePayload('{"hook_event_name":"Stop"}').hook_event_name, 'Stop');
});

test('parsePayload throws on genuine garbage rather than returning empty', () => {
  assert.throws(() => a.parsePayload('not json at all'));
});

// --- detect ----------------------------------------------------------------

test('detect recognises Cursor by cursor_version', () => {
  assert.equal(a.detect({ cursor_version: '3.17.19', hook_event_name: 'preToolUse' }), 'cursor');
});

test('detect recognises Gemini by its capitalised event names', () => {
  assert.equal(a.detect({ hook_event_name: 'BeforeTool' }), 'gemini');
  assert.equal(a.detect({ hook_event_name: 'AfterAgent' }), 'gemini');
});

test('detect maps Claude Code and Codex to one adapter -- their contracts match', () => {
  assert.equal(a.detect({ hook_event_name: 'PreToolUse', permission_mode: 'auto' }), 'claude');
  assert.equal(a.detect({ hook_event_name: 'PreToolUse', turn_id: 't1' }), 'claude');
});

// --- normalize: Claude Code, against recorded payloads ---------------------

test('normalize reads a recorded Claude Code Edit payload', { skip: !has('claude-code', 'PreToolUse.3.json') }, () => {
  const n = a.normalize(a.parsePayload(raw('claude-code', 'PreToolUse.3.json')));
  assert.equal(n.vendor, 'claude');
  assert.equal(n.event, 'preTool');
  assert.equal(n.tool, 'edit');
  assert.ok(n.path && n.path.endsWith('gate-probe.js'), n.path);
  assert.ok(n.cwd && n.cwd.includes('claude-basic-skill'), n.cwd);
});

// --- normalize: Cursor, against recorded payloads --------------------------

test('normalize reads a recorded Cursor preToolUse Write payload', () => {
  const found = findFixture('cursor', (j) => j.hook_event_name === 'preToolUse' && j.tool_name === 'Write');
  assert.ok(found, 'no recorded Cursor preToolUse/Write fixture');
  const n = a.normalize(found.payload);
  assert.equal(n.vendor, 'cursor');
  assert.equal(n.event, 'preTool');
  assert.equal(n.tool, 'write');
  assert.ok(n.path && n.path.length > 0);
  assert.ok(n.cwd, 'cwd must be derived from workspace_roots');
});

test('Cursor cwd comes from workspace_roots and loses the URI leading slash', () => {
  const n = a.normalize({
    cursor_version: '3.17.19',
    hook_event_name: 'preToolUse',
    tool_name: 'Write',
    tool_input: { file_path: 'C:\\Users\\k\\proj\\src\\a.js' },
    workspace_roots: ['/C:/Users/k/proj'],
  });
  assert.equal(n.cwd, 'C:/Users/k/proj');
});

test('the normalised Cursor path and cwd agree, so the gate can relativise', () => {
  const gates = require('./gates.js');
  const n = a.normalize({
    cursor_version: '3.17.19',
    hook_event_name: 'preToolUse',
    tool_name: 'Write',
    tool_input: { file_path: 'C:\\Users\\k\\proj\\src\\a.js' },
    workspace_roots: ['/C:/Users/k/proj'],
  });
  assert.equal(gates.toProjectPath(n.cwd, n.path), 'src/a.js');
});

test('normalize reads a recorded Cursor afterFileEdit payload, where file_path is top level', () => {
  const found = findFixture('cursor', (j) => j.hook_event_name === 'afterFileEdit');
  assert.ok(found, 'no recorded Cursor afterFileEdit fixture');
  const n = a.normalize(found.payload);
  assert.equal(n.event, 'afterEdit');
  assert.ok(n.path && n.path.length > 0, 'file_path is top level on this event');
});

test('normalize surfaces Cursor stop status, so follow-ups can skip aborted turns', () => {
  const found = findFixture('cursor', (j) => j.hook_event_name === 'stop' && j.status);
  assert.ok(found, 'no recorded Cursor stop fixture');
  const n = a.normalize(found.payload);
  assert.equal(n.event, 'stop');
  assert.ok(['completed', 'aborted'].includes(n.status), n.status);
});

// --- respond ---------------------------------------------------------------

test('a Claude deny uses permissionDecision and exit 2', () => {
  const r = a.respond('claude', 'deny', { reason: 'nope' });
  assert.equal(r.exit, 2);
  assert.equal(r.stdout.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(r.stdout.hookSpecificOutput.permissionDecisionReason, /nope/);
});

test('a Cursor deny uses the permission field', () => {
  const r = a.respond('cursor', 'deny', { reason: 'nope' });
  assert.equal(r.exit, 2);
  assert.equal(r.stdout.permission, 'deny');
});

test('a Gemini deny uses decision plus a required reason', () => {
  const r = a.respond('gemini', 'deny', { reason: 'nope' });
  assert.equal(r.exit, 2);
  assert.equal(r.stdout.decision, 'deny');
  assert.ok(r.stdout.reason, 'Gemini requires a reason with a deny');
});

test('allow emits nothing and exits 0 on every vendor', () => {
  for (const v of ['claude', 'cursor', 'gemini']) {
    const r = a.respond(v, 'allow', {});
    assert.equal(r.exit, 0, v);
    assert.equal(r.stdout, null, v);
  }
});

test('context injection uses each vendor field name', () => {
  assert.equal(
    a.respond('claude', 'context', { text: 'hi' }).stdout.hookSpecificOutput.additionalContext,
    'hi'
  );
  assert.equal(
    a.respond('gemini', 'context', { text: 'hi' }).stdout.hookSpecificOutput.additionalContext,
    'hi'
  );
});

test('Cursor cannot block a turn, so a stop block becomes a followup_message', () => {
  const r = a.respond('cursor', 'stopBlock', { reason: 'run the tests' });
  assert.equal(r.exit, 0, 'Cursor stop cannot block; exit 2 would be meaningless');
  assert.match(r.stdout.followup_message, /run the tests/);
});

test('Claude and Gemini can block a turn outright', () => {
  assert.equal(a.respond('claude', 'stopBlock', { reason: 'x' }).stdout.decision, 'block');
  assert.equal(a.respond('gemini', 'stopBlock', { reason: 'x' }).stdout.decision, 'deny');
});

// --- the capability table --------------------------------------------------
// This encodes the measured result of open question O2. If a vendor ever gains
// or loses the ability to block a write, this test is what should fail first.

test('capability table records that Cursor cannot prevent a write', () => {
  assert.equal(a.canBlockWrite('claude'), true);
  assert.equal(a.canBlockWrite('gemini'), true);
  assert.equal(a.canBlockWrite('cursor'), false);
});
