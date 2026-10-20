'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const gen = require('./lib/gen.js');
const thresholds = require('./thresholds.json');
const { loadWorkflow } = require('../../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '..', '.cursor-plugin', 'ultimate-workflow');
const { briefs } = require(path.join(PLUGIN, 'experts', 'experts.js'));

// The second place the frozen task set's hash is pinned. The file is the first.
const PINNED = '3272d0621d0908b3af6ebf15354f15c9e2411bc35ff4dc8a007fbf5d228c86b2';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'uw-gen-'));
const read = (f) => fs.readFileSync(f, 'utf8');
const BRIEFS = [{ name: 'developer', text: '# Brief\n\nReuse what the repository already has. It adds no work.' }];
const ARMS = [{ label: 'PlainArm', kind: 'plain' }, { label: 'BriefArm', kind: 'brief' }];

const plan = (work = tmp()) => gen.buildGenPlan({ split: 'dev', arms: ARMS, runs: 3, work, briefs: BRIEFS });

test('the frozen task set is valid, pinned, and has both kinds in both splits', () => {
  const raw = read(gen.GEN_FILE);
  assert.equal(require('node:crypto').createHash('sha256').update(raw).digest('hex'), PINNED, 'the task set changed after it was frozen');
  const c = JSON.parse(raw);
  assert.deepEqual(gen.validateTasks(c), []);
  assert.equal(c.tasks.filter((t) => t.kind === 'trap').length, 7);
  assert.equal(c.tasks.filter((t) => t.kind === 'restraint').length, 5);
  assert.ok(c.tasks.every((t) => /^g[0-9a-f]{8}$/.test(t.id)));
});

test('validation catches each way a task set can be unsound', () => {
  const fresh = () => JSON.parse(read(gen.GEN_FILE));
  const probs = (fn) => {
    const c = fresh();
    fn(c);
    return gen.validateTasks(c).join(' | ');
  };
  assert.match(probs((c) => (c.tasks[0].id = 'g12345678')), /opaque id/);
  assert.match(probs((c) => (c.tasks[1].id = c.tasks[0].id)), /duplicate id|opaque id/);
  assert.match(probs((c) => (c.tasks[0].split = 'train')), /split/);
  assert.match(probs((c) => (c.tasks[0].files = [])), /no starting files/);
  assert.match(probs((c) => (c.tasks[0].files = [{ path: '../x', content: '' }])), /bad starting file/);
  assert.match(probs((c) => (c.tasks[0].checks = ['one'])), /at least two checks/);
  assert.match(probs((c) => { const t = c.tasks.find((x) => x.kind === 'trap'); t.traps = []; }), /trap task needs traps/);
  assert.match(probs((c) => { const t = c.tasks.find((x) => x.kind === 'restraint'); delete t.restraint; }), /restraint task needs simplest/);
  assert.match(probs((c) => { c.tasks[0].request = 'Please add a feature using a clean abstraction layer for the service.'; }), /hints at the craft/);
  assert.match(probs((c) => (c.tasks = c.tasks.filter((t) => t.kind !== 'restraint'))), /at least 4 restraint tasks/);
  assert.match(gen.validateTasks({ tasks: [] }).join('|'), /no tasks/);
});

test('freezing assigns opaque ids and a deterministic split', () => {
  const raw = JSON.parse(read(gen.GEN_FILE)).tasks.map((t) => ({ ...t, id: undefined, split: undefined }));
  const a = gen.freezeTasks(raw);
  const b = gen.freezeTasks([...raw].reverse());
  assert.deepEqual(a, b);
  assert.deepEqual(a, JSON.parse(read(gen.GEN_FILE)));
});

test('a plan has one implementer task per arm and run, each with a pristine and a working copy of every repository', () => {
  const { plan: p, dir } = plan();
  assert.equal(p.batches.length, 6);
  const tasks = JSON.parse(read(gen.GEN_FILE)).tasks.filter((t) => t.split === 'dev');
  for (const b of p.batches) {
    const text = read(b.taskFile);
    for (const t of tasks) {
      assert.ok(text.includes(`task ${t.id}`));
      for (const f of t.files) {
        assert.equal(read(path.join(b.root, t.id, 'a', f.path)), f.content);
        assert.equal(read(path.join(b.root, t.id, 'b', f.path)), f.content);
      }
    }
    assert.ok(text.includes(b.resultFile));
  }
  assert.ok(fs.existsSync(path.join(dir, 'plan.json')));
});

test('only the brief arm gets the brief, and no task text gives the traps or the restraint away', () => {
  const { plan: p } = plan();
  const tasks = JSON.parse(read(gen.GEN_FILE)).tasks;
  for (const b of p.batches) {
    const text = read(b.taskFile);
    assert.equal(text.includes('STANDING BRIEF'), b.kind === 'brief');
    assert.equal(text.includes('Reuse what the repository already has.'), b.kind === 'brief');
    assert.ok(!/PlainArm|BriefArm/.test(text), 'arm label in the task');
    for (const t of tasks) {
      for (const secret of [...(t.traps || []).flatMap((x) => [x.badSign, x.goodSign, x.temptation]), ...(t.restraint ? [t.restraint.simplest, ...t.restraint.overEngineeredSigns] : [])]) {
        assert.ok(!text.includes(secret), 'a trap or restraint description leaked into an implementer task');
      }
    }
  }
});

test('the brief block is exactly what workflows/build.js puts into the implementer prompt', async () => {
  const real = briefs(PLUGIN).briefs;
  const run = loadWorkflow(path.join(PLUGIN, 'workflows', 'build.js'));
  const { calls } = await run({ plan: 'PLAN-x.md', briefs: real }, (call) =>
    call.label === 'write-tests' ? { filesWritten: [], testsFailAsExpected: true, summary: 's', testCommand: 'x' } : { green: true, filesChanged: [], summary: 's' }
  );
  const prompt = calls.find((c) => c.label === 'write-tests').prompt;
  assert.ok(prompt.includes(gen.briefBlock(real)), 'the generation eval would test a different brief than the one that ships');
  assert.equal(gen.briefBlock([]), '');
  assert.equal(gen.briefBlock([{ name: 'x', text: '  ' }, null]), '');
});

test('the order of tasks differs between arms and runs and is stable between builds', () => {
  const tasks = JSON.parse(read(gen.GEN_FILE)).tasks;
  const ids = (a, r) => gen.orderFor(a, r, tasks).map((t) => t.id).join();
  assert.notEqual(ids('P0', 1), ids('P0', 2));
  assert.notEqual(ids('P0', 1), ids('P1', 1));
  assert.equal(ids('P0', 1), ids('P0', 1));
});

test('a brief arm without a brief, an unknown arm and an empty split are refused', () => {
  assert.throws(() => gen.buildGenPlan({ split: 'dev', arms: [{ label: 'B', kind: 'brief' }], runs: 1, work: tmp(), briefs: [] }), /needs at least one brief/);
  assert.throws(() => gen.buildGenPlan({ split: 'dev', arms: [{ label: 'X', kind: 'mystery' }], runs: 1, work: tmp(), briefs: BRIEFS }), /unknown arm kind/);
  assert.throws(() => gen.buildGenPlan({ split: 'nowhere', arms: ARMS, runs: 1, work: tmp(), briefs: BRIEFS }), /no tasks in split/);
});

test('the diff shows exactly what the implementer changed, including new files, and counts added lines', () => {
  const { plan: p } = plan();
  const b = p.batches[0];
  const t = JSON.parse(read(gen.GEN_FILE)).tasks.find((x) => x.id === p.tasks[0]);
  const cwd = path.join(b.root, t.id);
  assert.equal(gen.diffOf(cwd), '', 'untouched means empty');
  const file = path.join(cwd, 'b', t.files[0].path);
  fs.appendFileSync(file, '\n# added line one\n# added line two\n');
  fs.writeFileSync(path.join(cwd, 'b', 'new_module.py'), 'VALUE = 1\n');
  const d = gen.diffOf(cwd);
  assert.match(d, /\+# added line one/);
  assert.match(d, /new file mode/);
  assert.match(d, /\+VALUE = 1/);
  assert.equal(gen.addedLines(d), 4);
});

/** Pretend to be the implementers: every batch changes one file per task; the plain arm's change is marked. */
function implement(p, { onlyBatches } = {}) {
  const tasks = JSON.parse(read(gen.GEN_FILE)).tasks;
  for (const b of p.batches) {
    if (onlyBatches && !onlyBatches.includes(b.id)) continue;
    for (const id of p.tasks) {
      const t = tasks.find((x) => x.id === id);
      fs.appendFileSync(path.join(b.root, id, 'b', t.files[0].path), `\n# change made by ${b.kind}\n`);
    }
    fs.writeFileSync(b.resultFile, JSON.stringify({ done: true }));
  }
}

function judgeAll(dir, decide) {
  const all = JSON.parse(read(gen.GEN_FILE)).tasks;
  const tasks = gen.buildJudgeTasks(dir);
  const p = JSON.parse(read(path.join(dir, 'plan.json')));
  for (const j of tasks) {
    const b = p.batches.find((x) => x.id === j.id);
    const results = p.tasks.map((id) => {
      const t = all.find((x) => x.id === id);
      return { taskId: id, correct: true, failedChecks: [], traps: (t.traps || []).map((x) => ({ id: x.id, outcome: 'avoided', quote: '' })), overEngineered: false, overEngineeredQuote: '', reason: 'ok', ...decide(b, t) };
    });
    fs.writeFileSync(j.resultFile, JSON.stringify({ results }));
  }
  return tasks;
}

test('judge tasks exist only for answered batches, carry the diff and the traps, and hide the arm', () => {
  const { plan: p, dir } = plan();
  implement(p, { onlyBatches: [p.batches[0].id, p.batches[3].id] });
  const tasks = gen.buildJudgeTasks(dir);
  assert.equal(tasks.length, 2);
  const text = read(tasks[0].taskFile);
  assert.match(text, /\| \+# change made by/);
  assert.match(text, /bad sign:/);
  assert.match(text, /A quote that is not in the diff is rejected/);
  assert.ok(!/PlainArm|BriefArm/.test(text));
  assert.ok(!tasks[0].taskFile.includes('Arm'));
});

test('scoring end to end: the arm whose tasks come out clean beats the arm that falls into traps', () => {
  const { plan: p, dir } = plan();
  implement(p);
  judgeAll(dir, (b, t) => (b.kind === 'plain' && t.kind === 'trap' ? { traps: t.traps.map((x) => ({ id: x.id, outcome: 'fell-in', quote: '# change made by plain' })) } : {}));
  const r = gen.scoreGen(dir, thresholds, 'PlainArm');
  const dev = JSON.parse(read(gen.GEN_FILE)).tasks.filter((t) => t.split === 'dev');
  assert.equal(r.arms.BriefArm.cleanTasksMajority, dev.length);
  assert.equal(r.arms.PlainArm.cleanTasksMajority, dev.filter((t) => t.kind === 'restraint').length);
  assert.ok(r.arms.PlainArm.trap.fellIn > 0);
  assert.equal(r.arms.BriefArm.trap.fellIn, 0);
  assert.equal(r.comparisons.BriefArm.pass, true, JSON.stringify(r.comparisons.BriefArm.checks.filter((c) => !c.ok)));
  assert.ok(Object.values(r.perTask).every((v) => /\d\/3 clean/.test(v.BriefArm)));
});

test('an unanswered batch or an unchanged repository is a failed run, never a clean one', () => {
  const { plan: p, dir } = plan();
  implement(p, { onlyBatches: p.batches.slice(1).map((b) => b.id) });
  judgeAll(dir, () => ({}));
  const r = gen.scoreGen(dir, thresholds, 'PlainArm');
  const victim = p.batches[0];
  assert.equal(r.arms[victim.arm].failedRuns, p.tasks.length, 'every task of the unanswered batch failed');
  assert.ok(!r.comparisons.BriefArm.checks.find((c) => c.name === 'no failed runs').ok || victim.arm === 'PlainArm');
});

test('a judgement whose quote is not in the diff stops the scoring', () => {
  const { plan: p, dir } = plan();
  implement(p);
  judgeAll(dir, (b, t) => (t.kind === 'trap' ? { traps: t.traps.map((x) => ({ id: x.id, outcome: 'fell-in', quote: 'words that appear nowhere in this change' })) } : {}));
  assert.throws(() => gen.scoreGen(dir, thresholds, 'PlainArm'), /not in the diff/);
  const { plan: p2, dir: dir2 } = plan();
  implement(p2);
  judgeAll(dir2, (b, t) => (t.kind === 'restraint' ? { overEngineered: true, overEngineeredQuote: 'an extra factory nobody asked for' } : {}));
  assert.throws(() => gen.scoreGen(dir2, thresholds, 'PlainArm'), /over-engineering quote not in the diff/);
});

test('a task the judge skipped, or a trap it did not judge, stops the scoring', () => {
  const { plan: p, dir } = plan();
  implement(p);
  const tasks = gen.buildJudgeTasks(dir);
  for (const j of tasks) fs.writeFileSync(j.resultFile, JSON.stringify({ results: [] }));
  assert.throws(() => gen.scoreGen(dir, thresholds, 'PlainArm'), /no judgement/);
  judgeAll(dir, (b, t) => (t.kind === 'trap' ? { traps: [] } : {}));
  assert.throws(() => gen.scoreGen(dir, thresholds, 'PlainArm'), /was not judged/);
});

const rec = (arm, run, taskId, kind, over = {}) => ({ arm, run, taskId, kind, failed: false, correct: true, trapsFellIn: 0, trapsTotal: kind === 'trap' ? 2 : 0, overEngineered: false, added: 10, ...over });
const T = [{ id: 'g1', kind: 'trap' }, { id: 'g2', kind: 'restraint' }];
const runsOf = (arm, id, kind, over) => [1, 2, 3].map((n) => rec(arm, n, id, kind, over));

test('summarise: a task is clean by majority only if two of three runs are correct, trap-free and not over-engineered', () => {
  const records = [...runsOf('A', 'g1', 'trap'), ...[1, 2, 3].map((n) => rec('A', n, 'g2', 'restraint', n === 1 ? {} : { overEngineered: true }))];
  const s = gen.summarise(T, records);
  assert.equal(s.cleanTasksMajority, 1);
  assert.equal(s.cleanTasksMajorityTrap, 1);
  assert.equal(s.cleanTasksMajorityRestraint, 0);
  assert.equal(s.overEngineered.count, 2);
  assert.equal(s.correct.count, 6);
  assert.equal(s.meanAddedLines, 10);
  assert.throws(() => gen.summarise(T, records.slice(1)), /same, non-zero number of runs/);
});

test('compare: more clean tasks passes; extra over-engineering, lost correctness or a failed run each fail it, and say which', () => {
  const plainRecs = [...runsOf('P', 'g1', 'trap', { trapsFellIn: 1 }), ...runsOf('P', 'g2', 'restraint')];
  const goodRecs = [...runsOf('B', 'g1', 'trap'), ...runsOf('B', 'g2', 'restraint')];
  const plain = gen.summarise(T, plainRecs);
  const t = thresholds.generation;
  assert.equal(gen.compare(gen.summarise(T, goodRecs), plain, t).pass, true);

  const same = gen.compare(gen.summarise(T, plainRecs.map((r) => ({ ...r, arm: 'B' }))), plain, t);
  assert.equal(same.pass, false);
  assert.match(same.checks.find((c) => !c.ok).name, /more tasks come out clean/);

  const gold = [...runsOf('B', 'g1', 'trap'), ...runsOf('B', 'g2', 'restraint', { overEngineered: true })];
  const oe = gen.compare(gen.summarise(T, gold), plain, t);
  assert.equal(oe.pass, false);
  assert.match(oe.checks.filter((c) => !c.ok).map((c) => c.name).join('|'), /over-engineering/);

  // over-engineering on a trap task counts too: it is not only a restraint-task failure
  const trapOe = [...runsOf('B', 'g1', 'trap', { overEngineered: true }), ...runsOf('B', 'g2', 'restraint')];
  assert.match(gen.compare(gen.summarise(T, trapOe), plain, t).checks.filter((c) => !c.ok).map((c) => c.name).join('|'), /over-engineering, on any task/);

  const wrong = [...runsOf('B', 'g1', 'trap'), ...runsOf('B', 'g2', 'restraint', { correct: false })];
  assert.match(gen.compare(gen.summarise(T, wrong), plain, t).checks.filter((c) => !c.ok).map((c) => c.name).join('|'), /correctness/);

  const failed = [...runsOf('B', 'g1', 'trap'), ...runsOf('B', 'g2', 'restraint'), ].map((r, i) => (i === 0 ? { ...r, failed: true, correct: false } : r));
  assert.match(gen.compare(gen.summarise(T, failed), plain, t).checks.filter((c) => !c.ok).map((c) => c.name).join('|'), /failed runs/);
});

test('compare: traps fallen into and lines added are reported and never decide pass or fail', () => {
  const plain = gen.summarise(T, [...runsOf('P', 'g1', 'trap', { trapsFellIn: 0 }), ...runsOf('P', 'g2', 'restraint')]);
  const worseTraps = gen.summarise(T, [...runsOf('B', 'g1', 'trap', { trapsFellIn: 1, correct: true }), ...runsOf('B', 'g2', 'restraint')].map((r) => ({ ...r })));
  const out = gen.compare(worseTraps, plain, { ...thresholds.generation, cleanMarginTasks: 0 });
  assert.ok(out.checks.find((c) => /traps fallen/.test(c.name)).informational);
  assert.ok(out.checks.find((c) => /lines added/.test(c.name)).informational);
});

test('the generation thresholds are recorded and sane', () => {
  const g = thresholds.generation;
  assert.ok(g.cleanMarginTasks >= 1, 'a margin of zero tasks cannot show an improvement');
  assert.equal(g.overEngineeredDeltaRuns, 0);
  assert.ok(g.correctTolerance > 0 && g.correctTolerance < 0.2);
  assert.match(thresholds._generationNote, /before the first generation run/);
});

test('summarise: an incorrect run is never clean, and a failed run does not count as correct', () => {
  const wrong = [...runsOf('A', 'g1', 'trap', { correct: false }), ...runsOf('A', 'g2', 'restraint')];
  const s = gen.summarise(T, wrong);
  assert.equal(s.cleanTasksMajority, 1, 'the incorrect trap task is not clean');
  assert.equal(s.cleanTasksMajorityTrap, 0);
  const failed = [...runsOf('A', 'g1', 'trap', { failed: true, correct: true }), ...runsOf('A', 'g2', 'restraint')];
  const f = gen.summarise(T, failed);
  assert.equal(f.cleanTasksMajority, 1);
  assert.equal(f.failedRuns, 3);
});

test('an answered batch whose repository was left unchanged is a failed run, not a clean one', () => {
  const { plan: p, dir } = plan();
  implement(p);
  const b = p.batches[0];
  const t = JSON.parse(read(gen.GEN_FILE)).tasks.find((x) => x.id === p.tasks[0]);
  fs.copyFileSync(path.join(b.root, t.id, 'a', t.files[0].path), path.join(b.root, t.id, 'b', t.files[0].path));
  judgeAll(dir, () => ({}));
  const { records } = gen.collectRecords(dir);
  const r = records.find((x) => x.arm === b.arm && x.run === b.run && x.taskId === t.id);
  assert.equal(r.failed, true);
  assert.equal(r.correct, false, 'a failed run must not count as correct');
  assert.equal(records.filter((x) => x.failed).length, 1);
});
