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
//   node experts.js brief   [--plan P]                      the standing brief of every expert that declares the build stage,
//                                                           with the skills each one selects for the plan
//   node experts.js card-add --plan P --name N --title T --paths G[,G] [--carried X[;X] | --carried-file F] [--title-file F] [--paths-file F] [--free-name]   add a card to the plan's Cards section (--free-name: the next free N, N-2, ...)
//   node experts.js brief   --plan P --card N               the briefs for one card of the plan (its Cards entry, or a "Card N" heading)
//   node experts.js scope   --plan P --card N [--result R]  the changed files outside the card's paths, from git
//   node experts.js skills  --stage plan                    the skills each planning expert may be given, for the plan workflow to offer
//   node experts.js skills  --stage tests --plan P          the skills chosen from the plan for each expert that joins the tests stage
//   node experts.js read    --plan P                        the plan's experts
//   node experts.js select  --plan P --add a,b              add experts to the plan (never removes)
//   node experts.js prepare [--range working|A..B]          save the diff, fingerprint the tree
//   node experts.js check --range A..B                       was that range reviewed, with no high finding open (before merging a run branch)
//   node experts.js record  --stage S [--plan P] < result   record a workflow result as evidence
//   node experts.js record  --stage S [--plan P] --result R  the same, read from the Workflow output file R (never retype the result)
//   node experts.js present --result R --field F --out P [--append] [--confirm plan_confirmed|tests_confirmed]
//   node experts.js present --from T --out P [--append] [--confirm ...]
//                                                           write a text field of the Workflow output file R (or the text file T) to P, whole and
//                                                           entity-decoded; --append adds it to the end of P; --confirm sets that front matter
//                                                           line to true in the file written
//   node experts.js check   [--plan P]                    would the commit gate allow a commit now
//   node experts.js findings                                high-confidence findings still open, and which are dismissed
//   node experts.js attribution                             per expert: skills loaded, findings by basis, skills never cited
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
const stateLib = require('../hooks/lib/state.js');
const { setFrontLine } = stateLib;
const runRules = require('../lib/run-rules.js');

const PLUGIN_ROOT = path.join(__dirname, '..');
const STAGES = ['plan', 'tests', 'review'];
// `build` is declarable but is not a lane stage: no expert is consulted as an agent while code is
// written, and nothing is recorded or gated for it. Its reference is a short brief that the build
// command passes to the implementer. STAGES stays the lane stages so record and the lanes never see it.
const BUILD = 'build';
const DECLARABLE = [...STAGES, BUILD];
const BRIEF_BYTES = 4096;
// A stage at which an expert joins whether or not it was selected, because that stage always does
// its work. Only `tests` for now: every test plan is about tests, so the quality expert always
// applies there. Selection decides every other stage.
const ALWAYS_STAGES = ['tests'];
const EVIDENCE = path.join('.ultimate-workflow', 'experts');
const AGENT_FILE = /^uw-expert-([a-z][a-z0-9-]*)\.md$/;

// ---- discovery ----

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
    const fm = stateLib.parseFrontMatter(fs.readFileSync(path.join(dir, f), 'utf8'), { raw: true }).data;
    const stages = fm.stages === undefined ? ['review'] : inlineList(fm.stages);
    const always = fm.always === undefined ? [] : inlineList(fm.always);
    const whenSkills = fm['review-when-skills'] === undefined ? [] : inlineList(fm['review-when-skills']);
    if (fm.name !== `uw-expert-${name}`) problems.push(`${f}: frontmatter name is "${fm.name || ''}", expected "uw-expert-${name}"`);
    else if (!fm.description) problems.push(`${f}: no description, so a model cannot tell when it applies`);
    else if (stages.length === 0 || stages.some((s) => !DECLARABLE.includes(s))) problems.push(`${f}: stages must be a list drawn from ${DECLARABLE.join(', ')}`);
    else if (always.some((s) => !ALWAYS_STAGES.includes(s) || !stages.includes(s))) problems.push(`${f}: always may name only ${ALWAYS_STAGES.join(', ')}, and only a stage the expert declares`);
    else if (whenSkills.length > 0 && !stages.includes('review')) problems.push(`${f}: review-when-skills needs the review stage`);
    else if (whenSkills.some((s) => !skillsAt(pluginRoot, name, 'review').skills.some((k) => k.name === s))) problems.push(`${f}: review-when-skills may name only skills in the review section of experts/${name}/skills.md`);
    // `review-when-skills: [a, b]`: the expert joins review whenever the diff selects one of these review
    // skills, planned or not (quality and test-craft: a changed test is quality's business, whoever planned the work).
    else experts.push({ name, agent: fm.name, description: fm.description, stages, ...(always.length > 0 ? { always } : {}), ...(whenSkills.length > 0 ? { reviewWhenSkills: whenSkills } : {}) });
  }
  return { experts, problems };
}

/**
 * The standing brief of every expert that declares the build stage: the text of its build.md,
 * loaded on every build whether or not the expert was selected at plan time, except a brief with
 * no `always` skill, which joins only when the plan selects one of its skills (`skipped` names the
 * rest). A missing, empty or
 * oversized brief is reported and left out; a brief that costs tokens on every build is capped.
 *
 * With `planText`, each brief also carries the skills its build.md selects for the paths and text
 * of that plan. A plan that names no file selects only the `always` skills, and `note` says so.
 */
// One card of a plan split into cards: the lines under the first heading whose text contains
// `heading` (case-insensitive), up to the next heading of the same or a higher level. Used so a
// card's build loads the briefs and skills its own section calls for, not the whole plan's.
function planSection(planText, heading) {
  const lines = planText.split(/\r?\n/);
  const want = heading.trim().toLowerCase();
  const at = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.toLowerCase().includes(want));
  if (at === -1) return null;
  const level = /^(#+)/.exec(lines[at])[1].length;
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) {
    const m = /^(#{1,6})\s/.exec(lines[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(at, end).join('\n');
}

function briefs(pluginRoot = PLUGIN_ROOT, { planText = null } = {}) {
  const change = planText === null ? null : { files: planPaths(planText), text: String(planText) };
  const found = list(pluginRoot);
  const out = [];
  const problems = [...found.problems];
  const skipped = [];
  for (const e of found.experts.filter((x) => x.stages.includes(BUILD))) {
    const file = path.join(pluginRoot, 'experts', e.name, 'references', 'build.md');
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      problems.push(`${e.name}: declares the build stage but experts/${e.name}/references/build.md cannot be read`);
      continue;
    }
    // A brief whose build skills include no `always` one is for some changes only (the DevOps brief
    // is for infrastructure, pipelines and containers): it joins a build only when the plan selects
    // one of its skills, and never when there is no plan to select from.
    const conditional = !skillsAt(pluginRoot, e.name, BUILD).skills.some((s) => s.selector.kind === 'always');
    text = text.trim();
    if (text === '') problems.push(`${e.name}: build.md is empty`);
    else if (Buffer.byteLength(text) > BRIEF_BYTES) problems.push(`${e.name}: build.md is ${Buffer.byteLength(text)} bytes; a brief loaded on every build is capped at ${BRIEF_BYTES}`);
    else if (change === null) {
      if (conditional) skipped.push(e.name);
      else out.push({ name: e.name, text });
    } else {
      const sel = selectSkills(pluginRoot, e.name, BUILD, change);
      problems.push(...sel.problems);
      if (conditional && sel.skills.length === 0 && sel.dropped.length === 0) {
        skipped.push(e.name);
        continue;
      }
      out.push({ name: e.name, text, skills: sel.skills, dropped: sel.dropped });
    }
  }
  const note = change === null ? 'no plan given, so no skills were selected' : change.files.length === 0 ? 'the plan names no file, so only skills marked always were selected' : '';
  return { briefs: out, problems, planPaths: change ? change.files : [], note, skipped };
}

// ---- skills, chosen in code ----
//
// A model told to "read the skill whose cue matches" did not read it, in two runs out of two. So
// the choice is made here, where the files are, and the workflow pastes the text into the prompt.
// Each expert lists its skills in `experts/<name>/skills.md`, read here and never by a model: one
// `## <stage>` section per stage, one skill per line, each with a selector in parentheses:
//
//   - go-craft (files: *.go, go.mod)
//   - failure-handling (added: catch|except)
//   - surgical-change (always)
//
// At plan a line is the name alone: a model chooses by the skill's own `description`.
//
// `files` globs match the base name of a changed path (review) or a path the plan names (build).
// `added` is a case-sensitive regular expression over the diff's added lines (review) or the
// plan's text (build). The order of the list is the order of priority when the cap is reached.

const SKILL_STAGES = ['review', 'build', 'tests'];
// No cap on how many skills an expert gets, or on their total size, by decision (2026-11-07): an
// expert gets every skill whose selector matches the change. This replaced a 40 KB per-expert,
// per-stage byte cap (56 KB for frontend and developer) and, at review, a two-skill cap; both left
// out skills a change needed, and the two kept were the first in the list, not the most relevant.
// The selectors are what keep a skill out of a change it does not fit. Each skill file is still
// held to 16 KB, and the build brief to BRIEF_BYTES.
const SKILLS_FILE_LINE = /^\s*-\s*([a-z][a-z0-9-]*)(?:\s+\((.*)\))?\s*$/;

function globToRegExp(glob) {
  // `*` stays inside one path segment; `**/` matches any number of directories, none included.
  const segment = (g) => g.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
  return new RegExp(`^${glob.split('**/').map(segment).join('(?:.*/)?')}$`);
}

/** One selector, or `{ error }`. */
function parseSelector(text) {
  const t = text.trim();
  if (t === 'always') return { kind: 'always' };
  // Several selectors joined by "; " match when any one of them does: `files: *.tf; added: AWS::`.
  const parts = t.split(/;\s*(?=(?:files|added):)/);
  if (parts.length > 1) {
    const any = parts.map(parseSelector);
    const bad = any.find((p) => p.error);
    return bad || { kind: 'any', any };
  }
  const m = /^(files|added):\s*(.+)$/.exec(t);
  if (!m) return { error: `"${t}" is not a selector (expected "always", "files: <globs>" or "added: <regex>")` };
  if (m[1] === 'files') {
    const globs = m[2].split(',').map((s) => s.trim()).filter(Boolean);
    if (globs.length === 0 || globs.some((g) => g.startsWith('/'))) return { error: `"${t}": files takes globs such as *.go or .github/workflows/*.yml, relative to the repository root` };
    // A glob with a directory in it matches the whole path; one without matches the base name.
    return { kind: 'files', globs, res: globs.map((g) => ({ re: globToRegExp(g), full: g.includes('/') })) };
  }
  try {
    return { kind: 'added', re: new RegExp(m[2]) };
  } catch (err) {
    return { error: `"${t}": ${err.message}` };
  }
}

/**
 * An expert's skills file: for each stage, the skills it lists in order, with their selectors.
 * Plan lines carry no selector; every other stage's lines must. Problems are returned, not thrown.
 */
function parseSkillsFile(text) {
  const stages = {};
  const problems = [];
  let stage = null;
  for (const line of String(text).split(/\r?\n/)) {
    const h = /^##\s+([a-z]+)\s*$/.exec(line);
    if (h) {
      stage = h[1];
      if (![...SKILL_STAGES, 'plan'].includes(stage)) problems.push(`"## ${stage}" is not a stage that takes skills`);
      stages[stage] = stages[stage] || [];
      continue;
    }
    if (!/^\s*-\s/.test(line) || stage === null) continue;
    const m = SKILLS_FILE_LINE.exec(line);
    if (!m) {
      problems.push(`${stage}: "${line.trim()}" is not "- <skill> (<selector>)"`);
      continue;
    }
    if (stage === 'plan') {
      if (m[2] !== undefined) problems.push(`plan: ${m[1]} has a selector; at plan a model chooses by the skill's description`);
      stages.plan.push({ name: m[1] });
      continue;
    }
    if (m[2] === undefined) {
      problems.push(`${stage}: ${m[1]} has no "(selector)"`);
      continue;
    }
    const sel = parseSelector(m[2]);
    if (sel.error) problems.push(`${stage}: ${m[1]}: ${sel.error}`);
    else stages[stage].push({ name: m[1], selector: sel });
  }
  return { stages, problems };
}

/** An expert's skills for one stage, read from its skills file. No file, or no section, is no skills. */
function skillsAt(pluginRoot, expert, stage) {
  let text = '';
  try {
    text = fs.readFileSync(path.join(pluginRoot, 'experts', expert, 'skills.md'), 'utf8');
  } catch {
    return { skills: [], problems: [] };
  }
  const parsed = parseSkillsFile(text);
  return { skills: parsed.stages[stage] || [], problems: parsed.problems.map((p) => `${expert}/skills.md: ${p}`) };
}

/**
 * A skill's frontmatter fields and its body. The frontmatter is read here and never pasted: the
 * `description` is the cue and the plan-stage headline, the body is what the expert reads.
 */
function readSkill(pluginRoot, name) {
  const raw = fs.readFileSync(path.join(pluginRoot, 'experts', 'skills', name, 'skill.md'), 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  const meta = {};
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, text: (m ? raw.slice(m[0].length) : raw).trim() };
}

/** Changed paths and added lines, read from a unified diff. Works for any range, not only the working tree. */
function parseDiff(diff) {
  const files = new Set();
  const added = [];
  // Keywords count only in code (4.1.2): a document that mentions tenants, judges or embeddings
  // loaded those skills on every review of a UI change in the re-wash, and none was ever cited.
  // Documentation files are still listed, so a file selector can match them.
  let inDoc = false;
  for (const line of String(diff).split(/\r?\n/)) {
    const g = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (g) {
      files.add(g[2]);
      inDoc = gates.isDocPath(g[2]);
    } else if (line.startsWith('+++ b/')) files.add(line.slice(6));
    else if (line.startsWith('+') && !line.startsWith('+++') && !inDoc) added.push(line.slice(1));
  }
  return { files: [...files], text: added.join('\n') };
}

/**
 * Paths a plan names: anything in backticks that looks like a file, and bare words that hold a
 * slash and end in an extension. Prose such as "Node.js" outside backticks is not a path.
 */
function planPaths(text) {
  const out = new Set();
  const looksLikeFile = (s) => /^[\w.\/-]*[\w-]\.[A-Za-z][A-Za-z0-9]{0,9}$/.test(s) || /^[\w.-]+$/.test(s) && /^(go\.mod|Cargo\.toml|pom\.xml|Gemfile|Dockerfile)$/.test(s);
  for (const m of String(text).matchAll(/`([^`\s]+)`/g)) if (looksLikeFile(m[1])) out.add(m[1]);
  for (const m of String(text).matchAll(/(?:^|\s)([\w.-]+(?:\/[\w.-]+)+\.[A-Za-z][A-Za-z0-9]{0,9})(?=$|[\s,.;:)])/gm)) out.add(m[1]);
  return [...out];
}

function matches(selector, { files, text }) {
  if (selector.kind === 'always') return true;
  if (selector.kind === 'any') return selector.any.some((s) => matches(s, { files, text }));
  if (selector.kind === 'added') return selector.re.test(text);
  return files.some((f) => {
    const p = f.replace(/\\/g, '/').replace(/^\.\//, '');
    return selector.res.some(({ re, full }) => re.test(full ? p : path.posix.basename(p)));
  });
}

/**
 * The skills one expert gets at one stage, for one change: those its stage reference lists whose
 * selector matches, in list order. There is no cap by default; `cap` (bytes) exists for tests, and
 * what does not fit under one is returned in `dropped`, by name.
 */
function selectSkills(pluginRoot, expert, stage, change, cap = Infinity) {
  const out = { skills: [], dropped: [], problems: [] };
  const listed = skillsAt(pluginRoot, expert, stage);
  out.problems.push(...listed.problems);
  let used = 0;
  for (const s of listed.skills.filter((x) => matches(x.selector, change))) {
    let text = '';
    try {
      text = readSkill(pluginRoot, s.name).text;
    } catch {
      out.problems.push(`${expert}/skills.md names ${s.name}, which cannot be read`);
      continue;
    }
    const bytes = Buffer.byteLength(text);
    if (used + bytes > cap) out.dropped.push(s.name);
    else {
      used += bytes;
      out.skills.push({ name: s.name, text });
    }
  }
  return out;
}

/**
 * The skills a model may choose from at the plan stage, where no code can see the draft: for each
 * expert that plans, every skill its skills file lists at plan, with the skill's own description
 * as the headline and the text the workflow pastes in for the ones chosen. Code still decides
 * what can be chosen.
 */
function planSkills(pluginRoot = PLUGIN_ROOT) {
  const out = {};
  const problems = [];
  for (const e of list(pluginRoot).experts.filter((x) => x.stages.includes('plan'))) {
    const listed = skillsAt(pluginRoot, e.name, 'plan');
    problems.push(...listed.problems);
    const offered = [];
    for (const { name } of listed.skills) {
      if (offered.some((x) => x.name === name)) continue;
      try {
        const sk = readSkill(pluginRoot, name);
        offered.push({ name, headline: sk.meta.description || name, text: sk.text });
      } catch {
        problems.push(`${e.name}/skills.md names ${name}, which cannot be read`);
      }
    }
    if (offered.length > 0) out[e.name] = offered;
  }
  return { skills: out, problems };
}

/**
 * The skills each expert that joins the tests stage gets for a plan, chosen in code from the
 * plan's file names and text, as at build. Keyed by expert; experts with nothing selected are left out.
 */
function testsSkills(pluginRoot, planText) {
  const change = { files: planPaths(planText), text: String(planText) };
  const out = {};
  const problems = [];
  for (const e of list(pluginRoot).experts.filter((x) => x.stages.includes('tests'))) {
    const sel = selectSkills(pluginRoot, e.name, 'tests', change);
    problems.push(...sel.problems);
    if (sel.skills.length > 0 || sel.dropped.length > 0) out[e.name] = { skills: sel.skills, dropped: sel.dropped };
  }
  return { skills: out, problems };
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

const EXPERTS_LINE = /^experts[ \t]*:[ \t]*(.*?)[ \t]*$/m;

function readExperts(text) {
  const fm = stateLib.splitFrontMatter(text);
  if (!fm) return { present: false, experts: [] };
  const m = EXPERTS_LINE.exec(fm.block);
  if (!m) return { present: false, experts: [] };
  const value = m[1].replace(/\r$/, '');
  if (value === '') return { present: true, experts: [], error: 'unsupported `experts:` value: write an inline list such as `experts: [security]` or `experts: []`' };
  return { present: true, experts: inlineList(value) };
}

/** Replace or insert the line. Callers merge first; this only writes. */
function setExperts(text, names) {
  const fm = stateLib.splitFrontMatter(text);
  if (!fm) throw new Error('the plan file has no frontmatter block (--- ... ---) to record experts in');
  const line = `experts: [${names.join(', ')}]`;
  if (EXPERTS_LINE.test(fm.block)) return fm.bom + fm.open + fm.block.replace(EXPERTS_LINE, line) + fm.after;
  return fm.bom + fm.open + fm.block + line + fm.eol + fm.after;
}

// ---- a document out of a workflow result ----

/** The five entities some installs return in markdown; `&amp;` goes last so `&amp;lt;` stays `&lt;`. */
function decodeEntities(text) {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/**
 * Whether a text came back HTML-escaped as a whole: it holds an entity, and no raw `<`, `>` or
 * bare `&` anywhere (an escaped text has none, a plain one that merely mentions `&amp;` or
 * contains a `Map<string>` does). Decoding anything else would corrupt a plan about HTML.
 */
function looksEscaped(text) {
  return /&(?:amp|lt|gt|quot|#39);/.test(text) && !/[<>]/.test(text) && !/&(?!amp;|lt;|gt;|quot;|#39;)/.test(text);
}

/**
 * The plan as the user confirmed it, hashed: everything but the front matter (the gates' own state),
 * the run's state lines on the cards (status, committed, parked, carried, decision), the cards the
 * run adds itself (findings, fixup) and the `## Run status` block. A change to anything else after
 * the test plan was confirmed is a plan the user has not seen (2026-11-09).
 */
const RUN_FIELD = /^[ \t]+(status|committed|parked|carried|decision|accepted):/i;
function confirmHash(text) {
  const fm = stateLib.splitFrontMatter(text);
  const body = (fm ? fm.after : String(text)).replace(/^﻿/, '');
  const lines = body.split(/\r?\n/);
  const kept = [];
  let section = '';
  // The one Cards-section finder (experts/cards.js): the first heading named Cards, to the next heading.
  const cardsAt = require('./cards.js').cardsRange(lines);
  let dropCard = false;
  let inRunStatus = false;
  // The `## Known failures` section a baseline accept writes after the confirmation is left out (to the next heading of level 1 or 2).
  let inKnown = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (h) {
      section = h[2].toLowerCase();
      inRunStatus = h[1].length <= 2 && section === 'run status';
      if (h[1].length <= 2) inKnown = section === 'known failures';
      if (inKnown) continue;
      dropCard = false;
      if (inRunStatus) continue;
    }
    if (inRunStatus || inKnown) continue;
    if (cardsAt && i >= cardsAt.start && i < cardsAt.end) {
      const item = /^[-*]\s+([A-Za-z0-9][A-Za-z0-9._-]*):/.exec(l);
      if (item) dropCard = runRules.RUN_ADDED.test(item[1]);
      else if (l.trim() !== '' && !/^[ \t]/.test(l)) dropCard = false;
      if (dropCard) continue;
      if (RUN_FIELD.test(l)) continue;
    }
    kept.push(l.replace(/\s+$/, ''));
  }
  // Blank lines are not content: a card the run adds or removes moves them around.
  const norm = kept.filter((l) => l.trim() !== '').join('\n');
  return require('node:crypto').createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

/**
 * The plan settings the commit check reads and the confirmed hash leaves out (front matter). Changing one
 * after the confirmation does not refuse a commit; the check names it, so a weakened check is visible.
 * `experts` is named only when a confirmed expert was taken away (the review may add to the line).
 */
const SETTING_KEYS = ['test_command', 'volatile_paths', 'known_failures', 'full_suite_paths'];
const sha8 = (value) => crypto.createHash('sha256').update(String(value === undefined || value === null ? '' : value).trim()).digest('hex').slice(0, 8);

/** The settings as they stand now, in the form `confirmed_settings:` records them. */
function settingsNow(text) {
  const data = stateLib.parseFrontMatter(text).data || {};
  const out = {};
  for (const k of SETTING_KEYS) out[k] = sha8(data[k]);
  const parsed = readExperts(text);
  out.experts = (parsed.error ? [] : parsed.experts).slice().sort().join(',');
  out.cards = cardsNow(text);
  return out;
}

/** Each plan card (not the ones a run adds) with a short hash of its paths and experts, so a later change can be named. */
function cardsNow(text) {
  const out = {};
  for (const c of require('./cards.js').parseCards(text)) {
    if (runRules.RUN_ADDED.test(c.name)) continue;
    out[c.name] = sha8(`${(c.paths || []).join(',')}|${(c.experts || []).join(',')}`);
  }
  return out;
}

/** The cards added since the confirmation and the cards whose paths or experts changed. A plan with no card record names none. */
function cardsChanged(text) {
  const data = stateLib.parseFrontMatter(text).data || {};
  let was;
  try {
    was = JSON.parse(String(data.confirmed_settings || ''));
  } catch {
    return { added: [], changed: [] };
  }
  if (!was || typeof was !== 'object' || !was.cards || typeof was.cards !== 'object') return { added: [], changed: [] };
  const now = cardsNow(text);
  return {
    added: Object.keys(now).filter((n) => !(n in was.cards)),
    changed: Object.keys(now).filter((n) => n in was.cards && was.cards[n] !== now[n]),
  };
}

/** Which recorded settings differ from now. A plan with no record (confirmed before this) names none. */
function settingsChanged(text) {
  const data = stateLib.parseFrontMatter(text).data || {};
  let was;
  try {
    was = JSON.parse(String(data.confirmed_settings || ''));
  } catch {
    return [];
  }
  if (!was || typeof was !== 'object') return [];
  const now = settingsNow(text);
  const changed = SETTING_KEYS.filter((k) => k in was && was[k] !== now[k]);
  const before = String(was.experts || '').split(',').filter(Boolean);
  const after = now.experts.split(',').filter(Boolean);
  if (before.some((n) => !after.includes(n))) changed.push('experts');
  return changed;
}

/**
 * Whether the plan is confirmed: both confirmations, and the plan unchanged since the test plan was
 * confirmed (its `confirmed_hash`). The reason names what the user has to do. The run asks strictly: no hash, or a
 * hash that no longer matches, is refused. At a commit (`{ atCommit: true }`, owner decision 2026-11-13) a missing hash
 * is still refused (it proves the plan went through the confirm step, not a hand-typed flag), but a hash that no longer
 * matches is allowed, with `changedSince: true` so the commit check can remind: re-confirm when convenient.
 */
function checkConfirmed(text, { atCommit = false } = {}) {
  const data = stateLib.parseFrontMatter(text).data || {};
  if (data.plan_confirmed !== true) return { ok: false, missing: 'plan', reason: 'the plan is not confirmed (plan_confirmed is not true): the user confirms the plan first' };
  if (data.tests_confirmed !== true) return { ok: false, missing: 'tests', reason: 'the test plan is not confirmed (tests_confirmed is not true): the user confirms the Tests section next' };
  const want = String(data.confirmed_hash || '').trim();
  const have = confirmHash(text);
  if (!want) {
    if (atCommit) return { ok: false, missing: 'hash', reason: 'the plan has no confirmed_hash, so nothing shows it went through the confirm step: confirm the plan and tests with the confirm step (present --confirm), then commit' };
    return { ok: false, missing: 'hash', reason: 'the plan has no confirmed_hash: it was confirmed by hand, not through experts.js present --confirm tests_confirmed, so nothing shows it is the plan the user saw. Show the user the plan and confirm it again' };
  }
  if (have !== want && atCommit) return { ok: true, hash: have, changedSince: true, settingsChanged: settingsChanged(text), cards: cardsChanged(text) };
  if (have !== want) return { ok: false, missing: 'unchanged', reason: `the plan changed after the user confirmed it (confirmed_hash ${want}, now ${have}): show the user what changed and confirm again` };
  return { ok: true, hash: have, settingsChanged: settingsChanged(text) };
}

/** Turn the plan's `plan_confirmed: false` into true. Throws when the front matter has no such key. */
function setConfirmed(text, key) {
  const fm = stateLib.splitFrontMatter(text);
  const line = new RegExp(`^${key}[ \\t]*:[ \\t]*(true|false)[ \\t]*$`, 'm');
  if (!fm || !line.test(fm.block)) throw new Error(`the document has no \`${key}:\` line in its front matter to confirm`);
  const next = fm.bom + fm.open + fm.block.replace(line, `${key}: true`) + fm.after;
  // The test plan is the second and last confirmation: what the user saw then is what the run builds.
  // The settings the hash leaves out are recorded with it, so a later change to one is shown.
  if (key !== 'tests_confirmed') return next;
  return setFrontLine(setFrontLine(next, 'confirmed_hash', confirmHash(next)), 'confirmed_settings', JSON.stringify(settingsNow(next)));
}

/**
 * Write one text field of a workflow result to a file, from the Workflow tool's complete output
 * file on disk. The notification the session gets is cut off when the result is large, so the plan
 * is never carried through the model: this reads the whole file, takes the field, decodes the
 * entities and writes it. Anything short of the full text is an error, never a partial document.
 * `confirm` sets the `plan_confirmed` (or `tests_confirmed`) line to true in what is written.
 */
function present(opts) {
  const { result: resultFile = '', field = '', out: outFile = '', from = '', confirm = '', append = false, cwd = process.cwd() } = opts || {};
  if (!outFile) throw new Error('present needs --out <file to write>');
  const at = (p) => path.resolve(cwd, p);
  let text;
  if (from) {
    if (resultFile || field) throw new Error('present takes --from, or --result with --field, not both');
    try {
      text = fs.readFileSync(at(from), 'utf8');
    } catch (err) {
      throw new Error(`cannot read ${from}: ${err.message}`);
    }
    if (text.trim() === '') throw new Error(`${from} is empty, so there is no document to write`);
  } else {
    if (!resultFile) throw new Error('present needs --result <the Workflow output file> (or --from <a text file>)');
    if (!field) throw new Error('present needs --field <planMarkdown|testsMarkdown>');
    let raw;
    try {
      raw = fs.readFileSync(at(resultFile), 'utf8');
    } catch (err) {
      throw new Error(`cannot read the Workflow output file ${resultFile}: ${err.message}`);
    }
    const result = require('./ledger.js').unwrapResult(raw);
    if (result.ok !== true) throw new Error('the workflow result is not ok, so there is no document to write');
    const value = result[field];
    if (typeof value !== 'string' || value.trim() === '') throw new Error(`the workflow result has no "${field}" text`);
    text = looksEscaped(value) ? decodeEntities(value) : value;
  }
  if (append) {
    let existing;
    try {
      existing = fs.readFileSync(at(outFile), 'utf8');
    } catch (err) {
      throw new Error(`--append needs ${outFile} to exist: ${err.message}`);
    }
    // Keep the file's own line endings: appended text in a CRLF plan is CRLF, not a mix.
    const eol = existing.includes('\r\n') ? '\r\n' : '\n';
    text = `${existing.replace(/\s+$/, '')}${eol}${eol}${text.replace(/\r?\n/g, eol)}`;
  }
  if (confirm) text = setConfirmed(text, confirm);
  fs.mkdirSync(path.dirname(at(outFile)), { recursive: true });
  fs.writeFileSync(at(outFile), text);
  const headings = text.split(/\r?\n/).filter((l) => /^#{1,6}\s/.test(l));
  // Confirming the test plan shows, now, the warning the run would show for a card whose pack is over its budget (fault 22).
  let packWarnings = [];
  if (confirm === 'tests_confirmed') {
    try {
      const auto = require('./autopilot.js');
      const planRel = path.relative(cwd, at(outFile)).split(path.sep).join('/');
      for (const c of require('./cards.js').parseCards(text)) {
        const r = auto.pack(cwd, { plan: planRel, card: c.name, feature: 'plan-check', dry: true });
        if (r.overBudget) packWarnings.push(`card ${c.name}: its context pack is about ${r.tokens} tokens against a budget of ${r.budget}; the run goes on with a warning (raise pack_budget in the plan, or split the card)`);
      }
    } catch {
      packWarnings = [];
    }
  }
  return { out: outFile, chars: text.length, bytes: Buffer.byteLength(text), lastHeading: headings.length ? headings[headings.length - 1] : '', confirmed: Boolean(confirm), appended: Boolean(append), ...(packWarnings.length ? { packWarnings } : {}) };
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

/**
 * The experts this change is held to (item 7 of the re-wash review). The plan's `experts:` line is the
 * default. A card in the plan's Cards section may carry its own `experts:` field, and that narrows the
 * set only when it is certain which card the change belongs to, worked out from the changed files at
 * the moment of use and never from a pointer that can go stale:
 *   - every changed file, leaving out the plan, `.ultimate-workflow/` and test files, is covered by the
 *     paths of at least one card;
 *   - every card that covers one carries the field, and each field names only installed experts that are
 *     also in the plan's line.
 * Several cards give the union of their fields. Anything else -- a file no card covers, a card with no
 * field, a field that is not a subset, no Cards section, no changes -- is the plan's line, unchanged,
 * and `reason` says why. `files` can be passed by a caller that already has the working changes.
 * `options.card` names the card being committed (only `card-commit` does): when every changed file is
 * that card's own, G6 asks for its field alone (see lib/run-rules.js narrowedExperts); otherwise the above.
 */
function effectiveExperts(cwd, planFile, pluginRoot = PLUGIN_ROOT, files = null, options = {}) {
  const cardsLib = require('./cards.js');
  const planText = fs.readFileSync(planFile, 'utf8');
  const parsed = readExperts(planText);
  const planExperts = parsed.error ? [] : parsed.experts;
  const plan = (reason) => ({ experts: planExperts, source: 'plan', cards: [], planExperts, ...(reason ? { reason } : {}) });
  if (parsed.error || !parsed.present) return plan('the plan records no experts line');
  const cardList = cardsLib.parseCards(planText);
  if (cardList.length === 0) return plan('the plan has no Cards section');

  const fwd = (p) => String(p).replace(/\\/g, '/');
  const planRel = fwd(path.relative(cwd, path.resolve(cwd, planFile)));
  const changed = (files || workingChanges(cwd).files)
    .map(fwd)
    .filter((f) => f !== planRel && !f.startsWith('.ultimate-workflow/') && !gates.isTestPath(f));
  const installed = new Set(list(pluginRoot).experts.map((e) => e.name));
  if (options.card) {
    const narrowed = runRules.narrowedExperts({
      cards: cardList,
      name: options.card,
      changed,
      accepted: (cardList.find((c) => c.name.toLowerCase() === String(options.card).trim().toLowerCase()) || {}).accepted || [],
      covers: (paths, f) => cardsLib.covers(paths, f, globToRegExp),
      valid: (n) => installed.has(n) && planExperts.includes(n),
    });
    if (narrowed) return { experts: planExperts.filter((n) => narrowed.experts.includes(n)), source: 'card', cards: narrowed.cards, planExperts };
  }
  if (changed.length === 0) return plan('nothing changed beyond the plan, the tests and the tool files');

  const used = [];
  for (const f of changed) {
    const covering = cardList.filter((c) => c.paths.length > 0 && cardsLib.covers(c.paths, f, globToRegExp));
    if (covering.length === 0) return plan(`no card covers ${f}`);
    for (const c of covering) if (!used.includes(c)) used.push(c);
  }
  const union = new Set();
  for (const c of used) {
    if (c.experts === undefined) return plan(`card ${c.name} has no experts field`);
    const bad = c.experts.filter((n) => !installed.has(n) || !planExperts.includes(n));
    if (bad.length > 0) return plan(`card ${c.name} names ${bad.join(', ')}, which is not an installed expert in the plan's line`);
    for (const n of c.experts) union.add(n);
  }
  return { experts: planExperts.filter((n) => union.has(n)), source: 'cards', cards: used.map((c) => c.name), planExperts };
}

// ---- the working tree ----

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`git ${args[0]} failed${r.stderr ? `: ${r.stderr.trim()}` : ''}`);
  return r.stdout;
}

// What the evidence is about must not change when the evidence is written, so the
// evidence directory and the plan file (which gains an `experts:` line) are outside it.
// The plan is left out wherever it is kept (4.7.1): `PLAN-*.md` alone matched at the root only, so
// a plan in a subfolder moved the fingerprint when `record` wrote its experts line (Gate G6).
const BASE_EXCLUDES = [':(exclude).ultimate-workflow', ':(exclude,glob)**/PLAN-*.md'];
// The same diff text whatever the user's git config says (diff.noprefix, diff.mnemonicPrefix,
// color.diff=always, an external diff tool): skill selection reads the a/ and b/ paths.
const DIFF_FORMAT = ['--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/'];
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
/**
 * `volatile_paths` from the active plan (4.1.2): files that tools rewrite on every run, such as a
 * test-timing file or a live database. Left out of the changes, so they move no fingerprint (G6,
 * G7), reach no expert and pick no test. Comma-separated globs, `**` across folders.
 */
function volatileExcludes(cwd, planFile = '') {
  let value = '';
  try {
    // The plan the caller was given, not whichever plan the pointer names: the evidence and the decision must judge one plan.
    value = (planFile ? stateLib.parseFrontMatter(fs.readFileSync(path.resolve(cwd, planFile), 'utf8')).data : stateLib.readState(cwd).data).volatile_paths || '';
  } catch {}
  return String(value)
    .split(',')
    .map((g) => g.trim().replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter(Boolean)
    .map((g) => `:(exclude,glob)${g}`);
}

/**
 * A merge that is about to be committed (4.2.1), described by what is new in it.
 *
 * `git commit` finishing a merge commits the index. Most of that is the other branch's commits,
 * which were reviewed where they were made; asking the experts to review them again cost a card
 * 36 files and about a million tokens, or a stop for the user. What is new is what is in neither
 * parent: Git's combined diff of the merge, empty for a clean merge, and only the resolution for
 * a conflict. It is taken from a temporary commit with both parents (one unreferenced object, with
 * a fixed identity so no configuration is read) built from the tree the index would commit.
 *
 * Returns null whenever the merge is not plainly "the index is what will be committed": no merge
 * in progress, unresolved conflicts, or tracked edits not yet staged. Callers then use the whole
 * diff against HEAD, so every doubt resolves to reviewing more.
 */
function mergeInfo(cwd, planFile = '') {
  try {
    git(cwd, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']);
  } catch {
    return null;
  }
  try {
    const ex = [...BASE_EXCLUDES, ...volatileExcludes(cwd, planFile)];
    if (git(cwd, ['diff', '--name-only', '--diff-filter=U']).trim()) return null;
    const unstaged = spawnSync('git', ['diff', '--quiet', '--', '.', ...ex], { cwd });
    if (unstaged.status !== 0) return null;
    const tree = git(cwd, ['write-tree']).trim();
    const headTree = git(cwd, ['rev-parse', 'HEAD^{tree}']).trim();
    const who = { GIT_AUTHOR_NAME: 'ultimate-workflow', GIT_AUTHOR_EMAIL: 'uw@localhost', GIT_COMMITTER_NAME: 'ultimate-workflow', GIT_COMMITTER_EMAIL: 'uw@localhost' };
    const probe = spawnSync('git', ['commit-tree', tree, '-p', 'HEAD', '-p', 'MERGE_HEAD', '-m', 'ultimate-workflow merge probe'], { cwd, encoding: 'utf8', env: { ...process.env, ...who } });
    if (probe.status !== 0) return null;
    const shown = spawnSync('git', ['show', '--cc', '--format=', '--no-color', '--no-ext-diff', probe.stdout.trim(), '--', '.', ...ex], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (shown.status !== 0) return null;
    const files = [...new Set([...shown.stdout.matchAll(/^diff --(?:cc|combined) (.+)$/gm)].map((m) => m[1]))];
    const vsHead = git(cwd, ['diff', '--name-only', '--cached', 'HEAD', '--', '.', ...ex]).split(/\r?\n/).filter(Boolean);
    return { tree, headTree, diff: shown.stdout, files, vsHead };
  } catch {
    return null;
  }
}

function workingChanges(cwd, planFile = '') {
  const merge = mergeInfo(cwd, planFile);
  if (merge) return { diff: merge.diff, files: merge.files, untracked: [], merge: { tree: merge.tree, headTree: merge.headTree, vsHead: merge.vsHead } };
  // Before the first commit there is no HEAD to diff against, and the empty tree is not an
  // object a fresh repository has. What would be committed is the index, so use that.
  const heads = hasHead(cwd);
  const EXCLUDES = [...BASE_EXCLUDES, ...volatileExcludes(cwd, planFile)];
  const tracked = heads
    ? git(cwd, ['diff', ...DIFF_FORMAT, '--binary', 'HEAD', '--', '.', ...EXCLUDES])
    : git(cwd, ['diff', ...DIFF_FORMAT, '--cached', '--binary', '--', '.', ...EXCLUDES]) + git(cwd, ['diff', ...DIFF_FORMAT, '--binary', '--', '.', ...EXCLUDES]);
  const names = heads
    ? git(cwd, ['diff', '--name-only', 'HEAD', '--', '.', ...EXCLUDES])
    : git(cwd, ['diff', '--cached', '--name-only', '--', '.', ...EXCLUDES]) + git(cwd, ['diff', '--name-only', '--', '.', ...EXCLUDES]);
  const files = names.split(/\r?\n/).filter(Boolean);
  const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard', '--', '.', ...EXCLUDES]).split(/\r?\n/).filter((p) => p && !ignored(p));
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
  return { diff, files: [...new Set(files)], untracked };
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
/** The fingerprint of an empty working tree: a record under it reviewed nothing. */
const EMPTY_HASH = sha('');
/** The fingerprint of a reviewed range: of the range's own diff, never of the working tree. */
const rangeHash = (diff) => sha(`range\n${diff}`);
const fingerprint = (cwd, planFile = '') => sha(workingChanges(cwd, planFile).diff);
/**
 * What a full test run is recorded against. A merge is the tree that will be committed (its
 * combined diff can be empty while the tree still has never been tested); anything else is the
 * fingerprint of the changes.
 */
const testFingerprint = (cwd, planFile = '') => {
  const m = mergeInfo(cwd, planFile);
  return m ? `merge:${m.tree}` : fingerprint(cwd, planFile);
};

// ---- the changed-only recheck (decided 2026-10-29) ----
//
// After a small fix, /ultimate-workflow:experts gives an expert whose last review covers the
// previous changes only the files that changed since, plus the files in the diff that depend on
// them; its findings elsewhere carry forward. On the CEO dashboard run a full recheck cost about
// 490k tokens per fix. The gate is not loosened: the record is still written for the current
// fingerprint. What it can miss is an effect on a file that neither changed nor visibly uses a
// changed one, so the chain is capped and a large change reviews everything.

const SNAPSHOTS = path.join(EVIDENCE, 'snapshots');
const SNAPSHOTS_KEPT = 5;
const DELTA_CHAIN_MAX = 3;
const DELTA_SHARE_MAX = 0.4;

/** One patch per file, keyed by the path after the change. */
function splitByFile(diff) {
  const out = new Map();
  for (const part of String(diff).split(/^(?=diff --git )/m)) {
    const m = /^diff --git a\/(.+?) b\/(.+)$/m.exec(part);
    if (m) out.set(m[2], part);
  }
  return out;
}

function saveSnapshot(cwd, hash, diff) {
  const dir = path.join(cwd, SNAPSHOTS);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${hash}.diff`), diff);
  const kept = fs.readdirSync(dir).filter((f) => f.endsWith('.diff'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const x of kept.slice(SNAPSHOTS_KEPT)) fs.rmSync(path.join(dir, x.f), { force: true });
}

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Names a file offers to others: JS/TS exports and top-level Python defs and classes. */
function exportedNames(text) {
  const names = new Set();
  for (const m of text.matchAll(/^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n);
    }
  }
  for (const m of text.matchAll(/^(?:def|class)\s+([A-Za-z_]\w*)/gm)) names.add(m[1]);
  names.delete('default');
  return [...names].filter((n) => n.length >= 3);
}

/** Lines one patch has and the other does not: what the latest edit actually touched. */
function touchedLines(before, now) {
  const lines = (p) => new Set(String(p || '').split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l)));
  const a = lines(before);
  const b = lines(now);
  return [...b].filter((l) => !a.has(l)).concat([...a].filter((l) => !b.has(l))).map((l) => l.slice(1));
}

/** Files in the diff that use a changed file: import it, or name its exports or the custom properties it touched. */
function dependentsOf(cwd, changed, candidates, before, now) {
  const probes = changed.map((file) => {
    let text = '';
    try {
      text = fs.readFileSync(path.join(cwd, file), 'utf8');
    } catch {}
    const stem = path.basename(file).replace(/\.[^.]+$/, '');
    const cssVars = [...new Set(touchedLines(before.get(file), now.get(file)).join('\n').match(/--[a-z][\w-]*(?=\s*:)/g) || [])];
    return {
      file,
      importRe: stem.length >= 2 ? new RegExp(`(?:\\bimport\\b|\\brequire\\s*\\(|\\bfrom\\b)[^\\n]*['"\`][^'"\`\\n]*\\b${reEscape(stem)}(?:\\.[a-z]+)?['"\`]|^\\s*(?:from|import)\\s+[\\w.]*\\b${reEscape(stem)}\\b`, 'm') : null,
      names: exportedNames(text).map((n) => new RegExp(`(?<![\\w$])${reEscape(n)}(?![\\w$])`)),
      cssVars,
    };
  });
  const out = [];
  for (const cand of candidates) {
    let text;
    try {
      const buf = fs.readFileSync(path.join(cwd, cand));
      if (buf.length > 1024 * 1024) continue;
      text = buf.toString('utf8');
    } catch {
      continue;
    }
    const why = probes.find((p) => (p.importRe && p.importRe.test(text)) || p.names.some((re) => re.test(text)) || p.cssVars.some((v) => text.includes(v)));
    if (why) out.push({ file: cand, uses: why.file });
  }
  return out;
}

const UNTRACKED_HEAVY_BYTES = 200 * 1024;
const UNTRACKED_HEAVY_SHARE = 0.5;

/** Untracked files that make up most of a large diff, biggest first; null when they do not. */
function untrackedHeavy(changes) {
  const total = Buffer.byteLength(changes.diff);
  if (total < UNTRACKED_HEAVY_BYTES || !(changes.untracked || []).length) return null;
  const parts = splitByFile(changes.diff);
  const sizes = changes.untracked.filter((p) => parts.has(p)).map((p) => ({ path: p, bytes: Buffer.byteLength(parts.get(p)) }));
  const bytes = sizes.reduce((n, x) => n + x.bytes, 0);
  if (bytes / total < UNTRACKED_HEAVY_SHARE) return null;
  return { bytes, share: Math.round((bytes / total) * 100) / 100, files: sizes.length, biggest: sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 5) };
}

/**
 * The experts of the last check, when the current changes are still the same work in progress:
 * the last check's snapshot and the current diff share at least one file (decided 2026-10-29). A
 * recheck then cannot drop them, as it cannot drop the plan's. After a commit and an unrelated new
 * change the two share no file, and nothing is kept.
 */
function keepFromLastCheck(cwd, changes) {
  const recheck = readJson(evidenceFile(cwd, 'review', '_recheck'));
  if (!recheck || !recheck.hash || !Array.isArray(recheck.final) || recheck.final.length === 0) return null;
  let before;
  try {
    before = splitByFile(fs.readFileSync(path.join(cwd, SNAPSHOTS, `${recheck.hash}.diff`), 'utf8'));
  } catch {
    return null;
  }
  const shared = [...splitByFile(changes.diff).keys()].filter((p) => before.has(p));
  return shared.length > 0 ? { experts: recheck.final, base: recheck.hash, shared: shared.length } : null;
}

/**
 * Whether this recheck can review only what changed since the last one, and what that is. The
 * base is the last experts check (`_recheck`); every expert it selected must have a review of
 * exactly that base, or nothing is narrowed.
 */
function computeDelta(cwd, changes) {
  if (changes.merge) return { refused: 'a merge reviews everything it adds, not a changed-only part of it' };
  const recheck = readJson(evidenceFile(cwd, 'review', '_recheck'));
  if (!recheck || !recheck.hash) return { refused: 'no earlier experts check to compare against' };
  if (recheck.recheckFailed) return { refused: 'the last experts check had no answer from its recheck, so it is not a base to narrow from' };
  const base = recheck.hash;
  if (base === sha(changes.diff)) return { refused: 'nothing changed since the last experts check' };
  const experts = recheck.final || [];
  if (experts.length === 0) return { refused: 'the last experts check selected no expert' };
  let chain = 0;
  for (const name of experts) {
    const r = readJson(evidenceFile(cwd, 'review', name));
    if (!r || r.hash !== base) return { refused: `${name}'s review does not cover the last checked changes` };
    chain = Math.max(chain, (r.delta && Number(r.delta.chain)) || 0);
  }
  if (chain >= DELTA_CHAIN_MAX) return { refused: `${DELTA_CHAIN_MAX} changed-only reviews in a row, so this one reviews everything` };
  let baseDiff;
  try {
    baseDiff = fs.readFileSync(path.join(cwd, SNAPSHOTS, `${base}.diff`), 'utf8');
  } catch {
    return { refused: 'no snapshot of the last checked changes' };
  }
  const before = splitByFile(baseDiff);
  const now = splitByFile(changes.diff);
  const changed = [...now.keys()].filter((p) => before.get(p) !== now.get(p));
  const removed = [...before.keys()].filter((p) => !now.has(p));
  const dependents = dependentsOf(cwd, changed, [...now.keys()].filter((p) => !changed.includes(p)), before, now);
  const files = [...changed, ...dependents.map((d) => d.file)];
  if (now.size > 0 && files.length / now.size > DELTA_SHARE_MAX) {
    return { refused: `${files.length} of ${now.size} files changed or depend on a change (over ${DELTA_SHARE_MAX * 100}%), so this one reviews everything` };
  }
  const head = [
    `# Changed-only review: these files changed since the experts check of ${base.slice(0, 12)}, or use a file that did.`,
    ...changed.map((p) => `#   changed: ${p}`),
    ...dependents.map((d) => `#   uses ${d.uses}: ${d.file}`),
    ...removed.map((p) => `#   removed since: ${p}`),
    '',
  ].join('\n');
  const deltaFile = path.join('.ultimate-workflow', 'delta.diff');
  fs.writeFileSync(path.join(cwd, deltaFile), head + files.map((p) => now.get(p)).join(''));
  return { delta: { base, files, changed, dependents, removed, chain: chain + 1, experts }, deltaFile };
}

// ---- evidence ----

const evidenceFile = (cwd, stage, name) => path.join(cwd, EVIDENCE, stage, `${name}.json`);
/** A range review's record of one expert, under the range's own fingerprint, apart from the working tree's evidence. */
const rangeEvidenceFile = (cwd, hash, name) => path.join(cwd, EVIDENCE, 'ranges', String(hash).slice(0, 16), `${name}.json`);

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
    // A record counts for the working tree only when it was made of the working tree: not of a range, and not of an empty tree
    // (which reviewed nothing; 5.0.0 wrote such records for range reviews on a clean tree).
    const ofWorkingTree = (!r.range || r.range === 'working') && r.hash !== EMPTY_HASH;
    for (const f of r.findings) out.push({ ...f, waived: Boolean(waivers[f.id]), current: ofWorkingTree && r.hash === hash, ...(r.range && r.range !== 'working' ? { range: r.range } : {}) });
  }
  return out;
}

/**
 * Whether a range was reviewed and has no high finding open: the question before merging a run branch. The range is
 * fingerprinted by its own diff, so only a review of this very range answers it, and a later commit makes it unreviewed.
 */
function rangeCheck(cwd, range, pluginRoot = PLUGIN_ROOT) {
  const hash = rangeHash(git(cwd, ['diff', ...DIFF_FORMAT, range]));
  const names = list(pluginRoot).experts.map((e) => e.name);
  const records = names.map((n) => readJson(rangeEvidenceFile(cwd, hash, n))).filter((r) => r && r.hash === hash);
  const waivers = readWaivers(cwd);
  const open = records.flatMap((r) => (Array.isArray(r.findings) ? r.findings : []).map((f) => ({ ...f, waived: Boolean(waivers[f.id]) }))).filter((f) => blocking(f) && !f.waived);
  if (records.length === 0) return { ok: false, range, reviewed: false, open: [], reason: `the range ${range} was not reviewed by the experts (no review of exactly this range is on record)` };
  return open.length === 0 ? { ok: true, range, reviewed: true, open: [], experts: records.map((r) => r.name) } : { ok: false, range, reviewed: true, open, reason: `${open.length} high-confidence finding(s) of the review of ${range} are open` };
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
/** The rules every expert follows, sent to the workflows under `skills._protocol` to be pasted in. */
function protocolText(pluginRoot = PLUGIN_ROOT) {
  const file = path.join(pluginRoot, 'experts', 'protocol.md');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}

function prepare(cwd, range = 'working', pluginRoot = PLUGIN_ROOT, { delta = false } = {}) {
  const changes = workingChanges(cwd);
  const diff = range === 'working' ? changes.diff : git(cwd, ['diff', ...DIFF_FORMAT, range]);
  const diffFile = path.join('.ultimate-workflow', 'review.diff');
  fs.mkdirSync(path.join(cwd, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(cwd, diffFile), diff);
  // The working tree's own fingerprint is what snapshots and a changed-only check are keyed by; a range has its own.
  const workHash = sha(changes.diff);
  const hash = range === 'working' ? workHash : rangeHash(diff);
  writeJson(path.join(cwd, EVIDENCE, 'prepared.json'), { hash, range, at: new Date().toISOString() });
  // Computed before this tree's snapshot is saved; only the experts check (range working) narrows.
  const d = delta ? (range === 'working' ? computeDelta(cwd, changes) : { refused: 'a changed-only review needs range working' }) : null;
  const keep = range === 'working' ? keepFromLastCheck(cwd, changes) : null;
  // Untracked generated output (a capture's run files, a build folder) can swamp the diff the
  // experts read: 1.8 MB of it on a real install. Say so, and name the biggest, before anyone pays
  // to review it; ignoring it is the user's call.
  const heavy = untrackedHeavy(changes);
  saveSnapshot(cwd, workHash, changes.diff);
  const available = list(pluginRoot).experts;
  // Skills for every expert that could review, not only the planned ones: the recheck inside the
  // workflow can add an expert, and the workflow cannot read a file to fetch that expert's skills.
  const change = parseDiff(diff);
  const skills = {};
  const skillProblems = [];
  for (const e of available.filter((x) => x.stages.includes('review'))) {
    const sel = selectSkills(pluginRoot, e.name, 'review', change);
    skillProblems.push(...sel.problems);
    if (sel.skills.length > 0 || sel.dropped.length > 0) skills[e.name] = { skills: sel.skills, dropped: sel.dropped };
  }
  // The shared rules ride with the skills, because the workflow cannot read files (see protocolText).
  return {
    // The files of the diff that was saved: for a range, the range's files, not whatever the working tree holds (fault 20).
    hash, range, diffFile, files: range === 'working' ? changes.files : change.files, available, skills: { ...skills, _protocol: protocolText(pluginRoot) },
    ...(skillProblems.length > 0 ? { skillProblems } : {}),
    ...(d && d.delta ? { delta: d.delta, deltaFile: d.deltaFile } : {}),
    ...(d && d.refused ? { deltaRefused: d.refused } : {}),
    ...(keep ? { keep } : {}),
    ...(heavy ? { untrackedHeavy: heavy } : {}),
  };
}

// ---- where a finding came from ----
//
// A review finding names its basis: a skill pasted into the prompt, the stage reference, or the
// model's own knowledge. A skill basis is checked here against the skills that were loaded and
// against the skill's text, so a run can say what the skills added and an invented citation shows.

const BASIS_KINDS = ['skill', 'reference', 'general'];
const normalise = (s) => String(s || '').toLowerCase().replace(/[`*|_]/g, ' ').replace(/\[(?:[RDTOG]|D, 2023)\]/gi, ' ').replace(/\s+/g, ' ').trim();

/** `ok`, `missing`, `malformed`, `unknown-skill`, `not-loaded`, `no-quote` or `quote-not-found`. */
function checkBasis(f, loaded, pluginRoot = PLUGIN_ROOT) {
  const basis = typeof f.basis === 'string' ? f.basis.trim() : '';
  if (!basis) return 'missing';
  const m = /^(skill|reference|general)(?::\s*(.+))?$/.exec(basis);
  if (!m) return 'malformed';
  if (m[1] === 'general') return 'ok';
  if (!m[2]) return 'malformed';
  if (m[1] === 'reference') return 'ok';
  const name = m[2].trim().split('#')[0].trim();
  let text;
  try {
    text = readSkill(pluginRoot, name).text;
  } catch {
    return 'unknown-skill';
  }
  if (!loaded.includes(name)) return 'not-loaded';
  const quote = normalise(f.basisQuote);
  if (quote.length < 15) return 'no-quote';
  return normalise(text).includes(quote) ? 'ok' : 'quote-not-found';
}

const basisKind = (f) => (/^(skill|reference|general)\b/.exec(String(f.basis || '').trim()) || [])[1] || 'missing';
const basisSkill = (f) => (basisKind(f) === 'skill' ? String(f.basis).trim().slice(6).split('#')[0].trim() : null);

/**
 * Per expert, from the review records: the skills loaded, the findings by basis, the findings
 * each skill led to, the skills loaded and never cited, and every basis that failed its check.
 */
function attribution(cwd, pluginRoot = PLUGIN_ROOT) {
  const experts = [];
  for (const { name } of list(pluginRoot).experts) {
    const r = readJson(evidenceFile(cwd, 'review', name));
    if (!r) continue;
    const findings = Array.isArray(r.findings) ? r.findings : [];
    const loaded = Array.isArray(r.skills) ? r.skills : [];
    const byBasis = Object.fromEntries([...BASIS_KINDS, 'missing'].map((k) => [k, 0]));
    const bySkill = Object.fromEntries(loaded.map((s) => [s, 0]));
    const problems = [];
    for (const f of findings) {
      byBasis[basisKind(f)] += 1;
      const s = basisSkill(f);
      const check = f.basisCheck || checkBasis(f, loaded, pluginRoot);
      if (s && check === 'ok') bySkill[s] = (bySkill[s] || 0) + 1;
      if (check !== 'ok') problems.push({ id: f.id, file: f.file, line: f.line, basis: f.basis || null, check });
    }
    const loadedAt = {};
    for (const st of STAGES) {
      const e = readJson(evidenceFile(cwd, st, name));
      if (e && Array.isArray(e.skills)) loadedAt[st] = e.skills;
    }
    experts.push({ expert: name, at: r.at, hash: r.hash, skillsLoaded: loaded, loadedAt, findings: findings.length, byBasis, bySkill, uncited: loaded.filter((s) => !bySkill[s]), problems });
  }
  return { experts };
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
  let reviewedRange = '';
  if (stage === 'review') {
    const prepared = readJson(path.join(cwd, EVIDENCE, 'prepared.json'));
    if (!prepared) throw new Error('no prepared.json: run `experts.js prepare` before the review, so the record says what was reviewed');
    hash = prepared.hash;
    if (prepared.range && prepared.range !== 'working') reviewedRange = prepared.range;
  }

  let plan = null;
  if (planFile) plan = selectIntoPlan(planFile, lane.selected || [], available);

  const at = new Date().toISOString();
  // Findings are kept only for experts that ran: an expert that failed has no review, so it has
  // no findings and no record, and the gate asks for the review again.
  const found = (lane.findings || [])
    .filter((f) => (lane.ran || []).includes(f.expert))
    .map((f) => ({ ...f, id: findingId(f) }))
    .map((f) => (stage === 'review' ? { ...f, basisCheck: checkBasis(f, (lane.skillsLoaded && Array.isArray(lane.skillsLoaded[f.expert]) ? lane.skillsLoaded[f.expert] : []), pluginRoot) } : f));
  // A changed-only review: the expert saw only `delta.files`, so its findings on every other file
  // carry forward from the review it builds on, with their ids (and so their waivers). That base
  // must be exactly the review the delta was computed from, or nothing is recorded.
  const delta = stage === 'review' && lane.delta && Array.isArray(lane.delta.experts) ? lane.delta : null;
  const carried = {};
  if (delta) {
    const seen = new Set([...(delta.files || []), ...(delta.removed || [])]);
    for (const name of delta.experts.filter((n) => (lane.ran || []).includes(n))) {
      const prev = readJson(evidenceFile(cwd, 'review', name));
      if (!prev || prev.hash !== delta.base) throw new Error(`${name}'s review on record is not the one this changed-only review builds on (${String(delta.base).slice(0, 12)}), so nothing was recorded; run the experts check again`);
      carried[name] = (prev.findings || []).filter((f) => !seen.has(f.file)).map((f) => ({ ...f, carriedFrom: delta.base }));
    }
  }
  for (const name of lane.ran || []) {
    const mine = found.filter((f) => f.expert === name).concat(carried[name] || []);
    const narrowed = delta && delta.experts.includes(name);
    writeJson(reviewedRange ? rangeEvidenceFile(cwd, hash, name) : evidenceFile(cwd, stage, name), {
      stage,
      name,
      at,
      hash,
      ...(reviewedRange ? { range: reviewedRange } : {}),
      failedElsewhere: (lane.failed || []).length > 0,
      skills: lane.skillsLoaded && Array.isArray(lane.skillsLoaded[name]) ? lane.skillsLoaded[name] : [],
      ...(stage === 'review' ? { findings: mine, concerns: (Array.isArray(lane.concerns) ? lane.concerns : []).filter((c) => c && c.expert === name) } : {}),
      ...(narrowed ? { delta: { base: delta.base, files: delta.files || [], removed: delta.removed || [], chain: Number(delta.chain) || 1 } } : {}),
    });
  }
  // The recheck marker is the working tree's (a changed-only check narrows from it); a range review leaves it alone.
  if (stage === 'review' && lane.recheck === true && !reviewedRange) {
    writeJson(evidenceFile(cwd, 'review', '_recheck'), { hash, final: lane.selected || [], added: lane.added || [], at, ...(lane.recheckFailed === true ? { recheckFailed: true } : {}) });
  }
  const all = found.concat(...Object.values(carried));
  const open = all.filter((f) => blocking(f) && !readWaivers(cwd)[f.id]);
  const basisProblems = found.filter((f) => f.basisCheck && f.basisCheck !== 'ok').map((f) => `${f.id} ${f.expert} ${f.file}:${f.line}: basis ${f.basis ? `"${f.basis}"` : '(none)'} is ${f.basisCheck}`);
  const concerns = stage === 'review' ? (Array.isArray(lane.concerns) ? lane.concerns.filter((c) => c && (lane.ran || []).includes(c.expert)) : []) : [];
  return { stage, recorded: lane.ran || [], failed: lane.failed || [], hash, plan, findings: found.length, open, ...(stage === 'review' ? { concerns: concerns.length, ...(concerns.length > 0 ? { concernList: concerns } : {}) } : {}), ...(basisProblems.length > 0 ? { basisProblems } : {}) };
}

/**
 * The memory check of a commit (lib/memory.js): { added, existing } of the memory in the plan's
 * memory_root, when the commit touches a file of it; undefined otherwise. { error } when the memory could not
 * be read, which the commit decision lists as missing.
 */
function memoryEvidence(cwd, planFile, files) {
  try {
    const memory = require('../lib/memory.js');
    const rootDir = path.resolve(cwd, planFile ? memory.rootOfPlan(fs.readFileSync(path.resolve(cwd, planFile), 'utf8')) : '');
    const prefix = path.relative(cwd, rootDir).split(path.sep).filter(Boolean).map((d) => `${d}/`).join('');
    if (!fs.existsSync(rootDir) || !files.some((f) => f.startsWith(prefix) && memory.inScope(f.slice(prefix.length)))) return undefined;
    const lines = (args) => git(rootDir, args).split(/\r?\n/).filter(Boolean);
    // `all` and `at` (every tracked path from the repository top, and where the root sits in it) let a link that leaves the root be looked up at HEAD.
    const atHead = hasHead(cwd) ? { names: lines(['ls-tree', '-r', '--name-only', 'HEAD']), all: lines(['ls-tree', '-r', '--name-only', '--full-tree', 'HEAD']), at: lines(['rev-parse', '--show-prefix'])[0] || '', show: (f) => git(rootDir, ['show', `HEAD:./${f}`]) } : null;
    return memory.commitProblems(rootDir, atHead);
  } catch (err) {
    // The memory could not be read at all (a malformed index, say): that is reported, not allowed silently.
    return { added: [], existing: [], error: String((err && err.message) || err).split(/\r?\n/)[0] };
  }
}

// ---- the last full test run (G7) ----

/** How the commit check names the runner: forward slashes work for node on every OS. */
const verifyScript = (pluginRoot = PLUGIN_ROOT) => `node "${path.join(pluginRoot, 'hooks', 'verify.js').split(path.sep).join('/')}"`;

const RECORD_FILE = path.join('.ultimate-workflow', 'verify.json');
/**
 * The last full run's record. A file that is absent is null (never run). A file that exists and cannot be
 * read as a record (half-written, a directory) is null with a `problem`, so the check says why instead of
 * pretending no run happened.
 */
function readFullRecord(cwd) {
  const file = path.join(cwd, RECORD_FILE);
  if (!fs.existsSync(file)) return { record: null };
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!record || typeof record !== 'object') return { record: null, problem: 'verify.json does not hold a record' };
    return { record };
  } catch (err) {
    return { record: null, problem: `verify.json could not be read (${err.code || err.message})` };
  }
}

/**
 * What the full-suite check needs: the fingerprint of the changes and the last full run's record, or
 * the reason none applies. Computed here once; hooks/verify.js `fullEvidence` and the status report
 * call it too, so "fresh, stale, never, failed" has one source. A merge is judged on the tree it will
 * commit, not on its combined diff (which is empty for a clean merge whose tree was never tested).
 * `planFile` makes the fingerprint use that plan's volatile_paths, not the pointed plan's.
 */
function testsEvidence(cwd, changes = workingChanges(cwd), planFile = '') {
  const { ALWAYS_FULL } = require('../hooks/lib/selection.js');
  const onlyDocs = (files) => files.every((f) => gates.isDocPath(f) && !ALWAYS_FULL.some((re) => re.test(f)));
  const withRecord = () => {
    const { record, problem } = readFullRecord(cwd);
    return { hash: testFingerprint(cwd, planFile), record, ...(problem ? { problem } : {}) };
  };
  if (changes.merge) {
    const m = changes.merge;
    if (m.tree === m.headTree || m.vsHead.length === 0) return { skip: 'a merge that changes nothing in the tree' };
    if (onlyDocs(m.vsHead)) return { skip: 'only documentation changed' };
    return withRecord();
  }
  if (changes.files.length === 0) return { skip: 'nothing to commit' };
  // `requirements.txt` ends in a documentation extension and still changes what the tests run against.
  if (onlyDocs(changes.files)) return { skip: 'only documentation changed' };
  return withRecord();
}

/** The tests part of the commit evidence: feature work with a test_command in the plan it was given. */
function testsPart(cwd, planFile, changes, options) {
  if (options.stage !== 'feature' || !planFile) return undefined;
  let command;
  try {
    command = stateLib.parseFrontMatter(fs.readFileSync(path.resolve(cwd, planFile), 'utf8')).data.test_command;
  } catch (err) {
    // The plan cannot be read, so the test command is unknown. The confirmation item says so too.
    return { command: '', script: options.script || '', unreadable: `the plan could not be read (${err.code || err.message})` };
  }
  // No command to run the full suite with: a commit that needs a full run is refused (owner decision, 2026-11-13); one that
  // needs none (documentation only, nothing to commit) still comes back with its skip.
  if (!command) return { command: '', noCommand: true, script: options.script || '', ...testsEvidence(cwd, changes, planFile) };
  return { command: String(command), script: options.script || '', ...testsEvidence(cwd, changes, planFile) };
}

/** The confirmation part: the plan is confirmed and unchanged since (feature work, the plan it was given). */
function confirmationPart(cwd, planFile, options) {
  if (options.stage !== 'feature' || !planFile) return undefined;
  try {
    const c = checkConfirmed(fs.readFileSync(path.resolve(cwd, planFile), 'utf8'), { atCommit: true });
    return c.ok ? { ok: true, settingsChanged: c.settingsChanged || [], ...(c.changedSince ? { changedSince: true, cards: c.cards } : {}) } : { ok: false, missing: c.missing, reason: c.reason };
  } catch (err) {
    return { error: `the plan could not be read (${err.code || err.message})` };
  }
}

/**
 * What the commit decision needs, gathered once. `options`: { card } (the run's card, which narrows the
 * experts), { stage: 'feature', script } (adds the confirmation and full-suite parts; the hook, card-commit,
 * status and `check` pass it), { staleIndexOk } (a stale memory index is regenerated by the caller).
 *
 * Each guarantee is read on its own, so one failure cannot switch the others off: a guarantee whose
 * evidence cannot be read comes back with an error of its own, and the decision lists it as missing. Only
 * a failure to look at the working tree at all (a git error) is `couldNotCheck`.
 */
function commitEvidence(cwd, planFile, pluginRoot = PLUGIN_ROOT, options = {}) {
  let changes;
  try {
    changes = workingChanges(cwd, planFile);
  } catch (err) {
    return { couldNotCheck: `the working tree could not be inspected (${err.message})` };
  }
  try {
    const available = list(pluginRoot).experts.map((e) => e.name);
    // The memory check runs before the skips below: a commit of memory files alone is documentation only.
    let memory = memoryEvidence(cwd, planFile, changes.files);
    let staleIndex = false;
    if (memory && options.staleIndexOk && !memory.error && memory.added.some((p) => p.kind === 'index')) {
      staleIndex = true;
      memory = { ...memory, added: memory.added.filter((p) => p.kind !== 'index') };
    }
    const tests = testsPart(cwd, planFile, changes, options);
    const confirmation = confirmationPart(cwd, planFile, options);
    const wrap = (ev) => ({ ...ev, ...(options.deferExperts ? { expertsDeferred: true } : {}), ...(memory ? { memory } : {}), ...(tests ? { tests } : {}), ...(confirmation ? { confirmation } : {}), ...(staleIndex ? { staleIndex } : {}) });
    if (available.length === 0) return wrap({ skip: 'no experts are installed' });
    if (changes.files.length === 0) return wrap({ skip: changes.merge ? 'a merge that adds nothing beyond its parents' : 'nothing to commit' });
    if (changes.files.every((f) => gates.isDocPath(f))) return wrap({ skip: 'only documentation changed' });

    const recheck = readJson(evidenceFile(cwd, 'review', '_recheck'));
    const records = {};
    for (const name of available) {
      const r = readJson(evidenceFile(cwd, 'review', name));
      if (r && r.hash) records[name] = r.hash;
    }
    let planExperts = [];
    let cards = [];
    let expertsError;
    const hash = sha(changes.diff);
    if (planFile) {
      try {
        const eff = effectiveExperts(cwd, planFile, pluginRoot, changes.files, options);
        planExperts = eff.experts;
        cards = eff.cards;
        // The experts the recheck added for these very changes are required of a narrowed card too.
        if (eff.source === 'card' && recheck && recheck.hash === hash) planExperts = [...new Set([...planExperts, ...(recheck.added || [])])];
      } catch (err) {
        expertsError = `could not work out which experts apply (${err.code || err.message})`;
      }
    }
    const open = allFindings(cwd, hash, available).filter((f) => f.current && blocking(f) && !f.waived);
    return wrap({ hash, recheck: recheck ? { hash: recheck.hash, final: recheck.final || [] } : null, records, planExperts, cards, available, open, ...(expertsError ? { expertsError } : {}) });
  } catch (err) {
    return { couldNotCheck: `the commit evidence could not be gathered (${err.message})` };
  }
}

// ---- phase scripts with their arguments built in ----

/**
 * The shared sections of the phase scripts: lib/phase-shared.js holds them between `// @@section <name>` and
 * `// @@end <name>` lines. Read from the plugin only, never from the project.
 */
function sharedSections(pluginRoot) {
  const text = fs.readFileSync(path.join(pluginRoot, 'lib', 'phase-shared.js'), 'utf8');
  const out = {};
  let key = null;
  let body = [];
  for (const line of text.split(/\r?\n/)) {
    const open = /^\/\/ @@section ([a-z-]+)\s*$/.exec(line);
    const close = /^\/\/ @@end ([a-z-]+)\s*$/.exec(line);
    if (open) {
      key = open[1];
      body = [];
    } else if (close && close[1] === key) {
      out[key] = body.join('\n');
      key = null;
    } else if (key) body.push(line);
  }
  return out;
}

/**
 * The runnable text of a phase script: phases/<name>.js with each `// @shared <name>` line replaced by that
 * section of lib/phase-shared.js. The one function that builds it, called by stageScript (what users run) and
 * by the test loader (so tests run what users run). A phase script cannot import, so this is how code is shared.
 */
function assemblePhase(pluginRoot, phaseName) {
  const src = path.join(pluginRoot, 'phases', `${phaseName}.js`);
  const text = fs.readFileSync(src, 'utf8');
  const sections = sharedSections(pluginRoot);
  return text.replace(/^[ \t]*\/\/ @shared ([a-z-]+)[ \t]*(\r?)$/gm, (m, key, cr) => {
    if (!(key in sections)) throw new Error(`phases/${phaseName}.js asks for the shared section "${key}", which lib/phase-shared.js does not have`);
    return sections[key] + cr;
  });
}

// The Workflow tool loads a scriptPath only from a folder the session can read, never from
// the plugin's install folder, and a model that passes args has to type them out: 30-300 KB
// of skill text per phase. So the command writes a copy of the phase script into the
// project, with the arguments already inside, and runs that by path. The JSON goes from
// file to file untouched; nothing is retyped.
function stageScript(pluginRoot, cwd, phaseName, { argsFile = '', files = [], merges = [] } = {}) {
  const src = path.join(pluginRoot, 'phases', `${phaseName}.js`);
  if (!/^[a-z]+$/.test(phaseName) || !fs.existsSync(src)) throw new Error(`no phase script phases/${phaseName}.js`);
  const readJson = (p) => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(cwd, p), 'utf8').replace(/^﻿/, ''));
    } catch (err) {
      throw new Error(`${p} is not readable JSON (${err.message})`);
    }
  };
  const args = { expertsDir: path.join(pluginRoot, 'experts') };
  for (const p of merges) {
    const v = readJson(p);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${p} must hold a JSON object to merge`);
    Object.assign(args, v);
  }
  for (const spec of files) {
    const at = spec.indexOf('=');
    if (at < 1) throw new Error(`--file needs key=path, got "${spec}"`);
    args[spec.slice(0, at)] = readJson(spec.slice(at + 1));
  }
  if (argsFile) {
    const v = readJson(argsFile);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${argsFile} must hold a JSON object`);
    Object.assign(args, v);
  }
  // 4.1.1: the build's rounds run the related tests and one full run at green, through the
  // plugin's verify.js, when the plan names its test_command. Chosen here, in code, so a model
  // never types the path (and a Windows path never reaches a JSON string with bare backslashes).
  // 4.2.0: the model for the agents that only search and read (plan readers, harvest gatherers).
  if (phaseName === 'plan' || phaseName === 'harvest') {
    const reader = process.env.ULTIMATE_WORKFLOW_READER_MODEL;
    if (typeof reader === 'string' && reader.trim()) args.readerModel = reader.trim();
    else delete args.readerModel;
  }
  // The model for the build's test writer and implementer (PLAN-run-records.md, W1). A value
  // in the arguments file wins; the environment only fills in when there is none.
  if (phaseName === 'build') {
    const impl = process.env.ULTIMATE_WORKFLOW_BUILD_MODEL;
    if (args.implementerModel === undefined && typeof impl === 'string' && impl.trim()) args.implementerModel = impl.trim();
  }
  if (typeof args.plan === 'string') {
    try {
      stateLib.setActivePlan(cwd, args.plan);
    } catch {}
  }
  if (phaseName === 'run') Object.assign(args, runArgs(pluginRoot, cwd, args));
  // The command that runs the autopilot steps, with the path written in here so no model types it.
  if (phaseName === 'harvest') args.cli = `node "${path.join(pluginRoot, 'experts', 'experts.js').replace(/\\/g, '/')}"`;
  if (phaseName === 'build' || phaseName === 'run') {
    const impl = process.env.ULTIMATE_WORKFLOW_BUILD_MODEL;
    if (phaseName === 'run' && args.implementerModel === undefined && typeof impl === 'string' && impl.trim()) args.implementerModel = impl.trim();
    delete args.verify;
    let planRel = typeof args.plan === 'string' ? args.plan : '';
    let data = {};
    try {
      if (planRel) data = stateLib.parseFrontMatter(fs.readFileSync(path.resolve(cwd, planRel), 'utf8')).data;
    } catch {}
    // Arguments that name no plan (a build started with only a command, as in the re-wash) used to
    // get no verify command at all, so the build's closing full run never happened. The active plan
    // is the one the gates already follow.
    if (!planRel) {
      try {
        const active = stateLib.readState(cwd);
        if (active.stage === 'feature' && active.file) {
          planRel = path.relative(cwd, active.file);
          data = active.data;
        }
      } catch {}
    }
    if (data.test_command) {
      const fwd = (p) => p.replace(/\\/g, '/');
      args.verify = `node "${fwd(path.join(pluginRoot, 'hooks', 'verify.js'))}" --plan "${fwd(planRel)}"`;
    }
  }
  const text = assemblePhase(pluginRoot, phaseName);
  const meta = /^export const meta = \{[\s\S]*?^\}\r?\n/m.exec(text);
  if (!meta || meta.index !== 0) throw new Error(`phases/${phaseName}.js does not start with its meta block`);
  const head = meta[0];
  const body = text.slice(head.length);
  const out = [
    head,
    `// Written by experts.js script from phases/${phaseName}.js, with its arguments built in. Do not edit;`,
    '// run the command again instead. Arguments passed to the Workflow call win over these.',
    `const EMBEDDED_ARGS = ${JSON.stringify(args)}`,
    'return await (async (args) => {',
    body,
    "})(Object.assign({}, EMBEDDED_ARGS, args && typeof args === 'object' && !Array.isArray(args) ? args : {}))",
    '',
  ].join('\n');
  const dir = path.join(cwd, '.ultimate-workflow', 'run');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${phaseName}.js`);
  fs.writeFileSync(file, out);
  const skills = args.skills && typeof args.skills === 'object' && !Array.isArray(args.skills) ? args.skills : null;
  const skillNames = skills
    ? Object.fromEntries(Object.entries(skills).filter(([k, v]) => k !== '_protocol' && Array.isArray(v)).map(([k, v]) => [k, v.map((s) => s && s.name)]))
    : null;
  return { scriptPath: file, bytes: Buffer.byteLength(out), keys: Object.keys(args).sort(), skills: skillNames, skillProblems: args.skillProblems || [] };
}

/**
 * What the autopilot run's script needs, worked out here because the script can read nothing
 * (PLAN-autopilot.md, W1). For each card of the plan: its fields, its context pack and preflight
 * (`pack`), its build briefs and the review skills of the experts that may check it, both chosen
 * from the card's planned files and text (the card's diff does not exist yet), and the experts it is
 * held to. Skill texts go once into `skillTexts`; cards name them. `args` holds plan, feature and
 * an optional resume ({ card, testFiles, reason } or { all: true }).
 */
function runArgs(pluginRoot, cwd, args) {
  const autopilot = require('./autopilot.js');
  const cardsLib = require('./cards.js');
  if (typeof args.plan !== 'string' || !args.plan) throw new Error('script --phase run needs "plan" in the arguments file');
  if (typeof args.feature !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(args.feature)) throw new Error('script --phase run needs "feature" (letters, digits, dot, dash, underscore) in the arguments file');
  const planText = fs.readFileSync(path.resolve(cwd, args.plan), 'utf8');
  const parsed = readExperts(planText);
  const planExperts = parsed.error ? [] : parsed.experts;
  const available = list(pluginRoot).experts;
  const all = cardsLib.parseCards(planText);
  if (all.length === 0) throw new Error(`${args.plan} has no ## Cards section: the run builds cards (add them with experts.js card-add)`);
  // The run's base is where uw/run/<feature> started, kept for a resumed run so the review still covers every card.
  const runFile = path.join(cwd, '.ultimate-workflow', 'run', args.feature, 'run.json');
  let base = '';
  try {
    base = JSON.parse(fs.readFileSync(runFile, 'utf8')).base || '';
  } catch {}
  if (!base) {
    base = git(cwd, ['rev-parse', 'HEAD']).trim();
    fs.mkdirSync(path.dirname(runFile), { recursive: true });
    fs.writeFileSync(runFile, `${JSON.stringify({ base, plan: args.plan, feature: args.feature, at: new Date().toISOString() }, null, 2)}\n`);
  }
  const skillTexts = {};
  const keep = (skills) => skills.map((s) => {
    skillTexts[s.name] = s.text;
    return s.name;
  });
  // A card run again within the plan (--resume without --accept on a held card) starts from its
  // tests, so it gets a plain pack, not one that needs a parked diagnosis.
  const resumeCard = args.resume && typeof args.resume.card === 'string' && !args.resume.rerun ? args.resume.card : '';
  const cards = all.map((c) => {
    const ownSection = autopilot.sections(planText).find((h) => /^card\s/i.test(h.title) && new RegExp(`^card\\s+${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'i').test(h.title));
    const tests = autopilot.testSection(planText, c.name, all.length);
    const slice = (h) => (h ? planText.split(/\r?\n/).slice(h.start - 1, h.end).join('\n') : '');
    const text = [cardsLib.cardText(c), slice(ownSection), slice(tests)].filter(Boolean).join('\n');
    const change = { files: [...new Set([...planPaths(text), ...c.paths.filter((p) => !p.includes('*'))])], text };
    const b = briefs(pluginRoot, { planText: text }).briefs.map((x) => ({ name: x.name, text: x.text, skills: keep(x.skills || []) }));
    const experts = Array.isArray(c.experts) ? c.experts.filter((n) => planExperts.includes(n)) : planExperts;
    const reviewSkills = {};
    for (const e of available.filter((x) => x.stages.includes('review'))) {
      const sel = selectSkills(pluginRoot, e.name, 'review', change);
      if (sel.skills.length) reviewSkills[e.name] = keep(sel.skills);
    }
    let preflight;
    if (c.committed) preflight = { ok: true, skipped: 'committed' };
    else {
      try {
        preflight = autopilot.pack(cwd, { plan: args.plan, card: c.name, feature: args.feature, resume: resumeCard === c.name });
      } catch (err) {
        preflight = { ok: false, reason: `missing input: ${err.message}` };
      }
    }
    return { name: c.name, title: c.title, paths: c.paths, depends: c.depends || [], carried: c.carried, experts, ownExperts: Array.isArray(c.experts), briefs: b, reviewSkills, preflight, ...(c.committed ? { committed: c.committed } : {}), ...(c.parked ? { parked: c.parked } : {}) };
  });
  const fwdPath = (p) => p.replace(/\\/g, '/');
  return {
    base,
    cards,
    skillTexts,
    available,
    planExperts,
    protocol: protocolText(pluginRoot),
    planBriefs: briefs(pluginRoot, { planText }).briefs.map((x) => ({ name: x.name, text: x.text, skills: keep(x.skills || []) })),
    cli: `node "${fwdPath(path.join(pluginRoot, 'experts', 'experts.js'))}"`,
    command: stateLib.parseFrontMatter(planText).data.test_command || '',
  };
}

/** card-add: the plan with one more card written. Throws the refusal; the caller prints it. */
function cardAdd(o) {
  if (!o.plan) throw new Error('card-add needs --plan');
  const cardsLib = require('./cards.js');
  const file = path.resolve(o.cwd, o.plan);
  const text = fs.readFileSync(file, 'utf8');
  let cardExperts = null;
  if (o.experts !== undefined) {
    const names = o.experts.trim() === 'none' ? [] : String(o.experts).split(',').map((s) => s.trim()).filter(Boolean);
    const inPlan = readExperts(text);
    if (!inPlan.present || inPlan.error) throw new Error(`the plan records no experts yet, so a card cannot narrow them. Record them first: node experts.js select --plan ${o.plan} --add <names> (or --add "" for none)`);
    const installed = list(o.pluginRoot).experts.map((e) => e.name);
    const unknown = names.filter((n) => !installed.includes(n));
    if (unknown.length > 0) throw new Error(`unknown expert(s): ${unknown.join(', ')} (installed: ${installed.join(', ')})`);
    const outside = names.filter((n) => !inPlan.experts.includes(n));
    if (outside.length > 0) throw new Error(`${outside.join(', ')} is not in the plan's experts [${inPlan.experts.join(', ')}]. A card can only narrow the plan's list; add them to the plan first with select.`);
    cardExperts = names;
  }
  // Text an agent wrote (a finding's file, a title, the carried items) comes in through a file, never the command line.
  const fromFile = (f) => fs.readFileSync(path.resolve(o.cwd, f), 'utf8').trim();
  if (o.titleFile) o.title = fromFile(o.titleFile);
  if (o.pathsFile) o.paths = fromFile(o.pathsFile);
  const carried = String(o.carriedFile ? fs.readFileSync(path.resolve(o.cwd, o.carriedFile), 'utf8') : o.carried || '').split(';').map((s) => s.trim()).filter(Boolean);
  let name = o.name;
  if (o.freeName) {
    // The same request twice (a replayed step) returns the card it added, not a second one.
    const again = runRules.reusableCard(cardsLib.parseCards(text), o.name, o.title, carried);
    if (again) return { ok: true, plan: o.plan, card: again };
    const free = runRules.freeName(o.name, (n) => cardsLib.findCard(text, n) !== null);
    if (!free.ok) throw new Error(free.reason);
    name = free.name;
  }
  const next = cardsLib.addCard(text, {
    experts: cardExperts,
    name,
    title: o.title,
    // Reviewers and builds often name files by absolute path; one inside the project is taken as
    // relative to it. One outside it still reaches addCard's refusal unchanged.
    paths: String(o.paths || '').split(',').map((s) => s.trim()).filter(Boolean).map((p) => {
      if (!path.isAbsolute(p)) return p;
      const rel = path.relative(path.resolve(o.cwd), path.resolve(p));
      return rel && !path.isAbsolute(rel) && !rel.split(/[\\/]/).includes('..') ? rel.replace(/\\/g, '/') : p;
    }),
    carried,
    depends: String(o.depends || '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  fs.writeFileSync(file, next);
  return { ok: true, plan: o.plan, card: cardsLib.findCard(next, name) };
}

// ---- command line ----

function fail(message) {
  process.stderr.write(`experts.js: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { cmd: argv[0], plan: '', add: null, stage: '', id: '', reason: '', range: 'working', pluginRoot: PLUGIN_ROOT, cwd: process.cwd(), phase: '', argsFile: '', files: [], merges: [], section: '', delta: false };
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
    else if (a === '--phase') o.phase = need();
    else if (a === '--section') o.section = need();
    else if (a === '--card') o.card = need();
    else if (a === '--name') o.name = need();
    else if (a === '--title') o.title = need();
    else if (a === '--paths') o.paths = need();
    else if (a === '--carried') o.carried = need();
    else if (a === '--carried-file') o.carriedFile = need();
    else if (a === '--title-file') o.titleFile = need();
    else if (a === '--paths-file') o.pathsFile = need();
    else if (a === '--depends') o.depends = need();
    else if (a === '--experts') o.experts = need();
    else if (a === '--free-name') o.freeName = true;
    else if (a === '--result') o.result = need();
    else if (a === '--field') o.field = need();
    else if (a === '--out') o.out = need();
    else if (a === '--confirm') o.confirm = need();
    else if (a === '--from') o.from = need();
    else if (a === '--append') o.append = true;
    else if (a === '--delta') o.delta = true;
    else if (a === '--args-file') o.argsFile = need();
    else if (a === '--file') o.files.push(need());
    else if (a === '--merge') o.merges.push(need());
    else fail(`unknown argument: ${a}`);
  }
  return o;
}

function main(argv) {
  const out = (v) => process.stdout.write(`${JSON.stringify(v)}\n`);
  if (argv[0] === 'usage') {
    try {
      return require('./usage.js').cli(argv.slice(1), process.cwd(), out, fail);
    } catch (err) {
      return fail(err.message);
    }
  }
  if (argv[0] === 'ledger') {
    try {
      return require('./ledger.js').cli(argv.slice(1), process.cwd(), out, fail);
    } catch (err) {
      return fail(err.message);
    }
  }
  // The link check for the entry and memory files.
  if (argv[0] === 'links') {
    try {
      process.exitCode = require('../lib/links.js').cli(argv.slice(1), process.cwd(), (s) => process.stdout.write(s), fail);
      return;
    } catch (err) {
      return fail(err.message);
    }
  }
  // The topical headers and the generated index in memory.md: memory index|check|migrate.
  if (argv[0] === 'memory') {
    try {
      process.exitCode = require('../lib/memory.js').cli(argv.slice(1), process.cwd(), (s) => process.stdout.write(s), fail);
      return;
    } catch (err) {
      return fail(err.message);
    }
  }
  // The autopilot run's card steps (4.7.0): pack, handoff, park, unpark, journal, card-commit, ...
  if (require('./autopilot.js').COMMANDS.includes(argv[0])) {
    try {
      return require('./autopilot.js').cli(argv, process.cwd(), out, fail);
    } catch (err) {
      return fail(err.message);
    }
  }
  const o = parseArgs(argv);
  // The gates follow the plan the commands work on (4.1.2): record it whenever one is named.
  if (o.plan) {
    try {
      stateLib.setActivePlan(process.cwd(), o.plan);
    } catch {}
  }
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
    if (o.cmd === 'brief') {
      let planText = o.plan ? fs.readFileSync(o.plan, 'utf8') : null;
      if (o.card && o.section) fail('brief takes --card or --section, not both');
      if (o.card) {
        if (planText === null) fail('brief --card needs --plan');
        const cardsLib = require('./cards.js');
        const card = cardsLib.findCard(planText, o.card);
        const text = card ? cardsLib.cardText(card) : cardsLib.headingCardText(planText, o.card);
        if (text === null) {
          const known = cardsLib.parseCards(planText).map((c) => c.name);
          fail(`no card "${o.card}" in ${o.plan} (${known.length ? `cards: ${known.join(', ')}` : 'it has no Cards section'}). Add it with: experts.js card-add --plan ${o.plan} --name ${o.card} --title <title> --paths <globs>`);
        }
        planText = text;
      }
      if (o.section) {
        if (planText === null) fail('brief --section needs --plan');
        planText = planSection(planText, o.section);
        if (planText === null) fail(`no heading containing "${o.section}" in ${o.plan}`);
      }
      const b = briefs(o.pluginRoot, { planText });
      if (b.problems.length > 0) process.stderr.write(`experts.js: ${b.problems.join('; ')}\n`);
      if (b.note) process.stderr.write(`experts.js: ${b.note}\n`);
      return out(b.briefs);
    }
    if (o.cmd === 'skills') {
      if (o.stage !== 'plan' && o.stage !== 'tests') fail('skills needs --stage plan or --stage tests --plan P (review and build choose their skills in prepare and brief)');
      if (o.stage === 'tests' && !o.plan) fail('skills --stage tests needs --plan <plan file>: the skills are chosen from it');
      const k = o.stage === 'plan' ? planSkills(o.pluginRoot) : testsSkills(o.pluginRoot, fs.readFileSync(o.plan, 'utf8'));
      if (k.problems.length > 0) process.stderr.write(`experts.js: ${k.problems.join('; ')}\n`);
      return out({ ...k.skills, _protocol: protocolText(o.pluginRoot) });
    }
    if (o.cmd === 'read') {
      const r = readExperts(fs.readFileSync(needPlan(), 'utf8'));
      if (r.error) fail(r.error);
      let effective = { experts: r.experts, source: 'plan', cards: [], planExperts: r.experts };
      try {
        effective = effectiveExperts(o.cwd, path.resolve(o.cwd, needPlan()), o.pluginRoot);
      } catch {}
      return out({ file: o.plan, present: r.present, experts: r.experts, effective });
    }
    if (o.cmd === 'select') {
      if (o.add === null) fail('select needs --add a,b (use --add "" to record that none apply)');
      return out(selectIntoPlan(needPlan(), o.add, list(o.pluginRoot).experts.map((e) => e.name)));
    }
    if (o.cmd === 'prepare') return out(prepare(o.cwd, o.range, o.pluginRoot, { delta: o.delta }));
    if (o.cmd === 'fingerprint') return out({ hash: fingerprint(o.cwd) });
    if (o.cmd === 'record') {
      if (!o.stage) fail('record needs --stage plan|tests|review');
      let result;
      if (o.result) {
        // The Workflow tool's output file, whole: nothing is retyped from the (cut-off) notification.
        try {
          result = require('./ledger.js').unwrapResult(fs.readFileSync(o.result, 'utf8'));
        } catch (err) {
          fail(`record --result could not use ${o.result}: ${err.message}`);
        }
      } else {
        try {
          result = JSON.parse(fs.readFileSync(0, 'utf8'));
        } catch {
          fail('record reads the workflow result as JSON on standard input, or from the Workflow output file with --result <file>');
        }
      }
      return out(record(o.cwd, o.stage, result, { planFile: o.plan, pluginRoot: o.pluginRoot }));
    }
    if (o.cmd === 'present') return out(present({ result: o.result, field: o.field, out: o.out, from: o.from, confirm: o.confirm, append: o.append, cwd: o.cwd }));
    if (o.cmd === 'findings') {
      const names = list(o.pluginRoot).experts.map((e) => e.name);
      return out({ findings: allFindings(o.cwd, fingerprint(o.cwd), names).filter((f) => blocking(f)) });
    }
    if (o.cmd === 'resolve') return out(resolve(o.cwd, o.id, o.reason, o.pluginRoot));
    if (o.cmd === 'attribution') return out(attribution(o.cwd, o.pluginRoot));
    if (o.cmd === 'script') {
      if (!o.phase) fail('script needs --phase <plan|tests|build|review|harvest>');
      return out(stageScript(o.pluginRoot, o.cwd, o.phase, { argsFile: o.argsFile, files: o.files, merges: o.merges }));
    }
    if (o.cmd === 'card-add') {
      // One JSON line with ok, a refusal included: an agent does not see the exit code.
      try {
        out(cardAdd(o));
      } catch (err) {
        out({ ok: false, reason: err.message });
        process.exitCode = 2;
      }
      return;
    }
    if (o.cmd === 'scope') {
      if (!o.plan || !o.card) fail('scope needs --plan and --card');
      const cardsLib = require('./cards.js');
      const card = cardsLib.findCard(fs.readFileSync(path.resolve(o.cwd, o.plan), 'utf8'), o.card);
      if (!card) fail(`no card "${o.card}" in ${o.plan}`);
      if (card.paths.length === 0) fail(`card ${card.name} lists no paths, so there is nothing to compare the changes with`);
      const fwd = (p) => String(p).replace(/\\/g, '/');
      const rel = (p) => fwd(path.isAbsolute(p) ? path.relative(o.cwd, p) : p).replace(/^\.\//, '');
      // Not scope: the plan the gates rewrite every turn, the plugin's own folder, and the tests the
      // build's test step wrote (they sit wherever the project keeps tests, not under the card).
      const skip = new Set([rel(path.resolve(o.cwd, o.plan))]);
      let testFiles = [];
      if (o.result) {
        let parsed;
        try {
          parsed = require('./ledger.js').unwrapResult(JSON.parse(fs.readFileSync(path.resolve(o.cwd, o.result), 'utf8').replace(/^\uFEFF/, '')));
        } catch (err) {
          fail(`${o.result} is not a saved build result (${err.message})`);
        }
        testFiles = [...(parsed.testFiles || []), ...(parsed.filesWritten || [])].filter((f) => typeof f === 'string').map(rel);
        for (const f of testFiles) skip.add(f);
      }
      const changed = workingChanges(o.cwd).files.map(rel).filter((f) => !skip.has(f) && !f.startsWith('.ultimate-workflow/'));
      const outside = cardsLib.outOfScope(changed, card.paths, globToRegExp);
      return out({ card: card.name, title: card.title, paths: card.paths, changed: changed.length, outOfScope: outside, testsExcluded: testFiles.length });
    }
    if (o.cmd === 'use') {
      if (!o.plan) return fail('use needs --plan <plan file>');
      if (!stateLib.setActivePlan(o.cwd, o.plan)) return fail(`${o.plan} is not a plan of this project: it must be a PLAN-*.md inside the project folder`);
      return out({ ok: true, plan: o.plan });
    }
    if (o.cmd === 'check' && o.range && o.range !== 'working') {
      const verdict = rangeCheck(o.cwd, o.range, o.pluginRoot);
      out(verdict);
      if (!verdict.ok) process.exit(1);
      return undefined;
    }
    if (o.cmd === 'check') {
      const evidence = commitEvidence(o.cwd, o.plan, o.pluginRoot, o.plan ? { stage: 'feature', script: verifyScript(o.pluginRoot) } : {});
      const verdict = gates.commitGate(evidence);
      const extra = { ...(verdict.notices ? { notices: verdict.notices } : {}), ...(verdict.warnings ? { warnings: verdict.warnings } : {}) };
      out(verdict.allow ? { ok: true, ...(verdict.outcome ? { outcome: verdict.outcome, why: verdict.why } : {}), ...extra } : { ok: false, reason: verdict.reason, open: evidence.open || [], missing: verdict.missing || [], ...extra });
      if (!verdict.allow) process.exit(1);
      return undefined;
    }
  } catch (err) {
    fail(err.message);
  }
  return fail(`unknown command: ${o.cmd || '(none)'} (expected list, brief, skills, read, select, prepare, record, check, findings, resolve, attribution, fingerprint, script, ledger, card-add, scope, present)`);
}

module.exports = {
  confirmHash,
  checkConfirmed,
  setConfirmed,
  settingsChanged,
  cardsChanged,
  rangeCheck,
  SETTING_KEYS,
  setFrontLine,
  STAGES,
  BUILD,
  DECLARABLE,
  BRIEF_BYTES,
  list,
  briefs,
  planSection,
  SKILL_STAGES,
  parseSelector,
  present,
  decodeEntities,
  looksEscaped,
  matches,
  parseSkillsFile,
  skillsAt,
  readSkill,
  parseDiff,
  planPaths,
  selectSkills,
  planSkills,
  testsSkills,
  ALWAYS_STAGES,
  expertsFor,
  mergeAdd,
  readExperts,
  effectiveExperts,
  setExperts,
  selectIntoPlan,
  workingChanges,
  fingerprint,
  testFingerprint,
  mergeInfo,
  prepare,
  splitByFile,
  exportedNames,
  globToRegExp,
  dependentsOf,
  computeDelta,
  keepFromLastCheck,
  stageScript,
  record,
  commitEvidence,
  testsEvidence,
  assemblePhase,
  sharedSections,
  verifyScript,
  findingId,
  resolve,
  allFindings,
  checkBasis,
  attribution,
};

if (require.main === module) main(process.argv.slice(2));
