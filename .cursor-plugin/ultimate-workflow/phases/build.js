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

// @shared agent-names

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

const planFile = (args && args.plan) || ''
const command = (args && args.command) || ''
// 4.1.1: the plugin's verify.js, set by experts.js script when the plan names its test_command.
// Each round runs the tests related to the change; at green, the full suite once.
const verify = (args && typeof args.verify === 'string' && args.verify.trim()) || ''
// Standing briefs from the experts that declare the build stage, found by the command in code
// (this script cannot read files) and passed in as [{ name, text }]. Anything malformed is dropped,
// not guessed at.
const briefs = ((args && args.briefs) || []).filter((b) => b && typeof b.name === 'string' && typeof b.text === 'string' && b.text.trim() !== '')
// The skills a brief carries were chosen by the command from the plan (`experts.js brief --plan`).
const skillsOf = (b) => (Array.isArray(b.skills) ? b.skills : []).filter((s) => s && typeof s.name === 'string' && typeof s.text === 'string' && s.text.trim() !== '')
const skillsLoaded = briefs.flatMap((b) => skillsOf(b).map((s) => s.name)).filter((n, i, all) => all.indexOf(n) === i)
// Resuming at the implementation, by the user's decision: the tests are already written, and the
// ones that passed before the change were accepted (for example a guard shown rejecting a bad
// sample). Without this a stopped build could only be resumed by hand-editing a copy of this
// script. The decision and the command are required, and the result carries them.
const resume = args && args.resumeAt === 'implement'
  ? { reason: String(args.resumeReason || '').trim(), testFiles: (Array.isArray(args.testFiles) ? args.testFiles : []).filter((f) => typeof f === 'string') }
  : null

// A standing brief is loaded on every build. It says how to write, never what to build, so the plan
// still decides the scope.
const BRIEF =
  briefs.length === 0
    ? ''
    : `\n\nSTANDING BRIEF, from ${briefs.map((b) => b.name).join(', ')}. It applies to every line you write, and it adds no work: do nothing the plan did not ask for.\n\n${briefs.map((b) => b.text.trim()).join('\n\n')}\n${
        skillsLoaded.length === 0
          ? ''
          : `\nSKILLS for this change (${skillsLoaded.join(', ')}), chosen from the plan's files and text. Most are written as review checks: write the code so that none of them would find anything. Like the brief, they add no work.\n\n${briefs
              .flatMap(skillsOf)
              .filter((s, i, all) => all.findIndex((x) => x.name === s.name) === i)
              .map((s) => s.text.trim())
              .join('\n\n')}\n`
      }`

const locate = planFile
  ? `Read ${planFile}.`
  : 'Find the active PLAN-*.md in this repository -- the most recently modified one -- and read it.'

// @shared build-model

// @shared build-loop

phase('Tests')

if (resume && (!command || !resume.reason)) {
  return { ok: false, error: 'resumeAt "implement" needs command (the verification command) and resumeReason (the user\'s decision on the tests that already pass), so the skipped test step is on record. Nothing was implemented.' }
}
if (resume) log(`Resumed at the implementation, tests not rewritten: ${resume.reason}`)

return await buildLoop({
  locate,
  brief: BRIEF,
  verify,
  command,
  resume,
  implementerModel: IMPLEMENTER_MODEL,
  diagnoserModel: DIAGNOSER_MODEL,
  briefsLoaded: briefs.map((b) => b.name),
  skillsLoaded,
})
