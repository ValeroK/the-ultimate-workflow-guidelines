'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { verifyVendor } = require('./lib/vendor-check.js');

const ROOT = path.join(__dirname, '..', '..');
const VENDOR = path.join(ROOT, 'vendor', 'anthropic-security-review');
const PAYLOAD = path.join(ROOT, '.cursor-plugin', 'ultimate-workflow');
const EXPERT = path.join(PAYLOAD, 'experts', 'security');

// The pristine upstream copy is an audit input, not shipped content. Three
// records must agree about every byte: the file, its PROVENANCE.md line, and the
// pinned EXPECTED-HASHES.json. Changing the file alone fails two of the three,
// so drift is loud. A deliberate re-pin edits all three in one reviewed commit;
// an offline test cannot prove which side is "upstream", and does not pretend to.

function copyVendor() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-vendor-'));
  fs.cpSync(path.join(ROOT, 'vendor'), path.join(dir, 'vendor'), { recursive: true });
  return path.join(dir, 'vendor');
}

test('the real vendored copy verifies clean', () => {
  const problems = verifyVendor(path.join(ROOT, 'vendor'));
  assert.deepStrictEqual(problems, []);
});

test('PROVENANCE.md records source, commit, license and hash for every vendored file', () => {
  const text = fs.readFileSync(path.join(VENDOR, 'PROVENANCE.md'), 'utf8');
  assert.match(text, /https:\/\/github\.com\/anthropics\/claude-code-security-review/);
  assert.match(text, /\b[0-9a-f]{40}\b/, 'a full 40-hex commit SHA, not a branch name');
  assert.match(text, /MIT/);
  for (const name of ['security-review.md', 'LICENSE']) {
    const bytes = fs.readFileSync(path.join(VENDOR, name));
    const sha = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.ok(text.includes(sha), `${name} sha256 ${sha} missing from PROVENANCE.md`);
  }
});

test('a one-byte change to a vendored file is detected', () => {
  const vendor = copyVendor();
  const file = path.join(vendor, 'anthropic-security-review', 'security-review.md');
  const bytes = fs.readFileSync(file);
  bytes[0] = bytes[0] ^ 0x01;
  fs.writeFileSync(file, bytes);
  const problems = verifyVendor(vendor);
  assert.ok(problems.length >= 1, 'tampered file must produce a problem');
  assert.ok(problems.some((p) => /security-review\.md/.test(p)), problems.join('\n'));
});

test('changing the file AND its PROVENANCE.md hash together is still detected', () => {
  const vendor = copyVendor();
  const dir = path.join(vendor, 'anthropic-security-review');
  const file = path.join(dir, 'security-review.md');
  const oldHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  fs.appendFileSync(file, '\nextra line\n');
  const newHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const prov = path.join(dir, 'PROVENANCE.md');
  fs.writeFileSync(prov, fs.readFileSync(prov, 'utf8').split(oldHash).join(newHash));
  const problems = verifyVendor(vendor);
  assert.ok(
    problems.some((p) => /EXPECTED-HASHES/.test(p)),
    `pinned hash must catch a coordinated edit; got: ${problems.join(' | ') || 'no problems'}`
  );
});

test('a vendored file missing from PROVENANCE.md is a problem', () => {
  const vendor = copyVendor();
  const dir = path.join(vendor, 'anthropic-security-review');
  fs.writeFileSync(path.join(dir, 'stowaway.md'), 'not vetted\n');
  const problems = verifyVendor(vendor);
  assert.ok(problems.some((p) => /stowaway\.md/.test(p)), problems.join('\n'));
});

test('vendored files are byte-stable: no CR bytes, and .gitattributes forbids translation', () => {
  for (const name of ['security-review.md', 'LICENSE', 'PROVENANCE.md']) {
    const bytes = fs.readFileSync(path.join(VENDOR, name));
    assert.ok(!bytes.includes(0x0d), `${name} contains a CR byte`);
  }
  const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  assert.match(attrs, /^vendor\/\*\*\s+-text\b/m, 'vendor/** must be marked -text so autocrlf cannot change hashes');
});

test('the pristine copy is outside the shipped plugin payload', () => {
  const rel = path.relative(PAYLOAD, VENDOR);
  assert.ok(rel.startsWith('..'), `vendor must not live under the payload (relative path: ${rel})`);
});

test('NOTICE.md ships with the expert and carries the upstream MIT text and copyright', () => {
  const notice = fs.readFileSync(path.join(EXPERT, 'NOTICE.md'), 'utf8');
  assert.match(notice, /Copyright \(c\) 2025 Anthropic/);
  assert.match(notice, /Permission is hereby granted, free of charge/);
  assert.match(notice, /0c6a49f1fa56a1d472575da86a94dbc1edb78eda/, 'names the upstream commit it derives from');
});

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    out.push(p);
    if (entry.isDirectory()) walk(p, out);
  }
  return out;
}

test('shipped experts/ holds no tests and no fixtures', () => {
  const all = walk(path.join(PAYLOAD, 'experts'));
  const bad = all.filter((p) => /\.test\.js$/.test(p) || path.basename(p) === 'fixtures');
  assert.deepStrictEqual(bad, [], 'tests and fixtures belong under repo-root evals/, which the plugin ZIP never contains');
});

test('the release workflow still excludes top-level fixtures and architecture-evals', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'release-skills.yml'), 'utf8');
  assert.match(wf, /-x 'fixtures\/\*'/);
  assert.match(wf, /-x 'architecture-evals\/\*'/);
});

test('shipped experts/ stays under a byte budget so the ZIP ceiling is not eaten', () => {
  const BUDGET = 150 * 1024;
  const files = walk(path.join(PAYLOAD, 'experts')).filter((p) => fs.statSync(p).isFile());
  const total = files.reduce((n, p) => n + fs.statSync(p).size, 0);
  assert.ok(total <= BUDGET, `experts/ is ${total} bytes, budget ${BUDGET}`);
});
