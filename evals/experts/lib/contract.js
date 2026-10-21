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
  // 2026-10-20: the DevOps expert follows the same rule as the role experts above.
  devops: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
  // Decided by the maintainer on 2026-10-21 ("yes for all"): the experts added on
  // 2026-10-20 get the same web access, under the same protocol rules.
  genai: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
  frontend: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
  data: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
};

// What a domain's checklist must not exclude and must mention depends on the domain.
const LINT_PROFILES = { security: SECURITY_PROFILE };

const BYTE_BUDGET = 60 * 1024;
const { BRIEF_BYTES, SKILL_STAGES, parseSkillsFile } = require(path.join(__dirname, '..', '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'experts.js'));
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
    // What every expert shares (zero is correct, untrusted input, the web rules) lives in
    // experts/protocol.md; the agent names it and says only what is its own.
    if (!/experts\/protocol\.md/.test(body)) bad('the agent must name experts/protocol.md, the rules every expert follows, in what it reads');
    if (!actual.includes('Bash') && !/no shell|cannot run/i.test(body)) bad('the body must say the expert cannot run anything');
    if (actual.includes('Bash') && !/read-only commands/i.test(body)) bad('the expert can run commands, so its body must say it runs read-only commands only');
    const goal = (/^## Goal\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body) || [])[1] || '';
    if (!goal) bad('the agent needs a "## Goal" section: what it prevents, what done well is, what is not the goal');
    else for (const k of ['Prevents:', 'Done well:', 'Not the goal:']) if (!goal.includes(`**${k}**`)) bad(`the Goal must state **${k}**`);
    const resp = (/^## Responsibilities\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body) || [])[1] || '';
    if (!resp) bad('the agent needs a "## Responsibilities" rubric: area, what it judges, what is not its own (owner), the border');
    else {
      if (!/\|\s*Area\s*\|\s*This expert judges\s*\|\s*Not this expert's \(owner\)\s*\|\s*At the border\s*\|/.test(resp)) bad('the Responsibilities table needs the columns Area | This expert judges | Not this expert\'s (owner) | At the border');
      const rows = resp.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/\|\s*Area\s*\|/.test(l));
      if (rows.length < 2) bad('the Responsibilities table needs at least two rows');
    }
    if (!/^## How to judge/m.test(body)) bad('the agent needs a "## How to judge" section: the two to four rules that hold at every stage in this domain');
    if (/Both hosts are covered/.test(body)) bad('the note about host keys is for maintainers; it belongs in docs/adding-an-expert.md, not in a prompt the model pays for');
    if (/\b8 or above\b|^## Untrusted input/m.test(body)) bad('the agent restates experts/protocol.md; say it once, there');
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
    // Skills and their selectors have one home, the expert's skills.md, which no model reads.
    if (/^## Skills\b/m.test(text) || /experts\/skills\/[a-z][a-z0-9-]*\/skill\.md/.test(text)) bad(`experts/${name}/references/${stage}.md lists skills; they belong in experts/${name}/skills.md, which only code reads`);
    if (stage === 'review') {
      for (const p of lintChecklist(text, LINT_PROFILES[name] || GENERIC_PROFILE)) bad(`review reference: ${p}`);
    } else if (stage === 'build') {
      // Loaded into the implementer's prompt on every build, so it is capped, and it may only say how to write.
      const brief = text;
      if (Buffer.byteLength(brief) > BRIEF_BYTES) bad(`build.md is ${Buffer.byteLength(brief)} bytes; it is loaded on every build and is capped at ${BRIEF_BYTES}`);
      if (!/\bplan\b/i.test(brief) || !/adds no work|did not ask|not ask for/i.test(brief)) bad('build.md must say that it adds no work and that the plan decides the scope: a brief says how to write, never what to build');
      if (/\bfetch\b|\bcurl\b|\bnpx?\b|https?:\/\//i.test(brief)) bad('build.md must not tell the implementer to fetch, install or visit anything');
      for (const h of ['## Before you write', '## While you write', '## When not to', '## When you report']) if (!text.includes(h)) bad(`build.md needs a "${h}" section`);
    } else {
      // Zero is correct, untrusted input and the limits on what is returned are the protocol's
      // and the schema's; the stage reference says what a good item is in this domain.
      if (!/\*\*Outcome of this stage:\*\*/.test(text)) bad(`${stage}.md must open with "**Outcome of this stage:**", the one thing this stage must leave in the plan`);
      if (/^## What to return/m.test(text)) bad(`${stage}.md defines what to return; the fields and their limits belong to the workflow's schema`);
      const need = stage === 'plan' ? ['## Questions', '## A good constraint, and a rejected one'] : ['## Families of cases', '## One worked case', '## Redundant here'];
      for (const h of need) if (!text.includes(h)) bad(`${stage}.md needs a "${h}" section`);
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
      // A near miss with its owner named teaches where this expert stops; a typo fix does not.
      const owned = doesNot.filter((x) => typeof x === 'string' && /\(owner: [a-z-]+\)/.test(x)).length;
      if (doesNot.length > 0 && owned * 2 < doesNot.length) bad(`at least half of does_not_apply must be near misses a sibling owns, written "... (owner: <expert>)"; ${owned} of ${doesNot.length} are`);
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

// Shared skills: knowledge code pastes into an expert's prompt. They live in
// experts/skills/<name>/skill.md so that more than one expert can load the same one, and each
// expert lists the ones it uses, per stage with a selector, in experts/<name>/skills.md. A skill
// no expert lists is never loaded; a listed name with no file is a silent miss at review time.
const SKILL_BYTES = 16 * 1024;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

function skillProblems(payloadDir, expertNames) {
  const out = [];
  const skillsDir = path.join(payloadDir, 'experts', 'skills');
  const present = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory()) : [];
  const named = new Set();
  for (const name of expertNames) {
    const file = path.join(payloadDir, 'experts', name, 'skills.md');
    if (!fs.existsSync(file)) continue;
    const where = `experts/${name}/skills.md`;
    const parsed = parseSkillsFile(fs.readFileSync(file, 'utf8'));
    for (const p of parsed.problems) out.push(`${where}: ${p}`);
    for (const [stage, list] of Object.entries(parsed.stages)) {
      for (const { name: skill } of list) {
        named.add(skill);
        if (!present.includes(skill)) out.push(`${where} lists ${skill} at ${stage}, and experts/skills/${skill}/skill.md does not exist`);
      }
    }
  }
  for (const d of present) {
    const dir = path.join(skillsDir, d);
    const file = path.join(dir, 'skill.md');
    if (!/^[a-z][a-z0-9-]*$/.test(d)) out.push(`experts/skills/${d}: a skill folder name is lowercase words joined by hyphens`);
    if (!fs.existsSync(file)) {
      out.push(`experts/skills/${d} has no skill.md`);
      continue;
    }
    if (!named.has(d)) out.push(`experts/skills/${d}/skill.md is listed by no expert's skills.md, so it is never loaded`);
    if (!fs.existsSync(path.join(dir, 'NOTICE.md'))) out.push(`experts/skills/${d} has no NOTICE.md: a skill says where its ideas come from, even when the answer is "our own writing"`);
    const raw = fs.readFileSync(file, 'utf8');
    if (Buffer.byteLength(raw) > SKILL_BYTES) out.push(`experts/skills/${d}/skill.md is ${Buffer.byteLength(raw)} bytes; the cap is ${SKILL_BYTES}`);
    const fm = FRONTMATTER.exec(raw);
    if (!fm) out.push(`experts/skills/${d}/skill.md must open with frontmatter (name, description)`);
    else {
      if (!new RegExp(`^name: ${d}$`, 'm').test(fm[1])) out.push(`experts/skills/${d}/skill.md: frontmatter name must be "${d}"`);
      if (!/^description: \S.{20,}$/m.test(fm[1])) out.push(`experts/skills/${d}/skill.md: frontmatter needs a description that says what the skill holds and when it applies`);
    }
    const text = fm ? raw.slice(fm[0].length).trimStart() : raw;
    if (!/^# /.test(text)) out.push(`experts/skills/${d}/skill.md must have a "# " title after its frontmatter`);
    if (/FILL-IN/.test(text)) out.push(`experts/skills/${d}/skill.md still has a FILL-IN note`);
    if (/\bcurl\b|\bnpx\b|\bwget\b|https?:\/\//i.test(text)) out.push(`experts/skills/${d}/skill.md must not tell a reader to fetch, install or visit anything`);
    if (walk(dir).some((p) => path.basename(p) === 'SKILL.md')) out.push(`experts/skills/${d}: name the file skill.md, not SKILL.md, or a host loads it as a skill of its own on every turn`);
  }
  return out;
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
  problems.push(...skillProblems(payloadDir, [...names].sort()));
  return problems;
}

module.exports = { checkExpert, checkAll, skillProblems, registeredExperts, discover, DEFAULT_TOOLS, DECLARED_TOOLS, STAGES, SKILL_BYTES };
