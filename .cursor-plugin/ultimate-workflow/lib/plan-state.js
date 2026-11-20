'use strict';

// What a plan has, and what the session's folder has, read by code (5.2.0).
//
// Two real sessions decided these from what they read themselves and got them wrong: one ran the whole tests phase on a
// plan that already had a Tests section and left the plan with two; one was given `--resume <card>` in a folder with no
// run, searched the other projects, found a card of that name and ran there.
//
//   experts.js plan-state --plan P        the confirmations, the cards, the Tests section and the part of each card
//   experts.js resume-target [--card C]   the runs of THIS folder, and the card to resume when one answer is possible
//
// Nothing here reads outside the folder it is given.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const lines = (t) => String(t || '').split(/\r?\n/);
const eolOf = (t) => (String(t).includes('\r\n') ? '\r\n' : '\n');
// The headings of a plan and the part of a card are read by the run's own code (experts/autopilot.js: `sections` skips
// fenced code, `testSection` is what the preflight of a card uses). A second reading here had already diverged from it.
const run = () => require('../experts/autopilot.js');
/** The sections a name means, outermost only, as the run's `sections` gives them (1-based, inclusive). */
function sectionsNamed(planText, name) {
  const isTests = /^tests?$/i.test(String(name).trim());
  const want = String(name).trim().toLowerCase();
  // The heading of the test plan is read by the run's one rule (experts/autopilot.js TESTS_TITLE).
  const hit = run().sections(planText).filter((h) => (isTests ? run().TESTS_TITLE.test(h.title) : h.title.toLowerCase() === want));
  const outer = hit.filter((h) => !hit.some((o) => o !== h && o.start < h.start && o.end >= h.end));
  // Copies of one section are at one level: a heading of that name at another level is not a second copy.
  return outer.filter((h) => h.level === outer[0].level);
}

/** The confirmations, the cards, and what the plan has of its Tests section. */
function planState(planText) {
  const front = require('../hooks/lib/state.js').parseFrontMatter(planText).data || {};
  const cards = require('../experts/cards.js').parseCards(planText).map((c) => c.name);
  const tests = sectionsNamed(planText, 'Tests');
  const yes = (v) => v === true || String(v).trim().toLowerCase() === 'true';
  return {
    ok: true,
    planConfirmed: yes(front.plan_confirmed),
    testsConfirmed: yes(front.tests_confirmed),
    cards,
    tests: tests.length > 0,
    testsSections: tests.length,
    // The same question the run asks before it builds a card: a card with no part here is parked there.
    missingCardSections: tests.length > 0 ? cards.filter((c) => !run().testSection(planText, c, cards.length)) : [],
  };
}

/**
 * The plan with `text` in place of its section of that name. With several the first is replaced and the others are
 * removed; with none the text goes at the end. Every other line is kept, with the plan's line ends.
 */
function replaceSection(planText, name, text) {
  const eol = eolOf(planText);
  const all = lines(planText);
  const ranges = sectionsNamed(planText, name).map((h) => [h.start - 1, h.end]);
  const fresh = lines(String(text).replace(/\s+$/, ''));
  if (ranges.length === 0) return `${String(planText).replace(/\s+$/, '')}${eol}${eol}${fresh.join(eol)}${eol}`;
  for (const [a, b] of [...ranges].reverse().slice(0, ranges.length - 1)) all.splice(a, b - a);
  const [a, b] = ranges[0];
  const tail = all.slice(b);
  const out = [...all.slice(0, a), ...fresh, ...(tail.length > 0 ? ['', ...tail] : [''])];
  return out.join(eol);
}

const git = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
};

/** The runs of this folder: each feature that has a run folder or a `uw/run/<feature>` branch, with its plan and cards. */
function runsHere(cwd) {
  const cardsLib = require('../experts/cards.js');
  const features = new Set();
  const dir = path.join(cwd, '.ultimate-workflow', 'run');
  if (fs.existsSync(dir)) for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'run.json'))) features.add(e.name);
  for (const b of git(cwd, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/uw/run/']).split(/\r?\n/).filter(Boolean)) features.add(b.slice('uw/run/'.length));
  const current = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return [...features].sort().map((feature) => {
    const branch = `uw/run/${feature}`;
    const hasBranch = git(cwd, ['rev-parse', '--verify', '-q', `refs/heads/${branch}`]) !== '';
    // The plan of a run is the one run-start was given (it writes it into the run's run.json); a run that was
    // started before that was recorded has the plan the instructions name, PLAN-<feature>.md. On the run branch the
    // plan holds the cards' statuses.
    let recorded = '';
    try {
      recorded = String(JSON.parse(fs.readFileSync(path.join(dir, feature, 'run.json'), 'utf8')).plan || '');
    } catch {}
    const name = recorded || `PLAN-${feature}.md`;
    const onDisk = current === branch && fs.existsSync(path.join(cwd, name)) ? fs.readFileSync(path.join(cwd, name), 'utf8') : '';
    const text = onDisk || (hasBranch ? git(cwd, ['show', `${branch}:${name}`]) : '') || (fs.existsSync(path.join(cwd, name)) ? fs.readFileSync(path.join(cwd, name), 'utf8') : '');
    const cards = text ? cardsLib.parseCards(text).map((c) => ({ name: c.name, status: c.status || 'pending' })) : [];
    // The other repositories of the run (run-start records them): is the run branch there, and checked out?
    let others = [];
    try {
      others = Object.entries(JSON.parse(fs.readFileSync(path.join(dir, feature, 'run.json'), 'utf8')).repos || {}).map(([repo, r]) => ({ repo, dir: r.dir, hasBranch: git(r.dir, ['rev-parse', '--verify', '-q', `refs/heads/${branch}`]) !== '', checkedOut: git(r.dir, ['rev-parse', '--abbrev-ref', 'HEAD']) === branch }));
    } catch {}
    return { feature, branch, hasBranch, checkedOut: current === branch, repos: others, plan: text ? name : '', planName: name, cards, open: cards.filter((c) => !/^committed\b/.test(c.status)).map((c) => c.name) };
  });
}

/**
 * The run a resume means, from this folder only. `ok: true` with the feature, the plan and (with a card) its status when
 * exactly one answer is possible; otherwise `ok: false` with `needs` ("folder": nothing here to resume; "choice": more
 * than one answer) and what the folder has, for the session to show the user.
 */
function resumeTarget(cwd, { card = '' } = {}) {
  const runs = runsHere(cwd);
  const usable = runs.filter((r) => r.plan);
  // The name the run was started with (run.json), not one made from the feature: the two can differ.
  const noPlan = runs.filter((r) => !r.plan).map((r) => r.planName);
  const here = { folder: cwd.split(path.sep).join('/'), runs: runs.map((r) => ({ feature: r.feature, plan: r.plan, cards: r.cards })) };
  if (runs.length === 0) return { ok: false, needs: 'folder', reason: 'this folder has no run: no .ultimate-workflow/run/<feature> and no uw/run/* branch. Open the folder of the project that has the run', ...here };
  if (usable.length === 0) return { ok: false, needs: 'folder', reason: `the plan of the run is not here (${noPlan.join(', ')}), so there is nothing to resume`, ...here };
  const want = String(card || '').trim().toLowerCase();
  if (want) {
    const hits = usable.filter((r) => r.cards.some((c) => c.name.toLowerCase() === want));
    if (hits.length === 0) return { ok: false, needs: 'folder', reason: `no run of this folder has a card named "${card}"`, ...here };
    if (hits.length > 1) return { ok: false, needs: 'choice', reason: `more than one run of this folder has a card named "${card}": ${hits.map((r) => r.feature).join(', ')}`, ...here };
    const found = hits[0].cards.find((c) => c.name.toLowerCase() === want);
    return { ok: true, feature: hits[0].feature, plan: hits[0].plan, branch: hits[0].branch, card: found.name, status: found.status, ...(hits[0].repos.length ? { repos: hits[0].repos } : {}) };
  }
  const open = usable.filter((r) => r.open.length > 0);
  if (open.length === 0) return { ok: false, needs: 'folder', reason: 'every card of the runs of this folder is committed: there is nothing to resume', ...here };
  if (open.length > 1) return { ok: false, needs: 'choice', reason: `more than one run of this folder is not finished: ${open.map((r) => r.feature).join(', ')}`, ...here };
  return { ok: true, feature: open[0].feature, plan: open[0].plan, branch: open[0].branch, open: open[0].open, ...(open[0].repos.length ? { repos: open[0].repos } : {}) };
}

module.exports = { planState, replaceSection, sectionsNamed, runsHere, resumeTarget };
