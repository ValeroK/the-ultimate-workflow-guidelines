'use strict';

// `experts.js present` writes a document out of the Workflow tool's complete output file, so the
// plan never has to pass through the model (the completion notification is cut off when a phase
// result is large). These tests run the real CLI with spawnSync and assert stdout, stderr and the
// exit code separately.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'experts.js');
const ex = require(CLI);

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-present-'));
  made.push(dir);
  return dir;
};
const run = (cwd, args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });

const PLAN = '---\nphase: plan\nplan_confirmed: false\ntests_confirmed: false\n---\n\n# Plan: x\n\n## Files\n\nUse a && b, not Map<string, number>.\n\n## Open questions\n\n- none\n';
const wrap = (result) => JSON.stringify({ summary: 's', agentCount: 3, logs: [], result }, null, 2);
const inDir = (dir, name, text) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, text);
  return f;
};

test('present: writes the whole field from a Workflow wrapper, unchanged when nothing is escaped', () => {
  const dir = tmp();
  const result = inDir(dir, 'r.json', wrap({ ok: true, planMarkdown: PLAN }));
  const out = path.join(dir, 'plan.md');
  const r = run(dir, ['present', '--result', result, '--field', 'planMarkdown', '--out', out]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stderr, '');
  assert.strictEqual(fs.readFileSync(out, 'utf8'), PLAN);
  const info = JSON.parse(r.stdout);
  assert.strictEqual(info.lastHeading, '## Open questions');
  assert.strictEqual(info.chars, PLAN.length);
  assert.strictEqual(info.confirmed, false);
});

test('present: accepts the bare result as well as the wrapper', () => {
  const dir = tmp();
  const result = inDir(dir, 'r.json', JSON.stringify({ ok: true, planMarkdown: PLAN }));
  const out = path.join(dir, 'plan.md');
  assert.strictEqual(run(dir, ['present', '--result', result, '--field', 'planMarkdown', '--out', out]).status, 0);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), PLAN);
});

test('present: decodes the five entities, &amp; last, so &amp;lt; becomes &lt; and not <', () => {
  const dir = tmp();
  const escaped = '# T\n\na &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39; and &amp;lt; stays\n';
  const result = inDir(dir, 'r.json', wrap({ ok: true, planMarkdown: escaped }));
  const out = path.join(dir, 'plan.md');
  assert.strictEqual(run(dir, ['present', '--result', result, '--field', 'planMarkdown', '--out', out]).status, 0);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), '# T\n\na & b <c> "d" \'e\' and &lt; stays\n');
  assert.strictEqual(ex.decodeEntities('&amp;gt;'), '&gt;');
});

test('present: --confirm sets only the named front matter line to true', () => {
  const dir = tmp();
  const result = inDir(dir, 'r.json', wrap({ ok: true, planMarkdown: PLAN }));
  const out = path.join(dir, 'PLAN-x.md');
  const r = run(dir, ['present', '--result', result, '--field', 'planMarkdown', '--out', out, '--confirm', 'plan_confirmed']);
  assert.strictEqual(r.status, 0, r.stderr);
  const text = fs.readFileSync(out, 'utf8');
  assert.match(text, /^plan_confirmed: true$/m);
  assert.match(text, /^tests_confirmed: false$/m, 'the other flag is untouched');
  assert.strictEqual(text.replace('plan_confirmed: true', 'plan_confirmed: false'), PLAN, 'nothing else changed');
  assert.strictEqual(JSON.parse(r.stdout).confirmed, true);
});

test('present: --confirm on a document without that line fails and writes nothing', () => {
  const dir = tmp();
  const result = inDir(dir, 'r.json', wrap({ ok: true, planMarkdown: '# No front matter\n' }));
  const out = path.join(dir, 'PLAN-x.md');
  const r = run(dir, ['present', '--result', result, '--field', 'planMarkdown', '--out', out, '--confirm', 'plan_confirmed']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /no `plan_confirmed:` line/);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(fs.existsSync(out), false);
});

test('present: refuses a missing file, a result that is not ok, a missing or empty field, and writes nothing', () => {
  const dir = tmp();
  const out = path.join(dir, 'plan.md');
  const cases = [
    [path.join(dir, 'absent.json'), 'planMarkdown', /cannot read the Workflow output file/],
    [inDir(dir, 'notok.json', wrap({ ok: false, planMarkdown: PLAN })), 'planMarkdown', /not ok/],
    [inDir(dir, 'nofield.json', wrap({ ok: true })), 'planMarkdown', /no "planMarkdown" text/],
    [inDir(dir, 'empty.json', wrap({ ok: true, planMarkdown: '   \n' })), 'planMarkdown', /no "planMarkdown" text/],
    [inDir(dir, 'cut.json', '{"summary":"s","result":{"ok":true,"planMarkdown":"# cut off'), 'planMarkdown', /not a phase result/],
  ];
  for (const [file, field, message] of cases) {
    const r = run(dir, ['present', '--result', file, '--field', field, '--out', out]);
    assert.strictEqual(r.status, 2, `${path.basename(file)}: ${r.stderr}`);
    assert.match(r.stderr, message);
    assert.strictEqual(r.stdout, '');
    assert.strictEqual(fs.existsSync(out), false, `${path.basename(file)} must not leave a partial document`);
  }
});

test('present: needs --result, --field and --out', () => {
  const dir = tmp();
  for (const args of [['present'], ['present', '--result', 'x'], ['present', '--result', 'x', '--field', 'planMarkdown']]) {
    const r = run(dir, args);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /present needs --/);
  }
});

test('present --from: copies a text file as it is, so what the user edited in the plan view is what gets confirmed', () => {
  const dir = tmp();
  const edited = PLAN.replace('- none', '- the user edited this in the plan view');
  const from = inDir(dir, 'host-plan.md', edited);
  const out = path.join(dir, 'PLAN-x.md');
  const r = run(dir, ['present', '--from', from, '--out', out, '--confirm', 'plan_confirmed']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), edited.replace('plan_confirmed: false', 'plan_confirmed: true'));
});

test('present --from: is not decoded, refuses an empty file, and refuses --from with --result', () => {
  const dir = tmp();
  const from = inDir(dir, 'host-plan.md', '# A &amp; B\n');
  const out = path.join(dir, 'x.md');
  assert.strictEqual(run(dir, ['present', '--from', from, '--out', out]).status, 0);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), '# A &amp; B\n', 'a file the user may have edited is copied, never rewritten');
  const empty = inDir(dir, 'empty.md', '  \n');
  const r = run(dir, ['present', '--from', empty, '--out', path.join(dir, 'y.md')]);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /is empty/);
  const both = run(dir, ['present', '--from', from, '--result', 'r.json', '--field', 'planMarkdown', '--out', path.join(dir, 'z.md')]);
  assert.strictEqual(both.status, 2);
  assert.match(both.stderr, /not both/);
  assert.strictEqual(fs.existsSync(path.join(dir, 'y.md')), false);
});

test('present --append: adds the tests section to the end of the plan and confirms tests only', () => {
  const dir = tmp();
  const plan = inDir(dir, 'PLAN-x.md', PLAN.replace('plan_confirmed: false', 'plan_confirmed: true'));
  const result = inDir(dir, 'r.json', wrap({ ok: true, testsMarkdown: '## Tests\n\n- a case\n' }));
  const r = run(dir, ['present', '--result', result, '--field', 'testsMarkdown', '--out', plan, '--append', '--confirm', 'tests_confirmed']);
  assert.strictEqual(r.status, 0, r.stderr);
  const text = fs.readFileSync(plan, 'utf8');
  // 2026-11-09: confirming the test plan also records the hash of the plan the user confirmed.
  assert.match(text, /^confirmed_hash: [0-9a-f]{16}$/m);
  // 2026-11-13 (PLAN-simplify, commit-check): it also records the settings the hash leaves out, in `confirmed_settings`, to show a later change to one.
  assert.match(text, /^confirmed_settings: \{.*\}$/m);
  const withoutHash = text.replace(/^confirmed_hash: [0-9a-f]{16}\r?\n/m, '').replace(/^confirmed_settings: .*\r?\n/m, '');
  assert.ok(withoutHash.startsWith(PLAN.replace('plan_confirmed: false', 'plan_confirmed: true').replace('tests_confirmed: false', 'tests_confirmed: true').trimEnd()), 'the plan is untouched apart from the flag and the hash');
  assert.ok(text.endsWith('\n\n## Tests\n\n- a case\n'));
  assert.match(text, /^plan_confirmed: true$/m);
  assert.match(text, /^tests_confirmed: true$/m);
  assert.strictEqual(JSON.parse(r.stdout).appended, true);
});

test('present --append: refuses a file that does not exist and creates nothing', () => {
  const dir = tmp();
  const result = inDir(dir, 'r.json', wrap({ ok: true, testsMarkdown: '## Tests\n' }));
  const out = path.join(dir, 'missing.md');
  const r = run(dir, ['present', '--result', result, '--field', 'testsMarkdown', '--out', out, '--append']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /--append needs/);
  assert.strictEqual(fs.existsSync(out), false);
});

// A Windows checkout (and a git clone with autocrlf) has CRLF files, and a plan the user edited in
// the plan view may too. The same behaviour must hold on Linux, macOS and Windows.
test('present: a CRLF plan is confirmed and appended to without breaking its front matter or line endings', () => {
  const dir = tmp();
  const crlf = PLAN.replace(/\n/g, '\r\n');
  const from = inDir(dir, 'host-plan.md', crlf);
  const out = path.join(dir, 'PLAN-x.md');
  const r = run(dir, ['present', '--from', from, '--out', out, '--confirm', 'plan_confirmed']);
  assert.strictEqual(r.status, 0, r.stderr);
  const text = fs.readFileSync(out, 'utf8');
  assert.strictEqual(text, crlf.replace('plan_confirmed: false', 'plan_confirmed: true'), 'only the flag changed, CRLF kept');

  const result = inDir(dir, 'r.json', wrap({ ok: true, testsMarkdown: '## Tests\n\n- a case\n' }).replace(/\n/g, '\r\n'));
  const a = run(dir, ['present', '--result', result, '--field', 'testsMarkdown', '--out', out, '--append', '--confirm', 'tests_confirmed']);
  assert.strictEqual(a.status, 0, a.stderr);
  const after = fs.readFileSync(out, 'utf8');
  assert.match(after, /^plan_confirmed: true\r?$/m);
  assert.match(after, /^tests_confirmed: true\r?$/m);
  assert.ok(after.includes('## Tests'), 'the appended section is there');
  assert.ok(after.startsWith('---\r\nphase: plan\r\n'), 'the front matter is still the first thing in the file');
  assert.strictEqual(after.replace(/\r\n/g, '').includes('\n'), false, 'the appended section took the file\'s CRLF, so there is no bare LF');
});

test('present: decodes only a text that came back escaped as a whole, never a plan that merely mentions an entity', () => {
  const dir = tmp();
  const out = path.join(dir, 'plan.md');
  const plain = '# Plan\n\nEscape & as `&amp;`, and write Map<string, number> as `&lt;` and `&gt;`.\n';
  const r1 = inDir(dir, 'plain.json', wrap({ ok: true, planMarkdown: plain }));
  assert.strictEqual(run(dir, ['present', '--result', r1, '--field', 'planMarkdown', '--out', out]).status, 0);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), plain, 'raw < and a bare & show it was not escaped');
  const onlyEntity = '# Plan\n\nThe string `&amp;` is what HTML uses.\n';
  assert.strictEqual(ex.looksEscaped('Use &lt;div&gt; here &amp; there'), true);
  assert.strictEqual(ex.looksEscaped('Use <div> and &amp; here'), false, 'a raw < means it was not escaped');
  assert.strictEqual(ex.looksEscaped('Tom & Jerry and &amp; more'), false, 'a bare & means it was not escaped');
  assert.strictEqual(ex.looksEscaped('nothing to decode'), false);
  assert.ok(onlyEntity.includes('&amp;'));
});

test('present: relative paths are taken from --cwd, like the other subcommands', () => {
  const dir = tmp();
  const elsewhere = tmp();
  inDir(dir, 'r.json', wrap({ ok: true, planMarkdown: PLAN }));
  const r = run(elsewhere, ['present', '--cwd', dir, '--result', 'r.json', '--field', 'planMarkdown', '--out', 'sub/plan.md']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'sub', 'plan.md'), 'utf8'), PLAN);
  assert.strictEqual(fs.existsSync(path.join(elsewhere, 'sub')), false, 'nothing was written under the shell\'s own folder');
});

test('present: creates the folder of --out, and works for testsMarkdown', () => {
  const dir = tmp();
  const result = inDir(dir, 'r.json', wrap({ ok: true, testsMarkdown: '# Tests\n\n## Cases\n' }));
  const out = path.join(dir, 'deep', 'er', 'tests.md');
  const r = run(dir, ['present', '--result', result, '--field', 'testsMarkdown', '--out', out]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), '# Tests\n\n## Cases\n');
});
