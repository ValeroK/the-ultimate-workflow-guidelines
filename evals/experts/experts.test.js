'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const CLI = path.join(PLUGIN, 'experts', 'experts.js');
const ex = require(CLI);
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));

// ---- helpers -------------------------------------------------------------

const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), `uw-${prefix}-`));
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

/** A repository with one commit, a plan file and a source file. */
function repo() {
  const dir = tmp('repo');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 1;\n');
  write(path.join(dir, 'README.md'), '# x\n');
  write(path.join(dir, 'PLAN-x.md'), '---\nplan_confirmed: true\ntests_confirmed: true\n---\nbody\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return dir;
}

/** A plugin root holding only agents/, so discovery can be exercised in isolation. */
function pluginWith(files) {
  const root = tmp('plugin');
  for (const [name, text] of Object.entries(files)) write(path.join(root, 'agents', name), text);
  return root;
}

const agentText = (name, extra = {}) => {
  const fm = { name: `uw-expert-${name}`, description: `${name} expert. Applies when the work touches ${name}.`, stages: '[plan, review]', tools: 'Read, Grep, Glob', ...extra };
  const lines = Object.entries(fm).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n\n# ${name}\n`;
};

const cli = (cwd, args, input) => spawnSync(process.execPath, [CLI, ...args], { cwd, input, encoding: 'utf8' });

// ---- discovery -----------------------------------------------------------

test('the plugin discovers the security expert from its agent file, with name, agent, description and stages', () => {
  const { experts, problems } = ex.list(PLUGIN);
  assert.deepStrictEqual(problems, []);
  const sec = experts.find((e) => e.name === 'security');
  assert.strictEqual(sec.agent, 'uw-expert-security');
  assert.deepStrictEqual(sec.stages, ['plan', 'tests', 'review']);
  assert.match(sec.description, /^Security expert\. Applies when/);
});

test('dropping an agent file into the folder is the whole of adding an expert', () => {
  const root = pluginWith({ 'uw-expert-security.md': agentText('security') });
  assert.deepStrictEqual(ex.list(root).experts.map((e) => e.name), ['security']);
  write(path.join(root, 'agents', 'uw-expert-devops.md'), agentText('devops'));
  const after = ex.list(root).experts;
  assert.deepStrictEqual(after.map((e) => e.name), ['devops', 'security'], 'sorted, no other file edited');
  assert.strictEqual(after[0].agent, 'uw-expert-devops');
});

test('files that are not experts are not experts', () => {
  const root = pluginWith({
    'uw-reviewer.md': agentText('reviewer', { name: 'uw-reviewer' }),
    'uw-expert-.md': agentText('x'),
    'uw-expert-Bad.md': agentText('Bad'),
    'notes.txt': 'x',
    'uw-expert-ok.md': agentText('ok'),
  });
  assert.deepStrictEqual(ex.list(root).experts.map((e) => e.name), ['ok']);
});

test('a malformed expert is reported and left out, never guessed at', () => {
  const root = pluginWith({
    'uw-expert-a.md': agentText('a', { name: 'uw-expert-wrong' }),
    'uw-expert-b.md': agentText('b', { description: '' }),
    'uw-expert-c.md': agentText('c', { stages: '[plan, ship]' }),
    'uw-expert-d.md': agentText('d', { stages: '[]' }),
    'uw-expert-e.md': 'no frontmatter at all',
    'uw-expert-good.md': agentText('good'),
  });
  const { experts, problems } = ex.list(root);
  assert.deepStrictEqual(experts.map((e) => e.name), ['good']);
  assert.strictEqual(problems.length, 5, problems.join(' | '));
  assert.ok(problems.some((p) => /uw-expert-a\.md/.test(p) && /expected "uw-expert-a"/.test(p)));
  assert.ok(problems.some((p) => /uw-expert-b\.md/.test(p) && /description/.test(p)));
  assert.ok(problems.some((p) => /uw-expert-c\.md/.test(p) && /stages/.test(p)));
});

test('stages default to review when none is declared, which keeps a plain reviewer expert valid', () => {
  const root = pluginWith({ 'uw-expert-old.md': agentText('old', { stages: undefined }) });
  assert.deepStrictEqual(ex.list(root).experts[0].stages, ['review']);
});

test('an unreadable plugin root is a problem, not a crash', () => {
  const r = ex.list(path.join(tmp('none'), 'missing'));
  assert.deepStrictEqual(r.experts, []);
  assert.strictEqual(r.problems.length, 1);
});

test('expertsFor keeps selection order and only the experts that take part at the stage', () => {
  const a = [
    { name: 'x', stages: ['plan', 'review'] },
    { name: 'y', stages: ['review'] },
    { name: 'z', stages: ['plan'] },
  ];
  assert.deepStrictEqual(ex.expertsFor(a, ['z', 'y', 'x'], 'plan').map((e) => e.name), ['z', 'x']);
  assert.deepStrictEqual(ex.expertsFor(a, ['z', 'y', 'x'], 'review').map((e) => e.name), ['y', 'x']);
  assert.deepStrictEqual(ex.expertsFor(a, ['ghost'], 'plan'), []);
});

// ---- add-only ------------------------------------------------------------

test('mergeAdd adds, keeps everything that was there, and returns unknown names instead of applying them', () => {
  const r = ex.mergeAdd(['a'], ['b', 'ghost', 'a'], ['a', 'b', 'c']);
  assert.deepStrictEqual(r.experts, ['a', 'b']);
  assert.deepStrictEqual(r.added, ['b']);
  assert.deepStrictEqual(r.rejected, ['ghost']);
});

test('no input to mergeAdd removes an expert (a property over many inputs)', () => {
  const names = ['a', 'b', 'c', 'd'];
  let seed = 7;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const pick = () => names.filter(() => rnd() < 0.5);
  for (let i = 0; i < 200; i++) {
    const current = pick();
    const additions = [...pick(), 'ghost'];
    const r = ex.mergeAdd(current, additions, names);
    for (const n of current) assert.ok(r.experts.includes(n), `lost ${n} from ${JSON.stringify(current)} with ${JSON.stringify(additions)}`);
    assert.ok(!r.experts.includes('ghost'));
  }
});

// ---- the plan's experts: line ----------------------------------------------

test('readExperts reads an inline list, an empty list, and an absent line', () => {
  assert.deepStrictEqual(ex.readExperts('---\nexperts: [security, devops]\n---\n'), { present: true, experts: ['security', 'devops'] });
  assert.deepStrictEqual(ex.readExperts("---\nexperts: ['security', \"devops\"]\n---\n").experts, ['security', 'devops']);
  assert.deepStrictEqual(ex.readExperts('---\nexperts: []\n---\n'), { present: true, experts: [] });
  assert.deepStrictEqual(ex.readExperts('---\nplan_confirmed: true\n---\n'), { present: false, experts: [] });
  assert.deepStrictEqual(ex.readExperts('no frontmatter'), { present: false, experts: [] });
  assert.match(ex.readExperts('---\nexperts:\n---\n').error, /inline list/);
});

test('an experts: line in the body is not the frontmatter', () => {
  assert.strictEqual(ex.readExperts('---\nplan_confirmed: true\n---\nexperts: [security]\n').present, false);
});

test('setExperts inserts at the end of the frontmatter or replaces in place, keeping BOM and line endings', () => {
  assert.strictEqual(ex.setExperts('---\na: 1\n---\nbody\n', ['x']), '---\na: 1\nexperts: [x]\n---\nbody\n');
  assert.strictEqual(ex.setExperts('---\na: 1\nexperts: [x]\nb: 2\n---\nbody\n', ['x', 'y']), '---\na: 1\nexperts: [x, y]\nb: 2\n---\nbody\n');
  assert.strictEqual(ex.setExperts('---\r\na: 1\r\n---\r\nbody\r\n', []), '---\r\na: 1\r\nexperts: []\r\n---\r\nbody\r\n');
  assert.ok(ex.setExperts('﻿---\na: 1\n---\n', ['x']).startsWith('﻿---'));
  assert.throws(() => ex.setExperts('no frontmatter', ['x']), /frontmatter/);
});

test('selectIntoPlan adds to the plan and never removes what a person wrote', () => {
  const dir = tmp('plan');
  const file = path.join(dir, 'PLAN-x.md');
  write(file, '---\nplan_confirmed: false\nexperts: [devops]\n---\nbody\n');
  const r = ex.selectIntoPlan(file, ['security'], ['devops', 'security']);
  assert.deepStrictEqual(r.experts, ['devops', 'security']);
  assert.deepStrictEqual(r.added, ['security']);
  assert.match(fs.readFileSync(file, 'utf8'), /experts: \[devops, security\]/);

  const again = ex.selectIntoPlan(file, [], ['devops', 'security']);
  assert.deepStrictEqual(again.experts, ['devops', 'security'], 'adding nothing removes nothing');
  assert.strictEqual(again.wrote, false);
});

test('selectIntoPlan with an empty list records "none apply" as a decision', () => {
  const dir = tmp('plan');
  const file = path.join(dir, 'PLAN-x.md');
  write(file, '---\nplan_confirmed: false\n---\nbody\n');
  ex.selectIntoPlan(file, [], ['security']);
  assert.deepStrictEqual(ex.readExperts(fs.readFileSync(file, 'utf8')), { present: true, experts: [] });
});

test('selectIntoPlan with an unknown expert throws and leaves the file untouched', () => {
  const dir = tmp('plan');
  const file = path.join(dir, 'PLAN-x.md');
  const text = '---\nplan_confirmed: false\n---\nbody\n';
  write(file, text);
  assert.throws(() => ex.selectIntoPlan(file, ['security', 'ghost'], ['security']), /ghost/);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), text);
});

// ---- the working tree --------------------------------------------------------

test('the fingerprint is stable, and changes when a tracked file, a new file or a deletion changes the tree', () => {
  const dir = repo();
  const clean = ex.fingerprint(dir);
  assert.strictEqual(ex.fingerprint(dir), clean, 'stable');
  assert.deepStrictEqual(ex.workingChanges(dir).files, []);

  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  const edited = ex.fingerprint(dir);
  assert.notStrictEqual(edited, clean);

  write(path.join(dir, 'src', 'new.js'), 'x\n');
  const withNew = ex.fingerprint(dir);
  assert.notStrictEqual(withNew, edited, 'an untracked file counts');
  assert.deepStrictEqual(ex.workingChanges(dir).files.sort(), ['src/a.js', 'src/new.js']);

  write(path.join(dir, 'src', 'new.js'), 'y\n');
  assert.notStrictEqual(ex.fingerprint(dir), withNew, 'an edit to an untracked file counts');

  fs.rmSync(path.join(dir, 'README.md'));
  assert.ok(ex.workingChanges(dir).files.includes('README.md'), 'a deletion counts');
});

test('evidence and the plan file are outside the fingerprint, or recording evidence would make it stale', () => {
  const dir = repo();
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  const before = ex.fingerprint(dir);
  write(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'security.json'), '{}');
  write(path.join(dir, '.ultimate-workflow', 'review.diff'), 'x');
  fs.appendFileSync(path.join(dir, 'PLAN-x.md'), 'more\n');
  write(path.join(dir, 'PLAN-y.md'), 'a new plan\n');
  assert.strictEqual(ex.fingerprint(dir), before);
  assert.deepStrictEqual(ex.workingChanges(dir).files, ['src/a.js']);
});

test('a repository with no commit yet still fingerprints', () => {
  const dir = tmp('fresh');
  git(dir, 'init', '-q', '-b', 'main');
  write(path.join(dir, 'a.js'), 'x\n');
  const f1 = ex.fingerprint(dir);
  write(path.join(dir, 'a.js'), 'y\n');
  assert.notStrictEqual(ex.fingerprint(dir), f1);
});

test('prepare saves the diff the experts will read, records what it fingerprinted, and lists the experts', () => {
  const dir = repo();
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  const p = ex.prepare(dir, 'working', PLUGIN);
  assert.strictEqual(p.diffFile, path.join('.ultimate-workflow', 'review.diff'));
  assert.match(fs.readFileSync(path.join(dir, p.diffFile), 'utf8'), /\+module\.exports = 2;/);
  assert.strictEqual(p.hash, ex.fingerprint(dir));
  assert.deepStrictEqual(p.files, ['src/a.js']);
  assert.ok(p.available.some((e) => e.name === 'security'));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'prepared.json'), 'utf8')).hash, p.hash);
});

test('prepare with a git range saves that range, while the fingerprint stays the working tree', () => {
  const dir = repo();
  git(dir, 'checkout', '-q', '-b', 'feature');
  write(path.join(dir, 'src', 'b.js'), 'b\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'feature');
  const p = ex.prepare(dir, 'main..HEAD', PLUGIN);
  assert.match(fs.readFileSync(path.join(dir, p.diffFile), 'utf8'), /b\.js/);
  assert.deepStrictEqual(p.files, [], 'nothing uncommitted');
});

// ---- recording evidence --------------------------------------------------------

const reviewResult = (over = {}) => ({
  ok: true,
  expertLane: { stage: 'review', available: ['security'], planned: [], selected: ['security'], added: ['security'], ran: ['security'], failed: [], recheck: true, ...over },
});

test('record refuses a result that is not ok, has no lane for the stage, or was skipped', () => {
  const dir = repo();
  ex.prepare(dir, 'working', PLUGIN);
  const opts = { pluginRoot: PLUGIN };
  assert.throws(() => ex.record(dir, 'review', { ok: false, error: 'x' }, opts), /not ok/);
  assert.throws(() => ex.record(dir, 'review', { ok: true }, opts), /no expertLane/);
  assert.throws(() => ex.record(dir, 'plan', reviewResult(), opts), /no expertLane for stage "plan"/);
  assert.throws(() => ex.record(dir, 'review', reviewResult({ skipped: 'noExperts was passed' }), opts), /skipped/);
  assert.throws(() => ex.record(dir, 'ship', reviewResult(), opts), /unknown stage/);
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow', 'experts', 'review')), 'a refused result leaves nothing behind');
});

test('record refuses an expert that is not installed', () => {
  const dir = repo();
  ex.prepare(dir, 'working', PLUGIN);
  assert.throws(() => ex.record(dir, 'review', reviewResult({ ran: ['ghost'], selected: ['ghost'] }), { pluginRoot: PLUGIN }), /ghost/);
});

test('a review record needs the prepared fingerprint, so it says what was reviewed', () => {
  const dir = repo();
  assert.throws(() => ex.record(dir, 'review', reviewResult(), { pluginRoot: PLUGIN }), /prepare/);
});

test('record writes one file per expert that ran and the recheck, against the prepared fingerprint', () => {
  const dir = repo();
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  const p = ex.prepare(dir, 'working', PLUGIN);
  const out = ex.record(dir, 'review', reviewResult({ failed: ['devops'] }), { pluginRoot: PLUGIN });
  assert.deepStrictEqual(out.recorded, ['security']);
  const rec = JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'security.json'), 'utf8'));
  assert.strictEqual(rec.hash, p.hash);
  const re = JSON.parse(fs.readFileSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', '_recheck.json'), 'utf8'));
  assert.deepStrictEqual(re.final, ['security']);
  assert.strictEqual(re.hash, p.hash);
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'devops.json')), 'a failed expert has no record');
});

test('a review without a successful recheck leaves no recheck record', () => {
  const dir = repo();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult({ recheck: false, recheckFailed: true }), { pluginRoot: PLUGIN });
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', '_recheck.json')));
});

test('record adds the lane\'s selected experts to the plan, add-only, and an empty selection still writes the decision', () => {
  const dir = repo();
  const plan = path.join(dir, 'PLAN-x.md');
  const withDevops = { pluginRoot: PLUGIN };
  // A plan may name an expert that is not installed here. Recording never removes it; the review
  // is what stops, naming it (see review-fanout.test.js).
  fs.writeFileSync(plan, '---\nplan_confirmed: true\nexperts: [devops]\n---\nbody\n');
  ex.record(dir, 'plan', { ok: true, expertLane: { stage: 'plan', selected: ['security'], ran: ['security'], failed: [] } }, { ...withDevops, planFile: plan });
  assert.deepStrictEqual(ex.readExperts(fs.readFileSync(plan, 'utf8')).experts, ['devops', 'security'], 'the person\'s entry is kept');

  fs.writeFileSync(plan, '---\nplan_confirmed: true\n---\nbody\n');
  ex.record(dir, 'plan', { ok: true, expertLane: { stage: 'plan', selected: ['security'], ran: ['security'], failed: [] } }, { ...withDevops, planFile: plan });
  assert.deepStrictEqual(ex.readExperts(fs.readFileSync(plan, 'utf8')).experts, ['security']);
  ex.record(dir, 'plan', { ok: true, expertLane: { stage: 'plan', selected: [], ran: [], failed: [] } }, { ...withDevops, planFile: plan });
  assert.deepStrictEqual(ex.readExperts(fs.readFileSync(plan, 'utf8')).experts, ['security'], 'a later empty selection does not remove it');

  const dir2 = repo();
  const plan2 = path.join(dir2, 'PLAN-x.md');
  fs.writeFileSync(plan2, '---\nplan_confirmed: true\n---\nbody\n');
  ex.record(dir2, 'plan', { ok: true, expertLane: { stage: 'plan', selected: [], ran: [], failed: [] } }, { ...withDevops, planFile: plan2 });
  assert.deepStrictEqual(ex.readExperts(fs.readFileSync(plan2, 'utf8')), { present: true, experts: [] });
});

// ---- the commit gate's view of the evidence -----------------------------------

function ready() {
  const dir = repo();
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '---\nplan_confirmed: true\ntests_confirmed: true\nexperts: [security]\n---\nbody\n');
  return { dir, plan };
}
const verdict = (dir, plan) => gates.commitGate(ex.commitEvidence(dir, plan, PLUGIN));

test('the commit is blocked until the experts were re-checked, and the message names the command to run', () => {
  const { dir, plan } = ready();
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /Gate G6/);
  assert.match(v.reason, /\/ultimate-workflow:experts/);
});

test('a recheck without a review by every selected expert is still blocked, naming the expert', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult({ ran: [], failed: ['security'] }), { pluginRoot: PLUGIN });
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /security/);
});

test('re-checked and reviewed by every selected expert: the commit is allowed', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult(), { pluginRoot: PLUGIN, planFile: plan });
  assert.deepStrictEqual(verdict(dir, plan), { allow: true });
});

test('any change after the review makes the evidence stale and the gate fires again', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult(), { pluginRoot: PLUGIN, planFile: plan });
  assert.strictEqual(verdict(dir, plan).allow, true);
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 3;\n');
  assert.strictEqual(verdict(dir, plan).allow, false);
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 2;\n');
  assert.strictEqual(verdict(dir, plan).allow, true, 'putting it back makes the old evidence true again');
});

test('a re-check whose final set drops an expert the plan named is blocked, even with a matching fingerprint', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult({ selected: [], ran: [], added: [] }), { pluginRoot: PLUGIN });
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /dropped security/);
});

test('with no expert selected anywhere, a recorded recheck is still required: "none" must be a decision', () => {
  const { dir } = ready();
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '---\nplan_confirmed: true\nexperts: []\n---\nbody\n');
  assert.strictEqual(verdict(dir, plan).allow, false);
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult({ selected: [], ran: [], added: [] }), { pluginRoot: PLUGIN });
  assert.strictEqual(verdict(dir, plan).allow, true);
});

test('a commit with nothing to review is allowed: no changes, documentation only, no experts installed', () => {
  const clean = repo();
  assert.strictEqual(verdict(clean, path.join(clean, 'PLAN-x.md')).allow, true);

  const docs = repo();
  write(path.join(docs, 'README.md'), '# changed\n');
  write(path.join(docs, 'docs', 'new.md'), 'new\n');
  assert.strictEqual(verdict(docs, path.join(docs, 'PLAN-x.md')).allow, true);

  const { dir, plan } = ready();
  const empty = tmp('empty');
  assert.strictEqual(gates.commitGate(ex.commitEvidence(dir, plan, empty)).allow, true);
});

test('a directory that is not a repository fails open', () => {
  const dir = tmp('norepo');
  assert.strictEqual(gates.commitGate(ex.commitEvidence(dir, '', PLUGIN)).allow, true);
});

// ---- the command line ----------------------------------------------------------

test('cli list prints the discovered experts as JSON', () => {
  const r = cli(process.cwd(), ['list']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).some((e) => e.name === 'security' && Array.isArray(e.stages)));
});

test('cli list --plugin-root reads another plugin root and prints problems on stderr only', () => {
  const root = pluginWith({ 'uw-expert-a.md': agentText('a', { description: '' }), 'uw-expert-good.md': agentText('good') });
  const r = cli(process.cwd(), ['list', '--plugin-root', root]);
  assert.strictEqual(r.status, 0);
  assert.deepStrictEqual(JSON.parse(r.stdout).map((e) => e.name), ['good']);
  assert.match(r.stderr, /uw-expert-a\.md/);
});

test('cli select and read round-trip, and an unknown name exits 2 with the file untouched', () => {
  const dir = tmp('cli');
  const plan = path.join(dir, 'PLAN-x.md');
  const text = '---\nplan_confirmed: false\n---\nbody\n';
  write(plan, text);
  const bad = cli(dir, ['select', '--plan', plan, '--add', 'ghost']);
  assert.strictEqual(bad.status, 2);
  assert.match(bad.stderr, /ghost/);
  assert.strictEqual(fs.readFileSync(plan, 'utf8'), text);

  const ok = cli(dir, ['select', '--plan', plan, '--add', 'security']);
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.deepStrictEqual(JSON.parse(cli(dir, ['read', '--plan', plan]).stdout), { file: plan, present: true, experts: ['security'] });

  const none = cli(dir, ['select', '--plan', plan]);
  assert.strictEqual(none.status, 2, '--add is required, so forgetting it is not "none apply"');
});

test('cli never picks a plan for you', () => {
  for (const cmd of ['read', 'select']) {
    const r = cli(process.cwd(), [cmd, ...(cmd === 'select' ? ['--add', ''] : [])]);
    assert.strictEqual(r.status, 2, cmd);
    assert.match(r.stderr, /--plan/);
  }
});

test('cli record reads the workflow result from stdin, and says why when it refuses', () => {
  const dir = repo();
  cli(dir, ['prepare']);
  const ok = cli(dir, ['record', '--stage', 'review'], JSON.stringify(reviewResult()));
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.deepStrictEqual(JSON.parse(ok.stdout).recorded, ['security']);

  const garbage = cli(dir, ['record', '--stage', 'review'], 'not json');
  assert.strictEqual(garbage.status, 2);
  assert.match(garbage.stderr, /JSON/);

  const noStage = cli(dir, ['record'], '{}');
  assert.strictEqual(noStage.status, 2);
});

test('cli check exits 0 with ok when a commit would be allowed and 1 with the reason when it would not', () => {
  const { dir, plan } = ready();
  const blocked = cli(dir, ['check', '--plan', plan]);
  assert.strictEqual(blocked.status, 1);
  assert.strictEqual(JSON.parse(blocked.stdout).ok, false);
  assert.match(JSON.parse(blocked.stdout).reason, /Gate G6/);

  cli(dir, ['prepare']);
  cli(dir, ['record', '--stage', 'review', '--plan', plan], JSON.stringify(reviewResult()));
  const ok = cli(dir, ['check', '--plan', plan]);
  assert.strictEqual(ok.status, 0, ok.stdout);
  assert.deepStrictEqual(JSON.parse(ok.stdout), { ok: true });
});

test('cli with an unknown command or argument exits 2 and says what it expected', () => {
  const a = cli(process.cwd(), ['frobnicate']);
  assert.strictEqual(a.status, 2);
  assert.match(a.stderr, /expected list, brief, read, select/);
  const b = cli(process.cwd(), ['list', '--nope']);
  assert.strictEqual(b.status, 2);
  assert.match(b.stderr, /unknown argument/);
});

test('"none apply" goes stale too: a change after a recheck that selected nobody needs the recheck again', () => {
  const { dir } = ready();
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '---\nplan_confirmed: true\nexperts: []\n---\nbody\n');
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult({ selected: [], ran: [], added: [] }), { pluginRoot: PLUGIN });
  assert.strictEqual(verdict(dir, plan).allow, true);
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 99;\n');
  assert.strictEqual(verdict(dir, plan).allow, false, 'nobody was selected, so only the recheck itself can notice the change');
});

test('a review record from older changes does not satisfy the gate even when the recheck is current', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult(), { pluginRoot: PLUGIN, planFile: plan });
  const file = path.join(dir, '.ultimate-workflow', 'experts', 'review', 'security.json');
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({ ...rec, hash: 'an-older-fingerprint' }));
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /security/);
});

// ---- findings that must be resolved before a commit -------------------------------------

const found = (over = {}) => ({ expert: 'security', file: 'src/a.js', line: 3, what: 'The admin check lets support read any order', confidence: 'high', status: 'confirmed', ...over });
const withFindings = (...fs_) => reviewResult({ findings: fs_ });

function reviewed(findings) {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  const out = ex.record(dir, 'review', withFindings(...findings), { pluginRoot: PLUGIN, planFile: plan });
  return { dir, plan, out };
}

test('an open high-confidence finding blocks the commit, and the reason lists it with its id, file and line', () => {
  const { dir, plan, out } = reviewed([found()]);
  assert.strictEqual(out.open.length, 1);
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /1 high-confidence finding is still open/);
  assert.ok(v.reason.includes(`[${out.open[0].id}]`));
  assert.ok(v.reason.includes('src/a.js:3'));
  assert.match(v.reason, /Do not dismiss one on your own authority/);
});

test('findings below high confidence are raised in the review but do not block', () => {
  const { dir, plan } = reviewed([found({ confidence: 'medium' }), found({ confidence: 'low', what: 'another thing' })]);
  assert.strictEqual(verdict(dir, plan).allow, true);
});

test('a finding nobody ruled on blocks exactly as a confirmed one does', () => {
  const { dir, plan } = reviewed([found({ status: 'unverified' })]);
  assert.strictEqual(verdict(dir, plan).allow, false);
});

test('fixing the code resolves a finding: the next review no longer reports it, and the commit is allowed', () => {
  const { dir, plan } = reviewed([found()]);
  assert.strictEqual(verdict(dir, plan).allow, false);
  write(path.join(dir, 'src', 'a.js'), 'module.exports = 3; // fixed\n');
  assert.strictEqual(verdict(dir, plan).allow, false, 'the old review is stale, so the gate asks for a new one');
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', withFindings(), { pluginRoot: PLUGIN, planFile: plan });
  assert.strictEqual(verdict(dir, plan).allow, true);
});

test('a finding that is still there after an unrelated edit stays open', () => {
  const { dir, plan } = reviewed([found()]);
  write(path.join(dir, 'src', 'b.js'), 'x\n');
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', withFindings(found({ line: 40 })), { pluginRoot: PLUGIN, planFile: plan });
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /src\/a\.js:40/);
});

test('the id does not depend on the line, so a moved finding is the same finding', () => {
  assert.strictEqual(ex.findingId(found({ line: 3 })), ex.findingId(found({ line: 300 })));
  assert.notStrictEqual(ex.findingId(found()), ex.findingId(found({ file: 'src/b.js' })));
  assert.notStrictEqual(ex.findingId(found()), ex.findingId(found({ expert: 'devops' })));
  assert.notStrictEqual(ex.findingId(found()), ex.findingId(found({ what: 'Something else entirely' })));
  assert.strictEqual(ex.findingId(found({ what: 'The admin check lets support read ANY order!' })), ex.findingId(found({ what: 'the admin check lets support read any order' })), 'case and punctuation do not matter');
});

test('dismissing a finding needs the user\'s reason, and then the commit is allowed', () => {
  const { dir, plan, out } = reviewed([found()]);
  const id = out.open[0].id;
  assert.throws(() => ex.resolve(dir, id, '', PLUGIN), /reason/);
  assert.throws(() => ex.resolve(dir, id, 'ok', PLUGIN), /reason/);
  assert.throws(() => ex.resolve(dir, 'nosuchid', 'because the user said so', PLUGIN), /no recorded finding/);
  assert.strictEqual(verdict(dir, plan).allow, false, 'nothing changed yet');

  const done = ex.resolve(dir, id, 'Support staff are meant to see every order (the user, 19 Oct)', PLUGIN);
  assert.strictEqual(done.reason, 'Support staff are meant to see every order (the user, 19 Oct)');
  assert.strictEqual(verdict(dir, plan).allow, true);
});

test('a dismissal holds when the same finding is reported again by a later review of the same code', () => {
  const { dir, plan, out } = reviewed([found()]);
  ex.resolve(dir, out.open[0].id, 'accepted by the user for the demo', PLUGIN);
  write(path.join(dir, 'src', 'b.js'), 'x\n');
  ex.prepare(dir, 'working', PLUGIN);
  const again = ex.record(dir, 'review', withFindings(found({ line: 9 })), { pluginRoot: PLUGIN, planFile: plan });
  assert.strictEqual(again.open.length, 0, 'the record reports it as dismissed');
  assert.strictEqual(verdict(dir, plan).allow, true);
});

test('a dismissal covers that finding only', () => {
  const { dir, plan, out } = reviewed([found(), found({ what: 'The order is written to the log', line: 21 })]);
  assert.strictEqual(out.open.length, 2);
  ex.resolve(dir, out.open[0].id, 'accepted by the user', PLUGIN);
  const v = verdict(dir, plan);
  assert.strictEqual(v.allow, false);
  assert.match(v.reason, /1 high-confidence finding is still open/);
  assert.match(v.reason, /written to the log/);
});

test('a failed expert leaves no findings and no record, so the gate asks for the review, not for nothing', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  ex.record(dir, 'review', reviewResult({ ran: [], failed: ['security'], findings: [found()] }), { pluginRoot: PLUGIN, planFile: plan });
  assert.ok(!fs.existsSync(path.join(dir, '.ultimate-workflow', 'experts', 'review', 'security.json')));
  assert.match(verdict(dir, plan).reason, /security/);
});

test('findings from an expert that did not run in this review are not recorded against it', () => {
  const { dir, plan } = ready();
  ex.prepare(dir, 'working', PLUGIN);
  const out = ex.record(dir, 'review', reviewResult({ findings: [found({ expert: 'devops' })] }), { pluginRoot: PLUGIN, planFile: plan }).findings;
  assert.strictEqual(out, 0);
});

test('cli findings lists what is open and what is dismissed, and resolve dismisses by id', () => {
  const { dir, plan } = ready();
  cli(dir, ['prepare']);
  const rec = JSON.parse(cli(dir, ['record', '--stage', 'review', '--plan', plan], JSON.stringify(withFindings(found()))).stdout);
  const id = rec.open[0].id;

  const listed = JSON.parse(cli(dir, ['findings']).stdout).findings;
  assert.deepStrictEqual(listed.map((f) => [f.id, f.waived, f.current]), [[id, false, true]]);

  const blocked = cli(dir, ['check', '--plan', plan]);
  assert.strictEqual(blocked.status, 1);
  assert.strictEqual(JSON.parse(blocked.stdout).open[0].id, id);

  const noReason = cli(dir, ['resolve', '--id', id]);
  assert.strictEqual(noReason.status, 2);
  const ok = cli(dir, ['resolve', '--id', id, '--reason', 'the user accepted the risk']);
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.strictEqual(JSON.parse(cli(dir, ['findings']).stdout).findings[0].waived, true);
  assert.strictEqual(cli(dir, ['check', '--plan', plan]).status, 0);
});

// ---- the build stage: a standing brief, loaded on every build ----

test('briefs: an expert that declares the build stage contributes its build.md, others contribute nothing', () => {
  const { payload } = (function copy() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-brief-'));
    fs.cpSync(PLUGIN, path.join(root, 'plugin'), { recursive: true });
    return { payload: path.join(root, 'plugin') };
  })();
  const { briefs } = require(path.join(payload, 'experts', 'experts.js'));
  const names = briefs(payload).briefs.map((b) => b.name);
  assert.ok(names.includes('developer'), 'developer declares build');
  assert.ok(!names.includes('security'), 'security does not declare build');
  assert.deepEqual(briefs(payload).problems, [], 'an expert that does not declare build is not asked for a brief, so nothing is reported for it');
  const dev = briefs(payload).briefs.find((b) => b.name === 'developer');
  assert.ok(dev.text.length > 200 && dev.text.length < 4096);
  assert.match(dev.text, /adds no work/);
});

test('briefs: a missing, empty or oversized build.md is reported and left out, never guessed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-brief-'));
  const payload = path.join(root, 'plugin');
  fs.cpSync(PLUGIN, payload, { recursive: true });
  const { briefs } = require(path.join(payload, 'experts', 'experts.js'));
  const file = path.join(payload, 'experts', 'developer', 'references', 'build.md');
  const original = fs.readFileSync(file, 'utf8');

  fs.rmSync(file);
  let r = briefs(payload);
  assert.deepEqual(r.briefs.map((b) => b.name), []);
  assert.match(r.problems.join('|'), /developer: declares the build stage but .*build\.md cannot be read/);

  fs.writeFileSync(file, '   \n');
  r = briefs(payload);
  assert.deepEqual(r.briefs, []);
  assert.match(r.problems.join('|'), /build\.md is empty/);

  fs.writeFileSync(file, 'x'.repeat(5000));
  r = briefs(payload);
  assert.deepEqual(r.briefs, []);
  assert.match(r.problems.join('|'), /capped at 4096/);

  fs.writeFileSync(file, original);
  assert.equal(briefs(payload).briefs.length, 1);
});

test('briefs: the build stage is declarable but is not a lane stage, so nothing can be recorded for it', () => {
  const x = require(path.join(PLUGIN, 'experts', 'experts.js'));
  assert.deepEqual(x.STAGES, ['plan', 'tests', 'review']);
  assert.deepEqual(x.DECLARABLE, ['plan', 'tests', 'review', 'build']);
  assert.throws(() => x.record(os.tmpdir(), 'build', { ok: true, expertLane: { stage: 'build' } }), /unknown stage "build"/);
});

test('briefs: the cli prints the briefs as JSON and says why one was left out', () => {
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'experts', 'experts.js'), 'brief'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.map((b) => b.name), ['developer']);
  assert.equal(typeof out[0].text, 'string');
});
