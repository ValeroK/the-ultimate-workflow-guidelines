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
    filter: (src) => !/ultimate-workflow[\\/](fixtures|architecture-evals|skills)([\\/]|$)/.test(src),
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
  'agent stops pointing at the shared protocol': (t) => edit(agentFile(t), (s) => s.replace(/experts\/protocol\.md/g, 'the usual rules')),
  'agent restates the protocol threshold': (t) => edit(agentFile(t), (s) => `${s}\nReport only findings rated 8 or above.\n`),
  'agent loses its Goal': (t) => edit(agentFile(t), (s) => s.replace(/^## Goal\s*\n[\s\S]*?(?=^## )/m, '')),
  'agent Goal loses what it is not for': (t) => edit(agentFile(t), (s) => s.replace('**Not the goal:**', '**Also:**')),
  'agent loses its Responsibilities rubric': (t) => edit(agentFile(t), (s) => s.replace(/^## Responsibilities\s*\n[\s\S]*?(?=^## )/m, '')),
  'agent rubric drops the owner column': (t) => edit(agentFile(t), (s) => s.replace("Not this expert's (owner)", 'Not this expert')),
  'agent loses readonly': (t) => edit(agentFile(t), (s) => s.replace('readonly: true', 'readonly: false')),
  'agent name does not match the file': (t) => edit(agentFile(t), (s) => s.replace('name: uw-expert-security', 'name: uw-expert-secure')),
  'agent loses How to judge': (t) => edit(agentFile(t), (s) => s.replace(/^## How to judge/m, '## Notes')),
  'agent has no description a model could choose by': (t) => edit(agentFile(t), (s) => s.replace(/^description: .*$/m, 'description: Security.')),
  'agent description is still the template note': (t) => edit(agentFile(t), (s) => s.replace(/^description: .*$/m, 'description: Security expert. Applies when FILL-IN: say when, in one or two sentences, please.')),
  'agent declares a stage that does not exist': (t) => edit(agentFile(t), (s) => s.replace(/^stages: .*$/m, 'stages: [plan, ship]')),
  'agent declares no stages line': (t) => edit(agentFile(t), (s) => s.replace(/^stages: .*\n/m, '')),
  'a declared stage has no reference file': (t) => fs.rmSync(ref(t, 'tests.md')),
  'a declared stage reference is never named by the agent': (t) =>
    edit(agentFile(t), (s) => s.replace(/^\s*- At the \*\*tests\*\* stage.*\n/m, '')),
  'a reference exists but the agent never names it': (t) => fs.writeFileSync(ref(t, 'orphan.md'), '# orphan\n'),
  'the agent names a reference that does not exist': (t) =>
    edit(agentFile(t), (s) => `${s}\n- Read \`experts/security/references/ghost.md\` only if the diff touches ghosts.\n`),
  'the review reference loses a required section': (t) =>
    edit(ref(t, 'review.md'), (s) => s.replace(/^## Severity here[\s\S]*?(?=^## |$(?![\s\S]))/m, '')),
  'the review reference demands a finding': (t) => edit(ref(t, 'review.md'), (s) => `${s}\n## Scope note\nAlways report at least one issue.\n`),
  'the review reference restates the protocol result form': (t) => edit(ref(t, 'review.md'), (s) => `${s}\n## Result\n\nReturn findings in the shape the workflow gives you.\n`),
  'a review category has no counter-case': (t) => edit(ref(t, 'review.md'), (s) => s.replace(/^(- \*\*Injection\.\*\*.*?) Not when[^\n]*$/m, '$1')),
  'the review method has no stop rule': (t) => edit(ref(t, 'review.md'), (s) => s.replace(/\bstop\b/gi, 'pause')),
  'the plan reference loses its outcome line': (t) => edit(ref(t, 'plan.md'), (s) => s.replace('**Outcome of this stage:**', 'Outcome:')),
  'the plan reference defines what to return': (t) => edit(ref(t, 'plan.md'), (s) => `${s}\n## What to return\n\n- **constraints**: at most six.\n`),
  'the plan reference loses its good and rejected constraint': (t) => edit(ref(t, 'plan.md'), (s) => s.replace('## A good constraint, and a rejected one', '## Examples')),
  'the tests reference loses its worked case': (t) => edit(ref(t, 'tests.md'), (s) => s.replace('## One worked case', '## A case')),
  'a reference lists skills': (t) => edit(ref(t, 'review.md'), (s) => `${s}\n## Skills\n\n- test-craft\n`),
  'selection negatives are not near misses': (t) => edit(path.join(t.examples, 'security.json'), (s) => s.replace(/ \(owner: [a-z-]+\)/g, '')),
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

// Shared skills (experts/skills/<name>/skill.md). Each rule is shown to fail.
test('shared skills: the real tree names only skills that exist, each with a cue, each with a notice', () => {
  const t = copyTree();
  assert.ok(fs.existsSync(path.join(t.payload, 'experts', 'skills', 'failure-handling', 'skill.md')), 'the copied tree keeps experts/skills');
  assert.deepStrictEqual(all(t).filter((p) => /experts\/skills/.test(p)), []);
});

test('shared skills: a listed skill that does not exist is reported', () => {
  const t = copyTree();
  fs.rmSync(path.join(t.payload, 'experts', 'skills', 'failure-handling'), { recursive: true });
  assert.ok(all(t).some((p) => /developer\/skills\.md lists failure-handling at \w+, and experts\/skills\/failure-handling\/skill\.md does not exist/.test(p)));
});

test('shared skills: a reference that lists skills is reported, because skills.md is their one home', () => {
  const t = copyTree();
  fs.appendFileSync(path.join(t.payload, 'experts', 'developer', 'references', 'review.md'), '\n## Skills\n\n- `experts/skills/go-craft/skill.md` (files: *.go): load when Go.\n');
  assert.ok(all(t).some((p) => /developer\/references\/review\.md lists skills; they belong in experts\/developer\/skills\.md/.test(p)));
});

test('shared skills: in skills.md, a line with no selector, a bad one, or a selector at plan is reported', () => {
  const t = copyTree();
  const file = path.join(t.payload, 'experts', 'developer', 'skills.md');
  const text = fs.readFileSync(file, 'utf8');
  const review = text.indexOf('## review');
  const fixed = text.slice(0, review) + text.slice(review)
    .replace('- go-craft (files: *.go, go.mod)', '- go-craft')
    .replace('- rust-craft (files: *.rs, Cargo.toml)', '- rust-craft (added: [unclosed)')
    .replace('- java-craft (files: *.java, pom.xml, build.gradle, build.gradle.kts)', '- java-craft (sometimes)');
  fs.writeFileSync(file, fixed.replace('## plan\n\n- engineering-principles', '## plan\n\n- engineering-principles (always)'));
  const problems = all(t);
  assert.ok(problems.some((p) => /skills\.md: review: go-craft has no "\(selector\)"/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /skills\.md: review: rust-craft: "added: \[unclosed"/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /skills\.md: review: java-craft: "sometimes" is not a selector/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /skills\.md: plan: engineering-principles has a selector/.test(p)), problems.join('\n'));
});

test('shared skills: a skill without frontmatter, with the wrong name, or with no description is reported', () => {
  const t = copyTree();
  const skills = path.join(t.payload, 'experts', 'skills');
  const strip = (n) => { const f = path.join(skills, n, 'skill.md'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/^---\n[\s\S]*?\n---\n\n/, '')); };
  strip('go-craft');
  const edit = (n, fn) => { const f = path.join(skills, n, 'skill.md'); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };
  edit('rust-craft', (s) => s.replace('name: rust-craft', 'name: rust'));
  edit('java-craft', (s) => s.replace(/^description: .*$/m, 'description: Java'));
  const p = all(t).join('\n');
  assert.match(p, /go-craft\/skill\.md must open with frontmatter/);
  assert.match(p, /rust-craft\/skill\.md: frontmatter name must be "rust-craft"/);
  assert.match(p, /java-craft\/skill\.md: frontmatter needs a description/);
});

test('shared skills: a skill no expert names, one without a notice, an oversized one, one that fetches, and a SKILL.md are each reported', () => {
  const t = copyTree();
  const skills = path.join(t.payload, 'experts', 'skills');
  fs.mkdirSync(path.join(skills, 'orphan'));
  fs.writeFileSync(path.join(skills, 'orphan', 'skill.md'), '---\nname: orphan\ndescription: Use when nothing at all ever applies to a change.\n---\n\n# Orphan\n');
  fs.writeFileSync(path.join(skills, 'orphan', 'NOTICE.md'), 'ours\n');
  fs.rmSync(path.join(skills, 'engineering-principles', 'NOTICE.md'));
  const fh = path.join(skills, 'failure-handling', 'skill.md');
  fs.appendFileSync(fh, `\n${'x'.repeat(17 * 1024)}\nRun curl to get more.\n`);
  fs.writeFileSync(path.join(skills, 'failure-handling', 'SKILL.md'), '# x\n');
  const p = all(t).join('\n');
  assert.match(p, /experts\/skills\/orphan\/skill\.md is listed by no expert's skills\.md/);
  assert.match(p, /experts\/skills\/engineering-principles has no NOTICE\.md/);
  assert.match(p, /experts\/skills\/failure-handling\/skill\.md is \d+ bytes; the cap is 16384/);
  assert.match(p, /failure-handling\/skill\.md must not tell a reader to fetch/);
  assert.match(p, /name the file skill\.md, not SKILL\.md/);
});

test('no two experts claim the same Responsibilities area, and every example owner is a sibling', () => {
  // Two rubrics with one area is two experts judging the same item; the border column exists so
  // that never happens. A near miss names its owner, which must be an expert that exists or is
  // planned in some rubric's owner column.
  const agents = fs.readdirSync(path.join(PAYLOAD, 'agents')).filter((f) => /^uw-expert-.*\.md$/.test(f));
  const seen = new Map();
  const names = new Set();
  for (const f of agents) {
    const name = f.replace(/^uw-expert-|\.md$/g, '');
    names.add(name);
    const text = fs.readFileSync(path.join(PAYLOAD, 'agents', f), 'utf8');
    const resp = (/^## Responsibilities\s*\n([\s\S]*?)(?=^## )/m.exec(text) || [])[1] || '';
    for (const row of resp.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/\|\s*Area\s*\|/.test(l))) {
      const area = row.split('|')[1].trim().toLowerCase();
      assert.ok(!seen.has(area), `"${area}" is claimed by both ${seen.get(area)} and ${name}`);
      seen.set(area, name);
    }
  }
  for (const f of fs.readdirSync(EXAMPLES).filter((x) => x.endsWith('.json'))) {
    const ex = JSON.parse(fs.readFileSync(path.join(EXAMPLES, f), 'utf8'));
    for (const s of ex.does_not_apply || []) {
      const m = /\(owner: ([a-z-]+)\)/.exec(s);
      if (m) assert.ok(names.has(m[1]) && `${m[1]}.json` !== f, `${f}: "${s}" names ${m[1]}, which is not a sibling expert`);
    }
  }
});

test('no shipped reference or skill quotes an eval corpus case, which would leak it into the expert', () => {
  // A worked example taken from a held-out case biases every later run in the expert's favour.
  const corpusDir = path.join(__dirname, 'corpus');
  const needles = [];
  const files = fs.readdirSync(corpusDir).filter((x) => x.endsWith('.json') && x !== 'MANIFEST.json');
  // Every corpus the eval can run, hard sets included, is in what this guard reads.
  for (const key of require('./eval/lib/corpus.js').listCorpora()) assert.ok(files.includes(`${key}.json`), `the leak guard does not read corpus ${key}`);
  for (const f of files) {
    const c = JSON.parse(fs.readFileSync(path.join(corpusDir, f), 'utf8'));
    for (const x of Array.isArray(c) ? c : c.cases || []) {
      if (x.id) needles.push(x.id);
      if (typeof x.summary === 'string' && x.summary.length > 30) needles.push(x.summary.toLowerCase());
    }
  }
  assert.ok(needles.length > 50, 'the corpora were read');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const shipped = [...walk(path.join(PAYLOAD, 'experts')), ...walk(path.join(PAYLOAD, 'agents'))].filter((f) => f.endsWith('.md'));
  for (const f of shipped) {
    const t = fs.readFileSync(f, 'utf8').toLowerCase();
    const hit = needles.find((n) => t.includes(n));
    assert.ok(!hit, `${path.relative(PAYLOAD, f)} contains corpus text: ${hit}`);
  }
});
