#!/usr/bin/env node
'use strict';

// Runs the tests a change needs (4.1.1).
//
//   node hooks/verify.js           the tests related to the uncommitted changes, or the full suite
//                                  when the narrow run cannot be trusted (hooks/lib/selection.js)
//   node hooks/verify.js --full    the full suite (test_command), recorded for the commit check
//   --plan <file>                  read this plan's front matter instead of the newest PLAN-*.md
//
// The model passes no file list: the changed files come from git, so a run always covers the
// tree as it is. It prints which mode ran and why, and exits with the tests' exit code. A full run,
// passing or failing, is written to .ultimate-workflow/verify.json with the fingerprint of the
// uncommitted changes; the commit check in hooks/lib/gates.js allows a commit only when a passing
// full run exists at the current fingerprint.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const stateLib = require('./lib/state.js');
const { select, isTest, ALWAYS_FULL } = require('./lib/selection.js');
const { isDocPath } = require('./lib/gates.js');
const experts = require('../experts/experts.js');

const RECORD = path.join('.ultimate-workflow', 'verify.json');

function readRecord(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, RECORD), 'utf8'));
  } catch {
    return null;
  }
}

/** Write the outcome of a full run, against the changes as they are after it ran. */
function recordFull(cwd, { passed, command }) {
  const file = path.join(cwd, RECORD);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const rec = { mode: 'full', passed: passed === true, fingerprint: experts.fingerprint(cwd), command, at: new Date().toISOString() };
  fs.writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`);
  return rec;
}

/** What the commit check needs: the current fingerprint and the last full run, or why it does not apply. */
function fullEvidence(cwd) {
  try {
    const changes = experts.workingChanges(cwd);
    if (changes.files.length === 0) return { skip: 'nothing to commit' };
    // `requirements.txt` ends in a documentation extension and still changes what the tests run against.
    if (changes.files.every((f) => isDocPath(f) && !ALWAYS_FULL.some((re) => re.test(f)))) return { skip: 'only documentation changed' };
    return { hash: experts.fingerprint(cwd), record: readRecord(cwd) };
  } catch {
    return { skip: 'the working tree could not be inspected' };
  }
}

/** Test files in the repository that import or use one of the changed source files. */
function relatedTests(cwd, changes) {
  const changedSource = changes.files.filter((f) => !isTest(f) && !isDocPath(f) && fs.existsSync(path.join(cwd, f)));
  if (changedSource.length === 0) return [];
  let tracked = [];
  try {
    tracked = spawnSync('git', ['ls-files'], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stdout.split(/\r?\n/);
  } catch {}
  const candidates = [...new Set([...tracked, ...changes.untracked])].filter((f) => f && isTest(f) && !changes.files.includes(f));
  return experts.dependentsOf(cwd, changedSource, candidates, new Map(), new Map()).map((d) => d.file);
}

function parseArgs(argv) {
  const out = { full: false, plan: '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--full') out.full = true;
    else if (argv[i] === '--plan') out.plan = argv[++i] || '';
  }
  return out;
}

function main(argv, cwd = process.cwd()) {
  const opts = parseArgs(argv);
  let data;
  if (opts.plan) {
    try {
      data = stateLib.parseFrontMatter(fs.readFileSync(path.resolve(cwd, opts.plan), 'utf8')).data;
    } catch {
      console.error(`verify: cannot read ${opts.plan}`);
      return 2;
    }
  } else {
    data = stateLib.readState(cwd).data;
  }
  if (!data.test_command) {
    console.error('verify: no test_command in the plan front matter (PLAN-*.md or PRD.md). Set it to the full test command, then run this again.');
    return 2;
  }

  let choice;
  if (opts.full) {
    choice = { mode: 'full', reason: '--full was asked for', command: String(data.test_command).trim() };
  } else {
    let changes;
    try {
      changes = experts.workingChanges(cwd);
    } catch {
      changes = null;
    }
    choice = changes
      ? select({ changed: changes.files, relatedTests: /\{tests\}/.test(String(data.test_related_command || '')) ? relatedTests(cwd, changes) : [], data })
      : { mode: 'full', reason: 'the changed files could not be read from git', command: String(data.test_command).trim() };
  }

  if (choice.mode === 'none') {
    console.log(`verify: nothing to run (${choice.reason})`);
    return 0;
  }
  console.log(`verify: ${choice.mode} because ${choice.reason}`);
  console.log(`verify: ${choice.command}`);
  const r = spawnSync(choice.command, { cwd, shell: true, stdio: 'inherit' });
  const code = r.status === null ? 1 : r.status;
  if (choice.mode === 'full') {
    try {
      recordFull(cwd, { passed: code === 0, command: choice.command });
    } catch {
      console.error('verify: the result could not be recorded, so a commit will ask for a full run again');
    }
  }
  console.log(`verify: ${choice.mode} run ${code === 0 ? 'passed' : `failed (exit ${code})`}`);
  return code;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, readRecord, recordFull, fullEvidence, relatedTests, RECORD };
