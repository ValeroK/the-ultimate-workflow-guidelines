'use strict';

// Scoring for behavioural evals.
//
// Tests cover the deterministic parts of this plugin. Evals cover the parts
// that are not: did the agent take the right trajectory, read the right files,
// leave alone what it should have. Without both, the practice is vibe coding
// no matter how good the prompts -- which is the standard this plugin sells,
// so it has to meet it.
//
// Everything here scores TRAJECTORY, not prose. "Did it open memory/x.md" and
// "did it touch these three lines" are observable facts with far lower variance
// than a judgement about output quality. That matters because the agents are
// not deterministic: two identical /harvest runs in this repo produced
// different proposals. Scoring facts keeps the signal above that noise.

/** Does a recorded path match an expectation? Suffix match, separator-agnostic. */
function pathMatches(recorded, expected) {
  const norm = (s) => String(s).replace(/\\/g, '/').toLowerCase();
  const r = norm(recorded);
  const e = norm(expected);
  return r === e || r.endsWith(`/${e}`) || r.includes(`/${e}/`) || norm(r).endsWith(e);
}

function anyMatches(recordedList, expected) {
  return (recordedList || []).some((r) => pathMatches(r, expected));
}

/**
 * Score one fixture run.
 *
 * @param {object} fixture     { id, mustRead, mustNotRead, mustWrite, mustNotWrite, mustMention, mustNotMention }
 * @param {object} trajectory  { filesRead, filesWritten, summary }
 * @returns {{ id, pass, failures, checks }}
 */
function score(fixture, trajectory) {
  const failures = [];
  const checks = [];

  const read = trajectory.filesRead || [];
  const written = trajectory.filesWritten || [];
  const said = String(trajectory.summary || '').toLowerCase();

  const check = (ok, label, detail) => {
    checks.push({ ok, label });
    if (!ok) failures.push(detail);
  };

  for (const f of fixture.mustRead || []) {
    check(anyMatches(read, f), `read ${f}`, `did not read ${f} -- retrieval did not fire`);
  }

  // Negative controls. Without these the eval rewards over-retrieval, which
  // would silently undo the point of moving anything out of always-on context
  // while still scoring well.
  for (const f of fixture.mustNotRead || []) {
    check(!anyMatches(read, f), `did not read ${f}`, `read ${f} unnecessarily -- over-retrieval`);
  }

  for (const f of fixture.mustWrite || []) {
    check(anyMatches(written, f), `wrote ${f}`, `did not write ${f}`);
  }

  for (const f of fixture.mustNotWrite || []) {
    check(!anyMatches(written, f), `did not write ${f}`, `wrote ${f}, which was out of scope`);
  }

  for (const phrase of fixture.mustMention || []) {
    check(
      said.includes(String(phrase).toLowerCase()),
      `mentioned "${phrase}"`,
      `never mentioned "${phrase}" -- the constraint was not surfaced`
    );
  }

  for (const phrase of fixture.mustNotMention || []) {
    check(
      !said.includes(String(phrase).toLowerCase()),
      `did not mention "${phrase}"`,
      `mentioned "${phrase}", which it should not have`
    );
  }

  return { id: fixture.id, pass: failures.length === 0, failures, checks };
}

/**
 * Compare a whole run under two configurations.
 *
 * The unit of rollback is a fixture, not the whole change: if `thin` loses one
 * fixture, restore the section that fixture covers rather than reverting
 * everything. Deciding that here, in code, rather than under pressure later.
 */
function compare(fatResults, thinResults) {
  const byId = new Map(fatResults.map((r) => [r.id, r]));
  const regressions = [];
  const fixes = [];
  const stable = [];

  for (const thin of thinResults) {
    const fat = byId.get(thin.id);
    if (!fat) continue;
    if (fat.pass && !thin.pass) regressions.push({ id: thin.id, failures: thin.failures });
    else if (!fat.pass && thin.pass) fixes.push(thin.id);
    else stable.push({ id: thin.id, pass: thin.pass });
  }

  return {
    regressions,
    fixes,
    stable,
    verdict: regressions.length
      ? `REGRESSION on ${regressions.map((r) => r.id).join(', ')} -- restore the section each covers, not the whole change`
      : 'No detected regression. One run per cell supports nothing stronger than that.',
  };
}

module.exports = { score, compare, pathMatches };
