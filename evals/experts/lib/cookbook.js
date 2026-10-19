'use strict';

// Applies docs/adding-an-expert.md to a copy of the plugin the way a contributor
// would: instantiate its labelled templates. There are no registry edits to make, so
// this writes files and nothing else. If a template rots, scaffolding stops producing
// an expert that passes the contract, and the cookbook test fails.

const fs = require('node:fs');
const path = require('node:path');

function extractTemplates(text) {
  const out = {};
  for (const m of text.matchAll(/```[a-z]*[ \t]+template:([\w-]+)\r?\n([\s\S]*?)\r?\n```/g)) out[m[1]] = m[2];
  return out;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function fillIn(template, { name, domain }) {
  return template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{Domain\}\}/g, capitalize(domain))
    .replace(/\{\{domain\}\}/g, domain);
}

const TEMPLATES = ['agent', 'plan-reference', 'tests-reference', 'review-reference', 'examples'];

/**
 * @param stages which stages the new expert joins; the agent template is written with
 *               them, and one reference file is written per stage.
 * @param fill   when set, simulate a contributor replacing each guidance note with
 *               content and the example placeholders with real situations.
 */
function scaffoldExpert({ payload, examples, cookbook, name, domain, stages = ['plan', 'tests', 'review'], fill }) {
  const t = extractTemplates(cookbook);
  for (const label of TEMPLATES) {
    if (!t[label]) throw new Error(`cannot follow the cookbook: no template:${label} block`);
  }
  const vars = { name, domain };
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`);
  };
  const filled = (s) => (fill ? s.replace(/FILL-IN:[^\n]*/g, 'A concrete item for this domain.') : s);

  // The template names a reference for every stage; keep only the stages this expert joins.
  const agentText = filled(fillIn(t.agent, vars))
    .replace(/^stages: .*$/m, `stages: [${stages.join(', ')}]`)
    .split('\n')
    .filter((line) => {
      const m = /^- At the \*\*(plan|tests|review)\*\* stage/.exec(line);
      return !m || stages.includes(m[1]);
    })
    .join('\n');
  write(path.join(payload, 'agents', `uw-expert-${name}.md`), agentText);
  for (const stage of stages) {
    write(path.join(payload, 'experts', name, 'references', `${stage}.md`), filled(fillIn(t[`${stage}-reference`], vars)));
  }

  const exFile = path.join(examples, `${name}.json`);
  write(
    exFile,
    fill
      ? JSON.stringify({ applies: fill.applies, does_not_apply: fill.does_not_apply }, null, 2)
      : fillIn(t.examples, vars)
  );
}

module.exports = { extractTemplates, scaffoldExpert, TEMPLATES };
