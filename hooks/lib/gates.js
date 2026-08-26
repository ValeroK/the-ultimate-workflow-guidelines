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
function stopGate(state) {
  const { stage, data } = state;
  if (stage === 'none') return ALLOW;
  if (data.escalated === true) return ALLOW;
  if (data.dirty !== true) return ALLOW;

  const cmd = data.test_command || data.build_command || 'the project test command';
  return deny(
    `Gate G3: source changed since the last green verification. Run \`${cmd}\` and get it passing before ending the turn.`
  );
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
  roundCap,
  phasePointer,
};
