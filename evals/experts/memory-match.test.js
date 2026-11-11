'use strict';

// Card match of PLAN-memory-index: a card picks its memory topicals from their headers.
// matchTopicals is pure (texts in, [{ file, how }] out); matchingTopicals in autopilot.js reads the
// files of a memory root and calls it.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(REPO, '.cursor-plugin', 'ultimate-workflow');
const memory = require(path.join(PAYLOAD, 'lib', 'memory.js'));
const autopilot = require(path.join(PAYLOAD, 'experts', 'autopilot.js'));

const topical = ({ paths = [], keywords = [] }) =>
  ['---', 'description: A topical.', 'read_when:', ...(paths.length ? ['  paths:', ...paths.map((p) => `    - ${p}`)] : []), ...(keywords.length ? ['  keywords:', ...keywords.map((k) => `    - ${k}`)] : []), '---', '', '# T', ''].join('\n');

// A card as the plan parser gives it (title, paths, carried), plus the text keywords are searched in
// that matchTopicals takes.
const card = (paths, { title = 'a card', carried = [] } = {}) => ({ title, paths, carried, text: [title, ...paths, ...carried].join('\n') });
const names = (matches) => matches.map((m) => m.file);

test('a card path under a header glob matches; a card glob covering a header path matches too', () => {
  const topicals = { 'memory/h.md': topical({ paths: ['hooks/**'] }), 'memory/g.md': topical({ paths: ['hooks/lib/gates.js'] }) };
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['hooks/lib/gates.js'])), [
    { file: 'memory/g.md', how: 'path' },
    { file: 'memory/h.md', how: 'path' },
  ]);
  assert.deepStrictEqual(memory.matchTopicals('', { 'memory/g.md': topicals['memory/g.md'] }, card(['hooks/**'])), [{ file: 'memory/g.md', how: 'path' }]);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['phases/run.js'])), []);
});

test('a header glob with ** in the middle matches zero or more folders', () => {
  const topicals = { 'memory/a.md': topical({ paths: ['src/**/x.js'] }) };
  assert.deepStrictEqual(names(memory.matchTopicals('', topicals, card(['src/x.js']))), ['memory/a.md']);
  assert.deepStrictEqual(names(memory.matchTopicals('', topicals, card(['src/a/b/x.js']))), ['memory/a.md']);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['src/a/y.js'])), []);
});

test('a single * stays inside one folder', () => {
  const topicals = { 'memory/a.md': topical({ paths: ['hooks/*.js'] }) };
  assert.deepStrictEqual(names(memory.matchTopicals('', topicals, card(['hooks/gate.js']))), ['memory/a.md']);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['hooks/lib/gate.js'])), []);
});

test('a keyword phrase matches in a carried item; a keyword matches whole words only', () => {
  const topicals = { 'memory/a.md': topical({ keywords: ['a gate is not firing'] }), 'memory/b.md': topical({ keywords: ['gate'] }) };
  const phrase = card(['x.js'], { carried: ['reviewer: A Gate Is Not Firing on commit'] });
  assert.deepStrictEqual(memory.matchTopicals('', topicals, phrase), [
    { file: 'memory/a.md', how: 'keyword' },
    { file: 'memory/b.md', how: 'keyword' },
  ]);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['x.js'], { title: 'the gateway' })), []);
});

test('the keyword gate.js matches hooks/gate.js and not hooks/mygate.js', () => {
  const topicals = { 'memory/a.md': topical({ keywords: ['gate.js'] }) };
  assert.deepStrictEqual(names(memory.matchTopicals('', topicals, card(['hooks/gate.js']))), ['memory/a.md']);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['hooks/mygate.js'])), []);
});

test('header paths are relative to the memory root: a card outside the root does not match by path', () => {
  const topicals = { 'memory/a.md': topical({ paths: ['hooks/**'] }) };
  assert.deepStrictEqual(names(memory.matchTopicals('', topicals, card(['sub/dir/hooks/x.js']), 'sub/dir')), ['memory/a.md']);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['hooks/x.js']), 'sub/dir'), []);
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['sub/dirty/hooks/x.js']), 'sub/dir'), []);
});

test('a topical with no header matches through its memory.md cue, as before', () => {
  const memoryMd = [
    '# Memory',
    '- [memory/parsing.md](memory/parsing.md) - how input is read. **Read when** touching `src/parse.js` or the tokenizer.',
    '- [memory/adders.md](memory/adders.md) - arithmetic. **Read when** changing the adder module.',
  ].join('\n');
  const topicals = { 'memory/parsing.md': '# parsing\n', 'memory/adders.md': '# adders\n' };
  assert.deepStrictEqual(memory.matchTopicals(memoryMd, topicals, card(['src/parse.js'])), [{ file: 'memory/parsing.md', how: 'cue' }]);
  assert.deepStrictEqual(memory.matchTopicals(memoryMd, topicals, card(['x.js'], { title: 'adder: add two numbers' })), [{ file: 'memory/adders.md', how: 'cue' }]);
});

test('a topical missing from memory.md is matched from its header; an invalid header matches nothing', () => {
  const topicals = { 'memory/a.md': topical({ paths: ['hooks/**'] }), 'memory/bad.md': '---\nbogus: 1\n---\n' };
  assert.deepStrictEqual(names(memory.matchTopicals('# Memory\n', topicals, card(['hooks/x.js']))), ['memory/a.md']);

  // The invalid header must be what keeps bad.md out: memory.md has a cue for it that the card meets,
  // and the same cue does match a topical with no header at all.
  const memoryMd = '# Memory\n- [memory/bad.md](memory/bad.md) - broken. **Read when** touching `src/bad.js`.\n';
  assert.deepStrictEqual(memory.matchTopicals(memoryMd, { 'memory/bad.md': topicals['memory/bad.md'] }, card(['src/bad.js'])), []);
  assert.deepStrictEqual(memory.matchTopicals(memoryMd, { 'memory/bad.md': '# bad\n' }, card(['src/bad.js'])), [{ file: 'memory/bad.md', how: 'cue' }]);
});

test('order is path matches first, then keyword matches, each by path, and says how it matched', () => {
  const topicals = {
    'memory/z.md': topical({ paths: ['hooks/**'] }),
    'memory/b.md': topical({ keywords: ['heartbeat'] }),
    'memory/a.md': topical({ keywords: ['heartbeat'] }),
    'memory/m.md': topical({ paths: ['hooks/**'], keywords: ['heartbeat'] }),
  };
  assert.deepStrictEqual(memory.matchTopicals('', topicals, card(['hooks/x.js'], { carried: ['the heartbeat'] })), [
    { file: 'memory/m.md', how: 'path' },
    { file: 'memory/z.md', how: 'path' },
    { file: 'memory/a.md', how: 'keyword' },
    { file: 'memory/b.md', how: 'keyword' },
  ]);
});

test('a keyword with a capital letter matches a card text in lower case, and the reverse', () => {
  // 'Gate' has four letters, so the title-word route cannot match it: only the keyword route can.
  const upper = { 'memory/a.md': topical({ keywords: ['Gate'] }) };
  const lower = { 'memory/a.md': topical({ keywords: ['gate'] }) };
  assert.deepStrictEqual(memory.matchTopicals('', upper, card(['x.js'], { carried: ['the gate is stuck'] })), [{ file: 'memory/a.md', how: 'keyword' }]);
  assert.deepStrictEqual(memory.matchTopicals('', lower, card(['x.js'], { carried: ['The Gate is stuck'] })), [{ file: 'memory/a.md', how: 'keyword' }]);
  assert.deepStrictEqual(memory.matchTopicals('', upper, card(['x.js'], { carried: ['the gateway'] })), []);
});

test('a backticked cue term with a / that the card text mentions still matches after migrate, though no card path covers it', () => {
  const memoryMd = '# Memory\n- [memory/a.md](memory/a.md) - About A. **Read when** touching `docs/api`.\n';
  const old = { 'memory/a.md': '# A\n\nbody\n' };
  const mentions = card(['x.js'], { carried: ['reviewer: update docs/api before release'] });
  const silent = card(['x.js'], { carried: ['reviewer: nothing here'] });
  assert.deepStrictEqual(memory.matchTopicals(memoryMd, old, mentions), [{ file: 'memory/a.md', how: 'cue' }], 'the old cue gave this match');

  const migrated = memory.migrateTexts(memoryMd, old);
  assert.deepStrictEqual(memory.parseHeader(migrated.topicals['memory/a.md']).header.paths, ['docs/api']);
  assert.deepStrictEqual(names(memory.matchTopicals(migrated.memoryMd, migrated.topicals, mentions)), ['memory/a.md']);
  assert.deepStrictEqual(names(memory.matchTopicals(migrated.memoryMd, migrated.topicals, card(['sub/x.js'], { carried: mentions.carried }), 'sub')), ['memory/a.md'], 'with a memory root too');
  assert.deepStrictEqual(memory.matchTopicals(migrated.memoryMd, migrated.topicals, silent), [], 'a card that does not mention it still does not match');
});

// ---- matchingTopicals reads a memory root ------------------------------------------------------

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-match-'));
  made.push(root);
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}

test('with a memory root, topicals are read from its memory/ and returned as paths from the project root', () => {
  const dir = project({ 'sub/dir/memory.md': '# Memory\n', 'sub/dir/memory/h.md': topical({ paths: ['hooks/**'] }) });
  const c = card(['sub/dir/hooks/x.js']);
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, c, 'sub/dir'), [{ path: 'sub/dir/memory/h.md', how: 'path' }]);
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, c), []);
});

test('without a memory root, topicals are read from the project root', () => {
  const dir = project({ 'memory.md': '# Memory\n', 'memory/h.md': topical({ paths: ['hooks/**'] }) });
  assert.deepStrictEqual(autopilot.matchingTopicals(dir, card(['hooks/x.js'])), [{ path: 'memory/h.md', how: 'path' }]);
});

test('no memory.md and no memory/ folder gives no topicals', () => {
  assert.deepStrictEqual(autopilot.matchingTopicals(project({ 'a.txt': 'x' }), card(['hooks/x.js'])), []);
});

test('on this repo, a card under hooks/ gets the hooks-and-gates topical', () => {
  const found = autopilot.matchingTopicals(REPO, card(['.cursor-plugin/ultimate-workflow/hooks/gate.js']), '.cursor-plugin/ultimate-workflow');
  assert.ok(found.some((m) => m.path === '.cursor-plugin/ultimate-workflow/memory/hooks-and-gates.md'), JSON.stringify(found));
});

// ---- against today's matcher, measured -----------------------------------------------------------

const CARDS = [
  { title: 'gate: commit refused on a stale index', paths: ['hooks/lib/gates.js', 'hooks/gate.js'] },
  { title: 'phases: add a review step', paths: ['phases/run.js', 'agents/uw-reviewer.md'] },
  { title: 'mirrors: keep rules in step', paths: ['rules/workflow.mdc', 'skills/x/SKILL.md'] },
  { title: 'install: marketplace and release ZIP', paths: ['.cursor-plugin/plugin.json'] },
  { title: 'context: slim CLAUDE.md', paths: ['memory.md', 'CLAUDE.md'] },
].map((c) => card(c.paths, { title: c.title }));

// What the old matcher returned for these cards on this repo's memory.md, measured on 2026-11-11
// before card match (the unmigrated payload, read as it is). A card may gain topicals, never lose one.
const OLD = [
  ['memory/hooks-and-gates.md'],
  ['memory/mirrors.md'],
  ['memory/context-boundary.md', 'memory/mirrors.md', 'memory/cursor-install.md'],
  ['memory/cursor-install.md'],
  ['memory/context-boundary.md'],
];

test('after migrate, every topical the old matcher returned is still returned for this repo\'s areas', () => {
  const memoryMd = fs.readFileSync(path.join(PAYLOAD, 'memory.md'), 'utf8');
  const topicals = {};
  for (const f of fs.readdirSync(path.join(PAYLOAD, 'memory'))) topicals[`memory/${f}`] = fs.readFileSync(path.join(PAYLOAD, 'memory', f), 'utf8');
  const migrated = memory.migrateTexts(memoryMd, topicals);
  CARDS.forEach((c, i) => {
    assert.ok(OLD[i].length > 0, 'the old result is a real floor, not empty');
    const after = names(memory.matchTopicals(migrated.memoryMd, migrated.topicals, c));
    const lost = OLD[i].filter((f) => !after.includes(f));
    assert.deepStrictEqual(lost, [], `${c.title}: lost ${lost.join(', ')}`);
  });
});
