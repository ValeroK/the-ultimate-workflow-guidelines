'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
// Every temporary directory this file creates is removed when it exits (node --test runs each
// file in its own process); without this, each run left hundreds behind in the system temp folder.
{
  const made = [];
  const mkdtemp = fs.mkdtempSync;
  fs.mkdtempSync = (...args) => {
    const dir = mkdtemp(...args);
    made.push(dir);
    return dir;
  };
  process.on('exit', () => {
    for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
  });
}
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'deps-audit.js');
const audit = require(SCRIPT);

// ---- builders -------------------------------------------------------------

const npmLock = (pkgs, version = 3) =>
  JSON.stringify({ name: 'app', lockfileVersion: version, packages: { '': { name: 'app' }, ...pkgs } });

const uvLock = (blocks) =>
  'version = 1\nrequires-python = ">=3.12"\n\n' +
  blocks.map(({ name, version, source }) => `[[package]]\nname = "${name}"\nversion = "${version}"\nsource = ${source}\n`).join('\n');

const REG = '{ registry = "https://pypi.org/simple" }';

// A fake of the three registry surfaces the script uses. Special values in the maps
// model failures: { __status: 429 }, { __raw: '<html>' }, { __throw: 'timeout' }.
function registry({ pypiVersion = {}, pypiLatest = {}, npmBulk = {}, npmLatest = {}, bulkStatus = 200, bulkRaw } = {}) {
  const calls = [];
  const respond = (v) => {
    if (v === undefined) return { status: 404, body: '{"message":"not found"}' };
    if (v.__throw) throw new Error(v.__throw);
    if (v.__status) return { status: v.__status, body: '' };
    if (v.__raw !== undefined) return { status: 200, body: v.__raw };
    return { status: 200, body: JSON.stringify(v) };
  };
  const fetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    let m;
    if ((m = url.match(/^https:\/\/pypi\.org\/pypi\/([^/]+)\/([^/]+)\/json$/))) return respond(pypiVersion[`${m[1]}@${m[2]}`]);
    if ((m = url.match(/^https:\/\/pypi\.org\/pypi\/([^/]+)\/json$/))) return respond(pypiLatest[m[1]]);
    if (url === 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk') {
      if (bulkStatus !== 200) return { status: bulkStatus, body: '' };
      if (bulkRaw !== undefined) return { status: 200, body: bulkRaw };
      const asked = JSON.parse(opts.body);
      const out = {};
      for (const name of Object.keys(asked)) if (npmBulk[name]) out[name] = npmBulk[name];
      return { status: 200, body: JSON.stringify(out) };
    }
    if ((m = url.match(/^https:\/\/registry\.npmjs\.org\/(.+)\/latest$/))) return respond(npmLatest[decodeURIComponent(m[1])]);
    throw new Error(`unexpected URL in test: ${url}`);
  };
  return { fetch, calls };
}

const pyDoc = (over = {}) => ({ vulnerabilities: [], urls: [{ yanked: false }], info: { classifiers: [] }, ...over });
const GHSA = (id, range = '<4.17.21') => ({ id: 1, url: `https://github.com/advisories/${id}`, title: 't', severity: 'high', vulnerable_versions: range });

const run = (files, reg, extra = {}) => audit.audit({ files, fetch: reg.fetch, ...extra });

// ---- parsers --------------------------------------------------------------

test('npm lockfile v3: nested paths, scoped names, links, git and versionless entries', () => {
  const lock = npmLock({
    'node_modules/a': { version: '1.0.0' },
    'node_modules/a/node_modules/b': { version: '2.0.0' },
    'node_modules/@types/node': { version: '20.1.0' },
    'packages/web': { name: 'web', version: '0.1.0' },
    'node_modules/web': { resolved: 'packages/web', link: true },
    'node_modules/g': { version: '1.0.0', resolved: 'git+ssh://git@github.com/x/g.git#abc' },
    'node_modules/nov': {},
  });
  const r = audit.parseNpmLock(lock);
  assert.deepStrictEqual(
    r.packages.map((p) => `${p.name}@${p.version}`).sort(),
    ['@types/node@20.1.0', 'a@1.0.0', 'b@2.0.0', 'g@1.0.0']
  );
  assert.strictEqual(r.packages.find((p) => p.name === 'g').source, 'git');
  assert.ok(!r.packages.some((p) => p.name === 'web'), 'workspace members and links are not registry packages');
});

test('npm lockfile v2 uses the packages map; v1 is reported unsupported, never as zero dependencies', () => {
  assert.strictEqual(audit.parseNpmLock(npmLock({ 'node_modules/a': { version: '1.0.0' } }, 2)).packages.length, 1);
  const v1 = audit.parseNpmLock(JSON.stringify({ lockfileVersion: 1, dependencies: { a: { version: '1.0.0' } } }));
  assert.strictEqual(v1.packages.length, 0);
  assert.match(v1.unsupported, /lockfile version 1/);
});

test('malformed or empty lockfiles are reported, not thrown and not read as empty', () => {
  assert.match(audit.parseNpmLock('{ not json').unsupported, /cannot parse/i);
  assert.match(audit.parseNpmLock('').unsupported, /empty|cannot parse/i);
  assert.match(audit.parseUvLock('').unsupported, /no packages|empty/i);
});

test('a BOM or CRLF line endings do not change what is parsed', () => {
  const lock = '﻿' + npmLock({ 'node_modules/a': { version: '1.0.0' } });
  assert.strictEqual(audit.parseNpmLock(lock).packages.length, 1);
  const uv = uvLock([{ name: 'requests', version: '2.31.0', source: REG }]).replace(/\n/g, '\r\n');
  assert.deepStrictEqual(audit.parseUvLock(uv).packages.map((p) => `${p.name}@${p.version}`), ['requests@2.31.0']);
});

test('uv.lock: registry packages are checked; workspace members and other sources are not queried as PyPI packages', () => {
  const lock = uvLock([
    { name: 'requests', version: '2.31.0', source: REG },
    { name: 'the-ceo', version: '0.1.0', source: '{ virtual = "." }' },
    { name: 'agents-core', version: '0.1.0', source: '{ editable = "packages/agents-core" }' },
    { name: 'fromgit', version: '1.0.0', source: '{ git = "https://github.com/x/y?rev=abc#abc" }' },
    { name: 'frompath', version: '1.0.0', source: '{ path = "../x" }' },
  ]);
  const r = audit.parseUvLock(lock);
  const by = Object.fromEntries(r.packages.map((p) => [p.name, p.source]));
  assert.strictEqual(by.requests, 'registry');
  assert.ok(!('the-ceo' in by) && !('agents-core' in by), 'workspace members are skipped');
  assert.strictEqual(by.fromgit, 'git');
  assert.strictEqual(by.frompath, 'path');
});

test('pyproject.toml alone yields unpinned names, never a vulnerability claim', () => {
  const toml = '[project]\nname = "x"\ndependencies = [\n    "alembic>=1.16,<2",\n    "numpy>=1.26",  # note\n    "agents-core[proc]",\n]\n';
  const r = audit.parsePyproject(toml);
  assert.deepStrictEqual(r.names.sort(), ['agents-core', 'alembic', 'numpy']);
});

test('version comparison is numeric and treats pre-releases as older', () => {
  const c = audit.compareVersions;
  assert.ok(c('1.10.0', '1.9.0') > 0);
  assert.ok(c('1.0.0-rc.1', '1.0.0') < 0);
  assert.ok(c('2.0.0b1', '2.0.0') < 0);
  assert.strictEqual(c('1.0', '1.0.0'), 0);
  assert.ok(c('0.9.9', '1.0.0') < 0);
});

test('range matching: comparators, alternatives, and an unparseable range is not silently trusted', () => {
  const inR = audit.versionInRange;
  assert.strictEqual(inR('4.17.15', '<4.17.21'), true);
  assert.strictEqual(inR('4.17.21', '<4.17.21'), false);
  assert.strictEqual(inR('4.17.15', '>=3.7.0 <4.17.19'), true);
  assert.strictEqual(inR('4.17.19', '>=3.7.0 <4.17.19'), false);
  assert.strictEqual(inR('1.0.0', '<1.0.0 || >=2.0.0'), false);
  assert.strictEqual(inR('2.5.0', '<1.0.0 || >=2.0.0'), true);
  assert.strictEqual(inR('1.0.0', '~~weird~~'), null, 'unknown syntax is reported as unknown');
});

// ---- audit: vulnerabilities ----------------------------------------------

test('npm: a known-vulnerable pinned version is tier 1 with its advisory id and severity', async () => {
  const reg = registry({ npmBulk: { lodash: [GHSA('GHSA-35jh-r3h4-6jhm')] }, npmLatest: { lodash: { version: '4.17.21' } } });
  const r = await run([{ path: 'package-lock.json', text: npmLock({ 'node_modules/lodash': { version: '4.17.15' } }) }], reg);
  assert.strictEqual(r.tier1.length, 1);
  assert.strictEqual(r.tier1[0].name, 'lodash');
  assert.strictEqual(r.tier1[0].advisories[0].id, 'GHSA-35jh-r3h4-6jhm');
  assert.strictEqual(r.tier1[0].advisories[0].severity, 'high');
  assert.strictEqual(r.summary.tier1, 1);
});

test('npm: an advisory whose range excludes the installed version is dropped; an unparseable range is kept and marked', async () => {
  const reg = registry({
    npmBulk: { a: [GHSA('GHSA-aaaa', '>=2.0.0')], b: [GHSA('GHSA-bbbb', '~~weird~~')] },
    npmLatest: { a: { version: '1.0.0' }, b: { version: '1.0.0' } },
  });
  const lock = npmLock({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b': { version: '1.0.0' } });
  const r = await run([{ path: 'package-lock.json', text: lock }], reg);
  assert.deepStrictEqual(r.tier1.map((t) => t.name), ['b']);
  assert.strictEqual(r.tier1[0].advisories[0].rangeChecked, false);
});

test('PyPI: aliases deduplicate, withdrawn entries are skipped, and an empty list is clean', async () => {
  const reg = registry({
    pypiVersion: {
      'django@3.0': pyDoc({
        vulnerabilities: [
          { id: 'PYSEC-1', aliases: ['CVE-1', 'GHSA-1'], summary: 'x', fixed_in: ['3.0.12'], withdrawn: null },
          { id: 'GHSA-1', aliases: ['CVE-1'], summary: 'same issue', fixed_in: ['3.0.12'], withdrawn: null },
          { id: 'PYSEC-2', aliases: [], summary: 'gone', fixed_in: [], withdrawn: '2021-01-01' },
        ],
      }),
      'clean@1.0': pyDoc(),
    },
    pypiLatest: { django: { info: { version: '5.0', classifiers: [] } }, clean: { info: { version: '1.0', classifiers: [] } } },
  });
  const lock = uvLock([{ name: 'django', version: '3.0', source: REG }, { name: 'clean', version: '1.0', source: REG }]);
  const r = await run([{ path: 'uv.lock', text: lock }], reg);
  assert.strictEqual(r.tier1.length, 1);
  assert.strictEqual(r.tier1[0].advisories.length, 1, 'alias duplicates collapse, withdrawn is skipped');
  assert.strictEqual(r.tier1[0].advisories[0].fixedIn, '3.0.12');
  assert.strictEqual(r.summary.notChecked, 0);
});

test('the same package at two versions where only the older is vulnerable reports the older only', async () => {
  const reg = registry({
    pypiVersion: { 'x@1.0': pyDoc({ vulnerabilities: [{ id: 'PYSEC-9', aliases: [], summary: 's', fixed_in: ['1.1'], withdrawn: null }] }), 'x@2.0': pyDoc() },
    pypiLatest: { x: { info: { version: '2.0', classifiers: [] } } },
  });
  const lock = uvLock([{ name: 'x', version: '1.0', source: REG }, { name: 'x', version: '2.0', source: REG }]);
  const r = await run([{ path: 'uv.lock', text: lock }], reg);
  assert.deepStrictEqual(r.tier1.map((t) => `${t.name}@${t.version}`), ['x@1.0']);
});

// ---- audit: failure honesty ----------------------------------------------

const ONE_PY = (name = 'p') => [{ path: 'uv.lock', text: uvLock([{ name, version: '1.0', source: REG }]) }];

test('every registry failure is "not checked" with a specific reason, never a clean result', async () => {
  const cases = [
    [{ __status: 429 }, /^pypi: HTTP 429$/],
    [{ __status: 503 }, /^pypi: HTTP 503$/],
    [{ __raw: '<html>maintenance</html>' }, /^pypi: unreadable response$/],
    [{ __raw: '{"vulnerabilities": [' }, /^pypi: unreadable response$/],
    [{ __throw: 'timeout' }, /^pypi: network error \(timeout\)$/],
    [undefined, /^pypi: package or version not found$/],
    [{ urls: [], info: { classifiers: [] } }, /^pypi: response has no vulnerabilities field$/],
  ];
  for (const [doc, reason] of cases) {
    const reg = registry({ pypiVersion: { 'p@1.0': doc }, pypiLatest: { p: { info: { version: '1.0', classifiers: [] } } } });
    const r = await run(ONE_PY(), reg);
    assert.strictEqual(r.tier1.length, 0);
    assert.strictEqual(r.notChecked.length, 1, JSON.stringify(doc));
    assert.match(r.notChecked[0].reason, reason);
    assert.strictEqual(r.summary.checked, 0);
    assert.strictEqual(r.summary.notChecked, 1);
  }
});

test('one failing package does not hide the others: partial results carry per-package status and counts', async () => {
  const reg = registry({
    pypiVersion: { 'good@1.0': pyDoc({ vulnerabilities: [{ id: 'PYSEC-5', aliases: [], summary: 's', fixed_in: [], withdrawn: null }] }), 'bad@1.0': { __status: 429 } },
    pypiLatest: { good: { info: { version: '1.0', classifiers: [] } }, bad: { info: { version: '1.0', classifiers: [] } } },
  });
  const lock = uvLock([{ name: 'good', version: '1.0', source: REG }, { name: 'bad', version: '1.0', source: REG }]);
  const r = await run([{ path: 'uv.lock', text: lock }], reg);
  assert.deepStrictEqual(r.tier1.map((t) => t.name), ['good']);
  assert.deepStrictEqual(r.notChecked.map((n) => n.name), ['bad']);
  assert.deepStrictEqual([r.summary.checked, r.summary.notChecked], [1, 1]);
});

test('an npm bulk failure marks every npm package not checked and leaves PyPI alone', async () => {
  const reg = registry({
    bulkStatus: 500,
    pypiVersion: { 'p@1.0': pyDoc() },
    pypiLatest: { p: { info: { version: '1.0', classifiers: [] } } },
    npmLatest: { a: { version: '1.0.0' } },
  });
  const files = [
    { path: 'package-lock.json', text: npmLock({ 'node_modules/a': { version: '1.0.0' } }) },
    ...ONE_PY(),
  ];
  const r = await run(files, reg);
  assert.deepStrictEqual(r.notChecked.map((n) => [n.name, n.reason]), [['a', 'npm: HTTP 500']]);
  assert.strictEqual(r.summary.checked, 1);
});

test('non-registry sources are reported as not checked with the source kind', async () => {
  const reg = registry();
  const lock = uvLock([{ name: 'g', version: '1.0', source: '{ git = "https://github.com/x/y#abc" }' }]);
  const r = await run([{ path: 'uv.lock', text: lock }], reg);
  assert.strictEqual(r.notChecked[0].reason, 'non-registry source (git)');
  assert.strictEqual(reg.calls.length, 0, 'nothing is sent to a registry for a non-registry package');
});

test('an unsupported lockfile is listed as unsupported and counted, so it cannot pass as "no dependencies"', async () => {
  const r = await run([{ path: 'package-lock.json', text: JSON.stringify({ lockfileVersion: 1, dependencies: {} }) }], registry());
  assert.strictEqual(r.unsupported.length, 1);
  assert.match(r.unsupported[0].reason, /lockfile version 1/);
  assert.strictEqual(r.summary.unsupported, 1);
});

test('pyproject.toml with no lockfile is listed as unpinned and sends nothing to a registry', async () => {
  const reg = registry();
  const r = await run([{ path: 'pyproject.toml', text: '[project]\nname="x"\ndependencies = ["numpy>=1.26"]\n' }], reg);
  assert.deepStrictEqual(r.unpinned, ['numpy']);
  assert.strictEqual(r.tier1.length, 0);
  assert.strictEqual(reg.calls.length, 0);
});

// ---- audit: tiers ---------------------------------------------------------

test('tier 2: a deprecated npm package, a yanked PyPI release and an inactive PyPI project', async () => {
  const reg = registry({
    npmBulk: {},
    npmLatest: { request: { version: '2.88.2', deprecated: 'request has been deprecated' } },
    pypiVersion: {
      'yankedpkg@1.0': pyDoc({ urls: [{ yanked: true }, { yanked: true }] }),
      'deadpkg@1.0': pyDoc(),
    },
    pypiLatest: {
      yankedpkg: { info: { version: '1.0', classifiers: [] } },
      deadpkg: { info: { version: '1.0', classifiers: ['Development Status :: 7 - Inactive'] } },
    },
  });
  const files = [
    { path: 'package-lock.json', text: npmLock({ 'node_modules/request': { version: '2.88.2' } }) },
    { path: 'uv.lock', text: uvLock([{ name: 'yankedpkg', version: '1.0', source: REG }, { name: 'deadpkg', version: '1.0', source: REG }]) },
  ];
  const r = await run(files, reg);
  assert.deepStrictEqual(r.tier2.map((t) => [t.name, t.reason]).sort(), [['deadpkg', 'inactive'], ['request', 'deprecated'], ['yankedpkg', 'yanked']]);
});

test('tier 3 is one summary: how many are behind and how many by a major version, never per-package findings', async () => {
  const reg = registry({
    npmBulk: {},
    npmLatest: { a: { version: '2.0.0' }, b: { version: '1.5.0' }, c: { version: '1.0.0' } },
  });
  const lock = npmLock({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b': { version: '1.0.0' }, 'node_modules/c': { version: '1.0.0' } });
  const r = await run([{ path: 'package-lock.json', text: lock }], reg);
  assert.deepStrictEqual(r.tier3, { behind: 2, behindMajor: 1, latestUnknown: 0 });
  assert.strictEqual(r.tier1.length + r.tier2.length, 0);
});

test('when the latest version cannot be read, tier 3 says so instead of assuming up to date', async () => {
  const reg = registry({ npmBulk: {}, npmLatest: { a: { __throw: 'timeout' } } });
  const r = await run([{ path: 'package-lock.json', text: npmLock({ 'node_modules/a': { version: '1.0.0' } }) }], reg);
  assert.strictEqual(r.tier3.latestUnknown, 1);
});

// ---- attribution ----------------------------------------------------------

test('introducedBy: diff for what the base lockfile lacked, preexisting for what it had or when the lockfile did not change', async () => {
  const reg = registry({
    npmBulk: { old: [GHSA('GHSA-old')], fresh: [GHSA('GHSA-new')] },
    npmLatest: { old: { version: '9.0.0' }, fresh: { version: '9.0.0' } },
  });
  const head = npmLock({ 'node_modules/old': { version: '1.0.0' }, 'node_modules/fresh': { version: '1.0.0' } });
  const base = npmLock({ 'node_modules/old': { version: '1.0.0' } });

  const changed = await run([{ path: 'package-lock.json', text: head, baseText: base }], reg, { changedPaths: ['package-lock.json'] });
  const by = Object.fromEntries(changed.tier1.map((t) => [t.name, t.introducedBy]));
  assert.deepStrictEqual(by, { old: 'preexisting', fresh: 'diff' });

  const untouched = await run([{ path: 'package-lock.json', text: head, baseText: base }], reg, { changedPaths: ['README.md'] });
  assert.ok(untouched.tier1.every((t) => t.introducedBy === 'preexisting'));

  const brandNew = await run([{ path: 'package-lock.json', text: head }], reg, { changedPaths: ['package-lock.json'] });
  assert.ok(brandNew.tier1.every((t) => t.introducedBy === 'diff'), 'a new lockfile introduces everything in it');
});

test('a bumped version counts as introduced even though the package name was already present', async () => {
  const reg = registry({ npmBulk: { x: [GHSA('GHSA-x')] }, npmLatest: { x: { version: '9.0.0' } } });
  const r = await run(
    [{ path: 'package-lock.json', text: npmLock({ 'node_modules/x': { version: '1.0.0' } }), baseText: npmLock({ 'node_modules/x': { version: '0.9.0' } }) }],
    reg,
    { changedPaths: ['package-lock.json'] }
  );
  assert.strictEqual(r.tier1[0].introducedBy, 'diff');
});

// ---- scale and limits -----------------------------------------------------

test('a large lockfile is queried in bounded batches, never one giant request', async () => {
  const pkgs = {};
  for (let i = 0; i < 2500; i++) pkgs[`node_modules/p${i}`] = { version: '1.0.0' };
  const latest = {};
  for (let i = 0; i < 2500; i++) latest[`p${i}`] = { version: '1.0.0' };
  const reg = registry({ npmBulk: {}, npmLatest: latest });
  const r = await run([{ path: 'package-lock.json', text: npmLock(pkgs) }], reg);
  const bulks = reg.calls.filter((c) => c.url.endsWith('/bulk'));
  assert.ok(bulks.length >= 13, `expected batching, got ${bulks.length} requests`);
  assert.ok(bulks.every((c) => Object.keys(JSON.parse(c.body)).length <= 200));
  assert.strictEqual(r.summary.packages, 2500);
});

test('past the deadline the remaining packages are "not checked: deadline exceeded", not dropped', async () => {
  // Three bulk batches (200 + 200 + 50) so the fake clock runs out between them.
  const pkgs = {};
  for (let i = 0; i < 450; i++) pkgs[`node_modules/p${i}`] = { version: '1.0.0' };
  const latest = {};
  for (let i = 0; i < 450; i++) latest[`p${i}`] = { version: '1.0.0' };
  const reg = registry({ npmBulk: {}, npmLatest: latest });
  let t = 0;
  const r = await run([{ path: 'package-lock.json', text: npmLock(pkgs) }], reg, {
    deadlineMs: 1000,
    now: () => (t += 400),
  });
  assert.ok(r.notChecked.length > 0);
  assert.ok(r.notChecked.every((n) => /deadline exceeded/.test(n.reason)));
  assert.strictEqual(r.summary.checked + r.summary.notChecked, r.summary.packages);
});

// ---- command line ---------------------------------------------------------

function cli(args, cwd) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('CLI: an unsupported lockfile prints JSON that says so, and exits 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-audit-'));
  fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({ lockfileVersion: 1, dependencies: {} }));
  const r = cli([path.join(dir, 'package-lock.json')], dir);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.summary.unsupported, 1);
});

test('CLI: a missing file or no arguments is exit code 2 with the reason on stderr and nothing on stdout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-audit-'));
  for (const args of [[path.join(dir, 'nope.lock')], []]) {
    const r = cli(args, dir);
    assert.strictEqual(r.status, 2, JSON.stringify(args));
    assert.strictEqual(r.stdout, '');
    assert.ok(r.stderr.length > 0);
  }
});

test('npm entries carry whether they are dev-only, so a build-tool advisory can be told from a shipped one', async () => {
  const reg = registry({
    npmBulk: { tool: [GHSA('GHSA-tool')], lib: [GHSA('GHSA-lib')] },
    npmLatest: { tool: { version: '9.0.0' }, lib: { version: '9.0.0' } },
  });
  const lock = npmLock({ 'node_modules/tool': { version: '1.0.0', dev: true }, 'node_modules/lib': { version: '1.0.0' } });
  const r = await run([{ path: 'package-lock.json', text: lock }], reg);
  const by = Object.fromEntries(r.tier1.map((t) => [t.name, t.dev]));
  assert.deepStrictEqual(by, { tool: true, lib: false });
});

test('PyPI entries do not claim a dev flag the lockfile does not give them', async () => {
  const reg = registry({
    pypiVersion: { 'p@1.0': pyDoc({ vulnerabilities: [{ id: 'PYSEC-1', aliases: [], summary: 's', fixed_in: [], withdrawn: null }] }) },
    pypiLatest: { p: { info: { version: '1.0', classifiers: [] } } },
  });
  const r = await run(ONE_PY(), reg);
  assert.ok(!('dev' in r.tier1[0]));
});
