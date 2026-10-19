'use strict';

// The expert contract: what must be true of every domain expert registered in the
// plugin. It is the executable half of memory/adding-experts.md. A contributor adds
// an expert by following the cookbook; this says, in words, what they missed.
// Each rule exists because adding the first expert showed that it can be forgotten
// or broken silently.

const fs = require('node:fs');
const path = require('node:path');
const { lintChecklist, SECURITY_PROFILE, GENERIC_PROFILE } = require('../../security-expert/lib/checklist-lint.js');
const { stripMeta } = require('../../security-expert/lib/run-workflow.js');

// Read-only by default. Widening an expert's tools is a decision about what an
// untrusted diff can make it do, so it is declared here, in a reviewed edit, and
// never by quietly changing the agent file.
const DEFAULT_TOOLS = ['Glob', 'Grep', 'Read'];
const DECLARED_TOOLS = {
  // Decided by the maintainer on 2026-10-19: the security expert may run read-only
  // commands and look facts up on the web, accepting that a diff it reads can try to
  // steer it. The agent file must state the rules it follows (the contract below
  // requires them), and the dependency audit still runs as a script outside the model.
  security: ['Bash', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
};

// What a domain's checklist must not exclude and must mention depends on the domain.
const LINT_PROFILES = { security: SECURITY_PROFILE };

const BYTE_BUDGET = 60 * 1024;
const MIN_EXAMPLES = 3;

function freshRequire(file) {
  const resolved = require.resolve(file);
  delete require.cache[resolved];
  return require(resolved);
}

function reviewRegistry(payloadDir) {
  const src = fs.readFileSync(path.join(payloadDir, 'workflows', 'review.js'), 'utf8');
  const literal = src.match(/const EXPERTS = \{([^}]*)\}/);
  const out = {};
  if (literal) for (const m of literal[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) out[m[1]] = m[2];
  return out;
}

function routeRules(payloadDir) {
  return Object.keys(freshRequire(path.join(payloadDir, 'experts', 'route.js')).RULES);
}

function registeredExperts(payloadDir) {
  return [...new Set([...Object.keys(reviewRegistry(payloadDir)), ...routeRules(payloadDir)])].sort();
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body: m[2] };
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    out.push(p);
    if (e.isDirectory()) walk(p, out);
  }
  return out;
}

function checkExpert({ payloadDir, examplesDir, name, declaredTools = DECLARED_TOOLS }) {
  const problems = [];
  const bad = (msg) => problems.push(`${name}: ${msg}`);
  const agentName = `uw-expert-${name}`;

  // 1. Registered in both places that must agree.
  const registry = reviewRegistry(payloadDir);
  if (registry[name] !== agentName) bad(`not registered in workflows/review.js EXPERTS as '${agentName}'`);
  if (!routeRules(payloadDir).includes(name)) bad('no routing rules in experts/route.js RULES, so a plan can never select it');

  // 2. The agent file.
  const agentFile = path.join(payloadDir, 'agents', `${agentName}.md`);
  let agent = null;
  if (!fs.existsSync(agentFile)) bad(`agent file agents/${agentName}.md is missing`);
  else agent = frontmatter(fs.readFileSync(agentFile, 'utf8'));
  if (fs.existsSync(agentFile) && !agent) bad('agent file has no frontmatter block');

  let body = '';
  if (agent) {
    body = agent.body;
    const { fm } = agent;
    if (fm.name !== agentName) bad(`frontmatter name is '${fm.name}' but the file is ${agentName}.md`);
    if (!fm.description || fm.description.length < 20) bad('frontmatter needs a description of at least 20 characters');
    const allowed = (declaredTools[name] || DEFAULT_TOOLS).slice().sort();
    const actual = String(fm.tools || '').split(',').map((t) => t.trim()).filter(Boolean).sort();
    if (JSON.stringify(allowed) !== JSON.stringify(actual)) {
      bad(`tools are "${actual.join(', ')}" but the contract allows "${allowed.join(', ')}"; widening needs an entry in DECLARED_TOOLS in evals/experts/lib/contract.js and a reviewer's yes`);
    }
    if (fm.readonly !== 'true') bad('frontmatter must set readonly: true (the Cursor equivalent of the tool allowlist)');
    if (!/zero findings/i.test(body)) bad('the body must say that zero findings is a correct answer');
    if (!/untrusted/i.test(body)) bad('the body must say that everything it reads is untrusted data');
    if (!actual.includes('Bash') && !/no shell/i.test(body)) bad('the body must say the expert has no shell');
    if (actual.includes('Bash') && !/read-only commands/i.test(body)) bad('the expert can run commands, so its body must say it runs read-only commands only');
    const web = actual.includes('WebFetch') || actual.includes('WebSearch');
    if (web && !/never (put|send|include)[^.\n]*(repository|code|secret)/i.test(body)) {
      bad('the expert can reach the web, so its body must say never to put repository contents, secrets or code into a query or URL');
    }
    if (web && !/untrusted[^.\n]*(web|fetched|search)|fetched[^.\n]*untrusted/i.test(body)) {
      bad('the expert can reach the web, so its body must say that fetched content is untrusted too');
    }
    if (/FILL-IN/.test(body)) bad('the agent file still has a FILL-IN note from the template');
  }

  // 3. References: every file is reachable from the agent and every named file exists.
  const refDir = path.join(payloadDir, 'experts', name, 'references');
  const files = fs.existsSync(refDir) ? fs.readdirSync(refDir).filter((f) => f.endsWith('.md')) : [];
  if (files.length === 0) bad(`experts/${name}/references/ has no markdown reference`);
  if (agent) {
    const named = [...new Set([...body.matchAll(new RegExp(`experts/${name}/references/([A-Za-z0-9._-]+\\.md)`, 'g'))].map((m) => m[1]))];
    for (const f of named) if (!files.includes(f)) bad(`the agent names experts/${name}/references/${f}, which does not exist`);
    for (const f of files) {
      if (f === 'CHANGES.md') continue; // a record for maintainers; the agent never loads it
      if (!named.includes(f)) bad(`experts/${name}/references/${f} exists but the agent never names it, so it is never loaded`);
    }
    const core = body.match(new RegExp(`Always read \`experts/${name}/references/([^\`]+)\``));
    if (!core) bad(`the agent must name a core reference as: Always read \`experts/${name}/references/<file>\``);
    else if (files.includes(core[1])) {
      const lint = lintChecklist(fs.readFileSync(path.join(refDir, core[1]), 'utf8'), LINT_PROFILES[name] || GENERIC_PROFILE);
      for (const p of lint) bad(`core reference ${core[1]}: ${p}`);
      if (/FILL-IN/.test(fs.readFileSync(path.join(refDir, core[1]), 'utf8'))) bad(`core reference ${core[1]} still has a FILL-IN note from the template`);
    }
  }

  // 4. Hygiene of the shipped directory.
  const dir = path.join(payloadDir, 'experts', name);
  const all = walk(dir);
  if (all.some((p) => path.basename(p) === 'SKILL.md')) bad('a SKILL.md under the expert would put a description in the main context on every turn');
  if (all.some((p) => /\.test\.js$/.test(p) || path.basename(p) === 'fixtures')) bad('tests and fixtures belong under repo-root evals/, which the plugin ZIP never contains');
  const bytes = all.filter((p) => fs.statSync(p).isFile()).reduce((n, p) => n + fs.statSync(p).size, 0);
  if (bytes > BYTE_BUDGET) bad(`experts/${name} is ${bytes} bytes; the budget is ${BYTE_BUDGET}`);
  if (files.includes('CHANGES.md') && !fs.existsSync(path.join(dir, 'NOTICE.md'))) {
    bad('references/CHANGES.md records adapted third-party content, so experts/' + name + '/NOTICE.md with the licence must ship');
  }

  // 5. Routing examples, checked against the router.
  const exFile = path.join(examplesDir, `${name}.json`);
  if (!fs.existsSync(exFile)) bad(`routing examples missing: evals/experts/examples/${name}.json`);
  else {
    let ex;
    try {
      ex = JSON.parse(fs.readFileSync(exFile, 'utf8'));
    } catch (err) {
      bad(`routing examples are not valid JSON (${err.message})`);
    }
    if (ex) {
      const routes = ex.routes || [];
      const ignores = ex.ignores || [];
      if (routes.length < MIN_EXAMPLES || ignores.length < MIN_EXAMPLES) {
        bad(`routing examples need at least ${MIN_EXAMPLES} paths that route and ${MIN_EXAMPLES} that do not`);
      }
      const router = freshRequire(path.join(payloadDir, 'experts', 'route.js'));
      for (const p of routes) if (!router.routeExperts([p]).includes(name)) bad(`routing example "${p}" is expected to route here but does not`);
      for (const p of ignores) if (router.routeExperts([p]).includes(name)) bad(`routing example "${p}" is expected to be ignored but routes here`);
    }
  }
  return problems;
}

// The registries are read with a regex, so a bad edit (a missing comma) would still
// register. Compile the workflow the way the runtime would, so it cannot.
function workflowParses(payloadDir) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', stripMeta(fs.readFileSync(path.join(payloadDir, 'workflows', 'review.js'), 'utf8')));
    return null;
  } catch (err) {
    return err.message;
  }
}

function checkAll({ payloadDir, examplesDir, declaredTools }) {
  const names = registeredExperts(payloadDir);
  const problems = [];
  const parseError = workflowParses(payloadDir);
  if (parseError) problems.push(`workflows/review.js does not parse (${parseError}); check the registry edit for a missing comma`);
  for (const name of names) problems.push(...checkExpert({ payloadDir, examplesDir, name, declaredTools }));
  const agentsDir = path.join(payloadDir, 'agents');
  for (const f of fs.readdirSync(agentsDir).filter((x) => /^uw-expert-.+\.md$/.test(x))) {
    const n = f.replace(/^uw-expert-/, '').replace(/\.md$/, '');
    if (!names.includes(n)) problems.push(`${n}: agents/${f} has no registry entry in review.js or route.js`);
  }
  return problems;
}

module.exports = { checkExpert, checkAll, registeredExperts, DEFAULT_TOOLS, DECLARED_TOOLS };
