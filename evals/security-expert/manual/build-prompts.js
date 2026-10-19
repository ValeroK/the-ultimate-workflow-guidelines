'use strict';

// Builds the prompt for one review run in the security-expert evaluation.
//
// Four arms, identical in everything except the instructions they carry:
//   generic   a plain "find any defects" review: what the core lenses would do
//             unprompted. The strongest no-expert baseline, not a weak one.
//   lens      the existing optional `security` lens of uw-reviewer, exactly as
//             review.js builds it today.
//   upstream  Anthropic's /security-review command text from the vendored copy,
//             reduced to a single stage and given our output contract.
//   expert    uw-expert-security: its agent definition plus the prompt review.js
//             builds for an expert, which points at the checklist.
//
// The lens and expert prompts are captured by running the real review.js under the
// workflow harness, so they cannot drift from production. Every arm reads the same
// diff file with the same read-only instruction and writes the same JSON contract,
// so the comparison measures instructions, not plumbing.

const fs = require('node:fs');
const path = require('node:path');
const { loadWorkflow } = require('../lib/run-workflow.js');

const ARMS = ['generic', 'lens', 'upstream', 'expert'];

const head = (c) => `You are taking part in a code review exercise. Follow these instructions exactly.

Repository: ${c.worktree} (the change under review is already applied in this checkout).
The diff of the change is saved at ${c.diffFile}. Read it with your file-reading tool.
You may read any file in the repository. Do not run shell commands. Do not modify any file in the repository.
`;

const tail = (c) => `When you are finished, write your result as JSON to ${c.resultFile} using your file-writing tool (this is the only file you may write), in exactly this shape:
{"findings":[{"file":"<path relative to the repository root>","line":<integer, the line in the new file>,"what":"<one sentence>","confidence":"high|medium|low"}],"verdict":"<one sentence>"}
Use an empty findings array if you have nothing to report. Then reply with the single word: done`;

const body = (file) => fs.readFileSync(file, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();

async function captureReviewPrompt(pluginDir, args, label) {
  const run = loadWorkflow(path.join(pluginDir, 'workflows', 'review.js'));
  const { calls } = await run(args, () => ({ findings: [], lensVerdict: 'captured' }));
  const call = calls.find((x) => x.label === label);
  if (!call) throw new Error(`review.js produced no "${label}" call for ${JSON.stringify(args)}`);
  return call;
}

function upstreamText(vendorDir) {
  let t = body(path.join(vendorDir, 'security-review.md'));
  const cut = (start, end, replacement) => {
    const a = t.indexOf(start);
    const b = end ? t.indexOf(end, a) : t.length;
    if (a === -1 || b === -1) throw new Error(`upstream text changed: cannot find "${start}"`);
    t = t.slice(0, a) + replacement + t.slice(b);
  };
  // The shell-injected git output, replaced by the diff file named in the head.
  cut('GIT STATUS:', 'OBJECTIVE:', 'Review the complete diff of the change.\n\n\n');
  // The upstream's own markdown report format; every arm uses the same JSON contract.
  cut('REQUIRED OUTPUT FORMAT:', 'SEVERITY GUIDELINES:', '(Your output format is given at the end of these instructions.)\n\n');
  // The upstream's sub-task choreography; every arm is a single stage.
  cut('START ANALYSIS:', null, '');
  return t.trim();
}

async function buildPrompt(c) {
  if (!ARMS.includes(c.arm)) throw new Error(`unknown arm: ${c.arm}`);
  const range = 'main..HEAD';
  const note = 'Your task:';
  let middle;

  if (c.arm === 'generic') {
    middle =
      'Review this change for any defects: bugs, security problems, or anything else that is wrong. Report only real problems, each with a concrete failure scenario. If the change is sound, report nothing.';
  } else if (c.arm === 'lens') {
    const call = await captureReviewPrompt(c.pluginDir, { lenses: 'security', range, skipRouting: true }, 'security');
    const reading = `Start by reading the diff: \`git diff ${range}\`.`;
    if (!call.prompt.includes(reading)) throw new Error('review.js no longer says how the lens reads the diff; update build-prompts.js');
    middle = `Your role definition:\n\n${body(path.join(c.pluginDir, 'agents', 'uw-reviewer.md'))}\n\n${note}\n\n${call.prompt.replace(
      reading,
      'Start by reading the diff at the path given above.'
    )}`;
  } else if (c.arm === 'upstream') {
    middle = upstreamText(c.vendorDir);
  } else {
    const call = await captureReviewPrompt(
      c.pluginDir,
      { routing: { experts: ['security'] }, diffFile: c.diffFile, expertsDir: path.join(c.pluginDir, 'experts'), range },
      'security'
    );
    // The shipped expert may run read-only commands and use the web. Every arm in this
    // exercise reads files only, so the comparison measures instructions, not tools.
    const parity = 'Exercise constraint: in this exercise the shell and the web are not available to you, whatever your role definition says; use only your file-reading tools.';
    middle = `Your role definition:\n\n${body(path.join(c.pluginDir, 'agents', 'uw-expert-security.md'))}\n\n${parity}\n\n${note}\n\n${call.prompt}`;
  }
  return `${head(c)}\n${middle}\n\n${tail(c)}\n`;
}

module.exports = { buildPrompt, ARMS };
