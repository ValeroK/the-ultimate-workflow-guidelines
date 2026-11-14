'use strict';

// Card gate of PLAN-memory-index: a commit that newly leaves the memory index stale or breaks a
// link is refused, with the command that fixes it. The evidence is gathered by experts.js
// commitEvidence from real git repositories and judged by gates.commitGate; only problems the
// commit introduces (against HEAD) deny, the ones already there come back as warnings.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ex = require(path.join(PLUGIN, 'experts', 'experts.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));
const memory = require(path.join(PLUGIN, 'lib', 'memory.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = (prefix) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `uw-${prefix}-`)));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const put = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

const header = (desc, glob) => `---\ndescription: ${desc}\nread_when:\n  paths:\n    - ${glob}\n---\n\n# ${desc}\n\nbody\n`;
const TOPIC_A = header('Topic A.', 'src/**');
const TOPIC_B = header('Topic B.', 'lib/**');
const SEED = '# Memory\n\nThe owner writes this part.\n';
// memory.md with the generated block for exactly these topicals.
const indexed = (topicals) => memory.renderIndex(SEED, topicals);
const AGENTS = '# Rules\n\nSee [memory](memory.md).\n';

/** A migrated project (one topical, a current index, a good link) with one commit. `at` is the memory root. */
function project({ at = '', agents = AGENTS, migrated = true } = {}) {
  const dir = tmp('mgate');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  put(dir, 'src/x.js', 'module.exports = 1;\n');
  put(dir, 'AGENTS.md', agents);
  if (migrated) {
    put(dir, `${at}memory/a.md`, TOPIC_A);
    put(dir, `${at}memory.md`, indexed({ 'memory/a.md': TOPIC_A }));
  } else {
    put(dir, `${at}memory/a.md`, '# Topic A\n\nplain\n');
    put(dir, `${at}memory.md`, `${SEED}\n- [memory/a.md](memory/a.md) - Topic A. **Read when** touching src.\n`);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

const evidence = (dir, plan = '') => ex.commitEvidence(dir, plan, PLUGIN);
const verdict = (dir, plan = '') => gates.commitGate(evidence(dir, plan));

// ---- the pure comparison -----------------------------------------------------------------------

const link = (line, target, file = 'AGENTS.md') => ({ file, kind: 'link', line, target, text: `${file}:${line}: broken link to ${target}` });

test('newProblems: a problem is old when its file, kind and target are at HEAD, whatever line it is on', () => {
  const r = memory.newProblems([link(9, 'old.md'), link(4, 'new.md')], [link(3, 'old.md')]);
  assert.deepStrictEqual(r.existing.map((p) => p.target), ['old.md']);
  assert.deepStrictEqual(r.added.map((p) => p.target), ['new.md']);
});

test('newProblems: the same target in another file, or another kind, is new', () => {
  const r = memory.newProblems([link(3, 'old.md', 'CLAUDE.md'), { file: 'AGENTS.md', kind: 'index', target: 'old.md', text: 'x' }], [link(3, 'old.md')]);
  assert.strictEqual(r.added.length, 2);
  assert.strictEqual(r.existing.length, 0);
});

test('newProblems: nothing now means nothing added, and nothing at HEAD makes everything new', () => {
  assert.deepStrictEqual(memory.newProblems([], [link(1, 'a.md')]), { added: [], existing: [] });
  assert.strictEqual(memory.newProblems([link(1, 'a.md')], []).added.length, 1);
});

// ---- what a commit is refused for --------------------------------------------------------------

test('a commit that stages only a new topical, with the index now stale, is denied and the reason names memory index', () => {
  const dir = project();
  put(dir, 'memory/b.md', TOPIC_B);
  git(dir, 'add', 'memory/b.md');
  const v = verdict(dir);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /memory\/b\.md/);
  assert.match(v.reason, /node experts\/experts\.js memory index/);
});

test('the same commit with the index regenerated is allowed', () => {
  const dir = project();
  put(dir, 'memory/b.md', TOPIC_B);
  assert.strictEqual(verdict(dir).allow, false, 'stale first');
  put(dir, 'memory.md', indexed({ 'memory/a.md': TOPIC_A, 'memory/b.md': TOPIC_B }));
  assert.strictEqual(verdict(dir).allow, true);
});

test('a commit that stages only AGENTS.md with a new broken link is denied, naming file, line and target', () => {
  const dir = project();
  put(dir, 'AGENTS.md', `${AGENTS}See [gone](gone.md).\n`);
  git(dir, 'add', 'AGENTS.md');
  const v = verdict(dir);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /AGENTS\.md:4: broken link to gone\.md/);
});

test('a link already broken at HEAD does not block an edit of its file; it comes back as a warning', () => {
  const dir = project({ agents: `${AGENTS}See [old](old.md).\n` });
  put(dir, 'AGENTS.md', `${AGENTS}See [old](old.md).\nMore text.\n`);
  const v = verdict(dir);
  assert.strictEqual(v.allow, true);
  assert.ok(v.warnings.some((w) => /AGENTS\.md:4: broken link to old\.md/.test(w)), JSON.stringify(v.warnings));
});

test('adding a second broken link next to an old one denies for the new one only', () => {
  const dir = project({ agents: `${AGENTS}See [old](old.md).\n` });
  put(dir, 'AGENTS.md', `${AGENTS}See [old](old.md).\nSee [fresh](fresh.md).\n`);
  const v = verdict(dir);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /fresh\.md/);
  assert.doesNotMatch(v.reason, /old\.md/);
});

test('a broken link that only moved to another line is not new', () => {
  const dir = project({ agents: `${AGENTS}See [old](old.md).\n` });
  put(dir, 'AGENTS.md', '# Rules\n\nTwo new lines\nabove the link.\n\nSee [memory](memory.md).\nSee [old](old.md).\n');
  const v = verdict(dir);
  assert.strictEqual(v.allow, true, v.reason);
  assert.ok(v.warnings.some((w) => /old\.md/.test(w)));
});

test('a project that is not migrated is never denied for its index, but a new broken link still is', () => {
  const dir = project({ migrated: false });
  put(dir, 'memory/c.md', '# Topic C\n\nplain\n');
  assert.strictEqual(verdict(dir).allow, true);
  put(dir, 'AGENTS.md', `${AGENTS}See [gone](gone.md).\n`);
  const v = verdict(dir);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /gone\.md/);
});

test('with no expert installed, a stale index is still denied', () => {
  const dir = project();
  put(dir, 'memory/b.md', TOPIC_B);
  const v = gates.commitGate(ex.commitEvidence(dir, '', tmp('empty')));
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /memory index/);
});

test('memory_root in the active plan decides which memory is checked', () => {
  const dir = project({ at: 'sub/' });
  const plan = path.join(dir, 'PLAN-x.md');
  put(dir, 'PLAN-x.md', '---\nplan_confirmed: true\ntests_confirmed: true\nmemory_root: sub\nexperts: []\n---\nbody\n');
  git(dir, 'add', 'PLAN-x.md');
  git(dir, 'commit', '-q', '-m', 'plan');
  put(dir, 'sub/memory/b.md', TOPIC_B);
  assert.strictEqual(verdict(dir, '').allow, true, 'without the plan the root has no memory to check');
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /sub\/memory\/b\.md|memory\/b\.md/);
  assert.match(v.reason, /memory index/);
});

// ---- when the check runs, and when it cannot ---------------------------------------------------

test('a commit that touches none of the memory files does not run the check; one that touches AGENTS.md does', () => {
  const dir = project({ agents: `${AGENTS}See [old](old.md).\n` });
  put(dir, 'src/x.js', 'module.exports = 2;\n');
  assert.strictEqual(evidence(dir).memory, undefined, 'a source-only change carries no memory evidence');
  put(dir, 'AGENTS.md', `${AGENTS}See [old](old.md).\nMore.\n`);
  assert.ok(evidence(dir).memory, 'touching AGENTS.md runs it');
});

test('an internal error in the memory check allows the commit', () => {
  const dir = project();
  put(dir, 'AGENTS.md', `${AGENTS}See [gone](gone.md).\n`);
  assert.strictEqual(verdict(dir).allow, false, 'the check works on this repository');
  // A start marker with no end marker makes the index check throw.
  put(dir, 'memory.md', `${SEED}\n<!-- uw:memory-index:start generated -->\n- [memory/a.md](memory/a.md) - x.\n`);
  const v = verdict(dir);
  assert.strictEqual(v.allow, true, v.reason);
});

// ---- review findings of 2026-11-11 ----

test('with a memory root, a link that leaves the root and is broken by this commit is new, not "already broken"', () => {
  const dir = project({ at: 'sub/' });
  const linked = `${TOPIC_A}\nSee [the guide](../../docs/x.md), [the folder](../../docs/) and [here](.).\n`;
  put(dir, 'docs/x.md', '# X\n');
  put(dir, 'sub/memory/a.md', linked);
  put(dir, 'sub/memory.md', indexed({ 'memory/a.md': linked }));
  put(dir, 'PLAN-x.md', '---\nplan_confirmed: true\ntests_confirmed: true\nmemory_root: sub\nexperts: []\n---\nbody\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'links');
  const plan = path.join(dir, 'PLAN-x.md');
  put(dir, 'sub/memory/a.md', `${linked}More.\n`);
  assert.deepStrictEqual(evidence(dir, plan).memory, { added: [], existing: [] }, 'targets outside the root, a folder with a slash and "." all exist at HEAD and now');
  fs.rmSync(path.join(dir, 'docs'), { recursive: true });
  const m = evidence(dir, plan).memory;
  assert.deepStrictEqual(m.added.map((p) => p.target).sort(), ['../../docs/', '../../docs/x.md']);
  assert.deepStrictEqual(m.existing, []);
  assert.strictEqual(verdict(dir, plan).allow, false);
});

test('workingProblems reads the memory files only: an unreadable folder elsewhere in the project does not matter', () => {
  const dir = project({ agents: `${AGENTS}See [gone](gone.md).\n` });
  // A name that is no folder where listFiles would descend: a walk of the whole tree would throw here.
  const walked = [];
  const real = fs.readdirSync;
  fs.readdirSync = (p, ...rest) => {
    walked.push(path.relative(dir, String(p)).split(path.sep).join('/'));
    return real(p, ...rest);
  };
  try {
    assert.deepStrictEqual(memory.workingProblems(dir).map((p) => p.target), ['gone.md']);
  } finally {
    fs.readdirSync = real;
  }
  assert.deepStrictEqual(walked.filter((p) => p !== 'memory' && !p.startsWith('memory/')), [], 'only memory/ is listed');
});
