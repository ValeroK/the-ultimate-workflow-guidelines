export const meta = {
  name: 'run',
  description: 'Build every card of a confirmed plan unattended: test, implement, verify and commit each, park what cannot be finished, then review the whole branch once with the experts, fix what is confirmed, and harvest',
  whenToUse:
    'After the plan and the test plan are confirmed, from the Full tier of /ultimate-workflow:feature. Commits each finished card to uw/run/<feature>; never pushes.',
  phases: [
    { title: 'Cards', detail: 'per card: context pack, tests, implementation, commit or park' },
    { title: 'Review', detail: 'the whole run diff once, through the lenses and the experts, then fix-up cards and one experts check of them' },
    { title: 'Harvest', detail: 'lessons from the journal and the diff, committed to uw/harvest/<feature>' },
  ],
}

// @shared agent-names

// The autopilot run (PLAN-autopilot.md). After the user's two confirmations nothing stops for them:
// every card is built, verified and committed, or parked on a branch with its
// diagnosis, and the whole branch is reviewed once at the end (the experts included); the run goes on with the cards that do not depend on a parked one. One result comes back.
//
// The script decides; agents only do. Everything that touches git or a file the script cannot read is
// one `experts.js` command (pack, park, card-commit, journal, harvest-branch), which an agent runs and
// whose one JSON line, with a boolean ok, comes back verbatim: the S0 spike showed an agent does not
// see exit codes, and refuses to type `git commit` or `git reset --hard` from a workflow prompt.
// What a card did is taken from git and from those lines, never from what an agent says it did.

// @shared build-model

// @shared build-loop

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

// ---- the one review (the same code as the by-hand review, phases/review.js) ----

// @shared recheck
// @shared lane-helpers
// @shared selection
// @shared experts-check
// @shared review-core
// @shared core-lenses
// @shared read-first
// @shared review-range

// The rules every expert follows are pasted into each expert's prompt (the workflow cannot read files).
const protocolText = PROTOCOL
// Skills arrive by name, with their text once in args.skillTexts, so a skill several cards use is
// not written into the script once per card. A { name, text } object is taken as it is.
const SKILL_TEXTS = args && args.skillTexts && typeof args.skillTexts === 'object' ? args.skillTexts : {}
const skillsOf = (list) =>
  (Array.isArray(list) ? list : [])
    .map((s) => (typeof s === 'string' ? { name: s, text: SKILL_TEXTS[s] } : s))
    .filter((s) => s && typeof s.name === 'string' && typeof s.text === 'string' && s.text.trim() !== '')
// The review skills of an expert for the whole branch: those chosen for any card, once each.
const reviewSkillsFor = (name) => skillsOf(CARDS.flatMap((c) => (c.reviewSkills && c.reviewSkills[name]) || [])).filter((s, i, all) => all.findIndex((x) => x.name === s.name) === i)

// ---- one card, start to end ----

const status = {}
const report = []
const packs = {}
const warned = new Set()
const lanes = []
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
  const reason = rerunFailed ? `cannot be done within the plan: needs decision ${avoided}; run --resume ${card.name} --accept to allow it, or change the plan.\n- detail, from the run within the plan: ${String(reasonIn).replace(/\s*\r?\n\s*/g, ' ')}` : reasonIn
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
  const entry = { card: card.name, title: card.title, status: status[card.name], action: resumeCmd(card.name, needsDecision), reason: String(reason).trim().replace(/\s*\r?\n\s*/g, ' '), branch: parked && parked.ok ? parked.branch : null, parkOk: Boolean(parked && parked.ok), ...(parked && !parked.ok ? { parkError: parked.reason || 'the park command printed nothing' } : {}), ...extra }
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
// @shared cover-rule

async function runCard(card, { adhoc = false } = {}) {
  log(`card ${card.name}: ${card.title}`)
  const pre = card.preflight || { ok: false, reason: 'no context pack was written for this card' }
  if (!pre.ok) return parkCard(card, pre.reason || 'missing input')
  if (pre.tokens !== undefined) packs[card.name] = { tokens: pre.tokens, budget: pre.budget }
  // A warning the pack returned (a mistyped pack_budget) is shown once, however many cards carry it.
  for (const w of (pre.warnings || []).filter((x) => !warned.has(x))) {
    warned.add(w)
    // The warning can hold text from the plan (a cited name), so it goes through a file and never onto the command line.
    const warningFile = `${RUN_DIR}/warning-${warned.size}.txt`
    await runSteps(`${card.name}:warning`, [cliCmd('notify', '--feature', FEATURE, '--kind', 'warning', '--card', card.name, '--reason-file', q(warningFile))], [{ path: warningFile, text: w }])
  }
  if (pre.overBudget) await runSteps(`${card.name}:budget`, [cliCmd('notify', '--feature', FEATURE, '--kind', 'over-budget', '--card', card.name, '--reason', q(`the context pack is about ${pre.tokens} tokens, over its budget of ${pre.budget}: the required entries alone are too large`))])
  // The plan shows the card as running before any work, so a run that dies inside it leaves it there.
  await runSteps(`${card.name}:start`, [cliCmd('card-status', '--plan', q(PLAN), '--card', card.name, '--status', q(RESUME && RESUME.card === card.name ? 'running (resumed)' : 'running'))])
  // --resume <card> without --accept on a card held for a decision runs it again from its tests,
  // told what it did last time; with --accept (or for a parked card) it continues where it stopped.
  const rerun = RESUME && RESUME.card === card.name && RESUME.rerun ? RESUME : null
  const resume = RESUME && RESUME.card === card.name && !RESUME.rerun ? { reason: String(RESUME.reason || 'resumed from its parked branch'), testFiles: Array.isArray(RESUME.testFiles) ? RESUME.testFiles : [] } : null
  const briefs = (Array.isArray(card.briefs) ? card.briefs : []).filter((b) => b && typeof b.name === 'string' && typeof b.text === 'string' && b.text.trim())
  const skills = briefs.flatMap((b) => skillsOf(b.skills)).filter((s, i, all) => all.findIndex((x) => x.name === s.name) === i)
  const brief = briefs.length === 0 ? '' : `\n\nSTANDING BRIEF, from ${briefs.map((b) => b.name).join(', ')}. It applies to every line you write, and it adds no work: do nothing the plan did not ask for.\n\n${briefs.map((b) => b.text.trim()).join('\n\n')}\n${skills.length ? `\nSKILLS for this card (${skills.map((s) => s.name).join(', ')}), chosen from its planned files and text. Write the code so that none of them would find anything. They add no work.\n\n${skills.map((s) => s.text.trim()).join('\n\n')}\n` : ''}`
  const carriedText = [...(rerun ? [`The last attempt at this card was stopped for a decision the plan does not state, and the user did not accept it: ${rerun.avoid}. Stay within the plan: do not take that decision again. If the card cannot be done without it, say so and stop.`] : []), ...(RESUME && RESUME.card === card.name && RESUME.accepted ? [`The user accepted this decision, which is now in the plan's Decisions: ${RESUME.accepted}`] : []), ...(card.carried || [])]
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
    testsCommitRule: 'Never stage or commit: the run commits the card itself.',
    implementCommitRule: 'Never stage or commit, not even part of the work: the run commits the card itself, through the commit gates.',
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

  const [scope] = await runSteps(`${card.name}:scope`, [cliCmd('scope', '--plan', q(PLAN), '--card', card.name)])
  const outOfScope = scope && Array.isArray(scope.outOfScope) ? scope.outOfScope : null

  // Decisions the plan does not state (2026-11-09): the implementer's own list, and what code finds
  // in the diff. A major one is not committed: the card is held as needs-decision, its work kept on
  // the branch and the user told now; the cards that do not depend on it go on. Minor ones go into
  // the handoff and the report.
  const declared = (build && build.decisions) || []
  const declaredFile = `${cardDir(card.name)}/declared-decisions.json`
  const [decided] = await runSteps(`${card.name}:decisions`, [cliCmd('decisions', '--plan', q(PLAN), '--card', card.name, '--feature', FEATURE, '--declared', q(declaredFile))], [{ path: declaredFile, text: JSON.stringify(declared) }])
  if (!decided || decided.ok !== true) return parkCard(card, 'the check for decisions the plan does not state could not run: experts.js decisions did not report success', { build: buildSummary })
  if ((decided.major || []).length > 0) {
    return parkCard(card, `needs a decision the plan does not state:\n${decided.major.map((d) => `- ${d.kind}: ${d.what}`).join('\n')}`, { build: buildSummary, needsDecision: true, decisions: { major: decided.major, minor: decided.minor || [] } })
  }
  const minorDecisions = decided.minor || []

  // The commit check runs its confirmation, full-suite and memory parts here; the experts part is left to the one review
  // at the end of the run (card-commit says so: outcome deferred).
  const commitCmd = cliCmd('card-commit', '--plan', q(PLAN), '--card', card.name, '--feature', FEATURE, ...(buildSummary.testFiles.length ? ['--claimed', q(buildSummary.testFiles.join(','))] : []))
  const [committed] = await runSteps(`${card.name}:commit`, [commitCmd])
  if (!committed || committed.ok !== true) {
    const why = `the commit was refused: ${(committed && (committed.reason || committed.gate)) || (rawOutputs.get(commitCmd) ? `card-commit printed no JSON line; it printed: ${rawOutputs.get(commitCmd).replace(/\s*\r?\n\s*/g, ' ')}` : 'card-commit printed nothing')}`
    return parkCard(card, why, { build: buildSummary })
  }
  status[card.name] = 'committed'
  lastParkKey = ''
  const entry = { card: card.name, title: card.title, status: 'committed', commit: committed.commit, handoff: committed.handoff, missingClaims: committed.missingClaims || [], outOfScope, build: buildSummary, ...(rerun && rerun.heldBranch ? { superseded: rerun.heldBranch } : {}), ...(minorDecisions.length ? { decisions: { major: [], minor: minorDecisions } } : {}) }
  report.push(entry)
  await journal(card, 'committed', `rounds: ${buildSummary.rounds}; files: ${committed.files}`)
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
// The stop text holds a park reason an agent wrote: it goes in a file, whole, never on the command line.
if (stoppedBecause) await runSteps('stopped:notify', [cliCmd('notify', '--feature', FEATURE, '--kind', 'stopped', '--reason-file', q(`${RUN_DIR}/stop-reason.txt`), '--action', q('read the report, then /ultimate-workflow:feature --resume'))], [{ path: `${RUN_DIR}/stop-reason.txt`, text: stoppedBecause }])

// ---- the review and its fix-up cards ----

const MAX_FIXUP_CARDS = 4
const adhocPaths = []
async function adhocCard(name, title, items, experts, label = name) {
  // Agent text (a finding's file and words) goes in files the step writes, never on the command line.
  const carriedFile = `${RUN_DIR}/${label}-carried.txt`
  const titleFile = `${RUN_DIR}/${label}-title.txt`
  const pathsFile = `${RUN_DIR}/${label}-paths.txt`
  const files = [...new Set(items.map((f) => String(f.file || '').replace(/\\/g, '/')).filter(Boolean))]
  // Only names the plan's line holds: card-add refuses any other, and a plan with no line takes no --experts.
  const laneExperts = experts.filter((n) => PLAN_EXPERTS.includes(n))
  const carriedText = items.map((f) => `${f.expert || f.lens} at ${f.file}:${f.line}: ${f.what}`.replace(/;/g, ','))
  // The name is free-chosen: every later step keys on the one card-add printed.
  const addCmd = cliCmd('card-add', '--plan', q(PLAN), '--name', name, '--free-name', '--title-file', q(titleFile), '--paths-file', q(pathsFile), '--carried-file', q(carriedFile), ...(PLAN_EXPERTS.length > 0 ? ['--experts', laneExperts.length > 0 ? laneExperts.join(',') : 'none'] : []))
  const [added] = await runSteps(`${label}:setup`, [addCmd], [{ path: titleFile, text: title }, { path: pathsFile, text: files.join(',') || '.' }, { path: carriedFile, text: carriedText.join('; ') }])
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

// The review, the fix-up cards and the harvest wait for every card to be settled.
const waitingFor = () => Object.keys(status).filter((n) => status[n] !== 'committed' && (names.has(n) || status[n] !== 'not started'))
const waitingReason = (w) => `waiting for ${w.join(', ')}; they run once, on the resume that settles them. To run them by hand: /ultimate-workflow:review, then /ultimate-workflow:harvest`
let waiting = waitingFor()

const anyCommitted = Object.values(status).includes('committed')
// What run.json recorded of the last review and harvest: a later settling resume reviews only if something is new.
let state = { head: '', reviewedHead: '', harvestedHead: '', harvestBranch: '' }
let stateError = ''
if (anyCommitted) {
  const [read] = await runSteps('settle:state', [cliCmd('run-state', '--feature', FEATURE)])
  if (read && read.ok) state = read
  // A read that failed is not "nothing recorded": going on would review everything again.
  // The settle step stops, and the result and the report say why.
  else stateError = `the run state could not be read (${(read && read.reason) || 'the run-state step returned nothing'}), so the review, the fix-up cards and the harvest did not run. Run /ultimate-workflow:feature --resume to try again`
}

waiting = waitingFor()
setPhase('Review')
const nothingNew = Boolean(state.reviewedHead) && state.reviewedHead === state.head
const covered = (head) => Boolean(head) && head === state.head
const RANGE = `${BASE}..HEAD`
const planned = PLAN_EXPERTS.filter((n) => AVAILABLE.some((e) => e.name === n))
// What differs from the by-hand review: the labels, an agent that returns nothing is asked once more, the skills come
// from the cards' planned files, and the agents run under the run's model setting.
const reviewOpts = {
  available: AVAILABLE,
  diffFile: '.ultimate-workflow/review.diff',
  expertsDir: EXPERTS_DIR,
  plan: PLAN,
  retry: true,
  labelPrefix: 'review:',
  phases: {},
  agentOpts: { phase: 'Review', ...modelOpt(IMPLEMENTER_MODEL) },
  skillsFor: reviewSkillsFor,
  droppedFor: () => [],
  skillNames: (n) => reviewSkillsFor(n).map((s) => s.name),
}
/** Prepare a range (saves the diff the experts read, fingerprints the range), review it, and record the lane. */
async function reviewAndRecord(range, tag, over) {
  const [prep] = await runSteps(`${tag}:prepare`, [`${cliCmd('prepare', '--range', q(range))} > ${q(`${RUN_DIR}/${tag}-prepare.json`)} && node -e "console.log(JSON.stringify({ok:true}))"`])
  if (!prep || prep.ok !== true) return { ran: false, reason: 'the review could not start: experts.js prepare did not report success' }
  const rv = await reviewRange({ ...reviewOpts, ...over, range, ...(over.labelPrefix ? {} : { labelPrefix: `${tag}:` }) })
  if (!rv.ok) return { ran: false, reason: rv.error || 'the review returned no result', failedLenses: rv.failedLenses || [] }
  const laneFile = `${RUN_DIR}/${tag}-lane.json`
  const [rec] = await runSteps(`${tag}:record`, [cliCmd('record', '--stage', 'review', '--result', q(laneFile))], [{ path: laneFile, text: JSON.stringify({ ok: true, expertLane: rv.expertLane }) }])
  lanes.push({ card: tag, lane: rv.expertLane })
  return { ran: true, range, failedLenses: rv.failedLenses || [], findings: rv.findings, refuted: rv.refuted, unverified: rv.unverified, experts: rv.experts, recorded: Boolean(rec && Array.isArray(rec.recorded)), ...(rec && Array.isArray(rec.recorded) ? {} : { recordProblem: 'the review was not recorded as evidence (experts.js record printed nothing usable); check --range will say not reviewed' }) }
}

let review = { ran: false, reason: stateError ? stateError : waiting.length > 0 ? waitingReason(waiting) : !anyCommitted ? 'no card was committed, so there is nothing to review' : nothingNew ? 'no card was committed since the last review' : '' }
let fixupCard = null
// A fix-up card committed by this run's review is newer than the head read before it.
let fixupCommitted = false
let fixupReview = null
let fixedCount = 0
if (anyCommitted && !stoppedBecause && !stateError && waiting.length === 0 && !nothingNew) {
  review = await reviewAndRecord(RANGE, 'review', { planned })
  if (review.ran) {
    const confirmed = review.findings
    // Decision 2 applied to the review (2026-11-09): a confirmed finding is fixed, not only reported.
    // High and medium ones in a file some card of this run could change go to fix-up cards; low ones,
    // and any outside the run's files, stay in the report. One card per plan card whose paths cover the
    // file (the first in plan order), lane = the experts of every plan card covering the group's files;
    // files no plan card covers make one more card with the plan's line. At most MAX_FIXUP_CARDS cards:
    // the findings of the groups past that stay in the report.
    const runCards = [...CARDS, { paths: adhocPaths }]
    const runTests = report.flatMap((e) => (e.build && e.build.testFiles) || [])
    const inRun = (f) => runCards.some((c) => inCard(c, f.file, runTests))
    const toFix = confirmed.filter((f) => (f.confidence === 'high' || f.confidence === 'medium') && inRun(f))
    const owners = [...CARDS.map((c) => c.name), '']
    const ownerOf = (f) => (CARDS.find((c) => inCard(c, f.file)) || { name: '' }).name
    const groups = owners.map((owner) => toFix.filter((f) => ownerOf(f) === owner)).filter((g) => g.length > 0).slice(0, MAX_FIXUP_CARDS)
    review.leftInReport = confirmed.length - groups.reduce((n, g) => n + g.length, 0)
    // The head the review covered: the experts check of the fix-up cards reads what came after it.
    let reviewedHead = ''
    if (groups.length > 0) {
      const [h] = await runSteps('settle:head', [cliCmd('run-state', '--feature', FEATURE)])
      reviewedHead = h && h.ok ? String(h.head || '') : ''
    }
    for (const [i, group] of groups.entries()) {
      const covering = CARDS.filter((c) => group.some((f) => inCard(c, f.file)))
      const lane = covering.length > 0 ? [...new Set(covering.flatMap((c) => c.experts || []))] : PLAN_EXPERTS
      const entry = await adhocCard('fixup', 'confirmed review findings', group, lane, i === 0 ? 'fixup' : `fixup-${i + 1}`)
      if (i === 0) fixupCard = entry
      if (entry && entry.status === 'committed') {
        fixupCommitted = true
        fixedCount += group.length
      }
      if (stoppedBecause) break
    }
    // After the fix-up cards, ONE experts-only check of what they changed. Whatever it finds, or the review left, goes in the
    // report: there is no second fix round.
    if (fixupCommitted) {
      fixupReview = reviewedHead
        ? await reviewAndRecord(`${reviewedHead}..HEAD`, 'review-fixups', { expertsOnly: true, recheck: false, planned: review.experts || planned })
        : { ran: false, reason: 'the head the review covered could not be read, so the fix-up cards were not checked' }
    }
  }
}

// A review with a lens or an expert that returned nothing, also on the retry, did not cover the range: it is run again on the
// resume. The same holds for the experts check of the fix-up cards.
const fixupCheckFailed = fixupCommitted && (!fixupReview || !fixupReview.ran || (fixupReview.failedLenses || []).length > 0)
const reviewDone = Boolean(review.ran) && (review.failedLenses || []).length === 0 && !fixupCheckFailed
// What is still open: the confirmed findings of the review that no committed fix-up card took, and what the check of the fix-up cards found.
const openCount = reviewDone ? review.findings.length - fixedCount + (fixupReview && fixupReview.ran ? fixupReview.findings.length : 0) : 0

// ---- harvest to a branch ----

waiting = waitingFor()
setPhase('Harvest')
// @shared harvest-proposals
const harvested = covered(state.harvestedHead) && !fixupCommitted
// Branch names from run.json, shown to an agent: only names of the right shape are passed on.
const openHarvests = (state.openHarvests || []).filter((b) => /^uw\/harvest\/[A-Za-z0-9._-]+$/.test(b))
let harvest = { ran: false, reason: stateError ? stateError : waiting.length > 0 ? waitingReason(waiting) : !anyCommitted ? 'nothing was committed' : harvested ? 'no card was committed since the last harvest' : '' }
if (anyCommitted && !stateError && waiting.length === 0 && !harvested) {
  const routed = await agent(
    `Harvest the durable lessons of this run.${openHarvests.length > 0 ? ` Earlier harvests of this feature are still open on ${openHarvests.join(', ')}: read what each holds (\`git log ${BASE}..<branch>\` and \`git show\`) and drop what they already hold.` : ''} Read the run journal ${RUN_DIR}/journal.md (what each card learned), the plan ${PLAN}, \`git diff ${BASE}..HEAD --stat\` and \`git log ${BASE}..HEAD\`, and what the project already records: the "## Gotchas" of AGENTS.md (or CLAUDE.md), memory.md and memory/*.md. First run \`${CLI} memory check\` (add \`--root <folder>\` when memory.md is not in the project root) and use its warnings: a topical not migrated, or a header path that matches no file, which you correct with add_paths, add_keywords and remove_paths on that topical.

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
// What ran is on record, each half apart: the next settling resume runs again only the half that is missing.
const harvestDone = harvest.ran && !harvest.error
let recState = null
if (reviewDone || harvestDone) {
  const branch = /^uw\/harvest\/[A-Za-z0-9._-]+$/.test(harvest.branch || '') ? harvest.branch : ''
  ;[recState] = await runSteps('settle:record', [cliCmd('run-state', '--feature', FEATURE, '--record', ...(reviewDone ? ['--review', '--open', String(openCount)] : []), ...(harvestDone ? ['--harvest'] : []), ...(branch ? ['--harvest-branch', branch] : []))])
}

const counts = report.reduce((n, r) => ({ ...n, [r.status]: (n[r.status] || 0) + 1 }), {})
// Whether the branch was reviewed by the experts, said plainly: the report, the notice and the summary use these words.
// A run that waited, stopped or could not review never reads as ready to merge.
const savedReview = nothingNew && state.reviewed && state.reviewed.head ? state.reviewed : null
const reviewed = reviewDone ? { head: (recState && recState.ok && recState.reviewed && recState.reviewed.head) || '', open: openCount } : savedReview ? { head: savedReview.head, open: Number(savedReview.open) || 0 } : null
const notReviewedWhy = reviewed
  ? ''
  : review.ran
    ? fixupCheckFailed
      ? `the experts check of the fix-up cards did not run to the end (${(fixupReview && fixupReview.reason) || ((fixupReview && fixupReview.failedLenses) || []).join(', ') + ' returned nothing'})`
      : `${(review.failedLenses || []).join(', ')} returned nothing, also on the retry`
    : review.reason || 'the review did not run'
const reviewedText = reviewed ? `Reviewed by the experts at ${reviewed.head || 'the run head'}: ${reviewed.open} finding${reviewed.open === 1 ? '' : 's'} open` : `NOT REVIEWED: ${notReviewedWhy}`
// One notice when the run ends, with the counts, whatever the outcome.
const held = report.filter((e) => e.status === 'parked' || e.status === 'needs-decision').map((e) => e.card)
// It is the one notice that reaches the desktop, so it names every blocker: each card held and each card blocked.
const namesOf = (...kinds) => report.filter((e) => kinds.includes(e.status)).map((e) => e.card)
const blockers = [['parked', namesOf('parked')], ['needs a decision', namesOf('needs-decision')], ['blocked', namesOf('blocked')]].filter(([, list]) => list.length > 0).map(([what, list]) => `${what}: ${list.join(', ')}`)
const finishedText = [Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ') || 'no cards', ...blockers, ...(stoppedBecause ? ['stopped'] : []), reviewedText].join('; ')
const finishedFile = `${RUN_DIR}/finished-reason.txt`
const finishedAction = held.length
  ? `settle ${held.join(', ')}: the report lists the command for each`
  : reviewed
    ? `read the report (${reviewed.open} finding${reviewed.open === 1 ? '' : 's'} open), then merge uw/run/${FEATURE}; before merging: experts.js check --range ${BASE}..HEAD`
    : `do not merge yet: ${reviewedText}. Run /ultimate-workflow:feature --resume, or /ultimate-workflow:review`
await runSteps('finished:notify', [cliCmd('notify', '--feature', FEATURE, '--kind', 'finished', '--reason-file', q(finishedFile), '--action', q(finishedAction))], [{ path: finishedFile, text: finishedText }])
return {
  ok: true,
  feature: FEATURE,
  branch: `uw/run/${FEATURE}`,
  base: BASE,
  plan: PLAN,
  cards: report.map((e) => (packs[e.card] ? { ...e, pack: packs[e.card] } : e)),
  earlier,
  counts,
  review,
  reviewed,
  reviewedText,
  fixupCard,
  fixupReview,
  harvest,
  expertLanes: lanes,
  ...(stateError ? { stateError } : {}),
  ...(stoppedBecause ? { stopped: stoppedBecause } : {}),
  summary: `${counts.committed || 0} committed, ${counts.parked || 0} parked, ${counts.blocked || 0} blocked${counts['not started'] ? `, ${counts['not started']} not started` : ''}${stoppedBecause ? `; stopped: ${stoppedBecause}` : ''}. ${reviewedText}. ${review.ran ? `Review: ${(review.findings || []).length} confirmed.` : ''} Harvest: ${harvest.ran ? `${harvest.proposals || 0} proposals${harvest.branch ? ` on ${harvest.branch}` : ''}` : harvest.reason || 'not run'}.`,
}
