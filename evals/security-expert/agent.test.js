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
  const review = fs.readFileSync(path.join(PAYLOAD, 'workflows', 'review.js'), 'utf8');
  assert.ok(review.includes("'uw-expert-security'"), 'review.js spawns this agent type');
});

test('the tool allowlist is exactly Read, Grep, Glob: no shell, no network, no writes, no skills', () => {
  const tools = fm.tools.split(',').map((t) => t.trim()).sort();
  assert.deepStrictEqual(tools, ['Glob', 'Grep', 'Read']);
  assert.strictEqual(fm.readonly, 'true');
});

test('the body states the rules that make the result trustworthy', () => {
  assert.match(body, /zero findings/i);
  assert.match(body, /no shell/i);
  assert.match(body, /untrusted/i);
  assert.match(body, /references\/diff-review\.md/);
  assert.match(body, /agent-surface\.md/);
  assert.match(body, /dependencies\.md/);
  assert.match(body, /not provided/i);
});

test('the conditional references are read conditionally, not always', () => {
  assert.match(body, /agent-surface\.md`?\s+only (if|when)/i);
  assert.match(body, /dependencies\.md`?\s+only (if|when)/i);
});

test('the references the body names exist in the shipped payload', () => {
  for (const f of ['diff-review.md', 'agent-surface.md', 'dependencies.md']) {
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
