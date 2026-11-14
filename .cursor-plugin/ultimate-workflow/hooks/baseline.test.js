'use strict';

// The baseline: tests that already fail before a change, taken once at the start of a build,
// accepted by the user, and used to judge later full runs (hooks/verify.js). Real temp git
// repositories and the real CLI. Nothing here depends on the operating system: the repos pin
// core.autocrlf, names are compared as strings, and parsers are fed text with LF and with CRLF.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const verify = require('./verify.js');
const VERIFY = path.join(__dirname, 'verify.js');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
const CROSS = String.fromCharCode(0x2716);

// The "test suite" is full.js: it prints one failing line per name in fails.txt (node:test style,
// with a timing that changes on every run) and exits 1 when there are any. `quiet` makes it exit 1
// with output that names no test.
function repo({ fails = [], quiet = false, crlfPlan = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-baseline-'));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'core.autocrlf', 'false');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 1\n');
  const script = [
    "const fs = require('fs')",
    "const names = fs.existsSync('fails.txt') ? fs.readFileSync('fails.txt', 'utf8').split('\\n').filter(Boolean) : []",
    `const mark = String.fromCharCode(0x2716)`,
    `if (fs.existsSync('quiet.txt')) { console.log('something broke'); process.exit(1) }`,
    `let n = 0`,
    `for (const name of names) console.log(mark + ' ' + name + ' (' + (++n + Math.floor(Math.random() * 900)) + 'ms)')`,
    `if (fs.existsSync('extra.txt')) console.log(fs.readFileSync('extra.txt', 'utf8'))`,
    `process.exit(names.length || fs.existsSync('extra.txt') ? 1 : 0)`,
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'full.js'), `${script}\n`);
  fs.writeFileSync(path.join(dir, '.gitignore'), 'fails.txt\nquiet.txt\nextra.txt\n.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  const front = ['---', 'plan_confirmed: true', 'tests_confirmed: true', 'experts: []', 'test_command: node full.js', '---', '# plan', ''];
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), front.join(crlfPlan ? '\r\n' : '\n'));
  setFails(dir, fails);
  if (quiet) fs.writeFileSync(path.join(dir, 'quiet.txt'), '1');
  return dir;
}
const setFails = (dir, names) => fs.writeFileSync(path.join(dir, 'fails.txt'), names.length ? `${names.join('\n')}\n` : '');
const run = (dir, args = []) => spawnSync(process.execPath, [VERIFY, ...args], { cwd: dir, encoding: 'utf8' });
const json = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const baseline = (dir) => json(dir, '.ultimate-workflow/baseline.json');
const record = (dir) => json(dir, '.ultimate-workflow/verify.json');

// ---- reading failing tests out of runner output -----------------------------------------

test('extractFailures reads node:test, TAP, pytest, go, cargo and jest output, without timings or repeats', () => {
  const nodeTest = [`${CROSS} T1 first (12.5ms)`, `  ${CROSS} nested one (3ms)`, `${CROSS} failing tests:`, `${CROSS} T1 first (14ms)`, 'ok 3 passes'].join('\n');
  const first = verify.extractFailures(nodeTest, 1);
  assert.deepStrictEqual(first.names, ['T1 first', 'nested one']);
  assert.strictEqual(first.recognised, true);
  assert.deepStrictEqual(verify.extractFailures('not ok 4 - the third\nok 5 - fine\n# fail 1', 1).names, ['the third']);
  assert.deepStrictEqual(verify.extractFailures('FAILED tests/test_a.py::test_x - assert 1 == 2\nFAILED tests/test_b.py::test_y', 1).names, ['tests/test_a.py::test_x', 'tests/test_b.py::test_y']);
  assert.deepStrictEqual(verify.extractFailures('--- FAIL: TestAdd (0.00s)\n    add_test.go:9: bad\n--- FAIL: TestSub (0.01s)', 1).names, ['TestAdd', 'TestSub']);
  assert.deepStrictEqual(verify.extractFailures('test math::adds ... FAILED\ntest math::subs ... ok', 1).names, ['math::adds']);
  assert.deepStrictEqual(verify.extractFailures(`${String.fromCharCode(0x25cf)} Suite > does a thing\n${String.fromCharCode(0x25cf)} Console\n`, 1).names, ['Suite > does a thing']);
});

test('extractFailures reads CRLF output the same, and says when a failed run names no test', () => {
  const lf = `${CROSS} one (1ms)\n${CROSS} two (2ms)\n`;
  assert.deepStrictEqual(verify.extractFailures(lf.replace(/\n/g, '\r\n'), 1), verify.extractFailures(lf, 1));
  const none = verify.extractFailures('boom\nsegfault', 1);
  assert.deepStrictEqual([none.names, none.recognised], [[], false]);
  const green = verify.extractFailures('all good', 0);
  assert.deepStrictEqual([green.names, green.recognised], [[], true], 'a passing run needs no names');
});

// A failed run is "recognised" only when the names account for it. Each case below has a known
// failing test in the output next to a failure the parser cannot attribute; passing any of them
// would let a new failure hide behind an accepted one.
test('extractFailures does not recognise a run with a failure it cannot see', () => {
  const unseen = {
    'a pytest collection error beside a known failure': 'FAILED tests/x.py::known - assert 0\nERROR tests/y.py - ImportError: nope\n=== 1 failed, 1 error in 0.4s ===',
    'a go build failure beside a known failure': '--- FAIL: TestKnown (0.00s)\nFAIL\texample.com/b [build failed]',
    'a cargo compile error beside a known failure': 'test math::known ... FAILED\nerror[E0425]: cannot find value `x`',
    'a run stopped at the first failure': 'FAILED tests/x.py::known - assert 0\n!!! stopping after 1 failures !!!',
    'a jest coverage threshold': `${String.fromCharCode(0x25cf)} Suite > known\nJest: "global" coverage threshold for lines (80%) not met: 71%`,
    'a runner that reports more failures than it names': `${CROSS} known (1ms)\n${String.fromCharCode(0x2139)} fail 3`,
    'a TAP summary that counts more than was named': 'not ok 1 - known\n# fail 2',
    'a jest summary that counts more than was named': `${String.fromCharCode(0x25cf)} Suite > known\nTests:       2 failed, 5 passed, 7 total`,
    'cargo summaries that add up to more than was named': 'test a::known ... FAILED\ntest result: FAILED. 1 passed; 1 failed; 0 ignored\ntest result: FAILED. 0 passed; 1 failed; 0 ignored',
  };
  for (const [what, output] of Object.entries(unseen)) {
    const r = verify.extractFailures(output, 1);
    assert.strictEqual(r.recognised, false, what);
    assert.ok(r.names.length > 0, `${what}: the known name is still read, only the verdict is withheld`);
  }
});

test('extractFailures does count a summary that agrees with the names', () => {
  assert.strictEqual(verify.extractFailures(`${CROSS} a (1ms)\n${CROSS} b (1ms)\n${String.fromCharCode(0x2139)} fail 2`, 1).recognised, true);
  assert.strictEqual(verify.extractFailures(`${CROSS} parent (1ms)\n  ${CROSS} child (1ms)\n${String.fromCharCode(0x2139)} fail 1`, 1).recognised, true, 'a failing child also fails its parent: more names than the count is fine');
  assert.strictEqual(verify.extractFailures('FAILED tests/x.py::one - e\nFAILED tests/x.py::two - e\n=== 2 failed, 3 passed in 1s ===', 1).recognised, true);
  assert.strictEqual(verify.extractFailures('--- FAIL: TestA (0.00s)\nFAIL\nFAIL\texample.com/a\t0.01s', 1).recognised, true, 'go has no count line; a plain package FAIL is not a build failure');
});

test('extractFailures reads pytest names with spaces and does not take a unittest summary for a test', () => {
  const r = verify.extractFailures('FAILED tests/x.py::test[a b] - assert 0\nFAILED tests/x.py::test[a c] - assert 0\nFAILED (failures=2)', 1);
  assert.deepStrictEqual(r.names, ['tests/x.py::test[a b]', 'tests/x.py::test[a c]']);
  assert.deepStrictEqual(verify.extractFailures('FAILED (failures=1)', 1).names, [], 'unittest has no test name on that line');
});

test('judge: passes only when every failing test is on the list, and never when they cannot be told apart', () => {
  const base = { failures: ['a', 'b'] };
  const out = (...names) => names.map((n) => `${CROSS} ${n} (1ms)`).join('\n');
  assert.deepStrictEqual(verify.judge(1, out('a', 'b'), base), { passed: true, known: ['a', 'b'], fixed: [], newFailures: [], unrecognised: false });
  assert.strictEqual(verify.judge(1, out('a'), base).passed, true);
  assert.deepStrictEqual(verify.judge(1, out('a'), base).fixed, ['b']);
  assert.deepStrictEqual(verify.judge(1, out('a', 'c'), base).newFailures, ['c']);
  assert.strictEqual(verify.judge(1, out('a', 'c'), base).passed, false);
  assert.strictEqual(verify.judge(1, out('b', 'c'), base).passed, false, 'a swap is a new failure');
  assert.deepStrictEqual(verify.judge(1, 'boom', base), { passed: false, known: [], fixed: [], newFailures: [], unrecognised: true });
  assert.strictEqual(verify.judge(0, '', base).passed, true);
});

// ---- taking the baseline ---------------------------------------------------------------

test('--baseline records the tests that fail before any change, and does not accept them by itself', () => {
  const dir = repo({ fails: ['beta test', 'alpha test'] });
  const r = run(dir, ['--baseline']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stderr, '');
  assert.match(r.stdout, /2 tests fail before any change/);
  assert.match(r.stdout, /- alpha test/);
  assert.match(r.stdout, /- beta test/);
  assert.ok(r.stdout.replace(/\\/g, '/').includes(`node "${VERIFY.replace(/\\/g, '/')}" --accept-baseline`), 'the hint is a command that works from the project, with the real script path');
  const b = baseline(dir);
  assert.deepStrictEqual(b.failures, ['alpha test', 'beta test'], 'sorted, no timings');
  assert.strictEqual(b.accepted, false);
  assert.strictEqual(b.recognised, true);
  assert.strictEqual(b.command, 'node full.js');
  assert.ok(b.head && b.head.length >= 7, 'it remembers the commit it was taken at');
});

test('--baseline on a passing suite has nothing to accept', () => {
  const dir = repo();
  const r = run(dir, ['--baseline']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /nothing to accept/);
  assert.deepStrictEqual(baseline(dir).failures, []);
  assert.strictEqual(baseline(dir).accepted, true);
});

test('--baseline is refused once a source file has changed, and records nothing', () => {
  const dir = repo({ fails: ['x'] });
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 2\n');
  const r = run(dir, ['--baseline']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /before any test or code is written/);
  assert.match(r.stderr, /src\/a\.js/);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(fs.existsSync(path.join(dir, '.ultimate-workflow', 'baseline.json')), false);
});

test('--baseline is allowed when only documents and the plan changed', () => {
  const dir = repo({ fails: ['x'] });
  fs.writeFileSync(path.join(dir, 'NOTES.md'), 'a note\n');
  assert.strictEqual(run(dir, ['--baseline']).status, 0);
});

test('--baseline is allowed when only the local files of the host app changed', () => {
  const dir = repo({ fails: ['x'] });
  fs.mkdirSync(path.join(dir, '.claude', 'worktrees', 'w'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'launch.json'), '{"version":"0.0.1","configurations":[]}\n');
  fs.writeFileSync(path.join(dir, '.claude', 'settings.local.json'), '{}\n');
  fs.writeFileSync(path.join(dir, '.claude', 'worktrees', 'w', 'a.js'), 'x\n');
  assert.strictEqual(run(dir, ['--baseline']).status, 0);
});

test('--baseline is still refused for a shared file under .claude, such as a hook', () => {
  const dir = repo({ fails: ['x'] });
  fs.mkdirSync(path.join(dir, '.claude', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'hooks', 'check.js'), 'process.exit(0)\n');
  const r = run(dir, ['--baseline']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /\.claude\/hooks\/check\.js/);
});

test('--baseline on a failed run that names no test says so and asks for the list', () => {
  const dir = repo({ quiet: true });
  const r = run(dir, ['--baseline']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /no failing test name was recognised/);
  assert.match(r.stdout, /--failures-file/);
  assert.strictEqual(baseline(dir).recognised, false);
  const accept = run(dir, ['--accept-baseline']);
  assert.strictEqual(accept.status, 2, 'it will not accept a list it does not have');
  assert.match(accept.stderr, /--failures-file/);
});

// ---- accepting it ----------------------------------------------------------------------

test('--accept-baseline marks it accepted and lists it in the plan, once, with the count in the front matter', () => {
  const dir = repo({ fails: ['alpha', 'beta'] });
  run(dir, ['--baseline']);
  const a = run(dir, ['--accept-baseline']);
  assert.strictEqual(a.status, 0, a.stderr);
  assert.match(a.stdout, /2 known failures, listed in PLAN-x\.md/);
  assert.strictEqual(baseline(dir).accepted, true);
  const plan = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.match(plan, /^known_failures: 2$/m);
  assert.match(plan, /## Known failures\n\nTests that failed before this change[^\n]*\n\n- alpha\n- beta\n$/);
  run(dir, ['--accept-baseline']);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8').match(/## Known failures/g).length, 1, 'accepting again replaces the section');
});

test('--accept-baseline replaces a Known failures section in the middle of the plan and keeps the heading after it apart', () => {
  const dir = repo({ fails: ['alpha'] });
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, `${fs.readFileSync(plan, 'utf8')}\n## Known failures\n\n- stale\n\n## Next steps\n\n- do it\n`);
  run(dir, ['--baseline']);
  assert.strictEqual(run(dir, ['--accept-baseline']).status, 0);
  const text = fs.readFileSync(plan, 'utf8');
  assert.doesNotMatch(text, /- stale/);
  assert.match(text, /- alpha\n\n## Next steps\n\n- do it\n$/, 'one blank line between the list and the next heading');
  assert.strictEqual(text.match(/## Known failures/g).length, 1);
});

test('--accept-baseline keeps a CRLF plan CRLF', () => {
  const dir = repo({ fails: ['alpha'], crlfPlan: true });
  run(dir, ['--baseline']);
  assert.strictEqual(run(dir, ['--accept-baseline']).status, 0);
  const plan = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8');
  assert.match(plan, /^known_failures: 1\r?$/m);
  assert.strictEqual(plan.replace(/\r\n/g, '').includes('\n'), false, 'no bare LF was mixed in');
  assert.match(plan, /^---\r\nplan_confirmed: true\r\n/);
});

test('--accept-baseline --failures-file takes the list a reader extracted when the output named none', () => {
  const dir = repo({ quiet: true });
  run(dir, ['--baseline']);
  fs.writeFileSync(path.join(dir, 'list.txt'), 'second one (4ms)\r\nfirst one\r\n\r\nfirst one\r\n');
  const a = run(dir, ['--accept-baseline', '--failures-file', 'list.txt']);
  assert.strictEqual(a.status, 0, a.stderr);
  assert.deepStrictEqual(baseline(dir).failures, ['first one', 'second one']);
  fs.writeFileSync(path.join(dir, 'empty.txt'), '\n');
  assert.strictEqual(run(dir, ['--accept-baseline', '--failures-file', 'empty.txt']).status, 2);
});

test('--accept-baseline needs a baseline', () => {
  const dir = repo();
  const r = run(dir, ['--accept-baseline']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /--baseline first/);
  assert.ok(r.stderr.replace(/\\/g, '/').includes(VERIFY.replace(/\\/g, '/')), 'the hint names the real script, not a relative path that does not exist in the project');
});

// ---- judging a full run against it -----------------------------------------------------

const accepted = (fails) => {
  const dir = repo({ fails });
  run(dir, ['--baseline']);
  run(dir, ['--accept-baseline']);
  return dir;
};

test('a full run whose only failures are the accepted ones passes, and says how many', () => {
  const dir = accepted(['alpha', 'beta']);
  const r = run(dir, ['--full']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /full run passed with 2 known failures \(the accepted baseline\) and 0 new/);
  // The audit trail: every pass that leans on the baseline names the tests and when they were accepted.
  assert.match(r.stdout, /verify: accepted on \d{4}-\d{2}-\d{2}T[^;]*; these tests were not run to green:/);
  assert.match(r.stdout, /^ {2}- alpha$/m);
  assert.match(r.stdout, /^ {2}- beta$/m);
  const rec = record(dir);
  assert.strictEqual(rec.passed, true);
  assert.strictEqual(rec.knownFailures, 2);
  assert.deepStrictEqual(rec.newFailures, []);
  assert.strictEqual(rec.baselineAcceptedAt, baseline(dir).acceptedAt, 'the record says when the list was accepted');
  assert.ok(rec.baselineAcceptedAt);
});

test('a pass that rests on the baseline is a pass for the commit check too (--if-stale sees it)', () => {
  const dir = accepted(['alpha']);
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'exports.a = 2\n');
  assert.strictEqual(run(dir, ['--full']).status, 0);
  const again = run(dir, ['--full', '--if-stale']);
  assert.strictEqual(again.status, 0);
  assert.match(again.stdout, /already covers these changes/);
});

test('one new failing test fails the run and is named', () => {
  const dir = accepted(['alpha', 'beta']);
  setFails(dir, ['alpha', 'beta', 'gamma']);
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout, /1 failing test is not in the accepted baseline/);
  assert.match(r.stdout, /- gamma/);
  assert.strictEqual(record(dir).passed, false);
  assert.deepStrictEqual(record(dir).newFailures, ['gamma']);
});

test('a swap fails: one accepted test fixed, another broken', () => {
  const dir = accepted(['alpha', 'beta']);
  setFails(dir, ['alpha', 'delta']);
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout, /- delta/);
  assert.strictEqual(record(dir).passed, false);
});

test('fixing an accepted test is not an error, and is reported', () => {
  const dir = accepted(['alpha', 'beta']);
  setFails(dir, ['alpha']);
  const r = run(dir, ['--full']);
  assert.strictEqual(r.status, 0, r.stdout);
  assert.match(r.stdout, /1 known failure \(the accepted baseline\) and 0 new; 1 of the known failures now pass/);
  assert.strictEqual(record(dir).fixedFailures, 1);
});

test('a baseline the user has not accepted never lets a red run pass', () => {
  const dir = repo({ fails: ['alpha'] });
  run(dir, ['--baseline']);
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0);
  assert.strictEqual(record(dir).passed, false);
  assert.match(r.stdout, /full run failed \(exit 1\)/);
  assert.doesNotMatch(r.stdout, /known failure/);
});

test('a red run whose failures cannot be told apart never passes, even with an accepted baseline', () => {
  const dir = accepted(['alpha']);
  fs.writeFileSync(path.join(dir, 'quiet.txt'), '1');
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout, /could not be told apart from the accepted baseline/);
  assert.strictEqual(record(dir).passed, false);
});

test('a known failing test next to a failure the parser cannot see does not pass (a collection error, a count that is higher)', () => {
  const dir = accepted(['alpha']);
  fs.writeFileSync(path.join(dir, 'extra.txt'), 'ERROR tests/other.py - ImportError: no module named widgets\n');
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout, /could not be told apart from the accepted baseline/);
  assert.strictEqual(record(dir).passed, false);
  assert.strictEqual('knownFailures' in record(dir), false, 'no pass is claimed, so no count of known failures either');

  fs.writeFileSync(path.join(dir, 'extra.txt'), `${String.fromCharCode(0x2139)} fail 3\n`);
  const counted = run(dir, ['--full']);
  assert.notStrictEqual(counted.status, 0, 'the runner says three failed, only one is named');
  assert.strictEqual(record(dir).passed, false);
});

test('--baseline will not offer a list that does not account for the failures', () => {
  const dir = repo({ fails: ['alpha'] });
  fs.writeFileSync(path.join(dir, 'extra.txt'), 'ERROR tests/other.py - ImportError\n');
  const r = run(dir, ['--baseline']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /do not account for every failure/);
  assert.strictEqual(baseline(dir).recognised, false);
  assert.strictEqual(run(dir, ['--accept-baseline']).status, 2, 'accepting needs the complete list from the reader');
});

test('the baseline stops counting once the work is committed: the next change starts from a new one', () => {
  const dir = accepted(['alpha']);
  assert.strictEqual(run(dir, ['--full']).status, 0);
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'work');
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0, 'a different HEAD, so the old list no longer applies');
  assert.doesNotMatch(r.stdout, /known failure/);
});

test('the baseline is for one test command: a different command is judged without it', () => {
  const dir = accepted(['alpha']);
  const plan = fs.readFileSync(path.join(dir, 'PLAN-x.md'), 'utf8').replace('test_command: node full.js', 'test_command: node full.js --other');
  fs.writeFileSync(path.join(dir, 'PLAN-x.md'), plan);
  const r = run(dir, ['--full']);
  assert.notStrictEqual(r.status, 0);
  assert.doesNotMatch(r.stdout, /known failure/);
});

test('a green full run is unchanged: exit 0, passed, and no baseline fields in the record', () => {
  const dir = repo();
  const r = run(dir, ['--full']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /full run passed/);
  assert.strictEqual(record(dir).passed, true);
  assert.strictEqual('knownFailures' in record(dir), false);
});

test('setFrontLine replaces or adds a line, keeps the line endings, and leaves a document without front matter alone', () => {
  assert.strictEqual(verify.setFrontLine('---\na: 1\n---\nbody\n', 'known_failures', 3), '---\na: 1\nknown_failures: 3\n---\nbody\n');
  assert.strictEqual(verify.setFrontLine('---\r\na: 1\r\nknown_failures: 9\r\n---\r\nbody\r\n', 'known_failures', 3), '---\r\na: 1\r\nknown_failures: 3\r\n---\r\nbody\r\n');
  assert.strictEqual(verify.setFrontLine('no front matter\n', 'known_failures', 3), 'no front matter\n');
});

test('frontmatter: writeKnownFailures handles a plan with no front matter without corrupting it, and still writes the section', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-kf-'));
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '# PLAN x\n\nbody\n');
  verify.writeKnownFailures(plan, ['a test']);
  const out = fs.readFileSync(plan, 'utf8');
  assert.ok(out.startsWith('# PLAN x\n\nbody\n'), 'the original text is untouched');
  assert.match(out, /## Known failures[\s\S]*- a test/);
  assert.ok(!out.startsWith('---'), 'no front matter was invented');
  fs.rmSync(dir, { recursive: true, force: true });
});
