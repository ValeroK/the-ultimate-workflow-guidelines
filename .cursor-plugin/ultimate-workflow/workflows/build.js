export const meta = {
  name: 'build',
  description: 'Write the tests, then the minimal implementation, and loop until green or escalate',
  whenToUse:
    'After both the plan and the test plan are confirmed. The only phase that writes to the repository.',
  phases: [
    { title: 'Tests', detail: 'write them, and confirm they fail' },
    { title: 'Implement', detail: 'the smallest change that makes them pass' },
    { title: 'Verify', detail: 'run, diagnose in a clean context, retry, escalate at the cap' },
  ],
}

// The only writing phase, and the only one with a loop.
//
// Two things make the loop safe rather than a way to burn tokens on thrashing:
//
// A hard cap. Three failing rounds and it stops and hands the problem back,
// because a fourth attempt after three failures is not converging on anything,
// it is guessing. MAST puts "unaware of termination conditions" at 12.4% of
// multi-agent failures; this is that condition, stated.
//
// Diagnosis in a clean context. The agent that just failed three times has a
// window full of its own wrong theories. A fresh reader gets the failure output
// and the diff and nothing else, which is also what keeps the raw stack trace
// out of the conversation entirely.

const ROUND_CAP = 3
const planFile = (args && args.plan) || ''
const command = (args && args.command) || ''

const WROTE = {
  type: 'object',
  required: ['filesWritten', 'testsFailAsExpected', 'summary'],
  properties: {
    filesWritten: { type: 'array', items: { type: 'string' } },
    testsFailAsExpected: {
      type: 'boolean',
      description: 'True if the new tests were run and FAILED. False is a finding, not a success',
    },
    unexpectedlyPassing: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tests that passed before the implementation existed',
    },
    testCommand: { type: 'string' },
    summary: { type: 'string' },
  },
}

const BUILT = {
  type: 'object',
  required: ['green', 'filesChanged', 'summary'],
  properties: {
    green: { type: 'boolean' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    notDone: { type: 'array', items: { type: 'string' }, description: 'Deliberately left undone, and why' },
    noticed: { type: 'array', items: { type: 'string' }, description: 'Worth a later change; not done now' },
    failureOutput: { type: 'string', description: 'Verbatim, when not green' },
    summary: { type: 'string' },
  },
}

const DIAGNOSIS = {
  type: 'object',
  required: ['cause', 'signature', 'suggestedFix', 'confidence'],
  properties: {
    cause: { type: 'string', description: 'What is actually wrong, from the evidence' },
    signature: { type: 'string', description: 'Short stable identifier for this failure, to detect no progress' },
    suggestedFix: { type: 'string' },
    testMayBeWrong: { type: 'boolean', description: 'True if the test, not the code, looks incorrect' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
}

const locate = planFile
  ? `Read ${planFile}.`
  : 'Find the active PLAN-*.md in this repository -- the most recently modified one -- and read it.'

phase('Tests')

const tests = await agent(
  `${locate}

Write the tests from its confirmed Tests section. Only the tests. Do not write the implementation yet.

Then RUN them and confirm they FAIL.

A new test that passes before the implementation exists is testing nothing, and it is invisible afterwards -- a green suite looks the same whether its tests constrain the behaviour or merely coexist with it. If any new test passes now, list it in unexpectedlyPassing and say so plainly. That is a finding, not a convenience.

Report the project's real verification command as testCommand.`,
  { agentType: 'uw-implementer', label: 'write-tests', phase: 'Tests', schema: WROTE }
)

if (!tests) {
  return { ok: false, error: 'The test-writing step failed. Nothing was implemented.' }
}

const testCommand = command || tests.testCommand
log(`${tests.filesWritten.length} test files written; verify command: ${testCommand}`)

if (!tests.testsFailAsExpected) {
  // Stop here deliberately. Implementing against tests that already pass means
  // the loop below would go green on the first run and prove nothing at all.
  return {
    ok: false,
    stoppedAt: 'Tests',
    error: 'The new tests did not fail before implementation, so they cannot demonstrate the change works.',
    unexpectedlyPassing: tests.unexpectedlyPassing || [],
    filesWritten: tests.filesWritten,
    hint: 'Either the behaviour already exists, or those tests have no real oracle. Both are worth knowing before writing code.',
  }
}

phase('Implement')

let round = 0
let last = null
let diagnosis = null
const history = []

while (round < ROUND_CAP) {
  round += 1

  const attempt = await agent(
    `${locate}

Write the minimal implementation that makes the tests pass. Run \`${testCommand}\` and report whether it is green.
${
  diagnosis
    ? `\nThis is attempt ${round}. A previous attempt failed and a fresh reader diagnosed it:\n${JSON.stringify(diagnosis, null, 2)}\n\nUse that diagnosis. Do not re-derive it, and do not repeat the fix that already failed.`
    : ''
}

Smallest change that works. Nothing beyond the plan. Do not improve adjacent code, reformat untouched lines, or rename anything not in scope -- every changed line must trace to a plan item.

Never make a test pass by weakening it. Deleting an assertion or special-casing the test input converts a failing test into a lie that outlives you. If a test is genuinely wrong, say so and leave it failing.

When not green, include the failure output verbatim.`,
    { agentType: 'uw-implementer', label: `attempt-${round}`, phase: round === 1 ? 'Implement' : 'Verify', schema: BUILT }
  )

  if (!attempt) {
    history.push({ round, note: 'the implementer returned nothing' })
    break
  }

  last = attempt
  history.push({ round, green: attempt.green, summary: attempt.summary })

  if (attempt.green) {
    log(`Green on round ${round}`)
    return {
      ok: true,
      green: true,
      rounds: round,
      testFiles: tests.filesWritten,
      filesChanged: attempt.filesChanged,
      notDone: attempt.notDone || [],
      noticed: attempt.noticed || [],
      history,
      summary: attempt.summary,
    }
  }

  if (round >= ROUND_CAP) break

  // Diagnose in a fresh context. The agent that just failed is holding its own
  // wrong theories; a reader who has only the failure and the diff is better
  // placed to see what it actually says. This is also what keeps the raw stack
  // trace from ever reaching the conversation.
  const next = await agent(
    `An implementation attempt failed. Diagnose it from the evidence, nothing else.

FAILURE OUTPUT
${attempt.failureOutput || '(none captured)'}

WHAT WAS CHANGED
${JSON.stringify(attempt.filesChanged, null, 2)}

Read the relevant code and tests. Say what is actually wrong -- not what might be. Give the failure a short stable signature so a repeat can be recognised as no progress.

If the TEST looks wrong rather than the code, say so: that is a legitimate outcome and needs a human, not another attempt.`,
    { agentType: 'uw-reviewer', label: `diagnose-${round}`, phase: 'Verify', schema: DIAGNOSIS }
  )

  const priorSignature = diagnosis && diagnosis.signature
  diagnosis = next

  if (next && next.testMayBeWrong) {
    return {
      ok: false,
      green: false,
      stoppedAt: `round ${round}`,
      reason: 'The diagnosis says the test may be wrong, not the code. That needs a decision, not another attempt.',
      diagnosis: next,
      history,
      escalation: escalationText(round, next, history),
    }
  }

  if (next && priorSignature && next.signature === priorSignature) {
    return {
      ok: false,
      green: false,
      stoppedAt: `round ${round}`,
      reason: 'The same failure signature twice running -- no progress. Stopping before the cap rather than spending another round on it.',
      diagnosis: next,
      history,
      escalation: escalationText(round, next, history),
    }
  }
}

return {
  ok: false,
  green: false,
  stoppedAt: `round ${round}`,
  reason: `Verification failed ${round} times. Round cap reached.`,
  diagnosis,
  history,
  lastFailure: last && last.failureOutput,
  escalation: escalationText(round, diagnosis, history),
}

// The escalation is the blocker protocol the workflow already specifies:
// state the problem, say what changed between attempts, give the signature,
// and present options rather than picking one.
function escalationText(rounds, dx, hist) {
  return [
    `Verification failed ${rounds} times. Stopping.`,
    '',
    `What is wrong: ${dx ? dx.cause : 'not diagnosed'}`,
    `Failure signature: ${dx ? dx.signature : 'unknown'}`,
    '',
    'What changed between attempts:',
    ...hist.map((h) => `  round ${h.round}: ${h.summary || h.note || 'no summary'}`),
    '',
    'Options worth weighing:',
    `  1. Apply the suggested fix directly: ${dx ? dx.suggestedFix : 'none offered'}`,
    '  2. Revisit the test -- it may be asserting the wrong thing.',
    '  3. Revisit the plan -- the approach may be wrong, not the code.',
    '',
    'Pick one. Do not start a fourth attempt without a decision.',
  ].join('\n')
}
