'use strict';

// The value ledger (PLAN-value-ledger.md, decided 2026-10-29): one append-only JSON line per phase
// run and per catch, in .ultimate-workflow/ledger.jsonl, and a report built from it in code. On the
// CEO dashboard run all of this was kept by hand. Code records and adds up; it never judges: whether
// a catch was unique to the experts, or real, is the user's or the session's call, recorded as said.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PHASES = ['plan', 'tests', 'build', 'review', 'experts', 'harvest'];
const STAGES = ['plan', 'tests', 'build', 'review'];
const ORIGIN = /^(expert:[a-z][a-z0-9-]*|critic|draft|lens:[a-z][a-z0-9-]*|user|build-agent)$/;
const UNIQUE = ['yes', 'no', 'unknown'];

const file = (cwd) => path.join(cwd, '.ultimate-workflow', 'ledger.jsonl');
const newId = () => crypto.randomBytes(4).toString('hex');

function readAll(cwd) {
  let text = '';
  try {
    text = fs.readFileSync(file(cwd), 'utf8');
  } catch {
    return [];
  }
  return text.split(/\r?\n/).filter(Boolean).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
}

function append(cwd, entry) {
  fs.mkdirSync(path.dirname(file(cwd)), { recursive: true });
  fs.appendFileSync(file(cwd), `${JSON.stringify(entry)}\n`);
  return entry;
}

const basisKind = (f) => (/^(skill|reference|general)\b/.exec(String(f.basis || '').trim()) || [])[1] || 'missing';
const basisSkill = (f) => (basisKind(f) === 'skill' ? String(f.basis).trim().slice(6).split('#')[0].trim() : null);

/**
 * One phase run. `row` holds what only the session saw (run id, agents, tokens, duration,
 * workarounds); `result` is the workflow's own result, read from its file, from which the experts,
 * skills, findings and cases are taken, so nothing about them is retyped.
 */
function addRun(cwd, phase, row, result) {
  if (!PHASES.includes(phase)) throw new Error(`unknown phase "${phase}" (expected ${PHASES.join(', ')})`);
  if (!row || typeof row !== 'object') throw new Error('the row must be a JSON object');
  if (typeof row.runId !== 'string' || !row.runId.trim()) throw new Error('the row needs runId (the Workflow run id)');
  if (typeof row.tokens !== 'number' || !(row.tokens >= 0)) throw new Error('the row needs tokens (subagent tokens, a number from the Workflow result)');
  const lane = (result && result.expertLane) || {};
  const entry = {
    kind: 'run',
    id: newId(),
    at: new Date().toISOString(),
    phase,
    runId: row.runId.trim(),
    tokens: row.tokens,
    ...(typeof row.agents === 'number' ? { agents: row.agents } : {}),
    ...(typeof row.durationMs === 'number' ? { durationMs: row.durationMs } : {}),
    ...(typeof row.plan === 'string' && row.plan ? { plan: row.plan } : {}),
    ok: Boolean(result && result.ok),
    workarounds: (Array.isArray(row.workarounds) ? row.workarounds : []).filter((w) => typeof w === 'string' && w.trim()),
    experts: { selected: lane.selected || [], ran: lane.ran || [], failed: lane.failed || [] },
    skillsLoaded: lane.skillsLoaded || (result && Array.isArray(result.skillsLoaded) ? { build: result.skillsLoaded } : {}),
    ...(lane.skipped ? { skipped: lane.skipped } : {}),
  };
  if (phase === 'tests' && lane.casesAdded) entry.casesAdded = lane.casesAdded;
  if (phase === 'build' && result) {
    entry.build = { green: Boolean(result.green), rounds: result.rounds || null, briefs: result.briefsLoaded || [], ...(result.resumedAt ? { resumedAt: result.resumedAt } : {}) };
  }
  if (phase === 'review' || phase === 'experts') {
    const found = Array.isArray(lane.findings) ? lane.findings : [];
    const byBasis = { skill: 0, reference: 0, general: 0, missing: 0 };
    const cited = {};
    for (const f of found) {
      byBasis[basisKind(f)] += 1;
      const s = basisSkill(f);
      if (s) (cited[f.expert] = cited[f.expert] || new Set()).add(s);
    }
    const loaded = lane.skillsLoaded || {};
    entry.review = {
      findings: found.length,
      byBasis,
      uncited: Object.fromEntries(Object.entries(loaded).map(([n, list]) => [n, (list || []).filter((s) => !(cited[n] && cited[n].has(s)))])),
      core: Array.isArray(result && result.findings) ? result.findings.filter((f) => !(lane.ran || []).includes(f.lens)).length : 0,
      ...(lane.delta ? { delta: { files: (lane.delta.files || []).length, chain: lane.delta.chain || 1 } } : {}),
    };
  }
  return append(cwd, entry);
}

/** A catch: something an expert, a critic, a lens or the draft caught. Unconfirmed until evidence. */
function addCatch(cwd, { what, by, stage, unique = 'unknown', confirmed = '' }) {
  if (!what || String(what).trim().length < 5) throw new Error('catch needs --what with what was caught');
  if (!ORIGIN.test(String(by || ''))) throw new Error('catch needs --by: expert:<name>, critic, draft, lens:<name>, user or build-agent');
  if (!STAGES.includes(stage)) throw new Error(`catch needs --stage: ${STAGES.join(', ')}`);
  if (!UNIQUE.includes(unique)) throw new Error('--unique is yes, no or unknown');
  return append(cwd, {
    kind: 'catch', id: newId(), at: new Date().toISOString(), what: String(what).trim(), by, stage, unique,
    status: confirmed ? 'confirmed' : 'open', ...(confirmed ? { evidence: String(confirmed).trim() } : {}),
  });
}

/** Confirm or refute a catch later. Appended, so the history of the call stays readable. */
function settleCatch(cwd, id, status, text) {
  if (!['confirmed', 'refuted'].includes(status)) throw new Error('status is confirmed or refuted');
  if (!text || String(text).trim().length < 5) throw new Error(`${status === 'confirmed' ? 'confirm' : 'refute'} needs the evidence or the reason`);
  if (!readAll(cwd).some((e) => e.kind === 'catch' && e.id === id)) throw new Error(`no catch has id ${id} (experts.js ledger report lists them)`);
  return append(cwd, { kind: 'settle', at: new Date().toISOString(), ref: id, status, text: String(text).trim() });
}

/** Everything the ledger can say, added up in code. Nothing is estimated. */
function report(cwd) {
  const all = readAll(cwd);
  const runs = all.filter((e) => e.kind === 'run');
  const catches = all.filter((e) => e.kind === 'catch').map((c) => {
    const last = all.filter((e) => e.kind === 'settle' && e.ref === c.id).pop();
    return last ? { ...c, status: last.status, evidence: last.text } : c;
  });
  if (runs.length === 0 && catches.length === 0) return { empty: true, note: 'the ledger is empty: no phase has recorded a run in this repository yet' };

  const phases = {};
  for (const r of runs) {
    const p = (phases[r.phase] = phases[r.phase] || { runs: 0, tokens: 0, durationMs: 0, workarounds: 0 });
    p.runs += 1;
    p.tokens += r.tokens;
    p.durationMs += r.durationMs || 0;
    p.workarounds += (r.workarounds || []).length;
  }
  const total = Object.values(phases).reduce((t, p) => ({ runs: t.runs + p.runs, tokens: t.tokens + p.tokens, durationMs: t.durationMs + p.durationMs }), { runs: 0, tokens: 0, durationMs: 0 });

  const byStage = {};
  for (const c of catches) {
    const s = (byStage[c.stage] = byStage[c.stage] || { total: 0, confirmed: 0, refuted: 0, open: 0, uniqueToExperts: 0 });
    s.total += 1;
    s[c.status] += 1;
    if (c.by.startsWith('expert:') && c.unique === 'yes') s.uniqueToExperts += 1;
  }
  const byOrigin = {};
  for (const c of catches) byOrigin[c.by] = (byOrigin[c.by] || 0) + 1;
  const unique = catches.filter((c) => c.by.startsWith('expert:') && c.unique === 'yes');
  const judged = unique.filter((c) => c.status !== 'open');
  const precision = judged.length ? Math.round((unique.filter((c) => c.status === 'confirmed').length / judged.length) * 100) / 100 : null;

  const reviews = runs.filter((r) => r.review);
  const basis = { skill: 0, reference: 0, general: 0, missing: 0 };
  const skillUse = {};
  for (const r of reviews) {
    for (const k of Object.keys(basis)) basis[k] += r.review.byBasis[k] || 0;
    for (const [expert, list] of Object.entries(r.skillsLoaded || {})) {
      for (const s of list || []) {
        const key = `${expert}/${s}`;
        const u = (skillUse[key] = skillUse[key] || { loaded: 0, uncited: 0 });
        u.loaded += 1;
        if ((r.review.uncited[expert] || []).includes(s)) u.uncited += 1;
      }
    }
  }
  const findings = Object.values(basis).reduce((a, b) => a + b, 0);
  const neverCited = Object.entries(skillUse).filter(([, u]) => u.uncited === u.loaded).map(([k, u]) => ({ skill: k, loaded: u.loaded }));

  return {
    total,
    phases,
    catches: { total: catches.length, byStage, byOrigin, expertsUnique: { total: unique.length, confirmed: unique.filter((c) => c.status === 'confirmed').length, refuted: unique.filter((c) => c.status === 'refuted').length, precision }, list: catches },
    review: { runs: reviews.length, findings, byBasis: basis, skillShare: findings ? Math.round((basis.skill / findings) * 100) / 100 : null, neverCited },
    workarounds: runs.flatMap((r) => (r.workarounds || []).map((w) => ({ phase: r.phase, runId: r.runId, what: w }))),
  };
}

/** `experts.js ledger <add|catch|confirm|refute|report> ...` */
function cli(argv, cwd, out, fail) {
  const sub = argv[0];
  const o = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) fail(`ledger: unexpected argument ${a}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) fail(`ledger: ${a} needs a value`);
    o[a.slice(2)] = v;
    i += 1;
  }
  const readJson = (p) => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(cwd, p), 'utf8').replace(/^﻿/, ''));
    } catch (err) {
      throw new Error(`${p} is not readable JSON (${err.message})`);
    }
  };
  if (sub === 'add') {
    if (!o.phase || !o.row) fail('ledger add needs --phase <phase> --row <row.json> [--result <workflow result.json>]');
    return out(addRun(cwd, o.phase, readJson(o.row), o.result ? readJson(o.result) : null));
  }
  if (sub === 'catch') return out(addCatch(cwd, { what: o.what, by: o.by, stage: o.stage, unique: o.unique || 'unknown', confirmed: o.confirmed || '' }));
  if (sub === 'confirm' || sub === 'refute') return out(settleCatch(cwd, o.id, sub === 'confirm' ? 'confirmed' : 'refuted', o.text));
  if (sub === 'report') return out(report(cwd));
  return fail(`ledger: unknown subcommand ${sub || '(none)'} (expected add, catch, confirm, refute, report)`);
}

module.exports = { PHASES, file, readAll, addRun, addCatch, settleCatch, report, cli };
