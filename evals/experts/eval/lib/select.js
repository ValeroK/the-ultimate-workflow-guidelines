'use strict';

// Selection scoring: with every expert description in the list at once, which experts does
// a model name for each corpus case? Pure arithmetic over recorded answers.
//
// selections: [{ origin, caseId, chosen: [expertName, ...], failed }]
//   origin is "<expert>:<kind>", the corpus the case came from.
// A failed selection counts against the expert that should have been chosen and is never
// treated as "chose nothing".

const ratio = (n, d) => (d === 0 ? null : n / d);

function selectionProblems(sel, experts) {
  const p = [];
  if (!sel || typeof sel !== 'object') return ['selection is not an object'];
  const m = /^([a-z]+):(seeded|benign|sibling)$/.exec(sel.origin || '');
  if (!m) p.push(`bad origin ${sel.origin}`);
  else if (!experts.includes(m[1])) p.push(`origin names unknown expert ${m[1]}`);
  if (!sel.caseId) p.push('caseId missing');
  if (typeof sel.failed !== 'boolean') p.push('failed must be boolean');
  if (!Array.isArray(sel.chosen)) p.push('chosen must be an array');
  else for (const c of sel.chosen) if (!experts.includes(c)) p.push(`chose unknown expert ${c}`);
  return p;
}

function score(experts, selections) {
  for (const s of selections) {
    const bad = selectionProblems(s, experts);
    if (bad.length > 0) throw new Error(`bad selection for ${s && s.caseId}: ${bad.join('; ')}`);
  }
  const perExpert = {};
  const matrix = {};
  for (const s of selections) {
    const key = s.origin;
    matrix[key] = matrix[key] || { cases: 0, failed: 0 };
    matrix[key].cases += 1;
    if (s.failed) matrix[key].failed += 1;
    for (const c of s.failed ? [] : s.chosen) matrix[key][c] = (matrix[key][c] || 0) + 1;
  }
  for (const e of experts) {
    const own = selections.filter((s) => s.origin === `${e}:seeded`);
    const ownBenign = selections.filter((s) => s.origin === `${e}:benign`);
    // Cases from another domain: other experts' seeded cases and this expert's own sibling cases.
    const foreign = selections.filter((s) => (s.origin.endsWith(':seeded') && !s.origin.startsWith(`${e}:`)) || s.origin === `${e}:sibling`);
    const hit = (list) => list.filter((s) => !s.failed && s.chosen.includes(e)).length;
    perExpert[e] = {
      ownRecall: ratio(hit(own), own.length),
      ownHits: hit(own),
      ownCases: own.length,
      benignChosen: ratio(hit(ownBenign), ownBenign.length),
      cofireRate: ratio(hit(foreign), foreign.length),
      cofireHits: hit(foreign),
      foreignCases: foreign.length,
      failed: [...own, ...ownBenign, ...foreign].filter((s) => s.failed).length,
    };
  }
  return { perExpert, matrix };
}

function compare(result, t) {
  const checks = [];
  for (const [e, r] of Object.entries(result.perExpert)) {
    checks.push({ name: `${e}: chosen when it applies`, ok: r.ownRecall !== null && r.ownRecall >= t.minSelectionRecall, detail: `${r.ownHits}/${r.ownCases}, minimum ${t.minSelectionRecall}` });
    checks.push({ name: `${e}: not chosen for other domains`, ok: (r.cofireRate ?? 0) <= t.maxCofireRate, detail: `${r.cofireHits}/${r.foreignCases}, limit ${t.maxCofireRate}` });
    checks.push({ name: `${e}: no failed selections`, ok: r.failed === 0, detail: `${r.failed} failed` });
  }
  return { pass: checks.every((c) => c.ok), checks };
}

module.exports = { selectionProblems, score, compare };
