'use strict';

// Measures the ultimate-workflow plugin payload: bytes and lines per area, the test count, the
// list of blocking checks and the list of state files, found from the code. Plain Node, not
// shipped (it lives under internal/). PLAN-simplify uses it in card `baseline` (before) and card
// `release` (after).
//
//   node internal/tools/measure.js [payload-dir] [--json]
//
// It skips .claude/worktrees/, .git and node_modules wherever it walks.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// .claude holds .claude/worktrees (other checkouts of this repository), which must never be counted.
const SKIP_DIRS = new Set(['.git', 'node_modules', '.claude']);
const AREAS = {
  hooks: ['hooks'],
  'experts (code and expert skills)': ['experts'],
  lib: ['lib'],
  phases: ['phases'],
  commands: ['commands'],
  agents: ['agents'],
  skills: ['skills'],
  memory: ['memory', 'memory.md'],
};
// What release-skills.yml leaves out of the plugin ZIP.
const ZIP_EXCLUDED = ['fixtures', 'architecture-evals'];

/** Every file under `dir`, as absolute paths, without the skipped folders. */
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...walk(path.join(dir, e.name)));
    } else out.push(path.join(dir, e.name));
  }
  return out;
}

const isTest = (f) => /\.test\.js$/.test(f);
const lines = (text) => (text.length === 0 ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0));

/** Bytes and lines per area, counting code and text together, tests included. */
function sizes(root) {
  const out = {};
  for (const [area, parts] of Object.entries(AREAS)) {
    let bytes = 0;
    let loc = 0;
    let files = 0;
    for (const p of parts) {
      for (const f of walk(path.join(root, p))) {
        const buf = fs.readFileSync(f);
        bytes += buf.length;
        loc += lines(buf.toString('utf8'));
        files += 1;
      }
    }
    out[area] = { files, bytes, lines: loc };
  }
  return out;
}

/** Non-test JavaScript under the payload, as { rel, text }. */
function sources(root) {
  return walk(root)
    .filter((f) => f.endsWith('.js') && !isTest(f))
    .filter((f) => !ZIP_EXCLUDED.includes(path.relative(root, f).split(path.sep)[0]))
    .map((f) => ({ rel: path.relative(root, f).split(path.sep).join('/'), text: fs.readFileSync(f, 'utf8') }));
}

// Blocking checks, each found by a mark that only the check itself carries. A pair is
// [id, file, pattern]: the check exists when the file holds the pattern.
const CHECKS = [
  ['B-G1', 'hooks/lib/gates.js', /Gate B-G1:/],
  ['B-G2', 'hooks/lib/gates.js', /Gate B-G2:/],
  ['G1', 'hooks/lib/gates.js', /Gate G1:/],
  ['G2', 'hooks/lib/gates.js', /Gate G2:/],
  ['G6 at edit', 'hooks/lib/gates.js', /no domain-experts decision/],
  ['G3', 'hooks/lib/gates.js', /Gate G3:/],
  ['G4/G5', 'hooks/lib/gates.js', /function roundCap/],
  ['G7', 'hooks/lib/gates.js', /Gate G7:/],
  ['G6 at commit', 'hooks/lib/gates.js', /re-checked against these changes/],
  ['memory at commit', 'hooks/lib/gates.js', /Memory check: this commit leaves memory broken/],
  ['detect-only stop', 'hooks/lib/dispatch.js', /gate_violation[\s\S]*stopBlock/],
['confirmation at commit', 'hooks/lib/gates.js', /Confirmation: /],
];

function blockingChecks(root) {
  const src = new Map(sources(root).map((s) => [s.rel, s.text]));
  return CHECKS.filter(([, file, re]) => re.test(src.get(file) || '')).map(([id]) => id);
}

// State files, by the name that code uses for them.
const STATE = [
  ['plan front matter', /confirmed_hash|plan_confirmed/],
  ['active-plan', /'active-plan'/],
  ['verify.json', /verify\.json/],
  ['baseline.json', /baseline\.json/],
  ['experts records and prepared.json', /prepared\.json/],
  ['waivers.json', /waivers\.json/],
  ['_recheck.json', /_recheck/],
  ['ledger.jsonl', /ledger\.jsonl/],
  ['run folder (run.json, journal, parked.md, notifications)', /run\.json/],
  ['review.diff', /review\.diff/],
  ['snapshots', /snapshots/],
  ['verify.lock', /verify\.lock/],
  ['verify.log', /verify\.log/],
  ['heartbeat.json', /heartbeat\.json/],
  ['memory-warnings.json', /memory-warnings\.json/],
  ['commit-check.json', /commit-check\.json/],
];

function stateFiles(root) {
  const all = sources(root).map((s) => s.text).join('\n');
  return STATE.filter(([, re]) => re.test(all)).map(([name]) => name);
}

/** Test titles in the test files the verify command reaches (hooks tests, evals tests, mirrors.test.js). */
function testFiles(repo) {
  const roots = [path.join(repo, '.cursor-plugin', 'ultimate-workflow', 'hooks'), path.join(repo, 'evals')];
  const files = roots.flatMap((r) => walk(r)).filter(isTest);
  const mirrors = path.join(repo, 'mirrors.test.js');
  if (fs.existsSync(mirrors)) files.push(mirrors);
  return files;
}
function testCount(repo) {
  let n = 0;
  for (const f of testFiles(repo)) n += (fs.readFileSync(f, 'utf8').match(/^\s*(?:test|it)(?:\.\w+)?\(/gm) || []).length;
  return n;
}

/** Bytes of the plugin ZIP's contents, raw and deflated per file (an upper bound on the real ZIP). */
function zipSize(root) {
  let raw = 0;
  let deflated = 0;
  for (const f of walk(root)) {
    if (ZIP_EXCLUDED.includes(path.relative(root, f).split(path.sep)[0])) continue;
    const buf = fs.readFileSync(f);
    raw += buf.length;
    deflated += zlib.deflateRawSync(buf).length + 100;
  }
  return { raw, deflated };
}

function measure(root, repo) {
  return { sizes: sizes(root), blockingChecks: blockingChecks(root), stateFiles: stateFiles(root), tests: repo ? testCount(repo) : null, zip: zipSize(root) };
}

function render(m) {
  const rows = Object.entries(m.sizes).map(([a, s]) => `| ${a} | ${s.files} | ${s.bytes} | ${s.lines} |`);
  return [
    '| Area | Files | Bytes | Lines |',
    '|---|---|---|---|',
    ...rows,
    '',
    `Tests (titles in the files the verify command reaches): ${m.tests}`,
    '',
    `Blocking checks (${m.blockingChecks.length}): ${m.blockingChecks.join(', ')}`,
    '',
    `State file kinds (${m.stateFiles.length}):`,
    ...m.stateFiles.map((s) => `- ${s}`),
    '',
    `Plugin ZIP contents: ${m.zip.raw} bytes raw, about ${m.zip.deflated} bytes deflated (ceiling 2000000)`,
    '',
  ].join('\n');
}

module.exports = { measure, render, sizes, blockingChecks, stateFiles, testCount, zipSize, walk, CHECKS, STATE };

if (require.main === module) {
  const repo = path.resolve(__dirname, '..', '..');
  const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(repo, '.cursor-plugin', 'ultimate-workflow');
  const m = measure(path.resolve(arg), repo);
  process.stdout.write(process.argv.includes('--json') ? `${JSON.stringify(m, null, 2)}\n` : render(m));
}
