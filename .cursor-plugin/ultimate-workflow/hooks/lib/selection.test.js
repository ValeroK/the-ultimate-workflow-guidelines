'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { select, parsePaths, MAX_RELATED_FILES } = require('./selection.js');

const VITEST = { test_command: 'npm test', test_related_command: 'npx vitest related --run {files}' };
const NODE = { test_command: 'node --test', test_related_command: 'node --test {tests}' };

test('T1 no test_related_command: the full suite, and the reason says so', () => {
  const r = select({ changed: ['src/a.js'], data: { test_command: 'npm test' } });
  assert.equal(r.mode, 'full');
  assert.equal(r.command, 'npm test');
  assert.match(r.reason, /no test_related_command/);
});

test('T2 a related command with neither placeholder cannot be narrowed: full', () => {
  const r = select({ changed: ['src/a.js'], data: { test_command: 'npm test', test_related_command: 'npx vitest related --run' } });
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /neither \{files\} nor \{tests\}/);
});

test('T3 a manifest, lockfile, compiler or runner config, test setup or CI change runs the full suite', () => {
  for (const f of ['package.json', 'pnpm-lock.yaml', 'packages/web/package.json', 'tsconfig.json', 'tsconfig.build.json', 'vitest.config.ts',
    'jest.config.js', 'conftest.py', 'tests/conftest.py', 'pyproject.toml', 'requirements-dev.txt', 'go.mod', 'Cargo.lock',
    '.github/workflows/ci.yml', 'src/setupTests.ts']) {
    const r = select({ changed: ['src/a.js', f], data: VITEST });
    assert.equal(r.mode, 'full', f);
    assert.match(r.reason, new RegExp(f.replace(/[.]/g, '\\.')), f);
  }
});

test('T4 full_suite_paths: a change under a listed path runs the full suite', () => {
  const data = { ...VITEST, full_suite_paths: 'src/db/**, migrations/*.sql' };
  assert.equal(select({ changed: ['src/db/store.ts'], data }).mode, 'full');
  assert.equal(select({ changed: ['src/db/deep/x.ts'], data }).mode, 'full');
  assert.equal(select({ changed: ['migrations/001.sql'], data }).mode, 'full');
  assert.equal(select({ changed: ['src/ui/a.ts'], data }).mode, 'related');
  assert.deepEqual(parsePaths('').length, 0);
});

test('T5 more than 20 changed files is a broad change: full; 20 is still related', () => {
  const files = (n) => Array.from({ length: n }, (_, i) => `src/f${i}.ts`);
  assert.equal(MAX_RELATED_FILES, 20);
  assert.equal(select({ changed: files(20), data: VITEST }).mode, 'related');
  const r = select({ changed: files(21), data: VITEST });
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /21 files changed/);
});

test('T6 {tests} with no test using the changed files: full, never an empty run', () => {
  const r = select({ changed: ['src/a.js'], relatedTests: [], data: NODE });
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /no test file uses/);
});

test('T7 {tests} gets the changed tests and the tests that use a changed file, nothing else', () => {
  const r = select({ changed: ['src/a.js', 'test/b.test.js', 'tests/test_c.py'], relatedTests: ['test/a.test.js'], data: NODE });
  assert.equal(r.mode, 'related');
  assert.deepEqual(r.tests, ['test/a.test.js', 'test/b.test.js', 'tests/test_c.py']);
  assert.equal(r.command, 'node --test "test/a.test.js" "test/b.test.js" "tests/test_c.py"');
});

test('{files} gets the changed files, docs left out', () => {
  const r = select({ changed: ['src/a.ts', 'README.md'], data: VITEST });
  assert.equal(r.mode, 'related');
  assert.equal(r.command, 'npx vitest related --run "src/a.ts"');
});

test('T8 only documentation changed, or nothing: nothing to run', () => {
  assert.equal(select({ changed: ['README.md', 'docs/x.md'], data: VITEST }).mode, 'none');
  assert.equal(select({ changed: [], data: VITEST }).mode, 'none');
});

test('T9 paths come out forward-slashed and quoted once, spaces kept', () => {
  const r = select({ changed: ['src\\my dir\\a.ts', './src/b.ts'], data: VITEST });
  assert.equal(r.command, 'npx vitest related --run "src/my dir/a.ts" "src/b.ts"');
});
