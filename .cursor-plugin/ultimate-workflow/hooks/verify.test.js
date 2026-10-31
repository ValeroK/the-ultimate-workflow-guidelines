'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VERIFY = path.join(__dirname, 'verify.js');
const GATE = path.join(__dirname, 'gate.js');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

// A repository with one committed source file and its test, and a plan whose test commands are
// small node scripts that write what they were given to ran.json, so a test can see what ran.
function repo({ related = 'node rel.js {files}', full = 'node full.js', extra = '' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-verify-'));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'test'));
  fs.writeFileSync(path.join(dir, 'src', 'calc.js'), 'export function addUp(a, b) { return a + b }\n');
  fs.writeFileSync(path.join(dir, 'test', 'calc.test.js'), "import { addUp } from '../src/calc.js'\n");
  fs.writeFileSync(path.join(dir, 'test', 'other.test.js'), "import { x } from '../src/other.js'\n");
  const runner = (mode) => `require('fs').writeFileSync('ran.json', JSON.stringify({ mode: '${mode}', args: process.argv.slice(2) })); process.exit(process.env.FAIL ? 1 : 0)\n`;
  fs.writeFileSync(path.join(dir, 'rel.js'), runner('related'));
  fs.writeFileSync(path.join(dir, 'full.js'), runner('full'));
  fs.writeFileSync(path.join(dir, '.gitignore'), 'ran.json\n.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  const lines = ['---', 'plan_confirmed: true', 'tests_confirmed: true', 'experts: []', `test_command: ${full}`];
  if (related) lines.push(`test_related_command: ${related}`);
  if (extra) lines.push(extra);
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `${lines.join('\n')}\n---\n# plan\n`);
  return dir;
}

const run = (dir, args = [], env = {}) => spawnSync(process.execPath, [VERIFY, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
const ran = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'ran.json'), 'utf8'));
const record = (dir) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'verify.json'), 'utf8'));
  } catch {
    return null;
  }
};
const edit = (dir, f = 'src/calc.js') => fs.appendFileSync(path.join(dir, f), '// changed\n');

test('T10 a small change runs the related command with the changed files, prints why, and exits with its code', () => {
  const dir = repo();
  edit(dir);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /verify: related because 1 changed file/);
  assert.deepEqual(ran(dir), { mode: 'related', args: ['src/calc.js'] });
  assert.equal(run(dir, [], { FAIL: '1' }).status, 1);
});

test('T7 on disk: {tests} finds the test that imports the changed file, not the unrelated one', () => {
  const dir = repo({ related: 'node rel.js {tests}' });
  edit(dir);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(ran(dir).args, ['test/calc.test.js']);
});

test('T11 --full runs test_command and records the outcome against the current changes', () => {
  const dir = repo();
  edit(dir);
  assert.equal(run(dir, ['--full']).status, 0);
  assert.equal(ran(dir).mode, 'full');
  const rec = record(dir);
  assert.equal(rec.mode, 'full');
  assert.equal(rec.passed, true);
  assert.match(rec.fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(run(dir, ['--full'], { FAIL: '1' }).status, 1);
  assert.equal(record(dir).passed, false);
});

test('T12 a related run never writes a full record', () => {
  const dir = repo();
  edit(dir);
  run(dir);
  assert.equal(record(dir), null);
});

test('a config change makes the default run full, and that run is recorded', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
  const r = run(dir);
  assert.match(r.stdout, /verify: full because package\.json changed/);
  assert.equal(ran(dir).mode, 'full');
  assert.equal(record(dir).passed, true);
});

test('T13 not a git repository: the full suite, saying why', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-verify-nogit-'));
  made.push(dir);
  fs.writeFileSync(path.join(dir, 'full.js'), "require('fs').writeFileSync('ran.json', '{\"mode\":\"full\"}')\n");
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), '---\ntest_command: node full.js\ntest_related_command: node full.js {files}\n---\n');
  const r = run(dir);
  assert.match(r.stdout, /verify: full because the changed files could not be read from git/);
  assert.equal(ran(dir).mode, 'full');
});

test('T14 no plan, or no test_command: a clear error and nothing runs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-verify-noplan-'));
  made.push(dir);
  const r = run(dir);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no test_command/);
  assert.equal(fs.existsSync(path.join(dir, 'ran.json')), false);
});

// --- through gate.js: the commit check end to end ---------------------------------------

function hook(dir, payload) {
  const r = spawnSync(process.execPath, [GATE], { input: JSON.stringify({ cwd: dir, ...payload }), encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' } });
  return r.stdout ? JSON.parse(r.stdout) : null;
}
const commitReason = (dir) => {
  const out = hook(dir, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit -m x' } });
  return (out && out.hookSpecificOutput && out.hookSpecificOutput.permissionDecisionReason) || '';
};

test('end to end: related runs do not allow a commit; a full run does; an edit after it does not', () => {
  const dir = repo();
  edit(dir);
  run(dir);
  assert.match(commitReason(dir), /Gate G7: no passing full test suite run/);
  assert.match(commitReason(dir), /verify\.js" --full/);
  run(dir, ['--full']);
  assert.doesNotMatch(commitReason(dir), /Gate G7/);
  edit(dir);
  assert.match(commitReason(dir), /Gate G7: the changes have changed since/);
});

test('end to end: the configured command typed directly is recorded as a full run; a narrowed one is not', () => {
  const dir = repo();
  edit(dir);
  hook(dir, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'node full.js -- one' }, tool_response: { success: true } });
  assert.equal(record(dir), null);
  hook(dir, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'node full.js' }, tool_response: { success: true } });
  assert.equal(record(dir).passed, true);
  assert.doesNotMatch(commitReason(dir), /Gate G7/);
});

test('a commit that changes only requirements.txt is not docs-only: it needs the full run', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'requirements.txt'), 'requests==2.0\n');
  assert.match(commitReason(dir), /Gate G7/);
  const docs = repo();
  fs.writeFileSync(path.join(docs, 'NOTES.md'), 'note\n');
  assert.doesNotMatch(commitReason(docs), /Gate G7/);
});
