'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// The README and the docs make claims about the expert flow. These check that the claims
// point at things that exist and agree with each other, so they cannot drift quietly.

const README = read('README.md');
const COOKBOOK = read('docs/adding-an-expert.md');
const VETTING = read('docs/what-a-good-expert-looks-like.md');

test('the README explains domain experts, with the flow diagram and the honest limits', () => {
  assert.match(README, /^## Domain experts$/m);
  const section = README.slice(README.indexOf('## Domain experts'), README.indexOf('## Starting a brand new project?'));
  for (const needle of ['/plan', '/tests', '/build', 'commit', '/ultimate-workflow:experts', 'refused until', 'can only ADD', 'YOU confirm the plan', 'YOU confirm the tests', 'YOU dismiss', 'makes the evidence stale', 'treats the expert input as requirements']) {
    assert.ok(section.includes(needle), `the experts section never says: ${needle}`);
  }
  assert.match(section, /The honest limits/);
  assert.match(section, /promising, not proven/);
});

test('every /ultimate-workflow: command the README names exists', () => {
  const named = [...new Set([...README.matchAll(/\/ultimate-workflow:([a-z-]+)/g)].map((m) => m[1]))];
  assert.ok(named.includes('experts'));
  for (const name of named) {
    assert.ok(fs.existsSync(path.join(PAYLOAD, 'commands', `${name}.md`)), `the README names /ultimate-workflow:${name}, which has no command file`);
  }
});

test('the README links to docs that exist', () => {
  const links = [...README.matchAll(/\]\((docs\/[^)#]+)\)/g)].map((m) => m[1]);
  assert.ok(links.includes('docs/adding-an-expert.md'));
  assert.ok(links.includes('docs/what-a-good-expert-looks-like.md'));
  assert.ok(links.includes('docs/gates.md'));
  for (const l of links) assert.ok(fs.existsSync(path.join(ROOT, l)), `the README links to ${l}, which does not exist`);
});

test('the README and the cookbook quote the same selection numbers', () => {
  for (const doc of [README, COOKBOOK, VETTING]) {
    assert.match(doc, /12 of 12/);
    assert.match(doc, /5 of 6/);
  }
});

test('the README host table says where the commit gate runs', () => {
  assert.match(README, /Commit refused until the experts have reviewed \| Yes, with the gates on \| No \| No/);
});

test('the layout in the README lists the experts folder, and the folder exists', () => {
  assert.match(README, /hooks\/\s+memory\/\s+experts\//);
  assert.ok(fs.existsSync(path.join(PAYLOAD, 'experts')));
});

test('the gates doc lists G6 and the experts key of the status JSON, and the status JSON really has it', () => {
  const gates = read('docs/gates.md');
  assert.match(gates, /\| G6 \|/);
  assert.match(gates, /"experts":\s+\{/);
  const status = fs.readFileSync(path.join(PAYLOAD, 'hooks', 'status.js'), 'utf8');
  assert.ok(status.includes('experts: expertsReport'));
});

test('the changelog records the experts work under Unreleased', () => {
  const log = read('CHANGELOG.md');
  const unreleased = log.slice(log.indexOf('## [Unreleased]'), log.indexOf('## [3.1.0]'));
  for (const needle of ['Domain experts', '/ultimate-workflow:experts', 'Gate G6', 'route.js', 'Known gaps']) {
    assert.ok(unreleased.includes(needle), `the changelog never mentions: ${needle}`);
  }
});

test('AGENTS.md points at both expert docs', () => {
  const agents = read('AGENTS.md');
  assert.ok(agents.includes('`docs/adding-an-expert.md`'));
  assert.ok(agents.includes('`docs/what-a-good-expert-looks-like.md`'));
});

// ---- the vetting guide ------------------------------------------------------------------

test('the vetting guide has its ten properties, numbered, each in bold', () => {
  for (let i = 1; i <= 10; i++) {
    assert.match(VETTING, new RegExp(`^\\*\\*${i}\\. `, 'm'), `property ${i} is missing`);
  }
  assert.doesNotMatch(VETTING, /^\*\*11\. /m);
});

test('the vetting guide has the sections a reviewer needs, in an order that reads', () => {
  const order = ['## How to read this', '## What a good expert looks like', '## Red flags', '## If it came from someone else', '## The scorecard', '## What the contract cannot tell you', '## The security expert against this list', '## Recording the decision'];
  let at = -1;
  for (const h of order) {
    const i = VETTING.indexOf(h);
    assert.ok(i > at, `${h} is missing or out of order`);
    at = i;
  }
});

test('the scorecard has twelve numbered checks, each with who does it, and the first runs the real verify command', () => {
  const table = VETTING.slice(VETTING.indexOf('## The scorecard'), VETTING.indexOf('## What the contract cannot tell you'));
  const rows = [...table.matchAll(/^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/gm)];
  assert.deepStrictEqual(rows.map((r) => Number(r[1])), Array.from({ length: 12 }, (_, i) => i + 1));
  for (const r of rows) assert.match(r[5], /code|model|person|numbers/, `check ${r[1]} never says who does it`);
  const verify = read('AGENTS.md').match(/`(node --test "\.cursor-plugin[^`]+)`/)[1];
  assert.ok(rows[0][3].includes(verify), 'check 1 is not the repository\'s own verify command');
});

test('the guide marks its own bars as proposals, and does not claim the replay tool is committed', () => {
  assert.match(VETTING, /The "passes when" column is a proposal/);
  assert.match(VETTING, /is not committed/);
});

test('every path the vetting guide mentions exists or is a labelled placeholder', () => {
  const refs = [...VETTING.matchAll(/`((?:agents|experts|workflows|evals|docs|vendor|hooks)\/[A-Za-z0-9_./<>*-]+)`/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4);
  for (const ref of refs) {
    if (/<|\*|\.\.\./.test(ref)) continue;
    const candidates = [path.join(ROOT, ref), path.join(PAYLOAD, ref)];
    assert.ok(candidates.some((c) => fs.existsSync(c)), `the guide points at ${ref}, which does not exist`);
  }
});

test('the vetting guide names the contract rules by what the contract really checks', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'evals', 'experts', 'lib', 'contract.js'), 'utf8');
  assert.ok(contract.includes('BYTE_BUDGET = 60 * 1024'), 'the guide says 60 KB');
  assert.match(VETTING, /60 KB/);
  assert.ok(contract.includes('DECLARED_TOOLS'));
  assert.match(VETTING, /DECLARED_TOOLS/);
});

test('the guide\'s worked example agrees with what ships: the security expert has the references it counts', () => {
  const refs = fs.readdirSync(path.join(PAYLOAD, 'experts', 'security', 'references'));
  assert.ok(refs.includes('CHANGES.md'));
  assert.strictEqual(refs.filter((f) => f !== 'CHANGES.md').length, 5, 'the guide says five reference files and a changes record');
  assert.match(VETTING, /Five reference files and a changes record/);
});
