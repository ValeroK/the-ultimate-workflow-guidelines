export const meta = {
  name: 'harvest',
  description: 'Extract durable lessons from completed work and route each to Gotchas, memory, or progress',
  whenToUse:
    'After landing a feature, before deleting its PLAN file. Reads the plan, the diff, and what is already recorded, then proposes doc edits for review. Writes nothing.',
  phases: [
    { title: 'Read', detail: 'plan, history, and existing stores, read in parallel' },
    { title: 'Route', detail: 'dedupe against what exists, apply the Gotcha-vs-Memory test, draft' },
  ],
}

// Step 6 of the workflow -- writing down what was learned -- is its weakest
// step in practice, because it happens at the end of a long session when
// context is full and attention is gone. This runs it with fresh eyes reading
// the artifacts instead of remembering them.
//
// Three readers, then one router. The barrier before routing is deliberate and
// is the case where a barrier is actually justified: the router cannot dedupe a
// candidate against the existing stores until it has both.
//
// Nothing here writes. The harvester agent has no write tool, so proposals come
// back for a human to accept. Doc edits are exactly the kind of change that
// accumulates silent noise when an agent can apply them unattended.

const range = (args && args.range) || 'origin/main..HEAD'
const scope = (args && args.scope) || 'the current branch'

const CANDIDATES = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lesson', 'source', 'evidence'],
        properties: {
          lesson: { type: 'string', description: 'The lesson itself, one or two sentences' },
          source: { type: 'string', description: 'Commit sha, file path, or plan section it came from' },
          evidence: { type: 'string', description: 'Why this is durable: hit twice, cost real time, non-obvious' },
        },
      },
    },
  },
}

const EXISTING = {
  type: 'object',
  required: ['gotchas', 'topicals', 'notes'],
  properties: {
    gotchas: { type: 'array', items: { type: 'string' }, description: 'Each existing Gotcha, verbatim' },
    topicals: { type: 'array', items: { type: 'string' }, description: 'Each memory topical: path and what it covers' },
    notes: { type: 'string', description: 'Anything about the current stores a router should know' },
  },
}

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

// Stated in every reader prompt. The failure mode of a harvester is not missing
// a lesson, it is inventing one -- a store that fills with filler teaches the
// reader to skim past it, which costs more than the gap it was papering over.
const NO_QUOTA =
  'You have no quota. Returning an empty list is a correct and common answer. Do not stretch to fill it. Every item must be something a future session would genuinely be worse off not knowing.'

phase('Read')

const [fromPlan, fromHistory, existing] = await parallel([
  () =>
    agent(
      `Read every PLAN-*.md file in this repository. Concentrate on the "Blockers hit" and "Implementation notes" sections: a blocker is a recorded moment where reality contradicted an assumption, which is the richest source of durable lessons there is.

Extract candidate lessons. For each, cite the plan file and section it came from.

${NO_QUOTA}`,
      { agentType: 'uw-harvester', label: 'plan', phase: 'Read', schema: CANDIDATES }
    ),

  () =>
    agent(
      `Review the git history and diff for ${scope} (range: ${range}; if that range is invalid, fall back to the last 20 commits and say so).

Look for lessons in what actually changed and in what the commit messages say about why. A commit that fixes something subtle, reverses an earlier decision, or documents a surprise is worth more than a large but routine diff.

For each candidate, cite the commit sha or file path.

${NO_QUOTA}`,
      { agentType: 'uw-harvester', label: 'history', phase: 'Read', schema: CANDIDATES }
    ),

  () =>
    agent(
      `Inventory what this repository has ALREADY recorded, so a later step can avoid proposing duplicates.

Read: the "## Gotchas" section of CLAUDE.md, the memory.md index if present, and every memory/*.md topical if present.

Return each existing Gotcha verbatim, and for each topical its path and what it covers. Note anything a router should know -- for example a topical that a new lesson would naturally extend rather than replace.

Propose nothing. This is an inventory.`,
      { agentType: 'uw-harvester', label: 'existing', phase: 'Read', schema: EXISTING }
    ),
])

// Distinguish "the readers found nothing" from "the readers did not run".
//
// parallel() turns a failed agent into null, so both cases arrive as an empty
// candidate list. Reporting them the same way would make a total failure look
// like a clean harvest -- which is the exact silent-failure pattern this whole
// design exists to avoid, and it was in the first draft of this script.
const readerFailures = []
if (!fromPlan) readerFailures.push('plan')
if (!fromHistory) readerFailures.push('history')
if (!existing) readerFailures.push('existing')

if (readerFailures.length === 3) {
  log(`ALL readers failed: ${readerFailures.join(', ')}`)
  return {
    ok: false,
    error: 'Every reader agent failed, so nothing was examined. This is NOT an empty harvest.',
    failedReaders: readerFailures,
    hint: 'Most likely the uw-harvester agent type is not loaded. Agent definitions are read at host startup, so a newly added one needs a restart. Check the run in /workflows for the exact error.',
    proposals: [],
    discarded: [],
  }
}

if (readerFailures.length > 0) {
  log(`WARNING: ${readerFailures.join(', ')} reader(s) failed; harvesting from partial input`)
}

const candidates = [
  ...((fromPlan && fromPlan.candidates) || []),
  ...((fromHistory && fromHistory.candidates) || []),
]

if (candidates.length === 0) {
  log('No candidate lessons found. Nothing to harvest.')
  return {
    ok: true,
    proposals: [],
    discarded: [],
    failedReaders: readerFailures,
    note:
      readerFailures.length > 0
        ? `No candidates surfaced, but ${readerFailures.join(' and ')} did not run -- coverage was incomplete.`
        : 'No candidates surfaced. Every source was read; there was genuinely nothing durable to record.',
  }
}

log(`${candidates.length} candidate lessons; routing against ${((existing && existing.gotchas) || []).length} existing gotchas`)

phase('Route')

const routed = await agent(
  `Route each candidate lesson below to its correct destination, or discard it.

CANDIDATES
${JSON.stringify(candidates, null, 2)}

ALREADY RECORDED
${JSON.stringify(existing || { gotchas: [], topicals: [], notes: 'inventory unavailable' }, null, 2)}

The decision test:

- Phrasable as "Beware...", "Don't...", "Note that..." -> a Gotcha in CLAUDE.md. One or two sentences, actionable rule first, then the reason.
- Phrasable as "Here's how X works", "Here's why we picked Y" -> a memory/<topic>.md topical. Room to explain. A small explanatory lesson extends an existing topical's Key decisions section rather than starting a new file.
- A summary of what changed in this feature -> ONE dated progress.md entry for the whole feature. Never one per commit.

Discard, and say why, anything that is: already recorded in any form; obvious from reading the code; a one-off slip the next reader would catch instantly; or not durable enough to earn permanent space.

Merge candidates that are the same lesson seen from two angles. Two readers looking at the plan and the history will often surface the same thing.

For anything you keep, write the exact text to add, ready to paste, in the voice the target file already uses. Cite its source.

${NO_QUOTA} A short, well-sourced list is the goal. Discarding most candidates is a good outcome, not a failure.`,
  { agentType: 'uw-harvester', label: 'route', phase: 'Route', schema: PROPOSALS }
)

if (!routed) {
  return { proposals: [], discarded: [], note: 'The routing agent returned nothing; rerun or inspect the journal.' }
}

log(`${routed.proposals.length} proposals, ${routed.discarded.length} discarded`)

return {
  ...routed,
  reviewedRange: range,
  candidatesConsidered: candidates.length,
  note: 'Proposals only -- nothing was written. Review each, then apply the ones you want.',
}
