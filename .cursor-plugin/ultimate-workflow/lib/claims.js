'use strict';

// The plan's own size claims, measured before the tests are confirmed (4.8.0, PLAN-run-fixes.md card
// dry-run). A plan states a claim as a list line
//
//     - measure: bytes <glob> <= <number>
//
// and `experts.js claims` reports the size now, the room left and the cards that write under the glob.
// Code cannot know how many bytes a card will add; it shows the room, so the user sees "4,700 bytes
// left and six cards write there" before confirming. A line this file cannot read is reported as not
// understood and never as passing.
//
// Pure reading and judging, plus one walk of the project folder. No shell expands a glob, no link or
// junction is followed, and nothing outside the root is read. Nothing here loads experts/ (a load
// cycle through experts.js): the caller passes what it knows about the cards.

const fs = require('node:fs');
const path = require('node:path');

// The reading of a `measure:` line is one piece of code (the shared section `measure-parser` of lib/phase-shared.js), because
// the tests phase script has to read the same lines and cannot import this file. It is evaluated here.
const SHARED = fs.readFileSync(path.join(__dirname, 'phase-shared.js'), 'utf8').split(/\r?\n/);
const at = SHARED.findIndex((l) => l.trim() === '// @@section measure-parser');
const end = SHARED.findIndex((l, i) => i > at && l.trim() === '// @@end measure-parser');
const { MEASURE, CLAIM, GLOB, globProblem, parseMeasures } = new Function(`${SHARED.slice(at + 1, end).join('\n')}\nreturn { MEASURE, CLAIM, GLOB, globProblem, parseMeasures }`)();
const SKIP = new Set(['.git', 'node_modules']);


/** `*` stays inside one path segment; `**` + `/` matches any number of folders; a trailing `/**` is everything under the folder. */
function globMatcher(glob) {
  const g = glob.replace(/^\.\//, '');
  if (g.endsWith('/**')) {
    const dir = g.slice(0, -3);
    return (file) => file.startsWith(`${dir}/`);
  }
  const segment = (s) => s.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
  const re = new RegExp(`^${g.split('**/').map(segment).join('(?:.*/)?')}$`);
  return (file) => re.test(file);
}

/** The files under `root` as `{ path, bytes }`, paths with forward slashes. Links and junctions are not followed. */
function walk(root) {
  const out = [];
  const visit = (dir, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const at = rel ? `${rel}/${e.name}` : e.name;
      let st;
      try {
        st = fs.lstatSync(full);
      } catch {
        continue;
      }
      // A symbolic link or a Windows junction can point outside the root: it is not read.
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) visit(full, at);
      else if (st.isFile()) out.push({ path: at, bytes: st.size });
    }
  };
  visit(root, '');
  return out;
}

/** One understood claim against the files: the size now, the room left, and whether it holds. */
function judge(measure, files) {
  const matches = globMatcher(measure.glob);
  const matched = files.filter((f) => matches(f.path));
  const size = matched.reduce((n, f) => n + f.bytes, 0);
  return { size, room: measure.limit - size, passing: size <= measure.limit, files: matched.length, matched };
}

/**
 * Every claim of the plan, measured under `root`. `cards` are `{ name, paths }`; `covers(paths, file)`
 * says whether a card's paths cover a file (the caller's own rule, so the two cannot drift). A card is
 * listed for a claim when one of its paths is under the glob or it covers a file the glob matched.
 */
function measureAll(planText, root, cards = [], covers = () => false) {
  const measures = parseMeasures(planText);
  const files = measures.some((m) => m.understood) ? walk(root) : [];
  return measures.map((m) => {
    if (!m.understood) return { line: m.line, understood: false, passing: false, why: m.why };
    const { matched, ...judged } = judge(m, files);
    // A glob that matches nothing measures nothing: a typo in the path must not read as a claim that holds.
    if (matched.length === 0) return { line: m.line, understood: false, passing: false, glob: m.glob, why: 'the glob matches no file under the project root' };
    const matches = globMatcher(m.glob);
    const under = cards.filter((c) => (c.paths || []).some((p) => matches(String(p).replace(/^\.\//, ''))) || matched.some((f) => covers(c.paths || [], f.path))).map((c) => c.name);
    return { line: m.line, understood: true, glob: m.glob, limit: m.limit, ...judged, cards: under };
  });
}

module.exports = { parseMeasures, globProblem, globMatcher, walk, judge, measureAll };
