#!/usr/bin/env node
'use strict';

// Everything the workflow needs to know about domain experts, in code.
//
// Workflow scripts have no filesystem or shell, so the facts they depend on arrive
// as arguments and the facts they produce are recorded from their return values.
// This file is the one place that touches both sides:
//
//   - discovery: an expert exists when `agents/uw-expert-<name>.md` exists. There is no
//     registry to edit. The file's `description` is the line a model reads when it
//     decides whether the expert applies, and its `stages` say where it takes part.
//   - the `experts:` line in a plan file's frontmatter, which only ever grows.
//   - evidence: what ran, at which stage, against which state of the working tree.
//   - the commit evidence the G6 gate checks.
//
// Standard library only, so the install stays one command with no dependencies.
//
//   node experts.js list                                    available experts, as JSON
//   node experts.js read    --plan P                        the plan's experts
//   node experts.js select  --plan P --add a,b              add experts to the plan (never removes)
//   node experts.js prepare [--range working|A..B]          save the diff, fingerprint the tree
//   node experts.js record  --stage S [--plan P] < result   record a workflow result as evidence
//   node experts.js check   [--plan P]                      would the commit gate allow a commit now
//   node experts.js findings                                high-confidence findings still open, and which are dismissed
//   node experts.js resolve --id ID --reason "..."          dismiss one, on the user's word and in their words
//   node experts.js fingerprint                             hash of the uncommitted changes
//
// Exit code 2 means the input was unusable, with the reason on stderr. `check` exits 1
// when a commit would be blocked.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const gates = require('../hooks/lib/gates.js');

const PLUGIN_ROOT = path.join(__dirname, '..');
const STAGES = ['plan', 'tests', 'review'];
const EVIDENCE = path.join('.ultimate-workflow', 'experts');
const AGENT_FILE = /^uw-expert-([a-z][a-z0-9-]*)\.md$/;

// ---- discovery ----

function parseAgentFile(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function inlineList(value) {
  return [...new Set(String(value).replace(/^\[/, '').replace(/\]$/, '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean))];
}

// A file that is present but malformed is reported in `problems` and left out of
// `experts`: an expert nobody can describe cannot be selected, and silently guessing
// its description or stages would put an unvetted default into a model's prompt.
function list(pluginRoot = PLUGIN_ROOT) {
  const dir = path.join(pluginRoot, 'agents');
  const experts = [];
  const problems = [];
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => AGENT_FILE.test(f)).sort();
  } catch {
    return { experts, problems: [`cannot read ${dir}`] };
  }
  for (const f of files) {
    const name = AGENT_FILE.exec(f)[1];
    const fm = parseAgentFile(fs.readFileSync(path.join(dir, f), 'utf8'));
    const stages = fm.stages === undefined ? ['review'] : inlineList(fm.stages);
    if (fm.name !== `uw-expert-${name}`) problems.push(`${f}: frontmatter name is "${fm.name || ''}", expected "uw-expert-${name}"`);
    else if (!fm.description) problems.push(`${f}: no description, so a model cannot tell when it applies`);
    else if (stages.length === 0 || stages.some((s) => !STAGES.includes(s))) problems.push(`${f}: stages must be a list drawn from ${STAGES.join(', ')}`);
    else experts.push({ name, agent: fm.name, description: fm.description, stages });
  }
  return { experts, problems };
}

/** The experts that take part at a stage, in the order they were selected. */
function expertsFor(available, selected, stage) {
  return selected.map((n) => available.find((e) => e.name === n)).filter((e) => e && e.stages.includes(stage));
}

/** Union that can add and can never remove. Unknown additions are returned, not applied. */
function mergeAdd(current, additions, availableNames) {
  const known = new Set(availableNames);
  const rejected = additions.filter((n) => !known.has(n));
  const accepted = additions.filter((n) => known.has(n));
  const experts = [...new Set([...current, ...accepted])];
  return { experts, added: experts.filter((n) => !current.includes(n)), rejected };
}

// ---- the plan's `experts:` line ----

function frontmatter(text) {
  const bom = text.charCodeAt(0) === 0xfeff ? '﻿' : '';
  const body = text.slice(bom.length);
  const open = /^---[ \t]*\r?\n/.exec(body);
  if (!open) return null;
  const rest = body.slice(open[0].length);
  const close = /^---[ \t]*(\r?\n|$)/m.exec(rest);
  if (!close) return null;
  return { bom, open: open[0], block: rest.slice(0, close.index), after: rest.slice(close.index), eol: open[0].endsWith('\r\n') ? '\r\n' : '\n' };
}

const EXPERTS_LINE = /^experts[ \t]*:[ \t]*(.*?)[ \t]*$/m;

function readExperts(text) {
  const fm = frontmatter(text);
  if (!fm) return { present: false, experts: [] };
  const m = EXPERTS_LINE.exec(fm.block);
  if (!m) return { present: false, experts: [] };
  const value = m[1].replace(/\r$/, '');
  if (value === '') return { present: true, experts: [], error: 'unsupported `experts:` value: write an inline list such as `experts: [security]` or `experts: []`' };
  return { present: true, experts: inlineList(value) };
}

/** Replace or insert the line. Callers merge first; this only writes. */
function setExperts(text, names) {
  const fm = frontmatter(text);
  if (!fm) throw new Error('the plan file has no frontmatter block (--- ... ---) to record experts in');
  const line = `experts: [${names.join(', ')}]`;
  if (EXPERTS_LINE.test(fm.block)) return fm.bom + fm.open + fm.block.replace(EXPERTS_LINE, line) + fm.after;
  return fm.bom + fm.open + fm.block + line + fm.eol + fm.after;
}

/** Add to a plan's experts. Returns what changed; a human's entries are always kept. */
function selectIntoPlan(planFile, additions, availableNames) {
  const text = fs.readFileSync(planFile, 'utf8');
  const current = readExperts(text);
  if (current.error) throw new Error(current.error);
  const merged = mergeAdd(current.experts, additions, availableNames);
  if (merged.rejected.length > 0) throw new Error(`Unknown expert(s): ${merged.rejected.join(', ')} (available: ${availableNames.join(', ') || 'none'})`);
  const next = setExperts(text, merged.experts);
  if (next !== text) fs.writeFileSync(planFile, next);
  return { file: planFile, experts: merged.experts, added: merged.added, wrote: next !== text };
}

// ---- the working tree ----

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`git ${args[0]} failed${r.stderr ? `: ${r.stderr.trim()}` : ''}`);
  return r.stdout;
}

// What the evidence is about must not change when the evidence is written, so the
// evidence directory and the plan file (which gains an `experts:` line) are outside it.
const EXCLUDES = [':(exclude).ultimate-workflow', ':(exclude)PLAN-*.md'];
const ignored = (p) => p.startsWith('.ultimate-workflow/') || /(^|\/)PLAN-[^/]*\.md$/.test(p);

function hasHead(cwd) {
  try {
    git(cwd, ['rev-parse', '--verify', 'HEAD']);
    return true;
  } catch {
    return false;
  }
}

/** The uncommitted changes as one diff, new files included, and the paths in it. */
function workingChanges(cwd) {
  // Before the first commit there is no HEAD to diff against, and the empty tree is not an
  // object a fresh repository has. What would be committed is the index, so use that.
  const heads = hasHead(cwd);
  const tracked = heads
    ? git(cwd, ['diff', '--binary', 'HEAD', '--', '.', ...EXCLUDES])
    : git(cwd, ['diff', '--cached', '--binary', '--', '.', ...EXCLUDES]) + git(cwd, ['diff', '--binary', '--', '.', ...EXCLUDES]);
  const names = heads
    ? git(cwd, ['diff', '--name-only', 'HEAD', '--', '.', ...EXCLUDES])
    : git(cwd, ['diff', '--cached', '--name-only', '--', '.', ...EXCLUDES]) + git(cwd, ['diff', '--name-only', '--', '.', ...EXCLUDES]);
  const files = names.split(/\r?\n/).filter(Boolean);
  const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter((p) => p && !ignored(p));
  let diff = tracked;
  for (const p of untracked) {
    files.push(p);
    let body;
    try {
      const buf = fs.readFileSync(path.join(cwd, p));
      body = buf.length > 1024 * 1024 ? `(${buf.length} bytes, sha256 ${crypto.createHash('sha256').update(buf).digest('hex')})` : buf.toString('utf8');
    } catch {
      body = '(unreadable)';
    }
    diff += `diff --git a/${p} b/${p}\nnew file\n--- /dev/null\n+++ b/${p}\n${body.split('\n').map((l) => `+${l}`).join('\n')}\n`;
  }
  return { diff, files: [...new Set(files)] };
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const fingerprint = (cwd) => sha(workingChanges(cwd).diff);

// ---- evidence ----

const evidenceFile = (cwd, stage, name) => path.join(cwd, EVIDENCE, stage, `${name}.json`);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

// ---- findings that must be resolved before a commit ----
//
// A high-confidence finding from an expert, confirmed by the skeptic (or never ruled on), keeps
// the commit blocked until it is resolved. Resolved means one of two things: the code was fixed
// and the next review no longer reports it, or the user dismissed it and said why. The first
// needs nothing here: a fix changes the fingerprint, the review runs again, and a new record
// replaces the old one. The second is a waiver, which only a person should write.

const blocking = (f) => f.confidence === 'high';

// Not the line: a finding must keep its identity when unrelated edits move it. Not the whole
// sentence either, only enough of it that a re-worded repeat of the same defect often matches.
function findingId(f) {
  const what = String(f.what || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
  return sha(`${f.expert}|${f.file}|${what}`).slice(0, 10);
}

const waiversFile = (cwd) => path.join(cwd, EVIDENCE, 'waivers.json');
const readWaivers = (cwd) => readJson(waiversFile(cwd)) || {};

/** Every finding in the review records, with whether it is dismissed and whether it is current. */
function allFindings(cwd, hash, names) {
  const waivers = readWaivers(cwd);
  const out = [];
  for (const name of names) {
    const r = readJson(evidenceFile(cwd, 'review', name));
    if (!r || !Array.isArray(r.findings)) continue;
    for (const f of r.findings) out.push({ ...f, waived: Boolean(waivers[f.id]), current: r.hash === hash });
  }
  return out;
}

/** Dismiss one finding. The reason is the user's, kept as given, and shows up wherever findings do. */
function resolve(cwd, id, reason, pluginRoot = PLUGIN_ROOT) {
  if (!id) throw new Error('resolve needs --id <finding id> (experts.js findings lists them)');
  if (!reason || String(reason).trim().length < 5) throw new Error('resolve needs --reason with the user\'s words: a dismissal nobody can read the reason for is not a resolution');
  const names = list(pluginRoot).experts.map((e) => e.name);
  const known = allFindings(cwd, null, names).find((f) => f.id === id);
  if (!known) throw new Error(`no recorded finding has id ${id} (experts.js findings lists them)`);
  const waivers = readWaivers(cwd);
  waivers[id] = { reason: String(reason).trim(), at: new Date().toISOString(), expert: known.expert, file: known.file, what: known.what };
  writeJson(waiversFile(cwd), waivers);
  return { id, expert: known.expert, file: known.file, what: known.what, reason: waivers[id].reason };
}

/**
 * Save the diff the experts will read, and fingerprint the tree it describes.
 * `range` is "working" (uncommitted changes) or any git range such as main..HEAD. The
 * fingerprint is always of the working tree, because the commit gate compares it with
 * the working tree at the moment of the commit.
 */
function prepare(cwd, range = 'working', pluginRoot = PLUGIN_ROOT) {
  const changes = workingChanges(cwd);
  const diff = range === 'working' ? changes.diff : git(cwd, ['diff', range]);
  const diffFile = path.join('.ultimate-workflow', 'review.diff');
  fs.mkdirSync(path.join(cwd, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(cwd, diffFile), diff);
  const hash = sha(changes.diff);
  writeJson(path.join(cwd, EVIDENCE, 'prepared.json'), { hash, range, at: new Date().toISOString() });
  return { hash, range, diffFile, files: changes.files, available: list(pluginRoot).experts };
}

/**
 * Turn a workflow result into evidence. The result must say it succeeded and carry an
 * `expertLane` for this stage; anything else records nothing, so a half-run cannot
 * leave behind a record that looks like a whole one.
 */
function record(cwd, stage, result, { planFile = '', pluginRoot = PLUGIN_ROOT } = {}) {
  if (!STAGES.includes(stage)) throw new Error(`unknown stage "${stage}" (expected ${STAGES.join(', ')})`);
  if (!result || result.ok !== true) throw new Error('the workflow result is not ok, so nothing was recorded');
  const lane = result.expertLane;
  if (!lane || lane.stage !== stage) throw new Error(`the workflow result has no expertLane for stage "${stage}"`);
  if (lane.skipped) throw new Error(`the expert lane was skipped (${lane.skipped}), so nothing was recorded`);

  const available = list(pluginRoot).experts.map((e) => e.name);
  const unknown = [...(lane.selected || []), ...(lane.ran || [])].filter((n) => !available.includes(n));
  if (unknown.length > 0) throw new Error(`Unknown expert(s): ${unknown.join(', ')}`);

  let hash = null;
  if (stage === 'review') {
    const prepared = readJson(path.join(cwd, EVIDENCE, 'prepared.json'));
    if (!prepared) throw new Error('no prepared.json: run `experts.js prepare` before the review, so the record says what was reviewed');
    hash = prepared.hash;
  }

  let plan = null;
  if (planFile) plan = selectIntoPlan(planFile, lane.selected || [], available);

  const at = new Date().toISOString();
  // Findings are kept only for experts that ran: an expert that failed has no review, so it has
  // no findings and no record, and the gate asks for the review again.
  const found = (lane.findings || [])
    .filter((f) => (lane.ran || []).includes(f.expert))
    .map((f) => ({ ...f, id: findingId(f) }));
  for (const name of lane.ran || []) {
    const mine = found.filter((f) => f.expert === name);
    writeJson(evidenceFile(cwd, stage, name), {
      stage,
      name,
      at,
      hash,
      failedElsewhere: (lane.failed || []).length > 0,
      ...(stage === 'review' ? { findings: mine } : {}),
    });
  }
  if (stage === 'review' && lane.recheck === true) {
    writeJson(evidenceFile(cwd, 'review', '_recheck'), { hash, final: lane.selected || [], added: lane.added || [], at });
  }
  const open = found.filter((f) => blocking(f) && !readWaivers(cwd)[f.id]);
  return { stage, recorded: lane.ran || [], failed: lane.failed || [], hash, plan, findings: found.length, open };
}

/** What the commit gate needs to decide, gathered once. Fails open to a skip. */
function commitEvidence(cwd, planFile, pluginRoot = PLUGIN_ROOT) {
  try {
    const available = list(pluginRoot).experts.map((e) => e.name);
    if (available.length === 0) return { skip: 'no experts are installed' };
    const changes = workingChanges(cwd);
    if (changes.files.length === 0) return { skip: 'nothing to commit' };
    if (changes.files.every((f) => gates.isDocPath(f))) return { skip: 'only documentation changed' };

    const recheck = readJson(evidenceFile(cwd, 'review', '_recheck'));
    const records = {};
    for (const name of available) {
      const r = readJson(evidenceFile(cwd, 'review', name));
      if (r && r.hash) records[name] = r.hash;
    }
    let planExperts = [];
    if (planFile) {
      const parsed = readExperts(fs.readFileSync(planFile, 'utf8'));
      if (!parsed.error) planExperts = parsed.experts;
    }
    const hash = sha(changes.diff);
    const open = allFindings(cwd, hash, available).filter((f) => f.current && blocking(f) && !f.waived);
    return { hash, recheck: recheck ? { hash: recheck.hash, final: recheck.final || [] } : null, records, planExperts, available, open };
  } catch {
    return { skip: 'the working tree could not be inspected' };
  }
}

// ---- command line ----

function fail(message) {
  process.stderr.write(`experts.js: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { cmd: argv[0], plan: '', add: null, stage: '', id: '', reason: '', range: 'working', pluginRoot: PLUGIN_ROOT, cwd: process.cwd() };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const need = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${a} needs a value`);
      return v;
    };
    if (a === '--plan') o.plan = need();
    else if (a === '--add') o.add = need().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--stage') o.stage = need();
    else if (a === '--id') o.id = need();
    else if (a === '--reason') o.reason = need();
    else if (a === '--range') o.range = need();
    else if (a === '--plugin-root') o.pluginRoot = need();
    else if (a === '--cwd') o.cwd = need();
    else fail(`unknown argument: ${a}`);
  }
  return o;
}

function main(argv) {
  const o = parseArgs(argv);
  const out = (v) => process.stdout.write(`${JSON.stringify(v)}\n`);
  const needPlan = () => {
    if (!o.plan) fail(`${o.cmd} needs --plan <plan file> (nothing here picks "the newest PLAN-*.md")`);
    return o.plan;
  };

  try {
    if (o.cmd === 'list') {
      const l = list(o.pluginRoot);
      if (l.problems.length > 0) process.stderr.write(`experts.js: ${l.problems.join('; ')}\n`);
      return out(l.experts);
    }
    if (o.cmd === 'read') {
      const r = readExperts(fs.readFileSync(needPlan(), 'utf8'));
      if (r.error) fail(r.error);
      return out({ file: o.plan, present: r.present, experts: r.experts });
    }
    if (o.cmd === 'select') {
      if (o.add === null) fail('select needs --add a,b (use --add "" to record that none apply)');
      return out(selectIntoPlan(needPlan(), o.add, list(o.pluginRoot).experts.map((e) => e.name)));
    }
    if (o.cmd === 'prepare') return out(prepare(o.cwd, o.range, o.pluginRoot));
    if (o.cmd === 'fingerprint') return out({ hash: fingerprint(o.cwd) });
    if (o.cmd === 'record') {
      if (!o.stage) fail('record needs --stage plan|tests|review');
      let result;
      try {
        result = JSON.parse(fs.readFileSync(0, 'utf8'));
      } catch {
        fail('record reads the workflow result as JSON on standard input');
      }
      return out(record(o.cwd, o.stage, result, { planFile: o.plan, pluginRoot: o.pluginRoot }));
    }
    if (o.cmd === 'findings') {
      const names = list(o.pluginRoot).experts.map((e) => e.name);
      return out({ findings: allFindings(o.cwd, fingerprint(o.cwd), names).filter((f) => blocking(f)) });
    }
    if (o.cmd === 'resolve') return out(resolve(o.cwd, o.id, o.reason, o.pluginRoot));
    if (o.cmd === 'check') {
      const evidence = commitEvidence(o.cwd, o.plan, o.pluginRoot);
      const verdict = gates.commitGate(evidence);
      out(verdict.allow ? { ok: true } : { ok: false, reason: verdict.reason, open: evidence.open || [] });
      if (!verdict.allow) process.exit(1);
      return undefined;
    }
  } catch (err) {
    fail(err.message);
  }
  return fail(`unknown command: ${o.cmd || '(none)'} (expected list, read, select, prepare, record, check, findings, resolve, fingerprint)`);
}

module.exports = {
  STAGES,
  list,
  expertsFor,
  mergeAdd,
  readExperts,
  setExperts,
  selectIntoPlan,
  workingChanges,
  fingerprint,
  prepare,
  record,
  commitEvidence,
  findingId,
  resolve,
  allFindings,
};

if (require.main === module) main(process.argv.slice(2));
