'use strict';

// PLAN-run-fixes.md, card dry-run (criterion 10), tests 65 to 71 and the security cases: the plan's
// size claims are measured before the tests are confirmed. lib/claims.js reads and judges the
// `measure:` lines; `experts.js claims` adds each card's pack size and prints one JSON line.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const claims = require(path.join(PLUGIN, 'lib', 'claims.js'));

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'uw-claims-'));
const put = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const plan = (measures = [], extra = '') => `---
phase: tests
plan_confirmed: true
${extra}---

# PLAN: x

## Goal

Small.

${measures.map((m) => `- measure: ${m}`).join('\n')}

## Cards

- a: first
  paths: src/a/**, data/big.bin
- b: second
  paths: src/b/b.js

## Tests

### a: first

1. \`a works\`.

### b: second

2. \`b works\`.
`;
function project(measures, extra) {
  const dir = tmp();
  put(dir, 'PLAN-x.md', plan(measures, extra));
  put(dir, 'src/a/one.js', 'a'.repeat(100));
  put(dir, 'src/a/deep/two.js', 'b'.repeat(50));
  put(dir, 'src/b/b.js', 'c'.repeat(30));
  put(dir, 'data/big.bin', 'd'.repeat(1000));
  return dir;
}
const env = () => {
  const e = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const cli = (dir, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd: dir, encoding: 'utf8', env: env() });
const lastJson = (r) => {
  const lines = r.stdout.trim().split(/\r?\n/);
  assert.ok(lines[lines.length - 1].startsWith('{'), `no JSON line; stdout: ${r.stdout} stderr: ${r.stderr}`);
  return JSON.parse(lines[lines.length - 1]);
};
const runClaims = (dir) => lastJson(cli(dir, 'claims', '--plan', 'PLAN-x.md', '--feature', 'x'));

test('65: claims prints each card\'s pack size against pack_budget, and lists a card whose pack is over the budget', () => {
  const dir = project([], 'pack_budget: 12000\n');
  const out = runClaims(dir);
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.deepStrictEqual(out.packs.map((p) => p.card), ['a', 'b']);
  for (const p of out.packs) {
    const packed = lastJson(cli(dir, 'pack', '--plan', 'PLAN-x.md', '--card', p.card, '--feature', 'x'));
    assert.equal(p.tokens, packed.tokens, `card ${p.card}: the tokens autopilot pack gives`);
    assert.equal(p.budget, 12000);
    assert.equal(p.overBudget, false);
    assert.ok(p.tokens > 0);
  }
  assert.deepStrictEqual(out.overBudget, []);
  // A budget the required entries alone are over.
  const tight = project([], 'pack_budget: 1000\n');
  put(tight, 'PLAN-x.md', plan([], 'pack_budget: 1000\n').replace('Small.', `Small. ${'word '.repeat(2000)}`));
  const over = runClaims(tight);
  assert.deepStrictEqual(over.overBudget, ['a', 'b']);
  assert.equal(over.stop, true, 'a pack over its budget is put to the user');
});

test('66: a measure: bytes line gives the size now, the room left and the cards under the glob', () => {
  const dir = project(['bytes src/a/** <= 500', 'bytes src/**/*.js <= 200', 'bytes data/big.bin <= 1000']);
  const out = runClaims(dir);
  assert.equal(out.measures.length, 3);
  const [a, js, big] = out.measures;
  assert.deepStrictEqual({ size: a.size, room: a.room, passing: a.passing, understood: a.understood, cards: a.cards }, { size: 150, room: 350, passing: true, understood: true, cards: ['a'] });
  assert.deepStrictEqual({ size: js.size, room: js.room, cards: js.cards }, { size: 180, room: 20, cards: ['a', 'b'] });
  assert.deepStrictEqual({ size: big.size, room: big.room, passing: big.passing, cards: big.cards }, { size: 1000, room: 0, passing: true, cards: ['a'] });
  assert.equal(out.stop, false);
});

test('67: measure counts bytes, not characters', () => {
  const dir = project(['bytes notes/** <= 100']);
  const text = 'שלום עולם, ' + String.fromCodePoint(0x1f600);
  put(dir, 'notes/he.txt', text);
  assert.notEqual(Buffer.byteLength(text), text.length);
  const [m] = runClaims(dir).measures;
  assert.equal(m.size, Buffer.byteLength(text));
});

test('68: a measure: line it cannot read gives understood: false and is never passing', () => {
  const lines = ['tokens src/** <= 5', 'bytes src/** < 5', 'bytes src/** <= many', 'bytes <= 5', 'src/** is small', ''];
  const dir = project(lines);
  const out = runClaims(dir);
  assert.equal(out.measures.length, lines.length);
  for (const m of out.measures) {
    assert.equal(m.understood, false, m.line);
    assert.equal(m.passing, false, m.line);
    assert.ok(m.why, m.line);
  }
  assert.equal(out.notUnderstood, lines.length);
  assert.equal(out.stop, true, 'a line not understood stops for the user');
});

test('69: a measure: glob with .., an absolute path or a drive prefix gives understood: false and reads nothing outside the root', () => {
  const outside = tmp();
  put(outside, 'secret.bin', 'z'.repeat(4321));
  const abs = outside.replace(/\\/g, '/');
  const dir = project(['bytes ../**  <= 99999', `bytes ${abs}/** <= 99999`, 'bytes C:x/** <= 99999', 'bytes src/../../** <= 99999', 'bytes /etc/** <= 99999']);
  const r = cli(dir, 'claims', '--plan', 'PLAN-x.md', '--feature', 'x');
  const out = lastJson(r);
  for (const m of out.measures) {
    assert.equal(m.understood, false, m.line);
    assert.equal(m.passing, false, m.line);
    assert.equal(m.size, undefined, m.line);
  }
  assert.ok(!r.stdout.includes('4321'), 'the outside file was not measured');
});

test('70: a claim is passing exactly when it is within its limit', () => {
  const files = [{ path: 'src/a.js', bytes: 60 }, { path: 'src/b.js', bytes: 40 }, { path: 'other/c.js', bytes: 7 }];
  for (const [limit, passing] of [[101, true], [100, true], [99, false]]) {
    const [m] = claims.parseMeasures(`- measure: bytes src/** <= ${limit}`);
    assert.equal(m.understood, true);
    const j = claims.judge(m, files);
    assert.equal(j.size, 100);
    assert.equal(j.room, limit - 100);
    assert.equal(j.passing, passing, `limit ${limit}`);
  }
  const dir = project(['bytes src/b/b.js <= 29']);
  const out = runClaims(dir);
  assert.equal(out.measures[0].passing, false);
  assert.equal(out.measures[0].room, -1);
  assert.equal(out.failing, 1);
  assert.equal(out.stop, true, 'a failing claim stops for the user');
});

test('71: claims prints one JSON line with ok and is in COMMANDS', () => {
  const dir = project(['bytes src/** <= 5000']);
  const r = cli(dir, 'claims', '--plan', 'PLAN-x.md', '--feature', 'x');
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split(/\r?\n/);
  assert.equal(lines.length, 1, r.stdout);
  assert.equal(JSON.parse(lines[0]).ok, true);
  assert.ok(require(path.join(PLUGIN, 'experts', 'autopilot.js')).COMMANDS.includes('claims'));
  const bad = cli(dir, 'claims', '--feature', 'x');
  assert.equal(JSON.parse(bad.stdout.trim().split(/\r?\n/).pop()).ok, false, 'a refusal is one JSON line too');
});

test('security: a measure: glob does not follow a junction out of the root', () => {
  const outside = tmp();
  put(outside, 'big.bin', 'z'.repeat(7777));
  const dir = project(['bytes data/** <= 99999', 'bytes linked/** <= 99999']);
  fs.symlinkSync(outside, path.join(dir, 'linked'), 'junction');
  const r = cli(dir, 'claims', '--plan', 'PLAN-x.md', '--feature', 'x');
  const out = lastJson(r);
  assert.equal(out.measures[0].size, 1000, 'the real folder is measured');
  assert.equal(out.measures[1].size, 0, 'nothing behind the junction is counted');
  assert.ok(!r.stdout.includes('7777') && !r.stdout.includes(path.basename(outside)), r.stdout);
});

test('security: a measure: glob with shell or Windows escape syntax is inert', () => {
  const payloads = ['$(touch PWNED)', '*;touch PWNED', '`touch PWNED`', '..\\x\\*', '\\\\server\\share\\*', 'C:x*'];
  const dir = project(payloads.map((p) => `bytes ${p} <= 99999`));
  const out = runClaims(dir);
  assert.equal(out.measures.length, payloads.length);
  for (const m of out.measures) {
    assert.ok(m.understood === false || m.files === 0, m.line);
    assert.equal(m.passing, false, m.line);
  }
  assert.ok(!fs.existsSync(path.join(dir, 'PWNED')) && !fs.existsSync(path.join(process.cwd(), 'PWNED')), 'no command ran');
});

// Test 72: the tests phase asks for `measure:` lines, reads them out of the final section in code, and
// the command runs `claims` after the section is written and before the user is asked to confirm.

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const TESTS_PHASE = path.join(PLUGIN, 'phases', 'tests.js');
const section = (lines) => `## Tests\n\n1. \`a works\`.\n\n${lines.map((l) => `- measure: ${l}`).join('\n')}\n`;
const testsPhase = async (finalSection) => {
  const respond = async (c) => {
    if (c.label === 'draft') return { testsMarkdown: '## Tests\n\ndraft\n', testCommand: 'npm test', expectedTestNames: [] };
    if (c.label === 'merge') return { testsMarkdown: finalSection, testCommand: 'npm test', expectedTestNames: [], changesMade: [], gapsDeclined: [] };
    return { angleVerdict: 'gaps', gaps: [{ what: 'a gap', scenario: 's', severity: 'high' }], gap: 'a gap' };
  };
  return loadWorkflow(TESTS_PHASE)({ plan: 'PLAN-x.md', available: [], skills: {} }, respond);
};

test('72: the tests phase asks for measure: lines, reports them from the final section, and stops on one it cannot read', async () => {
  const good = await testsPhase(section(['bytes src/** <= 500', 'bytes lib/*.js <= 9_000']));
  assert.match(good.calls.find((c) => c.label === 'draft').prompt, /- measure: bytes <glob> <= <number>/);
  assert.equal(good.result.ok, true, JSON.stringify(good.result).slice(0, 300));
  assert.ok(good.calls.some((c) => c.label === 'merge'), 'the claims are read after the merge, from the final section');
  assert.deepStrictEqual(good.result.claims.lines.map((l) => [l.line, l.understood]), [['bytes src/** <= 500', true], ['bytes lib/*.js <= 9_000', true]]);
  assert.equal(good.result.claims.stop, false);
  assert.match(good.result.claims.command, /experts\.js" claims --plan/);
  const bad = await testsPhase(section(['bytes src/** <= 500', 'the pack is small', 'bytes ../x/** <= 5']));
  assert.deepStrictEqual(bad.result.claims.lines.map((l) => l.understood), [true, false, false]);
  assert.equal(bad.result.claims.stop, true, 'a line not understood stops for the user before the confirmation');
  // The phase's reading of a line and the library's agree, line by line.
  for (const l of [...good.result.claims.lines, ...bad.result.claims.lines]) assert.equal(l.understood, claims.parseMeasures(`- measure: ${l.line}`)[0].understood, l.line);
});

test('72: commands/tests.md runs claims after the section is written and before it asks for the confirmation, and stops to ask', () => {
  const md = fs.readFileSync(path.join(PLUGIN, 'commands', 'tests.md'), 'utf8');
  const written = md.indexOf('--field testsMarkdown --out <where> --append');
  const claimed = md.indexOf('experts.js" claims --plan');
  const shown = md.indexOf('**Show it and stop.**');
  const confirmed = md.indexOf('--confirm tests_confirmed');
  assert.ok(written > 0 && claimed > written, 'claims runs on the written section');
  assert.ok(shown > claimed && confirmed > shown, 'and before the user is asked to confirm');
  const step = md.slice(claimed - 400, shown);
  assert.match(step, /`stop` is true/);
  assert.match(step, /ask the user/i);
  assert.match(step, /never (shown|reported|counted) as passing/i);
});
