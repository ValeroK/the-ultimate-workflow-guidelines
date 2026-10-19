'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { lintChecklist } = require('./lib/checklist-lint.js');

const REFS = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'security', 'references');
const read = (f) => fs.readFileSync(path.join(REFS, f), 'utf8');
const CORE = read('diff-review.md');

// A lint over prose proves the file has no KNOWN defects, nothing more. What it
// can do honestly is reject the specific ways a checklist goes wrong, and prove it
// does by feeding it deliberately broken copies: a lint that passes a mutant is a
// failing test. Whether the checklist is any good is measured by the eval, not here.

test('the real core checklist passes the lint', () => {
  assert.deepStrictEqual(lintChecklist(CORE), []);
});

function addToSection(text, heading, extra) {
  const re = new RegExp(`(^## ${heading}[^\\n]*\\n[\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm');
  const next = text.replace(re, (m) => `${m.trimEnd()}\n${extra}\n\n`);
  assert.notStrictEqual(next, text, `section "${heading}" not found to mutate`);
  return next;
}

const MUTANTS = {
  'demands at least one finding': (t) => addToSection(t, 'Scope', 'Always report at least one issue so the review feels useful.'),
  'lowers the threshold to 1': (t) => {
    const out = t.replace(/(report only[^.\n]*?)\b8 or above/i, '$11 or above');
    assert.notStrictEqual(out, t, 'threshold sentence not found to mutate');
    return out;
  },
  'excludes markdown from review': (t) => addToSection(t, 'Do not report', '- Findings in markdown files.'),
  'excludes AI prompt injection': (t) => addToSection(t, 'Do not report', '- Including user-controlled content in AI system prompts.'),
  'excludes outdated third-party libraries': (t) => addToSection(t, 'Do not report', '- Outdated third-party libraries, which are managed separately.'),
  'excludes CI workflows': (t) => addToSection(t, 'Do not report', '- Anything under .github/.'),
  'adds a second confidence scale': (t) => addToSection(t, 'Confidence', 'Treat 0.7 as the working cutoff.'),
  'adds a percentage scale': (t) => addToSection(t, 'Method', 'Only flag issues you are over 80% sure of.'),
  'removes the no-findings result': (t) => {
    const out = t.replace(/No security findings/g, 'Nothing to report');
    assert.notStrictEqual(out, t);
    return out;
  },
  'adds inline shell injection': (t) => `${t}\n!\`git diff\`\n`,
  'duplicates a list number': (t) => addToSection(t, 'Method', '1. First.\n2. Second.\n2. Second again.'),
  'drops the untrusted-input section': (t) => t.replace(/^## Untrusted input[\s\S]*?(?=^## |$(?![\s\S]))/m, ''),
  'drops the callers rule': (t) => t.replace(/callers/gi, 'users'),
};

for (const [name, mutate] of Object.entries(MUTANTS)) {
  test(`the lint rejects a checklist that ${name}`, () => {
    const problems = lintChecklist(mutate(CORE));
    assert.ok(problems.length > 0, `mutant "${name}" passed the lint`);
  });
}

test('the lint reports what is wrong in words a maintainer can act on', () => {
  const problems = lintChecklist(addToSection(CORE, 'Scope', 'Always report at least one issue.'));
  assert.ok(problems.some((p) => /at least one|always report/i.test(p)), problems.join(' | '));
});

test('the conditional references exist and carry their own rules', () => {
  const deps = read('dependencies.md');
  assert.match(deps, /not provided/i, 'must say what to write when no audit was supplied');
  assert.match(deps, /never (write|say|report)[^.\n]*clean/i, '"not provided" must never read as "clean"');
  assert.match(deps, /tier 1/i);
  assert.match(deps, /from memory/i);
  assert.match(deps, /confirm/i);
  const surface = read('agent-surface.md');
  assert.match(surface, /prompt injection/i);
  assert.match(surface, /\.mcp\.json/);
  assert.match(surface, /workflow/i);
});

test('every reference is a plain markdown file with no inline shell lines and no emojis', () => {
  for (const f of ['diff-review.md', 'dependencies.md', 'agent-surface.md']) {
    const text = read(f);
    assert.ok(!/^!/m.test(text) && !text.includes('!`'), `${f} has inline shell injection`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(text), `${f} contains an emoji`);
  }
});

test('CHANGES.md records the upstream commit and what was changed from it', () => {
  const changes = read('CHANGES.md');
  assert.match(changes, /0c6a49f1fa56a1d472575da86a94dbc1edb78eda/);
  for (const topic of [/confidence/i, /no-findings|no findings/i, /prompt/i, /markdown/i, /librar/i]) {
    assert.match(changes, topic, `CHANGES.md should account for ${topic}`);
  }
});
