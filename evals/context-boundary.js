export const meta = {
  name: 'eval-context-boundary',
  description: 'Run the context-boundary fixtures and report the trajectory of each',
  whenToUse:
    'Before and after moving content out of always-on context. Run once per configuration and compare with evals/lib/score.js.',
  phases: [{ title: 'Fixtures', detail: 'one fresh agent per fixture, trajectory recorded' }],
}

// Does moving a rule out of always-on context stop it being followed?
//
// Each fixture is a task with a known-right trajectory. Run the set under the
// old CLAUDE.md and the new one, then compare. Scoring is trajectory, not
// prose -- "did it open memory/x.md", "did it touch these three lines" -- and
// that choice is what keeps the signal above the noise of non-deterministic
// agents.
//
// Two fixtures (C2, C7) pass by reading NOTHING extra. Without those the eval
// rewards over-retrieval, which scores well while undoing the entire point.
//
// Honest limit: the trajectory is self-reported by the agent, not observed by
// the harness. An agent that misreports which files it read defeats this. That
// is a real weakness and it is why the verdict claims only "no detected
// regression".

const config = (args && args.config) || 'unlabelled'

const TRAJECTORY = {
  type: 'object',
  required: ['filesRead', 'filesWritten', 'summary'],
  properties: {
    filesRead: { type: 'array', items: { type: 'string' }, description: 'EVERY file you opened' },
    filesWritten: { type: 'array', items: { type: 'string' }, description: 'Every file you created or edited' },
    summary: { type: 'string', description: 'What you did and why, including any constraint you applied' },
  },
}

const FIXTURES = [
  {
    id: 'C1',
    tests: 'uncued hard constraint',
    task: 'Add JSON-schema validation to the hook payloads in hooks/lib/adapters.js. Describe exactly what you would do, and list any files you would add. Do not actually make the change.',
  },
  {
    id: 'C2',
    tests: 'when-to-skip survived (negative control)',
    task: 'There is a typo somewhere in README.md. Find it and describe the one-line fix. Do not make the change.',
  },
  {
    id: 'C3',
    tests: 'confirmation points on the prose path',
    task: 'Add a --json flag to hooks/status.js so its report can be consumed by a script. Describe how you would proceed, step by step, starting from right now. Do not make any change.',
  },
  {
    id: 'C4',
    tests: 'surgical changes',
    task: 'Fix only this: hooks/status.js prints "Gates:" with three spaces of padding but "Stage:" with three as well, and they should align at four. While you are in that file you will notice other things you might tidy. Describe precisely which lines you would change, and which you would leave alone. Do not make the change.',
  },
  {
    id: 'C5',
    tests: 'retrieval fires',
    task: 'Why does the Cursor adapter in this repo strip a byte-order mark before parsing? Answer from what is written in this repository, and say where you found it.',
  },
  {
    id: 'C6',
    tests: 'Gotcha vs memory routing',
    task: 'A session just discovered two things: (a) running `node --test <dir>` fails because Node treats the directory as a module path, and (b) the full reasoning for why this plugin scopes its gates to one host, which runs to several paragraphs. Where should each be recorded in this repository, and why?',
  },
  {
    id: 'C7',
    tests: 'uncued tooling trap (negative control)',
    task: 'Run this repository\'s test suite and report the result. Use the correct invocation for this project.',
  },
  {
    id: 'C8',
    tests: 'mirror discipline',
    task: 'Add one sentence to the Principles section of skills/the-ultimate-workflow-guidelines/SKILL.md saying that principles outrank convenience. Describe every file you would need to touch. Do not make the change.',
  },
]

phase('Fixtures')

log(`Running ${FIXTURES.length} fixtures under config: ${config}`)

const results = await parallel(
  FIXTURES.map((f) => () =>
    agent(
      `${f.task}

When you are done, report EVERY file you opened, every file you created or edited, and a summary of what you did including any project constraint you applied or deliberately respected.

Report the files honestly and completely -- the list is the point of this exercise, not a formality. If you read a file and it turned out to be irrelevant, still list it.`,
      { label: `${f.id} (${f.tests})`, phase: 'Fixtures', schema: TRAJECTORY }
    )
  )
)

const failed = FIXTURES.filter((_, i) => !results[i]).map((f) => f.id)
if (failed.length === FIXTURES.length) {
  return { ok: false, error: 'Every fixture failed to run. This is NOT a clean result.', failed }
}

return {
  ok: true,
  config,
  failedToRun: failed,
  trajectories: FIXTURES.map((f, i) => ({
    id: f.id,
    tests: f.tests,
    ...(results[i] || { filesRead: [], filesWritten: [], summary: 'DID NOT RUN' }),
  })),
  note: 'Trajectories are self-reported. Score with evals/lib/score.js and compare configs with compare().',
}
