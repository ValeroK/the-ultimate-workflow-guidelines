// Shared code of the phase scripts (PLAN-simplify, card shared-blocks).
//
// A phase script cannot import anything, so what several of them need used to be copied between them and held
// equal by tests. It lives here once. A phase script names the parts it uses with a line `// @shared <name>`,
// and experts.js `assemblePhase` replaces that line with the section below, both when it stages the script for
// the Workflow tool and when a test loads it, so tests run exactly what users run. This file is read from the
// plugin only, never from the project. It is not a module: its sections are pasted into a script body and use
// that body's globals (`args`, `agent`, `phase`, `log`). An error line number points into the assembled copy.

// @@section agent-names
// --- agent names (one section, used by every workflow) ---
// An installed plugin registers its agents as "<plugin>:<agent>", so a bare "uw-explorer"
// is "agent type not found". Every agentType goes through agentName(). A local run against
// agents copied to .claude/agents/ passes args.agentNamespace: "".
const AGENT_NAMESPACE = args && typeof args.agentNamespace === 'string' ? args.agentNamespace : 'ultimate-workflow:'
const agentName = (name) => (String(name).includes(':') ? name : AGENT_NAMESPACE + name)
// --- end agent names ---
// @@end agent-names

// @@section reader-model
// --- reader model (one section, used by plan and harvest) ---
// 4.2.0: the agents that only search and read run on a smaller model, chosen in code. `experts.js
// script` passes ULTIMATE_WORKFLOW_READER_MODEL as args.readerModel ("inherit" turns it off). A
// reader that returns nothing with the override is asked once more on the session model, so an
// install without that model loses nothing.
const READER_MODEL = args && typeof args.readerModel === 'string' && args.readerModel.trim() ? (args.readerModel.trim() === 'inherit' ? '' : args.readerModel.trim()) : 'haiku'
const asReader = async (prompt, opts) => {
  if (!READER_MODEL) return agent(prompt, opts)
  let first = null
  try {
    first = await agent(prompt, { ...opts, model: READER_MODEL, effort: 'low' })
  } catch {
    first = null
  }
  if (first) return first
  log(`${opts.label}: no answer on ${READER_MODEL}; retried on the session model`)
  return agent(prompt, opts)
}
// --- end reader model ---
// @@end reader-model

// @@section lane-helpers
// --- expert lane helpers (one section, used by plan.js, tests.js and review.js) ---
// The expert list is discovered by experts/experts.js from the agents folder and passed in
// as args.available, because a workflow script cannot read the folder itself.
const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((e) => String(e).trim()).filter(Boolean)
const wellFormedAvailable = (a) =>
  Array.isArray(a) && a.every((e) => e && typeof e.name === 'string' && typeof e.agent === 'string' && Array.isArray(e.stages))
const describeExperts = (a) => a.map((e) => `- ${e.name}: ${e.description}`).join('\n')
// A model answer is merged into the current set by code: it can add a name from the list and
// nothing else. A name that is not on the list is returned, never applied, and nothing is removed.
const addOnly = (current, answered, available) => {
  const known = available.map((e) => e.name)
  const names = [...new Set((answered || []).map((x) => String((x && x.name) || '').trim()).filter(Boolean))]
  const merged = [...new Set([...current, ...names.filter((n) => known.includes(n))])]
  return { experts: merged, added: merged.filter((n) => !current.includes(n)), rejected: names.filter((n) => !known.includes(n)) }
}
const takingPart = (available, selected, stage) =>
  selected.map((n) => available.find((e) => e.name === n)).filter((e) => e && e.stages.includes(stage))
// --- end expert lane helpers ---
// @@end lane-helpers

// @@section build-model
// --- build model (PLAN-run-records.md, W1) ---
// The agents that write the tests and the code run on Sonnet unless told otherwise, and the
// diagnosis on the session model. `experts.js script` passes ULTIMATE_WORKFLOW_BUILD_MODEL as
// args.implementerModel; a build.args.json value wins. "inherit" means the session model. Before
// this, every card needed a hand patch of the agent() options to set the model.
const MODEL_OK = /^(inherit|sonnet|opus|haiku|claude-[a-z0-9.-]+)$/
const modelArg = (v, fallback) => (v === undefined || v === null || v === '' ? fallback : v)
const IMPLEMENTER_MODEL = modelArg(args && args.implementerModel, 'sonnet')
const DIAGNOSER_MODEL = modelArg(args && args.diagnoserModel, 'inherit')
const modelOpt = (m) => (m === 'inherit' ? {} : { model: m })
for (const [key, value] of [['implementerModel', IMPLEMENTER_MODEL], ['diagnoserModel', DIAGNOSER_MODEL]]) {
  if (typeof value !== 'string' || !MODEL_OK.test(value)) {
    return { ok: false, error: `args.${key} is ${JSON.stringify(value)}: expected inherit, sonnet, opus, haiku or a claude-* model id. Nothing was started.` }
  }
}
// --- end build model ---
// @@end build-model

// @@section build-loop
// --- build loop (one section, used by build.js and run.js) ---
// The tests, proven red, then up to ROUND_CAP implementation rounds with a fresh diagnosis after
// each failed one. One function so the build phase and every card of the autopilot run share it:
// a hand copy would drift. It returns what the build phase returns. `o.locate` says what to read,
// `o.brief` is the standing brief text, `o.label` and `o.phases` name the agents and their phase,
// `o.setPhase` says whether to call phase(), and `o.commitRule` says who commits.
const ROUND_CAP = 3

const WROTE = {
  type: 'object',
  required: ['filesWritten', 'testsFailAsExpected', 'summary'],
  properties: {
    filesWritten: { type: 'array', items: { type: 'string' } },
    testsFailAsExpected: {
      type: 'boolean',
      description: 'True if the new tests were run and FAILED. False is a finding, not a success',
    },
    unexpectedlyPassing: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tests that passed before the implementation existed',
    },
    testCommand: { type: 'string' },
    summary: { type: 'string' },
  },
}

const BUILT = {
  type: 'object',
  required: ['green', 'filesChanged', 'summary'],
  properties: {
    green: { type: 'boolean' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    notDone: { type: 'array', items: { type: 'string' }, description: 'Deliberately left undone, and why' },
    noticed: { type: 'array', items: { type: 'string' }, description: 'Worth a later change; not done now' },
    decisions: {
      type: 'array',
      description: 'Every choice you made that the plan does not state; empty when there was none',
      items: { type: 'object', required: ['what', 'major'], properties: { what: { type: 'string' }, why: { type: 'string' }, major: { type: 'boolean', description: 'True for a dependency, a schema or migration, an external service or environment variable, a changed public interface, security or permission configuration, or a file outside the card' } } },
    },
    failureOutput: { type: 'string', description: 'Verbatim, when not green' },
    fullSuiteGreen: { type: 'boolean', description: 'True only if the full run (verify --full) was run after the last change and passed' },
    summary: { type: 'string' },
  },
}

const DIAGNOSIS = {
  type: 'object',
  required: ['cause', 'signature', 'suggestedFix', 'confidence'],
  properties: {
    cause: { type: 'string', description: 'What is actually wrong, from the evidence' },
    signature: { type: 'string', description: 'Short stable identifier for this failure, to detect no progress' },
    suggestedFix: { type: 'string' },
    testMayBeWrong: { type: 'boolean', description: 'True if the test, not the code, looks incorrect' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
}

// Domain experts do not write code. What they required at planning time sits in the plan's
// "Expert input" section, so the implementer is pointed at it and told it is binding.
const EXPERT_NOTE =
  'If the plan has an "Expert input" section, its constraints are requirements, not suggestions: meet each one, or stop and say which one you cannot meet and why. Do not drop one silently.'

const TESTS_COMMIT_RULE = 'Never stage or commit: the user commits the whole change after the experts check.'
const IMPLEMENT_COMMIT_RULE = 'Never stage or commit, not even part of the work: the user commits the whole change after the experts check, and a partial commit is refused by the gates.'

async function buildLoop(o) {
  const label = o.label || ((s) => s)
  const ph = o.phases || { tests: 'Tests', implement: 'Implement', verify: 'Verify' }
  const resumed = o.resume ? { resumedAt: 'implement', resumeReason: o.resume.reason } : {}
  const testsWhere = o.testsWhere || 'its confirmed Tests section'
  const tests = o.resume ? { filesWritten: o.resume.testFiles, testsFailAsExpected: true, testCommand: o.command } : await agent(
    `${o.locate} ${EXPERT_NOTE}${o.brief}

Write the tests from ${testsWhere}. Only the tests. Do not write the implementation yet. ${o.testsCommitRule || TESTS_COMMIT_RULE}

Then RUN them and confirm they FAIL.

A new test that passes before the implementation exists is testing nothing, and it is invisible afterwards -- a green suite looks the same whether its tests constrain the behaviour or merely coexist with it. If any new test passes now, list it in unexpectedlyPassing and say so plainly. That is a finding, not a convenience.

Report the project's real verification command as testCommand.`,
    { agentType: agentName('uw-implementer'), label: label('write-tests'), phase: ph.tests, schema: WROTE, ...modelOpt(o.implementerModel) }
  )

  if (!tests) {
    return { ok: false, error: 'The test-writing step failed. Nothing was implemented.' }
  }

  const testCommand = o.command || tests.testCommand
  log(`${tests.filesWritten.length} test files written; verify command: ${testCommand}`)

  if (!tests.testsFailAsExpected) {
    // Stop here deliberately. Implementing against tests that already pass means
    // the loop below would go green on the first run and prove nothing at all.
    return {
      ok: false,
      stoppedAt: 'Tests',
      error: 'The new tests did not fail before implementation, so they cannot demonstrate the change works.',
      unexpectedlyPassing: tests.unexpectedlyPassing || [],
      filesWritten: tests.filesWritten,
      hint: 'Either the behaviour already exists, or those tests have no real oracle. Both are worth knowing before writing code.',
    }
  }

  if (o.setPhase !== false) phase(ph.implement)

  let round = 0
  let last = null
  let diagnosis = null
  const history = []

  while (round < ROUND_CAP) {
    round += 1

    const attempt = await agent(
      `${o.locate} ${EXPERT_NOTE}${o.brief}

Write the minimal implementation that makes the tests pass. ${
  o.verify
    ? `After each change run \`${o.verify}\`: it runs the tests related to what you changed, or the full suite when the change needs it, and says which. Do not run the full suite by hand while iterating. When it passes, run \`${o.verify} --full\` once. Report green only if that full run passed after your last change, and set fullSuiteGreen to say so.`
    : `Run \`${testCommand}\` and report whether it is green.`
}
${
  diagnosis
    ? `\nThis is attempt ${round}. A previous attempt failed and a fresh reader diagnosed it:\n${JSON.stringify(diagnosis, null, 2)}\n\nUse that diagnosis. Do not re-derive it, and do not repeat the fix that already failed.`
    : ''
}

${o.implementCommitRule || IMPLEMENT_COMMIT_RULE}

Smallest change that works. Nothing beyond the plan. Do not improve adjacent code, reformat untouched lines, or rename anything not in scope -- every changed line must trace to a plan item. The plugin's own folder (the one that holds experts/, phases/ and hooks/) is read-only: never create or edit a file in it.

List in decisions every choice you made that the plan does not state, each with major true or false. Major: a new or changed dependency, a schema or migration, an external service or environment variable, a removed or renamed exported name, security or permission configuration, a file outside this change's scope. Minor: everything else (a helper's name, an error message, an internal structure). A major one is not committed without the user, so prefer the plan's way when there is one.

Never make a test pass by weakening it. Deleting an assertion or special-casing the test input converts a failing test into a lie that outlives you. If a test is genuinely wrong, say so and leave it failing.

Some tests may have been failing before this change and been accepted by the user as known (the plan lists them under "Known failures"). They are not yours: do not edit, skip or work around them. The full run already allows exactly those, and it says "N known failures ... and 0 new" when only they fail; any other failing test is yours.

When not green, include the failure output verbatim.`,
      { agentType: agentName('uw-implementer'), label: label(`attempt-${round}`), phase: round === 1 ? ph.implement : ph.verify, schema: BUILT, ...modelOpt(o.implementerModel) }
    )

    if (!attempt) {
      history.push({ round, note: 'the implementer returned nothing' })
      break
    }

    last = attempt
    // With verify.js, green means the full suite passed at the end, not only the related tests.
    const green = attempt.green === true && (!o.verify || attempt.fullSuiteGreen === true)
    history.push({ round, green, summary: attempt.summary, ...(attempt.green && !green ? { note: 'reported green without a passing full run' } : {}) })

    if (green) {
      log(`Green on round ${round}`)
      return {
        ok: true,
        green: true,
        rounds: round,
        testFiles: tests.filesWritten,
        ...resumed,
        briefsLoaded: o.briefsLoaded || [],
        skillsLoaded: o.skillsLoaded || [],
        filesChanged: attempt.filesChanged,
        notDone: attempt.notDone || [],
        noticed: attempt.noticed || [],
        decisions: attempt.decisions || [],
        history,
        summary: attempt.summary,
      }
    }

    if (round >= ROUND_CAP) break

    // Diagnose in a fresh context. The agent that just failed is holding its own
    // wrong theories; a reader who has only the failure and the diff is better
    // placed to see what it actually says. This is also what keeps the raw stack
    // trace from ever reaching the conversation.
    const next = await agent(
      `An implementation attempt failed. Diagnose it from the evidence, nothing else.

FAILURE OUTPUT
${attempt.failureOutput || (attempt.green ? 'The round reported green but no passing full run (verify --full) after its last change.' : '(none captured)')}

WHAT WAS CHANGED
${JSON.stringify(attempt.filesChanged, null, 2)}

Read the relevant code and tests. Say what is actually wrong -- not what might be. Give the failure a short stable signature so a repeat can be recognised as no progress.

If the TEST looks wrong rather than the code, say so: that is a legitimate outcome and needs a human, not another attempt.`,
      { agentType: agentName('uw-reviewer'), label: label(`diagnose-${round}`), phase: ph.verify, schema: DIAGNOSIS, ...modelOpt(o.diagnoserModel) }
    )

    const priorSignature = diagnosis && diagnosis.signature
    diagnosis = next

    if (next && next.testMayBeWrong) {
      return {
        ok: false,
        green: false,
        stoppedAt: `round ${round}`,
        reason: 'The diagnosis says the test may be wrong, not the code. That needs a decision, not another attempt.',
        diagnosis: next,
        history,
        testFiles: tests.filesWritten,
        escalation: escalationText(round, next, history),
      }
    }

    if (next && priorSignature && next.signature === priorSignature) {
      return {
        ok: false,
        green: false,
        stoppedAt: `round ${round}`,
        reason: 'The same failure signature twice running -- no progress. Stopping before the cap rather than spending another round on it.',
        diagnosis: next,
        history,
        testFiles: tests.filesWritten,
        escalation: escalationText(round, next, history),
      }
    }
  }

  return {
    ok: false,
    green: false,
    stoppedAt: `round ${round}`,
    ...resumed,
    reason: `Verification failed ${round} times. Round cap reached.`,
    diagnosis,
    history,
    testFiles: tests.filesWritten,
    lastFailure: last && last.failureOutput,
    escalation: escalationText(round, diagnosis, history),
  }
}

// The escalation is the blocker protocol the workflow already specifies:
// state the problem, say what changed between attempts, give the signature,
// and present options rather than picking one.
function escalationText(rounds, dx, hist) {
  return [
    `Verification failed ${rounds} times. Stopping.`,
    '',
    `What is wrong: ${dx ? dx.cause : 'not diagnosed'}`,
    `Failure signature: ${dx ? dx.signature : 'unknown'}`,
    '',
    'What changed between attempts:',
    ...hist.map((h) => `  round ${h.round}: ${h.summary || h.note || 'no summary'}`),
    '',
    'Options worth weighing:',
    `  1. Apply the suggested fix directly: ${dx ? dx.suggestedFix : 'none offered'}`,
    '  2. Revisit the test -- it may be asserting the wrong thing.',
    '  3. Revisit the plan -- the approach may be wrong, not the code.',
    '',
    'Pick one. Do not start a fourth attempt without a decision.',
  ].join('\n')
}
// --- end build loop ---
// @@end build-loop

// @@section read-first
// How an expert is told where its stage reference is: the protocol is pasted in when the command passed it
// (`protocolText`, declared by the script before this line), else named as a file to read first.
const readFirst = (dir, name, stage) =>
  protocolText
  ? `Read ${dir}/${name}/references/${stage}.md.\n\nTHE PROTOCOL every expert follows:\n${protocolText}`
  : `Read ${dir}/protocol.md first (the rules every expert follows), then ${dir}/${name}/references/${stage}.md.`
// @@end read-first

// @@section recheck
// The check of a diff for experts nobody selected (review, and every card of the run). The experts are chosen once,
// at plan; this does not ask that question again. It asks which experts' areas the diff touches, and code adds
// them (addOnly), so an answer can add and never remove.
const recheckPrompt = (diffFile, available, selected) =>
  `Report which domain experts' areas this change touches. The diff is saved at ${diffFile}; read it, and read the surrounding code where a hunk is not clear on its own.

Available experts (the only names you may answer with):
${available.map((e) => `- ${e.name}: ${e.description}`).join(String.fromCharCode(10))}

Already selected: ${selected.length ? selected.join(', ') : 'none'}.

List every available expert that is not already selected and whose area this diff touches, each with one sentence tying it to something in the diff. You are reporting what the diff touches; you are not choosing who reviews, and you cannot remove anyone. If none, return an empty list.`
// @@end recheck

// @@section core-lenses
// The four lenses every review runs, by hand and at the end of a run.
const CORE_LENSES = ['correctness', 'simplicity', 'surgical-scope', 'test-coverage']
// @@end core-lenses


// @@section review-core
// The schemas and rules every expert review uses, by hand and in each card of the run: what a finding must say, what a
// verdict says, the no-quota line and the basis rule.
const FINDINGS = {
  type: 'object',
  required: ['findings', 'lensVerdict'],
  properties: {
    lensVerdict: {
      type: 'string',
      description: 'One sentence on the change through this lens, INCLUDING when nothing was found',
    },
    concerns: {
      type: 'array',
      description: 'Domain experts: a worry that is not a finding (rated below 8, or no failure path you can show). At most three. Each says why it is not a finding.',
      items: {
        type: 'object',
        required: ['text', 'reason'],
        properties: {
          text: { type: 'string', description: 'The worry, in one sentence' },
          reason: { type: 'string', description: 'Why it is not a finding: its confidence, or what you could not show' },
          file: { type: 'string' },
          line: { type: 'integer' },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'line', 'what', 'howItFails', 'confidence'],
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          what: { type: 'string', description: 'One sentence naming the defect' },
          howItFails: { type: 'string', description: 'Concrete inputs or state leading to a wrong result' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          wouldSettleIt: { type: 'string', description: 'What check would confirm or kill this' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'Domain experts: one step per item, each with file and line (or the plan line, or a cited URL), ending at the failure' },
          category: { type: 'string', description: 'Domain experts: the category from your reference, or the owning expert when it is outside your domain' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Domain experts: by the protocol and your reference' },
          fix: { type: 'string', description: 'Domain experts: the fix in one sentence, smaller than the problem' },
          basis: { type: 'string', description: 'Domain experts: where this finding came from: "skill:<name>" for a skill pasted into your prompt, "reference:<category>" for your stage reference, or "general" for your own knowledge' },
          basisQuote: { type: 'string', description: 'Domain experts, with a skill basis: the words of the skill row that made you see it, copied exactly' },
        },
      },
    },
  },
}

const VERDICTS = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['index', 'verdict', 'reason'],
        properties: {
          index: { type: 'integer', description: 'Index of the finding in the list you were given' },
          verdict: { type: 'string', enum: ['confirmed', 'refuted'] },
          reason: { type: 'string', description: 'For refuted: what you could not establish, or the guard the reviewer missed' },
        },
      },
    },
  },
}

const NO_QUOTA =
  'You have no quota. Zero findings is a correct and common answer, and saying so plainly is more useful than padding. A reviewer who always finds something teaches the reader to skim past the one that mattered.'

const BASIS_RULE =
  ' For each finding set basis: "skill:<name>" when a row of a skill below is what made you see it, and copy that row\'s words into basisQuote; "reference:<category>" when it comes from your stage reference; "general" when it comes from your own knowledge. Say "general" rather than name a skill that did not lead you to it: the quote is checked against the skill.'
// `mine` is the skills chosen for this expert: [{ name, text }].
const skillBlock = (mine) => {
  return mine.length === 0
    ? `\n\nNo skill applies to this change by its files and lines. Do not open skill files.${BASIS_RULE}`
    : `\n\nSKILLS for this change (${mine.map((x) => x.name).join(', ')}), chosen by the workflow from the diff. Read them before you look for findings. Do not open other skill files.${BASIS_RULE}\n\n${mine.map((x) => x.text.trim()).join('\n\n')}`
}
// @@end review-core


// @@section selection
// The shape of an answer to "which experts": a name and one sentence each. Used by the plan question and by the
// recheck of a diff.
const SELECTION = {
  type: 'object',
  required: ['experts'],
  properties: {
    experts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'why'],
        properties: { name: { type: 'string' }, why: { type: 'string', description: 'One sentence tying this expert to something in the material' } },
      },
    },
  },
}
// @@end selection

// @@section experts-check
// The steps of an experts check that the by-hand review and the run's one review take the same way (reviewRange calls them):
// the recheck that can only add, an expert's finding as the lane records it, and the concerns an expert raised. Uses addOnly
// from lane-helpers.
const CONCERN_CAP = 3

// Ask which more experts apply: `ask(label)` returns the answer or null. With `retry`, a null is asked once more
// under the same label with a retry mark. Code adds a name from the list and nothing else, so an answer can add and never remove.
// Two nulls (or one without a retry) come back as `failed`, never as "no areas touched".
async function recheckAdd(ask, label, selected, available, retry) {
  let answer = await ask(label)
  if (!answer && retry) answer = await ask(`${label}:retry`)
  if (!answer) return { failed: true, selected, added: [], rejected: [] }
  const merged = addOnly(selected, answer.experts, available)
  return { failed: false, selected: merged.experts, added: merged.added, rejected: merged.rejected }
}

// One finding of an expert, in the form the lane records and the commit check reads.
const laneFinding = (f, expert, status) => ({ expert, file: f.file, line: f.line, what: f.what, confidence: f.confidence, ...(f.severity ? { severity: f.severity } : {}), ...(typeof f.basis === 'string' ? { basis: f.basis } : {}), ...(typeof f.basisQuote === 'string' ? { basisQuote: f.basisQuote } : {}), status })

// What experts worried about without being able to call it a finding. `pairs` is [[expert name, result or null]].
// An item without text and reason is dropped and counted, an expert keeps CONCERN_CAP, a failed expert has none.
function collectConcerns(pairs) {
  let dropped = 0
  const list = []
  for (const [expert, r] of pairs) {
    if (!r) continue
    const valid = []
    for (const c of Array.isArray(r.concerns) ? r.concerns : []) {
      const text = c && typeof c.text === 'string' ? c.text.trim() : ''
      const reason = c && typeof c.reason === 'string' ? c.reason.trim() : ''
      if (!text || !reason) {
        dropped += 1
        continue
      }
      valid.push({ expert, text, reason, ...(typeof c.file === 'string' && c.file ? { file: c.file } : {}), ...(Number.isInteger(c.line) ? { line: c.line } : {}) })
    }
    list.push(...valid.slice(0, CONCERN_CAP))
    dropped += Math.max(0, valid.length - CONCERN_CAP)
  }
  return { list, dropped }
}
// @@end experts-check




// @@section review-range
// One review of a range, the same code for the by-hand review (phases/review.js) and the unattended run (phases/run.js):
// the recheck that can only add, the four core lenses and the experts in parallel, and one verify pass. The caller
// passes what differs: the range, the experts and their skills, the labels and phase names, whether an agent that
// returns nothing is asked once more (`retry`), and, for a changed-only review, `delta`. It returns the result the
// by-hand review always returned. Uses review-core, selection, lane-helpers, experts-check, recheck, core-lenses and
// read-first, and the caller's agentName.
async function reviewRange(o) {
  const { range, rigor = 'normal', available = [], planned = [], noExperts = false, expertsOnly = false, retry = false } = o
  const label = (s) => `${o.labelPrefix || ''}${s}`
  const ph = o.phases || {}
  const announce = (p) => {
    if (p) phase(p)
  }
  const agentOpts = o.agentOpts || {}
  // An agent that returns nothing is asked once more, under the same label with a retry mark, when the caller asks for it.
  const ask = async (prompt, opts) => {
    const first = await agent(prompt, { ...opts, ...agentOpts })
    if (first || !retry) return first
    return agent(prompt, { ...opts, label: `${opts.label}:retry`, ...agentOpts })
  }
  const CORE = CORE_LENSES
  const extraLenses = o.extraLenses || []

  // The experts of the last check stay selected while the changes are the same work in progress (`keep`, and the
  // experts a changed-only review narrows): a recheck that answers "nobody" must not drop them, as it cannot drop the
  // plan's. The recheck can still add.
  const keptNames = [...(o.keep && Array.isArray(o.keep.experts) ? o.keep.experts : []), ...(o.deltaFile && o.delta && Array.isArray(o.delta.experts) ? o.delta.experts : [])]
  const kept = keptNames.filter((n, i) => keptNames.indexOf(n) === i && available.some((e) => e.name === n) && !planned.includes(n))
  let experts = [...planned, ...kept]
  let added = []
  let recheck = false
  let recheckFailed = false
  const notInstalled = []
  if (!noExperts && available.length > 0 && o.recheck !== false) {
    announce(ph.recheck)
    const asked = await recheckAdd(
      (l) => ask(recheckPrompt(o.diffFile, available, experts), { agentType: agentName('uw-explorer'), label: l, phase: ph.recheck, schema: SELECTION }),
      label('recheck'), experts, available, retry
    )
    recheck = true
    if (asked.failed) {
      // Decided 2026-11-13: a recheck that answers nothing does not refuse the commit. The planned experts review, and the
      // lane says the recheck failed, so it is named in the report and never read as "no areas touched".
      recheckFailed = true
      log('recheck failed; continuing with the planned experts only, and the report names the failed recheck')
    } else {
      experts = asked.selected
      added = asked.added
      notInstalled.push(...asked.rejected)
      log(`recheck: ${added.length ? 'added ' + added.join(', ') : 'nothing to add'}${asked.rejected.length ? '; ignored unknown ' + asked.rejected.join(', ') : ''}`)
    }
  }
  // An expert with `review-when-skills` joins whenever the diff selected one of those review skills, whether or not the
  // plan or the recheck named it: quality reviews every change that touches tests.
  if (!noExperts) {
    for (const e of available) {
      const selected = o.skillNames ? o.skillNames(e.name) : []
      const triggers = Array.isArray(e.reviewWhenSkills) ? e.reviewWhenSkills : []
      if (triggers.some((t) => selected.includes(t)) && !experts.includes(e.name)) {
        experts = [...experts, e.name]
        added = [...added, e.name]
        log(`${e.name} joins: its review skills matched this diff`)
      }
    }
  }
  const reviewing = takingPart(available, experts, 'review')
  const reviewingNames = reviewing.map((e) => e.name)
  const agentFor = Object.fromEntries(reviewing.map((e) => [e.name, e.agent]))
  const lenses = [
    ...(expertsOnly ? [] : CORE),
    ...(expertsOnly ? [] : extraLenses.filter((l) => !CORE.includes(l) && !reviewingNames.includes(l))),
    ...reviewingNames,
  ]
  announce(ph.lenses)

  const skillsFor = o.skillsFor || (() => [])
  const droppedFor = o.droppedFor || (() => [])
  // A changed-only review: an expert whose last review covers the previous changes reads only what changed since, and
  // what uses it. An expert the recheck added, and the recheck itself, read the full diff.
  const deltaArgs = o.delta && o.deltaFile && Array.isArray(o.delta.experts) ? o.delta : null
  const narrowed = (lens) => Boolean(deltaArgs) && reviewingNames.includes(lens) && deltaArgs.experts.includes(lens)
  const usedDelta = reviewingNames.filter(narrowed)
  if (usedDelta.length) log(`changed-only review for ${usedDelta.join(', ')}: ${deltaArgs.files.length} file(s) since ${String(deltaArgs.base).slice(0, 12)}`)
  log(`Reviewing ${range} through ${lenses.length} lenses (rigor: ${rigor})`)

  const lensResults = await parallel(
    lenses.map((lens) => () =>
      ask(
        `${reviewingNames.includes(lens) ? `Review the diff for ${range} as the ${lens} expert.` : `Review the diff for ${range} through the ${lens} lens ONLY. Another reviewer has each of the other lenses; stay inside yours.`}

${
  reviewingNames.includes(lens)
    ? `${
        narrowed(lens)
          ? `You reviewed these changes before. Only some files changed since, or use a file that did: their current patches are at ${o.deltaFile}, and its header lists what changed, what uses it and what was removed. Review those files. Your earlier findings on every other file stand and are carried forward, so do not repeat them. The full diff is at ${o.diffFile} if you need context.`
          : `The diff for ${range} is saved at ${o.diffFile}. Read it there.`
      } Stage: review. ${readFirst(o.expertsDir, lens, 'review')}${
        o.plan
          ? ` The plan is at ${o.plan}: find the "Expert input" section, read what you required from this change at planning time, and report any requirement the diff does not honour.`
          : ''
      }`
    : 'Start by reading the diff: `git diff ' + range + '`.'
} Read the surrounding code, not just the changed lines -- a hunk is rarely comprehensible on its own.

${
  lens === 'surgical-scope'
    ? 'Read any PLAN-*.md in the repository first, to learn what was actually requested. Then, for each changed hunk, ask whether it traces to that request. Flag adjacent improvements, opportunistic refactors, drive-by formatting, and unrequested renames. If everything traces, say so explicitly in your verdict -- that is a real result.'
    : ''
}
${
  lens === 'test-coverage'
    ? 'The question is not only whether tests exist. Ask whether they would FAIL if the code were wrong. A test that passes against a broken implementation is worse than no test.'
    : ''
}

${
  reviewingNames.includes(lens)
    ? `You are the ${lens} domain expert. Follow your agent definition and its index for what to read.

Dependency audit (JSON, produced by a script before this run; do not fetch anything yourself): ${
        o.deps ? JSON.stringify(o.deps) : 'not provided'
      }
Treat a dependency item as a finding only when this diff introduces it or makes it reachable; otherwise mention it as pre-existing in lensVerdict.${skillBlock(skillsFor(lens))}`
    : ''
}

Every finding needs a file, a line, one sentence on the defect, and a concrete failure scenario. If you cannot describe the path from cause to symptom, it is a suspicion and does not belong in the list.

Set lensVerdict whether or not you find anything.

${NO_QUOTA}`,
        { agentType: agentName(reviewingNames.includes(lens) ? agentFor[lens] : 'uw-reviewer'), label: label(lens), phase: ph.lenses, schema: FINDINGS }
      )
    )
  )

  const failedLenses = lenses.filter((_, i) => !lensResults[i])
  // What an expert found is carried in the lane, because the lane is what gets recorded as evidence and what the commit gate
  // reads. Only findings from an expert's own lens, and only those the skeptic confirmed or never ruled on.
  const expertFindings = (list, status) => list.filter((f) => reviewingNames.includes(f.lens)).map((f) => laneFinding(f, f.lens, status))
  // What an expert worried about without being able to call it a finding (a core lens's are ignored).
  const gathered = collectConcerns(lenses.map((lens, i) => [lens, reviewingNames.includes(lens) ? lensResults[i] : null]))
  const lane = (found = []) => ({
    stage: 'review',
    available: available.map((e) => e.name),
    planned,
    selected: experts,
    added,
    ran: reviewingNames.filter((n) => !failedLenses.includes(n)),
    skillsLoaded: Object.fromEntries(reviewingNames.map((n) => [n, skillsFor(n).map((x) => x.name)])),
    skillsDropped: Object.fromEntries(reviewingNames.map((n) => [n, droppedFor(n)])),
    failed: reviewingNames.filter((n) => failedLenses.includes(n)),
    recheck,
    findings: found,
    concerns: gathered.list,
    concernsDropped: gathered.dropped,
    ...(usedDelta.length ? { delta: { base: deltaArgs.base, files: deltaArgs.files, removed: deltaArgs.removed || [], chain: deltaArgs.chain, experts: usedDelta } } : {}),
    ...(recheckFailed ? { recheckFailed: true } : {}),
    ...(notInstalled.length ? { ignoredUnknown: notInstalled } : {}),
    ...(noExperts ? { skipped: 'noExperts was passed, so domain experts were not considered' } : {}),
  })
  if (lenses.length === 0) {
    return {
      ok: true,
      range,
      rigor,
      experts,
      expertLane: lane(),
      findings: [],
      refuted: [],
      lensVerdicts: [],
      failedLenses,
      summary: noExperts ? 'Nothing ran: noExperts was passed and no lenses were asked for.' : 'No expert applies to this change, so nothing ran.',
    }
  }
  if (failedLenses.length === lenses.length) {
    return {
      ok: false,
      error: 'Every lens failed, so nothing was reviewed. This is NOT a clean review.',
      failedLenses,
      hint: 'Check the run in /workflows. If the uw-reviewer agent type is missing, agent definitions are read at host startup and need a restart.',
    }
  }

  // Flatten, keeping the lens that produced each finding.
  const all = []
  lenses.forEach((lens, i) => {
    const r = lensResults[i]
    if (!r) return
    ;(r.findings || []).forEach((f) => all.push({ ...f, lens }))
  })
  const verdicts = lenses.map((lens, i) => (lensResults[i] ? { lens, verdict: lensResults[i].lensVerdict } : null)).filter(Boolean)
  if (all.length === 0) {
    return {
      ok: true,
      range,
      rigor,
      experts,
      expertLane: lane(),
      findings: [],
      refuted: [],
      lensVerdicts: verdicts,
      failedLenses,
      summary:
        failedLenses.length > 0
          ? `No findings, but ${failedLenses.join(' and ')} did not run -- coverage was incomplete.`
          : 'No findings. Every lens ran and reported the change sound through its concern.',
    }
  }

  log(`${all.length} findings across ${lenses.length - failedLenses.length} lenses; verifying`)
  announce(ph.verify)
  const numbered = all.map((f, i) => ({ index: i, ...f }))
  // Normal rigor: one skeptic sees everything at once. High rigor: one skeptic per finding, each in its own context.
  const verifyRuns =
    rigor === 'high'
      ? numbered.map((f) => () =>
          ask(
            `Try to REFUTE this single finding. Your job is not to agree.

${JSON.stringify(f, null, 2)}

Read the code around it. Check whether the described failure path is actually reachable. Look for the guard the reviewer missed. Consider whether the behaviour is intentional and documented elsewhere.

Default to refuted when uncertain. A false finding costs the reader more than a missed one, because it burns trust in every other finding beside it. Return a verdict for index ${f.index} only.`,
            { agentType: agentName('uw-reviewer'), label: label(`verify:${f.index}`), phase: ph.verify, schema: VERDICTS }
          )
        )
      : [
          () =>
            ask(
              `Try to REFUTE each finding below. Your job is not to agree.

${JSON.stringify(numbered, null, 2)}

For each: read the code around it, check whether the described failure path is reachable, look for the guard the reviewer missed, and consider whether the behaviour is intentional and documented elsewhere.

Default to refuted when uncertain. A false finding costs the reader more than a missed one, because it burns trust in every other finding beside it.

Return one verdict per finding, by index. Do not soften -- confirmed or refuted, with the reason.`,
              { agentType: agentName('uw-reviewer'), label: label('refute'), phase: ph.verify, schema: VERDICTS }
            ),
        ]
  const verifyResults = await parallel(verifyRuns)
  const byIndex = new Map()
  verifyResults.filter(Boolean).forEach((r) => {
    ;(r.verdicts || []).forEach((v) => byIndex.set(v.index, v))
  })
  const confirmed = []
  const refuted = []
  const unverified = []
  numbered.forEach((f) => {
    const v = byIndex.get(f.index)
    if (!v) unverified.push({ ...f, note: 'The verifier returned no verdict for this finding.' })
    else if (v.verdict === 'confirmed') confirmed.push({ ...f, verifiedBecause: v.reason })
    else refuted.push({ ...f, refutedBecause: v.reason })
  })
  // Order for the reader: severity first where an expert gave one, then confidence.
  const rank = { high: 0, medium: 1, low: 2 }
  const by = (key) => (f) => (f[key] in rank ? rank[f[key]] : 1)
  confirmed.sort((a, b) => by('severity')(a) - by('severity')(b) || by('confidence')(a) - by('confidence')(b))
  log(`${confirmed.length} confirmed, ${refuted.length} refuted, ${unverified.length} unverified`)
  // Refuted findings are returned, not dropped: a verifier that silently filters cannot itself be audited.
  return {
    ok: true,
    range,
    rigor,
    experts,
    expertLane: lane([...expertFindings(confirmed, 'confirmed'), ...expertFindings(unverified, 'unverified')]),
    lensVerdicts: verdicts,
    findings: confirmed,
    refuted,
    unverified,
    failedLenses,
    summary: `${confirmed.length} confirmed, ${refuted.length} refuted by the adversarial pass, ${unverified.length} unverified. Refuted findings are listed so the verifier can be checked.`,
  }
}
// @@end review-range

// @@section harvest-proposals
// What a harvest agent returns: the lessons routed to a store, and the ones discarded with a reason. The by-hand harvest
// and the run's harvest step read the same shape.
const PROPOSALS = {
  type: 'object',
  required: ['proposals', 'discarded'],
  properties: {
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['destination', 'path', 'text', 'source', 'rationale'],
        properties: {
          destination: { type: 'string', enum: ['gotcha', 'memory', 'progress'] },
          path: { type: 'string', description: 'Target file, e.g. CLAUDE.md or memory/gates.md' },
          text: { type: 'string', description: 'The exact text to add, ready to paste' },
          source: { type: 'string' },
          rationale: { type: 'string', description: 'Which threshold it met, and why this store not the other' },
          description: { type: 'string', description: 'A new memory topical: one line on what it covers (required for a new file)' },
          paths: { type: 'array', items: { type: 'string' }, description: 'A new memory topical: globs of the paths it is about, relative to the folder that holds memory.md' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'A new memory topical: words or short phrases that cue it (paths or keywords is required for a new file)' },
          add_paths: { type: 'array', items: { type: 'string' }, description: 'An existing memory topical: globs to add to its header' },
          add_keywords: { type: 'array', items: { type: 'string' }, description: 'An existing memory topical: keywords to add to its header' },
          remove_paths: { type: 'array', items: { type: 'string' }, description: 'An existing memory topical: globs to remove from its header (a cue that matches no file)' },
        },
      },
    },
    discarded: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lesson', 'why'],
        properties: {
          lesson: { type: 'string' },
          why: { type: 'string', description: 'Already recorded, not durable, obvious from code, or one-off' },
        },
      },
    },
  },
}
// @@end harvest-proposals


// @@section cover-rule
// Which files a card may change: its paths (globs, `dir/**`, `dir/`), and for a finding the test files its build wrote.
// experts/cards.js `covers` is the same rule for code that can import; a test holds the two to the same answers.
function covers(paths, file) {
  const f = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '')
  return (paths || []).some((g) => {
    const p = String(g).replace(/\\/g, '/').replace(/^\.\//, '')
    if (p.endsWith('/**')) return f === p.slice(0, -3) || f.startsWith(p.slice(0, -2))
    if (p.endsWith('/')) return f.startsWith(p)
    const re = new RegExp(`^${p.split('**/').map((s) => s.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('(?:.*/)?')}$`)
    return re.test(f)
  })
}

/**
 * Whether a finding's file is one this card may change: under its paths, or one of the test files
 * its build wrote. Agents often name a file by its absolute path, and the script has no project
 * root, so an absolute path is matched by its trailing segments.
 */
function inCard(card, file, testFiles = []) {
  const f = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '')
  if (!f) return false
  const absolute = /^([A-Za-z]:)?\//.test(f)
  const parts = f.split('/').filter(Boolean)
  const candidates = absolute ? parts.map((_, i) => parts.slice(i).join('/')) : [f]
  const tests = (testFiles || []).map((t) => String(t).replace(/\\/g, '/'))
  return candidates.some((c) => covers(card.paths || [], c) || tests.some((t) => t === c || t.endsWith(`/${c}`)))
}
// @@end cover-rule


// @@section measure-parser
// How a `measure: bytes <glob> <= <number>` line of a plan is read. lib/claims.js evaluates this section and the tests
// phase script has it pasted in, so there is one parser.
const MEASURE = /^\s*[-*]\s+measure:\s*(.*)$/i;
const CLAIM = /^bytes\s+(\S+)\s+<=\s+([0-9][0-9_,]*)$/i;
// A glob is letters, digits, dot, dash, underscore, slash and star: no shell syntax, no backslash, no drive.
const GLOB = /^[A-Za-z0-9._*/-]+$/;

/** Why a glob is refused, or '' when it stays inside the root. */
function globProblem(glob) {
  if (!GLOB.test(glob)) return 'the glob may hold only letters, digits, . _ - / and *';
  if (glob.startsWith('/')) return 'the glob must be relative to the project root';
  if (glob.split('/').includes('..')) return 'the glob must not leave the project root';
  return '';
}

/** Every `measure:` line of the plan, read: `{ line, understood, glob, limit }` or `{ line, understood: false, why }`. */
function parseMeasures(planText) {
  const out = [];
  for (const raw of String(planText || '').split(/\r?\n/)) {
    const m = MEASURE.exec(raw);
    if (!m) continue;
    const line = m[1].trim().replace(/^`|`$/g, '');
    const claim = CLAIM.exec(line);
    if (!claim) {
      out.push({ line, understood: false, why: 'not of the form "bytes <glob> <= <number>"' });
      continue;
    }
    const glob = claim[1].replace(/^`|`$/g, '');
    const why = globProblem(glob);
    if (why) out.push({ line, understood: false, why });
    else out.push({ line, understood: true, glob, limit: Number(claim[2].replace(/[_,]/g, '')) });
  }
  return out;
}

// @@end measure-parser
