'use strict';

// Gate predicates. Pure functions of (state, input) -> decision.
//
// Nothing here touches the filesystem, the environment, or stdout. That is what
// makes the gate table in PRD-graph-orchestration.md sections 5 and 5.1
// testable row by row, and it keeps the vendor adapters trivial: they translate
// wire formats, these decide.

const { ROUND_CAP } = require('./state.js');

const DOC_EXTENSIONS = new Set(['.md', '.txt']);

/** Directory names that mark everything beneath them as test code. */
const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'spec', '__specs__', '__mocks__']);

function segments(p) {
  return String(p).split(/[\\/]+/).filter(Boolean);
}

function isDocPath(p) {
  const base = segments(p).pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return false;
  return DOC_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

/**
 * Whether a path is test code.
 *
 * The trap this must avoid is "test" as a substring: `latest.js`, `contest.ts`,
 * and `protest/index.js` are source. Matching is therefore on whole path
 * segments and on the `.test.` / `.spec.` / `_test.` / `_spec.` filename
 * conventions, never on a bare substring.
 */
function isTestPath(p) {
  const parts = segments(p);
  const base = parts.pop() || '';

  if (/\.(test|spec)\./i.test(base)) return true;
  if (/_(test|spec)\.[^.]+$/i.test(base)) return true;

  return parts.some((seg) => TEST_DIRS.has(seg.toLowerCase()));
}

/**
 * Reduce a tool's target to a project-relative path, or null when it falls
 * outside the project.
 *
 * Recorded payloads showed two things the documentation does not: `file_path`
 * is always absolute, and it is routinely outside `cwd` (scratchpad and temp
 * files). Both matter. An absolute path defeats `isTestPath`, because any
 * ancestor directory named `test` on the user's machine would match; and a
 * file outside the project must never be gated by that project's plan.
 */
function toProjectPath(cwd, target) {
  if (!target) return null;

  const norm = (s) => String(s).replace(/\\/g, '/').replace(/\/+$/, '');
  const t = norm(target);

  const isAbsolute = /^([a-zA-Z]:\/|\/)/.test(t);
  if (!isAbsolute) return t;
  if (!cwd) return null;

  const root = norm(cwd);
  // Windows paths are case-insensitive; POSIX ones are not.
  const windows = /^[a-zA-Z]:\//.test(root) || /^[a-zA-Z]:\//.test(t);
  const a = windows ? root.toLowerCase() : root;
  const b = windows ? t.toLowerCase() : t;

  if (b === a) return '';
  if (!b.startsWith(`${a}/`)) return null;
  return t.slice(root.length + 1);
}

function deny(reason) {
  return { allow: false, reason };
}

const ALLOW = { allow: true };

/**
 * G1, G2, B-G1, B-G2 -- the pre-edit gates.
 *
 * Documentation is always writable. That is not a loophole: the plan file, the
 * PRD, and the living docs are exactly what the blocked party is being told to
 * go and write.
 */
function preEditGate(state, input) {
  const { stage, data } = state;
  if (stage === 'none') return ALLOW;

  const raw = input && input.path;
  if (!raw) return ALLOW;

  // Files outside the project are never this project's business.
  const target = input.cwd ? toProjectPath(input.cwd, raw) : raw;
  if (target === null || target === '') return ALLOW;

  if (isDocPath(target)) return ALLOW;

  if (stage === 'bootstrap') {
    if (data.prd_confirmed !== true) {
      return deny(
        'Gate B-G1: prd_confirmed is not true in PRD.md. Confirm the PRD with the user before writing any source.'
      );
    }
    if (data.design_confirmed !== true) {
      return deny(
        'Gate B-G2: design_confirmed is not true in PRD.md. Confirm the system design and framework choices before scaffolding -- this is the decision that is hardest to reverse.'
      );
    }
    return ALLOW;
  }

  if (stage === 'feature') {
    if (data.plan_confirmed !== true) {
      return deny(
        `Gate G1: plan_confirmed is not true in ${state.file || 'the plan file'}. Write the plan and get it confirmed before editing source.`
      );
    }
    // G6: which domain experts apply must be decided before source is written, so
    // that their plan-stage input has had a chance to shape it. "None" is a decision
    // (`experts: []`); only an absent line is a block, and the message says how to
    // write one.
    if (data.experts === undefined && !isTestPath(target)) {
      return deny(
        `Gate G6: no domain-experts decision is recorded in ${state.file || 'the plan file'}. Run the experts step of /ultimate-workflow:plan, or record that none apply with \`node experts/experts.js select --plan <plan file> --add ""\`.`
      );
    }
    if (data.tests_confirmed !== true && !isTestPath(target)) {
      return deny(
        `Gate G2: tests_confirmed is not true in ${state.file || 'the plan file'}. Write the tests first -- test files are not blocked by this gate.`
      );
    }
    return ALLOW;
  }

  return ALLOW;
}

/**
 * G3 -- coding must route through verification.
 *
 * Blocks turn completion while source has changed since the last green run.
 * Steps aside once the run has escalated, because at that point the human is
 * being asked to decide, not to run tests again.
 */
function stopGate(state, opts = {}) {
  const { stage, data } = state;
  if (stage === 'none') return ALLOW;
  if (data.escalated === true) return ALLOW;
  if (data.dirty !== true) return ALLOW;

  // With no verification command configured -- which is exactly what the
  // shipped plan template defaults to -- nothing can ever clear `dirty`, so
  // blocking here makes every turn end unsatisfiable until the host's
  // consecutive-block override fires. A gate that cannot be satisfied is worse
  // than no gate, so this one steps aside; `status.js` reports it as inactive.
  const cmd = data.test_command || data.build_command;
  if (!cmd) return ALLOW;

  // The plugin's verify.js runs only the tests related to the change, or the full suite when the
  // narrow run cannot be trusted; any passing run of it clears this gate (4.1.1).
  const how = opts.verifyScript
    ? `Run \`${opts.verifyScript}\` (the tests related to your changes, or the full suite when it must) and get it passing before ending the turn.`
    : `Run \`${cmd}\` and get it passing before ending the turn.`;
  return deny(`Gate G3: source changed since the last green verification. ${how}`);
}

/**
 * G7 -- no commit until a passing full test run covers these exact changes (4.1.1).
 *
 * While working, G3 accepts the related tests; the full suite runs once, here. `ev` is gathered
 * by verify.fullEvidence: the fingerprint of the uncommitted changes and the last full run's
 * record. Any edit after the run changes the fingerprint. Docs-only and empty commits come with
 * `skip`. No test_command: nothing to run, so it steps aside, like G3.
 */
function fullSuiteGate(state, ev, script) {
  // Feature work only, like G6's plan check: at bootstrap the gates write their state into PRD.md,
  // which is part of the fingerprinted changes, so a record could never be current there.
  if (!state || state.stage !== 'feature') return ALLOW;
  const cmd = state.data && state.data.test_command;
  if (!cmd || !ev || ev.skip) return ALLOW;
  const run = script ? `\`${script} --full\`` : `\`${cmd}\``;
  const r = ev.record;
  const full = r && r.mode === 'full' && r.passed === true;
  if (full && r.fingerprint === ev.hash) return ALLOW;
  if (full) return deny(`Gate G7: the changes have changed since the last passing full test suite run. Run ${run} once, then commit again.`);
  return deny(`Gate G7: no passing full test suite run covers these changes (only related tests ran, or none, or the last full run failed). Run ${run} once, then commit again.`);
}

/**
 * Whether a shell command runs `git commit`. Looks at each simple command, skips
 * leading assignments and git's own options, and compares the subcommand exactly, so
 * `git log --grep=commit` and `git commit-tree` do not match. A commit hidden inside
 * `bash -c "..."` is not seen; the gates are a backstop and say so.
 */
function isCommitCommand(command) {
  for (const seg of String(command || '').split(/&&|\|\||[;|\n]/)) {
    const t = seg.replace(/^[\s(]+/, '').split(/\s+/);
    let i = 0;
    while (i < t.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i])) i++;
    if (t[i] !== 'git') continue;
    i++;
    while (i < t.length && t[i].startsWith('-')) {
      i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(t[i]) ? 2 : 1;
    }
    if (t[i] === 'commit') return true;
  }
  return false;
}

/**
 * G6 -- no commit until the domain experts have been re-checked and have reviewed
 * these exact changes.
 *
 * `ev` is gathered by experts.js commitEvidence: the fingerprint of the uncommitted
 * changes, the last re-check, and which experts have a review record at which
 * fingerprint. A change after the review makes the fingerprints differ, so the gate
 * fires again. The final set may not drop an expert the plan named: the re-check can
 * only add, and this is where that is held to account rather than trusted.
 */
function commitGate(ev) {
  if (!ev || ev.skip) return ALLOW;
  const how = 'Run /ultimate-workflow:experts, which re-asks which domain experts apply (it can only add) and runs them, then commit again.';

  if (!ev.recheck || ev.recheck.hash !== ev.hash) {
    return deny(`Gate G6: the domain experts have not been re-checked against these changes. ${how}`);
  }
  const final = ev.recheck.final || [];
  const dropped = (ev.planExperts || []).filter((n) => !final.includes(n));
  if (dropped.length > 0) {
    return deny(`Gate G6: the re-check dropped ${dropped.join(', ')}, which the plan named. Experts can be added, never removed. ${how}`);
  }
  const missing = final.filter((n) => (ev.records || {})[n] !== ev.hash);
  if (missing.length > 0) {
    return deny(`Gate G6: no review from ${missing.join(', ')} covers these changes. ${how}`);
  }

  // A high-confidence finding is raised and resolved before the commit, not reported and left.
  // The agent that wrote the code cannot dismiss one: the message says so, and who can.
  const open = ev.open || [];
  if (open.length > 0) {
    const shown = open.slice(0, 5).map((f) => `  - [${f.id}] ${f.expert}: ${f.file}${f.line ? `:${f.line}` : ''} ${f.what}`);
    const more = open.length > shown.length ? `\n  ...and ${open.length - shown.length} more (node experts/experts.js findings lists them all)` : '';
    return deny(
      `Gate G6: ${open.length} high-confidence finding${open.length === 1 ? ' is' : 's are'} still open:\n${shown.join('\n')}${more}\nTell the user what each one is. Fix it and run /ultimate-workflow:experts again, or, only if the user says to, dismiss it with: node experts/experts.js resolve --id <id> --reason "<the user's words>". Do not dismiss one on your own authority.`
    );
  }
  return ALLOW;
}

/**
 * G4 -- the round cap.
 *
 * Returns a patch rather than writing, so the caller owns I/O and this stays
 * testable. `alreadyEscalated` lets the caller avoid announcing an escalation
 * twice.
 */
function roundCap(state, input) {
  const data = state.data || {};
  const rounds = Number(data.verify_rounds) || 0;
  const alreadyEscalated = data.escalated === true;

  if (input && input.passed) {
    // gate_violation is cleared here too. It records an edit that a
    // detect-only host let through; once verification is green that edit has
    // been dealt with, and continuing to quote it in stop messages would
    // accuse the user of a problem they already fixed.
    return {
      patch: { verify_rounds: 0, last_verify: 'green', dirty: false, escalated: false, gate_violation: '' },
      escalated: false,
      alreadyEscalated,
    };
  }

  const next = rounds + 1;
  const escalated = alreadyEscalated || next >= ROUND_CAP;
  return {
    patch: { verify_rounds: next, last_verify: 'red', escalated },
    escalated,
    alreadyEscalated,
  };
}

function nextAction(stage, data) {
  if (stage === 'bootstrap') {
    if (data.prd_confirmed !== true) return 'confirm the PRD with the user';
    if (data.design_confirmed !== true) return 'confirm the system design and framework choices';
    if (data.scaffold_verify !== 'green') return 'verify the scaffold builds';
    return 'complete the living docs, then hand off to feature work';
  }
  if (data.plan_confirmed !== true) return 'write and confirm the plan';
  if (data.tests_confirmed !== true) return 'write and confirm the test plan';
  if (data.dirty === true) return 'run the tests';
  return 'proceed with the plan';
}

/**
 * G5 -- the phase pointer. One line of injected context per prompt, so the
 * current stage survives compaction.
 */
function phasePointer(state, input) {
  const { stage, data } = state;
  if (stage === 'none') return '';

  const availability = input && input.workflowsAvailable ? 'workflows available' : 'workflows unavailable';

  if (data.escalated === true) {
    const rounds = Number(data.verify_rounds) || 0;
    return `[ultimate-workflow] stage: ${stage}; ESCALATED after ${rounds} verify rounds. Stop, state the problem, present 2-3 options with tradeoffs, and wait for the user. (${availability})`;
  }

  return `[ultimate-workflow] stage: ${stage}; next: ${nextAction(stage, data)}. (${availability})`;
}

module.exports = {
  toProjectPath,
  isDocPath,
  isTestPath,
  preEditGate,
  stopGate,
  isCommitCommand,
  commitGate,
  fullSuiteGate,
  roundCap,
  phasePointer,
};
