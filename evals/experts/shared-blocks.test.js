'use strict';

// PLAN-simplify, card shared-blocks. A phase script cannot import anything, so what several of them need was
// copied between them and held equal by tests. It lives once in lib/phase-shared.js now; a phase names a section
// with a `// @shared <name>` line and experts.js `assemblePhase` puts it in, both when it stages the script for the
// Workflow tool and when a test loads it, so tests run what users run.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const experts = require(CLI);
const { readScript } = require('../security-expert/lib/run-workflow.js');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-shared-')));
  made.push(dir);
  return dir;
};
const PHASES = ['plan', 'tests', 'review', 'build', 'harvest'];
const stage = (dir, phase, args = {}) => {
  fs.writeFileSync(path.join(dir, 'args.json'), JSON.stringify(args));
  const r = spawnSync(process.execPath, [CLI, 'script', '--phase', phase, '--args-file', 'args.json'], { cwd: dir, encoding: 'utf8', env: { ...process.env } });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  return JSON.parse(r.stdout).scriptPath;
};
const countOf = (text, needle) => text.split(needle).length - 1;
const sections = experts.sharedSections(PLUGIN);

test('shared block: lib/phase-shared.js is read by experts.js and holds every section the phases name', () => {
  assert.deepStrictEqual(Object.keys(sections).sort(), ['agent-names', 'build-loop', 'build-model', 'lane-helpers', 'read-first', 'reader-model']);
  for (const f of fs.readdirSync(path.join(PLUGIN, 'phases')).filter((x) => x.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(PLUGIN, 'phases', f), 'utf8');
    for (const m of text.matchAll(/^[ \t]*\/\/ @shared ([a-z-]+)/gm)) assert.ok(m[1] in sections, `${f} names ${m[1]}`);
  }
});

test('staged script: each phase staged by stageScript holds each shared section exactly once, with the bytes of lib/phase-shared.js', () => {
  const dir = tmp();
  for (const phase of PHASES) {
    const staged = fs.readFileSync(stage(dir, phase), 'utf8');
    assert.ok(!/^[ \t]*\/\/ @shared /m.test(staged), `${phase}: no marker is left`);
    const named = [...fs.readFileSync(path.join(PLUGIN, 'phases', `${phase}.js`), 'utf8').matchAll(/^[ \t]*\/\/ @shared ([a-z-]+)/gm)].map((m) => m[1]);
    assert.ok(named.length > 0, `${phase} uses at least one shared section`);
    for (const key of named) {
      // The section body, line ending aside: the staged copy keeps whatever the phase file had.
      assert.strictEqual(countOf(staged.replace(/\r\n/g, '\n'), sections[key].replace(/\r\n/g, '\n')), 1, `${phase}: section ${key} appears exactly once`);
    }
  }
});

test('staged script: the test loader and stageScript produce the same script text', () => {
  const dir = tmp();
  for (const phase of PHASES) {
    const staged = fs.readFileSync(stage(dir, phase), 'utf8').replace(/\r\n/g, '\n');
    const loaded = readScript(path.join(PLUGIN, 'phases', `${phase}.js`)).replace(/\r\n/g, '\n');
    const body = loaded.slice(loaded.search(/^\}\n/m) + 2);
    assert.ok(staged.includes(body), `${phase}: the staged script contains exactly the text the loader runs`);
  }
  // And the run script, which needs more arguments than the other phases, assembles with the same function.
  assert.ok(!/@shared/.test(experts.assemblePhase(PLUGIN, 'run')));
});

test('staged script: every staged phase compiles and runs to its first agent call with a stubbed agent, with no module in scope', async () => {
  const dir = tmp();
  for (const phase of PHASES) {
    const text = fs.readFileSync(stage(dir, phase), 'utf8').replace(/^export const meta = \{[\s\S]*?^\}\r?\n/m, '');
    assert.ok(!/\bmodule\.exports\b|\brequire\(/.test(sections['agent-names'] + sections['read-first'] + sections['lane-helpers']), 'the shared sections use no module');
    const calls = [];
    const fn = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', text);
    const result = await fn({}, async (prompt, opts) => { calls.push(opts && opts.label); return null; }, async (thunks) => Promise.all(thunks.map(async (t) => { try { return await t(); } catch { return null; } })), () => {}, () => {});
    assert.ok(result === undefined || typeof result === 'object', `${phase} returned ${typeof result} (no throw)`);
  }
});

test('staged script: a phase-shared.js placed in the project is ignored, and restaging overwrites an edited staged copy', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'lib', 'phase-shared.js'), '// @@section agent-names\nrequire("fs").writeFileSync("PWNED","1")\n// @@end agent-names\n');
  const file = stage(dir, 'plan');
  const staged = fs.readFileSync(file, 'utf8');
  assert.ok(!staged.includes('PWNED'), 'the project copy is not used');
  fs.writeFileSync(file, `${staged}\nrequire("fs").writeFileSync("PWNED2","1")\n`);
  const again = fs.readFileSync(stage(dir, 'plan'), 'utf8');
  assert.ok(!again.includes('PWNED2'), 'restaging overwrote the edited copy');
});

test('staged script: argument values holding script-breaking text arrive as data and add no code', async () => {
  const dir = tmp();
  const nasty = {
    a: '"; require(\'fs\').writeFileSync(\'PWNED\',\'1\'); //',
    b: '`${process.exit(7)}`',
    c: '*/ throw 1 /*',
    d: '</script>',
    e: 'x\n})(\nrequire("fs").writeFileSync("PWNED3","1")\n',
    f: 'line separator   and paragraph  ',
  };
  Object.defineProperty(nasty, '__proto__', { value: 'own property named __proto__', enumerable: true });
  const file = stage(dir, 'plan', JSON.parse(JSON.stringify(nasty)));
  const text = fs.readFileSync(file, 'utf8');
  const line = text.split('\n').find((l) => l.startsWith('const EMBEDDED_ARGS = '));
  assert.ok(line, 'the arguments are one line of data');
  const parsed = Function(`return (${line.slice('const EMBEDDED_ARGS = '.length)})`)();
  for (const k of Object.keys(nasty).filter((x) => x !== '__proto__')) assert.strictEqual(parsed[k], nasty[k], k); // a key named __proto__ never becomes the prototype
  // It parses as a whole, and running it neither exits nor writes.
  const body = text.replace(/^export const meta = \{[\s\S]*?^\}\r?\n/m, '');
  const fn = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', body);
  await fn({}, async () => null, async (t) => Promise.all(t.map(async (x) => { try { return await x(); } catch { return null; } })), () => {}, () => {});
  for (const f of ['PWNED', 'PWNED3']) assert.ok(!fs.existsSync(path.join(dir, f)) && !fs.existsSync(path.join(process.cwd(), f)), f);
  assert.strictEqual(countOf(text.replace(/\r\n/g, '\n'), sections['lane-helpers'].replace(/\r\n/g, '\n')), 1, 'the block is still there exactly once');
});
