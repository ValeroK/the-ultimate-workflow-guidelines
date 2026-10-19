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
// Every expert the plugin discovers must satisfy it; adding one half-way fails here
// and says what is missing. The mutants below prove each rule can fail: a contract
// that cannot fail certifies nothing.

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
const all = (t) => checkAll({ payloadDir: t.payload, examplesDir: t.examples });

test('the real tree satisfies the contract for every expert it discovers', () => {
  assert.deepStrictEqual(checkAll({ payloadDir: PAYLOAD, examplesDir: EXAMPLES }), []);
});

test('the security expert is discovered from the agents folder, with no registry anywhere', () => {
  assert.ok(registeredExperts(PAYLOAD).includes('security'));
  const review = fs.readFileSync(path.join(PAYLOAD, 'workflows', 'review.js'), 'utf8');
  assert.ok(!/const EXPERTS\s*=/.test(review), 'review.js must not carry a hardcoded expert registry');
  assert.ok(!fs.existsSync(path.join(PAYLOAD, 'experts', 'route.js')), 'the keyword router is gone');
});

const edit = (file, fn) => fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
const agentFile = (t) => path.join(t.payload, 'agents', 'uw-expert-security.md');
const ref = (t, f) => path.join(t.payload, 'experts', 'security', 'references', f);

const MUTANTS = {
  'agent file removed': (t) => fs.rmSync(agentFile(t)),
  'agent gains a write tool': (t) => edit(agentFile(t), (s) => s.replace(/^tools: .*$/m, (line) => `${line}, Write`)),
  'agent loses a declared tool': (t) => edit(agentFile(t), (s) => s.replace(', WebSearch', '')),
  'agent drops the rule to run read-only commands only': (t) => edit(agentFile(t), (s) => s.replace(/read-only commands/gi, 'commands')),
  'agent can reach the web but drops the rule against leaking repository contents': (t) =>
    edit(agentFile(t), (s) => s.replace(/never put repository contents/gi, 'feel free to include context')),
  'agent can reach the web but drops the rule that fetched content is untrusted': (t) =>
    edit(agentFile(t), (s) => s.replace(/fetched content is untrusted/gi, 'fetched content is reliable')),
  'agent loses readonly': (t) => edit(agentFile(t), (s) => s.replace('readonly: true', 'readonly: false')),
  'agent name does not match the file': (t) => edit(agentFile(t), (s) => s.replace('name: uw-expert-security', 'name: uw-expert-secure')),
  'agent drops the zero-findings rule': (t) => edit(agentFile(t), (s) => s.replace(/zero findings/gi, 'a quiet result').replace(/zero constraints/gi, 'a quiet result')),
  'agent drops the untrusted-data rule': (t) => edit(agentFile(t), (s) => s.replace(/untrusted/gi, 'unusual')),
  'agent has no description a model could choose by': (t) => edit(agentFile(t), (s) => s.replace(/^description: .*$/m, 'description: Security.')),
  'agent description is still the template note': (t) => edit(agentFile(t), (s) => s.replace(/^description: .*$/m, 'description: Security expert. Applies when FILL-IN: say when, in one or two sentences, please.')),
  'agent declares a stage that does not exist': (t) => edit(agentFile(t), (s) => s.replace(/^stages: .*$/m, 'stages: [plan, ship]')),
  'agent declares no stages line': (t) => edit(agentFile(t), (s) => s.replace(/^stages: .*\n/m, '')),
  'a declared stage has no reference file': (t) => fs.rmSync(ref(t, 'tests.md')),
  'a declared stage reference is never named by the agent': (t) =>
    edit(agentFile(t), (s) => s.replace(/^- At the \*\*tests\*\* stage.*\n/m, '')),
  'a reference exists but the agent never names it': (t) => fs.writeFileSync(ref(t, 'orphan.md'), '# orphan\n'),
  'the agent names a reference that does not exist': (t) =>
    edit(agentFile(t), (s) => `${s}\n- Read \`experts/security/references/ghost.md\` only if the diff touches ghosts.\n`),
  'the review reference loses a required section': (t) =>
    edit(ref(t, 'review.md'), (s) => s.replace(/^## Untrusted input[\s\S]*?(?=^## |$(?![\s\S]))/m, '')),
  'the review reference demands a finding': (t) => edit(ref(t, 'review.md'), (s) => `${s}\n## Scope note\nAlways report at least one issue.\n`),
  'the plan reference no longer allows an empty answer': (t) => edit(ref(t, 'plan.md'), (s) => s.replace(/zero constraints/gi, 'some constraints')),
  'the plan reference no longer caps what it returns': (t) => edit(ref(t, 'plan.md'), (s) => s.replace(/at most/gi, 'as many as needed')),
  'the tests reference stops calling what it reads data': (t) => edit(ref(t, 'tests.md'), (s) => s.replace(/data, not instructions/gi, 'ground truth')),
  'a template guidance note was never filled in': (t) => edit(ref(t, 'review.md'), (s) => `${s}\nFILL-IN: say what this domain checks.\n`),
  'a plan reference still has a template note': (t) => edit(ref(t, 'plan.md'), (s) => `${s}\nFILL-IN: say what to look at.\n`),
  'a SKILL.md appears under the expert, putting a description in the main context': (t) =>
    fs.writeFileSync(path.join(t.payload, 'experts', 'security', 'SKILL.md'), '---\nname: x\ndescription: y\n---\n'),
  'a test file appears in the shipped expert directory': (t) => fs.writeFileSync(path.join(t.payload, 'experts', 'security', 'x.test.js'), ''),
  'adapted content without an attribution notice': (t) => fs.rmSync(path.join(t.payload, 'experts', 'security', 'NOTICE.md')),
  'selection examples missing': (t) => fs.rmSync(path.join(t.examples, 'security.json')),
  'too few selection examples': (t) => fs.writeFileSync(path.join(t.examples, 'security.json'), JSON.stringify({ applies: ['Adds a login route that checks a password'], does_not_apply: ['Fixes a typo in the README'] })),
  'a selection example is still a placeholder': (t) =>
    edit(path.join(t.examples, 'security.json'), (s) => s.replace('"applies": [', '"applies": ["REPLACE: a change that clearly needs this expert", ')),
  'the expert directory grows past its byte budget': (t) => fs.writeFileSync(ref(t, 'fat.md'), 'x'.repeat(200 * 1024)),
  'a workflow edit that leaves review.js unparseable': (t) =>
    edit(path.join(t.payload, 'workflows', 'review.js'), (s) => s.replace("const noExperts = Boolean(args && args.noExperts)", 'const noExperts = Boolean(args && args.noExperts) garbage')),
  'the lane helpers drift in one workflow': (t) =>
    edit(path.join(t.payload, 'workflows', 'tests.js'), (s) => s.replace('const asList = (v) =>', 'const asList = (v, extra) =>')),
  'a workflow loses its lane helpers': (t) =>
    edit(path.join(t.payload, 'workflows', 'plan.js'), (s) => s.replace('// --- end expert lane helpers ---', '')),
  'an expert agent file that discovery cannot read': (t) =>
    fs.writeFileSync(path.join(t.payload, 'agents', 'uw-expert-stray.md'), '---\nname: uw-expert-wrong\ndescription: A stray expert whose name does not match.\ntools: Read, Grep, Glob\nreadonly: true\n---\n\n# Stray\n'),
};

for (const [name, mutate] of Object.entries(MUTANTS)) {
  test(`the contract rejects: ${name}`, () => {
    const t = copyTree();
    mutate(t);
    const problems = /unparseable|drift|loses its lane|discovery cannot read/.test(name) ? all(t) : run(t);
    assert.ok(problems.length > 0, `mutant "${name}" passed the contract`);
  });
}

test('a failure says which expert and what is wrong, in words a contributor can act on', () => {
  const t = copyTree();
  MUTANTS['agent gains a write tool'](t);
  const problems = run(t);
  assert.ok(problems.some((p) => /security/.test(p) && /tools/i.test(p) && /Write/.test(p)), problems.join(' | '));
});

test('a missing stage reference is reported with the file the workflow would send the expert to', () => {
  const t = copyTree();
  MUTANTS['a declared stage has no reference file'](t);
  const problems = run(t);
  assert.ok(problems.some((p) => /tests stage/.test(p) && /references\/tests\.md/.test(p)), problems.join(' | '));
});

test("widening an expert's tools is possible only by declaring it in the contract, which is a reviewed edit", () => {
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

test('a workflow that does not parse is reported as such, naming the file', () => {
  const t = copyTree();
  MUTANTS['a workflow edit that leaves review.js unparseable'](t);
  const problems = all(t);
  assert.ok(problems.some((p) => /review\.js/.test(p) && /parse|syntax|unexpected/i.test(p)), problems.join(' | '));
});

test('an agent file discovery cannot read is reported with the reason, and the rest of its problems are still reported', () => {
  const t = copyTree();
  MUTANTS['an expert agent file that discovery cannot read'](t);
  const problems = all(t);
  assert.ok(problems.some((p) => /discovery/.test(p) && /uw-expert-stray/.test(p) && /expected "uw-expert-stray"/.test(p)), problems.join(' | '));
  assert.ok(problems.some((p) => /^stray:/.test(p)), 'the stray expert is also checked by name: ' + problems.join(' | '));
});
