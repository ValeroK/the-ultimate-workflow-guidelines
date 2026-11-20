'use strict';

// The autopilot run (4.7.0, PLAN-autopilot.md): everything a card of the unattended run (the Full tier of `/ultimate-workflow:feature`) needs
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
//   experts.js card-commit --plan P --card C --feature F              the commit check without the experts part (left to the run's review), then the commit
//   experts.js card-status --plan P --card C --status S               a card's status in the plan (running, blocked by C)
//   experts.js run-branch --feature F                                 create and check out uw/run/F from the current tip
//   experts.js harvest-branch --feature F --from FILE                 harvest proposals as commits on uw/harvest/F
//   experts.js claims --plan P [--feature F]                          each card's pack size against the budget, and each `measure:` line of the plan measured
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
const memoryLib = require('../lib/memory.js');
const packLib = require('../lib/pack.js');
const runRules = require('../lib/run-rules.js');
const claimsLib = require('../lib/claims.js');

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
/**
 * The heading of the test plan: "Tests", "Test", "Test plan" or "Test cases", alone, or with a note after a mark
 * ("Tests (confirmed)", "Tests: draft") or after by, for, per, of ("Tests by card"). "Test data" and "Test strategy"
 * are other sections: the first heading that only started with "test" was taken as the test plan before 5.2.0.
 * lib/plan-state.js uses this same rule, so the run and `plan-state` cannot disagree.
 */
const TESTS_TITLE = /^(tests?|test plan|test cases)(\s*[(:\-\u2013\u2014].*|\s+(by|for|per|of)\b.*)?$/i;

function testSection(planText, card, cardCount) {
  const heads = sections(planText);
  const tests = heads.find((h) => TESTS_TITLE.test(h.title));
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

/**
 * The topical memory files a card reads, chosen here and not by a model: the headers of
 * <memoryRoot>/memory/*.md decide (lib/memory.js), a file without one falls back to its memory.md
 * cue. Returns [{ path, how }] (and matches for a path match) with path from the project root.
 */
function matchingTopicals(cwd, card, memoryRoot = '') {
  const base = path.join(cwd, memoryRoot);
  const read = (f) => fs.readFileSync(path.join(base, f), 'utf8');
  const dir = path.join(base, 'memory');
  const topicals = {};
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) topicals[`memory/${f}`] = read(`memory/${f}`);
  const memoryMd = fs.existsSync(path.join(base, 'memory.md')) ? read('memory.md') : '';
  return memoryLib.matchTopicals(memoryMd, topicals, card, memoryRoot).map(({ file, ...m }) => ({ path: fwd(path.join(memoryRoot, file)), ...m }));
}

/**
 * The context pack for one card: the paths its agents read, each with a one-line summary, written
 * to cards/<card>/context.md. Preflight in the same step: a document the plan cites that does not
 * exist (and that no card is to create), or no test-plan section for the card, fails with a reason
 * the run turns into a park.
 */
/** The names the run gives the cards it adds itself: the review's fix-up cards, the findings card, the card for a failing full run. */
const RUN_ADDED = /^(fixup|findings|full-suite)(-|$)/i;

function pack(cwd, { plan, card: name, feature, resume = false, adhoc = false, dry = false }) {
  if (!plan) throw new Error('pack needs --plan');
  const planFile = path.resolve(cwd, plan);
  const planText = fs.readFileSync(planFile, 'utf8');
  const all = cardsLib.parseCards(planText);
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  const dir = cardDir(cwd, feature, card.name);
  const planRel = rel(cwd, planFile);
  const problems = [];
  const packWarnings = [];

  const heads = sections(planText);
  const entries = [];
  const planLines = lines(planText);
  const ofRange = (h) => planLines.slice(h.start - 1, h.end).join('\n');
  // A file of another repository of the plan is named `demo:path` (lib/repos.js); `at` is where it is on disk.
  const reposLib = require('../lib/repos.js');
  const planRepos = reposLib.resolve(cwd, planText);
  const at = (f) => reposLib.fileOf(planRepos.repos, f) || path.join(cwd, f);
  for (const p of planRepos.problems) problems.push(p);
  const sizeOfFile = (f) => (fs.existsSync(at(f)) ? fs.readFileSync(at(f), 'utf8').length : 0);
  const add = (p, why, { optional = false, role = 'required', chars = sizeOfFile(p), how, matches } = {}) => entries.push({ path: p, why, optional, role, chars, how, matches });
  const addRange = (h, why) => add(`${planRel} lines ${h.start}-${h.end}`, why, { chars: ofRange(h).length });
  for (const h of heads.filter((x) => x.level === 2 && SHARED.test(x.title))) addRange(h, `## ${h.title}`);
  const own = heads.find((h) => /^card\s/i.test(h.title) && nameRe(card.name).test(h.title));
  const cardsHead = heads.find((h) => /^cards$/i.test(h.title));
  // A card section under ## Cards is already inside that range: listed once, so counted once.
  if (own && !(cardsHead && own.start >= cardsHead.start && own.end <= cardsHead.end)) addRange(own, `this card's section: ${own.title}`);
  if (cardsHead) addRange(cardsHead, `## Cards: this card is "${card.name}: ${card.title}"`);
  // A card the run adds itself (the findings card, the review's fix-up card) has no test-plan
  // section: its work is the carried items, and the tests are written for them.
  // 5.2.0: a resume builds the pack of every card with no --adhoc, so a fix-up card parked for a decision was parked
  // again as "missing input: no test-plan section", and the user committed it by hand.
  const section = adhoc ? null : testSection(planText, card.name, all.length);
  const runAdded = adhoc || (!section && RUN_ADDED.test(card.name) && (card.carried || []).length > 0);
  const t = runAdded ? null : section;
  if (runAdded) add('(in this pack)', 'this card was added by the run and has no test-plan section: write a test for each carried item that can have one', { chars: 0 });
  else if (!t) problems.push(`no test-plan section for card ${card.name} (a heading under the plan's Tests section that names it)`);
  else addRange(t, `this card's tests: ${t.title}`);

  // Documents the plan cites. One that a card's paths cover is to be written by the run, not read.
  const expertsLib = require('./experts.js');
  // The run's own files (the report the Run status block names, a journal) are not documents the
  // user cited: a report missing on a fresh checkout parked the next card as "missing input".
  const cited = expertsLib.planPaths(planText).map((p) => fwd(p).replace(/^\.\//, '')).filter((p) => DOC_EXT.test(p) && !/(^|\/)PLAN-[^/]*\.md$/.test(p) && !/^\.ultimate-workflow\//.test(p));
  const globRe = expertsLib.globToRegExp;
  const namedByText = [own, t].filter(Boolean).map(ofRange).join('\n');
  const perCard = all.some((c) => heads.some((h) => /^card\s/i.test(h.title) && nameRe(c.name).test(h.title)));
  for (const doc of [...new Set(cited)]) {
    const byCard = all.some((c) => c.paths.length > 0 && cardsLib.covers(c.paths, doc, globRe));
    if (fs.existsSync(at(doc))) add(doc, summaryOf(at(doc)) || 'cited by the plan', { role: packLib.citedRole(doc, { perCard, namedByText, namedByPaths: cardsLib.covers(card.paths, doc, globRe) }) });
    // A name with no folder is often a word in backticks, not a path (fault 17): it is a warning, and a path with a folder still has to exist.
    else if (!byCard) ((reposLib.splitPath(doc).repo ? planRepos.repos.some((r) => r.name === reposLib.splitPath(doc).repo) : doc.includes('/')) ? problems : packWarnings).push(`the plan cites ${doc}, which does not exist${reposLib.splitPath(doc).repo && !planRepos.repos.some((r) => r.name === reposLib.splitPath(doc).repo) ? ` (the plan's header declares no repository "${reposLib.splitPath(doc).repo}")` : ''}`);
  }
  for (const f of ['AGENTS.md', 'CLAUDE.md']) if (fs.existsSync(path.join(cwd, f))) add(f, 'project rules and Gotchas', { role: 'conditional' });
  const budget = packLib.budgetOf(require('../hooks/lib/state.js').parseFrontMatter(planText).data.pack_budget);
  for (const { path: topical, how, matches = 0 } of matchingTopicals(cwd, card, memoryLib.rootOfPlan(planText))) {
    add(topical, summaryOf(path.join(cwd, topical)) || 'project memory', { role: 'topical', how, matches });
  }
  for (const dep of card.depends || []) {
    if (!all.some((c) => c.name.toLowerCase() === dep.toLowerCase())) problems.push(`card ${card.name} depends on ${dep}, which is not a card of the plan`);
    add(rel(cwd, path.join(cardDir(cwd, feature, dep), 'handoff.md')), `what card ${dep} left for this one`, { optional: true });
  }
  add(rel(cwd, path.join(runDir(cwd, feature), 'journal.md')), 'lessons from the earlier cards of this run', { optional: true });
  if (card.carried.length) add('(in this pack)', `carried to this card: ${card.carried.join('; ')}`, { chars: 0 });
  if (resume) {
    const parked = path.join(dir, 'parked.md');
    // The run folder is not committed, so on another checkout (or after it was cleaned) the
    // diagnosis comes back from the parked commit's message, which holds the same text.
    const branch = (card.parked && card.parked.branch) || `uw/parked/${checkFeature(feature)}/${card.name}`;
    if (!fs.existsSync(parked)) {
      const msg = git(cwd, ['log', '-1', '--format=%B', branch], { allowFail: true });
      if (msg.status === 0 && msg.stdout.trim()) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(parked, `# Parked: card ${card.name} (${card.title})\n\nBranch: ${branch} (from its commit message)\n\n${msg.stdout.trim()}\n`);
      }
    }
    if (fs.existsSync(parked)) add(rel(cwd, parked), 'why this card was parked: the diagnosis to start from');
    else problems.push(`--resume, but card ${card.name} has no parked.md and no ${branch} to read it from`);
  }

  const others = planRepos.repos.filter((r) => r.name);
  const intro = `Read these before you write anything. Paths are relative to the project root; "lines a-b" is the part of the file that matters. An entry marked "if present" may not exist yet: skip it then.${others.length ? ` This plan has more than one repository. A path that begins with a name and a colon is in that repository: ${others.map((r) => `\`${r.name}:\` is ${fwd(r.dir)}`).join('; ')}.` : ''}`;
  const built = packLib.assemble({ title: `# Context pack: card ${card.name} (${card.title})`, intro, entries, mayChange: card.paths.join(', ') || '(none listed)', budget: budget.budget, warnings: [...packWarnings, ...(budget.warning ? [budget.warning] : [])] });
  const file = path.join(dir, 'context.md');
  // A dry pack (the plan-time check) measures and writes nothing.
  if (!dry) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, built.body);
  }
  const contextFile = rel(cwd, file);
  if (problems.length > 0) return { ok: false, card: card.name, reason: `missing input: ${problems.join('; ')}`, contextFile };
  return { ok: true, card: card.name, contextFile, entries: entries.length, tokens: built.tokens, budget: built.budget, dropped: built.dropped, overBudget: built.overBudget, warnings: built.warnings };
}

/**
 * What a committed card left for the cards after it, from git and never from the agent's report:
 * the files it changed, the names it exports that are new, and the claimed test files that are not
 * in the diff at all (an agent once reported tests it never wrote).
 */
function handoff(cwd, { card, feature, range, claimed = [], others = [] }) {
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
  for (const o of others) {
    for (const l of git(o.dir, ['diff', '--name-status', '--no-renames', o.range, '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean)) {
      const [s, ...p] = l.split('\t');
      files.push({ status: s, file: `${o.repo}:${fwd(p.join('\t'))}` });
    }
  }
  const inDiff = new Set(files.map((f) => f.file));
  // An agent reports paths either way; an absolute one inside the project is the same file (the
  // 1-card end-to-end run reported its own test file as missing for this).
  const asRel = (c) => (path.isAbsolute(c) ? fwd(path.relative(cwd, c)) : fwd(c)).replace(/^\.\//, '');
  const missingClaims = claimed.map(asRel).filter((c) => c && !inDiff.has(c));
  const kind = { A: 'added', M: 'changed', D: 'deleted' };
  // The choices the card made that the plan does not state (minor ones; a major one never commits).
  const decisionsFile = path.join(cardDir(cwd, feature, card), 'decisions.md');
  const minorLines = fs.existsSync(decisionsFile) ? fs.readFileSync(decisionsFile, 'utf8').split(/\r?\n/).slice(fs.readFileSync(decisionsFile, 'utf8').split(/\r?\n/).findIndex((l) => /^## Minor/.test(l)) + 1).filter((l) => /^- /.test(l) && l !== '- none') : [];
  const text = [
    `# Handoff: card ${card} (${range})`,
    '',
    ...files.slice(0, 40).map((f) => `- ${kind[f.status[0]] || f.status} ${f.file}${added[f.file] ? `: exports ${added[f.file].slice(0, 8).join(', ')}` : ''}`),
    ...(files.length > 40 ? [`- ...and ${files.length - 40} more files`] : []),
    ...(missingClaims.length ? ['', `Claimed by the build but not in the diff: ${missingClaims.join(', ')}`] : []),
    ...(minorLines.length ? ['', 'Choices not in the plan (minor):', ...minorLines] : []),
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

/** The other repositories of a plan that can be used (lib/repos.js), each `{ name, dir }`. */
function otherRepos(cwd, planText) {
  const reposLib = require('../lib/repos.js');
  // A repository the header declares and no card uses is the user's own: run-start made no run branch there, so
  // nothing here may read it as the run's, park its work or reset it.
  const used = reposLib.usedBy(cardsLib.parseCards(planText));
  return reposLib.resolve(cwd, planText).repos.filter((r) => r.name && used.includes(r.name));
}

/** The uncommitted files of each other repository of the plan that has some, with their names as the plan writes them (`demo:path`). */
function otherWork(cwd, planText) {
  const out = [];
  for (const r of otherRepos(cwd, planText)) {
    const w = workFiles(r.dir);
    if (w.all.length > 0) out.push({ ...r, ...w, named: w.all.map((f) => `${r.name}:${fwd(f)}`) });
  }
  return out;
}

/** Put the uncommitted work of one folder on a branch there, as one commit on HEAD, and reset the folder to HEAD. */
function parkIn(dir, branch, msg) {
  const index = path.join(require('node:os').tmpdir(), `uw-park-${process.pid}-${Date.now()}.index`);
  const env = { GIT_INDEX_FILE: index };
  const who = { GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'ultimate-workflow', GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'uw@localhost', GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'ultimate-workflow', GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'uw@localhost' };
  const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();
  const work = workFiles(dir);
  let commit = head;
  try {
    git(dir, ['read-tree', 'HEAD'], { env });
    stage(dir, work.all, env);
    const tree = git(dir, ['write-tree'], { env }).stdout.trim();
    commit = git(dir, ['commit-tree', tree, '-p', head, '-m', msg], { env: who }).stdout.trim();
  } finally {
    fs.rmSync(index, { force: true });
  }
  git(dir, ['branch', '-f', branch, commit]);
  git(dir, ['reset', '-q', '--hard', head]);
  for (const f of work.untracked) fs.rmSync(path.join(dir, f), { force: true });
  return commit;
}

/** Bring the work of a parked branch back into one folder, uncommitted: its test files, or a thrown reason. */
function unparkIn(dir, branch, label) {
  if (git(dir, ['status', '--porcelain', '--', '.', ...EXCLUDES]).stdout.trim()) throw new Error(`${label} has uncommitted changes; commit or park them before resuming a card`);
  const patch = git(dir, ['diff', '--binary', `${branch}^`, branch, '--', '.', ...EXCLUDES]).stdout;
  const tests = git(dir, ['diff', '--name-only', `${branch}^`, branch, '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean).filter((f) => require('../hooks/lib/gates.js').isTestPath(f));
  if (patch.trim()) {
    const r = spawnSync('git', ['apply', '--3way', '--whitespace=nowarn', '-'], { cwd: dir, input: patch, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C', LANG: 'C' } });
    if (r.status !== 0) {
      git(dir, ['reset', '-q', '--hard', 'HEAD'], { allowFail: true });
      throw new Error(`the parked work does not apply on the current tip of ${label}: ${runRules.conflictOf(`${r.stderr || ''}\n${r.stdout || ''}`).text}`);
    }
    git(dir, ['reset', '-q'], { allowFail: true });
  }
  return tests;
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

function writePlanField(cwd, plan, card, key, value) {
  const file = path.resolve(cwd, plan);
  const text = fs.readFileSync(file, 'utf8');
  const next = cardsLib.setField(text, card, key, value);
  if (next !== text) fs.writeFileSync(file, next);
}

/** Set a card's `status:` in the plan, checked against the statuses the run writes. */
function setStatus(cwd, plan, card, value) {
  writePlanField(cwd, plan, card, 'status', cardsLib.checkStatus(value));
}

/**
 * Commit the plan alone on the run branch, so the plan there matches the git state after a park or
 * at the end of the run. Nothing on any other branch. A plan the project ignores is left uncommitted
 * and says so; one with no change is no commit.
 */
function commitPlan(cwd, plan, message) {
  const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (!branch.startsWith('uw/run/')) return { committed: false, reason: `HEAD is ${branch}, not a run branch` };
  const rel2 = fwd(path.relative(cwd, path.resolve(cwd, plan)));
  if (git(cwd, ['check-ignore', '-q', '--', rel2], { allowFail: true }).status === 0) return { committed: false, reason: `${rel2} is ignored by git` };
  git(cwd, ['add', '--', rel2]);
  if (!git(cwd, ['diff', '--cached', '--name-only', '--', rel2]).stdout.trim()) return { committed: false, reason: 'the plan did not change' };
  const c = spawnSync('git', ['commit', '-q', '-F', '-', '--', rel2], { cwd, input: `${message}\n\nPlan: ${rel2}`, encoding: 'utf8' });
  if (c.status !== 0) return { committed: false, reason: `git commit failed: ${(c.stderr || c.stdout || '').trim().split(/\r?\n/)[0]}` };
  return { committed: true, commit: git(cwd, ['rev-parse', 'HEAD']).stdout.trim().slice(0, 12) };
}

/**
 * Tell the user about a blocker as it happens, not only in the final report (2026-11-09). Every
 * notice is appended to the run's `notifications.md` (and `.jsonl`), and a desktop notification is
 * fired on the machine the session runs on: a Windows toast, `osascript` on macOS, `notify-send` on
 * Linux. That reaches a user at the desktop app or a terminal on that machine; it does not reach a
 * phone over Remote Control, which only the main session's PushNotification at the end does.
 * `ULTIMATE_WORKFLOW_NOTIFY=off` keeps the file and skips the desktop notification.
 *
 * One desktop notification per run (4.8.0, the owner's choice): only kind `finished` reaches the
 * desktop, and its text names every blocker. Every other kind is written to the files with
 * `desktop: "file-only"`. `desktop` is the function that fires it, an option so a test can count calls.
 */
const NOTIFY_KINDS = ['over-budget', 'parked', 'needs-decision', 'blocked', 'stopped', 'resumed', 'finished', 'warning'];
function notify(cwd, { feature, kind, card = '', reason = '', reasonFile = '', action = '', desktop: send = desktopNotify }) {
  checkFeature(feature);
  if (!NOTIFY_KINDS.includes(kind)) throw new Error(`notify --kind is one of ${NOTIFY_KINDS.join(', ')}`);
  let why = String(reason || '');
  if (reasonFile) why = fs.readFileSync(path.resolve(cwd, reasonFile), 'utf8');
  why = why.replace(/\s*\r?\n\s*/g, ' ').trim();
  const title = `ultimate-workflow ${feature}: ${kind === 'finished' ? 'run finished' : `${card ? `card ${card} ` : ''}${kind}`}`;
  const body = [why.slice(0, 220), action ? `Next: ${action}` : ''].filter(Boolean).join(' ');
  const at = new Date().toISOString();
  const dir = runDir(cwd, feature);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'notifications.md'), `- ${at.slice(0, 19).replace('T', ' ')} **${kind}**${card ? ` card ${card}` : ''}: ${why}${action ? ` Next: \`${action}\`` : ''}\n`);
  const off = /^(off|0|false|no)$/i.test(String(process.env.ULTIMATE_WORKFLOW_NOTIFY || ''));
  const desktop = kind !== 'finished' ? 'file-only' : off ? 'off' : send(title, body);
  // The desktop result is kept with the notice, so what reached the user can be checked afterwards.
  fs.appendFileSync(path.join(dir, 'notifications.jsonl'), `${JSON.stringify({ at, kind, card, reason: why, action, desktop })}\n`);
  return { ok: true, kind, card: card || null, file: rel(cwd, path.join(dir, 'notifications.md')), desktop };
}

function desktopNotify(title, body) {
  const t = String(title).replace(/[\r\n"`$]/g, ' ').slice(0, 120);
  const b = String(body).replace(/[\r\n"`$]/g, ' ').slice(0, 300);
  let r;
  if (process.platform === 'win32') {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;');
    const ps = [
      '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null',
      '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null',
      "$x = New-Object Windows.Data.Xml.Dom.XmlDocument",
      `$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text>${esc(t)}</text><text>${esc(b)}</text></binding></visual></toast>')`,
      "$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'",
      '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))',
    ].join('; ');
    r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 15000 });
  } else if (process.platform === 'darwin') {
    r = spawnSync('osascript', ['-e', `display notification "${b}" with title "${t}"`], { encoding: 'utf8', timeout: 15000 });
  } else {
    r = spawnSync('notify-send', [t, b], { encoding: 'utf8', timeout: 15000 });
  }
  if (r.error) return `failed: ${r.error.code || r.error.message}`;
  if (r.status !== 0) return `failed: exit ${r.status}${r.stderr ? `: ${r.stderr.trim().split(/\r?\n/)[0].slice(0, 160)}` : ''}`;
  return 'sent';
}

/**
 * The decisions a card's work took that the plan does not state (2026-11-09). Some are found in
 * code from the diff against HEAD; the rest are the ones the implementer declared. A major one is
 * a change the user has to agree to: a dependency, a schema or migration, an external service or
 * environment variable, a removed or renamed exported name, security or permission configuration,
 * a file deleted or renamed outside the card's paths. Anything else is minor: recorded in the
 * handoff and the report, never escalated. A finding is planned when the plan names it (the
 * package, the variable, the host, the name, the file), so a decision written into the plan,
 * by the user or by `--resume <card> --accept`, is no longer one.
 */
const MANIFEST = /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|Pipfile|setup\.py|setup\.cfg|go\.mod|Cargo\.toml|Gemfile|composer\.json|pom\.xml|build\.gradle(\.kts)?|[^/]+\.csproj|packages\.config)$/i;
const LOCKFILE = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|Pipfile\.lock|poetry\.lock|go\.sum|Cargo\.lock|Gemfile\.lock|composer\.lock)$/i;
const SCHEMA = /(^|\/)(migrations?|db\/migrate|alembic)\/|\.sql$|\.prisma$|(^|\/)schema\.(graphql|gql|json|ya?ml)$/i;
const SECURITY = /(^|\/)(\.env[^/]*|\.npmrc|CODEOWNERS|Dockerfile|docker-compose[^/]*\.ya?ml)$|(^|\/)\.github\/workflows\/|(^|\/)[^/]*(auth|security|permission|policy|cors|csp|iam|rbac|secret)[^/]*\.(json|ya?ml|toml|ini|conf|config)$/i;
const DOC_OR_TEST = /\.(md|txt)$|(^|\/)(test|tests|__tests__|spec)\/|\.(test|spec)\.[a-z]+$/i;

// 5.2.0, from three runs: a URL that is a name and not a call held cards for the user.
const IDENTIFIER_HOSTS = /^(json-schema\.org|(www\.)?w3\.org|schemas\.openxmlformats\.org|schemas\.microsoft\.com|schemas\.xmlsoap\.org|purl\.org|xmlns\.com|ns\.adobe\.com|docs\.oasis-open\.org|(www\.)?omg\.org|schema\.org|(www\.)?apache\.org|(www\.)?gnu\.org|opensource\.org|creativecommons\.org|spdx\.org)$/;
const IDENTIFIER_LINE = /["']\$(schema|id)["']\s*:|\bxmlns(:[\w.-]+)?\s*=|<!DOCTYPE\b|\bSPDX-License-Identifier\b/i;

function commonExports(text) {
  const names = new Set(require('./experts.js').exportedNames(text));
  for (const m of text.matchAll(/module\.exports\s*=\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of text.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)) for (const p of m[1].split(',')) { const n = p.split(':')[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n); }
  for (const m of text.matchAll(/(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  return names;
}

function packageDeps(text) {
  try {
    const j = JSON.parse(text);
    return Object.assign({}, j.dependencies, j.devDependencies, j.peerDependencies, j.optionalDependencies);
  } catch {
    return {};
  }
}

function detectDecisions(cwd, { plan, card: name, feature = '', declaredFile = '' }) {
  if (!plan) throw new Error('decisions needs --plan');
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  const expertsLib = require('./experts.js');
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Named in the plan as a whole word: `add` in `src/add.js` counts, `add` inside `adder` does not.
  const planned = (s) => new RegExp(`(^|[^A-Za-z0-9_$-])${esc(s)}($|[^A-Za-z0-9_$-])`, 'i').test(planText);
  // A name the plan mentions is part of what the user confirmed, so removing it is planned only
  // when the plan says to remove or rename it.
  const accepted = new RegExp(`^- Accepted during the run for card ${esc(card.name)}:`, 'mi').test(planText);
  const plannedRemoval = (s) => new RegExp(`\\b(remove|rename|drop|delete|replace)[^.\\n]{0,60}(^|[^A-Za-z0-9_$-])${esc(s)}($|[^A-Za-z0-9_$-])`, 'i').test(planText);
  const inCard = (f) => cardsLib.outOfScope([f], card.paths, expertsLib.globToRegExp).length === 0;
  const major = [];
  const minor = [];
  const add = (isMajor, kind, what, item) => (isMajor && !planned(item) ? major : minor).push({ kind, what });
  // 5.2.0: the same reading in each repository of the plan; a file of another one is named `demo:path`.
  for (const where of [{ name: '', dir: cwd }, ...otherRepos(cwd, planText)]) {
    const N = (x) => (where.name ? `${where.name}:${x}` : x);
    const status = git(where.dir, ['diff', '--name-status', 'HEAD', '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
    const untracked = git(where.dir, ['ls-files', '--others', '--exclude-standard', '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean);
    const changed = [...status.filter((s) => s[0] !== 'D').map((s) => fwd(s[s.length - 1])), ...untracked.map(fwd)];
    for (const s of status) {
      if ((s[0] === 'D' || s[0][0] === 'R') && !inCard(N(fwd(s[1])))) add(true, 'file', `${s[0] === 'D' ? 'deleted' : 'renamed'} ${N(fwd(s[1]))}, outside the card's paths`, fwd(s[1]));
    }
    let manifestPlanned = true;
    for (const f of changed) {
      const before = git(where.dir, ['show', `HEAD:${f}`], { allowFail: true });
      const old = before.status === 0 ? before.stdout : null;
      const now = fs.existsSync(path.join(where.dir, f)) ? fs.readFileSync(path.join(where.dir, f), 'utf8') : '';
      if (/(^|\/)package\.json$/.test(f)) {
        const a = packageDeps(old || '{}');
        const b = packageDeps(now);
        for (const [dep, ver] of Object.entries(b)) {
          if (a[dep] === ver) continue;
          const what = `${a[dep] ? 'changed' : 'added'} dependency ${dep}@${ver} in ${N(f)}`;
          if (!planned(dep)) manifestPlanned = false;
          add(true, 'dependency', what, dep);
        }
        for (const dep of Object.keys(a)) if (!(dep in b)) { if (!planned(dep)) manifestPlanned = false; add(true, 'dependency', `removed dependency ${dep} from ${N(f)}`, dep); }
        continue;
      }
      if (MANIFEST.test(f)) { if (!planned(f)) manifestPlanned = false; add(true, 'dependency', `changed the dependency manifest ${N(f)}`, f); continue; }
      if (SCHEMA.test(f)) {
        // 5.2.0: a new migration held two cards whose own paths were `migrations/versions/**`.
        const cardNamesIt = old === null && (card.paths || []).some((p) => SCHEMA.test(cardsLib.splitPath(p).path.replace(/\*+$/, '')) && cardsLib.outOfScope([N(f)], [p], expertsLib.globToRegExp).length === 0);
        add(!cardNamesIt, 'schema', `${old === null ? 'added' : 'changed'} the schema or migration ${N(f)}${cardNamesIt ? ' (the paths of the card name this place)' : ''}`, f);
        continue;
      }
      if (SECURITY.test(f)) { add(true, 'security', `${old === null ? 'added' : 'changed'} the security or permission configuration ${N(f)}`, f); continue; }
      if (LOCKFILE.test(f)) continue;
      if (DOC_OR_TEST.test(f)) continue;
      const oldLines = new Set((old || '').split(/\r?\n/));
      const addedText = now.split(/\r?\n/).filter((l) => !oldLines.has(l)).join('\n');
      for (const m of addedText.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)|process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]|os\.environ(?:\.get)?\(?\[?['"]([A-Z_][A-Z0-9_]*)|getenv\(\s*['"]([A-Z_][A-Z0-9_]*)/g)) {
        const v = m[1] || m[2] || m[3] || m[4];
        add(true, 'env', `reads the environment variable ${v} in ${N(f)}`, v);
      }
      for (const line of addedText.split('\n')) {
        for (const m of line.matchAll(/https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
          const host = m[1].toLowerCase();
          if (/^(localhost|127\.0\.0\.1|example\.(com|org|net))$/.test(host) || host.endsWith('.example.com')) continue;
          if (IDENTIFIER_HOSTS.test(host) || IDENTIFIER_LINE.test(line)) add(false, 'service', `names ${host} in ${N(f)} as an identifier (a schema dialect, an id or a namespace), not a call`, host);
          else add(true, 'service', `calls the external host ${host} in ${N(f)}`, host);
        }
      }
      if (old !== null) {
        const had = commonExports(old);
        const has = commonExports(now);
        for (const n of had) if (!has.has(n)) (plannedRemoval(n) ? minor : major).push({ kind: 'interface', what: `removed or renamed the exported name ${n} in ${N(f)}` });
      }
    }
    for (const f of changed) if (LOCKFILE.test(f)) add(!manifestPlanned || !changed.some((x) => MANIFEST.test(x) || /package\.json$/.test(x)), 'dependency', `changed the lockfile ${N(f)}`, f);
  }
  let declared = [];
  if (declaredFile && fs.existsSync(path.resolve(cwd, declaredFile))) {
    try {
      declared = JSON.parse(fs.readFileSync(path.resolve(cwd, declaredFile), 'utf8').replace(/^﻿/, ''));
    } catch {
      declared = [];
    }
  }
  for (const d of Array.isArray(declared) ? declared : []) {
    if (!d || typeof d.what !== 'string' || !d.what.trim()) continue;
    // A card whose decision the user accepted (`--accept`) declares it again: that one is covered.
    // What code finds is still held against the plan, so a new dependency is still the user's.
    const what = d.what.trim().replace(/\s+/g, ' ');
    if (d.major === true && accepted) minor.push({ kind: 'declared', what: `${what} (covered by the decision the user accepted for this card)` });
    else (d.major === true ? major : minor).push({ kind: 'declared', what });
  }
  const dedupe = (xs) => xs.filter((x, i) => xs.findIndex((y) => y.what === x.what) === i);
  const out = { ok: true, card: card.name, major: dedupe(major), minor: dedupe(minor) };
  if (feature) {
    // The handoff reads this, so the next cards see the minor choices too.
    const dir = cardDir(cwd, checkFeature(feature), card.name);
    fs.mkdirSync(dir, { recursive: true });
    const line = (x) => `- ${x.kind}: ${x.what}`;
    fs.writeFileSync(path.join(dir, 'decisions.md'), [`# Decisions not in the plan: card ${card.name}`, '', '## Major (need the user)', '', ...(out.major.length ? out.major.map(line) : ['- none']), '', '## Minor (recorded only)', '', ...(out.minor.length ? out.minor.map(line) : ['- none']), ''].join('\n'));
    out.file = rel(cwd, path.join(dir, 'decisions.md'));
  }
  return out;
}

/**
 * The user accepted a card's held decision: it becomes a line of the plan's Decisions section and
 * the card's `decision:` line goes. The plan is hashed again, since the user's --accept is a
 * confirmation of this one change.
 */
function acceptDecision(cwd, plan, card) {
  const file = path.resolve(cwd, plan);
  const text = fs.readFileSync(file, 'utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const line = `- Accepted during the run for card ${card.name}: ${card.decision}`;
  const all = text.split(/\r?\n/);
  const at = all.findIndex((l) => /^##\s+Decisions\s*$/i.test(l));
  if (at !== -1) {
    let end = all.length;
    for (let i = at + 1; i < all.length; i++) if (/^#{1,2}\s/.test(all[i])) { end = i; break; }
    while (end > at + 1 && all[end - 1].trim() === '') end--;
    all.splice(end, 0, line);
  } else {
    const cards = all.findIndex((l) => /^##\s+Cards\s*$/i.test(l));
    all.splice(cards === -1 ? all.length : cards, 0, '## Decisions', '', line, '');
  }
  let next = all.join(nl);
  next = cardsLib.setField(next, card.name, 'decision', null);
  const ex = require('./experts.js');
  next = ex.setConfirmed(next, 'tests_confirmed');
  fs.writeFileSync(file, next);
}

/** `card-status`: one transition the run makes without a commit (running, blocked by). */
function cardStatus(cwd, { plan, card: name, status }) {
  if (!plan) throw new Error('card-status needs --plan');
  const card = cardsLib.findCard(fs.readFileSync(path.resolve(cwd, plan), 'utf8'), name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  setStatus(cwd, plan, card.name, status);
  return { ok: true, card: card.name, status: cardsLib.checkStatus(status) };
}

/** The `## Run status` block at the end of the plan, replaced when there is one already. */
function writeRunStatus(cwd, plan, { branch, harvest, report, date }) {
  const file = path.resolve(cwd, plan);
  const text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const counts = {};
  for (const c of cardsLib.parseCards(text)) {
    // A card from a plan written before statuses existed is counted by its committed or parked field.
    const k = c.status ? cardsLib.statusKind(c.status) : c.committed ? 'committed' : c.parked ? 'parked' : 'pending';
    counts[k] = (counts[k] || 0) + 1;
  }
  const block = [
    '## Run status',
    '',
    `- Date: ${date}`,
    `- Run branch: ${branch}`,
    `- Cards: ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ') || 'none'}`,
    `- Harvest: ${harvest || 'none'}`,
    `- Report: ${report}`,
  ];
  const all = text.split(/\r?\n/);
  const at = all.findIndex((l) => /^##\s+Run status\s*$/i.test(l));
  if (at !== -1) {
    let end = all.length;
    for (let i = at + 1; i < all.length; i++) if (/^#{1,2}\s/.test(all[i])) { end = i; break; }
    while (end > at + 1 && all[end - 1].trim() === '') end--;
    all.splice(at, end - at, ...block);
    fs.writeFileSync(file, all.join(eol));
  } else fs.writeFileSync(file, `${text.replace(/\s+$/, '')}${eol}${eol}${block.join(eol)}${eol}`);
  return counts;
}

/**
 * Park a card: its work so far, failing tests included, becomes one commit on
 * uw/parked/<feature>/<card> (built from a temporary index, so nothing is staged and no checkout
 * happens), the working tree goes back to the last good commit, and the plan's card entry records
 * the branch and the reason. The plan and the run folder are kept as they are. A branch, not a
 * stash: a stash is one positional stack, leaves new files out without -u, and is tied to no branch.
 */
function park(cwd, { plan, card: name, feature, reasonFile = '', reason = '', needsDecision = false }) {
  if (!plan) throw new Error('park needs --plan');
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  let why = String(reason || '').trim();
  if (reasonFile) why = fs.readFileSync(path.resolve(cwd, reasonFile), 'utf8').trim();
  if (why.length < 5) throw new Error('park needs the reason: --reason-file <file> with the diagnosis (or --reason "<text>")');
  const branch = `uw/parked/${checkFeature(feature)}/${card.name}`;
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
    const msg = `${needsDecision ? 'needs decision' : 'parked'}: card ${card.name} (${card.title})\n\n${why}\n\nPlan: ${fwd(plan)}`;
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
  // The whole reason on one line, not its first line: a reason that is a heading and a list kept
  // only "...so no fix round:" in the plan, as the report once did (2026-11-09, a real run).
  // The plan lines stay short: cut at a word end, and they name parked.md, which holds the whole text.
  const short = runRules.shortReason(why, `whole text: ${rel(cwd, path.join(dir, 'parked.md'))}`);
  writePlanField(cwd, plan, card.name, 'parked', `${branch}; ${short}`);
  // A card held for a major decision the plan does not state says so, and the plan holds the decision.
  setStatus(cwd, plan, card.name, `${needsDecision ? 'needs-decision' : 'parked'} ${branch}; ${short}`);
  // The decision in full (up to 1000 characters): --accept copies it into the plan's Decisions, and a
  // line cut at 240 accepted half a sentence (2026-11-09, a real run).
  if (needsDecision) {
    // The decision itself, which --accept copies into the plan: never the instructions around it.
    const flat = why.replace(/\s*\r?\n\s*/g, ' ');
    const within = /^cannot be done within the plan: needs decision (.*?); run --resume \S+ --accept to allow it, or change the plan\./i.exec(flat);
    writePlanField(cwd, plan, card.name, 'decision', (within ? within[1] : flat.replace(/^needs a decision the plan does not state:\s*/i, '')).slice(0, 1000));
  }
  // The run branch gets the plan's new state as its own commit, so the plan there matches git.
  const planCommit = commitPlan(cwd, plan, `plan: card ${card.name} ${needsDecision ? 'needs a decision' : 'parked'}, work on ${branch}`);
  // 5.2.0: the card's work in each other repository of the plan is parked there, on the branch of the same name.
  const planNow = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const withWork = otherWork(cwd, planNow);
  for (const r of otherRepos(cwd, planNow)) {
    if (!withWork.some((w) => w.name === r.name)) git(r.dir, ['branch', '-q', '-D', branch], { allowFail: true });
  }
  const elsewhere = withWork.map((r) => ({ repo: r.name, files: r.all.length, commit: parkIn(r.dir, branch, `${needsDecision ? 'needs decision' : 'parked'}: card ${card.name} (${card.title})\n\n${why}\n\nPlan: ${fwd(path.relative(r.dir, path.resolve(cwd, plan)))}`).slice(0, 12) }));
  return { ok: true, card: card.name, branch, commit: commit.slice(0, 12), resetTo: head.slice(0, 12), files: [...new Set([...changed, ...untracked])].length, parked: rel(cwd, path.join(dir, 'parked.md')), planCommit, ...(elsewhere.length ? { repos: elsewhere } : {}) };
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
  // 5.2.0: the other repositories that hold parked work of this card. Each is checked before anything is applied
  // anywhere: a refusal after the main repository was changed would leave the card half resumed, and a second try refused.
  const elsewhere = otherRepos(cwd, planText).filter((r) => git(r.dir, ['rev-parse', '--verify', '-q', branch], { allowFail: true }).status === 0);
  for (const r of elsewhere) {
    if (git(r.dir, ['status', '--porcelain', '--', '.', ...EXCLUDES]).stdout.trim()) throw new Error(`repository ${r.name} has uncommitted changes; commit or park them before resuming a card. Nothing was brought back in any repository`);
    const feat = String(branch).split('/')[2] || feature;
    if (git(r.dir, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() !== `uw/run/${feat}`) throw new Error(`repository ${r.name} is not on uw/run/${feat}; check it out there first. Nothing was brought back in any repository`);
  }
  const patch = git(cwd, ['diff', '--binary', `${branch}^`, branch, '--', '.', ...EXCLUDES]).stdout;
  const tests = git(cwd, ['diff', '--name-only', `${branch}^`, branch, '--', '.', ...EXCLUDES]).stdout.split(/\r?\n/).filter(Boolean).filter((f) => require('../hooks/lib/gates.js').isTestPath(f));
  if (patch.trim()) {
    const r = spawnSync('git', ['apply', '--3way', '--whitespace=nowarn', '-'], { cwd, input: patch, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C', LANG: 'C' } });
    if (r.status !== 0) {
      git(cwd, ['reset', '-q', '--hard', 'HEAD'], { allowFail: true });
      throw new Error(`card ${card.name}'s parked work does not apply on the current tip: ${runRules.conflictOf(`${r.stderr || ''}\n${r.stdout || ''}`).text}`);
    }
    git(cwd, ['reset', '-q'], { allowFail: true });
  }
  const back = [];
  /** Take back what an apply put in a folder: the tracked files to HEAD, and the files the parked commit added. */
  const undo = (dir) => {
    const added = git(dir, ['diff', '--name-only', '--diff-filter=A', `${branch}^`, branch, '--', '.', ...EXCLUDES], { allowFail: true }).stdout.split(/\r?\n/).filter(Boolean);
    git(dir, ['reset', '-q', '--hard', 'HEAD'], { allowFail: true });
    for (const f of added) fs.rmSync(path.join(dir, f), { force: true });
  };
  for (const r of elsewhere) {
    try {
      for (const t of unparkIn(r.dir, branch, `repository ${r.name}`)) tests.push(`${r.name}:${fwd(t)}`);
      back.push(r.name);
    } catch (err) {
      // The work of this card is put back where it was, in the main repository and in each one already done.
      keepPlan(cwd, plan, () => undo(cwd));
      for (const done of elsewhere.filter((x) => back.includes(x.name))) undo(done.dir);
      throw new Error(`${err.message}. Nothing was brought back in any repository`);
    }
  }
  writePlanField(cwd, plan, card.name, 'parked', null);
  setStatus(cwd, plan, card.name, 'resumed');
  return { ok: true, card: card.name, from: branch, testFiles: tests, ...(back.length ? { repos: back } : {}) };
}

/** Append a card's lessons to the run journal, holding it to its size rule. */
function journalAdd(cwd, { feature, card, from, status = '', at = new Date().toISOString() }) {
  if (!cardsLib.NAME.test(String(card || ''))) throw new Error('journal add needs --card');
  const text = fs.readFileSync(path.resolve(cwd, from), 'utf8').replace(/^﻿/, '').trim();
  const body = lines(text).filter((l) => l.trim() !== '').map((l) => (/^\s*[-*]\s/.test(l) ? l.trim() : `- ${l.trim()}`));
  if (body.length === 0) throw new Error(`${from} is empty: a card with nothing to say writes one line saying so`);
  // A size limit warns and never stops a run: the entry keeps its first lines and says so.
  const tooLong = body.length > JOURNAL_CARD_LINES ? `${body.length} lines for card ${card}; a journal entry is at most ${JOURNAL_CARD_LINES}, so only the first ${JOURNAL_CARD_LINES} were kept` : '';
  if (tooLong) body.length = JOURNAL_CARD_LINES;
  const file = path.join(runDir(cwd, feature), 'journal.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `# Run journal: ${feature}\n\nLessons from each card of this run, for the cards after it. Not committed; harvest reads it at the end.\n`;
  // 5.2.0: one entry for each card.
  const all = lines(existing);
  const heads = journalEntries(existing);
  const mine = heads.map((e, i) => ({ ...e, end: i + 1 < heads.length ? heads[i + 1].start : all.length })).filter((e) => e.card === card);
  let earlier = '';
  const lastPark = [...mine].reverse().find((e) => /\(parked\)/.test(all[e.start]));
  if (lastPark) {
    const when = (/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(all[lastPark.start]) || [])[1] || '';
    const first = all.slice(lastPark.start + 1, lastPark.end).find((l) => /^\s*[-*]\s/.test(l) && !/^\s*[-*]\s+Earlier attempt, parked/.test(l));
    if (first) earlier = `- Earlier attempt, parked${when ? ` ${when}` : ''}: ${first.replace(/^\s*[-*]\s+/, '').slice(0, 300)}\n`;
  }
  for (const e of [...mine].reverse()) all.splice(e.start, e.end - e.start);
  const kept = mine.length > 0 ? all.join('\n') : existing;
  const entry = `\n## ${card}${status ? ` (${status})` : ''} ${at.slice(0, 16)}\n\n${earlier}${body.join('\n')}\n`;
  const next = `${kept.replace(/\s+$/, '')}\n${entry}`;
  fs.writeFileSync(file, next);
  const count = lines(next).length;
  const entries = journalEntries(next);
  return { ok: true, card, journal: rel(cwd, file), lines: count, ...(mine.length > 0 ? { replaced: mine.length } : {}), ...(tooLong ? { warning: tooLong } : {}), ...(count > JOURNAL_MAX_LINES ? { overLimit: true, oldest: entries.slice(0, Math.max(1, entries.length - 3)).map((e) => e.card) } : {}) };
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
function cardCommit(cwd, { plan, card: name, feature, claimed = [], fullAtEnd = false }) {
  if (!plan) throw new Error('card-commit needs --plan');
  const gates = require('../hooks/lib/gates.js');
  const stateLib = require('../hooks/lib/state.js');
  const expertsLib = require('./experts.js');
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const card = cardsLib.findCard(planText, name);
  if (!card) throw new Error(`no card "${name}" in ${plan}`);
  checkFeature(feature);
  const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (branch !== `uw/run/${feature}`) return { ok: false, card: card.name, reason: `the run commits only on uw/run/${feature}, and HEAD is ${branch}` };
  // 5.2.0: the card's uncommitted work in the other repositories of the plan. Each needs a passing test record for
  // exactly its changes (verify.js --repo <name>), and everything is checked before anything is committed anywhere.
  const elsewhere = otherWork(cwd, planText);
  for (const r of elsewhere) {
    if (git(r.dir, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() !== `uw/run/${feature}`) return { ok: false, card: card.name, reason: `repository ${r.name} is not on uw/run/${feature}, so the card cannot be committed there. Nothing was committed in any repository.` };
  }
  // Read only when there is another repository: a plan with one repository takes the path it always took.
  const mainEmpty = elsewhere.length > 0 && workFiles(cwd).all.length === 0;
  if (stateLib.gatesEnabled(process.env)) {
    for (const r of elsewhere) {
      const readRec = (name) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(r.dir, '.ultimate-workflow', name), 'utf8'));
        } catch {
          return null;
        }
      };
      const now = expertsLib.testFingerprint(r.dir);
      const covers = (rec) => Boolean(rec && rec.passed === true && rec.fingerprint === now);
      // verify.js writes no record for a change that needs no test (documentation only): the same question, asked here.
      let needsNone = false;
      try {
        needsNone = Boolean(expertsLib.testsEvidence(r.dir).skip);
      } catch {}
      if (!needsNone && !(covers(readRec('verify.json')) || (fullAtEnd && covers(readRec('verify-related.json'))))) {
        return { ok: false, card: card.name, gate: 'G7', repo: r.name, reason: `Gate G7: no passing test run covers the changes in repository ${r.name}. Run \`verify.js --plan ${fwd(plan)} --repo ${r.name}${fullAtEnd ? '' : ' --full'}\` once, then commit again. Nothing was committed in any repository.` };
      }
    }
  }
  // The one commit decision, the same as the hook asks. Off means off: the check is recorded as exempt.
  let check = { outcome: 'exempt', why: 'gates off (ULTIMATE_WORKFLOW_GATES)', missing: [] };
  if (mainEmpty) check = { outcome: 'exempt', why: 'no change in the main repository; the other repositories have their own test records', missing: [] };
  else if (stateLib.gatesEnabled(process.env)) {
    // A stale memory index is no reason to refuse: it is regenerated below and committed with the card.
    const ev = expertsLib.commitEvidence(cwd, path.resolve(cwd, plan), undefined, { card: card.name, stage: 'feature', script: 'verify.js', staleIndexOk: true, deferExperts: true, fullAtEnd });
    const g = gates.commitGate(ev);
    check = gates.checkRecord(g);
    stateLib.writeCommitStamp(cwd, check);
    // Nobody watches the run: a check that cannot be made parks the card, where by hand it lets the commit through.
    if (g.outcome === 'could-not-check') return { ok: false, card: card.name, gate: 'could-not-check', reason: `could not check this commit: ${g.why}`, check };
    if (!g.allow) {
      const kinds = (g.missing || []).map((m) => m.kind);
      return { ok: false, card: card.name, gate: kinds.includes('tests') ? 'G7' : kinds.includes('memory') ? 'memory' : kinds.includes('experts') ? 'G6' : 'confirmation', reason: g.reason, check };
    }
    const stale = Boolean(ev.staleIndex);
    if (stale) memoryLib.cli(['index', '--root', memoryLib.rootOfPlan(planText) || '.'], cwd, () => {}, (m) => { throw new Error(m); });
  }
  const before = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  // After the gate: the memory index it regenerates is one of the files.
  const files = workFiles(cwd).all;
  if (files.length === 0 && elsewhere.length === 0) return { ok: false, card: card.name, reason: 'nothing to commit: the card changed no file' };
  const msg = `card ${card.name}: ${card.title}\n\nPlan: ${fwd(plan)}\nRun: uw/run/${feature}`;
  // The other repositories first, the main one last: its commit holds the plan with the card's status. Two commits
  // are not one step: when a later one fails, nothing is undone, and the answer says which repository has a commit.
  const done = [];
  const has = () => (done.length ? ` Already committed, and not undone: ${done.map((d) => `repository ${d.repo} ${d.commit}`).join(', ')}.` : '');
  for (const r of elsewhere) {
    const was = git(r.dir, ['rev-parse', 'HEAD']).stdout.trim();
    stage(r.dir, r.all);
    const c = spawnSync('git', ['commit', '-q', '-F', '-'], { cwd: r.dir, input: `${msg}\nMain repository: ${fwd(path.relative(r.dir, cwd))}`, encoding: 'utf8' });
    if (c.status !== 0) return { ok: false, card: card.name, reason: `git commit failed in repository ${r.name}: ${(c.stderr || c.stdout || '').trim().split(/\r?\n/)[0]}.${has()}`, ...(done.length ? { partial: done } : {}) };
    const is = git(r.dir, ['rev-parse', 'HEAD']).stdout.trim();
    done.push({ repo: r.name, dir: fwd(r.dir), commit: is.slice(0, 12), range: `${was}..${is}` });
  }
  // The plan goes into the card's own commit with the card's new status (and every earlier card's
  // sha, written after their commits), so the plan on the run branch matches git. A commit cannot
  // hold its own sha, so this card's sha is written after it and lands with the next commit.
  const doneWord = 'committed';
  setStatus(cwd, plan, card.name, doneWord);
  if (card.parked) writePlanField(cwd, plan, card.name, 'parked', null);
  // A card held for a decision and then done within the plan: the decision was not taken.
  if (card.decision) writePlanField(cwd, plan, card.name, 'decision', null);
  stage(cwd, files);
  const planRel = fwd(path.relative(cwd, path.resolve(cwd, plan)));
  if (git(cwd, ['check-ignore', '-q', '--', planRel], { allowFail: true }).status !== 0) git(cwd, ['add', '--', planRel], { allowFail: true });
  // A card that changed only another repository, in a project whose plan is not in git: nothing is staged here.
  const staged = git(cwd, ['diff', '--cached', '--quiet'], { allowFail: true }).status !== 0;
  if (staged) {
    const commit = spawnSync('git', ['commit', '-q', '-F', '-'], { cwd, input: msg, encoding: 'utf8' });
    if (commit.status !== 0) return { ok: false, card: card.name, reason: `git commit failed${done.length ? ' in the main repository' : ''}: ${(commit.stderr || commit.stdout || '').trim().split(/\r?\n/)[0]}.${has()}`, ...(done.length ? { partial: done } : {}) };
  }
  const after = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  // The plan's card line holds the commit of each repository: `committed: 1a2b3c4 demo=5d6e7f8`.
  // With nothing staged here, HEAD is the commit before this card: the card has no commit in the main repository, and
  // its line names only the repositories that have one.
  const mine = staged ? after.slice(0, 12) : '';
  writePlanField(cwd, plan, card.name, 'committed', [mine, ...done.map((d) => `${d.repo}=${d.commit}`)].filter(Boolean).join(' '));
  setStatus(cwd, plan, card.name, mine ? `${doneWord} ${mine}` : doneWord);
  const h = handoff(cwd, { card: card.name, feature, range: `${before}..${after}`, claimed, others: done });
  return { ok: true, card: card.name, commit: mine, files: h.files, handoff: h.handoff, missingClaims: h.missingClaims, check, ...(done.length ? { repos: done.map((d) => ({ repo: d.repo, commit: d.commit })) } : {}) };
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
 * The HEAD now, and what run.json (next to the run's base) recorded of the last review and harvest:
 * the HEAD the review covered, the HEAD the harvest covered and the harvest branch made. They are
 * recorded apart, so the half that failed is run again: `record` with `review` or `harvest` moves
 * that head only, and with neither it moves both. A harvest branch recorded earlier is kept when
 * none is given.
 */
/** The harvest branches of one feature that still exist: `uw/harvest/<feature>` and its `-2`, `-3`, ... */
function openHarvestBranches(cwd, feature) {
  const mine = new RegExp(`^uw/harvest/${String(feature).replace(/[.]/g, '[.]')}(-[0-9]+)?$`);
  return git(cwd, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/uw/harvest/'], { allowFail: true }).stdout.split(/\r?\n/).filter((b) => mine.test(b)).sort();
}

function runState(cwd, { feature, record, review, harvest, harvestBranch: branch, open, intend }) {
  const file = path.join(runDir(cwd, feature), 'run.json');
  const saved = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const head = git(cwd, ['rev-parse', 'HEAD']).stdout.trim().slice(0, 12);
  // 5.2.0: the other repositories of the run. `reposMoved` says that one of them has commits the last review did not
  // cover, so a resume reviews again though the main repository did not move.
  const repoHeads = {};
  for (const [name, r] of Object.entries(saved.repos || {})) repoHeads[name] = git(r.dir, ['rev-parse', 'HEAD'], { allowFail: true }).stdout.trim().slice(0, 12);
  const reposMoved = Object.keys(repoHeads).some((n) => repoHeads[n] !== ((saved.repoHeads || {})[n] || ''));
  const write = (next) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ ...saved, feature, ...next }, null, 2)}\n`);
  };
  // The name of the harvest branch is written BEFORE the branch is made, so a crash between the two leaves the name to be reused
  // and never a second branch (-2). Every other key is kept.
  if (intend) {
    write({ harvestBranch: intend });
    return { ok: true, head, harvestBranch: intend };
  }
  // The harvest branches of this feature still open (not merged away or deleted): a later harvest is told them.
  const openHarvests = openHarvestBranches(cwd, feature);
  if (record) {
    const both = !review && !harvest;
    // `reviewed` is what the report and the notice say about the run's one review: the head it covered, when, and how many
    // findings were still open. An old run.json that holds `pendingFindings` keeps the field; nothing reads it any more.
    const reviewed = review || both ? { head, at: new Date().toISOString(), open: Number.isInteger(Number(open)) && open !== undefined && open !== '' ? Number(open) : 0 } : saved.reviewed;
    const next = { ...(review || both ? { reviewedHead: head, reviewed, ...(Object.keys(repoHeads).length ? { repoHeads } : {}) } : {}), ...(harvest || both ? { harvestedHead: head } : {}), harvestBranch: branch || saved.harvestBranch || '' };
    write(next);
    return { ok: true, head, ...(Object.keys(repoHeads).length ? { repoHeads, reposMoved: review || both ? false : reposMoved } : {}), reviewedHead: next.reviewedHead || saved.reviewedHead || '', reviewed: next.reviewed || saved.reviewed || null, harvestedHead: next.harvestedHead || saved.harvestedHead || '', harvestBranch: next.harvestBranch, openHarvests };
  }
  return { ok: true, head, ...(Object.keys(repoHeads).length ? { repoHeads, reposMoved } : {}), reviewedHead: saved.reviewedHead || '', harvestedHead: saved.harvestedHead || '', harvestBranch: saved.harvestBranch || '', reviewed: saved.reviewed || null, openHarvests };
}

/**
 * Harvest proposals as commits on uw/harvest/<feature>, one per destination file, from the current
 * tip, built from a temporary index so nothing is checked out and the working branch is untouched.
 * The user merges the branch or drops it; nothing reaches project memory unseen.
 */
function harvestBranch(cwd, { feature, from }) {
  const branch = `uw/harvest/${checkFeature(feature)}`;
  // A feature is harvested once. The name run.json recorded is used only if it is the name computed here, or a 4.8.0 -N
  // branch of this feature that still exists; anything else (run.json sits in the working tree, where an agent can write
  // it) is an error, and no ref is created or moved.
  const refExists = (name) => git(cwd, ['rev-parse', '--verify', '-q', `refs/heads/${name}`], { allowFail: true }).status === 0;
  let recorded = '';
  try {
    recorded = JSON.parse(fs.readFileSync(path.join(runDir(cwd, feature), 'run.json'), 'utf8')).harvestBranch || '';
  } catch {}
  if (recorded !== '') {
    const old = typeof recorded === 'string' && new RegExp(`^uw/harvest/${feature.replace(/[.]/g, '[.]')}-[0-9]+$`).test(recorded) && refExists(recorded);
    if (recorded !== branch && !old) return { ok: false, branch, reason: `the recorded harvest branch ${JSON.stringify(recorded)} is not this feature's name (${branch}); nothing was made` };
    if (refExists(recorded)) return { ok: true, branch: recorded, commits: [], note: 'this feature was already harvested; its branch is returned and no new one is made' };
  } else if (refExists(branch)) {
    return { ok: true, branch, commits: [], note: 'this feature was already harvested; its branch is returned and no new one is made' };
  }
  const raw = JSON.parse(fs.readFileSync(path.resolve(cwd, from), 'utf8').replace(/^﻿/, ''));
  const proposals = (Array.isArray(raw) ? raw : raw.proposals || []).filter((p) => p && typeof p.path === 'string' && typeof p.text === 'string' && p.text.trim());
  // A harvester may name a file by its absolute path; one inside the project is taken as relative to it.
  const root = path.resolve(cwd);
  for (const p of proposals) {
    if (path.isAbsolute(p.path)) {
      const rel = path.relative(root, path.resolve(p.path));
      if (rel && !path.isAbsolute(rel) && !fwd(rel).split('/').includes('..')) p.path = fwd(rel);
    }
    // Backslashes and a leading ./ would slip past the memory.md refusal and the topical routing, which read the raw string.
    p.path = fwd(p.path).replace(/^(\.\/)+/, '');
  }
  const bad = proposals.find((p) => path.isAbsolute(p.path) || /^[A-Za-z]:/.test(p.path) || fwd(p.path).split('/').includes('..') || /(^|\/)\.git(\/|$)/.test(fwd(p.path)));
  if (bad) throw new Error(`proposal path "${bad.path}" must be relative to the project and stay inside it`);
  const who = { GIT_AUTHOR_NAME: 'ultimate-workflow', GIT_AUTHOR_EMAIL: 'uw@localhost', GIT_COMMITTER_NAME: 'ultimate-workflow', GIT_COMMITTER_EMAIL: 'uw@localhost' };
  let tip = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  // The memory proposals and the migration of a project not yet on headers come from lib/memory.js;
  // every other proposal is one commit per file, as before.
  const tracked = git(cwd, ['ls-tree', '-r', '--name-only', tip]).stdout.split(/\r?\n/).filter(Boolean);
  const read = (file) => git(cwd, ['show', `${tip}:${file}`], { allowFail: true });
  const made = memoryLib.harvestMemory(tracked, (file) => read(file).stdout, proposals, new Date().toISOString().slice(0, 10));
  if (made.error) return { ok: false, branch, reason: made.error };
  const byFile = new Map();
  for (const p of made.rest) {
    const f = fwd(p.path).replace(/^\.\//, '');
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(p);
  }
  const steps = [...made.steps];
  // A file the migration or the memory commit already wrote is continued from that text, not from the tip.
  const written = Object.assign({}, ...made.steps.map((s) => s.files));
  for (const [file, list] of byFile) {
    const shown = read(file);
    let text = Object.hasOwn(written, file) ? written[file] : shown.status === 0 ? shown.stdout : '';
    for (const p of list) text = memoryLib.withAddition(text, p.text, p.destination);
    steps.push({ subject: `harvest: ${[...new Set(list.map((p) => p.destination || 'note'))].join(', ')} -> ${file}`, files: { [file]: text }, list });
  }
  if (steps.length === 0) return { ok: true, branch: null, commits: [], note: 'no proposals, so no branch' };
  // The name goes into run.json first (the one writer), then the branch is made.
  runState(cwd, { feature, intend: branch });
  // Merging a second harvest branch can conflict in the generated block of memory.md.
  if (steps.some((s) => Object.keys(s.files).some((f) => /(^|\/)memory\.md$/.test(f)))) {
    steps[steps.length - 1].note = 'If merging this branch conflicts in memory.md, take either side, run `node experts/experts.js memory index`, and commit.';
  }
  const dir = runDir(cwd, feature);
  fs.mkdirSync(dir, { recursive: true });
  const index = path.join(dir, 'harvest.index');
  const commits = [];
  try {
    fs.rmSync(index, { force: true });
    git(cwd, ['read-tree', tip], { env: { GIT_INDEX_FILE: index } });
    for (const step of steps) {
      for (const [file, text] of Object.entries(step.files)) {
        const blob = spawnSync('git', ['hash-object', '-w', '--stdin'], { cwd, input: text, encoding: 'utf8' }).stdout.trim();
        git(cwd, ['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`], { env: { GIT_INDEX_FILE: index } });
      }
      const tree = git(cwd, ['write-tree'], { env: { GIT_INDEX_FILE: index } }).stdout.trim();
      const body = step.list.map((p) => `- ${p.source ? `from ${p.source}: ` : ''}${p.rationale || ''}`.trim()).join('\n');
      const msg = [step.subject, body, step.note, `Run: uw/run/${feature}`].filter(Boolean).join('\n\n');
      tip = git(cwd, ['commit-tree', tree, '-p', tip, '-m', msg], { env: who }).stdout.trim();
      commits.push({ commit: tip.slice(0, 12), file: Object.keys(step.files).join(', '), proposals: step.list.length });
    }
  } finally {
    fs.rmSync(index, { force: true });
  }
  git(cwd, ['branch', branch, tip]);
  return { ok: true, branch, commits };
}

/**
 * The plan's claims, measured before the tests are confirmed (lib/claims.js): each card's context pack
 * against the budget, and each `measure:` line of the plan with the size now, the room left and the
 * cards that write under its glob. `stop` is true when the user has to look before confirming: a line
 * that was not understood, a claim that fails, a pack over its budget or a card whose pack has a problem.
 */
function claimsCheck(cwd, { plan, feature }) {
  if (!plan) throw new Error('claims needs --plan');
  const planText = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const name = feature || path.basename(plan).replace(/^PLAN-/i, '').replace(/\.md$/i, '');
  const cards = cardsLib.parseCards(planText);
  const packs = cards.map((c) => {
    try {
      const p = pack(cwd, { plan, card: c.name, feature: name });
      return p.ok ? { card: c.name, tokens: p.tokens, budget: p.budget, overBudget: p.overBudget } : { card: c.name, problem: p.reason };
    } catch (err) {
      return { card: c.name, problem: err.message };
    }
  });
  const globRe = require('./experts.js').globToRegExp;
  const measures = claimsLib.measureAll(planText, path.resolve(cwd), cards, (paths, file) => cardsLib.covers(paths, file, globRe));
  const overBudget = packs.filter((p) => p.overBudget).map((p) => p.card);
  const packProblems = packs.filter((p) => p.problem).map((p) => p.card);
  const notUnderstood = measures.filter((m) => !m.understood).length;
  const failing = measures.filter((m) => m.understood && !m.passing).length;
  return { ok: true, plan: fwd(plan), packs, overBudget, packProblems, measures, notUnderstood, failing, stop: notUnderstood + failing + overBudget.length + packProblems.length > 0 };
}

/**
 * The final report of a run, written in code from the Workflow output file (the completion notice is
 * cut off when a result is large, so the session never summarises it): every card with its outcome,
 * commit or parked branch and reason, the findings card, the review, the fix-up card, the harvest
 * branch and the findings still pending.
 */
function runReport(cwd, { result: resultFile, out = '' }) {
  const rawText = fs.readFileSync(path.resolve(cwd, resultFile), 'utf8');
  const r = require('./ledger.js').unwrapResult(rawText);
  if (r.ok !== true) throw new Error(`the run result is not ok: ${r.error || 'no error given'}`);
  // What each card cost: the Workflow output file lists every agent with its label and its tokens.
  let wrapper = {};
  try {
    wrapper = JSON.parse(rawText.replace(/^\uFEFF/, '')) || {};
  } catch {
    // the phase result alone, with no wrapper around it: no cost data
  }
  const agentRows = Array.isArray(wrapper.workflowProgress) ? wrapper.workflowProgress.filter((x) => x && x.type === 'workflow_agent') : [];
  const cost = runRules.cardTokens([...(r.cards || []), r.fixupCard].filter(Boolean).map((c) => c.card), agentRows);
  const runTotal = typeof wrapper.totalTokens === 'number' && wrapper.totalTokens > 0 ? wrapper.totalTokens : null;
  const cell = (v) => (typeof v === 'number' && v > 0 ? String(v) : 'unknown');
  const row = (c) => `| ${c.card} | ${c.title || ''} | ${c.status} | ${[c.commit, ...(c.repos || []).map((x) => `${x.repo} ${x.commit}`)].filter(Boolean).join(', ') || c.branch || ''} | ${cell(c.pack && c.pack.tokens)} | ${cell(cost[c.card] && cost[c.card].tokens)} | ${cell(cost[c.card] && cost[c.card].cacheRead)} | ${String(c.reason || (c.build ? `${c.build.rounds} round(s)${c.superseded ? `; ran again within the plan, the held work on ${c.superseded} is superseded (kept for reference, delete it when done)` : ''}` : '')).replace(/\|/g, '/').replace(/\s*\r?\n\s*/g, ' ')} |`;
  const warningsFile = path.join(runDir(cwd, r.feature), 'memory-warnings.json');
  const memoryWarnings = fs.existsSync(warningsFile) ? JSON.parse(fs.readFileSync(warningsFile, 'utf8')) : [];
  const all = [...(r.cards || []), ...(r.fixupCard ? [r.fixupCard] : [])];
  const unique = all.filter((c, i) => all.findIndex((x) => x.card === c.card && x.status === c.status) === i);
  const lines2 = [
    `# Run report: ${r.feature}`,
    '',
    `Branch \`${r.branch}\` from ${String(r.base || '').slice(0, 12)}. ${r.summary || ''}`,
    ...(r.stopped ? ['', `**The run stopped:** ${r.stopped}`] : []),
    '',
    `**${r.reviewedText || (r.reviewed ? `Reviewed by the experts at ${r.reviewed.head}: ${r.reviewed.open} findings open` : 'NOT REVIEWED: the run result says nothing about a review')}.**${r.reviewed ? ` Before merging: ${(r.reviewed.ranges || []).length ? r.reviewed.ranges.map((x) => `\`node experts/experts.js check --range ${x}\``).join(' and ') : '`node experts/experts.js check --range <base>..<head>`'}.` : ' Do not merge this branch until it is reviewed: `/ultimate-workflow:feature --resume`, or `/ultimate-workflow:review`.'}`,
    '',
    '| Card | Title | Outcome | Commit or branch | Pack (est.) | Tokens | Cache read | Note |',
    '|---|---|---|---|---|---|---|---|',
    ...unique.map(row),
    '',
    // Pack is the estimated size of the card's context pack, in tokens. Tokens is what the card's agents used.
    `Pack (est.) is the estimated size of the card's context pack, in tokens. Tokens is what the card's own agents used (its fix round included), without cache reads where the host reports them apart. ${runTotal ? `The run used ${runTotal} tokens in all (from the Workflow result), the review, the harvest and the run's own steps included.` : "The run's total tokens are unknown: the Workflow result gave none."}`,
    ...((r.earlier || []).length ? ['', `Before this run: ${r.earlier.map((e) => `${e.card} ${e.status}`).join(', ')}.`] : []),
    // What needs the user, with the command for each: a held card is never only a row in the table.
    ...(unique.some((c) => c.action) ? ['', '## Needs you', '', ...unique.filter((c) => c.action).flatMap((c) => [`- ${c.card} (${c.status}): ${String(c.reason || '').replace(/\r?\n/g, ' ')}`, `  Run: \`${c.action}\``])] : []),
    '',
    '## Out of scope and claims',
    '',
    ...(unique.filter((c) => (c.outOfScope && c.outOfScope.length) || (c.missingClaims && c.missingClaims.length)).map((c) => `- ${c.card}: ${c.outOfScope && c.outOfScope.length ? `changed outside its paths: ${c.outOfScope.join(', ')}` : ''}${c.missingClaims && c.missingClaims.length ? ` claimed but not in the diff: ${c.missingClaims.join(', ')}` : ''}`)),
    ...(unique.some((c) => (c.outOfScope && c.outOfScope.length) || (c.missingClaims && c.missingClaims.length)) ? [] : ['- none']),
    '',
    '## Review',
    '',
    r.review && r.review.ran ? `${(r.review.findings || []).length} confirmed, ${(r.review.refuted || []).length} refuted, ${(r.review.unverified || []).length} unverified (${r.review.range}). Low findings, and findings outside the run's files, are listed here and not fixed.` : `Not run: ${(r.review && r.review.reason) || 'the run stopped'}.`,
    ...((r.review && r.review.findings) || []).map((f) => `- [${f.confidence}] ${f.lens}: ${f.file}:${f.line} ${f.what}`),
    ...(r.fixupReview ? ['', r.fixupReview.ran ? `The experts check of the fix-up cards (${r.fixupReview.range}): ${(r.fixupReview.findings || []).length} confirmed, left open and not fixed again.` : `The experts check of the fix-up cards did not run: ${r.fixupReview.reason || 'no reason given'}.`, ...((r.fixupReview && r.fixupReview.findings) || []).map((f) => `- [${f.confidence}] ${f.lens}: ${f.file}:${f.line} ${f.what}`)] : []),
    '',
    '## Harvest',
    '',
    r.harvest && r.harvest.ran ? (r.harvest.branch ? `${r.harvest.proposals} proposal(s) on \`${r.harvest.branch}\`, one commit per file: ${(r.harvest.commits || []).map((c) => `${c.file} (${c.commit})`).join(', ')}. Merge it to keep them, or delete it.` : `${r.harvest.proposals || 0} proposals${r.harvest.error ? `; not committed: ${r.harvest.error}` : ''}.`) : `Not run: ${(r.harvest && r.harvest.reason) || 'unknown'}.`,
    // Every harvest branch of the feature still open: two can hold the same lesson, so the user sees them all.
    ...(openHarvestBranches(cwd, r.feature).length ? ['', `Open harvest branches of this feature: ${openHarvestBranches(cwd, r.feature).map((b) => `\`${b}\``).join(', ')}. Merge or delete each.`] : []),
    ...(memoryWarnings.length ? ['', '## Memory', '', ...memoryWarnings.map((w) => `- ${w}`)] : []),
    '',
    'Parked cards resume with `/ultimate-workflow:feature --resume <card>`. Nothing was pushed.',
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
/**
 * Fault 19: whether the plugin that is running is another checkout (a worktree) of the repository the run would build
 * in. The run's agents work in this project; with the plugin in a sibling checkout of the same repository one of them
 * edited the plugin's root. Running the plugin on its own code is not supported, so the run refuses to start.
 */
function pluginIsAnotherCheckout(cwd, pluginRoot) {
  const info = (dir) => {
    const top = git(dir, ['rev-parse', '--show-toplevel'], { allowFail: true });
    const common = git(dir, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { allowFail: true });
    if (top.status !== 0 || common.status !== 0) return null;
    return { top: fs.realpathSync(top.stdout.trim()), common: fs.realpathSync(common.stdout.trim()) };
  };
  const mine = info(cwd);
  const theirs = info(pluginRoot);
  return Boolean(mine && theirs && mine.common === theirs.common && mine.top !== theirs.top);
}

/** The mark of the run that is active in this checkout: run-start writes it, run-finish removes it. */
const activeFile = (cwd) => path.join(cwd, '.ultimate-workflow', 'run', 'active.json');

/**
 * 5.2.0: one run at a time in a checkout.
 */
function otherRun(cwd, feature) {
  let mark;
  try {
    mark = JSON.parse(fs.readFileSync(activeFile(cwd), 'utf8'));
  } catch {
    return null;
  }
  if (!mark || typeof mark.feature !== 'string' || mark.feature === feature) return null;
  const current = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true }).stdout.trim();
  return current === `uw/run/${mark.feature}` ? mark : null;
}

/**
 * The record of the last full run, as verify.js wrote it, and whether it is of the project as it is now: the same
 * commit and the same changes (5.2.0). The run takes "the full suite passed" from here, not from an agent's answer.
 */
function fullRecord(mainCwd, { plan = '', repo = '' } = {}) {
  let cwd = mainCwd;
  if (repo) {
    const found = plan ? otherRepos(mainCwd, fs.readFileSync(path.resolve(mainCwd, plan), 'utf8')).find((r) => r.name === repo) : null;
    if (!found) return { ok: true, current: false, passed: false, repo, reason: `the plan declares no repository "${repo}" that can be used (full-record --repo needs --plan)` };
    cwd = found.dir;
  }
  let rec = null;
  try {
    rec = JSON.parse(fs.readFileSync(path.join(cwd, '.ultimate-workflow', 'verify.json'), 'utf8'));
  } catch {}
  const head = git(cwd, ['rev-parse', 'HEAD'], { allowFail: true }).stdout.trim();
  if (!rec || rec.mode !== 'full') return { ok: true, current: false, passed: false, reason: 'there is no record of a full run (.ultimate-workflow/verify.json)' };
  const same = Boolean(head) && rec.head === head && rec.fingerprint === require('./experts.js').testFingerprint(cwd);
  return { ok: true, current: same, passed: same && rec.passed === true, at: rec.at, ...(same ? {} : { reason: `the last full run on record (${rec.at || 'no time'}) is not of the project as it is now` }) };
}

function runStart(cwd, { plan, feature, resume = null, implementerModel = '', diagnoserModel = '', runnerModel = '', takeOver = false }) {
  if (!plan) throw new Error('run-start needs --plan');
  checkFeature(feature);
  // The user's two confirmations gate the Workflow call: nothing is branched, built or written
  // until both are recorded and the plan is the one the user confirmed (2026-11-09).
  const confirmation = require('./experts.js').checkConfirmed(fs.readFileSync(path.resolve(cwd, plan), 'utf8'));
  if (!confirmation.ok) return { ok: false, needs: 'confirmation', missing: confirmation.missing, reason: confirmation.reason };
  if (pluginIsAnotherCheckout(cwd, path.resolve(__dirname, '..'))) return { ok: false, reason: 'the plugin that is running is another checkout of this repository, and the run builds in this one: an agent could edit the plugin\'s own files. Run it from the checkout the plugin was installed from.' };
  const other = takeOver ? null : otherRun(cwd, feature);
  if (other) return { ok: false, needs: 'other-run', other: other.feature, started: other.started, reason: `the run of "${other.feature}" (started ${other.started}) is not finished in this folder, and two runs at the same time in one folder are not supported: the second one moves the branch under the first. Wait until it ends. If it stopped and will not continue, ask the user, then run this command again with --take-over` };
  const name = `uw/run/${feature}`;
  // 5.2.0: the other repositories of the plan (lib/repos.js). Everything that can refuse the run is checked in each of
  // them here, before a branch is made in any.
  const reposLib = require('../lib/repos.js');
  const planAtStart = fs.readFileSync(path.resolve(cwd, plan), 'utf8');
  const resolved = reposLib.resolve(cwd, planAtStart);
  const usedNames = reposLib.usedBy(cardsLib.parseCards(planAtStart)).filter(Boolean);
  const front = require('../hooks/lib/state.js').parseFrontMatter(planAtStart).data || {};
  const refuse = [...resolved.problems];
  for (const n of usedNames) if (!reposLib.declared(planAtStart).list.some((r) => r.name === n)) refuse.push(`a card names the repository "${n}", which the plan's header does not declare`);
  const others = resolved.repos.filter((r) => r.name && usedNames.includes(r.name));
  const branchOf = (dir) => git(dir, ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true }).stdout.trim();
  const hasBranch = (dir) => git(dir, ['rev-parse', '--verify', '-q', `refs/heads/${name}`], { allowFail: true }).status === 0;
  for (const r of others) {
    if (!String(front[reposLib.keyFor('test_command', r.name)] || '').trim()) refuse.push(`repository ${r.name} has cards and no test command: add \`test_command@${r.name}: <its full test command>\` to the plan's header`);
    const mark = takeOver ? null : otherRun(r.dir, feature);
    if (mark) refuse.push(`repository ${r.name}: the run of "${mark.feature}" (started ${mark.started}) is not finished there`);
    if (resume) {
      if (!hasBranch(r.dir)) refuse.push(`repository ${r.name}: nothing to resume, there is no ${name}`);
    } else if (branchOf(r.dir) !== name) {
      if (hasBranch(r.dir)) refuse.push(`repository ${r.name}: ${name} already exists and is not checked out`);
      else if (git(r.dir, ['status', '--porcelain', '--', '.', ...EXCLUDES], { allowFail: true }).stdout.trim() !== '') refuse.push(`repository ${r.name} has uncommitted changes: commit them or put them away first, the run makes its branch from a clean state`);
    }
  }
  if (refuse.length > 0) return { ok: false, needs: 'repos', reason: refuse.join('; ') };
  // A resume brings parked work back (unpark, below): each other repository is on the run branch before that.
  if (resume) {
    for (const r of others) {
      if (branchOf(r.dir) === name) continue;
      const sw = spawnSync('git', ['switch', '-q', name], { cwd: r.dir, encoding: 'utf8' });
      if (sw.status !== 0) return { ok: false, needs: 'repos', reason: `repository ${r.name}: could not check out ${name}: ${(sw.stderr || '').trim()}` };
    }
  }
  let branch;
  if (resume && git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() !== name) {
    if (git(cwd, ['rev-parse', '--verify', '-q', `refs/heads/${name}`], { allowFail: true }).status !== 0) return { ok: false, reason: `nothing to resume: there is no ${name}` };
    const sw = spawnSync('git', ['switch', '-q', name], { cwd, encoding: 'utf8' });
    if (sw.status !== 0) return { ok: false, reason: `could not check out ${name}: ${(sw.stderr || '').trim()}` };
    branch = { ok: true, branch: name, created: false };
  } else branch = runBranch(cwd, { feature });
  if (!branch.ok) return branch;
  // A card left at `running` is one a run died inside: --resume runs it again, and says so.
  const planCards = cardsLib.parseCards(fs.readFileSync(path.resolve(cwd, plan), 'utf8'));
  const interrupted = planCards.filter((c) => /^running\b/.test(c.status || '')).map((c) => c.name);
  let resumeNotice = null;
  if (resume && resume.card) {
    const held = planCards.find((c) => c.name.toLowerCase() === String(resume.card).toLowerCase());
    if (held && held.decision && !resume.accept) {
      // Not accepted: the card runs again from its tests, told to stay within the plan. Its held
      // work stays on the parked branch for reference and is not brought back.
      // The decision line stays until the card is committed (card-commit clears it) or held again,
      // so calling this twice takes the same path: a second call without --accept never falls
      // through to the accept path and brings the unaccepted work back (2026-11-09, a live run).
      writePlanField(cwd, plan, held.name, 'parked', null);
      setStatus(cwd, plan, held.name, 'pending');
      resume = runRules.resumeObject({ flag: resume, held, feature });
    } else {
      // Accepted: the decision goes into the plan's Decisions, so it is planned from now on, and the
      // plan is confirmed again with it, by the user's own --accept.
      if (held && held.decision) acceptDecision(cwd, plan, held);
      const back = unpark(cwd, { plan, card: resume.card, feature });
      // What the user accepted with --accept and no card's paths cover is recorded on the card, so the
      // commit check judges those files by this card's experts and not by the plan's whole line.
      if (resume.accept) {
        const globRe = require('./experts.js').globToRegExp;
        const outside = workFiles(cwd).all.map(fwd).filter((f) => !planCards.some((c) => c.paths.length > 0 && cardsLib.covers(c.paths, f, globRe)));
        if (outside.length > 0) writePlanField(cwd, plan, (held && held.name) || resume.card, 'accepted', outside.sort().join(', '));
      }
      resume = runRules.resumeObject({ flag: resume, held, back, feature });
    }
    // The resume is a notice too: which card, and how it goes on.
    const how = resume.rerun ? `run again from its tests within the plan; the held work on ${resume.heldBranch} is superseded` : resume.accepted ? 'continues with the accepted decision in the plan' : 'continues from its parked work';
    resumeNotice = notify(cwd, { feature, kind: 'resumed', card: resume.card, reason: `${resume.card} ${how}`, action: `wait for the run to finish; its report is .ultimate-workflow/run/${feature}/report.md` }).desktop;
  }
  for (const c of planCards) {
    if (c.committed || c.parked || c.status) continue;
    setStatus(cwd, plan, c.name, 'pending');
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
  // The one rule for whether an accepted list still counts (verify.js baselineStatus): same command, same plan,
  // and its commit on this line of work. Until 5.1.0 this asked for the exact commit, so a list the user had
  // accepted was taken again, and refused, as soon as anything was committed after it.
  const planCommand = String(require('../hooks/lib/state.js').parseFrontMatter(fs.readFileSync(path.resolve(cwd, plan), 'utf8')).data.test_command || '');
  if (require('../hooks/verify.js').baselineStatus(existing, cwd, planCommand, path.basename(plan)).applies) baseline = { taken: false, kept: true, failures: existing.failures.length };
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
  const verifyJs = path.join(pluginRoot, 'hooks', 'verify.js');
  const started = [];
  for (const r of others) {
    const made = runBranch(r.dir, { feature });
    if (!made.ok) return { ...made, needs: 'repos', reason: `repository ${r.name}: ${made.reason}` };
    if (ensureIgnored(r.dir).added) {
      git(r.dir, ['add', '--', '.gitignore']);
      const c = spawnSync('git', ['commit', '-q', '-m', 'uw: ignore .ultimate-workflow/ (the run\'s own state)', '--', '.gitignore'], { cwd: r.dir, encoding: 'utf8' });
      if (c.status !== 0) return { ok: false, needs: 'repos', reason: `repository ${r.name}: could not commit the .gitignore line: ${(c.stderr || '').trim()}` };
    }
    const readBaseline = () => {
      try {
        return JSON.parse(fs.readFileSync(path.join(r.dir, '.ultimate-workflow', 'baseline.json'), 'utf8'));
      } catch {
        return null;
      }
    };
    const command = String(front[reposLib.keyFor('test_command', r.name)] || '').trim();
    let its = { taken: false };
    if (require('../hooks/verify.js').baselineStatus(readBaseline(), r.dir, command, path.basename(plan)).applies) its = { taken: false, kept: true, failures: readBaseline().failures.length };
    else if (!resume) {
      const headNow = git(r.dir, ['rev-parse', 'HEAD']).stdout.trim();
      const run = spawnSync(process.execPath, [verifyJs, '--baseline', '--plan', plan, '--repo', r.name], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const rec = readBaseline();
      const fresh = rec && rec.head === headNow ? rec : null;
      if (fresh && Array.isArray(fresh.failures) && fresh.failures.length > 0 && fresh.accepted !== true) {
        return { ok: false, needs: 'baseline', repo: r.name, branch: name, failing: fresh.failures, reason: `the suite of repository ${r.name} already fails before the run: the user decides whether these are known failures (verify.js --accept-baseline --plan ${fwd(plan)} --repo ${r.name}), then run-start again` };
      }
      if (run.status !== 0 && !fresh) return { ok: false, needs: 'baseline', repo: r.name, branch: name, reason: `the baseline run of repository ${r.name} failed and named no test: ${(run.stdout + run.stderr).trim().split(/\r?\n/).slice(-3).join(' / ')}` };
      its = { taken: true, failures: fresh ? fresh.failures.length : 0 };
    }
    fs.mkdirSync(path.dirname(activeFile(r.dir)), { recursive: true });
    fs.writeFileSync(activeFile(r.dir), `${JSON.stringify({ feature, plan: fwd(path.resolve(cwd, plan)), main: fwd(cwd), started: new Date().toISOString() })}\n`);
    started.push({ name: r.name, dir: fwd(r.dir), branch: name, created: made.created === true, base: made.base || '', baseline: its });
  }
  const argsFile = path.join(cwd, '.ultimate-workflow', 'run', 'run.args.json');
  fs.mkdirSync(path.dirname(argsFile), { recursive: true });
  fs.writeFileSync(argsFile, `${JSON.stringify({ plan: fwd(plan), feature, ...(started.length ? { repos: started.map((r) => ({ name: r.name, dir: r.dir })) } : {}), ...(resume ? { resume } : {}), ...(implementerModel ? { implementerModel } : {}), ...(runnerModel ? { runnerModel } : {}), ...(diagnoserModel ? { diagnoserModel } : {}) }, null, 2)}\n`);
  const memoryRoot = path.resolve(cwd, memoryLib.rootOfPlan(fs.readFileSync(path.resolve(cwd, plan), 'utf8')));
  let warnings = [];
  if (fs.existsSync(path.join(memoryRoot, 'memory.md'))) {
    try {
      warnings = memoryLib.workingProblems(memoryRoot).map((p) => p.text);
    } catch (e) {
      warnings = [`memory check failed: ${e.message}`];
    }
  }
  // runReport reads them back from here: the report is built from the run's result, which never held them.
  fs.mkdirSync(runDir(cwd, feature), { recursive: true });
  // The plan of this run, for `resume-target`: --plan and --feature are given apart, so the name of one does not say the other.
  const runFile = path.join(runDir(cwd, feature), 'run.json');
  let runSaved = {};
  try {
    runSaved = JSON.parse(fs.readFileSync(runFile, 'utf8'));
  } catch {}
  // The commit each other repository's run branch started from, kept from the first start: the review's range there.
  const bases = { ...(runSaved.repos || {}) };
  for (const r of started) if (!bases[r.name] || !bases[r.name].base) bases[r.name] = { dir: r.dir, base: r.base || git(r.dir, ['rev-parse', '--short=12', 'HEAD']).stdout.trim() };
  fs.writeFileSync(runFile, `${JSON.stringify({ ...runSaved, feature, plan: fwd(plan), ...(Object.keys(bases).length ? { repos: bases } : {}) }, null, 2)}\n`);
  fs.writeFileSync(path.join(runDir(cwd, feature), 'memory-warnings.json'), `${JSON.stringify(warnings)}
`);
  fs.writeFileSync(activeFile(cwd), `${JSON.stringify({ feature, plan: fwd(plan), started: new Date().toISOString() })}\n`);
  const s = require('./experts.js').stageScript(pluginRoot, cwd, 'run', { argsFile });
  const embedded = JSON.parse(/^const EMBEDDED_ARGS = (.*)$/m.exec(fs.readFileSync(s.scriptPath, 'utf8'))[1]);
  const failed = embedded.cards.filter((c) => c.preflight && c.preflight.ok === false).map((c) => ({ card: c.name, reason: c.preflight.reason }));
  return { ok: true, branch: branch.branch, created: branch.created, ...(started.length ? { repos: started } : {}), warnings, ...(ignoreCommit ? { ignoreCommit } : {}), baseline, scriptPath: s.scriptPath, cards: embedded.cards.map((c) => c.name), preflightFailed: failed, ...(interrupted.length ? { interrupted } : {}), ...(resumeNotice ? { resumeNotice } : {}) };
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
  // The run is over, however it ended: its mark goes, so the next run can start (5.2.0).
  let ended = result.feature || '';
  try {
    const mark = JSON.parse(fs.readFileSync(activeFile(cwd), 'utf8'));
    // A result that names no feature (a run that failed before it had one) ends the run this folder's mark names.
    if (!ended) ended = mark.feature || '';
    if (mark.feature === ended) fs.rmSync(activeFile(cwd), { force: true });
  } catch {}
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(runDir(cwd, ended), 'run.json'), 'utf8'));
    for (const r of Object.values(saved.repos || {})) {
      try {
        if (JSON.parse(fs.readFileSync(activeFile(r.dir), 'utf8')).feature === ended) fs.rmSync(activeFile(r.dir), { force: true });
      } catch {}
    }
  } catch {}
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
  // The plan's own record of the run: a Run status block, and every card's last status (the last
  // card's sha was written after its commit), committed on the run branch.
  let planStatus = null;
  const planFile = plan || result.plan;
  if (report && planFile && fs.existsSync(path.resolve(cwd, planFile))) {
    const counts = writeRunStatus(cwd, planFile, { branch: result.branch || `uw/run/${result.feature}`, harvest: result.harvest && result.harvest.branch, report: report.report, date: new Date().toISOString().slice(0, 10) });
    planStatus = { counts, ...commitPlan(cwd, planFile, `plan: run status for ${result.feature}`) };
  }
  return { ok: result.ok === true, ...(report ? { report: report.report, summary: report.summary, counts: report.counts, stopped: report.stopped } : { reason: result.error || 'the run result is not ok' }), ...(planStatus ? { planStatus } : {}), ledger: { runId: row.runId, tokens: row.tokens, agents: row.agents, durationMs: row.durationMs, catches } };
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
    if (a === '--resume' || a === '--adhoc' || a === '--accept' || a === '--take-over' || a === '--full-at-end' || a === '--needs-decision' || a === '--record' || a === '--review' || a === '--harvest') {
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
  if (sub === 'park') return run(() => park(cwd, { plan: o.plan, card: o.card, feature: o.feature, reasonFile: o['reason-file'] || '', reason: o.reason || '', needsDecision: Boolean(o['needs-decision']) }));
  if (sub === 'notify') return run(() => notify(cwd, { feature: o.feature, kind: o.kind, card: o.card || '', reason: o.reason || '', reasonFile: o['reason-file'] || '', action: o.action || '' }));
  if (sub === 'decisions') return run(() => detectDecisions(cwd, { plan: o.plan, card: o.card, feature: o.feature || '', declaredFile: o.declared || '' }));
  if (sub === 'unpark') return run(() => unpark(cwd, { plan: o.plan, card: o.card, feature: o.feature }));
  if (sub === 'card-commit') return run(() => cardCommit(cwd, { plan: o.plan, card: o.card, feature: o.feature, claimed, fullAtEnd: Boolean(o['full-at-end']) }));
  if (sub === 'card-status') return run(() => cardStatus(cwd, { plan: o.plan, card: o.card, status: o.status }));
  if (sub === 'run-branch') return run(() => runBranch(cwd, { feature: o.feature }));
  if (sub === 'ensure-ignored') return run(() => ensureIgnored(cwd));
  if (sub === 'full-record') return run(() => ({ ...fullRecord(cwd, { plan: o.plan || '', repo: o.repo || '' }), ...(o.repo ? { repo: o.repo } : {}) }));
  if (sub === 'claims') return run(() => claimsCheck(cwd, { plan: o.plan, feature: o.feature }));
  if (sub === 'run-state') return run(() => runState(cwd, { feature: o.feature, record: Boolean(o.record), review: Boolean(o.review), harvest: Boolean(o.harvest), harvestBranch: o['harvest-branch'] || '', open: o.open }));
  if (sub === 'harvest-branch') return run(() => harvestBranch(cwd, { feature: o.feature, from: o.from }));
  if (sub === 'run-report') return run(() => runReport(cwd, { result: o.result, out: o.out || '' }));
  if (sub === 'run-start') {
    return run(() => {
      let resume = null;
      if (o['resume-card']) resume = { card: o['resume-card'], reason: o['resume-reason'] || 'resumed by the user', accept: Boolean(o.accept) };
      else if (o.resume) resume = { all: true };
      return runStart(cwd, { plan: o.plan, feature: o.feature, resume, implementerModel: o['implementer-model'] || '', diagnoserModel: o['diagnoser-model'] || '', runnerModel: o['runner-model'] || '', takeOver: Boolean(o['take-over']) });
    });
  }
  if (sub === 'run-finish') return run(() => runFinish(cwd, { output: o.output, runId: o['run-id'] || '', plan: o.plan || '' }));
  if (sub === 'journal') {
    if (action === 'add') return run(() => journalAdd(cwd, { feature: o.feature, card: o.card, from: o.from, status: o.status || '' }));
    if (action === 'compact') return run(() => journalCompact(cwd, { feature: o.feature, card: o.card, from: o.from }));
    return fail('journal: expected add or compact');
  }
  return fail(`unknown autopilot command ${sub}`);
}

const COMMANDS = ['pack', 'handoff', 'park', 'unpark', 'journal', 'card-commit', 'card-status', 'notify', 'decisions', 'run-branch', 'ensure-ignored', 'run-state', 'claims', 'full-record', 'harvest-branch', 'run-report', 'run-start', 'run-finish'];

module.exports = { otherRepos, otherWork, pluginIsAnotherCheckout, COMMANDS, NOTIFY_KINDS, cardStatus, notify, detectDecisions, acceptDecision, writeRunStatus, commitPlan, pack, handoff, park, unpark, journalAdd, journalCompact, cardCommit, runBranch, ensureIgnored, harvestBranch, withAddition: memoryLib.withAddition, matchingTopicals, testSection, TESTS_TITLE, sections, cli, JOURNAL_CARD_LINES, JOURNAL_MAX_LINES };
