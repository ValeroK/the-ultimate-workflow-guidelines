'use strict';

// 4.1.2: fixes from the re-wash value report (PLAN-rewash-fixes.md).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const stateLib = require(path.join(PLUGIN, 'hooks', 'lib', 'state.js'));
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const GATE = path.join(PLUGIN, 'hooks', 'gate.js');
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

function repo(front = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-rewash-'));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'export const a = 1\n');
  fs.writeFileSync(path.join(dir, 'test_times.json'), '{}\n');
  fs.writeFileSync(path.join(dir, 'full.js'), 'process.exit(0)\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), `---\n${['plan_confirmed: true', 'tests_confirmed: true', 'experts: []', 'test_command: node full.js', ...front].join('\n')}\n---\n`);
  return dir;
}

// --- AC1, AC2: volatile_paths ------------------------------------------------------------

test('V1 a volatile_paths file is left out of the changes and the fingerprint', () => {
  const dir = repo(['volatile_paths: test_times.json, data/*.db']);
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'export const a = 2\n');
  const before = experts.fingerprint(dir);
  fs.writeFileSync(path.join(dir, 'test_times.json'), '{"t": 5}\n');
  fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'data', 'live.db'), 'rows');
  assert.equal(experts.fingerprint(dir), before, 'a volatile file must not move the fingerprint');
  const ch = experts.workingChanges(dir);
  assert.deepEqual(ch.files, ['src/a.js']);
  assert.doesNotMatch(ch.diff, /test_times|live\.db/);
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'export const a = 3\n');
  assert.notEqual(experts.fingerprint(dir), before, 'any other file still does');
});

test('V1b without volatile_paths the same file counts, as before', () => {
  const dir = repo();
  const before = experts.fingerprint(dir);
  fs.writeFileSync(path.join(dir, 'test_times.json'), '{"t": 5}\n');
  assert.notEqual(experts.fingerprint(dir), before);
});

test('V2 end to end: a test run that rewrites a volatile file does not stale the full run for G7', () => {
  const dir = repo(['volatile_paths: test_times.json']);
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'export const a = 2\n');
  assert.equal(spawnSync(process.execPath, [VERIFY, '--full'], { cwd: dir, encoding: 'utf8' }).status, 0);
  fs.writeFileSync(path.join(dir, 'test_times.json'), '{"t": 9}\n');
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }),
    encoding: 'utf8',
    env: { ...process.env, ULTIMATE_WORKFLOW_GATES: 'on' },
  });
  assert.doesNotMatch(r.stdout || '', /Gate G7/);
});

test('V3 the experts command runs the full tests before the experts check', () => {
  const cmd = read('commands/experts.md');
  const tests = cmd.indexOf('verify.js" --full');
  assert.ok(tests > 0, 'experts.md names verify.js --full');
  assert.ok(tests < cmd.indexOf('commands/review.md'), 'and runs it before the review it follows');
});

// --- AC3: keywords from code only -------------------------------------------------------

test('V4 at review a keyword added in a document matches no added: selector; the same keyword in code does', () => {
  const diff = (file) => `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -0,0 +1 @@\n+add the tenant_id column\n`;
  const sel = experts.parseSelector('added: tenant_id');
  const doc = experts.parseDiff(diff('docs/notes.md'));
  assert.deepEqual(doc.files, ['docs/notes.md'], 'the file is still listed');
  assert.equal(experts.matches(sel, doc), false);
  assert.equal(experts.matches(sel, experts.parseDiff(diff('src/db.js'))), true);
});

test('V5 tests and build still match keywords in the plan text', () => {
  const sel = experts.parseSelector('added: tenant_id');
  assert.equal(experts.matches(sel, { files: [], text: 'Add tenant_id to the users table' }), true);
});

// --- AC4: finished plans ------------------------------------------------------------------

test('V6 a plan with phase: done is skipped; all done means no feature stage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-rewash-plans-'));
  made.push(dir);
  const plan = (name, front, mtime) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, `---\n${front}\n---\n`);
    fs.utimesSync(f, mtime, mtime);
  };
  plan('PLAN-old.md', 'phase: build\ntest_command: old', new Date(1000e9));
  plan('PLAN-new.md', 'phase: done\ntest_command: new', new Date(2000e9));
  const s = stateLib.readState(dir);
  assert.equal(s.stage, 'feature');
  assert.equal(path.basename(s.file), 'PLAN-old.md');
  plan('PLAN-old.md', 'phase: done', new Date(1000e9));
  assert.equal(stateLib.readState(dir).stage, 'none');
});

test('V7 /feature marks the plan done only after its commit lands; the template documents it', () => {
  assert.match(read('commands/feature.md'), /after the commit has landed[^.]*`phase: done`/i);
  assert.match(read('skills/the-ultimate-workflow-guidelines/references/plan-template.md'), /phase: done/);
});

// --- AC5, AC6 ---------------------------------------------------------------------------------

test('V8 the build agents are told never to stage or commit', async () => {
  const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
  const { calls } = await loadWorkflow(path.join(PLUGIN, 'phases', 'build.js'))({ plan: 'PLAN-x.md', briefs: [] }, async (c) => {
    if (c.label === 'write-tests') return { filesWritten: ['a.test.js'], testsFailAsExpected: true, testCommand: 'npm test', summary: 's' };
    if (c.label.startsWith('attempt-')) return { green: true, filesChanged: ['a.js'], summary: 's' };
    return null;
  });
  for (const label of ['write-tests', 'attempt-1']) {
    assert.match(calls.find((c) => c.label === label).prompt, /Never stage or commit/, label);
  }
});

const lockFile = (dir) => path.join(dir, '.ultimate-workflow', 'verify.lock');

test('V9 a run held by a live process makes a second one wait, then give up at the limit, running nothing', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'full.js'), "require('fs').writeFileSync('ran', '1')\n");
  fs.mkdirSync(path.dirname(lockFile(dir)), { recursive: true });
  fs.writeFileSync(lockFile(dir), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  const r = spawnSync(process.execPath, [VERIFY, '--full'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_VERIFY_WAIT_S: '2' } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /another test run .*still going/);
  assert.equal(fs.existsSync(path.join(dir, 'ran')), false);
  assert.equal(fs.existsSync(lockFile(dir)), true, 'the other run keeps its lock');
});

test('V10 a lock left by a dead process is taken over, the run goes ahead, and the lock is gone after', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'full.js'), "require('fs').writeFileSync('ran', '1')\n");
  const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout;
  fs.mkdirSync(path.dirname(lockFile(dir)), { recursive: true });
  fs.writeFileSync(lockFile(dir), JSON.stringify({ pid: Number(dead), at: new Date().toISOString() }));
  const r = spawnSync(process.execPath, [VERIFY, '--full'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ULTIMATE_WORKFLOW_VERIFY_WAIT_S: '5' } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(path.join(dir, 'ran')), true);
  assert.equal(fs.existsSync(lockFile(dir)), false);
});
