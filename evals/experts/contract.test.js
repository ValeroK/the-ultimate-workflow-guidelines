'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkAll, checkExpert, registeredExperts } = require('./lib/contract.js');

const ROOT = path.join(__dirname, '..', '..');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const EXAMPLES = path.join(__dirname, 'examples');

// The expert contract is the executable half of the cookbook for adding experts.
// Every registered expert must satisfy it; adding one half-way fails here and says
// what is missing. The mutants below prove each rule can fail: a contract that
// cannot fail certifies nothing.

function copyTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-contract-'));
  const payload = path.join(dir, 'payload');
  const examples = path.join(dir, 'examples');
  fs.cpSync(PAYLOAD, payload, {
    recursive: true,
    filter: (src) => !/[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(src),
  });
  fs.cpSync(EXAMPLES, examples, { recursive: true });
  return { payload, examples };
}

const run = (t, name = 'security') => checkExpert({ payloadDir: t.payload, examplesDir: t.examples, name });

test('the real tree satisfies the contract for every registered expert', () => {
  const problems = checkAll({ payloadDir: PAYLOAD, examplesDir: EXAMPLES });
  assert.deepStrictEqual(problems, []);
});

test('at least the security expert is registered, and the registries agree on the set', () => {
  const names = registeredExperts(PAYLOAD);
  assert.ok(names.includes('security'));
});

const edit = (file, fn) => fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));

const MUTANTS = {
  'agent file removed': (t) => fs.rmSync(path.join(t.payload, 'agents', 'uw-expert-security.md')),
  'agent gains a write tool': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(/^tools: .*$/m, (line) => `${line}, Write`)),
  'agent loses a declared tool': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(', WebSearch', '')),
  'agent drops the rule to run read-only commands only': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(/read-only commands/gi, 'commands')),
  'agent can reach the web but drops the rule against leaking repository contents': (t) =>
    edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(/never put repository contents/gi, 'feel free to include context')),
  'agent can reach the web but drops the rule that fetched content is untrusted': (t) =>
    edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(/fetched content is untrusted/gi, 'fetched content is reliable')),
  'agent loses readonly': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace('readonly: true', 'readonly: false')),
  'agent name does not match the file': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace('name: uw-expert-security', 'name: uw-expert-secure')),
  'agent drops the zero-findings rule': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(/zero findings/gi, 'a quiet result')),
  'agent drops the untrusted-data rule': (t) => edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => s.replace(/untrusted/gi, 'unusual')),
  'a reference exists but the agent never names it': (t) => fs.writeFileSync(path.join(t.payload, 'experts', 'security', 'references', 'orphan.md'), '# orphan\n'),
  'the agent names a reference that does not exist': (t) =>
    edit(path.join(t.payload, 'agents', 'uw-expert-security.md'), (s) => `${s}\n- Read \`experts/security/references/ghost.md\` only if the diff touches ghosts.\n`),
  'the core reference loses a required section': (t) =>
    edit(path.join(t.payload, 'experts', 'security', 'references', 'diff-review.md'), (s) => s.replace(/^## Untrusted input[\s\S]*?(?=^## |$(?![\s\S]))/m, '')),
  'the core reference demands a finding': (t) =>
    edit(path.join(t.payload, 'experts', 'security', 'references', 'diff-review.md'), (s) => `${s}\n## Scope note\nAlways report at least one issue.\n`),
  'a template guidance note was never filled in': (t) =>
    edit(path.join(t.payload, 'experts', 'security', 'references', 'diff-review.md'), (s) => `${s}\nFILL-IN: say what this domain checks.\n`),
  'a SKILL.md appears under the expert, putting a description in the main context': (t) =>
    fs.writeFileSync(path.join(t.payload, 'experts', 'security', 'SKILL.md'), '---\nname: x\ndescription: y\n---\n'),
  'a test file appears in the shipped expert directory': (t) => fs.writeFileSync(path.join(t.payload, 'experts', 'security', 'x.test.js'), ''),
  'adapted content without an attribution notice': (t) => fs.rmSync(path.join(t.payload, 'experts', 'security', 'NOTICE.md')),
  'routing examples missing': (t) => fs.rmSync(path.join(t.examples, 'security.json')),
  'a routing example that does not route': (t) =>
    edit(path.join(t.examples, 'security.json'), (s) => s.replace('"routes": [', '"routes": ["src/util/plain-helper.js", ')),
  'a routing ignore that does route': (t) =>
    edit(path.join(t.examples, 'security.json'), (s) => s.replace('"ignores": [', '"ignores": ["uv.lock", ')),
  'too few routing examples': (t) => fs.writeFileSync(path.join(t.examples, 'security.json'), JSON.stringify({ routes: ['uv.lock'], ignores: ['README.md'] })),
  'the expert directory grows past its byte budget': (t) =>
    fs.writeFileSync(path.join(t.payload, 'experts', 'security', 'references', 'fat.md'), 'x'.repeat(200 * 1024)),
  'a registry edit that leaves review.js unparseable': (t) =>
    edit(path.join(t.payload, 'workflows', 'review.js'), (s) => s.replace("'uw-expert-security' }", "'uw-expert-security' garbage }")),
  'registered for review but never for routing': (t) =>
    edit(path.join(t.payload, 'workflows', 'review.js'), (s) => s.replace(/(const EXPERTS = \{)/, "$1 ghost: 'uw-expert-ghost',")),
  'an expert agent with no registry entry': (t) =>
    fs.writeFileSync(
      path.join(t.payload, 'agents', 'uw-expert-stray.md'),
      '---\nname: uw-expert-stray\ndescription: A stray expert nobody registered.\ntools: Read, Grep, Glob\nreadonly: true\n---\n\n# Stray\n'
    ),
};

for (const [name, mutate] of Object.entries(MUTANTS)) {
  test(`the contract rejects: ${name}`, () => {
    const t = copyTree();
    mutate(t);
    const problems = name.includes('registry entry') || name.includes('never for routing') || name.includes('unparseable')
      ? checkAll({ payloadDir: t.payload, examplesDir: t.examples })
      : run(t);
    assert.ok(problems.length > 0, `mutant "${name}" passed the contract`);
  });
}

test('a failure says which expert and what is wrong, in words a contributor can act on', () => {
  const t = copyTree();
  MUTANTS['agent gains a write tool'](t);
  const problems = run(t);
  assert.ok(problems.some((p) => /security/.test(p) && /tools/i.test(p) && /Write/.test(p)), problems.join(' | '));
});

test('widening an expert\'s tools is possible only by declaring it in the contract, which is a reviewed edit', () => {
  const t = copyTree();
  MUTANTS['agent gains a write tool'](t);
  const widened = checkExpert({
    payloadDir: t.payload,
    examplesDir: t.examples,
    name: 'security',
    declaredTools: { security: ['Bash', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch', 'Write'] },
  });
  assert.deepStrictEqual(widened.filter((p) => /tools/i.test(p)), []);
});

test('a review.js that does not parse is reported as such, not as a missing file', () => {
  const t = copyTree();
  MUTANTS['a registry edit that leaves review.js unparseable'](t);
  const problems = checkAll({ payloadDir: t.payload, examplesDir: t.examples });
  assert.ok(problems.some((p) => /review\.js/.test(p) && /parse|syntax/i.test(p)), problems.join(' | '));
  assert.strictEqual(problems.filter((p) => !/review\.js/.test(p)).length, 0, 'nothing else is wrong in this mutant: ' + problems.join(' | '));
});
