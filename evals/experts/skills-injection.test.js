'use strict';

// Skills are chosen in code and pasted into the prompt. A model told to open the skill whose cue
// matched did not open it, in two runs out of two, so these tests pin the choice and the pasting.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
// Every temporary directory this file creates is removed when it exits (node --test runs each
// file in its own process); without this, each run left hundreds behind in the system temp folder.
{
  const made = [];
  const mkdtemp = fs.mkdtempSync;
  fs.mkdtempSync = (...args) => {
    const dir = mkdtemp(...args);
    made.push(dir);
    return dir;
  };
  process.on('exit', () => {
    for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
  });
}
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
  const raw = fs.readFileSync(path.join(PLUGIN, 'experts', 'skills', 'go-craft', 'skill.md'), 'utf8');
  assert.equal(go.text, raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim(), 'the body, without the frontmatter that only code reads');
  assert.ok(!go.text.startsWith('---') && go.text.startsWith('# '));
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

test('parseSkillsFile: stages in order, selectors parsed, plan lines bare, problems named', () => {
  const r = ex.parseSkillsFile('# Skills\n\n## plan\n\n- a\n\n## review\n\n- a (files: *.go)\n- b (always)\n- c\n\n## nonsense\n\n- d (always)\n');
  assert.deepEqual(r.stages.plan.map((x) => x.name), ['a']);
  assert.deepEqual(r.stages.review.map((x) => [x.name, x.selector.kind]), [['a', 'files'], ['b', 'always']]);
  assert.ok(r.problems.some((p) => /review: c has no/.test(p)) && r.problems.some((p) => /"## nonsense" is not a stage/.test(p)));
});

test('no reference lists skills any more: selectors live only in skills.md, which no model reads', () => {
  for (const e of ex.list(PLUGIN).experts) {
    const dir = path.join(PLUGIN, 'experts', e.name, 'references');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'CHANGES.md')) {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      assert.ok(!/^## Skills\b/m.test(t) && !/experts\/skills\/[a-z-]+\/skill\.md/.test(t), `${e.name}/${f}`);
    }
  }
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
  assert.deepEqual(k.skills.developer.map((s) => s.name), ['engineering-principles', 'telemetry-in-code', 'web-performance', 'dependency-discipline', 'failure-handling']);
  for (const s of k.skills.developer) {
    assert.equal(s.headline, ex.readSkill(PLUGIN, s.name).meta.description, 'the headline is the skill\'s own description');
    assert.ok(s.text.startsWith('# ') && !s.text.includes('\ndescription: '));
  }
  assert.deepEqual(k.skills.security.map((s) => s.name), ['personal-data-exposure']);
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

// ---- quality: a build brief and test-craft at build and at tests ---------------------------

test('build: the quality brief joins the developer brief, and test-craft rides with it on every plan', () => {
  const b = ex.briefs(PLUGIN, { planText: 'Change `svc/pay.py`.' });
  const q = b.briefs.find((x) => x.name === 'quality');
  assert.ok(q, 'quality declares build');
  assert.ok(!q.text.includes('experts/skills/') && q.text.length < ex.BRIEF_BYTES);
  assert.deepEqual(q.skills.map((s) => s.name), ['test-craft']);
  const none = ex.briefs(PLUGIN, { planText: 'Make it better.' });
  assert.deepEqual(none.briefs.find((x) => x.name === 'quality').skills.map((s) => s.name), ['test-craft']);
});

test('skills --stage tests: test-craft is chosen for the quality expert from any plan', () => {
  const k = ex.testsSkills(PLUGIN, 'Add a refund endpoint in `api/refund.ts`.');
  assert.deepEqual(k.problems, []);
  assert.deepEqual(k.skills.quality.skills.map((s) => s.name), ['test-craft']);
  assert.equal(k.skills.security, undefined);
});

test('build.js: test-craft reaches the test-writing prompt once, with both briefs', async () => {
  const b = ex.briefs(PLUGIN, { planText: 'Change `svc/pay.py`.' }).briefs;
  const responder = (call) =>
    call.label === 'write-tests' ? { filesWritten: ['t.py'], testsFailAsExpected: true, summary: 'w', testCommand: 'pytest' } : { green: true, filesChanged: ['a.py'], summary: 'done' };
  const { result, calls } = await loadWorkflow(path.join(PLUGIN, 'workflows', 'build.js'))({ plan: 'PLAN-x.md', briefs: b }, responder);
  const w = calls.find((c) => c.label === 'write-tests');
  assert.match(w.prompt, /STANDING BRIEF, from developer, quality/);
  assert.equal((w.prompt.match(/^# Test craft$/gm) || []).length, 1);
  assert.ok(result.skillsLoaded.includes('test-craft') && result.skillsLoaded.includes('python-craft'));
});

test('record --stage tests --plan: an expert that joined because it always does is written into the plan', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-always-'));
  const plan = path.join(dir, 'PLAN-x.md');
  fs.writeFileSync(plan, '---\nplan_confirmed: true\nexperts: [security]\n---\nbody\n');
  const lane = { stage: 'tests', available: ex.list(PLUGIN).experts.map((e) => e.name), selected: ['security', 'quality'], ran: ['security', 'quality'], failed: [], added: ['quality'] };
  const r = ex.record(dir, 'tests', { ok: true, expertLane: lane }, { planFile: plan, pluginRoot: PLUGIN });
  assert.deepEqual(r.recorded, ['security', 'quality']);
  assert.deepEqual(ex.readExperts(fs.readFileSync(plan, 'utf8')).experts, ['security', 'quality']);
});

test('commands/tests.md records with --plan, so the always-joined expert reaches the plan', () => {
  assert.match(fs.readFileSync(path.join(PLUGIN, 'commands', 'tests.md'), 'utf8'), /record --stage tests --plan <plan file>/);
});

// ---- architect: aws-well-architected, chosen by file type or by AWS code in the added lines ----

const arch = (files) => names(ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf(files))));

test('selector: "files: ...; added: ..." matches when either part does, and a bad part is reported', () => {
  const s = ex.parseSelector('files: *.tf; added: AWS::');
  assert.equal(s.kind, 'any');
  assert.equal(ex.parseSelector('files: *.tf; added: [unclosed').error !== undefined, true);
  assert.equal(ex.parseSelector('files: /a/b.tf; added: x').error !== undefined, true);
});

test('selector: a glob with a directory matches the whole path, * stays in one segment, **/ spans any depth', () => {
  const m = (sel, f) => ex.matches(ex.parseSelector(sel), { files: [f], text: '' });
  assert.equal(m('files: .github/workflows/*.yml', '.github/workflows/ci.yml'), true);
  assert.equal(m('files: .github/workflows/*.yml', './.github/workflows/ci.yml'), true);
  assert.equal(m('files: .github/workflows/*.yml', '.github/workflows/sub/ci.yml'), false);
  assert.equal(m('files: .github/workflows/*.yml', 'docs/.github/workflows/ci.yml'), false);
  assert.equal(m('files: .github/workflows/*.yml', 'ci.yml'), false);
  assert.equal(m('files: **/templates/*.yaml', 'charts/api/templates/deploy.yaml'), true);
  assert.equal(m('files: **/templates/*.yaml', 'templates/deploy.yaml'), true);
  assert.equal(m('files: *.yml', 'deep/dir/ci.yml'), true, 'a base-name glob still matches at any depth');
});

test('architect review: Terraform, CloudFormation and SAM files select aws-well-architected', () => {
  for (const f of ['infra/main.tf', 'envs/prod.tfvars', 'template.yaml', 'serverless.yml']) assert.deepEqual(arch({ [f]: ['x = 1'] }), ['aws-well-architected'], f);
});

test('architect review: AWS code in the added lines selects it in any file; other code does not', () => {
  assert.deepEqual(arch({ 'stack/app.ts': ["import * as sqs from 'aws-cdk-lib/aws-sqs';"] }), ['aws-messaging', 'aws-well-architected']);
  assert.deepEqual(arch({ 'svc/store.py': ['import boto3'] }), ['aws-well-architected']);
  assert.deepEqual(arch({ 'cfn/queue.yml': ['  Type: AWS::SQS::Queue'] }), ['aws-messaging', 'aws-well-architected']);
  assert.deepEqual(arch({ 'svc/handler.py': ['def handle(event):', '    return 1'] }), []);
  assert.deepEqual(arch({ 'README.md': ['Deployed on AWS.'] }), []);
});

test('architect plan: aws-well-architected is offered with its headline; the developer offers are unchanged', () => {
  const k = ex.planSkills(PLUGIN);
  const offered = k.skills.architect.map((s) => s.name);
  for (const n of ['lambda-event-sources', 'step-functions', 'caching-and-latency', 'aws-well-architected']) assert.ok(offered.includes(n), n);
  assert.match(k.skills.architect.find((s) => s.name === 'aws-well-architected').headline, /AWS infrastructure/);
  assert.equal(k.skills.developer.length, 5);
  assert.ok(offered.includes('alarms-and-slos'));
});

// ---- architect: the serverless skills load only on their own constructs ---------------------

test('architect review: an SQS event source mapping selects lambda-event-sources first, then aws-well-architected', () => {
  const n = arch({ 'infra/queue.tf': ['resource "aws_lambda_event_source_mapping" "orders" {', '  batch_size = 10'] });
  assert.deepEqual(n, ['lambda-event-sources', 'aws-well-architected']);
});

test('architect review: a Terraform change with no queue or workflow does not pull in the serverless skills', () => {
  assert.deepEqual(arch({ 'infra/bucket.tf': ['resource "aws_s3_bucket" "logs" {'] }), ['aws-well-architected']);
});

test('architect review: a state machine file or a saga selects step-functions', () => {
  assert.ok(arch({ 'flows/order.asl.json': ['{"StartAt": "Charge"}'] }).includes('step-functions'));
  assert.ok(arch({ 'svc/saga.py': ['    def compensate_charge(self):'] }).includes('step-functions'));
  assert.ok(arch({ 'flows/def.json': ['  "ErrorEquals": ["States.ALL"]'] }).includes('step-functions'));
});

test('architect review: all three AWS skills together stay under the cap', () => {
  const sel = ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf({ 'a.tf': ['resource "aws_lambda_event_source_mapping" "x" {', 'resource "aws_sfn_state_machine" "y" {'] })));
  assert.deepEqual(names(sel), ['lambda-event-sources', 'step-functions', 'aws-well-architected']);
  assert.deepEqual(sel.dropped, []);
});

test('architect review: a cache or CDN change selects caching-and-latency; a plain handler does not', () => {
  assert.ok(arch({ 'svc/cache.py': ['import redis', 'r = redis.Redis()'] }).includes('caching-and-latency'));
  assert.ok(arch({ 'infra/cdn.tf': ['resource "aws_cloudfront_distribution" "site" {'] }).includes('caching-and-latency'));
  assert.ok(!arch({ 'svc/handler.py': ['def handle(event):', '    return {"statusCode": 200}'] }).includes('caching-and-latency'));
});

test('architect review: tenant ids and row-level security select multi-tenancy; ordinary code does not', () => {
  assert.ok(arch({ 'svc/orders.py': ['    rows = db.query(Order).filter_by(tenant_id=ctx.tenant_id)'] }).includes('multi-tenancy'));
  assert.ok(arch({ 'db/001.sql': ['ALTER TABLE orders ENABLE ROW LEVEL SECURITY;'] }).includes('multi-tenancy'));
  assert.ok(arch({ 'db/002.sql': ["CREATE POLICY p ON orders USING (tenant = current_setting('app.tenant'));"] }).includes('multi-tenancy'));
  assert.ok(!arch({ 'svc/orders.py': ['    rows = db.query(Order).all()'] }).includes('multi-tenancy'));
});

test('architect review: queues, topics and buses select aws-messaging; API Gateway selects api-gateway', () => {
  assert.ok(arch({ 'infra/q.tf': ['resource "aws_sqs_queue" "orders" {'] }).includes('aws-messaging'));
  assert.ok(arch({ 'svc/pub.ts': ['await sns.send(new PublishCommand({ TopicArn, Message }));'] }).includes('aws-messaging'));
  assert.ok(arch({ 'infra/api.tf': ['resource "aws_apigatewayv2_api" "http" {'] }).includes('api-gateway'));
  assert.ok(!arch({ 'infra/bucket.tf': ['resource "aws_s3_bucket" "logs" {'] }).includes('aws-messaging'));
  assert.ok(!arch({ 'infra/bucket.tf': ['resource "aws_s3_bucket" "logs" {'] }).includes('api-gateway'));
});

test('architect review: a change touching many AWS areas reports what the cap leaves out instead of growing past it', () => {
  const sel = ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf({ 'a.tf': [
    'resource "aws_lambda_event_source_mapping" "x" {', 'resource "aws_sqs_queue" "q" {', 'resource "aws_sfn_state_machine" "y" {',
    'resource "aws_apigatewayv2_api" "z" {', 'tenant_id = var.t', 'resource "aws_elasticache_cluster" "c" {'] })));
  const total = sel.skills.reduce((n, s) => n + Buffer.byteLength(s.text), 0);
  assert.ok(total <= ex.SKILLS_BYTES);
  assert.equal(sel.skills[0].name, 'lambda-event-sources', 'the most specific first');
  assert.ok(sel.dropped.length > 0, 'something is left out and named');
});

// ---- devops: skills by file type and construct; the build brief only for infrastructure work ----

const dev = (files) => names(ex.selectSkills(PLUGIN, 'devops', 'review', ex.parseDiff(diffOf(files))));

test('devops review: each skill is selected by its own files or constructs', () => {
  assert.deepEqual(dev({ 'infra/db.tf': ['resource "aws_db_instance" "main" {'] }), ['terraform-change-safety']);
  assert.deepEqual(dev({ 'template.yaml': ['  Type: AWS::Serverless::Function'] }), ['cloudformation-and-cdk']);
  assert.deepEqual(dev({ 'lib/app-stack.ts': ["import * as s3 from 'aws-cdk-lib/aws-s3';"] }), ['cloudformation-and-cdk']);
  assert.deepEqual(dev({ 'k8s/api.yaml': ['kind: Deployment', '        readinessProbe:'] }), ['kubernetes-manifests']);
  assert.deepEqual(dev({ 'charts/api/values.yaml': ['replicaCount: 2'] }), ['kubernetes-manifests']);
  assert.deepEqual(dev({ '.github/workflows/deploy.yml': ['    runs-on: ubuntu-latest'] }), ['pipelines-and-deploys']);
  assert.deepEqual(dev({ 'svc/flags.ts': ["import { OpenFeature } from '@openfeature/server-sdk';"] }), ['release-safety']);
  assert.deepEqual(dev({ 'Dockerfile': ['CMD node server.js'] }), ['containers']);
  assert.deepEqual(dev({ 'deploy/docker-compose.prod.yml': ['services:'] }), ['containers']);
});

test('devops review: near misses select nothing', () => {
  assert.deepEqual(dev({ 'svc/handler.py': ['def handle(event):', '    return 1'] }), [], 'plain application code');
  assert.deepEqual(dev({ 'config/app.yaml': ['timeout: 30', 'enabled: true'] }), [], 'a plain YAML config');
  assert.deepEqual(dev({ 'docs/ci.yml': ['runs-on: ubuntu-latest'] }), [], 'a workflow-looking file outside .github/workflows');
  assert.deepEqual(dev({ 'svc/store.py': ["table = boto3.resource('dynamodb').Table('orders')"] }), [], 'an AWS SDK call is the architect\'s, not a stack');
  assert.deepEqual(dev({ 'svc/log.ts': ['if (logger.isEnabled("debug")) {'] }), [], 'a boolean named enabled is not a feature flag');
  assert.deepEqual(dev({ 'db/q.sql': ['SELECT id FROM orders'] }), [], 'SQL FROM is not a Dockerfile');
});

test('devops review: every skill selected at once fits under the cap, most specific first', () => {
  const sel = ex.selectSkills(PLUGIN, 'devops', 'review', ex.parseDiff(diffOf({
    'main.tf': ['x = 1'], 'template.yaml': ['x: 1'], 'values.yaml': ['x: 1'], '.github/workflows/d.yml': ['x: 1'],
    'Dockerfile': ['FROM node:22'], 'svc/f.ts': ['LaunchDarkly'] })));
  assert.deepEqual(names(sel), ['terraform-change-safety', 'cloudformation-and-cdk', 'kubernetes-manifests', 'pipelines-and-deploys', 'release-safety', 'containers']);
  assert.deepEqual(sel.dropped, []);
  assert.ok(sel.skills.reduce((n, s) => n + Buffer.byteLength(s.text), 0) <= ex.SKILLS_BYTES);
});

test('devops build: the brief joins only when the plan names infrastructure; the developer brief is always there', () => {
  const app = ex.briefs(PLUGIN, { planText: 'Add a retry to `svc/client.go`.' });
  assert.ok(!app.briefs.some((b) => b.name === 'devops'), 'an application-only plan does not pay for the DevOps brief');
  assert.ok(app.skipped.includes('devops'));
  assert.ok(app.briefs.some((b) => b.name === 'developer'));
  const infra = ex.briefs(PLUGIN, { planText: 'Rename the queue in `infra/queue.tf` and add a deploy job in `.github/workflows/deploy.yml`.' });
  const d = infra.briefs.find((b) => b.name === 'devops');
  assert.ok(d, 'an infrastructure plan gets the DevOps brief');
  assert.deepEqual(d.skills.map((s) => s.name), ['terraform-change-safety', 'pipelines-and-deploys']);
  assert.ok(!d.text.includes('experts/skills/') && Buffer.byteLength(d.text) < ex.BRIEF_BYTES);
  assert.ok(infra.briefs.some((b) => b.name === 'developer'), 'the developer brief stays for mixed and CDK changes');
  const prose = ex.briefs(PLUGIN, { planText: 'Move the service into a Docker container image and ship it with GitHub Actions.' });
  assert.ok(prose.briefs.some((b) => b.name === 'devops'), 'a plan that describes the change without file names still selects it');
  assert.ok(!ex.briefs(PLUGIN).briefs.some((b) => b.name === 'devops'), 'with no plan there is nothing to select from');
});

test('devops review: a deleted or renamed infrastructure file still selects its skill', () => {
  const del = 'diff --git a/infra/db.tf b/infra/db.tf\ndeleted file mode 100644\n--- a/infra/db.tf\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-resource "aws_db_instance" "main" {\n-}\n';
  const ren = 'diff --git a/infra/old.tf b/infra/new.tf\nsimilarity index 100%\nrename from infra/old.tf\nrename to infra/new.tf\n';
  for (const d of [del, ren]) assert.deepEqual(names(ex.selectSkills(PLUGIN, 'devops', 'review', ex.parseDiff(d))), ['terraform-change-safety']);
});

test('devops build: the plan template and the repository plans for non-infrastructure work do not pull in the brief', () => {
  const template = fs.readFileSync(path.join(PLUGIN, 'skills', 'the-ultimate-workflow-guidelines', 'references', 'plan-template.md'), 'utf8');
  const appPlan = [
    '---', 'plan_confirmed: true', 'experts: [developer]', '---', '# Plan: retry the billing client',
    '## Files', '- `svc/billing/client.py`: add a bounded retry on 503.', '- `tests/test_client.py`: cases for 503 then 200, and 503 four times.',
    '## Verification', 'Run the unit tests; CI runs the same suite on every push. Deploy as usual after merge; rollback is the previous release.',
  ].join('\n');
  for (const [name, planText] of [['plan template', template], ['an application plan', appPlan]]) {
    assert.ok(ex.briefs(PLUGIN, { planText }).skipped.includes('devops'), name);
  }
});

// ---- softarch: contract compatibility and boundary tools ----

const sa = (files) => names(ex.selectSkills(PLUGIN, 'softarch', 'review', ex.parseDiff(diffOf(files))));

test('softarch review: each skill is selected by its own files or constructs', () => {
  assert.deepEqual(sa({ 'api/v1/orders.proto': ['  string id = 1;'] }), ['protobuf-compat']);
  assert.deepEqual(sa({ 'buf.yaml': ['breaking:'] }), ['protobuf-compat']);
  assert.deepEqual(sa({ 'api/openapi.yaml': ['      required: [id]'] }), ['schema-evolution']);
  assert.deepEqual(sa({ 'schema/app.graphql': ['type Order {'] }), ['schema-evolution']);
  assert.deepEqual(sa({ 'spec/api.yml': ['openapi: 3.1.0'] }), ['schema-evolution'], 'an OpenAPI file under another name, by its first line');
  assert.deepEqual(sa({ 'src/server.ts': ['const typeDefs = `type Query {'] }), ['schema-evolution'], 'a GraphQL schema in code');
  assert.deepEqual(sa({ '.importlinter': ['[importlinter:contract:layers]'] }), ['module-boundaries']);
  assert.deepEqual(sa({ 'libs/a/project.json': ['  "tags": ["scope:shared"]'] }), ['module-boundaries']);
  assert.deepEqual(sa({ 'pkg/a/main.go': ['import "example.com/app/internal/store"'] }), ['module-boundaries']);
  assert.deepEqual(sa({ 'src/main/java/module-info.java': ['    exports com.example.impl;'] }), ['module-boundaries']);
});

test('softarch review: near misses select nothing', () => {
  assert.deepEqual(sa({ 'src/types.ts': ['type Query = { id: string };'] }), [], 'a TypeScript type named Query');
  assert.deepEqual(sa({ 'package.json': ['  "version": "1.2.4",', '  "lodash": "^4.17.21"'] }), [], 'a dependency bump');
  assert.deepEqual(sa({ 'renovate.json': ['  "$schema": "https://docs.renovatebot.com/renovate-schema.json"'] }), [], 'a config file with a $schema');
  assert.deepEqual(sa({ 'svc/handler.py': ['def handle(event):', '    return 1'] }), [], 'plain application code');
});

test('softarch review: event schemas and the round-2 boundary keys select their skill', () => {
  assert.deepEqual(sa({ 'schemas/order.avsc': ['{"type": "record", "name": "Order"}'] }), ['event-schema-evolution']);
  assert.deepEqual(sa({ 'asyncapi.yaml': ['asyncapi: 3.0.0'] }), ['event-schema-evolution'], 'AsyncAPI moved from schema-evolution');
  assert.deepEqual(sa({ 'infra/registry.tf': ['  compatibility = "BACKWARD_TRANSITIVE"'] }), ['event-schema-evolution']);
  assert.deepEqual(sa({ 'pkg/x/hack.go': ['//go:linkname now runtime.nanotime'] }), ['module-boundaries']);
  assert.deepEqual(sa({ 'archunit.properties': ['freeze.refreeze=true'] }), ['module-boundaries']);
});

test('softarch review: all four skills at once fit under the cap', () => {
  const sel = ex.selectSkills(PLUGIN, 'softarch', 'review', ex.parseDiff(diffOf({ 'a.proto': ['x'], 'openapi.yaml': ['x'], 'e.avsc': ['x'], 'tsconfig.json': ['x'] })));
  assert.deepEqual(names(sel), ['protobuf-compat', 'schema-evolution', 'event-schema-evolution', 'module-boundaries']);
  assert.ok(sel.skills.reduce((n, s) => n + Buffer.byteLength(s.text), 0) <= ex.SKILLS_BYTES);
});

// ---- quality: tests, gates and evals ----

const qa = (files) => names(ex.selectSkills(PLUGIN, 'quality', 'review', ex.parseDiff(diffOf(files))));

test('quality review: test files select test-craft, runner configs and workflow test settings select test-gates', () => {
  assert.deepEqual(qa({ 'src/orders.test.ts': ['expect(total).toBe(231.25);'] }), ['test-craft']);
  assert.deepEqual(qa({ 'jest.config.js': ['  testMatch: ["**/*.spec.ts"],'] }), ['test-gates']);
  assert.deepEqual(qa({ '.github/workflows/ci.yml': ['      - run: pytest | tee out.txt'] }), ['test-gates']);
  assert.deepEqual(qa({ 'package.json': ['    "test": "jest --passWithNoTests"'] }), ['test-gates'], 'a zero-tests flag in a script');
  assert.deepEqual(qa({ 'evals/judge.py': ['JUDGE_PROMPT = "Compare A and B"'] }), ['test-craft', 'eval-integrity']);
});

test('quality review: near misses select nothing', () => {
  assert.deepEqual(qa({ 'src/handler.py': ['def handle(event):', '    return 1'] }), [], 'production code with no test words');
  assert.deepEqual(qa({ 'README.md': ['Run the tests with npm test.'] }), [], 'prose about tests');
});

test('quality review: all three skills at once fit under the cap', () => {
  const sel = ex.selectSkills(PLUGIN, 'quality', 'review', ex.parseDiff(diffOf({ 'a.test.js': ['x'], 'jest.config.js': ['x'], 'evals/j.py': ['judge'] })));
  assert.deepEqual(names(sel), ['test-craft', 'test-gates', 'eval-integrity']);
  assert.ok(sel.skills.reduce((n, s) => n + Buffer.byteLength(s.text), 0) <= ex.SKILLS_BYTES);
});

// ---- security: CI workflows ----

const se = (files) => names(ex.selectSkills(PLUGIN, 'security', 'review', ex.parseDiff(diffOf(files))));

test('security review: workflows, composite actions and the actions lockfile select ci-workflow-security', () => {
  assert.deepEqual(se({ '.github/workflows/ci.yml': ['on: pull_request_target'] }), ['ci-workflow-security']);
  assert.deepEqual(se({ '.github/workflows/release.yaml': ['permissions: write-all'] }), ['ci-workflow-security']);
  assert.deepEqual(se({ '.github/actions/setup/action.yml': ['    - run: echo "${{ inputs.ref }}"'] }), ['ci-workflow-security']);
  assert.deepEqual(se({ '.github/workflows/actions.lock': ['actions/checkout: 0123abcd'] }), ['ci-workflow-security']);
});

test('security review: near misses select nothing', () => {
  assert.deepEqual(se({ 'src/auth.py': ['token = request.headers["Authorization"]'] }), [], 'source code is the review reference, not this skill');
  assert.deepEqual(se({ 'docs/ci.md': ['We use pull_request_target for labels.'] }), [], 'prose about CI');
  assert.deepEqual(se({ '.gitlab-ci.yml': ['script: make test'] }), [], 'GitLab is not covered by this skill');
});

test('architect review: an origin request policy or a function association alone selects caching-and-latency', () => {
  const ar = (files) => names(ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf(files))));
  assert.ok(ar({ 'infra/cdn.tf': ['  origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id'] }).includes('caching-and-latency'));
  assert.ok(ar({ 'template.yaml': ['        FunctionAssociations:'] }).includes('caching-and-latency'));
});

test('architect review: endpoint type, stage cache and WebSocket settings alone select api-gateway', () => {
  const ar = (files) => names(ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf(files))));
  assert.ok(ar({ 'template.yaml': ['      EndpointConfiguration:', '        Types: [EDGE]'] }).includes('api-gateway'));
  assert.ok(ar({ 'infra/ws.tf': ['  protocol_type = "WEBSOCKET"'] }).includes('api-gateway'));
  assert.ok(ar({ 'template.yaml': ['      CacheClusterEnabled: true'] }).includes('api-gateway'));
});

test('architect review: tenant session settings, BYPASSRLS and session tags alone select multi-tenancy', () => {
  const ar = (files) => names(ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf(files))));
  assert.ok(ar({ 'db/pool.ts': ["  await client.query(\"select set_config('app.org', $1, false)\", [org]);"] }).includes('multi-tenancy'));
  assert.ok(ar({ 'db/roles.sql': ['ALTER ROLE app_user BYPASSRLS;'] }).includes('multi-tenancy'));
  assert.ok(ar({ 'iam/trust.json': ['        "sts:TagSession"'] }).includes('multi-tenancy'));
});

test('architect review: Temporal workflow code selects step-functions', () => {
  const ar = (files) => names(ex.selectSkills(PLUGIN, 'architect', 'review', ex.parseDiff(diffOf(files))));
  assert.ok(ar({ 'worker/workflows.py': ['from temporalio import workflow'] }).includes('step-functions'));
  assert.ok(ar({ 'src/workflows.ts': ["import { proxyActivities } from '@temporalio/workflow';"] }).includes('step-functions'));
  assert.ok(ar({ 'worker/main.go': ['\t"go.temporal.io/sdk/workflow"'] }).includes('step-functions'));
});

test('the skills cap is 40 KB by default and raised for frontend only', () => {
  assert.equal(ex.skillsCap('developer'), ex.SKILLS_BYTES);
  assert.equal(ex.skillsCap('architect'), 40 * 1024);
  assert.equal(ex.skillsCap('frontend'), 56 * 1024);
});

// ---- frontend --------------------------------------------------------------------------

const fe = (files) => ex.selectSkills(PLUGIN, 'frontend', 'review', ex.parseDiff(diffOf(files)));

test('frontend review: a change that matches every review skill fits the 56 KB cap, with nothing dropped', () => {
  // The cap was raised to 56 KB on the condition that all six fit together; if this fails, trim the skills.
  const sel = fe({
    'web/src/Composer.tsx': ['export const Composer = () => <button onClick={send}><SendIcon /></button>'],
    'web/src/composer.css': [
      '.bar { position: fixed; bottom: 0; height: 100vh; margin-left: 8px; transition: opacity 200ms; }',
      '.bar:hover { outline: none; }',
    ],
  });
  assert.deepEqual(names(sel), ['semantics-and-aria', 'visual-accessibility', 'ui-on-real-data', 'responsive-and-devices', 'rtl-and-direction', 'motion']);
  assert.deepEqual(sel.dropped, []);
  const bytes = sel.skills.reduce((n, s) => n + Buffer.byteLength(s.text), 0);
  assert.ok(bytes <= 56 * 1024, `${bytes} bytes`);
});

test('frontend review: a Go or Python change with words like "shortly", "transition" or "fixed" selects no frontend skill', () => {
  assert.deepEqual(names(fe({ 'svc/state.go': ['// the order will transition shortly; fixed in the next release', 'func (o *Order) Transition(to State) error {'] })), []);
  assert.deepEqual(names(fe({ 'svc/flow.py': ['# fixed: startle the worker shortly after the transition', 'def left_pad(s): return s', "token = os.getenv('TOKEN')"] })), []);
});

test('frontend review: a stylesheet with only physical sides selects rtl-and-direction; a logical one does not', () => {
  assert.ok(names(fe({ 'web/a.scss': ['.x { padding-right: 4px; }'] })).includes('rtl-and-direction'));
  assert.ok(!names(fe({ 'web/a.scss': ['.x { padding-inline-end: 4px; }'] })).includes('rtl-and-direction'));
});

test('frontend review: keyframes or a motion library select motion; a plain component does not', () => {
  assert.ok(names(fe({ 'web/a.css': ['@keyframes fade { from { opacity: 0 } }'] })).includes('motion'));
  assert.ok(names(fe({ 'web/A.tsx': ["import { AnimatePresence } from 'motion/react';"] })).includes('motion'));
  assert.ok(!names(fe({ 'web/A.tsx': ['export const A = () => <p>{name}</p>'] })).includes('motion'));
});

test('frontend: the taste skills are offered at plan and never selected at review or tests', () => {
  const offered = (ex.planSkills(PLUGIN).skills.frontend || []).map((s) => s.name);
  for (const s of ['motion-craft', 'interface-design', 'semantics-and-aria', 'rtl-and-direction']) assert.ok(offered.includes(s), s);
  const text = fs.readFileSync(path.join(PLUGIN, 'experts', 'frontend', 'skills.md'), 'utf8');
  const after = text.slice(text.indexOf('## tests'));
  for (const s of ['motion-craft', 'interface-design']) assert.ok(!after.includes(`- ${s}`), s);
  assert.ok(!/^## build/m.test(text), 'no build section, by decision');
});

test('frontend tests: a plan naming a component gets worst-case-data; an RTL plan also gets rtl-and-direction', () => {
  const k = ex.testsSkills(PLUGIN, 'Add a member list in `web/src/Members.tsx` for Hebrew (RTL) users.');
  const n = (k.skills.frontend ? k.skills.frontend.skills : []).map((s) => s.name);
  assert.ok(n.includes('worst-case-data') && n.includes('rtl-and-direction'), n.join(','));
  const t = ex.testsSkills(PLUGIN, 'This change touches `web/src/Members.tsx` only.').skills.frontend.skills.map((s) => s.name);
  assert.deepEqual(t, ['worst-case-data'], 'the word "touches" does not pull in the device skill');
  const g = ex.testsSkills(PLUGIN, 'Add a refund endpoint in `api/refund.go`.');
  assert.equal(g.skills.frontend, undefined);
});

// ---- genai -----------------------------------------------------------------------------

const gen = (files) => names(ex.selectSkills(PLUGIN, 'genai', 'review', ex.parseDiff(diffOf(files))));

test('genai review: each skill is chosen by its own code, and all four together fit the cap', () => {
  assert.deepEqual(gen({ 'agent/loop.py': ['from anthropic import Anthropic', 'resp = client.messages.create(model=m, max_tokens=1024, messages=msgs)'] }), ['model-calls']);
  assert.deepEqual(gen({ 'agent/loop.ts': ["  tool_choice: { type: 'auto' },", '  if (block.type === "tool_use") {'] }), ['agent-loops-and-tools']);
  assert.deepEqual(gen({ 'rag/index.py': ['vectors = embeddings.embed_documents(chunks)'] }), ['rag-retrieval']);
  assert.deepEqual(gen({ 'svc/ask.py': ["rt = boto3.client('bedrock-runtime')", 'rt.converse(modelId=mid, messages=m)'] }), ['bedrock-and-agentcore']);
  const all = ex.selectSkills(PLUGIN, 'genai', 'review', ex.parseDiff(diffOf({
    'agent/run.py': ['from anthropic import Anthropic', 'if block.type == "tool_use":', 'q = embed_query(text)', "rt = boto3.client('bedrock-runtime')"],
  })));
  assert.deepEqual(names(all), ['agent-loops-and-tools', 'model-calls', 'bedrock-and-agentcore', 'rag-retrieval']);
  assert.deepEqual(all.dropped, []);
});

test('genai review: ordinary application code, and a link to the vendor docs, select no genai skill', () => {
  assert.deepEqual(gen({ 'svc/orders.go': ['func (s *Server) Tools() []string { return s.tools }', '// see https://docs.anthropic.com for the API'] }), []);
  assert.deepEqual(gen({ 'README.md': ['Read more at docs.anthropic.com and in the Bedrock console.'] }), []);
});

// ---- observability and web performance (2026-10-22) -------------------------------------

test('architect review: alarm definitions select alarms-and-slos; a queue with no alarm does not', () => {
  assert.ok(arch({ 'infra/alarms.tf': ['resource "aws_cloudwatch_metric_alarm" "p99" {', '  treat_missing_data = "notBreaching"'] }).includes('alarms-and-slos'));
  assert.ok(arch({ 'ops/api.rules.yml': ['- alert: HighErrorRate'] }).includes('alarms-and-slos'));
  assert.ok(!arch({ 'infra/q.tf': ['resource "aws_sqs_queue" "jobs" {'] }).includes('alarms-and-slos'));
});

test('developer review: telemetry setup selects telemetry-in-code; ordinary logging calls and Counter do not', () => {
  assert.ok(names(review({ 'svc/app.py': ['logger = logging.getLogger(__name__)'] })).includes('telemetry-in-code'));
  assert.ok(names(review({ 'svc/trace.ts': ["import { trace } from '@opentelemetry/api';"] })).includes('telemetry-in-code'));
  const plain = names(review({ 'svc/count.py': ['from collections import Counter', 'seen = Counter(words)', 'logger.info("done")'] }));
  assert.ok(!plain.includes('telemetry-in-code'), plain.join(','));
});

test('developer review: a lazy main image selects web-performance; a backend file does not', () => {
  assert.ok(names(review({ 'app/page.tsx': ['<img src={hero} loading="lazy" />'] })).includes('web-performance'));
  assert.ok(!names(review({ 'svc/orders.go': ['func handle() {}'] })).includes('web-performance'));
});

test('developer review: on a React diff with a catch, web-performance is the skill left out at the cap, and says so', () => {
  // Pinned so a change to the cap or the skills is a decision, not a drift. Raising the developer
  // cap, as was done for frontend, is the maintainer's call.
  const sel = review({ 'app/page.tsx': ['try { load() } catch (e) { throw e }', '<img src={hero} loading="lazy" />'] });
  assert.deepEqual(sel.dropped, ['web-performance']);
  assert.ok(names(sel).includes('react-craft') && names(sel).includes('failure-handling'));
});

// ---- privacy (2026-10-22) -----------------------------------------------------------

const sec = (files) => names(ex.selectSkills(PLUGIN, 'security', 'review', ex.parseDiff(diffOf(files))));
const dat = (files) => names(ex.selectSkills(PLUGIN, 'data', 'review', ex.parseDiff(diffOf(files))));

test('security review: a personal value reaching a sink selects personal-data-exposure; plain logging does not', () => {
  assert.ok(sec({ 'api/signup.ts': ['analytics.identify(user.email, { plan })'] }).includes('personal-data-exposure'));
  assert.ok(sec({ 'api/log.py': ['logger.info("signup", req.body)'] }).includes('personal-data-exposure'));
  assert.ok(sec({ 'web/sentry.ts': ['Sentry.init({ dsn, sendDefaultPii: true })'] }).includes('personal-data-exposure'));
  assert.deepEqual(sec({ 'svc/jobs.py': ['logger.info("job finished in %s", elapsed)'] }), []);
});

test('data review: soft deletes, lifecycle rules and a new personal column select erasure-and-retention; a plain column does not', () => {
  assert.ok(dat({ 'db/migrate/1.sql': ['ALTER TABLE users ADD COLUMN deleted_at timestamptz;'] }).includes('erasure-and-retention'));
  assert.ok(dat({ 'infra/bucket.tf': ['    noncurrent_version_expiration {'] }).includes('erasure-and-retention'));
  assert.ok(dat({ 'db/migrate/2.sql': ['ALTER TABLE users ADD COLUMN phone text;'] }).includes('erasure-and-retention'));
  assert.deepEqual(dat({ 'db/migrate/3.sql': ['ALTER TABLE orders ADD COLUMN total_cents integer;'] }), []);
});
