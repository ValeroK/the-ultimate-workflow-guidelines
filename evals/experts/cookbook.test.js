'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { extractTemplates, scaffoldExpert, TEMPLATES } = require('./lib/cookbook.js');
const { checkAll, discover } = require('./lib/contract.js');

const ROOT = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const COOKBOOK = path.join(ROOT, 'docs', 'adding-an-expert.md');
const text = () => fs.readFileSync(COOKBOOK, 'utf8');

// The cookbook is only worth having if following it produces an expert that passes
// the contract AND is picked up by the plugin with no other edit. This scaffolds
// experts by applying nothing but the cookbook's own templates, so a template that
// rots fails here instead of in a stranger's first attempt.

function copyTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-cookbook-'));
  const payload = path.join(dir, 'payload');
  const examples = path.join(dir, 'examples');
  fs.cpSync(PAYLOAD, payload, { recursive: true, filter: (s) => !/[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(s) });
  fs.cpSync(path.join(__dirname, 'examples'), examples, { recursive: true });
  return { payload, examples };
}

const FILL = {
  applies: [
    'Adds a new cloud resource definition with a public network rule',
    'Changes the pipeline that builds and ships the container image',
    'Edits how the service reads its environment variables at startup',
  ],
  does_not_apply: ['Fixes a typo in the README', 'Renames a CSS class in a button component', 'Adds a unit test for a date-formatting helper'],
};

test('the cookbook carries every template the recipe needs, labelled so they can be checked', () => {
  const t = extractTemplates(text());
  for (const label of TEMPLATES) {
    assert.ok(t[label] && t[label].length > 20, `template "${label}" missing from docs/adding-an-expert.md`);
  }
});

test('following the cookbook mechanically yields an expert that passes the contract', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL });
  assert.deepStrictEqual(checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }), []);
});

test('the new expert is discovered by the plugin with no other file edited', () => {
  const tree = copyTree();
  const before = discover(tree.payload).experts.map((e) => e.name);
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL });
  const after = discover(tree.payload);
  assert.deepStrictEqual(after.problems, []);
  assert.deepStrictEqual(after.experts.map((e) => e.name).sort(), [...before, 'infra'].sort());
  const infra = after.experts.find((e) => e.name === 'infra');
  assert.deepStrictEqual(infra.stages, ['plan', 'tests', 'review']);
  assert.match(infra.description, /Applies when/);
  assert.strictEqual(infra.agent, 'uw-expert-infra');
});

test('an expert that joins only some stages needs only those references, and passes', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'arch', domain: 'architecture', stages: ['plan', 'review'], fill: FILL });
  assert.deepStrictEqual(checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }), []);
  const arch = discover(tree.payload).experts.find((e) => e.name === 'arch');
  assert.deepStrictEqual(arch.stages, ['plan', 'review']);
  assert.ok(!fs.existsSync(path.join(tree.payload, 'experts', 'arch', 'references', 'tests.md')));
});

test('two experts added one after the other both pass, and security still does', () => {
  const tree = copyTree();
  const shipped = discover(tree.payload).experts.map((e) => e.name);
  assert.ok(shipped.includes('security'));
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL });
  scaffoldExpert({ ...tree, cookbook: text(), name: 'privacy', domain: 'privacy', fill: FILL });
  assert.deepStrictEqual(checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }), []);
  assert.deepStrictEqual(discover(tree.payload).experts.map((e) => e.name).sort(), [...shipped, 'infra', 'privacy'].sort());
});

test('a contributor who skips the placeholders is stopped: the notes and examples fail the contract', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure' });
  const problems = checkAll({ payloadDir: tree.payload, examplesDir: tree.examples });
  assert.ok(problems.some((p) => /infra/.test(p) && /placeholder/i.test(p)), 'unfilled examples must be caught: ' + problems.join(' | '));
  assert.ok(problems.some((p) => /infra/.test(p) && /FILL-IN/.test(p)), 'unfilled template notes must be caught too: ' + problems.join(' | '));
});

test('no placeholder survives substitution in the files a scaffold writes', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL });
  const files = [
    path.join(tree.payload, 'agents', 'uw-expert-infra.md'),
    ...['plan', 'tests', 'review'].map((s) => path.join(tree.payload, 'experts', 'infra', 'references', `${s}.md`)),
    path.join(tree.examples, 'infra.json'),
  ];
  for (const f of files) assert.ok(!/\{\{|REPLACE|FILL-IN/.test(fs.readFileSync(f, 'utf8')), `${path.basename(f)} still has a placeholder`);
});

test('the cookbook states its goal and what is not the goal before anything else of substance', () => {
  const doc = text();
  const goal = doc.indexOf('## Goal, and what is not the goal');
  assert.ok(goal > -1, 'the goal section is missing');
  for (const later of ['## What an expert is here', '## The recipe', '## Decision record']) {
    assert.ok(doc.indexOf(later) > goal, `${later} must come after the goal`);
  }
  assert.match(doc, /Not the goal/);
});

test('the cookbook separates what was measured from what was only reasoned', () => {
  const doc = text();
  assert.match(doc, /Tried and measured/);
  assert.match(doc, /Reasoned, not yet tested/);
});

test('the cookbook names every file the recipe touches and the one command that verifies it', () => {
  const doc = text();
  for (const needle of [
    'agents/uw-expert-',
    'experts/<name>/references/<stage>.md',
    'evals/experts/examples/<name>.json',
    'evals/experts/lib/contract.js',
    'experts/experts.js',
    'node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js',
  ]) {
    assert.ok(doc.includes(needle), `the cookbook never mentions: ${needle}`);
  }
});

test('the cookbook no longer tells a contributor to edit a registry or a router', () => {
  const doc = text();
  assert.ok(!/const EXPERTS = \{|const RULES = \{|route-rule|review-entry|routes\.js/.test(doc), 'stale registry or router instruction');
  assert.match(doc, /Nothing else needs editing/);
});

test('the cookbook tells the contributor when to stop instead of improvising', () => {
  const doc = text();
  assert.match(doc, /DECLARED_TOOLS/);
  assert.match(doc, /stop/i);
  assert.match(doc, /vendor/i);
  assert.match(doc, /blind/i, 'it must say the evaluation corpus is authored blind');
});

test('the cookbook says what the tools and network decision is and what it cannot guarantee', () => {
  const doc = text();
  assert.match(doc, /## Tools and the network/);
  assert.match(doc, /cannot check that the model follows/i);
});

test('the cookbook keeps the overlap with existing reviewers as an open point', () => {
  assert.match(text(), /## Open points[\s\S]*Overlap with the existing reviewers/);
});

test('every expert-sized path the cookbook mentions exists or is a labelled placeholder', () => {
  const doc = text();
  const refs = [...doc.matchAll(/`((?:agents|experts|workflows|evals|docs)\/[A-Za-z0-9_./<>-]+)`/g)].map((m) => m[1]);
  assert.ok(refs.length > 5);
  for (const ref of refs) {
    if (/<name>|<file>|<domain>|<stage>|\.\.\./.test(ref)) continue;
    const candidates = [path.join(ROOT, ref), path.join(PAYLOAD, ref)];
    assert.ok(candidates.some((c) => fs.existsSync(c)), `the cookbook points at ${ref}, which does not exist`);
  }
});

test('an expert that declares a build brief is scaffolded from the cookbook and passes the contract', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', stages: ['plan', 'build', 'review'], fill: FILL });
  assert.deepStrictEqual(checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }), []);
  assert.ok(fs.existsSync(path.join(tree.payload, 'experts', 'infra', 'references', 'build.md')));
  const agent = fs.readFileSync(path.join(tree.payload, 'agents', 'uw-expert-infra.md'), 'utf8');
  assert.match(agent, /stages: \[plan, build, review\]/);
  assert.match(agent, /At the \*\*build\*\* stage you are not run/);
  assert.ok(discover(tree.payload).experts.find((e) => e.name === 'infra').stages.includes('build'));
});

test('a build brief that is too big, that enlarges the task, or that fetches things is stopped by the contract', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', stages: ['plan', 'build', 'review'], fill: FILL });
  const file = path.join(tree.payload, 'experts', 'infra', 'references', 'build.md');
  const good = fs.readFileSync(file, 'utf8');
  const problems = () => checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }).join(' | ');

  fs.writeFileSync(file, `${good}\n${'Another rule that nobody needs. '.repeat(200)}`);
  assert.match(problems(), /build\.md is \d+ bytes; it is loaded on every build and is capped at 4096/);

  fs.writeFileSync(file, '# Brief\n\nWrite code the way the team does.\n');
  assert.match(problems(), /must say that it adds no work and that the plan decides the scope/);

  fs.writeFileSync(file, `${good}\nBefore you start, run npx something to fetch the style guide.\n`);
  assert.match(problems(), /must not tell the implementer to fetch, install or visit anything/);

  fs.writeFileSync(file, good);
  assert.strictEqual(problems(), '');
});

test('a build stage with no build.md is caught, and so is a build.md the agent never names', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', stages: ['plan', 'build', 'review'], fill: FILL });
  const ref = path.join(tree.payload, 'experts', 'infra', 'references', 'build.md');
  const agentFile = path.join(tree.payload, 'agents', 'uw-expert-infra.md');
  const agent = fs.readFileSync(agentFile, 'utf8');
  const problems = () => checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }).join(' | ');

  fs.writeFileSync(agentFile, agent.split('\n').filter((l) => !/references\/build\.md/.test(l)).join('\n'));
  assert.match(problems(), /build\.md exists but the agent never names it/);
  fs.writeFileSync(agentFile, agent);

  const saved = fs.readFileSync(ref, 'utf8');
  fs.rmSync(ref);
  assert.match(problems(), /takes part at the build stage, so .*build\.md must exist|build\.md, which does not exist/);
  fs.writeFileSync(ref, saved);
  assert.strictEqual(problems(), '');
});
