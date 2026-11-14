'use strict';

// Card index of PLAN-memory-index: topical headers, the generated index in memory.md, the
// migration, and `memory index|check|migrate`. renderIndex and migrateTexts are pure (text in,
// text out); the commands wrap them with the file system and run here through the real CLI.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(REPO, '.cursor-plugin', 'ultimate-workflow');
const EXPERTS = path.join(PAYLOAD, 'experts', 'experts.js');
const memory = require(path.join(PAYLOAD, 'lib', 'memory.js'));

const START = '<!-- uw:memory-index:start';
const END = '<!-- uw:memory-index:end -->';

function header(lines) {
  return ['---', ...lines, '---', '', '# Body', '', 'text', ''].join('\n');
}

const GOOD = header([
  'description: How enforcement works.',
  'read_when:',
  '  paths: [hooks/**, gate.js]',
  '  keywords:',
  '    - a gate is not firing',
  '    - heartbeat',
  'updated: 2026-11-07',
]);

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uw-memory-'));
}

function cli(root, ...args) {
  const r = spawnSync(process.execPath, [EXPERTS, 'memory', ...args, '--root', root], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

function project(files) {
  const root = tmp();
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}

const MEMORY_MD = [
  '# Memory',
  '',
  'Intro line the owner wrote.',
  '',
  '- [memory/a.md](memory/a.md) — About A. **Read when** editing `hooks/**`, `gate.js`, or "a gate is not firing".',
  '- hand-written note, deliberately not a link',
  '',
  '- [memory/b.md](memory/b.md) — About B. **Read when** touching `lib/*.js`.',
  '',
  '<!-- footer the owner wrote -->',
  '',
].join('\n');

const OLD_A = ['# A', '', '> Last updated 2026-11-07.', '', 'body of a', ''].join('\n');
const OLD_B = ['# B', '', 'body of b', ''].join('\n');

// ---- the header parser -------------------------------------------------------------------------

test('a header with inline paths, block keywords and updated parses to those values', () => {
  const r = memory.parseHeader(GOOD);
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.header, {
    description: 'How enforcement works.',
    paths: ['hooks/**', 'gate.js'],
    keywords: ['a gate is not firing', 'heartbeat'],
    updated: '2026-11-07',
  });
});

test('CRLF and LF files parse the same', () => {
  const lf = memory.parseHeader(GOOD);
  const crlf = memory.parseHeader(GOOD.replace(/\n/g, '\r\n'));
  assert.deepStrictEqual(crlf.errors, []);
  assert.deepStrictEqual(crlf.header, lf.header);
});

test('a header after a BOM parses', () => {
  const r = memory.parseHeader('﻿' + GOOD);
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.header.description, 'How enforcement works.');
});

test('a file with no front matter has no header and no errors', () => {
  const r = memory.parseHeader('# Just a title\n\ntext\n');
  assert.strictEqual(r.header, null);
  assert.deepStrictEqual(r.errors, []);
});

const REJECTED = [
  ['no description', ['read_when:', '  paths: [a/**]'], /description/i, 1],
  ['neither paths nor keywords', ['description: x', 'updated: 2026-11-07'], /paths|keywords/i, 1],
  ['a nested map deeper than read_when', ['description: x', 'read_when:', '  paths:', '    deep: y'], /nest|deep/i, 5],
  ['an unknown key', ['description: x', 'read_when:', '  paths: [a/**]', 'colour: red'], /unknown/i, 5],
  ['a tab-indented list', ['description: x', 'read_when:', '  keywords:', '\t- one'], /tab/i, 5],
  ['an updated that is no month', ['description: x', 'read_when:', '  paths: [a/**]', 'updated: 2026-13-40'], /updated/i, 1],
  ['an updated that is no day of its month', ['description: x', 'read_when:', '  paths: [a/**]', 'updated: 2026-02-30'], /updated/i, 1],
  ['an empty list item', ['description: x', 'read_when:', '  keywords:', '    -'], /empty/i, 5],
  ['an updated that is not a date', ['description: x', 'read_when:', '  paths: [a/**]', 'updated: yesterday'], /updated/i, 1],
];

for (const [name, lines, reason, line] of REJECTED) {
  test(`rejected with its line and reason: ${name}`, () => {
    const r = memory.parseHeader(header(lines));
    assert.strictEqual(r.header, null, 'an invalid header yields no header');
    assert.ok(r.errors.length >= 1, 'at least one error');
    assert.strictEqual(r.errors[0].line, line, 'the line the fault is on (the opening --- is line 1)');
    assert.match(r.errors[0].reason, reason);
  });
}

test('a real date is accepted as updated, a leap day included', () => {
  for (const day of ['2026-02-28', '2024-02-29']) {
    const r = memory.parseHeader(header(['description: x', 'read_when:', '  paths: [a/**]', `updated: ${day}`]));
    assert.deepStrictEqual(r.errors, [], day);
    assert.strictEqual(r.header.updated, day);
  }
});

test('rejected: an unclosed header', () => {
  const r = memory.parseHeader('---\ndescription: x\nread_when:\n  paths: [a/**]\n\n# Body with no closing line\n');
  assert.strictEqual(r.header, null);
  assert.ok(r.errors.length >= 1);
  assert.match(r.errors[0].reason, /unclosed|closing|end/i);
});

// ---- renderIndex (pure) ------------------------------------------------------------------------

const TOPICALS = { 'memory/b.md': header(['description: About B.', 'read_when:', '  paths: [lib/*.js]']), 'memory/a.md': GOOD };

test('no markers yet: the marked block is appended and nothing else changes', () => {
  const out = memory.renderIndex(MEMORY_MD, TOPICALS);
  assert.ok(out.startsWith(MEMORY_MD), 'the original text is a prefix, byte for byte');
  const added = out.slice(MEMORY_MD.length);
  assert.ok(added.includes(START) && added.includes(END));
  assert.match(added, /memory index/, 'the start marker names the command');
});

test('the lines are sorted by path and use the documented format', () => {
  const out = memory.renderIndex(MEMORY_MD, TOPICALS);
  const a = out.indexOf('- [memory/a.md](memory/a.md) - How enforcement works. **Read when** `hooks/**`, `gate.js`, a gate is not firing, heartbeat.');
  const b = out.indexOf('- [memory/b.md](memory/b.md) - About B. **Read when** `lib/*.js`.');
  assert.ok(a !== -1, 'a.md line is exactly the documented format');
  assert.ok(b !== -1, 'b.md line is exactly the documented format');
  assert.ok(a < b, 'sorted by path');
});

test('a second run on its own output is byte-identical', () => {
  const once = memory.renderIndex(MEMORY_MD, TOPICALS);
  assert.strictEqual(memory.renderIndex(once, TOPICALS), once);
});

test('only the text between the markers is rewritten; a hand-written entry outside survives', () => {
  const placed = [
    'before the block',
    '- hand-written, not a link',
    START + ' generated by: node experts/experts.js memory index -->',
    '- [memory/old.md](memory/old.md) - stale',
    END,
    'after the block',
    '',
  ].join('\n');
  const out = memory.renderIndex(placed, TOPICALS);
  assert.ok(out.startsWith('before the block\n- hand-written, not a link\n'));
  assert.ok(out.endsWith(END + '\nafter the block\n'));
  assert.ok(!out.includes('stale') && !out.includes('old.md'), 'the old line between the markers is gone');
  assert.ok(out.includes('memory/a.md') && out.includes('memory/b.md'));
});

test('line endings follow the file', () => {
  const crlf = MEMORY_MD.replace(/\n/g, '\r\n');
  const out = memory.renderIndex(crlf, TOPICALS);
  assert.ok(!/(^|[^\r])\n/.test(out), 'no bare LF in a CRLF file');
  assert.strictEqual(memory.renderIndex(out, TOPICALS), out);
});

test('a topical with an invalid header, or with no header, is not indexed', () => {
  const out = memory.renderIndex(MEMORY_MD, {
    ...TOPICALS,
    'memory/bad.md': header(['colour: red']),
    'memory/none.md': '# No header\n',
  });
  assert.ok(!out.includes('memory/bad.md'));
  assert.ok(!out.includes('memory/none.md'));
});

test('renderIndex reads nothing from disk: it works from text alone while the cwd is empty', () => {
  const empty = tmp();
  const before = process.cwd();
  process.chdir(empty);
  try {
    const out = memory.renderIndex(MEMORY_MD, TOPICALS);
    assert.ok(out.includes('memory/a.md'));
  } finally {
    process.chdir(before);
  }
  assert.deepStrictEqual(fs.readdirSync(empty), [], 'and writes nothing');
});

// ---- migrateTexts (pure) -----------------------------------------------------------------------

test('migration of cues: a glob goes to paths, a bare file name and a quoted phrase go to keywords', () => {
  const r = memory.migrateTexts(MEMORY_MD, { 'memory/a.md': OLD_A, 'memory/b.md': OLD_B });
  const parsed = memory.parseHeader(r.topicals['memory/a.md']);
  assert.deepStrictEqual(parsed.errors, []);
  assert.ok(parsed.header.paths.includes('hooks/**'));
  assert.ok(!parsed.header.paths.includes('gate.js'), 'a bare file name is not a path');
  assert.ok(parsed.header.keywords.includes('gate.js'));
  assert.ok(parsed.header.keywords.includes('a gate is not firing'), 'the phrase stays whole');
  assert.strictEqual(parsed.header.description, 'About A.');
});

test('the "Last updated" line becomes updated: and is removed from the body', () => {
  const r = memory.migrateTexts(MEMORY_MD, { 'memory/a.md': OLD_A, 'memory/b.md': OLD_B });
  assert.strictEqual(memory.parseHeader(r.topicals['memory/a.md']).header.updated, '2026-11-07');
  assert.ok(!/Last updated/i.test(r.topicals['memory/a.md']));
  assert.ok(r.topicals['memory/a.md'].includes('body of a'), 'the rest of the body is kept');
});

test('migration keeps every other line in place; the block stands where the first entry stood', () => {
  const r = memory.migrateTexts(MEMORY_MD, { 'memory/a.md': OLD_A, 'memory/b.md': OLD_B });
  const out = r.memoryMd;
  for (const line of ['# Memory', 'Intro line the owner wrote.', '- hand-written note, deliberately not a link', '<!-- footer the owner wrote -->']) {
    assert.ok(out.includes(line), `kept: ${line}`);
  }
  assert.ok(!/^- \[memory\/[ab]\.md\].*—/m.test(out), 'the old linked entries are gone');
  const at = (s) => out.indexOf(s);
  assert.ok(at('Intro line') < at(START), 'the block follows the intro');
  assert.ok(at(START) < at('- hand-written note'), 'and stands where the first linked entry stood');
  assert.ok(at('- hand-written note') < at('<!-- footer'), 'the order of the other lines is unchanged');
  assert.strictEqual(memory.renderIndex(out, r.topicals), out, 'the migrated block is exactly the generated one');
});

test('a cue fragment that is only a conjunction is not kept as a keyword', () => {
  const entry = '- [memory/a.md](memory/a.md) — About A. **Read when** touching `hooks/**`, or `gate.js`.\n';
  const r = memory.migrateTexts(entry, { 'memory/a.md': OLD_B });
  const parsed = memory.parseHeader(r.topicals['memory/a.md']);
  assert.deepStrictEqual(parsed.errors, []);
  assert.deepStrictEqual(parsed.header.keywords, ['gate.js']);
});

test('a topical that starts with a BOM keeps it first, followed by the header, and has it nowhere else', () => {
  const r = memory.migrateTexts(MEMORY_MD, { 'memory/a.md': '﻿' + OLD_A, 'memory/b.md': OLD_B });
  const text = r.topicals['memory/a.md'];
  assert.ok(text.startsWith('﻿---\n'), 'the BOM, then the opening --- line');
  assert.strictEqual(text.split('﻿').length - 1, 1, 'one BOM only');
  const parsed = memory.parseHeader(text);
  assert.deepStrictEqual(parsed.errors, []);
  assert.ok(parsed.header.paths.includes('hooks/**'));
  assert.ok(text.includes('body of a'));
});

test('an entry that cannot give a valid header keeps its memory.md line and its topical text', () => {
  const noDescription = '- [memory/n.md](memory/n.md) — **Read when** editing `src/**`.';
  const noCue = '- [memory/c.md](memory/c.md) — About C. **Read when** .';
  const md = [MEMORY_MD, noDescription, noCue, ''].join('\n');
  const N = '# N\n\nbody of n\n';
  const C = '# C\n\nbody of c\n';
  const r = memory.migrateTexts(md, { 'memory/a.md': OLD_A, 'memory/n.md': N, 'memory/c.md': C });
  assert.ok(r.memoryMd.includes(noDescription), 'the entry without a description stays');
  assert.ok(r.memoryMd.includes(noCue), 'the entry without a cue stays');
  assert.strictEqual(r.topicals['memory/n.md'], N);
  assert.strictEqual(r.topicals['memory/c.md'], C);
  assert.strictEqual(memory.parseHeader(r.topicals['memory/a.md']).errors.length, 0, 'the buildable one is still migrated');
  assert.ok(!r.memoryMd.includes('- [memory/a.md](memory/a.md) —'), 'and its old entry is replaced');
});

test('when no entry can give a header, no entry and no text changes', () => {
  const md = '# Memory\n\n- [memory/n.md](memory/n.md) — **Read when** editing `src/**`.\n- [memory/c.md](memory/c.md) — About C. **Read when** .\n';
  const topicals = { 'memory/n.md': '# N\n', 'memory/c.md': '# C\n' };
  const r = memory.migrateTexts(md, topicals);
  assert.deepStrictEqual(r.topicals, topicals);
  assert.ok(r.memoryMd.includes('- [memory/n.md](memory/n.md) — **Read when** editing `src/**`.'));
  assert.ok(r.memoryMd.includes('- [memory/c.md](memory/c.md) — About C. **Read when** .'));
});

test('a start marker with no end marker is refused, never guessed: renderIndex throws, the CLI exits non-zero and writes nothing', () => {
  const broken = ['# Memory', '', START + ' generated by: node experts/experts.js memory index -->', '- [memory/a.md](memory/a.md) - kept', 'trailing text', ''].join('\n');
  assert.throws(() => memory.renderIndex(broken, TOPICALS), /memory\.md.*no.*uw:memory-index:end/);
  const root = project({ 'memory.md': broken, 'memory/a.md': GOOD });
  for (const command of ['index', 'migrate', 'check']) {
    const r = cli(root, command);
    assert.notStrictEqual(r.status, 0, `${command}: ${r.out}`);
    assert.match(r.out, /uw:memory-index:end/, command);
    assert.strictEqual(fs.readFileSync(path.join(root, 'memory.md'), 'utf8'), broken, `${command} left memory.md alone`);
  }
});

test('migrateTexts reads nothing from disk', () => {
  const empty = tmp();
  const before = process.cwd();
  process.chdir(empty);
  try {
    const r = memory.migrateTexts(MEMORY_MD, { 'memory/a.md': OLD_A, 'memory/b.md': OLD_B });
    assert.ok(r.memoryMd.includes(START));
  } finally {
    process.chdir(before);
  }
  assert.deepStrictEqual(fs.readdirSync(empty), []);
});

// ---- the commands ------------------------------------------------------------------------------

function migratedProject() {
  const root = project({ 'memory.md': MEMORY_MD, 'memory/a.md': OLD_A, 'memory/b.md': OLD_B });
  assert.strictEqual(cli(root, 'migrate').status, 0);
  return root;
}

test('memory check passes on a freshly generated index', () => {
  const root = migratedProject();
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 0, r.out);
});

test('memory check fails on a topical missing from the index', () => {
  const root = migratedProject();
  fs.writeFileSync(path.join(root, 'memory', 'c.md'), header(['description: C.', 'read_when:', '  keywords: [cee]']));
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 1, r.out);
  assert.match(r.out, /memory\/c\.md/);
  assert.match(r.out, /memory index/, 'names the fixing command');
});

test('memory check fails on an index line for a file that does not exist', () => {
  const root = migratedProject();
  fs.unlinkSync(path.join(root, 'memory', 'b.md'));
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 1, r.out);
  assert.match(r.out, /memory\/b\.md/);
});

test('memory check fails on a hand-edited line between the markers', () => {
  const root = migratedProject();
  const file = path.join(root, 'memory.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('About B.', 'About B, edited by hand.'));
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 1, r.out);
  assert.match(r.out, /memory index/);
});

test('memory index repairs what check refused', () => {
  const root = migratedProject();
  fs.writeFileSync(path.join(root, 'memory', 'c.md'), header(['description: C.', 'read_when:', '  keywords: [cee]']));
  assert.strictEqual(cli(root, 'check').status, 1);
  assert.strictEqual(cli(root, 'index').status, 0);
  assert.strictEqual(cli(root, 'check').status, 0);
  assert.ok(fs.readFileSync(path.join(root, 'memory.md'), 'utf8').includes('memory/c.md'));
});

test('a topical whose header is invalid is named by memory check, which exits 1', () => {
  const root = migratedProject();
  fs.writeFileSync(path.join(root, 'memory', 'a.md'), header(['colour: red']));
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 1, r.out);
  assert.match(r.out, /memory\/a\.md/);
  assert.match(r.out, /unknown/i);
});

test('not migrated: no headers and no markers is a warning and exit 0', () => {
  const root = project({ 'memory.md': MEMORY_MD, 'memory/a.md': OLD_A, 'memory/b.md': OLD_B });
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 0, r.out);
  assert.match(r.out, /not migrated/i);
});

test('partly migrated exits 0, and the index lists only the migrated topical', () => {
  const root = project({ 'memory.md': MEMORY_MD, 'memory/a.md': GOOD, 'memory/b.md': OLD_B });
  assert.strictEqual(cli(root, 'index').status, 0);
  const text = fs.readFileSync(path.join(root, 'memory.md'), 'utf8');
  const block = text.slice(text.indexOf(START), text.indexOf(END));
  assert.ok(block.includes('memory/a.md'));
  assert.ok(!block.includes('memory/b.md'), 'the un-migrated topical is not between the markers');
  const r = cli(root, 'check');
  assert.strictEqual(r.status, 0, r.out);
  assert.match(r.out, /not migrated/i);
});

test('memory migrate changes nothing outside memory.md and memory/', () => {
  const root = project({ 'memory.md': MEMORY_MD, 'memory/a.md': OLD_A, 'memory/b.md': OLD_B, 'AGENTS.md': 'agents\n', 'src/x.js': 'x\n' });
  assert.strictEqual(cli(root, 'migrate').status, 0);
  assert.strictEqual(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), 'agents\n');
  assert.strictEqual(fs.readFileSync(path.join(root, 'src', 'x.js'), 'utf8'), 'x\n');
});

test('memory migrate on a copy of this repo\'s payload: headers, the research entry stays outside, check passes, a second migrate is a no-op', () => {
  const root = tmp();
  fs.copyFileSync(path.join(PAYLOAD, 'memory.md'), path.join(root, 'memory.md'));
  fs.cpSync(path.join(PAYLOAD, 'memory'), path.join(root, 'memory'), { recursive: true });
  const topicals = fs.readdirSync(path.join(root, 'memory')).filter((f) => f.endsWith('.md'));
  assert.ok(topicals.length >= 5);
  const original = fs.readFileSync(path.join(root, 'memory.md'), 'utf8');

  const m = cli(root, 'migrate');
  assert.strictEqual(m.status, 0, m.out);

  for (const f of topicals) {
    const parsed = memory.parseHeader(fs.readFileSync(path.join(root, 'memory', f), 'utf8'));
    assert.deepStrictEqual(parsed.errors, [], f);
    assert.ok(parsed.header && parsed.header.description, `${f} has a header`);
  }
  const headerOf = (f) => memory.parseHeader(fs.readFileSync(path.join(root, 'memory', f), 'utf8')).header;
  const gates = headerOf('hooks-and-gates.md');
  assert.deepStrictEqual(gates.paths, ['hooks/**']);
  assert.deepStrictEqual(gates.keywords, ['gate.js', 'status.js', 'adapters', 'heartbeat', 'the G6 experts/commit gate', 'adding a host', 'a gate is not firing']);
  const boundary = headerOf('context-boundary.md');
  assert.deepStrictEqual(boundary.paths, ['rules/*.mdc']);
  assert.deepStrictEqual(boundary.keywords, ['CLAUDE.md', 'memory.md', 'SKILL.md', 'something belongs in always-on context']);
  const text = fs.readFileSync(path.join(root, 'memory.md'), 'utf8');
  const researchLine = original.split('\n').find((l) => l.includes('deliberately not a link'));
  assert.ok(researchLine);
  assert.ok(text.includes(researchLine), 'the non-link entry is kept byte for byte');
  assert.ok(text.indexOf(researchLine) < text.indexOf(START) || text.indexOf(researchLine) > text.indexOf(END), 'and stays outside the markers');
  const block = text.slice(text.indexOf(START), text.indexOf(END));
  for (const f of topicals) assert.ok(block.includes(`memory/${f}`), `${f} is in the block`);

  const c = cli(root, 'check');
  assert.strictEqual(c.status, 0, c.out);
  assert.doesNotMatch(c.out, /not migrated/i);

  const snapshot = [text, ...topicals.map((f) => fs.readFileSync(path.join(root, 'memory', f), 'utf8'))];
  assert.strictEqual(cli(root, 'migrate').status, 0);
  const after = [fs.readFileSync(path.join(root, 'memory.md'), 'utf8'), ...topicals.map((f) => fs.readFileSync(path.join(root, 'memory', f), 'utf8'))];
  assert.deepStrictEqual(after, snapshot);
});
