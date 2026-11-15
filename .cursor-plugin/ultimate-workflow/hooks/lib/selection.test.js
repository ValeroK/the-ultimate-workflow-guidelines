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
  const r = select({ changed: ['src/a.js', 'test/b.test.js', 'test/c.test.mjs'], relatedTests: ['test/a.test.js'], data: NODE });
  assert.equal(r.mode, 'related');
  assert.deepEqual(r.tests, ['test/a.test.js', 'test/b.test.js', 'test/c.test.mjs']);
  assert.equal(r.command, 'node --test "test/a.test.js" "test/b.test.js" "test/c.test.mjs"');
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

// ---- 5.1.0: a related test must be in a language the test command runs ----
// In a repository with a Python backend and a TypeScript UI, a UI test was found as a "user" of a changed
// Python file and went to pytest, which collected nothing and exited 4. Every card then ran its tests by hand.

const PYTEST = { test_command: 'uv run pytest', test_related_command: 'uv run --frozen pytest {tests}' };

test('pytest gets Python tests only: a TypeScript test that uses a changed file is left out', () => {
  const r = select({ changed: ['scripts/harness.py', 'tests/ingest/test_harness.py'], relatedTests: ['tests/test_integrity.py', 'ui/tests/selection.test.tsx'], data: PYTEST });
  assert.equal(r.mode, 'related');
  assert.deepStrictEqual(r.tests, ['tests/ingest/test_harness.py', 'tests/test_integrity.py']);
  assert.doesNotMatch(r.command, /tsx/);
});

test('a JavaScript runner gets no Python test, also one that changed', () => {
  const data = { test_command: 'npm test', test_related_command: 'npx vitest run {tests}' };
  const r = select({ changed: ['ui/src/a.ts', 'tests/test_api.py'], relatedTests: ['ui/tests/a.test.tsx', 'tests/test_other.py'], data });
  assert.deepStrictEqual(r.tests, ['ui/tests/a.test.tsx']);
  assert.deepStrictEqual(select({ changed: ['src/a.js'], relatedTests: ['test/a.test.js', 'test/b.test.mjs'], data: NODE }).tests, ['test/a.test.js', 'test/b.test.mjs']);
});

test('go test and cargo get their own languages', () => {
  const go = select({ changed: ['pkg/a.go'], relatedTests: ['pkg/a_test.go', 'web/a.test.ts'], data: { test_command: 'go test ./...', test_related_command: 'go test {tests}' } });
  assert.deepStrictEqual(go.tests, ['pkg/a_test.go']);
  const rust = select({ changed: ['src/a.rs'], relatedTests: ['tests/a_test.rs', 'tests/test_a.py'], data: { test_command: 'cargo test', test_related_command: 'cargo test {tests}' } });
  assert.deepStrictEqual(rust.tests, ['tests/a_test.rs']);
});

test('a runner that is not known: a related test must be in the language of a changed file; a changed test always stays', () => {
  const data = { test_command: 'make test', test_related_command: './run-tests.sh {tests}' };
  const r = select({ changed: ['scripts/harness.py', 'ui/tests/changed.test.tsx'], relatedTests: ['tests/test_integrity.py', 'ui/tests/selection.test.tsx'], data });
  assert.deepStrictEqual(r.tests, ['tests/test_integrity.py', 'ui/tests/changed.test.tsx']);
});

test('when the language rule leaves no test, the full suite runs, never an empty run', () => {
  const r = select({ changed: ['scripts/harness.py'], relatedTests: ['ui/tests/selection.test.tsx'], data: PYTEST });
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /no test file/);
});
