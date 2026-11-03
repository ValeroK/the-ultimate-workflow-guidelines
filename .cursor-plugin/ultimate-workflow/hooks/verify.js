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
const LOCK = path.join('.ultimate-workflow', 'verify.lock');
const LOG = path.join('.ultimate-workflow', 'verify.log');
/** Per-file patches of the changes right now, or null when git cannot say. */
function snapshot(cwd) {
  try {
    return experts.splitByFile(experts.workingChanges(cwd).diff);
  } catch {
    return null;
  }
}

/**
 * Files a test run rewrote that the plan does not yet list as volatile (4.2.1). A file that
 * every green run rewrites moves the fingerprint, so the experts' review and the full-run record
 * both look out of date after a run that changed no code; in the re-wash that cost rechecks of
 * 815k tokens with nothing to find. Said once after the run, with the line to add.
 */
function rewriteHint(cwd, before, data) {
  const after = snapshot(cwd);
  if (!before || !after) return '';
  const names = [...after.keys()].filter((f) => !f.startsWith('.ultimate-workflow/') && before.get(f) !== after.get(f));
  if (names.length === 0) return '';
  const listed = String(data.volatile_paths || '').split(',').map((x) => x.trim()).filter(Boolean);
  const shown = names.slice(0, 10).join(', ');
  return [
    `verify: the run rewrote ${names.length} file${names.length === 1 ? '' : 's'} (${shown}${names.length > 10 ? ', ...' : ''}).`,
    `verify: if you do not edit ${names.length === 1 ? 'it' : 'them'} yourself, add to the plan's front matter:  volatile_paths: ${[...listed, ...names.slice(0, 10)].join(', ')}`,
    "verify: otherwise each run makes the experts' review and the full-run record look out of date.",
  ].join('\n');
}

const FAILURE_LINE = /\b(fail(ed|ure|ing)?|error|not ok|assert\w*)\b/i;

/** The lines worth reading: up to 60 that look like failures, then the last 30 (80 on a failure), without repeats. */
function shortOutput(output, code) {
  const lines = String(output).replace(/\r/g, '').split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const tailCount = code === 0 ? 30 : 80;
  const tailStart = Math.max(0, lines.length - tailCount);
  const failures = lines.slice(0, tailStart).filter((l) => FAILURE_LINE.test(l) && !/^\s*#?\s*fail\s+0\b/i.test(l)).slice(0, 60);
  const out = [];
  if (failures.length) out.push('verify: lines that look like failures:', ...failures, 'verify: last lines:');
  else if (tailStart > 0) out.push(`verify: (${tailStart} earlier lines left out)`);
  out.push(...lines.slice(tailStart));
  return out.join('\n');
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * One test run at a time (4.1.2): in the re-wash a full suite overlapped another run and failed
 * two timing-sensitive tests. Waits while a live run holds the lock, takes over a lock whose
 * process is gone, and gives up after ULTIMATE_WORKFLOW_VERIFY_WAIT_S (default 1200). Covers runs
 * through verify.js only. Returns a release function, or null when it gave up.
 */
function acquireLock(cwd, env = process.env) {
  const file = path.join(cwd, LOCK);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const limit = Number(env.ULTIMATE_WORKFLOW_VERIFY_WAIT_S) > 0 ? Number(env.ULTIMATE_WORKFLOW_VERIFY_WAIT_S) : 1200;
  const until = Date.now() + limit * 1000;
  let told = false;
  for (;;) {
    try {
      fs.writeFileSync(file, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), { flag: 'wx' });
      return () => {
        try {
          fs.unlinkSync(file);
        } catch {}
      };
    } catch (err) {
      if (err.code !== 'EEXIST') return () => {};
    }
    let holder = null;
    try {
      holder = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
    if (!holder || !Number.isInteger(holder.pid) || !alive(holder.pid)) {
      try {
        fs.unlinkSync(file);
      } catch {}
      continue;
    }
    if (Date.now() >= until) {
      console.error(`verify: another test run (process ${holder.pid}, since ${holder.at}) is still going after ${limit}s. Nothing was run; try again when it ends.`);
      return null;
    }
    if (!told) {
      console.log(`verify: waiting for another test run (process ${holder.pid}) to finish`);
      told = true;
    }
    sleep(1000);
  }
}

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
  const rec = { mode: 'full', passed: passed === true, fingerprint: experts.testFingerprint(cwd), command, at: new Date().toISOString() };
  fs.writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`);
  return rec;
}

/** What the commit check needs: the current fingerprint and the last full run, or why it does not apply. */
function fullEvidence(cwd) {
  try {
    const changes = experts.workingChanges(cwd);
    if (changes.merge) {
      // A merge is judged on the tree it will commit, not on its combined diff (which is empty
      // for a clean merge whose tree has still never been tested).
      const m = changes.merge;
      if (m.tree === m.headTree || m.vsHead.length === 0) return { skip: 'a merge that changes nothing in the tree' };
      if (m.vsHead.every((f) => isDocPath(f) && !ALWAYS_FULL.some((re) => re.test(f)))) return { skip: 'only documentation changed' };
      return { hash: experts.testFingerprint(cwd), record: readRecord(cwd) };
    }
    if (changes.files.length === 0) return { skip: 'nothing to commit' };
    // `requirements.txt` ends in a documentation extension and still changes what the tests run against.
    if (changes.files.every((f) => isDocPath(f) && !ALWAYS_FULL.some((re) => re.test(f)))) return { skip: 'only documentation changed' };
    return { hash: experts.testFingerprint(cwd), record: readRecord(cwd) };
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
  const release = acquireLock(cwd);
  if (!release) return 3;
  const before = snapshot(cwd);
  console.log(`verify: ${choice.mode} because ${choice.reason}`);
  console.log(`verify: ${choice.command}`);
  let code;
  try {
    if (process.env.ULTIMATE_WORKFLOW_VERIFY_FULL_OUTPUT === '1') {
      const r = spawnSync(choice.command, { cwd, shell: true, stdio: 'inherit' });
      code = r.status === null ? 1 : r.status;
    } else {
      // 4.2.0: a full suite prints thousands of lines, and whatever lands in the conversation is
      // re-sent on every later turn. The whole output goes to a file; the conversation gets the
      // failure lines and the tail.
      const r = spawnSync(choice.command, { cwd, shell: true, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
      code = r.status === null ? 1 : r.status;
      const output = `${r.stdout || ''}${r.stderr || ''}`;
      console.log(shortOutput(output, code));
      try {
        fs.mkdirSync(path.join(cwd, '.ultimate-workflow'), { recursive: true });
        fs.writeFileSync(path.join(cwd, LOG), output);
        console.log(`verify: full output (${output.split('\n').length} lines) in ${LOG.replace(/\\/g, '/')}`);
      } catch {
        console.log('verify: the full output could not be saved');
      }
    }
  } finally {
    release();
  }
  if (choice.mode === 'full') {
    try {
      recordFull(cwd, { passed: code === 0, command: choice.command });
    } catch {
      console.error('verify: the result could not be recorded, so a commit will ask for a full run again');
    }
  }
  const hint = rewriteHint(cwd, before, data);
  if (hint) console.log(hint);
  console.log(`verify: ${choice.mode} run ${code === 0 ? 'passed' : `failed (exit ${code})`}`);
  return code;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, readRecord, recordFull, fullEvidence, relatedTests, acquireLock, shortOutput, RECORD, LOCK, LOG };
