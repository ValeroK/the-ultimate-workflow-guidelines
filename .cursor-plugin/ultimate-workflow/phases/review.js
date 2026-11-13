export const meta = {
  name: 'review',
  description: 'Review a diff through several independent lenses, then adversarially verify each finding',
  whenToUse:
    'After implementation, before opening a PR. Runs orthogonal lenses in parallel, then tries to refute what they found. Writes nothing.',
  phases: [
    { title: 'Recheck', detail: 'ask again which domain experts apply to the real diff; can only add' },
    { title: 'Lenses', detail: 'independent reviewers, one concern each' },
    { title: 'Verify', detail: 'adversarial pass -- refute what cannot be substantiated' },
  ],
}

// @shared agent-names

// Four orthogonal lenses, then a skeptic. The lenses are parallel because the
// concerns genuinely do not overlap; a correctness reviewer and a scope
// reviewer looking at the same hunk are asking unrelated questions.
//
// The verify stage exists because a lens reviewer is optimistic by
// construction: it was asked to find things. Handing its output to someone
// whose job is to refute is what stops plausible-but-wrong findings reaching
// the reader. That matters more than finding one extra bug -- a false finding
// costs trust in every true one next to it.
//
// Cost shapes the default. Verifying every finding with three independent
// skeptics is the rigorous form and roughly triples the bill. Default is one
// batch skeptic; --rigor high escalates to per-finding.

const range = (args && args.range) || 'main..HEAD'
const rigor = (args && args.rigor) === 'high' ? 'high' : 'normal'
const extraLenses = ((args && args.lenses) || '')
  .split(',')
  .map((l) => l.trim())
  .filter(Boolean)

// @shared core-lenses
const CORE = CORE_LENSES

// @shared lane-helpers

// Domain experts run as extra lenses under their own agent type. Which experts exist is
// whatever experts/experts.js found in the agents folder (args.available); which of them
// were chosen at planning time is args.experts (read from the plan). Before the lenses run,
// the same question is asked again of the real diff and the answer is merged in by code:
// the diff can add an expert and can never remove one.
//
// A review that was not told what is available stops, because a skipped list would look
// exactly like "no expert was needed". Opting out is explicit (args.noExperts) and recorded.
const noExperts = Boolean(args && args.noExperts)
const expertsOnly = Boolean(args && args.expertsOnly)
const available = (args && args.available) || []
const planned = asList(args && args.experts)

if (!noExperts) {
  if (!args || args.available === undefined || args.available === null) {
    return {
      ok: false,
      error: 'args.available is missing, so it is unknown which domain experts exist. Run "node experts/experts.js list" and pass its JSON as args.available (an empty list is fine), or pass args.noExperts: true to review without them. Nothing was reviewed.',
    }
  }
  if (!wellFormedAvailable(available)) {
    return { ok: false, error: 'args.available is not the output of experts/experts.js list. Nothing was reviewed.' }
  }
  const unknownPlanned = planned.filter((n) => !available.some((e) => e.name === n))
  if (unknownPlanned.length > 0) {
    return { ok: false, error: `The plan names expert(s) that are not installed: ${unknownPlanned.join(', ')}. Nothing was reviewed.`, available: available.map((e) => e.name) }
  }
  const missing = available.length > 0 ? ['diffFile', 'expertsDir', 'skills'].filter((k) => !args[k]) : []
  if (missing.length > 0) {
    return { ok: false, error: `Experts need ${missing.join(' and ')} in args (experts/experts.js prepare produces the diff file and the skills). Nothing was reviewed.` }
  }
}
if (noExperts && (planned.length > 0 || expertsOnly)) {
  return { ok: false, error: 'noExperts contradicts experts/expertsOnly: pass one or the other. Nothing was reviewed.' }
}

// @shared recheck
const RECHECK_ANSWER = SELECTION
// The experts of the last check stay selected while the changes are the same work in progress
// (prepare's `keep`, and the experts a changed-only review narrows): a recheck that answers
// "nobody" must not drop them, as it cannot drop the plan's. The recheck can still add. Found on
// the first real-install test (2026-10-29): the recheck chose nobody and the earlier expert never
// saw the change.
const keptNames = [
  ...(args && args.keep && Array.isArray(args.keep.experts) ? args.keep.experts : []),
  ...(args && args.deltaFile && args.delta && Array.isArray(args.delta.experts) ? args.delta.experts : []),
]
const kept = keptNames.filter((n, i) => keptNames.indexOf(n) === i && available.some((e) => e.name === n) && !planned.includes(n))
let experts = [...planned, ...kept]
let added = []
let recheck = false
let recheckFailed = false
const notInstalled = []
if (!noExperts && available.length > 0 && args.recheck !== false) {
  phase('Recheck')
  const answer = await agent(
    recheckPrompt(args.diffFile, available, experts),
    { agentType: agentName('uw-explorer'), label: 'recheck', phase: 'Recheck', schema: RECHECK_ANSWER }
  )
  if (!answer) {
    // Decided 2026-11-13: a recheck that answers nothing does not refuse the commit. The planned experts review, and the
    // lane says the recheck failed, so it is named in the report and never read as "no areas touched".
    recheckFailed = true
    recheck = true
    log('recheck failed; continuing with the planned experts only, and the report names the failed recheck')
  } else {
    const merged = addOnly(experts, answer.experts, available)
    experts = merged.experts
    added = merged.added
    notInstalled.push(...merged.rejected)
    recheck = true
    log(`recheck: ${added.length ? 'added ' + added.join(', ') : 'nothing to add'}${merged.rejected.length ? '; ignored unknown ' + merged.rejected.join(', ') : ''}`)
  }
}
// An expert with `review-when-skills` joins whenever the diff selected one of those review skills
// (experts.js prepare chose them from the files and lines), whether or not the plan or the recheck
// named it: quality reviews every change that touches tests.
if (!noExperts) {
  for (const e of available) {
    const entry = args.skills && typeof args.skills === 'object' ? args.skills[e.name] : null
    const selected = entry && Array.isArray(entry.skills) ? entry.skills.map((x) => x && x.name) : []
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

phase('Lenses')

// The workflow cannot read files, so experts.js sends the shared rules (experts/protocol.md) with
// the skills, under `_protocol`, and they are pasted into each expert's prompt. Telling an expert
// to open a file did not get it opened, which is why skills are pasted too.
const protocolText = args && args.skills && typeof args.skills === 'object' && typeof args.skills._protocol === 'string' ? args.skills._protocol.trim() : ''
// @shared read-first

// Skills were chosen in code from the diff by `experts.js prepare` and arrive as
// { <expert>: { skills: [{ name, text }], dropped: [names] } }. The text goes into the expert's
// prompt; asking a model to open the skill whose cue matched did not get it opened.
const skillsFor = (name) => {
  const entry = args && args.skills && typeof args.skills === 'object' ? args.skills[name] : null
  return (entry && Array.isArray(entry.skills) ? entry.skills : []).filter((x) => x && typeof x.name === 'string' && typeof x.text === 'string' && x.text.trim() !== '')
}
const droppedFor = (name) => {
  const entry = args && args.skills && typeof args.skills === 'object' ? args.skills[name] : null
  return (entry && Array.isArray(entry.dropped) ? entry.dropped : []).filter((x) => typeof x === 'string')
}
// Each finding says where it came from, so a run can show what the skills added over the model's
// own knowledge. experts.js checks a skill basis against the skills that were loaded.
const BASIS_RULE =
  ' For each finding set basis: "skill:<name>" when a row of a skill below is what made you see it, and copy that row\'s words into basisQuote; "reference:<category>" when it comes from your stage reference; "general" when it comes from your own knowledge. Say "general" rather than name a skill that did not lead you to it: the quote is checked against the skill.'
const skillBlock = (name) => {
  const mine = skillsFor(name)
  return mine.length === 0
    ? `\n\nNo skill applies to this change by its files and lines. Do not open skill files.${BASIS_RULE}`
    : `\n\nSKILLS for this change (${mine.map((x) => x.name).join(', ')}), chosen by the workflow from the diff. Read them before you look for findings. Do not open other skill files.${BASIS_RULE}\n\n${mine.map((x) => x.text.trim()).join('\n\n')}`
}

// A changed-only recheck (experts.js prepare --delta): an expert whose last review covers the
// previous changes reads only what changed since, and what uses it. An expert the recheck added,
// and the recheck itself, read the full diff.
const deltaArgs = args && args.delta && args.deltaFile && Array.isArray(args.delta.experts) ? args.delta : null
const narrowed = (lens) => Boolean(deltaArgs) && reviewingNames.includes(lens) && deltaArgs.experts.includes(lens)
const usedDelta = reviewingNames.filter(narrowed)
if (usedDelta.length) log(`changed-only review for ${usedDelta.join(', ')}: ${deltaArgs.files.length} file(s) since ${String(deltaArgs.base).slice(0, 12)}`)

log(`Reviewing ${range} through ${lenses.length} lenses (rigor: ${rigor})`)

const lensResults = await parallel(
  lenses.map((lens) => () =>
    agent(
      `${reviewingNames.includes(lens) ? `Review the diff for ${range} as the ${lens} expert.` : `Review the diff for ${range} through the ${lens} lens ONLY. Another reviewer has each of the other lenses; stay inside yours.`}

${
  reviewingNames.includes(lens)
    ? `${
        narrowed(lens)
          ? `You reviewed these changes before. Only some files changed since, or use a file that did: their current patches are at ${args.deltaFile}, and its header lists what changed, what uses it and what was removed. Review those files. Your earlier findings on every other file stand and are carried forward, so do not repeat them. The full diff is at ${args.diffFile} if you need context.`
          : `The diff for ${range} is saved at ${args.diffFile}. Read it there.`
      } Stage: review. ${readFirst(args.expertsDir, lens, 'review')}${
        args.plan
          ? ` The plan is at ${args.plan}: find the "Expert input" section, read what you required from this change at planning time, and report any requirement the diff does not honour.`
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
        args && args.deps ? JSON.stringify(args.deps) : 'not provided'
      }
Treat a dependency item as a finding only when this diff introduces it or makes it reachable; otherwise mention it as pre-existing in lensVerdict.${skillBlock(lens)}`
    : ''
}

Every finding needs a file, a line, one sentence on the defect, and a concrete failure scenario. If you cannot describe the path from cause to symptom, it is a suspicion and does not belong in the list.

Set lensVerdict whether or not you find anything.

${NO_QUOTA}`,
      { agentType: agentName(reviewingNames.includes(lens) ? agentFor[lens] : 'uw-reviewer'), label: lens, phase: 'Lenses', schema: FINDINGS }
    )
  )
)

const failedLenses = lenses.filter((_, i) => !lensResults[i])
// What an expert found is carried in the lane, because the lane is what gets recorded as
// evidence and what the commit gate reads. Only findings from an expert's own lens, and only
// those the skeptic confirmed or never ruled on: a refuted finding is not an open finding.
const expertFindings = (list, status) =>
  list
    .filter((f) => reviewingNames.includes(f.lens))
    .map((f) => ({ expert: f.lens, file: f.file, line: f.line, what: f.what, confidence: f.confidence, ...(f.severity ? { severity: f.severity } : {}), ...(typeof f.basis === 'string' ? { basis: f.basis } : {}), ...(typeof f.basisQuote === 'string' ? { basisQuote: f.basisQuote } : {}), status }))
// W4: what an expert worried about without being able to call it a finding. The schema marks each
// item's text and reason as required, but the check that counts is here, where it is tested: an
// item without both is dropped and counted, an expert keeps three, and a core lens's are ignored.
const CONCERN_CAP = 3
let laneConcernsDropped = 0
const laneConcerns = []
lenses.forEach((lens, i) => {
  const r = lensResults[i]
  if (!r || !reviewingNames.includes(lens)) return
  const valid = []
  for (const c of Array.isArray(r.concerns) ? r.concerns : []) {
    const text = c && typeof c.text === 'string' ? c.text.trim() : ''
    const reason = c && typeof c.reason === 'string' ? c.reason.trim() : ''
    if (!text || !reason) {
      laneConcernsDropped += 1
      continue
    }
    valid.push({ expert: lens, text, reason, ...(typeof c.file === 'string' && c.file ? { file: c.file } : {}), ...(Number.isInteger(c.line) ? { line: c.line } : {}) })
  }
  laneConcerns.push(...valid.slice(0, CONCERN_CAP))
  laneConcernsDropped += Math.max(0, valid.length - CONCERN_CAP)
})
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
  concerns: laneConcerns,
  concernsDropped: laneConcernsDropped,
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

const verdicts = lenses
  .map((lens, i) => (lensResults[i] ? { lens, verdict: lensResults[i].lensVerdict } : null))
  .filter(Boolean)

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
      (failedLenses.length > 0
        ? `No findings, but ${failedLenses.join(' and ')} did not run -- coverage was incomplete.`
        : 'No findings. Every lens ran and reported the change sound through its concern.'),
  }
}

log(`${all.length} findings across ${lenses.length - failedLenses.length} lenses; verifying`)

phase('Verify')

const numbered = all.map((f, i) => ({ index: i, ...f }))

// Normal rigor: one skeptic sees everything at once. High rigor: one skeptic
// per finding, each in its own context, so no finding anchors on another.
const verifyRuns =
  rigor === 'high'
    ? numbered.map((f) => () =>
        agent(
          `Try to REFUTE this single finding. Your job is not to agree.

${JSON.stringify(f, null, 2)}

Read the code around it. Check whether the described failure path is actually reachable. Look for the guard the reviewer missed. Consider whether the behaviour is intentional and documented elsewhere.

Default to refuted when uncertain. A false finding costs the reader more than a missed one, because it burns trust in every other finding beside it. Return a verdict for index ${f.index} only.`,
          { agentType: agentName('uw-reviewer'), label: `verify:${f.index}`, phase: 'Verify', schema: VERDICTS }
        )
      )
    : [
        () =>
          agent(
            `Try to REFUTE each finding below. Your job is not to agree.

${JSON.stringify(numbered, null, 2)}

For each: read the code around it, check whether the described failure path is reachable, look for the guard the reviewer missed, and consider whether the behaviour is intentional and documented elsewhere.

Default to refuted when uncertain. A false finding costs the reader more than a missed one, because it burns trust in every other finding beside it.

Return one verdict per finding, by index. Do not soften -- confirmed or refuted, with the reason.`,
            { agentType: agentName('uw-reviewer'), label: 'refute', phase: 'Verify', schema: VERDICTS }
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

// Order for the reader: severity first where an expert gave one, then confidence. Nothing
// downstream (the lane, the commit gate, finding ids) depends on this order.
const rank = { high: 0, medium: 1, low: 2 }
const by = (key) => (f) => (f[key] in rank ? rank[f[key]] : 1)
confirmed.sort((a, b) => by('severity')(a) - by('severity')(b) || by('confidence')(a) - by('confidence')(b))

log(`${confirmed.length} confirmed, ${refuted.length} refuted, ${unverified.length} unverified`)

// Refuted findings are returned, not dropped. A verifier that silently filters
// cannot itself be audited, and a review that quietly discards is a review that
// has started lying by omission.
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
