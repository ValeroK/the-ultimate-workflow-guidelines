#!/usr/bin/env node
'use strict';

// Runs the tests a change needs (4.1.1).
//
//   node hooks/verify.js           the tests related to the uncommitted changes, or the full suite
//                                  when the narrow run cannot be trusted (hooks/lib/selection.js)
//   node hooks/verify.js --full    the full suite (test_command), recorded for the commit check
//   node hooks/verify.js --full --if-stale   the same, unless a passing full run already covers the current changes
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

// ---- failures that were there before the change (the baseline) ----
//
// A full run counts as passed when it exits 0. A suite that already had failing tests could never
// do that, so a build stopped on a change that was fine. The baseline is the list of tests that
// fail before anything is written: taken once at the start of a build, shown to the user, and
// counted only after the user accepts it. A later full run then passes when every failing test is
// on that list, and fails naming the ones that are not.

const BASELINE = path.join('.ultimate-workflow', 'baseline.json');
const SELF = `node "${__filename.split(path.sep).join('/')}"`;

/** A test name as it compares: no timing in brackets, one space between words. */
function cleanName(s) {
  return String(s).replace(/\s*\(\s*\d+(\.\d+)?\s*m?s\s*\)\s*$/i, '').replace(/\s+/g, ' ').trim();
}

/**
 * The failing tests named in a runner's output, sorted and without repeats or timings. Patterns:
 * node:test (the spec reporter's cross mark), TAP "not ok", pytest "FAILED path::name", go
 * "--- FAIL: Name", cargo "test name ... FAILED", jest (a bullet or a ballot x).
 *
 * `recognised` is the safe-side answer to "do these names account for this failed run?". It is
 * false, and the names must not be trusted, when the run failed and (a) nothing matched, (b) the
 * runner's own summary counts more failures than names were found (a failure this parser cannot
 * see), or (c) the output shows a failure that is not a test: a build or collection error, a run
 * stopped at the first failure, a coverage threshold. Without that a known failing test next to
 * an unseen new one would pass. A runner with no summary line (go) relies on (a) and (c).
 * The symbols are written as escapes so no such character sits in this file.
 */
function extractFailures(output, code) {
  const names = new Set();
  const add = (n) => {
    const c = cleanName(n);
    if (!c || /^(failing tests?|failures?|errors?)\s*:?$/i.test(c) || /^console\b/i.test(c)) return;
    names.add(c);
  };
  let declared = null;
  let cargoFailed = 0;
  const raise = (n) => {
    declared = declared === null ? n : Math.max(declared, n);
  };
  const unexplained = [];
  for (const raw of String(output).replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    let m;
    if ((m = /^\u2716\s+(.*)$/.exec(line))) add(m[1]);
    else if ((m = /^not ok \d+\s*-?\s*(.*)$/.exec(line))) add(m[1]);
    else if ((m = /^FAILED\s+(.+)$/.exec(line))) {
      // pytest: "FAILED path::name - message". unittest ends with "FAILED (failures=1)", which is no test.
      const name = m[1].split(/\s+-\s/)[0].trim();
      if (/::|\.py\b/.test(name)) add(name);
    } else if ((m = /^---\s+FAIL:\s+(\S+)/.exec(line))) add(m[1]);
    else if ((m = /^test\s+(\S+)\s+\.\.\.\s+FAILED\b/.exec(line))) add(m[1]);
    else if ((m = /^[\u25CF\u2715]\s+(.*)$/.exec(line))) add(m[1]);
    if ((m = /^(?:\u2139|#)\s*fail\s+(\d+)\s*$/.exec(line))) raise(Number(m[1]));
    else if ((m = /^=+.*\b(\d+) failed\b/.exec(line))) raise(Number(m[1]));
    else if ((m = /^Tests:.*?\b(\d+) failed\b/.exec(line))) raise(Number(m[1]));
    else if ((m = /^test result: FAILED\..*?;\s*(\d+) failed/.exec(line))) cargoFailed += Number(m[1]);
    if (
      /\[(?:build|setup) failed\]/.test(line) ||
      /^ERROR\s+\S+\.py\b/.test(line) ||
      /^=+.*\b[1-9]\d* errors?\b/.test(line) ||
      /\berror\[E\d+\]/.test(line) ||
      /stopping after \d+ failures?|^Interrupted:/i.test(line) ||
      /coverage threshold .* not met/i.test(line)
    ) {
      unexplained.push(line.slice(0, 120));
    }
  }
  if (cargoFailed > 0) raise(cargoFailed);
  const sorted = [...names].sort();
  const accounted = sorted.length > 0 && (declared === null || sorted.length >= declared) && unexplained.length === 0;
  return { names: sorted, declared, unexplained, recognised: code === 0 || accounted };
}

function readBaseline(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, BASELINE), 'utf8'));
  } catch {
    return null;
  }
}

function headSha(cwd) {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

/** A baseline counts only when accepted, for this command, and taken at the commit the work started from. */
function baselineApplies(baseline, cwd, command) {
  return Boolean(baseline) && baseline.accepted === true && Array.isArray(baseline.failures) && baseline.command === command && baseline.head === headSha(cwd);
}

/**
 * Whether a full run that exited `code` with `output` passes against an accepted baseline.
 * Never passes a failed run whose failing tests cannot be told apart, and never passes one with a
 * failing test that was not on the list. A listed test that no longer fails is `fixed`.
 */
function judge(code, output, baseline) {
  const known = baseline && Array.isArray(baseline.failures) ? baseline.failures : [];
  if (code === 0) return { passed: true, known: [], fixed: known, newFailures: [], unrecognised: false };
  const found = extractFailures(output, code);
  if (!found.recognised) return { passed: false, known: [], fixed: [], newFailures: [], unrecognised: true };
  const newFailures = found.names.filter((n) => !known.includes(n));
  return {
    passed: newFailures.length === 0,
    known: found.names.filter((n) => known.includes(n)),
    fixed: known.filter((n) => !found.names.includes(n)),
    newFailures,
    unrecognised: false,
  };
}

/** Set `key: value` in a document's front matter, keeping its line endings; unchanged when it has none. */
function setFrontLine(text, key, value) {
  const m = /^(﻿?---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/.exec(text);
  if (!m) return text;
  const eol = m[1].endsWith('\r\n') ? '\r\n' : '\n';
  const re = new RegExp(`^${key}[ \\t]*:.*$`, 'm');
  const block = re.test(m[2]) ? m[2].replace(re, `${key}: ${value}`) : `${m[2]}${eol}${key}: ${value}`;
  return m[1] + block + m[3] + text.slice(m[0].length);
}

/** Put the accepted list in the plan as a "Known failures" section, replacing an earlier one. */
function writeKnownFailures(planFile, names) {
  let text = fs.readFileSync(planFile, 'utf8');
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  text = setFrontLine(text, 'known_failures', names.length);
  const section = `## Known failures${eol}${eol}Tests that failed before this change and that the user accepted as known. A full run passes while only these fail.${eol}${eol}${names.map((n) => `- ${n}`).join(eol)}${eol}`;
  const re = /^## Known failures[ \t]*\r?\n[\s\S]*?(?=^## |(?![\s\S]))/m;
  // When another heading follows, a blank line stays between the list and it.
  text = re.test(text)
    ? text.replace(re, (match, offset) => section + (text.slice(offset + match.length).startsWith('## ') ? eol : ''))
    : `${text.replace(/\s+$/, '')}${eol}${eol}${section}`;
  fs.writeFileSync(planFile, text);
}

/**
 * How to run a test command (4.7.0, W7). `shell: true` is cmd.exe on Windows, and cmd.exe does not
 * know single quotes, so `bash -c 'npm test && npm run lint'` reached bash cut at every space and
 * failed on a quoting error, every time. A command that is exactly `bash -c '<script>'` or
 * `sh -c "<script>"` runs through that shell with the script as one argument; `test_shell: bash` in
 * the plan runs every command through bash. Anything else runs as before. Null means "as before".
 */
function shellFor(command, data, platform = process.platform) {
  const named = String((data && data.test_shell) || '').trim();
  if (named) {
    if (!/^[A-Za-z0-9_./:\\ -]+$/.test(named)) throw new Error(`test_shell "${named}" is not a program name or path`);
    return { file: named, args: ['-c', command] };
  }
  if (platform !== 'win32') return null;
  const m = /^\s*(bash|sh)(?:\.exe)?\s+-c\s+(?:'([^']*)'|"((?:[^"\\]|\\.)*)")\s*$/.exec(String(command));
  if (!m) return null;
  return { file: m[1], args: ['-c', m[2] !== undefined ? m[2] : m[3].replace(/\\(["\\$`])/g, '$1')] };
}

function runShell(command, data, opts) {
  const sh = shellFor(command, data);
  return sh ? spawnSync(sh.file, sh.args, opts) : spawnSync(command, { ...opts, shell: true });
}

/** Source changes (documents and the plan do not count): a baseline must be taken before any. */
function sourceChanges(cwd) {
  const changes = experts.workingChanges(cwd);
  return changes.files.filter((f) => !(isDocPath(f) && !ALWAYS_FULL.some((re) => re.test(f))));
}

/** --baseline: run the full suite on the tree as it is, before any test or code is written. */
function captureBaseline(cwd, data) {
  let source;
  try {
    source = sourceChanges(cwd);
  } catch {
    console.error('verify: --baseline could not read the changes from git, so it cannot tell whether the tree is still untouched.');
    return 2;
  }
  if (source.length > 0) {
    console.error(`verify: --baseline is taken before any test or code is written, and these source files already changed: ${source.slice(0, 8).join(', ')}${source.length > 8 ? ', ...' : ''}. Their failures could be the change's own, so no baseline is recorded; ask the user how to proceed.`);
    return 2;
  }
  const command = String(data.test_command).trim();
  const release = acquireLock(cwd);
  if (!release) return 3;
  let code;
  let output;
  let abnormal = false;
  try {
    const r = runShell(command, data, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
    code = r.status === null ? 1 : r.status;
    // Killed by a signal, timed out, out of buffer: the output is partial, so no list can be trusted.
    abnormal = r.status === null || Boolean(r.error);
    output = `${r.stdout || ''}${r.stderr || ''}`;
  } finally {
    release();
  }
  fs.mkdirSync(path.join(cwd, '.ultimate-workflow'), { recursive: true });
  fs.writeFileSync(path.join(cwd, LOG), output);
  const found = extractFailures(output, code);
  if (abnormal) found.recognised = false;
  const rec = { command, head: headSha(cwd), exit: code, failures: found.names, recognised: found.recognised, accepted: code === 0, at: new Date().toISOString() };
  fs.writeFileSync(path.join(cwd, BASELINE), `${JSON.stringify(rec, null, 2)}\n`);
  console.log(`verify: baseline: ${command}`);
  if (code === 0) {
    console.log('verify: baseline: the suite passes before any change; there is nothing to accept.');
  } else if (found.recognised) {
    console.log(`verify: baseline: ${found.names.length} test${found.names.length === 1 ? '' : 's'} fail before any change:`);
    for (const n of found.names) console.log(`  - ${n}`);
    console.log('verify: baseline: show these to the user. If they accept them as known, run: ' + SELF + ' --accept-baseline');
  } else {
    const why = abnormal
      ? 'the run was cut short (killed, timed out or out of buffer), so its output is partial'
      : found.names.length === 0
        ? 'no failing test name was recognised in the output'
        : `the ${found.names.length} test name${found.names.length === 1 ? '' : 's'} found do not account for every failure${found.unexplained.length ? ` (${found.unexplained[0]})` : found.declared !== null ? ` (the runner reports ${found.declared})` : ''}`;
    console.log(`verify: baseline: the suite fails (exit ${code}) and ${why} (${LOG.replace(/\\/g, '/')}).`);
    console.log('verify: baseline: read that file, write the failing tests one per line to a file, show them to the user, then run: ' + SELF + ' --accept-baseline --failures-file <file>');
  }
  return 0;
}

/** --accept-baseline: the user has seen the list and accepts it; it is recorded in the plan too. */
function acceptBaseline(cwd, opts) {
  const b = readBaseline(cwd);
  if (!b) {
    console.error('verify: no baseline to accept. Run ' + SELF + ' --baseline first.');
    return 2;
  }
  let failures = b.failures;
  if (opts.failuresFile) {
    try {
      failures = [...new Set(fs.readFileSync(path.resolve(cwd, opts.failuresFile), 'utf8').split(/\r?\n/).map(cleanName).filter(Boolean))].sort();
    } catch (err) {
      console.error(`verify: cannot read ${opts.failuresFile}: ${err.message}`);
      return 2;
    }
    if (failures.length === 0) {
      console.error(`verify: ${opts.failuresFile} names no failing test.`);
      return 2;
    }
  } else if (b.exit !== 0 && !b.recognised) {
    console.error('verify: the failing tests were not recognised in the baseline output. Pass the list with --failures-file <file> (one test per line).');
    return 2;
  }
  const rec = { ...b, failures, recognised: true, accepted: true, acceptedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(cwd, BASELINE), `${JSON.stringify(rec, null, 2)}\n`);
  const planFile = opts.plan ? path.resolve(cwd, opts.plan) : (stateLib.readState(cwd).file ? path.resolve(cwd, stateLib.readState(cwd).file) : '');
  if (planFile && /(^|[\\/])PLAN-[^\\/]+\.md$/i.test(planFile) && fs.existsSync(planFile)) {
    writeKnownFailures(planFile, failures);
    console.log(`verify: baseline accepted: ${failures.length} known failure${failures.length === 1 ? '' : 's'}, listed in ${path.basename(planFile)}.`);
  } else {
    console.log(`verify: baseline accepted: ${failures.length} known failure${failures.length === 1 ? '' : 's'}. No PLAN-*.md was found to list them in.`);
  }
  return 0;
}

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
function recordFull(cwd, { passed, command, verdict = null, acceptedAt = '' }) {
  const file = path.join(cwd, RECORD);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const rec = { mode: 'full', passed: passed === true, fingerprint: experts.testFingerprint(cwd), command, at: new Date().toISOString() };
  // A pass that leans on the accepted baseline says so, so the commit check and the report show it.
  if (verdict && !verdict.unrecognised) {
    rec.knownFailures = verdict.known.length;
    rec.newFailures = verdict.newFailures;
    rec.fixedFailures = verdict.fixed.length;
    if (acceptedAt) rec.baselineAcceptedAt = acceptedAt;
  }
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
  const out = { full: false, ifStale: false, plan: '', baseline: false, acceptBaseline: false, failuresFile: '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--baseline') out.baseline = true;
    else if (argv[i] === '--accept-baseline') out.acceptBaseline = true;
    else if (argv[i] === '--failures-file') out.failuresFile = argv[++i] || '';
    else if (argv[i] === '--full') out.full = true;
    else if (argv[i] === '--if-stale') out.ifStale = true;
    else if (argv[i] === '--plan') out.plan = argv[++i] || '';
  }
  return out;
}

function main(argv, startDir = process.cwd()) {
  const opts = parseArgs(argv);
  // The plan, the record and the test command all belong to the project root: G7 reads the record
  // there, so a run started from a subfolder would otherwise leave one where nothing looks.
  const cwd = stateLib.projectRoot(startDir);
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

  if (opts.baseline && opts.acceptBaseline) {
    console.error('verify: --baseline and --accept-baseline are two steps; run --baseline, show the user the list, then --accept-baseline.');
    return 2;
  }
  if (opts.baseline) return captureBaseline(cwd, data);
  if (opts.acceptBaseline) return acceptBaseline(cwd, opts);

  if (opts.ifStale && !opts.full) {
    console.error('verify: --if-stale only goes with --full.');
    return 2;
  }
  // --full --if-stale: a repeat of a run that already passed is not worth a second suite. Only a
  // passing full run of this same command, made on exactly the current changes, counts; a skipped
  // run writes nothing, so the record keeps saying when the suite really ran.
  if (opts.full && opts.ifStale) {
    const ev = fullEvidence(cwd);
    if (ev.skip) {
      console.log(`verify: nothing to run (${ev.skip})`);
      return 0;
    }
    const r = ev.record;
    if (r && r.mode === 'full' && r.passed === true && r.fingerprint === ev.hash && r.command === String(data.test_command).trim()) {
      console.log(`verify: a passing full run (${r.at}) already covers these changes; nothing to run`);
      return 0;
    }
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
  let fullOutput = '';
  let abnormal = false;
  try {
    if (process.env.ULTIMATE_WORKFLOW_VERIFY_FULL_OUTPUT === '1') {
      const r = runShell(choice.command, data, { cwd, stdio: 'inherit' });
      code = r.status === null ? 1 : r.status;
    } else {
      // 4.2.0: a full suite prints thousands of lines, and whatever lands in the conversation is
      // re-sent on every later turn. The whole output goes to a file; the conversation gets the
      // failure lines and the tail.
      const r = runShell(choice.command, data, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
      code = r.status === null ? 1 : r.status;
      // Killed by a signal, timed out, out of buffer: the output is partial and is never judged.
      abnormal = r.status === null || Boolean(r.error);
      const output = `${r.stdout || ''}${r.stderr || ''}`;
      fullOutput = output;
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
  // A full run that failed is judged against the accepted baseline, when there is one for this
  // command and this starting commit. Output that was not captured cannot be judged.
  let verdict = null;
  let acceptedBaseline = null;
  if (choice.mode === 'full' && code !== 0 && !abnormal) {
    const baseline = readBaseline(cwd);
    if (baselineApplies(baseline, cwd, choice.command)) {
      verdict = judge(code, fullOutput, baseline);
      acceptedBaseline = baseline;
    }
  }
  const passedFull = code === 0 || Boolean(verdict && verdict.passed);
  if (choice.mode === 'full') {
    try {
      recordFull(cwd, { passed: passedFull, command: choice.command, verdict, acceptedAt: acceptedBaseline ? acceptedBaseline.acceptedAt : '' });
    } catch {
      console.error('verify: the result could not be recorded, so a commit will ask for a full run again');
    }
  }
  const hint = rewriteHint(cwd, before, data);
  if (hint) console.log(hint);
  if (verdict && verdict.passed) {
    const fixed = verdict.fixed.length ? `; ${verdict.fixed.length} of the known failures now pass` : '';
    console.log(`verify: full run passed with ${verdict.known.length} known failure${verdict.known.length === 1 ? '' : 's'} (the accepted baseline) and 0 new${fixed}`);
    // Said again every time it is relied on, so an accept nobody meant to give shows up in the build report.
    console.log(`verify: accepted${acceptedBaseline && acceptedBaseline.acceptedAt ? ` on ${acceptedBaseline.acceptedAt}` : ''}; these tests were not run to green:`);
    for (const n of verdict.known.slice(0, 20)) console.log(`  - ${n}`);
    if (verdict.known.length > 20) console.log(`  ... and ${verdict.known.length - 20} more (see .ultimate-workflow/baseline.json)`);
    return 0;
  }
  if (verdict && verdict.unrecognised) {
    console.log(`verify: full run failed (exit ${code}) and the failing tests could not be told apart from the accepted baseline, so it does not pass`);
  } else if (verdict) {
    console.log(`verify: full run failed (exit ${code}): ${verdict.newFailures.length} failing test${verdict.newFailures.length === 1 ? ' is' : 's are'} not in the accepted baseline:`);
    for (const n of verdict.newFailures.slice(0, 20)) console.log(`  - ${n}`);
  } else {
    console.log(`verify: ${choice.mode} run ${code === 0 ? 'passed' : `failed (exit ${code})`}`);
  }
  return code;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, shellFor, readRecord, recordFull, fullEvidence, relatedTests, acquireLock, shortOutput, extractFailures, readBaseline, baselineApplies, judge, setFrontLine, RECORD, LOCK, LOG, BASELINE };
