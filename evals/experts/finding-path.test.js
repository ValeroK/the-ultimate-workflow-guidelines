'use strict';

// PLAN-5.2.1, card finding-path. An expert sometimes names the file of a finding with an absolute path. The record
// kept it as given, and a changed-only check compared it with the relative paths of the delta: no match, so a finding
// whose file WAS checked again was carried forward and the commit gate held it as open (found on 2026-11-20: two
// corrected findings had to be dismissed by the user).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ex = require(path.join(PLUGIN, 'experts', 'experts.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
};
const FILES = ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js', 'src/e.js', 'src/f.js'];

/** A repository whose working tree changes six files that do not use each other. */
function card() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-fpath-')));
  made.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  for (const [i, f] of FILES.entries()) write(path.join(dir, f), `module.exports = ${i};\n`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  for (const [i, f] of FILES.entries()) write(path.join(dir, f), `module.exports = ${i};\n// card change ${i}\n`);
  return dir;
}
const lane = (over = {}) => ({
  ok: true,
  expertLane: { stage: 'review', selected: ['developer'], ran: ['developer'], failed: [], recheck: true, skillsLoaded: { developer: [] }, findings: [], ...over },
});
const finding = (file, what = 'the value is wrong here', confidence = 'high') => ({ expert: 'developer', file, line: 1, what, confidence, status: 'confirmed' });
const recordFile = (dir) => path.join(dir, '.ultimate-workflow', 'experts', 'review', 'developer.json');
const onRecord = (dir) => JSON.parse(fs.readFileSync(recordFile(dir), 'utf8'));
const full = (dir, findings) => {
  ex.prepare(dir, 'working', PLUGIN, { delta: true });
  return ex.record(dir, 'review', lane({ findings }), { pluginRoot: PLUGIN });
};
const fix = (dir, file) => write(path.join(dir, file), `${fs.readFileSync(path.join(dir, file), 'utf8')}// fixed\n`);
const delta = (dir, findings = []) => {
  const p = ex.prepare(dir, 'working', PLUGIN, { delta: true });
  assert.ok(p.delta, `the check is a changed-only one: ${p.deltaRefused || ''}`);
  return ex.record(dir, 'review', lane({ findings, delta: { ...p.delta } }), { pluginRoot: PLUGIN });
};
const allowed = (dir) => gates.commitGate(ex.commitEvidence(dir, '', PLUGIN));

test('finding-path 1-2: a finding given with an absolute path, with backslashes or with ./ is stored with the path of the diff', () => {
  const dir = card();
  full(dir, [
    finding(path.join(dir, 'src', 'a.js'), 'given as an absolute path'),
    finding('src\\b.js', 'given with a backslash'),
    finding('./src/c.js', 'given with a dot and a slash'),
    finding('src/d.js', 'given as the diff gives it'),
  ]);
  assert.deepStrictEqual(onRecord(dir).findings.map((f) => f.file), ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js']);
});

test('finding-path 3: the id of a finding is the same for the absolute form and the relative form of its file', () => {
  const one = card();
  full(one, [finding(path.join(one, 'src', 'a.js'))]);
  const two = card();
  full(two, [finding('src/a.js')]);
  assert.equal(onRecord(one).findings[0].id, onRecord(two).findings[0].id);
});

test('finding-path 4: a finding given with an absolute path is not carried when its file is in the changed-only check', () => {
  const dir = card();
  const first = full(dir, [finding(path.join(dir, 'src', 'a.js'))]);
  assert.equal(first.open.length, 1);
  fix(dir, 'src/a.js');
  const r = delta(dir);
  assert.deepStrictEqual(r.open, []);
  assert.deepStrictEqual(onRecord(dir).findings, []);
  assert.equal(allowed(dir).missing === undefined || !allowed(dir).missing.some((m) => m.kind === 'experts'), true, JSON.stringify(allowed(dir)));
});

test('finding-path 5: the same finding is carried, and still blocks, when its file is not in the changed-only check', () => {
  const dir = card();
  full(dir, [finding(path.join(dir, 'src', 'a.js'))]);
  fix(dir, 'src/b.js');
  const r = delta(dir);
  assert.equal(r.open.length, 1);
  const rec = onRecord(dir).findings;
  assert.equal(rec.length, 1);
  assert.equal(rec[0].file, 'src/a.js');
  assert.ok(rec[0].carriedFrom);
  assert.match(JSON.stringify(allowed(dir)), /still open/);
});

test('finding-path 6: a record of 5.2.0, with an absolute path and its old id, is not carried when its file is in the changed-only check', () => {
  const dir = card();
  full(dir, [finding('src/a.js')]);
  // The record as 5.2.0 wrote it: the path as the expert gave it, and the id made from that path.
  const rec = onRecord(dir);
  rec.findings[0].file = path.join(dir, 'src', 'a.js');
  rec.findings[0].id = 'old0000001';
  fs.writeFileSync(recordFile(dir), JSON.stringify(rec));
  fix(dir, 'src/a.js');
  assert.deepStrictEqual(delta(dir).open, []);
});

test('finding-path 7: a dismissal made for the old id of a finding still applies when the finding is carried', () => {
  const dir = card();
  full(dir, [finding('src/a.js')]);
  const rec = onRecord(dir);
  rec.findings[0].file = path.join(dir, 'src', 'a.js');
  rec.findings[0].id = 'old0000002';
  fs.writeFileSync(recordFile(dir), JSON.stringify(rec));
  ex.resolve(dir, 'old0000002', 'the user says this one is accepted', PLUGIN);
  fix(dir, 'src/b.js');
  const r = delta(dir);
  assert.deepStrictEqual(r.open, [], 'carried, and dismissed');
  assert.equal(onRecord(dir).findings[0].id, 'old0000002');
});

test('finding-path 8: a path outside the project and a path with a repository name are stored as given', () => {
  const dir = card();
  const outside = path.join(os.tmpdir(), 'not-in-the-project', 'x.js');
  full(dir, [finding(outside, 'a file outside the project', 'medium'), finding('demo:src/a.js', 'a file of another repository', 'medium')]);
  assert.deepStrictEqual(onRecord(dir).findings.map((f) => f.file), [outside, 'demo:src/a.js']);
});
