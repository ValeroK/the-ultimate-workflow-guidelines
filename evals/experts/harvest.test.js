'use strict';

// Harvest runs before the commit, so a commit range alone (origin/main..HEAD) is empty and the
// reader that looks at "what changed" would see nothing. It must be told to read the uncommitted
// work too. The wording of a prompt cannot be proven by a test; this keeps the instruction from
// being lost in a later edit, and checks the reader still gets the range.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const SCRIPT = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'phases', 'harvest.js');

async function readerPrompts(args) {
  const { calls } = await loadWorkflow(SCRIPT)(args, async (call) => {
    if (call.label === 'existing') return { gotchas: [], topicals: [], notes: '' };
    return { candidates: [] };
  });
  return Object.fromEntries(calls.map((c) => [c.label, c.prompt]));
}

test('the history reader is told to read the uncommitted work, not only the commit range', async () => {
  const prompts = await readerPrompts({ scope: 'a feature' });
  assert.ok(prompts.history, 'the history reader ran');
  assert.match(prompts.history, /range: origin\/main\.\.HEAD/, 'the default range is still given');
  assert.match(prompts.history, /uncommitted work/);
  assert.match(prompts.history, /git status --short/);
  assert.match(prompts.history, /git diff HEAD/);
  assert.match(prompts.history, /untracked/);
});

test('a range the caller names is passed through, and the uncommitted work is still read', async () => {
  const prompts = await readerPrompts({ scope: 'a feature', range: 'abc123..HEAD' });
  assert.match(prompts.history, /range: abc123\.\.HEAD/);
  assert.match(prompts.history, /git diff HEAD/);
});

// ---- PLAN-memory-index, card harvest: headers for a new topical, the regenerated index, the migration ----

const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(REPO, '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PAYLOAD, 'experts', 'experts.js');
const RUN = path.join(PAYLOAD, 'phases', 'run.js');
const memory = require(path.join(PAYLOAD, 'lib', 'memory.js'));

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const tmp = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-harvest-')));
  made.push(dir);
  return dir;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const env = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
delete env.NODE_TEST_CONTEXT;
const cli = (cwd, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8', env });
const json = (r) => {
  const line = r.stdout.trim().split(/\r?\n/).pop();
  try {
    return JSON.parse(line);
  } catch {
    throw new Error(`not one JSON line: ${r.stdout} ${r.stderr}`);
  }
};
const put = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
// Untrimmed: a file's last newline is part of what a test may assert.
const show = (dir, rev, file) => {
  const r = spawnSync('git', ['show', `${rev}:${file}`], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git show ${rev}:${file}: ${r.stderr}`);
  return r.stdout;
};
const hasBranch = (dir, name) => spawnSync('git', ['rev-parse', '--verify', '-q', `refs/heads/${name}`], { cwd: dir }).status === 0;

const INTRO = '# Memory\n\nThe owner writes this part.\n\n';
const HOOKS = '---\ndescription: How enforcement works.\nread_when:\n  paths:\n    - hooks/**\n  keywords:\n    - heartbeat\nupdated: 2026-01-01\n---\n\n# Hooks\n\n## Key decisions\n\n- Fail open.\n\n## Other\n\ntext\n';
const PLAIN = '---\ndescription: A note with no decisions section.\nread_when:\n  keywords:\n    - plainword\n---\n\n# Plain\n\nbody\n';
const ONE = '---\ndescription: One cue.\nread_when:\n  paths:\n    - only/**\n---\n\n# One\n';
const OLD_HOOKS = '# Hooks\n\nLast updated 2026-01-01.\n\nbody\n';
const OLD_ENTRY = '- [memory/hooks.md](memory/hooks.md) - How enforcement works. **Read when** `hooks/**`, heartbeat.\n';

// A git project at its root: migrated (headers and markers) or not (the state before 4.8.0).
function project({ migrated = true } = {}) {
  const dir = tmp();
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  put(dir, '.gitignore', '.ultimate-workflow/\n');
  put(dir, 'CLAUDE.md', '# Rules\n\n## Gotchas\n\n- Old one.\n');
  if (migrated) {
    const topicals = { 'memory/hooks.md': HOOKS, 'memory/plain.md': PLAIN, 'memory/one.md': ONE };
    for (const [f, t] of Object.entries(topicals)) put(dir, f, t);
    put(dir, 'memory.md', memory.renderIndex(INTRO, topicals));
  } else {
    put(dir, 'memory/hooks.md', OLD_HOOKS);
    put(dir, 'memory.md', INTRO + OLD_ENTRY);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

function harvest(dir, feature, proposals) {
  put(dir, `.ultimate-workflow/run/${feature}/harvest.json`, JSON.stringify(proposals));
  return json(cli(dir, 'harvest-branch', '--feature', feature, '--from', `.ultimate-workflow/run/${feature}/harvest.json`));
}

// The files of a commit written to a fresh folder, so `memory check` can run on exactly that tree.
function exportTree(dir, rev) {
  const out = tmp();
  for (const f of git(dir, 'ls-tree', '-r', '--name-only', rev).split('\n')) put(out, f, show(dir, rev, f));
  return out;
}
const checks = (root) => spawnSync(process.execPath, [CLI, 'memory', 'check', '--root', root], { encoding: 'utf8' });

const subjects = (dir, range) => git(dir, 'log', '--format=%s', range).split('\n').filter(Boolean);
const filesOf = (dir, rev) => git(dir, 'diff-tree', '--no-commit-id', '--name-only', '-r', rev).split('\n').filter(Boolean).sort();
const NEW = { destination: 'memory', path: 'memory/parsing.md', text: '# Parsing\n\nHow it works.', description: 'How parsing works.', paths: ['lib/parse.js'], keywords: ['parser'], source: 'card 2', rationale: 'explains' };

test('a new topical gets its header, memory.md lists it, and both are one commit', () => {
  const dir = project();
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = harvest(dir, 'f', [NEW]);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(git(dir, 'rev-list', '--count', `${head}..uw/harvest/f`), '1', 'the migrated project gets no migration commit');
  assert.deepStrictEqual(filesOf(dir, 'uw/harvest/f'), ['memory.md', 'memory/parsing.md']);
  const topical = show(dir, 'uw/harvest/f', 'memory/parsing.md');
  assert.ok(topical.startsWith('---\n'), 'the file starts with the header');
  const parsed = memory.parseHeader(topical);
  assert.deepStrictEqual(parsed.errors, []);
  assert.equal(parsed.header.description, 'How parsing works.');
  assert.deepStrictEqual(parsed.header.paths, ['lib/parse.js']);
  assert.deepStrictEqual(parsed.header.keywords, ['parser']);
  assert.match(topical, /# Parsing\n\nHow it works\./);
  const index = show(dir, 'uw/harvest/f', 'memory.md');
  assert.match(index, /- \[memory\/parsing\.md\]\(memory\/parsing\.md\) - How parsing works\./);
  assert.ok(index.startsWith(INTRO), 'text outside the markers is kept');
  assert.equal(checks(exportTree(dir, 'uw/harvest/f')).status, 0, 'memory check passes on the branch tip');
});

test('a new topical without a description, or without paths and keywords, is refused and nothing is committed', () => {
  const dir = project();
  const head = git(dir, 'rev-parse', 'HEAD');
  const noDescription = harvest(dir, 'a', [{ ...NEW, description: undefined }]);
  assert.equal(noDescription.ok, false);
  assert.match(noDescription.reason, /description/);
  const noCue = harvest(dir, 'b', [{ ...NEW, paths: [], keywords: [] }]);
  assert.equal(noCue.ok, false);
  assert.match(noCue.reason, /paths|keywords/);
  const absent = harvest(dir, 'c', [{ destination: 'memory', path: 'memory/parsing.md', text: '# Parsing\n\nx', description: 'd', source: 's', rationale: 'r' }]);
  assert.equal(absent.ok, false, 'paths and keywords missing altogether');
  for (const f of ['a', 'b', 'c']) assert.ok(!hasBranch(dir, `uw/harvest/${f}`), `no branch ${f}`);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
});

test('add_paths merges into the header without duplicates, sets updated, and the text goes under Key decisions', () => {
  const dir = project();
  const before = new Date().toISOString().slice(0, 10);
  const r = harvest(dir, 'f', [{ destination: 'memory', path: 'memory/hooks.md', text: '- Heartbeat is written first.', add_paths: ['hooks/**', 'adapters/**'], add_keywords: ['heartbeat', 'adapter'], source: 'card 3', rationale: 'r' }]);
  assert.equal(r.ok, true, JSON.stringify(r));
  const after = new Date().toISOString().slice(0, 10);
  const text = show(dir, 'uw/harvest/f', 'memory/hooks.md');
  const { header } = memory.parseHeader(text);
  assert.deepStrictEqual(header.paths, ['hooks/**', 'adapters/**']);
  assert.deepStrictEqual(header.keywords, ['heartbeat', 'adapter']);
  assert.ok([before, after].includes(header.updated), `updated ${header.updated}`);
  assert.match(text, /## Key decisions\n[\s\S]*- Heartbeat is written first\.[\s\S]*## Other/, 'inside Key decisions, before the next heading');
  assert.match(show(dir, 'uw/harvest/f', 'memory.md'), /adapters\/\*\*/, 'the regenerated index shows the new path');
});

test('an existing topical with no Key decisions section gets the text at the end', () => {
  const dir = project();
  const r = harvest(dir, 'f', [{ destination: 'memory', path: 'memory/plain.md', text: 'Appended note.', add_keywords: ['extra'], source: 's', rationale: 'r' }]);
  assert.equal(r.ok, true, JSON.stringify(r));
  const text = show(dir, 'uw/harvest/f', 'memory/plain.md');
  assert.match(text, /body\n\nAppended note\.\n$/);
  assert.deepStrictEqual(memory.parseHeader(text).header.keywords, ['plainword', 'extra']);
});

test('two memory proposals and a gotcha: the memory files and memory.md are one commit, CLAUDE.md another', () => {
  const dir = project();
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = harvest(dir, 'f', [
    NEW,
    { destination: 'memory', path: 'memory/hooks.md', text: '- Another decision.', add_keywords: ['decision'], source: 's', rationale: 'r' },
    { destination: 'gotcha', path: 'CLAUDE.md', text: '- Beware the glob.', source: 's', rationale: 'r' },
  ]);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(git(dir, 'rev-list', '--count', `${head}..uw/harvest/f`), '2');
  assert.deepStrictEqual(filesOf(dir, 'uw/harvest/f'), ['CLAUDE.md']);
  assert.deepStrictEqual(filesOf(dir, 'uw/harvest/f~1'), ['memory.md', 'memory/hooks.md', 'memory/parsing.md']);
  assert.equal(r.commits.length, 2);
});

test('a proposal that names memory.md is refused with a reason', () => {
  const dir = project();
  const r = harvest(dir, 'f', [{ destination: 'memory', path: 'memory.md', text: '- [x](memory/x.md) - hand written', source: 's', rationale: 'r' }]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /memory\.md/);
  assert.ok(!hasBranch(dir, 'uw/harvest/f'), 'no branch');
});

test('a project that is not migrated: the migration is the first commit, its tree passes memory check, the proposals follow', () => {
  const dir = project({ migrated: false });
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = harvest(dir, 'f', [{ destination: 'gotcha', path: 'CLAUDE.md', text: '- Beware x.', source: 's', rationale: 'r' }]);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(subjects(dir, `${head}..uw/harvest/f`).reverse().map((s) => s.split(' -> ')[0]), ['harvest: migrate memory to headers', 'harvest: gotcha']);
  const first = git(dir, 'rev-list', '--reverse', `${head}..uw/harvest/f`).split('\n')[0];
  assert.match(show(dir, first, 'memory/hooks.md'), /^---\ndescription: How enforcement works\./);
  assert.match(show(dir, first, 'memory.md'), /uw:memory-index:start/);
  const out = checks(exportTree(dir, first));
  assert.equal(out.status, 0, out.stdout);
  assert.doesNotMatch(out.stdout, /not migrated/);
});

test('not migrated and no proposals: the branch holds the migration commit alone; migrated and no proposals: no branch', () => {
  const old = project({ migrated: false });
  const head = git(old, 'rev-parse', 'HEAD');
  const r = harvest(old, 'f', []);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.branch, 'uw/harvest/f');
  assert.equal(git(old, 'rev-list', '--count', `${head}..uw/harvest/f`), '1');
  assert.equal(git(old, 'log', '-1', '--format=%s', 'uw/harvest/f'), 'harvest: migrate memory to headers');
  const fresh = project();
  const none = harvest(fresh, 'f', []);
  assert.equal(none.ok, true);
  assert.equal(none.branch, null);
  assert.ok(!hasBranch(fresh, 'uw/harvest/f'));
});

test('remove_paths removes the named globs; removing the last cue of a topical is refused', () => {
  const dir = project();
  const ok = harvest(dir, 'a', [{ destination: 'memory', path: 'memory/hooks.md', text: '- Moved.', add_paths: ['adapters/**'], remove_paths: ['hooks/**'], source: 's', rationale: 'r' }]);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.deepStrictEqual(memory.parseHeader(show(dir, 'uw/harvest/a', 'memory/hooks.md')).header.paths, ['adapters/**']);
  const refused = harvest(dir, 'b', [{ destination: 'memory', path: 'memory/one.md', text: '- x', remove_paths: ['only/**'], source: 's', rationale: 'r' }]);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /last|cue/);
  assert.ok(!hasBranch(dir, 'uw/harvest/b'), 'no branch');
});

test('the last harvest commit says how to resolve a conflict in memory.md', () => {
  const dir = project();
  harvest(dir, 'f', [NEW, { destination: 'gotcha', path: 'CLAUDE.md', text: '- Beware y.', source: 's', rationale: 'r' }]);
  const message = git(dir, 'log', '-1', '--format=%B', 'uw/harvest/f');
  assert.match(message, /memory\.md/);
  assert.match(message, /memory index/);
  assert.match(message, /either side/);
});

test('two harvest branches from one tip, each adding a topical, merge to an index that lists both and passes memory check', () => {
  const dir = project();
  const other = { ...NEW, path: 'memory/other.md', description: 'Something else.', paths: ['lib/other.js'], keywords: ['other'] };
  assert.equal(harvest(dir, 'a', [NEW]).ok, true);
  assert.equal(harvest(dir, 'b', [other]).ok, true);
  git(dir, 'merge', '-q', '--ff-only', 'uw/harvest/a');
  const merged = spawnSync('git', ['merge', '-q', '--no-edit', 'uw/harvest/b'], { cwd: dir, encoding: 'utf8' });
  if (merged.status !== 0) {
    git(dir, 'checkout', '--ours', 'memory.md');
    git(dir, 'add', 'memory.md');
  }
  const fixed = spawnSync(process.execPath, [CLI, 'memory', 'index', '--root', dir], { encoding: 'utf8' });
  assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
  if (merged.status !== 0) {
    git(dir, 'add', 'memory.md');
    git(dir, 'commit', '-q', '--no-edit');
  }
  const index = fs.readFileSync(path.join(dir, 'memory.md'), 'utf8');
  assert.match(index, /memory\/parsing\.md/);
  assert.match(index, /memory\/other\.md/);
  assert.equal(checks(dir).status, 0);
});

test('the working tree and the current branch are unchanged after harvest-branch', () => {
  const dir = project();
  put(dir, 'wip.js', '// wip\n');
  const head = git(dir, 'rev-parse', 'HEAD');
  const status = git(dir, 'status', '--short');
  const memoryMd = fs.readFileSync(path.join(dir, 'memory.md'), 'utf8');
  assert.equal(harvest(dir, 'f', [NEW]).ok, true);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
  assert.equal(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');
  assert.equal(git(dir, 'status', '--short'), status);
  assert.equal(fs.readFileSync(path.join(dir, 'memory.md'), 'utf8'), memoryMd);
  assert.ok(!fs.existsSync(path.join(dir, 'memory/parsing.md')));
});

// ---- the two scripts and the interactive command ----

// The object literal bound to `const PROPOSALS` in a workflow script, evaluated.
function schemaOf(file) {
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('const PROPOSALS = ');
  assert.ok(start >= 0, `${file} has PROPOSALS`);
  const end = src.indexOf('\n}\n', start);
  assert.ok(end > start, `${file}: the end of PROPOSALS`);
  return new Function(`return ${src.slice(start + 'const PROPOSALS = '.length, end + 2)}`)();
}

test('the proposal schemas of phases/harvest.js and phases/run.js are equal and carry the header fields', () => {
  const a = schemaOf(SCRIPT);
  const b = schemaOf(RUN);
  assert.deepStrictEqual(a, b);
  const props = a.properties.proposals.items.properties;
  for (const k of ['description', 'paths', 'keywords', 'add_paths', 'add_keywords', 'remove_paths']) assert.ok(props[k], `${k} in the schema`);
  assert.deepStrictEqual(a.properties.proposals.items.required, ['destination', 'path', 'text', 'source', 'rationale'], 'the header fields are optional in the schema');
});

test('the interactive harvest prompts tell the harvester to run memory check', async () => {
  const { calls } = await loadWorkflow(SCRIPT)({ scope: 'a feature' }, async (call) => {
    if (call.label === 'existing') return { gotchas: [], topicals: [], notes: '' };
    if (call.label === 'route') return { proposals: [], discarded: [] };
    return { candidates: [{ lesson: 'x', source: 's' }] };
  });
  const prompts = calls.filter((c) => c.label === 'existing' || c.label === 'route');
  assert.equal(prompts.length, 2);
  for (const c of prompts) assert.match(c.prompt, /memory check/, c.label);
});

// A one-card healthy run, recording every call.
const card1 = (extra = {}) => ({ name: '1', title: 'card 1', paths: ['src/1/**'], depends: [], carried: [], experts: ['quality'], briefs: [], reviewSkills: {}, preflight: { ok: true, contextFile: '.ultimate-workflow/run/f/cards/1/context.md' }, ...extra });
const runArgs = (cards) => ({ plan: 'PLAN-f.md', feature: 'f', cli: 'node "/p/experts/experts.js"', base: 'abc1234', verify: 'node "/p/hooks/verify.js" --plan "PLAN-f.md"', command: 'npm test', available: [{ name: 'quality', agent: 'uw-expert-quality', description: 'tests', stages: ['plan', 'tests', 'review'] }], expertsDir: '/p/experts', protocol: 'rules', cards });
const steps = (...lines) => ({ outputs: lines.map((l) => ({ command: '', output: typeof l === 'string' ? l : JSON.stringify(l) })) });
function healthy(calls) {
  return async (call) => {
    calls.push(call);
    const [who, role] = String(call.label).includes(':') ? call.label.split(':') : [call.label, ''];
    if (role === 'write-tests') return { filesWritten: [`test/${who}.test.js`], testsFailAsExpected: true, summary: 'red' };
    if (/^attempt-/.test(role)) return { green: true, fullSuiteGreen: true, filesChanged: [`src/${who}/x.js`], summary: 'done' };
    if (role === 'prepare') return steps({ card: who, outOfScope: [] }, { ok: true });
    if (role === 'recheck') return { experts: [] };
    if (role === 'quality' && who !== 'review') return { lensVerdict: 'ok', findings: [], stillPresent: [] };
    if (role === 'refute' && who !== 'review') return { verdicts: [] };
    if (role === 'commit') {
      const lane = JSON.parse(/<<<CONTENT\n([\s\S]*?)\nCONTENT>>>/.exec(call.prompt)[1]).expertLane;
      return steps({ stage: 'review', recorded: lane.ran, findings: lane.findings.length, open: [] }, { ok: true, card: who, commit: `c-${who}`, files: 1, handoff: 'h', missingClaims: [] });
    }
    if (role === 'decisions') return steps({ ok: true, card: who, major: [], minor: [] });
    if (role === 'start') return steps(...String(call.prompt).split('\n').filter((l) => /card-status/.test(l)).map(() => ({ ok: true })));
    if (role === 'journal' || role === 'carry') return steps({ ok: true });
    if (who === 'review') return { lensVerdict: 'ok', findings: [] };
    if (call.label === 'harvest') return { proposals: [], discarded: [] };
    if (role === 'branch') return steps({ ok: true, branch: 'uw/harvest/f', commits: [] });
    if (/ notify /.test(call.prompt)) return steps({ ok: true, desktop: 'sent' });
    throw new Error(`unexpected agent ${call.label}`);
  };
}

test('phases/harvest.js in branch mode still asks for harvest-branch when the router proposes nothing', async () => {
  const { calls } = await loadWorkflow(SCRIPT)({ scope: 'a feature', mode: 'branch', feature: 'f', cli: 'node "/p/experts.js"' }, async (call) => {
    if (call.label === 'existing') return { gotchas: [], topicals: [], notes: '' };
    if (call.label === 'route') return { proposals: [], discarded: [] };
    if (call.label === 'harvest-branch') return steps({ ok: true, branch: 'uw/harvest/f', commits: [] });
    return { candidates: [{ lesson: 'x', source: 's' }] };
  });
  assert.ok(calls.some((c) => c.label === 'harvest-branch' && /harvest-branch --feature f/.test(c.prompt)), 'harvest-branch is asked for although the router proposed nothing, so a project can be migrated');
});

test('the run harvest prompt tells the harvester to run memory check, and the branch step runs even with no proposals', async () => {
  const calls = [];
  await loadWorkflow(RUN)(runArgs([card1()]), healthy(calls));
  const prompt = calls.find((c) => c.label === 'harvest');
  assert.ok(prompt, 'the harvester ran');
  assert.match(prompt.prompt, /node "\/p\/experts\/experts\.js" memory check/, 'the prompt holds the command');
  assert.ok(calls.some((c) => c.label === 'harvest:branch' && /harvest-branch/.test(c.prompt)), 'harvest-branch is asked for although the harvester proposed nothing, so a project can be migrated');
});

test('a warning pack() returns reaches the run as one notice, however many cards carry it', async () => {
  const calls = [];
  const warning = 'pack_budget "plenty" is not a positive number: using 15000';
  const pre = (n, warnings) => ({ ok: true, contextFile: `.ultimate-workflow/run/f/cards/${n}/context.md`, tokens: 100, budget: 15000, overBudget: false, warnings });
  const two = { ...card1({ preflight: pre('2', [warning]) }), name: '2', title: 'card 2', paths: ['src/2/**'] };
  await loadWorkflow(RUN)(runArgs([card1({ preflight: pre('1', [warning]) }), two]), healthy(calls));
  const notices = calls.filter((c) => / notify /.test(c.prompt) && /--kind warning/.test(c.prompt));
  assert.equal(notices.length, 1, notices.map((c) => c.label).join(','));
  assert.match(notices[0].prompt, /pack_budget/);
  const quiet = [];
  await loadWorkflow(RUN)(runArgs([card1({ preflight: pre('1', []) })]), healthy(quiet));
  assert.equal(quiet.filter((c) => /--kind warning/.test(c.prompt)).length, 0);
});

test('commands/harvest.md names memory index and memory check after the proposals are applied', () => {
  const text = fs.readFileSync(path.join(PAYLOAD, 'commands', 'harvest.md'), 'utf8');
  const at = text.search(/proposals? (?:are|is|have been) applied/i);
  assert.ok(at >= 0, 'a passage on what to run once the proposals are applied');
  const after = text.slice(at);
  assert.match(after, /memory index/);
  assert.match(after, /memory check/);
});

test('notify accepts the kind warning', () => {
  const dir = tmp();
  const r = cli(dir, 'notify', '--feature', 'f', '--kind', 'warning', '--reason', 'pack_budget is not a number');
  assert.equal(json(r).ok, true, r.stdout + r.stderr);
});
