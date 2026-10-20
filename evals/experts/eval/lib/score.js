'use strict';

// Scoring for expert evals. Pure arithmetic: no model, no filesystem. A model-based judge
// (evals/experts/eval/manual/run-eval.js) classifies each finding; this module counts.
//
// A record is one reviewer run on one case:
//   { arm, run, caseId, failed, labels: [{ label, evidence }] }
//   label    planted | valid-other | false-positive | out-of-domain
//   evidence complete | partial | none
// A run that failed or timed out has failed: true and counts as a miss, never as clean.
// A run with no findings has labels: [] and is a clean answer.

const LABELS = ['planted', 'valid-other', 'false-positive', 'out-of-domain'];
const EVIDENCE = ['complete', 'partial', 'none'];

function recordProblems(rec) {
  const p = [];
  if (!rec || typeof rec !== 'object') return ['record is not an object'];
  if (!rec.arm) p.push('arm missing');
  if (!Number.isInteger(rec.run) || rec.run < 1) p.push('run must be a positive integer');
  if (!rec.caseId) p.push('caseId missing');
  if (typeof rec.failed !== 'boolean') p.push('failed must be boolean');
  if (!Array.isArray(rec.labels)) p.push('labels must be an array');
  else {
    for (const l of rec.labels) {
      if (!LABELS.includes(l.label)) p.push(`unknown label ${l.label}`);
      if (!EVIDENCE.includes(l.evidence)) p.push(`unknown evidence ${l.evidence}`);
    }
    if (rec.failed && rec.labels.length > 0) p.push('a failed run cannot carry labels');
  }
  return p;
}

const ratio = (n, d) => (d === 0 ? null : n / d);

/**
 * Metrics for one arm over the cases of one split.
 * cases: [{ id, kind }] for that split. records: all records of that arm.
 * Every case in the split must have the same number of runs; a missing run is a defect
 * in the experiment and throws, because silently averaging over fewer runs flatters.
 */
function summarise(cases, records) {
  const byCase = new Map();
  for (const rec of records) {
    const bad = recordProblems(rec);
    if (bad.length > 0) throw new Error(`bad record for ${rec && rec.caseId}: ${bad.join('; ')}`);
    if (!byCase.has(rec.caseId)) byCase.set(rec.caseId, []);
    byCase.get(rec.caseId).push(rec);
  }
  const runCounts = new Set();
  for (const c of cases) {
    const recs = byCase.get(c.id) || [];
    const runs = new Set(recs.map((r) => r.run));
    if (runs.size !== recs.length) throw new Error(`case ${c.id}: duplicate run numbers`);
    runCounts.add(recs.length);
  }
  if (runCounts.size !== 1 || runCounts.has(0)) throw new Error(`every case needs the same, non-zero number of runs; got ${[...runCounts].join(', ')}`);
  const k = [...runCounts][0];

  const seeded = cases.filter((c) => c.kind === 'seeded');
  const benign = cases.filter((c) => c.kind === 'benign');
  const sibling = cases.filter((c) => c.kind === 'sibling');
  const has = (rec, label) => rec.labels.some((l) => l.label === label);
  const runsOf = (c) => byCase.get(c.id) || [];

  // Seeded: found when any finding is judged to be the planted defect.
  let seededRunsFound = 0;
  let seededCasesMajority = 0;
  let seededCasesAllRuns = 0;
  for (const c of seeded) {
    const found = runsOf(c).filter((r) => !r.failed && has(r, 'planted')).length;
    seededRunsFound += found;
    if (found * 2 > k) seededCasesMajority += 1;
    if (found === k) seededCasesAllRuns += 1;
  }

  // Benign and sibling: a false positive is any finding judged a false positive.
  const fpRuns = (list) => list.reduce((n, c) => n + runsOf(c).filter((r) => has(r, 'false-positive')).length, 0);
  const benignFpRuns = fpRuns(benign);
  const siblingFpRuns = fpRuns(sibling);
  const leakRuns = sibling.reduce((n, c) => n + runsOf(c).filter((r) => has(r, 'out-of-domain')).length, 0);
  const validOtherRuns = [...benign, ...seeded, ...sibling].reduce((n, c) => n + runsOf(c).filter((r) => has(r, 'valid-other')).length, 0);

  const all = cases.flatMap(runsOf);
  const findings = all.flatMap((r) => r.labels);
  const failedRuns = all.filter((r) => r.failed).length;

  return {
    runsPerCase: k,
    cases: { seeded: seeded.length, benign: benign.length, sibling: sibling.length },
    seeded: {
      runsFound: seededRunsFound,
      runs: seeded.length * k,
      recall: ratio(seededRunsFound, seeded.length * k),
      casesFoundMajority: seededCasesMajority,
      casesFoundAllRuns: seededCasesAllRuns,
    },
    benign: { fpRuns: benignFpRuns, runs: benign.length * k, fpRate: ratio(benignFpRuns, benign.length * k) },
    sibling: {
      leakRuns,
      fpRuns: siblingFpRuns,
      runs: sibling.length * k,
      leakRate: ratio(leakRuns, sibling.length * k),
      fpRate: ratio(siblingFpRuns, sibling.length * k),
    },
    findings: {
      total: findings.length,
      perRun: ratio(findings.length, all.length),
      validOtherRuns,
      evidenceComplete: ratio(findings.filter((f) => f.evidence === 'complete').length, findings.length),
    },
    failedRuns,
    totalRuns: all.length,
  };
}

/**
 * Compare a candidate arm to a baseline against the thresholds in thresholds.json.
 * Differences smaller than one case are not distinguishable at this sample size, so the
 * recall check is in cases, not percentage points.
 */
function compare(candidate, baseline, t) {
  const checks = [];
  const add = (name, ok, detail, informational = false) => checks.push({ name, ok, detail, informational });
  add(
    'recall beats baseline by the margin',
    candidate.seeded.casesFoundMajority >= baseline.seeded.casesFoundMajority + t.recallMarginCases,
    `candidate ${candidate.seeded.casesFoundMajority} of ${candidate.cases.seeded} cases, baseline ${baseline.seeded.casesFoundMajority}, margin ${t.recallMarginCases}`
  );
  add(
    'false positives on benign cases no worse than baseline',
    (candidate.benign.fpRate ?? 0) <= (baseline.benign.fpRate ?? 0) + t.maxFpRateDelta,
    `candidate ${candidate.benign.fpRuns}/${candidate.benign.runs} runs, baseline ${baseline.benign.fpRuns}/${baseline.benign.runs}`
  );
  add(
    'leak into sibling domains is low',
    (candidate.sibling.leakRate ?? 0) <= t.maxLeakRate,
    `${candidate.sibling.leakRuns}/${candidate.sibling.runs} sibling runs reported another domain's defect, limit ${t.maxLeakRate}`
  );
  // Informational: on the gold sets the judge agreed with the expected evidence rating only 61 to 92
  // percent of the time, so this number is reported and does not decide pass or fail.
  add(
    'evidence completeness (informational)',
    (candidate.findings.evidenceComplete ?? 1) >= (baseline.findings.evidenceComplete ?? 0) - t.evidenceTolerance,
    `candidate ${candidate.findings.evidenceComplete}, baseline ${baseline.findings.evidenceComplete}`,
    true
  );
  add('no failed runs', candidate.failedRuns === 0, `${candidate.failedRuns} of ${candidate.totalRuns} runs failed`);
  return { pass: checks.filter((c) => !c.informational).every((c) => c.ok), checks };
}

module.exports = { LABELS, EVIDENCE, recordProblems, summarise, compare };
