'use strict';

// Shared state core for the ultimate-workflow gates.
//
// One place for the logic that must be identical across five gates and four
// vendor adapters: front-matter parsing, stage resolution, and the handoff
// predicate from PRD-graph-orchestration.md section 4.8.
//
// Deliberately dependency-free -- Node builtins only. See internal/plans/PLAN-hook-gates.md,
// "Deviation justification".

const fs = require('node:fs');
const path = require('node:path');

const DISABLED_VALUES = new Set(['off', '0', 'false', 'no']);

/** Failing rounds allowed before the run escalates to a human. */
const ROUND_CAP = 3;

function coerce(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  const quoted = /^(['"])([\s\S]*)\1$/.exec(v);
  if (!quoted) return v;

  // format() escapes with JSON.stringify, so a double-quoted value has to be
  // unescaped the same way. Stripping the quotes alone doubled every backslash
  // on each write, corrupting a Windows `test_command` a little more every time
  // the gates touched the file -- and the gates touch it on every source edit.
  if (quoted[1] === '"') {
    try {
      return JSON.parse(v);
    } catch {
      return quoted[2];
    }
  }
  return quoted[2];
}

function format(v) {
  const s = String(v);
  if (typeof v === 'boolean' || typeof v === 'number') return s;
  // Quote only what would otherwise re-parse wrong.
  return /[:#]|^\s|\s$/.test(s) ? JSON.stringify(s) : s;
}

/**
 * The one front-matter block finder (PLAN-simplify, card frontmatter). Reader and writer both sit
 * on it, so a plan can never be written as confirmed and read as unconfirmed because the two
 * disagreed about a BOM or a space after a fence. Accepts a BOM, CRLF, trailing spaces or tabs on
 * the fences, and a closing fence at the end of the file. Returns null when the text does not open
 * with a closed block. `after` starts at the closing fence line.
 */
function splitFrontMatter(text) {
  const bom = text.charCodeAt(0) === 0xfeff ? '﻿' : '';
  const body = text.slice(bom.length);
  const open = /^---[ \t]*\r?\n/.exec(body);
  if (!open) return null;
  const rest = body.slice(open[0].length);
  const close = /^---[ \t]*(\r?\n|$)/m.exec(rest);
  if (!close) return null;
  return { bom, open: open[0], block: rest.slice(0, close.index), after: rest.slice(close.index), eol: open[0].endsWith('\r\n') ? '\r\n' : '\n' };
}

/**
 * Parse a leading YAML-ish front-matter block. Scalars only -- no nesting,
 * no lists. Malformed lines are skipped rather than thrown on, because a hook
 * that dies on a typo is worse than a hook that reads four keys instead of five.
 * `{ raw: true }` keeps every value as the trimmed text (agent files, whose values are read as text).
 */
function parseFrontMatter(text, { raw = false } = {}) {
  const fm = splitFrontMatter(text);
  if (!fm) return { data: {}, body: text, hadFrontMatter: false };

  const data = {};
  for (const line of fm.block.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    data[key] = raw ? line.slice(idx + 1).trim() : coerce(line.slice(idx + 1));
  }
  return { data, body: fm.after.replace(/^---[ \t]*(\r?\n|$)/, ''), hadFrontMatter: true };
}

/**
 * Set (or add) one front-matter line in place, keeping the BOM, the line endings and every other
 * byte. Throws when the text has no front matter. The one writer: a hook never calls it.
 */
function setFrontLine(text, key, value) {
  const fm = splitFrontMatter(text);
  if (!fm) throw new Error('the document has no front matter');
  const line = new RegExp(`^${key}[ \\t]*:.*$`, 'm');
  const eol = fm.block.includes('\r\n') ? '\r\n' : '\n';
  const block = line.test(fm.block) ? fm.block.replace(line, `${key}: ${value}`) : `${fm.block.replace(/(\r?\n)?$/, '')}${eol}${key}: ${value}${/\r?\n$/.test(fm.block) ? eol : ''}`;
  return fm.bom + fm.open + block + fm.after;
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

/**
 * Plans still in progress: front matter `phase: done` marks a finished one (4.1.2). In the re-wash
 * the newest plan by time was a closed one, and it demanded the frontend expert on a change with
 * no UI. `/feature` sets `phase: done` after the commit lands, never before: a plan marked done
 * before its commit would switch off G6 and G7 for that commit.
 */
function activePlanFiles(dir) {
  return listPlanFiles(dir).filter((f) => {
    const text = readIfPresent(f);
    return text === null || String(parseFrontMatter(text).data.phase || '').trim().toLowerCase() !== 'done';
  });
}

const ACTIVE_PLAN = path.join('.ultimate-workflow', 'active-plan');
const isPlanName = (name) => /^PLAN-.+\.md$/i.test(path.posix.basename(name));

/**
 * The one containment check for a pointer (4.8.0): a relative path with forward slashes whose base
 * name is PLAN-*.md. Refused: a drive prefix, a leading `/` (which covers `//`), any `..` segment, and
 * a real path (links followed) outside the root or missing. Returns the normalised name or null.
 */
function pointerName(dir, raw) {
  const name = String(raw || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!isPlanName(name) || /^[a-z]:/i.test(name) || name.startsWith('/') || name.split('/').includes('..')) return null;
  try {
    const rel = path.relative(fs.realpathSync(dir), fs.realpathSync(path.join(dir, name)));
    return rel.startsWith('..') || path.isAbsolute(rel) ? null : name;
  } catch {
    return null;
  }
}

/**
 * The plan the commands last worked on (4.1.2): `experts.js` writes its path whenever it is given
 * `--plan`, and a phase script writes it for its plan. A hook gets no arguments, so this is how
 * the gates follow the same plan as the commands instead of guessing by modification time. A
 * pointer to a missing, finished or non-plan file is ignored. The plan may sit in a subfolder
 * (4.8.0); there is no folder search, only the pointer.
 */
function pointedPlanFile(dir) {
  const name = pointerName(dir, readIfPresent(path.join(dir, ACTIVE_PLAN)));
  if (!name) return null;
  const file = path.join(dir, name);
  const text = readIfPresent(file);
  if (text === null || String(parseFrontMatter(text).data.phase || '').trim().toLowerCase() === 'done') return null;
  return file;
}

/** Record the plan a command works on, for the gates. A path outside the root or not a plan is ignored. */
function setActivePlan(dir, plan) {
  const name = pointerName(dir, plan);
  if (!name) return false;
  fs.mkdirSync(path.join(dir, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, ACTIVE_PLAN), `${name}\n`);
  return true;
}

function newestPlanFile(dir) {
  const pointed = pointedPlanFile(dir);
  if (pointed) return pointed;
  const files = activePlanFiles(dir);
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

  // The always-on doc is AGENTS.md, with CLAUDE.md reduced to an `@AGENTS.md`
  // import stub -- Cursor reads AGENTS.md natively, Claude Code reads only
  // CLAUDE.md. Checking CLAUDE.md for headings therefore fails on every
  // newly bootstrapped project, since the stub is one line and has none, which
  // would leave the project permanently un-handed-off.
  //
  // CLAUDE.md is still accepted so projects bootstrapped before the rename
  // keep working; whichever carries the sections satisfies this.
  const agents = readIfPresent(path.join(dir, 'AGENTS.md'));
  const claude = readIfPresent(path.join(dir, 'CLAUDE.md'));
  if (agents === null && claude === null) return false;

  const hasSections = (t) =>
    t !== null && /^##\s+Key files/im.test(t) && /^##\s+Gotchas/im.test(t);
  if (!hasSections(agents) && !hasSections(claude)) return false;

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
  if (pointedPlanFile(dir) || activePlanFiles(dir).length > 0) return 'feature';
  if (fs.existsSync(path.join(dir, 'PRD.md'))) {
    return handoffComplete(dir) ? 'none' : 'bootstrap';
  }
  return 'none';
}

/**
 * The project root for a hook that fired in `dir`: the nearest folder, going up, that holds a
 * plan (PLAN-*.md or PRD.md) or a `.git` entry (a directory, or the file a worktree has); `dir`
 * itself when there is none. A host fires hooks with whatever folder its shell is in, and the plan
 * is read from exactly the folder given, so from a subfolder every gate saw "no plan" and allowed,
 * and the heartbeat was written there. `.ultimate-workflow` is deliberately not a marker: one stray
 * write would otherwise make its own folder the root from then on.
 */
function projectRoot(dir) {
  if (typeof dir !== 'string' || dir === '') return dir;
  let cur = dir;
  for (;;) {
    if (listPlanFiles(cur).length > 0 || fs.existsSync(path.join(cur, 'PRD.md')) || fs.existsSync(path.join(cur, '.git'))) {
      return cur;
    }
    const up = path.dirname(cur);
    if (up === cur) return dir;
    cur = up;
  }
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

/**
 * Gates are ON BY DEFAULT again as of 4.1.0 (maintainer decision, 2026-10-30).
 *
 * History: on by default when they were the enforcement story (2.4.0); demoted
 * to opt-in in v3 after a measurement found three routes to "installed and
 * silently enforcing nothing". What changed since: every gate leaves a
 * heartbeat and `hooks/status.js` tells "never ran", "live", "stale" and
 * "disabled" apart, and a real run showed that without them a session skips
 * steps unless someone steers it. They stay inert in a repo with no PRD.md
 * and no PLAN-*.md, and fail open on an internal error.
 *
 * ULTIMATE_WORKFLOW_GATES=off (or 0/false/no) turns every gate off; unset or
 * any other value leaves them on.
 */
function gatesEnabled(env) {
  const v = env && env.ULTIMATE_WORKFLOW_GATES;
  if (typeof v !== 'string' || v.trim() === '') return true;
  return !DISABLED_VALUES.has(v.trim().toLowerCase());
}

/** Retained so a caller reading either way gets a consistent answer. */
function gatesDisabled(env) {
  return !gatesEnabled(env);
}

/**
 * The commit-time stamp (PLAN-simplify, card commit-check): when the commit check last ran on a commit and
 * what it found. Written only at a commit, by the hook and by card-commit, never by any other event. It is
 * the sign that the hook is really registered; `status.js` shows it. A write that fails changes nothing.
 */
const COMMIT_STAMP = path.join('.ultimate-workflow', 'commit-check.json');
function writeCommitStamp(cwd, check) {
  try {
    const file = path.join(cwd, COMMIT_STAMP);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...check }, null, 2) + '\n');
    return true;
  } catch {
    return false;
  }
}
function readCommitStamp(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, COMMIT_STAMP), 'utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  ROUND_CAP,
  splitFrontMatter,
  writeCommitStamp,
  readCommitStamp,
  COMMIT_STAMP,
  parseFrontMatter,
  setFrontLine,
  serializeFrontMatter,
  patchState,
  listPlanFiles,
  activePlanFiles,
  pointedPlanFile,
  setActivePlan,
  handoffComplete,
  resolveStage,
  projectRoot,
  readState,
  gatesEnabled,
  gatesDisabled,
};
