'use strict';

// Which tests a change needs (decided 2026-10-31, 4.1.1).
//
// While the work is in progress only the tests related to the changed files run; the full suite
// runs at fixed points (the end of a build, before a commit) and whenever the narrow run cannot be
// trusted. Pure: the caller gathers the changed files, the test files and the plan's settings, so
// every rule here is testable row by row. Any doubt resolves to the full suite, which is what a
// project that configures nothing has always had.

const { isDocPath, isTestPath } = require('./gates.js');

/** More changed files than this and the change is treated as broad: full suite. */
const MAX_RELATED_FILES = 20;

// Files that can change the result of tests that import nothing from them: manifests and
// lockfiles, test runner and compiler configuration, test setup, CI. A change to one runs all.
const ALWAYS_FULL = [
  /(^|\/)package\.json$/,
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|deno\.lock)$/,
  /(^|\/)(pyproject\.toml|poetry\.lock|uv\.lock|Pipfile(\.lock)?|requirements[^/]*\.txt|setup\.py|setup\.cfg|tox\.ini|pytest\.ini|conftest\.py)$/,
  /(^|\/)(go\.mod|go\.sum|Cargo\.toml|Cargo\.lock|Gemfile(\.lock)?|composer\.(json|lock)|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?)$/,
  /\.(csproj|fsproj|sln)$/,
  /(^|\/)tsconfig[^/]*\.json$/,
  /(^|\/)(vitest|vite|jest|babel|playwright|karma|mocha|webpack|rollup|esbuild)\.config\.[a-z]+$/,
  /(^|\/)(\.babelrc|\.mocharc[^/]*|jest\.setup\.[a-z]+|vitest\.setup\.[a-z]+|setupTests\.[a-z]+)$/,
  /(^|\/)\.github\//,
  /(^|\/)(\.gitlab-ci\.yml|azure-pipelines\.yml|Jenkinsfile|\.circleci\/)/,
];

/** `full_suite_paths` from the plan: comma-separated globs (`*` within a segment, `**` across). */
function parsePaths(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((glob) => {
      let re = '';
      for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === '*' && glob[i + 1] === '*') {
          re += '.*';
          i++;
          if (glob[i + 1] === '/') i++;
        } else if (c === '*') re += '[^/]*';
        else if (c === '?') re += '[^/]';
        else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      }
      return new RegExp(`^${re}$`);
    });
}

/** Test code: the gates' rule plus pytest's `test_*.py`, which carries no `.test.` and may sit outside tests/. */
const isTest = (p) => isTestPath(p) || /(^|\/)test_[^/]+\.py$/.test(p);

const posix = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '');
/** One argument for a shell command line, double-quoted (works on sh and cmd.exe). */
const quote = (p) => `"${posix(p).replace(/"/g, '\\"')}"`;

/**
 * The language of a file, by its extension, and the language a test command runs, by its runner (5.1.0).
 * A related test must be in a language the command can run. In a repository with a Python backend and a
 * TypeScript UI, a UI test was found as a user of a changed Python file and went to pytest, which collected
 * nothing and exited 4. A file or a runner that is not listed has no language, and then nothing is left out.
 */
const LANGUAGES = [
  ['py', /\.py$/i],
  ['js', /\.(c|m)?(j|t)sx?$/i],
  ['go', /\.go$/i],
  ['rs', /\.rs$/i],
  ['rb', /\.rb$/i],
  ['jvm', /\.(java|kt|kts|scala)$/i],
  ['cs', /\.cs$/i],
  ['php', /\.php$/i],
];
const RUNNERS = [
  ['py', /\b(pytest|unittest|tox|nox)\b/],
  ['go', /\bgo\s+test\b/],
  ['rs', /\bcargo\b/],
  ['rb', /\b(rspec|rake|minitest)\b/],
  ['jvm', /\b(gradle|gradlew|mvn|mvnw)\b/],
  ['cs', /\bdotnet\b/],
  ['php', /\b(phpunit|pest)\b/],
  ['js', /\b(vitest|jest|mocha|ava|playwright|npm|npx|pnpm|yarn|bun|deno|node)\b/],
];
const languageOf = (file) => (LANGUAGES.find(([, re]) => re.test(file)) || [''])[0];
const runnerLanguage = (command) => (RUNNERS.find(([, re]) => re.test(command)) || [''])[0];

/**
 * @param {object} input
 * @param {string[]} input.changed     files changed since the last commit, untracked included
 * @param {string[]} [input.relatedTests] test files that use a changed file (found by the caller)
 * @param {object} input.data          the plan's front matter
 * @returns {{mode: 'none'|'related'|'full', reason: string, command: string, files: string[], tests: string[]}}
 */
function select({ changed = [], relatedTests = [], data = {} } = {}) {
  const full = data.test_command ? String(data.test_command).trim() : '';
  const all = [...new Set(changed.map(posix))];
  const files = all.filter((f) => !isDocPath(f));
  const asFull = (reason) => ({ mode: 'full', reason, command: full, files, tests: [] });

  // Before the documentation filter: `requirements.txt` ends in a documentation extension.
  const config = all.find((f) => ALWAYS_FULL.some((re) => re.test(f)));
  if (files.length === 0 && !config) return { mode: 'none', reason: 'only documentation changed, or nothing did', command: '', files, tests: [] };

  const template = data.test_related_command ? String(data.test_related_command).trim() : '';
  if (!template) return asFull('no test_related_command is set in the plan');
  if (!/\{files\}|\{tests\}/.test(template)) return asFull('test_related_command has neither {files} nor {tests}, so it cannot be narrowed');

  if (files.length > MAX_RELATED_FILES) return asFull(`${files.length} files changed (more than ${MAX_RELATED_FILES})`);
  if (config) return asFull(`${config} changed, which can affect every test`);
  const extra = parsePaths(data.full_suite_paths);
  const listed = files.find((f) => extra.some((re) => re.test(f)));
  if (listed) return asFull(`${listed} matches full_suite_paths`);

  // Known runner: only tests in its language, changed ones included. Runner not known: a changed test stays,
  // and a related test must be in the language of a changed source file.
  const runs = runnerLanguage(template);
  const sourceLanguages = new Set(files.filter((f) => !isTest(f)).map(languageOf).filter(Boolean));
  const runnable = (f) => !runs || !languageOf(f) || languageOf(f) === runs;
  const sameLanguage = (f) => Boolean(runs) || !languageOf(f) || sourceLanguages.size === 0 || sourceLanguages.has(languageOf(f));
  const tests = [...new Set([...files.filter(isTest).filter(runnable), ...relatedTests.map(posix).filter(runnable).filter(sameLanguage)])].sort();
  if (/\{tests\}/.test(template) && tests.length === 0) return asFull('no test file uses the changed files');

  const command = template.replace(/\{files\}/g, files.map(quote).join(' ')).replace(/\{tests\}/g, tests.map(quote).join(' '));
  const what = /\{tests\}/.test(template) ? `${tests.length} test file${tests.length === 1 ? '' : 's'}` : `${files.length} changed file${files.length === 1 ? '' : 's'}`;
  return { mode: 'related', reason: `${what}, no config or setup changed`, command, files, tests };
}

module.exports = { select, parsePaths, isTest, ALWAYS_FULL, MAX_RELATED_FILES };
