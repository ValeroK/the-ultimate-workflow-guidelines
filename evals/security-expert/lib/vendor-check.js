'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Verifies vendored third-party content. For every directory under `vendorRoot`
// that holds a PROVENANCE.md, each other file must agree three ways: its own
// bytes, its row in PROVENANCE.md, and the pin in <vendorRoot>/EXPECTED-HASHES.json.
// Returns a list of problem strings; an empty list means clean. It never throws
// on bad input, because a checker that crashes reads as a pass in some runners.

const ROW = /\|\s*`?([^`|\s]+)`?\s*\|\s*([0-9a-f]{64})\s*\|/g;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file, problems) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    problems.push(`${path.basename(file)}: unreadable (${err.message})`);
    return {};
  }
}

function provenanceRows(text) {
  const rows = {};
  for (const m of text.matchAll(ROW)) rows[m[1]] = m[2];
  return rows;
}

function verifyVendor(vendorRoot) {
  const problems = [];
  const pinsFile = path.join(vendorRoot, 'EXPECTED-HASHES.json');
  const pins = fs.existsSync(pinsFile) ? readJson(pinsFile, problems) : (problems.push('EXPECTED-HASHES.json: missing'), {});
  const seen = new Set();

  for (const entry of fs.readdirSync(vendorRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(vendorRoot, entry.name);
    const provFile = path.join(dir, 'PROVENANCE.md');
    if (!fs.existsSync(provFile)) {
      problems.push(`${entry.name}: no PROVENANCE.md`);
      continue;
    }
    const rows = provenanceRows(fs.readFileSync(provFile, 'utf8'));

    for (const f of fs.readdirSync(dir)) {
      if (f === 'PROVENANCE.md') continue;
      const key = `${entry.name}/${f}`;
      seen.add(key);
      const actual = sha256(path.join(dir, f));
      if (!rows[f]) problems.push(`${key}: not listed in PROVENANCE.md`);
      else if (rows[f] !== actual) problems.push(`${key}: bytes do not match the PROVENANCE.md hash`);
      if (!pins[key]) problems.push(`${key}: not pinned in EXPECTED-HASHES.json`);
      else if (pins[key] !== actual) problems.push(`${key}: bytes do not match the EXPECTED-HASHES.json pin`);
      if (rows[f] && pins[key] && rows[f] !== pins[key]) {
        problems.push(`${key}: PROVENANCE.md and EXPECTED-HASHES.json disagree`);
      }
    }
    for (const f of Object.keys(rows)) {
      if (!fs.existsSync(path.join(dir, f))) problems.push(`${entry.name}/${f}: listed in PROVENANCE.md but missing`);
    }
  }

  for (const key of Object.keys(pins)) {
    if (!seen.has(key)) problems.push(`${key}: pinned in EXPECTED-HASHES.json but missing`);
  }
  return problems;
}

module.exports = { verifyVendor };
