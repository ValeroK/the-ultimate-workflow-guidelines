'use strict';

// The count of the tests that the unattended run sends back to the tester (5.2.0).
//
// When the diagnosis of a failed round says that tests are wrong, not the code, they all go back to the tester in one
// pass. The tester corrects or removes what the plan does not support, so that the files hold only the tests the
// change needs. This file counts the tests, the assertions and the skip marks of each test file before and after,
// so the user is shown what went away. It stops nothing: fewer tests can be the right result.
//
//   node test-guard.js snapshot <snapshot.json> <test file>...   the counts now, written to the snapshot
//   node test-guard.js check <snapshot.json>                     the counts now against the snapshot
//
// Each prints one JSON line. The counts are patterns over the text of the file, for the common runners (node:test,
// jest, vitest, mocha, pytest, unittest, go, cargo, rspec). They do not understand the code, which is why the report
// lists every corrected and removed test for the user.

const fs = require('node:fs');
const path = require('node:path');

const TEST = /^\s*(?:async\s+)?def\s+test\w*\s*\(|\b(?:test|it)(?:\.(?:only|each|concurrent))?\s*\(|^\s*func\s+Test\w*\s*\(|#\[(?:tokio::)?test\]|^\s*it\s+['"]/gm;
const ASSERT = /\bassert\w*\b|\bexpect\s*\(|\.should\b|\bt\.(?:Error|Fatal|Fail)\w*\s*\(|\bpytest\.raises\b|\bself\.assert\w+/g;
const SKIP = /\b(?:xfail|skip(?:if|If|Unless|Test)?|xit|xdescribe|todo)\b|\.(?:skip|todo|only)\s*\(|#\[ignore\]|\bt\.Skip\w*\s*\(/g;

const count = (text) => ({
  tests: (String(text).match(TEST) || []).length,
  asserts: (String(text).match(ASSERT) || []).length,
  skips: (String(text).match(SKIP) || []).length,
});

function snapshot(cwd, out, files) {
  const counts = {};
  for (const f of files) {
    const p = path.resolve(cwd, f);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) counts[f.replace(/\\/g, '/')] = count(fs.readFileSync(p, 'utf8'));
  }
  fs.mkdirSync(path.dirname(path.resolve(cwd, out)), { recursive: true });
  fs.writeFileSync(path.resolve(cwd, out), `${JSON.stringify(counts, null, 2)}\n`);
  return { ok: Object.keys(counts).length > 0, files: Object.keys(counts).length, ...(Object.keys(counts).length ? {} : { reason: 'none of the test files exists' }) };
}

function check(cwd, snap) {
  const before = JSON.parse(fs.readFileSync(path.resolve(cwd, snap), 'utf8'));
  const problems = [];
  for (const [f, was] of Object.entries(before)) {
    const p = path.resolve(cwd, f);
    if (!fs.existsSync(p)) {
      problems.push(`${f} is gone`);
      continue;
    }
    const now = count(fs.readFileSync(p, 'utf8'));
    if (now.tests < was.tests) problems.push(`${f} has ${now.tests} tests, and had ${was.tests}`);
    if (now.asserts < was.asserts) problems.push(`${f} has ${now.asserts} assertions, and had ${was.asserts}`);
    if (now.skips > was.skips) problems.push(`${f} has ${now.skips} skip or expected-failure marks, and had ${was.skips}`);
  }
  return { ok: true, kept: problems.length === 0, problems };
}

if (require.main === module) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  let out;
  try {
    if (cmd === 'snapshot' && file) out = snapshot(process.cwd(), file, rest);
    else if (cmd === 'check' && file) out = check(process.cwd(), file);
    else out = { ok: false, reason: 'usage: test-guard.js snapshot <snapshot.json> <test file>... | check <snapshot.json>' };
  } catch (e) {
    out = { ok: false, reason: e.message };
  }
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exitCode = out.ok ? 0 : 1;
}

module.exports = { count, snapshot, check };
