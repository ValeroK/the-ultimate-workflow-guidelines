'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXPERTS_DIR = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts');
const ROUTE = path.join(EXPERTS_DIR, 'route.js');
const REVIEW = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'workflows', 'review.js');
const route = require(ROUTE);

const SECURITY = ['security'];

test('security-relevant paths route to security', () => {
  const positives = [
    'uv.lock',
    'pyproject.toml',
    'package.json',
    'package-lock.json',
    'dashboard/package-lock.json',
    'requirements-dev.txt',
    'go.sum',
    '.mcp.json',
    'Dockerfile',
    'Dockerfile.prod',
    'services/api/Dockerfile',
    'build/app.dockerfile',
    '.github/workflows/ci.yml',
    '.github/workflows/release.yaml',
    'infra/main.tf',
    'src/auth/login.js',
    'src/lib/jwt.py',
    'server/middleware/session.ts',
    'app/handlers/upload.go',
    'config/secrets.yml',
    '.env',
    '.env.production',
    'deploy.sh',
    'scripts/setup.ps1',
    'certs/server.pem',
    '.cursor-plugin/ultimate-workflow/agents/uw-reviewer.md',
    '.claude/skills/x/SKILL.md',
    'AGENTS.md',
    'CLAUDE.md',
    '.cursor/rules/style.mdc',
    '.cursor-plugin/ultimate-workflow/hooks/gate.js',
  ];
  for (const p of positives) assert.deepStrictEqual(route.routeExperts([p]), SECURITY, p);
});

test('near misses and unrelated paths route to nothing', () => {
  const negatives = [
    'README.md',
    'author.js',
    'authority/list.md',
    'Dockerfile.md',
    'Dockerfile.txt',
    'docs/auth.md',
    'docs/guide.md',
    'src/util/strings.js',
    'src/components/Button.tsx',
    'package.json.bak.md',
    'notes/session-notes.txt',
  ];
  for (const p of negatives) assert.deepStrictEqual(route.routeExperts([p]), [], p);
});

test('test-only files do not route on name tokens, but the same file outside tests does', () => {
  assert.deepStrictEqual(route.routeExperts(['src/auth/login.test.js']), []);
  assert.deepStrictEqual(route.routeExperts(['tests/auth/test_login.py']), []);
  assert.deepStrictEqual(route.routeExperts(['src/auth/login.js']), SECURITY);
});

test('Windows separators, CRLF, trailing whitespace and case do not change the answer', () => {
  assert.deepStrictEqual(route.routeExperts(['.github\\workflows\\ci.yml']), SECURITY);
  assert.deepStrictEqual(route.routeExperts(['SRC\\Auth\\Login.JS\r']), SECURITY);
  assert.deepStrictEqual(route.routeExperts(['DOCKERFILE']), SECURITY);
  assert.deepStrictEqual(route.routeExperts(['  uv.lock  ']), SECURITY);
});

test('name-status input: renames count both sides, deletes count, blanks and noise are ignored', () => {
  const text = [
    'M\tREADME.md',
    'R100\tsrc/auth/x.js\tsrc/util/x.js',
    '',
    'D\tDockerfile',
    'A\tsrc/util/y.js',
  ].join('\n');
  const paths = route.parseNameStatus(text);
  assert.ok(paths.includes('src/auth/x.js'), 'old side of a rename');
  assert.ok(paths.includes('src/util/x.js'), 'new side of a rename');
  assert.ok(paths.includes('Dockerfile'), 'deleted file');
  assert.deepStrictEqual(route.routeExperts(['src/util/x.js', 'src/util/y.js']), []);
  assert.deepStrictEqual(route.routeExperts(paths), SECURITY);
  assert.deepStrictEqual(route.parseNameStatus('plain/path.js\nother.js\r\n'), ['plain/path.js', 'other.js']);
});

test('a path matching several rules, or an expert listed twice, yields each expert once in registry order', () => {
  const rules = {
    devops: [(p) => /dockerfile/.test(p)],
    security: [(p) => /dockerfile/.test(p), (p) => /auth/.test(p)],
  };
  assert.deepStrictEqual(route.routeExperts(['Dockerfile', 'src/auth/a.js', 'src/auth/b.js'], rules), ['devops', 'security']);
  assert.deepStrictEqual(route.routeExperts(['src/auth/a.js'], rules), ['security']);
});

test('50,000 paths route in well under two seconds', () => {
  const paths = [];
  for (let i = 0; i < 50000; i++) paths.push(`src/module${i % 500}/file${i}.js`);
  paths.push('uv.lock');
  const t = Date.now();
  assert.deepStrictEqual(route.routeExperts(paths), SECURITY);
  assert.ok(Date.now() - t < 2000, `took ${Date.now() - t}ms`);
});

const PLAN = (extra = '') => `---\nphase: plan\nplan_confirmed: true\ntests_confirmed: false\n${extra}---\n\n# PLAN: x\n`;

test('readExperts distinguishes a missing key from an empty list and parses inline lists', () => {
  assert.deepStrictEqual(route.readExperts(PLAN()), { present: false, experts: [] });
  assert.deepStrictEqual(route.readExperts(PLAN('experts: []\n')), { present: true, experts: [] });
  assert.deepStrictEqual(route.readExperts(PLAN('experts: [security]\n')), { present: true, experts: ['security'] });
  assert.deepStrictEqual(route.readExperts(PLAN('experts: security\n')), { present: true, experts: ['security'] });
  assert.deepStrictEqual(route.readExperts(PLAN('experts: [security, security]\n')).experts, ['security']);
});

test('readExperts rejects unsupported shapes and unknown names, naming the unknown one', () => {
  assert.match(route.readExperts(PLAN('experts:\n  - security\n')).error, /unsupported/i);
  const r = route.readExperts(PLAN('experts: [security, frobnicator]\n'));
  assert.match(r.error, /frobnicator/);
  assert.ok(!/security/.test(r.error.replace(/known:.*$/i, '')), 'only the unknown name is blamed');
});

test('readExperts handles a BOM and CRLF frontmatter', () => {
  const text = '﻿' + PLAN('experts: [security]\n').replace(/\n/g, '\r\n');
  assert.deepStrictEqual(route.readExperts(text), { present: true, experts: ['security'] });
});

test('writeExperts inserts the key, changes nothing else, and is idempotent', () => {
  const before = PLAN();
  const w1 = route.writeExperts(before, ['security']);
  assert.strictEqual(w1.changed, true);
  assert.strictEqual(w1.text.replace('experts: [security]\n', ''), before, 'only the experts line was added');
  const w2 = route.writeExperts(w1.text, ['security']);
  assert.strictEqual(w2.changed, false);
  assert.strictEqual(w2.text, w1.text);
  assert.strictEqual((w2.text.match(/^experts:/gm) || []).length, 1, 'no duplicate key');
});

test('writeExperts preserves a BOM and CRLF line endings', () => {
  const before = '﻿' + PLAN().replace(/\n/g, '\r\n');
  const w = route.writeExperts(before, ['security']);
  assert.ok(w.text.startsWith('﻿'));
  assert.ok(w.text.includes('experts: [security]\r\n'), 'new line uses the file\'s own line ending');
  assert.ok(!/[^\r]\n/.test(w.text.replace(/^﻿/, '')), 'no bare LF introduced');
});

test('writeExperts never overwrites a human decision unless forced, and reports the difference', () => {
  const human = PLAN('experts: []\n');
  const w = route.writeExperts(human, ['security']);
  assert.strictEqual(w.changed, false);
  assert.strictEqual(w.text, human);
  assert.strictEqual(w.differs, true);
  assert.deepStrictEqual(w.routed, ['security']);
  const forced = route.writeExperts(human, ['security'], { force: true });
  assert.strictEqual(forced.changed, true);
  assert.match(forced.text, /^experts: \[security\]$/m);
  assert.strictEqual((forced.text.match(/^experts:/gm) || []).length, 1);
});

test('writeExperts with nothing routed writes an explicit empty list, so "none" is a recorded decision', () => {
  const w = route.writeExperts(PLAN(), []);
  assert.strictEqual(w.changed, true);
  assert.match(w.text, /^experts: \[\]$/m);
});

test('writeExperts refuses a file with no frontmatter and a name it does not know', () => {
  assert.throws(() => route.writeExperts('# no frontmatter\n', ['security']), /frontmatter/i);
  assert.throws(() => route.writeExperts(PLAN(), ['frobnicator']), /frobnicator/);
});

function cli(args, input) {
  return spawnSync(process.execPath, [ROUTE, ...args], { input, encoding: 'utf8' });
}

test('CLI: routes paths from stdin and prints JSON', () => {
  const r = cli(['--name-status'], 'M\tuv.lock\nM\tREADME.md\n');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout).experts, SECURITY);
});

test('CLI: --write-plan then --read-plan round-trips through the real file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-route-'));
  const plan = path.join(dir, 'PLAN-a.md');
  fs.writeFileSync(plan, PLAN());
  const w = cli(['--write-plan', plan], 'src/auth/login.js\n');
  assert.strictEqual(w.status, 0, w.stderr);
  assert.strictEqual(JSON.parse(w.stdout).changed, true);
  const r = cli(['--read-plan', plan]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout).experts, SECURITY);
});

test('CLI: the plan that is named is the plan that is read, whatever the modification times', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-route-'));
  const older = path.join(dir, 'PLAN-old.md');
  const newer = path.join(dir, 'PLAN-new.md');
  fs.writeFileSync(older, PLAN('experts: [security]\n'));
  fs.writeFileSync(newer, PLAN('experts: []\n'));
  const past = new Date(Date.now() - 3600 * 1000);
  fs.utimesSync(older, past, past);
  assert.deepStrictEqual(JSON.parse(cli(['--read-plan', older]).stdout).experts, SECURITY);
  assert.deepStrictEqual(JSON.parse(cli(['--read-plan', newer]).stdout).experts, []);
});

test('CLI: a bad plan is exit code 2 with the problem on stderr and nothing on stdout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-route-'));
  const plan = path.join(dir, 'PLAN-bad.md');
  fs.writeFileSync(plan, PLAN('experts: [frobnicator]\n'));
  const r = cli(['--read-plan', plan]);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /frobnicator/);
  assert.strictEqual(r.stdout, '');
  const missing = cli(['--read-plan', path.join(dir, 'nope.md')]);
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stderr, /nope\.md/);
});

test('route.js and review.js agree on which experts exist', () => {
  const src = fs.readFileSync(REVIEW, 'utf8');
  const literal = src.match(/const EXPERTS = \{([^}]*)\}/);
  assert.ok(literal, 'EXPERTS registry literal not found in review.js');
  const inReview = [...literal[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(Object.keys(route.RULES).sort(), inReview);
});

test('CLI: --plan unions the plan with the diff, never drops a planned expert, and reports what the diff added', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-route-'));
  const mk = (name, extra) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, PLAN(extra));
    return f;
  };
  const out = (r) => {
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };

  const planned = out(cli(['--plan', mk('a.md', 'experts: [security]\n')], 'M\tREADME.md\n'));
  assert.deepStrictEqual(planned.experts, SECURITY, 'planned expert kept although the diff alone would not route it');
  assert.deepStrictEqual(planned.added, []);

  const none = out(cli(['--plan', mk('b.md', 'experts: []\n')], 'M\tuv.lock\n'));
  assert.deepStrictEqual(none.experts, SECURITY, 'the diff adds an expert the plan said none for');
  assert.deepStrictEqual(none.planned, []);
  assert.deepStrictEqual(none.added, SECURITY, 'and says so');

  const absent = out(cli(['--plan', mk('c.md', '')], 'M\tuv.lock\n'));
  assert.deepStrictEqual(absent.experts, SECURITY);
  assert.deepStrictEqual(absent.added, SECURITY);

  const neither = out(cli(['--plan', mk('d.md', 'experts: []\n')], 'M\tREADME.md\n'));
  assert.deepStrictEqual(neither.experts, []);
});

test('CLI: --plan with a missing or invalid plan is exit code 2, not a silent diff-only answer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-route-'));
  const bad = path.join(dir, 'bad.md');
  fs.writeFileSync(bad, PLAN('experts: [frobnicator]\n'));
  const cases = [
    [bad, /frobnicator/],
    [path.join(dir, 'missing.md'), /missing\.md/],
  ];
  for (const [f, why] of cases) {
    const r = cli(['--plan', f], 'M\tuv.lock\n');
    assert.strictEqual(r.status, 2, f);
    assert.match(r.stderr, why, 'fails for the plan problem, not for an unknown flag');
    assert.doesNotMatch(r.stderr, /unknown argument/);
    assert.strictEqual(r.stdout, '');
  }
});
