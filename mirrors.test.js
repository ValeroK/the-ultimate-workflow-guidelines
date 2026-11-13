'use strict';

// The mirror check.
//
// Two hosts read the same guidance through different mechanisms, so some files
// are hand-copies. The README already carried a note listing the one deliberate
// divergence -- and an UNDOCUMENTED one crept in anyway, a closing line that
// drifted out of SKILL.md unnoticed for weeks.
//
// That is the whole argument for this file: a documented divergence list
// without a check is a comment, not a control. Every exception below is a
// literal with a reason attached, so an entry nobody can justify stands out.
//
// There is no exception table at the moment, deliberately. One existed holding
// zero exceptions, and its only test asserted a string literal in this file
// against itself -- machinery for a case that had not arisen. Reintroduce it
// when a real divergence needs recording, not before.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const root = __dirname;
// Shippable plugin payload. Lives under .cursor-plugin/ so Cursor's
// marketplace sparse-checkout (which only keeps /.cursor-plugin/ and
// /.claude-plugin/) actually materializes rules/agents/skills/commands.
const PLUGIN = path.join('.cursor-plugin', 'ultimate-workflow');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const lines = (p) => read(p).split(/\r?\n/).length;
const pread = (p) => read(path.join(PLUGIN, p));
const plines = (p) => pread(p).split(/\r?\n/).length;
const pjoin = (...parts) => path.join(PLUGIN, ...parts);

/** Resolve a backtick path from an always-on index: plugin-relative or repo-root. */
function resolveIndexRef(ref, fromPluginRule) {
  if (fromPluginRule) return pjoin(ref);
  // Repo AGENTS.md may use the plugin prefix or a short path (legacy).
  if (ref.startsWith('.cursor-plugin/') || ref.startsWith('research/') || ref.startsWith('PRD-')) {
    return path.join(root, ref);
  }
  if (fs.existsSync(path.join(root, ref))) return path.join(root, ref);
  return pjoin(ref);
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{2,3} /.test(l))
    .map((l) => l.trim());
}

// --- the always-on pair ----------------------------------------------------
// AGENTS.md and the alwaysApply rule are the two files loaded on every turn,
// one per host. They should carry the same shape, because they answer the same
// question: what does this agent need before it knows what it is doing?
//
// AGENTS.md rather than CLAUDE.md: Cursor reads AGENTS.md natively and Claude
// Code reads only CLAUDE.md, which is now a bare `@AGENTS.md` import. One
// source of truth, two hosts, no hand-copied body.

test('the two always-on indexes cover the same sections', () => {
  const claude = headings(read('AGENTS.md'));
  const cursor = headings(pread('rules/the-ultimate-workflow-guidelines.mdc'));

  const core = ['## Principles', '## Workflow', '## When to skip', '## Where things live', '## Hard constraints', '## Gotchas'];
  for (const h of core) {
    assert.ok(claude.includes(h), `CLAUDE.md is missing ${h}`);
    assert.ok(cursor.includes(h), `the Cursor rule is missing ${h}`);
  }
});

test('both always-on files state the same hard constraints', () => {
  for (const f of ['AGENTS.md', path.join(PLUGIN, 'rules/the-ultimate-workflow-guidelines.mdc')]) {
    const t = read(f);
    assert.match(t, /no `package.json`/i, `${f} lost the dependency constraint`);
    assert.match(t, /no emojis in code/i, `${f} lost the emoji constraint`);
    assert.match(t, /node --test/, `${f} lost the verify command`);
  }
});

// --- the ratchet -----------------------------------------------------------
// Always-on context is paid for every turn whether relevant or not. It does not
// stay thin on its own; something has to push back. See memory/context-boundary.md.

test('CLAUDE.md stays a thin index', () => {
  const n = lines('CLAUDE.md');
  assert.ok(n <= 70, `CLAUDE.md is ${n} lines; the cap is 70. Move content to a memory/ topical instead of raising this.`);
});

test('the Cursor always-on rule stays thin', () => {
  const n = plines('rules/the-ultimate-workflow-guidelines.mdc');
  assert.ok(n <= 90, `the Cursor rule is ${n} lines; the cap is 90.`);
});

// --- the duplicated template ----------------------------------------------

test('the two memory-template copies are byte-identical', () => {
  const a = pread('skills/project-bootstrap-guidelines/references/memory-template.md');
  const b = pread('skills/the-ultimate-workflow-guidelines/references/memory-template.md');
  assert.equal(
    a,
    b,
    'The two memory-template.md copies have drifted. Do NOT fix this by deleting one: release-skills.yml zips each skill directory independently, so a cross-skill path breaks a single-skill install. See memory/mirrors.md.'
  );
});

// --- routing integrity -----------------------------------------------------
// A thin index is only useful if its pointers resolve. A dead pointer in
// always-on context is worse than no pointer: it costs tokens every turn and
// sends the reader nowhere.

test('every file the always-on indexes point at actually exists', () => {
  const indexes = [
    { file: 'AGENTS.md', fromPlugin: false },
    { file: path.join(PLUGIN, 'rules/the-ultimate-workflow-guidelines.mdc'), fromPlugin: true },
  ];
  for (const { file, fromPlugin } of indexes) {
    const text = read(file);
    const refs = [
      ...text.matchAll(
        /`((?:\.cursor-plugin\/ultimate-workflow\/)?(?:memory|skills|research|hooks|phases|agents)\/[^`]+?\.(?:md|js)|PRD-[^`]+?\.md)`/g
      ),
    ]
      .map((m) => m[1])
      .filter((r) => !r.includes('*'));
    assert.ok(refs.length > 0, `${file} points at nothing, which defeats an index`);
    for (const r of refs) {
      let target;
      if (r.startsWith('.cursor-plugin/') || r.startsWith('research/') || r.startsWith('PRD-')) {
        target = path.join(root, r);
      } else {
        target = resolveIndexRef(r, fromPlugin);
      }
      assert.ok(fs.existsSync(target), `${file} points at ${r}, which does not exist (tried ${target})`);
    }
  }
});

const MARK_START = '<!-- uw:memory-index:start';
const MARK_END = '<!-- uw:memory-index:end -->';

test('memory check passes on this repo, migrated (headers and markers present)', () => {
  const r = spawnSync(
    process.execPath,
    [pjoin('experts', 'experts.js'), 'memory', 'check', '--root', PLUGIN],
    { cwd: root, encoding: 'utf8' }
  );
  assert.equal(r.status, 0, `memory check failed:\n${r.stdout}\n${r.stderr}`);
  // An un-migrated memory also exits 0, with warnings; this repo must be past that.
  assert.doesNotMatch(r.stdout + r.stderr, /not migrated/, 'memory check still warns "not migrated"');
});

test('every topical in memory/ has a header, and memory.md lists it between the markers', () => {
  const idx = pread('memory.md');
  const s = idx.indexOf(MARK_START);
  const e = idx.indexOf(MARK_END);
  assert.ok(s >= 0 && e > s, 'memory.md has no index markers');
  const block = idx.slice(s, e);
  for (const t of topicals()) {
    const text = pread(path.join('memory', `${t}.md`)).replace(/^﻿/, '');
    assert.match(text, /^---\r?\n[\s\S]*?\r?\n---/, `memory/${t}.md has no header`);
    assert.ok(block.includes(`](memory/${t}.md)`), `memory.md does not list memory/${t}.md between the markers`);
  }
});

test('the research entry stays outside the markers', () => {
  const idx = pread('memory.md');
  const at = idx.indexOf('research/new-sdlc-with-vibe-coding.md');
  assert.ok(at >= 0, 'the research entry is gone from memory.md');
  const s = idx.indexOf(MARK_START);
  const e = idx.indexOf(MARK_END);
  assert.ok(s >= 0 && e > s, 'memory.md has no index markers');
  assert.ok(at < s || at > e, 'the research entry is inside the generated block, where the next index run deletes it');
});

test('both memory-template copies show the header and the markers', () => {
  for (const p of [
    'skills/project-bootstrap-guidelines/references/memory-template.md',
    'skills/the-ultimate-workflow-guidelines/references/memory-template.md',
  ]) {
    const t = pread(p);
    assert.match(t, /read_when/, `${p} does not show the topical header`);
    assert.ok(t.includes(MARK_START) && t.includes(MARK_END), `${p} does not show the index markers`);
  }
});

test('the seeded memory.md has empty markers and passes the bootstrap handoff check', () => {
  const t = pread('skills/project-bootstrap-guidelines/references/memory-template.md');
  const seed = /```markdown\r?\n([\s\S]*?)```/.exec(t);
  assert.ok(seed, 'the template has no memory.md block');
  const s = seed[1].indexOf(MARK_START);
  const e = seed[1].indexOf(MARK_END);
  assert.ok(s >= 0 && e > s, 'the seed memory.md has no markers');
  const between = seed[1].slice(seed[1].indexOf('-->', s) + 3, e);
  assert.equal(between.trim(), '', 'the seeded markers are not empty');

  const { handoffComplete } = require(path.join(PAYLOAD, 'hooks', 'lib', 'state.js'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uw-seed-'));
  try {
    const w = (f, c) => fs.writeFileSync(path.join(dir, f), c);
    w('PRD.md', '---\ndesign_confirmed: true\nscaffold_verify: green\n---\n# PRD\n');
    w('AGENTS.md', '# A\n\n## Key files\n\n## Gotchas\n');
    w('CLAUDE.md', '@AGENTS.md\n');
    w('ROADMAP.md', '# R\n\n## M1\n');
    w('progress.md', '# P\n\n## 2026-01-01\n');
    w('memory.md', seed[1]);
    assert.equal(handoffComplete(dir), true, 'the seeded memory.md breaks the handoff predicate');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the memory guide names the header, the markers rule, the first-harvest migration and the conflict resolution', () => {
  const g = pread('skills/the-ultimate-workflow-guidelines/references/memory-protocol.md');
  assert.match(g, /read_when/, 'the guide never shows the header');
  assert.match(g, /between the markers/i, 'the guide never says not to edit between the markers');
  assert.match(g, /migrat/i, 'the guide never says how a project is migrated');
  assert.match(g, /first harvest/i, 'the guide never ties the migration to the first harvest');
  assert.match(g, /conflict/i, 'the guide never gives the conflict resolution');
  assert.match(g, /memory index/, 'the guide never names the command that resolves it');
});

test('the run guide tells plan authors to name a card\'s documents in its own section', () => {
  const r = pread('phases/run.md');
  assert.match(r, /documents? (?:a|the) card (?:must|needs to) read[^.]*own section|own section[^.]*documents?/i);
});

test('the bootstrap skill and its rule mirror both describe the generated index', () => {
  for (const p of ['skills/project-bootstrap-guidelines/SKILL.md', 'rules/project-bootstrap-guidelines.mdc']) {
    assert.ok(pread(p).includes('uw:memory-index'), `${p} does not mention the index markers`);
  }
  const skill = pread('skills/the-ultimate-workflow-guidelines/SKILL.md');
  assert.match(skill, /memory index/, 'the workflow skill never says the index is generated');
});

test('plugin manifests and the CHANGELOG say 4.8.0', () => {
  const versions = [
    JSON.parse(pread('.claude-plugin/plugin.json')).version,
    JSON.parse(pread('.cursor-plugin/plugin.json')).version,
    JSON.parse(read('.claude-plugin/marketplace.json')).metadata.version,
    JSON.parse(read('.claude-plugin/marketplace.json')).plugins[0].version,
    JSON.parse(read('.cursor-plugin/marketplace.json')).plugins[0].version,
  ];
  assert.deepEqual(versions, ['4.8.0', '4.8.0', '4.8.0', '4.8.0', '4.8.0']);
  assert.match(read('CHANGELOG.md'), /^## \[4\.8\.0\] - \d{4}-\d{2}-\d{2}$/m);
});
// --- the write-isolation invariant ----------------------------------------

test('exactly one agent can write, and it is the implementer', () => {
  const dir = pjoin('agents');
  const writers = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t);
      return fm && /tools:.*\b(Write|Edit)\b/.test(fm[1]);
    });
  assert.deepEqual(writers, ['uw-implementer.md'], `expected only uw-implementer to have write tools, got ${writers.join(', ')}`);
});

test('every read-only agent carries the Cursor readonly key too', () => {
  const dir = pjoin('agents');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'uw-implementer.md')) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.match(fm[1], /readonly:\s*true/, `${f} restricts tools for Claude Code but not writes for Cursor`);
  }
});

test('the implementer never gains readonly', () => {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(pread('agents/uw-implementer.md'));
  assert.doesNotMatch(fm[1], /readonly/, 'uw-implementer must stay writable -- it is the only phase that changes the repository');
});

// --- the command surface -----------------------------------------------------
//
// `phases/*.js` are scripts for the Workflow tool, not a slash-command
// surface. `commands/*.md` is what makes `/ultimate-workflow:plan` -- advertised
// in the README, SKILL.md, and both always-on indexes -- actually exist. A
// command with no script, or a script with no command, is an advertised feature
// that is not there, which is the exact defect class this session kept finding.

const PHASES = ['plan', 'tests', 'build', 'review', 'harvest', 'run'];

// The unattended run has no slash command of its own: the user enters it through
// /ultimate-workflow:feature, which follows phases/run.md. Every other phase is a command.
const commandFile = (p) => (p === 'run' ? pjoin('phases', 'run.md') : pjoin('commands', `${p}.md`));

test('the run is reached only through /feature: no commands/run.md, and feature.md points at phases/run.md', () => {
  assert.equal(fs.existsSync(pjoin('commands', 'run.md')), false, 'commands/run.md would make /run a command again');
  assert.ok(fs.readFileSync(pjoin('commands', 'feature.md'), 'utf8').includes('${CLAUDE_PLUGIN_ROOT}/phases/run.md'), 'feature.md never sends the Full tier to phases/run.md');
  assert.match(fs.readFileSync(pjoin('phases', 'run.md'), 'utf8'), /script --phase run/, 'phases/run.md never names its workflow script');
});

test('every advertised phase has both a command and a script', () => {
  for (const p of PHASES) {
    assert.ok(fs.existsSync(commandFile(p)), `no command for /${p}`);
    assert.ok(fs.existsSync(pjoin('phases', `${p}.js`)), `no script for /${p}`);
  }
});

// 4.0.1: Claude Code registers a plugin's workflows/ folder as named workflows, one per script,
// under the same names as the commands. /ultimate-workflow:plan then ran plan.js directly, with
// the user's text as a string and none of the expert setup the command does first.
test('the phase scripts are not in a workflows/ folder, so only the commands reach them', () => {
  assert.equal(fs.existsSync(pjoin('workflows')), false);
});

// A phase result is read from the Workflow tool's output file, never from its completion notice:
// the notice is cut off when the result is large, and a model that reads only the notice shows a
// partial plan, test plan, finding list or proposal list as whole. Wording cannot be proven by a
// test, so this only keeps the instruction from being dropped from one command in a later edit.
test('every command that presents a workflow result reads it from the output file, not the notice', () => {
  for (const p of ['plan', 'tests', 'review', 'harvest']) {
    const text = fs.readFileSync(pjoin('commands', `${p}.md`), 'utf8');
    assert.match(text, /output file/, `${p}.md never mentions the Workflow output file`);
    assert.match(text, /never (present it |present the plan |work |summarise)[^.]*notice|notice[^.]*never summarise|never from (its|the Workflow tool's) completion notice/i, `${p}.md does not say to avoid the completion notice`);
    assert.match(text, /say so and stop/, `${p}.md has no stop for an unreadable output file`);
  }
  for (const [p, field] of [['plan', 'planMarkdown'], ['tests', 'testsMarkdown']]) {
    const text = fs.readFileSync(pjoin('commands', `${p}.md`), 'utf8');
    assert.ok(text.includes(`experts/experts.js" present --result`), `${p}.md does not write the document with experts.js present`);
    assert.ok(text.includes(`--field ${field}`), `${p}.md does not name the ${field} field`);
    assert.ok(text.includes('ExitPlanMode'), `${p}.md does not use the plan view`);
    assert.ok(text.includes('--result <the output file>'), `${p}.md records the experts lane from a retyped notice, not --result`);
  }
});

// 2026-11-09, a real headless run: with a confirmed plan, the main session read the code, predicted
// the experts' blocking finding and stopped to ask, and also stopped because it could not see its own
// permission mode. Neither stop was the user's. Wording cannot be proven by a test; this keeps the
// two instructions from being dropped in a later edit.
test('the run goes straight from a confirmed plan to run-start, with no pre-review and no stop for an unseen mode', () => {
  const text = fs.readFileSync(pjoin('phases', 'run.md'), 'utf8');
  assert.match(text, /Do not review the plan or the code yourself first, and do not stop for what you expect the run to find/);
  assert.match(text, /Not being able to see the mode is no reason to stop/);
  assert.doesNotMatch(text, /If you cannot tell, or it is not, say so before the run and ask the user to switch/);
});

test('plan, tests and feature raise open questions one at a time', () => {
  for (const p of ['plan', 'tests', 'feature']) {
    const text = fs.readFileSync(pjoin('commands', `${p}.md`), 'utf8');
    assert.match(text, /one at a time|one per turn/, `${p}.md does not say to raise open questions one at a time`);
    assert.match(text, /pros and cons/, `${p}.md does not ask for the pros and cons`);
  }
});

test('no command points at a script that does not exist', () => {
  const dir = pjoin('commands');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    // 4.0.2: the Workflow tool refuses a scriptPath in the plugin's install folder, so a phase
    // command builds its runnable copy with `experts.js script --phase <name>` and never
    // points the tool at the plugin's own phases/ folder.
    assert.doesNotMatch(text, /scriptPath`?:\s*`?\$\{CLAUDE_PLUGIN_ROOT\}/, `${f} points the Workflow tool at the plugin folder, which it refuses`);
    const m = /script --phase ([a-z-]+)/.exec(text);
    if (!PHASES.includes(f.replace(/\.md$/, ''))) {
      // A prompt-only command such as /handoff runs no script, by design: it is
      // user-triggered and has nothing to orchestrate. It still has to be a real
      // command, which the front-matter test below covers.
      assert.equal(m, null, `${f} is not a phase but names a workflow script`);
      continue;
    }
    assert.ok(m, `${f} never names a workflow script`);
    assert.ok(
      fs.existsSync(pjoin('phases', `${m[1]}.js`)),
      `${f} points at phases/${m[1]}.js, which does not exist`
    );
  }
});

test('no script is left without a command to invoke it', () => {
  const scripts = fs
    .readdirSync(pjoin('phases'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, ''));
  for (const s of scripts) {
    assert.ok(
      fs.existsSync(commandFile(s)),
      `phases/${s}.js has no command, so nothing can reach it`
    );
  }
});

test('each command declares a description, or the plugin lists it blank', () => {
  const dir = pjoin('commands');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(fm, `${f} has no front matter`);
    assert.match(fm[1], /description:\s*\S/, `${f} has no description`);
  }
});

test('the phase count in the prose matches the number of phases that exist', () => {
  // "Five phases" appears in the README, both manifests, and both indexes.
  // If a sixth lands, this is the thing that notices.
  assert.equal(PHASES.length, 6);
  for (const rel of ['README.md', 'CLAUDE.md']) {
    const t = read(rel);
    if (/\bfive phases\b/i.test(t) || /\bFive phases\b/.test(t)) {
      assert.equal(fs.readdirSync(pjoin('phases')).filter((f) => f.endsWith('.js')).length, 5,
        `${rel} says five phases`);
    }
  }
});

// --- Cursor's retrieval mechanism -------------------------------------------
//
// On Claude Code a topical is reached through its Read-when cue in memory.md.
// Cursor does not act on that pointer; its dynamic-context mechanism is an
// alwaysApply: false rule selected by description. So each topical needs a
// matching on-demand rule or it is simply unreachable on that host -- which it
// was, silently, until v3.0.0. These checks keep the two sets in step.

function topicals() {
  return fs
    .readdirSync(pjoin('memory'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

function onDemandRules() {
  return fs
    .readdirSync(pjoin('rules'))
    .filter((f) => f.startsWith('uw-') && f.endsWith('.mdc'));
}

test('every memory topical has an on-demand Cursor rule to reach it', () => {
  for (const t of topicals()) {
    const rule = pjoin('rules', `uw-${t}.mdc`);
    assert.ok(
      fs.existsSync(rule),
      `memory/${t}.md has no rules/uw-${t}.mdc, so Cursor can never retrieve it`
    );
  }
});

test('no on-demand rule points at a topical that does not exist', () => {
  for (const f of onDemandRules()) {
    const text = fs.readFileSync(pjoin('rules', f), 'utf8');
    const m = /memory\/([a-z-]+)\.md/.exec(text);
    assert.ok(m, `${f} never names a topical, so it carries no content`);
    assert.ok(
      fs.existsSync(pjoin('memory', `${m[1]}.md`)),
      `${f} points at memory/${m[1]}.md, which does not exist`
    );
  }
});

test('on-demand rules are on-demand, and carry a selection cue', () => {
  for (const f of onDemandRules()) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(pjoin('rules', f), 'utf8'));
    assert.ok(fm, `${f} has no front matter`);
    assert.match(fm[1], /alwaysApply:\s*false/, `${f} is always-on, which defeats the point of moving it`);
    // The description IS the retrieval trigger on Cursor. A vague one does not fire.
    const desc = /description:\s*(.+)/.exec(fm[1]);
    assert.ok(desc, `${f} has no description`);
    assert.ok(
      desc[1].trim().length > 60,
      `${f} has a description too vague to select on: "${desc[1].trim()}"`
    );
  }
});

test('the on-demand rules point at their topical rather than copying it', () => {
  // A fifth hand-maintained copy of the same prose is exactly the drift the
  // rest of this file exists to prevent.
  for (const f of onDemandRules()) {
    const rule = fs.readFileSync(pjoin('rules', f), 'utf8');
    const m = /memory\/([a-z-]+)\.md/.exec(rule);
    const topical = fs.readFileSync(pjoin('memory', `${m[1]}.md`), 'utf8');
    assert.ok(
      rule.length < topical.length,
      `${f} is longer than the topical it points at -- it has become a copy`
    );
  }
});

// --- the public site --------------------------------------------------------
//
// docs/index.html is what the README calls the "Visual walkthrough", and it
// drifted an entire major version without anything noticing: it still said
// "two-skill plugin" and "the two workflows" after the five phases shipped,
// still told readers CLAUDE.md "mirrors skill 1's body" (the precise thing v3
// stopped doing), and still printed an install command for a plugin name that
// was renamed two releases earlier -- so following the page verbatim failed.
//
// It is a mirror of the README in everything but format, so it belongs here.

const SITE = 'docs/index.html';

test('the site names every phase, and the count matches the scripts', () => {
  const t = read(SITE);
  for (const p of PHASES) {
    assert.match(t, new RegExp(`<code>${p}</code>`), `the site never mentions the ${p} phase`);
  }
  const scripts = fs.readdirSync(pjoin('phases')).filter((f) => f.endsWith('.js'));
  assert.equal(scripts.length, PHASES.length, 'a phase was added or removed without updating the site');
});

test('the site names every skill the plugin ships', () => {
  // The page once described a "two-skill plugin" after five phases shipped. A skill
  // added without a mention here would drift the same way.
  const t = read(SITE);
  const skills = fs
    .readdirSync(pjoin('skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const name of skills) {
    assert.ok(t.includes(name), `the site never mentions the ${name} skill`);
  }
});

test('the site does not advertise an install command for the old plugin name', () => {
  // The plugin name namespaces everything it ships, so a stale one is not a
  // cosmetic error -- the command fails.
  const t = read(SITE);
  const canonical = JSON.parse(pread('.claude-plugin/plugin.json')).name;
  const installs = [...t.matchAll(/\/plugin install ([\w-]+)/g)].map((m) => m[1]);
  assert.ok(installs.length > 0, 'the site no longer documents how to install');
  for (const name of installs) {
    assert.equal(name, canonical, `the site installs "${name}", but the manifest name is "${canonical}"`);
  }
});

test('the site and the README claim the same hosts', () => {
  const site = read(SITE);
  const readme = read('README.md');
  for (const host of ['Claude Code', 'Cursor', 'Codex CLI', 'Gemini CLI', 'Claude Desktop']) {
    assert.ok(readme.includes(host), `README stopped naming ${host}`);
    // The site may abbreviate in its table, so match the distinctive word.
    const key = host.split(' ')[0];
    assert.ok(site.includes(key), `the site never names ${host}, which the README promises`);
  }
});

test('the site does not still describe the always-on files as body copies', () => {
  // This is the claim that was actively harmful: a reader following it
  // re-inlines the skill body into CLAUDE.md and undoes the restructure.
  const t = read(SITE);
  assert.doesNotMatch(t, /Mirrors skill 1's body/i, 'the site still says CLAUDE.md mirrors the skill body');
  assert.doesNotMatch(t, /Same body content/i, 'the site still says the Cursor rules are body copies');
});

test('no plan file is tracked outside internal/', () => {
  // Broader than the docs/ check below, and it had to be: PLAN-graph-native.md
  // was committed before .gitignore could matter -- an ignore rule does not
  // apply to an already-tracked file -- so it shipped inside the v3.0.0 plugin
  // ZIP, the artifact every Desktop and offline Cursor user downloads. The
  // docs/ guard did not see it because it was at the repo root.
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split(String.fromCharCode(10))
    .filter(Boolean);
  const stray = tracked.filter(
    // Case-sensitive on purpose: the working artifact is `PLAN-<feature>.md`,
    // while `references/plan-template.md` is a shipped template and belongs in
    // the ZIP. An /i match conflates the two.
    (p) => /(^|\/)PLAN-.+\.md$/.test(p) && !p.startsWith('internal/')
  );
  assert.deepEqual(
    stray,
    [],
    `tracked plan files outside internal/ ship in the release ZIP: ${stray.join(', ')}`
  );
});

test('nothing under docs/ is an internal plan file', () => {
  // GitHub Pages serves docs/. Working notes are candid by design and are not
  // written to be read by strangers, so the publish root is the wrong home.
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
    );
  for (const f of walk(path.join(root, 'docs'))) {
    assert.doesNotMatch(
      path.basename(f),
      /^PLAN-.+\.md$/i,
      `${path.relative(root, f)} would be published by GitHub Pages; internal/plans/ is its home`
    );
  }
});

// --- Cursor / Claude install materialization --------------------------------
//
// Cursor marketplace clones of this repo use a cone sparse-checkout that keeps
// only root files plus /.cursor-plugin/ and /.claude-plugin/. A plugin whose
// rules/agents/skills/commands lived at the repo root looked installed and was
// empty. The shippable tree now lives under .cursor-plugin/ultimate-workflow/
// so the cone includes it. These checks pin that invariant without running
// Cursor or zip(1).

const CURSOR_SPARSE_INCLUDED_PREFIXES = ['.claude-plugin/', '.cursor-plugin/'];

function cursorSparseIncludes(relPosix) {
  const n = relPosix.replace(/\\/g, '/');
  // Root files (no slash) are included by /* ; directories only if under a prefix.
  if (!n.includes('/')) return true;
  return CURSOR_SPARSE_INCLUDED_PREFIXES.some((p) => n === p.slice(0, -1) || n.startsWith(p));
}

const REQUIRED_PLUGIN_FILES = [
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'skills/the-ultimate-workflow-guidelines/SKILL.md',
  'skills/project-bootstrap-guidelines/SKILL.md',
  'skills/system-architect-engineering-guidelines/SKILL.md',
  'skills/greenfield-architecture-guidelines/SKILL.md',
  'skills/modularity-and-evolution-guidelines/SKILL.md',
  'skills/distributed-systems-resilience-guidelines/SKILL.md',
  'skills/operability-guidelines/SKILL.md',
  'rules/the-ultimate-workflow-guidelines.mdc',
  'agents/uw-explorer.md',
  'agents/uw-implementer.md',
  'commands/plan.md',
  'commands/build.md',
  'memory.md',
  'memory/mirrors.md',
  'hooks/hooks.json',
  'phases/plan.js',
];

test('the plugin root is under a Cursor sparse-included prefix', () => {
  const pluginPosix = PLUGIN.replace(/\\/g, '/');
  assert.ok(
    cursorSparseIncludes(pluginPosix + '/agents/uw-explorer.md'),
    `${pluginPosix} is outside Cursor's marketplace sparse cone; /add-plugin would ship an empty plugin`
  );
});

test('every required plugin file survives the Cursor sparse cone', () => {
  for (const rel of REQUIRED_PLUGIN_FILES) {
    const full = path.join(PLUGIN, rel).replace(/\\/g, '/');
    assert.ok(fs.existsSync(path.join(root, PLUGIN, rel)), `missing ${full}`);
    assert.ok(
      cursorSparseIncludes(full),
      `${full} would be stripped by Cursor marketplace sparse-checkout`
    );
  }
});

test('both marketplaces point at the nested plugin, not github-of-self root', () => {
  const claude = JSON.parse(read('.claude-plugin/marketplace.json'));
  const cursor = JSON.parse(read('.cursor-plugin/marketplace.json'));
  const cSrc = claude.plugins[0].source;
  const uSrc = cursor.plugins[0].source;
  assert.equal(typeof cSrc, 'string', 'Claude marketplace must use a relative path source after the nest');
  assert.equal(typeof uSrc, 'string', 'Cursor marketplace must use a relative path source after the nest');
  assert.match(String(cSrc), /ultimate-workflow/, `Claude source is ${cSrc}`);
  assert.match(String(uSrc), /ultimate-workflow/, `Cursor source is ${uSrc}`);
  assert.notEqual(cSrc, './', 'Claude source must not be marketplace root');
  assert.ok(
    fs.existsSync(path.join(root, String(cSrc).replace(/^\.\//, ''), '.claude-plugin/plugin.json')),
    `Claude source ${cSrc} has no plugin.json`
  );
  assert.ok(
    fs.existsSync(path.join(root, String(uSrc).replace(/^\.\//, ''), '.cursor-plugin/plugin.json')),
    `Cursor source ${uSrc} has no plugin.json`
  );
});

test('simulated release ZIP from the plugin root includes the Cursor payload', () => {
  // release-skills.yml zips the plugin directory. Membership ~= git ls-files
  // under PLUGIN, minus paths that would be excluded if present.
  const tracked = execFileSync('git', ['ls-files', '-z', PLUGIN], { cwd: root })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, '/'));
  const pluginPrefix = PLUGIN.replace(/\\/g, '/') + '/';
  const members = tracked
    .filter((p) => p.startsWith(pluginPrefix))
    .map((p) => p.slice(pluginPrefix.length));
  for (const rel of REQUIRED_PLUGIN_FILES) {
    assert.ok(
      members.includes(rel.replace(/\\/g, '/')),
      `release ZIP would omit ${rel}`
    );
  }
  assert.ok(!members.some((m) => /(^|\/)PLAN-.+\.md$/.test(m)), 'release ZIP must not contain PLAN-*.md');
  assert.ok(!members.includes('AGENTS.md'), 'AGENTS.md is repo dogfood, not the plugin always-on');
});

test('the release ZIP excludes every eval suite directory in the plugin', () => {
  // The suite sits under the plugin because the eval runner requires it, but an
  // installed user cannot run it. A new tracked *evals directory without an
  // exclusion would ship to everyone silently. Derived from git, so untracked
  // local run output never trips it.
  const wf = read('.github/workflows/release-skills.yml');
  const prefix = PLUGIN.replace(/\\/g, '/') + '/';
  const dirs = new Set(
    execFileSync('git', ['ls-files', '-z', PLUGIN], { cwd: root })
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map((p) => p.replace(/\\/g, '/'))
      .filter((p) => p.startsWith(prefix))
      .map((p) => p.slice(prefix.length).split('/')[0])
      .filter((top) => /evals$/.test(top))
  );
  for (const d of dirs) {
    assert.ok(wf.includes(`-x '${d}/*'`), `release-skills.yml does not exclude ${d}/ from the plugin ZIP`);
  }
});

// --- shipped links -----------------------------------------------------------
//
// The v3.0.1 restructure moved the payload to .cursor-plugin/ultimate-workflow/
// and broke three references inside it: memory.md linked a research summary that
// is not shipped, context-boundary.md pointed at a memory-protocol.md path that
// no longer resolved, and memory-protocol.md named `references/memory-template.md`
// while sitting inside `references/` itself.
//
// All three resolved fine from the repo root, so nobody working here could see
// them. They were dead only for someone who had installed the plugin -- which is
// the one reader who cannot report the problem.

const PAYLOAD = path.join(root, '.cursor-plugin', 'ultimate-workflow');

// A placeholder is not a link.
const PLACEHOLDER = /[<>]/;

// Files a TEMPLATE tells the USER to create in their own project. They are
// examples, not our files, and will never exist here.
const TEMPLATE_EXAMPLES = new Set([
  'memory/auth.md', 'memory/db.md', 'memory/gotchas.md',
  'memory/api.md', 'memory/testing.md', 'memory/deploy.md',
]);

// Without both filters this check reports 34 false positives and gets deleted by
// whoever sees it fail next. That is the failure mode it is designed against.

function shippedDocs(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) shippedDocs(p, acc);
    else if (/\.(md|mdc)$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

function pathRefs(text) {
  const out = new Set();
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) out.add(m[1]);
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const v = m[1].trim();
    if (v.includes('/') && /\.(md|mdc|js|json|html)$/i.test(v) && !v.includes(' ')) out.add(v);
  }
  return [...out]
    .map((r) => r.split('#')[0].trim())
    .filter((r) => r && !/^(https?:|mailto:|#|\$\{)/.test(r))
    .filter((r) => !r.includes('*'))
    .filter((r) => !PLACEHOLDER.test(r))
    .filter((r) => !TEMPLATE_EXAMPLES.has(r))
    // A leading-dot directory is packaging or runtime, never shipped content:
    // `.claude-plugin/` and `.cursor-plugin/` are the repo's marketplace
    // catalogs (cursor-install.md says so on the line above), and
    // `.ultimate-workflow/` is the heartbeat directory inside the USER's
    // project. That last one resolved here only by accident -- this repo has a
    // heartbeat file from dogfooding, which is exactly the kind of coincidence
    // that turns a check into a liar.
    .filter((r) => !r.startsWith('.'));
}

test('no shipped file points at a path that exists only outside the payload', () => {
  const offenders = [];

  for (const file of shippedDocs(PAYLOAD)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const ref of pathRefs(text)) {
      const fromOwnDir = fs.existsSync(path.resolve(path.dirname(file), ref));
      const fromPayload = fs.existsSync(path.join(PAYLOAD, ref));
      if (fromOwnDir || fromPayload) continue;

      // Anything that resolves NOWHERE is a finding, not just paths left behind
      // by the move.
      //
      // The first version of this check only flagged refs that still resolved at
      // the repo root, on the theory that those were the move's leftovers. Then
      // reintroducing a real defect failed to turn it red: two of the three
      // findings it was written for pointed at paths that existed under no root
      // at all. A guard that passes against the bug it was built for is worse
      // than none, because it certifies the thing it cannot see.
      const whereItDoesResolve = fs.existsSync(path.join(root, ref))
        ? ' (resolves at the repo root -- left behind by the payload move)'
        : ' (resolves nowhere)';
      offenders.push(`${path.relative(root, file)} -> ${ref}${whereItDoesResolve}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these resolve for a contributor and are dead for an installed user:\n  ${offenders.join('\n  ')}`
  );
});

// ---- PLAN-simplify, card baseline: guards that make "done" a test, not a rule a reviewer holds ----

const WALK_SKIP = new Set(['.git', 'node_modules', '.claude']);
function allTestFiles(dir = root, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!WALK_SKIP.has(e.name)) allTestFiles(path.join(dir, e.name), out);
    } else if (e.name.endsWith('.test.js')) out.push(path.relative(root, path.join(dir, e.name)).split(path.sep).join('/'));
  }
  return out;
}
/** Test files the verify command reaches: the hooks tree, the evals tree, and this file. */
const reached = (rel) => rel === 'mirrors.test.js' || rel.startsWith('.cursor-plugin/ultimate-workflow/hooks/') || rel.startsWith('evals/');
// A skip or todo site: an options object or a call. An evidence field named `skip` is not one.
const SKIP_SITE = /\b(?:test|it|describe)\([^\n]*\{\s*(?:skip|todo)\s*:|\bt\.(?:skip|todo)\(|\b(?:test|it|describe)\.(?:skip|todo)\(/g;
const ONLY_SITE = /\b(?:test|it|describe)\.only\(|\{\s*only\s*:\s*true/g;
const TITLE_SITE = /^\s*(?:test|it)(?:\.\w+)?\(\s*(['"`])((?:\.|(?!\1).)*)\1/gm;
const titlesOf = (text) => [...text.matchAll(TITLE_SITE)].map((m) => m[2]);
const SELF_CHECK = "test('x', { skip: 'no bash' }, () => {});\n  t.skip('y');\ntest.skip('z');\ntest('p', { only: true }, () => {});\nconst e = { skip: 'only documentation changed' };";

test('gate integrity: the skip, todo and only patterns match what they claim to and nothing else', () => {
  assert.strictEqual((SELF_CHECK.match(SKIP_SITE) || []).length, 3);
  assert.strictEqual((SELF_CHECK.match(ONLY_SITE) || []).length, 1);
  assert.deepStrictEqual(titlesOf("test('a b', () => {});\n  it(\"c\", () => {});"), ['a b', 'c']);
});

test('gate integrity: every test file is reached by the verify command', () => {
  const files = allTestFiles();
  assert.ok(files.length > 50, `the scan found ${files.length} test files`);
  assert.ok(files.includes('mirrors.test.js') && files.includes('evals/experts/commit-contract.test.js') && files.includes('.cursor-plugin/ultimate-workflow/hooks/lib/gates.test.js'));
  const stray = files.filter((f) => !reached(f));
  assert.deepStrictEqual(stray, [], `these test files are outside the verify globs and would never run: ${stray.join(', ')}`);
});

// Today's conditional skips: symlinks, bash missing, the Cursor recordings. A new one fails here.
const SKIPS = {
  '.cursor-plugin/ultimate-workflow/hooks/lib/adapters.test.js': 4,
  '.cursor-plugin/ultimate-workflow/hooks/status.test.js': 1,
  'evals/experts/autopilot-fixes.test.js': 1,
  'evals/experts/run-phase.test.js': 2,
};

test('skips: the set of skip and todo sites in the test files equals the committed allowlist, and no test uses only', () => {
  const found = {};
  for (const rel of allTestFiles().filter(reached)) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (rel === 'mirrors.test.js') continue; // this file holds the patterns as data
    const n = (text.match(SKIP_SITE) || []).length;
    if (n) found[rel] = n;
    assert.strictEqual((text.match(ONLY_SITE) || []).length, 0, `${rel} uses only`);
  }
  assert.deepStrictEqual(found, SKIPS);
});

test('titles: every test title recorded in card baseline still exists, except those in the deleted list', () => {
  const recorded = JSON.parse(fs.readFileSync(path.join(root, 'evals', 'experts', 'baseline-titles.json'), 'utf8'));
  const deleted = new Set(JSON.parse(fs.readFileSync(path.join(root, 'evals', 'experts', 'deleted-titles.json'), 'utf8')).map(([f, t]) => `${f}\u0000${t}`));
  assert.ok(Object.keys(recorded).length > 50);
  const lost = [];
  for (const [rel, titles] of Object.entries(recorded)) {
    const have = fs.existsSync(path.join(root, rel)) ? new Set(titlesOf(fs.readFileSync(path.join(root, rel), 'utf8'))) : new Set();
    for (const title of titles) if (!have.has(title) && !deleted.has(`${rel}\u0000${title}`)) lost.push(`${rel}: ${title}`);
  }
  assert.deepStrictEqual(lost, [], `titles gone and not in the deleted list:\n  ${lost.join('\n  ')}`);
});

// ---- PLAN-simplify, card frontmatter: one copy of the parser, the finder and the writer ----

/** Non-test JavaScript under the shipped plugin, as { rel, text }. */
function shippedSources() {
  const base = path.join(root, '.cursor-plugin', 'ultimate-workflow');
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!['fixtures', 'architecture-evals', 'node_modules'].includes(e.name)) walk(p);
      } else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) out.push({ rel: path.relative(base, p).split(path.sep).join('/'), text: fs.readFileSync(p, 'utf8') });
    }
  })(base);
  return out;
}
const declaresFunction = (text, name) => new RegExp(String.raw`^\s*(?:async\s+)?function\s+${name}\b`, 'm').test(text);

test('one copy: the front-matter parser, finder and in-place writer are each declared in exactly one shipped file', () => {
  // The scan proves itself first: it sees a declaration and ignores a call and a comment.
  assert.ok(declaresFunction('function setFrontLine(a) {}', 'setFrontLine'));
  assert.ok(!declaresFunction('x = setFrontLine(a);\n// function setFrontLine', 'setFrontLine'));
  const files = shippedSources();
  for (const sentinel of ['hooks/lib/state.js', 'experts/experts.js', 'hooks/verify.js', 'experts/autopilot.js', 'phases/run.js']) assert.ok(files.some((f) => f.rel === sentinel), `${sentinel} was scanned`);
  const where = (name) => files.filter((f) => declaresFunction(f.text, name)).map((f) => f.rel);
  assert.deepStrictEqual(where('parseFrontMatter'), ['hooks/lib/state.js']);
  assert.deepStrictEqual(where('splitFrontMatter'), ['hooks/lib/state.js']);
  assert.deepStrictEqual(where('setFrontLine'), ['hooks/lib/state.js']);
  assert.deepStrictEqual(where('frontmatter'), []);
  assert.deepStrictEqual(where('parseAgentFile'), []);
  const statusTest = fs.readFileSync(path.join(root, '.cursor-plugin', 'ultimate-workflow', 'hooks', 'status.test.js'), 'utf8');
  assert.ok(!declaresFunction(statusTest, 'frontMatter'), 'hooks/status.test.js declares no frontMatter helper');
});

// ---- PLAN-simplify, card cards-reader: no second Cards-section finder ----

test('one copy: no Cards-heading match outside cardsRange in experts.js, verify.js and run-rules.js', () => {
  // The pattern: a comparison of a section name against the literal cards, in either quote style.
  const PATTERN = /(?:===?|!==?)\s*['"]cards['"]|['"]cards['"]\s*(?:===?|!==?)|\/\^cards\$\/i/;
  assert.ok(PATTERN.test("if (section === 'cards') {"), 'the pattern sees a section comparison');
  assert.ok(PATTERN.test('headings.find((h) => /^cards$/i.test(h))'), 'and a heading regex');
  assert.ok(!PATTERN.test('const cards = parseCards(text);'), 'and ignores the word as a variable');
  const files = shippedSources();
  for (const rel of ['experts/experts.js', 'hooks/verify.js', 'lib/run-rules.js']) assert.ok(files.some((f) => f.rel === rel), `${rel} was scanned`);
  const offenders = files.filter((f) => ['experts/experts.js', 'hooks/verify.js', 'lib/run-rules.js'].includes(f.rel) && PATTERN.test(f.text)).map((f) => f.rel);
  assert.deepStrictEqual(offenders, [], 'only experts/cards.js finds the Cards section');
});

// ---- PLAN-simplify, card commit-check: one function decides whether a commit is allowed ----

test('one decision: commitGate is called from exactly dispatch.js, autopilot.js, status.js and experts.js, and fullSuiteGate and expertsGate from nowhere outside gates.js', () => {
  const CALL = /\bcommitGate\s*\(/;
  assert.ok(CALL.test('const v = gates.commitGate(ev);'), 'the pattern sees a call');
  assert.ok(!CALL.test('// commitGate is the one decision'), 'and ignores a comment without a call');
  const files = shippedSources();
  for (const rel of ['hooks/lib/gates.js', 'hooks/lib/dispatch.js', 'experts/autopilot.js', 'hooks/status.js', 'experts/experts.js']) assert.ok(files.some((f) => f.rel === rel), `${rel} was scanned`);
  const callers = files.filter((f) => f.rel !== 'hooks/lib/gates.js' && CALL.test(f.text.replace(/^\s*(\/\/|\*).*$/gm, ''))).map((f) => f.rel).sort();
  assert.deepStrictEqual(callers, ['experts/autopilot.js', 'experts/experts.js', 'hooks/lib/dispatch.js', 'hooks/status.js']);
  const second = files.filter((f) => f.rel !== 'hooks/lib/gates.js' && /\b(?:fullSuiteGate|expertsGate)\s*\(/.test(f.text.replace(/^\s*(\/\/|\*).*$/gm, ''))).map((f) => f.rel);
  assert.deepStrictEqual(second, [], 'no second caller-side decision');
  const auto = files.find((f) => f.rel === 'experts/autopilot.js').text;
  assert.ok(!/ev\.memory\s*=/.test(auto), 'autopilot.js does not edit the memory evidence');
});

test('gates: gates.js requires nothing (it was only ./state.js, for the round cap)', () => {
  const src = fs.readFileSync(path.join(root, '.cursor-plugin', 'ultimate-workflow', 'hooks', 'lib', 'gates.js'), 'utf8');
  const requires = [...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  assert.deepStrictEqual(requires, [], 'gates.js is pure: it requires nothing, so state.js cannot reach back into it');
});

// ---- PLAN-simplify, card reminders: the removed names are gone from everything that ships ----

function shippedFiles() {
  const base = path.join(root, '.cursor-plugin', 'ultimate-workflow');
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      // Recorded host payloads are data, and the eval corpus is not part of what users run.
      if (e.isDirectory()) {
        if (!['fixtures', 'architecture-evals', 'node_modules'].includes(e.name)) walk(p);
      } else if (/\.(js|md|mdc|json)$/.test(e.name) && !e.name.endsWith('.test.js')) out.push({ rel: path.relative(base, p).split(path.sep).join('/'), text: fs.readFileSync(p, 'utf8') });
    }
  })(base);
  for (const rel of ['docs/gates.md']) out.push({ rel, text: fs.readFileSync(path.join(root, rel), 'utf8') });
  return out;
}
// A removed front-matter key as a key line, or a removed identifier. Not the bare English word "dirty" in prose.
const REMOVED_KEY = /^[ \t]*(?:dirty|verify_rounds|last_verify|escalated|gate_violation)[ \t]*:/m;
const REMOVED_IDENT = /\b(?:verify_rounds|last_verify|gate_violation|markClean|roundCap|stopGate|patchState|serializeFrontMatter|preEditGate|fullSuiteGate)\b|\.dirty\b/;
const HEARTBEAT = /\bheartbeat(?:\.js|\.json)?\b/i;

test('removed names: dirty, verify_rounds, last_verify, escalated, gate_violation, heartbeat, markClean, roundCap, stopGate and patchState appear in no shipped source file', () => {
  assert.ok(REMOVED_KEY.test('---\ndirty: true\n---'), 'the pattern sees a front-matter key');
  assert.ok(!REMOVED_KEY.test('the tree is dirty and escalated to the user'), 'and ignores the word in prose');
  assert.ok(REMOVED_IDENT.test('const r = gates.roundCap(state);') && REMOVED_IDENT.test('state.dirty'), 'and sees an identifier');
  const files = shippedFiles();
  for (const sentinel of ['hooks/lib/dispatch.js', 'experts/autopilot.js', 'phases/run.js', 'commands/build.md', 'phases/plan.js', 'docs/gates.md', 'skills/the-ultimate-workflow-guidelines/references/plan-template.md', 'skills/project-bootstrap-guidelines/references/prd-template.md']) {
    assert.ok(files.some((f) => f.rel === sentinel), `${sentinel} was scanned`);
  }
  const offenders = files.filter((f) => REMOVED_KEY.test(f.text) || REMOVED_IDENT.test(f.text)).map((f) => f.rel);
  assert.deepStrictEqual(offenders, [], 'these still name a removed key or function');
  // The heartbeat: no module, and no hook file but status.js (which says a leftover file can be deleted) mentions it.
  const beats = files.filter((f) => f.rel.startsWith('hooks/') && f.rel !== 'hooks/status.js' && HEARTBEAT.test(f.text)).map((f) => f.rel);
  assert.deepStrictEqual(beats, [], 'no hook code mentions the heartbeat');
});
