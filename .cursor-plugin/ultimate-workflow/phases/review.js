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

// @shared selection
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
// @shared experts-check
// @shared review-core
// @shared read-first
// @shared review-range

// The workflow cannot read files, so experts.js sends the shared rules (experts/protocol.md) with
// the skills, under `_protocol`, and they are pasted into each expert's prompt. Telling an expert
// to open a file did not get it opened, which is why skills are pasted too.
const protocolText = args && args.skills && typeof args.skills === 'object' && typeof args.skills._protocol === 'string' ? args.skills._protocol.trim() : ''

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
// The names of the review skills prepare chose for an expert, for `review-when-skills`.
const skillNames = (name) => {
  const entry = args && args.skills && typeof args.skills === 'object' ? args.skills[name] : null
  return entry && Array.isArray(entry.skills) ? entry.skills.map((x) => x && x.name) : []
}

// The review itself is the shared reviewRange (lib/phase-shared.js), the same code the run uses at its end.
return await reviewRange({
  range,
  rigor,
  extraLenses,
  noExperts,
  expertsOnly,
  available,
  planned,
  keep: args && args.keep,
  delta: args && args.delta,
  deltaFile: args && args.deltaFile,
  recheck: args && args.recheck,
  diffFile: args && args.diffFile,
  expertsDir: args && args.expertsDir,
  plan: args && args.plan,
  deps: args && args.deps,
  skillsFor,
  droppedFor,
  skillNames,
  phases: { recheck: 'Recheck', lenses: 'Lenses', verify: 'Verify' },
})
