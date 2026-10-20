export const meta = {
  name: 'tests',
  description: 'Draft a test plan, then have independent critics find what it would let through',
  whenToUse:
    'After the plan is confirmed, before any implementation. Returns a Tests section for review; writes nothing.',
  phases: [
    { title: 'Draft', detail: 'a first test plan from the confirmed plan' },
    { title: 'Experts', detail: 'selected domain experts add the cases their domain needs' },
    { title: 'Attack', detail: 'critics from four angles find what it would let pass' },
    { title: 'Merge', detail: 'fold the surviving criticism back in' },
  ],
}

// Draft, attack, merge.
//
// The attack stage exists because the author of a test plan is the worst
// possible judge of it: they know what they meant, so a test that only checks
// what they meant looks complete to them. Four critics with clean contexts and
// one angle each ask the question the author cannot -- could an implementation
// pass all of this and still be wrong?
//
// Nothing here writes. The Tests section comes back for review, because
// "what would prove this is done" is the cheapest thing in the whole workflow
// to negotiate on paper and the most expensive to discover was wrong later.

const planFile = (args && args.plan) || ''
const extraAngles = ((args && args.angles) || '')
  .split(',')
  .map((a) => a.trim())
  .filter(Boolean)

const CORE_ANGLES = ['coverage', 'edge-cases', 'oracle-quality', 'runnability']
const angles = [...CORE_ANGLES, ...extraAngles.filter((a) => !CORE_ANGLES.includes(a))]

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

const TESTS_INPUT = {
  type: 'object',
  required: ['summary', 'cases'],
  properties: {
    summary: { type: 'string', description: 'One or two sentences: what this domain needs the tests to prove' },
    cases: {
      type: 'array',
      description: 'At most eight. Each is a test someone could write from this description alone',
      items: {
        type: 'object',
        required: ['name', 'asserts', 'why'],
        properties: { name: { type: 'string' }, asserts: { type: 'string', description: 'The input and the exact outcome the test must check' }, why: { type: 'string', description: 'The failure in this domain it would catch' } },
      },
    },
  },
}

const DRAFT = {
  type: 'object',
  required: ['testsMarkdown', 'testCommand'],
  properties: {
    testsMarkdown: { type: 'string', description: 'The Tests section as markdown' },
    testCommand: { type: 'string', description: "The project's real verification command" },
    expectedTestNames: {
      type: 'array',
      items: { type: 'string' },
      description: 'The specific test names this plan says must exist and pass',
    },
  },
}

const CRITIQUE = {
  type: 'object',
  required: ['angleVerdict', 'gaps'],
  properties: {
    angleVerdict: { type: 'string', description: 'One sentence, INCLUDING when nothing was found' },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['gap', 'passingImplementation'],
        properties: {
          gap: { type: 'string', description: 'What the plan does not constrain' },
          passingImplementation: {
            type: 'string',
            description: 'A concrete wrong implementation that passes every listed test',
          },
          suggestedTest: { type: 'string', description: 'What a test closing it would assert' },
        },
      },
    },
  },
}

const MERGED = {
  type: 'object',
  required: ['testsMarkdown', 'testCommand', 'expectedTestNames', 'changesMade', 'gapsDeclined'],
  properties: {
    testsMarkdown: { type: 'string' },
    testCommand: { type: 'string' },
    expectedTestNames: { type: 'array', items: { type: 'string' } },
    changesMade: { type: 'array', items: { type: 'string' } },
    gapsDeclined: {
      type: 'array',
      items: {
        type: 'object',
        required: ['gap', 'why'],
        properties: { gap: { type: 'string' }, why: { type: 'string' } },
      },
    },
  },
}

phase('Draft')

const locate = planFile
  ? `Read ${planFile}.`
  : 'Find the active PLAN-*.md in this repository -- the most recently modified one if there are several -- and read it.'

const draft = await agent(
  `${locate}

Write the Tests section for it: what to test, how, and what counts as done.

Ground every test in a stated goal or success criterion from the plan. A criterion in the plan with nothing testing it is the specific failure this section exists to prevent.

Also determine the project's real verification command by looking at how tests are actually run here -- CI config, scripts, existing test files -- not by guessing a convention.

Name the specific tests that must exist and pass. That turns "is this done" from a judgement into something anyone can check.`,
  { agentType: 'uw-critic', label: 'draft', phase: 'Draft', schema: DRAFT }
)

if (!draft) {
  return {
    ok: false,
    error: 'The draft failed, so there is no test plan. This is NOT an empty result.',
    hint: 'Check /workflows. If uw-critic is missing, agent definitions load with a delay after being added.',
  }
}

log(`Draft written (${draft.expectedTestNames ? draft.expectedTestNames.length : 0} named tests); attacking from ${angles.length} angles`)

// Domain experts that take part in testing add the cases their domain needs. They are the
// experts the plan selected (args.experts); no question is asked here, because selection
// already happened. Their cases are appended by this script under their names, after the
// critics have attacked the draft, so a critic never sees them and cannot be anchored by them.
const availableExperts = (args && args.available) || []
const selectedExperts = asList(args && args.experts)
let expertLane
let expertCases = ''
if (!args || args.available === undefined || args.available === null) {
  expertLane = { stage: 'tests', skipped: 'args.available was not passed, so domain experts were not considered. Run "node experts/experts.js list" and pass it.' }
} else if (!wellFormedAvailable(availableExperts)) {
  expertLane = { stage: 'tests', skipped: 'args.available is not the output of experts/experts.js list, so domain experts were not considered.' }
} else if (availableExperts.length > 0 && selectedExperts.length > 0 && !args.expertsDir) {
  expertLane = { stage: 'tests', skipped: 'args.expertsDir was not passed, so experts could not be pointed at their references.' }
} else {
  // An expert whose agent file says `always: [tests]` joins here whether or not the plan selected
  // it: every test plan is about tests. It is added to the selection, so the record says it ran.
  const forced = availableExperts.filter((e) => Array.isArray(e.always) && e.always.includes('tests') && !selectedExperts.includes(e.name)).map((e) => e.name)
  const selectedHere = [...selectedExperts, ...forced]
  const taking = takingPart(availableExperts, selectedHere, 'tests')
  // Skills were chosen in code from the plan (`experts.js skills --stage tests --plan`) and arrive
  // as { <expert>: { skills: [{ name, text }], dropped } }; the text is pasted into the prompt.
  const skillsFor = (name) => {
    const entry = args.skills && typeof args.skills === 'object' ? args.skills[name] : null
    return (entry && Array.isArray(entry.skills) ? entry.skills : []).filter((x) => x && typeof x.name === 'string' && typeof x.text === 'string' && x.text.trim() !== '')
  }
  const skillBlock = (name) => {
    const mine = skillsFor(name)
    return mine.length === 0
      ? ''
      : `\n\nSKILLS for this plan (${mine.map((x) => x.name).join(', ')}), chosen by the workflow from the plan. Read them before you add cases. Do not open other skill files.\n\n${mine.map((x) => x.text.trim()).join('\n\n')}`
  }
  if (taking.length > 0) phase('Experts')
  const results = await parallel(
    taking.map((e) => () =>
      agent(
        `You are the ${e.name} domain expert, adding the test cases your domain needs. Stage: tests. Read ${args.expertsDir}/protocol.md first (the rules every expert follows), then ${args.expertsDir}/${e.name}/references/tests.md.

${planFile ? `The plan is at ${planFile}; read it, including its "Expert input" section where you stated what you required.` : 'Read the active PLAN-*.md, including its "Expert input" section where you stated what you required.'}

THE DRAFT TESTS
${draft.testsMarkdown}

Add only cases that the draft does not already cover and that your domain says must exist. Do not restate the draft.${skillBlock(e.name)}`,
        { agentType: e.agent, label: `tests:${e.name}`, phase: 'Experts', schema: TESTS_INPUT }
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
      sections.push(`#### ${e.name}\n\nThe consult failed, so no cases from this expert. Treat the tests as not reviewed for this domain.`)
      return
    }
    ran.push(e.name)
    const rows = (r.cases || []).map((c) => `- **${c.name}**: ${c.asserts} (catches: ${c.why})`)
    sections.push(`#### ${e.name}\n\n${r.summary}${rows.length ? '\n\n' + rows.join('\n') : ''}`)
  })
  if (sections.length > 0) expertCases = `\n\n### Expert test cases\n\n${sections.join('\n\n')}\n`
  expertLane = {
    stage: 'tests',
    available: availableExperts.map((e) => e.name),
    selected: selectedHere,
    ran,
    failed,
    added: forced,
    skillsLoaded: Object.fromEntries(taking.map((e) => [e.name, skillsFor(e.name).map((x) => x.name)])),
  }
}

phase('Attack')

const critiques = await parallel(
  angles.map((angle) => () =>
    agent(
      `Attack this draft test plan from the ${angle} angle ONLY. Other critics have the other angles.

${draft.testsMarkdown}

${planFile ? `The plan it belongs to is at ${planFile}; read it for the goals these tests are meant to prove.` : 'Read the active PLAN-*.md for the goals these tests are meant to prove.'}

Your question is not whether these are good tests. It is: **could someone write an implementation that passes every one of them and is still wrong?** If you can describe that implementation, that is your finding.

Read the actual code the tests would run against. A gap that is real in the abstract but impossible in this codebase is not a gap.

You have no quota. Zero gaps is a correct answer, and common from an angle this change does not touch.`,
      { agentType: 'uw-critic', label: angle, phase: 'Attack', schema: CRITIQUE }
    )
  )
)

const failedAngles = angles.filter((_, i) => !critiques[i])
const gaps = []
angles.forEach((angle, i) => {
  const c = critiques[i]
  if (!c) return
  ;(c.gaps || []).forEach((g) => gaps.push({ ...g, angle }))
})

const verdicts = angles
  .map((angle, i) => (critiques[i] ? { angle, verdict: critiques[i].angleVerdict } : null))
  .filter(Boolean)

if (failedAngles.length === angles.length) {
  return {
    ok: false,
    error: 'Every critic failed, so the draft was never attacked. Do not treat it as reviewed.',
    failedAngles,
    draft,
  }
}

if (gaps.length === 0) {
  return {
    ok: true,
    testsMarkdown: draft.testsMarkdown + expertCases,
    expertLane,
    testCommand: draft.testCommand,
    expectedTestNames: draft.expectedTestNames || [],
    angleVerdicts: verdicts,
    failedAngles,
    changesMade: [],
    gapsDeclined: [],
    note:
      failedAngles.length > 0
        ? `No gaps found, but ${failedAngles.join(' and ')} did not run -- the draft is only partly attacked.`
        : 'No gaps found. Every angle ran and could not construct a wrong implementation that passes.',
  }
}

log(`${gaps.length} gaps found; merging`)

phase('Merge')

const merged = await agent(
  `Revise this test plan to close the gaps that are worth closing.

DRAFT
${draft.testsMarkdown}

GAPS FOUND
${JSON.stringify(gaps, null, 2)}

For each gap, either close it -- by adding or strengthening a test, and say what you changed -- or decline it and say why. Declining is legitimate: a gap can be real but not worth a test, or already covered by another test the critic did not see, or describe an implementation nobody would write.

Do not simply append every suggested test. A test plan that grows to cover every hypothetical is one nobody runs and nobody maintains. Prefer strengthening a weak assertion over adding a new case: an existing test with a real oracle catches more than two tests with none.

Return the full revised Tests section, the verification command, and the specific test names that must exist and pass.`,
  { agentType: 'uw-critic', label: 'merge', phase: 'Merge', schema: MERGED }
)

if (!merged) {
  return {
    ok: false,
    error: 'The merge failed after critics found gaps. The draft and gaps are returned unmerged.',
    draft,
    gaps,
  }
}

return {
  ok: true,
  testsMarkdown: merged.testsMarkdown + expertCases,
  expertLane,
  testCommand: merged.testCommand,
  expectedTestNames: merged.expectedTestNames,
  changesMade: merged.changesMade,
  gapsDeclined: merged.gapsDeclined,
  angleVerdicts: verdicts,
  failedAngles,
  note:
    'Nothing was written. Review this, append it to the plan file, and set tests_confirmed to true only after you have actually confirmed it.',
}
