'use strict';

// The frozen test corpus for an expert: seeded cases (a planted defect in the expert's
// domain), benign look-alikes (safe, and a careful expert reports nothing), and sibling
// cases (a defect in a different domain that the expert must leave alone).
//
// A corpus is written by an agent that has not seen the expert's checklist, then frozen:
// case ids are opaque, the order is fixed, and the file's SHA-256 is pinned in two places
// (corpus/MANIFEST.json and corpus.test.js). A case cannot change after results exist.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CORPUS_DIR = path.join(__dirname, '..', '..', 'corpus');
const KINDS = ['seeded', 'benign', 'sibling'];
const SPLITS = ['dev', 'heldout'];
// Seeded cases of a hard set say what makes them hard: a fact the reviewer may not know (often
// newer than its training), or reasoning across files and hunks.
const HARD = ['knowledge', 'reasoning'];

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

/** Opaque, stable id: carries no hint of kind, order or expert. */
function caseId(expert, kind, summary) {
  return `c${crypto.createHash('sha1').update(`${expert}\n${kind}\n${summary}`).digest('hex').slice(0, 8)}`;
}

/**
 * Hunk headers written by hand are often a line or two off. They are recomputed from the
 * hunk body so that a corpus diff is a well-formed unified diff. Content is not touched.
 */
function normaliseHunks(diff) {
  const lines = String(diff).replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (!m) {
      out.push(lines[i]);
      i += 1;
      continue;
    }
    let j = i + 1;
    let oldCount = 0;
    let newCount = 0;
    while (j < lines.length && !/^@@ /.test(lines[j]) && !/^diff /.test(lines[j])) {
      const l = lines[j];
      if (l.startsWith('\\')) {
        j += 1;
        continue;
      }
      if (l.startsWith('+')) newCount += 1;
      else if (l.startsWith('-')) oldCount += 1;
      else {
        oldCount += 1;
        newCount += 1;
      }
      j += 1;
    }
    out.push(`@@ -${m[1]},${oldCount} +${m[2]},${newCount} @@${m[3]}`);
    for (let k = i + 1; k < j; k += 1) out.push(lines[k]);
    i = j;
  }
  return `${out.join('\n')}\n`;
}

/** Hunk headers match their bodies. */
function hunksConsistent(diff) {
  return normaliseHunks(diff) === `${String(diff).replace(/\r\n/g, '\n').replace(/\n$/, '')}\n`;
}

/** Every third case of each kind, by id order, is held out; the rest are for development. */
function assignSplits(cases) {
  const byKind = {};
  for (const c of cases) (byKind[c.kind] = byKind[c.kind] || []).push(c);
  for (const list of Object.values(byKind)) {
    list.sort((a, b) => a.id.localeCompare(b.id));
    list.forEach((c, n) => {
      c.split = n % 3 === 2 ? 'heldout' : 'dev';
    });
  }
  return cases;
}

/**
 * A corpus is named by its expert, or by its expert and a set (`security-hard`): a second corpus
 * for the same expert, frozen separately, so an existing corpus never has to change.
 */
const keyOf = (c) => (c && c.set ? `${c.expert}-${c.set}` : c && c.expert);

/** Problems with a corpus object; an empty list means it is usable. */
function validate(corpus) {
  const problems = [];
  if (!corpus || typeof corpus !== 'object') return ['corpus is not an object'];
  if (!/^[a-z]+$/.test(corpus.expert || '')) problems.push('expert must be one lowercase word');
  if ('set' in corpus && !/^[a-z]+$/.test(corpus.set || '')) problems.push('set must be one lowercase word');
  if (!Array.isArray(corpus.cases) || corpus.cases.length === 0) return [...problems, 'no cases'];
  const ids = new Set();
  const summaries = new Set();
  const counts = { seeded: 0, benign: 0, sibling: 0 };
  for (const c of corpus.cases) {
    const where = `case ${c && c.id}`;
    if (!c || !KINDS.includes(c.kind)) {
      problems.push(`${where}: kind must be one of ${KINDS.join(', ')}`);
      continue;
    }
    counts[c.kind] += 1;
    if (!/^c[0-9a-f]{8}$/.test(c.id || '')) problems.push(`${where}: id is not opaque`);
    if (ids.has(c.id)) problems.push(`${where}: duplicate id`);
    ids.add(c.id);
    if (summaries.has(c.summary)) problems.push(`${where}: duplicate summary`);
    summaries.add(c.summary);
    if (c.id !== caseId(keyOf(corpus), c.kind, c.summary)) problems.push(`${where}: id does not match kind and summary`);
    if (!SPLITS.includes(c.split)) problems.push(`${where}: split must be dev or heldout`);
    if (typeof c.summary !== 'string' || c.summary.length < 10) problems.push(`${where}: summary missing`);
    if (typeof c.diff !== 'string' || !/^@@ /m.test(c.diff)) problems.push(`${where}: diff has no hunk`);
    else if (!hunksConsistent(c.diff)) problems.push(`${where}: hunk header counts do not match the body`);
    if (c.kind === 'seeded' && !(typeof c.planted === 'string' && c.planted.length >= 20)) problems.push(`${where}: seeded case needs a planted description`);
    if (c.kind === 'benign' && !(typeof c.whyOk === 'string' && c.whyOk.length >= 10)) problems.push(`${where}: benign case needs whyOk`);
    if (c.kind === 'sibling' && !(typeof c.siblingDomain === 'string' && c.siblingDomain.length >= 3)) problems.push(`${where}: sibling case needs a siblingDomain that names the other domain`);
    if (c.kind !== 'seeded' && 'planted' in c) problems.push(`${where}: only seeded cases carry a planted description`);
    if (corpus.set && c.kind === 'seeded' && !HARD.includes(c.hard)) problems.push(`${where}: a seeded case of a set says what makes it hard (${HARD.join(' or ')})`);
    if ('hard' in c && (c.kind !== 'seeded' || !HARD.includes(c.hard))) problems.push(`${where}: hard is ${HARD.join(' or ')}, on seeded cases only`);
    // A giveaway in the diff defeats a blind test.
    if (/\b(BUG|VULN(?:ERABLE)?|FIXME|PLANTED|DEFECT|INTENTIONAL(?:LY)?)\b/.test(c.diff || '')) problems.push(`${where}: diff contains a giveaway word`);
  }
  if (counts.seeded < 8) problems.push(`needs at least 8 seeded cases, has ${counts.seeded}`);
  if (counts.benign < 6) problems.push(`needs at least 6 benign cases, has ${counts.benign}`);
  if (counts.sibling < 6) problems.push(`needs at least 6 sibling cases, has ${counts.sibling}`);
  for (const split of SPLITS) {
    for (const kind of KINDS) {
      if (!corpus.cases.some((c) => c.kind === kind && c.split === split)) problems.push(`no ${kind} case in split ${split}`);
    }
  }
  return problems;
}

/** Raw agent output (kind, summary, diff, planted, whyOk, siblingDomain) into a frozen corpus. */
function freeze(key, rawCases) {
  const [expert, set] = String(key).split('-');
  const cases = rawCases.map((raw) => {
    const c = {
      id: caseId(key, raw.kind, raw.summary),
      kind: raw.kind,
      summary: raw.summary,
      diff: normaliseHunks(raw.diff),
    };
    if (raw.kind === 'seeded') c.planted = raw.planted;
    if (raw.kind === 'seeded' && raw.hard !== undefined) c.hard = raw.hard;
    if (raw.kind === 'benign') c.whyOk = raw.whyOk;
    if (raw.kind === 'sibling') {
      c.siblingDomain = raw.siblingDomain;
      if (raw.whyOk) c.whyOk = raw.whyOk;
    }
    return c;
  });
  assignSplits(cases);
  cases.sort((a, b) => a.id.localeCompare(b.id));
  return set ? { expert, set, cases } : { expert, cases };
}

function corpusFile(key) {
  return path.join(CORPUS_DIR, `${key}.json`);
}

function load(key) {
  return JSON.parse(fs.readFileSync(corpusFile(key), 'utf8'));
}

/** The review corpora on disk, by key: `<expert>` or `<expert>-<set>`. `gen-*` is the generation corpus (gen.js). */
function listCorpora() {
  if (!fs.existsSync(CORPUS_DIR)) return [];
  return fs.readdirSync(CORPUS_DIR).filter((f) => /^[a-z]+(?:-[a-z]+)?\.json$/.test(f) && !f.startsWith('gen-')).map((f) => f.replace(/\.json$/, '')).sort();
}

function manifest() {
  const out = {};
  for (const expert of listCorpora()) out[expert] = sha256(fs.readFileSync(corpusFile(expert), 'utf8'));
  return out;
}

/** Cases the prompt may show a reviewer: no kind, no planted text, no split. */
function blindView(c) {
  return { id: c.id, summary: c.summary, diff: c.diff };
}

module.exports = { CORPUS_DIR, KINDS, SPLITS, HARD, keyOf, sha256, caseId, normaliseHunks, hunksConsistent, assignSplits, validate, freeze, corpusFile, load, listCorpora, manifest, blindView };
