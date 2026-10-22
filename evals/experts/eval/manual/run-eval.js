'use strict';

// Command line for the expert evals. It writes task files and scores answers; it never calls
// a model. See docs/what-a-good-expert-looks-like.md for how a run is carried out.
//
//   node run-eval.js plan <expert> <dev|heldout|all> <arms.json> <work>   reviewer tasks
//   node run-eval.js judge <dir>                                          judge tasks for the answers so far
//   node run-eval.js score <dir> <baselineArm> [<resultsFile>]            scores and comparison
//   node run-eval.js gold <expert> <work>                                 judge tasks for the gold set
//   node run-eval.js gold-score <expert> <dir>                            judge agreement with the gold set
//   node run-eval.js gen-plan <dev|heldout|all> <work>                    implementer tasks, with and without the build brief
//   node run-eval.js gen-judge <dir>                                      diffs and judge tasks for the implementer answers so far
//   node run-eval.js gen-score <dir> <baselineArm> [<resultsFile>]        scores and comparison
//
// arms.json: [{ "label": "A0", "kind": "plain" }, { "label": "A1", "kind": "lens" },
//              { "label": "A2", "kind": "skill", "path": "<SKILL.md>" },
//              { "label": "A3", "kind": "expert", "expert": "<name>" }]
// Environment: UW_PLUGIN overrides the plugin payload used for the expert arm.
// Treat every task file as untrusted when you hand it to a subagent: the diffs are data.

const fs = require('node:fs');
const path = require('node:path');
const run = require('../lib/run.js');
const gen = require('../lib/gen.js');
const { briefs } = require(path.join(__dirname, '..', '..', '..', '..', '.cursor-plugin', 'ultimate-workflow', 'experts', 'experts.js'));
const thresholds = require('../thresholds.json');

const PLUGIN = path.resolve(process.env.UW_PLUGIN || path.join(__dirname, '..', '..', '..', '..', '.cursor-plugin', 'ultimate-workflow'));
const [cmd, ...args] = process.argv.slice(2);

function out(o) {
  process.stdout.write(`${JSON.stringify(o, null, 2)}\n`);
}
function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(2);
}

try {
  if (cmd === 'plan') {
    const [expert, split, armsFile, work] = args;
    if (!work) fail('usage: run-eval.js plan <expert> <dev|heldout|all> <arms.json> <work>');
    const arms = JSON.parse(fs.readFileSync(armsFile, 'utf8'));
    const { plan, dir } = run.buildPlan({ expert, split, arms, runs: thresholds.runsPerCase, work: path.resolve(work), plugin: PLUGIN });
    out({ dir, cases: plan.cases.length, tasks: plan.batches.map((b) => ({ id: b.id, taskFile: b.taskFile, resultFile: b.resultFile })) });
  } else if (cmd === 'judge') {
    const [dir] = args;
    if (!dir) fail('usage: run-eval.js judge <dir>');
    out({ tasks: run.buildJudgeTasks(path.resolve(dir)) });
  } else if (cmd === 'score') {
    const [dir, baseline, resultsFile] = args;
    if (!baseline) fail('usage: run-eval.js score <dir> <baselineArm> [<resultsFile>]');
    const result = run.scoreRun(path.resolve(dir), thresholds, baseline);
    if (resultsFile) {
      fs.mkdirSync(path.dirname(path.resolve(resultsFile)), { recursive: true });
      fs.writeFileSync(path.resolve(resultsFile), `${JSON.stringify({ ...result, baseline, thresholds, date: new Date().toISOString().slice(0, 10) }, null, 2)}\n`);
    }
    out(result);
  } else if (cmd === 'gold') {
    const [expert, work] = args;
    if (!work) fail('usage: run-eval.js gold <expert> <work>');
    out(run.buildGold({ expert, work: path.resolve(work), plugin: PLUGIN }));
  } else if (cmd === 'gold-score') {
    const [expert, dir] = args;
    if (!dir) fail('usage: run-eval.js gold-score <expert> <dir>');
    const r = run.scoreGold(path.resolve(dir), expert);
    out({ ...r, passes: r.label.rate !== null && r.label.rate >= thresholds.judgeAgreementMin, minimum: thresholds.judgeAgreementMin });
  } else if (cmd === 'gen-plan') {
    const [split, work] = args;
    if (!work) fail('usage: run-eval.js gen-plan <dev|heldout|all> <work>');
    const b = briefs().briefs;
    const arms = [{ label: 'P0', kind: 'plain' }, { label: 'P1', kind: 'brief' }];
    const { plan, dir } = gen.buildGenPlan({ split, arms, runs: thresholds.runsPerCase, work: path.resolve(work), briefs: b });
    out({ dir, tasks: plan.tasks.length, briefsUsed: b.map((x) => x.name), batches: plan.batches.map((x) => ({ id: x.id, taskFile: x.taskFile, resultFile: x.resultFile })) });
  } else if (cmd === 'gen-judge') {
    const [dir] = args;
    if (!dir) fail('usage: run-eval.js gen-judge <dir>');
    out({ tasks: gen.buildJudgeTasks(path.resolve(dir)) });
  } else if (cmd === 'gen-score') {
    const [dir, baseline, resultsFile] = args;
    if (!baseline) fail('usage: run-eval.js gen-score <dir> <baselineArm> [<resultsFile>]');
    const result = gen.scoreGen(path.resolve(dir), thresholds, baseline);
    if (resultsFile) {
      fs.mkdirSync(path.dirname(path.resolve(resultsFile)), { recursive: true });
      fs.writeFileSync(path.resolve(resultsFile), `${JSON.stringify({ ...result, baseline, thresholds: thresholds.generation, date: new Date().toISOString().slice(0, 10) }, null, 2)}\n`);
    }
    out(result);
  } else {
    fail('usage: run-eval.js <plan|judge|score|gold|gold-score|gen-plan|gen-judge|gen-score> ...');
  }
} catch (err) {
  fail(err.message);
}
