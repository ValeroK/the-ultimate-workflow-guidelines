'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { extractTemplates, scaffoldExpert } = require('./lib/cookbook.js');
const { checkAll } = require('./lib/contract.js');

const ROOT = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const COOKBOOK = path.join(ROOT, 'docs', 'adding-an-expert.md');
const text = () => fs.readFileSync(COOKBOOK, 'utf8');

// The cookbook is only worth having if following it produces an expert that passes
// the contract. This scaffolds experts by applying nothing but the cookbook's own
// templates and insertion instructions, so a template that rots, or an instruction
// that no longer works, fails here instead of in a stranger's first attempt.

function copyTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-cookbook-'));
  const payload = path.join(dir, 'payload');
  const examples = path.join(dir, 'examples');
  fs.cpSync(PAYLOAD, payload, { recursive: true, filter: (s) => !/[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(s) });
  fs.cpSync(path.join(__dirname, 'examples'), examples, { recursive: true });
  return { payload, examples };
}

const FILL = (dir) => ({
  rule: dir,
  routes: [`${dir}/main.cfg`, `${dir}/a/b.cfg`, `${dir}/c.cfg`],
  ignores: ['README.md', 'src/util/strings.js', 'docs/notes.md'],
});

test('the cookbook carries every template the recipe needs, labelled so they can be checked', () => {
  const t = extractTemplates(text());
  for (const label of ['agent', 'checklist', 'examples', 'route-rule', 'review-entry']) {
    assert.ok(t[label] && t[label].length > 20, `template "${label}" missing from docs/adding-an-expert.md`);
  }
});

test('following the cookbook mechanically yields an expert that passes the contract', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL('infra-live') });
  assert.deepStrictEqual(checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }), []);
});

test('two experts added one after the other both pass, and security still does', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL('infra-live') });
  scaffoldExpert({ ...tree, cookbook: text(), name: 'privacy', domain: 'privacy', fill: FILL('privacy-data') });
  assert.deepStrictEqual(checkAll({ payloadDir: tree.payload, examplesDir: tree.examples }), []);
});

test('a contributor who skips the placeholders is stopped: the routing placeholders fail the contract', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure' });
  const problems = checkAll({ payloadDir: tree.payload, examplesDir: tree.examples });
  assert.ok(problems.some((p) => /infra/.test(p) && /routing example/i.test(p)), problems.join(' | '));
  assert.ok(problems.some((p) => /infra/.test(p) && /FILL-IN/.test(p)), 'unfilled template notes must be caught too: ' + problems.join(' | '));
});

test('no placeholder survives substitution in the files a scaffold writes', () => {
  const tree = copyTree();
  scaffoldExpert({ ...tree, cookbook: text(), name: 'infra', domain: 'infrastructure', fill: FILL('infra-live') });
  const files = [
    path.join(tree.payload, 'agents', 'uw-expert-infra.md'),
    path.join(tree.payload, 'experts', 'infra', 'references', 'checklist.md'),
    path.join(tree.examples, 'infra.json'),
  ];
  for (const f of files) assert.ok(!/\{\{|REPLACE|FILL-IN/.test(fs.readFileSync(f, 'utf8')), `${path.basename(f)} still has a placeholder`);
});

test('the cookbook names every file the recipe touches and the one command that verifies it', () => {
  const doc = text();
  for (const needle of [
    'agents/uw-expert-',
    'experts/<name>/references/',
    'experts/route.js',
    'workflows/review.js',
    'evals/experts/examples/<name>.json',
    'evals/experts/lib/contract.js',
    'node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js',
  ]) {
    assert.ok(doc.includes(needle), `the cookbook never mentions: ${needle}`);
  }
});

test('the cookbook tells the contributor when to stop instead of improvising', () => {
  const doc = text();
  assert.match(doc, /DECLARED_TOOLS/);
  assert.match(doc, /stop/i);
  assert.match(doc, /vendor/i);
  assert.match(doc, /blind/i, 'it must say the evaluation corpus is authored blind');
});

test('every expert-sized path the cookbook mentions exists or is a labelled placeholder', () => {
  const doc = text();
  const refs = [...doc.matchAll(/`((?:agents|experts|workflows|evals|docs)\/[A-Za-z0-9_./<>-]+)`/g)].map((m) => m[1]);
  assert.ok(refs.length > 5);
  for (const ref of refs) {
    if (/<name>|<file>|<domain>|\.\.\./.test(ref)) continue;
    const candidates = [path.join(ROOT, ref), path.join(PAYLOAD, ref)];
    assert.ok(candidates.some((c) => fs.existsSync(c)), `the cookbook points at ${ref}, which does not exist`);
  }
});
