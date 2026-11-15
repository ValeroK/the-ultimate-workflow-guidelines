'use strict';

// The plan-offer eval (5.1.0). Measures what no unit test can: given the session brief, does a real model
// offer a plan for a feature or a new project, and say nothing about a plan for a small fix?
//
// Run by hand, never in CI: it makes one model call for each prompt.
//
//   node evals/plan-offer/run.js              all prompts, the host's default model
//   node evals/plan-offer/run.js --model X    a named model
//   node evals/plan-offer/run.js --limit 4    the first N prompts
//   node evals/plan-offer/run.js --type feature   one type only (small, feature, project)
//
// Each prompt goes to `claude -p` in an empty temporary folder, with read-only tools and a few steps, with the
// brief appended to the system prompt (the place a SessionStart hook's context lands). What the model said in
// those steps, and the questions and skills it called, are judged by one rule:
//   feature, project -> it must ask about a plan or name /ultimate-workflow:feature
//   small            -> it must not
// The result is written to evals/plan-offer/results/<date>.json and summarised on stdout.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const gates = require('../../.cursor-plugin/ultimate-workflow/hooks/lib/gates.js');

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : '';
};

// An offer is a question about a plan, or the command by name. The bare word "plan" in a statement is not one.
const OFFER = /\bplan\b[^.!?\n]{0,160}\?|ultimate-workflow:(feature|project-bootstrap-guidelines)|ת[ו]?כנית[^.!?\n]{0,160}\?/i;
const MAX_TURNS = 4;
const offered = (reply) => OFFER.test(reply);
const correct = (type, reply) => (type === 'small' ? !offered(reply) : offered(reply));

function ask(prompt, briefFile, model, cwd) {
  // No tools, so the reply is the model's first move in words. The brief goes in by file and the prompt on
  // stdin, and no shell is used, so nothing re-reads their quotes or line breaks.
  const args = ['-p', '--max-turns', String(MAX_TURNS), '--allowedTools', 'Read,Glob,Grep', '--strict-mcp-config', '--output-format', 'stream-json', '--verbose', '--append-system-prompt-file', briefFile];
  if (model) args.push('--model', model);
  const r = spawnSync('claude', args, { cwd, input: prompt, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  // What the model said and did in its first steps: its text, and the questions and skills it called. Running out
  // of steps is not an error here: a model that goes straight to work on a small fix is the correct result.
  const said = [];
  const tools = [];
  for (const line of String(r.stdout || '').split('\n')) {
    let j;
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    if (j.type !== 'assistant' || !j.message || !Array.isArray(j.message.content)) continue;
    for (const c of j.message.content) {
      if (c.type === 'text' && c.text) said.push(c.text);
      if (c.type === 'tool_use') {
        tools.push(c.name);
        if (/AskUserQuestion|Skill/.test(c.name)) said.push(`[${c.name}] ${JSON.stringify(c.input)}`);
      }
    }
  }
  const reply = said.join('\n').trim();
  return { reply, tools, error: reply || tools.length > 0 ? '' : String(r.stderr || r.error || `exit ${r.status}`).trim().slice(0, 300) };
}

function main() {
  const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf8'));
  const only = arg('--type');
  const limit = Number(arg('--limit')) || prompts.length;
  const model = arg('--model');
  const brief = gates.sessionBrief({ stage: 'none', file: null, data: {} });
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-plan-offer-'));
  const briefFile = path.join(os.tmpdir(), `uw-plan-offer-brief-${process.pid}.txt`);
  fs.writeFileSync(briefFile, brief);
  const rows = [];
  try {
    for (const p of prompts.filter((x) => !only || x.type === only).slice(0, limit)) {
      const { reply, tools, error } = ask(p.prompt, briefFile, model, cwd);
      const ok = !error && correct(p.type, reply);
      rows.push({ type: p.type, prompt: p.prompt, offered: offered(reply), correct: ok, error, tools, reply: reply.slice(0, 3000) });
      process.stdout.write(`${ok ? 'ok  ' : error ? 'ERR ' : 'MISS'} ${p.type.padEnd(8)} ${p.prompt.slice(0, 70)}\n`);
    }
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(briefFile, { force: true });
  }
  const by = (type) => rows.filter((r) => r.type === type);
  const score = (list) => `${list.filter((r) => r.correct).length}/${list.length}`;
  const summary = { model: model || 'default', small: score(by('small')), feature: score(by('feature')), project: score(by('project')), errors: rows.filter((r) => r.error).length };
  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}${only ? `-${only}` : ''}.json`);
  fs.writeFileSync(file, `${JSON.stringify({ summary, brief, rows }, null, 2)}\n`);
  process.stdout.write(`\n${JSON.stringify(summary)}\n${file}\n`);
}

if (require.main === module) main();

module.exports = { offered, correct };
