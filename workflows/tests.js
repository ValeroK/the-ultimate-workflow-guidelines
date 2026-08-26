export const meta = {
  name: 'tests',
  description: 'Draft a test plan, then have independent critics find what it would let through',
  whenToUse:
    'After the plan is confirmed, before any implementation. Returns a Tests section for review; writes nothing.',
  phases: [
    { title: 'Draft', detail: 'a first test plan from the confirmed plan' },
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
    testsMarkdown: draft.testsMarkdown,
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
  testsMarkdown: merged.testsMarkdown,
  testCommand: merged.testCommand,
  expectedTestNames: merged.expectedTestNames,
  changesMade: merged.changesMade,
  gapsDeclined: merged.gapsDeclined,
  angleVerdicts: verdicts,
  failedAngles,
  note:
    'Nothing was written. Review this, append it to the plan file, and set tests_confirmed to true only after you have actually confirmed it.',
}
