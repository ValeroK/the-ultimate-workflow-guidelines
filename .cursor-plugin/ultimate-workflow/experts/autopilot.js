'use strict';

// The autopilot run (4.7.0, PLAN-autopilot.md): everything a card of `/ultimate-workflow:run` needs
// that has to touch files or git, as one command each, so a workflow agent runs one command and no
// ad-hoc git. A workflow script cannot read a file or run a command; what these print (one JSON line,
// always with a boolean `ok`, because the agents that run them do not see exit codes) is what the
// script gets back.
//
//   experts.js pack       --plan P --card C --feature F [--resume]   the card's context pack, and its preflight
//   experts.js handoff    --card C --feature F --range A..B [--claimed a,b]   what the card left for the next ones, from git
//   experts.js park       --plan P --card C --feature F --reason-file R   commit the card's work to uw/parked/F/C and reset
//   experts.js unpark     --plan P --card C --feature F               bring a parked card's work back onto the tip
//   experts.js journal    add --feature F --card C --from FILE [--status committed|parked]
//   experts.js journal    compact --feature F --card C --from FILE    replace the oldest entries' text with a summary
//   experts.js card-commit --plan P --card C --feature F              the gates' own checks, then the commit
//   experts.js card-field --plan P --card C --carried "x; y"          add carried work to a card that has not run
//   experts.js run-branch --feature F                                 create and check out uw/run/F from the current tip
//   experts.js harvest-branch --feature F --from FILE                 harvest proposals as commits on uw/harvest/F
//   experts.js ensure-ignored                                         add .ultimate-workflow/ to the project's .gitignore
//   experts.js run-report --result R [--out P]                        the final report, written from the Workflow output file
//   experts.js run-start --plan P --feature F [--resume | --resume-card C --resume-reason T]
//                                                                     branch, ignore line, baseline and script, as one step
//   experts.js run-finish --output O [--run-id ID]                    keep the output file, write the report, add the ledger row
//
// Where things live: .ultimate-workflow/run/<feature>/journal.md and
// .ultimate-workflow/run/<feature>/cards/<card>/{context.md,handoff.md,parked.md}.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cardsLib = require('./cards.js');

const FEATURE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const JOURNAL_CARD_LINES = 15;
const JOURNAL_MAX_LINES = 200;
// What is never part of a card's work: the plugin's own folder and the plans the gates rewrite.
const EXCLUDES = [':(exclude).ultimate-workflow', ':(exclude,glob)**/PLAN-*.md', ':(exclude)PLAN-*.md'];

const fwd = (p) => String(p).replace(/\\/g, '/');

function checkFeature(feature) {
  if (!FEATURE.test(String(feature || ''))) throw new Error(`--feature "${feature || ''}" must be letters, digits, dot, dash or underscore (it names a branch and a folder)`);
  return feature;
}

function runDir(cwd, feature) {
  return path.join(cwd, '.ultimate-workflow', 'run', checkFeature(feature));
}

function cardDir(cwd, feature, card) {
  if (!cardsLib.NAME.test(String(card || ''))) throw new Error(`--card "${card || ''}" is not a card name`);
  return path.join(runDir(cwd, feature), 'cards', card);
}

const rel = (cwd, p) => fwd(path.relative(cwd, p));

function git(cwd, args, { env = {}, allowFail = false } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, ...env } });
  if (!allowFail && (r.error || r.status !== 0)) throw new Error(`git ${args.join(' ')} failed${r.stderr ? `: ${r.stderr.trim()}` : ''}`);
  return r;
}

const lines = (text) => String(text || '').split(/\r?\n/);
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

/** Every heading of a markdown text with its level and line range (1-based, inclusive). */
function sections(text) {
  const all = lines(text);
  const heads = [];
  let fence = false;
  all.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) return;
    const m = HEADING.exec(l);
    if (m) heads.push({ level: m[1].length, title: m[2], start: i + 1 });
  });
  for (let i = 0; i < heads.length; i++) {
    let end = all.length;
    for (let j = i + 1; j < heads.length; j++) {
      if (heads[j].level <= heads[i].level) {
        end = heads[j].start - 1;
        break;
      }
    }
    heads[i].end = end;
  }
  return heads;
}

// The plan sections every card needs, whatever card it is.
const SHARED = /^(goal|goals|decisions?|constraints?|contracts?|interfaces?|expert input|known failures|non-goals|out of scope)\b/i;

const nameRe = (name) => new RegExp(`^(?:card\\s+)?${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'i');

/**
 * The card's section of the test plan: under the plan's Tests heading, the subheading that names
 * the card ("### 2: parser", "### Card 2"). A plan with one card and no subheadings: the Tests
 * section itself. Null when there is none, which fails the preflight.
 */
function testSection(planText, card, cardCount) {
  const heads = sections(planText);
  const tests = heads.find((h) => /^tests?\b|^test plan\b/i.test(h.title));
  if (!tests) return null;
  const sub = heads.find((h) => h.start > tests.start && h.start <= tests.end && h.level > tests.level && nameRe(card).test(h.title));
  if (sub) return sub;
  if (cardCount <= 1) return tests;
  return null;
}

const DOC_EXT = /\.(md|mdx|markdown|txt|rst|adoc)$/i;

/** First heading, or first non-empty line, of a file: the one-line summary a pack shows. */
function summaryOf(file) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
  const all = lines(text.replace(/^﻿/, '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''));
  const h = all.find((l) => HEADING.test(l));
  const first = h || all.find((l) => l.trim() !== '') || '';
  return first.replace(/^#+\s*/, '').trim().slice(0, 100);
}

const STOP = new Set(['when', 'what', 'with', 'this', 'that', 'from', 'into', 'read', 'file', 'files', 'adding', 'editing', 'touching', 'changing', 'about', 'which', 'there', 'their', 'before', 'after', 'whether']);

/**
 * The topical memory files whose "Read when" cue matches the card (its title, paths and carried
 * items), chosen here and not by a model. A cue matches when one of its backticked terms appears in
 * the card's text (globs and trailing slashes stripped), or one of its plain words of five letters or
 * more is a word of the card's title.
 */
function matchingTopicals(cwd, card) {
  const index = path.join(cwd, 'memory.md');
  let text = '';
  try {
    text = fs.readFileSync(index, 'utf8');
  } catch {
    return [];
  }
  const cardText = cardsLib.cardText(card).toLowerCase();
  const titleWords = new Set(String(card.title).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const out = [];
  for (const line of lines(text)) {
    const link = /\]\((memory\/[^)\s]+\.md)\)/.exec(line);
    if (!link) continue;
    const at = line.search(/read when/i);
    const cue = at === -1 ? '' : line.slice(at + 9);
    if (!cue) continue;
    const terms = [...cue.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\*+/g, '').replace(/\/+$/, '').trim().toLowerCase()).filter((t) => t.length >= 3);
    const words = cue.replace(/`[^`]*`/g, ' ').toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length >= 5 && !STOP.has(w));
    if (terms.some((t) => cardText.includes(t)) || words.some((w) => titleWords.has(w))) {
      if (!out.includes(link[1])) out.push(link[1]);
    }
  }
  return out;
}

/**
 * The context pack for one card: the paths its agents read, each with a one-line summary, written
 * to cards/<card>/context.md. Preflight in the same step: a document the plan cites that does not
 * exist (and that no card is to create), or no test-plan section for the card, fails with a reason
 * the run turns into a park.
 */
function pack(cwd, { plan, card: name, feature, resume = false, adhoc = false }) {
  if (!plan) throw new Error('pack needs --plan');
  const planFile = path.resolve(cwd, plan);
  const planText = fs.readFileSync(planFile, 'utf8');
  const all = cardsLib.parseCards(planText);
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  const dir = cardDir(cwd, feature, card.name);
  const planRel = rel(cwd, planFile);
  const problems = [];

  const heads = sections(planText);
  const entries = [];
  const add = (p, why, { optional = false } = {}) => entries.push({ path: p, why, optional });
  for (const h of heads.filter((x) => x.level === 2 && SHARED.test(x.title))) add(`${planRel} lines ${h.start}-${h.end}`, `## ${h.title}`);
  const own = heads.find((h) => /^card\s/i.test(h.title) && nameRe(card.name).test(h.title));
  if (own) add(`${planRel} lines ${own.start}-${own.end}`, `this card's section: ${own.title}`);
  const cardsHead = heads.find((h) => /^cards$/i.test(h.title));
  if (cardsHead) add(`${planRel} lines ${cardsHead.start}-${cardsHead.end}`, `## Cards: this card is "${card.name}: ${card.title}"`);
  // A card the run adds itself (the findings card, the review's fix-up card) has no test-plan
  // section: its work is the carried items, and the tests are written for them.
  const t = adhoc ? null : testSection(planText, card.name, all.length);
  if (adhoc) add('(in this pack)', 'this card was added by the run and has no test-plan section: write a test for each carried item that can have one');
  else if (!t) problems.push(`no test-plan section for card ${card.name} (a heading under the plan's Tests section that names it)`);
  else add(`${planRel} lines ${t.start}-${t.end}`, `this card's tests: ${t.title}`);

  // Documents the plan cites. One that a card's paths cover is to be written by the run, not read.
  const expertsLib = require('./experts.js');
  const cited = expertsLib.planPaths(planText).map((p) => fwd(p).replace(/^\.\//, '')).filter((p) => DOC_EXT.test(p) && !/(^|\/)PLAN-[^/]*\.md$/.test(p));
  const globRe = expertsLib.globToRegExp;
  for (const doc of [...new Set(cited)]) {
    const byCard = all.some((c) => c.paths.length > 0 && cardsLib.covers(c.paths, doc, globRe));
    if (fs.existsSync(path.join(cwd, doc))) add(doc, summaryOf(path.join(cwd, doc)) || 'cited by the plan');
    else if (!byCard) problems.push(`the plan cites ${doc}, which does not exist`);
  }
  for (const f of ['AGENTS.md', 'CLAUDE.md']) if (fs.existsSync(path.join(cwd, f))) add(f, 'project rules and Gotchas');
  for (const topical of matchingTopicals(cwd, card)) if (fs.existsSync(path.join(cwd, topical))) add(topical, summaryOf(path.join(cwd, topical)) || 'project memory');
  for (const dep of card.depends || []) {
    if (!all.some((c) => c.name.toLowerCase() === dep.toLowerCase())) problems.push(`card ${card.name} depends on ${dep}, which is not a card of the plan`);
    add(rel(cwd, path.join(cardDir(cwd, feature, dep), 'handoff.md')), `what card ${dep} left for this one`, { optional: true });
  }
  add(rel(cwd, path.join(runDir(cwd, feature), 'journal.md')), 'lessons from the earlier cards of this run', { optional: true });
  if (card.carried.length) add('(in this pack)', `carried to this card: ${card.carried.join('; ')}`);
  if (resume) {
    const parked = path.join(dir, 'parked.md');
    if (fs.existsSync(parked)) add(rel(cwd, parked), 'why this card was parked: the diagnosis to start from');
    else problems.push(`--resume, but card ${card.name} has no parked.md`);
  }

  const body = [
    `# Context pack: card ${card.name} (${card.title})`,
    '',
    'Read these before you write anything. Paths are relative to the project root; "lines a-b" is the part of the file that matters. An entry marked "if present" may not exist yet: skip it then.',
    '',
    ...entries.map((e) => `- ${e.path}${e.optional ? ' (if present)' : ''}: ${e.why}`),
    '',
    `Files this card may change: ${card.paths.join(', ') || '(none listed)'}`,
    '',
  ].join('\n');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'context.md');
  fs.writeFileSync(file, body);
  const contextFile = rel(cwd, file);
  if (problems.length > 0) return { ok: false, card: card.name, reason: `missing input: ${problems.join('; ')}`, contextFile };
  return { ok: true, card: card.name, contextFile, entries: entries.length };
}

/**
 * What a committed card left for the cards after it, from git and never from the agent's report:
 * the files it changed, the names it exports that are new, and the claimed test files that are not
 * in the diff at all (an agent once reported tests it never wrote).
 */
function handoff(cwd, { card, feature, range, claimed = [] }) {
  if (!/^[^\s.][^\s]*\.\.[^\s]+$/.test(String(range || ''))) throw new Error('handoff needs --range A..B');
  const expertsLib = require('./experts.js');
  const status = git(cwd, ['diff', '--name-status', '--no-renames', range, '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean);
  const files = status.map((l) => {
    const [s, ...p] = l.split('\t');
    return { status: s, file: fwd(p.join('\t')) };
  });
  const diff = git(cwd, ['diff', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', range, '--', '.', ...EXCLUDES]).stdout;
  const added = {};
  for (const [file, patch] of expertsLib.splitByFile(diff)) {
    const plus = patch.split(/\r?\n/).filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1)).join('\n');
    const names = expertsLib.exportedNames(plus);
    if (names.length) added[file] = names;
  }
  const inDiff = new Set(files.map((f) => f.file));
  // An agent reports paths either way; an absolute one inside the project is the same file (the
  // 1-card end-to-end run reported its own test file as missing for this).
  const asRel = (c) => (path.isAbsolute(c) ? fwd(path.relative(cwd, c)) : fwd(c)).replace(/^\.\//, '');
  const missingClaims = claimed.map(asRel).filter((c) => c && !inDiff.has(c));
  const kind = { A: 'added', M: 'changed', D: 'deleted' };
  const text = [
    `# Handoff: card ${card} (${range})`,
    '',
    ...files.slice(0, 40).map((f) => `- ${kind[f.status[0]] || f.status} ${f.file}${added[f.file] ? `: exports ${added[f.file].slice(0, 8).join(', ')}` : ''}`),
    ...(files.length > 40 ? [`- ...and ${files.length - 40} more files`] : []),
    ...(missingClaims.length ? ['', `Claimed by the build but not in the diff: ${missingClaims.join(', ')}`] : []),
    '',
  ].join('\n');
  const dir = cardDir(cwd, feature, card);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'handoff.md');
  fs.writeFileSync(file, text);
  return { ok: true, card, handoff: rel(cwd, file), files: files.length, missingClaims };
}

/**
 * The card's work as a file list: tracked files changed since HEAD and untracked files, never the
 * plugin's folder or a plan. Staged by name, because `git add -A` with an exclude pathspec for an
 * ignored folder is an error, and without one it would sweep in a folder a project forgot to ignore.
 */
function workFiles(cwd) {
  const changed = git(cwd, ['diff', '--name-only', 'HEAD', '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean);
  const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard', '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean);
  return { changed, untracked, all: [...new Set([...changed, ...untracked])] };
}

function stage(cwd, files, env = {}) {
  if (files.length === 0) return;
  const r = spawnSync('git', ['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], { cwd, input: files.join('\0'), encoding: 'utf8', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`git add failed: ${(r.stderr || '').trim()}`);
}

/** The plan file's text, kept across a reset that would otherwise put back its committed version. */
function keepPlan(cwd, plan, fn) {
  const file = plan ? path.resolve(cwd, plan) : null;
  const before = file && fs.existsSync(file) ? fs.readFileSync(file) : null;
  try {
    return fn();
  } finally {
    if (before !== null) fs.writeFileSync(file, before);
  }
}

/**
 * After a card is committed or parked the tree is a commit whose full run passed, so the plan's
 * `dirty` flag (set by every edit the card made) no longer describes it. Left set, it made G3 block
 * the session's first stop after the run until the suite ran once more for nothing.
 */
function markClean(cwd, plan) {
  try {
    require('../hooks/lib/state.js').patchState(path.resolve(cwd, plan), { dirty: false });
  } catch {}
}

function writePlanField(cwd, plan, card, key, value) {
  const file = path.resolve(cwd, plan);
  const text = fs.readFileSync(file, 'utf8');
  const next = cardsLib.setField(text, card, key, value);
  if (next !== text) fs.writeFileSync(file, next);
}

/**
 * Park a card: its work so far, failing tests included, becomes one commit on
 * uw/parked/<feature>/<card> (built from a temporary index, so nothing is staged and no checkout
 * happens), the working tree goes back to the last good commit, and the plan's card entry records
 * the branch and the reason. The plan and the run folder are kept as they are. A branch, not a
 * stash: a stash is one positional stack, leaves new files out without -u, and is tied to no branch.
 */
function park(cwd, { plan, card: name, feature, reasonFile = '', reason = '' }) {
  if (!plan) throw new Error('park needs --plan');
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  let why = String(reason || '').trim();
  if (reasonFile) why = fs.readFileSync(path.resolve(cwd, reasonFile), 'utf8').trim();
  if (why.length < 5) throw new Error('park needs the reason: --reason-file <file> with the diagnosis (or --reason "<text>")');
  const branch = `uw/parked/${checkFeature(feature)}/${card.name}`;
  const firstLine = why.split(/\r?\n/).find((l) => l.trim()) || why;
  const dir = cardDir(cwd, feature, card.name);
  fs.mkdirSync(dir, { recursive: true });
  const index = path.join(dir, 'park.index');
  const env = { GIT_INDEX_FILE: index };
  const who = { GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'ultimate-workflow', GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'uw@localhost', GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'ultimate-workflow', GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'uw@localhost' };
  const head = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  const work = workFiles(cwd);
  const { untracked, changed } = work;
  let commit = head;
  try {
    fs.rmSync(index, { force: true });
    git(cwd, ['read-tree', 'HEAD'], { env });
    stage(cwd, work.all, env);
    const tree = git(cwd, ['write-tree'], { env }).stdout.trim();
    const msg = `parked: card ${card.name} (${card.title})\n\n${why}\n\nPlan: ${fwd(plan)}`;
    commit = git(cwd, ['commit-tree', tree, '-p', head, '-m', msg], { env: who }).stdout.trim();
  } finally {
    fs.rmSync(index, { force: true });
  }
  git(cwd, ['branch', '-f', branch, commit]);
  keepPlan(cwd, plan, () => {
    git(cwd, ['reset', '-q', '--hard', head]);
    for (const f of untracked) fs.rmSync(path.join(cwd, f), { force: true });
  });
  fs.writeFileSync(path.join(dir, 'parked.md'), `# Parked: card ${card.name} (${card.title})\n\nBranch: ${branch} (commit ${commit.slice(0, 12)}, on ${head.slice(0, 12)})\n\n${why}\n`);
  writePlanField(cwd, plan, card.name, 'parked', `${branch}; ${firstLine.replace(/;/g, ',').slice(0, 200)}`);
  markClean(cwd, plan);
  return { ok: true, card: card.name, branch, commit: commit.slice(0, 12), resetTo: head.slice(0, 12), files: [...new Set([...changed, ...untracked])].length, parked: rel(cwd, path.join(dir, 'parked.md')) };
}

/**
 * Bring a parked card's work back onto the current tip, uncommitted, so the build can resume at the
 * implementation with the tests it already wrote. The parked commit is applied with a three-way
 * merge; a conflict is refused and leaves the tree as it was.
 */
function unpark(cwd, { plan, card: name, feature }) {
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  const branch = (card.parked && card.parked.branch) || `uw/parked/${checkFeature(feature)}/${card.name}`;
  if (git(cwd, ['rev-parse', '--verify', '-q', branch], { allowFail: true }).status !== 0) throw new Error(`no branch ${branch} to resume card ${card.name} from`);
  const dirty = git(cwd, ['status', '--porcelain', '--', '.', ...EXCLUDES]).stdout.trim();
  if (dirty) throw new Error('the working tree has uncommitted changes; commit or park them before resuming a card');
  const patch = git(cwd, ['diff', '--binary', `${branch}^`, branch, '--', '.', ...EXCLUDES]).stdout;
  const tests = git(cwd, ['diff', '--name-only', `${branch}^`, branch, '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean).filter((f) => require('../hooks/lib/gates.js').isTestPath(f));
  if (patch.trim()) {
    const r = spawnSync('git', ['apply', '--3way', '--whitespace=nowarn', '-'], { cwd, input: patch, encoding: 'utf8' });
    if (r.status !== 0) {
      git(cwd, ['reset', '-q', '--hard', 'HEAD'], { allowFail: true });
      throw new Error(`card ${card.name}'s parked work does not apply on the current tip: ${(r.stderr || '').trim().split(/\r?\n/)[0]}`);
    }
    git(cwd, ['reset', '-q'], { allowFail: true });
  }
  writePlanField(cwd, plan, card.name, 'parked', null);
  return { ok: true, card: card.name, from: branch, testFiles: tests };
}

/** Append a card's lessons to the run journal, holding it to its size rule. */
function journalAdd(cwd, { feature, card, from, status = '', at = new Date().toISOString() }) {
  if (!cardsLib.NAME.test(String(card || ''))) throw new Error('journal add needs --card');
  const text = fs.readFileSync(path.resolve(cwd, from), 'utf8').replace(/^﻿/, '').trim();
  const body = lines(text).filter((l) => l.trim() !== '').map((l) => (/^\s*[-*]\s/.test(l) ? l.trim() : `- ${l.trim()}`));
  if (body.length === 0) throw new Error(`${from} is empty: a card with nothing to say writes one line saying so`);
  if (body.length > JOURNAL_CARD_LINES) throw new Error(`${body.length} lines for card ${card}; a journal entry is at most ${JOURNAL_CARD_LINES}. Shorten it and add it again`);
  const file = path.join(runDir(cwd, feature), 'journal.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `# Run journal: ${feature}\n\nLessons from each card of this run, for the cards after it. Not committed; harvest reads it at the end.\n`;
  const entry = `\n## ${card}${status ? ` (${status})` : ''} ${at.slice(0, 16)}\n\n${body.join('\n')}\n`;
  const next = `${existing.replace(/\s+$/, '')}\n${entry}`;
  fs.writeFileSync(file, next);
  const count = lines(next).length;
  const entries = journalEntries(next);
  return { ok: true, card, journal: rel(cwd, file), lines: count, ...(count > JOURNAL_MAX_LINES ? { overLimit: true, oldest: entries.slice(0, Math.max(1, entries.length - 3)).map((e) => e.card) } : {}) };
}

function journalEntries(text) {
  const out = [];
  lines(text).forEach((l, i) => {
    const m = /^##\s+(\S+)/.exec(l);
    if (m) out.push({ card: m[1], start: i });
  });
  return out;
}

/** Replace one card's journal entry with a summary of it: the oldest are summarised, never dropped. */
function journalCompact(cwd, { feature, card, from }) {
  const file = path.join(runDir(cwd, feature), 'journal.md');
  const text = fs.readFileSync(file, 'utf8');
  const summary = lines(fs.readFileSync(path.resolve(cwd, from), 'utf8')).filter((l) => l.trim() !== '').map((l) => (/^\s*[-*]\s/.test(l) ? l.trim() : `- ${l.trim()}`));
  if (summary.length === 0 || summary.length > 3) throw new Error('a summary of a journal entry is one to three lines');
  const all = lines(text);
  const entries = journalEntries(text);
  const at = entries.findIndex((e) => e.card === card);
  if (at === -1) throw new Error(`the journal has no entry for card ${card}`);
  const end = at + 1 < entries.length ? entries[at + 1].start : all.length;
  const head = all[entries[at].start].replace(/\s*\(summarised\)$/, '');
  all.splice(entries[at].start, end - entries[at].start, `${head} (summarised)`, '', ...summary, '');
  fs.writeFileSync(file, all.join('\n'));
  return { ok: true, card, lines: all.length };
}

/**
 * Commit a finished card. The checks are the commit gates' own predicates (G7: a passing full run
 * covers these exact changes; G6: the experts reviewed them and nothing high-confidence is open),
 * run here before anything is staged, because staging new files changes the fingerprint they are
 * judged on. Then every change except the plugin's folder and the plans is committed, the plan's
 * card entry gets `committed:`, and the handoff is written from the commit.
 */
function cardCommit(cwd, { plan, card: name, feature, claimed = [] }) {
  if (!plan) throw new Error('card-commit needs --plan');
  const gates = require('../hooks/lib/gates.js');
  const stateLib = require('../hooks/lib/state.js');
  const verify = require('../hooks/verify.js');
  const expertsLib = require('./experts.js');
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  checkFeature(feature);
  const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (branch !== `uw/run/${feature}`) return { ok: false, card: card.name, reason: `the run commits only on uw/run/${feature}, and HEAD is ${branch}` };
  const state = stateLib.readState(cwd);
  if (stateLib.gatesEnabled(process.env)) {
    const tests = gates.fullSuiteGate(state, verify.fullEvidence(cwd), 'verify.js');
    if (!tests.allow) return { ok: false, card: card.name, gate: 'G7', reason: tests.reason };
    const g = gates.commitGate(expertsLib.commitEvidence(cwd, path.resolve(cwd, plan)));
    if (!g.allow) return { ok: false, card: card.name, gate: 'G6', reason: g.reason };
  }
  const before = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  stage(cwd, workFiles(cwd).all);
  const staged = git(cwd, ['diff', '--cached', '--name-only']).stdout.trim();
  if (!staged) return { ok: false, card: card.name, reason: 'nothing to commit: the card changed no file' };
  const msg = `card ${card.name}: ${card.title}\n\nPlan: ${fwd(plan)}\nRun: uw/run/${feature}`;
  const commit = spawnSync('git', ['commit', '-q', '-F', '-'], { cwd, input: msg, encoding: 'utf8' });
  if (commit.status !== 0) return { ok: false, card: card.name, reason: `git commit failed: ${(commit.stderr || commit.stdout || '').trim().split(/\r?\n/)[0]}` };
  const after = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  writePlanField(cwd, plan, card.name, 'committed', after.slice(0, 12));
  if (card.parked) writePlanField(cwd, plan, card.name, 'parked', null);
  markClean(cwd, plan);
  const h = handoff(cwd, { card: card.name, feature, range: `${before}..${after}`, claimed });
  return { ok: true, card: card.name, commit: after.slice(0, 12), files: h.files, handoff: h.handoff, missingClaims: h.missingClaims };
}

/** Create uw/run/<feature> from the current tip and check it out; reuse it when HEAD is already on it. */
function runBranch(cwd, { feature }) {
  const branch = `uw/run/${checkFeature(feature)}`;
  const current = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (current === branch) return { ok: true, branch, created: false, base: git(cwd, ['rev-parse', 'HEAD']).stdout.trim().slice(0, 12) };
  if (git(cwd, ['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { allowFail: true }).status === 0) {
    return { ok: false, branch, reason: `${branch} already exists and is not checked out: a run with this feature name started before. Resume it with --resume, or choose another feature name` };
  }
  const base = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  git(cwd, ['switch', '-q', '-c', branch]);
  return { ok: true, branch, created: true, from: current, base: base.slice(0, 12) };
}

/**
 * The text of `file` with `addition` added: under the "## Gotchas" heading (after its last line)
 * for a gotcha when the file has one, otherwise at the end. Line endings follow the file.
 */
function withAddition(existing, addition, destination) {
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const add = String(addition).trim().replace(/\r?\n/g, eol);
  if (!existing.trim()) return `${add}${eol}`;
  if (destination === 'gotcha') {
    const all = existing.split(/\r?\n/);
    const at = all.findIndex((l) => /^##\s+gotchas\b/i.test(l));
    if (at !== -1) {
      let end = all.length;
      for (let i = at + 1; i < all.length; i++) if (/^#{1,2}\s/.test(all[i])) { end = i; break; }
      let last = end;
      while (last > at + 1 && all[last - 1].trim() === '') last--;
      all.splice(last, 0, ...add.split(eol));
      return all.join(eol);
    }
  }
  return `${existing.replace(/\s+$/, '')}${eol}${eol}${add}${eol}`;
}

/**
 * Harvest proposals as commits on uw/harvest/<feature>, one per destination file, from the current
 * tip, built from a temporary index so nothing is checked out and the working branch is untouched.
 * The user merges the branch or drops it; nothing reaches project memory unseen.
 */
function harvestBranch(cwd, { feature, from }) {
  const branch = `uw/harvest/${checkFeature(feature)}`;
  const raw = JSON.parse(fs.readFileSync(path.resolve(cwd, from), 'utf8').replace(/^﻿/, ''));
  const proposals = (Array.isArray(raw) ? raw : raw.proposals || []).filter((p) => p && typeof p.path === 'string' && typeof p.text === 'string' && p.text.trim());
  if (proposals.length === 0) return { ok: true, branch: null, commits: [], note: 'no proposals, so no branch' };
  const bad = proposals.find((p) => path.isAbsolute(p.path) || /^[A-Za-z]:/.test(p.path) || fwd(p.path).split('/').includes('..') || /(^|\/)\.git(\/|$)/.test(fwd(p.path)));
  if (bad) throw new Error(`proposal path "${bad.path}" must be relative to the project and stay inside it`);
  if (git(cwd, ['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { allowFail: true }).status === 0) {
    return { ok: false, branch, reason: `${branch} already exists: merge or delete it before harvesting this feature again` };
  }
  const who = { GIT_AUTHOR_NAME: 'ultimate-workflow', GIT_AUTHOR_EMAIL: 'uw@localhost', GIT_COMMITTER_NAME: 'ultimate-workflow', GIT_COMMITTER_EMAIL: 'uw@localhost' };
  const byFile = new Map();
  for (const p of proposals) {
    const f = fwd(p.path).replace(/^\.\//, '');
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(p);
  }
  const dir = runDir(cwd, feature);
  fs.mkdirSync(dir, { recursive: true });
  const index = path.join(dir, 'harvest.index');
  let tip = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  const commits = [];
  try {
    fs.rmSync(index, { force: true });
    git(cwd, ['read-tree', tip], { env: { GIT_INDEX_FILE: index } });
    for (const [file, list] of byFile) {
      const shown = git(cwd, ['show', `${tip}:${file}`], { allowFail: true });
      let text = shown.status === 0 ? shown.stdout : '';
      for (const p of list) text = withAddition(text, p.text, p.destination);
      const blob = spawnSync('git', ['hash-object', '-w', '--stdin'], { cwd, input: text, encoding: 'utf8' }).stdout.trim();
      git(cwd, ['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`], { env: { GIT_INDEX_FILE: index } });
      const tree = git(cwd, ['write-tree'], { env: { GIT_INDEX_FILE: index } }).stdout.trim();
      const msg = `harvest: ${[...new Set(list.map((p) => p.destination || 'note'))].join(', ')} -> ${file}\n\n${list.map((p) => `- ${p.source ? `from ${p.source}: ` : ''}${p.rationale || ''}`.trim()).join('\n')}\n\nRun: uw/run/${feature}`;
      tip = git(cwd, ['commit-tree', tree, '-p', tip, '-m', msg], { env: who }).stdout.trim();
      commits.push({ commit: tip.slice(0, 12), file, proposals: list.length });
    }
  } finally {
    fs.rmSync(index, { force: true });
  }
  git(cwd, ['branch', branch, tip]);
  return { ok: true, branch, commits };
}

/**
 * The final report of a run, written in code from the Workflow output file (the completion notice is
 * cut off when a result is large, so the session never summarises it): every card with its outcome,
 * commit or parked branch and reason, the findings card, the review, the fix-up card, the harvest
 * branch and the findings still pending.
 */
function runReport(cwd, { result: resultFile, out = '' }) {
  const r = require('./ledger.js').unwrapResult(fs.readFileSync(path.resolve(cwd, resultFile), 'utf8'));
  if (r.ok !== true) throw new Error(`the run result is not ok: ${r.error || 'no error given'}`);
  const row = (c) => `| ${c.card} | ${c.title || ''} | ${c.status} | ${c.commit || c.branch || ''} | ${String(c.reason || (c.build ? `${c.build.rounds} round(s)` : '')).replace(/\|/g, '/').replace(/\r?\n/g, ' ')} |`;
  const all = [...(r.cards || []), ...(r.findingsCard ? [r.findingsCard] : []), ...(r.fixupCard ? [r.fixupCard] : [])];
  const unique = all.filter((c, i) => all.findIndex((x) => x.card === c.card && x.status === c.status) === i);
  const lines2 = [
    `# Run report: ${r.feature}`,
    '',
    `Branch \`${r.branch}\` from ${String(r.base || '').slice(0, 12)}. ${r.summary || ''}`,
    ...(r.stopped ? ['', `**The run stopped:** ${r.stopped}`] : []),
    '',
    '| Card | Title | Outcome | Commit or branch | Note |',
    '|---|---|---|---|---|',
    ...unique.map(row),
    ...((r.earlier || []).length ? ['', `Before this run: ${r.earlier.map((e) => `${e.card} ${e.status}`).join(', ')}.`] : []),
    '',
    '## Out of scope and claims',
    '',
    ...(all.filter((c) => (c.outOfScope && c.outOfScope.length) || (c.missingClaims && c.missingClaims.length)).map((c) => `- ${c.card}: ${c.outOfScope && c.outOfScope.length ? `changed outside its paths: ${c.outOfScope.join(', ')}` : ''}${c.missingClaims && c.missingClaims.length ? ` claimed but not in the diff: ${c.missingClaims.join(', ')}` : ''}`)),
    ...(all.some((c) => (c.outOfScope && c.outOfScope.length) || (c.missingClaims && c.missingClaims.length)) ? [] : ['- none']),
    '',
    '## Review',
    '',
    r.review && r.review.ran ? `${(r.review.findings || []).length} confirmed, ${(r.review.refuted || []).length} refuted, ${(r.review.unverified || []).length} unverified (${r.review.range}).` : `Not run: ${(r.review && r.review.reason) || 'the run stopped'}.`,
    ...((r.review && r.review.findings) || []).map((f) => `- [${f.confidence}] ${f.lens}: ${f.file}:${f.line} ${f.what}`),
    '',
    '## Harvest',
    '',
    r.harvest && r.harvest.ran ? (r.harvest.branch ? `${r.harvest.proposals} proposal(s) on \`${r.harvest.branch}\`, one commit per file: ${(r.harvest.commits || []).map((c) => `${c.file} (${c.commit})`).join(', ')}. Merge it to keep them, or delete it.` : `${r.harvest.proposals || 0} proposals${r.harvest.error ? `; not committed: ${r.harvest.error}` : ''}.`) : `Not run: ${(r.harvest && r.harvest.reason) || 'unknown'}.`,
    ...((r.pendingFindings || []).length ? ['', '## Findings not fixed', '', ...r.pendingFindings.map((f) => `- ${f.expert}: ${f.file}:${f.line} ${f.what}`)] : []),
    '',
    'Parked cards resume with `/ultimate-workflow:run --resume <card>`. Nothing was pushed.',
    '',
  ];
  const file = path.resolve(cwd, out || path.join(runDir(cwd, r.feature), 'report.md'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines2.join('\n'));
  return { ok: true, report: rel(cwd, file), summary: r.summary, counts: r.counts || {}, stopped: r.stopped || null };
}

/**
 * Everything before the run's one Workflow call, as one command (the 1-card end-to-end run spent 20
 * of its 46 main-conversation turns on these steps, and an experts check on its own `.gitignore`):
 * the run branch, `.ultimate-workflow/` ignored and that one line committed on the run branch by
 * code (housekeeping of the plugin's own, so no gate applies), the baseline, and the script. A red
 * baseline stops here with the failing tests, for the user's decision.
 */
function runStart(cwd, { plan, feature, resume = null, implementerModel = '', diagnoserModel = '' }) {
  if (!plan) throw new Error('run-start needs --plan');
  checkFeature(feature);
  let branch;
  const name = `uw/run/${feature}`;
  if (resume && git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() !== name) {
    if (git(cwd, ['rev-parse', '--verify', '-q', `refs/heads/${name}`], { allowFail: true }).status !== 0) return { ok: false, reason: `nothing to resume: there is no ${name}` };
    const sw = spawnSync('git', ['switch', '-q', name], { cwd, encoding: 'utf8' });
    if (sw.status !== 0) return { ok: false, reason: `could not check out ${name}: ${(sw.stderr || '').trim()}` };
    branch = { ok: true, branch: name, created: false };
  } else branch = runBranch(cwd, { feature });
  if (!branch.ok) return branch;
  if (resume && resume.card) {
    const back = unpark(cwd, { plan, card: resume.card, feature });
    resume = { ...resume, testFiles: back.testFiles };
  }
  const ignored = ensureIgnored(cwd);
  let ignoreCommit = null;
  if (ignored.added) {
    git(cwd, ['add', '--', '.gitignore']);
    const c = spawnSync('git', ['commit', '-q', '-m', 'uw: ignore .ultimate-workflow/ (the run\'s own state)', '--', '.gitignore'], { cwd, encoding: 'utf8' });
    if (c.status !== 0) return { ok: false, reason: `could not commit the .gitignore line: ${(c.stderr || '').trim()}` };
    ignoreCommit = git(cwd, ['rev-parse', '--short', 'HEAD']).stdout.trim();
  }
  const pluginRoot = path.join(__dirname, '..');
  let baseline = { taken: false };
  const existing = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(cwd, '.ultimate-workflow', 'baseline.json'), 'utf8'));
    } catch {
      return null;
    }
  })();
  const head = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  if (existing && existing.accepted === true && existing.head === head) baseline = { taken: false, kept: true, failures: existing.failures.length };
  else if (!resume) {
    const v = spawnSync(process.execPath, [path.join(pluginRoot, 'hooks', 'verify.js'), '--baseline', '--plan', plan], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const recorded = (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(cwd, '.ultimate-workflow', 'baseline.json'), 'utf8'));
      } catch {
        return null;
      }
    })();
    const fresh = recorded && recorded.head === head ? recorded : null;
    if (fresh && Array.isArray(fresh.failures) && fresh.failures.length > 0 && fresh.accepted !== true) {
      return { ok: false, needs: 'baseline', branch: branch.branch, failing: fresh.failures, reason: 'the suite already fails before the run: the user decides whether these are known failures (verify.js --accept-baseline), then run-start again' };
    }
    if (v.status !== 0 && !fresh) return { ok: false, needs: 'baseline', branch: branch.branch, reason: `the baseline run failed and named no test: ${(v.stdout + v.stderr).trim().split(/\r?\n/).slice(-3).join(' / ')}` };
    baseline = { taken: true, failures: fresh ? fresh.failures.length : 0 };
  }
  const argsFile = path.join(cwd, '.ultimate-workflow', 'run', 'run.args.json');
  fs.mkdirSync(path.dirname(argsFile), { recursive: true });
  fs.writeFileSync(argsFile, `${JSON.stringify({ plan: fwd(plan), feature, ...(resume ? { resume } : {}), ...(implementerModel ? { implementerModel } : {}), ...(diagnoserModel ? { diagnoserModel } : {}) }, null, 2)}\n`);
  const s = require('./experts.js').stageScript(pluginRoot, cwd, 'run', { argsFile });
  const embedded = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(fs.readFileSync(s.scriptPath, 'utf8'))[1]);
  const failed = embedded.cards.filter((c) => c.preflight && c.preflight.ok === false).map((c) => ({ card: c.name, reason: c.preflight.reason }));
  return { ok: true, branch: branch.branch, created: branch.created, ...(ignoreCommit ? { ignoreCommit } : {}), baseline, scriptPath: s.scriptPath, cards: embedded.cards.map((c) => c.name), preflightFailed: failed };
}

/**
 * Everything after the run, as one command: keep the Workflow output file, write the report from it,
 * and add the ledger row with the numbers the output file holds (agents, tokens, and the duration
 * from the agents' own start and end times), so none is retyped.
 */
function runFinish(cwd, { output, runId = '', plan = '' }) {
  if (!output) throw new Error('run-finish needs --output <the Workflow output file>');
  const raw = fs.readFileSync(path.resolve(cwd, output), 'utf8');
  const saved = path.join(cwd, '.ultimate-workflow', 'run', 'run.result.json');
  fs.mkdirSync(path.dirname(saved), { recursive: true });
  fs.writeFileSync(saved, raw);
  const ledger = require('./ledger.js');
  const result = ledger.unwrapResult(raw);
  let wrapper = {};
  try {
    wrapper = JSON.parse(raw);
  } catch {}
  const agents = Array.isArray(wrapper.workflowProgress) ? wrapper.workflowProgress.filter((x) => x && x.type === 'workflow_agent') : [];
  const starts = agents.map((a) => a.startedAt).filter(Number.isFinite);
  const ends = agents.map((a) => a.startedAt + (a.durationMs || 0)).filter(Number.isFinite);
  const row = {
    runId: runId || (output.match(/wf_[A-Za-z0-9-]+/) || [])[0] || 'run',
    tokens: typeof wrapper.totalTokens === 'number' ? wrapper.totalTokens : agents.reduce((n, a) => n + (a.tokens || 0), 0),
    ...(typeof wrapper.agentCount === 'number' ? { agents: wrapper.agentCount } : {}),
    ...(starts.length ? { durationMs: Math.max(...ends) - Math.min(...starts) } : {}),
    ...(plan || result.plan ? { plan: plan || result.plan } : {}),
  };
  const report = result.ok === true ? runReport(cwd, { result: saved }) : null;
  const entry = ledger.addRun(cwd, 'run', row, raw);
  const catches = ledger.readAll(cwd).filter((e) => e.kind === 'catch' && e.run === entry.id).length;
  return { ok: result.ok === true, ...(report ? { report: report.report, summary: report.summary, counts: report.counts, stopped: report.stopped } : { reason: result.error || 'the run result is not ok' }), ledger: { runId: row.runId, tokens: row.tokens, agents: row.agents, durationMs: row.durationMs, catches } };
}

/** `.ultimate-workflow/` in the project's .gitignore, so git-based scanners and `git add -A` skip it. */
function ensureIgnored(cwd) {
  const file = path.join(cwd, '.gitignore');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (lines(text).some((l) => /^\/?\.ultimate-workflow\/?\s*$/.test(l.trim()))) return { ok: true, added: false };
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sep = text === '' || /\r?\n$/.test(text) ? '' : eol;
  fs.writeFileSync(file, `${text}${sep}# ultimate-workflow: per-machine run state, never committed${eol}.ultimate-workflow/${eol}`);
  return { ok: true, added: true };
}

function cli(argv, cwd, out, fail) {
  const sub = argv[0];
  const o = { claimed: [] };
  const rest = argv.slice(1);
  let action = null;
  if (sub === 'journal') action = rest.shift();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--resume' || a === '--adhoc') {
      o[a.slice(2)] = true;
      continue;
    }
    if (!a.startsWith('--')) return fail(`${sub}: unexpected argument ${a}`);
    const v = rest[i + 1];
    if (v === undefined) return fail(`${sub}: ${a} needs a value`);
    o[a.slice(2)] = v;
    i += 1;
  }
  const claimed = typeof o.claimed === 'string' ? o.claimed.split(',').map((s) => s.trim()).filter(Boolean) : [];
  // Every result is one JSON line with a boolean ok: an agent does not see the exit code.
  const run = (fn) => {
    try {
      const r = fn();
      out(r);
      if (r && r.ok === false) process.exitCode = 1;
    } catch (err) {
      out({ ok: false, reason: err.message });
      process.exitCode = 2;
    }
  };
  if (sub === 'pack') return run(() => pack(cwd, { plan: o.plan, card: o.card, feature: o.feature, resume: Boolean(o.resume), adhoc: Boolean(o.adhoc) }));
  if (sub === 'handoff') return run(() => handoff(cwd, { card: o.card, feature: o.feature, range: o.range, claimed }));
  if (sub === 'park') return run(() => park(cwd, { plan: o.plan, card: o.card, feature: o.feature, reasonFile: o['reason-file'] || '', reason: o.reason || '' }));
  if (sub === 'unpark') return run(() => unpark(cwd, { plan: o.plan, card: o.card, feature: o.feature }));
  if (sub === 'card-commit') return run(() => cardCommit(cwd, { plan: o.plan, card: o.card, feature: o.feature, claimed }));
  if (sub === 'run-branch') return run(() => runBranch(cwd, { feature: o.feature }));
  if (sub === 'ensure-ignored') return run(() => ensureIgnored(cwd));
  if (sub === 'harvest-branch') return run(() => harvestBranch(cwd, { feature: o.feature, from: o.from }));
  if (sub === 'run-report') return run(() => runReport(cwd, { result: o.result, out: o.out || '' }));
  if (sub === 'run-start') {
    return run(() => {
      let resume = null;
      if (o['resume-card']) resume = { card: o['resume-card'], reason: o['resume-reason'] || 'resumed by the user' };
      else if (o.resume) resume = { all: true };
      return runStart(cwd, { plan: o.plan, feature: o.feature, resume, implementerModel: o['implementer-model'] || '', diagnoserModel: o['diagnoser-model'] || '' });
    });
  }
  if (sub === 'run-finish') return run(() => runFinish(cwd, { output: o.output, runId: o['run-id'] || '', plan: o.plan || '' }));
  if (sub === 'card-field') {
    return run(() => {
      if (!o.plan || !o.card || typeof o.carried !== 'string') throw new Error('card-field needs --plan, --card and --carried "<item; item>"');
      writePlanField(cwd, o.plan, o.card, 'carried', o.carried);
      return { ok: true, card: o.card, carried: cardsLib.findCard(fs.readFileSync(path.resolve(cwd, o.plan), 'utf8'), o.card).carried };
    });
  }
  if (sub === 'journal') {
    if (action === 'add') return run(() => journalAdd(cwd, { feature: o.feature, card: o.card, from: o.from, status: o.status || '' }));
    if (action === 'compact') return run(() => journalCompact(cwd, { feature: o.feature, card: o.card, from: o.from }));
    return fail('journal: expected add or compact');
  }
  return fail(`unknown autopilot command ${sub}`);
}

const COMMANDS = ['pack', 'handoff', 'park', 'unpark', 'journal', 'card-commit', 'card-field', 'run-branch', 'ensure-ignored', 'harvest-branch', 'run-report', 'run-start', 'run-finish'];

module.exports = { COMMANDS, pack, handoff, park, unpark, journalAdd, journalCompact, cardCommit, runBranch, ensureIgnored, harvestBranch, withAddition, matchingTopicals, testSection, sections, cli, JOURNAL_CARD_LINES, JOURNAL_MAX_LINES };
