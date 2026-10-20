'use strict';

// The expert contract: what must be true of every domain expert in the plugin. It is
// the executable half of docs/adding-an-expert.md. A contributor adds an expert by
// following the cookbook; this says, in words, what they missed. Each rule exists
// because adding the first expert showed that it can be forgotten or broken silently.
//
// An expert exists when agents/uw-expert-<name>.md exists. There is no registry to
// agree with, so the contract starts from what experts/experts.js discovers.

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
  // Decided by the maintainer on 2026-10-20: the role experts may look facts up on the
  // web at the plan and review stages. All four may search and fetch pages (the maintainer overrode the
  // search-only recommendation for developer the same day). Same rules as
  // security: public identifiers only in a query, fetched content is untrusted.
  developer: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
  architect: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
  softarch: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
  quality: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
};

// What a domain's checklist must not exclude and must mention depends on the domain.
const LINT_PROFILES = { security: SECURITY_PROFILE };

const BYTE_BUDGET = 60 * 1024;
const { BRIEF_BYTES } = require(path.join(__dirname, '..', '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'experts.js'));
const MIN_EXAMPLES = 3;
const STAGES = ['plan', 'tests', 'review'];
const LANE_WORKFLOWS = ['plan.js', 'tests.js', 'review.js'];

function freshRequire(file) {
  const resolved = require.resolve(file);
  delete require.cache[resolved];
  return require(resolved);
}

/** What the plugin itself discovers, using the payload's own experts.js. */
function discover(payloadDir) {
  return freshRequire(path.join(payloadDir, 'experts', 'experts.js')).list(payloadDir);
}

function registeredExperts(payloadDir) {
  return discover(payloadDir).experts.map((e) => e.name).sort();
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

  // 1. The agent file, and whether the plugin can discover it.
  const agentFile = path.join(payloadDir, 'agents', `${agentName}.md`);
  let agent = null;
  if (!fs.existsSync(agentFile)) bad(`agent file agents/${agentName}.md is missing`);
  else agent = frontmatter(fs.readFileSync(agentFile, 'utf8'));
  if (fs.existsSync(agentFile) && !agent) bad('agent file has no frontmatter block');

  const found = discover(payloadDir);
  const discovered = found.experts.find((e) => e.name === name);
  if (fs.existsSync(agentFile) && !discovered) {
    const why = found.problems.filter((p) => p.startsWith(`${agentName}.md`));
    bad(`experts/experts.js cannot discover it, so it can never be selected${why.length ? `: ${why.join('; ')}` : ''}`);
  }
  const stages = discovered ? discovered.stages : [];

  let body = '';
  if (agent) {
    body = agent.body;
    const { fm } = agent;
    if (fm.name !== agentName) bad(`frontmatter name is '${fm.name}' but the file is ${agentName}.md`);
    if (!fm.description || fm.description.length < 40) {
      bad('frontmatter needs a description of at least 40 characters: it is the line a model reads to decide whether this expert applies, so say when it applies');
    }
    if (/FILL-IN/.test(fm.description || '')) bad('the description still has a FILL-IN note from the template');
    if (!fm.stages) bad('frontmatter needs stages, a list drawn from plan, tests, build, review (for example: stages: [plan, review])');
    const allowed = (declaredTools[name] || DEFAULT_TOOLS).slice().sort();
    const actual = String(fm.tools || '').split(',').map((t) => t.trim()).filter(Boolean).sort();
    if (JSON.stringify(allowed) !== JSON.stringify(actual)) {
      bad(`tools are "${actual.join(', ')}" but the contract allows "${allowed.join(', ')}"; widening needs an entry in DECLARED_TOOLS in evals/experts/lib/contract.js and a reviewer's yes`);
    }
    if (fm.readonly !== 'true') bad('frontmatter must set readonly: true (the Cursor equivalent of the tool allowlist)');
    if (!/zero (findings|constraints|cases)/i.test(body)) bad('the body must say that zero findings is a correct answer');
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

  // 2. References: one per declared stage, every one reachable, every named one present.
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
    for (const stage of stages) {
      const ref = `${stage}.md`;
      if (!files.includes(ref)) bad(`it takes part at the ${stage} stage, so experts/${name}/references/${ref} must exist: the workflow tells it to read that file first`);
      else if (!named.includes(ref)) bad(`the agent never names experts/${name}/references/${ref}, which its ${stage} stage depends on`);
    }
  }
  for (const stage of stages) {
    const file = path.join(refDir, `${stage}.md`);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/FILL-IN/.test(text)) bad(`experts/${name}/references/${stage}.md still has a FILL-IN note from the template`);
    if (stage === 'review') {
      for (const p of lintChecklist(text, LINT_PROFILES[name] || GENERIC_PROFILE)) bad(`review reference: ${p}`);
    } else if (stage === 'build') {
      // Loaded into the implementer's prompt on every build, so it is capped, and it may only say how to write.
      if (Buffer.byteLength(text) > BRIEF_BYTES) bad(`build.md is ${Buffer.byteLength(text)} bytes; it is loaded on every build and is capped at ${BRIEF_BYTES}`);
      if (!/\bplan\b/i.test(text) || !/adds no work|did not ask|not ask for/i.test(text)) bad('build.md must say that it adds no work and that the plan decides the scope: a brief says how to write, never what to build');
      if (/\bfetch\b|\bcurl\b|\bnpx?\b|https?:\/\//i.test(text)) bad('build.md must not tell the implementer to fetch, install or visit anything');
    } else {
      if (!/\bzero\b|\bno (constraints|cases)\b/i.test(text)) bad(`${stage}.md must say that an empty answer is correct, or the expert will invent requirements`);
      if (!/\bdata\b/i.test(text) || !/instruction/i.test(text)) bad(`${stage}.md must say that what the expert reads is data, not instructions`);
      if (!/at most/i.test(text)) bad(`${stage}.md must cap how much the expert returns ("at most N"), or the plan stops being readable`);
    }
  }

  // 3. Hygiene of the shipped directory.
  const dir = path.join(payloadDir, 'experts', name);
  const all = walk(dir);
  if (all.some((p) => path.basename(p) === 'SKILL.md')) bad('a SKILL.md under the expert would put a description in the main context on every turn');
  if (all.some((p) => /\.test\.js$/.test(p) || path.basename(p) === 'fixtures')) bad('tests and fixtures belong under repo-root evals/, which the plugin ZIP never contains');
  const bytes = all.filter((p) => fs.statSync(p).isFile()).reduce((n, p) => n + fs.statSync(p).size, 0);
  if (bytes > BYTE_BUDGET) bad(`experts/${name} is ${bytes} bytes; the budget is ${BYTE_BUDGET}`);
  if (files.includes('CHANGES.md') && !fs.existsSync(path.join(dir, 'NOTICE.md'))) {
    bad('references/CHANGES.md records adapted third-party content, so experts/' + name + '/NOTICE.md with the licence must ship');
  }

  // 4. Selection examples. The model decides when an expert applies, so the examples
  // are the contract for that decision: they state it, and they seed the recall check.
  const exFile = path.join(examplesDir, `${name}.json`);
  if (!fs.existsSync(exFile)) bad(`selection examples missing: evals/experts/examples/${name}.json`);
  else {
    let ex;
    try {
      ex = JSON.parse(fs.readFileSync(exFile, 'utf8'));
    } catch (err) {
      bad(`selection examples are not valid JSON (${err.message})`);
    }
    if (ex) {
      const applies = ex.applies || [];
      const doesNot = ex.does_not_apply || [];
      if (applies.length < MIN_EXAMPLES || doesNot.length < MIN_EXAMPLES) {
        bad(`selection examples need at least ${MIN_EXAMPLES} situations where it applies and ${MIN_EXAMPLES} where it does not`);
      }
      for (const s of [...applies, ...doesNot]) {
        if (typeof s !== 'string' || s.length < 15) bad(`a selection example is not a sentence describing a change: ${JSON.stringify(s)}`);
        else if (/REPLACE|FILL-IN/.test(s)) bad(`a selection example is still a placeholder: "${s}"`);
      }
    }
  }
  return problems;
}

// The workflows are compiled the way the runtime would, so a bad edit cannot hide.
function workflowParseErrors(payloadDir) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const out = [];
  for (const f of fs.readdirSync(path.join(payloadDir, 'workflows')).filter((x) => x.endsWith('.js'))) {
    try {
      new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', stripMeta(fs.readFileSync(path.join(payloadDir, 'workflows', f), 'utf8')));
    } catch (err) {
      out.push(`workflows/${f} does not parse (${err.message})`);
    }
  }
  return out;
}

// The scripts cannot import, so the lane helpers are copied into each. A copy that
// drifts is a lane that behaves differently from its siblings, so they are held equal.
function laneHelperProblems(payloadDir) {
  const block = (f) => {
    const src = fs.readFileSync(path.join(payloadDir, 'workflows', f), 'utf8');
    const a = src.indexOf('// --- expert lane helpers');
    const b = src.indexOf('// --- end expert lane helpers ---');
    return a === -1 || b === -1 ? null : src.slice(a, b);
  };
  const blocks = LANE_WORKFLOWS.map((f) => [f, block(f)]);
  const missing = blocks.filter(([, b]) => b === null).map(([f]) => f);
  if (missing.length > 0) return [`workflows/${missing.join(', ')} lack the expert lane helpers block`];
  const first = blocks[0][1];
  return blocks.filter(([, b]) => b !== first).map(([f]) => `workflows/${f} has expert lane helpers that differ from workflows/${blocks[0][0]}; they must be identical`);
}

function checkAll({ payloadDir, examplesDir, declaredTools }) {
  const problems = [...workflowParseErrors(payloadDir), ...laneHelperProblems(payloadDir)];
  const found = discover(payloadDir);
  for (const p of found.problems) problems.push(`discovery: ${p}`);
  const names = new Set(found.experts.map((e) => e.name));
  // A file that matches the pattern but did not make it into the list is already
  // reported above; check it too, so the rest of what is wrong with it is not hidden.
  for (const f of fs.readdirSync(path.join(payloadDir, 'agents')).filter((x) => /^uw-expert-.+\.md$/.test(x))) {
    names.add(f.replace(/^uw-expert-/, '').replace(/\.md$/, ''));
  }
  for (const name of [...names].sort()) problems.push(...checkExpert({ payloadDir, examplesDir, name, declaredTools }));
  return problems;
}

module.exports = { checkExpert, checkAll, registeredExperts, discover, DEFAULT_TOOLS, DECLARED_TOOLS, STAGES };
