export const meta = {
  name: 'run',
  description: 'Build every card of a confirmed plan unattended: test, implement, verify, expert-check and commit each, park what cannot be finished, then review and harvest',
  whenToUse:
    'After the plan and the test plan are confirmed, from the Full tier of /ultimate-workflow:feature. Commits each finished card to uw/run/<feature>; never pushes.',
  phases: [
    { title: 'Cards', detail: 'per card: context pack, tests, implementation, experts check, commit or park' },
    { title: 'Findings', detail: 'the non-blocking expert findings no card fixed' },
    { title: 'Review', detail: 'the whole run diff through the core lenses, and one fix-up card' },
    { title: 'Harvest', detail: 'lessons from the journal and the diff, committed to uw/harvest/<feature>' },
  ],
}

// --- agent names (identical in every workflow; a test holds them equal) ---
// An installed plugin registers its agents as "<plugin>:<agent>", so a bare "uw-explorer"
// is "agent type not found". Every agentType goes through agentName(). A local run against
// agents copied to .claude/agents/ passes args.agentNamespace: "".
const AGENT_NAMESPACE = args && typeof args.agentNamespace === 'string' ? args.agentNamespace : 'ultimate-workflow:'
const agentName = (name) => (String(name).includes(':') ? name : AGENT_NAMESPACE + name)
// --- end agent names ---

// The autopilot run (PLAN-autopilot.md). After the user's two confirmations nothing stops for them:
// every card is built, verified, expert-checked and committed, or parked on a branch with its
// diagnosis; the run goes on with the cards that do not depend on a parked one. One result comes back.
//
// The script decides; agents only do. Everything that touches git or a file the script cannot read is
// one `experts.js` command (pack, park, card-commit, journal, harvest-branch), which an agent runs and
// whose one JSON line, with a boolean ok, comes back verbatim: the S0 spike showed an agent does not
// see exit codes, and refuses to type `git commit` or `git reset --hard` from a workflow prompt.
// What a card did is taken from git and from those lines, never from what an agent says it did.

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

// --- build loop (identical in build.js and run.js; a test holds them equal) ---
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

Smallest change that works. Nothing beyond the plan. Do not improve adjacent code, reformat untouched lines, or rename anything not in scope -- every changed line must trace to a plan item.

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

// ---- inputs, written in by `experts.js script --phase run` ----

const PLAN = String((args && args.plan) || '')
const FEATURE = String((args && args.feature) || '')
const CLI = String((args && args.cli) || '')
const VERIFY = (args && typeof args.verify === 'string' && args.verify.trim()) || ''
const COMMAND = String((args && args.command) || '')
const BASE = String((args && args.base) || '')
const CARDS = Array.isArray(args && args.cards) ? args.cards.filter((c) => c && typeof c.name === 'string') : []
const AVAILABLE = Array.isArray(args && args.available) ? args.available.filter((e) => e && typeof e.name === 'string' && typeof e.agent === 'string' && Array.isArray(e.stages)) : []
const PLAN_EXPERTS = Array.isArray(args && args.planExperts) ? args.planExperts.filter((n) => typeof n === 'string') : []
const PROTOCOL = String((args && args.protocol) || '').trim()
const EXPERTS_DIR = String((args && args.expertsDir) || '')
const PLAN_BRIEFS = Array.isArray(args && args.planBriefs) ? args.planBriefs : []
// A resume names one card, or is `{ all: true }` (bare --resume): every card not committed runs again.
const RESUME = args && args.resume && (typeof args.resume.card === 'string' || args.resume.all === true) ? args.resume : null
const RUN_DIR = `.ultimate-workflow/run/${FEATURE}`
const cardDir = (name) => `${RUN_DIR}/cards/${name}`

const missing = [['plan', PLAN], ['feature', FEATURE], ['cli', CLI], ['base', BASE]].filter(([, v]) => !v).map(([k]) => k)
if (missing.length > 0) return { ok: false, error: `args ${missing.join(', ')} missing: run experts.js script --phase run, which writes them in. Nothing was started.` }
if (CARDS.length === 0) return { ok: false, error: `The plan ${PLAN} has no cards. Nothing was started.` }

// Every agent that runs a command is told who asked for it. Without this the S0 agents refused to
// commit ("the workflow text carries no user authority").
const AUTH = `Context: the user started /ultimate-workflow:feature for ${PLAN} and confirmed the plan and the test plan. That command builds every card unattended and commits each finished card to the branch uw/run/${FEATURE}, which it created for this run; the user reviews and merges that branch, and nothing is pushed. The commands below are that run's own steps.`

const STEPS = {
  type: 'object',
  required: ['outputs'],
  properties: {
    outputs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['command', 'output'],
        properties: { command: { type: 'string' }, output: { type: 'string', description: 'The last line of its output, verbatim' } },
      },
    },
  },
}

const runnerOpts = (label) => ({ agentType: agentName('uw-implementer'), label, phase: currentPhase, schema: STEPS, ...modelOpt(IMPLEMENTER_MODEL) })
let currentPhase = 'Cards'
const setPhase = (p) => {
  currentPhase = p
  phase(p)
}

/** The last line of an output that parses as a JSON object, or null. */
function lastJson(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).reverse()
  for (const l of lines) {
    if (!l.startsWith('{')) continue
    try {
      const v = JSON.parse(l)
      if (v && typeof v === 'object') return v
    } catch {}
  }
  return null
}

/** What each command printed, as the agent reported it: read when no line of it parses as JSON. */
const rawOutputs = new Map()

/**
 * Run commands through one agent, in order, and return each one's JSON line (null when it printed
 * none; `rawOutputs` then has what it did print). `files` are written first with the Write tool, exactly as given.
 */
async function runSteps(label, commands, files = []) {
  const writes = files.map((f, i) => `${i + 1}. Write the file ${f.path} with the Write tool. Its whole content is between the markers, exactly, nothing added:\n<<<CONTENT\n${f.text}\nCONTENT>>>`)
  const r = await agent(
    `${AUTH}

${files.length ? `First:\n${writes.join('\n')}\n\nThen run` : 'Run'} each of these shell commands with the Bash tool, one per Bash call, in order. Do not change them, do not add any, do not fix anything they report, and do not stage, commit, branch or reset by any other means. For each, report the command and the last line of its output that is a JSON object (it starts with an opening brace), whole and verbatim; when no line is one, report its last line.

${commands.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
    runnerOpts(label)
  )
  const outs = r && Array.isArray(r.outputs) ? r.outputs : []
  return commands.map((c, i) => {
    const o = outs.find((x) => x && typeof x.command === 'string' && x.command.trim() === c.trim()) || outs[i]
    if (o && typeof o.output === 'string') rawOutputs.set(c, o.output.trim())
    return o ? lastJson(o.output) : null
  })
}

const q = (s) => `"${String(s).replace(/"/g, "'")}"`
const cliCmd = (sub, ...rest) => `${CLI} ${sub} ${rest.join(' ')}`.trim()

// ---- the experts check on one card's diff ----

const FINDINGS = {
  type: 'object',
  required: ['findings', 'lensVerdict'],
  properties: {
    lensVerdict: { type: 'string', description: 'One sentence on the change, INCLUDING when nothing was found' },
    concerns: { type: 'array', items: { type: 'object', required: ['text', 'reason'], properties: { text: { type: 'string' }, reason: { type: 'string' }, file: { type: 'string' }, line: { type: 'integer' } } } },
    stillPresent: { type: 'array', items: { type: 'integer' }, description: 'Indexes of the CARRIED findings you were given that this diff did not fix' },
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
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          fix: { type: 'string' },
          basis: { type: 'string', description: '"skill:<name>", "reference:<category>" or "general"' },
          basisQuote: { type: 'string' },
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
      items: { type: 'object', required: ['index', 'verdict', 'reason'], properties: { index: { type: 'integer' }, verdict: { type: 'string', enum: ['confirmed', 'refuted'] }, reason: { type: 'string' } } },
    },
  },
}

const SELECTION = {
  type: 'object',
  required: ['experts'],
  properties: { experts: { type: 'array', items: { type: 'object', required: ['name', 'why'], properties: { name: { type: 'string' }, why: { type: 'string' } } } } },
}

const NO_QUOTA = 'You have no quota. Zero findings is a correct and common answer, and saying so plainly is more useful than padding.'
const BASIS_RULE = ' For each finding set basis: "skill:<name>" when a row of a skill below made you see it, and copy that row\'s words into basisQuote; "reference:<category>" when it comes from your stage reference; "general" when it comes from your own knowledge.'

// Skills arrive by name, with their text once in args.skillTexts, so a skill several cards use is
// not written into the script once per card. A { name, text } object is taken as it is.
const SKILL_TEXTS = args && args.skillTexts && typeof args.skillTexts === 'object' ? args.skillTexts : {}
const skillsOf = (list) =>
  (Array.isArray(list) ? list : [])
    .map((s) => (typeof s === 'string' ? { name: s, text: SKILL_TEXTS[s] } : s))
    .filter((s) => s && typeof s.name === 'string' && typeof s.text === 'string' && s.text.trim() !== '')

/**
 * Recheck (can only add), each expert on the diff, one skeptic. Returns the lane `experts.js record`
 * takes and the findings by status. `carried` are findings handed to this card: their experts join,
 * and each says which of them this diff did not fix.
 */
async function expertsCheck(card, carried, tag = '') {
  // An expert an earlier card's recheck added is in the plan's experts line from then on (`record
  // --plan` writes it there), and the commit gate holds every later card to that line. A card that
  // names its own experts is held to those instead. The 4-card end-to-end run parked two cards for this.
  const base = Array.isArray(card.experts) ? card.experts : []
  const planned = [...new Set(card.ownExperts ? base : [...base, ...grownExperts])].filter((n) => AVAILABLE.some((e) => e.name === n))
  let selected = [...planned]
  for (const f of carried) if (f.expert && !selected.includes(f.expert) && AVAILABLE.some((e) => e.name === f.expert)) selected.push(f.expert)
  let recheck = false
  let added = []
  if (AVAILABLE.length > 0) {
    const askRecheck = (label) => agent(
      `Decide which domain experts should review this change. The diff is saved at .ultimate-workflow/review.diff; read it, and the surrounding code where a hunk is not clear on its own.

Available experts (the only names you may answer with):
${AVAILABLE.map((e) => `- ${e.name}: ${e.description}`).join('\n')}

Already selected: ${selected.length ? selected.join(', ') : 'none'}.

Name every available expert that applies to this change and is not already selected, each with one sentence tying it to something in the diff. You cannot remove one. If none apply, return an empty list.`,
      { agentType: agentName('uw-explorer'), label, phase: currentPhase, schema: SELECTION, ...modelOpt(IMPLEMENTER_MODEL) }
    )
    // Asked once more when it returns nothing, with a label built from card and tag only.
    const answer = (await askRecheck(`${card.name}${tag}:recheck`)) || (await askRecheck(`${card.name}${tag}:recheck:retry`))
    if (answer) {
      recheck = true
      const names = (answer.experts || []).map((x) => String((x && x.name) || '').trim()).filter((n) => AVAILABLE.some((e) => e.name === n) && !selected.includes(n))
      added = [...new Set(names)]
      selected = [...selected, ...added]
    }
  } else recheck = true
  const reviewing = selected.map((n) => AVAILABLE.find((e) => e.name === n)).filter((e) => e && e.stages.includes('review'))
  const skillsFor = (name) => skillsOf(card.reviewSkills && card.reviewSkills[name])
  const askExpert = (e, label) => {
      const mine = carried.map((f, i) => ({ ...f, index: i })).filter((f) => f.expert === e.name)
      const skills = skillsFor(e.name)
      return agent(
        `Review the changes of card ${card.name} (${card.title}) as the ${e.name} expert. The diff is saved at .ultimate-workflow/review.diff. Stage: review. Read ${EXPERTS_DIR}/${e.name}/references/review.md.${PROTOCOL ? `\n\nTHE PROTOCOL every expert follows:\n${PROTOCOL}` : ''} The plan is at ${PLAN}: read what its "Expert input" section required of this change and report any requirement the diff does not honour. Read the surrounding code, not only the changed lines.${
          mine.length
            ? `\n\nCARRIED findings, made on an earlier card and handed to this one to fix. For each that this diff did NOT fix, put its index in stillPresent:\n${JSON.stringify(mine.map((f) => ({ index: f.index, file: f.file, line: f.line, what: f.what })), null, 2)}`
            : ''
        }${
          skills.length
            ? `\n\nSKILLS for this card (${skills.map((s) => s.name).join(', ')}), chosen by the workflow from the card's planned files and text. Read them before you look for findings.${BASIS_RULE}\n\n${skills.map((s) => s.text.trim()).join('\n\n')}`
            : `\n\nNo skill applies to this card by its planned files. Do not open skill files.${BASIS_RULE}`
        }

Every finding needs a file, a line, one sentence on the defect and a concrete failure scenario. Set lensVerdict whether or not you find anything. ${NO_QUOTA}`,
        { agentType: agentName(e.agent), label, phase: currentPhase, schema: FINDINGS, ...modelOpt(IMPLEMENTER_MODEL) }
      )
  }
  const results = await parallel(reviewing.map((e) => () => askExpert(e, `${card.name}${tag}:${e.name}`)))
  // An expert that returned nothing is asked once more, with a label built from the card, tag and name only,
  // so a resumed run replays the same calls. A valid empty result is a success and is not asked again.
  const retried = await parallel(reviewing.map((e, i) => () => (results[i] ? null : askExpert(e, `${card.name}${tag}:${e.name}:retry`))))
  retried.forEach((r, i) => {
    if (r) results[i] = r
  })
  const ran = reviewing.filter((_, i) => results[i]).map((e) => e.name)
  const failed = reviewing.filter((_, i) => !results[i]).map((e) => e.name)
  const all = []
  const stillPresent = []
  reviewing.forEach((e, i) => {
    const r = results[i]
    if (!r) return
    for (const f of r.findings || []) all.push({ ...f, expert: e.name })
    for (const idx of Array.isArray(r.stillPresent) ? r.stillPresent : []) if (carried[idx] && carried[idx].expert === e.name) stillPresent.push(carried[idx])
  })
  const concerns = []
  reviewing.forEach((e, i) => {
    const r = results[i]
    if (!r) return
    for (const c of (Array.isArray(r.concerns) ? r.concerns : []).slice(0, 3)) if (c && c.text && c.reason) concerns.push({ expert: e.name, text: String(c.text), reason: String(c.reason) })
  })
  let verdicts = new Map()
  if (all.length > 0) {
    const askRefute = (label) => agent(
      `Try to REFUTE each finding below. Your job is not to agree.

${JSON.stringify(all.map((f, index) => ({ index, ...f })), null, 2)}

For each: read the code around it, check whether the failure path is reachable, look for the guard the reviewer missed. Default to refuted when uncertain. Return one verdict per finding, by index.`,
      { agentType: agentName('uw-reviewer'), label, phase: currentPhase, schema: VERDICTS, ...modelOpt(IMPLEMENTER_MODEL) }
    )
    // Asked once more when it returns nothing. Findings no skeptic checked must not drive a paid fix round,
    // so a second null counts as a failed check and the card is parked by the caller.
    const v = (await askRefute(`${card.name}${tag}:refute`)) || (await askRefute(`${card.name}${tag}:refute:retry`))
    if (!v) failed.push('refute')
    verdicts = new Map(((v && v.verdicts) || []).map((x) => [x.index, x]))
  }
  const kept = []
  const refuted = []
  all.forEach((f, i) => {
    const v = verdicts.get(i)
    if (v && v.verdict === 'refuted') refuted.push({ ...f, refutedBecause: v.reason })
    else kept.push({ ...f, status: v ? 'confirmed' : 'unverified' })
  })
  const laneFindings = kept.map((f) => ({ expert: f.expert, file: f.file, line: f.line, what: f.what, confidence: f.confidence, ...(f.severity ? { severity: f.severity } : {}), ...(typeof f.basis === 'string' ? { basis: f.basis } : {}), ...(typeof f.basisQuote === 'string' ? { basisQuote: f.basisQuote } : {}), status: f.status }))
  const lane = {
    stage: 'review',
    available: AVAILABLE.map((e) => e.name),
    planned,
    selected,
    added,
    ran,
    failed,
    skillsLoaded: Object.fromEntries(reviewing.map((e) => [e.name, skillsFor(e.name).map((s) => s.name)])),
    recheck,
    findings: laneFindings,
    concerns,
  }
  return {
    lane,
    blocking: laneFindings.filter((f) => f.confidence === 'high'),
    nonBlocking: laneFindings.filter((f) => f.confidence !== 'high'),
    refuted,
    stillPresent,
    failed,
  }
}

// ---- one card, start to end ----

const status = {}
const grownExperts = new Set()
const report = []
const packs = {}
const warned = new Set()
const lanes = []
const handed = {}
const findingsQueue = []
let lastParkKey = ''
let stoppedBecause = ''

const parkKey = (reason) => String(reason || '').toLowerCase().replace(/[0-9a-f]{7,}/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)

// The command that acts on a held card, for the notice and the report.
const resumeCmd = (name, needsDecision) => (needsDecision ? `/ultimate-workflow:feature --resume ${name} --accept (take the decision into the plan), or --resume ${name} (run it again within the plan)` : `/ultimate-workflow:feature --resume ${name}`)

async function parkCard(card, reasonIn, extra = {}) {
  // A held card run again within the plan that still cannot be finished needs the same decision:
  // it goes back to needs-decision with that decision and why the plan alone was not enough, never
  // to a plain park that hides the decision (2026-11-09, a live --resume without --accept).
  const rerunFailed = RESUME && RESUME.rerun && RESUME.card === card.name && extra.needsDecision !== true
  const needsDecision = extra.needsDecision === true || rerunFailed
  const avoided = String(RESUME && RESUME.avoid || '').replace(/^needs a decision the plan does not state:\s*/i, '').replace(/\s*\r?\n\s*/g, ' ').trim()
  const reason = rerunFailed ? `cannot be done within the plan: needs decision ${avoided}; run --resume ${card.name} --accept to allow it, or change the plan.\n- detail, from the run within the plan: ${String(reasonIn).replace(/\s*\r?\n\s*/g, ' ').slice(0, 600)}` : reasonIn
  const reasonFile = `${cardDir(card.name)}/park-reason.txt`
  // The user hears about it now, from the same step: the notice names the card, why and what to run.
  const [parked] = await runSteps(
    `${card.name}:park`,
    [
      cliCmd('park', '--plan', q(PLAN), '--card', card.name, '--feature', FEATURE, '--reason-file', q(reasonFile), ...(needsDecision ? ['--needs-decision'] : [])),
      cliCmd('notify', '--feature', FEATURE, '--kind', needsDecision ? 'needs-decision' : 'parked', '--card', card.name, '--reason-file', q(reasonFile), '--action', q(resumeCmd(card.name, needsDecision))),
    ],
    [{ path: reasonFile, text: reason }]
  )
  status[card.name] = needsDecision ? 'needs-decision' : 'parked'
  const entry = { card: card.name, title: card.title, status: status[card.name], action: resumeCmd(card.name, needsDecision), reason: String(reason).trim().replace(/\s*\r?\n\s*/g, ' ').slice(0, 300), branch: parked && parked.ok ? parked.branch : null, parkOk: Boolean(parked && parked.ok), ...(parked && !parked.ok ? { parkError: parked.reason || 'the park command printed nothing' } : {}), ...extra }
  report.push(entry)
  const key = parkKey(entry.reason)
  if (key && key === lastParkKey) stoppedBecause = `two cards in a row were parked for the same reason: ${entry.reason}`
  lastParkKey = key
  if (!parked || !parked.ok) stoppedBecause = stoppedBecause || `card ${card.name} could not be parked (${entry.parkError}), so the tree may still hold its work`
  await journal(card, 'parked', reason)
  return entry
}

async function journal(card, outcome, note) {
  const r = await agent(
    `${AUTH}

Card ${card.name} (${card.title}) of this run just ended: ${outcome}. Write its lessons for the cards after it, from the evidence and not from what any agent said it did: run \`git diff HEAD~1 --stat\` when it was committed (\`git log -1 --format=%B uw/parked/${FEATURE}/${card.name}\` and \`git show --stat uw/parked/${FEATURE}/${card.name}\` when it was parked), and read ${cardDir(card.name)}/ for its files.${note ? `\n\nWhat the run recorded:\n${String(note).slice(0, 3000)}` : ''}

At most 10 short lines: what tripped it up, conventions found in the code, decisions later cards must respect, and, when parked, why. Nothing generic; a card with nothing worth passing on writes one line saying so. Write them to ${cardDir(card.name)}/journal.txt with the Write tool, then run \`${cliCmd('journal add', '--feature', FEATURE, '--card', card.name, '--status', outcome, '--from', q(`${cardDir(card.name)}/journal.txt`))}\` and report its last line. If that line says overLimit, write a one or two line summary of the journal entry of the first card it names under "oldest" to ${cardDir(card.name)}/summary.txt and run \`${cliCmd('journal compact', '--feature', FEATURE, '--card', '<that card>', '--from', q(`${cardDir(card.name)}/summary.txt`))}\`.`,
    runnerOpts(`${card.name}:journal`)
  )
  return r
}

/** Where a non-blocking finding goes: the first later card whose paths cover its file, else the findings card. */
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

const FIXED = {
  type: 'object',
  required: ['green', 'fullSuiteGreen', 'filesChanged', 'summary'],
  properties: {
    green: { type: 'boolean' },
    fullSuiteGreen: { type: 'boolean', description: 'True only if the full run (verify --full) was run after the last change and passed' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    testFiles: { type: 'array', items: { type: 'string' }, description: 'Test files written or changed in this round' },
    decisions: { type: 'array', items: { type: 'object', required: ['what', 'major'], properties: { what: { type: 'string' }, why: { type: 'string' }, major: { type: 'boolean' } } } },
    newTests: { type: 'array', items: { type: 'object', required: ['name', 'failedFirst'], properties: { name: { type: 'string' }, failedFirst: { type: 'boolean' }, why: { type: 'string' } } } },
    failureOutput: { type: 'string' },
    summary: { type: 'string' },
  },
}

/** One more build round in the card, for the blocking findings the experts check made in its own files. */
async function fixFindings(card, locate, brief, findings) {
  return agent(
    `${locate} ${EXPERT_NOTE}${brief}

The card's tests and implementation are written and green, but the experts check on its diff found ${findings.length > 1 ? 'these blocking findings' : 'this blocking finding'}, in this card's own files:
${findings.map((f) => `- ${f.expert} at ${f.file}:${f.line}: ${f.what}${f.howItFails ? ` (fails when: ${f.howItFails})` : ''}${f.fix ? ` (fix: ${f.fix})` : ''}`).join('\n')}

Fix each one, in this card's files only. A missing test: write it. It may pass at once against code that already does the right thing, which is the fix; list it in newTests with failedFirst false and say why. Wrong or missing behaviour: first write a test that shows it, run it and confirm it FAILS (failedFirst true), then change the code. ${
      VERIFY ? `After each change run \`${VERIFY}\`; when it passes, run \`${VERIFY} --full\` once. Report green and fullSuiteGreen only if that full run passed after your last change.` : `Run \`${COMMAND}\` and report whether it is green; set fullSuiteGreen to the same.`
    }

Never stage or commit: the run commits the card after a fresh experts check. Never make a finding go away by weakening or deleting a test. Nothing beyond the findings. List in decisions any choice you made that the plan does not state, with major true for a dependency, schema, external service, environment variable, public interface, security configuration or a file outside the card.`,
    { agentType: agentName('uw-implementer'), label: `${card.name}:fix-round`, phase: currentPhase, schema: FIXED, ...modelOpt(IMPLEMENTER_MODEL) }
  )
}

async function runCard(card, { adhoc = false } = {}) {
  log(`card ${card.name}: ${card.title}`)
  const pre = card.preflight || { ok: false, reason: 'no context pack was written for this card' }
  if (!pre.ok) return parkCard(card, pre.reason || 'missing input')
  if (pre.tokens !== undefined) packs[card.name] = { tokens: pre.tokens, budget: pre.budget }
  // A warning the pack returned (a mistyped pack_budget) is shown once, however many cards carry it.
  for (const w of (pre.warnings || []).filter((x) => !warned.has(x))) {
    warned.add(w)
    await runSteps(`${card.name}:warning`, [cliCmd('notify', '--feature', FEATURE, '--kind', 'warning', '--card', card.name, '--reason', q(w))])
  }
  if (pre.overBudget) await runSteps(`${card.name}:budget`, [cliCmd('notify', '--feature', FEATURE, '--kind', 'over-budget', '--card', card.name, '--reason', q(`the context pack is about ${pre.tokens} tokens, over its budget of ${pre.budget}: the required entries alone are too large`))])
  // The plan shows the card as running before any work, so a run that dies inside it leaves it there.
  await runSteps(`${card.name}:start`, [cliCmd('card-status', '--plan', q(PLAN), '--card', card.name, '--status', q(RESUME && RESUME.card === card.name ? 'running (resumed)' : 'running'))])
  const carried = handed[card.name] || []
  // --resume <card> without --accept on a card held for a decision runs it again from its tests,
  // told what it did last time; with --accept (or for a parked card) it continues where it stopped.
  const rerun = RESUME && RESUME.card === card.name && RESUME.rerun ? RESUME : null
  const resume = RESUME && RESUME.card === card.name && !RESUME.rerun ? { reason: String(RESUME.reason || 'resumed from its parked branch'), testFiles: Array.isArray(RESUME.testFiles) ? RESUME.testFiles : [] } : null
  const briefs = (Array.isArray(card.briefs) ? card.briefs : []).filter((b) => b && typeof b.name === 'string' && typeof b.text === 'string' && b.text.trim())
  const skills = briefs.flatMap((b) => skillsOf(b.skills)).filter((s, i, all) => all.findIndex((x) => x.name === s.name) === i)
  const brief = briefs.length === 0 ? '' : `\n\nSTANDING BRIEF, from ${briefs.map((b) => b.name).join(', ')}. It applies to every line you write, and it adds no work: do nothing the plan did not ask for.\n\n${briefs.map((b) => b.text.trim()).join('\n\n')}\n${skills.length ? `\nSKILLS for this card (${skills.map((s) => s.name).join(', ')}), chosen from its planned files and text. Write the code so that none of them would find anything. They add no work.\n\n${skills.map((s) => s.text.trim()).join('\n\n')}\n` : ''}`
  const carriedText = [...(rerun ? [`The last attempt at this card was stopped for a decision the plan does not state, and the user did not accept it: ${rerun.avoid}. Stay within the plan: do not take that decision again. If the card cannot be done without it, say so and stop.`] : []), ...(RESUME && RESUME.card === card.name && RESUME.accepted ? [`The user accepted this decision, which is now in the plan's Decisions: ${RESUME.accepted}`] : []), ...(card.carried || []), ...carried.map((f) => `${f.expert} found at ${f.file}:${f.line}: ${f.what}${f.fix ? ` (fix: ${f.fix})` : ''}`)]
  const locate = `This is card ${card.name} (${card.title}) of the plan ${PLAN}. Read its context pack ${pre.contextFile} and every file it lists before you write anything; the run journal in it holds what earlier cards learned. Change only files under this card's paths (${(card.paths || []).join(', ')}) and the tests for it.${carriedText.length ? `\n\nCARRIED to this card, part of its work:\n${carriedText.map((c) => `- ${c}`).join('\n')}` : ''}`
  const loopOpts = {
    locate,
    brief,
    verify: VERIFY,
    command: COMMAND,
    resume,
    label: (s) => `${card.name}:${s}`,
    phases: { tests: currentPhase, implement: currentPhase, verify: currentPhase },
    setPhase: false,
    testsWhere: adhoc ? 'the items carried to this card: one test for each that can have one' : `this card's section of the plan's Tests (the context pack names its lines)`,
    testsCommitRule: 'Never stage or commit: the run commits the card itself after the experts check.',
    implementCommitRule: 'Never stage or commit, not even part of the work: the run commits the card itself after the experts check, through the commit gates.',
    implementerModel: IMPLEMENTER_MODEL,
    diagnoserModel: DIAGNOSER_MODEL,
    briefsLoaded: briefs.map((b) => b.name),
    skillsLoaded: skills.map((s) => s.name),
  }
  let build = await buildLoop(loopOpts)
  // A card the run added for a finding that the code is untested (a review's test-coverage lens, an
  // expert on a missing case) is done when the test exists: its new tests pass against code that is
  // already right, which is the fix, not a test with no oracle. Only for such a card, and only when
  // every carried item is about tests, it goes on to the full run with those tests, on record.
  let testsOnly = false
  const aboutTests = (f) => /test|coverage|assert|untested|no case/i.test(`${f.lens || ''} ${f.what || ''}`)
  if (adhoc && build.stoppedAt === 'Tests' && (build.filesWritten || []).length > 0 && card.items && card.items.length > 0 && card.items.every(aboutTests)) {
    testsOnly = true
    log(`card ${card.name}: its tests pass against the existing code and every item was a missing test; continuing with them`)
    build = await buildLoop({ ...loopOpts, resume: { reason: 'the carried findings were missing tests; the new tests pass against code that already does the right thing', testFiles: build.filesWritten } })
  }
  const buildSummary = { green: Boolean(build.green), rounds: build.rounds || (build.history ? build.history.length : 0), testFiles: build.testFiles || build.filesWritten || [], ...(testsOnly ? { testsOnly: true } : {}) }
  if (!build.green) {
    const why = build.escalation || [build.error, build.reason, build.hint, build.unexpectedlyPassing && build.unexpectedlyPassing.length ? `Passing before the implementation: ${build.unexpectedlyPassing.join(', ')}` : ''].filter(Boolean).join('\n')
    return parkCard(card, `${build.stoppedAt === 'Tests' ? 'tests did not fail first' : 'not green'}: ${why || 'the build stopped'}`, { build: buildSummary })
  }

  const [scope, prepared] = await runSteps(`${card.name}:prepare`, [
    cliCmd('scope', '--plan', q(PLAN), '--card', card.name),
    `${cliCmd('prepare', '--range', 'working')} > ${q(`${cardDir(card.name)}/prepare.json`)} && node -e "console.log(JSON.stringify({ok:true}))"`,
  ])
  const outOfScope = scope && Array.isArray(scope.outOfScope) ? scope.outOfScope : null
  if (!prepared || prepared.ok !== true) return parkCard(card, 'the experts check could not start: experts.js prepare did not report success', { build: buildSummary })

  let check = await expertsCheck(card, carried)
  lanes.push({ card: card.name, lane: check.lane, refuted: check.refuted.length })
  if (check.failed.length > 0) {
    return parkCard(card, `the experts check failed (first check): ${check.failed.join(', ')} returned nothing, also on the retry`, { build: buildSummary })
  }
  // A blocking finding in this card's own files gets one fix round in the card, then a fresh
  // experts check on the new diff. Only what is still blocking after it, or a blocking finding in a
  // file the card may not touch, parks the card. Three real runs of four parked a card on a missing
  // test in its own test file that one more round would have written.
  let fixRound = null
  if (check.blocking.length > 0) {
    const outside = check.blocking.filter((f) => !inCard(card, f.file, buildSummary.testFiles))
    if (outside.length === 0) {
      const fixed = await fixFindings(card, locate, brief, check.blocking)
      fixRound = { round: buildSummary.rounds + 1, findings: check.blocking.map((f) => ({ expert: f.expert, file: f.file, line: f.line, what: f.what })), green: Boolean(fixed && fixed.green === true && fixed.fullSuiteGreen === true), summary: (fixed && fixed.summary) || 'the fix round returned nothing', decisions: (fixed && Array.isArray(fixed.decisions) && fixed.decisions) || [] }
      if (fixRound.green) {
        buildSummary.testFiles = [...new Set([...buildSummary.testFiles, ...((fixed && fixed.testFiles) || [])])]
        const [, again] = await runSteps(`${card.name}:prepare-fix`, [
          cliCmd('scope', '--plan', q(PLAN), '--card', card.name),
          `${cliCmd('prepare', '--range', 'working')} > ${q(`${cardDir(card.name)}/prepare.json`)} && node -e "console.log(JSON.stringify({ok:true}))"`,
        ])
        if (!again || again.ok !== true) fixRound.outcome = 'the experts check could not start again after the fix round'
        else {
          const recheck = await expertsCheck(card, carried, '-fix')
          lanes.push({ card: card.name, lane: recheck.lane, refuted: recheck.refuted.length, fixRound: true })
          if (recheck.failed.length > 0) fixRound.outcome = `the experts check after the fix round failed: ${recheck.failed.join(', ')} returned nothing, also on the retry`
          else {
            fixRound.outcome = recheck.blocking.length === 0 ? 'fixed' : 'still blocking'
            check = recheck
          }
        }
      } else fixRound.outcome = 'not green'
      if (fixRound.outcome !== 'fixed') {
        const still = fixRound.outcome === 'still blocking' ? check.blocking : fixRound.findings
        return parkCard(card, `blocking finding${still.length > 1 ? 's' : ''} from the experts check, not fixed by the fix round (${fixRound.outcome}):\n${still.map((f) => `- ${f.expert}: ${f.file}:${f.line} ${f.what}`).join('\n')}`, { build: buildSummary, findings: still, fixRound })
      }
    } else {
      return parkCard(card, `blocking finding${check.blocking.length > 1 ? 's' : ''} from the experts check, outside this card's paths so no fix round:\n${check.blocking.map((f) => `- ${f.expert}: ${f.file}:${f.line} ${f.what}`).join('\n')}`, { build: buildSummary, findings: check.blocking })
    }
  }

  // Decisions the plan does not state (2026-11-09): the implementer's own list, and what code finds
  // in the diff. A major one is not committed: the card is held as needs-decision, its work kept on
  // the branch and the user told now; the cards that do not depend on it go on. Minor ones go into
  // the handoff and the report.
  const declared = [...((build && build.decisions) || []), ...((fixRound && fixRound.decisions) || [])]
  const declaredFile = `${cardDir(card.name)}/declared-decisions.json`
  const [decided] = await runSteps(`${card.name}:decisions`, [cliCmd('decisions', '--plan', q(PLAN), '--card', card.name, '--feature', FEATURE, '--declared', q(declaredFile))], [{ path: declaredFile, text: JSON.stringify(declared) }])
  if (!decided || decided.ok !== true) return parkCard(card, 'the check for decisions the plan does not state could not run: experts.js decisions did not report success', { build: buildSummary })
  if ((decided.major || []).length > 0) {
    return parkCard(card, `needs a decision the plan does not state:\n${decided.major.map((d) => `- ${d.kind}: ${d.what}`).join('\n')}`, { build: buildSummary, needsDecision: true, decisions: { major: decided.major, minor: decided.minor || [] } })
  }
  const minorDecisions = decided.minor || []

  // Carried findings this card did not fix, from the last check only, so a fix round does not add them twice.
  for (const f of check.stillPresent) findingsQueue.push({ ...f, from: f.from || card.name, notFixedBy: card.name })

  const laneFile = `${cardDir(card.name)}/lane.json`
  const commitCmd = cliCmd('card-commit', '--plan', q(PLAN), '--card', card.name, '--feature', FEATURE, ...(buildSummary.testFiles.length ? ['--claimed', q(buildSummary.testFiles.join(','))] : []), ...(fixRound && fixRound.outcome === 'fixed' ? ['--fixed-round'] : []))
  const [recorded, committed] = await runSteps(
    `${card.name}:commit`,
    [
      cliCmd('record', '--stage', 'review', '--plan', q(PLAN), '--result', q(laneFile)),
      commitCmd,
    ],
    [{ path: laneFile, text: JSON.stringify({ ok: true, expertLane: check.lane }) }]
  )
  // The record is checked against the lane the script built, so a lane retyped wrong is caught here.
  const recordOk = recorded && Array.isArray(recorded.recorded) && recorded.recorded.length === check.lane.ran.length && recorded.findings === check.lane.findings.length
  // `record --plan` has now written this lane's selection into the plan's experts line.
  if (recorded && recorded.plan) for (const n of check.lane.selected) grownExperts.add(n)
  if (!committed || committed.ok !== true) {
    const why = !recordOk ? `the experts' evidence was not recorded as built (record printed ${JSON.stringify(recorded)})` : `the commit was refused: ${(committed && (committed.reason || committed.gate)) || (rawOutputs.get(commitCmd) ? `card-commit printed no JSON line; it printed: ${rawOutputs.get(commitCmd).replace(/\s*\r?\n\s*/g, ' ').slice(0, 300)}` : 'card-commit printed nothing')}`
    return parkCard(card, why, { build: buildSummary })
  }
  status[card.name] = 'committed'
  lastParkKey = ''
  // Decision 2: a non-blocking finding goes to the first later card that can touch its file, else to the findings card.
  const later = CARDS.filter((c) => status[c.name] === undefined && c.name !== card.name)
  const carriedOn = []
  for (const f of check.nonBlocking) {
    const to = later.find((c) => covers(c.paths, f.file))
    if (to) {
      ;(handed[to.name] = handed[to.name] || []).push({ ...f, from: card.name })
      carriedOn.push({ to: to.name, finding: f })
    } else findingsQueue.push({ ...f, from: card.name })
  }
  if (carriedOn.length) {
    await runSteps(`${card.name}:carry`, carriedOn.map((c) => cliCmd('card-field', '--plan', q(PLAN), '--card', c.to, '--carried', q(`${c.finding.expert} at ${c.finding.file}:${c.finding.line}: ${c.finding.what}`.replace(/;/g, ',')))))
  }
  const entry = { card: card.name, title: card.title, status: 'committed', commit: committed.commit, handoff: committed.handoff, missingClaims: committed.missingClaims || [], outOfScope, build: buildSummary, ...(rerun && rerun.heldBranch ? { superseded: rerun.heldBranch } : {}), experts: { ran: check.lane.ran, added: check.lane.added, findings: check.lane.findings.length, refuted: check.refuted.length, carriedOn: carriedOn.map((c) => c.to) }, ...(fixRound ? { fixRound } : {}), ...(minorDecisions.length ? { decisions: { major: [], minor: minorDecisions } } : {}), ...(recordOk ? {} : { recordMismatch: recorded }) }
  report.push(entry)
  await journal(card, 'committed', `rounds: ${buildSummary.rounds}; files: ${committed.files}; findings: ${check.lane.findings.length}`)
  return entry
}

// ---- the card loop ----

setPhase('Cards')
const names = new Set(CARDS.map((c) => c.name))
for (const c of CARDS) {
  if (c.committed) status[c.name] = 'committed'
  else if (c.parked && !(RESUME && RESUME.card === c.name) && !(RESUME && RESUME.all)) status[c.name] = 'parked'
}
const earlier = Object.entries(status).map(([card, s]) => ({ card, status: s, earlierRun: true }))

function nextReady() {
  for (;;) {
    let changed = false
    for (const c of CARDS) {
      if (status[c.name] !== undefined) continue
      const bad = (c.depends || []).find((d) => !names.has(d) || status[d] === 'parked' || status[d] === 'needs-decision' || status[d] === 'blocked')
      if (bad) {
        status[c.name] = 'blocked'
        report.push({ card: c.name, title: c.title, status: 'blocked', reason: names.has(bad) ? `depends on ${bad}, which is ${status[bad]}` : `depends on ${bad}, which is not a card of the plan` })
        changed = true
        continue
      }
      if ((c.depends || []).every((d) => status[d] === 'committed')) return c
    }
    if (!changed) return null
  }
}

for (let card = nextReady(); card && !stoppedBecause; card = nextReady()) await runCard(card)
for (const c of CARDS) {
  if (status[c.name] !== undefined) continue
  status[c.name] = stoppedBecause ? 'not started' : 'blocked'
  report.push({ card: c.name, title: c.title, status: status[c.name], reason: stoppedBecause ? `the run stopped: ${stoppedBecause}` : 'its dependencies never became ready (a cycle)' })
}
// Each card blocked behind a parked one says which in the plan; a card not started stays pending.
// The user gets one notice for all of them (4.7.1): six cards behind one parked card were six
// notices that said the same thing.
const blockedCards = report
  .filter((e) => e.status === 'blocked' && /^depends on (\S+), which is/.test(e.reason || ''))
  .map((e) => ({ card: e.card, by: /^depends on (\S+),/.exec(e.reason)[1] }))
const blockedSteps = blockedCards.map((b) => cliCmd('card-status', '--plan', q(PLAN), '--card', b.card, '--status', q(`blocked by ${b.by}`)))
if (blockedCards.length) {
  const behind = [...new Set(blockedCards.map((b) => b.by))]
  const roots = behind.filter((by) => status[by] === 'parked' || status[by] === 'needs-decision')
  const why = `${blockedCards.length} ${blockedCards.length === 1 ? 'card is' : 'cards are'} blocked: ${behind.map((by) => `${blockedCards.filter((b) => b.by === by).map((b) => b.card).join(', ')} behind ${by}`).join('; ')}`
  blockedSteps.push(cliCmd('notify', '--feature', FEATURE, '--kind', 'blocked', '--reason', q(why), ...(roots.length ? ['--action', q(roots.map((by) => `settle ${by} first: ${resumeCmd(by, status[by] === 'needs-decision')}`).join('; '))] : [])))
}
if (blockedSteps.length) await runSteps('blocked:status', blockedSteps)
// A stop is a blocker too, and the user hears about it when it happens.
if (stoppedBecause) await runSteps('stopped:notify', [cliCmd('notify', '--feature', FEATURE, '--kind', 'stopped', '--reason', q(stoppedBecause.replace(/\s*\r?\n\s*/g, ' ').slice(0, 300)), '--action', q('read the report, then /ultimate-workflow:feature --resume'))])

// ---- the findings card, the review and its fix-up card ----

const MAX_FIXUP_CARDS = 4
const adhocPaths = []
async function adhocCard(name, title, items, experts, label = name) {
  const files = [...new Set(items.map((f) => String(f.file || '').replace(/\\/g, '/')).filter(Boolean))]
  // Only names the plan's line holds: card-add refuses any other, and a plan with no line takes no --experts.
  const laneExperts = experts.filter((n) => PLAN_EXPERTS.includes(n))
  const carriedText = items.map((f) => `${f.expert || f.lens} at ${f.file}:${f.line}: ${f.what}`.replace(/;/g, ','))
  // The name is free-chosen: every later step keys on the one card-add printed.
  const addCmd = cliCmd('card-add', '--plan', q(PLAN), '--name', name, '--free-name', '--title', q(title), '--paths', q(files.join(',') || '.'), '--carried', q(carriedText.join('; ')), ...(PLAN_EXPERTS.length > 0 ? ['--experts', laneExperts.length > 0 ? laneExperts.join(',') : 'none'] : []))
  const [added] = await runSteps(`${label}:setup`, [addCmd])
  // A card that never reached the plan cannot be parked (park looks it up there), and nothing was
  // built for it, so it is recorded as not started and the run goes on to the harvest.
  if (!(added && added.ok)) {
    status[label] = 'not started'
    const entry = { card: label, title, status: 'not started', reason: `the ${label} card could not be added to the plan: ${(added && added.reason) || (rawOutputs.get(addCmd) ? `card-add printed no JSON line; it printed: ${rawOutputs.get(addCmd).replace(/\s*\r?\n\s*/g, ' ').slice(0, 300)}` : 'card-add printed nothing (see its error in the setup agent)')}`, items }
    report.push(entry)
    return entry
  }
  const cardName = (added.card && added.card.name) || name
  const [packed] = await runSteps(`${cardName}:pack`, [cliCmd('pack', '--plan', q(PLAN), '--card', cardName, '--feature', FEATURE, '--adhoc')])
  const cardPaths = (added.card && Array.isArray(added.card.paths) && added.card.paths) || files
  adhocPaths.push(...cardPaths)
  const card = { name: cardName, title, paths: cardPaths, carried: [], depends: [], items, experts, briefs: PLAN_BRIEFS, reviewSkills: {}, preflight: packed && packed.ok ? { ok: true, contextFile: packed.contextFile } : { ok: false, reason: `the ${cardName} card could not be set up: ${(packed && packed.reason) || 'pack printed nothing'}` } }
  return runCard(card, { adhoc: true })
}

let findingsCard = null
if (!stoppedBecause && findingsQueue.length > 0) {
  setPhase('Findings')
  findingsCard = await adhocCard('findings', 'non-blocking expert findings no card fixed', findingsQueue, [...new Set(findingsQueue.map((f) => f.expert).filter(Boolean))])
}

setPhase('Review')
const REVIEW_LENSES = ['correctness', 'simplicity', 'surgical-scope', 'test-coverage']
const anyCommitted = Object.values(status).includes('committed')
let review = { ran: false, reason: anyCommitted ? '' : 'no card was committed, so there is nothing to review' }
let fixupCard = null
if (anyCommitted && !stoppedBecause) {
  const lensResults = await parallel(
    REVIEW_LENSES.map((lens) => () =>
      agent(
        `Review the diff \`git diff ${BASE}..HEAD\` (every card this run committed) through the ${lens} lens ONLY. Another reviewer has each of the other lenses. Read the plan ${PLAN} first, then the diff, then the surrounding code.${lens === 'surgical-scope' ? ' For each hunk ask whether it traces to the plan; flag what does not.' : ''}${lens === 'test-coverage' ? ' Ask whether the tests would FAIL if the code were wrong.' : ''}

Every finding needs a file, a line, one sentence on the defect and a concrete failure scenario. Set lensVerdict whether or not you find anything. ${NO_QUOTA}`,
        { agentType: agentName('uw-reviewer'), label: `review:${lens}`, phase: 'Review', schema: FINDINGS }
      )
    )
  )
  const all = []
  REVIEW_LENSES.forEach((lens, i) => {
    for (const f of (lensResults[i] && lensResults[i].findings) || []) all.push({ ...f, lens })
  })
  const failedLenses = REVIEW_LENSES.filter((_, i) => !lensResults[i])
  let confirmed = []
  let refuted = []
  let unverified = []
  if (all.length > 0) {
    const v = await agent(
      `Try to REFUTE each finding below. Your job is not to agree.

${JSON.stringify(all.map((f, index) => ({ index, ...f })), null, 2)}

For each: read the code, check the failure path is reachable, look for the guard the reviewer missed. Default to refuted when uncertain. One verdict per finding, by index.`,
      { agentType: agentName('uw-reviewer'), label: 'review:refute', phase: 'Review', schema: VERDICTS }
    )
    const byIndex = new Map(((v && v.verdicts) || []).map((x) => [x.index, x]))
    all.forEach((f, i) => {
      const x = byIndex.get(i)
      if (!x) unverified.push(f)
      else if (x.verdict === 'confirmed') confirmed.push({ ...f, verifiedBecause: x.reason })
      else refuted.push({ ...f, refutedBecause: x.reason })
    })
  }
  review = { ran: failedLenses.length < REVIEW_LENSES.length, range: `${BASE}..HEAD`, failedLenses, findings: confirmed, refuted, unverified }
  // Decision 2 applied to the review (2026-11-09): a confirmed finding is fixed, not only reported.
  // High and medium ones in a file some card of this run could change go to fix-up cards; low ones,
  // and any outside the run's files, stay in the report. One card per plan card whose paths cover the
  // file (the first in plan order), lane = the experts of every plan card covering the group's files,
  // so G6 finds the evidence it asks for; files no plan card covers make one more card with the plan's
  // line. At most MAX_FIXUP_CARDS cards: the findings of the groups past that stay in the report.
  const runCards = [...CARDS, { paths: adhocPaths }]
  const runTests = report.flatMap((e) => (e.build && e.build.testFiles) || [])
  const inRun = (f) => runCards.some((c) => inCard(c, f.file, runTests))
  const toFix = confirmed.filter((f) => (f.confidence === 'high' || f.confidence === 'medium') && inRun(f))
  const owners = [...CARDS.map((c) => c.name), '']
  const ownerOf = (f) => (CARDS.find((c) => inCard(c, f.file)) || { name: '' }).name
  const groups = owners.map((owner) => toFix.filter((f) => ownerOf(f) === owner)).filter((g) => g.length > 0).slice(0, MAX_FIXUP_CARDS)
  review.leftInReport = confirmed.length - groups.reduce((n, g) => n + g.length, 0)
  for (const [i, group] of groups.entries()) {
    const covering = CARDS.filter((c) => group.some((f) => inCard(c, f.file)))
    const lane = covering.length > 0 ? [...new Set(covering.flatMap((c) => c.experts || []))] : PLAN_EXPERTS
    const entry = await adhocCard('fixup', 'confirmed review findings', group, lane, i === 0 ? 'fixup' : `fixup-${i + 1}`)
    if (i === 0) fixupCard = entry
    if (stoppedBecause) break
  }
}

// ---- harvest to a branch ----

setPhase('Harvest')
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
let harvest = { ran: false, reason: anyCommitted ? '' : 'nothing was committed' }
if (anyCommitted) {
  const routed = await agent(
    `Harvest the durable lessons of this run. Read the run journal ${RUN_DIR}/journal.md (what each card learned), the plan ${PLAN}, \`git diff ${BASE}..HEAD --stat\` and \`git log ${BASE}..HEAD\`, and what the project already records: the "## Gotchas" of AGENTS.md (or CLAUDE.md), memory.md and memory/*.md. First run \`${CLI} memory check\` (add \`--root <folder>\` when memory.md is not in the project root) and use its warnings: a topical not migrated, or a header path that matches no file, which you correct with add_paths, add_keywords and remove_paths on that topical.

Route each lesson worth keeping: "Beware / Don't / Note that" is a Gotcha (path AGENTS.md, or CLAUDE.md when there is no AGENTS.md); "how X works / why we picked Y" extends or starts a memory/<topic>.md (a new topical needs description, paths and keywords, its header; never propose an edit to memory.md, its index is generated); one dated summary of the whole run is a progress.md entry. Discard what is already recorded, obvious from the code, a one-off slip, or not durable, and say why. For each kept one write the exact text to add, in the voice of the target file. ${NO_QUOTA}`,
    { agentType: agentName('uw-harvester'), label: 'harvest', phase: 'Harvest', schema: PROPOSALS }
  )
  if (!routed) harvest = { ran: false, reason: 'the harvest agent returned nothing' }
  else {
    const file = `${RUN_DIR}/harvest.json`
    const [branch] = await runSteps('harvest:branch', [cliCmd('harvest-branch', '--feature', FEATURE, '--from', q(file))], [{ path: file, text: JSON.stringify(routed.proposals) }])
    harvest = { ran: true, proposals: routed.proposals.length, discarded: routed.discarded.length, branch: branch && branch.ok ? branch.branch : null, commits: branch && branch.ok ? branch.commits : [], ...(branch && branch.ok ? {} : { error: (branch && branch.reason) || 'harvest-branch printed nothing' }), list: routed.proposals.map((p) => ({ destination: p.destination, path: p.path, source: p.source })) }
  }
}

const counts = report.reduce((n, r) => ({ ...n, [r.status]: (n[r.status] || 0) + 1 }), {})
// One notice when the run ends, with the counts, whatever the outcome.
const held = report.filter((e) => e.status === 'parked' || e.status === 'needs-decision').map((e) => e.card)
await runSteps('finished:notify', [cliCmd('notify', '--feature', FEATURE, '--kind', 'finished', '--reason', q(`${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ') || 'no cards'}${stoppedBecause ? '; stopped' : ''}`), '--action', q(held.length ? `settle ${held.join(', ')}: the report lists the command for each` : `review and merge uw/run/${FEATURE}`))])
return {
  ok: true,
  feature: FEATURE,
  branch: `uw/run/${FEATURE}`,
  base: BASE,
  plan: PLAN,
  cards: report.map((e) => (packs[e.card] ? { ...e, pack: packs[e.card] } : e)),
  earlier,
  counts,
  findingsCard,
  review,
  fixupCard,
  harvest,
  expertLanes: lanes,
  pendingFindings: findingsCard && findingsCard.status !== 'not started' ? [] : findingsQueue,
  ...(stoppedBecause ? { stopped: stoppedBecause } : {}),
  summary: `${counts.committed || 0} committed, ${counts.parked || 0} parked, ${counts.blocked || 0} blocked${counts['not started'] ? `, ${counts['not started']} not started` : ''}${stoppedBecause ? `; stopped: ${stoppedBecause}` : ''}. Review: ${review.ran ? `${(review.findings || []).length} confirmed` : review.reason || 'not run'}. Harvest: ${harvest.ran ? `${harvest.proposals || 0} proposals${harvest.branch ? ` on ${harvest.branch}` : ''}` : harvest.reason || 'not run'}.`,
}
