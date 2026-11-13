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
function payload(vendor, kind, dir) {
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
    case 'pre-bash': return { ...base, hook_event_name: names.pre, tool_name: shell, tool_input: { command: 'git status' } };
    case 'post-edit': return { ...base, hook_event_name: names.post, tool_name: 'Write', tool_input: { file_path: file }, tool_response: { success: true } };
    case 'post-test-run': return { ...base, hook_event_name: names.post, tool_name: shell, tool_input: { command: TEST_COMMAND }, tool_response: { exit_code: 0 } };
    case 'post-failure': return { ...base, hook_event_name: names.fail, tool_name: shell, tool_input: { command: TEST_COMMAND }, error: 'exit 1' };
    case 'prompt': return { ...base, hook_event_name: names.prompt, prompt: 'continue' };
    case 'stop': return { ...base, hook_event_name: names.stop, stop_hook_active: false };
    default: throw new Error(`unknown event kind ${kind}`);
  }
}
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
  const r = spawnSync(process.execPath, [GATE], { input: JSON.stringify(payload(vendor, kind, dir)), encoding: 'utf8', cwd: dir, env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on', NODE_TEST_CONTEXT: '' } });
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

test('hook events 4.8.0: every event payload reaches the temp project, and the old gate blocks or writes on it', () => {
  let ran = 0;
  const seen = [];
  for (const vendor of VENDORS) {
    for (const kind of KINDS) {
      const s = send(vendor, kind);
      ran += 1;
      assert.ok(fs.existsSync(path.join(s.dir, 'src', 'a.js')), 'the payload points into the temp project');
      // 4.8.0: each event either blocks (edit, stop) or writes state (heartbeat on every event, the plan flags on others).
      assert.ok(s.blocked || s.changed.length > 0, `${vendor} ${kind}: the old hook did neither block nor write (${s.r.stdout} ${s.r.stderr})`);
      seen.push(`${vendor}/${kind}:${s.blocked ? 'block' : 'write'}`);
    }
  }
  assert.strictEqual(ran, 14);
  assert.ok(seen.includes('claude/pre-edit:block'), seen.join(' '));
  assert.ok(seen.includes('claude/stop:block'), seen.join(' '));
  assert.ok(seen.includes('claude/post-edit:write'), seen.join(' '));
});
