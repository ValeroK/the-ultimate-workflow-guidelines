'use strict';

// Shared state core for the ultimate-workflow gates.
//
// One place for the logic that must be identical across five gates and four
// vendor adapters: front-matter parsing, stage resolution, and the handoff
// predicate from PRD-graph-orchestration.md section 4.8.
//
// Deliberately dependency-free -- Node builtins only. See PLAN-hook-gates.md,
// "Deviation justification".

const fs = require('node:fs');
const path = require('node:path');

/** Front matter is only front matter when it opens the file. */
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const DISABLED_VALUES = new Set(['off', '0', 'false', 'no']);

/** Failing rounds allowed before the run escalates to a human. */
const ROUND_CAP = 3;

function coerce(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  const quoted = /^(['"])([\s\S]*)\1$/.exec(v);
  return quoted ? quoted[2] : v;
}

function format(v) {
  const s = String(v);
  if (typeof v === 'boolean' || typeof v === 'number') return s;
  // Quote only what would otherwise re-parse wrong.
  return /[:#]|^\s|\s$/.test(s) ? JSON.stringify(s) : s;
}

/**
 * Parse a leading YAML-ish front-matter block. Scalars only -- no nesting,
 * no lists. Malformed lines are skipped rather than thrown on, because a hook
 * that dies on a typo is worse than a hook that reads four keys instead of five.
 */
function parseFrontMatter(text) {
  const m = FRONT_MATTER.exec(text);
  if (!m) return { data: {}, body: text, hadFrontMatter: false };

  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    data[key] = coerce(line.slice(idx + 1));
  }
  return { data, body: text.slice(m[0].length), hadFrontMatter: true };
}

function serializeFrontMatter(data, body) {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${format(v)}`);
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

/** Merge `patch` into a file's front matter, preserving body and unknown keys. */
function patchState(file, patch) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const { data, body } = parseFrontMatter(text);
  fs.writeFileSync(file, serializeFrontMatter({ ...data, ...patch }, body));
}

function listPlanFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => /^PLAN-.+\.md$/i.test(f))
    .map((f) => path.join(dir, f));
}

function newestPlanFile(dir) {
  const files = listPlanFiles(dir);
  if (files.length === 0) return null;
  return files
    .map((f) => ({ f, m: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0].f;
}

function readIfPresent(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/**
 * The stage-1 to stage-2 handoff predicate (PRD section 4.8). A function of the
 * filesystem, so any gate can evaluate it without being told which stage it is in.
 */
function handoffComplete(dir) {
  const prd = readIfPresent(path.join(dir, 'PRD.md'));
  if (prd === null) return false;

  const { data } = parseFrontMatter(prd);
  if (data.design_confirmed !== true) return false;
  if (data.scaffold_verify !== 'green') return false;

  const claude = readIfPresent(path.join(dir, 'CLAUDE.md'));
  if (claude === null) return false;
  if (!/^##\s+Key files/im.test(claude)) return false;
  if (!/^##\s+Gotchas/im.test(claude)) return false;

  const roadmap = readIfPresent(path.join(dir, 'ROADMAP.md'));
  if (roadmap === null || !/^##\s+\S/m.test(roadmap)) return false;

  const progress = readIfPresent(path.join(dir, 'progress.md'));
  if (progress === null || !/^##\s+\d{4}-\d{2}-\d{2}/m.test(progress)) return false;

  if (readIfPresent(path.join(dir, 'memory.md')) === null) return false;

  return true;
}

/**
 * `none`      -- unmanaged repo, or a bootstrapped project with no active feature.
 * `bootstrap` -- a PRD exists but the handoff predicate is unmet.
 * `feature`   -- an active PLAN file exists. Wins over bootstrap: if you are
 *                planning a feature, you are doing feature work.
 */
function resolveStage(dir) {
  if (listPlanFiles(dir).length > 0) return 'feature';
  if (fs.existsSync(path.join(dir, 'PRD.md'))) {
    return handoffComplete(dir) ? 'none' : 'bootstrap';
  }
  return 'none';
}

function readState(dir) {
  const stage = resolveStage(dir);

  let file = null;
  if (stage === 'feature') file = newestPlanFile(dir);
  else if (stage === 'bootstrap') file = path.join(dir, 'PRD.md');

  if (!file) return { stage, file: null, data: {} };

  const text = readIfPresent(file);
  if (text === null) return { stage, file: null, data: {} };

  return { stage, file, data: parseFrontMatter(text).data };
}

function gatesDisabled(env) {
  const v = env && env.ULTIMATE_WORKFLOW_GATES;
  return typeof v === 'string' && DISABLED_VALUES.has(v.trim().toLowerCase());
}

module.exports = {
  ROUND_CAP,
  parseFrontMatter,
  serializeFrontMatter,
  patchState,
  listPlanFiles,
  handoffComplete,
  resolveStage,
  readState,
  gatesDisabled,
};
