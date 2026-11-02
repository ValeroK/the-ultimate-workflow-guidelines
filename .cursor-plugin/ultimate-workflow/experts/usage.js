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
// whose name contains the text (worktrees and employee desks have folders of their own).

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

function role(firstPrompt) {
  const t = String(firstPrompt || '');
  const expert = /You are the ([\w-]+) domain expert/.exec(t);
  if (expert) return `expert:${expert[1]}`;
  if (/Try to REFUTE/.test(t)) return 'skeptic';
  if (/^\s*Decide which domain experts should review this change/.test(t)) return 'recheck';
  if (/minimal implementation/.test(t)) return 'implementer';
  if (/Write the tests from its confirmed/.test(t)) return 'write-tests';
  if (/Diagnose it from the evidence/.test(t)) return 'diagnose';
  return 'other';
}

/** One row per transcript file. `root` is a project folder, or the projects folder with `match` or `projects: true`. */
function scan({ root, match = '', since = 0, projects = false } = {}) {
  const rows = [];
  const lower = String(match).toLowerCase();
  for (const file of walk(root)) {
    const project = match || projects ? path.relative(root, file).split(path.sep)[0] : path.basename(root);
    if (lower && !project.toLowerCase().includes(lower)) continue;
    let st;
    try {
      st = fs.statSync(file);
    } catch {
      continue;
    }
    if (since && st.mtimeMs < since) continue;
    const r = { file, project, main: !/[\\/]subagents[\\/]/.test(file), turns: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, first: '' };
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
      }
    }
    if (r.turns === 0) continue;
    r.tokens = r.input + r.cacheWrite + r.cacheRead + r.output;
    r.role = r.main ? 'main' : role(r.first);
    delete r.first;
    rows.push(r);
  }
  return rows;
}

function summarize(rows) {
  const blank = () => ({ count: 0, turns: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, tokens: 0 });
  const add = (s, r) => {
    s.count += 1;
    for (const k of ['turns', 'input', 'cacheWrite', 'cacheRead', 'output', 'tokens']) s[k] += r[k];
    return s;
  };
  const main = blank();
  const agents = blank();
  const byRole = {};
  const projects = {};
  for (const r of rows) {
    add(r.main ? main : agents, r);
    if (!r.main) add((byRole[r.role] = byRole[r.role] || blank()), r);
    const p = (projects[r.project] = projects[r.project] || { project: r.project, main: 0, agents: 0 });
    p[r.main ? 'main' : 'agents'] += r.tokens;
  }
  const tokens = main.tokens + agents.tokens;
  return {
    tokens,
    cacheShare: tokens ? (main.cacheRead + agents.cacheRead) / tokens : 0,
    main,
    agents,
    byRole,
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
  const root = get('--root') || (match ? projects : path.join(projects, projectFolder(cwd)));
  const sinceText = get('--since');
  const since = sinceText ? new Date(sinceText).getTime() : 0;
  if (sinceText && !Number.isFinite(since)) return fail(`--since "${sinceText}" is not a date`);
  if (!fs.existsSync(root)) return fail(`no transcripts at ${root} (use --root, or --match with part of the project folder name)`);
  return out({ root, match, since: sinceText || null, ...summarize(scan({ root, match, since })) });
}

module.exports = { projectFolder, role, scan, summarize, cli };
