'use strict';

// PLAN-5.2.1, card fingerprint. `git add` of a new file moved the fingerprint of the changes: a file git did not know
// was written in a form of its own, and a staged one came from `git diff`. The commit gate then asked for a new full
// run and a new experts check of content that had not changed (found at the first commit of 5.2.0, 2026-11-20).

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const ex = require(CLI);
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `${a.join(' ')}\n${r.stderr}`);
  return r.stdout;
};
const cli = (dir, ...a) => {
  const r = spawnSync(process.execPath, [CLI, ...a], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  return JSON.parse(r.stdout);
};
const hashOf = (dir) => cli(dir, 'fingerprint').hash;

/** A repository with two committed files, one changed, and two files git does not know. */
function tree({ autocrlf = 'false' } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-staging-')));
  made.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', autocrlf);
  write(dir, 'src/a.js', 'module.exports = 1;\n');
  write(dir, 'src/keep.js', 'module.exports = 0;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  write(dir, 'src/a.js', 'module.exports = 1;\n// changed\n');
  write(dir, 'src/new-one.js', 'module.exports = 2;\n');
  write(dir, 'test/new-two.test.js', "'use strict';\n// a new test\n");
  return dir;
}

/** The fingerprint as 5.2.0 made it, for a tree with no staged new file: `git diff HEAD`, then each unknown file. */
function as520(dir) {
  const FORMAT = ['--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/'];
  const EX = [':(exclude).ultimate-workflow', ':(exclude,glob)**/PLAN-*.md'];
  let diff = git(dir, 'diff', ...FORMAT, '--binary', 'HEAD', '--', '.', ...EX);
  for (const p of git(dir, 'ls-files', '--others', '--exclude-standard', '--', '.', ...EX).split(/\r?\n/).filter(Boolean)) {
    const body = fs.readFileSync(path.join(dir, p)).toString('utf8');
    diff += `diff --git a/${p} b/${p}\nnew file\n--- /dev/null\n+++ b/${p}\n${body.split('\n').map((l) => `+${l}`).join('\n')}\n`;
  }
  return crypto.createHash('sha256').update(diff).digest('hex');
}

test('fingerprint 1: git add -A of the new files does not move the fingerprint', () => {
  const dir = tree();
  const before = hashOf(dir);
  git(dir, 'add', '-A');
  assert.equal(hashOf(dir), before);
});

test('fingerprint 2: git add -N of the new files does not move the fingerprint', () => {
  const dir = tree();
  const before = hashOf(dir);
  git(dir, 'add', '-N', 'src/new-one.js', 'test/new-two.test.js');
  assert.equal(hashOf(dir), before);
});

test('fingerprint 3: one new file staged and one not gives the same fingerprint, whichever it is', () => {
  const dir = tree();
  const before = hashOf(dir);
  git(dir, 'add', 'test/new-two.test.js');
  assert.equal(hashOf(dir), before);
  git(dir, 'reset', '-q');
  git(dir, 'add', 'src/new-one.js');
  assert.equal(hashOf(dir), before);
});

test('fingerprint 4: a change in the working tree of a staged new file moves the fingerprint', () => {
  const dir = tree();
  git(dir, 'add', '-A');
  const staged = hashOf(dir);
  write(dir, 'src/new-one.js', 'module.exports = 3;\n');
  assert.notEqual(hashOf(dir), staged);
});

test('fingerprint 5: a changed tracked file, staged or not, gives the fingerprint 5.2.0 gave', () => {
  const dir = tree();
  fs.rmSync(path.join(dir, 'src/new-one.js'));
  fs.rmSync(path.join(dir, 'test/new-two.test.js'));
  const old = as520(dir);
  assert.equal(hashOf(dir), old);
  git(dir, 'add', '-A');
  assert.equal(hashOf(dir), old);
});

test('fingerprint 6: a tree with unknown files and nothing staged gives the fingerprint 5.2.0 gave, so records on disk stay valid', () => {
  const dir = tree();
  // Names that sort differently by folder and by byte: git lists unknown files by the bytes of the whole path.
  write(dir, 'a-b.js', '1\n');
  write(dir, 'a/b.js', '2\n');
  assert.equal(hashOf(dir), as520(dir));
});

test('fingerprint 7: a new file that was staged and then deleted from the working tree is not in the changes', () => {
  const dir = tree();
  const without = (() => {
    fs.rmSync(path.join(dir, 'src/new-one.js'));
    return hashOf(dir);
  })();
  write(dir, 'src/new-one.js', 'module.exports = 2;\n');
  git(dir, 'add', 'src/new-one.js');
  fs.rmSync(path.join(dir, 'src/new-one.js'));
  assert.equal(hashOf(dir), without);
  assert.ok(!ex.workingChanges(dir).files.includes('src/new-one.js'));
});

test('fingerprint 8: the commit gate still passes after git add -A of a tree whose full run and experts check are on record', () => {
  const dir = tree();
  write(dir, 'PLAN-x.md', '---\nphase: build\nplan_confirmed: true\ntests_confirmed: true\ntest_command: node -e "process.exit(0)"\nexperts: [developer]\n---\n\n# PLAN: x\n');
  const verify = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'verify.js'), '--full', '--plan', 'PLAN-x.md'], { cwd: dir, encoding: 'utf8' });
  assert.equal(verify.status, 0, verify.stdout + verify.stderr);
  ex.prepare(dir, 'working', PLUGIN, {});
  ex.record(dir, 'review', { ok: true, expertLane: { stage: 'review', selected: ['developer'], ran: ['developer'], failed: [], recheck: true, skillsLoaded: { developer: [] }, findings: [] } }, { pluginRoot: PLUGIN, plan: 'PLAN-x.md' });
  const verdict = () => gates.commitGate(ex.commitEvidence(dir, path.join(dir, 'PLAN-x.md'), PLUGIN));
  assert.equal(verdict().allow, true, JSON.stringify(verdict()));
  git(dir, 'add', '-A');
  assert.equal(verdict().allow, true, JSON.stringify(verdict()));
  // And a real change after it is still seen.
  write(dir, 'src/new-one.js', 'module.exports = 9;\n');
  assert.equal(verdict().allow, false, JSON.stringify(verdict()));
});

test('fingerprint 9: a new file with CRLF line endings under core.autocrlf=true has the same fingerprint before and after git add', () => {
  const dir = tree({ autocrlf: 'true' });
  write(dir, 'src/crlf.js', 'line one\r\nline two\r\n');
  const before = hashOf(dir);
  git(dir, 'add', '-A');
  assert.equal(hashOf(dir), before);
});

test('fingerprint 10: prepare lists a staged new file one time, and the diff the experts read holds it one time', () => {
  const dir = tree();
  git(dir, 'add', '-A');
  const p = ex.prepare(dir, 'working', PLUGIN, {});
  assert.equal(p.files.filter((f) => f === 'src/new-one.js').length, 1);
  const text = fs.readFileSync(path.join(dir, p.diffFile), 'utf8');
  assert.equal(text.split('diff --git a/src/new-one.js b/src/new-one.js').length - 1, 1);
  assert.match(text, /\+module\.exports = 2;/);
});

test('fingerprint: a renamed file has the same fingerprint before and after the rename is staged', () => {
  const dir = tree();
  fs.renameSync(path.join(dir, 'src/keep.js'), path.join(dir, 'src/kept.js'));
  const before = hashOf(dir);
  git(dir, 'add', '-A');
  assert.equal(hashOf(dir), before);
  assert.deepStrictEqual(ex.workingChanges(dir).files.filter((f) => /kee?pt?\.js$/.test(f)).sort(), ['src/keep.js', 'src/kept.js']);
});


// The experts check of this change (2026-11-22).
test('fingerprint: a staged new file whose name git quotes (non-ASCII) is read, not "(unreadable)", and an edit of it moves the fingerprint', () => {
  const dir = tree();
  const name = 'src/café.js';
  write(dir, name, 'module.exports = "one";\n');
  const before = hashOf(dir);
  git(dir, 'add', '-A');
  assert.equal(hashOf(dir), before, 'staging does not move it');
  const p = ex.prepare(dir, 'working', PLUGIN, {});
  const text = fs.readFileSync(path.join(dir, p.diffFile), 'utf8');
  assert.match(text, /\+module\.exports = "one";/);
  assert.doesNotMatch(text, /\(unreadable\)/);
  assert.ok(p.files.includes(name), JSON.stringify(p.files));
  write(dir, name, 'module.exports = "two";\n');
  assert.notEqual(hashOf(dir), before);
});

test('fingerprint: new files whose names sort differently by bytes and by UTF-16 keep their order when one is staged', () => {
  const dir = tree();
  // U+FF5E is EF BD 9E in UTF-8 and FF5E in UTF-16; U+1F600 is F0 9F 98 80 in UTF-8 and D83D DE00 in UTF-16.
  // By bytes the first sorts first, by UTF-16 the second does. Git lists unknown files by bytes.
  write(dir, 'src/～.js', 'a\n');
  write(dir, 'src/\u{1F600}.js', 'b\n');
  const before = hashOf(dir);
  git(dir, 'add', 'src/\u{1F600}.js');
  assert.equal(hashOf(dir), before);
  git(dir, 'reset', '-q');
  git(dir, 'add', 'src/～.js');
  assert.equal(hashOf(dir), before);
});
