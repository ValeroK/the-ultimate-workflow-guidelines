export const meta = {
  name: 'plan',
  description: 'Explore the codebase in parallel, then draft a plan anchored in what already exists',
  whenToUse:
    'At the start of a non-trivial change, before any code. Returns a plan document for review; writes nothing.',
  phases: [
    { title: 'Explore', detail: 'readers over code, bootstrap docs, and matching memory topicals' },
    { title: 'Synthesise', detail: 'existing-design review, deviations, and the plan itself' },
    { title: 'Experts', detail: 'ask which domain experts apply, then collect their input for the plan' },
  ],
}

// --- agent names (identical in every workflow; a test holds them equal) ---
// An installed plugin registers its agents as "<plugin>:<agent>", so a bare "uw-explorer"
// is "agent type not found". Every agentType goes through agentName(). A local run against
// agents copied to .claude/agents/ passes args.agentNamespace: "".
const AGENT_NAMESPACE = args && typeof args.agentNamespace === 'string' ? args.agentNamespace : 'ultimate-workflow:'
const agentName = (name) => (String(name).includes(':') ? name : AGENT_NAMESPACE + name)
// --- end agent names ---

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
// A comma-separated string or a list: an agent writing the args file reasonably wrote a list, and
// `.split` on it crashed the run before any agent started (2026-10-29).
const rawAreas = (args && args.areas) || ''
const areas = (Array.isArray(rawAreas) ? rawAreas : String(rawAreas).split(','))
  .map((a) => String(a).trim())
  .filter(Boolean)

if (!feature) {
  return {
    ok: false,
    error: 'No feature described. Pass one, for example: {"feature": "add rate limiting to the public API"}',
  }
}

// --- expert lane helpers (identical in plan.js, tests.js and review.js; a test holds them equal) ---
// The expert list is discovered by experts/experts.js from the agents folder and passed in
// as args.available, because a workflow script cannot read the folder itself.
const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((e) => String(e).trim()).filter(Boolean)
const wellFormedAvailable = (a) =>
  Array.isArray(a) && a.every((e) => e && typeof e.name === 'string' && typeof e.agent === 'string' && Array.isArray(e.stages))
const describeExperts = (a) => a.map((e) => `- ${e.name}: ${e.description}`).join('\n')
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

// The workflow cannot read files, so experts.js sends the shared rules (experts/protocol.md) with
// the skills, under `_protocol`, and they are pasted into each expert's prompt. Telling an expert
// to open a file did not get it opened, which is why skills are pasted too.
const protocolText = args && args.skills && typeof args.skills === 'object' && typeof args.skills._protocol === 'string' ? args.skills._protocol.trim() : ''
const readFirst = (dir, name, stage) =>
  protocolText
    ? `Read ${dir}/${name}/references/${stage}.md.\n\nTHE PROTOCOL every expert follows:\n${protocolText}`
    : `Read ${dir}/protocol.md first (the rules every expert follows), then ${dir}/${name}/references/${stage}.md.`

// Skills at the plan stage. No code can see the draft (it exists only in this script), so the
// selection call is also asked which skills the draft needs, from a list experts.js built:
// args.skills is { <expert>: [{ name, headline, text }] } from `experts.js skills --stage plan`.
// The answer can only pick from that list; the chosen text is pasted into the expert's prompt.
const offeredSkills = (() => {
  const raw = args && args.skills && typeof args.skills === 'object' && !Array.isArray(args.skills) ? args.skills : {}
  const out = {}
  for (const [expert, list] of Object.entries(raw)) {
    if (expert.startsWith('_')) continue
    const ok = (Array.isArray(list) ? list : []).filter((x) => x && typeof x.name === 'string' && typeof x.headline === 'string' && typeof x.text === 'string' && x.text.trim() !== '')
    if (ok.length > 0) out[expert] = ok
  }
  return out
})()
const SKILL_CHOICE = {
  type: 'array',
  items: {
    type: 'object',
    required: ['expert', 'name', 'why'],
    properties: { expert: { type: 'string' }, name: { type: 'string' }, why: { type: 'string', description: 'One sentence tying this skill to something in the draft' } },
  },
}
const describeSkills = (experts) =>
  experts
    .filter((n) => offeredSkills[n])
    .map((n) => offeredSkills[n].map((x) => `- expert ${n}, skill ${x.name}: ${x.headline}`).join('\n'))
    .join('\n')

const PLAN_INPUT = {
  type: 'object',
  required: ['summary', 'constraints', 'risks', 'questions'],
  properties: {
    summary: { type: 'string', description: 'Two sentences at most: what this domain needs from the plan' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Requirements the implementation must meet, each one checkable by someone who is not you. At most four' },
    risks: { type: 'array', items: { type: 'string' }, description: 'What goes wrong if the plan is built as written. At most four' },
    questions: { type: 'array', items: { type: 'string' }, description: 'Decisions only the user can make. Empty when there are none' },
  },
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
      { agentType: agentName('uw-explorer'), label: r.label, phase: 'Explore', schema: SLICE }
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

Two rules on content. Anchor every claim about the codebase in something a reader actually reported -- do not assert structure nobody observed. And leave the Tests section out entirely; it is written and confirmed separately, after this plan is.

If the work is split into cards and a check needs the running system (a browser capture, an integration or end-to-end harness, a load run), that harness is the first card, and later cards are built and verified against it: built last, it finds defects the earlier cards already committed.`,
  { agentType: agentName('uw-explorer'), label: 'synthesise', phase: 'Synthesise', schema: PLAN }
)

if (!plan) {
  return { ok: false, error: 'Synthesis failed after the readers succeeded. Rerun, or inspect the journal.' }
}

// Domain experts. The question "which of these apply to this plan" is put to a model with the
// list in front of it; the answer is merged by code. Each selected expert that takes part in
// planning then reads the draft and adds what its domain requires. The input is rendered into
// the plan by this script, not by a model, so it appears under the expert's name exactly as
// the expert gave it, and a failed consult is visible as a failed consult.
const available = (args && args.available) || []
const currentExperts = asList(args && args.experts)
let planMarkdown = plan.planMarkdown
const openQuestions = [...(plan.openQuestions || [])]
let expertLane
const expertInput = []

if (!args || args.available === undefined || args.available === null) {
  expertLane = { stage: 'plan', skipped: 'args.available was not passed, so domain experts were not considered. Run "node experts/experts.js list" and pass it.' }
} else if (!wellFormedAvailable(available)) {
  expertLane = { stage: 'plan', skipped: 'args.available is not the output of experts/experts.js list, so domain experts were not considered.' }
} else if (available.length > 0 && !args.expertsDir) {
  expertLane = { stage: 'plan', skipped: 'args.expertsDir was not passed, so experts could not be pointed at their references.' }
} else if (available.length > 0 && (!args.skills || typeof args.skills !== 'object' || Array.isArray(args.skills))) {
  expertLane = { stage: 'plan', skipped: 'args.skills was not passed, so the experts would have run without their skills. Run "node experts/experts.js skills --stage plan" and pass its JSON unchanged.' }
} else if (available.length === 0) {
  expertLane = { stage: 'plan', available: [], selected: currentExperts, ran: [], failed: [], added: [] }
} else {
  phase('Experts')
  const skillsOnOffer = Object.keys(offeredSkills).length > 0
  const ask = await agent(
    `Decide which domain experts should contribute to this plan before it is confirmed.

THE REQUEST
${feature}

THE DRAFT PLAN
${planMarkdown}

Available experts (the only names you may answer with):
${describeExperts(available)}

Name every available expert whose domain this work touches, each with one sentence tying it to something in the request or the plan. When you are unsure whether one applies, include it: a consult costs a few minutes, and a missing one is discovered at review, after the code exists. If none apply, return an empty list.${
      skillsOnOffer
        ? `

Some experts can also be given skills: short references pasted into the expert's prompt. For every expert you name or that is already selected (${currentExperts.join(', ') || 'none yet'}), name each skill below that this draft needs, with one sentence tying it to the draft. When unsure, include it: a skill costs a few thousand tokens, a missing one leaves the expert without the check it holds. Name none if none apply.
${describeSkills(available.map((e) => e.name))}`
        : ''
    }`,
    {
      agentType: agentName('uw-explorer'),
      label: 'select-experts',
      phase: 'Experts',
      schema: skillsOnOffer ? { ...SELECTION, required: [...SELECTION.required, 'skills'], properties: { ...SELECTION.properties, skills: SKILL_CHOICE } } : SELECTION,
    }
  )
  if (!ask) {
    expertLane = { stage: 'plan', available: available.map((e) => e.name), selected: currentExperts, ran: [], failed: [], added: [], selectionFailed: true }
  } else {
    const merged = addOnly(currentExperts, ask.experts, available)
    const taking = takingPart(available, merged.experts, 'plan')
    // Only a skill on offer for that expert is applied; anything else is reported, never pasted.
    const chosenSkills = {}
    const ignoredSkills = []
    for (const c of Array.isArray(ask.skills) ? ask.skills : []) {
      const expert = String((c && c.expert) || '').trim()
      const name = String((c && c.name) || '').trim()
      const offer = (offeredSkills[expert] || []).find((x) => x.name === name)
      if (!offer || !taking.some((e) => e.name === expert)) ignoredSkills.push(`${expert}/${name}`)
      else if (!(chosenSkills[expert] || []).some((x) => x.name === name)) (chosenSkills[expert] = chosenSkills[expert] || []).push(offer)
    }
    const skillBlock = (name) => {
      const mine = chosenSkills[name] || []
      if (mine.length > 0) return `\n\nSKILLS for this plan (${mine.map((x) => x.name).join(', ')}), chosen for this draft. Read them before you answer. Do not open other skill files.\n\n${mine.map((x) => x.text).join('\n\n')}`
      return offeredSkills[name] ? '\n\nNo skill was chosen for this draft. Do not open skill files.' : ''
    }
    const results = await parallel(
      taking.map((e) => () =>
        agent(
          `You are the ${e.name} domain expert, giving input to a plan before it is confirmed. Stage: plan. ${readFirst(args.expertsDir, e.name, 'plan')}

THE REQUEST
${feature}

THE DRAFT PLAN
${planMarkdown}

Say what your domain requires of this plan that it does not yet say. Read the code the plan touches where you need to.${skillBlock(e.name)}`,
          { agentType: agentName(e.agent), label: `plan:${e.name}`, phase: 'Experts', schema: PLAN_INPUT }
        )
      )
    )
    const ran = []
    const failed = []
    const sections = []
    taking.forEach((e, i) => {
      const r = results[i]
      if (!r) {
        failed.push(e.name)
        sections.push(`### ${e.name}\n\nThe consult failed, so there is no input from this expert. Treat the plan as not reviewed for this domain.`)
        return
      }
      ran.push(e.name)
      expertInput.push({ expert: e.name, ...r })
      ;(r.questions || []).forEach((q) => openQuestions.push(`[${e.name}] ${q}`))
      const list = (title, items) => (items && items.length ? `**${title}**\n${items.map((x) => `- ${x}`).join('\n')}\n` : '')
      sections.push(`### ${e.name}\n\n${r.summary}\n\n${list('Constraints', r.constraints)}${list('Risks', r.risks)}${list('Questions for you', r.questions)}`.trimEnd())
    })
    if (sections.length > 0) planMarkdown = `${planMarkdown.trimEnd()}\n\n## Expert input\n\n${sections.join('\n\n')}\n`
    expertLane = {
      stage: 'plan',
      available: available.map((e) => e.name),
      selected: merged.experts,
      added: merged.added,
      ran,
      failed,
      reasons: ask.experts,
      skillsLoaded: Object.fromEntries(taking.map((e) => [e.name, (chosenSkills[e.name] || []).map((x) => x.name)])),
      ...(skillsOnOffer ? { skillReasons: (ask.skills || []).filter((c) => !ignoredSkills.includes(`${c.expert}/${c.name}`)) } : {}),
      ...(ignoredSkills.length ? { ignoredSkills } : {}),
      ...(merged.rejected.length ? { ignoredUnknown: merged.rejected } : {}),
    }
  }
}

return {
  ok: true,
  feature,
  slicesRead: found.length,
  failedReaders: failed,
  deviations: plan.deviations,
  openQuestions,
  planMarkdown,
  expertLane,
  expertInput,
  note:
    'Nothing was written. Review the plan, then save it as PLAN-<feature>.md. Set plan_confirmed to true only after you have actually confirmed it.',
}
