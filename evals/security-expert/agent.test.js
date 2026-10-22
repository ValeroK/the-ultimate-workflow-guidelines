'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const AGENT = path.join(PAYLOAD, 'agents', 'uw-expert-security.md');
const REFS = path.join(PAYLOAD, 'experts', 'security', 'references');

function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(m, 'agent file needs a frontmatter block');
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body: m[2] };
}

const { fm, body } = parse(fs.readFileSync(AGENT, 'utf8'));

test('frontmatter names the agent the workflow spawns and nothing else', () => {
  assert.strictEqual(fm.name, 'uw-expert-security');
  assert.ok(fm.description && fm.description.length > 20);
  // No registry names it: the plugin finds it because the file exists, and spawns it by the
  // agent name the discovery reports.
  const { list } = require(path.join(PAYLOAD, 'experts', 'experts.js'));
  const found = list(PAYLOAD).experts.find((e) => e.name === 'security');
  assert.ok(found, 'experts/experts.js list discovers the security expert');
  assert.strictEqual(found.agent, 'uw-expert-security');
  assert.deepStrictEqual(found.stages, ['plan', 'tests', 'review']);
});

test('the tool allowlist is exactly the declared set: read, shell and web, but no writes and no skills', () => {
  const tools = fm.tools.split(',').map((t) => t.trim()).sort();
  assert.deepStrictEqual(tools, ['Bash', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch']);
  assert.ok(!tools.some((t) => /^(Write|Edit|MultiEdit|NotebookEdit|Skill)$/.test(t)));
  assert.strictEqual(fm.readonly, 'true');
});

test('the body points at the shared protocol and keeps only what is specific to security', () => {
  // Zero findings, untrusted input and what may go into a web query are the protocol's, read by
  // every expert; restating them here is what let the copies drift.
  assert.match(body, /experts\/protocol\.md/);
  assert.match(body, /read-only commands/i);
  assert.match(body, /references\/plan\.md/);
  assert.match(body, /references\/tests\.md/);
  assert.match(body, /references\/review\.md/);
  assert.match(body, /agent-surface\.md/);
  assert.match(body, /dependencies\.md/);
  assert.match(body, /not provided/i);
  const protocol = fs.readFileSync(path.join(PAYLOAD, 'experts', 'protocol.md'), 'utf8');
  assert.match(protocol, /zero is a correct answer/i);
  assert.match(protocol, /untrusted input/i);
  assert.match(protocol, /only public names/i);
});

test('the conditional references are read conditionally, not always', () => {
  assert.match(body, /agent-surface\.md`?,?\s+only (if|when)/i);
  assert.match(body, /dependencies\.md`?,?\s+only (if|when)/i);
});

test('the references the body names exist in the shipped payload', () => {
  for (const f of ['plan.md', 'tests.md', 'review.md', 'agent-surface.md', 'dependencies.md']) {
    assert.ok(fs.existsSync(path.join(REFS, f)), `${f} is named by the agent but missing`);
  }
});

test('the expert is not registered as a skill, so no description sits in the main context', () => {
  const stack = [path.join(PAYLOAD, 'experts')];
  const skillFiles = [];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name === 'SKILL.md') skillFiles.push(p);
    }
  }
  assert.deepStrictEqual(skillFiles, []);
});

function shingles(text, n = 6) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

test('no always-on file shares a six-word run with the expert references', () => {
  const refs = new Set();
  for (const f of fs.readdirSync(REFS)) for (const s of shingles(fs.readFileSync(path.join(REFS, f), 'utf8'))) refs.add(s);
  const alwaysOn = [
    path.join(ROOT, 'AGENTS.md'),
    ...fs.readdirSync(path.join(PAYLOAD, 'rules')).map((f) => path.join(PAYLOAD, 'rules', f)),
  ];
  for (const file of alwaysOn) {
    const overlap = [...shingles(fs.readFileSync(file, 'utf8'))].filter((s) => refs.has(s));
    assert.deepStrictEqual(overlap.slice(0, 3), [], `${path.relative(ROOT, file)} repeats expert reference text`);
  }
});
