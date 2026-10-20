'use strict';

// Turns raw corpus files written by a blind author into the frozen corpus in the repo.
//
//   node freeze.js <expert> <raw.json> [<raw2.json> ...]
//
// It assigns opaque ids and the dev/heldout split, recomputes diff hunk headers, validates,
// writes evals/experts/corpus/<expert>.json and refreshes corpus/MANIFEST.json. It refuses
// to overwrite a corpus that already exists: a frozen corpus does not change. To replace
// one deliberately, delete the file first and say why in the commit.

const fs = require('node:fs');
const path = require('node:path');
const corpus = require('../lib/corpus.js');

const [expert, ...raws] = process.argv.slice(2);
if (!expert || raws.length === 0) {
  process.stderr.write('usage: node freeze.js <expert> <raw.json> [<raw2.json> ...]\n');
  process.exit(2);
}

const target = corpus.corpusFile(expert);
if (fs.existsSync(target)) {
  process.stderr.write(`freeze: ${target} already exists. A frozen corpus does not change.\n`);
  process.exit(2);
}

const rawCases = [];
for (const file of raws) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  rawCases.push(...parsed.cases);
}

const frozen = corpus.freeze(expert, rawCases);
const problems = corpus.validate(frozen);
if (problems.length > 0) {
  process.stderr.write(`freeze: the corpus is not valid:\n- ${problems.join('\n- ')}\n`);
  process.exit(1);
}

fs.mkdirSync(corpus.CORPUS_DIR, { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(frozen, null, 2)}\n`);
fs.writeFileSync(path.join(corpus.CORPUS_DIR, 'MANIFEST.json'), `${JSON.stringify(corpus.manifest(), null, 2)}\n`);
const kinds = frozen.cases.reduce((acc, c) => ({ ...acc, [c.kind]: (acc[c.kind] || 0) + 1 }), {});
process.stdout.write(`${JSON.stringify({ expert, cases: frozen.cases.length, kinds, heldout: frozen.cases.filter((c) => c.split === 'heldout').length })}\n`);
