'use strict';

// Skills are chosen in code and pasted into the prompt. A model told to open the skill whose cue
// matched did not open it, in two runs out of two, so these tests pin the choice and the pasting.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { loadWorkflow } = require('../security-expert/lib/run-workflow.js');

const PLUGIN = path.join(__dirname, '..', '..', '.cursor-plugin', 'ultimate-workflow');
const ex = require(path.join(PLUGIN, 'experts', 'experts.js'));

const ALWAYS = ['surgical-change', 'simplification', 'engineering-principles'];
const names = (sel) => sel.skills.map((s) => s.name);

/** A unified diff that adds the given lines to each path. */
const diffOf = (files) =>
  Object.entries(files)
    .map(([f, lines]) => `diff --git a/${f} b/${f}\n--- a/${f}\n+++ b/${f}\n@@ -1,1 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join('\n')}`)
    .join('\n');
const review = (files) => ex.selectSkills(PLUGIN, 'developer', 'review', ex.parseDiff(diffOf(files)));

// ---- selection at review ----------------------------------------------------------

test('review: a Go diff selects go-craft and the always skills, and no other language', () => {
  const n = names(review({ 'cmd/server/main.go': ['func main() {}'] }));
  assert.ok(n.includes('go-craft'));
  for (const a of ALWAYS) assert.ok(n.includes(a), a);
  for (const other of ['python-craft', 'typescript-craft', 'rust-craft', 'java-craft', 'react-craft']) assert.ok(!n.includes(other), other);
});

test('review: a docs-only diff selects no language, failure or dependency skill, only the always ones', () => {
  assert.deepEqual(names(review({ 'README.md': ['More words.'] })).sort(), [...ALWAYS].sort());
});

test('review: a .tsx diff selects both TypeScript and React', () => {
  const n = names(review({ 'web/src/Cart.tsx': ['export const Cart = () => null'] }));
  assert.ok(n.includes('typescript-craft') && n.includes('react-craft'));
});

test('review: a changed lockfile or manifest selects dependency-discipline', () => {
  for (const f of ['package-lock.json', 'svc/go.sum', 'requirements-dev.txt', 'Cargo.toml']) {
    assert.ok(names(review({ [f]: ['x'] })).includes('dependency-discipline'), f);
  }
});

test('review: an added except line selects failure-handling; the same word in a removed line does not', () => {
  assert.ok(names(review({ 'app/pay.py': ['    except Exception:', '        pass'] })).includes('failure-handling'));
  const removedOnly = ex.parseDiff('diff --git a/app/pay.py b/app/pay.py\n--- a/app/pay.py\n+++ b/app/pay.py\n@@ -1,2 +1,1 @@\n-    except Exception:\n     x = 1\n');
  assert.ok(!names(ex.selectSkills(PLUGIN, 'developer', 'review', removedOnly)).includes('failure-handling'));
});

test('review: skills come in list order, and what does not fit under the cap is named in dropped', () => {
  const change = ex.parseDiff(diffOf({ 'a.py': ['try:', 'except ValueError:'], 'b.go': ['x'] }));
  const all = ex.selectSkills(PLUGIN, 'developer', 'review', change);
  assert.deepEqual(names(all), ['failure-handling', 'python-craft', 'go-craft', ...ALWAYS]);
  const first = Buffer.byteLength(all.skills[0].text);
  const capped = ex.selectSkills(PLUGIN, 'developer', 'review', change, first + 10);
  assert.deepEqual(names(capped), ['failure-handling']);
  assert.ok(capped.dropped.includes('python-craft') && capped.dropped.includes('engineering-principles'));
});

test('review: the injected text is the skill file itself, not a summary of it', () => {
  const go = review({ 'x.go': ['x'] }).skills.find((s) => s.name === 'go-craft');
  assert.equal(go.text, fs.readFileSync(path.join(PLUGIN, 'experts', 'skills', 'go-craft', 'skill.md'), 'utf8').trim());
});

test('review: an expert with no skills list gets none, and no problem', () => {
  const sel = ex.selectSkills(PLUGIN, 'security', 'review', ex.parseDiff(diffOf({ 'a.go': ['x'] })));
  assert.deepEqual(sel, { skills: [], dropped: [], problems: [] });
});

// ---- prepare reads the saved diff, so a committed range selects too ---------------

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
}

test('prepare: a main..HEAD review with nothing uncommitted still selects skills from the range', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-skills-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'README.md'), '# x\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  git(dir, 'checkout', '-q', '-b', 'feature');
  fs.writeFileSync(path.join(dir, 'main.go'), 'package main\n\nfunc main() {}\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'feature');
  const p = ex.prepare(dir, 'main..HEAD', PLUGIN);
  assert.deepEqual(p.files, [], 'nothing uncommitted');
  assert.ok(p.skills.developer.skills.some((s) => s.name === 'go-craft'));
  assert.equal(p.skills.security, undefined, 'an expert with no skills is left out');
});

// ---- selection at build, from the plan -------------------------------------------

test('planPaths: backticked file names and slashed paths count; prose such as Node.js does not', () => {
  const found = ex.planPaths('Edit `go.mod` and `api/handler.go`, then src/web/Cart.tsx. Runs on Node.js, e.g. version 22.');
  assert.deepEqual(found.sort(), ['api/handler.go', 'go.mod', 'src/web/Cart.tsx'].sort());
});

test('brief --plan: the developer brief carries the skills its build.md selects, and loses its Skills section', () => {
  const b = ex.briefs(PLUGIN, { planText: 'Add a retry to `svc/client.go`.' });
  const dev = b.briefs.find((x) => x.name === 'developer');
  assert.ok(!/^## Skills/m.test(dev.text) && !dev.text.includes('experts/skills/'));
  assert.ok(dev.text.length < ex.BRIEF_BYTES);
  assert.deepEqual(dev.skills.map((s) => s.name), ['failure-handling', 'go-craft', ...ALWAYS]);
  assert.equal(b.note, '');
});

test('brief --plan: a plan that names no file selects only the always skills, and says so', () => {
  const b = ex.briefs(PLUGIN, { planText: 'Make the thing better.' });
  assert.deepEqual(b.briefs.find((x) => x.name === 'developer').skills.map((s) => s.name), ALWAYS);
  assert.match(b.note, /names no file/);
});

test('brief without a plan: no skills are attached, and the note says why', () => {
  const b = ex.briefs(PLUGIN);
  assert.equal(b.briefs.find((x) => x.name === 'developer').skills, undefined);
  assert.match(b.note, /no plan given/);
});

test('withoutSkillsSection removes only that section', () => {
  assert.equal(ex.withoutSkillsSection('# T\n\nkeep\n\n## Skills\n\n- a\n\n## After\n\nalso keep\n'), '# T\n\nkeep\n\n## After\n\nalso keep');
});

// ---- the workflows paste what they were given ------------------------------------

const SKILL = { name: 'go-craft', text: '# Go craft\n\nMARKER-GO-SKILL' };

test('build.js: skills on a brief reach the prompts after the brief, and the result names them', async () => {
  const responder = (call) =>
    call.label === 'write-tests' ? { filesWritten: ['t.test.js'], testsFailAsExpected: true, summary: 'w', testCommand: 'npm test' } : { green: true, filesChanged: ['a.go'], summary: 'done' };
  const { result, calls } = await loadWorkflow(path.join(PLUGIN, 'workflows', 'build.js'))({ plan: 'PLAN-x.md', briefs: [{ name: 'developer', text: 'Brief body.', skills: [SKILL, { name: 'bad' }] }] }, responder);
  assert.deepEqual(result.skillsLoaded, ['go-craft']);
  for (const c of calls) {
    assert.ok(c.prompt.indexOf('MARKER-GO-SKILL') > c.prompt.indexOf('Brief body.'), c.label);
    assert.match(c.prompt, /SKILLS for this change \(go-craft\)/);
  }
  const none = await loadWorkflow(path.join(PLUGIN, 'workflows', 'build.js'))({ plan: 'PLAN-x.md', briefs: [{ name: 'developer', text: 'Brief body.' }] }, responder);
  assert.deepEqual(none.result.skillsLoaded, []);
  for (const c of none.calls) assert.ok(!c.prompt.includes('SKILLS for this change'));
});

test('review.js: the expert gets its own skills pasted in, the lane records them, and an expert without any is told not to look', async () => {
  const available = ex.list(PLUGIN).experts;
  const args = { available, experts: ['developer', 'security'], diffFile: '.ultimate-workflow/review.diff', expertsDir: '/p/experts', skills: { developer: { skills: [SKILL], dropped: [] } } };
  const clean = (call) => (call.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: `clean through ${call.label}` });
  const { result, calls } = await loadWorkflow(path.join(PLUGIN, 'workflows', 'review.js'))(args, clean);
  const dev = calls.find((c) => c.label === 'developer');
  const sec = calls.find((c) => c.label === 'security');
  assert.match(dev.prompt, /SKILLS for this change \(go-craft\)[\s\S]*MARKER-GO-SKILL/);
  assert.ok(!sec.prompt.includes('MARKER-GO-SKILL'));
  assert.match(sec.prompt, /No skill applies to this change/);
  assert.ok(!calls.find((c) => c.label === 'correctness').prompt.includes('SKILLS for this change'), 'core lenses get no skills');
  assert.deepEqual(result.expertLane.skillsLoaded, { developer: ['go-craft'], security: [] });
});

test('prepare: a user git config with no diff prefixes or forced colour still selects skills', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-skills-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'diff.noprefix', 'true');
  git(dir, 'config', 'color.diff', 'always');
  fs.writeFileSync(path.join(dir, 'README.md'), '# x\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  fs.writeFileSync(path.join(dir, 'lib.rs'), 'fn main() {}\n');
  git(dir, 'add', '-A');
  for (const range of ['working', 'HEAD']) {
    const p = ex.prepare(dir, range === 'HEAD' ? 'HEAD' : 'working', PLUGIN);
    assert.ok(p.skills.developer.skills.some((s) => s.name === 'rust-craft'), range);
  }
});

test('review: skills left out at the cap are reported by prepare and carried in the lane', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-skills-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'README.md'), '# x\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  // Every language at once, with error handling and a manifest: more than the cap holds.
  for (const f of ['a.py', 'b.tsx', 'c.go', 'd.rs', 'e.java']) fs.writeFileSync(path.join(dir, f), 'try { x } catch (e) {}\n');
  fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
  const p = ex.prepare(dir, 'working', PLUGIN);
  assert.ok(p.skills.developer.dropped.length > 0);
  assert.ok(p.skillProblems.some((m) => /developer: skills left out at the \d+-byte cap/.test(m)));
  const total = p.skills.developer.skills.reduce((n, s) => n + Buffer.byteLength(s.text), 0);
  assert.ok(total <= ex.SKILLS_BYTES);
  const clean = (call) => (call.label === 'recheck' ? { experts: [] } : { findings: [], lensVerdict: 'clean' });
  const { result } = await loadWorkflow(path.join(PLUGIN, 'workflows', 'review.js'))(
    { available: ex.list(PLUGIN).experts, experts: ['developer'], diffFile: 'd', expertsDir: '/p', skills: p.skills },
    clean
  );
  assert.deepEqual(result.expertLane.skillsDropped.developer, p.skills.developer.dropped);
});

// ---- plan: a selection question, because no code can see the draft --------------

test('skills --stage plan: each planning expert offers the skills its plan.md lists, with a headline and the text', () => {
  const k = ex.planSkills(PLUGIN);
  assert.deepEqual(k.problems, []);
  assert.deepEqual(k.skills.developer.map((s) => s.name), ['engineering-principles', 'dependency-discipline', 'failure-handling']);
  for (const s of k.skills.developer) {
    assert.match(s.headline, /^load when the plan/);
    assert.equal(s.text, fs.readFileSync(path.join(PLUGIN, 'experts', 'skills', s.name, 'skill.md'), 'utf8').trim());
  }
  assert.equal(k.skills.security, undefined, 'an expert with no skills offers none');
});

const PLAN_MD = '---\nplan_confirmed: false\n---\n# Plan\n\nAdd a retry around the payment call.\n';
const OFFER = { developer: [{ name: 'failure-handling', headline: 'load when the plan adds retries', text: '# Failure\n\nMARKER-FAILURE' }, { name: 'dependency-discipline', headline: 'load when deps change', text: '# Deps\n\nMARKER-DEPS' }] };
const planRun = (args, select) =>
  loadWorkflow(path.join(PLUGIN, 'workflows', 'plan.js'))(
    { feature: 'retry payments', available: ex.list(PLUGIN).experts, expertsDir: '/p/experts', ...args },
    (call) => {
      if (call.label === 'select-experts') return select(call);
      if (call.label.startsWith('plan:')) return { summary: 's', constraints: [], risks: [], questions: [] };
      if (call.label === 'synthesise') return { planMarkdown: PLAN_MD, openQuestions: [], deviations: [] };
      return { slice: 's', patterns: [], reusable: [], constraints: [], notCovered: 'n' };
    }
  );

test('plan: the selection call is offered the skills with headlines, and only the chosen text reaches the expert', async () => {
  let asked = null;
  const { result, calls } = await planRun({ skills: OFFER }, (call) => {
    asked = call;
    return { experts: [{ name: 'developer', why: 'new retry' }], skills: [{ expert: 'developer', name: 'failure-handling', why: 'adds a retry' }] };
  });
  assert.match(asked.prompt, /expert developer, skill failure-handling: load when the plan adds retries/);
  assert.ok(asked.schema.required.includes('skills'));
  const dev = calls.find((c) => c.label === 'plan:developer');
  assert.match(dev.prompt, /SKILLS for this plan \(failure-handling\)[\s\S]*MARKER-FAILURE/);
  assert.ok(!dev.prompt.includes('MARKER-DEPS'));
  assert.deepEqual(result.expertLane.skillsLoaded.developer, ['failure-handling']);
  assert.equal(result.expertLane.skillReasons.length, 1);
});

test('plan: a skill not on offer, or for an expert that does not take part, is reported and never pasted', async () => {
  const { result, calls } = await planRun({ skills: OFFER }, () => ({
    experts: [{ name: 'developer', why: 'x' }],
    skills: [{ expert: 'developer', name: 'go-craft', why: 'x' }, { expert: 'security', name: 'failure-handling', why: 'x' }],
  }));
  assert.deepEqual(result.expertLane.ignoredSkills.sort(), ['developer/go-craft', 'security/failure-handling']);
  const dev = calls.find((c) => c.label === 'plan:developer');
  assert.match(dev.prompt, /No skill was chosen for this draft\. Do not open skill files\./);
  assert.deepEqual(result.expertLane.skillsLoaded.developer, []);
});

test('plan: with no skills passed, the question and the schema are what they were', async () => {
  let asked = null;
  const { result } = await planRun({}, (call) => {
    asked = call;
    return { experts: [{ name: 'developer', why: 'x' }] };
  });
  assert.ok(!/skill/i.test(asked.prompt));
  assert.deepEqual(asked.schema.required, ['experts']);
  assert.equal(result.expertLane.skillReasons, undefined);
});
