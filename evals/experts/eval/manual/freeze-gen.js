'use strict';

// Freezes the blind-authored implementation tasks into the repo, like freeze.js does for review cases.
//
//   node freeze-gen.js <raw.json>
//
// Assigns opaque ids and the dev/heldout split, validates, writes evals/experts/corpus/gen-developer.json.
// Refuses to overwrite: a frozen task set does not change.

const fs = require('node:fs');
const gen = require('../lib/gen.js');

const [rawFile] = process.argv.slice(2);
if (!rawFile) {
  process.stderr.write('usage: node freeze-gen.js <raw.json>\n');
  process.exit(2);
}
if (fs.existsSync(gen.GEN_FILE)) {
  process.stderr.write(`freeze-gen: ${gen.GEN_FILE} already exists. A frozen task set does not change.\n`);
  process.exit(2);
}
const frozen = gen.freezeTasks(JSON.parse(fs.readFileSync(rawFile, 'utf8')).tasks);
const problems = gen.validateTasks(frozen);
if (problems.length > 0) {
  process.stderr.write(`freeze-gen: the task set is not valid:\n- ${problems.join('\n- ')}\n`);
  process.exit(1);
}
fs.writeFileSync(gen.GEN_FILE, `${JSON.stringify(frozen, null, 2)}\n`);
const kinds = frozen.tasks.reduce((a, t) => ({ ...a, [t.kind]: (a[t.kind] || 0) + 1 }), {});
process.stdout.write(`${JSON.stringify({ tasks: frozen.tasks.length, kinds, heldout: frozen.tasks.filter((t) => t.split === 'heldout').length })}\n`);
