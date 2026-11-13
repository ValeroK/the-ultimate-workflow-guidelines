'use strict';

// W4. In the re-wash, the quality expert wrote "the one real hole" into its lensVerdict and recorded
// no finding, because the protocol says to leave out anything rated below 8 and there was nowhere
// else for it to go. A below-threshold worry now has a place of its own: `concerns`, each with the
// reason it is not a finding. Code checks the shape, carries the valid ones into the evidence and the
// ledger, and lists them for the user; they never block a commit.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ex = require(path.join(PLUGIN, 'experts', 'experts.js'));
const ledger = require(path.join(PLUGIN, 'experts', 'ledger.js'));
const gates = require(path.join(PLUGIN, 'hooks', 'lib', 'gates.js'));
const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});
const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });

async function review(responder, extra = {}) {
  return loadWorkflow(path.join(PLUGIN, 'phases', 'review.js'))(
    { range: 'working', available: ex.list(PLUGIN).experts, experts: ['quality'], diffFile: '.ultimate-workflow/review.diff', expertsDir: '/p/experts', skills: {}, expertsOnly: true, ...extra },
    async (c) => (c.label === 'recheck' ? { experts: [] } : responder(c))
  );
}

// --- the protocol -------------------------------------------------------------------------------

test('the protocol sends a below-threshold worry to concerns, and keeps its size budget', () => {
  const p = read('experts/protocol.md');
  assert.ok(Buffer.byteLength(p) <= 2560, `protocol.md is ${Buffer.byteLength(p)} bytes`);
  assert.match(p, /concerns/);
  assert.match(p, /lensVerdict/, 'it says a worry does not live only in the verdict');
  assert.doesNotMatch(p, /Below that, leave it out\./, 'the old rule that made a worry vanish');
});

// --- the review workflow --------------------------------------------------------------------------

test('valid concerns from an expert are carried in its lane, tagged with the expert', async () => {
  const { result } = await review(() => ({
    findings: [],
    lensVerdict: 'clean',
    concerns: [{ text: 'the capture judge change has no planted-overflow test', reason: 'confidence 6: I could not show it fails', file: 'capture_judge.mjs', line: 12 }],
  }));
  assert.deepStrictEqual(result.expertLane.concerns, [
    { expert: 'quality', text: 'the capture judge change has no planted-overflow test', reason: 'confidence 6: I could not show it fails', file: 'capture_judge.mjs', line: 12 },
  ]);
  assert.equal(result.expertLane.concernsDropped, 0);
});

test('a concern with no text or no reason is dropped and counted, never carried', async () => {
  const { result } = await review(() => ({
    findings: [],
    lensVerdict: 'clean',
    concerns: [{ text: 'fine', reason: 'below 8' }, { text: 'no reason' }, { reason: 'no text' }, { text: '  ', reason: 'blank' }, { text: 'blank reason', reason: ' ' }],
  }));
  assert.deepStrictEqual(result.expertLane.concerns.map((c) => c.text), ['fine']);
  assert.equal(result.expertLane.concernsDropped, 4);
});

test('an expert keeps at most three concerns', async () => {
  const { result } = await review(() => ({
    findings: [],
    lensVerdict: 'clean',
    concerns: [1, 2, 3, 4, 5].map((n) => ({ text: `worry ${n}`, reason: 'below 8' })),
  }));
  assert.deepStrictEqual(result.expertLane.concerns.map((c) => c.text), ['worry 1', 'worry 2', 'worry 3']);
  assert.equal(result.expertLane.concernsDropped, 2);
});

test('no concerns key behaves exactly as before', async () => {
  const { result } = await review(() => ({ findings: [], lensVerdict: 'clean' }));
  assert.deepStrictEqual(result.expertLane.concerns, []);
  assert.equal(result.expertLane.concernsDropped, 0);
  assert.equal(result.ok, true);
});

test('a malformed concerns value is ignored without failing the review', async () => {
  for (const bad of ['text', 7, { text: 'x', reason: 'y' }, [null, 5, 'x']]) {
    const { result } = await review(() => ({ findings: [], lensVerdict: 'clean', concerns: bad }));
    assert.equal(result.ok, true, JSON.stringify(bad));
    assert.deepStrictEqual(result.expertLane.concerns, [], JSON.stringify(bad));
  }
});

test('concerns are optional in the schema, and each needs text and a reason', () => {
  const src = require('../security-expert/lib/run-workflow.js').readScript(path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow', 'phases', 'review.js')); // assembled: the schema is the shared review-core section
  const schema = /const FINDINGS = \{[\s\S]*?\r?\n\}\r?\n/.exec(src)[0];
  assert.match(schema, /concerns:/);
  assert.match(schema, /required: \['text', 'reason'\]/);
  assert.match(schema, /required: \['findings', 'lensVerdict'\]/, 'the array itself is not required');
});

// --- evidence, ledger, gate ---------------------------------------------------------------------

function preparedRepo() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uw-concerns-')));
  made.push(dir);
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), '1\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ultimate-workflow/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), '2\n');
  ex.prepare(dir, 'working', PLUGIN);
  return dir;
}
const lane = (concerns) => ({
  stage: 'review',
  selected: ['quality'],
  ran: ['quality'],
  failed: [],
  recheck: true,
  added: [],
  findings: [],
  skillsLoaded: {},
  concerns,
  concernsDropped: 0,
});

test('record keeps the concerns in the expert\'s evidence and reports how many', () => {
  const dir = preparedRepo();
  const concern = { expert: 'quality', text: 'no planted-overflow test', reason: 'confidence 6' };
  const out = ex.record(dir, 'review', { ok: true, expertLane: lane([concern]) }, { pluginRoot: PLUGIN });
  assert.equal(out.concerns, 1);
  const file = path.join(dir, '.ultimate-workflow', 'experts', 'review', 'quality.json');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).concerns, [concern]);
});

test('a concern never blocks the commit', () => {
  const dir = preparedRepo();
  ex.record(dir, 'review', { ok: true, expertLane: lane([{ expert: 'quality', text: 'a hole', reason: 'confidence 5' }]) }, { pluginRoot: PLUGIN });
  const ev = ex.commitEvidence(dir, '', PLUGIN);
  assert.deepStrictEqual(ev.open, []);
  assert.equal(gates.commitGate(ev).allow, true);
});

test('the ledger\'s review row counts the concerns', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-concerns-ledger-'));
  made.push(dir);
  const e = ledger.addRun(dir, 'experts', { runId: 'wf_1', tokens: 1 }, { ok: true, expertLane: { ...lane([{ expert: 'quality', text: 'a', reason: 'b' }]), findings: [] } });
  assert.equal(e.review.concerns, 1);
});

// --- what the user is told ------------------------------------------------------------------------

test('the review and experts commands list the concerns for the user and say they never block', () => {
  for (const f of ['commands/review.md', 'commands/experts.md']) {
    const text = read(f);
    assert.match(text, /concerns/, f);
  }
  const review = read('commands/review.md');
  assert.match(review, /follow-up list/);
  assert.match(review, /never block/i);
});
