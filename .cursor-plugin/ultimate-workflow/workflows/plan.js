export const meta = {
  name: 'plan',
  description: 'Explore the codebase in parallel, then draft a plan anchored in what already exists',
  whenToUse:
    'At the start of a non-trivial change, before any code. Returns a plan document for review; writes nothing.',
  phases: [
    { title: 'Explore', detail: 'readers over code, bootstrap docs, and matching memory topicals' },
    { title: 'Synthesise', detail: 'existing-design review, deviations, and the plan itself' },
  ],
}

// Exploration is the breadth-shaped part of planning: several independent
// readers over different slices, each with a clean context, rather than one
// agent accumulating everything it has read into a window that gets worse the
// longer it works.
//
// The barrier before synthesis is genuinely required -- a design review is a
// statement about how the pieces fit, which nobody can make while holding only
// one piece.
//
// Nothing here writes. The plan comes back as text for the user to read before
// it lands, which is the point: a plan reviewed after it is on disk has already
// spent some of its value.

const feature = (args && args.feature) || ''
const areas = ((args && args.areas) || '')
  .split(',')
  .map((a) => a.trim())
  .filter(Boolean)

if (!feature) {
  return {
    ok: false,
    error: 'No feature described. Pass one, for example: {"feature": "add rate limiting to the public API"}',
  }
}

const SLICE = {
  type: 'object',
  required: ['slice', 'patterns', 'reusable', 'constraints', 'notCovered'],
  properties: {
    slice: { type: 'string', description: 'What you actually read' },
    patterns: {
      type: 'array',
      items: { type: 'string' },
      description: 'Conventions in use that this feature would have to follow, with paths',
    },
    reusable: {
      type: 'array',
      items: { type: 'string' },
      description: 'Existing utilities that would otherwise be rewritten. Path and signature',
    },
    constraints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Non-obvious things that would break, and why',
    },
    wouldLiveAt: { type: 'string', description: 'Where this feature naturally belongs, and the alternative rejected' },
    notCovered: { type: 'string', description: 'What your slice did NOT cover, so the gap is visible' },
  },
}

const PLAN = {
  type: 'object',
  required: ['planMarkdown', 'openQuestions', 'deviations'],
  properties: {
    planMarkdown: { type: 'string', description: 'The complete plan document, ready to write to PLAN-<feature>.md' },
    openQuestions: { type: 'array', items: { type: 'string' } },
    deviations: {
      type: 'array',
      description: 'Every place the plan departs from an existing pattern. Empty is the expected answer',
      items: {
        type: 'object',
        required: ['current', 'proposed', 'prosCons'],
        properties: {
          current: { type: 'string' },
          proposed: { type: 'string' },
          prosCons: { type: 'string' },
        },
      },
    },
  },
}

phase('Explore')

// Three fixed readers plus one per named area. The fixed three are the sources
// the workflow skill already says to read before planning: the code, the
// project's own docs, and its accumulated memory.
const readers = [
  {
    label: 'code',
    prompt: `Read the parts of this codebase that a change described as "${feature}" would touch. Start by locating them -- do not assume a layout.`,
  },
  {
    label: 'project-docs',
    prompt: `Read this project's own documentation: PRD.md, CLAUDE.md, ROADMAP.md, progress.md, and any README, if they exist. Report what they say that constrains "${feature}" -- stated conventions, architecture decisions, and especially the "## Gotchas" section, which records mistakes earlier sessions learned not to repeat. If a document does not exist, say so rather than inferring its content.`,
  },
  {
    label: 'memory',
    prompt: `Read memory.md if it exists, then read every memory/<topic>.md whose "Read when" cue plausibly matches "${feature}". Those topicals carry the rationale behind existing decisions -- often the direct answer to "why is it done this way". If there is no memory.md, say so; that is a finding in itself.`,
  },
  ...areas.map((area) => ({
    label: area,
    prompt: `Read ${area} and report what it constrains for a change described as "${feature}".`,
  })),
]

const slices = await parallel(
  readers.map((r) => () =>
    agent(
      `${r.prompt}

Report what someone about to build this would need to know: the patterns they must follow, the utilities that already exist so they are not rewritten, and the constraints that are not obvious from reading the code once.

Do not summarise the code. Do not review its quality. Say plainly what your slice did not cover.`,
      { agentType: 'uw-explorer', label: r.label, phase: 'Explore', schema: SLICE }
    )
  )
)

const failed = readers.filter((_, i) => !slices[i]).map((r) => r.label)
if (failed.length === readers.length) {
  return {
    ok: false,
    error: 'Every reader failed, so nothing was explored. This is NOT an empty codebase.',
    failedReaders: failed,
    hint: 'Check /workflows. If uw-explorer is missing, agent definitions load with a delay after being added.',
  }
}

const found = slices.filter(Boolean)
log(`${found.length}/${readers.length} slices read; synthesising`)

phase('Synthesise')

const plan = await agent(
  `Write a plan for: ${feature}

Here is what independent readers found across the codebase, its documentation, and its accumulated memory:

${JSON.stringify(found, null, 2)}
${failed.length ? `\nNOTE: these readers failed and their ground is uncovered: ${failed.join(', ')}. Say so in the plan's open questions.` : ''}

Produce the complete plan document as markdown, following this shape:

- YAML front matter: phase, plan_confirmed (false), tests_confirmed (false), test_command (the project's real verification command if the readers found one, otherwise empty), verify_rounds (0), last_verify (unrun), dirty (false), escalated (false)
- Feature description and goal
- Goal / success criteria, in verifiable terms
- Files explored, as a table of path and why it matters
- **Existing-design review** -- the patterns, utilities, and conventions this touches, drawn from what the readers actually found. Prefer reuse and say what will be reused.
- **Deviation justification** -- every place you propose departing from an existing pattern, with the current pattern, the alternative, and pros and cons for both. If there are none, write "None -- reuses existing patterns." Do not manufacture a deviation to look thorough; do not hide one to look tidy.
- Open questions

Two rules on content. Anchor every claim about the codebase in something a reader actually reported -- do not assert structure nobody observed. And leave the Tests section out entirely; it is written and confirmed separately, after this plan is.`,
  { agentType: 'uw-explorer', label: 'synthesise', phase: 'Synthesise', schema: PLAN }
)

if (!plan) {
  return { ok: false, error: 'Synthesis failed after the readers succeeded. Rerun, or inspect the journal.' }
}

return {
  ok: true,
  feature,
  slicesRead: found.length,
  failedReaders: failed,
  deviations: plan.deviations,
  openQuestions: plan.openQuestions,
  planMarkdown: plan.planMarkdown,
  note:
    'Nothing was written. Review the plan, then save it as PLAN-<feature>.md. Set plan_confirmed to true only after you have actually confirmed it.',
}
