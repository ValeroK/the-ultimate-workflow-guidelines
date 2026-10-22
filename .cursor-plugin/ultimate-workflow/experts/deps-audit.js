#!/usr/bin/env node
'use strict';

// Dependency audit for the security expert: lockfiles in, JSON out.
//
// Why a script: a model cannot know a package's latest version or its advisories,
// and guessing is worse than not answering. Workflow scripts have no network or
// shell, so the review command runs this from the shell and hands the JSON to the
// expert, which only triages it. Standard library only.
//
//   node deps-audit.js [--base-ref REF] [--changed-from-stdin] <lockfile>...
//
// Behind a proxy (this sandbox), run with NODE_USE_ENV_PROXY=1 on Node 22.21+.
//
// The rule that shapes every branch below: a package that could not be checked is
// reported as "not checked" with the reason, never as clean. An unreadable lockfile
// is reported as unsupported, never as "no dependencies".
//
// Tiers: 1 = pinned version with a known advisory; 2 = deprecated, yanked or
// inactive; 3 = merely behind the latest release, reported as counts only.
// Known limit: npm deprecation is read from the latest release, so a version
// deprecated on its own while the latest is not is missed.

const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const NPM = 'https://registry.npmjs.org';
const PYPI = 'https://pypi.org/pypi';
const NPM_BATCH = 200;
const CONCURRENCY = 8;

// ---- versions -------------------------------------------------------------

/** Paths from `git diff --name-status` output; both sides of a rename or copy. */
function parseNameStatus(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!line.includes('\t')) {
      out.push(line.trim());
      continue;
    }
    const parts = line.split('\t');
    const status = parts[0].trim();
    if (/^[RC]\d*$/.test(status)) out.push(...parts.slice(1, 3));
    else out.push(...parts.slice(1, 2));
  }
  return out.filter(Boolean);
}

function splitVersion(v) {
  const s = String(v).trim().replace(/^v/i, '').replace(/\+.*$/, '');
  const m = s.match(/^(\d+(?:\.\d+)*)(.*)$/);
  if (!m) return null;
  return {
    nums: m[1].split('.').map(Number),
    pre: /^[-._]?(a|b|c|rc|alpha|beta|pre|preview|dev)\d*/i.test(m[2]),
  };
}

function compareVersions(a, b) {
  const x = splitVersion(a);
  const y = splitVersion(b);
  if (!x || !y) return 0;
  const n = Math.max(x.nums.length, y.nums.length);
  for (let i = 0; i < n; i++) {
    const d = (x.nums[i] || 0) - (y.nums[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  if (x.pre && !y.pre) return -1;
  if (!x.pre && y.pre) return 1;
  return 0;
}

// true or false when the range is understood, null when it is not. Unknown syntax
// is never read as "does not apply".
function versionInRange(version, range) {
  const text = String(range || '').trim();
  if (text === '') return null;
  if (text === '*') return true;
  let any = false;
  for (const alt of text.split('||')) {
    let all = true;
    for (const token of alt.trim().split(/\s+/)) {
      const m = token.match(/^(>=|<=|>|<|=)?(\d\S*)$/);
      if (!m || !splitVersion(m[2])) return null;
      const c = compareVersions(version, m[2]);
      const ok = { '>=': c >= 0, '<=': c <= 0, '>': c > 0, '<': c < 0, '=': c === 0, undefined: c === 0 }[m[1]];
      if (!ok) all = false;
    }
    if (all) any = true;
  }
  return any;
}

// ---- parsers --------------------------------------------------------------

const stripBom = (s) => String(s).replace(/^﻿/, '');

function npmSource(resolved) {
  if (!resolved) return 'registry';
  if (/^git\+|^github:/.test(resolved)) return 'git';
  if (/^file:/.test(resolved)) return 'path';
  try {
    const host = new URL(resolved).hostname;
    return host === 'registry.npmjs.org' || host === 'registry.yarnpkg.com' ? 'registry' : 'private registry';
  } catch {
    return 'path';
  }
}

function parseNpmLock(text) {
  const body = stripBom(text);
  if (!body.trim()) return { packages: [], skipped: [], unsupported: 'empty lockfile' };
  let json;
  try {
    json = JSON.parse(body);
  } catch (err) {
    return { packages: [], skipped: [], unsupported: `cannot parse lockfile (${err.message})` };
  }
  if (!json || typeof json.packages !== 'object' || json.packages === null) {
    return { packages: [], skipped: [], unsupported: `npm lockfile version ${json && json.lockfileVersion} is not supported (no packages map)` };
  }
  const packages = [];
  const skipped = [];
  for (const [key, val] of Object.entries(json.packages)) {
    if (key === '' || !val || val.link) continue;
    const idx = key.lastIndexOf('node_modules/');
    if (idx === -1) continue; // a workspace member, not a dependency
    const name = key.slice(idx + 'node_modules/'.length);
    if (!val.version) {
      skipped.push({ ecosystem: 'npm', name, version: '', reason: 'no version in lockfile' });
      continue;
    }
    packages.push({ ecosystem: 'npm', name, version: val.version, source: npmSource(val.resolved), dev: Boolean(val.dev) });
  }
  return { packages, skipped };
}

function parseUvLock(text) {
  const body = stripBom(text).replace(/\r\n/g, '\n');
  const chunks = body.split(/^\[\[package\]\]\s*$/m).slice(1);
  if (chunks.length === 0) return { packages: [], skipped: [], unsupported: 'no packages found (empty or unrecognised uv.lock)' };
  const packages = [];
  const skipped = [];
  for (const chunk of chunks) {
    const name = (chunk.match(/^name\s*=\s*"([^"]+)"/m) || [])[1];
    const version = (chunk.match(/^version\s*=\s*"([^"]+)"/m) || [])[1];
    const source = (chunk.match(/^source\s*=\s*(\{.*\})\s*$/m) || [])[1] || '';
    if (!name) continue;
    if (/\b(virtual|editable)\s*=/.test(source)) continue; // the project's own members
    if (!version) {
      skipped.push({ ecosystem: 'pypi', name, version: '', reason: 'no version in lockfile' });
      continue;
    }
    let kind = 'registry';
    if (/\bgit\s*=/.test(source)) kind = 'git';
    else if (/\b(path|directory)\s*=/.test(source)) kind = 'path';
    else if (/\burl\s*=/.test(source)) kind = 'url';
    else if (/\bregistry\s*=/.test(source) && !/pypi\.org/.test(source)) kind = 'private registry';
    packages.push({ ecosystem: 'pypi', name, version, source: kind });
  }
  return { packages, skipped };
}

// Reads the `dependencies = [ ... ]` array of [project]. The closing bracket is found
// by scanning outside quotes, because requirement strings contain brackets
// ("agents-core[proc]") and the array may sit on one line or many.
function parsePyproject(text) {
  const src = stripBom(text);
  const start = src.match(/^\s*dependencies\s*=\s*\[/m);
  if (!start) return { names: [] };
  const names = [];
  let quoted = null;
  let item = '';
  for (let i = start.index + start[0].length; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === quoted) {
        const n = item.match(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/);
        if (n) names.push(n[1]);
        quoted = null;
        item = '';
      } else item += ch;
    } else if (ch === '"' || ch === "'") quoted = ch;
    else if (ch === '#') i = src.indexOf('\n', i) === -1 ? src.length : src.indexOf('\n', i);
    else if (ch === ']') break;
  }
  return { names };
}

// ---- network --------------------------------------------------------------

function httpsFetch(url, { method = 'GET', headers = {}, body, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const h = { accept: 'application/json', ...headers };
    if (body) {
      h['content-type'] = 'application/json';
      h['content-length'] = Buffer.byteLength(body);
    }
    const req = https.request(new URL(url), { method, headers: h, timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Runs fn over items with bounded concurrency; an item that throws is the caller's
// to report, so fn must not throw.
async function pool(items, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

// One GET or POST, reduced to either { json } or { reason }.
async function getJson(ctx, source, url, opts) {
  if (ctx.expired()) return { reason: `${source}: deadline exceeded` };
  let res;
  try {
    res = await ctx.fetch(url, opts);
  } catch (err) {
    return { reason: `${source}: network error (${err.message})` };
  }
  if (res.status === 404) return { reason: `${source}: package or version not found` };
  if (res.status !== 200) return { reason: `${source}: HTTP ${res.status}` };
  try {
    return { json: JSON.parse(res.body) };
  } catch {
    return { reason: `${source}: unreadable response` };
  }
}

const ghsaId = (adv) => {
  const m = String(adv.url || '').match(/advisories\/(GHSA-[\w-]+)/);
  return m ? m[1] : String(adv.id);
};

async function checkNpm(entries, ctx, out) {
  const byName = new Map();
  for (const e of entries) {
    if (!byName.has(e.name)) byName.set(e.name, new Set());
    byName.get(e.name).add(e.version);
  }
  const names = [...byName.keys()];
  const batches = [];
  for (let i = 0; i < names.length; i += NPM_BATCH) batches.push(names.slice(i, i + NPM_BATCH));

  for (const batch of batches) {
    const body = {};
    for (const n of batch) body[n] = [...byName.get(n)];
    const r = await getJson(ctx, 'npm', `${NPM}/-/npm/v1/security/advisories/bulk`, { method: 'POST', body: JSON.stringify(body) });
    for (const e of entries.filter((x) => batch.includes(x.name))) {
      if (r.reason) {
        out.status.set(e, { reason: r.reason });
        continue;
      }
      const advisories = [];
      for (const adv of r.json[e.name] || []) {
        const inRange = versionInRange(e.version, adv.vulnerable_versions);
        if (inRange === false) continue;
        advisories.push({
          id: ghsaId(adv),
          title: adv.title,
          severity: adv.severity,
          url: adv.url,
          vulnerableVersions: adv.vulnerable_versions,
          rangeChecked: inRange === true,
        });
      }
      out.status.set(e, { advisories });
    }
  }

  await pool(names, async (name) => {
    const slug = name.replace('/', '%2F');
    const r = await getJson(ctx, 'npm', `${NPM}/${slug}/latest`);
    out.latest.set(`npm:${name}`, r.json && r.json.version ? { version: r.json.version, deprecated: r.json.deprecated || '' } : null);
  });
}

async function checkPypi(entries, ctx, out) {
  const norm = (n) => n.toLowerCase().replace(/[-_.]+/g, '-');
  await pool(entries, async (e) => {
    const r = await getJson(ctx, 'pypi', `${PYPI}/${norm(e.name)}/${e.version}/json`);
    if (r.reason) {
      out.status.set(e, { reason: r.reason });
      return;
    }
    if (!Array.isArray(r.json.vulnerabilities)) {
      out.status.set(e, { reason: 'pypi: response has no vulnerabilities field' });
      return;
    }
    const seen = new Set();
    const advisories = [];
    for (const v of r.json.vulnerabilities) {
      if (v.withdrawn) continue;
      const ids = [v.id, ...(v.aliases || [])].filter(Boolean);
      if (ids.some((i) => seen.has(i))) continue;
      ids.forEach((i) => seen.add(i));
      advisories.push({
        id: v.id,
        aliases: v.aliases || [],
        title: v.summary,
        fixedIn: (v.fixed_in || []).join(', '),
        rangeChecked: true,
      });
    }
    const urls = r.json.urls || [];
    out.status.set(e, { advisories, yanked: urls.length > 0 && urls.every((u) => u.yanked === true) });
  });

  const names = [...new Set(entries.map((e) => e.name))];
  await pool(names, async (name) => {
    const r = await getJson(ctx, 'pypi', `${PYPI}/${norm(name)}/json`);
    const info = r.json && r.json.info;
    out.latest.set(
      `pypi:${name}`,
      info && info.version
        ? { version: info.version, inactive: (info.classifiers || []).some((c) => /Development Status :: 7 - Inactive/.test(c)) }
        : null
    );
  });
}

// ---- audit ----------------------------------------------------------------

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '');

function parseFile(file) {
  const base = norm(file.path).split('/').pop();
  if (base === 'package-lock.json' || base === 'npm-shrinkwrap.json') return parseNpmLock(file.text);
  if (base === 'uv.lock') return parseUvLock(file.text);
  if (base === 'pyproject.toml') return { packages: [], skipped: [], pyproject: parsePyproject(file.text) };
  return { packages: [], skipped: [], unsupported: `lockfile type not supported: ${base}` };
}

async function audit({ files, fetch = httpsFetch, changedPaths, deadlineMs = 120000, now = Date.now }) {
  const start = now();
  const ctx = { fetch, expired: () => now() - start > deadlineMs };
  const result = { tier1: [], tier2: [], tier3: { behind: 0, behindMajor: 0, latestUnknown: 0 }, notChecked: [], unsupported: [], unpinned: [] };
  const changed = changedPaths ? new Set(changedPaths.map(norm)) : null;

  const entries = [];
  for (const file of files) {
    const parsed = parseFile(file);
    if (parsed.unsupported) result.unsupported.push({ path: file.path, reason: parsed.unsupported });
    if (parsed.pyproject) result.unpinned.push(...parsed.pyproject.names);
    const baseKeys = file.baseText ? new Set(parseFile({ path: file.path, text: file.baseText }).packages.map((p) => `${p.ecosystem}:${p.name}@${p.version}`)) : null;
    const introducedBy = (p) => {
      if (changed && !changed.has(norm(file.path))) return 'preexisting';
      if (baseKeys) return baseKeys.has(`${p.ecosystem}:${p.name}@${p.version}`) ? 'preexisting' : 'diff';
      return changed ? 'diff' : 'unknown';
    };
    for (const p of parsed.packages) entries.push({ ...p, lockfile: norm(file.path), introducedBy: introducedBy(p) });
    for (const s of parsed.skipped || []) entries.push({ ...s, source: 'none', lockfile: norm(file.path), introducedBy: 'unknown', skippedReason: s.reason });
  }

  const out = { status: new Map(), latest: new Map() };
  const checkable = entries.filter((e) => e.source === 'registry');
  for (const e of entries) {
    if (e.skippedReason) out.status.set(e, { reason: e.skippedReason });
    else if (e.source !== 'registry') out.status.set(e, { reason: `non-registry source (${e.source})` });
  }
  await checkNpm(checkable.filter((e) => e.ecosystem === 'npm'), ctx, out);
  await checkPypi(checkable.filter((e) => e.ecosystem === 'pypi'), ctx, out);

  let checked = 0;
  for (const e of entries) {
    const s = out.status.get(e) || { reason: 'not queried' };
    const id = { ecosystem: e.ecosystem, name: e.name, version: e.version, lockfile: e.lockfile, introducedBy: e.introducedBy };
    if (e.dev !== undefined) id.dev = e.dev;
    if (s.reason) {
      result.notChecked.push({ ...id, reason: s.reason });
      continue;
    }
    checked++;
    if (s.advisories.length > 0) result.tier1.push({ ...id, advisories: s.advisories });
    if (s.yanked) result.tier2.push({ ...id, reason: 'yanked' });

    const latest = out.latest.get(`${e.ecosystem}:${e.name}`);
    if (!latest) {
      result.tier3.latestUnknown++;
      continue;
    }
    if (latest.deprecated) result.tier2.push({ ...id, reason: 'deprecated' });
    if (latest.inactive) result.tier2.push({ ...id, reason: 'inactive' });
    if (compareVersions(e.version, latest.version) < 0) {
      result.tier3.behind++;
      const cur = splitVersion(e.version);
      const lat = splitVersion(latest.version);
      if (cur && lat && lat.nums[0] > cur.nums[0]) result.tier3.behindMajor++;
    }
  }
  // A package whose vulnerability check failed still gets a latest-version note when
  // the lookup worked; it is only counted as unknown when it did not.

  result.summary = {
    packages: entries.length,
    checked,
    notChecked: result.notChecked.length,
    unsupported: result.unsupported.length,
    tier1: result.tier1.length,
    tier2: result.tier2.length,
    tier3: result.tier3.behind,
  };
  return result;
}

// ---- command line ---------------------------------------------------------

function fail(message) {
  process.stderr.write(`deps-audit.js: ${message}\n`);
  process.exit(2);
}

async function main(argv) {
  let baseRef = '';
  let fromStdin = false;
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-ref') baseRef = argv[++i] || fail('--base-ref needs a ref');
    else if (a === '--changed-from-stdin') fromStdin = true;
    else if (a.startsWith('--')) fail(`unknown argument: ${a}`);
    else paths.push(a);
  }
  if (paths.length === 0) fail('give at least one lockfile path (package-lock.json, uv.lock, pyproject.toml)');

  const files = paths.map((p) => {
    let text;
    try {
      text = fs.readFileSync(p, 'utf8');
    } catch (err) {
      return fail(`cannot read ${p}: ${err.message}`);
    }
    let baseText;
    if (baseRef) {
      const rel = norm(path.relative(process.cwd(), path.resolve(p)));
      const r = spawnSync('git', ['show', `${baseRef}:./${rel}`], { encoding: 'utf8' });
      if (r.status === 0) baseText = r.stdout;
    }
    return { path: norm(p), text, baseText };
  });

  const changedPaths = fromStdin ? parseNameStatus(fs.readFileSync(0, 'utf8')) : undefined;
  const result = await audit({ files, changedPaths });
  process.stdout.write(JSON.stringify(result) + '\n');
}

module.exports = { audit, parseNpmLock, parseUvLock, parsePyproject, compareVersions, versionInRange, httpsFetch };

if (require.main === module) main(process.argv.slice(2));
