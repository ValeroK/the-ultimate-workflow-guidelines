'use strict';

// What the work actually cost, from Claude Code's own transcripts (4.2.0).
//
// The ledger records the tokens a Workflow run reports, which cover the workflow's agents only and
// not the context re-sent on every turn. On the-ceo that showed the experts as 85% of the tokens;
// the transcripts showed them as 4%, with main conversations at 73%. This reads every transcript
// (main conversations and the agents they started) and adds up each turn's usage: new input, cache
// write, cache read (re-sent context, priced at about a tenth of new input) and output.
//
//   experts.js usage [--since <date>] [--match <text>] [--root <dir>]
//
// Default: this project's folder under ~/.claude/projects. --match reads every project folder
// whose name contains the text (worktrees and employee desks have folders of their own). Both also
// read the sessions of a parent folder whose recorded cwd is inside this project (4.7.0).

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/** Claude Code's folder name for a project: the path with every character that is not a letter, digit or dash as a dash. */
const projectFolder = (cwd) => String(cwd).replace(/[^A-Za-z0-9-]/g, '-');

function* walk(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}

const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => (x && (x.text || (typeof x.content === 'string' ? x.content : ''))) || '').join('') : '');

/**
 * The task a workflow agent was given, without the host's frame. Claude Code 2.1.318 opens every
 * workflow agent's prompt with "[Workflow harness -- computed task] ... The computed task text
 * follows:" and indents the task by two spaces, so a pattern anchored at the start never matched and
 * plan readers and harvest readers were counted as other agents (4.7.0).
 */
function taskText(firstPrompt) {
  const t = String(firstPrompt || '');
  const m = /The computed task text follows:\r?\n([\s\S]*)$/.exec(t);
  return m ? m[1].replace(/^ {2}/gm, '') : t;
}

// What a role is when the prompt says nothing more specific: the agent type, from the
// `<agent>.meta.json` the host writes beside a subagent transcript.
const BY_TYPE = { 'uw-explorer': 'reader', 'uw-harvester': 'harvest-reader', 'uw-critic': 'critic', 'uw-implementer': 'implementer', 'uw-reviewer': 'reviewer' };

function role(firstPrompt, agentType = '') {
  const t = taskText(firstPrompt);
  const type = String(agentType || '').replace(/^.*:/, '');
  const expert = /You are the ([\w-]+) domain expert/.exec(t);
  if (expert) return `expert:${expert[1]}`;
  if (/Try to REFUTE/.test(t)) return 'skeptic';
  if (/^\s*(?:Decide which domain experts should review this change|Report which domain experts' areas this change touches)/.test(t)) return 'recheck';
  if (/minimal implementation/.test(t)) return 'implementer';
  if (/Write the tests from its confirmed/.test(t)) return 'write-tests';
  if (/Diagnose it from the evidence/.test(t)) return 'diagnose';
  if (/and report what it constrains for a change described as/.test(t)) return 'reader';
  if (/^\s*(Read every PLAN-\*\.md file|Review the git history and diff for|Inventory what this repository has ALREADY recorded)/.test(t)) return 'harvest-reader';
  const typed = /^uw-expert-([\w-]+)$/.exec(type);
  if (typed) return `expert:${typed[1]}`;
  return BY_TYPE[type] || 'other';
}

function agentTypeOf(file) {
  try {
    return JSON.parse(fs.readFileSync(file.replace(/\.jsonl$/, '.meta.json'), 'utf8')).agentType || '';
  } catch {
    return '';
  }
}

/** Windows paths compare without case and with one kind of slash. */
const normPath = (p) => path.resolve(String(p)).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

/** The first `cwd` a transcript records, or ''. */
function firstCwd(text) {
  for (const line of text.split('\n')) {
    const m = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(line);
    if (m) {
      try {
        return JSON.parse(`"${m[1]}"`);
      } catch {
        return '';
      }
    }
  }
  return '';
}

/** One row per transcript file. `root` is a project folder, or the projects folder with `match` or `projects: true`. */
/**
 * `inside` (4.7.0, bug 2): the project root. A session started in a parent folder (the user opened
 * Claude Code in ~/Projects and worked in ~/Projects/app) is stored under the parent's folder, whose
 * name does not contain the project's. Such a folder is read too, and a transcript from it is kept
 * when the `cwd` it records is the project root or below it. `exact`: the folder name must equal it.
 */
function scan({ root, match = '', since = 0, projects = false, inside = '', exact = '' } = {}) {
  const rows = [];
  const lower = String(match).toLowerCase();
  const own = inside ? projectFolder(path.resolve(inside)).toLowerCase() : '';
  const insideNorm = inside ? normPath(inside) : '';
  const cwdCache = new Map();
  for (const file of walk(root)) {
    const project = match || projects || exact ? path.relative(root, file).split(path.sep)[0] : path.basename(root);
    const name = project.toLowerCase();
    let fromParent = false;
    const named = exact ? name === String(exact).toLowerCase() : !lower || name.includes(lower);
    if (!named) {
      // Only a folder whose name is a prefix of the project's can hold a parent folder's sessions.
      if (!own || !own.startsWith(name) || name === own) continue;
      const session = path.relative(path.join(root, project), file).split(path.sep)[0].replace(/\.jsonl$/, '');
      if (!cwdCache.has(session)) {
        let cwd = '';
        try {
          cwd = firstCwd(fs.readFileSync(path.join(root, project, `${session}.jsonl`), 'utf8'));
        } catch {
          try {
            cwd = firstCwd(fs.readFileSync(file, 'utf8'));
          } catch {}
        }
        cwdCache.set(session, cwd);
      }
      const cwd = cwdCache.get(session);
      if (!cwd || !(normPath(cwd) === insideNorm || normPath(cwd).startsWith(`${insideNorm}/`))) continue;
      fromParent = true;
    }
    let st;
    try {
      st = fs.statSync(file);
    } catch {
      continue;
    }
    if (since && st.mtimeMs < since) continue;
    const r = { file, project, ...(fromParent ? { fromParent: true } : {}), main: !/[\\/]subagents[\\/]/.test(file), turns: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, models: {}, first: '' };
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      const msg = ev.message || {};
      if (ev.type === 'user' && !r.first) r.first = textOf(msg.content);
      if (ev.type === 'assistant' && msg.usage) {
        r.turns += 1;
        r.input += msg.usage.input_tokens || 0;
        r.cacheWrite += msg.usage.cache_creation_input_tokens || 0;
        r.cacheRead += msg.usage.cache_read_input_tokens || 0;
        r.output += msg.usage.output_tokens || 0;
        const m = msg.model || 'unknown';
        const t = (msg.usage.input_tokens || 0) + (msg.usage.cache_creation_input_tokens || 0) + (msg.usage.cache_read_input_tokens || 0) + (msg.usage.output_tokens || 0);
        r.models[m] = (r.models[m] || 0) + t;
      }
    }
    if (r.turns === 0) continue;
    r.tokens = r.input + r.cacheWrite + r.cacheRead + r.output;
    r.role = r.main ? 'main' : role(r.first, agentTypeOf(file));
    delete r.first;
    rows.push(r);
  }
  return rows;
}

function summarize(rows) {
  const blank = () => ({ count: 0, turns: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, tokens: 0, models: {} });
  const add = (s, r) => {
    s.count += 1;
    for (const k of ['turns', 'input', 'cacheWrite', 'cacheRead', 'output', 'tokens']) s[k] += r[k];
    for (const [m, t] of Object.entries(r.models || {})) s.models[m] = (s.models[m] || 0) + t;
    return s;
  };
  // The workflow's steps, so a report never has to reach for the ledger's tokens to say what a phase cost.
  const PHASE_OF = (role) =>
    role === 'main' ? 'main'
      : role.startsWith('expert:') || role === 'skeptic' || role === 'recheck' ? 'expertsCheck'
      : ['implementer', 'write-tests', 'diagnose'].includes(role) ? 'build'
      : role === 'reader' || role === 'harvest-reader' ? 'readers'
      : 'otherAgents';
  const phases = { main: blank(), expertsCheck: blank(), build: blank(), readers: blank(), otherAgents: blank() };
  const main = blank();
  const agents = blank();
  const byRole = {};
  const projects = {};
  for (const r of rows) {
    add(r.main ? main : agents, r);
    add(phases[PHASE_OF(r.role)], r);
    if (!r.main) add((byRole[r.role] = byRole[r.role] || blank()), r);
    const p = (projects[r.project] = projects[r.project] || { project: r.project, main: 0, agents: 0 });
    p[r.main ? 'main' : 'agents'] += r.tokens;
  }
  const tokens = main.tokens + agents.tokens;
  for (const p of Object.values(phases)) p.share = tokens ? p.tokens / tokens : 0;
  return {
    tokens,
    cacheShare: tokens ? (main.cacheRead + agents.cacheRead) / tokens : 0,
    main,
    agents,
    byRole,
    phases,
    projects: Object.values(projects).sort((a, b) => b.main + b.agents - (a.main + a.agents)),
    note: 'cacheRead is context re-sent on every turn, priced at about a tenth of new input; the ledger counts workflow agents only',
  };
}

function cli(argv, cwd, out, fail) {
  const get = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const projects = path.join(os.homedir(), '.claude', 'projects');
  const match = get('--match') || '';
  const given = get('--root');
  // Without --root the projects folder is read, so sessions started in a parent folder are found too.
  const root = given || projects;
  const sinceText = get('--since');
  const since = sinceText ? new Date(sinceText).getTime() : 0;
  if (sinceText && !Number.isFinite(since)) return fail(`--since "${sinceText}" is not a date`);
  if (!fs.existsSync(root)) return fail(`no transcripts at ${root} (use --root, or --match with part of the project folder name)`);
  const opts = given ? { root, match, since } : { root, match, since, inside: cwd, ...(match ? {} : { exact: projectFolder(cwd) }) };
  const rows = scan(opts);
  const parent = rows.filter((r) => r.fromParent).length;
  return out({ root, match, since: sinceText || null, ...(parent ? { fromParentFolders: parent } : {}), ...summarize(rows) });
}

module.exports = { projectFolder, role, taskText, scan, summarize, cli };
