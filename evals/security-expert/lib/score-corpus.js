'use strict';

// Scores review runs against a corpus manifest. A run is { caseId, arm, run,
// findings: [{file, line, what}] } or { caseId, arm, run, error }. Matching is by
// file and a line tolerance, because a reviewer may cite the call site, the sink or
// the line above it. A failed run is a miss and is counted as failed; it is never
// dropped from a denominator, and a failed benign run is not a clean pass.

const TOLERANCE = 10;

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '');

function sameFile(found, expected) {
  const a = norm(found);
  const b = norm(expected);
  return a === b || a.endsWith(`/${b}`);
}

function matches(finding, c, tolerance = TOLERANCE) {
  if (!finding || typeof finding.file !== 'string') return false;
  if (typeof finding.line !== 'number' || !Number.isFinite(finding.line)) return false;
  return sameFile(finding.file, c.file) && Math.abs(finding.line - c.line) <= tolerance;
}

function scoreRuns(manifest, runs, { tolerance = TOLERANCE } = {}) {
  const byId = new Map(manifest.map((c) => [c.id, c]));
  const arms = {};
  const perCase = {};

  for (const run of runs) {
    const c = byId.get(run.caseId);
    if (!c) throw new Error(`result for ${run.caseId} but that case is not in the manifest`);
    const a = (arms[run.arm] ||= {
      seededRuns: 0, seededHits: 0, extraFindings: 0,
      benignRuns: 0, benignFalsePositives: 0, benignClean: 0, failedRuns: 0,
    });
    const failed = Boolean(run.error) || !Array.isArray(run.findings);
    if (failed) a.failedRuns++;
    const findings = failed ? [] : run.findings;

    if (c.kind === 'seeded') {
      a.seededRuns++;
      const hit = findings.some((f) => matches(f, c, tolerance));
      if (hit) a.seededHits++;
      a.extraFindings += findings.filter((f) => !matches(f, c, tolerance)).length;
      const cell = ((perCase[c.id] ||= {})[run.arm] ||= { hits: 0, runs: 0 });
      cell.runs++;
      if (hit) cell.hits++;
    } else {
      a.benignRuns++;
      if (!failed && findings.length === 0) a.benignClean++;
      if (findings.length > 0) a.benignFalsePositives++;
      const cell = ((perCase[c.id] ||= {})[run.arm] ||= { hits: 0, runs: 0, findings: 0 });
      cell.runs++;
      cell.findings = (cell.findings || 0) + findings.length;
    }
  }

  for (const a of Object.values(arms)) {
    a.recall = a.seededRuns === 0 ? null : a.seededHits / a.seededRuns;
    a.falsePositiveRate = a.benignRuns === 0 ? null : a.benignFalsePositives / a.benignRuns;
  }

  const flips = (x, y) =>
    Object.keys(perCase)
      .filter((id) => byId.get(id).kind === 'seeded' && perCase[id][x] && perCase[id][y])
      .filter((id) => perCase[id][x].hits !== perCase[id][y].hits)
      .map((id) => ({ id, [x]: perCase[id][x].hits, [y]: perCase[id][y].hits, runs: perCase[id][x].runs }));

  return { arms, perCase, flips };
}

module.exports = { scoreRuns, matches, TOLERANCE };
