export const meta = {
  name: 'review',
  description: 'Review a diff through several independent lenses, then adversarially verify each finding',
  whenToUse:
    'After implementation, before opening a PR. Runs orthogonal lenses in parallel, then tries to refute what they found. Writes nothing.',
  phases: [
    { title: 'Lenses', detail: 'independent reviewers, one concern each' },
    { title: 'Verify', detail: 'adversarial pass -- refute what cannot be substantiated' },
  ],
}

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

const CORE = ['correctness', 'simplicity', 'surgical-scope', 'test-coverage']
const lenses = [...CORE, ...extraLenses.filter((l) => !CORE.includes(l))]

const FINDINGS = {
  type: 'object',
  required: ['findings', 'lensVerdict'],
  properties: {
    lensVerdict: {
      type: 'string',
      description: 'One sentence on the change through this lens, INCLUDING when nothing was found',
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

log(`Reviewing ${range} through ${lenses.length} lenses (rigor: ${rigor})`)

const lensResults = await parallel(
  lenses.map((lens) => () =>
    agent(
      `Review the diff for ${range} through the ${lens} lens ONLY. Another reviewer has each of the other lenses; stay inside yours.

Start by reading the diff: \`git diff ${range}\`. Read the surrounding code, not just the changed lines -- a hunk is rarely comprehensible on its own.

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

Every finding needs a file, a line, one sentence on the defect, and a concrete failure scenario. If you cannot describe the path from cause to symptom, it is a suspicion and does not belong in the list.

Set lensVerdict whether or not you find anything.

${NO_QUOTA}`,
      { agentType: 'uw-reviewer', label: lens, phase: 'Lenses', schema: FINDINGS }
    )
  )
)

const failedLenses = lenses.filter((_, i) => !lensResults[i])
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
          { agentType: 'uw-reviewer', label: `verify:${f.index}`, phase: 'Verify', schema: VERDICTS }
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
            { agentType: 'uw-reviewer', label: 'refute', phase: 'Verify', schema: VERDICTS }
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

const severity = { high: 0, medium: 1, low: 2 }
confirmed.sort((a, b) => severity[a.confidence] - severity[b.confidence])

log(`${confirmed.length} confirmed, ${refuted.length} refuted, ${unverified.length} unverified`)

// Refuted findings are returned, not dropped. A verifier that silently filters
// cannot itself be audited, and a review that quietly discards is a review that
// has started lying by omission.
return {
  ok: true,
  range,
  rigor,
  lensVerdicts: verdicts,
  findings: confirmed,
  refuted,
  unverified,
  failedLenses,
  summary: `${confirmed.length} confirmed, ${refuted.length} refuted by the adversarial pass, ${unverified.length} unverified. Refuted findings are listed so the verifier can be checked.`,
}
