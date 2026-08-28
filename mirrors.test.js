'use strict';

// The mirror check.
//
// Two hosts read the same guidance through different mechanisms, so some files
// are hand-copies. The README already carried a note listing the one deliberate
// divergence -- and an UNDOCUMENTED one crept in anyway, a closing line that
// drifted out of SKILL.md unnoticed for weeks.
//
// That is the whole argument for this file: a documented divergence list
// without a check is a comment, not a control. Every exception below is a
// literal with a reason attached, so an entry nobody can justify stands out.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const lines = (p) => read(p).split(/\r?\n/).length;

/** Headings present in one always-on index but deliberately not the other. */
const HEADING_EXCEPTIONS = [
  {
    heading: '## Where things live',
    absentFrom: null,
    reason: 'Present in both; listed here as the anchor the routing table lives under.',
  },
];

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{2,3} /.test(l))
    .map((l) => l.trim());
}

// --- the always-on pair ----------------------------------------------------
// CLAUDE.md and the alwaysApply rule are the two files loaded on every turn,
// one per host. They should carry the same shape, because they answer the same
// question: what does this agent need before it knows what it is doing?

test('the two always-on indexes cover the same sections', () => {
  const claude = headings(read('CLAUDE.md'));
  const cursor = headings(read('rules/the-ultimate-workflow-guidelines.mdc'));

  const core = ['## Principles', '## Workflow', '## When to skip', '## Where things live', '## Hard constraints', '## Gotchas'];
  for (const h of core) {
    assert.ok(claude.includes(h), `CLAUDE.md is missing ${h}`);
    assert.ok(cursor.includes(h), `the Cursor rule is missing ${h}`);
  }
});

test('both always-on files state the same hard constraints', () => {
  for (const f of ['CLAUDE.md', 'rules/the-ultimate-workflow-guidelines.mdc']) {
    const t = read(f);
    assert.match(t, /no `package.json`/i, `${f} lost the dependency constraint`);
    assert.match(t, /no emojis/i, `${f} lost the emoji constraint`);
    assert.match(t, /node --test/, `${f} lost the verify command`);
  }
});

// --- the ratchet -----------------------------------------------------------
// Always-on context is paid for every turn whether relevant or not. It does not
// stay thin on its own; something has to push back. See memory/context-boundary.md.

test('CLAUDE.md stays a thin index', () => {
  const n = lines('CLAUDE.md');
  assert.ok(n <= 70, `CLAUDE.md is ${n} lines; the cap is 70. Move content to a memory/ topical instead of raising this.`);
});

test('the Cursor always-on rule stays thin', () => {
  const n = lines('rules/the-ultimate-workflow-guidelines.mdc');
  assert.ok(n <= 90, `the Cursor rule is ${n} lines; the cap is 90.`);
});

// --- the duplicated template ----------------------------------------------

test('the two memory-template copies are byte-identical', () => {
  const a = read('skills/project-bootstrap-guidelines/references/memory-template.md');
  const b = read('skills/the-ultimate-workflow-guidelines/references/memory-template.md');
  assert.equal(
    a,
    b,
    'The two memory-template.md copies have drifted. Do NOT fix this by deleting one: release-skills.yml zips each skill directory independently, so a cross-skill path breaks a single-skill install. See memory/mirrors.md.'
  );
});

// --- routing integrity -----------------------------------------------------
// A thin index is only useful if its pointers resolve. A dead pointer in
// always-on context is worse than no pointer: it costs tokens every turn and
// sends the reader nowhere.

test('every file the always-on indexes point at actually exists', () => {
  for (const f of ['CLAUDE.md', 'rules/the-ultimate-workflow-guidelines.mdc']) {
    const text = read(f);
    const refs = [...text.matchAll(/`((?:memory|skills|research|hooks|workflows|agents)\/[^`]+?\.(?:md|js))`/g)]
      .map((m) => m[1])
      // Globs like `workflows/*.js` name a set, not a file. Resolving them is a
      // different check; treating one as a path is a false positive.
      .filter((r) => !r.includes('*'));
    assert.ok(refs.length > 0, `${f} points at nothing, which defeats an index`);
    for (const r of refs) {
      assert.ok(fs.existsSync(path.join(root, r)), `${f} points at ${r}, which does not exist`);
    }
  }
});

test('every memory.md entry points at a file that exists', () => {
  const idx = read('memory.md');
  const refs = [...idx.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, 'memory.md should index the topicals');
  for (const r of refs) {
    assert.ok(fs.existsSync(path.join(root, r)), `memory.md points at ${r}, which does not exist`);
  }
});

test('every memory.md entry carries a Read when cue', () => {
  const idx = read('memory.md');
  const entries = idx.split(/\r?\n/).filter((l) => /^- \[/.test(l));
  assert.ok(entries.length >= 4);
  for (const e of entries) {
    assert.match(e, /\*\*Read when\*\*/, `an index entry has no "Read when" cue, so nothing will retrieve it: ${e.slice(0, 70)}`);
  }
});

// --- the write-isolation invariant ----------------------------------------

test('exactly one agent can write, and it is the implementer', () => {
  const dir = path.join(root, 'agents');
  const writers = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t);
      return fm && /tools:.*\b(Write|Edit)\b/.test(fm[1]);
    });
  assert.deepEqual(writers, ['uw-implementer.md'], `expected only uw-implementer to have write tools, got ${writers.join(', ')}`);
});

test('every read-only agent carries the Cursor readonly key too', () => {
  const dir = path.join(root, 'agents');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'uw-implementer.md')) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.match(fm[1], /readonly:\s*true/, `${f} restricts tools for Claude Code but not writes for Cursor`);
  }
});

test('the implementer never gains readonly', () => {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(read('agents/uw-implementer.md'));
  assert.doesNotMatch(fm[1], /readonly/, 'uw-implementer must stay writable -- it is the only phase that changes the repository');
});

// The exception list is data, so it is asserted rather than merely written down.
test('every declared mirror exception carries a reason', () => {
  for (const e of HEADING_EXCEPTIONS) {
    assert.ok(e.reason && e.reason.length > 20, `exception for ${e.heading} has no usable reason`);
  }
});
