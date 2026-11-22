'use strict';

// PLAN-5.2.0.md, the cards for several repositories. One plan lives in the main repository; its header names the
// others (`repos: demo=../demo`), and a card path in another repository carries its name (`demo:src/**`). Every test of
// a command here runs it in real git repositories, with its options as the run gives them.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const VERIFY = path.join(PLUGIN, 'hooks', 'verify.js');
const repos = require(path.join(PLUGIN, 'lib', 'repos.js'));
const cards = require(path.join(PLUGIN, 'experts', 'cards.js'));
const experts = require(path.join(PLUGIN, 'experts', 'experts.js'));
const claims = require(path.join(PLUGIN, 'lib', 'claims.js'));

const env = () => {
  const e = { ...process.env, ULTIMATE_WORKFLOW_GATES: '', ULTIMATE_WORKFLOW_NOTIFY: 'off' };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const cli = (dir, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd: dir, encoding: 'utf8', env: env() });
const json = (r) => {
  const last = r.stdout.trim().split(/\r?\n/).pop();
  assert.ok(last && last.startsWith('{'), `no JSON line; stdout: ${r.stdout} stderr: ${r.stderr}`);
  return JSON.parse(last);
};
const git = (dir, ...a) => {
  const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${a.join(' ')} in ${dir}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

/** A test command that passes, prints a count the plugin reads, and fails when the file `fail-<name>` exists. */
const TEST_JS = (name) => `const fs = require('fs');\nif (fs.existsSync('fail-${name}')) { console.log('not ok 1 - ${name}::broken\\n# tests 1\\n# pass 0\\n# fail 1'); process.exit(1); }\nconsole.log('ok 1 - ${name}::works\\n# tests 1\\n# pass 1\\n# fail 0');\n`;

function repo(dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@localhost');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, '.gitignore', '.ultimate-workflow/\n');
  write(dir, 't.test.js', TEST_JS(name));
  write(dir, 'src/keep.js', 'module.exports = 1;\n');
}
const commit = (dir, msg) => {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', msg);
};

const PLAN = ({ header = 'repos: demo=../demo', cardsText = '' } = {}) => `---
phase: build
plan_confirmed: false
tests_confirmed: false
test_command: node t.test.js
test_command@demo: node t.test.js
${header}
experts: []
---

# PLAN: two

## Goal

Two repositories. See \`docs/main.md\` and \`demo:docs/api.md\`.

## Cards

${cardsText || `- main: a card of the main repository
  paths: src/main/**
- other: a card of the second repository
  paths: demo:src/lib/**
- both: a card of the two
  paths: src/both/**, demo:src/both/**
  depends: main, other`}

## Tests

### main: a card of the main repository

- it works

### other: a card of the second repository

- it works

### both: a card of the two

- it works
`;

/** Two repositories side by side: \`main\` holds the plan, \`demo\` is the second one. Returns their folders. */
function two({ plan = PLAN(), confirm = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-repos-'));
  const main = path.join(root, 'main');
  const demo = path.join(root, 'demo');
  repo(main, 'main');
  repo(demo, 'demo');
  write(main, 'docs/main.md', '# Main doc\n');
  write(demo, 'docs/api.md', '# The API of demo\n');
  write(main, 'PLAN-two.md', plan);
  commit(main, 'init');
  commit(demo, 'init');
  if (confirm) {
    json(cli(main, 'present', '--confirm', 'plan_confirmed', '--plan', 'PLAN-two.md'));
    json(cli(main, 'present', '--confirm', 'tests_confirmed', '--plan', 'PLAN-two.md'));
    commit(main, 'confirmed');
  }
  return { root, main, demo };
}

// --- repos-core ------------------------------------------------------------------------------------------------------

test('repos-core 1: the header line reads as names with their places, and no line reads as none', () => {
  assert.deepStrictEqual(repos.declared('---\nrepos: demo=../demo, api=../api\n---\n'), { list: [{ name: 'demo', place: '../demo' }, { name: 'api', place: '../api' }], problems: [] });
  assert.deepStrictEqual(repos.declared('---\nphase: build\n---\n'), { list: [], problems: [] });
});

test('repos-core 2: a bad name, a name given two times and an entry with no place are refused, each by its entry', () => {
  const d = repos.declared('---\nrepos: demo=../demo, a b=x, demo=../y, z\n---\n');
  assert.deepStrictEqual(d.list, [{ name: 'demo', place: '../demo' }]);
  assert.match(d.problems[0], /"a b=x": the name must be letters, digits, dot, dash or underscore/);
  assert.match(d.problems[1], /"demo=\.\.\/y": the name demo is given two times/);
  assert.match(d.problems[2], /"z": it has no place/);
});

test('repos-core 3: a prefix is a repository, no prefix is the main one, and a drive is not a prefix', () => {
  assert.deepStrictEqual(cards.splitPath('demo:src/**'), { repo: 'demo', path: 'src/**' });
  assert.deepStrictEqual(cards.splitPath('./src/**'), { repo: '', path: 'src/**' });
  assert.deepStrictEqual(cards.splitPath('C:\\x\\y'), { repo: '', path: 'C:/x/y' });
});

test('repos-core 4-6: card-add writes a declared prefix as given, and refuses one that is not declared or a path that leaves its repository', () => {
  const { main } = two({ plan: PLAN({ cardsText: '- first: one\n  paths: src/**' }) });
  const ok = json(cli(main, 'card-add', '--plan', 'PLAN-two.md', '--name', 'x', '--title', 'both', '--paths', 'src/x/**,demo:src/lib/**'));
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.deepStrictEqual(ok.card.paths, ['src/x/**', 'demo:src/lib/**']);
  const undeclared = json(cli(main, 'card-add', '--plan', 'PLAN-two.md', '--name', 'y', '--title', 't', '--paths', 'api:src/**'));
  assert.equal(undeclared.ok, false);
  assert.match(undeclared.reason, /names the repository "api", which the plan's header does not declare \(repos: demo\)/);
  for (const bad of ['demo:../x', 'demo:/abs/x', 'demo:', '../other/x', 'C:/x']) {
    const r = json(cli(main, 'card-add', '--plan', 'PLAN-two.md', '--name', 'z', '--title', 't', '--paths', bad));
    assert.equal(r.ok, false, bad);
    assert.match(r.reason, /must be relative to the project root and stay inside it/, bad);
  }
});

test('repos-core 7: the repositories of a card are the main one for a path with no prefix, and each prefix it uses', () => {
  const list = cards.parseCards(PLAN());
  assert.deepStrictEqual(list.map((c) => repos.ofCard(c)), [[''], ['demo'], ['', 'demo']]);
  assert.deepStrictEqual(repos.usedBy(list), ['', 'demo']);
  assert.deepStrictEqual(repos.usedBy([list[1]]), ['demo']);
});

test('repos-core 8: a file of another repository is covered only by a path with that prefix', () => {
  const covers = (paths, file) => cards.covers(paths, file, experts.globToRegExp);
  assert.equal(covers(['demo:src/lib/**'], 'demo:src/lib/a.js'), true);
  assert.equal(covers(['src/lib/**'], 'demo:src/lib/a.js'), false, 'a main path with the same text does not cover it');
  assert.equal(covers(['demo:src/lib/**'], 'src/lib/a.js'), false);
  assert.equal(covers(['demo:src/*.js'], 'demo:src/a.js'), true);
  assert.equal(covers(['demo:src/*.js'], 'demo:src/deep/a.js'), false);
  assert.deepStrictEqual(cards.outOfScope(['demo:src/lib/a.js', 'demo:src/other.js', 'src/x.js'], ['demo:src/lib/**'], experts.globToRegExp), ['demo:src/other.js', 'src/x.js']);
});

test('repos-core 1: the places are checked: missing, not the top of a repository, the same folder or one inside another', () => {
  const { main, demo, root } = two();
  const ok = repos.resolve(main, read(main, 'PLAN-two.md'));
  assert.deepStrictEqual(ok.problems, []);
  assert.deepStrictEqual(ok.repos.map((r) => r.name), ['', 'demo']);
  assert.equal(fs.realpathSync(demo), ok.repos[1].dir);
  fs.mkdirSync(path.join(main, 'inner'));
  git(path.join(main, 'inner'), 'init', '-q');
  fs.mkdirSync(path.join(root, 'plain'));
  const bad = repos.resolve(main, '---\nrepos: gone=../gone, plain=../plain, sub=../demo/src, inner=./inner, me=.\n---\n');
  assert.deepStrictEqual(bad.repos.map((r) => r.name), ['']);
  assert.match(bad.problems[0], /repository gone: the folder \.\.\/gone does not exist/);
  assert.match(bad.problems[1], /repository plain: \.\.\/plain is not the top folder of a git repository/);
  assert.match(bad.problems[2], /repository sub: \.\.\/demo\/src is not the top folder of a git repository/);
  assert.match(bad.problems[3], /repository inner: \.\/inner is the same folder as the main repository, or one is inside the other/);
  assert.match(bad.problems[4], /repository me: \. is the same folder as the main repository/);
});

test('repos-core 9: a document cited with a prefix is looked for in that repository, and the pack says where each repository is', () => {
  const { main, demo } = two();
  const p = json(cli(main, 'pack', '--plan', 'PLAN-two.md', '--card', 'other', '--feature', 'two'));
  assert.equal(p.ok, true, JSON.stringify(p));
  const pack = read(main, p.contextFile);
  assert.match(pack, /demo:docs\/api\.md/);
  assert.match(pack, /docs\/main\.md/);
  assert.ok(pack.includes(`\`demo:\` is ${fs.realpathSync(demo).split(path.sep).join('/')}`), pack.slice(0, 600));
  fs.rmSync(path.join(demo, 'docs', 'api.md'));
  const gone = json(cli(main, 'pack', '--plan', 'PLAN-two.md', '--card', 'other', '--feature', 'two'));
  assert.equal(gone.ok, false);
  assert.match(gone.reason, /the plan cites demo:docs\/api\.md, which does not exist/);
});

test('repos-core 9: a measure with a repository name is not understood, with the reason', () => {
  const m = claims.parseMeasures('- measure: bytes demo:src/a.js <= 500\n- measure: bytes src/a.js <= 500\n');
  assert.equal(m[0].understood, false);
  assert.match(m[0].why, /a measure is of the main repository/);
  assert.equal(m[1].understood, true);
});

test('repos-core: a plan with no repos line has one repository, and its pack says nothing of others', () => {
  const { main } = two({ plan: PLAN({ header: 'pack_budget: 15000', cardsText: '- main: a card of the main repository\n  paths: src/main/**' }).replace(' and `demo:docs/api.md`', '') });
  assert.deepStrictEqual(repos.resolve(main, read(main, 'PLAN-two.md')).repos.map((r) => r.name), ['']);
  const p = json(cli(main, 'pack', '--plan', 'PLAN-two.md', '--card', 'main', '--feature', 'two'));
  assert.equal(p.ok, true, JSON.stringify(p));
  assert.doesNotMatch(read(main, p.contextFile), /more than one repository/);
});

module.exports = { two, PLAN, cli, json, git, write, read, commit, repo, env, CLI, VERIFY, PLUGIN };

// --- repos-start: the run branch, the baseline and the mark in each repository ------------------------------------

const branchOf = (dir) => git(dir, 'rev-parse', '--abbrev-ref', 'HEAD');
const branches = (dir) => git(dir, 'branch', '--list', 'uw/run/*');
const start = (main, ...extra) => json(cli(main, 'run-start', '--plan', 'PLAN-two.md', '--feature', 'two', ...extra));

test('repos-start 1: run-start makes the run branch in each repository a card names, each from its own HEAD', () => {
  const { main, demo } = two({ confirm: true });
  const heads = [git(main, 'rev-parse', 'HEAD'), git(demo, 'rev-parse', 'HEAD')];
  const r = start(main);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual([branchOf(main), branchOf(demo)], ['uw/run/two', 'uw/run/two']);
  assert.equal(git(main, 'rev-parse', 'main'), heads[0]);
  assert.equal(git(demo, 'rev-parse', 'main'), heads[1], 'the branch of the user did not move');
  assert.equal(r.repos.length, 1);
  assert.deepStrictEqual([r.repos[0].name, r.repos[0].branch, r.repos[0].created], ['demo', 'uw/run/two', true]);
  assert.equal(r.repos[0].base, heads[1].slice(0, 12));
  assert.deepStrictEqual(r.repos[0].baseline, { taken: true, failures: 0 });
});

test('repos-start 2: a repository the header declares and no card uses gets no branch', () => {
  const { main, demo } = two({ confirm: true, plan: PLAN({ cardsText: '- main: a card of the main repository\n  paths: src/main/**' }) });
  const r = start(main);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.repos, undefined);
  assert.equal(branches(demo), '');
  assert.equal(branchOf(demo), 'main');
});

test('repos-start 3-4: a refusal makes no branch in any repository', () => {
  const cases = [
    ['a place that does not exist', (t) => fs.rmSync(t.demo, { recursive: true, force: true }), /repository demo: the folder \.\.\/demo does not exist/],
    ['uncommitted changes', (t) => write(t.demo, 'src/dirty.js', 'x\n'), /repository demo has uncommitted changes/],
    ['the mark of another run', (t) => { write(t.demo, '.ultimate-workflow/run/active.json', JSON.stringify({ feature: 'other', started: '2026-11-01T00:00:00.000Z' })); git(t.demo, 'switch', '-q', '-c', 'uw/run/other'); }, /repository demo: the run of "other" \(started 2026-11-01T00:00:00\.000Z\) is not finished there/],
    ['a run branch that exists and is not checked out', (t) => git(t.demo, 'branch', 'uw/run/two'), /repository demo: uw\/run\/two already exists and is not checked out/],
  ];
  for (const [name, setup, why] of cases) {
    const t = two({ confirm: true });
    setup(t);
    const r = start(t.main);
    assert.equal(r.ok, false, name);
    assert.equal(r.needs, 'repos', name);
    assert.match(r.reason, why, name);
    assert.equal(branches(t.main), '', `${name}: no run branch in the main repository`);
    assert.equal(branchOf(t.main), 'main', name);
  }
});

test('repos-start 3: a place inside the main repository is refused', () => {
  const t = two({ confirm: true, plan: PLAN({ header: 'repos: demo=./inner' }) });
  fs.mkdirSync(path.join(t.main, 'inner'));
  git(path.join(t.main, 'inner'), 'init', '-q');
  const r = start(t.main);
  assert.equal(r.ok, false);
  assert.match(r.reason, /one is inside the other/);
});

test('repos-start 5: a repository with cards and no test command is refused, and the reason names the key', () => {
  const t = two({ confirm: true, plan: PLAN().replace('test_command@demo: node t.test.js\n', '') });
  const r = start(t.main);
  assert.equal(r.ok, false);
  assert.match(r.reason, /repository demo has cards and no test command: add `test_command@demo: <its full test command>`/);
  assert.equal(branches(t.demo), '');
});

test('repos-start 5-6: the baseline of each repository uses its own command; one that fails names the repository and its tests', () => {
  const t = two({ confirm: true });
  write(t.demo, 'fail-demo', '');
  commit(t.demo, 'a failing test');
  const r = start(t.main);
  assert.equal(r.ok, false);
  assert.equal(r.needs, 'baseline');
  assert.equal(r.repo, 'demo');
  assert.deepStrictEqual(r.failing, ['demo::broken']);
  assert.match(r.reason, /the suite of repository demo already fails before the run/);
  assert.match(r.reason, /--accept-baseline --plan PLAN-two\.md --repo demo/);
  const base = JSON.parse(read(t.demo, '.ultimate-workflow/baseline.json'));
  assert.equal(base.command, 'node t.test.js');
});

test('repos-start 7-8: the mark is in each repository and run-finish removes each; the base and the ignore line are kept', () => {
  const t = two({ confirm: true });
  fs.writeFileSync(path.join(t.demo, '.gitignore'), 'node_modules/\n');
  commit(t.demo, 'no ignore line yet');
  const base = git(t.demo, 'rev-parse', 'HEAD');
  const r = start(t.main);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(JSON.parse(read(t.demo, '.ultimate-workflow/run/active.json')).feature, 'two');
  assert.equal(JSON.parse(read(t.main, '.ultimate-workflow/run/active.json')).feature, 'two');
  assert.match(read(t.demo, '.gitignore'), /^\.ultimate-workflow\/$/m);
  assert.deepStrictEqual(git(t.demo, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['.gitignore'], 'committed on the run branch');
  assert.equal(git(t.demo, 'rev-parse', 'main'), base, 'and only there');
  const run = JSON.parse(read(t.main, '.ultimate-workflow/run/two/run.json'));
  assert.equal(run.repos.demo.base, base.slice(0, 12));
  assert.deepStrictEqual(JSON.parse(read(t.main, '.ultimate-workflow/run/run.args.json')).repos.map((x) => x.name), ['demo']);
  // A second start on the same branches keeps the base of the first.
  assert.equal(start(t.main).ok, true);
  assert.equal(JSON.parse(read(t.main, '.ultimate-workflow/run/two/run.json')).repos.demo.base, base.slice(0, 12));
  write(t.main, 'out/wf_done-1.output', JSON.stringify({ result: { ok: false, feature: 'two', error: 'stopped' } }));
  json(cli(t.main, 'run-finish', '--output', 'out/wf_done-1.output'));
  assert.equal(fs.existsSync(path.join(t.demo, '.ultimate-workflow/run/active.json')), false);
  assert.equal(fs.existsSync(path.join(t.main, '.ultimate-workflow/run/active.json')), false);
});

test('repos-start 9: a resume checks the run branch out in each repository, and says when one has none', () => {
  const t = two({ confirm: true });
  assert.equal(start(t.main).ok, true);
  git(t.demo, 'switch', '-q', 'main');
  const again = start(t.main, '--resume');
  assert.equal(again.ok, true, JSON.stringify(again));
  assert.equal(branchOf(t.demo), 'uw/run/two');
  git(t.demo, 'switch', '-q', 'main');
  git(t.demo, 'branch', '-q', '-D', 'uw/run/two');
  const gone = start(t.main, '--resume');
  assert.equal(gone.ok, false);
  assert.match(gone.reason, /repository demo: nothing to resume, there is no uw\/run\/two/);
});

test('repos-start: verify.js --repo runs the command of that repository in its folder, and records there', () => {
  const t = two();
  const v = spawnSync(process.execPath, [VERIFY, '--full', '--plan', 'PLAN-two.md', '--repo', 'demo'], { cwd: t.main, encoding: 'utf8', env: env() });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  const rec = JSON.parse(read(t.demo, '.ultimate-workflow/verify.json'));
  assert.deepStrictEqual([rec.mode, rec.passed, rec.command], ['full', true, 'node t.test.js']);
  assert.equal(fs.existsSync(path.join(t.main, '.ultimate-workflow', 'verify.json')), false, 'nothing is recorded in the main repository');
  const none = spawnSync(process.execPath, [VERIFY, '--full', '--plan', 'PLAN-two.md', '--repo', 'api'], { cwd: t.main, encoding: 'utf8', env: env() });
  assert.equal(none.status, 2);
  assert.match(none.stderr, /declares no repository "api"/);
});

// --- repos-card: a card is checked, tested, committed and parked in each repository it changed -----------------------

const gatesOn = () => {
  const e = { ...process.env, ULTIMATE_WORKFLOW_NOTIFY: 'off' };
  delete e.ULTIMATE_WORKFLOW_GATES;
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const cliGated = (dir, ...a) => spawnSync(process.execPath, [CLI, ...a], { cwd: dir, encoding: 'utf8', env: gatesOn() });
const verify = (main, ...a) => spawnSync(process.execPath, [VERIFY, '--plan', 'PLAN-two.md', ...a], { cwd: main, encoding: 'utf8', env: gatesOn() });
/** A started run of the two repositories. */
function running() {
  const t = two({ confirm: true });
  const r = start(t.main);
  assert.equal(r.ok, true, JSON.stringify(r));
  return t;
}
const commitCard = (main, card, ...extra) => json(cliGated(main, 'card-commit', '--plan', 'PLAN-two.md', '--card', card, '--feature', 'two', '--full-at-end', ...extra));

test('repos-card 1: a file changed in another repository is in scope only under a path of the card with that name', () => {
  const t = running();
  write(t.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/elsewhere.js', 'module.exports = 2;\n');
  write(t.main, 'src/main/x.js', 'module.exports = 3;\n');
  const other = json(cli(t.main, 'scope', '--plan', 'PLAN-two.md', '--card', 'other'));
  assert.deepStrictEqual(other.outOfScope.sort(), ['demo:src/elsewhere.js', 'src/main/x.js']);
  const main = json(cli(t.main, 'scope', '--plan', 'PLAN-two.md', '--card', 'main'));
  assert.deepStrictEqual(main.outOfScope.sort(), ['demo:src/elsewhere.js', 'demo:src/lib/a.js']);
});

test('repos-card 2: a new dependency in another repository is a decision, named with its repository', () => {
  const t = running();
  write(t.demo, 'package.json', JSON.stringify({ name: 'demo', dependencies: { 'left-pad': '1.3.0' } }, null, 2));
  write(t.demo, 'src/lib/call.js', "fetch('https://api.numbers.io/x');\n");
  const d = json(cli(t.main, 'decisions', '--plan', 'PLAN-two.md', '--card', 'other', '--feature', 'two'));
  assert.equal(d.ok, true, JSON.stringify(d));
  const whats = d.major.map((x) => x.what).sort();
  assert.ok(whats.some((w) => /added dependency left-pad@1\.3\.0 in demo:package\.json/.test(w)), whats.join(' | '));
  assert.ok(whats.some((w) => /calls the external host api\.numbers\.io in demo:src\/lib\/call\.js/.test(w)), whats.join(' | '));
});

test('repos-card 3: verify.js --repo runs the related command of that repository and records there; with no --repo it is the main one', () => {
  const t = running();
  write(t.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  const v = verify(t.main, '--repo', 'demo');
  assert.equal(v.status, 0, v.stdout + v.stderr);
  // The plan gives this repository no related command, so the run is its full command, recorded in its folder.
  const rec = JSON.parse(read(t.demo, '.ultimate-workflow/verify.json'));
  assert.equal(rec.passed, true);
  assert.equal(rec.command, 'node t.test.js');
  assert.equal(fs.existsSync(path.join(t.main, '.ultimate-workflow', 'verify-related.json')), false);
});

test('repos-card 5-6: card-commit needs a passing record in each repository the card changed, then commits each, the main one last', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  const heads = [git(t.main, 'rev-parse', 'HEAD'), git(t.demo, 'rev-parse', 'HEAD')];
  assert.equal(verify(t.main, '--full').status, 0);
  const refused = commitCard(t.main, 'both');
  assert.equal(refused.ok, false);
  assert.equal(refused.gate, 'G7');
  assert.equal(refused.repo, 'demo');
  assert.match(refused.reason, /no passing test run covers the changes in repository demo/);
  assert.match(refused.reason, /verify\.js --plan PLAN-two\.md --repo demo/);
  assert.deepStrictEqual([git(t.main, 'rev-parse', 'HEAD'), git(t.demo, 'rev-parse', 'HEAD')], heads, 'nothing was committed in any repository');
  assert.equal(verify(t.main, '--repo', 'demo').status, 0);
  const r = commitCard(t.main, 'both', '--claimed', 'src/both/a.js');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.repos.length, 1);
  assert.equal(r.repos[0].repo, 'demo');
  assert.deepStrictEqual(git(t.demo, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/both/b.js']);
  assert.deepStrictEqual(git(t.main, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['PLAN-two.md', 'src/both/a.js']);
  assert.match(git(t.demo, 'log', '-1', '--format=%B'), /^card both: a card of the two/);
  const line = cards.findCard(read(t.main, 'PLAN-two.md'), 'both');
  assert.equal(line.committed, `${r.commit} demo=${r.repos[0].commit}`);
  assert.match(line.status, new RegExp(`^committed ${r.commit}$`));
  assert.equal(git(t.demo, 'status', '--porcelain'), '');
});

test('repos-card 7: a card that changed only another repository still gets its status in the plan of the main one', () => {
  const t = running();
  write(t.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  assert.equal(verify(t.main, '--repo', 'demo').status, 0);
  const r = commitCard(t.main, 'other');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(git(t.main, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['PLAN-two.md']);
  assert.match(cards.findCard(git(t.main, 'show', 'HEAD:PLAN-two.md'), 'other').status, /^committed/);
  assert.deepStrictEqual(git(t.demo, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/lib/a.js']);
});

test('repos-card 8: the commit of the main repository fails after the other one succeeded: nothing is undone, and the answer says which has the commit', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  assert.equal(verify(t.main, '--full').status, 0);
  assert.equal(verify(t.main, '--repo', 'demo').status, 0);
  // A hook of the main repository that refuses every commit.
  write(t.main, '.git/hooks/pre-commit', '#!/bin/sh\necho "refused by the hook" >&2\nexit 1\n');
  fs.chmodSync(path.join(t.main, '.git', 'hooks', 'pre-commit'), 0o755);
  const mainHead = git(t.main, 'rev-parse', 'HEAD');
  const r = commitCard(t.main, 'both');
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.match(r.reason, /git commit failed in the main repository/);
  assert.match(r.reason, new RegExp(`Already committed, and not undone: repository demo ${r.partial[0].commit}`));
  assert.equal(git(t.main, 'rev-parse', 'HEAD'), mainHead);
  assert.equal(git(t.demo, 'rev-parse', '--short=12', 'HEAD'), r.partial[0].commit, 'the branch of the other repository is not moved back');
});

test('repos-card 9: park puts the work of each repository on the parked branch there and resets each; unpark brings each back', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  write(t.demo, 'test/b.test.js', 'x\n');
  const p = json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two', '--reason', 'not green: red three times'));
  assert.equal(p.ok, true, JSON.stringify(p));
  assert.deepStrictEqual(p.repos.map((x) => [x.repo, x.files]), [['demo', 2]]);
  assert.equal(git(t.demo, 'status', '--porcelain'), '', 'the other repository is clean again');
  assert.deepStrictEqual(git(t.demo, 'show', '--name-only', '--format=', 'uw/parked/two/both').split('\n').sort(), ['src/both/b.js', 'test/b.test.js']);
  assert.equal(branchOf(t.demo), 'uw/run/two');
  const u = json(cli(t.main, 'unpark', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two'));
  assert.equal(u.ok, true, JSON.stringify(u));
  assert.deepStrictEqual(u.repos, ['demo']);
  assert.ok(u.testFiles.includes('demo:test/b.test.js'), JSON.stringify(u.testFiles));
  assert.equal(read(t.demo, 'src/both/b.js'), 'module.exports = 2;\n');
  assert.equal(read(t.main, 'src/both/a.js'), 'module.exports = 1;\n');
});

test('repos-card 10: the handoff of a card lists its files for each repository', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  verify(t.main, '--full');
  verify(t.main, '--repo', 'demo');
  const r = commitCard(t.main, 'both', '--claimed', 'demo:src/both/b.js,src/both/a.js');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.missingClaims, []);
  const h = read(t.main, r.handoff);
  assert.match(h, /- added src\/both\/a\.js/);
  assert.match(h, /- added demo:src\/both\/b\.js/);
});

// The run script: the prompt of a card with two repositories, and a test file named with a prefix.
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const stepsOf = (...lines) => ({ outputs: lines.map((l) => ({ command: '', output: JSON.stringify(l) })) });
const runCardOnce = async (cardPaths, reposArg, testFile) => {
  const prompts = {};
  const args = { plan: 'PLAN-two.md', feature: 'two', cli: 'node "/p/experts/experts.js"', base: 'abc1234', verify: 'node "/p/hooks/verify.js" --plan "PLAN-two.md"', command: 'node t.test.js', available: [], expertsDir: '/p/experts', protocol: 'rules', ...(reposArg ? { repos: reposArg } : {}), cards: [{ name: 'both', title: 'a card of the two', paths: cardPaths, depends: [], carried: [], experts: [], briefs: [], reviewSkills: {}, preflight: { ok: true, contextFile: 'ctx.md' } }] };
  const STOP = new Error('stop');
  await loadWorkflow(path.join(PLUGIN, 'phases', 'run.js'))(args, (call) => {
    prompts[call.label] = call.prompt;
    const role = call.label.split(':')[1];
    if (role === 'write-tests') return { filesWritten: [testFile], testsFailAsExpected: true, summary: 'red' };
    if (role === 'attempt-1') throw STOP;
    return stepsOf({ ok: true, files: 1 });
  }).catch((e) => { if (e !== STOP) throw e; });
  return prompts;
};

test('repos-card 4: the build prompt of a card with two repositories names the folder of each and its verify command; one repository has the prompt of today', async () => {
  const twoRepos = await runCardOnce(['src/both/**', 'demo:src/both/**'], [{ name: 'demo', dir: 'C:/work/demo' }], 'test/a.test.js');
  const p = twoRepos['both:write-tests'];
  assert.match(p, /MORE THAN ONE REPOSITORY/);
  assert.match(p, /`demo:` is the folder C:\/work\/demo/);
  assert.match(p, /run `node "\/p\/hooks\/verify\.js" --plan "PLAN-two\.md" --repo <its name>`/);
  assert.match(p, /green only when the tests of every repository it changed pass/);
  // The second real run: an agent tried `--repo main`. The main repository has no name; the prompt says so.
  assert.match(p, /for the files with no name, which are in this repository, run `node "\/p\/hooks\/verify\.js" --plan "PLAN-two\.md"` with no --repo/);
  const one = await runCardOnce(['src/both/**'], [{ name: 'demo', dir: 'C:/work/demo' }], 'test/a.test.js');
  assert.doesNotMatch(one['both:write-tests'], /MORE THAN ONE REPOSITORY/, 'a card with no path in another repository');
  const none = await runCardOnce(['src/both/**'], null, 'test/a.test.js');
  assert.equal(none['both:write-tests'], one['both:write-tests']);
});

test('repos-card 11: the record of the tests before a code round takes a test file of another repository from its folder', async () => {
  const p = await runCardOnce(['demo:src/both/**'], [{ name: 'demo', dir: 'C:/work/demo' }], 'demo:test/b.test.js');
  assert.match(p['both:tests-before'], /test-guard\.js" snapshot "[^"]+" "C:\/work\/demo\/test\/b\.test\.js"/);
});

// --- repos-end: the full suite, the review, the report and the resume for each repository -----------------------------

/** A run where the card `both` is committed in the two repositories. */
function committedBoth() {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  assert.equal(verify(t.main, '--full').status, 0);
  assert.equal(verify(t.main, '--repo', 'demo').status, 0);
  const c = commitCard(t.main, 'both');
  assert.equal(c.ok, true, JSON.stringify(c));
  return { ...t, commit: c };
}

test('repos-end 1: full-record --repo says whether the full run of that repository is of its commit', () => {
  const t = committedBoth();
  const before = json(cli(t.main, 'full-record', '--plan', 'PLAN-two.md', '--repo', 'demo'));
  assert.deepStrictEqual([before.current, before.passed, before.repo], [false, false, 'demo'], 'the record there is of the state before the commit');
  assert.equal(verify(t.main, '--repo', 'demo', '--full').status, 0);
  const after = json(cli(t.main, 'full-record', '--plan', 'PLAN-two.md', '--repo', 'demo'));
  assert.deepStrictEqual([after.current, after.passed], [true, true]);
  write(t.demo, 'fail-demo', '');
  commit(t.demo, 'a failing test');
  assert.notEqual(verify(t.main, '--repo', 'demo', '--full').status, 0);
  const red = json(cli(t.main, 'full-record', '--plan', 'PLAN-two.md', '--repo', 'demo'));
  assert.deepStrictEqual([red.current, red.passed], [true, false]);
  assert.equal(json(cli(t.main, 'full-record', '--plan', 'PLAN-two.md', '--repo', 'api')).current, false);
});

test('repos-end 3-4: the review takes a range in each repository, each diff under a line that names it, with its files named as the plan names them', () => {
  const t = committedBoth();
  const run = JSON.parse(read(t.main, '.ultimate-workflow/run/two/run.json'));
  const p = JSON.parse(cli(t.main, 'prepare', '--range', `${run.base}..HEAD`, '--feature', 'two').stdout);
  assert.match(p.repos.demo, new RegExp(`^${run.repos.demo.base}\\.\\.[0-9a-f]{12}$`));
  assert.ok(p.files.includes('src/both/a.js'), JSON.stringify(p.files));
  assert.ok(p.files.includes('demo:src/both/b.js'), JSON.stringify(p.files));
  const diff = read(t.main, p.diffFile);
  assert.match(diff, /^=== repository demo \(.*\): every file below is in that repository, and is named demo:<path> ===$/m);
  assert.match(diff, /^diff --git a\/demo:src\/both\/b\.js b\/demo:src\/both\/b\.js$/m);
  assert.match(diff, /^\+\+\+ b\/demo:src\/both\/b\.js$/m);
  assert.ok(diff.indexOf('src/both/a.js') < diff.indexOf('=== repository demo'), 'the main repository first');
  // With no --feature it is the review of one repository, as before.
  const one = JSON.parse(cli(t.main, 'prepare', '--range', `${run.base}..HEAD`).stdout);
  assert.equal(one.repos, undefined);
  assert.ok(!one.files.some((f) => f.startsWith('demo:')));
});

test('repos-end 5: run-state records the HEAD of each repository at the review, and says when one moved after it', () => {
  const t = committedBoth();
  const first = json(cli(t.main, 'run-state', '--feature', 'two'));
  assert.equal(first.reposMoved, true, 'nothing was reviewed yet');
  const rec = json(cli(t.main, 'run-state', '--feature', 'two', '--record', '--review', '--open', '0'));
  assert.equal(rec.reposMoved, false);
  assert.equal(rec.repoHeads.demo, git(t.demo, 'rev-parse', '--short=12', 'HEAD'));
  assert.equal(json(cli(t.main, 'run-state', '--feature', 'two')).reposMoved, false);
  write(t.demo, 'src/lib/later.js', 'module.exports = 3;\n');
  commit(t.demo, 'a later commit in the other repository only');
  const moved = json(cli(t.main, 'run-state', '--feature', 'two'));
  assert.equal(moved.reposMoved, true);
  assert.equal(moved.head, moved.reviewedHead, 'the main repository did not move');
  // The range of a later review starts, in the other repository, where the last review ended.
  const p = JSON.parse(cli(t.main, 'prepare', '--range', `${moved.reviewedHead}..HEAD`, '--feature', 'two').stdout);
  assert.match(p.repos.demo, new RegExp(`^${rec.repoHeads.demo}\\.\\.`));
  assert.deepStrictEqual(p.files, ['demo:src/lib/later.js']);
});

test('repos-end 8: resume-target says, for each repository of the run, whether its run branch is there and checked out', () => {
  const t = running();
  const r = json(cli(t.main, 'resume-target'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.repos.map((x) => [x.repo, x.hasBranch, x.checkedOut]), [['demo', true, true]]);
  git(t.demo, 'switch', '-q', 'main');
  assert.deepStrictEqual(json(cli(t.main, 'resume-target')).repos.map((x) => [x.hasBranch, x.checkedOut]), [[true, false]]);
});

// --- the experts check of the whole change (2026-11-19): one test for each of its findings ------------------------------

test('a URL in backticks is not a file of a repository named "https"; a path with a repository name still is', () => {
  const found = experts.planPaths('See `https://example.org/guide.md`, `http://x.io/a/b.txt`, `demo:docs/api.md` and `docs/main.md`.');
  assert.ok(found.includes('demo:docs/api.md'));
  assert.ok(found.includes('docs/main.md'));
  assert.ok(!found.some((p) => /^https?:/.test(p)), JSON.stringify(found));
});

test('repos-card 3: the related command of another repository (test_related_command@demo) runs in its folder, with the files changed there', () => {
  const t = two({ plan: PLAN().replace('test_command@demo: node t.test.js\n', 'test_command@demo: node t.test.js\ntest_related_command@demo: node t.test.js related {files}\n') });
  write(t.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  const v = spawnSync(process.execPath, [VERIFY, '--plan', 'PLAN-two.md', '--repo', 'demo'], { cwd: t.main, encoding: 'utf8', env: env() });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /verify: related because/);
  const rec = JSON.parse(read(t.demo, '.ultimate-workflow/verify-related.json'));
  assert.equal(rec.mode, 'related');
  assert.equal(rec.passed, true);
  assert.match(rec.command, /^node t\.test\.js related .*src\/lib\/a\.js/);
  assert.equal(fs.existsSync(path.join(t.main, '.ultimate-workflow', 'verify-related.json')), false);
});

test('repos-end 6: the report lists the commit of each repository for a card, and names a card that has a commit in one repository only', () => {
  const t = two();
  const result = { ok: true, feature: 'two', branch: 'uw/run/two', base: 'abc1234abcd', summary: '1 committed, 1 parked', counts: { committed: 1, parked: 1 }, review: { ran: false }, harvest: { ran: false },
    cards: [
      { card: 'both', title: 'a card of the two', status: 'committed', commit: 'aaa111', repos: [{ repo: 'demo', commit: 'ddd222' }] },
      { card: 'other', title: 'a card of the second repository', status: 'parked', branch: 'uw/parked/two/other', action: '/ultimate-workflow:feature --resume other', reason: 'the commit was refused: git commit failed in the main repository: refused by the hook. Already committed, and not undone: repository demo eee333.' },
    ] };
  write(t.main, 'result.json', JSON.stringify(result));
  const r = json(cli(t.main, 'run-report', '--result', 'result.json'));
  assert.equal(r.ok, true, JSON.stringify(r));
  const report = read(t.main, r.report);
  assert.match(report, /\| both \| a card of the two \| committed \| aaa111, demo ddd222 \|/);
  assert.match(report, /## Needs you\n\n- other \(parked\): .*Already committed, and not undone: repository demo eee333\./);
});

test('unpark checks every repository before it changes any: uncommitted changes in another one leave the main one as it was', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  assert.equal(json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two', '--reason', 'not green: red')).ok, true);
  write(t.demo, 'src/lib/in-the-way.js', 'x\n');
  const r = json(cli(t.main, 'unpark', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /repository demo has uncommitted changes.*Nothing was brought back in any repository/);
  assert.equal(fs.existsSync(path.join(t.main, 'src/both/a.js')), false, 'the main repository was not touched');
  // A second try, after the user cleaned up, works: the first one left nothing half done.
  fs.rmSync(path.join(t.demo, 'src/lib/in-the-way.js'));
  assert.equal(json(cli(t.main, 'unpark', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two')).ok, true);
});

test('unpark puts the main repository back when the work of another one does not apply', () => {
  const t = running();
  write(t.demo, 'src/keep.js', 'module.exports = 2; // the card\n');
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  assert.equal(json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two', '--reason', 'not green: red')).ok, true);
  // The run branch of the other repository moves on in the same lines.
  write(t.demo, 'src/keep.js', 'module.exports = 3; // another card\n');
  commit(t.demo, 'another card changed the same line');
  const r = json(cli(t.main, 'unpark', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two'));
  assert.equal(r.ok, false);
  assert.match(r.reason, /does not apply on the current tip of repository demo.*Nothing was brought back in any repository/);
  assert.equal(fs.existsSync(path.join(t.main, 'src/both/a.js')), false, 'the file the parked commit added in the main repository is gone again');
  assert.equal(git(t.main, 'status', '--porcelain', '--', 'src'), '');
  assert.equal(git(t.demo, 'status', '--porcelain'), '');
});

test('a resume of a card checks the run branch out in each other repository before it brings the parked work back', () => {
  const t = running();
  write(t.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  assert.equal(json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'other', '--feature', 'two', '--reason', 'not green: red')).ok, true);
  git(t.demo, 'switch', '-q', 'main');
  const r = json(cli(t.main, 'run-start', '--plan', 'PLAN-two.md', '--feature', 'two', '--resume-card', 'other', '--resume-reason', 'try again'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(branchOf(t.demo), 'uw/run/two');
  assert.equal(read(t.demo, 'src/lib/a.js'), 'module.exports = 1;\n', 'the work came back on the run branch');
  assert.equal(git(t.demo, 'rev-parse', 'main'), git(t.demo, 'merge-base', 'main', 'HEAD'), 'nothing was put on the branch of the user');
});

test('a change in another repository that needs no test (documentation only) is committed with no test record there', () => {
  const t = running();
  write(t.demo, 'src/lib/notes.md', '# Notes\n');
  const r = commitCard(t.main, 'other');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(git(t.demo, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/lib/notes.md']);
});

test('a command or a place of another repository that changed after the confirmation is named, as the test command of the main one is', () => {
  const t = two({ confirm: true });
  const plan = read(t.main, 'PLAN-two.md');
  assert.deepStrictEqual(experts.settingsChanged(plan), []);
  assert.deepStrictEqual(experts.settingsChanged(plan.replace('test_command@demo: node t.test.js', 'test_command@demo: echo ok')), ['test_command@demo']);
  assert.deepStrictEqual(experts.settingsChanged(plan.replace('repos: demo=../demo', 'repos: demo=../elsewhere')), ['repos']);
  assert.deepStrictEqual(experts.settingsChanged(plan.replace('test_command@demo: node t.test.js\n', '')), ['test_command@demo']);
});

test('a repository the header declares and no card uses is never touched: its uncommitted work stays when a card is parked', () => {
  const t = two({ confirm: true, plan: PLAN({ cardsText: '- main: a card of the main repository\n  paths: src/main/**' }) });
  assert.equal(start(t.main).ok, true);
  write(t.demo, 'src/mine.js', 'the work of the user, on the branch of the user\n');
  write(t.main, 'src/main/x.js', 'module.exports = 1;\n');
  const p = json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'main', '--feature', 'two', '--reason', 'not green: red'));
  assert.equal(p.ok, true, JSON.stringify(p));
  assert.equal(p.repos, undefined);
  assert.equal(read(t.demo, 'src/mine.js'), 'the work of the user, on the branch of the user\n');
  assert.equal(git(t.demo, 'branch', '--list', 'uw/parked/*'), '');
  const scope = json(cli(t.main, 'scope', '--plan', 'PLAN-two.md', '--card', 'main'));
  assert.ok(!scope.outOfScope.some((f) => f.startsWith('demo:')), JSON.stringify(scope.outOfScope));
});

test('the commits the run makes in another repository hold no absolute path of this machine', () => {
  const t = committedBoth();
  const msg = git(t.demo, 'log', '-1', '--format=%B');
  assert.match(msg, /^Main repository: \.\.\/main$/m);
  assert.ok(!msg.includes(t.root.split(path.sep).join('/')) && !msg.includes(t.root), msg);
  write(t.demo, 'src/lib/a.js', 'x\n');
  json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'other', '--feature', 'two', '--reason', 'not green: red'));
  const parked = git(t.demo, 'log', '-1', '--format=%B', 'uw/parked/two/other');
  assert.match(parked, /^Plan: \.\.\/main\/PLAN-two\.md$/m);
});

test('the accepted known failures of another repository have their own line and section in the plan, apart from the main one', () => {
  const t = two();
  write(t.demo, 'fail-demo', '');
  commit(t.demo, 'a failing test');
  write(t.main, 'fail-main', '');
  commit(t.main, 'a failing test');
  const v = (...a) => spawnSync(process.execPath, [VERIFY, '--plan', 'PLAN-two.md', ...a], { cwd: t.main, encoding: 'utf8', env: env() });
  v('--baseline');
  assert.equal(v('--accept-baseline').status, 0);
  v('--baseline', '--repo', 'demo');
  const acc = v('--accept-baseline', '--repo', 'demo');
  assert.equal(acc.status, 0, acc.stdout + acc.stderr);
  const plan = read(t.main, 'PLAN-two.md');
  assert.match(plan, /^known_failures: 1$/m);
  assert.match(plan, /^known_failures@demo: 1$/m);
  assert.match(plan, /^## Known failures\n\n[^\n]*\n\n- main::broken$/m);
  assert.match(plan, /^## Known failures in demo\n\n[^\n]*in the repository demo[^\n]*\n\n- demo::broken$/m);
});

// --- the second experts check of the whole change (2026-11-20): one test for each of its findings -----------------------

test('a new migration in another repository under a card path that names the migrations folder there is minor', () => {
  const t = two({ confirm: true, plan: PLAN({ cardsText: '- mig: a migration of the second repository\n  paths: demo:migrations/versions/**' }).replace(/### other:[\s\S]*$/, '').replace('### main: a card of the main repository', '### mig: a migration of the second repository') });
  assert.equal(start(t.main).ok, true);
  write(t.demo, 'migrations/versions/0002_new.py', 'NEW = 1\n');
  const d = json(cli(t.main, 'decisions', '--plan', 'PLAN-two.md', '--card', 'mig', '--feature', 'two'));
  assert.deepStrictEqual(d.major.filter((x) => x.kind === 'schema'), [], JSON.stringify(d.major));
  assert.ok(d.minor.some((x) => x.kind === 'schema' && /demo:migrations\/versions\/0002_new\.py \(the paths of the card name this place\)/.test(x.what)), JSON.stringify(d.minor));
});

test('the accepted known failures of another repository do not make the plan read as changed after the confirmation', () => {
  const t = two({ confirm: true });
  write(t.demo, 'fail-demo', '');
  commit(t.demo, 'a failing test');
  const first = start(t.main);
  assert.equal(first.needs, 'baseline', JSON.stringify(first));
  const acc = spawnSync(process.execPath, [VERIFY, '--plan', 'PLAN-two.md', '--accept-baseline', '--repo', 'demo'], { cwd: t.main, encoding: 'utf8', env: env() });
  assert.equal(acc.status, 0, acc.stdout + acc.stderr);
  assert.match(read(t.main, 'PLAN-two.md'), /^## Known failures in demo$/m);
  const again = start(t.main);
  assert.equal(again.ok, true, JSON.stringify(again));
  assert.equal(again.repos[0].baseline.kept, true);
});

test('repos-start 3-4: a refusal makes no branch in the second repository either', () => {
  const t = two({ confirm: true, plan: PLAN().replace('test_command@demo: node t.test.js\n', '') });
  write(t.main, 'src/dirty-is-fine-here.js', 'x\n');
  const r = start(t.main);
  assert.equal(r.ok, false);
  assert.equal(branches(t.demo), '');
  assert.equal(branchOf(t.demo), 'main');
  assert.equal(branches(t.main), '');
});

test("the run's own folder in another repository is not uncommitted work: a run starts there though the folder is not ignored yet", () => {
  const t = two({ confirm: true });
  fs.writeFileSync(path.join(t.demo, '.gitignore'), 'node_modules/\n');
  commit(t.demo, 'no ignore line');
  write(t.demo, '.ultimate-workflow/baseline.json', '{}');
  const r = start(t.main);
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('card-commit checks the run branch of every other repository before it commits in any', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  assert.equal(verify(t.main, '--full').status, 0);
  assert.equal(verify(t.main, '--repo', 'demo').status, 0);
  git(t.demo, 'switch', '-q', '-c', 'somewhere-else');
  const head = git(t.main, 'rev-parse', 'HEAD');
  const r = commitCard(t.main, 'both');
  assert.equal(r.ok, false);
  assert.match(r.reason, /repository demo is not on uw\/run\/two.*Nothing was committed in any repository/);
  assert.equal(git(t.main, 'rev-parse', 'HEAD'), head);
  assert.equal(r.partial, undefined);
});

test('a parked branch an earlier park left in another repository is removed when the new park has no work there, so unpark brings back only this park', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/old.js', 'the first try\n');
  const park = () => json(cli(t.main, 'park', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two', '--reason', 'not green: red'));
  assert.equal(park().ok, true);
  assert.notEqual(git(t.demo, 'branch', '--list', 'uw/parked/two/both'), '');
  // The card runs again from its tests (no parked work is brought back) and this time changes the main repository only.
  write(t.main, 'src/both/a.js', 'module.exports = 2;\n');
  const second = park();
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(second.repos, undefined);
  assert.equal(git(t.demo, 'branch', '--list', 'uw/parked/two/both'), '', 'the branch of the first park is gone there');
  const u = json(cli(t.main, 'unpark', '--plan', 'PLAN-two.md', '--card', 'both', '--feature', 'two'));
  assert.equal(u.ok, true, JSON.stringify(u));
  assert.equal(fs.existsSync(path.join(t.demo, 'src/both/old.js')), false, 'the work of the first try did not come back');
  assert.equal(read(t.main, 'src/both/a.js'), 'module.exports = 2;\n');
});

test('a repository or a command of one added after the confirmation of a plan that had none is named', () => {
  const oneRepo = PLAN({ header: 'pack_budget: 15000', cardsText: '- main: a card of the main repository\n  paths: src/main/**' }).replace('test_command@demo: node t.test.js\n', '').replace(' and `demo:docs/api.md`', '');
  const t = two({ confirm: true, plan: oneRepo });
  const plan = read(t.main, 'PLAN-two.md');
  assert.deepStrictEqual(experts.settingsChanged(plan), []);
  assert.deepStrictEqual(experts.settingsChanged(plan.replace('pack_budget: 15000', 'pack_budget: 15000\nrepos: demo=../demo\ntest_command@demo: rm -rf x')).sort(), ['repos', 'test_command@demo']);
});

test('a token in backticks with a colon that names no repository of the plan is a warning of the pack, not a missing input', () => {
  const t = two({ plan: PLAN().replace('See `docs/main.md`', 'See `HEAD:AGENTS.md`, `localhost:3000/notes.txt`, `docs/main.md`') });
  const p = json(cli(t.main, 'pack', '--plan', 'PLAN-two.md', '--card', 'main', '--feature', 'two'));
  assert.equal(p.ok, true, JSON.stringify(p));
});

// --- the third experts check of the whole change (2026-11-20): one test for each of its findings ------------------------

test('card-commit: a record of another repository that failed, or that is of other changes, does not let the card through', () => {
  // (a) the record there is of exactly these changes, and it failed
  const red = running();
  write(red.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  write(red.demo, 'fail-demo', '');
  assert.notEqual(verify(red.main, '--repo', 'demo').status, 0);
  const a = commitCard(red.main, 'other');
  assert.equal(a.ok, false);
  assert.deepStrictEqual([a.gate, a.repo], ['G7', 'demo']);
  // (b) the record there passed, and the files changed after it
  const stale = running();
  write(stale.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  assert.equal(verify(stale.main, '--repo', 'demo').status, 0);
  write(stale.demo, 'src/lib/a.js', 'module.exports = 2; // changed after the tests ran\n');
  const b = commitCard(stale.main, 'other');
  assert.equal(b.ok, false);
  assert.deepStrictEqual([b.gate, b.repo], ['G7', 'demo']);
  assert.equal(git(stale.demo, 'status', '--porcelain').length > 0, true, 'nothing was committed there');
  // (c) the same changes, tested again: it goes through
  assert.equal(verify(stale.main, '--repo', 'demo').status, 0);
  assert.equal(commitCard(stale.main, 'other').ok, true);
});

test('a card that made no commit in the main repository does not get the earlier commit there as its own', () => {
  // A project whose plan git ignores (as this repository does): a card of the second repository stages nothing here.
  const t = two({ confirm: true });
  fs.appendFileSync(path.join(t.main, '.gitignore'), 'PLAN-*.md\n');
  git(t.main, 'rm', '-q', '--cached', 'PLAN-two.md');
  commit(t.main, 'the plan is not in git');
  assert.equal(start(t.main).ok, true);
  const before = git(t.main, 'rev-parse', 'HEAD');
  write(t.demo, 'src/lib/a.js', 'module.exports = 1;\n');
  assert.equal(verify(t.main, '--repo', 'demo').status, 0);
  const r = commitCard(t.main, 'other');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.commit, '', 'no commit in the main repository');
  assert.equal(git(t.main, 'rev-parse', 'HEAD'), before);
  const line = cards.findCard(read(t.main, 'PLAN-two.md'), 'other');
  assert.equal(line.committed, `demo=${r.repos[0].commit}`);
  assert.equal(line.status, 'committed');
});

test('the repositories run-start hands to the run script have the shape the script reads: a name and a folder that exists', () => {
  const t = two({ confirm: true });
  assert.equal(start(t.main).ok, true);
  const script = read(t.main, '.ultimate-workflow/run/run.js');
  const embedded = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(script)[1]);
  assert.equal(embedded.repos.length, 1);
  assert.deepStrictEqual(Object.keys(embedded.repos[0]).sort(), ['dir', 'name']);
  assert.equal(embedded.repos[0].name, 'demo');
  assert.equal(typeof embedded.repos[0].dir, 'string');
  assert.equal(fs.realpathSync(embedded.repos[0].dir), fs.realpathSync(t.demo));
  // The script's own filter keeps it (phases/run.js: a string name and a string dir).
  assert.match(script, /REPOS = Array\.isArray\(args && args\.repos\) \? args\.repos\.filter\(\(x\) => x && typeof x\.name === 'string' && typeof x\.dir === 'string'\)/);
});

test('a path of the main repository never covers a file of another one, whatever its glob', () => {
  const covers = (paths, file) => cards.covers(paths, file, experts.globToRegExp);
  for (const glob of ['**/*.js', '*', '**', '*:src/a.js', '**/a.js']) assert.equal(covers([glob], 'demo:src/a.js'), false, glob);
  assert.equal(covers(['demo:**/*.js'], 'demo:src/a.js'), true);
  assert.equal(covers(['api:**/*.js'], 'demo:src/a.js'), false, 'a path of a third repository');
  assert.equal(covers(['**/*.js'], 'src/a.js'), true, 'the main repository is as before');
  assert.equal(covers(['demo:src/**'], 'src/a.js'), false);
});

test('the check of the fix-up cards starts, in another repository, at the commit the caller names for it', () => {
  const t = committedBoth();
  const run = JSON.parse(read(t.main, '.ultimate-workflow/run/two/run.json'));
  const mid = git(t.demo, 'rev-parse', '--short=12', 'HEAD');
  const mainMid = git(t.main, 'rev-parse', 'HEAD');
  write(t.demo, 'src/lib/fixup.js', 'module.exports = 9;\n');
  commit(t.demo, 'a fix-up card');
  write(t.main, 'src/main/fixup.js', 'module.exports = 9;\n');
  commit(t.main, 'a fix-up card');
  // No review was recorded yet (it is recorded at the end of the run): without the caller's commit the whole of demo is read.
  const whole = JSON.parse(cli(t.main, 'prepare', '--range', `${mainMid}..HEAD`, '--feature', 'two').stdout);
  assert.match(whole.repos.demo, new RegExp(`^${run.repos.demo.base}\\.\\.`));
  const part = JSON.parse(cli(t.main, 'prepare', '--range', `${mainMid}..HEAD`, '--feature', 'two', '--from-heads', `demo=${mid}`).stdout);
  assert.match(part.repos.demo, new RegExp(`^${mid}\\.\\.`));
  // The plan is in the range too: its card line got the commit of the card after that commit was made.
  assert.deepStrictEqual(part.files.filter((x) => x !== 'PLAN-two.md').sort(), ['demo:src/lib/fixup.js', 'src/main/fixup.js']);
});

test('run-finish with a result that names no feature removes the mark in each repository of the run this folder was on', () => {
  const t = two({ confirm: true });
  assert.equal(start(t.main).ok, true);
  write(t.main, 'out/wf_broken-1.output', JSON.stringify({ result: { ok: false, error: 'the run failed before it had a feature' } }));
  json(cli(t.main, 'run-finish', '--output', 'out/wf_broken-1.output'));
  assert.equal(fs.existsSync(path.join(t.main, '.ultimate-workflow/run/active.json')), false);
  assert.equal(fs.existsSync(path.join(t.demo, '.ultimate-workflow/run/active.json')), false);
});

// --- the first real run with two repositories (2026-11-20): what its records showed ------------------------------------

test('a claimed file of another repository, given as a path from the main one or as an absolute path, is not reported as missing', () => {
  const t = running();
  write(t.main, 'src/both/a.js', 'module.exports = 1;\n');
  write(t.demo, 'src/both/b.js', 'module.exports = 2;\n');
  verify(t.main, '--full');
  verify(t.main, '--repo', 'demo');
  const fromMain = path.relative(t.main, path.join(t.demo, 'src/both/b.js')).split(path.sep).join('/');
  assert.match(fromMain, /^\.\.\//);
  const r = commitCard(t.main, 'both', '--claimed', `${fromMain},${path.join(t.demo, 'src/both/b.js')},src/both/a.js,${fromMain.replace('b.js', 'never-made.js')}`);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(r.missingClaims, ['demo:src/both/never-made.js'], 'a file that is truly not there is still named, as the plan names it');
});

test('the report says that the run branch is in each other repository too, so each is merged', () => {
  const t = two();
  const result = { ok: true, feature: 'two', branch: 'uw/run/two', base: 'abc1234abcd', summary: '2 committed', counts: { committed: 2 }, review: { ran: false }, harvest: { ran: false },
    cards: [
      { card: 'both', title: 'a card of the two', status: 'committed', commit: 'aaa111', repos: [{ repo: 'demo', commit: 'ddd222' }] },
      { card: 'other', title: 'a card of the second repository', status: 'committed', commit: 'bbb111', repos: [{ repo: 'demo', commit: 'eee333' }] },
    ] };
  write(t.main, 'result.json', JSON.stringify(result));
  const report = read(t.main, json(cli(t.main, 'run-report', '--result', 'result.json')).report);
  assert.match(report, /The run also committed on `uw\/run\/two` in the repository demo: merge that branch there too\./);
  // One repository: the report is as before.
  write(t.main, 'one.json', JSON.stringify({ ...result, cards: [{ card: 'main', title: 'a card', status: 'committed', commit: 'aaa111' }] }));
  assert.doesNotMatch(read(t.main, json(cli(t.main, 'run-report', '--result', 'one.json')).report), /The run also committed/);
});
