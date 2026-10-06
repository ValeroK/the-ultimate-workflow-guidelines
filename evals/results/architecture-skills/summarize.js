'use strict';

// Summarise a `claude plugin eval --json` result file.
//   node summarize.js <result.json>
// Quality runs (two arms) print score, baseline score and delta per case.
// Trigger runs (one arm, a single skill-fired grader) print the fire rate.
// "Fired" is read from the grader named skill-fired, never inferred from the answer.

const fs = require('node:fs');

const file = process.argv[2];
if (!file) {
  console.error('usage: node summarize.js <result.json>');
  process.exit(2);
}
const result = JSON.parse(fs.readFileSync(file, 'utf8'));
const num = (n) => (typeof n === 'number' ? n.toFixed(2) : '-');

const withRuns = (c) => (c.arms && c.arms.with) || [];
const fired = (run) => run.graders.filter((g) => g.name === 'skill-fired').every((g) => g.passed);
const isTrigger = result.cases.every((c) => withRuns(c).every((r) => r.graders.length === 1));

console.log(`file: ${file}`);
console.log(`cost USD: ${result.costUsd}  partial: ${result.partial}`);

if (isTrigger) {
  let hit = 0;
  let total = 0;
  for (const c of result.cases) {
    const runs = withRuns(c);
    const ok = runs.filter(fired).length;
    console.log(`${c.name.padEnd(28)} ${ok}/${runs.length}`);
    // Negative controls (names containing "neg" or "typo") must NOT fire; exclude from the rate.
    if (!/neg|typo/.test(c.name)) {
      hit += ok;
      total += runs.length;
    }
  }
  console.log(`positive fire rate: ${hit}/${total} (${((100 * hit) / total).toFixed(0)}%)`);
} else {
  console.log(`overall: ${JSON.stringify(result.aggregates)}`);
  for (const c of result.cases) {
    const a = c.aggregates;
    const f = withRuns(c).map((r) => (r.graders.some((g) => g.name === 'skill-fired') ? (fired(r) ? 'Y' : 'N') : '-')).join('');
    console.log(
      `${c.name.padEnd(28)} with ${num(a.score)}  without ${num(a.scoreWithout)}  delta ${num(a.delta)}  fired ${f}`
    );
  }
}
