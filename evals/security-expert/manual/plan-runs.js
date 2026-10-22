'use strict';

// Lays out a blinded set of review runs. For every case x arm x run it writes a
// prompt file under an opaque path and records the mapping in runs.json, which only
// the person scoring reads. A reviewer agent is given just its prompt path, so it
// cannot tell from the path which arm or case it is in.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildPrompt } = require('./build-prompts.js');

// A tiny seeded PRNG so a shuffle can be reproduced; the default is unseeded.
function rng(seed) {
  if (seed === undefined) return Math.random;
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function planRuns({ cases, arms, runs, dir, pluginDir, vendorDir, worktreeFor, diffFor, seed }) {
  const random = rng(seed);
  const combos = [];
  for (const caseId of cases) for (const arm of arms) for (let run = 1; run <= runs; run++) combos.push({ caseId, arm, run });
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }

  const used = new Set();
  const index = [];
  for (const combo of combos) {
    let runId;
    do runId = `r${crypto.randomBytes(5).toString('hex')}`;
    while (used.has(runId));
    used.add(runId);

    const promptFile = path.join(dir, 'p', `${runId}.txt`);
    const resultFile = path.join(dir, 'out', `${runId}.json`);
    fs.mkdirSync(path.dirname(promptFile), { recursive: true });
    fs.mkdirSync(path.dirname(resultFile), { recursive: true });
    const prompt = await buildPrompt({
      arm: combo.arm,
      worktree: worktreeFor(combo.caseId),
      diffFile: diffFor(combo.caseId),
      resultFile,
      pluginDir,
      vendorDir,
    });
    fs.writeFileSync(promptFile, prompt);
    index.push({ runId, ...combo, promptFile, resultFile });
  }
  fs.writeFileSync(path.join(dir, 'runs.json'), JSON.stringify(index, null, 1));
  return index;
}

// One result per planned run. A missing, unreadable or malformed file is a failed
// run with a reason; it is never skipped, so a crashed reviewer cannot look like a
// clean one.
function loadResults(index) {
  return index.map(({ caseId, arm, run, resultFile }) => {
    const base = { caseId, arm, run };
    let text;
    try {
      text = fs.readFileSync(resultFile, 'utf8');
    } catch {
      return { ...base, error: 'no result file written' };
    }
    try {
      const json = JSON.parse(text);
      if (!Array.isArray(json.findings)) return { ...base, error: 'result has no findings array' };
      return { ...base, findings: json.findings, verdict: json.verdict };
    } catch (err) {
      return { ...base, error: `result is not valid JSON (${err.message})` };
    }
  });
}

module.exports = { planRuns, loadResults };
