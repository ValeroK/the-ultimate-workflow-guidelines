'use strict';

// Applies docs/adding-an-expert.md to a copy of the plugin the way a contributor
// would: instantiate its labelled templates, then make the two registry edits it
// describes. If a template rots or an instruction stops working, scaffolding stops
// producing an expert that passes the contract, and the cookbook test fails.

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

function insertAfter(file, marker, addition) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(marker)) throw new Error(`cannot follow the cookbook: "${marker}" not found in ${path.basename(file)}`);
  fs.writeFileSync(file, src.replace(marker, () => marker + addition));
}

function scaffoldExpert({ payload, examples, cookbook, name, domain, fill }) {
  const t = extractTemplates(cookbook);
  for (const label of ['agent', 'checklist', 'examples', 'route-rule', 'review-entry']) {
    if (!t[label]) throw new Error(`cannot follow the cookbook: no template:${label} block`);
  }
  const vars = { name, domain };
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`);
  };

  write(path.join(payload, 'agents', `uw-expert-${name}.md`), fillIn(t.agent, vars));
  // With `fill`, simulate a contributor replacing each guidance note with real content.
  const filled = (s) => (fill ? s.replace(/FILL-IN:[^\n]*/g, 'A concrete item for this domain.') : s);
  write(path.join(payload, 'experts', name, 'references', 'checklist.md'), filled(fillIn(t.checklist, vars)));

  let routeRule = fillIn(t['route-rule'], vars);
  if (fill) routeRule = routeRule.replace(/REPLACE-ME/g, fill.rule);
  insertAfter(path.join(payload, 'experts', 'route.js'), 'const RULES = {\n', `${routeRule}\n`);
  insertAfter(path.join(payload, 'workflows', 'review.js'), 'const EXPERTS = {', ` ${fillIn(t['review-entry'], vars)}`);

  const exFile = path.join(examples, `${name}.json`);
  write(exFile, fill ? JSON.stringify({ routes: fill.routes, ignores: fill.ignores }, null, 2) : fillIn(t.examples, vars));
}

module.exports = { extractTemplates, scaffoldExpert };
