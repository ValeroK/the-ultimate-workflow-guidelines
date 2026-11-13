'use strict';

// PLAN-simplify, card baseline. The recorded "before" of the hook-event harness: every event the
// 4.8.0 hooks.json registers, for two hosts, sent to the real hooks/gate.js against a temp project
// with an unconfirmed plan, a dirty flag, a gate_violation and one changed source file. Under
// 4.8.0 the old gates block or write on these. Card `reminders` rewrites this file into the two
// `no hook ...` cases; the payload builder below is meant to stay as it is.
//
// The payloads are synthesised: there is no PostToolUseFailure recording and no Cursor
// recording in fixtures/. The cwd, file path and transcript path point into the temp project.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const GATE = path.join(PLUGIN, 'hooks', 'gate.js');
const TEST_COMMAND = 'node --test "test/**/*.test.js"';

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function project() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-events-')));
  made.push(dir);
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@localhost');
  git('config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `---\nphase: build\nplan_confirmed: false\ntests_confirmed: false\ntest_command: ${TEST_COMMAND}\ndirty: true\ngate_violation: G1\n---\nbody\n`);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  return dir;
}

/** One payload builder for every event and both hosts. */
function payload(vendor, kind, dir, opts = {}) {
  const claude = vendor === 'claude';
  const base = { cwd: dir, transcript_path: path.join(dir, 'transcript.jsonl'), session_id: 's1' };
  const file = path.join(dir, 'src', 'a.js');
  const names = {
    claude: { pre: 'PreToolUse', post: 'PostToolUse', fail: 'PostToolUseFailure', prompt: 'UserPromptSubmit', stop: 'Stop' },
    cursor: { pre: 'preToolUse', post: 'postToolUse', fail: 'postToolUseFailure', prompt: 'beforeSubmitPrompt', stop: 'stop' },
  }[vendor];
  const shell = claude ? 'Bash' : 'Shell';
  switch (kind) {
    case 'pre-edit': return { ...base, hook_event_name: names.pre, tool_name: 'Write', tool_input: { file_path: file } };
    case 'pre-bash': return { ...base, hook_event_name: names.pre, tool_name: shell, tool_input: { command: opts.command || 'git status' } };
    case 'post-edit': return { ...base, hook_event_name: names.post, tool_name: 'Write', tool_input: { file_path: file }, tool_response: { success: true } };
    case 'post-test-run': return { ...base, hook_event_name: names.post, tool_name: shell, tool_input: { command: TEST_COMMAND }, tool_response: { exit_code: 0 } };
    case 'post-failure': return { ...base, hook_event_name: names.fail, tool_name: shell, tool_input: { command: TEST_COMMAND }, error: 'exit 1' };
    case 'prompt': return { ...base, hook_event_name: names.prompt, prompt: 'continue' };
    case 'stop': return { ...base, hook_event_name: names.stop, stop_hook_active: false };
    default: throw new Error(`unknown event kind ${kind}`);
  }
}
// The non-commit Bash commands a commit matcher must not mistake for a commit.
const NON_COMMIT = ['git status', 'git log --grep=commit', 'git commit-tree HEAD^{tree}'];
const KINDS = ['pre-edit', 'pre-bash', 'post-edit', 'post-test-run', 'post-failure', 'prompt', 'stop'];
const VENDORS = ['claude', 'cursor'];

/** The recursive listing of .ultimate-workflow with hashes, and the plan bytes. */
function snapshot(dir) {
  const out = {};
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const q = path.join(p, e.name);
      if (e.isDirectory()) walk(q);
      else out[path.relative(dir, q)] = crypto.createHash('sha256').update(fs.readFileSync(q)).digest('hex');
    }
  };
  walk(path.join(dir, '.ultimate-workflow'));
  out['PLAN-x.md'] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'PLAN-x.md'))).digest('hex');
  return out;
}

function send(vendor, kind) {
  const dir = project();
  const before = snapshot(dir);
  const sendOne = (opts) => spawnSync(process.execPath, [GATE], { input: JSON.stringify(payload(vendor, kind, dir, opts)), encoding: 'utf8', cwd: dir, env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on', NODE_TEST_CONTEXT: '' } });
  // pre-bash is one sub-case that sends all three non-commit commands.
  const results = kind === 'pre-bash' ? NON_COMMIT.map((command) => sendOne({ command })) : [sendOne()];
  const r = { status: results.some((x) => x.status === 2) ? 2 : results[0].status, stdout: results.map((x) => x.stdout).join(''), stderr: results.map((x) => x.stderr).join('') };
  const after = snapshot(dir);
  let out = null;
  try {
    out = r.stdout.trim() ? JSON.parse(r.stdout) : null;
  } catch {
    out = null;
  }
  const blocked = r.status === 2 || /deny|block/i.test(r.stdout);
  const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
  return { r, out, blocked, changed, dir };
}


test('no hook refuses: every event sent to the real gate.js with an unconfirmed plan and a changed source file exits 0 with no deny and no stop block', () => {
  let ran = 0;
  for (const vendor of VENDORS) {
    for (const kind of KINDS) {
      const s = send(vendor, kind);
      ran += 1;
      assert.strictEqual(s.r.status, 0, `${vendor} ${kind}: exit ${s.r.status} ${s.r.stdout}`);
      assert.ok(!s.blocked, `${vendor} ${kind}: ${s.r.stdout}`);
      assert.doesNotMatch(s.r.stdout, /permissionDecision|"decision"|"permission"/, `${vendor} ${kind}`);
    }
  }
  assert.strictEqual(ran, 14);
});

test('no hook writes: across those same events the plan file bytes and the recursive listing of .ultimate-workflow are identical before and after', () => {
  let ran = 0;
  for (const vendor of VENDORS) {
    for (const kind of KINDS) {
      const s = send(vendor, kind);
      ran += 1;
      // One named exception: a full run of the configured command typed directly is recorded for the commit check
      // (owner decision, 2026-11-13). Nothing else may change, and the plan file never does.
      const allowed = kind === 'post-test-run' || kind === 'post-failure' ? ['.ultimate-workflow/verify.json'.split('/').join(path.sep)] : [];
      const stray = s.changed.filter((k) => !allowed.includes(k));
      assert.deepStrictEqual(stray, [], `${vendor} ${kind} changed ${stray.join(', ')}`);
      assert.ok(!s.changed.includes('PLAN-x.md'), `${vendor} ${kind}: the plan file is untouched`);
    }
  }
  assert.strictEqual(ran, 14);
});

test('no hook writes: PRD.md is untouched at bootstrap', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-events-prd-')));
  made.push(dir);
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'x\n');
  fs.writeFileSync(path.join(dir, 'PRD.md'), ['---', 'prd_confirmed: false', 'dirty: true', '---', 'body', ''].join('\n'));
  const before = fs.readFileSync(path.join(dir, 'PRD.md'));
  for (const kind of KINDS) {
    const r = spawnSync(process.execPath, [GATE], { input: JSON.stringify(payload('claude', kind, dir)), encoding: 'utf8', cwd: dir, env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
    assert.strictEqual(r.status, 0, kind);
  }
  assert.ok(before.equals(fs.readFileSync(path.join(dir, 'PRD.md'))));
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow')), 'and nothing was created beside it');
});

// ---- reminders, through the real gate.js ----

function planProject(front) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-remind-')));
  made.push(dir);
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@localhost');
  git('config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `---\n${front.join('\n')}\n---\nbody\n`);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return dir;
}
const gateOut = (dir, vendor, kind) => spawnSync(process.execPath, [GATE], { input: JSON.stringify(payload(vendor, kind, dir)), encoding: 'utf8', cwd: dir, env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
const contextText = (r) => {
  try {
    const j = JSON.parse(r.stdout);
    return (j.hookSpecificOutput && j.hookSpecificOutput.additionalContext) || j.systemMessage || '';
  } catch {
    return '';
  }
};

test('reminders: sent on UserPromptSubmit and Stop, and not on an edit', () => {
  const dir = planProject(['phase: build', 'plan_confirmed: false', 'tests_confirmed: false', `test_command: ${TEST_COMMAND}`]);
  const prompt = contextText(gateOut(dir, 'claude', 'prompt'));
  assert.match(prompt, /plan is not confirmed/);
  assert.match(prompt, /--confirm tests_confirmed/);
  const stop = contextText(gateOut(dir, 'claude', 'stop'));
  assert.match(stop, /plan is not confirmed/);
  for (const kind of ['pre-edit', 'post-edit']) assert.strictEqual(contextText(gateOut(dir, 'claude', kind)), '', `${kind} says nothing`);
  assert.strictEqual(gateOut(dir, 'cursor', 'stop').stdout, '', 'Cursor gets no stop line: its follow-up would start a new turn');
});

test('reminders: a confirmed tree with changed code gets the code-changed line, a write into the run folder does not raise it, and a source write does', () => {
  const dir = planProject(['phase: build', 'plan_confirmed: true', 'tests_confirmed: true', `test_command: ${TEST_COMMAND}`]);
  assert.doesNotMatch(contextText(gateOut(dir, 'claude', 'prompt')), /Code changed since the last full test run/);
  fs.mkdirSync(path.join(dir, '.ultimate-workflow', 'run', 'calc'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ultimate-workflow', 'run', 'calc', 'harvest.json'), '{}');
  assert.doesNotMatch(contextText(gateOut(dir, 'claude', 'prompt')), /Code changed since the last full test run/, 'the run folder is not source');
  fs.writeFileSync(path.join(dir, 'README.md'), 'words\n');
  assert.doesNotMatch(contextText(gateOut(dir, 'claude', 'prompt')), /Code changed since the last full test run/, 'documentation is not code');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  assert.match(contextText(gateOut(dir, 'claude', 'prompt')), /Code changed since the last full test run/);
});

test('fault 18: another session\'s edits in the same checkout do not block this session\'s turn end', () => {
  const dir = planProject(['phase: build', 'plan_confirmed: true', 'tests_confirmed: true', `test_command: ${TEST_COMMAND}`, 'dirty: true']);
  fs.writeFileSync(path.join(dir, 'src', 'other-session.js'), 'module.exports = 3;\n');
  const r = gateOut(dir, 'claude', 'stop');
  assert.strictEqual(r.status, 0);
  assert.doesNotMatch(r.stdout, /"decision"/);
  assert.ok(!JSON.parse(r.stdout || '{}').decision);
});

test('reminders: status.js prints the same lines the hook sends', () => {
  const states = [
    ['phase: build', 'plan_confirmed: false', 'tests_confirmed: false', `test_command: ${TEST_COMMAND}`],
    ['phase: build', 'plan_confirmed: true', 'tests_confirmed: false', `test_command: ${TEST_COMMAND}`],
    ['phase: build', 'plan_confirmed: true', 'tests_confirmed: true'],
  ];
  for (const front of states) {
    const dir = planProject(front);
    const hookLines = contextText(gateOut(dir, 'claude', 'stop')).split('\n').filter(Boolean);
    const s = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'status.js'), '--json'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
    const statusLines = JSON.parse(s.stdout).reminders;
    // The hook adds the code-changed line from the fingerprint; status adds it from the same evidence.
    assert.deepStrictEqual(statusLines, hookLines, front.join(' | '));
  }
});
