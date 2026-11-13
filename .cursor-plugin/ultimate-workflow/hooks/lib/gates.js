'use strict';

// Gate predicates. Pure functions of (state, input) -> decision.
//
// Nothing here touches the filesystem, the environment, or stdout. That is what
// makes the gate table in PRD-graph-orchestration.md sections 5 and 5.1
// testable row by row, and it keeps the vendor adapters trivial: they translate
// wire formats, these decide.


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

/** Diagram source formats: never application code, so writable anywhere. */
const DIAGRAM_SOURCE_EXTENSIONS = new Set(['.mmd', '.mermaid', '.puml', '.plantuml', '.drawio', '.excalidraw', '.d2']);
/** Rendered formats that are also routinely application source, so only under a `docs` folder. */
const DIAGRAM_RENDERED_EXTENSIONS = new Set(['.html', '.htm', '.svg', '.png']);

/**
 * Whether a path is a diagram. A plan needs one before it is confirmed, so the
 * pre-edit gates let these through and an edit to one does not mark the tree
 * dirty. Kept apart from isDocPath on purpose: verify.js, the commit gates and
 * expert selection still treat a diagram as a change worth reviewing.
 */
function isDiagramPath(p) {
  const parts = segments(p);
  const base = parts.pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return false;
  const ext = base.slice(dot).toLowerCase();
  if (DIAGRAM_SOURCE_EXTENSIONS.has(ext)) return true;
  return DIAGRAM_RENDERED_EXTENSIONS.has(ext) && parts.some((s) => s.toLowerCase() === 'docs');
}

/**
 * The plugin's own scratch folder, `.ultimate-workflow/run/`: the phase commands write their
 * arguments and the ledger row there with the Write tool (`tests.args.json`, `plan.row.json`), and
 * must be able to once a plan is accepted and before the tests are confirmed. It is not source.
 * Only that folder: the evidence the commit gate reads (`.ultimate-workflow/experts/`, the
 * snapshots) stays gated, so a Write cannot forge it. Any `.` or `..` segment disqualifies the
 * path, so `.ultimate-workflow/run/../experts/x.json` does not slip through.
 */
function isRunPath(p) {
  const parts = segments(p);
  if (parts.length < 3) return false;
  if (parts.some((s) => s === '.' || s === '..')) return false;
  return parts[0].toLowerCase() === '.ultimate-workflow' && parts[1].toLowerCase() === 'run';
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
// A fingerprint that moved with no code edit is usually a file the tests or the app rewrite (4.2.1).
const VOLATILE_HINT = 'If you have not changed code since, a file your tests or app rewrite is moving it: list that file in the plan\'s `volatile_paths` (verify.js names the files a run rewrote).';

function expertsGate(ev) {
  if (!ev || ev.skip) return ALLOW;
  const how = 'Run /ultimate-workflow:experts, which re-asks which domain experts apply (it can only add) and runs them, then commit again.';

  if (!ev.recheck) {
    return deny(`Gate G6: the domain experts have not been re-checked against these changes. ${how}`);
  }
  if (ev.recheck.hash !== ev.hash) {
    return deny(`Gate G6: the domain experts have not been re-checked against these changes. ${how} ${VOLATILE_HINT}`);
  }
  const final = ev.recheck.final || [];
  const dropped = (ev.planExperts || []).filter((n) => !final.includes(n));
  if (dropped.length > 0) {
    const who = ev.cards && ev.cards.length > 0 ? `card ${ev.cards.join(', ')} names` : 'the plan named';
    return deny(`Gate G6: the re-check dropped ${dropped.join(', ')}, which ${who}. Experts can be added, never removed. ${how}`);
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
 * The one commit decision (PLAN-simplify, card commit-check). The hook, the run's `card-commit`, the
 * status report and `experts.js check` all ask this and nothing else. `ev` is gathered by experts.js
 * commitEvidence. It lists everything missing, not just the first thing, each with one fix command,
 * in the order confirmation, tests, experts, memory.
 *
 * Returns { allow, reason, warnings?, missing: [{ kind, text, fix }] } for a refusal. An allow carries no
 * `reason` and no `missing` (the 4.8.0 shape, pinned by gates.test.js); it carries `outcome` only when
 * the commit was not checked:
 *   outcome 'exempt'          -- nothing to check, with `why` (documentation only, nothing to commit, ...);
 *   outcome 'could-not-check' -- the working tree could not be inspected, with `why`. By hand this lets
 *                                the commit through and says so; the unattended run parks the card.
 * `reason` is the item texts joined, so with one item it is exactly that item's wording. `notices` lists
 * plan settings changed since the confirmation (shown, never a refusal).
 *
 *   confirmation: plan and tests confirmed, and the plan unchanged since (feature work).
 *   tests:        a passing full run on exactly these changes (G7).
 *   experts:      the domain experts reviewed exactly these changes, no open high finding (G6).
 *   memory:       this commit does not leave memory newly broken. Judged even for a documentation-only
 *                 commit.
 */
function commitGate(ev) {
  if (ev && ev.couldNotCheck) return { allow: true, outcome: 'could-not-check', why: ev.couldNotCheck };
  const { added = [], existing = [], error: memoryError } = (ev && ev.memory) || {};
  // A memory that cannot be read at all (a malformed index) lets the commit through, as in 4.8.0 (memory-gate.test.js
  // pins it); the check says it did not run, as a warning.
  const unread = memoryError ? [`the memory check did not run: the memory could not be read (${memoryError})`] : [];
  const warned = [...existing.map((p) => p.text), ...unread];
  const warnings = warned.length > 0 ? { warnings: warned } : {};
  // A commit that is only documentation, or empty, is exempt from confirmation, tests and experts together.
  const exemptAll = Boolean(ev && ev.skip && (!ev.tests || ev.tests.skip));
  const missing = [];
  const confirmation = exemptAll ? null : confirmationItem(ev);
  if (confirmation) missing.push(confirmation);
  const tests = testsItem(ev);
  if (tests) missing.push(tests);
  if (ev && ev.expertsError && !ev.skip) missing.push({ kind: 'experts', text: `Gate G6: ${ev.expertsError}. Run /ultimate-workflow:experts, then commit again.`, fix: '/ultimate-workflow:experts' });
  else {
    const verdict = expertsGate(ev);
    if (!verdict.allow) missing.push({ kind: 'experts', text: verdict.reason, fix: '/ultimate-workflow:experts' });
  }
  if (added.length > 0) {
    const stale = added.some((p) => p.kind === 'index');
    const hint = stale ? '\nFix the index with: node experts/experts.js memory index' : '';
    missing.push({ kind: 'memory', text: `Memory check: this commit leaves memory broken:\n${added.map((p) => `  - ${p.text}`).join('\n')}${hint}`, fix: stale ? 'node experts/experts.js memory index' : 'fix the files named above' });
  }
  const changed = (ev && ev.confirmation && ev.confirmation.settingsChanged) || [];
  const planChanged = Boolean(ev && ev.confirmation && ev.confirmation.changedSince);
  const noticeList = [...(planChanged ? ['the plan changed after you confirmed it; re-confirm when convenient'] : []), ...(changed.length > 0 ? [`${changed.join(', ')} changed since the plan was confirmed`] : [])];
  const notices = noticeList.length > 0 ? { notices: noticeList } : {};
  if (missing.length > 0) return { allow: false, reason: missing.map((m) => m.text).join('\n'), missing, ...notices, ...warnings };
  if (exemptAll) return { allow: true, outcome: 'exempt', why: ev.skip, ...notices, ...warnings };
  return { allow: true, ...notices, ...warnings };
}

/** What a decision is recorded as (the stamp, status, card-commit): its outcome, why, and the kinds missing. */
function checkRecord(verdict) {
  return {
    outcome: verdict.outcome || (verdict.allow ? 'checked' : 'refused'),
    ...(verdict.why ? { why: verdict.why } : {}),
    missing: (verdict.missing || []).map((m) => m.kind),
    ...(verdict.notices ? { notices: verdict.notices } : {}),
  };
}

/** Where a user confirms: the same command for both flags, named per flag. */
const confirmFix = (flag) => `node experts/experts.js present --confirm ${flag}`;

/** The confirmation part of commitGate: both confirmations given, and the plan text unchanged since. */
function confirmationItem(ev) {
  const c = ev && ev.confirmation;
  if (!c) return null;
  if (c.error) return { kind: 'confirmation', text: `Confirmation: ${c.error}, so it cannot be shown to be confirmed. Fix: ${confirmFix('tests_confirmed')}`, fix: confirmFix('tests_confirmed') };
  if (c.ok) return null;
  const fix = confirmFix(c.missing === 'plan' ? 'plan_confirmed' : 'tests_confirmed');
  return { kind: 'confirmation', text: `Confirmation: ${c.reason}. Once the user agrees: ${fix}`, fix };
}

/** The full-suite part of commitGate (G7): feature work with a test_command, unless the evidence says to skip. */
function testsItem(ev) {
  const t = ev && ev.tests;
  if (!t || t.skip) return null;
  const run = t.script ? `\`${t.script} --full\`` : `\`${t.command}\``;
  const fix = t.script ? `${t.script} --full` : t.command;
  if (t.unreadable) return { kind: 'tests', text: `Gate G7: ${t.unreadable}, so the test command is unknown. Fix the plan, then run ${run}.`, fix };
  if (t.noCommand) return { kind: 'tests', text: "Gate G7: the plan has no test_command, so no full test run can cover these changes. Fix: set test_command in the plan's front matter, then run the full suite with the verify script, then commit again.", fix: "set test_command in the plan's front matter, then run the full suite" };
  if (!t.command) return null;
  const r = t.record;
  const full = r && r.mode === 'full' && r.passed === true;
  if (full && typeof r.fingerprint === 'string' && r.fingerprint === t.hash) return null;
  const why = t.problem ? ` (${t.problem})` : '';
  if (full && typeof r.fingerprint === 'string') return { kind: 'tests', text: `Gate G7: the changes have changed since the last passing full test suite run. Run ${run} once, then commit again. ${VOLATILE_HINT}`, fix };
  return { kind: 'tests', text: `Gate G7: no passing full test suite run covers these changes (only related tests ran, or none, or the last full run failed)${why}. Run ${run} once, then commit again.`, fix };
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
  return 'proceed with the plan';
}

/**
 * The phase pointer. One line of injected context per prompt, so the current stage survives
 * compaction.
 */
function phasePointer(state, input) {
  const { stage, data } = state;
  if (stage === 'none') return '';
  const availability = input && input.workflowsAvailable ? 'workflows available' : 'workflows unavailable';
  return `[ultimate-workflow] stage: ${stage}; next: ${nextAction(stage, data)}. (${availability})`;
}

/**
 * The reminders (PLAN-simplify, card reminders): short lines that say what is not done yet. They replace the
 * edit and turn-end blocks, so they only ever remind: nothing here refuses, and nothing is written. The one
 * place that refuses is the commit check (commitGate). Computed from the plan, the PRD and one fact the
 * caller gathers, \`codeChanged\` (the changes differ from the last passing full run), so no flag has to be
 * kept in the plan. Sent at the start of a turn and at its end, never on an edit.
 *
 * input: { codeChanged, script } -- script names the verify runner in the fix command.
 */
function reminders(state, input = {}) {
  const out = [];
  if (!state || state.stage === 'none') return out;
  const data = state.data || {};
  if (state.stage === 'bootstrap') {
    if (data.prd_confirmed !== true) out.push('The PRD is not confirmed yet (prd_confirmed in PRD.md): confirm it with the user before writing source.');
    else if (data.design_confirmed !== true) out.push('The system design is not confirmed yet (design_confirmed in PRD.md): confirm it with the user before scaffolding.');
    return out;
  }
  if (!state.file) {
    if (state.several && state.several.length > 1) out.push('Several plans are open and none is chosen, so commits are not checked: pick one with node experts/experts.js use --plan <file>.');
    return out;
  }
  if (data.plan_confirmed !== true) out.push(`The plan is not confirmed yet. When the user agrees: ${confirmFix('plan_confirmed')}`);
  if (data.tests_confirmed !== true) out.push(`The test plan is not confirmed yet. When the user agrees: ${confirmFix('tests_confirmed')}`);
  if (input.codeChanged && data.test_command) out.push(`Code changed since the last full test run: run ${input.script ? `\`${input.script} --full\`` : `\`${data.test_command}\``} before committing.`);
  return out;
}

module.exports = {
  toProjectPath,
  isDocPath,
  isDiagramPath,
  isRunPath,
  isTestPath,
  isCommitCommand,
  commitGate,
  checkRecord,
  reminders,
  phasePointer,
};
